ALTER TABLE public.published_products
  ADD COLUMN IF NOT EXISTS source_handle text,
  ADD COLUMN IF NOT EXISTS source_origin text;

CREATE INDEX IF NOT EXISTS idx_published_products_dedupe
  ON public.published_products (user_id, store_domain, source_handle);