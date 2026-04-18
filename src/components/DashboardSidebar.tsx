import { Home, Package, ClipboardList, Store, Settings, Layers, BookOpen, ImageIcon, Download, Wand2 } from 'lucide-react';

export type DashboardView = 'home' | 'publish' | 'history' | 'library' | 'prompts' | 'stores' | 'regions' | 'settings' | 'imported' | 'image-generator';

interface DashboardSidebarProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

const navItems: { id: DashboardView; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Início', icon: <Home className="w-4 h-4" /> },
  { id: 'publish', label: 'Publicar Produto', icon: <Package className="w-4 h-4" /> },
  { id: 'image-generator', label: 'Image Generator', icon: <Wand2 className="w-4 h-4" /> },
  { id: 'imported', label: 'Importados', icon: <Download className="w-4 h-4" /> },
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
    <aside className="w-[200px] flex-shrink-0 border-r border-border bg-background min-h-[calc(100vh-52px)] hidden lg:flex flex-col">
      {/* Navigation */}
      <nav className="flex-1 px-3 pt-5">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-2 block px-1">
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
                      ? 'nav-active-border bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <span className={isActive ? 'text-foreground' : ''}>
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