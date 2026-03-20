
-- 1. Add user_id to shopify_connections
ALTER TABLE public.shopify_connections ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Drop the wide-open RLS policy
DROP POLICY IF EXISTS "Allow all access to shopify_connections" ON public.shopify_connections;

-- 3. Add proper RLS policies for shopify_connections
CREATE POLICY "Users can read own connections"
ON public.shopify_connections FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections"
ON public.shopify_connections FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections"
ON public.shopify_connections FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections"
ON public.shopify_connections FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all connections"
ON public.shopify_connections FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all connections"
ON public.shopify_connections FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Create security_logs table
CREATE TABLE public.security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  attempted_route text,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read security logs
CREATE POLICY "Admins can read security logs"
ON public.security_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Anyone authenticated can insert logs (for logging unauthorized attempts)
CREATE POLICY "Authenticated users can insert logs"
ON public.security_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
