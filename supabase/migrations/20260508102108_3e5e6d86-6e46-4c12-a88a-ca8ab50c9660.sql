CREATE TABLE IF NOT EXISTS public.song_play_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  session_id text NULL,
  track_id text NOT NULL,
  song_id uuid NULL,
  title text NOT NULL,
  artist text NOT NULL,
  cover_url text NULL,
  source text NOT NULL DEFAULT 'indexed',
  country_code text NULL,
  country_name text NULL,
  city text NULL,
  action text NOT NULL,
  score_weight integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT song_play_events_country_code_len CHECK (country_code IS NULL OR char_length(country_code) = 2),
  CONSTRAINT song_play_events_action_valid CHECK (action IN ('stream','save','share','playlist_add','skip')),
  CONSTRAINT song_play_events_weight_valid CHECK (score_weight BETWEEN -10 AND 20)
);

ALTER TABLE public.song_play_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view song play events" ON public.song_play_events;
CREATE POLICY "Admins can view song play events"
ON public.song_play_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete song play events" ON public.song_play_events;
CREATE POLICY "Admins can delete song play events"
ON public.song_play_events
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_song_play_events_created_at ON public.song_play_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_song_play_events_country_recent ON public.song_play_events (country_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_song_play_events_city_recent ON public.song_play_events (country_code, city, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_song_play_events_track_recent ON public.song_play_events (track_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_viral_song_events(
  p_country_code text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_limit integer DEFAULT 30,
  p_since_hours integer DEFAULT 24
)
RETURNS TABLE (
  track_id text,
  song_id uuid,
  title text,
  artist text,
  cover_url text,
  source text,
  country_code text,
  city text,
  score bigint,
  stream_count bigint,
  save_count bigint,
  share_count bigint,
  playlist_add_count bigint,
  skip_count bigint,
  last_event_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT *
    FROM public.song_play_events e
    WHERE e.created_at >= now() - (make_interval(hours => LEAST(GREATEST(COALESCE(p_since_hours, 24), 1), 168)))
      AND (p_country_code IS NULL OR e.country_code = upper(left(p_country_code, 2)))
      AND (p_city IS NULL OR lower(e.city) = lower(p_city))
  ), ranked AS (
    SELECT
      e.track_id,
      (array_agg(e.song_id ORDER BY e.created_at DESC))[1] AS song_id,
      (array_agg(e.title ORDER BY e.created_at DESC))[1] AS title,
      (array_agg(e.artist ORDER BY e.created_at DESC))[1] AS artist,
      (array_agg(e.cover_url ORDER BY e.created_at DESC))[1] AS cover_url,
      (array_agg(e.source ORDER BY e.created_at DESC))[1] AS source,
      (array_agg(e.country_code ORDER BY e.created_at DESC))[1] AS country_code,
      (array_agg(e.city ORDER BY e.created_at DESC))[1] AS city,
      SUM(e.score_weight)::bigint AS score,
      COUNT(*) FILTER (WHERE e.action = 'stream')::bigint AS stream_count,
      COUNT(*) FILTER (WHERE e.action = 'save')::bigint AS save_count,
      COUNT(*) FILTER (WHERE e.action = 'share')::bigint AS share_count,
      COUNT(*) FILTER (WHERE e.action = 'playlist_add')::bigint AS playlist_add_count,
      COUNT(*) FILTER (WHERE e.action = 'skip')::bigint AS skip_count,
      MAX(e.created_at) AS last_event_at
    FROM filtered e
    GROUP BY e.track_id
  )
  SELECT *
  FROM ranked
  WHERE score > 0
  ORDER BY score DESC, stream_count DESC, last_event_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
$$;

REVOKE ALL ON FUNCTION public.get_viral_song_events(text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_viral_song_events(text, text, integer, integer) TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'song_play_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.song_play_events;
  END IF;
END $$;