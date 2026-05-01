import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, BarChart3 } from 'lucide-react';

interface UsageRow {
  estimated_cost: number;
  tokens_used: number;
}

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
        .select('estimated_cost, tokens_used')
        .eq('user_id', user.id);

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

  const stats = useMemo(() => ({
    totalCalls: logs.length,
    totalCost: logs.reduce((sum, l) => sum + Number(l.estimated_cost || 0), 0),
  }), [logs]);

  return (
    <div className="space-y-3">
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
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Chamadas</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{stats.totalCalls}</p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Custo estimado</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">
              ${stats.totalCost.toFixed(3)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
