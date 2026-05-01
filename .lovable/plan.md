## Objetivo

Tornar a Importação via URL mais rápida, segura e transparente, atacando as 5 dores principais sem reescrever a tela.

## Escopo (5 melhorias)

### 1. Import paralelo com progresso ao vivo
- `import-shopify-direct` passa a processar em **lotes de 5 produtos em paralelo** (`Promise.allSettled`).
- Função retorna um `jobId` imediatamente e grava progresso em `generation_jobs` (já existe a tabela).
- Tipo do job: `shopify_import`. Campos usados: `progress`, `total_steps`, `result` (lista de criados/falhos).
- Frontend faz polling a cada 1.5s (ou Realtime) e mostra **barra de progresso + contador "X de Y publicados"** no footer sticky, substituindo o spinner único.

### 2. Detecção de duplicados
- Antes de importar, frontend consulta `published_products` filtrando por `user_id + store_domain` da loja destino e cruza por **handle de origem** (vamos guardar `source_handle` e `source_origin` em `published_products`).
- Cards já importados ganham:
  - Badge "Já importado" no canto.
  - Borda esmaecida e checkbox desabilitado por padrão.
  - Toggle "Permitir reimportar" no toolbar para casos legítimos.

### 3. Opção status + estoque
- Acima do botão "Publicar N" no footer, adicionar dois selects compactos:
  - **Status**: Ativo (default) / Rascunho.
  - **Estoque esgotado**: Continuar vendendo (default atual) / Parar de vender.
- Ambos enviados no body da função e aplicados no payload Shopify (`status`, `inventory_policy`).

### 4. Moeda correta
- `load-shopify-products` passa a extrair `presentment_prices[0].price.currency_code` quando disponível, caindo para detecção por TLD (`.com.br` → BRL, `.co.uk` → GBP) e default USD.
- Retorna `currency` e `currencySymbol` por produto.
- UI substitui o `US$` hardcoded pelo símbolo real e mostra range `min–max` quando há variantes com preços diferentes.

### 5. Retry + timeout + erros claros
- `load-shopify-products` ganha:
  - `AbortController` com timeout de 15s por página.
  - Retry simples (2 tentativas, backoff 1s/2s) em 429/5xx.
  - Mensagens específicas: "Loja bloqueia importação pública", "Timeout", "URL não é Shopify".
- `import-shopify-direct` já tem `shopifyFetch` com retry — estender para incluir timeout e propagar erro por produto no `result` do job.

## Mudanças técnicas

**Migration**
- `published_products`: adicionar colunas `source_handle text`, `source_origin text` (nullable, indexed juntos com `user_id, store_domain`).

**Edge Functions**
- `load-shopify-products/index.ts`: timeout, retry, extração de moeda, suporte a `presentment_prices`.
- `import-shopify-direct/index.ts`: criar job → responder com `jobId` → processar em background com `EdgeRuntime.waitUntil`, lotes de 5, atualizar `generation_jobs.progress` a cada lote, gravar `source_handle` + `source_origin` em `published_products`.

**Frontend** (`src/components/ImportFromURL.tsx`)
- Hook novo `useImportJob(jobId)` para polling em `generation_jobs`.
- Query inicial dos handles já importados para a `storeId` selecionada.
- Footer sticky redesenhado: selects de status/estoque + barra de progresso quando job ativo.
- Cards: badge "Já importado", símbolo de moeda dinâmico, range de preço.

## Diagrama de fluxo

```text
Usuário cola URL
   │
   ▼
load-shopify-products (timeout+retry, moeda real)
   │
   ▼
UI mostra grid com badges "Já importado" + preço correto
   │
   ▼
Usuário escolhe Status/Estoque → clica Publicar
   │
   ▼
import-shopify-direct cria job, retorna jobId
   │
   ├──> background: lotes de 5 paralelos
   │       atualiza generation_jobs.progress
   │
   ▼
UI faz polling → barra "12 de 30 publicados"
   │
   ▼
Job done → toast final + lista de erros (se houver)
```

## Fora de escopo (ficam para depois)

- Filtros avançados (vendor, faixa de preço).
- Modal de preview detalhado.
- Persistência de sessão (sessionStorage).
- Suporte a CSV/lista de URLs.
- Importar como Collections do Shopify destino.
- Histórico de importações na própria tela.
