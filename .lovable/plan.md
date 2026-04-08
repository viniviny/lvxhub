

## Plano: Tooltip explicativo nos botões de IA desabilitados

### O que muda
Quando `aiDisabled` está ativo (sem imagem), os botões "Gerar", "Prompts" e "Otimizar SEO" mostrarão um tooltip no hover com a mensagem **"Adicione uma imagem primeiro"**.

### Arquivos a editar

1. **`src/components/AIFieldButtons.tsx`**
   - Envolver os botões desabilitados com `Tooltip` que mostra "Adicione uma imagem primeiro" quando `disabled` é true
   - Quando não está disabled, manter o tooltip atual ("Gerar em {language}")

2. **`src/components/SEOCard.tsx`**
   - Envolver o botão "Otimizar" com `Tooltip` mostrando "Adicione uma imagem primeiro" quando `aiDisabled` é true

### Sem banner, sem mensagem extra
O sistema comunica de forma contextual — apenas quando o usuário tenta usar a funcionalidade.

