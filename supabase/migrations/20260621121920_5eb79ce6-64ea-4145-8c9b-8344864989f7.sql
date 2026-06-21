
-- 1) Remove owner direct SELECT on artist_applications base table.
-- Owners must read via the artist_applications_safe view (which excludes admin-only fields).
DROP POLICY IF EXISTS "artist_apps own select" ON public.artist_applications;

-- 2) Recreate artist_applications_safe view to also strip KYC document storage paths
--    (admins still read these directly from the base table).
DROP VIEW IF EXISTS public.artist_applications_safe;
CREATE VIEW public.artist_applications_safe
WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  stage_name,
  real_name,
  phone,
  country_code,
  social_links,
  id_doc_type,
  NULL::text AS id_doc_front_path,
  NULL::text AS id_doc_back_path,
  NULL::text AS selfie_path,
  artist_photo_path,
  status,
  reviewed_at,
  reviewed_by,
  created_at,
  updated_at
FROM public.artist_applications
WHERE auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role);

GRANT SELECT ON public.artist_applications_safe TO authenticated;
