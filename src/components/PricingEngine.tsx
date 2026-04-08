import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, Receipt, Flame } from 'lucide-react';

interface PricingEngineProps {
  cost: number | null;
}

export function PricingEngine({ cost }: PricingEngineProps) {
  const [currency, setCurrency] = useState('USD');
  const [cpa, setCpa] = useState(5);
  const [margin, setMargin] = useState(0.6);

  const feesRate = 0.03;
  const safeCost = cost && cost > 0 ? cost : 0;

  const calc = useMemo(() => {
    if (safeCost <= 0) return null;
    const totalCost = safeCost + cpa + safeCost * feesRate;
    const price = totalCost / (1 - margin);
    const markup = price / safeCost;
    const rates: Record<string, number> = {
      USD: 1, GBP: 1.1, EUR: 1.05, BRL: 0.85, CAD: 1.02, AUD: 1.03,
    };
    const adjustedPrice = price * (rates[currency] ?? 1);
    const profit = adjustedPrice - totalCost;
    const fees = safeCost * feesRate;
    return { adjustedPrice, markup, fees, profit };
  }, [safeCost, cpa, margin, currency]);

  const symbols: Record<string, string> = {
    USD: '$', GBP: '£', EUR: '€', BRL: 'R$', CAD: 'C$', AUD: 'A$',
  };
  const currencySymbol = symbols[currency] ?? '$';

  return (
    <div className="glass-card p-4 space-y-3">
      <h3 className="font-display font-semibold text-[13px] text-foreground flex items-center gap-1.5">
        <DollarSign className="w-4 h-4 text-primary" />
        Pricing Engine
      </h3>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground mb-1 block">Moeda</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="h-8 text-xs bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="BRL">BRL (R$)</SelectItem>
              <SelectItem value="CAD">CAD (C$)</SelectItem>
              <SelectItem value="AUD">AUD (A$)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground mb-1 block">CPA ({currencySymbol})</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={cpa}
            onChange={e => setCpa(Number(e.target.value) || 0)}
            className="h-8 text-xs bg-secondary border-border"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground mb-1 block">Margem (%)</Label>
          <Input
            type="number"
            min={0}
            max={0.99}
            step={0.05}
            value={margin}
            onChange={e => setMargin(Number(e.target.value) || 0)}
            className="h-8 text-xs bg-secondary border-border"
          />
        </div>
      </div>

      {calc ? (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-foreground">
            <DollarSign className="w-3.5 h-3.5 text-primary" />
            <span className="text-muted-foreground">Preço sugerido:</span>
            <span className="font-semibold">{currencySymbol}{calc.adjustedPrice.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-foreground">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span className="text-muted-foreground">Markup:</span>
            <span className="font-semibold">{calc.markup.toFixed(2)}x</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-foreground">
            <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Taxas:</span>
            <span className="font-semibold">{currencySymbol}{calc.fees.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-foreground">
            <Flame className="w-3.5 h-3.5 text-[hsl(var(--success))]" />
            <span className="text-muted-foreground">Lucro:</span>
            <span className={`font-semibold ${calc.profit > 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
              {currencySymbol}{calc.profit.toFixed(2)}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground pt-1">Preencha o custo do produto para calcular.</p>
      )}
    </div>
  );
}
