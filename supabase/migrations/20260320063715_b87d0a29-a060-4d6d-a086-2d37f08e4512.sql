
-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Allow public read access
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'product-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete own product images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);
