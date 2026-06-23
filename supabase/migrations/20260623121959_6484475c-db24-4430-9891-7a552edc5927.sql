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
  id_image_hash,
  status
) ON public.artist_applications TO authenticated;

GRANT UPDATE (
  social_links,
  id_doc_type,
  id_doc_front_path,
  id_doc_back_path,
  selfie_path,
  artist_photo_path,
  id_image_hash,
  status,
  admin_note,
  reviewed_by,
  reviewed_at,
  face_match_score,
  face_match_status,
  ocr_extracted_name,
  name_match_score,
  auto_check_warnings,
  auto_checks_at,
  updated_at
) ON public.artist_applications TO authenticated;

GRANT SELECT ON public.artist_applications_safe TO authenticated;
GRANT ALL ON public.artist_applications TO service_role;

DROP POLICY IF EXISTS "artist_apps own insert" ON public.artist_applications;
CREATE POLICY "artist_apps own insert"
  ON public.artist_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending'::public.artist_app_status);

DROP POLICY IF EXISTS "artist_apps own update" ON public.artist_applications;
CREATE POLICY "artist_apps own update"
  ON public.artist_applications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status IN ('pending'::public.artist_app_status, 'rejected'::public.artist_app_status))
  WITH CHECK (auth.uid() = user_id AND status = 'pending'::public.artist_app_status);

DROP POLICY IF EXISTS "artist_apps admin update" ON public.artist_applications;
CREATE POLICY "artist_apps admin update"
  ON public.artist_applications
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));