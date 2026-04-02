import { useState, useCallback, useRef } from 'react';
import {
  ProductUnderstanding, ImageInsights, EMPTY_UNDERSTANDING,
  EMPTY_IMAGE_INSIGHTS, resolveFinalProductType,
} from '@/types/productUnderstanding';
import { supabase } from '@/integrations/supabase/client';

export function useProductUnderstanding() {
  const [understanding, setUnderstanding] = useState<ProductUnderstanding>(EMPTY_UNDERSTANDING);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const lastAnalyzedUrl = useRef<string | null>(null);

  const setManualProductType = useCallback((value: string) => {
    setUnderstanding(prev => {
      const manual = value || null;
      return {
        ...prev,
        manualProductType: manual,
        finalProductType: resolveFinalProductType(manual, prev.aiDetectedProductType),
      };
    });
  }, []);

  const analyzeImage = useCallback(async (imageUrl: string) => {
    if (!imageUrl || lastAnalyzedUrl.current === imageUrl) return;
    lastAnalyzedUrl.current = imageUrl;
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-product-image', {
        body: { imageUrl },
      });
      if (error) throw error;
      if (data) {
        const insights: ImageInsights = {
          style: data.style || null,
          mainColor: data.mainColor || null,
          secondaryColor: data.secondaryColor || null,
          materialLook: data.materialLook || null,
          silhouette: data.silhouette || null,
          visualDetails: data.visualDetails || [],
          tagsFromImage: data.tagsFromImage || [],
        };
        const aiType = data.productType || null;
        setUnderstanding(prev => ({
          ...prev,
          aiDetectedProductType: aiType,
          imageInsights: insights,
          finalProductType: resolveFinalProductType(prev.manualProductType, aiType),
        }));
      }
    } catch (e) {
      console.warn('[ProductUnderstanding] Image analysis failed:', e);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const updateFinalFromTitle = useCallback((title: string) => {
    setUnderstanding(prev => {
      if (prev.manualProductType || prev.aiDetectedProductType) return prev;
      const fallback = resolveFinalProductType(null, null, title);
      if (fallback === prev.finalProductType) return prev;
      return { ...prev, finalProductType: fallback };
    });
  }, []);

  const reset = useCallback(() => {
    setUnderstanding(EMPTY_UNDERSTANDING);
    lastAnalyzedUrl.current = null;
  }, []);

  return {
    understanding,
    isAnalyzing,
    setManualProductType,
    analyzeImage,
    updateFinalFromTitle,
    reset,
  };
}
