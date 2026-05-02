import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useNavigate } from 'react-router-dom';
import { GeneratedImage, ImageAngle } from '@/components/ImageGenerationStep';
import { useProject } from '@/hooks/useProject';
import { SaveStatusIndicator } from '@/components/SaveStatusIndicator';
import { useDraftSave } from '@/hooks/useDraftSave';
import { DraftResumeDialog } from '@/components/DraftResumeDialog';
import { AliExpressImportToast } from '@/components/AliExpressImportToast';
import { ImportedProducts } from '@/components/ImportedProducts';
import { ImportFromURL } from '@/components/ImportFromURL';
import { DraftSavedIndicator } from '@/components/DraftSavedIndicator';
import { ProductFormData, ProductSize, ProductGender, VariantData, WeightUnit } from '@/types/product';
import { useProductUnderstanding } from '@/hooks/useProductUnderstanding';
import { useProductSpecs } from '@/hooks/useProductSpecs';
import { ProductHistory } from '@/components/ProductHistory';
import { ImageLibrary } from '@/components/ImageLibrary';
import { ImageStudio } from '@/components/ImageStudio';
import { StoreSelector } from '@/components/StoreSelector';
import { useStoreContext } from '@/hooks/useStoreContext';
import type { MarketConfig, ShopifyStore } from '@/hooks/useStoreManager';
import { useRegionGroups } from '@/hooks/useRegionGroups';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { SettingsDialog } from '@/components/SettingsDialog';
import { OnboardingGuide } from '@/components/OnboardingGuide';
import { StoreManagementDialog } from '@/components/StoreManagementDialog';
import { ShopifyConnectDialog } from '@/components/ShopifyConnectDialog';
import { RegionGroupManager } from '@/components/RegionGroupManager';
import { HomePage } from '@/components/HomePage';
import { GlobalPublishFlow } from '@/components/GlobalPublishFlow';
import { DashboardSidebar, DashboardView } from '@/components/DashboardSidebar';
import { getCanPublish } from '@/components/ReviewChecklist';
import { ImageQualityPreset, getQualityValue } from '@/components/ImageOptimizationCard';
import { convertBase64ToWebP } from '@/lib/imageOptimization';
import { ProductColor } from '@/components/ColorManager';
import { buildProductAIContext } from '@/types/productUnderstanding';
import { UsageDashboard } from '@/components/UsageDashboard';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserMenu } from '@/components/UserMenu';
import { CommandPalette } from '@/components/CommandPalette';
import { SpotlightHeader } from '@/components/SpotlightHeader';
import { getAILanguageByCode } from '@/data/languages';
import { PublishView } from '@/features/publish';
import { CreateView } from '@/features/create/CreateView';
import type { CreateInput, CreateOptions } from '@/features/create/types';
import { Zap, HelpCircle, Store, Settings, Globe, Layers } from 'lucide-react';

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
  pricingCurrency: 'USD',
  pricingCpa: 5,
  pricingMargin: 60,
  pricingShipping: 0,
  pricingPlatform: 'shopify',
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
  const USE_NEW_CREATE = import.meta.env.VITE_NEW_CREATE_FLOW === 'true';
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
  const [currentView, setCurrentView] = useState<DashboardView>('home');
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
  const [editingShopifyProductId, setEditingShopifyProductId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [publishStatus, setPublishStatus] = useState<'draft' | 'active' | 'scheduled'>('active');
  const [pubOpen, setPubOpen] = useState(false);
  const [copyTone, setCopyTone] = useState<'minimal' | 'bold' | 'casual' | 'editorial'>('minimal');
  const [usedTitleNames, setUsedTitleNames] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectRestoredRef = useRef(false);
  const savedToLibraryRef = useRef<Set<string>>(new Set());
  const savedToProjectRef = useRef<Set<string>>(new Set());
  const deletedProjectImageUrlsRef = useRef<Set<string>>(new Set());

  // ─── Draft save (localStorage) ────────────────────────────
  const { draftStatus, saveDraft, loadDraft, clearDraft } = useDraftSave();
  const [showDraftResume, setShowDraftResume] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<ReturnType<typeof loadDraft>>(null);
  const draftCheckedRef = useRef(false);

  const [aliImport, setAliImport] = useState<{
    open: boolean;
    projectId: string;
    title: string;
    price?: number;
    imageUrl?: string;
    imageCount?: number;
    sourceImages?: string[];
  }>({ open: false, projectId: '', title: '' });

  const {
    understanding, isAnalyzing, setManualProductType, setManualField,
    analyzeImage, updateFinalFromTitle, reset: resetUnderstanding,
  } = useProductUnderstanding();

  const { specs, isGeneratingSpecs, generateSpecs, clearSpecs, restoreSpecs } = useProductSpecs();

  // ─── Restore project state on load ────────────────────────
  const sanitizeAliExpressHtml = (html: string): string => {
    if (!html) return '';
    // If it contains AliExpress-specific classes/URLs, it's boilerplate — discard
    if (
      html.includes('report.aliexpress.com') ||
      html.includes('description--report') ||
      html.includes('lazy-load') ||
      html.includes('comet-v2-btn') ||
      html.includes('title--wrap--')
    ) {
      // Strip tags and check if any real content remains
      const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const cleaned = text.replace(/\b(Description|report|View more)\b/gi, '').trim();
      return cleaned.length > 15 ? cleaned : '';
    }
    return html;
  };

  useEffect(() => {
    if (!project || projectRestoredRef.current) return;
    projectRestoredRef.current = true;

    const pd = project.productData;
    const isAliImport = (project.aiData?.imageInsights as any)?.importedFrom === 'aliexpress';
    const rawDesc = pd.description || '';
    const description = isAliImport ? sanitizeAliExpressHtml(rawDesc) : rawDesc;
    setForm({
      title: pd.title || '',
      description,
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
      pricingCurrency: (pd as any).pricingCurrency || 'USD',
      pricingCpa: (pd as any).pricingCpa ?? 5,
      pricingMargin: (pd as any).pricingMargin ?? 60,
      pricingShipping: (pd as any).pricingShipping ?? 0,
      pricingPlatform: (pd as any).pricingPlatform || 'shopify',
    });

    setSeoTitle(project.seoData?.seoTitle || '');
    setSeoDescription(project.seoData?.seoDescription || '');
    setWizardStep(project.step || 1);

    // Restore specs
    if (project.specs) {
      restoreSpecs(project.specs);
    }

    // Restore images — prioriza imagens já salvas no projeto;
    // se vazio e for import AliExpress, auto-popula a galeria com as fotos do produto
    // para que possam ser usadas direto na publicação.
    if (project.images && project.images.length > 0) {
      const restored: GeneratedImage[] = project.images.map(img => ({
        id: img.id || crypto.randomUUID(),
        url: img.url,
        isCover: img.isCover,
        angle: 'frente' as ImageAngle,
      }));
      setGeneratedImages(restored);
      project.images.forEach(img => {
        if (img.url) savedToProjectRef.current.add(img.url);
      });
      const cover = restored.find(i => i.isCover) || restored[0];
      if (cover) setImagePreview(cover.url);
    } else if (isAliImport) {
      const aliInsights = project.aiData?.imageInsights as any;
      const sourceImages: string[] = (aliInsights?.sourceImages || []).filter(Boolean);
      if (sourceImages.length > 0) {
        const imported: GeneratedImage[] = sourceImages.map((url, i) => ({
          id: crypto.randomUUID(),
          url,
          isCover: i === 0,
          angle: 'frente' as ImageAngle,
        }));
        setGeneratedImages(imported);
        setImagePreview(imported[0].url);
      } else {
        setGeneratedImages([]);
        setImagePreview(null);
      }
      deletedProjectImageUrlsRef.current = new Set();
    } else {
      setGeneratedImages([]);
      setImagePreview(null);
      deletedProjectImageUrlsRef.current = new Set();
    }

    // ─── Auto-preenche campos se produto veio do AliExpress ───
    if (isAliImport) {
      const aliInsights = project.aiData?.imageInsights as any;
      const sourceVariants: any[] = aliInsights.sourceVariants || [];
      const sourceSpecs: any[] = aliInsights.sourceSpecs || [];
      const sourceBullets: string[] = aliInsights.sourceBullets || [];

      // ── Tamanhos ──
      const sizeVariant = sourceVariants.find((v: any) =>
        /size|tamanho|taille|größe|talla/i.test(v.name || '')
      );
      const autoSizes: ProductSize[] = sizeVariant?.values
        ?.map((v: any) => typeof v === 'string' ? v : v.name)
        ?.filter(Boolean)?.slice(0, 20) || [];

      // ── Cores com imagens ──
      const colorVariant = sourceVariants.find((v: any) =>
        /color|colour|cor|couleur|farbe|colore/i.test(v.name || '')
      );
      const autoColors: ProductColor[] = colorVariant?.values
        ?.map((v: any) => {
          const name = typeof v === 'string' ? v : v.name;
          const imageUrl = typeof v === 'object' ? (v.imageUrl || '') : '';
          const colorMap: Record<string, string> = {
            black: '#1a1a1a', preto: '#1a1a1a', white: '#ffffff', branco: '#ffffff',
            gray: '#808080', cinza: '#808080', grey: '#808080',
            navy: '#001f5b', blue: '#2563eb', azul: '#2563eb',
            red: '#dc2626', vermelho: '#dc2626', green: '#16a34a', verde: '#16a34a',
            brown: '#92400e', marrom: '#92400e', beige: '#d4b896', khaki: '#c3b082',
            yellow: '#eab308', orange: '#ea580c', pink: '#ec4899', purple: '#7c3aed',
          };
          const hex = colorMap[name?.toLowerCase()?.trim()] || '#666666';
          return { id: crypto.randomUUID(), name, hex, imageUrl: imageUrl || undefined };
        })
        ?.filter((c: ProductColor) => c.name) || [];

      // ── Peso das specs ──
      let autoWeight = 0;
      let autoWeightUnit: WeightUnit = 'kg';
      const weightSpec = sourceSpecs.find((s: any) =>
        /weight|peso|poids|gewicht/i.test(s.key || '')
      );
      if (weightSpec) {
        const wMatch = weightSpec.value?.match(/([\d.]+)\s*(kg|g|lb|oz)/i);
        if (wMatch) {
          autoWeight = parseFloat(wMatch[1]);
          autoWeightUnit = wMatch[2].toLowerCase() as WeightUnit;
        }
      }

      // ── País de origem ──
      const originSpec = sourceSpecs.find((s: any) =>
        /origin|origem|pays|country/i.test(s.key || '')
      );
      const autoOrigin = originSpec?.value?.trim() || 'CN';

      // ── Material das specs ──
      const materialSpec = sourceSpecs.find((s: any) =>
        /material|fabric|tecido|composition|composição/i.test(s.key || '')
      );
      const autoMaterial = materialSpec?.value?.split(/[,/]/)[0]?.trim() || '';

      // ── Estilo das specs ──
      const styleSpec = sourceSpecs.find((s: any) =>
        /style|estilo|style|occasion/i.test(s.key || '')
      );
      const autoStyle = styleSpec?.value?.split(/[,/]/)[0]?.trim() || '';

      // ── Fit das specs ──
      const fitSpec = sourceSpecs.find((s: any) =>
        /fit|silhouette|cut|corte|slim|regular|loose/i.test(s.key || '')
      );
      const autoFit = fitSpec?.value?.split(/[,/]/)[0]?.trim() || '';

      // ── Cor principal ──
      const firstColor = colorVariant?.values?.[0];
      const autoMainColor = typeof firstColor === 'string' ? firstColor : firstColor?.name || '';

      // ── Uso ──
      const useSpec = sourceSpecs.find((s: any) =>
        /use|uso|occasion|season|purpose/i.test(s.key || '')
      );
      const autoUse = useSpec?.value?.split(/[,/]/)[0]?.trim() || '';

      // ── Coleção ──
      const titleLower = (pd.title || '').toLowerCase();
      const category = (aliInsights.sourceCategory || '').toLowerCase();
      let autoCollection = pd.collection || '';
      if (!autoCollection) {
        if (/jacket|coat|casaco|inverno|winter/.test(titleLower + category)) autoCollection = 'Inverno';
        else if (/sport|gym|fitness|active|atletismo/.test(titleLower + category)) autoCollection = 'Fitness';
        else if (/formal|suit|terno|dress/.test(titleLower + category)) autoCollection = 'Formal';
        else if (/shoe|sneaker|boot|tênis|sapato/.test(titleLower + category)) autoCollection = 'Calçados';
        else if (/belt|watch|bag|acessório|accessory/.test(titleLower + category)) autoCollection = 'Acessórios';
        else if (/short|swim|beach|verão|summer/.test(titleLower + category)) autoCollection = 'Verão';
        else autoCollection = 'Casual';
      }

      // ── Tipo de produto ──
      let autoProductType = pd.productType || '';
      if (!autoProductType) {
        if (/t-shirt|tshirt|tee\b/.test(titleLower)) autoProductType = 'T-Shirt';
        else if (/polo/.test(titleLower)) autoProductType = 'Shirt';
        else if (/shirt|camisa/.test(titleLower)) autoProductType = 'Shirt';
        else if (/jacket|jaqueta|casaco/.test(titleLower)) autoProductType = 'Jacket';
        else if (/pants|trouser|calça/.test(titleLower)) autoProductType = 'Pants';
        else if (/shorts/.test(titleLower)) autoProductType = 'Shorts';
        else if (/coat|overcoat/.test(titleLower)) autoProductType = 'Coat';
        else if (/sweater|hoodie|moletom/.test(titleLower)) autoProductType = 'Sweater';
        else if (/suit|terno/.test(titleLower)) autoProductType = 'Suit';
        else if (/shoe|sneaker|boot|tênis|sapato/.test(titleLower)) autoProductType = 'Shoes';
        else if (/belt|cinto/.test(titleLower)) autoProductType = 'Belt';
        else if (/watch|relógio/.test(titleLower)) autoProductType = 'Watch';
      }

      // ── Tags ──
      const specTags = sourceSpecs.slice(0, 5)
        .map((s: any) => s.value?.split(/[,/]/)[0]?.trim()).filter(Boolean);
      const bulletTags = sourceBullets.slice(0, 3)
        .map((b: string) => b.split(' ').slice(0, 3).join(' ')).filter(Boolean);
      const autoTags = [...new Set([...specTags, ...bulletTags])].slice(0, 8).join(', ');

      // ── Descrição a partir dos bullets e specs ──
      let autoDescription = '';
      if (sourceBullets.length > 0 || sourceSpecs.length > 0) {
        const bulletHTML = sourceBullets.length > 0
          ? `<ul>${sourceBullets.map(b => `<li>${b}</li>`).join('')}</ul>`
          : '';
        const specsHTML = sourceSpecs.length > 0
          ? `<p><strong>Specifications:</strong></p><ul>${sourceSpecs.slice(0, 10).map(s => `<li><strong>${s.key}:</strong> ${s.value}</li>`).join('')}</ul>`
          : '';
        autoDescription = [bulletHTML, specsHTML].filter(Boolean).join('');
      }

      // ── Preços ──
      const baseCostAli = aliInsights.priceMin || pd.cost || 0;
      const baseRetail = baseCostAli > 0
        ? Math.ceil(((baseCostAli + 5 + 3.99) / (1 - 0.60)) * 100) / 100
        : 0;

      // ── Variantes com tamanhos ──
      const autoVariants: VariantData[] = autoSizes.length > 0
        ? autoSizes.map(size => ({
            id: crypto.randomUUID(),
            name: size,
            price: baseRetail,
            compareAtPrice: baseRetail > 0 ? Math.ceil(baseRetail * 1.3 * 100) / 100 : null,
            cost: baseCostAli || null,
            sku: '',
            stock: 99,
            requiresShipping: true,
            weight: autoWeight || 0.5,
            weightUnit: autoWeightUnit,
          }))
        : [];

      // ── Aplica no formulário ──
      setForm(prev => ({
        ...prev,
        sizes: autoSizes.length > 0 ? autoSizes : prev.sizes,
        variants: autoVariants.length > 0 ? autoVariants : prev.variants,
        description: autoDescription || prev.description,
        collection: autoCollection || prev.collection,
        productType: autoProductType || prev.productType,
        tags: autoTags || prev.tags,
        weight: autoWeight > 0 ? autoWeight : prev.weight,
        weightUnit: autoWeight > 0 ? autoWeightUnit : prev.weightUnit,
        countryOfOrigin: autoOrigin,
        cost: baseCostAli > 0 ? baseCostAli : prev.cost,
        price: baseRetail > 0 ? baseRetail : prev.price,
        compareAtPrice: baseRetail > 0 ? Math.ceil(baseRetail * 1.3 * 100) / 100 : prev.compareAtPrice,
        pricingCpa: 5,
        pricingMargin: 60,
        pricingShipping: 3.99,
      }));

      // ── Aplica cores ──
      if (autoColors.length > 0) setColors(autoColors);

      // ── Aplica campos de understanding (Material, Estilo, Fit, Cor, Uso) ──
      if (autoMaterial) setManualField('manualMaterial', autoMaterial);
      if (autoStyle) setManualField('manualStyle', autoStyle);
      if (autoFit) setManualField('manualFit', autoFit);
      if (autoMainColor) setManualField('manualColor', autoMainColor);
      if (autoUse) setManualField('useCase', autoUse);
      if (autoProductType) setManualProductType(autoProductType);
    }
  }, [project]);

  // ─── Check for existing draft on mount ────────────────────
  useEffect(() => {
    if (draftCheckedRef.current) return;
    draftCheckedRef.current = true;
    // Only show resume dialog once per browser session
    const dismissed = sessionStorage.getItem('draft-dialog-dismissed');
    if (dismissed === 'true') return;
    const draft = loadDraft();
    if (draft) {
      setPendingDraft(draft);
      setShowDraftResume(true);
    }
  }, [loadDraft]);

  // ─── Realtime: detecta produto importado do AliExpress ────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const channel = supabase
        .channel('ali-import-watcher')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` },
          (payload) => {
            const row = payload.new as any;
            const insights = row?.ai_data?.imageInsights;
            if (insights?.importedFrom !== 'aliexpress' && insights?.importedFrom !== 'shopify') return;
            const sourceImages: string[] = insights?.sourceImages || [];
            setAliImport({
              open: true,
              projectId: row.id,
              title: row.name || (insights?.importedFrom === 'shopify' ? 'Produto Shopify' : 'Produto AliExpress'),
              price: row?.product_data?.cost || 0,
              imageUrl: sourceImages[0] || '',
              imageCount: sourceImages.length,
              sourceImages,
            });
          }
        )
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    });
  }, []);

  useEffect(() => {
    if (!draftCheckedRef.current) return;
    saveDraft({
      form,
      seoTitle,
      seoDescription,
      wizardStep,
      completedSteps: Array.from(completedSteps),
      colors,
      generatedImages,
      imagePreview,
    });
  }, [form, seoTitle, seoDescription, wizardStep, completedSteps, colors, generatedImages, imagePreview, saveDraft]);

  const handleResumeDraft = useCallback(() => {
    if (!pendingDraft) return;
    setForm(prev => ({ ...prev, ...pendingDraft.form }));
    setSeoTitle(pendingDraft.seoTitle || '');
    setSeoDescription(pendingDraft.seoDescription || '');
    setWizardStep(pendingDraft.wizardStep || 1);
    setCompletedSteps(new Set(pendingDraft.completedSteps || []));
    setColors(pendingDraft.colors || []);
    if (pendingDraft.generatedImages?.length) {
      setGeneratedImages(pendingDraft.generatedImages);
      setImagePreview(pendingDraft.imagePreview || pendingDraft.generatedImages[0]?.url || null);
    }
    sessionStorage.setItem('draft-dialog-dismissed', 'true');
    setShowDraftResume(false);
    setPendingDraft(null);
  }, [pendingDraft]);

  const handleDiscardDraft = useCallback(() => {
    clearDraft();
    sessionStorage.setItem('draft-dialog-dismissed', 'true');
    setShowDraftResume(false);
    setPendingDraft(null);
  }, [clearDraft]);

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
      const imagesToProcess = generatedImages.filter(img => img.url && !((!imageFile) && img.url === coverUrl));
      const totalToProcess = imagesToProcess.length + (colors.filter(c => c.imageUrl).length);
      let processedCount = 0;

      if (totalToProcess > 0) {
        setImageUploadProgress({ current: 0, total: totalToProcess });
      }

      for (const img of imagesToProcess) {
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
          logger.warn('[Publish] Failed to fetch generated image', { error: err });
        }
        processedCount++;
        setImageUploadProgress({ current: processedCount, total: totalToProcess });
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
            logger.debug('[ImageOptimization] Converted to WebP', { originalSize: result.originalSize, optimizedSize: result.optimizedSize });
          }
        } catch (err) {
          // Safe fallback: continue with original image
          logger.warn('[ImageOptimization] Optimization failed, using original', { error: err });
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
            logger.warn(`[Publish] Failed to fetch color image for ${color.name}`, { error: err });
          }
          processedCount++;
          setImageUploadProgress({ current: processedCount, total: totalToProcess });
        }
      }
      setImageUploadProgress(null);

      // Resolve Supabase connection_id by store domain (multi-store safe).
      let connectionIdForPublish: string | null = null;
      if (activeStore?.domain) {
        const { data: connRow } = await supabase
          .from('shopify_connections')
          .select('id')
          .eq('store_domain', activeStore.domain)
          .eq('is_active', true)
          .maybeSingle();
        connectionIdForPublish = connRow?.id ?? null;
      }
      if (!connectionIdForPublish) {
        toast.error('Nenhuma loja Shopify selecionada. Selecione uma loja antes de publicar.');
        setIsPublishing(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('shopify-publish', {
        body: {
          connection_id: connectionIdForPublish,
          title: form.title,
          description: form.description,
          price: form.price,
          compareAtPrice: form.compareAtPrice,
          cost: form.cost,
          sizes: form.sizes,
          collection: form.collection,
          productType: form.productType,
          gender: form.gender,
          tags: form.tags,
          imageBase64,
          imageName,
          vendor: activeStore?.marketConfig?.marketName || activeStore?.domain || '',
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
          shopifyProductId: editingShopifyProductId || null,
        },
      });

      clearInterval(stepInterval);
      setPublishStep(PUBLISH_STEPS.length - 1);

      if (error || data?.error) throw new Error(data?.error || error?.message || 'Erro ao publicar');

      incrementPublished();
      setPublishResult({ title: data.title, shopifyUrl: data.shopifyUrl, imageUrl: data.imageUrl });
      clearDraft();
      setEditingShopifyProductId(null);
      toast.success(editingShopifyProductId ? `Produto atualizado em ${activeStore.domain}!` : `Produto publicado em ${activeStore.domain}!`);
      // Mark project as published
      publishProject();
    } catch (err: any) {
      logger.error('Publish error', err);
      toast.error(err.message || 'Erro ao publicar produto.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishToStore = async (store: ShopifyStore): Promise<boolean> => {
    if (!imageFile || !store.accessToken) return false;
    try {
      const imageBase64 = await fileToBase64(imageFile);
      const mc = store.marketConfig;
      const storeLang = mc?.language ? getAILanguageByCode(mc.language) : null;
      // Resolve Supabase connection_id for this specific store domain
      const { data: connRow } = await supabase
        .from('shopify_connections')
        .select('id')
        .eq('store_domain', store.domain)
        .eq('is_active', true)
        .maybeSingle();
      if (!connRow?.id) return false;
      const { data, error } = await supabase.functions.invoke('shopify-publish', {
        body: {
          connection_id: connRow.id,
          title: form.title,
          description: form.description,
          price: form.price,
          compareAtPrice: form.compareAtPrice,
          cost: form.cost,
          sizes: form.sizes,
          collection: form.collection,
          productType: form.productType,
          gender: form.gender,
          tags: form.tags,
          imageBase64,
          imageName: imageFile.name,
          vendor: store.marketConfig?.marketName || store.domain || '',
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
          languageLabel: storeLang?.label || null,
          marketName: mc?.marketName || null,
          colorImages: [],
          additionalImages: [],
          shopifyProductId: null,
        },
      });
      if (error || data?.error) return false;
      incrementPublished();
      return true;
    } catch { return false; }
  };

  // ─── Reset all local state (clears previous project data) ──
  const resetAllState = () => {
    setForm(initialForm);
    setImageFile(null);
    setImagePreview(null);
    setGeneratedImages([]);
    setPublishResult(null);
    setEditingShopifyProductId(null);
    setWizardStep(1);
    setCompletedSteps(new Set());
    setColors([]);
    setSeoTitle('');
    setSeoDescription('');
    setOptimizeImages(false);
    setImageQualityPreset('balanced');
    resetUnderstanding();
    setUsedTitleNames([]);
    clearSpecs();
    clearDraft();
    if (fileInputRef.current) fileInputRef.current.value = '';
    projectRestoredRef.current = false;
    savedToProjectRef.current = new Set();
    savedToLibraryRef.current = new Set();
    deletedProjectImageUrlsRef.current = new Set();
  };

  const handleNewProduct = async () => {
    resetAllState();
    await createNewProject();
  };

  const handleOpenAliImport = async () => {
    const { projectId } = aliImport;
    setAliImport(prev => ({ ...prev, open: false }));
    resetAllState();
    const { loadProjectFromBackend, setLastOpenedProjectId } = await import('@/services/projectService');
    const imported = await loadProjectFromBackend(projectId);
    if (imported) {
      updateProject(() => imported);
      setLastOpenedProjectId(imported.id);
    }
    setCurrentView('publish');
  };

  const handleOpenImported = async (projectId: string) => {
    resetAllState();
    const { loadProjectFromBackend, setLastOpenedProjectId } = await import('@/services/projectService');
    const imported = await loadProjectFromBackend(projectId);
    if (imported) {
      updateProject(() => imported);
      setLastOpenedProjectId(imported.id);
    }
    setCurrentView('publish');
  };

  const handleEditPublishedProduct = (product: import('@/hooks/usePublishedProducts').PublishedProduct) => {
    // Fully reset all previous project data first
    resetAllState();

    // Load published product data into a clean form
    const newFormData = {
      ...initialForm,
      title: product.title || '',
      description: product.description || '',
      price: product.local_price || product.base_price || 0,
      collection: product.collection || '',
      sizes: (product.sizes || []) as ProductSize[],
    };
    setForm(newFormData);
    syncFormToProject(newFormData);

    // Load image if available
    if (product.image_url) {
      setImagePreview(product.image_url);
      setGeneratedImages([{
        id: crypto.randomUUID(),
        url: product.image_url,
        isCover: true,
        angle: 'frente' as ImageAngle,
      }]);
    }

    setEditingShopifyProductId(product.shopify_product_id || null);
    setWizardStep(4);
    setCompletedSteps(new Set([1, 2, 3]));
    setCurrentView('publish');
    toast.info('Produto carregado para edição');
  };

  const handleAddStore = () => { stores.length > 0 ? setShowConnect(true) : setShowOnboarding(true); };
  const handleCreateSubmit = (input: CreateInput, options: CreateOptions) => {
    toast.info(`Modo: ${input.mode} · Preset: ${options.stylePreset}`);
    logger.info('CreateView submit', { mode: input.mode, preset: options.stylePreset, storeId: options.storeId });
    // TODO PR 3: conectar ao processamento real
  };

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
  const hasImage = !!imageFile || generatedImages.some(i => i.url);
  const canPublish = getCanPublish(form, hasImage);
  const aiDisabled = !hasImage;

  // ─── Specs: ensure generated before text generation ───────
  const ensureSpecs = useCallback(async () => {
    if (specs) return; // already cached
    const pt = understanding.finalProductType || form.productType;
    if (!pt) return;
    const result = await generateSpecs({
      productType: pt,
      gender: form.gender,
      style: understanding.manualStyle || understanding.imageInsights.style || '',
      mainColor: understanding.manualColor || understanding.imageInsights.mainColor || '',
      visualDetails: understanding.imageInsights.visualDetails.join(', '),
    });
    if (result) {
      updateProject(p => ({ ...p, specs: result }));
    }
  }, [specs, understanding, form.productType, form.gender, generateSpecs, updateProject]);

  const handleRegenerateSpecs = useCallback(async () => {
    clearSpecs();
    const pt = understanding.finalProductType || form.productType;
    if (!pt) return;
    const result = await generateSpecs({
      productType: pt,
      gender: form.gender,
      style: understanding.manualStyle || understanding.imageInsights.style || '',
      mainColor: understanding.manualColor || understanding.imageInsights.mainColor || '',
      visualDetails: understanding.imageInsights.visualDetails.join(', '),
    });
    if (result) {
      updateProject(p => ({ ...p, specs: result }));
    }
  }, [understanding, form.productType, form.gender, generateSpecs, clearSpecs, updateProject]);

  return (
    <div className="min-h-screen bg-background hero-radial flex flex-col">
      {/* Header */}
      <SpotlightHeader className="border-b border-border bg-background grid-bg sticky top-0 z-10 h-[52px]">
        <div className="w-full h-full px-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-base font-semibold text-foreground flex items-center gap-1.5">
              <Zap className="w-4.5 h-4.5" />Publify
            </h1>
            <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border border-border bg-secondary text-muted-foreground">
              beta
            </span>
          </div>
          <div className="flex items-center gap-2">
            <SaveStatusIndicator status={saveStatus} />
            <DraftSavedIndicator status={draftStatus} />
            {publishedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-secondary text-foreground">
                <Zap className="w-3 h-3" />{publishedCount}
              </span>
            )}
            {/* Store selector in header */}
            {stores.length > 0 && (
              <StoreSelector
                stores={stores}
                activeStoreId={activeStore?.id || null}
                onSelectStore={setActiveStore}
                onAddStore={handleAddStore}
              />
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setShowOnboarding(true)} title="Como funciona?"><HelpCircle className="w-4 h-4" /></Button>
            {stores.length > 0 && <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setShowManagement(true)} title="Gerenciar lojas"><Settings className="w-4 h-4" /></Button>}
            <UserMenu />
          </div>
        </div>
      </SpotlightHeader>

      {/* Dialogs */}
      <CommandPalette onNavigate={handleViewChange} onNewProduct={handleNewProduct} />
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} onSaveAndConnect={handleCredentialsSubmit} />
      <OnboardingGuide open={showOnboarding} onOpenChange={setShowOnboarding} onConfigureCredentials={() => { setShowOnboarding(false); setShowConnect(true); }} />
      <ShopifyConnectDialog open={showConnect} onOpenChange={setShowConnect} onConnected={handleStoreConnected} onOpenOnboarding={() => { setShowConnect(false); setShowOnboarding(true); }} />
      <StoreManagementDialog open={showManagement} onOpenChange={setShowManagement} stores={stores} onRemove={removeStore} onReconnect={handleReconnect} onSetDefault={setDefault} onUpdateMarket={updateStoreMarket} />
      <RegionGroupManager open={showRegions} onOpenChange={setShowRegions} groups={groups} stores={stores} onAddGroup={addGroup} onUpdateGroup={updateGroup} onRemoveGroup={removeGroup} />
      <GlobalPublishFlow open={showGlobalPublish} onOpenChange={setShowGlobalPublish} stores={stores} groups={groups} activeStore={activeStore} basePrice={form.price} productTitle={form.title} convert={convert} onPublish={handlePublishToStore} />
      <DraftResumeDialog
        open={showDraftResume}
        draftTitle={pendingDraft?.form?.title}
        draftDate={pendingDraft?.savedAt ? new Date(pendingDraft.savedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : undefined}
        onResume={handleResumeDraft}
        onDiscard={handleDiscardDraft}
      />
      <AliExpressImportToast
        open={aliImport.open}
        title={aliImport.title}
        price={aliImport.price}
        imageUrl={aliImport.imageUrl}
        imageCount={aliImport.imageCount}
        onOpen={handleOpenAliImport}
        onDismiss={() => setAliImport(prev => ({ ...prev, open: false }))}
      />

      <div className="flex-1 flex">
        <DashboardSidebar currentView={currentView} onViewChange={handleViewChange} />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-3">

            {/* HOME VIEW */}
            {currentView === 'home' && (
              <HomePage onNavigate={(view) => setCurrentView(view as DashboardView)} />
            )}

            {currentView === 'publish' && (
              USE_NEW_CREATE ? (
                <CreateView
                  onSubmit={handleCreateSubmit}
                  onAddStore={handleAddStore}
                />
              ) : (
              <PublishView
                isPublishing={isPublishing}
                publishResult={publishResult}
                publishStep={publishStep}
                publishSteps={PUBLISH_STEPS}
                imageUploadProgress={imageUploadProgress}
                hasConnectedStore={hasConnectedStore}
                onAddStore={handleAddStore}
                onNewProduct={handleNewProduct}
                onViewHistory={() => { setPublishResult(null); setCurrentView('history'); }}
                successForm={form}
                successCurrencySymbol={currencySymbol}

                wizardStep={wizardStep}
                setWizardStep={setWizardStep}
                completedSteps={completedSteps}
                stepLabels={STEP_LABELS}
                goToStep={goToStep}
                markStepComplete={markStepComplete}

                editingShopifyProductId={editingShopifyProductId}
                onExitEditing={handleNewProduct}

                form={form}
                setFormWithSave={setFormWithSave}
                toggleSize={toggleSize}

                seoTitle={seoTitle}
                seoDescription={seoDescription}
                setSeoTitleWithSave={setSeoTitleWithSave}
                setSeoDescriptionWithSave={setSeoDescriptionWithSave}

                colors={colors}
                setColors={setColors}

                imageFile={imageFile}
                setImageFile={setImageFile}
                imagePreview={imagePreview}
                setImagePreview={setImagePreview}
                generatedImages={generatedImages}
                setGeneratedImages={setGeneratedImages}
                savedToLibraryRef={savedToLibraryRef}
                savedToProjectRef={savedToProjectRef}
                deletedProjectImageUrlsRef={deletedProjectImageUrlsRef}

                project={project}
                addImage={addImage}
                removeProjectImage={removeProjectImage}
                updateStep={updateStep}
                activeStore={activeStore}
                currencySymbol={currencySymbol}
                activeStoreLangLabel={activeStoreLang?.label || 'English'}

                understanding={understanding}
                isAnalyzing={isAnalyzing}
                setManualField={setManualField}
                setManualProductType={setManualProductType}
                analyzeImage={analyzeImage}
                updateFinalFromTitle={updateFinalFromTitle}
                clearSpecs={clearSpecs}
                specs={specs}
                isGeneratingSpecs={isGeneratingSpecs}
                ensureSpecs={ensureSpecs}
                handleRegenerateSpecs={handleRegenerateSpecs}
                aiContext={aiContext}
                aiDisabled={aiDisabled}

                copyTone={copyTone}
                usedTitleNames={usedTitleNames}
                setUsedTitleNames={setUsedTitleNames}
                publishStatus={publishStatus}
                setPublishStatus={setPublishStatus}
                pubOpen={pubOpen}
                setPubOpen={setPubOpen}
                optimizeImages={optimizeImages}
                setOptimizeImages={setOptimizeImages}
                imageQualityPreset={imageQualityPreset}
                setImageQualityPreset={setImageQualityPreset}
                canPublish={canPublish}
                handlePublish={handlePublish}
              />
              )
            )}


            {/* HISTORY VIEW */}
            {currentView === 'history' && <ProductHistory onEditProduct={handleEditPublishedProduct} />}

            {/* IMPORTED VIEW */}
            {currentView === 'imported' && <ImportedProducts onOpen={handleOpenImported} />}

            {/* IMPORT URL VIEW */}
            {currentView === 'import-url' && (
              <ImportFromURL onImportComplete={() => setCurrentView('history')} />
            )}

            {/* LIBRARY VIEW */}
            {currentView === 'library' && <ImageLibrary />}

            {/* IMAGE STUDIO (independent visual creation) */}
            {currentView === 'image-generator' && <ImageStudio />}

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
                            {store.logoUrl ? (
                              <img src={store.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain flex-shrink-0 border border-border" />
                            ) : (
                              <span className="text-2xl flex-shrink-0">{store.marketConfig?.countryFlag || '🏪'}</span>
                            )}
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
                            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowManagement(true)}>Editar</Button>
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
                <div className="grid grid-cols-[1fr_1fr] gap-4">
                  <div className="glass-card p-5 space-y-4">
                    <h3 className="font-display font-semibold text-[13px] text-foreground">Geral</h3>
                    <div className="flex items-center justify-between">
                      <div><p className="text-xs font-medium text-foreground">Versão</p><p className="text-[10px] text-muted-foreground">Publify Beta v0.3.0</p></div>
                    </div>
                    <div className="border-t border-border/50 pt-3 flex items-center justify-between">
                      <div><p className="text-xs font-medium text-foreground">Lojas conectadas</p><p className="text-[10px] text-muted-foreground">{stores.filter(s => s.connected).length} ativa{stores.filter(s => s.connected).length !== 1 ? 's' : ''}</p></div>
                      <Button variant="secondary" size="sm" onClick={() => setCurrentView('stores')} className="font-display text-[10px] h-7">Gerenciar</Button>
                    </div>
                    <div className="border-t border-border/50 pt-3 flex items-center justify-between">
                      <div><p className="text-xs font-medium text-foreground">Produtos publicados</p><p className="text-[10px] text-muted-foreground">{publishedCount} produto{publishedCount !== 1 ? 's' : ''}</p></div>
                    </div>
                  </div>
                  <div className="glass-card p-5">
                    <UsageDashboard />
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
