import { useState, useRef, useEffect } from 'react';
import { ShopifyStore } from '@/hooks/useStoreManager';
import { ChevronDown, Plus } from 'lucide-react';

interface StoreSelectorProps {
  stores: ShopifyStore[];
  activeStoreId: string | null;
  onSelectStore: (id: string) => void;
  onAddStore: () => void;
}

function truncateDomain(domain: string, max = 18): string {
  if (domain.length <= max) return domain;
  return domain.slice(0, max - 3) + '...';
}

export function StoreSelector({ stores, activeStoreId, onSelectStore, onAddStore }: StoreSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = stores.find(s => s.id === activeStoreId) || stores.find(s => s.connected) || stores[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (stores.length === 0) return null;

  const mc = active?.marketConfig;

  return (
    <div ref={ref} className="relative">
      {/* Compact trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-all duration-150
          bg-secondary/50 border border-border hover:border-[hsl(var(--info)/0.4)] hover:bg-secondary"
      >
        <span className="text-sm leading-none flex-shrink-0">
          {mc?.countryFlag || '🏪'}
        </span>
        <span className="text-[12px] font-medium text-muted-foreground truncate max-w-[120px]">
          {truncateDomain(active?.domain || '')}
        </span>
        {active?.connected && (
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))] flex-shrink-0" />
        )}
        <ChevronDown
          className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1 w-[220px] rounded-lg border border-border bg-[hsl(var(--sidebar-background))] shadow-[0_8px_24px_rgba(0,0,0,0.4)] overflow-hidden animate-fade-in z-50">
          {stores.map(store => {
            const smc = store.marketConfig;
            const isActive = store.id === (activeStoreId || active?.id);
            return (
              <button
                key={store.id}
                onClick={() => { onSelectStore(store.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors duration-150
                  hover:bg-[hsl(var(--sidebar-primary)/0.08)]
                  ${isActive ? 'bg-[hsl(var(--sidebar-primary)/0.06)]' : ''}
                `}
              >
                <span className="text-sm leading-none flex-shrink-0">{smc?.countryFlag || '🏪'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-foreground/90 truncate">
                    {truncateDomain(smc?.marketName || store.domain, 24)}
                  </div>
                  {smc && (
                    <span className="text-[10px] text-muted-foreground">
                      {smc.currency} · {smc.language}
                    </span>
                  )}
                </div>
                {store.connected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))] flex-shrink-0" />
                )}
              </button>
            );
          })}

          <div className="border-t border-border">
            <button
              onClick={() => { onAddStore(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-[hsl(var(--info))] hover:bg-[hsl(var(--sidebar-primary)/0.08)] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar loja
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
