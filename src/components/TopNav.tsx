import type { ReactNode } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { Zap } from 'lucide-react';

export type TopNavView = 'home' | 'create' | 'products' | 'stores';

interface TopNavProps {
  currentView: TopNavView;
  onViewChange: (view: TopNavView) => void;
  rightSlot?: ReactNode;
}

const navItems: { id: TopNavView; label: string }[] = [
  { id: 'home',     label: 'Início' },
  { id: 'create',   label: 'Criar' },
  { id: 'products', label: 'Produtos' },
  { id: 'stores',   label: 'Lojas' },
];

export function TopNav({ currentView, onViewChange, rightSlot }: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-popover/70 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-[52px] flex items-center justify-between">
        {/* Left: brand + nav */}
        <div className="flex items-center gap-6">
          <h1 className="font-display text-[15px] font-semibold tracking-tight text-foreground flex items-center gap-1.5">
            <Zap className="w-4 h-4" />Publify
          </h1>
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

        {/* Right slot: status, store selector, user menu, etc */}
        <div className="flex items-center gap-2">{rightSlot}</div>
      </div>
    </header>
  );
}
