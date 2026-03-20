
CREATE TABLE public.user_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  prompt_text TEXT NOT NULL,
  default_angles TEXT[] DEFAULT '{}',
  default_ratio TEXT DEFAULT '4:5',
  personal_notes TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own prompts" ON public.user_prompts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own prompts" ON public.user_prompts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prompts" ON public.user_prompts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own prompts" ON public.user_prompts FOR DELETE TO authenticated USING (auth.uid() = user_id);
