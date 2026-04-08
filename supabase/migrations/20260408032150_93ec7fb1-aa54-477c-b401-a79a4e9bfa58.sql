
CREATE TABLE public.api_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  service TEXT NOT NULL,
  action TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  estimated_cost NUMERIC(10, 6) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage logs"
  ON public.api_usage_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert usage logs"
  ON public.api_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_api_usage_user_created ON public.api_usage_logs (user_id, created_at DESC);
CREATE INDEX idx_api_usage_service ON public.api_usage_logs (user_id, service);
