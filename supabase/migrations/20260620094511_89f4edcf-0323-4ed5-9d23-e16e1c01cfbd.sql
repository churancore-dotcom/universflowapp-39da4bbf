
-- 1 & 4: Remove tables that leak sensitive columns via Realtime CDC.
ALTER PUBLICATION supabase_realtime DROP TABLE public.artist_followers;
ALTER PUBLICATION supabase_realtime DROP TABLE public.artist_songs;

-- Re-add artist_songs with a column whitelist (excludes takedown_reason and other internal fields).
ALTER PUBLICATION supabase_realtime ADD TABLE public.artist_songs
  (id, artist_user_id, title, cover_url, stream_url, duration,
   play_count, like_count, download_count, view_count, status,
   created_at, updated_at);

-- 2: Let owners read their own artist_applications row directly (view uses security_invoker).
-- Keep admin_note admin-only via column-level revoke.
DROP POLICY IF EXISTS "Owners can read own artist application" ON public.artist_applications;
CREATE POLICY "Owners can read own artist application"
  ON public.artist_applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE SELECT (admin_note) ON public.artist_applications FROM authenticated;
REVOKE SELECT (admin_note) ON public.artist_applications FROM anon;

-- 3: stream_songs is part of the public catalog — allow anon read.
DROP POLICY IF EXISTS "Public can read stream songs" ON public.stream_songs;
CREATE POLICY "Public can read stream songs"
  ON public.stream_songs
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.stream_songs TO anon;
