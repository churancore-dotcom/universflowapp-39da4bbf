
-- Auto-playlists for layered Radio / Personal Mix / Discover Mix
CREATE TABLE IF NOT EXISTS public.auto_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('radio','daily_mix','discover_mix')),
  title text NOT NULL,
  subtitle text,
  seed_song_id text,
  tracks jsonb NOT NULL DEFAULT '[]'::jsonb,
  cover_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auto_playlists_user_kind_idx
  ON public.auto_playlists (user_id, kind, generated_at DESC);
CREATE INDEX IF NOT EXISTS auto_playlists_expires_idx
  ON public.auto_playlists (expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.auto_playlists TO authenticated;
GRANT ALL ON public.auto_playlists TO service_role;

ALTER TABLE public.auto_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own auto playlists"
  ON public.auto_playlists FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own auto playlists"
  ON public.auto_playlists FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER auto_playlists_updated_at
  BEFORE UPDATE ON public.auto_playlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Nightly cron for daily-mix-builder at 04:10 UTC
DO $$
DECLARE v_url text; v_anon text;
BEGIN
  SELECT trim(both '"' from value::text) INTO v_anon
  FROM public.internal_secrets WHERE key = 'anon_key' LIMIT 1;

  IF v_anon IS NULL THEN
    -- fall back to app_settings if present
    SELECT trim(both '"' from (value #>> '{}')) INTO v_anon
    FROM public.app_settings WHERE key = 'anon_key' LIMIT 1;
  END IF;

  -- Unschedule if exists to keep migration idempotent
  PERFORM cron.unschedule('daily-mix-builder-04-10-utc')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-mix-builder-04-10-utc');

  PERFORM cron.schedule(
    'daily-mix-builder-04-10-utc',
    '10 4 * * *',
    $cron$
    SELECT net.http_post(
      url := 'https://kzaeahjeqlihmxrfhjqd.supabase.co/functions/v1/daily-mix-builder',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{}'::jsonb,
      timeout_milliseconds := 55000
    );
    $cron$
  );
END $$;
