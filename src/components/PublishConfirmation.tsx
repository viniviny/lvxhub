import { Button } from '@/components/ui/button';
import { CheckCircle2, ExternalLink, ArrowLeft, Loader2 } from 'lucide-react';
import { Product } from '@/types/product';

interface PublishConfirmationProps {
  product: Product | null;
  isPublishing: boolean;
  onBack: () => void;
}

export function PublishConfirmation({ product, isPublishing, onBack }: PublishConfirmationProps) {
  if (isPublishing) {
    return (
      <div className="glass-card p-12 text-center">
        <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
        <h3 className="font-display text-xl font-semibold text-foreground">Publicando no Shopify...</h3>
        <p className="text-muted-foreground mt-2 text-sm">Criando produto como rascunho</p>
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
