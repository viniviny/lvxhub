import { Brain, Sparkles, RefreshCw, Loader2, Crown, Target, Tag, Palette, Shirt, Users, Layers, Award } from 'lucide-react';
import type { ProductUnderstanding } from '@/types/productUnderstanding';
import type { ProductSpecs } from '@/hooks/useProductSpecs';

interface AIProductUnderstandingPanelProps {
  understanding: ProductUnderstanding;
  gender: string;
  specs?: ProductSpecs | null;
  isGeneratingSpecs?: boolean;
  onRegenerateSpecs?: () => void;
  /** Optional: triggers a "premium tone" generation (uses RILMONT brand template behind the scenes). */
  onUsePremiumBrandTone?: () => void;
  isPremiumToneLoading?: boolean;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function AIProductUnderstandingPanel({
  understanding,
  gender,
  specs,
  isGeneratingSpecs,
  onRegenerateSpecs,
  onUsePremiumBrandTone,
  isPremiumToneLoading,
}: AIProductUnderstandingPanelProps) {
  const ins = understanding.imageInsights;
  const hasAny =
    understanding.finalProductType ||
    ins.style || ins.mainColor || ins.silhouette || ins.materialLook ||
    specs;

  if (!hasAny) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-muted-foreground" />
          <span className="label-mono">AI Product Understanding</span>
        </div>
        <p className="text-sm text-muted-foreground">
          A IA ainda não analisou este produto. Adicione uma imagem e clique em <span className="text-foreground font-medium">Reanalisar</span>.
        </p>
      </div>
    );
  }

  const productType = understanding.finalProductType || null;
  const style       = understanding.manualStyle    || specs?.style    || ins.style    || null;
  const color       = understanding.manualColor    || ins.mainColor || null;
  const fit         = understanding.manualFit      || specs?.fit      || ins.silhouette || null;
  const material    = understanding.manualMaterial || specs?.material || ins.materialLook || null;
  const audience    = gender ? cap(gender) : null;
  const useCase     = understanding.useCase || specs?.use_case || null;
  const collection  = null as string | null; // not provided by current specs schema
  const tags        = specs?.additional_features || [];

  // Confidence: count of resolved fields out of 8 main slots.
  const slots = [productType, style, color, fit, material, audience, useCase, collection];
  const resolved = slots.filter(Boolean).length;
  const confidence = Math.round((resolved / slots.length) * 100);
  const confLabel = confidence >= 75 ? 'Alta' : confidence >= 45 ? 'Média' : 'Baixa';
  const confColor = confidence >= 75 ? 'text-primary' : confidence >= 45 ? 'text-[hsl(var(--warning))]' : 'text-destructive';

  const fields: { label: string; value: string | null; icon: typeof Tag }[] = [
    { label: 'Tipo',      value: productType, icon: Shirt   },
    { label: 'Material',  value: material,    icon: Layers  },
    { label: 'Fit',       value: fit,         icon: Target  },
    { label: 'Estilo',    value: style,       icon: Sparkles },
    { label: 'Cor',       value: color,       icon: Palette },
    { label: 'Público',   value: audience,    icon: Users   },
    { label: 'Uso',       value: useCase,     icon: Award   },
    { label: 'Coleção',   value: collection,  icon: Tag     },
  ];

  return (
    <div className="rounded-2xl border border-accent/20 bg-gradient-to-b from-accent/[0.04] to-card p-5 space-y-5">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center">
            <Brain className="w-4 h-4 text-accent" strokeWidth={2} />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground tracking-tight">AI Product Understanding</h3>
            <span className="text-[10.5px] text-muted-foreground">O que a IA entendeu sobre este produto</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <div className={`text-[11px] font-semibold ${confColor}`}>Confiança {confLabel}</div>
            <div className="text-[10px] text-muted-foreground tabular-nums">{confidence}%</div>
          </div>
        </div>
      </div>

      {/* FIELDS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {fields.map(f => (
          <div key={f.label} className="rounded-xl border border-border bg-background/40 p-2.5 min-h-[58px]">
            <div className="flex items-center gap-1.5 mb-1">
              <f.icon className="w-3 h-3 text-muted-foreground" strokeWidth={2.2} />
              <span className="label-mono">{f.label}</span>
            </div>
            <div className={`text-[12.5px] font-medium ${f.value ? 'text-foreground' : 'text-muted-foreground/50 italic'}`}>
              {f.value || '—'}
            </div>
          </div>
        ))}
      </div>

      {/* TAGS */}
      {tags.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Tag className="w-3 h-3 text-muted-foreground" strokeWidth={2.2} />
            <span className="label-mono">Tags sugeridas</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 12).map((t, i) => (
              <span
                key={`${t}-${i}`}
                className="text-[10.5px] px-2 py-0.5 rounded-full border border-border bg-secondary/60 text-foreground/90"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ACTIONS */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
        {onUsePremiumBrandTone && (
          <button
            onClick={onUsePremiumBrandTone}
            disabled={isPremiumToneLoading}
            className="group inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold border border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:shadow-[0_0_18px_-4px_hsl(var(--primary)/0.55)] transition-all disabled:opacity-50"
          >
            {isPremiumToneLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Crown className="w-3 h-3" />
            )}
            {isPremiumToneLoading ? 'Aplicando…' : 'Tom premium brasileiro'}
          </button>
        )}
        {onRegenerateSpecs && (
          <button
            onClick={onRegenerateSpecs}
            disabled={isGeneratingSpecs}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-medium border border-border bg-secondary/60 text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            {isGeneratingSpecs ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            {isGeneratingSpecs ? 'Reanalisando…' : 'Reanalisar produto'}
          </button>
        )}
      </div>
    </div>
  );
}