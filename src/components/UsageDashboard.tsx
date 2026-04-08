import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SERVICE_LABELS, SERVICE_MODELS, SERVICE_COSTS, type ApiService } from '@/hooks/useApiUsage';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image, FileText, Search, Upload, DollarSign, Activity, TrendingUp, BarChart3 } from 'lucide-react';

interface UsageRow {
  service: string;
  action: string;
  tokens_used: number;
  estimated_cost: number;
  created_at: string;
  metadata: { model?: string; provider?: string } | null;
}

const SERVICE_ICONS: Record<string, typeof Image> = {
  'image-generation': Image,
  'text-generation': FileText,
  'specs-generation': Search,
  'image-analysis': Search,
  'shopify-publish': Upload,
};

const SERVICE_COLORS: Record<string, string> = {
  'image-generation': 'text-blue-400',
  'text-generation': 'text-emerald-400',
  'specs-generation': 'text-amber-400',
  'image-analysis': 'text-purple-400',
  'shopify-publish': 'text-cyan-400',
};

type Period = '7d' | '30d' | '90d' | 'all';

export function UsageDashboard() {
  const [logs, setLogs] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      let query = (supabase as any).from('api_usage_logs')
        .select('service, action, tokens_used, estimated_cost, created_at, metadata')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (period !== 'all') {
        const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        query = query.gte('created_at', since);
      }

      const { data } = await query;
      setLogs((data || []) as UsageRow[]);
      setLoading(false);
    };
    fetchLogs();
  }, [period]);

  const ALL_SERVICES: ApiService[] = ['image-generation', 'text-generation', 'specs-generation', 'image-analysis', 'shopify-publish']
    .filter(s => (SERVICE_COSTS[s as ApiService] ?? 0) > 0) as ApiService[];

  const stats = useMemo(() => {
    const totalCalls = logs.length;
    const totalCost = logs.reduce((sum, l) => sum + Number(l.estimated_cost || 0), 0);
    const totalTokens = logs.reduce((sum, l) => sum + (l.tokens_used || 0), 0);

    const byService: Record<string, { count: number; cost: number }> = {};
    // Initialize all services so they always appear
    ALL_SERVICES.forEach(s => { byService[s] = { count: 0, cost: 0 }; });
    logs.forEach(l => {
      if (!byService[l.service]) byService[l.service] = { count: 0, cost: 0 };
      byService[l.service].count++;
      byService[l.service].cost += Number(l.estimated_cost || 0);
    });

    const sortedServices = Object.entries(byService)
      .sort(([, a], [, b]) => b.cost - a.cost);

    return { totalCalls, totalCost, totalTokens, sortedServices };
  }, [logs]);

  const maxCount = Math.max(...stats.sortedServices.map(([, s]) => s.count), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-[13px] text-foreground flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4 text-primary" />
          Uso de APIs
        </h3>
        <Select value={period} onValueChange={v => setPeriod(v as Period)}>
          <SelectTrigger className="h-7 w-28 text-[10px] bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="all">Todo período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Activity className="w-5 h-5 animate-pulse text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Total de chamadas</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{stats.totalCalls}</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Custo estimado</p>
              <p className="text-xl font-bold text-foreground mt-0.5 flex items-center justify-center gap-0.5">
                <DollarSign className="w-4 h-4 text-primary" />
                {stats.totalCost.toFixed(3)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
              <p className="text-[10px] text-muted-foreground">APIs utilizadas</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{stats.sortedServices.length}</p>
            </div>
          </div>

          {/* Breakdown by service — always visible */}
          <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Consumo por API</p>
            {stats.sortedServices.map(([service, data]) => {
              const Icon = SERVICE_ICONS[service] || Activity;
              const color = SERVICE_COLORS[service] || 'text-muted-foreground';
              const pct = maxCount > 0 ? (data.count / maxCount) * 100 : 0;
              const modelName = SERVICE_MODELS[service as ApiService] || '';
              return (
                <div key={service} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Icon className={`w-3.5 h-3.5 ${color} shrink-0`} />
                      <div className="min-w-0">
                        <span className="text-xs text-foreground font-medium block">
                          {SERVICE_LABELS[service as ApiService] || service}
                        </span>
                        <span className="text-[9px] text-muted-foreground/70 block truncate">
                          {modelName}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                        {data.count}x
                      </Badge>
                      <span className="text-[10px] text-muted-foreground w-14 text-right">
                        ${data.cost.toFixed(3)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/60 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent activity */}
          {logs.length > 0 && (
            <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Atividade recente</p>
              <div className="space-y-1 max-h-[160px] overflow-y-auto">
                {logs.slice(0, 20).map((log, i) => {
                  const Icon = SERVICE_ICONS[log.service] || Activity;
                  const color = SERVICE_COLORS[log.service] || 'text-muted-foreground';
                  const date = new Date(log.created_at);
                  const timeStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  const modelName = (log.metadata as any)?.model;
                  return (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Icon className={`w-3 h-3 ${color} shrink-0`} />
                        <span className="text-[11px] text-foreground truncate">{log.action}</span>
                        {modelName && (
                          <Badge variant="outline" className="text-[8px] h-3.5 px-1 shrink-0 text-muted-foreground">
                            {modelName}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground">${Number(log.estimated_cost).toFixed(4)}</span>
                        <span className="text-[9px] text-muted-foreground/60">{timeStr}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
