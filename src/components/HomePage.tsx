import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Package, Clock, ArrowRight, CheckCircle2, Zap,
  Download, Sparkles, FileText, Ruler, ImageIcon, UserSquare2,
  Eraser, FileImage, UploadCloud, BookMarked, PlayCircle,
  Store, TrendingUp, AlertTriangle, Inbox, Rocket, Wand2,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpotlightCard } from '@/components/SpotlightCard';

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
  importedPending: number;
  readyToPublish: number;
  generatedImages: number;
  recentProducts: RecentProduct[];
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
    importedPending: 0,
    readyToPublish: 0,
    generatedImages: 0,
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

        const [productsRes, storesRes, weeklyRes, recentRes, promptsRes, importedRes, readyRes, imagesRes] = await Promise.all([
          supabase.from('published_products').select('id', { count: 'exact', head: true }),
          supabase.from('shopify_connections').select('id', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('published_products').select('id', { count: 'exact', head: true }).gte('created_at', oneWeekAgo.toISOString()),
          supabase.from('published_products').select('title, store_domain, created_at, image_url').order('created_at', { ascending: false }).limit(5),
          supabase.from('user_prompts').select('id', { count: 'exact', head: true }),
          supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
          supabase.from('projects').select('id', { count: 'exact', head: true }).in('status', ['ready', 'review']),
          supabase.from('image_library').select('id', { count: 'exact', head: true }),
        ]);

        setMetrics({
          totalProducts: productsRes.count || 0,
          connectedStores: storesRes.count || 0,
          weeklyPublications: weeklyRes.count || 0,
          totalPrompts: promptsRes.count || 0,
          importedPending: importedRes.count || 0,
          readyToPublish: readyRes.count || 0,
          generatedImages: imagesRes.count || 0,
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

  type Tool = {
    id: string;
    title: string;
    desc: string;
    icon: LucideIcon;
    badge: 'AI' | 'Novo' | 'Rápido' | 'Shopify' | 'Visual';
    view: string;
    accent?: 'primary' | 'violet' | 'success' | 'warning';
  };

  const tools: Tool[] = [
    { id: 'import',      title: 'Importar Produto',     desc: 'Importe via link de fornecedor ou rascunhos Shopify.',                  icon: Download,     badge: 'Rápido',  view: 'import-url',       accent: 'primary' },
    { id: 'naming',      title: 'Naming Premium',       desc: 'Gere nomes elegantes baseados em tipo, material e estilo.',             icon: Sparkles,     badge: 'AI',      view: 'publish',          accent: 'violet'  },
    { id: 'seo',         title: 'Descrição SEO',        desc: 'Descrições premium com estrutura SEO e tom de marca.',                  icon: FileText,     badge: 'AI',      view: 'publish',          accent: 'violet'  },
    { id: 'specs',       title: 'Especificações',       desc: 'Materiais, tamanhos, fit, cuidados e dados do fornecedor.',             icon: Ruler,        badge: 'AI',      view: 'publish',          accent: 'primary' },
    { id: 'image',       title: 'Image Studio',         desc: 'Imagens premium com fundo limpo e formatos para ecommerce.',            icon: ImageIcon,    badge: 'Visual',  view: 'image-generator',  accent: 'primary' },
    { id: 'model',       title: 'Model Photoshoot',     desc: 'Coloque produtos em modelos realistas preservando detalhes.',           icon: UserSquare2,  badge: 'Novo',    view: 'image-generator',  accent: 'violet'  },
    { id: 'bg',          title: 'Background Cleaner',   desc: 'Remova ou substitua fundos por cenas premium de ecommerce.',            icon: Eraser,       badge: 'Visual',  view: 'image-generator',  accent: 'primary' },
    { id: 'webp',        title: 'WebP Optimizer',       desc: 'Converta e comprima imagens para um Shopify mais rápido.',              icon: FileImage,    badge: 'Rápido',  view: 'publish',          accent: 'success' },
    { id: 'publisher',   title: 'Shopify Publisher',    desc: 'Revise, otimize e publique direto na sua loja Shopify.',                icon: UploadCloud,  badge: 'Shopify', view: 'publish',          accent: 'primary' },
    { id: 'prompts',     title: 'Prompt Library',       desc: 'Salve e reutilize prompts de títulos, descrições e imagens.',           icon: BookMarked,   badge: 'AI',      view: 'prompts',          accent: 'violet'  },
  ];

  const accentMap = {
    primary: { ring: 'ring-primary/30', glow: 'group-hover:shadow-[0_0_28px_-6px_hsl(var(--primary)/0.55)]', icon: 'text-primary',                   bg: 'bg-primary/10 border-primary/20' },
    violet:  { ring: 'ring-accent/30',  glow: 'group-hover:shadow-[0_0_28px_-6px_hsl(var(--accent)/0.55)]',  icon: 'text-accent',                    bg: 'bg-accent/10 border-accent/20' },
    success: { ring: 'ring-[hsl(var(--success)/0.3)]', glow: 'group-hover:shadow-[0_0_28px_-6px_hsl(var(--success)/0.5)]', icon: 'text-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success)/0.1)] border-[hsl(var(--success)/0.2)]' },
    warning: { ring: 'ring-[hsl(var(--warning)/0.3)]', glow: 'group-hover:shadow-[0_0_28px_-6px_hsl(var(--warning)/0.5)]', icon: 'text-[hsl(var(--warning))]', bg: 'bg-[hsl(var(--warning)/0.1)] border-[hsl(var(--warning)/0.2)]' },
  } as const;

  const badgeStyle = (b: Tool['badge']) => {
    switch (b) {
      case 'AI':      return 'bg-accent/15 text-accent border-accent/25';
      case 'Novo':    return 'bg-primary/15 text-primary border-primary/25';
      case 'Rápido':  return 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.25)]';
      case 'Shopify': return 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.25)]';
      case 'Visual':  return 'bg-accent/15 text-accent border-accent/25';
    }
  };

  const workflow = [
    { label: 'Importar', desc: 'Link ou Shopify',  icon: Download },
    { label: 'Enriquecer', desc: 'Naming + SEO',   icon: Sparkles },
    { label: 'Gerar',      desc: 'Imagens premium', icon: ImageIcon },
    { label: 'Otimizar',   desc: 'WebP + SEO',     icon: FileImage },
    { label: 'Publicar',   desc: 'Shopify ready',  icon: UploadCloud },
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
    <div className="max-w-7xl mx-auto py-10 px-4 md:px-8">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[28px] border border-border bg-gradient-to-b from-secondary/40 to-card p-8 md:p-14 mb-12 animate-slide-up">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              'radial-gradient(60% 50% at 80% 0%, hsl(var(--primary)/0.18), transparent 60%), radial-gradient(40% 40% at 10% 100%, hsl(var(--accent)/0.18), transparent 60%)',
          }}
        />
        <div className="grid-bg absolute inset-0 -z-10 opacity-30" />

        <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-semibold text-primary border border-primary/30 bg-primary/10 rounded-full px-3 py-1.5 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-dot" />
          Publify · AI Operating System
        </span>

        <h1 className="font-display text-[40px] sm:text-[56px] md:text-[72px] leading-[1.02] font-semibold tracking-tight text-foreground max-w-3xl">
          One product in.<br />
          <span className="text-primary">Shopify listing</span> out.
        </h1>

        <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Transforme produtos brutos de fornecedores em listagens premium prontas para Shopify — com naming, descrições, visuais, otimização e publicação por IA.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            onClick={() => onNavigate('publish')}
            className="h-12 px-6 rounded-full font-semibold text-primary-foreground bg-primary hover:bg-primary/90 shadow-[0_0_30px_-6px_hsl(var(--primary)/0.7)] hover:shadow-[0_0_42px_-4px_hsl(var(--primary)/0.85)] transition-all"
          >
            Start Publishing
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="h-12 px-6 rounded-full border-border bg-secondary/40 hover:bg-secondary text-foreground"
          >
            <PlayCircle className="w-4 h-4 mr-1.5" />
            View Workflow
          </Button>
        </div>
      </section>

      {/* KPIs EXECUTIVOS */}
      <section className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-3 animate-slide-up">
        {[
          { label: 'Produtos publicados', value: metrics.totalProducts,      icon: Package,      tone: 'text-foreground' },
          { label: 'Lojas conectadas',    value: metrics.connectedStores,    icon: Store,        tone: 'text-foreground' },
          { label: 'Publicações na semana', value: metrics.weeklyPublications, icon: TrendingUp, tone: 'text-primary' },
          { label: 'Importados pendentes', value: metrics.importedPending,   icon: Inbox,        tone: 'text-accent' },
          { label: 'Prontos p/ publicar',  value: metrics.readyToPublish,    icon: Rocket,       tone: 'text-primary' },
          { label: 'Imagens geradas',      value: metrics.generatedImages,   icon: ImageIcon,    tone: 'text-foreground' },
          { label: 'Prompts ativos',       value: metrics.totalPrompts,      icon: Wand2,        tone: 'text-foreground' },
          { label: 'Alertas',              value: (metrics.connectedStores === 0 ? 1 : 0) + (metrics.importedPending > 5 ? 1 : 0), icon: AlertTriangle, tone: 'text-[hsl(var(--warning))]' },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-4 hover:bg-secondary/40 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="label-mono">{k.label}</span>
              <k.icon className={`w-3.5 h-3.5 ${k.tone}`} strokeWidth={2.2} />
            </div>
            {loading ? (
              <div className="h-8 w-12 skeleton-shimmer rounded" />
            ) : (
              <span className={`editorial-number text-[32px] ${k.tone}`}>{k.value}</span>
            )}
          </div>
        ))}
      </section>

      {/* AÇÕES RECOMENDADAS */}
      {!loading && (() => {
        const actions = [
          metrics.connectedStores === 0 && {
            title: 'Conectar loja Shopify',
            desc: 'Vincule sua primeira loja para começar a publicar.',
            icon: Store, view: 'stores', tone: 'primary' as const,
          },
          metrics.importedPending > 0 && {
            title: `Finalizar ${metrics.importedPending} produto${metrics.importedPending > 1 ? 's' : ''} importado${metrics.importedPending > 1 ? 's' : ''}`,
            desc: 'Gere SEO, imagens e revise antes de publicar.',
            icon: Sparkles, view: 'imported', tone: 'violet' as const,
          },
          metrics.readyToPublish > 0 && {
            title: `Publicar ${metrics.readyToPublish} produto${metrics.readyToPublish > 1 ? 's' : ''} pronto${metrics.readyToPublish > 1 ? 's' : ''}`,
            desc: 'Tudo validado — envie direto pra Shopify.',
            icon: Rocket, view: 'publish', tone: 'primary' as const,
          },
          metrics.totalPrompts === 0 && {
            title: 'Criar seu primeiro prompt',
            desc: 'Salve templates de naming, SEO e imagens.',
            icon: BookMarked, view: 'prompts', tone: 'violet' as const,
          },
        ].filter(Boolean) as Array<{ title: string; desc: string; icon: LucideIcon; view: string; tone: 'primary' | 'violet' }>;

        if (actions.length === 0) return null;
        return (
          <section className="mb-14 animate-slide-up">
            <div className="flex items-end justify-between mb-5">
              <div>
                <span className="label-mono">Ações recomendadas pela IA</span>
                <h2 className="font-display text-2xl md:text-[28px] font-semibold tracking-tight text-foreground mt-1">
                  Próximos passos
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {actions.map((a) => {
                const isPrimary = a.tone === 'primary';
                return (
                  <button
                    key={a.title}
                    onClick={() => onNavigate(a.view)}
                    className={`group text-left rounded-2xl border p-5 flex items-center gap-4 transition-all duration-300 ease-out-expo hover:-translate-y-0.5 ${
                      isPrimary
                        ? 'border-primary/30 bg-primary/[0.04] hover:bg-primary/[0.08] hover:shadow-[0_0_28px_-6px_hsl(var(--primary)/0.5)]'
                        : 'border-accent/30 bg-accent/[0.04] hover:bg-accent/[0.08] hover:shadow-[0_0_28px_-6px_hsl(var(--accent)/0.5)]'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 ${
                      isPrimary ? 'bg-primary/10 border-primary/30' : 'bg-accent/10 border-accent/30'
                    }`}>
                      <a.icon className={`w-5 h-5 ${isPrimary ? 'text-primary' : 'text-accent'}`} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-[15px] font-semibold text-foreground">{a.title}</h3>
                      <p className="text-[12.5px] text-muted-foreground mt-0.5">{a.desc}</p>
                    </div>
                    <ArrowRight className={`w-4 h-4 flex-shrink-0 transition-all duration-300 ${
                      isPrimary ? 'text-primary' : 'text-accent'
                    } group-hover:translate-x-1`} />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* TOOLS GRID */}
      <section className="mb-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="label-mono">AI Toolkit</span>
            <h2 className="font-display text-2xl md:text-[32px] font-semibold tracking-tight text-foreground mt-1">
              What do you want to create today?
            </h2>
          </div>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => onNavigate('publish')}>
            Ver tudo <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tools.map((t, i) => {
            const a = accentMap[t.accent || 'primary'];
            return (
              <SpotlightCard
                key={t.id}
                as="button"
                onClick={() => onNavigate(t.view)}
                className={`group relative text-left rounded-[22px] border border-border bg-card hover:bg-secondary/60 p-5 flex flex-col h-full transition-all duration-300 ease-out-expo hover:-translate-y-0.5 ${a.glow} animate-slide-up`}
              >
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${a.bg}`}>
                    <t.icon className={`w-5 h-5 ${a.icon}`} strokeWidth={2} />
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full border ${badgeStyle(t.badge)}`}>
                    {t.badge}
                  </span>
                </div>

                <h3 className="font-display text-[17px] font-semibold text-foreground tracking-tight mb-1.5">
                  {t.title}
                </h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed flex-1">
                  {t.desc}
                </p>

                <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Abrir</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="workflow" className="mb-14">
        <div className="mb-6">
          <span className="label-mono">Pipeline</span>
          <h2 className="font-display text-2xl md:text-[32px] font-semibold tracking-tight text-foreground mt-1">
            Build once. Publish faster.
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Um workflow de IA repetível para cada produto que você publica.
          </p>
        </div>

        <div className="rounded-[22px] border border-border bg-card p-5 md:p-8">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 md:gap-2 items-stretch">
            {workflow.map((s, i) => (
              <div key={s.label} className="flex items-center">
                <div className="flex-1 rounded-2xl border border-border bg-secondary/40 hover:bg-secondary transition-colors p-4 text-center min-h-[120px] flex flex-col items-center justify-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <s.icon className="w-4 h-4 text-primary" strokeWidth={2.2} />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Etapa {i + 1}</span>
                  <span className="text-sm font-semibold text-foreground">{s.label}</span>
                  <span className="text-[11px] text-muted-foreground">{s.desc}</span>
                </div>
                {i < workflow.length - 1 && (
                  <ArrowRight className="hidden sm:block w-4 h-4 text-muted-foreground/60 mx-1 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

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
