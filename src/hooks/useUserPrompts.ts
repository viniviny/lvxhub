import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface UserPrompt {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  prompt_text: string;
  default_angles: string[];
  default_ratio: string;
  personal_notes: string | null;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export type UserPromptInsert = Omit<UserPrompt, 'id' | 'user_id' | 'usage_count' | 'last_used_at' | 'created_at' | 'updated_at'>;

export function useUserPrompts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ['user_prompts', user?.id];

  const { data: prompts = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_prompts' as any)
        .select('*')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as UserPrompt[];
    },
  });

  const createPrompt = useMutation({
    mutationFn: async (input: UserPromptInsert) => {
      const { data, error } = await supabase
        .from('user_prompts' as any)
        .insert({ ...input, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as UserPrompt;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success('Prompt criado!'); },
    onError: () => toast.error('Erro ao criar prompt'),
  });

  const updatePrompt = useMutation({
    mutationFn: async ({ id, ...input }: Partial<UserPromptInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from('user_prompts' as any)
        .update({ ...input, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as UserPrompt;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success('Prompt atualizado!'); },
    onError: () => toast.error('Erro ao atualizar prompt'),
  });

  const deletePrompt = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_prompts' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success('Prompt excluído!'); },
    onError: () => toast.error('Erro ao excluir prompt'),
  });

  const incrementUsage = useMutation({
    mutationFn: async (id: string) => {
      const prompt = prompts.find(p => p.id === id);
      if (!prompt) return;
      await supabase
        .from('user_prompts' as any)
        .update({ usage_count: prompt.usage_count + 1, last_used_at: new Date().toISOString() } as any)
        .eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const recentPrompts = [...prompts].sort((a, b) => {
    const aTime = a.last_used_at || a.created_at;
    const bTime = b.last_used_at || b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  }).slice(0, 3);

  return { prompts, isLoading, createPrompt, updatePrompt, deletePrompt, incrementUsage, recentPrompts };
}
