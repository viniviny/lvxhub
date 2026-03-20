import { ShopifyStore } from '@/hooks/useStoreManager';
import { StoreSelector } from '@/components/StoreSelector';
import { Package, ClipboardList, Store, Settings, Plus } from 'lucide-react';

export type DashboardView = 'publish' | 'history' | 'stores' | 'settings';

interface DashboardSidebarProps {
  stores: ShopifyStore[];
  activeStoreId: string | null;
  onSelectStore: (id: string) => void;
  onAddStore: () => void;
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

const navItems: { id: DashboardView; label: string; icon: React.ReactNode }[] = [
  { id: 'publish', label: 'Publicar Produto', icon: <Package className="w-4 h-4" /> },
  { id: 'history', label: 'Histórico', icon: <ClipboardList className="w-4 h-4" /> },
  { id: 'stores', label: 'Lojas', icon: <Store className="w-4 h-4" /> },
  { id: 'settings', label: 'Configurações', icon: <Settings className="w-4 h-4" /> },
];

export function DashboardSidebar({
  stores, activeStoreId, onSelectStore, onAddStore,
  currentView, onViewChange,
}: DashboardSidebarProps) {
  return (
    <aside className="w-64 flex-shrink-0 border-r border-border/50 bg-card/30 min-h-[calc(100vh-65px)] hidden lg:flex flex-col">
      {/* Store selector */}
      <div className="p-4 border-b border-border/50">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          Loja ativa
        </label>
        <StoreSelector
          stores={stores}
          activeStoreId={activeStoreId}
          onSelectStore={onSelectStore}
          onAddStore={onAddStore}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {navItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  currentView === item.id
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Add store shortcut */}
      <div className="p-4 border-t border-border/50">
        <button
          onClick={onAddStore}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
        >
          <Plus className="w-4 h-4" />
          Adicionar loja
        </button>
      </div>
    </aside>
  );
}
