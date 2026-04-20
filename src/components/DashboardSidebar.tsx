import { Home, Package, ClipboardList, Store, Settings, Layers, BookOpen, ImageIcon, Download, Wand2 } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';

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

export function DashboardSidebar({ currentView, onViewChange }: DashboardSidebarProps) {
  return (
    <aside className="w-[210px] flex-shrink-0 border-r border-border bg-background min-h-[calc(100vh-52px)] hidden lg:flex flex-col">
      <nav className="flex-1 px-3 pt-5">
        <span className="label-mono mb-3 block px-2">menu</span>

        <LayoutGroup id="sidebar-nav">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onViewChange(item.id)}
                    className={`group relative w-full flex items-center gap-2.5 px-3 h-[38px] rounded-lg text-[13px] font-medium overflow-hidden transition-colors duration-200 ${
                      isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {/* Active background gradient + indicator bar (shared layoutId) */}
                    {isActive && (
                      <>
                        <motion.span
                          layoutId="sidebar-active-bg"
                          className="absolute inset-0 rounded-lg pointer-events-none"
                          style={{
                            background: 'linear-gradient(90deg, hsl(var(--primary) / 0.10), hsl(var(--primary) / 0.02) 70%, transparent)',
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

                    {/* Inactive hover: subtle bg + magnetic translate */}
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
        </LayoutGroup>
      </nav>
    </aside>
  );
}
