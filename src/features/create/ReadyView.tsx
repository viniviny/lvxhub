import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, Plus } from 'lucide-react';
import { EditableField } from './components/EditableField';
import { IMAGE_STYLE_PRESETS } from './presets';
import type { CreateJobResult, ImageStylePreset } from './types';

interface ReadyViewProps {
  result: CreateJobResult;
  presetId: ImageStylePreset;
  onPublish: (edited: CreateJobResult) => void;
  onBack: () => void;
}

export function ReadyView({ result, presetId, onPublish, onBack }: ReadyViewProps) {
  const [edited, setEdited] = useState<CreateJobResult>(result);
  const presetMeta = IMAGE_STYLE_PRESETS[presetId];

  const update = <K extends keyof CreateJobResult>(key: K, value: CreateJobResult[K]) => {
    setEdited(prev => ({ ...prev, [key]: value }));
  };

  const updatePricing = (price: number) => {
    setEdited(prev => ({
      ...prev,
      pricing: { ...prev.pricing, suggestedPrice: price },
    }));
  };

  return (
    <div className="max-w-[1100px] mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-500 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Pronto para revisar
          </div>
          <h2 className="text-[18px] font-medium tracking-tight">{edited.title}</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            ← Voltar
          </Button>
          <Button size="sm" onClick={() => onPublish(edited)}>
            Publicar
          </Button>
        </div>
      </div>

      {/* Grid 2 colunas: imagens + form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Imagens */}
        <div>
          <div className="grid grid-cols-2 gap-2">
            {edited.images.slice(0, 3).map((img, i) => (
              <ImageCard key={i} image={img} previewColor={presetMeta?.backgroundColor} />
            ))}
            {/* Slot pra adicionar */}
            <button
              type="button"
              onClick={() => {/* TODO: PR 5 - regenerar/adicionar imagem */}}
              className="aspect-[4/5] bg-muted/40 border border-dashed border-border rounded-md flex items-center justify-center text-muted-foreground text-[11px] hover:bg-muted/60 transition-colors"
            >
              <span className="flex items-center gap-1">
                <Plus className="w-3 h-3" />
                Adicionar
              </span>
            </button>
          </div>
          <div className="mt-2.5 text-[11px] text-muted-foreground">
            Estilo: {presetMeta?.label ?? 'desconhecido'}
          </div>
        </div>

        {/* Form de campos */}
        <div className="flex flex-col gap-3">
          <Field label="Título">
            <EditableField
              value={edited.title}
              onChange={v => update('title', v)}
              ariaLabel="Título do produto"
              className="text-[15px] font-medium"
            />
          </Field>

          <Field label="Descrição">
            <EditableField
              value={edited.description}
              onChange={v => update('description', v)}
              ariaLabel="Descrição do produto"
              multiline
              className="text-[13px] leading-relaxed min-h-[80px]"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Preço">
              <div className="px-3 py-2 rounded-md border border-border bg-card flex items-baseline gap-1.5">
                <span className="text-[11px] text-muted-foreground">USD</span>
                <EditableField
                  value={edited.pricing.suggestedPrice.toFixed(2)}
                  onChange={v => {
                    const num = parseFloat(v.replace(',', '.'));
                    if (!Number.isNaN(num) && num >= 0) updatePricing(num);
                  }}
                  ariaLabel="Preço"
                  className="!border-0 !bg-transparent !p-0 text-[15px] font-medium tabular-nums focus:!ring-0"
                />
                <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                  {edited.pricing.multiplier.toFixed(1)}x
                </span>
              </div>
            </Field>

            <Field label="Categoria">
              <div className="px-3 py-2 rounded-md border border-border bg-card text-[13px]">
                {edited.category ?? '—'}
              </div>
            </Field>
          </div>

          <Field label="Variantes">
            <div className="flex flex-wrap gap-1.5">
              {edited.variants.flatMap(v => v.values).map((val, i) => (
                <span
                  key={`${val}-${i}`}
                  className="text-[11px] px-2.5 py-1 bg-secondary rounded-md"
                >
                  {val}
                </span>
              ))}
            </div>
          </Field>

          {/* SEO collapsible */}
          <details className="group mt-1">
            <summary className="cursor-pointer text-[12px] text-muted-foreground hover:text-foreground select-none flex items-center gap-1 list-none">
              <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-0 -rotate-90" />
              SEO, tags e metafields
            </summary>
            <div className="mt-2 p-3 bg-muted/50 rounded-md text-[12px] grid grid-cols-[80px_1fr] gap-x-3 gap-y-1.5">
              <span className="text-muted-foreground">SEO Title</span>
              <span className="truncate">{edited.seoTitle ?? '—'}</span>
              <span className="text-muted-foreground">SEO Desc</span>
              <span className="truncate">{edited.seoDescription ?? '—'}</span>
              <span className="text-muted-foreground">Tags</span>
              <span className="truncate">{edited.tags?.join(', ') ?? '—'}</span>
              <span className="text-muted-foreground">Coleção</span>
              <span className="truncate">{edited.collection ?? '—'}</span>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function ImageCard({
  image,
  previewColor,
}: {
  image: { url: string; angle: string };
  previewColor?: string;
}) {
  const hasUrl = Boolean(image.url);
  return (
    <div
      className="aspect-[4/5] rounded-md relative overflow-hidden"
      style={
        !hasUrl && previewColor
          ? { background: `linear-gradient(135deg, ${previewColor} 0%, ${shade(previewColor, -8)} 100%)` }
          : undefined
      }
    >
      {hasUrl && (
        <img src={image.url} alt={image.angle} className="w-full h-full object-cover" />
      )}
      <div className="absolute bottom-1.5 left-1.5 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
        {image.angle}
      </div>
    </div>
  );
}

// Escurece um hex em N percent (usado para o gradiente de preview)
function shade(hex: string, percent: number): string {
  const f = parseInt(hex.slice(1), 16);
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent) / 100;
  const R = (f >> 16) & 0xff;
  const G = (f >> 8) & 0xff;
  const B = f & 0xff;
  const r = Math.round((t - R) * p) + R;
  const g = Math.round((t - G) * p) + G;
  const b = Math.round((t - B) * p) + B;
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
