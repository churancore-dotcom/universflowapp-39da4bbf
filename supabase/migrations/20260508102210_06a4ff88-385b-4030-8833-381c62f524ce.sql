CREATE TABLE IF NOT EXISTS public.viral_chart_refreshes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  country_code text NULL,
  city text NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT viral_chart_refreshes_scope_valid CHECK (scope IN ('global','country','city')),
  CONSTRAINT viral_chart_refreshes_country_code_len CHECK (country_code IS NULL OR char_length(country_code) = 2),
  UNIQUE (scope, country_code, city)
);

ALTER TABLE public.viral_chart_refreshes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view viral chart refresh signals" ON public.viral_chart_refreshes;
CREATE POLICY "Anyone can view viral chart refresh signals"
ON public.viral_chart_refreshes
FOR SELECT
USING (true);

CREATE OR REPLACE FUNCTION public.touch_viral_chart_refreshes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.viral_chart_refreshes (scope, country_code, city, updated_at)
  VALUES ('global', NULL, NULL, now())
  ON CONFLICT (scope, country_code, city) DO UPDATE SET updated_at = EXCLUDED.updated_at;

  IF NEW.country_code IS NOT NULL THEN
    INSERT INTO public.viral_chart_refreshes (scope, country_code, city, updated_at)
    VALUES ('country', NEW.country_code, NULL, now())
    ON CONFLICT (scope, country_code, city) DO UPDATE SET updated_at = EXCLUDED.updated_at;
  END IF;

  IF NEW.country_code IS NOT NULL AND NEW.city IS NOT NULL THEN
    INSERT INTO public.viral_chart_refreshes (scope, country_code, city, updated_at)
    VALUES ('city', NEW.country_code, NEW.city, now())
    ON CONFLICT (scope, country_code, city) DO UPDATE SET updated_at = EXCLUDED.updated_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS song_play_events_touch_viral_chart_refreshes ON public.song_play_events;
CREATE TRIGGER song_play_events_touch_viral_chart_refreshes
AFTER INSERT ON public.song_play_events
FOR EACH ROW
EXECUTE FUNCTION public.touch_viral_chart_refreshes();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'viral_chart_refreshes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.viral_chart_refreshes;
  END IF;
END $$;