import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useApiUsage } from '@/hooks/useApiUsage';

export interface ProductSpecs {
  material: string;
  fabric_composition: string;
  style: string;
  fit: string;
  thickness: string;
  craft: string;
  collar_type: string;
  sleeve_type: string;
  length: string;
  season: string;
  use_case: string;
  target_audience: string;
  available_colors: string[];
  available_sizes: string[];
  additional_features: string[];
}

interface GenerateSpecsContext {
  productType: string;
  gender?: string;
  style?: string;
  mainColor?: string;
  visualDetails?: string;
}

export function useProductSpecs() {
  const [specs, setSpecs] = useState<ProductSpecs | null>(null);
  const [isGeneratingSpecs, setIsGeneratingSpecs] = useState(false);
  const { logUsage } = useApiUsage();

  const generateSpecs = useCallback(async (context: GenerateSpecsContext): Promise<ProductSpecs | null> => {
    if (!context.productType) return null;
    setIsGeneratingSpecs(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-with-gemini', {
        body: {
          mode: 'generate-specs',
          productType: context.productType,
          gender: context.gender || '',
          style: context.style || '',
          mainColor: context.mainColor || '',
          visualDetails: context.visualDetails || '',
        },
      });
      if (error) throw error;
      if (data?.specs) {
        setSpecs(data.specs);
        logUsage({ service: 'specs-generation', action: 'Gerar especificações', metadata: { model: 'gemini-2.5-flash', provider: 'Google Gemini Direct' } });
        return data.specs;
      }
      return null;
    } catch (e: any) {
      console.warn('[ProductSpecs] Generation failed:', e);
      // Silent fail — don't break flow
      return null;
    } finally {
      setIsGeneratingSpecs(false);
    }
  }, []);

  const clearSpecs = useCallback(() => {
    setSpecs(null);
  }, []);

  const restoreSpecs = useCallback((saved: ProductSpecs | null) => {
    setSpecs(saved);
  }, []);

  return { specs, isGeneratingSpecs, generateSpecs, clearSpecs, restoreSpecs };
}
