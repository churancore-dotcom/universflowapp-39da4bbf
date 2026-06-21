
-- 1. Remove owner SELECT on artist_applications base table.
-- Owners must read via the artist_applications_safe view (which excludes
-- admin_note, face_match_*, ocr_extracted_name, name_match_score,
-- auto_check_warnings) and via the get_my_artist_application_note RPC.
DROP POLICY IF EXISTS "Owners can read own artist application" ON public.artist_applications;

-- 2. Restrict stream_songs reads to authenticated users only.
DROP POLICY IF EXISTS "Public can read stream songs" ON public.stream_songs;
DROP POLICY IF EXISTS "Authenticated users can view stream songs" ON public.stream_songs;

CREATE POLICY "Authenticated users can view stream songs"
  ON public.stream_songs
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.stream_songs FROM anon;
