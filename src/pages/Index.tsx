import { useState, useRef, useMemo } from 'react';
import { ImageGenerationStep, GeneratedImage } from '@/components/ImageGenerationStep';
import { ProductFormData, ProductSize, AVAILABLE_SIZES, COLLECTIONS, VariantData, WeightUnit } from '@/types/product';
import { ProductHistory } from '@/components/ProductHistory';
import { useStoreContext } from '@/hooks/useStoreContext';
import type { MarketConfig, ShopifyStore } from '@/hooks/useStoreManager';
import { useRegionGroups } from '@/hooks/useRegionGroups';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { SettingsDialog } from '@/components/SettingsDialog';
import { OnboardingGuide } from '@/components/OnboardingGuide';
import { StoreManagementDialog } from '@/components/StoreManagementDialog';
import { ShopifyConnectDialog } from '@/components/ShopifyConnectDialog';
import { RegionGroupManager } from '@/components/RegionGroupManager';
import { GlobalPublishFlow } from '@/components/GlobalPublishFlow';
import { DashboardSidebar, DashboardView } from '@/components/DashboardSidebar';
import { RichTextEditor } from '@/components/RichTextEditor';
import { PriceSection } from '@/components/PriceSection';
import { VariantsTable } from '@/components/VariantsTable';
import { ShippingCard } from '@/components/ShippingCard';
import { SalesChannels } from '@/components/SalesChannels';
import { ReviewChecklist, getCanPublish } from '@/components/ReviewChecklist';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { UserMenu } from '@/components/UserMenu';
import { getAILanguageByCode } from '@/data/languages';
import {
  Send, Loader2, Upload, CheckCircle2, ExternalLink,
  Package, XCircle, Zap, HelpCircle, Store, Settings, Globe, Layers,
  ArrowLeft, ArrowRight, Eye, ClipboardList
} from 'lucide-react';

const initialForm: ProductFormData = {
  title: '',
  description: '',
  price: 0,
  compareAtPrice: null,
  cost: null,
  sizes: [],
  collection: '',
  imagePrompt: '',
  variants: [],
  inventoryPolicy: 'continue',
  requiresShipping: true,
  weight: 0,
  weightUnit: 'kg',
  countryOfOrigin: '',
  selectedChannels: [],
  tags: '',
};

const PUBLISH_STEPS = [
  'Criando produto...',
  'Buscando localizações...',
  'Configurando estoque...',
  'Definindo custos...',
  'Adicionando à coleção...',
  'Publicando nos canais...',
  'Finalizando...',
];

const Index = () => {
  const {
    stores, activeStore, activeStoreId, hasConnectedStore, publishedCount,
    setActiveStore, addStore, removeStore, setDefault, startOAuth, incrementPublished,
    connectStoreWithMarket, updateStoreMarket,
  } = useStoreContext();

  const { groups, addGroup, updateGroup, removeGroup } = useRegionGroups();
  const baseCurrency = activeStore?.marketConfig?.currency || 'USD';
  const { convert } = useExchangeRates(baseCurrency);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [showManagement, setShowManagement] = useState(false);
  const [showRegions, setShowRegions] = useState(false);
  const [showGlobalPublish, setShowGlobalPublish] = useState(false);
  const [currentView, setCurrentView] = useState<DashboardView>('publish');
  const [form, setForm] = useState<ProductFormData>(initialForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState(0);
  const [publishResult, setPublishResult] = useState<{ title: string; shopifyUrl: string; imageUrl?: string } | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currencySymbol = activeStore?.marketConfig?.currencySymbol || 'R$';

  // Sync variants from sizes
  const syncVariantsFromSizes = (sizes: ProductSize[]) => {
    const existing = form.variants;
    const newVariants: VariantData[] = sizes.map(size => {
      const ex = existing.find(v => v.name === size);
      return ex || {
        id: crypto.randomUUID(),
        name: size,
        price: form.price,
        compareAtPrice: form.compareAtPrice,
        cost: form.cost,
        sku: '',
        stock: 0,
        requiresShipping: form.requiresShipping,
        weight: form.weight,
        weightUnit: form.weightUnit,
      };
    });
    return newVariants;
  };

  const toggleSize = (size: ProductSize) => {
    const newSizes = form.sizes.includes(size)
      ? form.sizes.filter(s => s !== size)
      : [...form.sizes, size];
    const newVariants = syncVariantsFromSizes(newSizes);
    setForm(prev => ({ ...prev, sizes: newSizes, variants: newVariants }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) { toast.error('Formato inválido. Use PNG, JPG ou WEBP.'); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null); setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handlePublish = async () => {
    if (!imageFile || !activeStore) return;
    if (!form.title.trim()) { toast.error('Informe o título do produto.'); return; }

    if (stores.filter(s => s.connected).length > 1) { setShowGlobalPublish(true); return; }

    setIsPublishing(true);
    setPublishResult(null);
    setPublishStep(0);

    try {
      const imageBase64 = await fileToBase64(imageFile);
      const mc = activeStore?.marketConfig;

      // Simulate step progress
      const stepInterval = setInterval(() => {
        setPublishStep(prev => Math.min(prev + 1, PUBLISH_STEPS.length - 1));
      }, 1500);

      const { data, error } = await supabase.functions.invoke('shopify-publish', {
        body: {
          title: form.title,
          description: form.description,
          price: form.price,
          compareAtPrice: form.compareAtPrice,
          cost: form.cost,
          sizes: form.sizes,
          collection: form.collection,
          tags: form.tags,
          imageBase64,
          imageName: imageFile.name,
          variants: form.variants,
          inventoryPolicy: form.inventoryPolicy,
          requiresShipping: form.requiresShipping,
          weight: form.weight,
          weightUnit: form.weightUnit,
          countryOfOrigin: form.countryOfOrigin,
          selectedChannels: form.selectedChannels,
          countryCode: mc?.countryCode || null,
          countryFlag: mc?.countryFlag || null,
          countryName: mc?.countryName || null,
          currency: mc?.currency || null,
          currencySymbol: mc?.currencySymbol || null,
          localPrice: form.price,
          baseCurrency: mc?.currency || 'BRL',
          language: mc?.language || null,
          languageLabel: activeStoreLang?.label || null,
          marketName: mc?.marketName || null,
        },
      });

      clearInterval(stepInterval);
      setPublishStep(PUBLISH_STEPS.length - 1);

      if (error || data?.error) throw new Error(data?.error || error?.message || 'Erro ao publicar');

      incrementPublished();
      setPublishResult({ title: data.title, shopifyUrl: data.shopifyUrl, imageUrl: data.imageUrl });
      toast.success(`Produto publicado em ${activeStore.domain}!`);
    } catch (err: any) {
      console.error('Publish error:', err);
      toast.error(err.message || 'Erro ao publicar produto.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishToStore = async (store: ShopifyStore): Promise<boolean> => {
    if (!imageFile || !store.accessToken) return false;
    try {
      const imageBase64 = await fileToBase64(imageFile);
      const { data, error } = await supabase.functions.invoke('shopify-publish', {
        body: { title: form.title, description: form.description, price: form.price, sizes: form.sizes, collection: form.collection, imageBase64, imageName: imageFile.name, variants: form.variants, inventoryPolicy: form.inventoryPolicy },
      });
      if (error || data?.error) return false;
      incrementPublished();
      return true;
    } catch { return false; }
  };

  const handleNewProduct = () => {
    setForm(initialForm); setImageFile(null); setImagePreview(null); setGeneratedImages([]); setPublishResult(null); setWizardStep(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddStore = () => { stores.length > 0 ? setShowConnect(true) : setShowOnboarding(true); };

  const handleCredentialsSubmit = (data: { domain: string; clientId: string; clientSecret: string; apiVersion: string; redirectUri: string; }) => {
    const store = addStore(data); setShowSettings(false); startOAuth(store);
  };

  const handleStoreConnected = (shopName: string, storeDomain: string, marketConfig?: MarketConfig) => {
    if (marketConfig) {
      const store = stores.find(s => s.domain === storeDomain);
      if (store) connectStoreWithMarket(store.id, store.accessToken || '', marketConfig);
    }
    setShowConnect(false);
  };

  const handleReconnect = (store: ShopifyStore) => { setShowManagement(false); startOAuth(store); };

  const handleViewChange = (view: DashboardView) => {
    if (view === 'regions') { setShowRegions(true); return; }
    setCurrentView(view);
  };

  const activeStoreLang = activeStore?.marketConfig?.language ? getAILanguageByCode(activeStore.marketConfig.language) : null;
  const canPublish = getCanPublish(form, !!imageFile);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] sticky top-0 z-10 h-[52px]">
        <div className="w-full h-full px-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-base font-semibold text-[hsl(var(--info))] flex items-center gap-1.5">
              <Zap className="w-4.5 h-4.5" />Publify
            </h1>
            <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border border-[hsl(var(--info)/0.3)] bg-[hsl(var(--sidebar-primary)/0.15)] text-[hsl(var(--info))]">
              beta
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {publishedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[hsl(var(--sidebar-primary)/0.1)] text-[hsl(var(--info))]">
                <Zap className="w-3 h-3" />{publishedCount} publicações
              </span>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[hsl(var(--sidebar-foreground))] hover:text-foreground" onClick={() => setShowOnboarding(true)} title="Como funciona?"><HelpCircle className="w-4 h-4" /></Button>
            {stores.length > 0 && <Button variant="ghost" size="icon" className="h-8 w-8 text-[hsl(var(--sidebar-foreground))] hover:text-foreground" onClick={() => setShowManagement(true)} title="Gerenciar lojas"><Settings className="w-4 h-4" /></Button>}
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Dialogs */}
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} onSaveAndConnect={handleCredentialsSubmit} />
      <OnboardingGuide open={showOnboarding} onOpenChange={setShowOnboarding} onConfigureCredentials={() => { setShowOnboarding(false); setShowConnect(true); }} />
      <ShopifyConnectDialog open={showConnect} onOpenChange={setShowConnect} onConnected={handleStoreConnected} onOpenOnboarding={() => { setShowConnect(false); setShowOnboarding(true); }} />
      <StoreManagementDialog open={showManagement} onOpenChange={setShowManagement} stores={stores} onRemove={removeStore} onReconnect={handleReconnect} onSetDefault={setDefault} onUpdateMarket={updateStoreMarket} />
      <RegionGroupManager open={showRegions} onOpenChange={setShowRegions} groups={groups} stores={stores} onAddGroup={addGroup} onUpdateGroup={updateGroup} onRemoveGroup={removeGroup} />
      <GlobalPublishFlow open={showGlobalPublish} onOpenChange={setShowGlobalPublish} stores={stores} groups={groups} activeStore={activeStore} basePrice={form.price} productTitle={form.title} convert={convert} onPublish={handlePublishToStore} />

      {/* DASHBOARD — always show after login */}
      <div className="flex-1 flex">
        <DashboardSidebar stores={stores} activeStoreId={activeStore?.id || null} onSelectStore={setActiveStore} onAddStore={handleAddStore} currentView={currentView} onViewChange={handleViewChange} />

          <main className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto px-5 py-4">

              {/* PUBLISH VIEW */}
              {currentView === 'publish' && !publishResult && !isPublishing && !hasConnectedStore && (
                <div className="animate-fade-in py-10">
                  <div className="glass-card p-10 text-center max-w-lg mx-auto">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                      <Zap className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="font-display text-2xl font-bold text-foreground mb-2">Conecte sua loja</h2>
                    <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">Conecte uma loja Shopify para começar a publicar produtos.</p>
                    <Button onClick={handleAddStore} size="lg" className="w-full font-display font-semibold text-base mb-4">
                      <Globe className="w-4 h-4 mr-2" />Conectar ao Shopify
                    </Button>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-secondary/40"><span className="text-base">🌍</span><span className="text-[11px] text-muted-foreground font-medium">195 países</span></div>
                      <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-secondary/40"><span className="text-base">🏪</span><span className="text-[11px] text-muted-foreground font-medium">Múltiplas lojas</span></div>
                      <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-secondary/40"><span className="text-base">💱</span><span className="text-[11px] text-muted-foreground font-medium">Câmbio automático</span></div>
                    </div>
                  </div>
                </div>
              )}

              {currentView === 'publish' && !publishResult && !isPublishing && hasConnectedStore && (
                <div className="animate-fade-in">
                  <div className="mb-3">
                    <h2 className="font-display text-xl font-bold text-foreground">Publicar Produto</h2>
                    <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1.5">
                      Publicando em{' '}
                      {activeStore?.marketConfig?.countryFlag && <span className="text-sm">{activeStore.marketConfig.countryFlag}</span>}
                      <span className="text-primary font-medium">{activeStore?.marketConfig?.marketName || activeStore?.domain}</span>
                      {activeStoreLang && <span className="text-muted-foreground">• {activeStoreLang.flag} {activeStoreLang.label}</span>}
                    </p>
                  </div>

                  {/* Wizard steps indicator */}
                  <div className="flex items-center gap-1.5 mb-3">
                    {[1, 2, 3, 4].map(step => (
                      <button
                        key={step}
                        onClick={() => setWizardStep(step)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-md text-[12px] font-medium transition-all ${
                          wizardStep === step ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px]">{step}</span>
                        {step === 1 && 'Imagem'}
                        {step === 2 && 'Detalhes'}
                        {step === 3 && 'Variantes & Envio'}
                        {step === 4 && 'Revisão'}
                      </button>
                    ))}
                  </div>

                  {/* STEP 1: AI Image Generation */}
                  {wizardStep === 1 && (
                    <ImageGenerationStep
                      images={generatedImages}
                      onImagesChange={(imgs) => {
                        setGeneratedImages(imgs);
                        // Set the cover image as the main imagePreview for publishing
                        const cover = imgs.find(i => i.isCover) || imgs[0];
                        if (cover) {
                          setImagePreview(cover.url);
                          // Create a File from the base64 if needed for publishing
                          if (cover.url.startsWith('data:')) {
                            fetch(cover.url).then(r => r.blob()).then(blob => {
                              const file = new File([blob], 'product-image.png', { type: 'image/png' });
                              setImageFile(file);
                            });
                          }
                        }
                      }}
                      onNext={() => setWizardStep(2)}
                      onSkip={() => setWizardStep(2)}
                    />
                  )}

                  {/* STEP 2: Details */}
                  {wizardStep === 2 && (
                    <div className="space-y-6">
                      <div className="glass-card p-6 space-y-5">
                        <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">Detalhes do Produto</h3>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Título *</Label>
                          <Input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value.slice(0, 255) }))} placeholder="Ex: Camiseta Urban Flow" className="mt-1.5 bg-secondary border-border" maxLength={255} />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
                          <div className="mt-1.5">
                            <RichTextEditor content={form.description} onChange={html => setForm(prev => ({ ...prev, description: html }))} placeholder="Descreva o produto..." />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Coleção</Label>
                            <Select value={form.collection} onValueChange={v => setForm(prev => ({ ...prev, collection: v }))}>
                              <SelectTrigger className="mt-1.5 bg-secondary border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>{COLLECTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Tags</Label>
                            <Input value={form.tags} onChange={e => setForm(prev => ({ ...prev, tags: e.target.value }))} placeholder="streetwear, summer" className="mt-1.5 bg-secondary border-border" />
                          </div>
                        </div>
                      </div>

                      {/* Price section */}
                      <div className="glass-card p-6">
                        <h3 className="font-display font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Preços</h3>
                        <PriceSection
                          price={form.price}
                          compareAtPrice={form.compareAtPrice}
                          cost={form.cost}
                          currencySymbol={currencySymbol}
                          onPriceChange={v => setForm(prev => ({ ...prev, price: v }))}
                          onCompareAtPriceChange={v => setForm(prev => ({ ...prev, compareAtPrice: v }))}
                          onCostChange={v => setForm(prev => ({ ...prev, cost: v }))}
                        />
                      </div>

                      {/* Sales Channels */}
                      <div className="glass-card p-6">
                        <SalesChannels selectedChannels={form.selectedChannels} onChannelsChange={c => setForm(prev => ({ ...prev, selectedChannels: c }))} />
                      </div>

                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setWizardStep(1)}><ArrowLeft className="w-4 h-4 mr-1" />Voltar</Button>
                        <Button onClick={() => setWizardStep(3)}><ArrowRight className="w-4 h-4 mr-1" />Próximo</Button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Variants & Shipping */}
                  {wizardStep === 3 && (
                    <div className="space-y-6">
                      <div className="glass-card p-6 space-y-5">
                        <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">Tamanhos / Variantes</h3>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Tamanhos</Label>
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            {AVAILABLE_SIZES.map(size => (
                              <button key={size} type="button" onClick={() => toggleSize(size)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${form.sizes.includes(size) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>{size}</button>
                            ))}
                          </div>
                        </div>

                        <VariantsTable
                          variants={form.variants}
                          onChange={v => setForm(prev => ({ ...prev, variants: v }))}
                          inventoryPolicy={form.inventoryPolicy}
                          onInventoryPolicyChange={p => setForm(prev => ({ ...prev, inventoryPolicy: p }))}
                          productType={form.collection || form.title}
                          currencySymbol={currencySymbol}
                        />
                      </div>

                      <ShippingCard
                        requiresShipping={form.requiresShipping}
                        onRequiresShippingChange={v => setForm(prev => ({ ...prev, requiresShipping: v }))}
                        weight={form.weight}
                        onWeightChange={v => setForm(prev => ({ ...prev, weight: v }))}
                        weightUnit={form.weightUnit}
                        onWeightUnitChange={v => setForm(prev => ({ ...prev, weightUnit: v }))}
                        countryOfOrigin={form.countryOfOrigin}
                        onCountryOfOriginChange={v => setForm(prev => ({ ...prev, countryOfOrigin: v }))}
                      />

                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setWizardStep(2)}><ArrowLeft className="w-4 h-4 mr-1" />Voltar</Button>
                        <Button onClick={() => setWizardStep(4)}><Eye className="w-4 h-4 mr-1" />Revisar</Button>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Review */}
                  {wizardStep === 4 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
                        {/* LEFT — Checklist + Publish */}
                        <div className="space-y-4">
                          <div className="glass-card p-5">
                            <ReviewChecklist form={form} hasImage={!!imageFile || generatedImages.some(i => i.url)} />
                          </div>
                          <div className="glass-card p-5 space-y-3">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Publicação</h4>
                            {form.selectedChannels.length > 0 && (
                              <p className="text-xs text-muted-foreground">Canais: {form.selectedChannels.length} selecionado{form.selectedChannels.length !== 1 ? 's' : ''}</p>
                            )}
                            <Button onClick={handlePublish} disabled={!canPublish} size="lg" className="w-full font-display font-semibold">
                              <Zap className="w-4 h-4 mr-2" />
                              Publicar agora
                            </Button>
                          </div>
                          <Button variant="outline" onClick={() => setWizardStep(3)} className="w-full"><ArrowLeft className="w-4 h-4 mr-1" />Voltar</Button>
                        </div>

                        {/* RIGHT — Shopify Preview */}
                        <ShopifyProductPreview
                          form={form}
                          images={generatedImages}
                          imagePreview={imagePreview}
                          storeDomain={activeStore?.domain || ''}
                          currencySymbol={currencySymbol}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PUBLISHING PROGRESS */}
              {currentView === 'publish' && isPublishing && (
                <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
                  <div className="glass-card p-10 text-center max-w-md w-full">
                    <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-6" />
                    <h2 className="font-display text-xl font-bold text-foreground mb-2">Publicando no Shopify</h2>
                    <p className="text-sm text-muted-foreground mb-4">{PUBLISH_STEPS[publishStep]} ({publishStep + 1}/{PUBLISH_STEPS.length})</p>
                    <Progress value={((publishStep + 1) / PUBLISH_STEPS.length) * 100} className="h-2" />
                  </div>
                </div>
              )}

              {/* PUBLISH SUCCESS */}
              {currentView === 'publish' && publishResult && !isPublishing && (
                <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
                  <div className="glass-card p-10 text-center max-w-md w-full">
                    <div className="w-20 h-20 mx-auto rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center mb-6 animate-bounce">
                      <CheckCircle2 className="w-10 h-10 text-[hsl(var(--success))]" />
                    </div>
                    <h2 className="font-display text-2xl font-bold text-foreground mb-2">Produto Publicado!</h2>

                    {publishResult.imageUrl && (
                      <img src={publishResult.imageUrl} alt={publishResult.title} className="w-24 h-24 mx-auto rounded-lg border border-border object-cover my-4" />
                    )}

                    <p className="text-foreground font-semibold text-lg">{publishResult.title}</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <span className="text-primary font-bold">{currencySymbol}{form.price.toFixed(2)}</span>
                      {form.compareAtPrice && form.compareAtPrice > form.price && (
                        <Badge className="bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30">
                          {Math.round(((form.compareAtPrice - form.price) / form.compareAtPrice) * 100)}% off
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 mt-6">
                      <Button asChild>
                        <a href={publishResult.shopifyUrl} target="_blank" rel="noopener noreferrer">
                          Ver produto no Shopify <ExternalLink className="w-4 h-4 ml-1" />
                        </a>
                      </Button>
                      <Button variant="secondary" onClick={handleNewProduct}>
                        <Package className="w-4 h-4 mr-2" />Publicar outro produto
                      </Button>
                      <Button variant="ghost" onClick={() => { setPublishResult(null); setCurrentView('history'); }}>
                        <ClipboardList className="w-4 h-4 mr-2" />Ver histórico
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* HISTORY VIEW */}
              {currentView === 'history' && <ProductHistory />}

              {/* STORES VIEW */}
              {currentView === 'stores' && (
                <div className="animate-fade-in">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-foreground">Lojas</h2>
                      <p className="text-muted-foreground text-sm mt-1">Gerencie suas lojas conectadas.</p>
                    </div>
                    <Button onClick={handleAddStore} size="sm" variant="secondary" className="font-display font-medium">
                      <Globe className="w-3.5 h-3.5 mr-1.5" />Adicionar loja
                    </Button>
                  </div>
                  {stores.length === 0 ? (
                    <div className="glass-card p-10 text-center">
                      <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-sm">Nenhuma loja conectada.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {stores.map(store => {
                        const lang = store.marketConfig?.language ? getAILanguageByCode(store.marketConfig.language) : null;
                        return (
                          <div key={store.id} className="glass-card p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-2xl flex-shrink-0">{store.marketConfig?.countryFlag || '🏪'}</span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-foreground truncate">{store.marketConfig?.marketName || store.domain}</span>
                                  {store.isDefault && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Padrão</Badge>}
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${store.connected ? 'bg-[hsl(var(--success))]' : 'bg-muted-foreground'}`} />
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{store.domain}</span>
                                  {store.marketConfig?.currency && <><span>•</span><span>{store.marketConfig.currency}</span></>}
                                  {lang && <><span>•</span><span>{lang.flag} {lang.label}</span></>}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {!store.connected && <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => handleReconnect(store)}>Reconectar</Button>}
                              <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => { removeStore(store.id); toast.success('Loja removida.'); }}>Remover</Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {groups.length > 0 && (
                    <div className="mt-8">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2"><Layers className="w-4 h-4" />Grupos de Região</h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowRegions(true)}>Gerenciar</Button>
                      </div>
                      <div className="space-y-2">
                        {groups.map(group => (
                          <div key={group.id} className="glass-card p-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-foreground">{group.name}</p>
                              <p className="text-xs text-muted-foreground">{stores.filter(s => group.storeIds.includes(s.id)).map(s => s.marketConfig?.countryFlag || '🏪').join(' ')} • {group.storeIds.length} loja{group.storeIds.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SETTINGS VIEW */}
              {currentView === 'settings' && (
                <div className="animate-fade-in">
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">Configurações</h2>
                  <p className="text-muted-foreground text-sm mb-6">Preferências do aplicativo.</p>
                  <div className="glass-card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-medium text-foreground">Versão</p><p className="text-xs text-muted-foreground">Publify Beta v0.3.0</p></div>
                    </div>
                    <div className="border-t border-border/50 pt-4 flex items-center justify-between">
                      <div><p className="text-sm font-medium text-foreground">Lojas conectadas</p><p className="text-xs text-muted-foreground">{stores.filter(s => s.connected).length} ativa{stores.filter(s => s.connected).length !== 1 ? 's' : ''}</p></div>
                      <Button variant="secondary" size="sm" onClick={() => setCurrentView('stores')} className="font-display text-xs">Gerenciar</Button>
                    </div>
                    <div className="border-t border-border/50 pt-4 flex items-center justify-between">
                      <div><p className="text-sm font-medium text-foreground">Produtos publicados</p><p className="text-xs text-muted-foreground">{publishedCount} produto{publishedCount !== 1 ? 's' : ''}</p></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
    </div>
  );
};

export default Index;
