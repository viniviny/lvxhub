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
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-[13px] text-foreground flex items-center gap-1.5">
          <Package className="w-4 h-4 text-primary" />
          Envio
        </h3>
        <div className="flex items-center gap-2">
          <Switch checked={requiresShipping} onCheckedChange={onRequiresShippingChange} />
          <span className="text-[10px] text-muted-foreground">Produto físico</span>
        </div>
      </div>

      {requiresShipping && (
        <div className="space-y-2.5">
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">Peso</Label>
            <div className="flex gap-1.5">
              <Input
                type="number" min={0} step={0.01}
                value={weight || ''}
                onChange={e => onWeightChange(parseFloat(e.target.value) || 0)}
                placeholder="0.0"
                className="h-8 text-xs bg-secondary border-border flex-1"
              />
              <Select value={weightUnit} onValueChange={v => onWeightUnitChange(v as WeightUnit)}>
                <SelectTrigger className="h-8 w-16 text-xs bg-secondary border-border">
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
              <Label className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                País de origem
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3 h-3 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[200px]">
                    <p className="text-xs">Necessário para envios internacionais e cálculo de impostos.</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
            </TooltipProvider>
            <Select value={countryOfOrigin} onValueChange={onCountryOfOriginChange}>
              <SelectTrigger className="h-8 text-xs bg-secondary border-border">
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
      )}
    </div>
  );
}
