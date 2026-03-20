import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2, HelpCircle, Wand2 } from 'lucide-react';
import { VariantData, generateSKU, calculateMargin } from '@/types/product';

interface VariantsTableProps {
  variants: VariantData[];
  onChange: (variants: VariantData[]) => void;
  inventoryPolicy: 'continue' | 'deny';
  onInventoryPolicyChange: (p: 'continue' | 'deny') => void;
  productType: string;
  currencySymbol: string;
}

export function VariantsTable({ variants, onChange, inventoryPolicy, onInventoryPolicyChange, productType, currencySymbol }: VariantsTableProps) {
  const updateVariant = (id: string, field: keyof VariantData, value: unknown) => {
    onChange(variants.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const removeVariant = (id: string) => {
    onChange(variants.filter(v => v.id !== id));
  };

  const applyToAll = (field: 'price' | 'cost' | 'stock') => {
    if (variants.length === 0) return;
    const val = variants[0][field];
    onChange(variants.map(v => ({ ...v, [field]: val })));
  };

  const generateAllSKUs = () => {
    onChange(variants.map(v => ({ ...v, sku: generateSKU(productType, v.name) })));
  };

  if (variants.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-foreground">Variantes</Label>
        <TooltipProvider>
          <div className="flex items-center gap-2">
            <Switch
              checked={inventoryPolicy === 'continue'}
              onCheckedChange={c => onInventoryPolicyChange(c ? 'continue' : 'deny')}
            />
            <span className="text-xs text-muted-foreground">Continuar vendendo sem estoque</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[220px]">
                <p className="text-xs">Recomendado para dropshipping. O produto continuará disponível mesmo com estoque zerado.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => applyToAll('price')}>Aplicar preço a todos</Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => applyToAll('cost')}>Aplicar custo a todos</Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => applyToAll('stock')}>Aplicar estoque a todos</Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={generateAllSKUs}>
          <Wand2 className="w-3 h-3 mr-1" />Gerar todos os SKUs
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs">
              <th className="text-left py-2 pr-2">Variante</th>
              <th className="text-left py-2 px-2">Preço</th>
              <th className="text-left py-2 px-2">Preço orig.</th>
              <th className="text-left py-2 px-2">Custo</th>
              <th className="text-left py-2 px-2">Margem</th>
              <th className="text-left py-2 px-2">SKU</th>
              <th className="text-left py-2 px-2">Estoque</th>
              <th className="py-2 pl-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {variants.map(v => {
              const margin = calculateMargin(v.price, v.cost);
              return (
                <tr key={v.id} className="border-b border-border/50">
                  <td className="py-2 pr-2">
                    <span className="font-medium text-foreground">{v.name}</span>
                  </td>
                  <td className="py-2 px-2">
                    <Input type="number" min={0} step={0.01} value={v.price || ''} onChange={e => updateVariant(v.id, 'price', parseFloat(e.target.value) || 0)} className="h-8 w-20 bg-secondary border-border text-xs" />
                  </td>
                  <td className="py-2 px-2">
                    <Input type="number" min={0} step={0.01} value={v.compareAtPrice ?? ''} onChange={e => { const val = parseFloat(e.target.value); updateVariant(v.id, 'compareAtPrice', isNaN(val) ? null : val); }} className="h-8 w-20 bg-secondary border-border text-xs" />
                  </td>
                  <td className="py-2 px-2">
                    <Input type="number" min={0} step={0.01} value={v.cost ?? ''} onChange={e => { const val = parseFloat(e.target.value); updateVariant(v.id, 'cost', isNaN(val) ? null : val); }} className="h-8 w-20 bg-secondary border-border text-xs" />
                  </td>
                  <td className="py-2 px-2">
                    {margin ? (
                      <span className={`text-xs font-medium ${margin.color}`}>{margin.percent.toFixed(0)}%</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <Input value={v.sku} onChange={e => updateVariant(v.id, 'sku', e.target.value.toUpperCase())} className="h-8 w-28 bg-secondary border-border text-xs font-mono" />
                  </td>
                  <td className="py-2 px-2">
                    <Input type="number" min={0} value={v.stock} onChange={e => updateVariant(v.id, 'stock', parseInt(e.target.value) || 0)} className="h-8 w-16 bg-secondary border-border text-xs" />
                  </td>
                  <td className="py-2 pl-2">
                    <button type="button" onClick={() => removeVariant(v.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
