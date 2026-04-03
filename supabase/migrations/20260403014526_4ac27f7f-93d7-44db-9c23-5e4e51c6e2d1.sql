CREATE TABLE public.image_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  storage_path TEXT,
  tags TEXT[] DEFAULT '{}'::TEXT[],
  product_name TEXT,
  angle TEXT,
  width INTEGER,
  height INTEGER,
  size_bytes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.image_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own images" ON public.image_library FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own images" ON public.image_library FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own images" ON public.image_library FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own images" ON public.image_library FOR DELETE TO authenticated USING (auth.uid() = user_id);