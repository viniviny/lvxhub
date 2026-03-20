import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface UserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  plan: string | null;
  created_at: string;
}

function UsersTableSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-8 w-32 rounded mb-2" />
          <Skeleton className="h-4 w-48 rounded" />
        </div>
      </div>
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="text-muted-foreground">Nome</TableHead>
              <TableHead className="text-muted-foreground">Email</TableHead>
              <TableHead className="text-muted-foreground">Plano</TableHead>
              <TableHead className="text-muted-foreground">Registrado em</TableHead>
              <TableHead className="text-muted-foreground text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className="border-border/30">
                <TableCell><Skeleton className="h-4 w-28 rounded" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40 rounded" /></TableCell>
                <TableCell><Skeleton className="h-8 w-24 rounded" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24 rounded" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, email, plan, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar usuários.');
      console.error(error);
    } else {
      setUsers((data || []) as UserProfile[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handlePlanChange = async (userId: string, newPlan: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ plan: newPlan })
      .eq('id', userId);

    if (error) {
      toast.error('Erro ao atualizar plano.');
    } else {
      toast.success('Plano atualizado!');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan } : u));
    }
  };

  if (loading) return <UsersTableSkeleton />;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Usuários</h2>
          <p className="text-sm text-muted-foreground mt-1">{users.length} usuários registrados</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="text-muted-foreground">Nome</TableHead>
              <TableHead className="text-muted-foreground">Email</TableHead>
              <TableHead className="text-muted-foreground">Plano</TableHead>
              <TableHead className="text-muted-foreground">Registrado em</TableHead>
              <TableHead className="text-muted-foreground text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id} className="border-border/30">
                <TableCell className="font-medium text-foreground">
                  {user.display_name || '—'}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {user.email || '—'}
                </TableCell>
                <TableCell>
                  <Select
                    value={user.plan || 'free'}
                    onValueChange={v => handlePlanChange(user.id, v)}
                  >
                    <SelectTrigger className="w-24 h-8 text-xs bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(user.created_at).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  Nenhum usuário registrado ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}