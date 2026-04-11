import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Algo deu errado</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            <Button onClick={() => window.location.reload()} className="font-display font-semibold">
              Recarregar página
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
