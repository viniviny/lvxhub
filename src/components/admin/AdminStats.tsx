import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, Store, Package, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Stats {
  totalUsers: number;
  totalStores: number;
  productsToday: number;
  productsMonth: number;
}

export function AdminStats() {
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalStores: 0, productsToday: 0, productsMonth: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [usersRes, storesRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('shopify_connections').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalStores: storesRes.count || 0,
        productsToday: 0,
        productsMonth: 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const cards = [
    { label: 'Total de usuários', value: stats.totalUsers, icon: <Users className="w-5 h-5" />, color: 'text-primary' },
    { label: 'Lojas conectadas', value: stats.totalStores, icon: <Store className="w-5 h-5" />, color: 'text-success' },
    { label: 'Produtos hoje', value: stats.productsToday, icon: <Package className="w-5 h-5" />, color: 'text-accent' },
    { label: 'Produtos este mês', value: stats.productsMonth, icon: <TrendingUp className="w-5 h-5" />, color: 'text-primary' },
  ];

  if (loading) {
    return (
      <div className="animate-fade-in">
        <Skeleton className="h-8 w-40 mb-6 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-6 space-y-4">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-9 w-16 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h2 className="font-display text-2xl font-bold text-foreground mb-6">Estatísticas</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <span className={`${card.color}`}>{card.icon}</span>
            </div>
            <p className="text-3xl font-display font-bold text-foreground">{card.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}