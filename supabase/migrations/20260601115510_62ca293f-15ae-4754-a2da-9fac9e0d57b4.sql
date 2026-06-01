-- Remove Listening Aura
DROP TABLE IF EXISTS public.listening_aura CASCADE;

-- Cross-device playback sync
CREATE TABLE public.playback_state (
  user_id uuid PRIMARY KEY,
  song jsonb,
  queue jsonb NOT NULL DEFAULT '[]'::jsonb,
  position_seconds numeric NOT NULL DEFAULT 0,
  is_playing boolean NOT NULL DEFAULT false,
  device_id text,
  device_label text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.playback_state TO authenticated;
GRANT ALL ON public.playback_state TO service_role;

ALTER TABLE public.playback_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own playback state"
  ON public.playback_state FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own playback state"
  ON public.playback_state FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own playback state"
  ON public.playback_state FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own playback state"
  ON public.playback_state FOR DELETE TO authenticated
  USING (auth.uid() = user_id);