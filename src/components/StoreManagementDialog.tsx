import { ShopifyStore } from '@/hooks/useStoreManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw, Star, StarOff } from 'lucide-react';
import { toast } from 'sonner';

interface StoreManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: ShopifyStore[];
  onRemove: (id: string) => void;
  onReconnect: (store: ShopifyStore) => void;
  onSetDefault: (id: string) => void;
}

export function StoreManagementDialog({
  open, onOpenChange, stores, onRemove, onReconnect, onSetDefault,
}: StoreManagementDialogProps) {
  const handleRemove = (store: ShopifyStore) => {
    onRemove(store.id);
    toast.success(`Loja ${store.domain} removida.`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Gerenciar Lojas</DialogTitle>
          <DialogDescription>
            Gerencie suas lojas Shopify conectadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2 max-h-[60vh] overflow-y-auto">
          {stores.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">
              Nenhuma loja conectada ainda.
            </p>
          )}

          {stores.map(store => (
            <div
              key={store.id}
              className="glass-card p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  store.connected ? 'bg-[hsl(var(--success))]' : 'bg-muted-foreground'
                }`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {store.domain}
                    </span>
                    {store.isDefault && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        Padrão
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {store.connected
                      ? `Conectada em ${store.connectedAt}`
                      : 'Desconectada'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {!store.isDefault && store.connected && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      onSetDefault(store.id);
                      toast.success(`${store.domain} definida como padrão.`);
                    }}
                    title="Definir como padrão"
                  >
                    <Star className="w-3.5 h-3.5" />
                  </Button>
                )}

                {!store.connected && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary"
                    onClick={() => onReconnect(store)}
                    title="Reconectar"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleRemove(store)}
                  title="Remover loja"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
