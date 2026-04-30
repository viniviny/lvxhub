import { ProductFormData, calculateMargin } from '@/types/product';
import { CheckCircle2, AlertTriangle, XCircle, Sparkles, Rocket, Zap } from 'lucide-react';

interface ReviewChecklistProps {
  form: ProductFormData;
  hasImage: boolean;
  /** Optional: total image count for performance checks (covers + extras). */
  imageCount?: number;
  /** Optional: whether a Shopify store is currently connected/selected. */
  storeConnected?: boolean;
}

type CheckCategory = 'required' | 'performance' | 'branding';

interface CheckItem {
  label: string;
  passed: boolean;
  category: CheckCategory;
  hint?: string;
}

const GENERIC_TITLES = ['novo produto', 'produto', 'product', 'item', 'sem título'];

function isGenericTitle(t: string): boolean {
  const clean = t.trim().toLowerCase();
  if (clean.length < 8) return true;
  return GENERIC_TITLES.some(g => clean === g || clean.startsWith(g + ' '));
}

function buildChecks(form: ProductFormData, hasImage: boolean, imageCount: number, storeConnected: boolean): CheckItem[] {
  const margin = calculateMargin(form.price, form.cost);
  const plainDesc = form.description.replace(/<[^>]*>/g, '').trim();

  return [
    // OBRIGATÓRIO ---------------------------------------------------------
    { label: 'Título preenchido',         passed: !!form.title.trim(),                           category: 'required' },
    { label: 'Imagem de capa',            passed: hasImage,                                       category: 'required' },
    { label: 'Preço definido',            passed: form.price > 0,                                 category: 'required' },
    { label: 'Variantes ou tamanhos',     passed: form.variants.length > 0 || form.sizes.length > 0, category: 'required' },
    { label: 'Loja Shopify conectada',    passed: storeConnected,                                 category: 'required', hint: 'Conecte uma loja em Lojas Shopify' },

    // PERFORMANCE ---------------------------------------------------------
    { label: '4+ imagens no produto',     passed: imageCount >= 4 || (hasImage && imageCount === 0), category: 'performance', hint: 'Páginas com 4+ fotos convertem melhor' },
    { label: 'Tags preenchidas',          passed: form.tags.trim().length > 0,                    category: 'performance' },
    { label: 'Peso informado',            passed: !form.requiresShipping || form.weight > 0,      category: 'performance' },
    { label: 'Custo informado',           passed: form.cost !== null && form.cost > 0,            category: 'performance' },
    { label: 'Margem saudável (≥ 20%)',   passed: !!margin && margin.percent >= 20,               category: 'performance' },
    { label: 'País de origem',            passed: !form.requiresShipping || !!form.countryOfOrigin, category: 'performance' },

    // BRANDING ------------------------------------------------------------
    { label: 'Descrição preenchida',      passed: plainDesc.length >= 80,                         category: 'branding', hint: 'Mín. 80 caracteres para SEO' },
    { label: 'Coleção selecionada',       passed: !!form.collection,                              category: 'branding' },
    { label: 'Título não genérico',       passed: !isGenericTitle(form.title),                    category: 'branding', hint: 'Inclua material, estilo ou linha' },
    { label: 'Tipo de produto definido',  passed: !!form.productType.trim(),                      category: 'branding' },
  ];
}

export function ReviewChecklist({ form, hasImage, imageCount = 0, storeConnected = true }: ReviewChecklistProps) {
  const checks = buildChecks(form, hasImage, imageCount, storeConnected);

  const score = Math.round((checks.filter(c => c.passed).length / checks.length) * 100);
  const requiredFails = checks.filter(c => c.category === 'required' && !c.passed);
  const canPublish = requiredFails.length === 0;

  const scoreColor = score >= 80 ? 'text-primary' : score >= 51 ? 'text-[hsl(var(--warning))]' : 'text-destructive';
  const ringColor = score >= 80 ? 'stroke-primary' : score >= 51 ? 'stroke-[hsl(var(--warning))]' : 'stroke-destructive';

  const categories: { key: CheckCategory; label: string; icon: typeof Rocket; tone: string }[] = [
    { key: 'required',    label: 'Obrigatório',  icon: Rocket,    tone: 'text-destructive' },
    { key: 'performance', label: 'Performance',  icon: Zap,       tone: 'text-[hsl(var(--warning))]' },
    { key: 'branding',    label: 'Branding',     icon: Sparkles,  tone: 'text-accent' },
  ];

  const catScore = (cat: CheckCategory) => {
    const list = checks.filter(c => c.category === cat);
    return { passed: list.filter(c => c.passed).length, total: list.length };
  };

  // Circular progress ring
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="space-y-5">
      {/* HERO SCORE */}
      <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-5">
        <div className="relative w-[92px] h-[92px] flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} className="stroke-border" strokeWidth="8" fill="none" />
            <circle
              cx="50" cy="50" r={radius}
              className={`${ringColor} transition-all duration-700 ease-out`}
              strokeWidth="8" fill="none" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`editorial-number text-[28px] leading-none ${scoreColor}`}>{score}</span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">score</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base font-semibold text-foreground">
            {canPublish ? 'Pronto para publicar' : 'Produto ainda precisa de revisão'}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {canPublish
              ? 'Todos os itens obrigatórios foram concluídos. Você pode publicar quando quiser.'
              : `${requiredFails.length} item${requiredFails.length > 1 ? 's' : ''} obrigatório${requiredFails.length > 1 ? 's' : ''} pendente${requiredFails.length > 1 ? 's' : ''}.`}
          </p>
        </div>
      </div>

      {/* CATEGORIAS */}
      <div className="grid grid-cols-3 gap-2">
        {categories.map(cat => {
          const s = catScore(cat.key);
          const pct = Math.round((s.passed / s.total) * 100);
          return (
            <div key={cat.key} className="rounded-xl border border-border bg-card/50 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <cat.icon className={`w-3 h-3 ${cat.tone}`} strokeWidth={2.2} />
                <span className="label-mono">{cat.label}</span>
              </div>
              <div className="text-[15px] font-semibold text-foreground tabular-nums">
                {s.passed}<span className="text-muted-foreground">/{s.total}</span>
              </div>
              <div className="h-1 mt-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${cat.key === 'required' && pct < 100 ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* CHECKLIST POR CATEGORIA */}
      <div className="space-y-4">
        {categories.map(cat => {
          const list = checks.filter(c => c.category === cat.key);
          return (
            <div key={cat.key}>
              <div className="flex items-center gap-1.5 mb-2">
                <cat.icon className={`w-3 h-3 ${cat.tone}`} strokeWidth={2.2} />
                <span className="label-mono">{cat.label}</span>
              </div>
              <ul className="space-y-1">
                {list.map((item, i) => {
                  const isBlocking = cat.key === 'required' && !item.passed;
                  const Icon = item.passed ? CheckCircle2 : (isBlocking ? XCircle : AlertTriangle);
                  const iconColor = item.passed
                    ? 'text-[hsl(var(--success))]'
                    : isBlocking
                      ? 'text-destructive'
                      : 'text-[hsl(var(--warning))]';
                  return (
                    <li key={i} className="flex items-start gap-2 py-1.5 px-2 -mx-2 rounded-md hover:bg-secondary/40 transition-colors">
                      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor}`} strokeWidth={2.2} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm ${item.passed ? 'text-foreground' : isBlocking ? 'text-destructive' : 'text-foreground/90'}`}>
                          {item.label}
                        </div>
                        {!item.passed && item.hint && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">{item.hint}</div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {!canPublish && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive font-medium flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          Conclua os itens obrigatórios para liberar o botão de publicar.
        </div>
      )}
    </div>
  );
}

export function getCanPublish(form: ProductFormData, hasImage: boolean): boolean {
  return !!form.title.trim() && hasImage && form.price > 0 && (form.variants.length > 0 || form.sizes.length > 0);
}
