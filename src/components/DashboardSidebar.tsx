import type { ReactNode } from 'react';
import { Home, Plus, Package, Store, Settings, ChevronDown } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useStoreContext } from '@/hooks/useStoreContext';

// Mantém DashboardView pra compatibilidade — todas as views internas continuam funcionando
export type DashboardView =
  | 'home' | 'publish' | 'history' | 'library' | 'prompts'
  | 'stores' | 'regions' | 'settings' | 'imported'
  | 'image-generator' | 'import-url';

// Nova abstração: 5 seções top-level visíveis na sidebar
export type SidebarSection = 'home' | 'create' | 'products' | 'stores' | 'settings';

interface DashboardSidebarProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

// Mapeia view atual → seção ativa na sidebar
export function viewToSection(view: DashboardView): SidebarSection {
  switch (view) {
    case 'home':            return 'home';
    case 'publish':
    case 'import-url':      return 'create';
    case 'imported':
    case 'history':
    case 'library':
    case 'image-generator':
    case 'prompts':         return 'products';
    case 'stores':
    case 'regions':         return 'stores';
    case 'settings':        return 'settings';
  }
}

// Clique numa seção → abre a view default dela (sem trocar se já estamos lá)
function sectionToView(section: SidebarSection, currentView: DashboardView): DashboardView {
  if (viewToSection(currentView) === section) return currentView;
  switch (section) {
    case 'home':     return 'home';
    case 'create':   return 'publish';
    case 'products': return 'history';
    case 'stores':   return 'stores';
    case 'settings': return 'settings';
  }
}

const sections: { id: SidebarSection; label: string; icon: ReactNode }[] = [
  { id: 'home',     label: 'Início',   icon: <Home     className="w-4 h-4" /> },
  { id: 'create',   label: 'Criar',    icon: <Plus     className="w-4 h-4" /> },
  { id: 'products', label: 'Produtos', icon: <Package  className="w-4 h-4" /> },
  { id: 'stores',   label: 'Lojas',    icon: <Store    className="w-4 h-4" /> },
  { id: 'settings', label: 'Ajustes',  icon: <Settings className="w-4 h-4" /> },
];

export function DashboardSidebar({ currentView, onViewChange }: DashboardSidebarProps) {
  const { profile } = useAuth();
  const { activeStore } = useStoreContext();
  const activeSection = viewToSection(currentView);

  const userName = profile?.display_name || profile?.email || '';
  const userInitials = userName
    ? userName.split(/[\s@]/)[0].slice(0, 2).toUpperCase()
    : '';

  return (
    <aside className="w-[200px] flex-shrink-0 border-r border-border bg-popover/60 backdrop-blur-md min-h-[calc(100vh-52px)] hidden lg:flex flex-col">
      {/* Nav */}
      <nav className="flex-1 px-3 pt-5 pb-6 overflow-y-auto custom-scrollbar">
        <LayoutGroup id="sidebar-nav">
          <ul className="space-y-0.5">
            {sections.map((s) => {
              const isActive = activeSection === s.id;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => onViewChange(sectionToView(s.id, currentView))}
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
                        {s.icon}
                      </span>
                      <span className={isActive ? 'font-semibold' : ''}>{s.label}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </LayoutGroup>
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2.5 flex flex-col gap-2">
        {/* Loja ativa */}
        {activeStore && (
          <button
            onClick={() => onViewChange('stores')}
            className="text-left px-2.5 py-2 rounded-md bg-secondary/40 hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Ativa</span>
            </div>
            <div className="text-[11px] font-medium truncate">
              {activeStore.domain}
            </div>
          </button>
        )}

        {/* Perfil */}
        {userInitials && (
          <button
            onClick={() => onViewChange('settings')}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary transition-colors"
            title={userName}
          >
            <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-medium flex-shrink-0">
              {userInitials}
            </div>
            <span className="flex-1 text-left text-[12px] font-medium truncate">
              {userName.split(/[\s@]/)[0]}
            </span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
      </div>
    </aside>
  );
}
