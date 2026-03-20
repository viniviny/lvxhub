import { Product } from '@/types/product';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Package } from 'lucide-react';

interface ProductTableProps {
  products: Product[];
}

export function ProductTable({ products }: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Nenhum produto publicado ainda.</p>
        <p className="text-sm text-muted-foreground/60 mt-1">
          Crie seu primeiro produto usando o formulário ao lado.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Produto</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Coleção</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Preço</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Tamanhos</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Status</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <tr key={product.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  {product.imageUrl && (
                    <img src={product.imageUrl} alt={product.title} className="w-10 h-10 rounded-md object-cover" />
                  )}
                  <div>
                    <p className="font-medium text-foreground">{product.title}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{product.description}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4 text-sm text-secondary-foreground">{product.collection}</td>
              <td className="px-5 py-4 text-sm font-medium text-foreground">
                R$ {product.price.toFixed(2)}
              </td>
              <td className="px-5 py-4">
                <div className="flex gap-1">
                  {product.sizes.map(s => (
                    <span key={s} className="text-xs bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground">{s}</span>
                  ))}
                </div>
              </td>
              <td className="px-5 py-4">
                <Badge variant="outline" className={product.status === 'publicado' ? 'status-published' : 'status-draft'}>
                  {product.status === 'publicado' ? 'Publicado' : 'Rascunho'}
                </Badge>
              </td>
              <td className="px-5 py-4">
                {product.shopifyUrl && (
                  <a href={product.shopifyUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
