-- ===== product_drafts =====
CREATE TABLE public.product_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_id UUID NOT NULL REFERENCES public.shopify_connections(id) ON DELETE CASCADE,
  market_id TEXT,
  title TEXT NOT NULL DEFAULT 'Novo Produto',
  description TEXT,
  product_type TEXT,
  collection TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  gender TEXT,
  variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
  media JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_prompt TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','published','failed')),
  shopify_product_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_drafts_user ON public.product_drafts(user_id);
CREATE INDEX idx_product_drafts_connection ON public.product_drafts(connection_id);
CREATE INDEX idx_product_drafts_status ON public.product_drafts(status);

ALTER TABLE public.product_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own drafts"
  ON public.product_drafts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own drafts"
  ON public.product_drafts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own drafts"
  ON public.product_drafts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own drafts"
  ON public.product_drafts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_product_drafts_updated
  BEFORE UPDATE ON public.product_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== generation_sessions =====
CREATE TABLE public.generation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  draft_id UUID REFERENCES public.product_drafts(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.shopify_connections(id) ON DELETE SET NULL,
  seed BIGINT,
  preset_signature TEXT,
  selected_model TEXT,
  selected_background TEXT,
  background_master_url TEXT,
  system_rules_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_generation_sessions_user ON public.generation_sessions(user_id);
CREATE INDEX idx_generation_sessions_draft ON public.generation_sessions(draft_id);

ALTER TABLE public.generation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sessions"
  ON public.generation_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions"
  ON public.generation_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions"
  ON public.generation_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions"
  ON public.generation_sessions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_generation_sessions_updated
  BEFORE UPDATE ON public.generation_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== publication_logs =====
CREATE TABLE public.publication_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_id UUID REFERENCES public.shopify_connections(id) ON DELETE SET NULL,
  draft_id UUID REFERENCES public.product_drafts(id) ON DELETE SET NULL,
  shopify_product_id TEXT,
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started','success','partial_success','failed')),
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_publication_logs_user ON public.publication_logs(user_id);
CREATE INDEX idx_publication_logs_draft ON public.publication_logs(draft_id);
CREATE INDEX idx_publication_logs_created ON public.publication_logs(created_at DESC);

ALTER TABLE public.publication_logs ENABLE ROW LEVEL SECURITY;

-- User can only read own logs; writes are done by edge function with service role (bypasses RLS).
CREATE POLICY "Users can read own publication logs"
  ON public.publication_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Defensive insert policy for edge functions running with user JWT (won't be used by service role path).
CREATE POLICY "Users can insert own publication logs"
  ON public.publication_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);