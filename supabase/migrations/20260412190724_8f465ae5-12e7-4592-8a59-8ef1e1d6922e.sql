ALTER TABLE public.image_library
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'rascunho',
  ADD COLUMN IF NOT EXISTS store_domain text DEFAULT NULL;