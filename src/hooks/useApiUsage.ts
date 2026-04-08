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
  'image-generation': 0,
  'text-generation': 0,
  'specs-generation': 0,
  'image-analysis': 0,
  'shopify-publish': 0,
};

export const SERVICE_LABELS: Record<ApiService, string> = {
  'image-generation': 'Geração de Imagem',
  'text-generation': 'Geração de Texto',
  'specs-generation': 'Geração de Specs',
  'image-analysis': 'Análise de Imagem',
  'shopify-publish': 'Publicação Shopify',
};

export const SERVICE_MODELS: Record<ApiService, string> = {
  'image-generation': 'gemini-3-pro-image-preview (Gateway)',
  'text-generation': 'gpt-5-nano (Gateway)',
  'specs-generation': 'gemini-2.5-flash-lite (Gateway)',
  'image-analysis': 'gemini-2.5-flash (Gateway)',
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
