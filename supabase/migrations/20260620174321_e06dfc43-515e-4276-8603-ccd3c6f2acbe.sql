CREATE OR REPLACE FUNCTION public.reapply_artist_application(
  p_application_id uuid,
  p_social_links jsonb,
  p_id_doc_type public.id_doc_type,
  p_id_doc_front_path text,
  p_id_doc_back_path text,
  p_selfie_path text,
  p_artist_photo_path text,
  p_id_image_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app public.artist_applications%ROWTYPE;
  v_next_allowed timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Login required.' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_app
  FROM public.artist_applications
  WHERE id = p_application_id
    AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Artist application not found.' USING ERRCODE = '02000';
  END IF;

  IF v_app.status <> 'rejected'::public.artist_app_status THEN
    RAISE EXCEPTION 'Only rejected applications can be re-submitted.' USING ERRCODE = '22023';
  END IF;

  v_next_allowed := COALESCE(v_app.reviewed_at, v_app.updated_at, v_app.created_at) + interval '7 days';
  IF now() < v_next_allowed THEN
    RAISE EXCEPTION 'You can re-submit verification after %.', to_char(v_next_allowed, 'YYYY-MM-DD HH24:MI UTC')
      USING ERRCODE = '22023';
  END IF;

  IF v_app.phone_hash IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.artist_applications other
    WHERE other.id <> v_app.id
      AND other.phone_hash = v_app.phone_hash
      AND other.status IN ('pending','approved')
  ) THEN
    RAISE EXCEPTION 'This phone number is already linked to another artist account on Universflow.'
      USING ERRCODE = '23505';
  END IF;

  IF p_id_image_hash IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.artist_applications other
    WHERE other.id <> v_app.id
      AND other.id_image_hash = p_id_image_hash
      AND other.status IN ('pending','approved')
  ) THEN
    RAISE EXCEPTION 'This ID document is already linked to another artist account on Universflow.'
      USING ERRCODE = '23505';
  END IF;

  UPDATE public.artist_applications
  SET
    social_links = COALESCE(p_social_links, '{}'::jsonb),
    id_doc_type = p_id_doc_type,
    id_doc_front_path = p_id_doc_front_path,
    id_doc_back_path = p_id_doc_back_path,
    selfie_path = p_selfie_path,
    artist_photo_path = p_artist_photo_path,
    id_image_hash = p_id_image_hash,
    status = 'pending'::public.artist_app_status,
    admin_note = NULL,
    reviewed_by = NULL,
    reviewed_at = NULL,
    face_match_score = NULL,
    face_match_status = NULL,
    ocr_extracted_name = NULL,
    name_match_score = NULL,
    auto_check_warnings = NULL,
    auto_checks_at = NULL,
    updated_at = now()
  WHERE id = v_app.id;

  RETURN jsonb_build_object('success', true, 'application_id', v_app.id);
END;
$$;

REVOKE ALL ON FUNCTION public.reapply_artist_application(uuid, jsonb, public.id_doc_type, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reapply_artist_application(uuid, jsonb, public.id_doc_type, text, text, text, text, text) TO authenticated;