import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2, HelpCircle, Wand2, ChevronDown, ChevronUp, Check } from 'lucide-react';
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
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkCompareAt, setBulkCompareAt] = useState('');
  const [bulkCost, setBulkCost] = useState('');
  const [bulkStock, setBulkStock] = useState('');

  const updateVariant = (id: string, field: keyof VariantData, value: unknown) => {
    onChange(variants.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const removeVariant = (id: string) => {
    onChange(variants.filter(v => v.id !== id));
  };

  const generateAllSKUs = () => {
    onChange(variants.map(v => ({ ...v, sku: generateSKU(productType, v.name) })));
  };

  const applyBulk = () => {
    if (variants.length === 0) return;
    let updated = [...variants];
    if (bulkPrice.trim()) {
      const val = parseFloat(bulkPrice);
      if (!isNaN(val) && val >= 0) updated = updated.map(v => ({ ...v, price: val }));
    }
    if (bulkCompareAt.trim()) {
      const val = parseFloat(bulkCompareAt);
      if (!isNaN(val) && val >= 0) updated = updated.map(v => ({ ...v, compareAtPrice: val }));
    }
    if (bulkCost.trim()) {
      const val = parseFloat(bulkCost);
      if (!isNaN(val) && val >= 0) updated = updated.map(v => ({ ...v, cost: val }));
    }
    if (bulkStock.trim()) {
      const val = parseInt(bulkStock);
      if (!isNaN(val) && val >= 0) updated = updated.map(v => ({ ...v, stock: val }));
    }
    onChange(updated);
    setBulkPrice('');
    setBulkCompareAt('');
    setBulkCost('');
    setBulkStock('');
  };

  const hasBulkValue = bulkPrice.trim() || bulkCompareAt.trim() || bulkCost.trim() || bulkStock.trim();

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

      {/* Bulk edit bar */}
      <div className="border border-border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setBulkOpen(!bulkOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
        >
          <span>Edição em massa · {variants.length} variantes</span>
          {bulkOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {bulkOpen && (
          <div className="px-3 pb-3 pt-1 border-t border-border bg-secondary/20 space-y-2.5">
            <p className="text-[10px] text-muted-foreground">Preencha os campos desejados e clique em aplicar. Apenas campos preenchidos serão atualizados.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">Preço ({currencySymbol})</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={bulkPrice}
                  onChange={e => setBulkPrice(e.target.value)}
                  placeholder="Ex: 99.90"
                  className="h-8 bg-secondary border-border text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">Preço original ({currencySymbol})</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={bulkCompareAt}
                  onChange={e => setBulkCompareAt(e.target.value)}
                  placeholder="Ex: 149.90"
                  className="h-8 bg-secondary border-border text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">Custo ({currencySymbol})</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={bulkCost}
                  onChange={e => setBulkCost(e.target.value)}
                  placeholder="Ex: 35.00"
                  className="h-8 bg-secondary border-border text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">Estoque</Label>
                <Input
                  type="number"
                  min={0}
                  value={bulkStock}
                  onChange={e => setBulkStock(e.target.value)}
                  placeholder="Ex: 100"
                  className="h-8 bg-secondary border-border text-xs"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="h-7 text-xs"
                disabled={!hasBulkValue}
                onClick={applyBulk}
              >
                <Check className="w-3 h-3 mr-1" />
                Aplicar a todas as variantes
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={generateAllSKUs}>
                <Wand2 className="w-3 h-3 mr-1" />Gerar SKUs
              </Button>
            </div>
          </div>
        )}
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