-- Create storage bucket for music files
INSERT INTO storage.buckets (id, name, public) VALUES ('music', 'music', true);

-- Create storage bucket for cover images
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true);

-- Storage policies for music bucket
CREATE POLICY "Anyone can view music files" ON storage.objects FOR SELECT USING (bucket_id = 'music');
CREATE POLICY "Admins can upload music files" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'music' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can update music files" ON storage.objects FOR UPDATE USING (
  bucket_id = 'music' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can delete music files" ON storage.objects FOR DELETE USING (
  bucket_id = 'music' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);

-- Storage policies for covers bucket
CREATE POLICY "Anyone can view cover images" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "Admins can upload cover images" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'covers' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can update cover images" ON storage.objects FOR UPDATE USING (
  bucket_id = 'covers' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can delete cover images" ON storage.objects FOR DELETE USING (
  bucket_id = 'covers' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);