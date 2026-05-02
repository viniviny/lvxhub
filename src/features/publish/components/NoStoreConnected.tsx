import { Button } from '@/components/ui/button';
import { Globe, Zap } from 'lucide-react';

interface NoStoreConnectedProps {
  onAddStore: () => void;
}

export function NoStoreConnected({ onAddStore }: NoStoreConnectedProps) {
  return (
    <div className="animate-fade-in py-10">
      <div className="glass-card p-10 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
          <Zap className="w-8 h-8 text-primary" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">Conecte sua loja</h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">Conecte uma loja Shopify para começar a publicar produtos.</p>
        <Button onClick={onAddStore} size="lg" className="w-full font-display font-semibold text-base mb-4">
          <Globe className="w-4 h-4 mr-2" />Conectar ao Shopify
        </Button>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-secondary/40"><span className="text-base">🌍</span><span className="text-[11px] text-muted-foreground font-medium">195 países</span></div>
          <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-secondary/40"><span className="text-base">🏪</span><span className="text-[11px] text-muted-foreground font-medium">Múltiplas lojas</span></div>
          <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-secondary/40"><span className="text-base">💱</span><span className="text-[11px] text-muted-foreground font-medium">Câmbio automático</span></div>
        </div>
      </div>
    </div>
  );
}