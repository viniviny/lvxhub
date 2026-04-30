-- ============================================================
-- IMAGE STUDIO — independent visual creation system
-- ============================================================

-- 1. visual_projects ------------------------------------------
CREATE TABLE public.visual_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Novo Projeto Visual',
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_visual_projects_user ON public.visual_projects(user_id, updated_at DESC);
ALTER TABLE public.visual_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own visual projects" ON public.visual_projects
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own visual projects" ON public.visual_projects
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own visual projects" ON public.visual_projects
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own visual projects" ON public.visual_projects
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all visual projects" ON public.visual_projects
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_visual_projects_updated
  BEFORE UPDATE ON public.visual_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. image_sessions -------------------------------------------
CREATE TABLE public.image_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.visual_projects(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Sessão',
  visual_dna jsonb NOT NULL DEFAULT '{}'::jsonb,
  seed_base text,
  seed_family text,
  anchor_image_id uuid,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_image_sessions_project ON public.image_sessions(project_id, updated_at DESC);
CREATE INDEX idx_image_sessions_user ON public.image_sessions(user_id);
ALTER TABLE public.image_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own image sessions" ON public.image_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own image sessions" ON public.image_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own image sessions" ON public.image_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own image sessions" ON public.image_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_image_sessions_updated
  BEFORE UPDATE ON public.image_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. studio_images --------------------------------------------
CREATE TABLE public.studio_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.visual_projects(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.image_sessions(id) ON DELETE CASCADE,
  parent_image_id uuid REFERENCES public.studio_images(id) ON DELETE SET NULL,
  branch_id uuid,
  image_url text,
  storage_path text,
  prompt text,
  final_prompt text,
  negative_prompt text,
  mode text,
  role text NOT NULL DEFAULT 'variation',
  status text NOT NULL DEFAULT 'processing',
  width int,
  height int,
  aspect_ratio text,
  format text DEFAULT 'png',
  provider text DEFAULT 'lovable-ai',
  model text,
  seed text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_studio_images_session ON public.studio_images(session_id, created_at DESC);
CREATE INDEX idx_studio_images_project ON public.studio_images(project_id, created_at DESC);
CREATE INDEX idx_studio_images_parent ON public.studio_images(parent_image_id);
CREATE INDEX idx_studio_images_branch ON public.studio_images(branch_id);
CREATE INDEX idx_studio_images_user_approved ON public.studio_images(user_id, approved) WHERE approved = true;
ALTER TABLE public.studio_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own studio images" ON public.studio_images
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own studio images" ON public.studio_images
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own studio images" ON public.studio_images
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own studio images" ON public.studio_images
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_studio_images_updated
  BEFORE UPDATE ON public.studio_images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FK soft for anchor_image_id (added after studio_images exists)
ALTER TABLE public.image_sessions
  ADD CONSTRAINT image_sessions_anchor_fk
  FOREIGN KEY (anchor_image_id) REFERENCES public.studio_images(id) ON DELETE SET NULL;

-- 4. studio_presets -------------------------------------------
CREATE TABLE public.studio_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  description text,
  preset_type text NOT NULL DEFAULT 'style',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_studio_presets_user ON public.studio_presets(user_id);
CREATE INDEX idx_studio_presets_type ON public.studio_presets(preset_type);
ALTER TABLE public.studio_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed reads system presets" ON public.studio_presets
  FOR SELECT TO authenticated USING (is_system = true OR auth.uid() = user_id);
CREATE POLICY "Users insert own presets" ON public.studio_presets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND is_system = false);
CREATE POLICY "Users update own presets" ON public.studio_presets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id AND is_system = false)
                              WITH CHECK (auth.uid() = user_id AND is_system = false);
CREATE POLICY "Users delete own presets" ON public.studio_presets
  FOR DELETE TO authenticated USING (auth.uid() = user_id AND is_system = false);

CREATE TRIGGER trg_studio_presets_updated
  BEFORE UPDATE ON public.studio_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Storage bucket for studio images -------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('studio-images', 'studio-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Studio images public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'studio-images');

CREATE POLICY "Users upload to own studio folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'studio-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own studio files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'studio-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own studio files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'studio-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 6. Seed some system presets ---------------------------------
INSERT INTO public.studio_presets (name, description, preset_type, is_system, config) VALUES
('Quiet Luxury', 'Editorial premium, neutral backdrop, soft studio light', 'style', true,
 '{"style_direction":"quiet luxury editorial, premium minimalism","camera_style":"medium-format, 50mm, shallow depth","lighting_style":"soft diffused studio light, gentle shadows","background_style":"neutral seamless paper, warm beige","color_palette":"muted neutrals, beige, ivory, taupe","negative_prompt":"oversaturated, plastic, cheap, low quality, watermark"}'::jsonb),
('Ecommerce Clean', 'Clean white background, product-focused', 'style', true,
 '{"style_direction":"ecommerce product photography, hyper clean","camera_style":"50mm, centered, eye level","lighting_style":"bright even softbox lighting","background_style":"pure white seamless","color_palette":"true to product color","negative_prompt":"shadows on background, color cast, blur, noise"}'::jsonb),
('Lifestyle Editorial', 'Natural environment, magazine-style mood', 'style', true,
 '{"style_direction":"lifestyle editorial, candid magazine moment","camera_style":"35mm, natural framing","lighting_style":"natural window light, golden hour","background_style":"contextual lifestyle environment","color_palette":"warm cinematic tones","negative_prompt":"studio backdrop, sterile, overlit"}'::jsonb),
('Marketplace Cover', '1:1 cover optimized for marketplaces', 'pack', true,
 '{"aspect_ratio":"1:1","style_direction":"marketplace clean cover","background_style":"pure white","camera_style":"centered product"}'::jsonb),
('Ads Pack', '4:5 / 9:16 / 1:1 / 16:9 creative set', 'pack', true,
 '{"variants":[{"role":"ads_version","aspect_ratio":"4:5"},{"role":"ads_version","aspect_ratio":"9:16"},{"role":"ads_version","aspect_ratio":"1:1"},{"role":"ads_version","aspect_ratio":"16:9"}]}'::jsonb),
('Ecommerce Product Pack', 'Hero + product-only + detail + lifestyle', 'pack', true,
 '{"variants":[{"role":"hero_image","aspect_ratio":"4:5"},{"role":"variation","aspect_ratio":"1:1"},{"role":"detail_shot","aspect_ratio":"1:1"},{"role":"variation","aspect_ratio":"4:5","mode":"lifestyle"}]}'::jsonb),
('Model Photoshoot Pack', 'Front / back / side / editorial', 'pack', true,
 '{"variants":[{"role":"model_shot","aspect_ratio":"4:5","mode":"front"},{"role":"model_shot","aspect_ratio":"4:5","mode":"back"},{"role":"model_shot","aspect_ratio":"4:5","mode":"side"},{"role":"model_shot","aspect_ratio":"4:5","mode":"editorial"}]}'::jsonb);
