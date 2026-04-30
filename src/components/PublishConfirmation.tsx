import { Button } from '@/components/ui/button';
import { CheckCircle2, ExternalLink, ArrowLeft, Loader2, Image as ImageIcon, Wand2, Send } from 'lucide-react';
import { Product } from '@/types/product';

interface PublishConfirmationProps {
  product: Product | null;
  isPublishing: boolean;
  onBack: () => void;
}

export function PublishConfirmation({ product, isPublishing, onBack }: PublishConfirmationProps) {
  if (isPublishing) {
    const steps = [
      { icon: Wand2,     label: 'Preparando metadados SEO' },
      { icon: ImageIcon, label: 'Otimizando imagens' },
      { icon: Send,      label: 'Enviando para Shopify' },
    ];
    return (
      <div className="glass-card p-8 md:p-10 max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="absolute inset-0 rounded-xl border border-primary/30 animate-ping" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold text-foreground">Publicando no Shopify</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Criando produto como rascunho — não saia desta tela</p>
          </div>
        </div>

        {/* Indeterminate progress bar */}
        <div className="relative h-1 rounded-full bg-secondary overflow-hidden mb-6">
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-primary/40 via-primary to-primary/40 rounded-full animate-[shimmer_1.6s_ease-in-out_infinite]"
            style={{ animation: 'shimmer 1.6s ease-in-out infinite', backgroundSize: '200% 100%' }} />
        </div>

        {/* Steps */}
        <ul className="space-y-2.5">
          {steps.map((s, i) => (
            <li key={s.label} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40 border border-border/60">
              <div className="w-7 h-7 rounded-md bg-card border border-border flex items-center justify-center flex-shrink-0">
                <s.icon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <span className="text-sm text-foreground/80 flex-1">{s.label}</span>
              <span className="loader-dots text-muted-foreground/60"><span /><span /><span /></span>
            </li>
          ))}
        </ul>

        {/* Skeleton preview */}
        <div className="mt-6 pt-6 border-t border-border/60 flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg skeleton-shimmer flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 skeleton-shimmer rounded" />
            <div className="h-2.5 w-1/3 skeleton-shimmer rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="glass-card p-12 text-center">
      <CheckCircle2 className="w-16 h-16 mx-auto text-success mb-4" />
      <h3 className="font-display text-2xl font-bold text-foreground">Produto Publicado!</h3>
      <p className="text-muted-foreground mt-2">
        <strong className="text-foreground">{product.title}</strong> foi criado como rascunho no Shopify.
      </p>

      <div className="flex gap-3 justify-center mt-6">
        {product.shopifyUrl && (
          <Button asChild>
            <a href={product.shopifyUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver no Shopify
            </a>
          </Button>
        )}
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>
    </div>
  );
}
