/**
 * ImageOptimizationCard — Compact card for optional WebP image optimization
 * before publishing to Shopify. Sits in Step 4 (Revisão) sidebar,
 * between "Publicação" and "Publicar agora" button.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ImageDown, Info } from 'lucide-react';

export type ImageQualityPreset = 'high' | 'balanced' | 'compressed';

interface QualityOption {
  preset: ImageQualityPreset;
  label: string;
  value: number;
}

const QUALITY_OPTIONS: QualityOption[] = [
  { preset: 'high', label: 'Alta Qualidade', value: 92 },
  { preset: 'balanced', label: 'Balanceado', value: 85 },
  { preset: 'compressed', label: 'Máx. Compressão', value: 75 },
];

interface ImageOptimizationCardProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  qualityPreset: ImageQualityPreset;
  onQualityPresetChange: (preset: ImageQualityPreset) => void;
}

export function ImageOptimizationCard({
  enabled,
  onEnabledChange,
  qualityPreset,
  onQualityPresetChange,
}: ImageOptimizationCardProps) {
  const selectedOption = QUALITY_OPTIONS.find(o => o.preset === qualityPreset)!;

  return (
    <div className="glass-card p-3 space-y-2.5">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ImageDown className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">Image Optimization</span>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onEnabledChange}
          className="scale-75 origin-right"
        />
      </div>

      {/* Helper text */}
      <p className="text-[10px] text-muted-foreground leading-tight">
        Convert images to WebP for faster storefront performance.
      </p>

      {/* Quality presets — only visible when enabled */}
      {enabled && (
        <div className="space-y-2 pt-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            Quality
          </span>
          <div className="flex gap-1">
            {QUALITY_OPTIONS.map(opt => (
              <button
                key={opt.preset}
                onClick={() => onQualityPresetChange(opt.preset)}
                className={`flex-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all border ${
                  qualityPreset === opt.preset
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
                }`}
              >
                {opt.label}
                <span className="block text-[9px] opacity-70 mt-0.5">{opt.value}%</span>
              </button>
            ))}
          </div>

          {/* Info line */}
          <div className="flex items-center gap-1 pt-0.5">
            <Info className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className="text-[10px] text-muted-foreground">
              Estimated reduction: 40–60%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Map preset to numeric quality value */
export function getQualityValue(preset: ImageQualityPreset): number {
  return QUALITY_OPTIONS.find(o => o.preset === preset)?.value ?? 85;
}
