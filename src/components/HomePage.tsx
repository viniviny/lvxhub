import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Package, Store, TrendingUp, Clock, Plus, ClipboardList, Zap, ArrowRight, CheckCircle2, Circle, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpotlightCard } from '@/components/SpotlightCard';

interface HomeMetrics {
  totalProducts: number;
  connectedStores: number;
  weeklyPublications: number;
  totalPrompts: number;
  recentProducts: { title: string; store_domain: string; created_at: string }[];
}

interface HomePageProps {
  onNavigate: (view: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<HomeMetrics>({
    totalProducts: 0,
    connectedStores: 0,
    weeklyPublications: 0,
    totalPrompts: 0,
    recentProducts: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const [productsRes, storesRes, weeklyRes, recentRes, promptsRes] = await Promise.all([
          supabase.from('published_products').select('id', { count: 'exact', head: true }),
          supabase.from('shopify_connections').select('id', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('published_products').select('id', { count: 'exact', head: true }).gte('created_at', oneWeekAgo.toISOString()),
          supabase.from('published_products').select('title, store_domain, created_at').order('created_at', { ascending: false }).limit(5),
          supabase.from('user_prompts').select('id', { count: 'exact', head: true }),
        ]);

        setMetrics({
          totalProducts: productsRes.count || 0,
          connectedStores: storesRes.count || 0,
          weeklyPublications: weeklyRes.count || 0,
          totalPrompts: promptsRes.count || 0,
          recentProducts: (recentRes.data as any[]) || [],
        });
      } catch (err) {
        console.error('Error fetching metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [user]);

  const metricCards = [
    {
      label: 'Produtos publicados',
      value: metrics.totalProducts,
      icon: Package,
      color: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-primary/20',
    },
    {
      label: 'Lojas conectadas',
      value: metrics.connectedStores,
      icon: Store,
      color: 'text-[hsl(var(--success))]',
      bg: 'bg-[hsl(var(--success)/0.1)]',
      border: 'border-[hsl(var(--success)/0.2)]',
    },
    {
      label: 'Publicações esta semana',
      value: metrics.weeklyPublications,
      icon: TrendingUp,
      color: 'text-[hsl(var(--info))]',
      bg: 'bg-[hsl(var(--info)/0.1)]',
      border: 'border-[hsl(var(--info)/0.2)]',
    },
  ];

  const formatRelativeDate = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto py-6 px-2">
      {/* Greeting */}
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold text-foreground shimmer-text">Visão geral</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Resumo da sua operação</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {metricCards.map((card) => (
          <SpotlightCard
            key={card.label}
            className={`frost lift noise p-4 flex items-center gap-3 rounded-xl border ${card.border}`}
          >
            <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center flex-shrink-0`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              {loading ? (
                <div className="h-6 w-12 skeleton-shimmer rounded" />
              ) : (
                <span className="text-2xl font-display font-bold text-foreground">{card.value}</span>
              )}
              <p className="text-[11px] text-muted-foreground font-medium leading-tight">{card.label}</p>
            </div>
          </SpotlightCard>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <SpotlightCard
          as="button"
          onClick={() => onNavigate('publish')}
          className="frost lift press noise p-4 flex items-center gap-3 group text-left rounded-xl border border-border w-full"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/25 transition-colors">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-foreground block">Novo Produto</span>
            <span className="text-[11px] text-muted-foreground">Criar e publicar um produto</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </SpotlightCard>

        <SpotlightCard
          as="button"
          onClick={() => onNavigate('history')}
          className="frost lift press noise p-4 flex items-center gap-3 group text-left rounded-xl border border-border w-full"
        >
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--info)/0.1)] flex items-center justify-center flex-shrink-0 group-hover:bg-[hsl(var(--info)/0.2)] transition-colors">
            <ClipboardList className="w-5 h-5 text-[hsl(var(--info))]" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-foreground block">Ver Histórico</span>
            <span className="text-[11px] text-muted-foreground">Produtos publicados e edições</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-[hsl(var(--info))] transition-colors" />
        </SpotlightCard>
      </div>

      {/* Recent Products */}
      {!loading && metrics.recentProducts.length > 0 && (
        <SpotlightCard className="frost lift noise p-4 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Publicações recentes
            </h3>
            <Button variant="ghost" size="sm" className="text-[11px] h-7" onClick={() => onNavigate('history')}>
              Ver tudo
            </Button>
          </div>
          <div className="space-y-1.5">
            {metrics.recentProducts.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-secondary/40 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <Zap className="w-3 h-3 text-primary flex-shrink-0" />
                  <span className="text-[13px] text-foreground truncate">{p.title}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">{p.store_domain}</span>
                  <span className="text-[10px] text-muted-foreground">{formatRelativeDate(p.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Onboarding checklist for new users */}
      {!loading && metrics.connectedStores === 0 && metrics.totalProducts === 0 && (
        <div className="gradient-border frost noise p-6 max-w-lg mx-auto rounded-xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-foreground shimmer-text">Primeiros passos</h3>
              <p className="text-[11px] text-muted-foreground">Complete os passos abaixo para começar</p>
            </div>
          </div>

          <div className="space-y-1">
            {/* Step 1: Connect store */}
            <button
              onClick={() => onNavigate('stores')}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/60 transition-colors text-left group"
            >
              {metrics.connectedStores > 0 ? (
                <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))] flex-shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-primary">1</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium block ${metrics.connectedStores > 0 ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  Conectar sua loja
                </span>
                <span className="text-[11px] text-muted-foreground">Vincule sua loja Shopify para publicar produtos</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </button>

            {/* Step 2: Create prompt */}
            <button
              onClick={() => onNavigate('prompts')}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/60 transition-colors text-left group"
            >
              {metrics.totalPrompts > 0 ? (
                <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))] flex-shrink-0" />
              ) : (
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${metrics.connectedStores > 0 ? 'border-primary' : 'border-border'}`}>
                  <span className={`text-[10px] font-bold ${metrics.connectedStores > 0 ? 'text-primary' : 'text-muted-foreground'}`}>2</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium block ${metrics.totalPrompts > 0 ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  Criar seu primeiro prompt
                </span>
                <span className="text-[11px] text-muted-foreground">Configure prompts de imagem para gerar fotos de produtos</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </button>

            {/* Step 3: Publish product */}
            <button
              onClick={() => onNavigate('publish')}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/60 transition-colors text-left group"
            >
              {metrics.totalProducts > 0 ? (
                <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))] flex-shrink-0" />
              ) : (
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${metrics.totalPrompts > 0 ? 'border-primary' : 'border-border'}`}>
                  <span className={`text-[10px] font-bold ${metrics.totalPrompts > 0 ? 'text-primary' : 'text-muted-foreground'}`}>3</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium block ${metrics.totalProducts > 0 ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  Publicar seu primeiro produto
                </span>
                <span className="text-[11px] text-muted-foreground">Gere imagens e publique direto no Shopify</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </button>
          </div>

          {/* Progress indicator */}
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-muted-foreground">Progresso</span>
              <span className="text-[10px] font-semibold text-foreground">
                {[metrics.connectedStores > 0, metrics.totalPrompts > 0, metrics.totalProducts > 0].filter(Boolean).length}/3
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${([metrics.connectedStores > 0, metrics.totalPrompts > 0, metrics.totalProducts > 0].filter(Boolean).length / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
