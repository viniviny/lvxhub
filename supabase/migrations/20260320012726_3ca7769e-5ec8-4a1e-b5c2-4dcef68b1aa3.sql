
ALTER TABLE public.shopify_connections ENABLE ROW LEVEL SECURITY;

-- Temporary permissive policy (should be replaced with auth-based policy later)
CREATE POLICY "Allow all access to shopify_connections"
  ON public.shopify_connections
  FOR ALL
  USING (true)
  WITH CHECK (true);
