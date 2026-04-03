import { usePublishedProducts, type HistoryFilters, type PublishedProduct } from '@/hooks/usePublishedProducts';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ExternalLink, Package, Search, Loader2, Filter, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductHistoryProps {
  onEditProduct?: (product: PublishedProduct) => void;
}

export function ProductHistory({ onEditProduct }: ProductHistoryProps) {
  const { products, loading, filters, setFilters, refetch } = usePublishedProducts();
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<PublishedProduct | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState<PublishedProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleEdit = (product: PublishedProduct) => {
    setEditingProduct(product);
    setEditTitle(product.title);
    setEditDescription(product.description || '');
    setEditPrice(product.local_price?.toString() || '');
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('published_products')
        .update({
          title: editTitle,
          description: editDescription,
          local_price: editPrice ? parseFloat(editPrice) : null,
        })
        .eq('id', editingProduct.id);
      if (error) throw error;
      toast.success('Produto atualizado com sucesso');
      setEditingProduct(null);
      refetch();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar produto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteProduct) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('published_products')
        .delete()
        .eq('id', deleteProduct.id);
      if (error) throw error;
      toast.success('Produto removido do histórico');
      setDeleteProduct(null);
      refetch();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao remover produto');
    } finally {
      setDeleting(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.country_name?.toLowerCase().includes(q) ||
      p.store_domain.toLowerCase().includes(q) ||
      p.market_name?.toLowerCase().includes(q)
    );
  }, [products, search]);

  // Extract unique values for filters
  const countries = useMemo(() => {
    const map = new Map<string, { code: string; flag: string; name: string }>();
    products.forEach(p => {
      if (p.country_code && p.country_name) {
        map.set(p.country_code, { code: p.country_code, flag: p.country_flag || '', name: p.country_name });
      }
    });
    return Array.from(map.values());
  }, [products]);

  const currencies = useMemo(() => [...new Set(products.map(p => p.currency).filter(Boolean))], [products]);
  const languages = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach(p => { if (p.language && p.language_label) map.set(p.language, p.language_label); });
    return Array.from(map.entries());
  }, [products]);
  const regionGroups = useMemo(() => [...new Set(products.map(p => p.region_group).filter(Boolean))], [products]);

  const formatPrice = (p: typeof products[0]) => {
    if (!p.local_price) return '—';
    const sym = p.currency_symbol || p.currency || '';
    return `${sym} ${p.local_price.toFixed(2)}`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">Histórico</h2>
      <p className="text-muted-foreground text-sm mb-6">Todos os produtos publicados com detalhes por país, moeda e idioma.</p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título, país, loja..."
            className="pl-9 bg-secondary border-border"
          />
        </div>
        {countries.length > 0 && (
          <Select value={filters.countryCode || 'all'} onValueChange={v => setFilters(f => ({ ...f, countryCode: v === 'all' ? undefined : v }))}>
            <SelectTrigger className="w-[160px] bg-secondary border-border">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue placeholder="País" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os países</SelectItem>
              {countries.map(c => (
                <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {currencies.length > 0 && (
          <Select value={filters.currency || 'all'} onValueChange={v => setFilters(f => ({ ...f, currency: v === 'all' ? undefined : v }))}>
            <SelectTrigger className="w-[130px] bg-secondary border-border">
              <SelectValue placeholder="Moeda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas moedas</SelectItem>
              {currencies.map(c => (
                <SelectItem key={c!} value={c!}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {languages.length > 0 && (
          <Select value={filters.language || 'all'} onValueChange={v => setFilters(f => ({ ...f, language: v === 'all' ? undefined : v }))}>
            <SelectTrigger className="w-[150px] bg-secondary border-border">
              <SelectValue placeholder="Idioma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos idiomas</SelectItem>
              {languages.map(([code, label]) => (
                <SelectItem key={code} value={code}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {regionGroups.length > 0 && (
          <Select value={filters.regionGroup || 'all'} onValueChange={v => setFilters(f => ({ ...f, regionGroup: v === 'all' ? undefined : v }))}>
            <SelectTrigger className="w-[150px] bg-secondary border-border">
              <SelectValue placeholder="Grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos grupos</SelectItem>
              {regionGroups.map(g => (
                <SelectItem key={g!} value={g!}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Results */}
      {filteredProducts.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum produto encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map(product => (
            <div key={product.id} className="glass-card p-4 flex items-center gap-4">
              {/* Image */}
              {product.image_url && (
                <img src={product.image_url} alt={product.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-border" />
              )}
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-sm text-foreground truncate">{product.title}</span>
                  {product.shopify_url && (
                    <a href={product.shopify_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 flex-shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {product.country_flag && (
                    <span className="inline-flex items-center gap-1">
                      <span>{product.country_flag}</span>
                      <span>{product.country_name || product.country_code}</span>
                    </span>
                  )}
                  {product.language_label && <span>{product.language_label}</span>}
                  <span>{product.store_domain}</span>
                  {product.region_group && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{product.region_group}</Badge>
                  )}
                  <span>{formatDate(product.created_at)}</span>
                </div>
              </div>
              {/* Price */}
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-foreground">{formatPrice(product)}</p>
                {product.base_price && product.base_currency && product.currency !== product.base_currency && (
                  <p className="text-xs text-muted-foreground">{product.base_currency} {product.base_price.toFixed(2)}</p>
                )}
              </div>
              {/* Collection badge */}
              {product.collection && (
                <Badge variant="secondary" className="text-xs flex-shrink-0">{product.collection}</Badge>
              )}
              {/* Actions menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(product)}>
                    <Pencil className="w-3.5 h-3.5 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDeleteProduct(product)} className="text-destructive focus:text-destructive">
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Remover
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {products.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>{products.length} produto{products.length !== 1 ? 's' : ''} publicado{products.length !== 1 ? 's' : ''}</span>
          <span>{countries.length} país{countries.length !== 1 ? 'es' : ''}</span>
          <span>{currencies.length} moeda{currencies.length !== 1 ? 's' : ''}</span>
          <span>{languages.length} idioma{languages.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Preço local</Label>
              <Input type="number" step="0.01" value={editPrice} onChange={e => setEditPrice(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProduct} onOpenChange={(open) => !open && setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{deleteProduct?.title}" do histórico? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
