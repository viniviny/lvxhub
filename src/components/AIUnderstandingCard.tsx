import { Brain, Sparkles } from 'lucide-react';
import type { ProductUnderstanding } from '@/types/productUnderstanding';

interface AIUnderstandingCardProps {
  understanding: ProductUnderstanding;
  gender: string;
}

export function AIUnderstandingCard({ understanding, gender }: AIUnderstandingCardProps) {
  const ins = understanding.imageInsights;
  const hasAny = understanding.finalProductType || ins.style || ins.mainColor || ins.silhouette || ins.materialLook;

  if (!hasAny) return null;

  const resolvedStyle = understanding.manualStyle || ins.style || null;
  const resolvedColor = understanding.manualColor || ins.mainColor || null;
  const resolvedFit = understanding.manualFit || ins.silhouette || null;
  const resolvedMaterial = understanding.manualMaterial || ins.materialLook || null;

  const items: { label: string; value: string }[] = [];
  if (understanding.finalProductType) items.push({ label: 'Produto', value: understanding.finalProductType });
  if (gender) items.push({ label: 'Gênero', value: gender.charAt(0).toUpperCase() + gender.slice(1) });
  if (resolvedStyle) items.push({ label: 'Estilo', value: resolvedStyle });
  if (resolvedColor) items.push({ label: 'Cor', value: resolvedColor });
  if (resolvedFit) items.push({ label: 'Fit', value: resolvedFit });
  if (resolvedMaterial) items.push({ label: 'Material', value: resolvedMaterial });
  if (understanding.useCase) items.push({ label: 'Uso', value: understanding.useCase });

  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-primary/10 bg-primary/5 px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <Brain className="w-3 h-3 text-primary/60" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/60">
          AI Understanding
        </span>
        <Sparkles className="w-2.5 h-2.5 text-primary/40" />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {items.map(item => (
          <div key={item.label} className="flex items-baseline gap-1">
            <span className="text-[10px] text-muted-foreground">{item.label}:</span>
            <span className="text-[11px] font-medium text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
