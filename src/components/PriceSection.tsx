import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { calculateMargin, calculateDiscount } from '@/types/product';

interface PriceSectionProps {
  price: number;
  compareAtPrice: number | null;
  cost: number | null;
  currencySymbol: string;
  onPriceChange: (v: number) => void;
  onCompareAtPriceChange: (v: number | null) => void;
  onCostChange: (v: number | null) => void;
}

export function PriceSection({ price, compareAtPrice, cost, currencySymbol, onPriceChange, onCompareAtPriceChange, onCostChange }: PriceSectionProps) {
  const discount = calculateDiscount(price, compareAtPrice);
  const marginInfo = calculateMargin(price, cost);

  return (
    <div className="space-y-2.5">
      <div className="space-y-2">
        <div>
          <Label className="text-[10px] text-muted-foreground mb-1 block">Preço de venda</Label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{currencySymbol}</span>
            <Input
              type="number" min={0} step={0.01}
              value={price || ''}
              onChange={e => onPriceChange(parseFloat(e.target.value) || 0)}
              placeholder="89.99"
              className="h-8 text-xs pl-7 bg-secondary border-border"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">Preço original</Label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{currencySymbol}</span>
              <Input
                type="number" min={0} step={0.01}
                value={compareAtPrice ?? ''}
                onChange={e => { const v = parseFloat(e.target.value); onCompareAtPriceChange(isNaN(v) ? null : v); }}
                placeholder="129.99"
                className="h-8 text-xs pl-7 bg-secondary border-border"
              />
            </div>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">Seu custo</Label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{currencySymbol}</span>
              <Input
                type="number" min={0} step={0.01}
                value={cost ?? ''}
                onChange={e => { const v = parseFloat(e.target.value); onCostChange(isNaN(v) ? null : v); }}
                placeholder="25.00"
                className="h-8 text-xs pl-7 bg-secondary border-border"
              />
            </div>
          </div>
        </div>
      </div>
      {(discount !== null || marginInfo) && (
        <div className="flex items-center gap-2 flex-wrap">
          {discount !== null && (
            <Badge className="h-5 text-[10px] bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30 hover:bg-[hsl(var(--success))]/20">
              {discount}% off
            </Badge>
          )}
          {marginInfo && (
            <span className={`text-[10px] font-medium ${marginInfo.color}`}>
              Margem: {currencySymbol}{marginInfo.margin.toFixed(2)} ({marginInfo.percent.toFixed(0)}%)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
