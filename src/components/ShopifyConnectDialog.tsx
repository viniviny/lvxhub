import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CountrySelector } from '@/components/CountrySelector';
import { AI_LANGUAGES, getAILanguageForCountry } from '@/data/languages';
import { COUNTRIES, type Country } from '@/data/countries';
import { type MarketConfig } from '@/hooks/useStoreManager';

interface ShopifyConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: (shopName: string, storeDomain: string, marketConfig?: MarketConfig) => void;
}

export function ShopifyConnectDialog({ open, onOpenChange, onConnected }: ShopifyConnectDialogProps) {
  const [storeDomain, setStoreDomain] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [shopName, setShopName] = useState('');
  const [errors, setErrors] = useState<{ domain?: string; token?: string }>({});

  // Market config
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [customCurrency, setCustomCurrency] = useState('');
  const [decimalSep, setDecimalSep] = useState('.');
  const [thousandSep, setThousandSep] = useState(',');
  const [currencyPosition, setCurrencyPosition] = useState<'before' | 'after'>('before');
  const [marketName, setMarketName] = useState('');

  const selectedCountry = selectedCountryCode ? COUNTRIES.find(c => c.code === selectedCountryCode) : null;

  // Auto-fill when country changes
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
    const newErrors: { domain?: string; token?: string } = {};
    const domain = storeDomain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');

    if (!domain) {
      newErrors.domain = 'Domínio é obrigatório.';
    } else if (!/^[a-zA-Z0-9-]+\.myshopify\.com$/.test(domain)) {
      newErrors.domain = 'Use o formato: minha-loja.myshopify.com';
    }

    if (!accessToken.trim()) {
      newErrors.token = 'Token é obrigatório.';
    } else if (accessToken.trim().length < 10) {
      newErrors.token = 'Token parece inválido.';
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
      const { data, error } = await supabase.functions.invoke('connect-shopify', {
        body: { storeDomain: domain, accessToken },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setShopName(data.shopName || domain);
      setIsConnected(true);
      onConnected(data.shopName || domain, domain, buildMarketConfig());
      toast.success('Loja Shopify conectada com sucesso!');
    } catch (err: any) {
      const msg = err?.message || 'Erro de conexão. Tente novamente.';
      toast.error(msg);
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
        setErrors({});
        setSelectedCountryCode(null);
        setSelectedLanguage('en-US');
        setCustomCurrency('');
        setMarketName('');
      }, 300);
    }
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

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Token de Acesso (Admin API)</Label>
                  <Input
                    type="password"
                    value={accessToken}
                    onChange={e => {
                      setAccessToken(e.target.value);
                      if (errors.token) setErrors(prev => ({ ...prev, token: undefined }));
                    }}
                    placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
                    className={`mt-1.5 bg-secondary border-border ${errors.token ? 'border-destructive' : ''}`}
                  />
                  {errors.token ? (
                    <p className="text-xs text-destructive mt-1">{errors.token}</p>
                  ) : (
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
                  )}
                </div>
              </div>

              {/* Market config */}
              <div className="border-t border-border pt-4 space-y-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  🌍 Configuração de Mercado
                </h4>

                {/* Country selector */}
                <div>
                  <Label className="text-sm text-muted-foreground">País</Label>
                  <div className="mt-1.5">
                    <CountrySelector value={selectedCountryCode} onChange={handleCountrySelect} />
                  </div>
                </div>

                {selectedCountry && (
                  <>
                    {/* Language */}
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

                    {/* Currency */}
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

                    {/* Separators */}
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

                    {/* Custom market name */}
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
