import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Package } from 'lucide-react';
import { WeightUnit } from '@/types/product';
import { COUNTRIES } from '@/data/countries';

interface ShippingCardProps {
  requiresShipping: boolean;
  onRequiresShippingChange: (v: boolean) => void;
  weight: number;
  onWeightChange: (v: number) => void;
  weightUnit: WeightUnit;
  onWeightUnitChange: (v: WeightUnit) => void;
  countryOfOrigin: string;
  onCountryOfOriginChange: (v: string) => void;
}

export function ShippingCard({ requiresShipping, onRequiresShippingChange, weight, onWeightChange, weightUnit, onWeightUnitChange, countryOfOrigin, onCountryOfOriginChange }: ShippingCardProps) {
  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Package className="w-4 h-4" />
          Envio
        </h3>
        <div className="flex items-center gap-2">
          <Switch checked={requiresShipping} onCheckedChange={onRequiresShippingChange} />
          <span className="text-xs text-muted-foreground">Produto físico (requer envio)</span>
        </div>
      </div>

      {requiresShipping && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm text-muted-foreground">Peso</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  type="number" min={0} step={0.01}
                  value={weight || ''}
                  onChange={e => onWeightChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.0"
                  className="bg-secondary border-border flex-1"
                />
                <Select value={weightUnit} onValueChange={v => onWeightUnitChange(v as WeightUnit)}>
                  <SelectTrigger className="w-20 bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="lb">lb</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="oz">oz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <TooltipProvider>
                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                  País de origem
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3 h-3 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[200px]">
                      <p className="text-xs">Necessário para envios internacionais e cálculo de impostos alfandegários</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
              </TooltipProvider>
              <Select value={countryOfOrigin} onValueChange={onCountryOfOriginChange}>
                <SelectTrigger className="mt-1.5 bg-secondary border-border">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {COUNTRIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
