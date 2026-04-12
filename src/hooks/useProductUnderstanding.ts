import { useState, useCallback, useRef } from 'react';
import {
  ProductUnderstanding, ImageInsights, EMPTY_UNDERSTANDING,
  resolveFinalProductType, cleanProductType,
} from '@/types/productUnderstanding';
import { supabase } from '@/integrations/supabase/client';
import { useApiUsage } from '@/hooks/useApiUsage';

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

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
      const { data, error } = await supabase.functions.invoke('generate-with-gemini', {
        body: { mode: 'analyze-image', imageUrl },
      });
      if (error) throw error;
      if (data) {
        const insights: ImageInsights = {
          style: toNullableString(data.style),
          mainColor: toNullableString(data.mainColor),
          secondaryColor: toNullableString(data.secondaryColor),
          materialLook: toNullableString(data.materialLook),
          silhouette: toNullableString(data.silhouette),
          visualDetails: toStringArray(data.visualDetails),
          tagsFromImage: toStringArray(data.tagsFromImage),
          confidence: toNullableNumber(data.confidence),
          reason: toNullableString(data.reason),
        };
        const aiType = cleanProductType(data.productType || null, insights);
        setUnderstanding(prev => ({
          ...prev,
          aiDetectedProductType: aiType,
          imageInsights: insights,
          finalProductType: resolveFinalProductType(prev.manualProductType, aiType, undefined, insights),
        }));
        logUsage({ service: 'image-analysis', action: 'Análise de imagem', metadata: { model: 'gemini-2.5-flash', provider: 'Google Gemini Direct' } });
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
