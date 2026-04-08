import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ApiService = 'image-generation' | 'text-generation' | 'specs-generation' | 'image-analysis' | 'shopify-publish';

interface LogUsageParams {
  service: ApiService;
  action: string;
  tokensUsed?: number;
  estimatedCost?: number;
  metadata?: Record<string, unknown>;
}

// Estimated costs per call (rough averages in USD)
export const SERVICE_COSTS: Record<ApiService, number> = {
  'image-generation': 0.04,
  'text-generation': 0.005,
  'specs-generation': 0.003,
  'image-analysis': 0.01,
  'shopify-publish': 0,
};

export const SERVICE_LABELS: Record<ApiService, string> = {
  'image-generation': 'Gemini Imagen 3 (Imagem)',
  'text-generation': 'Gemini 2.5 Flash (Texto)',
  'specs-generation': 'Gemini 2.5 Flash (Specs)',
  'image-analysis': 'Gemini 2.5 Flash (Análise)',
  'shopify-publish': 'Shopify Admin API',
};

export function useApiUsage() {
  const logUsage = useCallback(async ({ service, action, tokensUsed = 0, estimatedCost, metadata = {} }: LogUsageParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const cost = estimatedCost ?? SERVICE_COSTS[service] ?? 0;

      await (supabase as any).from('api_usage_logs').insert({
        user_id: user.id,
        service,
        action,
        tokens_used: tokensUsed,
        estimated_cost: cost,
        metadata,
      });
    } catch (err) {
      console.error('Failed to log API usage:', err);
    }
  }, []);

  return { logUsage };
}
