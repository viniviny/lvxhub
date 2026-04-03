ALTER TABLE public.shopify_connections
  ADD COLUMN IF NOT EXISTS market_config jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS logo_url text DEFAULT NULL;