import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, Loader2, CheckCircle2, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { CountrySelector } from '@/components/CountrySelector';
import { AI_LANGUAGES, getAILanguageForCountry } from '@/data/languages';
import { COUNTRIES, type Country } from '@/data/countries';
import { type MarketConfig } from '@/hooks/useStoreManager';

interface ShopifyConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: (shopName: string, storeDomain: string, marketConfig?: MarketConfig) => void;
  onOpenOnboarding?: () => void;
}

export function ShopifyConnectDialog({ open, onOpenChange, onConnected, onOpenOnboarding }: ShopifyConnectDialogProps) {
  const [storeDomain, setStoreDomain] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [shopName, setShopName] = useState('');
  const [errors, setErrors] = useState<{ domain?: string; clientId?: string; clientSecret?: string }>({});

  // Market config
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [customCurrency, setCustomCurrency] = useState('');
  const [decimalSep, setDecimalSep] = useState('.');
  const [thousandSep, setThousandSep] = useState(',');
  const [currencyPosition, setCurrencyPosition] = useState<'before' | 'after'>('before');
  const [marketName, setMarketName] = useState('');

  const selectedCountry = selectedCountryCode ? COUNTRIES.find(c => c.code === selectedCountryCode) : null;

  const handleCountrySelect = (country: Country) => {
    setSelectedCountryCode(country.code);
    setCustomCurrency(country.currency);
    setDecimalSep(country.decimalSeparator);
    setThousandSep(country.thousandSeparator);
    setCurrencyPosition(country.currencyPosition);
    const aiLang = getAILanguageForCountry(country.language);
    setSelectedLanguage(aiLang.code);
  };

  const validateInputs = (): boolean => {
    const newErrors: { domain?: string; clientId?: string; clientSecret?: string } = {};
    const domain = storeDomain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');

    if (!domain) {
      newErrors.domain = 'Domínio é obrigatório.';
    } else if (!/^[a-zA-Z0-9-]+\.myshopify\.com$/.test(domain)) {
      newErrors.domain = 'Use o formato: minha-loja.myshopify.com';
    }

    if (!clientId.trim()) {
      newErrors.clientId = 'Client ID é obrigatório.';
    }

    if (!clientSecret.trim()) {
      newErrors.clientSecret = 'Client Secret é obrigatório.';
    } else if (clientSecret.trim().length < 10) {
      newErrors.clientSecret = 'Client Secret parece inválido.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildMarketConfig = (): MarketConfig | undefined => {
    if (!selectedCountry) return undefined;
    return {
      countryCode: selectedCountry.code,
      countryFlag: selectedCountry.flag,
      countryName: selectedCountry.name,
      currency: customCurrency || selectedCountry.currency,
      currencySymbol: selectedCountry.currencySymbol,
      currencyPosition,
      language: selectedLanguage,
      decimalSeparator: decimalSep,
      thousandSeparator: thousandSep,
      marketName: marketName.trim() || selectedCountry.name,
    };
  };

  const handleConnect = async () => {
    if (!validateInputs()) return;

    const domain = storeDomain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');

    setIsConnecting(true);

    try {
      // Save settings to localStorage for the callback page
      const marketConfig = buildMarketConfig();
      localStorage.setItem('shopify_settings', JSON.stringify({
        storeDomain: domain,
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        marketConfig,
      }));

      // Generate a random state string for CSRF protection
      const state = crypto.randomUUID();
      localStorage.setItem('shopify_oauth_state', state);

      const scopes = [
        'read_products', 'write_products',
        'read_files', 'write_files',
        'read_inventory', 'write_inventory',
        'read_locations',
        'read_publications', 'write_publications',
        'write_metafields', 'read_themes',
      ].join(',');

      const redirectUri = `${window.location.origin}/callback`;

      const authUrl = `https://${domain}/admin/oauth/authorize?client_id=${encodeURIComponent(clientId.trim())}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

      window.location.href = authUrl;
    } catch (err: any) {
      const msg = err?.message || 'Erro ao iniciar conexão. Tente novamente.';
      toast.error(msg);
      setIsConnecting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    if (isConnected) {
      setTimeout(() => {
        setStoreDomain('');
        setClientId('');
        setClientSecret('');
        setShowSecret(false);
        setIsConnected(false);
        setShopName('');
        setErrors({});
        setSelectedCountryCode(null);
        setSelectedLanguage('en-US');
        setCustomCurrency('');
        setMarketName('');
      }, 300);
    }
  };

  const handleOpenOnboarding = () => {
    handleClose();
    onOpenOnboarding?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {isConnected ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-[hsl(var(--success))]" />
            </div>
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl">Loja Conectada!</DialogTitle>
              <DialogDescription className="text-base mt-1">
                <strong>{shopName}</strong> foi conectada com sucesso.
                {selectedCountry && (
                  <span className="block mt-1">{selectedCountry.flag} {selectedCountry.name} • {customCurrency}</span>
                )}
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
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Store className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle>Conectar Loja Shopify</DialogTitle>
                  <DialogDescription>
                    Configure a conexão e mercado da sua loja.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Connection fields */}
              <div className="space-y-4">
                {/* Domain */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Domínio da Loja</Label>
                  <Input
                    value={storeDomain}
                    onChange={e => {
                      setStoreDomain(e.target.value);
                      if (errors.domain) setErrors(prev => ({ ...prev, domain: undefined }));
                    }}
                    placeholder="minha-loja.myshopify.com"
                    className={`mt-1.5 bg-secondary border-border ${errors.domain ? 'border-destructive' : ''}`}
                  />
                  {errors.domain ? (
                    <p className="text-xs text-destructive mt-1">{errors.domain}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">Ex: minha-loja.myshopify.com</p>
                  )}
                </div>

                {/* Client ID */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Client ID</Label>
                  <Input
                    value={clientId}
                    onChange={e => {
                      setClientId(e.target.value);
                      if (errors.clientId) setErrors(prev => ({ ...prev, clientId: undefined }));
                    }}
                    placeholder="Cole seu Client ID aqui"
                    className={`mt-1.5 bg-secondary border-border ${errors.clientId ? 'border-destructive' : ''}`}
                  />
                  {errors.clientId ? (
                    <p className="text-xs text-destructive mt-1">{errors.clientId}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                      Encontrado em: Dev Dashboard → fashionAPP → Configurações → Credenciais
                    </p>
                  )}
                </div>

                {/* Client Secret */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Client Secret</Label>
                  <div className="relative mt-1.5">
                    <Input
                      type={showSecret ? 'text' : 'password'}
                      value={clientSecret}
                      onChange={e => {
                        setClientSecret(e.target.value);
                        if (errors.clientSecret) setErrors(prev => ({ ...prev, clientSecret: undefined }));
                      }}
                      placeholder="Cole seu Client Secret aqui"
                      className={`bg-secondary border-border pr-10 ${errors.clientSecret ? 'border-destructive' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.clientSecret ? (
                    <p className="text-xs text-destructive mt-1">{errors.clientSecret}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique no olho ao lado da Chave secreta no Dev Dashboard para revelar
                    </p>
                  )}
                </div>

                {/* Helper link */}
                <button
                  type="button"
                  onClick={handleOpenOnboarding}
                  className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Como encontrar minhas credenciais
                </button>
              </div>

              {/* Market config */}
              <div className="border-t border-border pt-4 space-y-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  🌍 Configuração de Mercado
                </h4>

                <div>
                  <Label className="text-sm text-muted-foreground">País</Label>
                  <div className="mt-1.5">
                    <CountrySelector value={selectedCountryCode} onChange={handleCountrySelect} />
                  </div>
                </div>

                {selectedCountry && (
                  <>
                    <div>
                      <Label className="text-sm text-muted-foreground">Idioma do conteúdo</Label>
                      <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                        <SelectTrigger className="mt-1.5 bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {AI_LANGUAGES.map(l => (
                            <SelectItem key={l.code} value={l.code}>
                              {l.flag} {l.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm text-muted-foreground">Moeda</Label>
                        <Input
                          value={customCurrency}
                          onChange={e => setCustomCurrency(e.target.value.toUpperCase())}
                          placeholder="USD"
                          className="mt-1.5 bg-secondary border-border"
                          maxLength={4}
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Posição do símbolo</Label>
                        <Select value={currencyPosition} onValueChange={v => setCurrencyPosition(v as 'before' | 'after')}>
                          <SelectTrigger className="mt-1.5 bg-secondary border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="before">Antes ($ 10,00)</SelectItem>
                            <SelectItem value="after">Depois (10,00 €)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm text-muted-foreground">Separador decimal</Label>
                        <Select value={decimalSep} onValueChange={setDecimalSep}>
                          <SelectTrigger className="mt-1.5 bg-secondary border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value=".">Ponto (.)</SelectItem>
                            <SelectItem value=",">Vírgula (,)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Separador de milhar</Label>
                        <Select value={thousandSep} onValueChange={setThousandSep}>
                          <SelectTrigger className="mt-1.5 bg-secondary border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value=".">Ponto (.)</SelectItem>
                            <SelectItem value=",">Vírgula (,)</SelectItem>
                            <SelectItem value=" ">Espaço ( )</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">Nome do mercado (opcional)</Label>
                      <Input
                        value={marketName}
                        onChange={e => setMarketName(e.target.value)}
                        placeholder="Ex: Europa Central, LATAM..."
                        className="mt-1.5 bg-secondary border-border"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleConnect}
                disabled={isConnecting || !storeDomain.trim() || !clientId.trim() || !clientSecret.trim()}
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
