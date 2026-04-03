

## Plano: Nomes das opções de variantes em inglês no Shopify

### Problema
Os nomes das opções enviadas ao Shopify estão em português (`Tamanho`). O usuário quer que fiquem em inglês (`Size`).

### Alterações

**1. Edge Function `supabase/functions/shopify-publish/index.ts`**
- Linha 137: `{ name: 'Tamanho' }` → `{ name: 'Size' }`
- Linha 216: `{ name: 'Tamanho' }` → `{ name: 'Size' }`
- Linha 71: fallback `'Único'` → `'One Size'`

**2. UI labels no app (mantém português)**
- Os labels na interface do app (ex: "Tamanhos e variantes" no Index.tsx) permanecem em português, pois são para o usuário do app. Apenas o que é enviado ao Shopify muda para inglês.

### Resumo
Mudança simples em 3 pontos da edge function para que os nomes das opções no Shopify apareçam em inglês.

