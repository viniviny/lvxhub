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
      const message = this.state.error?.message || 'Erro desconhecido';
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="text-center max-w-lg">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Algo deu errado</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            <details className="text-left mb-4 bg-muted/40 border border-border rounded-lg p-3">
              <summary className="text-xs font-medium text-muted-foreground cursor-pointer">Detalhes técnicos</summary>
              <pre className="text-[11px] text-foreground/80 mt-2 whitespace-pre-wrap break-words max-h-40 overflow-auto">{message}</pre>
            </details>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" onClick={() => this.setState({ hasError: false, error: undefined })} className="font-display font-semibold">
                Tentar novamente
              </Button>
              <Button onClick={() => window.location.reload()} className="font-display font-semibold">
                Recarregar página
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
