DROP POLICY IF EXISTS "App can record viral song events" ON public.song_play_events;
CREATE POLICY "App can record viral song events"
ON public.song_play_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR auth.uid() = user_id)
  AND char_length(track_id) BETWEEN 3 AND 220
  AND char_length(title) BETWEEN 1 AND 220
  AND char_length(artist) BETWEEN 1 AND 220
  AND action IN ('stream','save','share','playlist_add','skip')
  AND score_weight = CASE action
    WHEN 'stream' THEN 3
    WHEN 'save' THEN 5
    WHEN 'share' THEN 10
    WHEN 'playlist_add' THEN 4
    WHEN 'skip' THEN -2
    ELSE 0
  END
);