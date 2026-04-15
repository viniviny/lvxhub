import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Package, ArrowRight, Loader2, ExternalLink, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface ImportedProduct {
  id: string;
  name: string;
  cost?: number;
  imageUrl?: string;
  imageCount?: number;
  sourceUrl?: string;
  createdAt: string;
}

interface ImportedProductsProps {
  onOpen: (projectId: string) => void;
}

export function ImportedProducts({ onOpen }: ImportedProductsProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<ImportedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchImported = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, product_data, ai_data, created_at')
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const imported = (data || [])
        .filter((row: any) => row.ai_data?.imageInsights?.importedFrom === 'aliexpress')
        .map((row: any) => ({
          id: row.id,
          name: row.name,
          cost: row.product_data?.cost || 0,
          imageUrl: row.ai_data?.imageInsights?.sourceImages?.[0] || '',
          imageCount: row.ai_data?.imageInsights?.sourceImages?.length || 0,
          sourceUrl: row.ai_data?.imageInsights?.sourceUrl || '',
          createdAt: row.created_at,
        }));

      setProducts(imported);
    } catch (err) {
      toast.error('Erro ao carregar produtos importados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImported();
  }, [user]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Produto removido');
    } catch {
      toast.error('Erro ao remover produto');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'Agora mesmo';
    if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl font-bold text-foreground">Importados</h2>
            {products.length > 0 && (
              <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {products.length}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Produtos importados via extensão Chrome aguardando edição.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchImported}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Atualizar
        </Button>
      </div>

      {/* Empty state */}
      {products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <Package className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">Nenhum produto importado</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Use a extensão Chrome no AliExpress para importar produtos. Eles aparecerão aqui automaticamente.
          </p>
        </div>
      )}

      {/* Product list */}
      {products.length > 0 && (
        <div className="space-y-2">
          {products.map(product => (
            <div
              key={product.id}
              className="flex items-center gap-4 p-3 rounded-xl border border-border bg-card hover:bg-accent/5 transition-colors"
            >
              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {product.name}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  {product.cost && product.cost > 0 && (
                    <span>US$ {product.cost.toFixed(2)}</span>
                  )}
                  {product.imageCount && product.imageCount > 0 && (
                    <span>🖼 {product.imageCount} fotos</span>
                  )}
                  <span>{formatDate(product.createdAt)}</span>
                  {product.sourceUrl && (
                    <a
                      href={product.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-primary hover:underline"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3 h-3" />
                      AliExpress
                    </a>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(product.id)}
                  disabled={deleting === product.id}
                >
                  {deleting === product.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                </Button>
                <Button size="sm" onClick={() => onOpen(product.id)}>
                  Editar
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
