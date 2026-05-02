
# Sprint 1 — Logger estruturado e remoção de `console.*`

## Objetivo
Substituir `src/lib/logger.ts` por uma versão estruturada e migrar todas as 42 ocorrências de `console.*` em `src/` (exceto `src/lib/logger.ts` e `src/test/*`) para `logger.*`.

## Tarefa 1 — Reescrever `src/lib/logger.ts`
Substituir o conteúdo atual pela versão estruturada fornecida (níveis `debug/info/warn/error`, timestamp ISO, formatação de erro com `name/message/stack`).

## Tarefa 2 — Migrar 42 ocorrências em 22 arquivos

Mapeamento exato (arquivo → linhas):

**Hooks (8 arquivos, 16 ocorrências)**
- `src/hooks/useProject.ts` — L98, 168, 179, 190, 204 (todos `error`)
- `src/hooks/useStoreContext.tsx` — L130, 248 (`error`)
- `src/hooks/useShopifyConnection.ts` — L32, 69 (`error`)
- `src/hooks/useProducts.ts` — L30, 65 (`error`)
- `src/hooks/useCustomPresets.ts` — L58, 81, 110 (`error`)
- `src/hooks/useProductUnderstanding.ts` — L88 (`warn`)
- `src/hooks/useProductSpecs.ts` — L59 (`warn`)
- `src/hooks/usePublishedProducts.ts` — L63 (`error`)
- `src/hooks/useAuth.tsx` — L85 (`error`)
- `src/hooks/useApiUsage.ts` — L56 (`error`)

**Services / lib (2 arquivos, 6 ocorrências)**
- `src/services/projectService.ts` — L15 (`warn`), L77 (`warn`), L86 (`error`), L152 (`warn`)
- `src/lib/imageOptimization.ts` — L41, L107 (`warn`)

**Components (9 arquivos, 16 ocorrências)**
- `src/components/ColorManager.tsx` — L40 (`error`), L70 (`warn`), L141 (`error`)
- `src/components/BulkVariantGenerator.tsx` — L204 (`error`)
- `src/components/ImageLibrary.tsx` — L89 (`error`)
- `src/components/ImageGeneratorModule.tsx` — L149, L248 (`error`)
- `src/components/ErrorBoundary.tsx` — L15 (`error`)
- `src/components/ImageGenerationStep.tsx` — L409 (`log`→`debug`), L444, L448, L451 (`error`), L472 (`log`→`debug`)
- `src/components/ProductHistory.tsx` — L38 (`error`)
- `src/components/admin/AdminUsers.tsx` — L73 (`error`)

**Pages (2 arquivos, 2 ocorrências)**
- `src/pages/NotFound.tsx` — L8 (`error`)
- `src/pages/Callback.tsx` — L126 (`error`)

### Regras de transformação
- `console.log(msg, obj)` → `logger.debug(msg, { context: obj })`; sem segundo arg → `logger.debug(msg)`
- `console.warn(msg, err)` → `logger.warn(msg, { error: err })`; sem segundo arg → `logger.warn(msg)`
- `console.error(msg, err)` → `logger.error(msg, err)` (a nova assinatura `error` aceita Error como segundo argumento)
- `console.error(msg)` sem segundo arg → `logger.error(msg)`
- Caso especial `ErrorBoundary.tsx` L15 (`console.error('ErrorBoundary caught:', error, info.componentStack)`) → `logger.error('ErrorBoundary caught', error, { componentStack: info.componentStack })`
- Adicionar `import { logger } from '@/lib/logger';` em todo arquivo modificado (se ainda não houver)
- Manter prefixos existentes do tipo `[ProjectService]` no texto da mensagem

## Tarefa 3 — Validação
Rodar lint e typecheck após as substituições:
- `npm run lint`
- `tsc --noEmit`
Reportar erros (se houver) e ajustar.

## Tarefa 4 — Verificação final
Executar:
```
rg -n "console\." src --glob '!src/lib/logger.ts' --glob '!src/test/**' | wc -l
```
Resultado esperado: `0`.

## Entrega
Lista final dos arquivos modificados (23 no total: logger.ts + 22 arquivos migrados) antes do commit `refactor(logger): complete migration from console.* to structured logger`.

## Detalhes técnicos
- Nova assinatura de `logger.error(message, error?, context?)` casa com a maioria dos `console.error(msg, err)` existentes — substituição quase 1:1.
- `import.meta.env.DEV` mantém `debug/info` silenciosos em produção; `warn/error` sempre logam.
- Nenhuma mudança em `supabase/functions/**` (Deno) nem em `src/test/**`.
- Sem mudanças de comportamento funcional — apenas formatação dos logs.
