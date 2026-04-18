import { useState, useRef, useCallback, DragEvent, useEffect, ClipboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useUserPrompts } from '@/hooks/useUserPrompts';
import { toast } from 'sonner';
import { useApiUsage } from '@/hooks/useApiUsage';
import {
  Sparkles, Loader2, Upload, Plus, RefreshCw, Trash2, Star,
  ArrowRight, ImageIcon, X, Info, Eye, GripVertical, Square, RectangleVertical,
  Clock, Check, ChevronLeft, ChevronRight, Camera, BookOpen, Search, ClipboardPaste
} from 'lucide-react';
import { ModelBackgroundPresets, getModelDescriptor, getBackgroundDescriptor, getModelImage, getBackgroundImage, type CustomPreset } from '@/components/ModelBackgroundPresets';
import { useCustomPresets } from '@/hooks/useCustomPresets';

export type AspectRatio = '1:1' | '4:5';

export type ImageAngle =
  | 'frente' | 'costas' | 'detalhe' | 'lateral'
  | 'flat_lay' | 'textura' | 'look_completo' | 'personalizado';

interface AngleOption {
  id: ImageAngle;
  label: string;
  defaultChecked: boolean;
}

const ANGLE_OPTIONS: AngleOption[] = [
  { id: 'frente', label: 'Frente', defaultChecked: false },
  { id: 'costas', label: 'Costas', defaultChecked: false },
  { id: 'detalhe', label: 'Detalhe', defaultChecked: false },
  { id: 'lateral', label: 'Lateral', defaultChecked: false },
  { id: 'flat_lay', label: 'Flat lay', defaultChecked: false },
  { id: 'textura', label: 'Textura', defaultChecked: false },
  { id: 'look_completo', label: 'Look completo', defaultChecked: false },
  { id: 'personalizado', label: '+ Custom', defaultChecked: false },
];

export interface GeneratedImage {
  id: string;
  angle: ImageAngle;
  url: string;
  isCover: boolean;
  justCompleted?: boolean;
}

const VALID_IMAGE_ANGLES = new Set<ImageAngle>(ANGLE_OPTIONS.map((option) => option.id));

function sanitizeGeneratedImages(images: GeneratedImage[]): GeneratedImage[] {
  const seen = new Set<string>();
  return (images ?? [])
    .map((image, index) => {
      if (!image || typeof image.url !== 'string' || !image.url.trim()) return null;
      const angle = typeof image.angle === 'string' && VALID_IMAGE_ANGLES.has(image.angle as ImageAngle)
        ? image.angle as ImageAngle : 'frente';
      const id = typeof image.id === 'string' && image.id.trim() ? image.id : `generated-${angle}-${index}`;
      const signature = `${id}:${image.url}`;
      if (seen.has(signature)) return null;
      seen.add(signature);
      return { id, angle, url: image.url, isCover: Boolean(image.isCover), justCompleted: Boolean(image.justCompleted) };
    })
    .filter((image): image is NonNullable<typeof image> => image !== null);
}

interface ImageGenerationStepProps {
  images: GeneratedImage[];
  onImagesChange: (images: GeneratedImage[]) => void;
  onNext: () => void;
  onSkip: () => void;
  aspectRatio?: AspectRatio;
  onAspectRatioChange?: (ratio: AspectRatio) => void;
  initialPrompt?: string;
  aliSourceImages?: string[];
}

type PromptMode = 'simple' | 'custom';
type ConfigTab = 'prompt' | 'style' | 'angles';

async function imageUrlToBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    if (url.startsWith('data:')) {
      const match = url.match(/^data:([^;]+);base64,(.+)$/);
      if (match) return { mimeType: match[1], base64: match[2] };
      return null;
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const match = result.match(/^data:([^;]+);base64,(.+)$/);
        if (match) resolve({ mimeType: match[1], base64: match[2] });
        else resolve(null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

function buildPremiumPrompt(userPrompt: string, modelDesc: string, bgDesc: string, angle?: string, proportion?: string): string {
  const productDesc = userPrompt.trim() || 'High-end fashion product';
  const background = bgDesc || 'Clean white studio background';
  const model = modelDesc || 'No model — product only';
  const angleLabel = angle || 'front view';
  const prop = proportion || '1:1';

  return `High-end e-commerce product photography.

PRODUCT:
${productDesc}

━━━━━━━━━━━━━━━━━━━━━━━

STRICT RULES (MUST FOLLOW)
- The product must be 100% fully visible
- No cropping allowed
- No zoom cutting the product
- Keep full silhouette inside frame
- Centered composition with safe margins

━━━━━━━━━━━━━━━━━━━━━━━

CONFIGURATION (MANDATORY)
BACKGROUND: ${background}
ANGLE: ${angleLabel}
MODEL: ${model}
PROPORTION: ${prop}
These must be followed exactly.

━━━━━━━━━━━━━━━━━━━━━━━

STYLE
- clean background
- soft shadows
- realistic lighting
- premium fashion photography
- Shopify-ready image

━━━━━━━━━━━━━━━━━━━━━━━

NEGATIVE
- cropped product
- cut edges
- zoomed in
- wrong background
- distorted clothing
- unrealistic proportions
- messy composition

━━━━━━━━━━━━━━━━━━━━━━━

FINAL
Generate a clean, centered product image that strictly follows all rules.`;
}

export function ImageGenerationStep({ images, onImagesChange, onNext, onSkip, aspectRatio: externalRatio, onAspectRatioChange, initialPrompt, aliSourceImages }: ImageGenerationStepProps) {
  const navigate = useNavigate();
  const { prompts: allPrompts, recentPrompts: allRecentPrompts, incrementUsage } = useUserPrompts();
  const { logUsage } = useApiUsage();
  const safeImages = sanitizeGeneratedImages(images);
  const savedPrompts = allPrompts.filter(p => p.category === 'imagem');
  const recentPrompts = allRecentPrompts.filter(p => p.category === 'imagem');
  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const [promptDropdownOpen, setPromptDropdownOpen] = useState(false);
  const [promptSearch, setPromptSearch] = useState('');
  const promptDropdownRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [showAliRef, setShowAliRef] = useState(true);
  const [promptMode, setPromptMode] = useState<PromptMode>('simple');
  const [customAngleText, setCustomAngleText] = useState('');
  const [selectedAngles, setSelectedAngles] = useState<Set<ImageAngle>>(
    new Set(ANGLE_OPTIONS.filter(a => a.defaultChecked).map(a => a.id))
  );
  const [generatingAngles, setGeneratingAngles] = useState<Set<ImageAngle>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const lastUsedPromptRef = useRef<string>('');
  const [generatedCount, setGeneratedCount] = useState(0);
  const [totalToGenerate, setTotalToGenerate] = useState(0);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const addReferenceImage = useCallback((dataUrl: string) => {
    setReferenceImages(prev => prev.includes(dataUrl) ? prev : [...prev, dataUrl].slice(0, 6));
  }, []);
  const removeReferenceAt = useCallback((idx: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== idx));
  }, []);
  const [genStartTime, setGenStartTime] = useState<number | null>(null);
  const [angleStartTimes, setAngleStartTimes] = useState<Record<string, number>>({});
  const [completedAngles, setCompletedAngles] = useState<Set<ImageAngle>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const { presets: customPresets, addPreset: addCustomPreset, removePreset: removeCustomPreset } = useCustomPresets();
  const [hiddenBuiltinIds, setHiddenBuiltinIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('hidden-builtin-presets') || '[]'); } catch { return []; }
  });
  const hideBuiltinPreset = useCallback((id: string) => {
    setHiddenBuiltinIds(prev => { const next = [...prev, id]; localStorage.setItem('hidden-builtin-presets', JSON.stringify(next)); return next; });
    toast.success('Preset ocultado');
  }, []);
  const restoreBuiltinPresets = useCallback(() => {
    setHiddenBuiltinIds([]); localStorage.removeItem('hidden-builtin-presets');
    toast.success('Presets restaurados');
  }, []);

  // Config tab state
  const [configTab, setConfigTab] = useState<ConfigTab>('prompt');

  // Handle paste from clipboard
  const handlePasteReference = useCallback((e: ClipboardEvent | globalThis.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        if (file.size > 10 * 1024 * 1024) { toast.error('Arquivo muito grande. Máx. 10MB.'); return; }
        const reader = new FileReader();
        reader.onload = () => addReferenceImage(reader.result as string);
        reader.readAsDataURL(file);
        return;
      }
    }
  }, []);

  useEffect(() => {
    const handler = (e: globalThis.ClipboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      handlePasteReference(e);
    };
    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [handlePasteReference]);

  const handlePasteFromButton = useCallback(async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find(t => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          if (blob.size > 10 * 1024 * 1024) { toast.error('Arquivo muito grande. Máx. 10MB.'); return; }
          const reader = new FileReader();
          reader.onload = () => addReferenceImage(reader.result as string);
          reader.readAsDataURL(blob);
          return;
        }
      }
      toast.error('Nenhuma imagem encontrada na área de transferência.');
    } catch { toast.error('Não foi possível acessar a área de transferência.'); }
  }, []);

  useEffect(() => {
    if (!promptDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (promptDropdownRef.current && !promptDropdownRef.current.contains(e.target as Node)) setPromptDropdownOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPromptDropdownOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
  }, [promptDropdownOpen]);

  const [ratio, setRatio] = useState<AspectRatio>(() => {
    return (localStorage.getItem('publify_aspect_ratio') as AspectRatio) || '4:5';
  });
  const activeRatio = externalRatio ?? ratio;
  const handleRatioChange = (r: AspectRatio) => {
    setRatio(r);
    localStorage.setItem('publify_aspect_ratio', r);
    onAspectRatioChange?.(r);
  };

  const selectedCount = selectedAngles.size;
  const hasAtLeastOneImage = safeImages.length > 0;

  const toggleAngle = (angle: ImageAngle) => {
    setSelectedAngles(prev => {
      const next = new Set(prev);
      if (next.has(angle)) next.delete(angle); else next.add(angle);
      return next;
    });
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    files.forEach(file => {
      if (!validTypes.includes(file.type)) { toast.error(`${file.name}: formato inválido (PNG/JPG/WEBP).`); return; }
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: arquivo muito grande (máx 10MB).`); return; }
      const reader = new FileReader();
      reader.onload = () => addReferenceImage(reader.result as string);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleAliRefClick = useCallback(async (url: string) => {
    try {
      toast.loading('Carregando referência...', { id: 'ali-ref' });
      const res = await fetch(url);
      if (!res.ok) throw new Error('Falha ao carregar imagem');
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = () => {
        addReferenceImage(reader.result as string);
        toast.success('Referência definida!', { id: 'ali-ref' });
      };
      reader.onerror = () => toast.error('Erro ao carregar imagem', { id: 'ali-ref' });
      reader.readAsDataURL(blob);
    } catch { toast.error('Não foi possível carregar esta imagem como referência', { id: 'ali-ref' }); }
  }, []);

  const generateImages = useCallback(async () => {
    if (selectedAngles.size === 0) return;
    const effectivePrompt = prompt.trim() || 'Professional e-commerce product photo, white background, studio lighting';
    lastUsedPromptRef.current = effectivePrompt;
    const angles = Array.from(selectedAngles);
    const existingImages = sanitizeGeneratedImages(images);
    const now = Date.now();
    setIsGenerating(true);
    setGeneratingAngles(new Set(angles));
    setGeneratedCount(0);
    setTotalToGenerate(angles.length);
    setGenStartTime(now);
    setCompletedAngles(new Set());
    setAngleStartTimes(Object.fromEntries(angles.map(a => [a, now])));
    const newImages: GeneratedImage[] = [];
    const isCustomPrompt = promptMode === 'custom';
    const modelDesc = getModelDescriptor(selectedModel, customPresets);
    const bgDesc = getBackgroundDescriptor(selectedBackground, customPresets);
    const hasPresets = !!(modelDesc || bgDesc);
    const angleLabels = angles.map(a => ANGLE_OPTIONS.find(o => o.id === a)?.label || a).join(', ');
    const enrichedPromptBase = (angle: string) => buildPremiumPrompt(effectivePrompt, modelDesc, bgDesc, ANGLE_OPTIONS.find(o => o.id === angle)?.label || angle, activeRatio);
    const modelImgUrl = getModelImage(selectedModel, customPresets);
    const bgImgUrl = getBackgroundImage(selectedBackground, customPresets);
    const [modelImageData, bgImageData] = await Promise.all([
      modelImgUrl ? imageUrlToBase64(modelImgUrl) : Promise.resolve(null),
      bgImgUrl ? imageUrlToBase64(bgImgUrl) : Promise.resolve(null),
    ]);
    // Convert all reference images to base64 once
    const parsedRefs = referenceImages
      .map(d => {
        const m = d.match(/^data:([^;]+);base64,(.+)$/);
        return m ? { mimeType: m[1], base64: m[2] } : null;
      })
      .filter((r): r is { mimeType: string; base64: string } => r !== null);
    const primaryRef = parsedRefs[0];
    const additionalRefs = parsedRefs.slice(1);
    const promises = angles.map(async (angle) => {
      try {
        const enrichedPrompt = enrichedPromptBase(angle);
        const { data, error } = await supabase.functions.invoke('generate-with-gemini', {
          body: {
            mode: 'generate-image', prompt: enrichedPrompt, angle,
            customAngleText: angle === 'personalizado' ? customAngleText : undefined,
            isCustomPrompt,
            referenceImage: primaryRef?.base64, referenceMimeType: primaryRef?.mimeType,
            additionalReferences: additionalRefs.length > 0 ? additionalRefs : undefined,
            aspectRatio: activeRatio, hasPresets,
            modelPresetImage: modelImageData?.base64, modelPresetMimeType: modelImageData?.mimeType,
            bgPresetImage: bgImageData?.base64, bgPresetMimeType: bgImageData?.mimeType,
          },
        });
        if (error) { toast.error(`Erro ao gerar imagem (${ANGLE_OPTIONS.find(a => a.id === angle)?.label})`); return null; }
        if (data?.error) { toast.error(data.error); return null; }
        const imageUrl = data?.imageUrl;
        if (!imageUrl) { toast.error(`Nenhuma imagem retornada (${ANGLE_OPTIONS.find(a => a.id === angle)?.label})`); return null; }
        const newImage: GeneratedImage = { id: crypto.randomUUID(), angle, url: imageUrl, isCover: false, justCompleted: true };
        newImages.push(newImage);
        logUsage({ service: 'image-generation', action: `Gerar imagem (${angle})`, metadata: { model: 'gemini-2.5-flash-preview-05-20', provider: 'Google Gemini Direct', refsCount: parsedRefs.length } });
        setGeneratedCount(prev => prev + 1);
        setCompletedAngles(prev => new Set(prev).add(angle));
        setGeneratingAngles(prev => { const next = new Set(prev); next.delete(angle); return next; });
        const snapshot = [...existingImages, ...newImages];
        if (snapshot.length > 0 && !snapshot.some(r => r.isCover)) snapshot[0].isCover = true;
        try { onImagesChange(snapshot); } catch (e) { console.error('onImagesChange error:', e); }
        return newImage;
      } catch (err) { toast.error(`Erro ao gerar imagem (${angle})`); return null; }
    });
    try { await Promise.all(promises); } catch (err) { console.error('Promise.all error:', err); }
    const allFinal = [...existingImages, ...newImages];
    if (allFinal.length > 0 && !allFinal.some(r => r.isCover)) allFinal[0].isCover = true;
    try { onImagesChange(allFinal.map(r => ({ ...r, justCompleted: false }))); } catch (e) { console.error('Final onImagesChange error:', e); }
    setIsGenerating(false);
    setGeneratingAngles(new Set());
    setGenStartTime(null);
    setAngleStartTimes({});
    const elapsed = ((Date.now() - now) / 1000).toFixed(0);
    if (newImages.length > 0) toast.success(`${newImages.length} imagens geradas em ${elapsed}s ✓`);
    setTimeout(() => { setCompletedAngles(new Set()); }, 2500);
  }, [prompt, promptMode, selectedAngles, customAngleText, referenceImage, images, onImagesChange, activeRatio]);

  const regenerateImage = useCallback(async (imageId: string) => {
    const existingImages = sanitizeGeneratedImages(images);
    const target = existingImages.find(i => i.id === imageId);
    if (!target) return;
    const effectivePrompt = prompt.trim() || lastUsedPromptRef.current;
    if (!effectivePrompt) { toast.error('Nenhum prompt disponível para regenerar.'); return; }
    const modelDesc = getModelDescriptor(selectedModel, customPresets);
    const bgDesc = getBackgroundDescriptor(selectedBackground, customPresets);
    const hasPresets = !!(modelDesc || bgDesc);
    const enrichedPrompt = buildPremiumPrompt(effectivePrompt, modelDesc, bgDesc, ANGLE_OPTIONS.find(o => o.id === target.angle)?.label || target.angle, activeRatio);
    const modelImgUrl = getModelImage(selectedModel, customPresets);
    const bgImgUrl = getBackgroundImage(selectedBackground, customPresets);
    const [modelImageData, bgImageData] = await Promise.all([
      modelImgUrl ? imageUrlToBase64(modelImgUrl) : Promise.resolve(null),
      bgImgUrl ? imageUrlToBase64(bgImgUrl) : Promise.resolve(null),
    ]);
    setGeneratingAngles(new Set([target.angle]));
    try {
      let refBase64: string | undefined;
      let refMimeType: string | undefined;
      if (referenceImage) {
        const match = referenceImage.match(/^data:([^;]+);base64,(.+)$/);
        if (match) { refMimeType = match[1]; refBase64 = match[2]; }
      }
      const { data, error } = await supabase.functions.invoke('generate-with-gemini', {
        body: {
          mode: 'generate-image', prompt: enrichedPrompt, angle: target.angle,
          customAngleText: target.angle === 'personalizado' ? customAngleText : undefined,
          isCustomPrompt: promptMode === 'custom', referenceImage: refBase64, referenceMimeType: refMimeType,
          aspectRatio: activeRatio, hasPresets,
          modelPresetImage: modelImageData?.base64, modelPresetMimeType: modelImageData?.mimeType,
          bgPresetImage: bgImageData?.base64, bgPresetMimeType: bgImageData?.mimeType,
        },
      });
      if (error || data?.error) { toast.error('Erro ao regenerar imagem'); return; }
      const updated = existingImages.map(img => img.id === imageId ? { ...img, url: data.imageUrl } : img);
      onImagesChange(updated);
      toast.success('Imagem regenerada!');
    } catch { toast.error('Erro ao regenerar imagem'); } finally { setGeneratingAngles(new Set()); }
  }, [prompt, promptMode, customAngleText, referenceImage, images, onImagesChange, activeRatio]);

  const removeImage = (imageId: string) => {
    const updated = sanitizeGeneratedImages(images).filter(img => img.id !== imageId);
    if (updated.length > 0 && !updated.some(i => i.isCover)) updated[0].isCover = true;
    onImagesChange(updated);
  };

  const setCover = (imageId: string) => {
    const updated = sanitizeGeneratedImages(images).map(img => ({ ...img, isCover: img.id === imageId }));
    onImagesChange(updated);
  };

  const bulkRemove = (imageIds: string[]) => {
    const updated = sanitizeGeneratedImages(images).filter(img => !imageIds.includes(img.id));
    if (updated.length > 0 && !updated.some(i => i.isCover)) updated[0].isCover = true;
    onImagesChange(updated);
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) { toast.error('Formato inválido. Use PNG, JPG ou WEBP.'); return; }
    const existingImages = sanitizeGeneratedImages(images);
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      const newImage: GeneratedImage = { id: crypto.randomUUID(), angle: 'frente', url, isCover: existingImages.length === 0 };
      onImagesChange([...existingImages, newImage]);
    };
    reader.readAsDataURL(file);
  };

  // Tab items
  const tabs: { id: ConfigTab; label: string; icon: React.ReactNode }[] = [
    { id: 'prompt', label: 'Prompt', icon: <Sparkles className="w-3 h-3" /> },
    { id: 'style', label: 'Estilo', icon: <ImageIcon className="w-3 h-3" /> },
    { id: 'angles', label: 'Ângulos', icon: <Camera className="w-3 h-3" /> },
  ];

  return (
    <div className="grid grid-cols-[220px_1fr_1fr] gap-2 h-[calc(100vh-180px)] min-h-[500px]">

      {/* ═══ LEFT COLUMN — Reference & Upload ═══ */}
      <div className="flex flex-col gap-2 overflow-y-auto pr-1 custom-scrollbar">
        {/* Reference image section */}
        <div className="glass-card p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Referência</span>
            <div className="flex gap-1">
              <button onClick={() => refImageInputRef.current?.click()} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                <Upload className="w-2.5 h-2.5" /> Subir
              </button>
              <button onClick={handlePasteFromButton} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                <ClipboardPaste className="w-2.5 h-2.5" /> Colar
              </button>
            </div>
            <input ref={refImageInputRef} type="file" accept=".png,.jpg,.jpeg,.webp" onChange={handleReferenceUpload} className="hidden" />
          </div>

          {referenceImage ? (
            <div className="relative rounded-lg overflow-hidden border border-border aspect-square">
              <img src={referenceImage} alt="Referência" className="w-full h-full object-contain bg-black/5" />
              <button onClick={() => setReferenceImage(null)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-destructive transition-colors">
                <X className="w-3 h-3" />
              </button>
              <span className="absolute bottom-1 left-1 text-[8px] px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm text-white/90">Ativa</span>
            </div>
          ) : (
            <div className="border border-dashed border-border/60 rounded-lg aspect-square flex flex-col items-center justify-center gap-1.5 bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer" onClick={() => refImageInputRef.current?.click()}>
              <Camera className="w-5 h-5 text-muted-foreground/40" />
              <span className="text-[9px] text-muted-foreground/60 text-center px-2">Envie uma foto real para guiar a IA</span>
            </div>
          )}
        </div>

        {/* AliExpress references */}
        {aliSourceImages && aliSourceImages.length > 0 && showAliRef && (
          <div className="glass-card p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">📦 AliExpress</span>
              <button onClick={() => setShowAliRef(false)} className="text-muted-foreground hover:text-foreground text-xs leading-none">×</button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {aliSourceImages.map((url, i) => (
                <div key={i} onClick={() => handleAliRefClick(url)} title="Clique para usar como referência"
                  className="relative rounded-md overflow-hidden border border-border/40 cursor-pointer hover:border-primary/50 hover:scale-[1.03] transition-all aspect-square">
                  <img src={url} alt={`ref-${i}`} className="w-full h-full object-contain bg-black/5" onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
                </div>
              ))}
            </div>
            <p className="text-[8px] text-muted-foreground/70 leading-tight">Clique para usar como referência</p>
          </div>
        )}

        {/* Upload manual */}
        <div className="glass-card p-2.5">
          <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.webp" onChange={handleManualUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="w-full border border-dashed border-border/60 rounded-lg py-3 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/40 hover:text-primary/70 transition-colors">
            <Upload className="w-4 h-4" />
            <span className="text-[10px] font-medium">Upload manual</span>
          </button>
        </div>

        {/* Proportion */}
        <div className="glass-card p-2.5 space-y-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Proporção</span>
          <div className="grid grid-cols-2 gap-1">
            <button onClick={() => handleRatioChange('1:1')}
              className={`flex items-center justify-center gap-1 h-7 rounded-md text-[10px] font-medium transition-all border ${
                activeRatio === '1:1' ? 'bg-primary/15 border-primary text-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40'}`}>
              <Square className="w-3 h-3" /> 1:1
            </button>
            <button onClick={() => handleRatioChange('4:5')}
              className={`flex items-center justify-center gap-1 h-7 rounded-md text-[10px] font-medium transition-all border ${
                activeRatio === '4:5' ? 'bg-primary/15 border-primary text-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40'}`}>
              <RectangleVertical className="w-3 h-3" /> 4:5
            </button>
          </div>
          <p className="text-[8px] text-muted-foreground/60">{activeRatio === '1:1' ? '1024×1024px' : '1024×1280px'}</p>
        </div>
      </div>

      {/* ═══ CENTER COLUMN — AI Configuration ═══ */}
      <div className="glass-card p-0 flex flex-col overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-border bg-card/50">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setConfigTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-all border-b-2 ${
                configTab === tab.id
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/30'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">

          {/* ── PROMPT TAB ── */}
          {configTab === 'prompt' && (
            <>
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Descrição do produto</Label>
                  <div className="relative" ref={promptDropdownRef}>
                    <button onClick={() => { setPromptDropdownOpen(!promptDropdownOpen); setPromptSearch(''); }}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-all cursor-pointer ${
                        activePromptId ? 'bg-card border-primary text-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/50'}`}
                      style={{ minWidth: 130 }}>
                      {activePromptId ? (
                        <>
                          <BookOpen className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[80px]">{savedPrompts.find(p => p.id === activePromptId)?.name}</span>
                          <button onClick={e => { e.stopPropagation(); setActivePromptId(null); setPrompt(''); setPromptMode('simple'); }} className="ml-0.5 hover:text-foreground"><X className="w-2.5 h-2.5" /></button>
                        </>
                      ) : (
                        <><span>📝</span><span>Prompt</span></>
                      )}
                      <ChevronRight className={`w-2.5 h-2.5 ml-auto shrink-0 transition-transform ${promptDropdownOpen ? 'rotate-90' : ''}`} />
                    </button>

                    {promptDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1 w-[260px] max-h-[280px] overflow-y-auto bg-card border border-border rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-50">
                        <div className="p-1.5 border-b border-border">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                            <input value={promptSearch} onChange={e => setPromptSearch(e.target.value)} placeholder="Buscar..." className="w-full bg-secondary border-none rounded-md pl-7 pr-2 py-1 text-[10px] text-foreground placeholder:text-muted-foreground/50 outline-none" autoFocus />
                          </div>
                        </div>
                        <button onClick={() => { setActivePromptId(null); setPromptMode('simple'); setPrompt(''); setPromptDropdownOpen(false); }}
                          className={`w-full text-left px-3 py-2 hover:bg-primary/5 transition-colors flex items-start gap-2 ${!activePromptId ? 'bg-primary/10 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'}`}>
                          <span className="text-[11px]">✏️</span>
                          <div><div className="text-[11px] text-foreground font-medium">Descrição simples</div></div>
                        </button>
                        {savedPrompts.length > 0 && (
                          <>
                            <div className="px-3 py-1 border-t border-border"><span className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider">Meus prompts</span></div>
                            {savedPrompts.filter(p => !promptSearch || p.name.toLowerCase().includes(promptSearch.toLowerCase())).map(p => (
                              <button key={p.id} onClick={() => {
                                setPrompt(p.prompt_text); setPromptMode('custom'); setActivePromptId(p.id);
                                if ((p.default_angles ?? []).length > 0) setSelectedAngles(new Set((p.default_angles ?? []) as ImageAngle[]));
                                if (p.default_ratio && onAspectRatioChange) onAspectRatioChange(p.default_ratio as AspectRatio);
                                incrementUsage.mutate(p.id); setPromptDropdownOpen(false);
                              }} className={`w-full text-left px-3 py-1.5 hover:bg-primary/5 transition-colors flex items-start gap-2 ${activePromptId === p.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'}`}>
                                <BookOpen className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <div className="text-[11px] text-foreground font-medium truncate">{p.name}</div>
                                  <div className="text-[9px] text-muted-foreground truncate">{p.prompt_text.slice(0, 40)}...</div>
                                </div>
                              </button>
                            ))}
                          </>
                        )}
                        <div className="border-t border-border px-3 py-1.5">
                          <button onClick={() => { setPromptDropdownOpen(false); navigate('/prompts'); }} className="text-[10px] text-primary hover:text-primary/80 transition-colors">+ Criar novo prompt →</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <Textarea value={prompt} onChange={e => setPrompt(e.target.value.slice(0, activePromptId ? 2000 : 1000))}
                  placeholder={activePromptId ? 'Prompt carregado — edite se necessário' : 'Ex: oversized denim jacket, white background...'}
                  rows={3} className="bg-secondary border-border resize-none text-xs" maxLength={activePromptId ? 2000 : 1000} />
                {activePromptId && (
                  <div className="flex items-center gap-1 mt-1">
                    <Info className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                    <span className="text-[8px] text-muted-foreground">Prompt enviado diretamente</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── STYLE TAB (Model + Background) ── */}
          {configTab === 'style' && (
            <ModelBackgroundPresets
              selectedModel={selectedModel}
              selectedBackground={selectedBackground}
              onModelChange={setSelectedModel}
              onBackgroundChange={setSelectedBackground}
              customPresets={customPresets}
              onAddCustomPreset={addCustomPreset}
              onRemoveCustomPreset={removeCustomPreset}
              hiddenBuiltinIds={hiddenBuiltinIds}
              onHideBuiltinPreset={hideBuiltinPreset}
              onRestoreBuiltinPresets={restoreBuiltinPresets}
            />
          )}

          {/* ── ANGLES TAB ── */}
          {configTab === 'angles' && (
            <div className="space-y-2.5">
              <div>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Ângulos de foto</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {ANGLE_OPTIONS.map(opt => (
                    <button key={opt.id} onClick={() => toggleAngle(opt.id)}
                      className={`h-7 px-3 rounded-full text-[10px] font-medium border transition-all ${
                        selectedAngles.has(opt.id) ? 'bg-primary/15 border-primary text-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-muted-foreground mt-1.5">{selectedCount} {selectedCount === 1 ? 'ângulo selecionado' : 'ângulos selecionados'}</p>
              </div>

              {selectedAngles.has('personalizado') && (
                <div>
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Texto personalizado</Label>
                  <Textarea value={customAngleText} onChange={e => setCustomAngleText(e.target.value.slice(0, 300))} placeholder="Ex: modelo vestindo, ambiente externo..." rows={2} className="mt-1 bg-secondary border-border resize-none text-xs" maxLength={300} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky generate button */}
        <div className="p-3 border-t border-border bg-card/80 backdrop-blur-sm space-y-1.5">
          {isGenerating && genStartTime && <GenerationCountdown startTime={genStartTime} totalImages={totalToGenerate} completedCount={generatedCount} />}
          <Button onClick={isGenerating ? undefined : generateImages} disabled={isGenerating || selectedAngles.size === 0} className="w-full font-display font-semibold h-10 text-xs">
            {isGenerating ? (<><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Gerando {generatedCount}/{totalToGenerate}...</>) : safeImages.length > 0 ? (<><Sparkles className="w-3.5 h-3.5 mr-1.5" />Regenerar tudo</>) : (<><Sparkles className="w-3.5 h-3.5 mr-1.5" />Gerar {selectedCount} {selectedCount === 1 ? 'imagem' : 'imagens'}</>)}
          </Button>
          <p className="text-[9px] text-muted-foreground/60 text-center">~30s por imagem</p>
        </div>
      </div>

      {/* ═══ RIGHT COLUMN — Image Preview (Priority) ═══ */}
      <div className="glass-card p-2.5 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">Preview</h3>
          <span className="text-[9px] text-muted-foreground">
            {isGenerating && safeImages.length === 0 ? `Gerando ${generatedCount + 1}/${totalToGenerate}...` : safeImages.length > 0 ? `${safeImages.length} ${safeImages.length === 1 ? 'imagem' : 'imagens'}` : ''}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Generating skeleton grid */}
          {isGenerating && safeImages.length === 0 ? (
            <div className="grid grid-cols-2 gap-1.5">
              {Array.from(selectedAngles).map((angle, i) => {
                const isDone = completedAngles.has(angle);
                const isActive = generatingAngles.has(angle);
                const label = ANGLE_OPTIONS.find(a => a.id === angle)?.label || angle;
                return (
                  <div key={angle} className={`rounded-lg overflow-hidden border transition-all ${isDone ? 'border-[hsl(var(--success)/0.5)]' : isActive ? 'border-primary/50' : 'border-border/40'}`}
                    style={{ aspectRatio: activeRatio === '4:5' ? '4/5' : '1/1' }}>
                    <div className={`w-full h-full flex flex-col items-center justify-center gap-1.5 ${isActive ? 'skeleton-shimmer' : isDone ? 'bg-[hsl(var(--success)/0.05)]' : 'bg-card'}`}>
                      {isActive && (<><Loader2 className="w-4 h-4 animate-spin text-primary" /><span className="text-[9px] text-muted-foreground">{label}</span>{angleStartTimes[angle] && <MiniTimer startTime={angleStartTimes[angle]} />}</>)}
                      {isDone && (<><Check className="w-4 h-4 text-[hsl(var(--success))]" /><span className="text-[9px] text-[hsl(var(--success))]">{label} ✓</span></>)}
                      {!isActive && !isDone && (<><Clock className="w-3.5 h-3.5 text-muted-foreground/30" /><span className="text-[9px] text-muted-foreground/50">{label}</span></>)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : safeImages.length === 0 ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-[300px]">
              <div className="w-16 h-16 rounded-2xl bg-secondary/40 flex items-center justify-center">
                <Camera className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-[12px] font-medium text-muted-foreground">Nenhuma imagem</p>
                <p className="text-[10px] text-muted-foreground/50 max-w-[180px]">Descreva o produto e clique em Gerar para criar imagens com IA</p>
              </div>
            </div>
          ) : (
            /* Image grid */
            <ImageGrid
              images={safeImages}
              generatingAngles={generatingAngles}
              completedAngles={completedAngles}
              angleStartTimes={angleStartTimes}
              onImagesChange={onImagesChange}
              onRegenerate={regenerateImage}
              onRemove={removeImage}
              onSetCover={setCover}
              onBulkRemove={bulkRemove}
              onUseAsReference={async (url) => {
                if (url.startsWith('data:')) { setReferenceImage(url); toast.success('Referência definida!'); return; }
                try {
                  const res = await fetch(url); const blob = await res.blob();
                  const reader = new FileReader();
                  reader.onload = () => { setReferenceImage(reader.result as string); toast.success('Referência definida!'); };
                  reader.readAsDataURL(blob);
                } catch { toast.error('Erro ao carregar referência.'); }
              }}
              aspectRatio={activeRatio}
              onAddUpload={() => fileInputRef.current?.click()}
            />
          )}
        </div>

        {/* Bottom navigation */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
          <button onClick={onSkip} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Pular</button>
          <Button onClick={onNext} disabled={!hasAtLeastOneImage} size="sm" className="h-7 text-[10px] px-3">
            Próximo <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Image Grid Component ═══ */
interface ImageGridProps {
  images: GeneratedImage[];
  generatingAngles: Set<ImageAngle>;
  completedAngles: Set<ImageAngle>;
  angleStartTimes: Record<string, number>;
  onImagesChange: (images: GeneratedImage[]) => void;
  onRegenerate: (imageId: string) => Promise<void>;
  onRemove: (imageId: string) => void;
  onSetCover: (imageId: string) => void;
  onBulkRemove: (imageIds: string[]) => void;
  onUseAsReference: (imageUrl: string) => void;
  aspectRatio: AspectRatio;
  onAddUpload: () => void;
}

function ImageGrid({ images, generatingAngles, onImagesChange, onRegenerate, onRemove, onSetCover, onBulkRemove, onUseAsReference, aspectRatio, onAddUpload }: ImageGridProps) {
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set());

  const handleRegenerate = useCallback(async (id: string) => {
    setRegeneratingIds(prev => new Set(prev).add(id));
    try { await onRegenerate(id); } finally { setRegeneratingIds(prev => { const next = new Set(prev); next.delete(id); return next; }); }
  }, [onRegenerate]);

  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      {images.length > 1 && (
        <div className="flex items-center justify-between">
          {selectMode ? (
            <div className="flex items-center gap-2 w-full">
              <button onClick={() => setSelectedIds(prev => prev.size === images.length ? new Set() : new Set(images.map(i => i.id)))} className="text-[9px] text-muted-foreground hover:text-foreground">
                {selectedIds.size === images.length ? 'Desmarcar' : 'Todos'}
              </button>
              <span className="text-[9px] text-muted-foreground flex-1">{selectedIds.size} sel.</span>
              <button onClick={() => { onBulkRemove(Array.from(selectedIds)); setSelectedIds(new Set()); setSelectMode(false); }} disabled={selectedIds.size === 0}
                className="flex items-center gap-1 text-[9px] text-destructive disabled:opacity-40"><Trash2 className="w-2.5 h-2.5" /> Excluir</button>
              <button onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }} className="text-muted-foreground"><X className="w-3 h-3" /></button>
            </div>
          ) : (
            <button onClick={() => setSelectMode(true)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground ml-auto"><Check className="w-3 h-3" /> Selecionar</button>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {images.map((img, i) => {
          const label = ANGLE_OPTIONS.find(a => a.id === img.angle)?.label || img.angle;
          const isRegen = regeneratingIds.has(img.id);
          const isGen = generatingAngles.has(img.angle);
          return (
            <div key={img.id} className={`group relative rounded-lg overflow-hidden border transition-all cursor-pointer
              ${img.isCover ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border/30 hover:border-border'}
              ${selectMode && selectedIds.has(img.id) ? 'ring-2 ring-primary' : ''}`}
              style={{ aspectRatio: aspectRatio === '4:5' ? '4/5' : '1/1' }}
              onClick={() => selectMode ? toggleSelect(img.id) : setPreviewImage(img)}>
              <img src={img.url} alt={label} className={`w-full h-full object-contain transition-all duration-300 ${img.justCompleted ? 'animate-fade-in' : ''}`} />

              {/* Regenerating overlay */}
              {(isRegen || isGen) && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-10">
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                </div>
              )}

              {/* Hover actions */}
              {!selectMode && !isRegen && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-end p-1.5 gap-1">
                  <button onClick={e => { e.stopPropagation(); onUseAsReference(img.url); }} className="p-1 rounded bg-white/15 backdrop-blur-sm text-white hover:bg-primary/60 transition-colors" title="Usar como ref"><Camera className="w-3 h-3" /></button>
                  <button onClick={e => { e.stopPropagation(); handleRegenerate(img.id); }} className="p-1 rounded bg-white/15 backdrop-blur-sm text-white hover:bg-primary/60 transition-colors" title="Regenerar"><RefreshCw className="w-3 h-3" /></button>
                  <button onClick={e => { e.stopPropagation(); onSetCover(img.id); }} className="p-1 rounded bg-white/15 backdrop-blur-sm text-white hover:bg-primary/60 transition-colors" title="Capa"><Star className="w-3 h-3" /></button>
                  <div className="flex-1" />
                  <button onClick={e => { e.stopPropagation(); onRemove(img.id); }} className="p-1 rounded bg-white/15 backdrop-blur-sm text-white hover:bg-destructive/60 transition-colors" title="Remover"><Trash2 className="w-3 h-3" /></button>
                </div>
              )}

              {/* Badges */}
              <span className="absolute top-1 left-1 text-[7px] font-semibold px-1.5 py-[2px] rounded bg-black/50 backdrop-blur-sm text-white/90 z-10">
                {img.isCover ? '★ Capa' : label}
              </span>

              {/* Select checkbox */}
              {selectMode && (
                <div className={`absolute top-1 right-1 w-4 h-4 rounded border-[1.5px] flex items-center justify-center z-10 ${selectedIds.has(img.id) ? 'bg-primary border-primary' : 'bg-black/40 border-white/60'}`}>
                  {selectedIds.has(img.id) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                </div>
              )}
            </div>
          );
        })}

        {/* Add more button */}
        <button onClick={onAddUpload} className="rounded-lg border border-dashed border-border/40 flex items-center justify-center hover:border-primary/40 hover:bg-secondary/20 transition-all"
          style={{ aspectRatio: aspectRatio === '4:5' ? '4/5' : '1/1' }}>
          <Plus className="w-5 h-5 text-muted-foreground/30" />
        </button>
      </div>

      {/* Fullscreen preview */}
      {previewImage && (
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-4xl p-1.5 bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl rounded-2xl">
            <img src={previewImage.url} alt="" className="w-full rounded-xl object-contain max-h-[85vh]" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/* ─── Generation Countdown ─── */
function GenerationCountdown({ startTime, totalImages, completedCount }: { startTime: number; totalImages: number; completedCount: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime]);
  const remaining = Math.max(0, 30 - elapsed);
  return (
    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
      <Clock className="w-3 h-3 animate-pulse" />
      <span>{remaining > 0 ? `~${remaining}s` : 'Finalizando...'} · {completedCount}/{totalImages}</span>
    </div>
  );
}

/* ─── Slot Timer ─── */
function SlotTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime]);
  return (
    <>
      <Loader2 className="w-4 h-4 animate-spin text-primary" />
      <span className="text-[9px] text-muted-foreground">{elapsed < 10 ? 'Gerando...' : elapsed < 20 ? 'Processando...' : 'Finalizando...'}</span>
      <span className="text-[8px] text-muted-foreground/60">{elapsed}s</span>
    </>
  );
}

/* ─── Mini Timer ─── */
function MiniTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime]);
  return <span className="text-[8px] text-muted-foreground/60">{elapsed}s</span>;
}
