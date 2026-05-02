import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStoreContext } from '@/hooks/useStoreContext';
import { IMAGE_STYLE_PRESETS, DEFAULT_PRESET } from '../presets';
import type { ImageStylePreset } from '../types';

interface CreateOptionsBarProps {
  stylePreset: ImageStylePreset;
  onStyleChange: (preset: ImageStylePreset) => void;
  selectedStoreId: string;
  onStoreChange: (storeId: string) => void;
}

export function CreateOptionsBar({
  stylePreset,
  onStyleChange,
  selectedStoreId,
  onStoreChange,
}: CreateOptionsBarProps) {
  const { stores } = useStoreContext();
  const connectedStores = stores.filter(s => s.connected);

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Estilo de imagem */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Estilo de imagem</span>
        <Select value={stylePreset} onValueChange={v => onStyleChange(v as ImageStylePreset)}>
          <SelectTrigger className="h-9 text-[13px]">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0 border border-border/50"
                style={{ backgroundColor: IMAGE_STYLE_PRESETS[stylePreset]?.backgroundColor }}
              />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {Object.values(IMAGE_STYLE_PRESETS).map(p => (
              <SelectItem key={p.id} value={p.id}>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0 border border-border/50"
                    style={{ backgroundColor: p.backgroundColor }}
                  />
                  <span>{p.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loja destino */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Loja destino</span>
        <Select value={selectedStoreId} onValueChange={onStoreChange} disabled={connectedStores.length === 0}>
          <SelectTrigger className="h-9 text-[13px]">
            <SelectValue placeholder="Nenhuma loja" />
          </SelectTrigger>
          <SelectContent>
            {connectedStores.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.domain}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
