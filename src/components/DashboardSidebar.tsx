import { Home, Package, ClipboardList, Store, Settings, Layers, BookOpen, ImageIcon, Download, Wand2, Link2 } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';

export type DashboardView = 'home' | 'publish' | 'history' | 'library' | 'prompts' | 'stores' | 'regions' | 'settings' | 'imported' | 'image-generator' | 'import-url';

interface DashboardSidebarProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

type NavItem = { id: DashboardView; label: string; icon: React.ReactNode };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { id: 'home',      label: 'Dashboard',          icon: <Home className="w-4 h-4" /> },
      { id: 'publish',   label: 'Criar Produto',      icon: <Package className="w-4 h-4" /> },
      { id: 'import-url',label: 'Importar via URL',   icon: <Link2 className="w-4 h-4" /> },
      { id: 'imported',  label: 'Produtos Importados',icon: <Download className="w-4 h-4" /> },
      { id: 'history',   label: 'Histórico',          icon: <ClipboardList className="w-4 h-4" /> },
    ],
  },
  {
    label: 'AI Studio',
    items: [
      { id: 'image-generator', label: 'Gerador de Imagem', icon: <Wand2 className="w-4 h-4" /> },
      { id: 'library',         label: 'Biblioteca',        icon: <ImageIcon className="w-4 h-4" /> },
      { id: 'prompts',         label: 'Prompts',           icon: <BookOpen className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Operação',
    items: [
      { id: 'stores',   label: 'Lojas Shopify',    icon: <Store className="w-4 h-4" /> },
      { id: 'regions',  label: 'Regiões / Mercados', icon: <Layers className="w-4 h-4" /> },
      { id: 'settings', label: 'Configurações',    icon: <Settings className="w-4 h-4" /> },
    ],
  },
];

export function DashboardSidebar({ currentView, onViewChange }: DashboardSidebarProps) {
  return (
    <aside className="w-[230px] flex-shrink-0 border-r border-border bg-popover/60 backdrop-blur-md min-h-[calc(100vh-52px)] hidden lg:flex flex-col">
      <nav className="flex-1 px-3 pt-5 pb-6 overflow-y-auto custom-scrollbar">
        <LayoutGroup id="sidebar-nav">
          {navGroups.map((group, gi) => (
            <div key={group.label} className={gi === 0 ? '' : 'mt-6'}>
              <span className="label-mono mb-2 block px-3">{group.label}</span>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = currentView === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => onViewChange(item.id)}
                        className={`group relative w-full flex items-center gap-2.5 px-3 h-[36px] rounded-lg text-[13px] font-medium overflow-hidden transition-colors duration-200 ${
                          isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {isActive && (
                          <>
                            <motion.span
                              layoutId="sidebar-active-bg"
                              className="absolute inset-0 rounded-lg pointer-events-none"
                              style={{
                                background: 'linear-gradient(90deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.02) 70%, transparent)',
                              }}
                              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                            />
                            <motion.span
                              layoutId="sidebar-active-bar"
                              className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary pointer-events-none"
                              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                            />
                          </>
                        )}

                        {!isActive && (
                          <span className="absolute inset-0 rounded-lg bg-secondary/0 group-hover:bg-secondary/60 transition-colors duration-200 pointer-events-none" />
                        )}

                        <span
                          className={`relative z-10 flex items-center gap-2.5 transition-transform duration-300 ease-out-expo ${
                            isActive ? '' : 'group-hover:translate-x-1'
                          }`}
                        >
                          <span className={isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground transition-colors'}>
                            {item.icon}
                          </span>
                          <span className={isActive ? 'font-semibold' : ''}>{item.label}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </LayoutGroup>
      </nav>
    </aside>
  );
}
