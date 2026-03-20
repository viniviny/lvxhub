

## Redesign: Publicação como Accordion no Step 4

### O que muda

Move the publication controls (status pills + sales channel pills + publish button) from the bottom navigation bar back into the left column as a collapsible accordion. The bottom bar for Step 4 simplifies to just "← Voltar" and "Step 4 de 4".

### Changes to `src/pages/Index.tsx`

**Step 4 left column** (lines 510-516): Add a collapsible accordion below the checklist card:

1. **Accordion section** using Radix Collapsible (already available via `@/components/ui/collapsible`):
   - Trigger row: "PUBLICAÇÃO" label left + summary "Ativo · Online Store" right + chevron
   - Default: collapsed
   - Content when expanded:
     - Status pills row: `[Rascunho] [Ativo] [Agendar]` — same logic as current
     - Sales channel toggle pills row: `[🖥 Online Store ✓] [📦 POS] [G Google]` with the specified ON/OFF styling
   - Smooth 0.2s expand animation

2. **"⚡ Publicar agora" button** always visible below accordion, full width

**Bottom nav bar** (lines 544-598): For Step 4, remove the status pills, channel pills, and publish button. Show only "← Voltar" left + "Step 4 de 4" center (same as other steps).

### Styling details

- Accordion trigger: `text-[10px] uppercase tracking-wider text-muted-foreground font-semibold`
- Summary text: `text-[11px] text-muted-foreground`
- Channel pills: height 26px, font-size 10px, with specified ON/OFF colors (`bg-primary/10 border-primary text-[#58A6FF]` vs `bg-[#1C2333] border-[#30363D] text-muted-foreground`)
- Status pills: height 28px, font-size 11px
- Publish button: full width, standard primary style

### New state

- Add `const [pubOpen, setPubOpen] = useState(false)` for accordion

### Import additions

- `Collapsible, CollapsibleTrigger, CollapsibleContent` from `@/components/ui/collapsible`
- `ChevronDown` from lucide-react

