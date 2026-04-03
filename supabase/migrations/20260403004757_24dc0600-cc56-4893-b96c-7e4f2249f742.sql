
CREATE POLICY "Users can update own published products"
ON public.published_products
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own published products"
ON public.published_products
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
