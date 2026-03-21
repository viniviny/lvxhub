import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import { Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      // Friendly error messages — never expose raw errors
      if (error.message === 'Invalid login credentials') {
        toast.error('Credenciais inválidas.');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Email não confirmado. Verifique sua caixa de entrada.');
      } else {
        toast.error('Erro de conexão. Tente novamente.');
      }
    }
  };


  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="glass-card p-10 w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-7 h-7 text-primary" />
            <span className="font-display text-2xl font-bold gradient-text">Publify</span>
          </div>
          <p className="text-muted-foreground text-sm text-center">
            Publique produtos na Shopify em segundos
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="mt-1.5 bg-secondary border-border"
              required
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 bg-secondary border-border"
              required
            />
          </div>
          <Button type="submit" className="w-full font-display font-semibold" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar'}
          </Button>
        </form>

        <div className="mt-3 text-center">
          <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Esqueci minha senha
          </Link>
        </div>


        <p className="mt-8 text-center text-xs text-muted-foreground/50">
          Acesso restrito
        </p>
      </div>
    </div>
  );
}
