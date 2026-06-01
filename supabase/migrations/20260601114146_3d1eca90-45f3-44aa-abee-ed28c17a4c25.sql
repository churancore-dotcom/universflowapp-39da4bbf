CREATE TABLE public.listening_aura (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  aura_type TEXT NOT NULL DEFAULT 'idle',
  aura_label TEXT NOT NULL DEFAULT 'Quiet',
  aura_color TEXT NOT NULL DEFAULT '#6E6E73',
  song_title TEXT,
  song_artist TEXT,
  song_cover TEXT,
  is_playing BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.listening_aura TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listening_aura TO authenticated;
GRANT ALL ON public.listening_aura TO service_role;

ALTER TABLE public.listening_aura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auras are viewable by anyone"
  ON public.listening_aura FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own aura"
  ON public.listening_aura FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own aura"
  ON public.listening_aura FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own aura"
  ON public.listening_aura FOR DELETE
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.listening_aura;
ALTER TABLE public.listening_aura REPLICA IDENTITY FULL;