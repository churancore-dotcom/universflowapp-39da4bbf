-- Allow authenticated users to upload audio files to requests/ folder
CREATE POLICY "Users can upload song request audio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'music' AND
  (storage.foldername(name))[1] = 'requests' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to upload cover images to requests/ folder
CREATE POLICY "Users can upload song request covers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'covers' AND
  (storage.foldername(name))[1] = 'requests' AND
  (storage.foldername(name))[2] = auth.uid()::text
);
