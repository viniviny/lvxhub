import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, role } = useAuth();

  // Log unauthorized admin access attempts
  useEffect(() => {
    if (!loading && user && requireAdmin && role !== 'admin') {
      supabase.from('security_logs').insert({
        user_id: user.id,
        event_type: 'unauthorized_admin_access',
        attempted_route: '/admin',
        details: { email: user.email },
      }).then(() => {});
    }
  }, [loading, user, requireAdmin, role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
