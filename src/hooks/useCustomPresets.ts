import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { CustomPreset } from '@/components/ModelBackgroundPresets';

export function useCustomPresets() {
  const { user } = useAuth();
  const [presets, setPresets] = useState<CustomPreset[]>([]);
  const [loading, setLoading] = useState(true);

  // Load presets from DB
  useEffect(() => {
    if (!user) { setPresets([]); setLoading(false); return; }

    const load = async () => {
      const { data, error } = await supabase
        .from('custom_presets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setPresets(data.map(r => ({
          id: r.id,
          label: r.label,
          descriptor: r.descriptor,
          image: r.image_url,
          type: r.type as 'model' | 'background',
        })));
      }
      setLoading(false);
    };
    load();
  }, [user]);

  // Add preset: upload image to storage, insert row
  const addPreset = useCallback(async (preset: CustomPreset) => {
    if (!user) return;

    let imageUrl = preset.image;

    // If it's a data URL, upload to storage
    if (preset.image.startsWith('data:')) {
      const match = preset.image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64 = match[2];
        const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
        const fileName = `presets/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, bytes, { contentType: mimeType, upsert: false });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error('Erro ao salvar imagem do preset');
          return;
        }

        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
    }

    const { data, error } = await supabase
      .from('custom_presets')
      .insert({
        user_id: user.id,
        label: preset.label,
        descriptor: preset.descriptor,
        image_url: imageUrl,
        type: preset.type,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      toast.error('Erro ao salvar preset');
      return;
    }

    setPresets(prev => [...prev, {
      id: data.id,
      label: data.label,
      descriptor: data.descriptor,
      image: data.image_url,
      type: data.type as 'model' | 'background',
    }]);
  }, [user]);

  // Remove preset
  const removePreset = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('custom_presets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      toast.error('Erro ao remover preset');
      return;
    }

    setPresets(prev => prev.filter(p => p.id !== id));
  }, []);

  return { presets, loading, addPreset, removePreset };
}
