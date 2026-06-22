CREATE OR REPLACE FUNCTION public.submit_artist_application(
  p_stage_name text,
  p_real_name text,
  p_phone text,
  p_country_code text,
  p_social_links jsonb,
  p_id_doc_type public.id_doc_type,
  p_id_doc_front_path text,
  p_id_doc_back_path text,
  p_selfie_path text,
  p_artist_photo_path text,
  p_phone_hash text,
  p_id_image_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_application_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Login required.' USING ERRCODE = '28000';
  END IF;

  INSERT INTO public.artist_applications (
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
  ) VALUES (
    v_user_id,
    NULLIF(BTRIM(p_stage_name), ''),
    NULLIF(BTRIM(p_real_name), ''),
    NULLIF(BTRIM(p_phone), ''),
    upper(left(NULLIF(BTRIM(p_country_code), ''), 2)),
    COALESCE(p_social_links, '{}'::jsonb),
    p_id_doc_type,
    p_id_doc_front_path,
    p_id_doc_back_path,
    p_selfie_path,
    p_artist_photo_path,
    NULLIF(BTRIM(p_phone_hash), ''),
    NULLIF(BTRIM(p_id_image_hash), ''),
    'pending'::public.artist_app_status
  )
  RETURNING id INTO v_application_id;

  RETURN jsonb_build_object('success', true, 'application_id', v_application_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_artist_application(text, text, text, text, jsonb, public.id_doc_type, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_artist_application(text, text, text, text, jsonb, public.id_doc_type, text, text, text, text, text, text) TO authenticated;