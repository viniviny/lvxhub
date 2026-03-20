
CREATE TABLE public.published_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shopify_product_id text,
  title text NOT NULL,
  description text,
  collection text,
  sizes text[] DEFAULT '{}',
  image_url text,
  -- Market details
  store_domain text NOT NULL,
  country_code text,
  country_flag text,
  country_name text,
  currency text,
  currency_symbol text,
  local_price numeric(12,2),
  base_price numeric(12,2),
  base_currency text,
  language text,
  language_label text,
  market_name text,
  region_group text,
  shopify_url text,
  status text NOT NULL DEFAULT 'publicado',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.published_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own published products"
ON public.published_products FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own published products"
ON public.published_products FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all published products"
ON public.published_products FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_published_products_user_id ON public.published_products(user_id);
CREATE INDEX idx_published_products_country ON public.published_products(country_code);
CREATE INDEX idx_published_products_created ON public.published_products(created_at DESC);
