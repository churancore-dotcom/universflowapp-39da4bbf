GRANT INSERT (
  user_id,
  stage_name,
  real_name,
  phone,
  country_code,
  social_links,
  id_doc_type,
  id_doc_front_path,
  id_doc_back_path,
  selfie_path,
  artist_photo_path,
  phone_hash,
  id_image_hash
) ON public.artist_applications TO authenticated;

GRANT SELECT (
  id,
  user_id,
  stage_name,
  real_name,
  phone,
  country_code,
  social_links,
  id_doc_type,
  artist_photo_path,
  status,
  reviewed_at,
  reviewed_by,
  created_at,
  updated_at
) ON public.artist_applications TO authenticated;

GRANT UPDATE (
  social_links,
  id_doc_type,
  id_doc_front_path,
  id_doc_back_path,
  selfie_path,
  artist_photo_path,
  id_image_hash,
  updated_at
) ON public.artist_applications TO authenticated;

GRANT ALL ON public.artist_applications TO service_role;
GRANT SELECT ON public.artist_applications_safe TO authenticated;

DROP POLICY IF EXISTS "artist_apps own select" ON public.artist_applications;
CREATE POLICY "artist_apps own select"
ON public.artist_applications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "artist_apps own insert" ON public.artist_applications;
CREATE POLICY "artist_apps own insert"
ON public.artist_applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending'::public.artist_app_status);