import { Dispatch, SetStateAction } from 'react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ImageGenerationStep, GeneratedImage, ImageAngle } from '@/components/ImageGenerationStep';
import { WizardStepTabs } from '@/components/WizardStepTabs';
import { SEOCard } from '@/components/SEOCard';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ProductTypeCombobox } from '@/components/ProductTypeCombobox';
import { AIFieldButtons } from '@/components/AIFieldButtons';
import { AIProductUnderstandingPanel } from '@/components/AIProductUnderstandingPanel';
import { PriceSection } from '@/components/PriceSection';
import { PricingEngine } from '@/components/PricingEngine';
import { VariantsTable } from '@/components/VariantsTable';
import { AddCustomSize } from '@/components/AddCustomSize';
import { ShippingCard } from '@/components/ShippingCard';
import { ColorManager, ProductColor } from '@/components/ColorManager';
import { ReviewChecklist } from '@/components/ReviewChecklist';
import { ImageOptimizationCard, ImageQualityPreset } from '@/components/ImageOptimizationCard';
import { ShopifyProductPreview } from '@/components/ShopifyProductPreview';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, Pencil, X, XCircle, Zap,
} from 'lucide-react';
import { ProductFormData, ProductSize, AVAILABLE_SIZES, COLLECTIONS } from '@/types/product';
import type { ShopifyStore } from '@/hooks/useStoreManager';
import type { Project } from '@/types/project';

// Loose typings to avoid coupling to internal hook return shapes.
type Understanding = {
  finalProductType?: string | null;
  aiDetectedProductType?: string | null;
  manualMaterial: string;
  manualStyle: string;
  manualFit: string;
  manualColor: string;
  useCase: string;
  imageInsights: {
    mainColor?: string;
    style?: string;
    materialLook?: string;
    silhouette?: string;
  };
};

type ManualFieldKey = 'manualMaterial' | 'manualStyle' | 'manualFit' | 'manualColor' | 'useCase';

export interface PublishWizardProps {
  // Wizard state
  wizardStep: number;
  setWizardStep: Dispatch<SetStateAction<number>>;
  completedSteps: Set<number>;
  stepLabels: string[];
  goToStep: (step: number) => void;
  markStepComplete: (step: number) => void;

  // Editing
  editingShopifyProductId: string | null;
  onExitEditing: () => void;

  // Form
  form: ProductFormData;
  setFormWithSave: (updater: ProductFormData | ((prev: ProductFormData) => ProductFormData)) => void;
  toggleSize: (size: ProductSize) => void;

  // SEO
  seoTitle: string;
  seoDescription: string;
  setSeoTitleWithSave: (v: string) => void;
  setSeoDescriptionWithSave: (v: string) => void;

  // Colors
  colors: ProductColor[];
  setColors: Dispatch<SetStateAction<ProductColor[]>>;

  // Images
  imageFile: File | null;
  setImageFile: Dispatch<SetStateAction<File | null>>;
  imagePreview: string | null;
  setImagePreview: Dispatch<SetStateAction<string | null>>;
  generatedImages: GeneratedImage[];
  setGeneratedImages: Dispatch<SetStateAction<GeneratedImage[]>>;
  savedToLibraryRef: React.MutableRefObject<Set<string>>;
  savedToProjectRef: React.MutableRefObject<Set<string>>;
  deletedProjectImageUrlsRef: React.MutableRefObject<Set<string>>;

  // Project / store
  project: Project | null;
  addImage: (url: string, prompt: string | null, isCover: boolean) => void;
  removeProjectImage: (id: string) => void;
  updateStep: (step: number) => void;
  activeStore: ShopifyStore | null | undefined;
  hasConnectedStore: boolean;
  currencySymbol: string;
  activeStoreLangLabel: string;

  // AI
  understanding: Understanding;
  isAnalyzing: boolean;
  setManualField: (key: ManualFieldKey, value: string) => void;
  setManualProductType: (v: string) => void;
  analyzeImage: (url: string) => void;
  updateFinalFromTitle: (v: string) => void;
  clearSpecs: () => void;
  specs: unknown;
  isGeneratingSpecs: boolean;
  ensureSpecs: () => Promise<void>;
  handleRegenerateSpecs: () => Promise<void>;
  aiContext: string;
  aiDisabled: boolean;

  // Copy / publish UI state
  copyTone: 'minimal' | 'bold' | 'casual' | 'editorial';
  usedTitleNames: string[];
  setUsedTitleNames: Dispatch<SetStateAction<string[]>>;
  publishStatus: 'draft' | 'active' | 'scheduled';
  setPublishStatus: Dispatch<SetStateAction<'draft' | 'active' | 'scheduled'>>;
  pubOpen: boolean;
  setPubOpen: Dispatch<SetStateAction<boolean>>;
  optimizeImages: boolean;
  setOptimizeImages: Dispatch<SetStateAction<boolean>>;
  imageQualityPreset: ImageQualityPreset;
  setImageQualityPreset: Dispatch<SetStateAction<ImageQualityPreset>>;
  canPublish: boolean;
  handlePublish: () => Promise<void> | void;
}

export function PublishWizard(props: PublishWizardProps) {
  const {
    wizardStep, setWizardStep, completedSteps, stepLabels, goToStep, markStepComplete,
    editingShopifyProductId, onExitEditing,
    form, setFormWithSave, toggleSize,
    seoTitle, seoDescription, setSeoTitleWithSave, setSeoDescriptionWithSave,
    colors, setColors,
    imageFile, setImageFile, imagePreview, setImagePreview,
    generatedImages, setGeneratedImages,
    savedToLibraryRef, savedToProjectRef, deletedProjectImageUrlsRef,
    project, addImage, removeProjectImage, updateStep,
    activeStore, hasConnectedStore, currencySymbol, activeStoreLangLabel,
    understanding, isAnalyzing, setManualField, setManualProductType,
    analyzeImage, updateFinalFromTitle, clearSpecs, specs, isGeneratingSpecs,
    ensureSpecs, handleRegenerateSpecs, aiContext, aiDisabled,
    copyTone, usedTitleNames, setUsedTitleNames,
    publishStatus, setPublishStatus, pubOpen, setPubOpen,
    optimizeImages, setOptimizeImages, imageQualityPreset, setImageQualityPreset,
    canPublish, handlePublish,
  } = props;

  const hasImage = !!imageFile || generatedImages.some(i => i.url);

  return (
    <div className="animate-fade-in flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>
      <div className="mb-2 flex items-center gap-3">
        <h2 className="font-display text-lg font-bold text-foreground leading-tight">Publicar Produto</h2>
        {editingShopifyProductId && (
          <div className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))] border border-[hsl(var(--warning)/0.3)]">
              <Pencil className="w-3 h-3" />
              Editando produto existente
            </span>
            <button
              onClick={onExitEditing}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary border border-border transition-colors"
            >
              <X className="w-3 h-3" />
              Sair da edição
            </button>
          </div>
        )}
      </div>

      <WizardStepTabs
        steps={stepLabels}
        current={wizardStep}
        completed={completedSteps}
        onSelect={goToStep}
      />

      <div className="flex-1">
        {wizardStep === 1 && (
          <ImageGenerationStep
            images={generatedImages}
            onImagesChange={(imgs) => {
              try {
                const removedImages = generatedImages.filter(
                  old => !imgs.some(n => n.id === old.id)
                );
                if (removedImages.length > 0) {
                  if (project) {
                    removedImages.forEach(img => {
                      if (img.url) savedToProjectRef.current.delete(img.url);
                      if (img.url && !img.url.startsWith('data:')) {
                        deletedProjectImageUrlsRef.current.add(img.url);
                      }
                      const dbImage = project.images.find(pi => pi.url === img.url);
                      if (dbImage) {
                        removeProjectImage(dbImage.id);
                      }
                    });
                  }
                  supabase.auth.getUser().then(({ data: { user: u } }) => {
                    if (!u) return;
                    removedImages.forEach(img => {
                      if (img.url && !img.url.startsWith('data:')) {
                        supabase.from('image_library').delete()
                          .eq('user_id', u.id)
                          .eq('url', img.url)
                          .then(() => {});
                      }
                    });
                  });
                }

                setGeneratedImages(imgs);

                if (project) {
                  const newImgs = imgs.filter(i =>
                    i.url && !i.url.startsWith('data:') &&
                    !savedToProjectRef.current.has(i.url!) &&
                    !deletedProjectImageUrlsRef.current.has(i.url!) &&
                    !project.images.some(pi => pi.url === i.url)
                  );
                  newImgs.forEach((i) => {
                    const isCover = !imageFile && (imgs.indexOf(i) === 0 || i.isCover);
                    deletedProjectImageUrlsRef.current.delete(i.url!);
                    savedToProjectRef.current.add(i.url!);
                    addImage(i.url!, null, isCover);
                  });
                }

                const newImgs = imgs.filter(i => i.url && !i.url.startsWith('data:') && !savedToLibraryRef.current.has(i.id));
                if (newImgs.length > 0) {
                  supabase.auth.getUser().then(({ data: { user: u } }) => {
                    if (!u) return;
                    const rows = newImgs.map(i => ({
                      user_id: u.id,
                      name: i.angle || 'imagem',
                      url: i.url!,
                      angle: i.angle,
                      product_name: form.title || null,
                      tags: [] as string[],
                    }));
                    supabase.from('image_library').insert(rows).then(() => {
                      newImgs.forEach(i => savedToLibraryRef.current.add(i.id));
                    });
                  });
                }

                const cover = imgs.find(i => i.isCover) || imgs[0];
                if (cover) {
                  setImagePreview(cover.url);
                  if (cover.url && !cover.url.startsWith('data:')) {
                    analyzeImage(cover.url);
                  }
                  if (cover.url && cover.url.startsWith('data:')) {
                    fetch(cover.url).then(r => r.blob()).then(blob => {
                      const file = new File([blob], 'product-image.png', { type: 'image/png' });
                      setImageFile(file);
                    }).catch(e => logger.error('Fetch cover error', e));
                  }
                }
              } catch (err) {
                logger.error('onImagesChange crashed', err);
              }
            }}
            onNext={() => { markStepComplete(1); setWizardStep(2); updateStep(2); }}
            onSkip={() => { markStepComplete(1); setWizardStep(2); updateStep(2); }}
            initialPrompt={(() => {
              const insights = project?.aiData?.imageInsights as { importedFrom?: string } | undefined;
              if (insights?.importedFrom === 'aliexpress') {
                return project?.productData?.title || '';
              }
              return '';
            })()}
            aliSourceImages={(() => {
              const insights = project?.aiData?.imageInsights as { importedFrom?: string; sourceImages?: string[] } | undefined;
              if (insights?.importedFrom === 'aliexpress') {
                return insights?.sourceImages || [];
              }
              return [];
            })()}
            onAliVariantsSelected={(urls) => {
              const newColors: ProductColor[] = urls.map((url, i) => ({
                id: crypto.randomUUID(),
                name: `Variante ${colors.length + i + 1}`,
                hex: '#cccccc',
                imageUrl: url,
              }));
              setColors(prev => [...prev, ...newColors]);
              toast.success(`${newColors.length} variante${newColors.length > 1 ? 's' : ''} adicionada${newColors.length > 1 ? 's' : ''}. Edite no Step 3.`);
            }}
          />
        )}

        {wizardStep === 2 && (
          <div className="grid grid-cols-[260px_1fr] gap-3">
            <SEOCard
              title={seoTitle}
              description={seoDescription}
              storeDomain={activeStore?.domain || ''}
              productTitle={form.title}
              onTitleChange={setSeoTitleWithSave}
              onDescriptionChange={setSeoDescriptionWithSave}
              compact
              language={activeStoreLangLabel}
              languageCode={activeStore?.marketConfig?.language || 'en-US'}
              countryName={activeStore?.marketConfig?.marketName || ''}
              productContext={aiContext}
              aiDisabled={aiDisabled}
            />

            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-[13px] text-foreground">Detalhes do produto</h3>
                <button
                  onClick={() => {
                    setFormWithSave(prev => ({
                      ...prev,
                      title: '',
                      description: '',
                      collection: '',
                      productType: '',
                      gender: '',
                      tags: '',
                    }));
                    setManualField('manualMaterial', '');
                    setManualField('manualStyle', '');
                    setManualField('manualFit', '');
                    setManualField('manualColor', '');
                    setManualField('useCase', '');
                    setManualProductType('');
                    clearSpecs();
                    setSeoTitleWithSave('');
                    setSeoDescriptionWithSave('');
                  }}
                  className="text-[10px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Limpar campos
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-medium text-muted-foreground">Título *</Label>
                  <AIFieldButtons
                    type="title"
                    brief={understanding.finalProductType || form.productType || form.description || form.title || ''}
                    language={activeStoreLangLabel}
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
                    productSpecs={specs}
                    onBeforeGenerate={ensureSpecs}
                    disabled={aiDisabled}
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
                    language={activeStoreLangLabel}
                    languageCode={activeStore?.marketConfig?.language || 'en-US'}
                    countryName={activeStore?.marketConfig?.marketName || ''}
                    countryFlag={activeStore?.marketConfig?.countryFlag || ''}
                    currentValue={form.description}
                    onGenerated={html => setFormWithSave(prev => ({ ...prev, description: html }))}
                    tone={copyTone}
                    productContext={aiContext}
                    gender={form.gender}
                    productSpecs={specs}
                    onBeforeGenerate={ensureSpecs}
                    disabled={aiDisabled}
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
                  <Select value={form.gender} onValueChange={v => setFormWithSave(prev => ({ ...prev, gender: v as ProductFormData['gender'] }))}>
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

              {!aiDisabled && (
                <AIProductUnderstandingPanel
                  understanding={understanding}
                  gender={form.gender}
                  specs={specs}
                  isGeneratingSpecs={isGeneratingSpecs}
                  onRegenerateSpecs={handleRegenerateSpecs}
                />
              )}
            </div>
          </div>
        )}

        {wizardStep === 3 && (
          <div className="grid grid-cols-[1fr_320px] gap-3">
            <div className="space-y-3">
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
                <PricingEngine
                  cost={form.cost}
                  currency={form.pricingCurrency}
                  cpa={form.pricingCpa}
                  marginTarget={form.pricingMargin}
                  shippingCost={form.pricingShipping}
                  platform={form.pricingPlatform}
                  onCostChange={v => setFormWithSave(prev => ({ ...prev, cost: v }))}
                  onCurrencyChange={v => setFormWithSave(prev => ({ ...prev, pricingCurrency: v }))}
                  onCpaChange={v => setFormWithSave(prev => ({ ...prev, pricingCpa: v }))}
                  onMarginChange={v => setFormWithSave(prev => ({ ...prev, pricingMargin: v }))}
                  onShippingChange={v => setFormWithSave(prev => ({ ...prev, pricingShipping: v }))}
                  onPlatformChange={v => setFormWithSave(prev => ({ ...prev, pricingPlatform: v }))}
                  onApplyPrice={v => setFormWithSave(prev => ({ ...prev, price: v }))}
                />
              </div>

              <div className="glass-card p-4 space-y-3">
                <h3 className="font-display font-semibold text-[13px] text-foreground">Sizes & Variants</h3>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {AVAILABLE_SIZES.map(size => (
                    <button key={size} type="button" onClick={() => toggleSize(size)} className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${form.sizes.includes(size) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>{size}</button>
                  ))}
                  {form.sizes.filter(s => !AVAILABLE_SIZES.includes(s)).map(size => (
                    <button key={size} type="button" onClick={() => toggleSize(size)} className="px-2.5 py-1 rounded-md text-xs font-medium bg-primary text-primary-foreground flex items-center gap-1">
                      {size}
                      <XCircle className="w-3 h-3" />
                    </button>
                  ))}
                  <AddCustomSize onAdd={(s) => {
                    if (!form.sizes.includes(s)) {
                      toggleSize(s);
                    }
                  }} />
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

            <div className="space-y-3">
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
        )}

        {wizardStep === 4 && (
          <div className="grid grid-cols-[340px_1fr] gap-3">
            <div className="space-y-3">
              <div className="glass-card p-4">
                <ReviewChecklist
                  form={form}
                  hasImage={hasImage}
                  imageCount={(imageFile ? 1 : 0) + generatedImages.filter(i => i.url).length}
                  storeConnected={hasConnectedStore}
                />
              </div>

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
                                  ? 'border-foreground bg-foreground/5 text-foreground'
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
                        {!hasImage && <li>• Pelo menos 1 imagem</li>}
                        {form.price <= 0 && <li>• Preço maior que 0</li>}
                        {form.variants.length === 0 && form.sizes.length === 0 && <li>• Pelo menos 1 variante</li>}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            <ShopifyProductPreview
              form={form}
              images={generatedImages}
              imagePreview={imagePreview}
              storeDomain={activeStore?.domain || ''}
              currencySymbol={currencySymbol}
              storeLogo={activeStore?.logoUrl}
            />
          </div>
        )}
      </div>

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
  );
}