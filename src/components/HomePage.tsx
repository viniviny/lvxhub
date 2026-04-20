import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Package, Store, TrendingUp, Clock, Plus, ClipboardList, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpotlightCard } from '@/components/SpotlightCard';
import { useCountUp } from '@/hooks/useCountUp';

interface RecentProduct {
  title: string;
  store_domain: string;
  created_at: string;
  image_url: string | null;
}

interface HomeMetrics {
  totalProducts: number;
  connectedStores: number;
  weeklyPublications: number;
  totalPrompts: number;
  recentProducts: RecentProduct[];
}

interface HomePageProps {
  onNavigate: (view: string) => void;
}

function MetricNumber({ value, delay }: { value: number; delay: number }) {
  const animated = useCountUp(value, 1200, delay);
  return <span className="editorial-number text-[42px] md:text-[48px] text-foreground">{animated}</span>;
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
          supabase.from('published_products').select('title, store_domain, created_at, image_url').order('created_at', { ascending: false }).limit(5),
          supabase.from('user_prompts').select('id', { count: 'exact', head: true }),
        ]);

        setMetrics({
          totalProducts: productsRes.count || 0,
          connectedStores: storesRes.count || 0,
          weeklyPublications: weeklyRes.count || 0,
          totalPrompts: promptsRes.count || 0,
          recentProducts: (recentRes.data as RecentProduct[]) || [],
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
      iconBg: 'bg-gradient-to-br from-primary/30 to-primary/10',
      iconColor: 'text-primary',
      glow: 'glow-shadow-primary',
      border: 'border-primary/20',
    },
    {
      label: 'Lojas conectadas',
      value: metrics.connectedStores,
      icon: Store,
      iconBg: 'bg-gradient-to-br from-[hsl(var(--success)/0.3)] to-[hsl(var(--success)/0.08)]',
      iconColor: 'text-[hsl(var(--success))]',
      glow: 'glow-shadow-success',
      border: 'border-[hsl(var(--success)/0.2)]',
    },
    {
      label: 'Esta semana',
      value: metrics.weeklyPublications,
      icon: TrendingUp,
      iconBg: 'bg-gradient-to-br from-[hsl(var(--info)/0.3)] to-[hsl(var(--info)/0.08)]',
      iconColor: 'text-[hsl(var(--info))]',
      glow: 'glow-shadow-info',
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

  const isNew = (dateStr: string) => Date.now() - new Date(dateStr).getTime() < 60 * 60 * 1000;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Greeting */}
      <div className="mb-8 animate-slide-up" style={{ animationDelay: '0ms' }}>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground tracking-tight">Visão geral</h2>
        <p className="text-sm text-muted-foreground mt-1.5">Resumo da sua operação</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {metricCards.map((card, i) => (
          <SpotlightCard
            key={card.label}
            className={`frost lift noise p-5 rounded-2xl border ${card.border} ${card.glow} animate-slide-up transition-shadow duration-300`}
          >
            <div style={{ animationDelay: `${100 + i * 80}ms` }} className="flex items-start justify-between mb-4">
              <div className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center shadow-sm`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} strokeWidth={2.2} />
              </div>
            </div>
            <div className="space-y-1">
              {loading ? (
                <div className="h-12 w-16 skeleton-shimmer rounded" />
              ) : (
                <MetricNumber value={card.value} delay={150 + i * 120} />
              )}
              <p className="label-mono">{card.label}</p>
            </div>
          </SpotlightCard>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <SpotlightCard
          as="button"
          onClick={() => onNavigate('publish')}
          className="frost lift press noise p-5 flex items-center gap-4 group text-left rounded-2xl border border-border w-full animate-slide-up glow-shadow-primary transition-shadow duration-300"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300 ease-out-expo">
            <Plus className="w-5 h-5 text-primary" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[15px] font-semibold text-foreground block">Novo Produto</span>
            <span className="text-xs text-muted-foreground">Criar e publicar um produto</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 ease-out-expo" />
        </SpotlightCard>

        <SpotlightCard
          as="button"
          onClick={() => onNavigate('history')}
          className="frost lift press noise p-5 flex items-center gap-4 group text-left rounded-2xl border border-border w-full animate-slide-up glow-shadow-info transition-shadow duration-300"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--info)/0.3)] to-[hsl(var(--info)/0.08)] flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300 ease-out-expo">
            <ClipboardList className="w-5 h-5 text-[hsl(var(--info))]" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[15px] font-semibold text-foreground block">Ver Histórico</span>
            <span className="text-xs text-muted-foreground">Produtos publicados e edições</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-[hsl(var(--info))] group-hover:translate-x-1 transition-all duration-300 ease-out-expo" />
        </SpotlightCard>
      </div>

      {/* Recent Products */}
      {!loading && metrics.recentProducts.length > 0 && (
        <SpotlightCard className="frost noise p-5 rounded-2xl border border-border animate-slide-up" >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Publicações recentes
            </h3>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onNavigate('history')}>
              Ver tudo
            </Button>
          </div>
          <div>
            {metrics.recentProducts.map((p, i) => (
              <div
                key={i}
                className="group flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-secondary/50 hover:px-3 transition-all duration-200 ease-out-expo border-b border-border/40 last:border-0 animate-slide-up"
                style={{ animationDelay: `${600 + i * 50}ms` }}
              >
                {/* Thumbnail */}
                <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-secondary border border-border/60">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.title} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-4 h-4 text-muted-foreground/60" />
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{p.title}</span>
                    {isNew(p.created_at) && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[hsl(var(--success))] flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))] pulse-dot" />
                        novo
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground truncate block">{p.store_domain}</span>
                </div>
                {/* Time + action */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[11px] text-muted-foreground tabular-nums">{formatRelativeDate(p.created_at)}</span>
                  <span className="text-[11px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
                    Ver <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SpotlightCard>
      )}

      {/* Onboarding checklist for new users */}
      {!loading && metrics.connectedStores === 0 && metrics.totalProducts === 0 && (
        <SpotlightCard className="gradient-border frost noise p-6 max-w-lg mx-auto rounded-2xl animate-slide-up">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-primary" strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-foreground shimmer-text">Primeiros passos</h3>
              <p className="text-[11px] text-muted-foreground">Complete os passos abaixo para começar</p>
            </div>
          </div>

          <div className="space-y-1">
            {[
              { label: 'Conectar sua loja', desc: 'Vincule sua loja Shopify para publicar produtos', view: 'stores', done: metrics.connectedStores > 0, prevDone: true },
              { label: 'Criar seu primeiro prompt', desc: 'Configure prompts de imagem para gerar fotos', view: 'prompts', done: metrics.totalPrompts > 0, prevDone: metrics.connectedStores > 0 },
              { label: 'Publicar seu primeiro produto', desc: 'Gere imagens e publique direto no Shopify', view: 'publish', done: metrics.totalProducts > 0, prevDone: metrics.totalPrompts > 0 },
            ].map((step, idx) => (
              <button
                key={step.view}
                onClick={() => onNavigate(step.view)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/60 transition-colors text-left group"
              >
                {step.done ? (
                  <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))] flex-shrink-0" />
                ) : (
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${step.prevDone ? 'border-primary' : 'border-border'}`}>
                    <span className={`text-[10px] font-bold ${step.prevDone ? 'text-primary' : 'text-muted-foreground'}`}>{idx + 1}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium block ${step.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {step.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{step.desc}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
              </button>
            ))}
          </div>

          {/* Progress indicator */}
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="label-mono">Progresso</span>
              <span className="text-[10px] font-semibold text-foreground tabular-nums">
                {[metrics.connectedStores > 0, metrics.totalPrompts > 0, metrics.totalProducts > 0].filter(Boolean).length}/3
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-700 ease-out-expo"
                style={{ width: `${([metrics.connectedStores > 0, metrics.totalPrompts > 0, metrics.totalProducts > 0].filter(Boolean).length / 3) * 100}%` }}
              />
            </div>
          </div>
        </SpotlightCard>
      )}
    </div>
  );
}
