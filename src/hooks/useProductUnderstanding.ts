import { useState, useCallback, useRef } from 'react';
import {
  ProductUnderstanding, ImageInsights, EMPTY_UNDERSTANDING,
  resolveFinalProductType, cleanProductType,
} from '@/types/productUnderstanding';
import { supabase } from '@/integrations/supabase/client';
import { useApiUsage } from '@/hooks/useApiUsage';

export function useProductUnderstanding() {
  const [understanding, setUnderstanding] = useState<ProductUnderstanding>(EMPTY_UNDERSTANDING);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const lastAnalyzedUrl = useRef<string | null>(null);
  const { logUsage } = useApiUsage();

  const setManualProductType = useCallback((value: string) => {
    setUnderstanding(prev => {
      const manual = value || null;
      return {
        ...prev,
        manualProductType: manual,
        finalProductType: resolveFinalProductType(manual, prev.aiDetectedProductType, undefined, prev.imageInsights),
      };
    });
  }, []);

  const setManualField = useCallback((field: 'manualMaterial' | 'manualStyle' | 'manualColor' | 'manualFit' | 'useCase', value: string) => {
    setUnderstanding(prev => ({ ...prev, [field]: value }));
  }, []);

  const setSelectedPrompt = useCallback((type: 'title' | 'description', promptId: string | null) => {
    setUnderstanding(prev => ({
      ...prev,
      [type === 'title' ? 'selectedTitlePromptId' : 'selectedDescriptionPromptId']: promptId,
    }));
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
          confidence: data.confidence ?? null,
          reason: data.reason || null,
        };
        const aiType = cleanProductType(data.productType || null, insights);
        setUnderstanding(prev => ({
          ...prev,
          aiDetectedProductType: aiType,
          imageInsights: insights,
          finalProductType: resolveFinalProductType(prev.manualProductType, aiType, undefined, insights),
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
      const fallback = resolveFinalProductType(null, null, title, prev.imageInsights);
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
    setManualField,
    setSelectedPrompt,
    analyzeImage,
    updateFinalFromTitle,
    reset,
  };
}
