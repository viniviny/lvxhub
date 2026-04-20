import { useMemo, useState, useCallback, DragEvent } from 'react';
import { Check, Image as ImageIcon, Layers, Sparkles, Trash2, Eye, X, ZoomIn, Palette } from 'lucide-react';
import { toast } from 'sonner';

export type AliImageType = 'main' | 'variant' | 'detail';

export interface AliImage {
  url: string;
  type: AliImageType;
  group?: string; // color/variant group key
}

interface AliExpressGalleryProps {
  sourceImages: string[];
  /** Send selected images as references for AI generation */
  onUseAsReferences: (urls: string[]) => Promise<void> | void;
  /** Send selected images as color/variant references */
  onUseAsVariants?: (urls: string[]) => Promise<void> | void;
  /** Optional collapse handler */
  onClose?: () => void;
}

/**
 * Heuristic: classify AliExpress image URLs into main/variant/detail.
 * - URL containing 'detail', 'zoom', '_S' near end → detail
 * - URL parameter ?sku= or color hex in path → variant
 * - First N → main
 */
function classifyImages(urls: string[]): AliImage[] {
  return urls.map((url, i) => {
    const lower = url.toLowerCase();
    const isDetail = /detail|zoom|_960|_1200|magnif/.test(lower);
    const isVariant = /sku|color|variant|spec/.test(lower);
    const type: AliImageType = isDetail ? 'detail' : isVariant ? 'variant' : i < 4 ? 'main' : 'detail';
    // Group key by removing trailing dimension/quality suffix → groups likely-same color
    const groupKey = url.replace(/_\d+x\d+\.[a-z]+(_\.\w+)?$/i, '').replace(/\.[a-z]+$/i, '').slice(-40);
    return { url, type, group: groupKey };
  });
}

export function AliExpressGallery({
  sourceImages,
  onUseAsReferences,
  onUseAsVariants,
  onClose,
}: AliExpressGalleryProps) {
  const classified = useMemo(() => classifyImages(sourceImages), [sourceImages]);
  const [order, setOrder] = useState<string[]>(() => sourceImages);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | AliImageType>('all');
  const [busy, setBusy] = useState<'ref' | 'var' | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const byUrl = useMemo(() => {
    const m = new Map<string, AliImage>();
    classified.forEach((c) => m.set(c.url, c));
    return m;
  }, [classified]);

  const ordered = useMemo(
    () => order.map((u) => byUrl.get(u)).filter((x): x is AliImage => !!x),
    [order, byUrl],
  );
  const visible = useMemo(
    () => (filter === 'all' ? ordered : ordered.filter((i) => i.type === filter)),
    [ordered, filter],
  );

  const counts = useMemo(() => {
    const c = { all: ordered.length, main: 0, variant: 0, detail: 0 };
    ordered.forEach((i) => { c[i.type]++; });
    return c;
  }, [ordered]);

  const toggle = useCallback((url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(url) ? next.delete(url) : next.add(url);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(visible.map((i) => i.url)));
  }, [visible]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const handleDragStart = (url: string) => (e: DragEvent) => {
    setDragging(url);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (url: string) => (e: DragEvent) => {
    e.preventDefault();
    if (!dragging || dragging === url) return;
    setOrder((prev) => {
      const next = [...prev];
      const from = next.indexOf(dragging);
      const to = next.indexOf(url);
      if (from < 0 || to < 0) return prev;
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  };
  const handleDragEnd = () => setDragging(null);

  const handleUseAsRefs = useCallback(async () => {
    if (selected.size === 0) return;
    setBusy('ref');
    try {
      await onUseAsReferences(Array.from(selected));
      toast.success(`${selected.size} ${selected.size === 1 ? 'referência adicionada' : 'referências adicionadas'}`);
      clearSelection();
    } catch {
      toast.error('Falha ao adicionar referências');
    } finally {
      setBusy(null);
    }
  }, [selected, onUseAsReferences, clearSelection]);

  const handleUseAsVariants = useCallback(async () => {
    if (selected.size === 0 || !onUseAsVariants) return;
    setBusy('var');
    try {
      await onUseAsVariants(Array.from(selected));
      toast.success(`${selected.size} ${selected.size === 1 ? 'variante criada' : 'variantes criadas'}`);
      clearSelection();
    } catch {
      toast.error('Falha ao criar variantes');
    } finally {
      setBusy(null);
    }
  }, [selected, onUseAsVariants, clearSelection]);

  if (sourceImages.length === 0) return null;

  const typeBadge = (t: AliImageType) =>
    t === 'main' ? { label: 'Principal', icon: <ImageIcon className="w-2.5 h-2.5" /> }
    : t === 'variant' ? { label: 'Variante', icon: <Palette className="w-2.5 h-2.5" /> }
    : { label: 'Detalhe', icon: <ZoomIn className="w-2.5 h-2.5" /> };

  return (
    <div className="glass-card p-3 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">
            📦 AliExpress
          </span>
          <span className="text-[10px] text-primary font-semibold">· {sourceImages.length}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
            aria-label="Fechar"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-1 flex-wrap">
        {([
          { id: 'all', label: 'Todas', n: counts.all },
          { id: 'main', label: 'Principais', n: counts.main },
          { id: 'variant', label: 'Variantes', n: counts.variant },
          { id: 'detail', label: 'Detalhes', n: counts.detail },
        ] as const).map((f) =>
          f.n === 0 && f.id !== 'all' ? null : (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition-all ${
                filter === f.id
                  ? 'bg-primary/15 border-primary text-primary'
                  : 'bg-card border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              {f.label} <span className="opacity-60">({f.n})</span>
            </button>
          ),
        )}
      </div>

      {/* Selection bar */}
      <div className="flex items-center justify-between text-[9px]">
        <span className="text-muted-foreground">
          {selected.size > 0 ? (
            <span className="text-primary font-semibold">{selected.size} selecionada{selected.size > 1 ? 's' : ''}</span>
          ) : (
            'Clique para selecionar'
          )}
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={selectAll}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            Tudo
          </button>
          <span className="text-border">·</span>
          <button
            onClick={clearSelection}
            disabled={selected.size === 0}
            className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-1 max-h-[280px] overflow-y-auto custom-scrollbar pr-0.5">
        {visible.map((img) => {
          const isSelected = selected.has(img.url);
          const badge = typeBadge(img.type);
          return (
            <div
              key={img.url}
              draggable
              onDragStart={handleDragStart(img.url)}
              onDragOver={handleDragOver(img.url)}
              onDragEnd={handleDragEnd}
              onClick={() => toggle(img.url)}
              title="Clique para selecionar · Arraste para reordenar"
              className={`group relative rounded-md overflow-hidden border cursor-pointer transition-all aspect-square ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/40 scale-[0.98]'
                  : 'border-border/40 hover:border-primary/60 hover:scale-[1.02]'
              } ${dragging === img.url ? 'opacity-40' : ''}`}
            >
              <img
                src={img.url}
                alt={badge.label}
                loading="lazy"
                className="w-full h-full object-contain bg-black/5"
                onError={(e) => {
                  (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                }}
              />
              {/* Selected overlay */}
              {isSelected && (
                <div className="absolute inset-0 bg-primary/10 flex items-start justify-end p-1">
                  <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                  </div>
                </div>
              )}
              {/* Type badge */}
              <span className="absolute bottom-0.5 left-0.5 flex items-center gap-0.5 text-[7px] px-1 py-[1px] rounded bg-black/65 text-white/90 leading-none backdrop-blur-sm">
                {badge.icon} {badge.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-1 pt-1 border-t border-border/40">
        <button
          onClick={handleUseAsRefs}
          disabled={selected.size === 0 || busy !== null}
          className="flex items-center justify-center gap-1 h-7 rounded-md text-[10px] font-semibold transition-all bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground disabled:cursor-not-allowed"
        >
          <Sparkles className="w-3 h-3" />
          {busy === 'ref' ? 'Carregando...' : 'Usar como referência'}
          {selected.size > 0 && busy !== 'ref' && <span className="opacity-70">({selected.size})</span>}
        </button>
        {onUseAsVariants && (
          <button
            onClick={handleUseAsVariants}
            disabled={selected.size === 0 || busy !== null}
            className="flex items-center justify-center gap-1 h-7 rounded-md text-[10px] font-semibold transition-all border border-border bg-card text-foreground hover:border-primary/60 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Palette className="w-3 h-3" />
            {busy === 'var' ? 'Criando...' : 'Usar como variante'}
            {selected.size > 0 && busy !== 'var' && <span className="opacity-70">({selected.size})</span>}
          </button>
        )}
      </div>

      <p className="text-[8px] text-muted-foreground/70 leading-tight">
        Selecione múltiplas imagens · arraste para reordenar
      </p>
    </div>
  );
}
