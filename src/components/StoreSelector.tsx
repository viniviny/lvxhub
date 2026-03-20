import { useState, useRef, useEffect } from 'react';
import { ShopifyStore } from '@/hooks/useStoreManager';
import { ChevronDown, Plus } from 'lucide-react';

interface StoreSelectorProps {
  stores: ShopifyStore[];
  activeStoreId: string | null;
  onSelectStore: (id: string) => void;
  onAddStore: () => void;
}

function truncateDomain(domain: string, max = 22): string {
  if (domain.length <= max) return domain;
  return domain.slice(0, max - 3) + '...';
}

export function StoreSelector({ stores, activeStoreId, onSelectStore, onAddStore }: StoreSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = stores.find(s => s.id === activeStoreId) || stores.find(s => s.connected) || stores[0];

  // Close on outside click
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
    <div ref={ref} className="flex flex-col gap-2">
      {/* Store card trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 transition-all duration-150
          bg-[hsl(var(--sidebar-card))] border border-[hsl(var(--sidebar-card-border))]
          hover:border-[hsl(var(--sidebar-card-hover))]"
      >
        {/* Flag */}
        <span className="text-xl leading-none flex-shrink-0">
          {mc?.countryFlag || '🏪'}
        </span>

        {/* Store info */}
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[13px] font-medium text-[hsl(210,29%,90%)] truncate">
            {mc?.countryName || mc?.marketName || 'Sem mercado'}
          </div>
          <div className="text-[11px] text-[hsl(var(--sidebar-foreground))] truncate">
            {truncateDomain(active?.domain || '')}
          </div>
        </div>

        {/* Right side: connected dot + chevron */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {active?.connected && (
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--success))] pulse-dot" />
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-[hsl(var(--sidebar-foreground))] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="rounded-lg border border-[hsl(var(--sidebar-card-border))] bg-[hsl(var(--sidebar-background))] shadow-[0_8px_24px_rgba(0,0,0,0.4)] overflow-hidden animate-fade-in"
        >
          {stores.map(store => {
            const smc = store.marketConfig;
            const isActive = store.id === (activeStoreId || active?.id);
            return (
              <button
                key={store.id}
                onClick={() => { onSelectStore(store.id); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-150
                  hover:bg-[hsl(var(--sidebar-primary)/0.08)]
                  ${isActive ? 'border-l-2 border-l-[hsl(var(--sidebar-primary))] bg-[hsl(var(--sidebar-primary)/0.06)]' : 'border-l-2 border-l-transparent'}
                `}
              >
                <span className="text-base leading-none flex-shrink-0">{smc?.countryFlag || '🏪'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-[hsl(210,29%,90%)] truncate">
                    {truncateDomain(smc?.marketName || store.domain)}
                  </div>
                  {smc && (
                    <span className="inline-flex text-[10px] font-medium px-1.5 py-px rounded bg-[hsl(var(--sidebar-primary)/0.1)] text-[hsl(var(--info))] mt-0.5">
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

          {/* Divider + add store */}
          <div className="border-t border-[hsl(var(--sidebar-card-border))]">
            <button
              onClick={() => { onAddStore(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-[hsl(var(--info))] hover:bg-[hsl(var(--sidebar-primary)/0.08)] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Conectar nova loja
            </button>
          </div>
        </div>
      )}

      {/* Add store ghost button */}
      <button
        onClick={onAddStore}
        className="w-full flex items-center justify-center gap-1.5 py-[7px] rounded-lg text-[11px] font-medium
          border border-dashed border-[hsl(var(--sidebar-card-border))] text-[hsl(var(--sidebar-foreground))]
          hover:border-[hsl(var(--sidebar-card-hover))] hover:text-[hsl(var(--info))] transition-all duration-150 bg-transparent"
      >
        <Plus className="w-3 h-3" />
        Adicionar loja
      </button>
    </div>
  );
}
