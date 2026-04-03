import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageGenerationStep, GeneratedImage, ImageAngle } from '@/components/ImageGenerationStep';
import { useProject } from '@/hooks/useProject';
import { SaveStatusIndicator } from '@/components/SaveStatusIndicator';
import { ProductFormData, ProductSize, ProductGender, AVAILABLE_SIZES, COLLECTIONS, VariantData, WeightUnit } from '@/types/product';
import { useProductUnderstanding } from '@/hooks/useProductUnderstanding';
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
import { ImageOptimizationCard, ImageQualityPreset, getQualityValue } from '@/components/ImageOptimizationCard';
import { convertBase64ToWebP } from '@/lib/imageOptimization';
import { ShopifyProductPreview } from '@/components/ShopifyProductPreview';
import { SEOCard } from '@/components/SEOCard';
import { ColorManager, ProductColor } from '@/components/ColorManager';
import { AIFieldButtons } from '@/components/AIFieldButtons';
import { AIUnderstandingCard } from '@/components/AIUnderstandingCard';
import { buildProductAIContext } from '@/types/productUnderstanding';
import { ProductTypeCombobox } from '@/components/ProductTypeCombobox';
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
  ArrowLeft, ArrowRight, Eye, ClipboardList, Check, ChevronDown
} from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  selectedChannels: ['online'],
  tags: '',
  productType: '',
  gender: '',
};

const PUBLISH_STEPS = [
  'Otimizando imagens...',
  'Criando produto...',
  'Buscando localizações...',
  'Configurando estoque...',
  'Definindo custos...',
  'Adicionando à coleção...',
  'Publicando nos canais...',
  'Finalizando...',
];

const STEP_LABELS = ['Imagem', 'Detalhes', 'Variantes & Envio', 'Revisão'];

const Index = () => {
  const navigate = useNavigate();
  const {
    stores, activeStore, activeStoreId, hasConnectedStore, publishedCount,
    setActiveStore, addStore, removeStore, setDefault, startOAuth, incrementPublished,
    connectStoreWithMarket, updateStoreMarket,
  } = useStoreContext();

  const { groups, addGroup, updateGroup, removeGroup } = useRegionGroups();
  const baseCurrency = activeStore?.marketConfig?.currency || 'USD';
  const { convert } = useExchangeRates(baseCurrency);

  // ─── Project persistence ─────────────────────────────────
  const {
    project, isLoading: isProjectLoading, saveStatus,
    updateProductData, updateAIData, updateSEOData, updateStep,
    updateProject, addImage, removeImage: removeProjectImage,
    publishProject, createNewProject,
  } = useProject();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [showManagement, setShowManagement] = useState(false);
  const [showRegions, setShowRegions] = useState(false);
  const [showGlobalPublish, setShowGlobalPublish] = useState(false);
  const [currentView, setCurrentView] = useState<DashboardView>('publish');
  const [form, setForm] = useState<ProductFormData>(initialForm);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState(0);
  const [imageUploadProgress, setImageUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [publishResult, setPublishResult] = useState<{ title: string; shopifyUrl: string; imageUrl?: string } | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [publishStatus, setPublishStatus] = useState<'draft' | 'active' | 'scheduled'>('active');
  const [pubOpen, setPubOpen] = useState(false);
  const [copyTone, setCopyTone] = useState<'minimal' | 'bold' | 'casual' | 'editorial'>('minimal');
  const [usedTitleNames, setUsedTitleNames] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectRestoredRef = useRef(false);

  // Product understanding engine
  const {
    understanding, isAnalyzing, setManualProductType, setManualField,
    analyzeImage, updateFinalFromTitle, reset: resetUnderstanding,
  } = useProductUnderstanding();

  // ─── Restore project state on load ────────────────────────
  useEffect(() => {
    if (!project || projectRestoredRef.current) return;
    projectRestoredRef.current = true;

    const pd = project.productData;
    setForm({
      title: pd.title || '',
      description: pd.description || '',
      price: pd.price || 0,
      compareAtPrice: pd.compareAtPrice ?? null,
      cost: pd.cost ?? null,
      sizes: (pd.sizes || []) as ProductSize[],
      collection: pd.collection || '',
      imagePrompt: pd.imagePrompt || '',
      variants: pd.variants || [],
      inventoryPolicy: (pd.inventoryPolicy || 'continue') as any,
      requiresShipping: pd.requiresShipping ?? true,
      weight: pd.weight || 0,
      weightUnit: (pd.weightUnit || 'kg') as any,
      countryOfOrigin: pd.countryOfOrigin || '',
      selectedChannels: pd.selectedChannels || ['online'],
      tags: pd.tags || '',
      productType: pd.productType || '',
      gender: (pd.gender || '') as ProductGender,
    });

    setSeoTitle(project.seoData?.seoTitle || '');
    setSeoDescription(project.seoData?.seoDescription || '');
    setWizardStep(project.step || 1);

    // Restore images
    if (project.images && project.images.length > 0) {
      const restored: GeneratedImage[] = project.images.map(img => ({
        id: img.id || crypto.randomUUID(),
        url: img.url,
        isCover: img.isCover,
        angle: 'frente' as ImageAngle,
      }));
      setGeneratedImages(restored);
      const cover = restored.find(i => i.isCover) || restored[0];
      if (cover) setImagePreview(cover.url);
    }
  }, [project]);

  // ─── Sync form changes to project (autosave) ─────────────
  const syncFormToProject = useCallback((updatedForm: ProductFormData) => {
    updateProductData({
      title: updatedForm.title,
      description: updatedForm.description,
      price: updatedForm.price,
      compareAtPrice: updatedForm.compareAtPrice,
      cost: updatedForm.cost,
      sizes: updatedForm.sizes,
      collection: updatedForm.collection,
      imagePrompt: updatedForm.imagePrompt,
      variants: updatedForm.variants,
      inventoryPolicy: updatedForm.inventoryPolicy,
      requiresShipping: updatedForm.requiresShipping,
      weight: updatedForm.weight,
      weightUnit: updatedForm.weightUnit,
      countryOfOrigin: updatedForm.countryOfOrigin,
      selectedChannels: updatedForm.selectedChannels,
      tags: updatedForm.tags,
      productType: updatedForm.productType,
      gender: updatedForm.gender,
    });
  }, [updateProductData]);

  // Wrap setForm to also trigger autosave
  const setFormWithSave = useCallback((updater: ProductFormData | ((prev: ProductFormData) => ProductFormData)) => {
    setForm(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncFormToProject(next);
      return next;
    });
  }, [syncFormToProject]);

  // Wrap SEO setters
  const setSeoTitleWithSave = useCallback((v: string) => {
    setSeoTitle(v);
    updateSEOData({ seoTitle: v });
  }, [updateSEOData]);

  const setSeoDescriptionWithSave = useCallback((v: string) => {
    setSeoDescription(v);
    updateSEOData({ seoDescription: v });
  }, [updateSEOData]);

  // Image optimization state
  const [optimizeImages, setOptimizeImages] = useState(false);
  const [imageQualityPreset, setImageQualityPreset] = useState<ImageQualityPreset>('balanced');

  const currencySymbol = activeStore?.marketConfig?.currencySymbol || 'R$';

  const markStepComplete = (step: number) => {
    setCompletedSteps(prev => new Set([...prev, step]));
  };

  const goToStep = (step: number) => {
    if (step < wizardStep) {
      setWizardStep(step);
      updateStep(step);
    } else if (step === wizardStep + 1 || completedSteps.has(step - 1)) {
      markStepComplete(wizardStep);
      setWizardStep(step);
      updateStep(step);
    }
  };

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
    setFormWithSave(prev => ({ ...prev, sizes: newSizes, variants: newVariants }));
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
    if (!activeStore) return;
    // Support both uploaded file and AI-generated images
    const coverImage = generatedImages.find(i => i.url);
    if (!imageFile && !coverImage) { toast.error('Adicione pelo menos 1 imagem.'); return; }
    if (!form.title.trim()) { toast.error('Informe o título do produto.'); return; }

    if (stores.filter(s => s.connected).length > 1) { setShowGlobalPublish(true); return; }

    setIsPublishing(true);
    setPublishResult(null);
    setPublishStep(0);

    try {
      let imageBase64: string;
      let imageName: string;

      if (imageFile) {
        imageBase64 = await fileToBase64(imageFile);
        imageName = imageFile.name;
      } else {
        // Fetch generated image and convert to base64
        const response = await fetch(coverImage!.url);
        const blob = await response.blob();
        const reader = new FileReader();
        imageBase64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1] || (reader.result as string));
          reader.readAsDataURL(blob);
        });
        // Remove data:image/...;base64, prefix if present
        if (imageBase64.includes(',')) imageBase64 = imageBase64.split(',')[1];
        imageName = `product-image-${Date.now()}.png`;
      }

      // Build additional images array from all generated images (excluding cover if already used)
      const additionalImages: { imageBase64: string; imageName: string }[] = [];
      const coverUrl = coverImage?.url;
      for (const img of generatedImages) {
        if (!img.url) continue;
        // Skip the cover image if it was already used as main
        if (!imageFile && img.url === coverUrl) continue;
        try {
          const resp = await fetch(img.url);
          const blob = await resp.blob();
          const reader = new FileReader();
          let b64 = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          if (b64.includes(',')) b64 = b64.split(',')[1];
          additionalImages.push({ imageBase64: b64, imageName: `product-${img.angle || 'image'}-${Date.now()}.png` });
        } catch (err) {
          console.warn(`[Publish] Failed to fetch generated image:`, err);
        }
      }
      const mc = activeStore?.marketConfig;

      // --- Image optimization step (client-side WebP conversion) ---
      if (optimizeImages) {
        setPublishStep(0); // "Otimizando imagens..."
        try {
          const quality = getQualityValue(imageQualityPreset);
          const mimeType = imageFile?.type || 'image/png';
          const result = await convertBase64ToWebP(imageBase64, mimeType, quality);
          if (result.converted) {
            imageBase64 = result.base64;
            imageName = result.fileName;
            console.log(`[ImageOptimization] Converted to WebP: ${result.originalSize}→${result.optimizedSize} bytes`);
          }
        } catch (err) {
          // Safe fallback: continue with original image
          console.warn('[ImageOptimization] Optimization failed, using original:', err);
        }
      }

      const stepInterval = setInterval(() => {
        setPublishStep(prev => Math.min(prev + 1, PUBLISH_STEPS.length - 1));
      }, 1500);

      // Start from step 1 (past optimization) if optimization was done
      if (optimizeImages) setPublishStep(1);

      // Build color image map: fetch color images and convert to base64
      const colorImages: { variantName: string; imageBase64: string; imageName: string }[] = [];
      for (const color of colors) {
        if (color.imageUrl) {
          try {
            const resp = await fetch(color.imageUrl);
            const blob = await resp.blob();
            const reader = new FileReader();
            let b64 = await new Promise<string>((resolve) => {
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            if (b64.includes(',')) b64 = b64.split(',')[1];
            colorImages.push({ variantName: color.name, imageBase64: b64, imageName: `variant-${color.name}-${Date.now()}.png` });
          } catch (err) {
            console.warn(`[Publish] Failed to fetch color image for ${color.name}:`, err);
          }
        }
      }

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
          imageName,
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
          colorImages,
          additionalImages,
        },
      });

      clearInterval(stepInterval);
      setPublishStep(PUBLISH_STEPS.length - 1);

      if (error || data?.error) throw new Error(data?.error || error?.message || 'Erro ao publicar');

      incrementPublished();
      setPublishResult({ title: data.title, shopifyUrl: data.shopifyUrl, imageUrl: data.imageUrl });
      toast.success(`Produto publicado em ${activeStore.domain}!`);
      // Mark project as published
      publishProject();
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

  const handleNewProduct = async () => {
    setForm(initialForm); setImageFile(null); setImagePreview(null); setGeneratedImages([]); setPublishResult(null); setWizardStep(1); setCompletedSteps(new Set()); setColors([]); setSeoTitle(''); setSeoDescription(''); setOptimizeImages(false); setImageQualityPreset('balanced'); resetUnderstanding(); setUsedTitleNames([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    projectRestoredRef.current = false;
    await createNewProject();
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
    if (view === 'prompts') { navigate('/prompts'); return; }
    setCurrentView(view);
  };

  const activeStoreLang = activeStore?.marketConfig?.language ? getAILanguageByCode(activeStore.marketConfig.language) : null;
  const aiContext = useMemo(() => buildProductAIContext(understanding, form.gender, form.tags, activeStoreLang?.label || 'English'), [understanding, form.gender, form.tags, activeStoreLang]);
  const canPublish = getCanPublish(form, !!imageFile || generatedImages.some(i => i.url));

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
            <SaveStatusIndicator status={saveStatus} />
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

      {/* DASHBOARD */}
      <div className="flex-1 flex">
        <DashboardSidebar stores={stores} activeStoreId={activeStore?.id || null} onSelectStore={setActiveStore} onAddStore={handleAddStore} currentView={currentView} onViewChange={handleViewChange} />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-3">

            {/* PUBLISH VIEW — No store connected */}
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

            {/* PUBLISH VIEW — With store */}
            {currentView === 'publish' && !publishResult && !isPublishing && hasConnectedStore && (
              <div className="animate-fade-in flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>
                <div className="mb-2">
                  <h2 className="font-display text-lg font-bold text-foreground leading-tight">Publicar Produto</h2>
                </div>

                {/* Step tabs with completion states */}
                <div className="flex items-center gap-1.5 mb-3">
                  {[1, 2, 3, 4].map(step => {
                    const isCompleted = completedSteps.has(step);
                    const isCurrent = wizardStep === step;
                    const isFuture = step > wizardStep && !isCompleted;

                    return (
                      <button
                        key={step}
                        onClick={() => goToStep(step)}
                        disabled={isFuture && !completedSteps.has(step - 1)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium transition-all ${
                          isCurrent
                            ? 'bg-primary text-primary-foreground'
                            : isCompleted
                              ? 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.3)]'
                              : 'bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed'
                        }`}
                      >
                        {isCompleted && !isCurrent ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px]">{step}</span>
                        )}
                        {STEP_LABELS[step - 1]}
                      </button>
                    );
                  })}
                </div>

                {/* Step content */}
                <div className="flex-1">
                  {/* ═══ STEP 1: IMAGE ═══ */}
                  {wizardStep === 1 && (
                    <ImageGenerationStep
                      images={generatedImages}
                      onImagesChange={(imgs) => {
                        setGeneratedImages(imgs);
                        const cover = imgs.find(i => i.isCover) || imgs[0];
                        if (cover) {
                          setImagePreview(cover.url);
                          // Trigger image analysis for product understanding
                          if (cover.url && !cover.url.startsWith('data:')) {
                            analyzeImage(cover.url);
                            // Save image to project
                            if (project) {
                              addImage(cover.url, null, true);
                            }
                          }
                          if (cover.url.startsWith('data:')) {
                            fetch(cover.url).then(r => r.blob()).then(blob => {
                              const file = new File([blob], 'product-image.png', { type: 'image/png' });
                              setImageFile(file);
                            });
                          }
                        }
                      }}
                      onNext={() => { markStepComplete(1); setWizardStep(2); updateStep(2); }}
                      onSkip={() => { markStepComplete(1); setWizardStep(2); updateStep(2); }}
                    />
                  )}

                  {/* ═══ STEP 2: DETAILS ═══ */}
                  {wizardStep === 2 && (
                    <div className="grid grid-cols-[260px_1fr] gap-3">
                      {/* LEFT — SEO (secondary) */}
                      <SEOCard
                        title={seoTitle}
                        description={seoDescription}
                        storeDomain={activeStore?.domain || ''}
                        productTitle={form.title}
                        onTitleChange={setSeoTitleWithSave}
                        onDescriptionChange={setSeoDescriptionWithSave}
                        compact
                        language={activeStoreLang?.label || 'English'}
                        languageCode={activeStore?.marketConfig?.language || 'en-US'}
                        countryName={activeStore?.marketConfig?.marketName || ''}
                        productContext={aiContext}
                      />

                      {/* RIGHT — Product Details (main) */}
                      <div className="glass-card p-5 space-y-4">
                        <div>
                          <h3 className="font-display font-semibold text-[13px] text-foreground">Detalhes do produto</h3>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs font-medium text-muted-foreground">Título *</Label>
                            <AIFieldButtons
                              type="title"
                              brief={understanding.finalProductType || form.productType || form.description || form.title || ''}
                              language={activeStoreLang?.label || 'English'}
                              languageCode={activeStore?.marketConfig?.language || 'en-US'}
                              countryName={activeStore?.marketConfig?.marketName || ''}
                              countryFlag={activeStore?.marketConfig?.countryFlag || ''}
                              currentValue={form.title}
                              onGenerated={content => {
                                const clean = content.slice(0, 255);
                                setFormWithSave(prev => ({ ...prev, title: clean }));
                                setUsedTitleNames(prev => [...prev, clean]);
                                updateFinalFromTitle(clean);
                              }}
                              usedNames={usedTitleNames}
                              productContext={aiContext}
                              gender={form.gender}
                            />
                          </div>
                          <Input value={form.title} onChange={e => {
                            const val = e.target.value.slice(0, 255);
                            setFormWithSave(prev => ({ ...prev, title: val }));
                            updateFinalFromTitle(val);
                          }} placeholder="Ex: Camiseta Urban Flow" className="bg-secondary border-border text-[13px] h-10" maxLength={255} />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs font-medium text-muted-foreground">Descrição</Label>
                            <AIFieldButtons
                              type="description"
                              brief={understanding.finalProductType || form.productType || form.title || ''}
                              title={form.title}
                              language={activeStoreLang?.label || 'English'}
                              languageCode={activeStore?.marketConfig?.language || 'en-US'}
                              countryName={activeStore?.marketConfig?.marketName || ''}
                              countryFlag={activeStore?.marketConfig?.countryFlag || ''}
                              currentValue={form.description}
                              onGenerated={html => setFormWithSave(prev => ({ ...prev, description: html }))}
                              tone={copyTone}
                              productContext={aiContext}
                              gender={form.gender}
                            />
                          </div>
                          <div className="[&_.ProseMirror]:min-h-[160px]">
                            <RichTextEditor content={form.description} onChange={html => setFormWithSave(prev => ({ ...prev, description: html }))} placeholder="Descreva o produto..." />
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Coleção</Label>
                            <Select value={form.collection} onValueChange={v => setFormWithSave(prev => ({ ...prev, collection: v }))}>
                              <SelectTrigger className="mt-1 bg-secondary border-border text-xs h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>{COLLECTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Tipo de produto</Label>
                            <ProductTypeCombobox
                              value={form.productType}
                              onChange={v => {
                                setFormWithSave(prev => ({ ...prev, productType: v }));
                                setManualProductType(v);
                              }}
                              aiSuggestion={understanding.aiDetectedProductType ? {
                                productType: understanding.aiDetectedProductType,
                                mainColor: understanding.imageInsights.mainColor,
                                style: understanding.imageInsights.style,
                              } : null}
                              isAnalyzing={isAnalyzing}
                              onAcceptAI={() => {
                                if (understanding.aiDetectedProductType) {
                                  setFormWithSave(prev => ({ ...prev, productType: understanding.aiDetectedProductType! }));
                                  setManualProductType(understanding.aiDetectedProductType!);
                                }
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Gênero</Label>
                            <Select value={form.gender} onValueChange={v => setFormWithSave(prev => ({ ...prev, gender: v as any }))}>
                              <SelectTrigger className="mt-1 bg-secondary border-border text-xs h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="masculino">Masculino</SelectItem>
                                <SelectItem value="feminino">Feminino</SelectItem>
                                <SelectItem value="unissex">Unissex</SelectItem>
                                <SelectItem value="infantil">Infantil</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Tags</Label>
                            <Input value={form.tags} onChange={e => setFormWithSave(prev => ({ ...prev, tags: e.target.value }))} placeholder="streetwear, summer" className="mt-1 bg-secondary border-border text-xs h-8" />
                          </div>
                        </div>

                        {/* AI structured inputs */}
                        <div className="grid grid-cols-5 gap-2">
                          <div>
                            <Label className="text-[10px] font-medium text-muted-foreground">Material</Label>
                            <Input
                              value={understanding.manualMaterial}
                              onChange={e => setManualField('manualMaterial', e.target.value)}
                              placeholder={understanding.imageInsights.materialLook || 'Ex: Algodão'}
                              className="mt-0.5 bg-secondary border-border text-xs h-7"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-medium text-muted-foreground">Estilo</Label>
                            <Input
                              value={understanding.manualStyle}
                              onChange={e => setManualField('manualStyle', e.target.value)}
                              placeholder={understanding.imageInsights.style || 'Ex: Minimal'}
                              className="mt-0.5 bg-secondary border-border text-xs h-7"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-medium text-muted-foreground">Fit / Estrutura</Label>
                            <Input
                              value={understanding.manualFit}
                              onChange={e => setManualField('manualFit', e.target.value)}
                              placeholder={understanding.imageInsights.silhouette || 'Ex: Regular'}
                              className="mt-0.5 bg-secondary border-border text-xs h-7"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-medium text-muted-foreground">Cor principal</Label>
                            <Input
                              value={understanding.manualColor}
                              onChange={e => setManualField('manualColor', e.target.value)}
                              placeholder={understanding.imageInsights.mainColor || 'Ex: Preto'}
                              className="mt-0.5 bg-secondary border-border text-xs h-7"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-medium text-muted-foreground">Uso</Label>
                            <Input
                              value={understanding.useCase}
                              onChange={e => setManualField('useCase', e.target.value)}
                              placeholder="Ex: Trabalho"
                              className="mt-0.5 bg-secondary border-border text-xs h-7"
                            />
                          </div>
                        </div>

                        {/* AI Understanding summary */}
                        <AIUnderstandingCard understanding={understanding} gender={form.gender} />
                      </div>
                    </div>
                  )}

                  {/* ═══ STEP 3: VARIANTS & SHIPPING ═══ */}
                  {wizardStep === 3 && (
                    <div className="space-y-3">
                      {/* TOP ROW — Price + Shipping side by side */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="glass-card p-4 space-y-3">
                          <h3 className="font-display font-semibold text-[13px] text-foreground">Preço</h3>
                          <PriceSection
                            price={form.price}
                            compareAtPrice={form.compareAtPrice}
                            cost={form.cost}
                            currencySymbol={currencySymbol}
                            onPriceChange={v => setFormWithSave(prev => ({ ...prev, price: v }))}
                            onCompareAtPriceChange={v => setFormWithSave(prev => ({ ...prev, compareAtPrice: v }))}
                            onCostChange={v => setFormWithSave(prev => ({ ...prev, cost: v }))}
                          />
                        </div>

                        <div className="flex flex-col gap-3">
                          <ShippingCard
                            requiresShipping={form.requiresShipping}
                            onRequiresShippingChange={v => setFormWithSave(prev => ({ ...prev, requiresShipping: v }))}
                            weight={form.weight}
                            onWeightChange={v => setFormWithSave(prev => ({ ...prev, weight: v }))}
                            weightUnit={form.weightUnit}
                            onWeightUnitChange={v => setFormWithSave(prev => ({ ...prev, weightUnit: v }))}
                            countryOfOrigin={form.countryOfOrigin}
                            onCountryOfOriginChange={v => setFormWithSave(prev => ({ ...prev, countryOfOrigin: v }))}
                          />
                          <ColorManager colors={colors} onColorsChange={setColors} generatedImages={generatedImages} />
                        </div>
                      </div>

                      {/* BOTTOM — Sizes + Variants full width */}
                      <div className="glass-card p-4 space-y-3">
                        <h3 className="font-display font-semibold text-[13px] text-foreground">Tamanhos e variantes</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {AVAILABLE_SIZES.map(size => (
                            <button key={size} type="button" onClick={() => toggleSize(size)} className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${form.sizes.includes(size) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>{size}</button>
                          ))}
                        </div>

                        <VariantsTable
                          variants={form.variants}
                          onChange={v => setFormWithSave(prev => ({ ...prev, variants: v }))}
                          inventoryPolicy={form.inventoryPolicy}
                          onInventoryPolicyChange={p => setFormWithSave(prev => ({ ...prev, inventoryPolicy: p }))}
                          productType={form.collection || form.title}
                          currencySymbol={currencySymbol}
                        />
                      </div>
                    </div>
                  )}

                  {/* ═══ STEP 4: REVIEW ═══ */}
                  {wizardStep === 4 && (
                    <div className="grid grid-cols-[340px_1fr] gap-3">
                      {/* LEFT — Checklist + Publish */}
                      <div className="space-y-3">
                        <div className="glass-card p-4">
                          <ReviewChecklist form={form} hasImage={!!imageFile || generatedImages.some(i => i.url)} />
                        </div>

                        {/* Publicação accordion */}
                        <Collapsible open={pubOpen} onOpenChange={setPubOpen}>
                          <div className="glass-card">
                            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-secondary/30 transition-colors rounded-lg">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Publicação</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-muted-foreground">
                                  {publishStatus === 'draft' ? 'Rascunho' : publishStatus === 'active' ? 'Ativo' : 'Agendar'}
                                  {' · '}
                                  {form.selectedChannels.includes('online') ? 'Online Store' : form.selectedChannels[0] || 'Nenhum'}
                                </span>
                                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${pubOpen ? 'rotate-180' : ''}`} />
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="px-3 pb-3 space-y-3">
                              <div>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</span>
                                <div className="flex gap-1 mt-1.5">
                                  {(['draft', 'active', 'scheduled'] as const).map(status => (
                                    <button
                                      key={status}
                                      onClick={() => setPublishStatus(status)}
                                      className={`px-3 h-7 rounded-full text-[11px] font-medium transition-all border ${
                                        publishStatus === status
                                          ? 'bg-primary text-primary-foreground border-primary'
                                          : 'border-border text-muted-foreground hover:text-foreground'
                                      }`}
                                    >
                                      {status === 'draft' ? 'Rascunho' : status === 'active' ? 'Ativo' : 'Agendar'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Canais de venda</span>
                                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                  {[
                                    { id: 'online', icon: '🖥', label: 'Online Store' },
                                    { id: 'pos', icon: '📦', label: 'POS' },
                                    { id: 'google', icon: 'G', label: 'Google' },
                                  ].map(ch => {
                                    const isOn = form.selectedChannels.includes(ch.id);
                                    return (
                                      <button
                                        key={ch.id}
                                        onClick={() => {
                                          const next = isOn
                                            ? form.selectedChannels.filter(c => c !== ch.id)
                                            : [...form.selectedChannels, ch.id];
                                          setFormWithSave(prev => ({ ...prev, selectedChannels: next }));
                                        }}
                                        className={`flex items-center gap-1 px-2.5 h-[26px] rounded-full text-[10px] font-medium transition-all border ${
                                          isOn
                                            ? 'border-primary bg-primary/10 text-[hsl(213,97%,67%)]'
                                            : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30'
                                        }`}
                                      >
                                        <span>{ch.icon}</span>
                                        {ch.label}
                                        {isOn && <Check className="w-2.5 h-2.5" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>

                        {/* Image Optimization card — between Publicação and Publish button */}
                        <ImageOptimizationCard
                          enabled={optimizeImages}
                          onEnabledChange={setOptimizeImages}
                          qualityPreset={imageQualityPreset}
                          onQualityPresetChange={setImageQualityPreset}
                        />

                        {canPublish ? (
                          <Button className="w-full" onClick={handlePublish}>
                            <Zap className="w-4 h-4 mr-1.5" />Publicar agora
                          </Button>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="w-full">
                                  <Button className="w-full" disabled>
                                    <Zap className="w-4 h-4 mr-1.5" />Publicar agora
                                  </Button>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[240px] text-xs">
                                <p className="font-medium mb-1">Campos obrigatórios faltando:</p>
                                <ul className="space-y-0.5 text-muted-foreground">
                                  {!form.title.trim() && <li>• Título do produto</li>}
                                  {!(!!imageFile || generatedImages.some(i => i.url)) && <li>• Pelo menos 1 imagem</li>}
                                  {form.price <= 0 && <li>• Preço maior que 0</li>}
                                  {form.variants.length === 0 && form.sizes.length === 0 && <li>• Pelo menos 1 variante</li>}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
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
                  )}
                </div>

                {/* ═══ BOTTOM NAVIGATION BAR ═══ */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border h-[52px]">
                  <div>
                    {wizardStep === 1 ? (
                      <button onClick={() => { markStepComplete(1); setWizardStep(2); }} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                        Pular por agora
                      </button>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setWizardStep(wizardStep - 1)}>
                        <ArrowLeft className="w-3.5 h-3.5 mr-1" />Voltar
                      </Button>
                    )}
                  </div>

                  {wizardStep === 4 ? (
                    <span className="text-[11px] text-muted-foreground">Step 4 de 4</span>
                  ) : (
                    <>
                      <span className="text-[11px] text-muted-foreground">
                        Step {wizardStep} de 4
                      </span>
                      <Button size="sm" className="text-xs h-8" onClick={() => { markStepComplete(wizardStep); setWizardStep(wizardStep + 1); }}>
                        Próximo <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </>
                  )}
                </div>
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
