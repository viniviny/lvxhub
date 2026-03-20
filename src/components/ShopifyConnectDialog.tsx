import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Store, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ShopifyConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: (shopName: string, storeDomain: string) => void;
}

export function ShopifyConnectDialog({ open, onOpenChange }: ShopifyConnectDialogProps) {
  const [storeDomain, setStoreDomain] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [shopName, setShopName] = useState('');

  const handleConnect = async () => {
    if (!storeDomain.trim() || !accessToken.trim()) {
      toast.error('Preencha todos os campos.');
      return;
    }

    const domain = storeDomain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');

    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('connect-shopify', {
        body: { storeDomain: domain, accessToken },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setShopName(data.shopName || domain);
      setIsConnected(true);
      toast.success('Loja Shopify conectada com sucesso!');
    } catch (err: any) {
      console.error('Erro ao conectar Shopify:', err);
      toast.error(err.message || 'Erro ao conectar. Verifique suas credenciais.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    if (isConnected) {
      setTimeout(() => {
        setStoreDomain('');
        setAccessToken('');
        setIsConnected(false);
        setShopName('');
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {isConnected ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-[hsl(var(--success))]" />
            </div>
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl">Loja Conectada!</DialogTitle>
              <DialogDescription className="text-base mt-1">
                <strong>{shopName}</strong> foi conectada com sucesso.
              </DialogDescription>
            </DialogHeader>
            <Button onClick={handleClose} className="mt-2">
              Fechar
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center">
                  <Store className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle>Conectar Loja Shopify</DialogTitle>
                  <DialogDescription>
                    Insira o domínio e o token de acesso da sua loja.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Domínio da Loja
                </Label>
                <Input
                  value={storeDomain}
                  onChange={e => setStoreDomain(e.target.value)}
                  placeholder="minha-loja.myshopify.com"
                  className="mt-1.5 bg-secondary border-border"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ex: minha-loja.myshopify.com
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Token de Acesso (Admin API)
                </Label>
                <Input
                  type="password"
                  value={accessToken}
                  onChange={e => setAccessToken(e.target.value)}
                  placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="mt-1.5 bg-secondary border-border"
                />
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  <a
                    href="https://admin.shopify.com/store/settings/apps/development"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground transition-colors"
                  >
                    Como obter o token
                  </a>
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleConnect}
                disabled={isConnecting || !storeDomain.trim() || !accessToken.trim()}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Store className="w-4 h-4 mr-2" />
                    Conectar
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
