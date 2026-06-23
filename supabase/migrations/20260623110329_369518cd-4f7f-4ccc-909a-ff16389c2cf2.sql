DROP POLICY IF EXISTS "artist-kyc owner insert" ON storage.objects;
CREATE POLICY "artist-kyc owner insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'artist-kyc'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "artist-kyc owner update" ON storage.objects;
CREATE POLICY "artist-kyc owner update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'artist-kyc'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'artist-kyc'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Artists can upload own artist photo" ON storage.objects;
CREATE POLICY "Artists can upload own artist photo"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'covers'
    AND (storage.foldername(name))[1] = 'artist-photos'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Artists can upload own artist cover" ON storage.objects;
CREATE POLICY "Artists can upload own artist cover"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'covers'
    AND (storage.foldername(name))[1] = 'artist-covers'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Artists can update own artist files" ON storage.objects;
CREATE POLICY "Artists can update own artist files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'covers'
    AND (storage.foldername(name))[1] IN ('artist-photos', 'artist-covers')
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'covers'
    AND (storage.foldername(name))[1] IN ('artist-photos', 'artist-covers')
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "artist_apps own insert" ON public.artist_applications;
CREATE POLICY "artist_apps own insert"
  ON public.artist_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending'::public.artist_app_status);

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
    NULLIF(BTRIM(p_id_doc_front_path), ''),
    NULLIF(BTRIM(p_id_doc_back_path), ''),
    NULLIF(BTRIM(p_selfie_path), ''),
    NULLIF(BTRIM(p_artist_photo_path), ''),
    NULLIF(BTRIM(p_phone_hash), ''),
    NULLIF(BTRIM(p_id_image_hash), ''),
    'pending'::public.artist_app_status
  )
  RETURNING id INTO v_application_id;

  RETURN jsonb_build_object('success', true, 'application_id', v_application_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_artist_application(text, text, text, text, jsonb, public.id_doc_type, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_artist_application(text, text, text, text, jsonb, public.id_doc_type, text, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_artist_application(text, text, text, text, jsonb, public.id_doc_type, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_artist_application(text, text, text, text, jsonb, public.id_doc_type, text, text, text, text, text, text) TO service_role;