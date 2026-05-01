import { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Link2, Search, CheckCircle2, X, RotateCcw, Store, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface PreviewProduct {
  handle: string;
  title: string;
  image: string | null;
  price: string;
  priceMax?: string;
  priceSingle?: boolean;
  currency?: string;
  currencySymbol?: string;
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
  const [importedHandles, setImportedHandles] = useState<Set<string>>(new Set());
  const [allowReimport, setAllowReimport] = useState(false);
  const [productStatus, setProductStatus] = useState<'active' | 'draft'>('active');
  const [inventoryPolicy, setInventoryPolicy] = useState<'continue' | 'deny'>('continue');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewExclude, setReviewExclude] = useState<Set<string>>(new Set());
  const [reviewExpanded, setReviewExpanded] = useState<Set<string>>(new Set());
  const [variantsShown, setVariantsShown] = useState<Record<string, number>>({});
  const [imagesShown, setImagesShown] = useState<Record<string, number>>({});

  // Job state
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState({ done: 0, total: 0, created: 0, failed: 0 });
  const pollRef = useRef<number | null>(null);

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

  // Carrega handles já importados quando muda loja destino + origin
  useEffect(() => {
    if (!targetStoreId || !preview?.origin) {
      setImportedHandles(new Set());
      return;
    }
    const store = stores.find(s => s.id === targetStoreId);
    if (!store) return;
    (async () => {
      const { data } = await supabase
        .from('published_products')
        .select('source_handle')
        .eq('store_domain', store.store_domain)
        .eq('source_origin', preview.origin)
        .not('source_handle', 'is', null);
      setImportedHandles(new Set((data || []).map((r: any) => r.source_handle).filter(Boolean)));
    })();
  }, [targetStoreId, preview?.origin, stores]);

  const urlType = detectType(url);

  const filtered = useMemo(() => {
    if (!preview) return [];
    if (!search.trim()) return preview.products;
    const q = search.toLowerCase();
    return preview.products.filter(p => p.title.toLowerCase().includes(q));
  }, [preview, search]);

  const isImported = (handle: string) => importedHandles.has(handle);
  const canSelect = (handle: string) => allowReimport || !isImported(handle);

  const selectableFiltered = filtered.filter(p => canSelect(p.handle));
  const allSelectableSelected = selectableFiltered.length > 0 && selectableFiltered.every(p => selected.has(p.handle));

  const toggleAll = () => {
    if (allSelectableSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        selectableFiltered.forEach(p => next.delete(p.handle));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        selectableFiltered.forEach(p => next.add(p.handle));
        return next;
      });
    }
  };

  const toggle = (handle: string) => {
    if (!canSelect(handle)) return;
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

  // Polling do job
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    const poll = async () => {
      const { data } = await supabase
        .from('generation_jobs')
        .select('status, progress, total_steps, result, error_message')
        .eq('id', jobId)
        .maybeSingle();
      if (cancelled || !data) return;
      const result: any = data.result || {};
      setJobProgress({
        done: data.progress || 0,
        total: data.total_steps || 0,
        created: result.created_count || 0,
        failed: result.failed_count || 0,
      });
      if (data.status === 'completed') {
        const store = stores.find(s => s.id === targetStoreId);
        toast.success(
          `${result.created_count || 0} produto${result.created_count !== 1 ? 's' : ''} publicado${result.created_count !== 1 ? 's' : ''} em ${store?.store_domain || 'sua loja'}`
        );
        if ((result.failed_count || 0) > 0) {
          toast.error(`${result.failed_count} falharam: ${(result.errors || []).slice(0, 2).join(' | ')}`);
        }
        setJobId(null);
        // Atualiza dedupe local
        const newHandles = new Set(importedHandles);
        (result.created || []).forEach((c: any) => {
          // Não temos handle de origem aqui, mas o useEffect já vai recarregar.
        });
        // Refresh dedupe
        if (preview?.origin && targetStoreId) {
          const store = stores.find(s => s.id === targetStoreId);
          if (store) {
            const { data: refreshed } = await supabase
              .from('published_products')
              .select('source_handle')
              .eq('store_domain', store.store_domain)
              .eq('source_origin', preview.origin)
              .not('source_handle', 'is', null);
            setImportedHandles(new Set((refreshed || []).map((r: any) => r.source_handle).filter(Boolean)));
          }
        }
        setSelected(new Set());
        onImportComplete?.();
      } else if (data.status === 'failed') {
        toast.error(data.error_message || 'Importação falhou');
        setJobId(null);
      }
    };
    poll();
    pollRef.current = window.setInterval(poll, 1500);
    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const openReview = () => {
    if (!preview || selected.size === 0) return;
    if (!targetStoreId) {
      toast.error('Selecione a loja Shopify de destino antes de importar.');
      return;
    }
    setReviewExclude(new Set());
    setReviewOpen(true);
  };

  const confirmImport = async () => {
    if (!preview || selected.size === 0 || !targetStoreId) return;
    const toImport = preview.products.filter(
      p => selected.has(p.handle) && !reviewExclude.has(p.handle)
    );
    if (toImport.length === 0) {
      toast.error('Nenhum produto restante para importar.');
      return;
    }
    setReviewOpen(false);
    try {
      const { data, error } = await supabase.functions.invoke('import-shopify-direct', {
        body: {
          products: toImport,
          origin: preview.origin,
          storeId: targetStoreId,
          productStatus,
          inventoryPolicy,
        },
      });
      if (error) throw error;
      if (!data?.success || !data.jobId) throw new Error(data?.error || 'Erro ao iniciar importação');
      setJobProgress({ done: 0, total: data.total, created: 0, failed: 0 });
      setJobId(data.jobId);
      toast.info(`Iniciando publicação de ${data.total} produto${data.total !== 1 ? 's' : ''}...`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao importar produtos');
    }
  };

  const handleReset = () => {
    setPreview(null);
    setSelected(new Set());
    setSearch('');
    setImportedHandles(new Set());
  };

  const importing = jobId !== null;
  const importedCount = preview ? preview.products.filter(p => isImported(p.handle)).length : 0;

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
  const progressPct = jobProgress.total > 0 ? Math.round((jobProgress.done / jobProgress.total) * 100) : 0;

  return (
    <div className="animate-fade-in flex flex-col" style={{ minHeight: 0 }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            {preview.total} produto{preview.total !== 1 ? 's' : ''} carregados
          </span>
          {importedCount > 0 && (
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full whitespace-nowrap">
              {importedCount} já importado{importedCount !== 1 ? 's' : ''}
            </span>
          )}
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

        {importedCount > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allowReimport}
              onChange={e => setAllowReimport(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border"
            />
            Permitir reimportar
          </label>
        )}

        <Button variant="outline" size="sm" onClick={toggleAll} className="h-8 text-xs whitespace-nowrap" disabled={selectableFiltered.length === 0}>
          {allSelectableSelected ? 'Desmarcar todos' : 'Selecionar todos'}
        </Button>

        <Button variant="outline" size="sm" onClick={handleReset} className="h-8" disabled={importing}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Nova URL
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 pb-32">
        {filtered.map(product => {
          const isSelected = selected.has(product.handle);
          const imported = isImported(product.handle);
          const disabled = imported && !allowReimport;
          const symbol = product.currencySymbol || '$';
          const priceLabel = product.priceSingle === false && product.priceMax && product.priceMax !== product.price
            ? `${symbol} ${product.price} – ${product.priceMax}`
            : `${symbol} ${product.price}`;

          return (
            <button
              key={product.handle}
              onClick={() => toggle(product.handle)}
              disabled={disabled}
              className={`relative rounded-xl border-2 overflow-hidden text-left transition-all duration-150 focus:outline-none ${
                isSelected
                  ? 'border-primary shadow-sm'
                  : disabled
                  ? 'border-border opacity-50 cursor-not-allowed'
                  : 'border-border hover:border-primary/40'
              }`}
            >
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

                <div className="absolute top-1.5 left-1.5">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'bg-primary border-primary' : 'bg-background/80 border-muted-foreground/50'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                  </div>
                </div>

                {imported && (
                  <div className="absolute top-1.5 right-1.5 bg-foreground/85 text-background text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Já importado
                  </div>
                )}

                {isSelected && (
                  <div className="absolute inset-0 bg-primary/15 pointer-events-none" />
                )}
              </div>

              <div className="p-2 bg-card">
                <div className="text-xs font-medium text-foreground line-clamp-2 leading-tight">
                  {product.title}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-semibold text-primary truncate">
                    {priceLabel}
                  </span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-1">
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
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 bg-card border border-border rounded-xl px-5 py-3 shadow-lg z-50 max-w-[calc(100vw-2rem)]">
        {importing ? (
          <div className="flex flex-col gap-2 min-w-[320px]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                Publicando {jobProgress.done} de {jobProgress.total}
              </span>
              <span className="text-muted-foreground">
                {jobProgress.created} ok{jobProgress.failed > 0 && ` · ${jobProgress.failed} falhas`}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              <span className="font-semibold text-foreground">{selected.size}</span> de {preview.total}
            </span>

            {stores.length > 1 && (
              <select
                value={targetStoreId}
                onChange={e => setTargetStoreId(e.target.value)}
                className="h-8 rounded-md border border-input bg-card px-2 text-xs max-w-[160px]"
              >
                <option value="">Loja...</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.store_domain}</option>
                ))}
              </select>
            )}

            <select
              value={productStatus}
              onChange={e => setProductStatus(e.target.value as 'active' | 'draft')}
              className="h-8 rounded-md border border-input bg-card px-2 text-xs"
              title="Status na publicação"
            >
              <option value="active">Ativo</option>
              <option value="draft">Rascunho</option>
            </select>

            <select
              value={inventoryPolicy}
              onChange={e => setInventoryPolicy(e.target.value as 'continue' | 'deny')}
              className="h-8 rounded-md border border-input bg-card px-2 text-xs"
              title="Política de estoque esgotado"
            >
              <option value="continue">Vende sem estoque</option>
              <option value="deny">Para se esgotar</option>
            </select>

            <Button
              onClick={openReview}
              disabled={selected.size === 0 || !targetStoreId}
              size="sm"
            >
              Revisar e publicar ({selected.size})
            </Button>
          </div>
        )}
      </div>

      {/* Diálogo de revisão pré-importação */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Revisar antes de publicar</DialogTitle>
            <DialogDescription>
              Confira os produtos abaixo. Desmarque qualquer um que não queira publicar agora.
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const items = preview?.products.filter(p => selected.has(p.handle)) || [];
            const remaining = items.filter(p => !reviewExclude.has(p.handle));
            const dupesIncluded = remaining.filter(p => isImported(p.handle)).length;
            const store = stores.find(s => s.id === targetStoreId);

            return (
              <>
                <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 rounded-lg px-3 py-2.5 border border-border">
                  <div>
                    <div className="text-muted-foreground">Loja destino</div>
                    <div className="font-medium text-foreground truncate">{store?.store_domain || '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Status</div>
                    <div className="font-medium text-foreground">
                      {productStatus === 'active' ? 'Ativo (visível na loja)' : 'Rascunho'}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Estoque esgotado</div>
                    <div className="font-medium text-foreground">
                      {inventoryPolicy === 'continue' ? 'Vende sem estoque' : 'Para de vender'}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Origem</div>
                    <div className="font-medium text-foreground truncate">{preview?.origin || '—'}</div>
                  </div>
                </div>

                {dupesIncluded > 0 && (
                  <div className="flex items-start gap-2 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-md px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>
                      {dupesIncluded} produto{dupesIncluded !== 1 ? 's' : ''} já {dupesIncluded !== 1 ? 'foram importados' : 'foi importado'} antes desta origem. Ao confirmar, {dupesIncluded !== 1 ? 'serão duplicados' : 'será duplicado'} na loja.
                    </span>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1.5 min-h-0">
                  {items.map(p => {
                    const excluded = reviewExclude.has(p.handle);
                    const imported = isImported(p.handle);
                    const symbol = p.currencySymbol || '$';
                    const priceLabel = p.priceSingle === false && p.priceMax && p.priceMax !== p.price
                      ? `${symbol} ${p.price} – ${p.priceMax}`
                      : `${symbol} ${p.price}`;
                    const expanded = reviewExpanded.has(p.handle);
                    const raw = p.raw || {};
                    const descHtml: string = raw.body_html || '';
                    const descText = descHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                    const variants: any[] = raw.variants || [];
                    const minPrice = parseFloat(p.price || '0');
                    const maxPrice = parseFloat(p.priceMax || p.price || '0');
                    return (
                      <div
                        key={p.handle}
                        className={`rounded-lg border transition-colors ${
                          excluded ? 'border-border opacity-50' : 'border-border bg-card'
                        }`}
                      >
                        <div className="flex items-center gap-3 p-2">
                          <input
                            type="checkbox"
                            checked={!excluded}
                            onChange={() => {
                              setReviewExclude(prev => {
                                const next = new Set(prev);
                                next.has(p.handle) ? next.delete(p.handle) : next.add(p.handle);
                                return next;
                              });
                            }}
                            className="h-4 w-4 rounded border-border flex-shrink-0"
                          />
                          <div className="w-12 h-12 rounded-md bg-muted overflow-hidden flex-shrink-0">
                            {p.image ? (
                              <img src={p.image} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                            ) : null}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{p.title}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <span className="text-primary font-semibold">{priceLabel}</span>
                              <span>·</span>
                              <span>{p.imagesCount}img · {p.variantsCount}var</span>
                              {imported && (
                                <span className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                                  Já importado
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setReviewExpanded(prev => {
                                const next = new Set(prev);
                                next.has(p.handle) ? next.delete(p.handle) : next.add(p.handle);
                                return next;
                              });
                            }}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/50 transition-colors flex-shrink-0"
                          >
                            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            {expanded ? 'Ocultar' : 'Ver detalhes'}
                          </button>
                        </div>

                        {expanded && (
                          <div className="border-t border-border px-3 py-3 space-y-3 bg-muted/20">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                              <div>
                                <div className="text-muted-foreground">Preço mín.</div>
                                <div className="font-semibold text-foreground">{p.currencySymbol || '$'} {minPrice.toFixed(2)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Preço máx.</div>
                                <div className="font-semibold text-foreground">{p.currencySymbol || '$'} {maxPrice.toFixed(2)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Imagens</div>
                                <div className="font-semibold text-foreground">{p.imagesCount}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Variantes</div>
                                <div className="font-semibold text-foreground">{p.variantsCount}</div>
                              </div>
                              {p.vendor && (
                                <div>
                                  <div className="text-muted-foreground">Vendor</div>
                                  <div className="font-medium text-foreground truncate">{p.vendor}</div>
                                </div>
                              )}
                              {p.productType && (
                                <div>
                                  <div className="text-muted-foreground">Tipo</div>
                                  <div className="font-medium text-foreground truncate">{p.productType}</div>
                                </div>
                              )}
                              <div className="col-span-2">
                                <div className="text-muted-foreground">Handle</div>
                                <div className="font-mono text-[11px] text-foreground truncate">{p.handle}</div>
                              </div>
                            </div>

                            {descText && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Descrição</div>
                                <div className="text-xs text-foreground/90 max-h-32 overflow-y-auto rounded-md border border-border bg-card p-2 leading-relaxed">
                                  {descText}
                                </div>
                              </div>
                            )}

                            {variants.length > 0 && (() => {
                              const vStep = 20;
                              const vShown = variantsShown[p.handle] ?? vStep;
                              const vVisible = variants.slice(0, vShown);
                              const vRemaining = variants.length - vShown;
                              return (
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
                                    <span>Variantes ({variants.length})</span>
                                    <span className="text-[10px]">{Math.min(vShown, variants.length)}/{variants.length}</span>
                                  </div>
                                  <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-card divide-y divide-border">
                                    {vVisible.map((v: any, idx: number) => {
                                      const opts = [v.option1, v.option2, v.option3].filter(Boolean).join(' / ');
                                      return (
                                        <div key={idx} className="flex items-center justify-between gap-2 px-2 py-1 text-[11px]">
                                          <span className="text-foreground truncate">{opts || `Variante ${idx + 1}`}</span>
                                          <span className="text-primary font-semibold whitespace-nowrap">
                                            {p.currencySymbol || '$'} {parseFloat(v.price || '0').toFixed(2)}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {vRemaining > 0 && (
                                    <div className="flex gap-2 mt-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setVariantsShown(prev => ({ ...prev, [p.handle]: vShown + vStep }))}
                                        className="flex-1 text-[11px] font-medium text-primary hover:bg-primary/10 rounded-md py-1 transition-colors"
                                      >
                                        Ver mais {Math.min(vStep, vRemaining)}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setVariantsShown(prev => ({ ...prev, [p.handle]: variants.length }))}
                                        className="flex-1 text-[11px] font-medium text-muted-foreground hover:bg-muted rounded-md py-1 transition-colors"
                                      >
                                        Ver todas ({variants.length})
                                      </button>
                                    </div>
                                  )}
                                  {vShown > vStep && vRemaining <= 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setVariantsShown(prev => ({ ...prev, [p.handle]: vStep }))}
                                      className="w-full text-[11px] font-medium text-muted-foreground hover:bg-muted rounded-md py-1 mt-1.5 transition-colors"
                                    >
                                      Recolher
                                    </button>
                                  )}
                                </div>
                              );
                            })()}

                            {p.imagesCount > 1 && Array.isArray(raw.images) && (() => {
                              const iStep = 12;
                              const iShown = imagesShown[p.handle] ?? iStep;
                              const iVisible = raw.images.slice(0, iShown);
                              const iRemaining = raw.images.length - iShown;
                              return (
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
                                    <span>Imagens ({p.imagesCount})</span>
                                    <span className="text-[10px]">{Math.min(iShown, raw.images.length)}/{raw.images.length}</span>
                                  </div>
                                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
                                    {iVisible.map((img: any, idx: number) => (
                                      <a
                                        key={idx}
                                        href={img.src}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block aspect-square rounded-md overflow-hidden border border-border hover:border-primary/60 transition-colors"
                                        title="Abrir em nova aba"
                                      >
                                        <img
                                          src={img.src}
                                          alt=""
                                          loading="lazy"
                                          className="w-full h-full object-cover bg-muted"
                                        />
                                      </a>
                                    ))}
                                  </div>
                                  {iRemaining > 0 && (
                                    <div className="flex gap-2 mt-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setImagesShown(prev => ({ ...prev, [p.handle]: iShown + iStep }))}
                                        className="flex-1 text-[11px] font-medium text-primary hover:bg-primary/10 rounded-md py-1 transition-colors"
                                      >
                                        Ver mais {Math.min(iStep, iRemaining)}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setImagesShown(prev => ({ ...prev, [p.handle]: raw.images.length }))}
                                        className="flex-1 text-[11px] font-medium text-muted-foreground hover:bg-muted rounded-md py-1 transition-colors"
                                      >
                                        Ver todas ({raw.images.length})
                                      </button>
                                    </div>
                                  )}
                                  {iShown > iStep && iRemaining <= 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setImagesShown(prev => ({ ...prev, [p.handle]: iStep }))}
                                      className="w-full text-[11px] font-medium text-muted-foreground hover:bg-muted rounded-md py-1 mt-1.5 transition-colors"
                                    >
                                      Recolher
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    {remaining.length} de {items.length} {remaining.length === 1 ? 'será publicado' : 'serão publicados'}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setReviewOpen(false)}>
                      Voltar
                    </Button>
                    <Button size="sm" onClick={confirmImport} disabled={remaining.length === 0}>
                      Confirmar publicação ({remaining.length})
                    </Button>
                  </div>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
