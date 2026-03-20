import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Store } from 'lucide-react';
import { toast } from 'sonner';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAndConnect: (data: {
    domain: string;
    clientId: string;
    clientSecret: string;
    apiVersion: string;
    redirectUri: string;
  }) => void;
}

export function SettingsDialog({ open, onOpenChange, onSaveAndConnect }: SettingsDialogProps) {
  const [form, setForm] = useState({
    domain: '',
    clientId: '',
    clientSecret: '',
    apiVersion: '2026-01',
    redirectUri: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        domain: '',
        clientId: '',
        clientSecret: '',
        apiVersion: '2026-01',
        redirectUri: `${window.location.origin}/callback`,
      });
    }
  }, [open]);

  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

  const validateForm = (): boolean => {
    if (!form.domain.trim() || !form.clientId.trim() || !form.clientSecret.trim()) {
      toast.error('Preencha todos os campos obrigatórios.');
      return false;
    }
    if (!domainRegex.test(form.domain.trim())) {
      toast.error('Domínio inválido. Use o formato: minha-loja.myshopify.com');
      return false;
    }
    return true;
  };

  const handleConnect = () => {
    if (!validateForm()) return;
    onSaveAndConnect({
      ...form,
      domain: form.domain.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Credenciais Shopify</DialogTitle>
          <DialogDescription>
            Cole as credenciais do app criado na sua loja Shopify.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Domínio da Loja *</Label>
            <Input
              value={form.domain}
              onChange={e => setForm(prev => ({ ...prev, domain: e.target.value }))}
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

          <Button onClick={handleConnect} className="w-full font-display font-semibold">
            <Store className="w-4 h-4 mr-2" />
            Conectar Loja
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
