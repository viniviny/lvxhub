import { Package, ClipboardList, Store, Settings, Layers, BookOpen, ImageIcon } from 'lucide-react';

export type DashboardView = 'publish' | 'history' | 'library' | 'prompts' | 'stores' | 'regions' | 'settings';

interface DashboardSidebarProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

const navItems: { id: DashboardView; label: string; icon: React.ReactNode }[] = [
  { id: 'publish', label: 'Publicar Produto', icon: <Package className="w-4 h-4" /> },
  { id: 'history', label: 'Histórico', icon: <ClipboardList className="w-4 h-4" /> },
  { id: 'library', label: 'Biblioteca', icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'prompts', label: 'Meus Prompts', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'stores', label: 'Lojas', icon: <Store className="w-4 h-4" /> },
  { id: 'regions', label: 'Grupos de Região', icon: <Layers className="w-4 h-4" /> },
  { id: 'settings', label: 'Configurações', icon: <Settings className="w-4 h-4" /> },
];

export function DashboardSidebar({
  currentView, onViewChange,
}: DashboardSidebarProps) {
  return (
    <aside className="w-[200px] flex-shrink-0 border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] min-h-[calc(100vh-52px)] hidden lg:flex flex-col">
      {/* Navigation */}
      <nav className="flex-1 px-3 pt-5">
        <span className="text-[10px] font-semibold text-[hsl(var(--sidebar-foreground))] uppercase tracking-[0.08em] mb-2 block px-1">
          menu
        </span>
        <ul className="space-y-0.5">
          {navItems.map(item => {
            const isActive = currentView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 h-[36px] rounded-lg text-[13px] font-medium transition-all duration-150 ${
                    isActive
                      ? 'nav-active-border bg-[hsl(var(--sidebar-primary)/0.15)] text-[hsl(210,29%,90%)]'
                      : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(0,0%,100%,0.04)] hover:text-[hsl(210,20%,82%)]'
                  }`}
                >
                  <span className={isActive ? 'text-[hsl(var(--info))]' : ''}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
