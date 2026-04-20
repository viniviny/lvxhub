---
name: Async Job Queue (Generation Jobs)
description: Sistema de fila assíncrona para gerar imagens IA em background, contornando limite de 150s de Edge Functions
type: feature
---
Tabela `generation_jobs` (status: pending|processing|completed|failed, progress, result jsonb) com RLS por user_id e Realtime habilitado.

Fluxo:
1. Cliente chama `enqueue-generation-job` (insere job + dispara worker via `EdgeRuntime.waitUntil`)
2. Worker `process-generation-job` executa em background, atualiza progress
3. Cliente assina via `useGenerationJob` (Realtime postgres_changes em `id=eq.{jobId}`)

**How to apply:** Para qualquer geração que arrisca timeout (4+ imagens, Nano Banana 2), usar `useGenerationJob().enqueue({ type: 'generate-images', payload, totalSteps })` em vez de chamar `generate-with-gemini` diretamente.

Tipos suportados hoje: `generate-images` (lote de ângulos via Lovable AI Gateway, modelo `google/gemini-3-pro-image-preview`).