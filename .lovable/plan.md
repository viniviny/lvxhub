

# Plano: Elevação para SaaS Premium

Análise das funcionalidades atuais e melhorias estratégicas para posicionar o LVX Hub como um SaaS premium de geração de produtos para e-commerce.

## Estado Atual (pontos fortes)

- Wizard de 4 passos bem estruturado
- Geração de imagens IA com presets premium (Zara/COS style)
- Pricing engine com câmbio multi-país
- Multi-loja Shopify com grupos regionais
- Histórico de publicações + biblioteca de imagens
- Autosave de drafts + recuperação de sessão

## Melhorias Propostas (priorizadas por impacto)

### 1. Fila Assíncrona de Geração (Crítico)
**Problema:** Edge Functions têm limite de 150s. Hoje, gerar 4 imagens em paralelo arrisca timeout.
**Solução:** Tabela `generation_jobs` + edge function que enfileira e retorna `job_id` imediato. Worker processa em background. Cliente faz polling/Realtime.
**Ganho:** Permite usar Nano Banana 2 (premium), múltiplos ângulos sem timeout, e o usuário pode fechar a aba.

### 2. Onboarding Guiado Interativo
**Problema:** Usuário novo cai direto no Step 1 sem entender o fluxo.
**Solução:** Tour interativo (3-5 passos) na primeira sessão: conectar Shopify → gerar 1 imagem → publicar produto demo. Marca conclusão no `profiles`.
**Ganho:** Time-to-value reduzido, ativação maior.

### 3. Dashboard de Métricas (Home)
**Problema:** Home atual é genérica. Não mostra valor entregue.
**Solução:** Cards com: produtos publicados (mês), imagens geradas, economia estimada vs fotógrafo (R$/imagem), taxa de sucesso de publicação, gráfico semanal.
**Ganho:** Justifica assinatura, vira "dopamine hook".

### 4. Sistema de Créditos & Planos
**Problema:** Sem monetização clara. Usuário não percebe limites.
**Solução:** Tabela `user_credits` + `subscription_plans`. Free (10 imgs/mês), Pro (200 + Nano Banana 2), Business (ilimitado + multi-loja). Integrar Stripe via Lovable.
**Ganho:** Receita recorrente. Pré-requisito para SaaS.

### 5. Templates de Produto (Quick Start)
**Problema:** Cada produto começa do zero.
**Solução:** Galeria de templates pré-configurados (Camiseta Premium, Vestido Editorial, Tênis Lifestyle...) com prompt + ângulos + presets já definidos. Usuário escolhe e edita.
**Ganho:** Reduz fricção, padroniza qualidade.

### 6. A/B Testing de Imagens
**Problema:** Usuário gera 4 imagens, escolhe 1 no "olhômetro".
**Solução:** Após publicar, botão "Testar variantes" cria 2 versões do produto no Shopify (URLs diferentes) e mostra qual converteu mais (via webhook de pedidos).
**Ganho:** Diferencial competitivo único.

### 7. Editor de Imagem Pós-Geração
**Problema:** Se a imagem sai 90% boa, usuário precisa regenerar tudo.
**Solução:** Editor inline com Gemini (inpainting): "remover tag", "trocar cor de fundo", "adicionar sombra". Usa imagem gerada como referência.
**Ganho:** Evita regenerações caras, aumenta aproveitamento.

### 8. Bulk Mode (Importação em Massa)
**Problema:** Wizard é 1 produto por vez. Lojista com 50 produtos sofre.
**Solução:** Upload CSV/planilha com lista de produtos → fila gera tudo em background → relatório final. Reaproveita fila assíncrona (item 1).
**Ganho:** Conquista clientes maiores (LTV alto).

### 9. Webhooks & Integrações
**Problema:** Só Shopify. Mercado tem WooCommerce, Tray, Nuvemshop.
**Solução:** Adapter pattern para canais. Começar por Nuvemshop (forte no BR).
**Ganho:** Expande TAM.

### 10. Notificações & Atividade
**Problema:** Após publicar, sem follow-up.
**Solução:** Centro de notificações in-app + email transacional: "produto X publicado", "geração concluída", "crédito acabando". Tabela `notifications` + Realtime.
**Ganho:** Re-engajamento, profissionalismo.

### 11. Refinamentos de UX Premium
- **Command Palette** (Cmd+K): busca global, ações rápidas
- **Skeleton loaders** consistentes em todos os fetches
- **Empty states** ilustrados com CTAs claros
- **Atalhos de teclado** (←/→ navegar passos, Cmd+S salvar)
- **Modo escuro** já existe — adicionar toggle visível no header

### 12. Confiança & Segurança
- Página pública de status (`/status`) com uptime
- Logs de auditoria por usuário (quem publicou o quê, quando)
- Backup/exportação de projetos em JSON

## Roadmap Sugerido (ordem de execução)

```text
Fase 1 — Estabilidade (semana 1-2)
  └─ Item 1: Fila assíncrona
  └─ Item 11: Refinamentos UX

Fase 2 — Monetização (semana 3-4)
  └─ Item 4: Créditos + Stripe
  └─ Item 3: Dashboard de métricas

Fase 3 — Ativação (semana 5)
  └─ Item 2: Onboarding
  └─ Item 5: Templates

Fase 4 — Diferenciação (semana 6+)
  └─ Item 7: Editor inline
  └─ Item 8: Bulk mode
  └─ Item 6: A/B testing
  └─ Item 9: Mais canais
  └─ Item 10: Notificações
```

## Detalhes Técnicos

- **Fila:** Tabela `generation_jobs (id, user_id, type, payload jsonb, status, result jsonb, created_at)` + RLS por `user_id`. Realtime na tabela para atualização live no cliente.
- **Créditos:** Tabela `user_credits (user_id, balance, plan, renews_at)` + trigger que decrementa em cada chamada de edge function. `subscription_plans` referenciada por `plan`.
- **Métricas:** View `user_dashboard_stats` agregando `published_products`, `image_library`, `api_usage_logs`.
- **Templates:** JSON estático em `src/data/productTemplates.ts` + tabela opcional `custom_templates` para usuários Pro.
- **Editor inline:** Reutiliza `generate-with-gemini` modo `generate-image` com referência + prompt de edição.
- **Stripe:** via tool `payments--enable_stripe_payments` da Lovable (sem chaves manuais).

## Próximo passo

Recomendo começar pela **Fase 1 (Fila Assíncrona)** porque resolve o problema raiz de timeout que afeta todas as funcionalidades de IA. Quer que eu inicie por aí, ou prefere priorizar outra fase?

