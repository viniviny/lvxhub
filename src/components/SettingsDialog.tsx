import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ShopifySettings } from '@/hooks/useShopifyAuth';
import { Save, Store } from 'lucide-react';
import { toast } from 'sonner';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSettings: ShopifySettings | null;
  onSave: (settings: ShopifySettings) => void;
  onConnect: () => void;
  isAuthenticated: boolean;
}

export function SettingsDialog({ open, onOpenChange, currentSettings, onSave, onConnect, isAuthenticated }: SettingsDialogProps) {
  const [form, setForm] = useState<ShopifySettings>({
    storeDomain: '',
    clientId: '',
    clientSecret: '',
    apiVersion: '2026-01',
    redirectUri: '',
  });

  useEffect(() => {
    if (open) {
      const defaultRedirect = `${window.location.origin}/callback`;
      setForm(currentSettings ? { ...currentSettings, redirectUri: currentSettings.redirectUri || defaultRedirect } : {
        storeDomain: '',
        clientId: '',
        clientSecret: '',
        apiVersion: '2026-01',
        redirectUri: defaultRedirect,
      });
    }
  }, [open, currentSettings]);

  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

  const validateForm = (): boolean => {
    if (!form.storeDomain.trim() || !form.clientId.trim() || !form.clientSecret.trim()) {
      toast.error('Preencha todos os campos obrigatórios.');
      return false;
    }
    if (!domainRegex.test(form.storeDomain.trim())) {
      toast.error('Domínio inválido. Use o formato: minha-loja.myshopify.com');
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    onSave({ ...form, storeDomain: form.storeDomain.trim() });
    toast.success('Configurações salvas com sucesso!');
  };

  const handleSaveAndConnect = () => {
    if (!validateForm()) return;
    onSave({ ...form, storeDomain: form.storeDomain.trim() });
    onOpenChange(false);
    setTimeout(() => onConnect(), 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Configurações Shopify</DialogTitle>
          <DialogDescription>
            Configure as credenciais do seu app Shopify para conectar sua loja.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Domínio da Loja *</Label>
            <Input
              value={form.storeDomain}
              onChange={e => setForm(prev => ({ ...prev, storeDomain: e.target.value }))}
              placeholder="minha-loja.myshopify.com"
              className="mt-1.5 bg-secondary border-border"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-muted-foreground">Client ID *</Label>
            <Input
              value={form.clientId}
              onChange={e => setForm(prev => ({ ...prev, clientId: e.target.value }))}
              placeholder="Seu Shopify Client ID"
              className="mt-1.5 bg-secondary border-border"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-muted-foreground">Client Secret *</Label>
            <Input
              type="password"
              value={form.clientSecret}
              onChange={e => setForm(prev => ({ ...prev, clientSecret: e.target.value }))}
              placeholder="Seu Shopify Client Secret"
              className="mt-1.5 bg-secondary border-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">API Version</Label>
              <Input
                value={form.apiVersion}
                onChange={e => setForm(prev => ({ ...prev, apiVersion: e.target.value }))}
                className="mt-1.5 bg-secondary border-border"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Redirect URI</Label>
              <Input
                value={form.redirectUri}
                readOnly
                className="mt-1.5 bg-muted border-border text-muted-foreground cursor-default"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} variant="secondary" className="flex-1 font-display font-semibold">
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
            {!isAuthenticated && (
              <Button onClick={handleSaveAndConnect} className="flex-1 font-display font-semibold">
                <Store className="w-4 h-4 mr-2" />
                Conectar Loja
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
