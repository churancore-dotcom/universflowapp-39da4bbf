GRANT SELECT ON public.artist_applications TO authenticated;
GRANT INSERT (
  user_id, stage_name, real_name, phone, country_code, social_links,
  id_doc_type, id_doc_front_path, id_doc_back_path, selfie_path,
  artist_photo_path, status, phone_hash, id_image_hash
) ON public.artist_applications TO authenticated;
GRANT UPDATE (
  stage_name, real_name, phone, country_code, social_links,
  id_doc_type, id_doc_front_path, id_doc_back_path, selfie_path,
  artist_photo_path, status, updated_at, phone_hash, id_image_hash
) ON public.artist_applications TO authenticated;
GRANT ALL ON public.artist_applications TO service_role;