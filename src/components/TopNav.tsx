import { motion, LayoutGroup } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

export type TopNavView = 'home' | 'create' | 'products' | 'stores';

interface TopNavProps {
  currentView: TopNavView;
  onViewChange: (view: TopNavView) => void;
}

const navItems: { id: TopNavView; label: string }[] = [
  { id: 'home',     label: 'Início' },
  { id: 'create',   label: 'Criar' },
  { id: 'products', label: 'Produtos' },
  { id: 'stores',   label: 'Lojas' },
];

export function TopNav({ currentView, onViewChange }: TopNavProps) {
  const { profile, user } = useAuth();
  const userName = profile?.display_name || profile?.email || user?.email || '';
  const userInitials = userName
    ? userName.split(/[\s@]/)[0].slice(0, 2).toUpperCase()
    : '';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-popover/70 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-[52px] flex items-center justify-between">
        {/* Left: brand + nav */}
        <div className="flex items-center gap-6">
          <span className="font-display text-[15px] font-semibold tracking-tight text-foreground">
            Publify
          </span>
          <LayoutGroup id="topnav">
            <nav className="flex items-center gap-0.5">
              {navItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={`relative px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                      isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="topnav-active"
                        className="absolute inset-0 rounded-md bg-secondary/70 pointer-events-none"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </LayoutGroup>
        </div>

        {/* Right: shortcut hint + avatar */}
        <div className="flex items-center gap-3">
          <kbd className="hidden md:inline-flex items-center px-2 py-1 rounded-md bg-secondary/60 text-[11px] text-muted-foreground font-mono">
            ⌘K busca
          </kbd>
          {userInitials && (
            <div
              className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[11px] font-medium"
              title={userName}
            >
              {userInitials}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
