import { ProductFormData } from '@/types/product';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface ReviewChecklistProps {
  form: ProductFormData;
  hasImage: boolean;
}

interface CheckItem {
  label: string;
  passed: boolean;
  type: 'required' | 'recommended' | 'info';
}

export function ReviewChecklist({ form, hasImage }: ReviewChecklistProps) {
  const checks: CheckItem[] = [
    // Required
    { label: 'Título', passed: !!form.title.trim(), type: 'required' },
    { label: 'Pelo menos 1 imagem', passed: hasImage, type: 'required' },
    { label: 'Preço maior que 0', passed: form.price > 0, type: 'required' },
    { label: 'Pelo menos 1 tamanho/variante', passed: form.variants.length > 0 || form.sizes.length > 0, type: 'required' },
    // Recommended
    { label: 'Descrição', passed: form.description.replace(/<[^>]*>/g, '').trim().length > 0, type: 'recommended' },
    { label: 'Coleção selecionada', passed: !!form.collection, type: 'recommended' },
    { label: 'Peso (produto físico)', passed: !form.requiresShipping || form.weight > 0, type: 'recommended' },
    { label: 'País de origem', passed: !form.requiresShipping || !!form.countryOfOrigin, type: 'recommended' },
    // Info
    { label: 'Preço original (desconto visível)', passed: form.compareAtPrice !== null && form.compareAtPrice > 0, type: 'info' },
    { label: 'Custo do item (margem ativa)', passed: form.cost !== null && form.cost > 0, type: 'info' },
    { label: `SKU (rastreamento de estoque)`, passed: form.variants.some(v => !!v.sku), type: 'info' },
    { label: `Canais de venda selecionados: ${form.selectedChannels.length}`, passed: form.selectedChannels.length > 0, type: 'info' },
  ];

  const total = checks.length;
  const passed = checks.filter(c => c.passed).length;
  const score = Math.round((passed / total) * 100);
  const scoreColor = score >= 80 ? 'text-[hsl(var(--success))]' : score >= 51 ? 'text-[hsl(var(--warning))]' : 'text-destructive';
  const barColor = score >= 80 ? '[&>div]:bg-[hsl(var(--success))]' : score >= 51 ? '[&>div]:bg-[hsl(var(--warning))]' : '[&>div]:bg-destructive';

  const requiredBlocking = checks.filter(c => c.type === 'required' && !c.passed);
  const canPublish = requiredBlocking.length === 0;

  const icon = (item: CheckItem) => {
    if (item.type === 'required') return item.passed ? <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" /> : <CheckCircle2 className="w-4 h-4 text-destructive" />;
    if (item.type === 'recommended') return item.passed ? <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" /> : <AlertTriangle className="w-4 h-4 text-[hsl(var(--warning))]" />;
    return item.passed ? <Info className="w-4 h-4 text-primary" /> : <Info className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className={`text-lg font-bold ${scoreColor}`}>Produto {score}% completo</span>
      </div>
      <Progress value={score} className={`h-2 ${barColor}`} />

      <div className="space-y-1">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-3">Obrigatório</h4>
        {checks.filter(c => c.type === 'required').map((item, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            {icon(item)}
            <span className={`text-sm ${item.passed ? 'text-foreground' : 'text-destructive'}`}>{item.label}</span>
          </div>
        ))}

        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-3">Recomendado</h4>
        {checks.filter(c => c.type === 'recommended').map((item, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            {icon(item)}
            <span className={`text-sm ${item.passed ? 'text-foreground' : 'text-[hsl(var(--warning))]'}`}>{item.label}</span>
          </div>
        ))}

        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-3">Informativo</h4>
        {checks.filter(c => c.type === 'info').map((item, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            {icon(item)}
            <span className="text-sm text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {!canPublish && (
        <p className="text-xs text-destructive font-medium mt-2">Preencha os campos obrigatórios para publicar.</p>
      )}
    </div>
  );
}

export function getCanPublish(form: ProductFormData, hasImage: boolean): boolean {
  return !!form.title.trim() && hasImage && form.price > 0 && (form.variants.length > 0 || form.sizes.length > 0);
}
