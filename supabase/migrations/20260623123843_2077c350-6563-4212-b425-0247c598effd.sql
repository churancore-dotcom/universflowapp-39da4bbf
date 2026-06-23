
CREATE TABLE public.stream_url_cache (
  video_id text PRIMARY KEY,
  audio_url text NOT NULL,
  title text,
  artist text,
  thumbnail text,
  duration integer,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.stream_url_cache TO service_role;

ALTER TABLE public.stream_url_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backend only"
  ON public.stream_url_cache
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE INDEX stream_url_cache_expires_idx ON public.stream_url_cache (expires_at);

CREATE TRIGGER update_stream_url_cache_updated_at
  BEFORE UPDATE ON public.stream_url_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
