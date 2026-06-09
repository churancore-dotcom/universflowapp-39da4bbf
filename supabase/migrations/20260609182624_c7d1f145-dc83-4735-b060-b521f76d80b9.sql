CREATE POLICY "Users can view their own song play events"
ON public.song_play_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);