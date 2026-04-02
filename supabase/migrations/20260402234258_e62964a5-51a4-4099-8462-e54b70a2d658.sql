
-- Projects table
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Novo Produto',
  status text NOT NULL DEFAULT 'draft',
  step integer NOT NULL DEFAULT 1,
  product_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

-- Project images table
CREATE TABLE public.project_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  url text NOT NULL,
  storage_path text,
  is_cover boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own projects"
  ON public.projects FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- RLS for project_images
ALTER TABLE public.project_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own project images"
  ON public.project_images FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_images.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can insert own project images"
  ON public.project_images FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_images.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can update own project images"
  ON public.project_images FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_images.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can delete own project images"
  ON public.project_images FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_images.project_id AND projects.user_id = auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_projects_user_status ON public.projects(user_id, status);
CREATE INDEX idx_project_images_project ON public.project_images(project_id);
