

## Ajustar card da imagem principal para formato vertical

### O que muda

O card da imagem principal (coluna direita do Step 1) será redimensionado para respeitar a proporção escolhida na geração (1:1 ou 4:5), com layout vertical mais compacto.

### Alterações em `src/components/ImageGenerationStep.tsx`

**1. Container principal da galeria (linha ~486)**
- Mudar de `flex flex-col` para centralizar o conteúdo com largura máxima controlada
- Adicionar `items-center` para centralizar horizontalmente

**2. Viewer principal da imagem (linha ~650-652)**
- Reduzir `maxHeight` de `480px` para `400px` (4:5) e `340px` (1:1)
- Adicionar `max-width` proporcional: `320px` para 4:5, `340px` para 1:1
- Manter `aspectRatio` dinâmico baseado na proporção selecionada
- Centralizar com `mx-auto`

**3. Thumbnails (linha ~798)**
- Reduzir largura dos thumbs de `90px` para `72px`
- Centralizar a strip com `justify-center`

**4. Layout geral**
- O card da coluna direita fica mais estreito e vertical
- Grid principal muda de `grid-cols-[340px_1fr]` para `grid-cols-[340px_minmax(0,1fr)]` (sem mudança funcional, garante que não estoure)

### Resumo visual

```text
ANTES:                          DEPOIS:
┌──────────┬────────────────┐   ┌──────────┬──────────────┐
│ Controls │  ┌──────────┐  │   │ Controls │  ┌────────┐  │
│          │  │          │  │   │          │  │        │  │
│          │  │  GRANDE  │  │   │          │  │ MENOR  │  │
│          │  │          │  │   │          │  │VERTICAL│  │
│          │  │          │  │   │          │  │        │  │
│          │  └──────────┘  │   │          │  └────────┘  │
│          │  [thumbs....]  │   │          │ [thumbs...]  │
└──────────┴────────────────┘   └──────────┴──────────────┘
```

Nenhuma mudança de funcionalidade — apenas CSS/layout.

