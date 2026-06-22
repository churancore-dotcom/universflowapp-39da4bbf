CREATE POLICY "artist_apps own select" ON public.artist_applications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);