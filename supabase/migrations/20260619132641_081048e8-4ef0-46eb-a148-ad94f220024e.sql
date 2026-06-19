
-- =========================================================
-- 1) artist_applications: remove direct SELECT for owners; expose safe view
-- =========================================================
DROP POLICY IF EXISTS "artist_apps own select" ON public.artist_applications;

CREATE POLICY "artist_apps admin select"
  ON public.artist_applications
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Safe view excludes admin_note (must be fetched via SECURITY DEFINER RPC).
DROP VIEW IF EXISTS public.artist_applications_safe;
CREATE VIEW public.artist_applications_safe
WITH (security_invoker = on) AS
SELECT
  id, user_id, stage_name, real_name, phone, country_code, social_links,
  id_doc_type, id_doc_front_path, id_doc_back_path, selfie_path,
  artist_photo_path, status, reviewed_at, reviewed_by, created_at, updated_at
FROM public.artist_applications
WHERE auth.uid() = user_id
   OR public.has_role(auth.uid(), 'admin'::public.app_role);

GRANT SELECT ON public.artist_applications_safe TO authenticated;

-- =========================================================
-- 2) artist_followers: drop public SELECT, scope to artist/follower only
-- =========================================================
DROP POLICY IF EXISTS "artist_followers anon count" ON public.artist_followers;
DROP POLICY IF EXISTS "artist_followers public select" ON public.artist_followers;

CREATE POLICY "artist_followers self or artist select"
  ON public.artist_followers
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = follower_user_id
    OR auth.uid() = artist_user_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Public aggregate count (no row enumeration)
CREATE OR REPLACE FUNCTION public.get_artist_follower_count(_artist_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint
  FROM public.artist_followers
  WHERE artist_user_id = _artist_user_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_artist_follower_count(uuid) TO anon, authenticated;

-- Helper: is the current user following an artist?
CREATE OR REPLACE FUNCTION public.is_following_artist(_artist_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.artist_followers
    WHERE artist_user_id = _artist_user_id
      AND follower_user_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_following_artist(uuid) TO authenticated;

-- =========================================================
-- 3) perf_events: allow users to SELECT their own rows
-- =========================================================
DROP POLICY IF EXISTS "Users can read their own perf events" ON public.perf_events;
CREATE POLICY "Users can read their own perf events"
  ON public.perf_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
