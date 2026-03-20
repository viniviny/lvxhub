import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserMenu } from '@/components/UserMenu';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminStats } from '@/components/admin/AdminStats';
import { Badge } from '@/components/ui/badge';
import { Zap, Users, Store, Package, BarChart3, Settings, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AdminView = 'users' | 'stores' | 'products' | 'stats' | 'settings';

const navItems: { id: AdminView; label: string; icon: React.ReactNode }[] = [
  { id: 'users', label: 'Usuários', icon: <Users className="w-4 h-4" /> },
  { id: 'stores', label: 'Lojas conectadas', icon: <Store className="w-4 h-4" /> },
  { id: 'products', label: 'Produtos publicados', icon: <Package className="w-4 h-4" /> },
  { id: 'stats', label: 'Estatísticas', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'settings', label: 'Configurações do app', icon: <Settings className="w-4 h-4" /> },
];

export default function Admin() {
  const [currentView, setCurrentView] = useState<AdminView>('users');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="w-full px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-xl font-bold gradient-text flex items-center gap-1.5">
              <Zap className="w-5 h-5 text-primary" />
              Publify
            </h1>
            <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] px-2 py-0.5 font-display font-medium tracking-wide uppercase">
              Admin
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> Voltar ao app
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-border/50 bg-card/30 min-h-[calc(100vh-65px)] hidden lg:flex flex-col">
          <nav className="flex-1 p-3 pt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-3">
              Administração
            </p>
            <ul className="space-y-1">
              {navItems.map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => setCurrentView(item.id)}
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
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-8">
            {currentView === 'users' && <AdminUsers />}
            {currentView === 'stats' && <AdminStats />}
            {currentView === 'stores' && (
              <div className="animate-fade-in">
                <h2 className="font-display text-2xl font-bold text-foreground mb-6">Lojas Conectadas</h2>
                <p className="text-muted-foreground">Em breve — visualização de todas as lojas conectadas por todos os usuários.</p>
              </div>
            )}
            {currentView === 'products' && (
              <div className="animate-fade-in">
                <h2 className="font-display text-2xl font-bold text-foreground mb-6">Produtos Publicados</h2>
                <p className="text-muted-foreground">Em breve — histórico global de produtos publicados.</p>
              </div>
            )}
            {currentView === 'settings' && (
              <div className="animate-fade-in">
                <h2 className="font-display text-2xl font-bold text-foreground mb-6">Configurações do App</h2>
                <p className="text-muted-foreground">Em breve — configurações globais da aplicação.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
