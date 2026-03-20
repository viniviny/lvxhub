import { ShopifyStore } from '@/hooks/useStoreManager';
import { StoreSelector } from '@/components/StoreSelector';
import { Badge } from '@/components/ui/badge';
import { Package, ClipboardList, Store, Settings, Plus, Layers, Globe } from 'lucide-react';

export type DashboardView = 'publish' | 'history' | 'stores' | 'regions' | 'settings';

interface DashboardSidebarProps {
  stores: ShopifyStore[];
  activeStoreId: string | null;
  onSelectStore: (id: string) => void;
  onAddStore: () => void;
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

const navItems: { id: DashboardView; label: string; icon: React.ReactNode }[] = [
  { id: 'publish', label: 'Publicar Produto', icon: <Package className="w-[18px] h-[18px]" /> },
  { id: 'history', label: 'Histórico', icon: <ClipboardList className="w-[18px] h-[18px]" /> },
  { id: 'stores', label: 'Lojas', icon: <Store className="w-[18px] h-[18px]" /> },
  { id: 'regions', label: 'Grupos de Região', icon: <Layers className="w-[18px] h-[18px]" /> },
  { id: 'settings', label: 'Configurações', icon: <Settings className="w-[18px] h-[18px]" /> },
];

export function DashboardSidebar({
  stores, activeStoreId, onSelectStore, onAddStore,
  currentView, onViewChange,
}: DashboardSidebarProps) {
  return (
    <aside className="w-[260px] flex-shrink-0 border-r border-border bg-sidebar min-h-[calc(100vh-57px)] hidden lg:flex flex-col">
      {/* Store selector */}
      <div className="px-4 pt-5 pb-4 border-b border-border">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5 block">
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
      <nav className="flex-1 px-3 pt-3">
        <ul className="space-y-0.5">
          {navItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${
                  currentView === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent'
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
      <div className="px-3 pb-4 pt-2 border-t border-border">
        <button
          onClick={onAddStore}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar loja
        </button>
      </div>
    </aside>
  );
}
