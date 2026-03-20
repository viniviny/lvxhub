
CREATE TABLE public.shopify_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_domain text NOT NULL,
  access_token text NOT NULL,
  shop_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Only keep one active connection at a time
CREATE UNIQUE INDEX idx_shopify_active ON public.shopify_connections (is_active) WHERE is_active = true;
