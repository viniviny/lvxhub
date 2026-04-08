import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Receipt, Flame, HelpCircle, ShieldCheck, AlertTriangle, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExchangeRates } from '@/hooks/useExchangeRates';

interface PricingEngineProps {
  cost: number | null;
  currency: string;
  cpa: number;
  marginTarget: number;
  shippingCost: number;
  platform: string;
  onCurrencyChange: (v: string) => void;
  onCpaChange: (v: number) => void;
  onMarginChange: (v: number) => void;
  onShippingChange: (v: number) => void;
  onPlatformChange: (v: string) => void;
  onApplyPrice?: (price: number) => void;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'BRL', symbol: 'R$', label: 'BRL (R$)' },
  { code: 'CAD', symbol: 'C$', label: 'CAD (C$)' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$)' },
] as const;

const PLATFORM_FEES: Record<string, { label: string; rate: number }> = {
  shopify: { label: 'Shopify Payments', rate: 0.029 },
  stripe: { label: 'Stripe', rate: 0.029 },
  paypal: { label: 'PayPal', rate: 0.0349 },
};

function getMarginHealth(percent: number) {
  if (percent >= 50) return { label: 'Excelente', color: 'text-[hsl(var(--success))]', icon: ShieldCheck };
  if (percent >= 30) return { label: 'Saudável', color: 'text-primary', icon: ShieldCheck };
  if (percent >= 15) return { label: 'Baixa', color: 'text-[hsl(var(--warning))]', icon: AlertTriangle };
  return { label: 'Crítica', color: 'text-destructive', icon: AlertTriangle };
}

export function PricingEngine({
  cost, currency, cpa, marginTarget, shippingCost, platform,
  onCurrencyChange, onCpaChange, onMarginChange, onShippingChange, onPlatformChange, onApplyPrice,
}: PricingEngineProps) {
  const { rates, loading: ratesLoading, convert } = useExchangeRates('USD');

  const safeCost = cost && cost > 0 ? cost : 0;
  const platformFee = PLATFORM_FEES[platform]?.rate ?? 0.029;
  const marginDecimal = marginTarget / 100;

  const calc = useMemo(() => {
    if (safeCost <= 0) return null;
    const totalCost = safeCost + cpa + shippingCost;
    const divisor = 1 - marginDecimal - platformFee;
    if (divisor <= 0) return null;

    const priceUSD = totalCost / divisor;
    const fees = priceUSD * platformFee;
    const profit = priceUSD - totalCost - fees;
    const markup = priceUSD / safeCost;
    const realMarginPercent = (profit / priceUSD) * 100;

    const hasRealRate = Object.keys(rates).length > 1;
    const priceLocal = hasRealRate ? convert(priceUSD, 'USD', currency) : priceUSD;
    const profitLocal = hasRealRate ? convert(profit, 'USD', currency) : profit;
    const feesLocal = hasRealRate ? convert(fees, 'USD', currency) : fees;

    return {
      priceLocal, markup, fees: feesLocal, profit: profitLocal,
      realMarginPercent, hasRealRate,
      breakEvenPrice: hasRealRate
        ? convert(totalCost / (1 - platformFee), 'USD', currency)
        : totalCost / (1 - platformFee),
    };
  }, [safeCost, cpa, shippingCost, marginDecimal, platformFee, currency, rates, convert]);

  const cs = CURRENCIES.find(c => c.code === currency)?.symbol ?? '$';
  const health = calc ? getMarginHealth(calc.realMarginPercent) : null;
  const HealthIcon = health?.icon ?? ShieldCheck;

  return (
    <TooltipProvider>
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-[13px] text-foreground flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-primary" />
            Pricing Engine
          </h3>
          {ratesLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          {calc?.hasRealRate && !ratesLoading && (
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 text-muted-foreground">Câmbio real</Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">Moeda de venda</Label>
            <Select value={currency} onValueChange={onCurrencyChange}>
              <SelectTrigger className="h-8 text-xs bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
              Plataforma
              <Tooltip><TooltipTrigger asChild><HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                <TooltipContent className="max-w-[200px]"><p className="text-xs">Taxa cobrada pelo processador de pagamento sobre cada venda.</p></TooltipContent>
              </Tooltip>
            </Label>
            <Select value={platform} onValueChange={onPlatformChange}>
              <SelectTrigger className="h-8 text-xs bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PLATFORM_FEES).map(([key, v]) => (
                  <SelectItem key={key} value={key}>{v.label} ({(v.rate * 100).toFixed(1)}%)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
              CPA
              <Tooltip><TooltipTrigger asChild><HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                <TooltipContent className="max-w-[200px]"><p className="text-xs">Quanto você gasta em anúncios para conseguir 1 venda.</p></TooltipContent>
              </Tooltip>
            </Label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">$</span>
              <Input type="number" min={0} step={0.5} value={cpa || ''} onChange={e => onCpaChange(Number(e.target.value) || 0)} className="h-8 text-xs bg-secondary border-border pl-6" />
            </div>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">Frete por pedido ($)</Label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">$</span>
              <Input type="number" min={0} step={0.5} value={shippingCost || ''} onChange={e => onShippingChange(Number(e.target.value) || 0)} className="h-8 text-xs bg-secondary border-border pl-6" />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
              Margem desejada
              <Tooltip><TooltipTrigger asChild><HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                <TooltipContent className="max-w-[200px]"><p className="text-xs">Lucro líquido sobre o preço de venda, já descontando todos os custos.</p></TooltipContent>
              </Tooltip>
            </Label>
            <span className="text-xs font-semibold text-foreground">{marginTarget}%</span>
          </div>
          <Slider value={[marginTarget]} onValueChange={([v]) => onMarginChange(v)} min={10} max={85} step={1} />
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-muted-foreground">10%</span>
            <span className="text-[9px] text-muted-foreground">85%</span>
          </div>
        </div>

        {calc ? (
          <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">Preço sugerido</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-foreground">{cs}{calc.priceLocal.toFixed(2)}</p>
                  {onApplyPrice && (
                    <Button
                      type="button"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => onApplyPrice(parseFloat(calc.priceLocal.toFixed(2)))}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Aplicar
                    </Button>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <HealthIcon className={`w-3.5 h-3.5 ${health!.color}`} />
                  <span className={`text-xs font-semibold ${health!.color}`}>{health!.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Margem real: {calc.realMarginPercent.toFixed(1)}%</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border-t border-border/50 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Markup</span>
                <span className="font-medium text-foreground">{calc.markup.toFixed(2)}x</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Receipt className="w-3 h-3" /> Taxas</span>
                <span className="font-medium text-foreground">{cs}{calc.fees.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Flame className="w-3 h-3" /> Lucro</span>
                <span className={`font-medium ${calc.profit > 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>{cs}{calc.profit.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> Break-even</span>
                <span className="font-medium text-foreground">{cs}{calc.breakEvenPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground pt-1">
            {safeCost <= 0 ? 'Preencha o custo do produto para calcular.' : 'Margem + taxas excedem 100%. Reduza a margem.'}
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}
