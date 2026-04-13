
CREATE TABLE public.custom_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  descriptor TEXT NOT NULL,
  image_url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('model', 'background')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own presets"
  ON public.custom_presets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own presets"
  ON public.custom_presets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets"
  ON public.custom_presets FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_custom_presets_user ON public.custom_presets (user_id);
