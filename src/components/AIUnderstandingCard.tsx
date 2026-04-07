import { Brain, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import type { ProductUnderstanding } from '@/types/productUnderstanding';
import type { ProductSpecs } from '@/hooks/useProductSpecs';

interface AIUnderstandingCardProps {
  understanding: ProductUnderstanding;
  gender: string;
  specs?: ProductSpecs | null;
  isGeneratingSpecs?: boolean;
  onRegenerateSpecs?: () => void;
}

export function AIUnderstandingCard({ understanding, gender, specs, isGeneratingSpecs, onRegenerateSpecs }: AIUnderstandingCardProps) {
  const ins = understanding.imageInsights;
  const hasAny = understanding.finalProductType || ins.style || ins.mainColor || ins.silhouette || ins.materialLook || specs;

  if (!hasAny) return null;

  const resolvedStyle = understanding.manualStyle || specs?.style || ins.style || null;
  const resolvedColor = understanding.manualColor || ins.mainColor || null;
  const resolvedFit = understanding.manualFit || specs?.fit || ins.silhouette || null;
  const resolvedMaterial = understanding.manualMaterial || specs?.material || ins.materialLook || null;

  const items: { label: string; value: string }[] = [];
  if (understanding.finalProductType) items.push({ label: 'Produto', value: understanding.finalProductType });
  if (gender) items.push({ label: 'Gênero', value: gender.charAt(0).toUpperCase() + gender.slice(1) });
  if (resolvedStyle) items.push({ label: 'Estilo', value: resolvedStyle });
  if (resolvedColor) items.push({ label: 'Cor', value: resolvedColor });
  if (resolvedFit) items.push({ label: 'Fit', value: resolvedFit });
  if (resolvedMaterial) items.push({ label: 'Material', value: resolvedMaterial });
  if (understanding.useCase || specs?.use_case) items.push({ label: 'Uso', value: understanding.useCase || specs?.use_case || '' });
  if (specs?.season && specs.season !== 'N/A') items.push({ label: 'Estação', value: specs.season });
  if (specs?.collar_type && specs.collar_type !== 'N/A') items.push({ label: 'Gola', value: specs.collar_type });
  if (specs?.sleeve_type && specs.sleeve_type !== 'N/A') items.push({ label: 'Manga', value: specs.sleeve_type });

  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-primary/10 bg-primary/5 px-3 py-2.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Brain className="w-3 h-3 text-primary/60" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/60">
            AI Understanding
          </span>
          {specs && <Sparkles className="w-2.5 h-2.5 text-primary/40" />}
        </div>
        {onRegenerateSpecs && (
          <button
            onClick={onRegenerateSpecs}
            disabled={isGeneratingSpecs}
            className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          >
            {isGeneratingSpecs ? (
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
            ) : (
              <RefreshCw className="w-2.5 h-2.5" />
            )}
            {isGeneratingSpecs ? 'Gerando...' : 'Regenerar'}
          </button>
        )}
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
