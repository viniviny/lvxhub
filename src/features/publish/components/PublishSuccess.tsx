import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ExternalLink, Package, ClipboardList } from 'lucide-react';
import type { ProductFormData } from '@/types/product';

interface PublishSuccessProps {
  publishResult: { title: string; shopifyUrl: string; imageUrl?: string };
  form: ProductFormData;
  currencySymbol: string;
  onNewProduct: () => void;
  onViewHistory: () => void;
}

export function PublishSuccess({ publishResult, form, currencySymbol, onNewProduct, onViewHistory }: PublishSuccessProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      <div className="glass-card p-10 text-center max-w-md w-full">
        <div className="w-20 h-20 mx-auto rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle2 className="w-10 h-10 text-[hsl(var(--success))]" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">Produto Publicado!</h2>

        {publishResult.imageUrl && (
          <img src={publishResult.imageUrl} alt={publishResult.title} className="w-24 h-24 mx-auto rounded-lg border border-border object-contain my-4" />
        )}

        <p className="text-foreground font-semibold text-lg">{publishResult.title}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-primary font-bold">{currencySymbol}{form.price.toFixed(2)}</span>
          {form.compareAtPrice && form.compareAtPrice > form.price && (
            <Badge className="bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30">
              {Math.round(((form.compareAtPrice - form.price) / form.compareAtPrice) * 100)}% off
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-6">
          <Button asChild>
            <a href={publishResult.shopifyUrl} target="_blank" rel="noopener noreferrer">
              Ver produto no Shopify <ExternalLink className="w-4 h-4 ml-1" />
            </a>
          </Button>
          <Button variant="secondary" onClick={onNewProduct}>
            <Package className="w-4 h-4 mr-2" />Publicar outro produto
          </Button>
          <Button variant="ghost" onClick={onViewHistory}>
            <ClipboardList className="w-4 h-4 mr-2" />Ver histórico
          </Button>
        </div>
      </div>
    </div>
  );
}