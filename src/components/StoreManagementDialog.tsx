import { useState, useRef } from 'react';
import { ShopifyStore, MarketConfig } from '@/hooks/useStoreManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, RefreshCw, Star, Pencil, Save, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { CountrySelector } from '@/components/CountrySelector';
import { AI_LANGUAGES, getAILanguageForCountry } from '@/data/languages';
import { COUNTRIES, type Country } from '@/data/countries';
import { useStoreContext } from '@/hooks/useStoreContext';

interface StoreManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: ShopifyStore[];
  onRemove: (id: string) => void;
  onReconnect: (store: ShopifyStore) => void;
  onSetDefault: (id: string) => void;
  onUpdateMarket: (storeId: string, config: MarketConfig) => void;
}

export function StoreManagementDialog({
  open, onOpenChange, stores, onRemove, onReconnect, onSetDefault, onUpdateMarket,
}: StoreManagementDialogProps) {
  const { updateStoreLogo } = useStoreContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCountryCode, setEditCountryCode] = useState<string | null>(null);
  const [editLanguage, setEditLanguage] = useState('en-US');
  const [editCurrency, setEditCurrency] = useState('');
  const [editCurrencyPosition, setEditCurrencyPosition] = useState<'before' | 'after'>('before');
  const [editDecimalSep, setEditDecimalSep] = useState('.');
  const [editThousandSep, setEditThousandSep] = useState(',');
  const [editMarketName, setEditMarketName] = useState('');
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const editCountry = editCountryCode ? COUNTRIES.find(c => c.code === editCountryCode) : null;

  const startEdit = (store: ShopifyStore) => {
    const mc = store.marketConfig;
    setEditingId(store.id);
    setEditCountryCode(mc?.countryCode || null);
    setEditLanguage(mc?.language || 'en-US');
    setEditCurrency(mc?.currency || '');
    setEditCurrencyPosition(mc?.currencyPosition || 'before');
    setEditDecimalSep(mc?.decimalSeparator || '.');
    setEditThousandSep(mc?.thousandSeparator || ',');
    setEditMarketName(mc?.marketName || '');
    setEditLogoPreview(store.logoUrl || null);
  };

  const handleCountrySelect = (country: Country) => {
    setEditCountryCode(country.code);
    setEditCurrency(country.currency);
    setEditDecimalSep(country.decimalSeparator);
    setEditThousandSep(country.thousandSeparator);
    setEditCurrencyPosition(country.currencyPosition);
    const aiLang = getAILanguageForCountry(country.language);
    setEditLanguage(aiLang.code);
    if (!editMarketName) setEditMarketName(country.name);
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const valid = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!valid.includes(file.type)) {
      toast.error('Use PNG, JPG, WEBP ou SVG.');
      return;
    }
    if (file.size > 500_000) {
      toast.error('Imagem muito grande (máx. 500KB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setEditLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const saveEdit = () => {
    if (!editingId || !editCountry) return;
    onUpdateMarket(editingId, {
      countryCode: editCountry.code,
      countryFlag: editCountry.flag,
      countryName: editCountry.name,
      currency: editCurrency || editCountry.currency,
      currencySymbol: editCountry.currencySymbol,
      currencyPosition: editCurrencyPosition,
      language: editLanguage,
      decimalSeparator: editDecimalSep,
      thousandSeparator: editThousandSep,
      marketName: editMarketName.trim() || editCountry.name,
    });
    // Save logo
    const store = stores.find(s => s.id === editingId);
    if (store) {
      updateStoreLogo(editingId, editLogoPreview);
    }
    setEditingId(null);
    toast.success('Loja atualizada!');
  };

  const handleRemove = (store: ShopifyStore) => {
    onRemove(store.id);
    toast.success(`Loja ${store.domain} removida.`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Gerenciar Lojas</DialogTitle>
          <DialogDescription>Gerencie suas lojas conectadas.</DialogDescription>
        </DialogHeader>

        <input
          ref={logoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleLogoFile}
        />

        <div className="space-y-3 pt-2">
          {stores.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">Nenhuma loja conectada ainda.</p>
          )}

          {stores.map(store => (
            <div key={store.id} className="glass-card overflow-hidden">
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {store.logoUrl ? (
                    <img src={store.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain flex-shrink-0 border border-border" />
                  ) : (
                    <span className="text-xl flex-shrink-0">{store.marketConfig?.countryFlag || '🏪'}</span>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {store.marketConfig?.marketName || store.domain}
                      </span>
                      {store.isDefault && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Padrão</Badge>}
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${store.connected ? 'bg-[hsl(var(--success))]' : 'bg-muted-foreground'}`} />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{store.domain}</span>
                      {store.marketConfig?.currency && <><span>•</span><span>{store.marketConfig.currency}</span></>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editingId === store.id ? setEditingId(null) : startEdit(store)} title="Editar loja">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  {!store.isDefault && store.connected && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { onSetDefault(store.id); toast.success('Definida como padrão.'); }} title="Definir como padrão">
                      <Star className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {!store.connected && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => onReconnect(store)} title="Reconectar">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRemove(store)} title="Remover loja">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Edit panel */}
              {editingId === store.id && (
                <div className="border-t border-border p-4 space-y-4 bg-secondary/30">
                  <h4 className="text-sm font-semibold text-foreground">Editar Loja</h4>

                  {/* Logo section */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Logo da loja</Label>
                    <div className="mt-1.5 flex items-center gap-3">
                      {editLogoPreview ? (
                        <div className="relative">
                          <img src={editLogoPreview} alt="Logo" className="w-12 h-12 rounded-lg object-contain border border-border bg-secondary" />
                          <button
                            onClick={() => setEditLogoPreview(null)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => logoInputRef.current?.click()}
                          className="w-12 h-12 rounded-lg border-2 border-dashed border-border hover:border-[hsl(var(--info)/0.5)] flex items-center justify-center text-muted-foreground hover:text-[hsl(var(--info))] transition-colors bg-secondary/50"
                        >
                          <ImagePlus className="w-5 h-5" />
                        </button>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {editLogoPreview ? (
                          <button onClick={() => logoInputRef.current?.click()} className="text-[hsl(var(--info))] hover:underline">
                            Alterar imagem
                          </button>
                        ) : (
                          <span>PNG, JPG, SVG · Máx. 500KB</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Market section */}
                  <div className="border-t border-border pt-4">
                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Mercado</h5>

                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">País</Label>
                        <div className="mt-1">
                          <CountrySelector value={editCountryCode} onChange={handleCountrySelect} />
                        </div>
                      </div>

                      {editCountry && (
                        <>
                          <div>
                            <Label className="text-xs text-muted-foreground">Idioma</Label>
                            <Select value={editLanguage} onValueChange={setEditLanguage}>
                              <SelectTrigger className="mt-1 bg-secondary border-border h-9 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-[200px]">
                                {AI_LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.flag} {l.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-muted-foreground">Moeda</Label>
                              <Input value={editCurrency} onChange={e => setEditCurrency(e.target.value.toUpperCase())} className="mt-1 bg-secondary border-border h-9 text-sm" maxLength={4} />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Posição símbolo</Label>
                              <Select value={editCurrencyPosition} onValueChange={v => setEditCurrencyPosition(v as 'before' | 'after')}>
                                <SelectTrigger className="mt-1 bg-secondary border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="before">Antes ($10)</SelectItem>
                                  <SelectItem value="after">Depois (10€)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-muted-foreground">Separador decimal</Label>
                              <Select value={editDecimalSep} onValueChange={setEditDecimalSep}>
                                <SelectTrigger className="mt-1 bg-secondary border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value=".">Ponto (.)</SelectItem>
                                  <SelectItem value=",">Vírgula (,)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Separador milhar</Label>
                              <Select value={editThousandSep} onValueChange={setEditThousandSep}>
                                <SelectTrigger className="mt-1 bg-secondary border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value=".">Ponto (.)</SelectItem>
                                  <SelectItem value=",">Vírgula (,)</SelectItem>
                                  <SelectItem value=" ">Espaço ( )</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs text-muted-foreground">Nome do mercado</Label>
                            <Input value={editMarketName} onChange={e => setEditMarketName(e.target.value)} placeholder="Ex: Europa Central" className="mt-1 bg-secondary border-border h-9 text-sm" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <Button onClick={saveEdit} size="sm" className="w-full">
                    <Save className="w-3.5 h-3.5 mr-1.5" />Salvar alterações
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
