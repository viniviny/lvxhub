

## Plano: Migrar todas as Edge Functions para Lovable AI Gateway (custo zero)

### Problema
Suas 4 edge functions usam `GOOGLE_API_KEY` diretamente, gerando R$89/mês no Google.

### Mudanças

#### 1. `supabase/functions/generate-image/index.ts`
- Remover import do `@google/generative-ai` SDK
- Chamar `https://ai.gateway.lovable.dev/v1/chat/completions` com `LOVABLE_API_KEY`
- Modelo: `google/gemini-3-pro-image-preview` (mesmo, sem custo direto)
- Usar `modalities: ["text", "image"]` e extrair base64 da resposta

#### 2. `supabase/functions/generate-text/index.ts`
- Substituir chamada OpenAI/Google por Lovable AI Gateway
- Modelo: `openai/gpt-5-nano` (suficiente para títulos/descrições, mais leve)
- Usar `LOVABLE_API_KEY`

#### 3. `supabase/functions/generate-specs/index.ts`
- Substituir chamada Google AI por Lovable AI Gateway
- Modelo: `google/gemini-2.5-flash-lite` (specs são dados simples)
- Usar `LOVABLE_API_KEY`

#### 4. `supabase/functions/analyze-product-image/index.ts`
- Substituir chamada Google AI por Lovable AI Gateway
- Modelo: `google/gemini-2.5-flash` (precisa de multimodal com qualidade)
- Enviar imagem via `image_url` no formato OpenAI-compatible
- Usar `LOVABLE_API_KEY`

#### 5. `src/hooks/useApiUsage.ts`
- Zerar `SERVICE_COSTS` (custo direto = 0)
- Atualizar `SERVICE_MODELS` com os novos nomes

### Resultado
- **Custo Google API: R$89/mês → R$0/mês**
- Mesma qualidade de resultados
- Sem necessidade de `GOOGLE_API_KEY` ou `OPENAI_API_KEY` nas funções

