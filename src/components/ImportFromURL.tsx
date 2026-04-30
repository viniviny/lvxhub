import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Link2, Search, CheckCircle2, X, RotateCcw, Store } from 'lucide-react';

interface PreviewProduct {
  handle: string;
  title: string;
  image: string | null;
  price: string;
  imagesCount: number;
  variantsCount: number;
  vendor: string;
  productType: string;
  raw: any;
}

interface ImportFromURLProps {
  onImportComplete?: () => void;
}

interface ConnectedStore {
  id: string;
  shop_name: string;
  store_domain: string;
}

const EXAMPLE_STORES = [
  { label: 'Allbirds – Masculino', url: 'https://www.allbirds.com/collections/mens' },
  { label: 'Taylor Stitch – Camisas', url: 'https://www.taylorstitch.com/collections/mens-shirts' },
  { label: 'Gymshark – Masculino', url: 'https://www.gymshark.com/collections/mens' },
];

function detectType(url: string): string {
  try {
    const p = new URL(url).pathname.replace(/\/$/, '');
    if (/^\/products\/[^/]+$/.test(p)) return 'Produto';
    if (/^\/collections\/[^/]+$/.test(p)) return 'Coleção';
    if (p === '' || p === '/') return 'Loja';
    return 'URL';
  } catch {
    return 'URL';
  }
}

export function ImportFromURL({ onImportComplete }: ImportFromURLProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<{
    type: string;
    origin: string;
    title: string;
    total: number;
    products: PreviewProduct[];
  } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [stores, setStores] = useState<ConnectedStore[]>([]);
  const [targetStoreId, setTargetStoreId] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('shopify_connections')
        .select('id, shop_name, store_domain')
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      const list = (data || []) as ConnectedStore[];
      setStores(list);
      if (list.length === 1) setTargetStoreId(list[0].id);
    })();
  }, []);

  const urlType = detectType(url);

  const filtered = useMemo(() => {
    if (!preview) return [];
    if (!search.trim()) return preview.products;
    const q = search.toLowerCase();
    return preview.products.filter(p => p.title.toLowerCase().includes(q));
  }, [preview, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every(p => selected.has(p.handle));

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(p => next.delete(p.handle));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(p => next.add(p.handle));
        return next;
      });
    }
  };

  const toggle = (handle: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(handle) ? next.delete(handle) : next.add(handle);
      return next;
    });
  };

  const handleLoad = async (targetUrl = url) => {
    if (!targetUrl.trim()) return;
    setLoading(true);
    setPreview(null);
    setSelected(new Set());
    setSearch('');
    try {
      const { data, error } = await supabase.functions.invoke('load-shopify-products', {
        body: { url: targetUrl.trim() },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao carregar produtos');
      setPreview(data);
      // Pré-seleciona se for produto único
      if (data.type === 'product' && data.products?.length === 1) {
        setSelected(new Set([data.products[0].handle]));
      }
      if (targetUrl !== url) setUrl(targetUrl);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview || selected.size === 0) return;
    if (!targetStoreId) {
      toast.error('Selecione a loja Shopify de destino antes de importar.');
      return;
    }
    const toImport = preview.products.filter(p => selected.has(p.handle));
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-shopify-direct', {
        body: { products: toImport, origin: preview.origin, storeId: targetStoreId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao importar');
      const store = stores.find(s => s.id === targetStoreId);
      toast.success(
        `${data.created} produto${data.created !== 1 ? 's' : ''} publicado${data.created !== 1 ? 's' : ''} em ${store?.store_domain || 'sua loja'}`
      );
      if (data.failed > 0) {
        toast.error(`${data.failed} falharam: ${(data.errors || []).slice(0, 2).join(' | ')}`);
      }
      onImportComplete?.();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao importar produtos');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setSelected(new Set());
    setSearch('');
  };

  // ── ESTADO 1: Input ──
  if (!preview) {
    return (
      <div className="animate-fade-in max-w-2xl">
        <div className="mb-6">
          <h2 className="font-display text-2xl font-bold text-foreground">Importar via URL</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Cole a URL de um produto, coleção ou loja Shopify. Os produtos vão direto para a sua loja, ativos e visíveis.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          {/* Seletor de loja destino */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-muted-foreground" />
              Loja de destino
            </label>
            {stores.length === 0 ? (
              <div className="text-xs text-destructive border border-destructive/30 bg-destructive/5 rounded-md px-3 py-2">
                Nenhuma loja Shopify conectada. Conecte uma loja em "Lojas" antes de importar.
              </div>
            ) : (
              <select
                value={targetStoreId}
                onChange={e => setTargetStoreId(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Selecione uma loja...</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.shop_name} — {s.store_domain}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLoad()}
                placeholder="https://loja.myshopify.com/collections/..."
                className="font-mono text-sm pr-24"
              />
              {url.trim() && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full pointer-events-none">
                  {urlType}
                </span>
              )}
            </div>
            <Button onClick={() => handleLoad()} disabled={loading || !url.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              <span className="ml-2">{loading ? 'Carregando...' : 'Carregar'}</span>
            </Button>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Exemplos para testar</p>
            {EXAMPLE_STORES.map(s => (
              <button
                key={s.url}
                onClick={() => handleLoad(s.url)}
                disabled={loading}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-sm group"
              >
                <Link2 className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary flex-shrink-0 transition-colors" />
                <span className="font-medium text-foreground">{s.label}</span>
                <span className="font-mono text-xs text-muted-foreground truncate ml-auto">{s.url}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── ESTADO 2 e 3: Produtos carregados ──
  return (
    <div className="animate-fade-in flex flex-col" style={{ minHeight: 0 }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            {preview.total} produto{preview.total !== 1 ? 's' : ''} carregados
          </span>
          {preview.title && (
            <span className="text-xs text-muted-foreground truncate">— {preview.title}</span>
          )}
        </div>

        <div className="relative w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="pl-8 h-8 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={toggleAll} className="h-8 text-xs whitespace-nowrap">
          {allFilteredSelected ? 'Desmarcar todos' : 'Selecionar todos'}
        </Button>

        <Button variant="outline" size="sm" onClick={handleReset} className="h-8">
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Nova URL
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 pb-20">
        {filtered.map(product => {
          const isSelected = selected.has(product.handle);
          return (
            <button
              key={product.handle}
              onClick={() => toggle(product.handle)}
              className={`relative rounded-xl border-2 overflow-hidden text-left transition-all duration-150 focus:outline-none ${
                isSelected
                  ? 'border-primary shadow-sm'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              {/* Image */}
              <div className="relative aspect-square bg-muted">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                    Sem foto
                  </div>
                )}

                {/* Checkbox overlay */}
                <div className="absolute top-1.5 left-1.5">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'bg-primary border-primary' : 'bg-background/80 border-muted-foreground/50'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                  </div>
                </div>

                {/* Selected overlay */}
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/15 pointer-events-none" />
                )}
              </div>

              {/* Info */}
              <div className="p-2 bg-card">
                <div className="text-xs font-medium text-foreground line-clamp-2 leading-tight">
                  {product.title}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-semibold text-primary">
                    US$ {product.price}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {product.imagesCount}img · {product.variantsCount}var
                  </span>
                </div>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
            Nenhum produto encontrado para "{search}"
          </div>
        )}
      </div>

      {/* Footer sticky */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-card border border-border rounded-xl px-5 py-3 shadow-lg z-50">
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          <span className="font-semibold text-foreground">{selected.size}</span> de {preview.total} selecionados
        </span>
        {stores.length > 1 && (
          <select
            value={targetStoreId}
            onChange={e => setTargetStoreId(e.target.value)}
            className="h-8 rounded-md border border-input bg-card px-2 text-xs max-w-[180px]"
          >
            <option value="">Loja destino...</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.store_domain}</option>
            ))}
          </select>
        )}
        <Button
          onClick={handleImport}
          disabled={selected.size === 0 || importing || !targetStoreId}
          size="sm"
        >
          {importing && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
          {importing ? `Publicando ${selected.size}...` : `Publicar ${selected.size} na Shopify`}
        </Button>
      </div>
    </div>
  );
}
