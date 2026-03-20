import { useState, useRef, useCallback, DragEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Sparkles, Loader2, Upload, Plus, RefreshCw, Trash2, Star,
  ArrowRight, ImageIcon, X, Info, Eye, GripVertical, Square, RectangleVertical,
  Clock, Check, ChevronLeft, ChevronRight, Camera
} from 'lucide-react';

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
  { id: 'frente', label: 'Frente', defaultChecked: true },
  { id: 'costas', label: 'Costas', defaultChecked: true },
  { id: 'detalhe', label: 'Detalhe', defaultChecked: true },
  { id: 'lateral', label: 'Lateral', defaultChecked: false },
  { id: 'flat_lay', label: 'Flat lay', defaultChecked: false },
  { id: 'textura', label: 'Textura', defaultChecked: false },
  { id: 'look_completo', label: 'Look completo', defaultChecked: false },
  { id: 'personalizado', label: '+ Personalizado', defaultChecked: false },
];

export interface GeneratedImage {
  angle: ImageAngle;
  url: string;
  isCover: boolean;
  justCompleted?: boolean;
}

interface ImageGenerationStepProps {
  images: GeneratedImage[];
  onImagesChange: (images: GeneratedImage[]) => void;
  onNext: () => void;
  onSkip: () => void;
  aspectRatio?: AspectRatio;
  onAspectRatioChange?: (ratio: AspectRatio) => void;
}

type PromptMode = 'simple' | 'custom';

export function ImageGenerationStep({ images, onImagesChange, onNext, onSkip, aspectRatio: externalRatio, onAspectRatioChange }: ImageGenerationStepProps) {
  const [prompt, setPrompt] = useState('');
  const [promptMode, setPromptMode] = useState<PromptMode>('simple');
  const [customAngleText, setCustomAngleText] = useState('');
  const [selectedAngles, setSelectedAngles] = useState<Set<ImageAngle>>(
    new Set(ANGLE_OPTIONS.filter(a => a.defaultChecked).map(a => a.id))
  );
  const [generatingAngles, setGeneratingAngles] = useState<Set<ImageAngle>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [totalToGenerate, setTotalToGenerate] = useState(0);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [genStartTime, setGenStartTime] = useState<number | null>(null);
  const [angleStartTimes, setAngleStartTimes] = useState<Record<string, number>>({});
  const [completedAngles, setCompletedAngles] = useState<Set<ImageAngle>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);

  // Aspect ratio — persisted in localStorage
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
  const hasAtLeastOneImage = images.length > 0;

  const toggleAngle = (angle: ImageAngle) => {
    setSelectedAngles(prev => {
      const next = new Set(prev);
      if (next.has(angle)) next.delete(angle);
      else next.add(angle);
      return next;
    });
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) { toast.error('Formato inválido. Use PNG, JPG ou WEBP.'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Arquivo muito grande. Máx. 10MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setReferenceImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const generateImages = useCallback(async () => {
    if (!prompt.trim() || selectedAngles.size === 0) return;
    const angles = Array.from(selectedAngles);
    const now = Date.now();
    setIsGenerating(true);
    setGeneratingAngles(new Set(angles));
    setGeneratedCount(0);
    setTotalToGenerate(angles.length);
    setGenStartTime(now);
    setCompletedAngles(new Set());
    setAngleStartTimes(Object.fromEntries(angles.map(a => [a, now])));
    const results: GeneratedImage[] = [...images];
    const isCustomPrompt = promptMode === 'custom';
    const promises = angles.map(async (angle) => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: { prompt, angle, customAngleText: angle === 'personalizado' ? customAngleText : undefined, isCustomPrompt, referenceImageUrl: referenceImage || undefined, aspectRatio: activeRatio },
        });
        if (error || data?.error) { toast.error(`Erro ao gerar imagem (${ANGLE_OPTIONS.find(a => a.id === angle)?.label})`); return null; }
        const imageUrl = data.imageUrl;
        const idx = results.findIndex(img => img.angle === angle);
        const newImage: GeneratedImage = { angle, url: imageUrl, isCover: results.length === 0 && angle === angles[0], justCompleted: true };
        if (idx >= 0) results[idx] = newImage; else results.push(newImage);
        setGeneratedCount(prev => prev + 1);
        setCompletedAngles(prev => new Set(prev).add(angle));
        setGeneratingAngles(prev => { const next = new Set(prev); next.delete(angle); return next; });
        // Update parent with partial results so slots show images as they arrive
        const snapshot = [...results];
        if (snapshot.length > 0 && !snapshot.some(r => r.isCover)) snapshot[0].isCover = true;
        onImagesChange(snapshot);
        return newImage;
      } catch { toast.error(`Erro ao gerar imagem (${angle})`); return null; }
    });
    await Promise.all(promises);
    if (results.length > 0 && !results.some(r => r.isCover)) results[0].isCover = true;
    onImagesChange(results.map(r => ({ ...r, justCompleted: false })));
    setIsGenerating(false);
    setGeneratingAngles(new Set());
    setGenStartTime(null);
    setAngleStartTimes({});
    const elapsed = ((Date.now() - now) / 1000).toFixed(0);
    const successCount = results.filter(r => r.url).length;
    if (successCount > 0) toast.success(`${successCount} imagens geradas em ${elapsed}s ✓`);
    // Clear justCompleted flags after animation
    setTimeout(() => {
      setCompletedAngles(new Set());
    }, 2500);
  }, [prompt, promptMode, selectedAngles, customAngleText, referenceImage, images, onImagesChange, activeRatio]);

  const regenerateAngle = useCallback(async (angle: ImageAngle) => {
    if (!prompt.trim()) return;
    setGeneratingAngles(new Set([angle]));
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt, angle, customAngleText: angle === 'personalizado' ? customAngleText : undefined, isCustomPrompt: promptMode === 'custom', referenceImageUrl: referenceImage || undefined, aspectRatio: activeRatio },
      });
      if (error || data?.error) { toast.error('Erro ao regenerar imagem'); return; }
      const updated = images.map(img => img.angle === angle ? { ...img, url: data.imageUrl } : img);
      onImagesChange(updated);
      toast.success('Imagem regenerada!');
    } catch { toast.error('Erro ao regenerar imagem'); } finally { setGeneratingAngles(new Set()); }
  }, [prompt, promptMode, customAngleText, referenceImage, images, onImagesChange, activeRatio]);

  const removeImage = (angle: ImageAngle) => {
    const updated = images.filter(img => img.angle !== angle);
    if (updated.length > 0 && !updated.some(i => i.isCover)) updated[0].isCover = true;
    onImagesChange(updated);
  };

  const setCover = (angle: ImageAngle) => {
    const updated = images.map(img => ({ ...img, isCover: img.angle === angle }));
    onImagesChange(updated);
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) { toast.error('Formato inválido. Use PNG, JPG ou WEBP.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      const newImage: GeneratedImage = { angle: 'frente', url, isCover: images.length === 0 };
      onImagesChange([...images, newImage]);
    };
    reader.readAsDataURL(file);
  };

  const allSlots = Array.from(new Set([...images.map(i => i.angle), ...Array.from(selectedAngles)]));

  return (
    <div className="grid grid-cols-[340px_1fr] gap-3">
      {/* LEFT COLUMN — Generation controls */}
      <div className="glass-card p-3.5 space-y-3">
        {/* Title + reference */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display font-semibold text-foreground text-[13px]">Gerar imagens com IA</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => refImageInputRef.current?.click()}
                  className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-transparent border border-border text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors"
                >
                  <Upload className="w-3 h-3" />
                  Subir referência
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Envie uma foto real do produto para guiar a geração da IA</p></TooltipContent>
            </Tooltip>
            <input ref={refImageInputRef} type="file" accept=".png,.jpg,.jpeg,.webp" onChange={handleReferenceUpload} className="hidden" />
          </div>
          {referenceImage && (
            <div className="flex items-center gap-2">
              <div className="relative w-10 h-10 rounded overflow-hidden border border-border">
                <img src={referenceImage} alt="Referência" className="w-full h-full object-cover" />
                <button onClick={() => setReferenceImage(null)} className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                  <X className="w-2 h-2" />
                </button>
              </div>
              <span className="text-[10px] text-muted-foreground">Imagem de referência</span>
            </div>
          )}
        </div>

        {/* Prompt with mode toggle */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <Label className="text-xs font-medium text-muted-foreground">Descreva o produto</Label>
            <div className="flex items-center rounded-full border border-border p-px">
              <button onClick={() => setPromptMode('simple')} className={`px-2 py-px rounded-full text-[10px] transition-colors ${promptMode === 'simple' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Simples</button>
              <button onClick={() => setPromptMode('custom')} className={`px-2 py-px rounded-full text-[10px] transition-colors ${promptMode === 'custom' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Personalizado</button>
            </div>
          </div>
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value.slice(0, promptMode === 'custom' ? 2000 : 1000))}
            placeholder={promptMode === 'simple' ? 'Ex: oversized denim jacket dark blue women white studio background' : 'Cole aqui seu prompt completo para o DALL-E 3.'}
            rows={promptMode === 'simple' ? 2 : 3}
            className="bg-secondary border-border resize-none text-xs min-h-0"
            style={{ height: promptMode === 'simple' ? '52px' : '72px' }}
            maxLength={promptMode === 'custom' ? 2000 : 1000}
          />
          {promptMode === 'custom' && (
            <div className="flex items-center gap-1 mt-1">
              <Info className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
              <span className="text-[9px] text-muted-foreground">Prompt enviado diretamente sem modificações</span>
            </div>
          )}
        </div>

        {/* Aspect ratio selector */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Proporção das imagens</Label>
          <div className="grid grid-cols-2 gap-1.5 mt-1.5">
            <button
              onClick={() => handleRatioChange('1:1')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all border ${
                activeRatio === '1:1'
                  ? 'bg-primary/15 border-primary text-[#58A6FF]'
                  : 'bg-[hsl(var(--card))] border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              <Square className="w-3 h-3" />
              <span>1:1 Quadrado</span>
            </button>
            <button
              onClick={() => handleRatioChange('4:5')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all border ${
                activeRatio === '4:5'
                  ? 'bg-primary/15 border-primary text-[#58A6FF]'
                  : 'bg-[hsl(var(--card))] border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              <RectangleVertical className="w-3 h-3" />
              <span>4:5 Retrato</span>
            </button>
          </div>
          <p className="text-[9px] text-muted-foreground mt-1">
            {activeRatio === '1:1' ? '1024×1024px · WebP · Padrão Shopify' : '1024×1280px · WebP · Ideal para moda'}
            {activeRatio === '4:5' && <span className="ml-1 text-[#58A6FF]">Instagram ready</span>}
          </p>
        </div>

        {/* Angle checkboxes — 3 columns */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Selecione os ângulos</Label>
          <div className="grid grid-cols-3 gap-1.5 mt-1.5">
            {ANGLE_OPTIONS.map(opt => (
              <label key={opt.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-secondary/50 border border-border cursor-pointer hover:border-primary/40 transition-colors text-[11px]">
                <Checkbox checked={selectedAngles.has(opt.id)} onCheckedChange={() => toggleAngle(opt.id)} className="w-3.5 h-3.5" />
                <span className="text-foreground/90 truncate">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Custom angle text */}
        {selectedAngles.has('personalizado') && (
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Texto personalizado</Label>
            <Textarea value={customAngleText} onChange={e => setCustomAngleText(e.target.value.slice(0, 300))} placeholder="Ex: modelo vestindo, ambiente externo..." rows={2} className="mt-1 bg-secondary border-border resize-none text-xs min-h-0" style={{ height: '44px' }} maxLength={300} />
          </div>
        )}

        {/* Estimated time */}
        {!isGenerating && selectedCount > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>~30s por imagem · {selectedCount} {selectedCount === 1 ? 'imagem' : 'imagens'} = ~{selectedCount > 1 ? '30' : '30'}s</span>
          </div>
        )}
        {isGenerating && genStartTime && <GenerationCountdown startTime={genStartTime} totalImages={totalToGenerate} completedCount={generatedCount} />}

        {/* Generate button */}
        <Button onClick={isGenerating && images.length > 0 ? undefined : generateImages} disabled={isGenerating || !prompt.trim() || selectedAngles.size === 0} className="w-full font-display font-semibold h-9 text-xs">
          {isGenerating ? (<><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Gerando {generatedCount}/{totalToGenerate}...</>) : images.length > 0 ? (<><Sparkles className="w-3.5 h-3.5 mr-1.5" />Regenerar tudo</>) : (<><Sparkles className="w-3.5 h-3.5 mr-1.5" />Gerar {selectedCount} {selectedCount === 1 ? 'imagem' : 'imagens'}</>)}
        </Button>

        {/* Counter */}
        <p className="text-center text-[10px] text-muted-foreground -mt-1">8 de 20 gerações disponíveis hoje</p>

        {/* Divider + upload */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] text-muted-foreground">ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.webp" onChange={handleManualUpload} className="hidden" />
        <button onClick={() => fileInputRef.current?.click()} className="w-full border border-dashed border-border rounded-md py-2 flex items-center justify-center gap-1.5 text-muted-foreground text-[11px] hover:border-primary/50 hover:text-primary/80 transition-colors">
          <Upload className="w-3 h-3" />
          Fazer upload manual
        </button>
      </div>

      {/* RIGHT COLUMN — Image gallery */}
      <div className="glass-card p-3.5 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-foreground text-[13px]">Imagens do produto</h3>
          <span className="text-[10px] text-muted-foreground">
            {images.length > 0 ? `${images.length} ${images.length === 1 ? 'imagem' : 'imagens'}` : 'Nenhuma imagem'}
          </span>
        </div>

        <ImageGallery
          images={images}
          allSlots={allSlots}
          generatingAngles={generatingAngles}
          completedAngles={completedAngles}
          angleStartTimes={angleStartTimes}
          onImagesChange={onImagesChange}
          onRegenerate={regenerateAngle}
          onRemove={removeImage}
          onSetCover={setCover}
          aspectRatio={activeRatio}
          onAddUpload={() => fileInputRef.current?.click()}
        />

        {/* Bottom navigation inside the card */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <button onClick={onSkip} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            Adicionar imagens depois
          </button>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button onClick={onNext} disabled={!hasAtLeastOneImage} size="sm" className="h-8 text-xs">
                  Próximo <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </TooltipTrigger>
            {!hasAtLeastOneImage && (
              <TooltipContent><p>Gere ou faça upload de pelo menos 1 imagem para continuar</p></TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

/* ─── Image Gallery (Main image + Thumbnail strip) ─── */
interface ImageGalleryProps {
  images: GeneratedImage[];
  allSlots: ImageAngle[];
  generatingAngles: Set<ImageAngle>;
  completedAngles: Set<ImageAngle>;
  angleStartTimes: Record<string, number>;
  onImagesChange: (images: GeneratedImage[]) => void;
  onRegenerate: (angle: ImageAngle) => void;
  onRemove: (angle: ImageAngle) => void;
  onSetCover: (angle: ImageAngle) => void;
  aspectRatio: AspectRatio;
  onAddUpload: () => void;
}

function ImageGallery({ images, allSlots, generatingAngles, completedAngles, angleStartTimes, onImagesChange, onRegenerate, onRemove, onSetCover, aspectRatio, onAddUpload }: ImageGalleryProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  const [isSliding, setIsSliding] = useState(false);
  const prevIdxRef = useRef(0);
  const [hovered, setHovered] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build display list: real images first, then empty slots for generating/pending angles
  const imageAngles = images.map(i => i.angle);
  const emptyAngles = allSlots.filter(a => !imageAngles.includes(a));
  const displayList: (GeneratedImage | { angle: ImageAngle; empty: true })[] = [
    ...images,
    ...emptyAngles.map(a => ({ angle: a, empty: true as const })),
  ];

  // Clamp selected index
  const clampedIdx = Math.min(selectedIdx, Math.max(0, displayList.length - 1));
  useEffect(() => { if (clampedIdx !== selectedIdx) setSelectedIdx(clampedIdx); }, [clampedIdx, selectedIdx]);

  // Auto-select first completed image when it arrives
  useEffect(() => {
    if (images.length > 0 && selectedIdx >= images.length) {
      setSelectedIdx(0);
    }
  }, [images.length, selectedIdx]);

  const currentItem = displayList[clampedIdx];
  const currentImage = currentItem && !('empty' in currentItem) ? currentItem as GeneratedImage : null;
  const isCurrentGenerating = currentItem ? generatingAngles.has(currentItem.angle) : false;
  const currentLabel = ANGLE_OPTIONS.find(a => a.id === currentItem?.angle)?.label || currentItem?.angle || '';

  const goTo = (idx: number) => {
    if (idx < 0) idx = displayList.length - 1;
    if (idx >= displayList.length) idx = 0;
    if (idx === selectedIdx) return;
    const dir = idx > prevIdxRef.current ? 'right' : 'left';
    // Handle wrap-around: going from last to first = right, first to last = left
    if (prevIdxRef.current === displayList.length - 1 && idx === 0) setSlideDir('right');
    else if (prevIdxRef.current === 0 && idx === displayList.length - 1) setSlideDir('left');
    else setSlideDir(dir);
    setIsSliding(true);
    setTimeout(() => {
      prevIdxRef.current = idx;
      setSelectedIdx(idx);
      setIsSliding(false);
    }, 150);
  };

  // Keyboard navigation
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(clampedIdx - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(clampedIdx + 1); }
    };
    el.addEventListener('keydown', handler);
    return () => el.removeEventListener('keydown', handler);
  }, [clampedIdx, displayList.length]);

  // Drag reorder on thumbnails
  const handleThumbDragStart = (e: DragEvent<HTMLDivElement>, idx: number) => {
    const item = displayList[idx];
    if ('empty' in item) { e.preventDefault(); return; }
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleThumbDragOver = (e: DragEvent<HTMLDivElement>, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== idx) setDragOverIdx(idx);
  };
  const handleThumbDrop = (e: DragEvent<HTMLDivElement>, dropIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); setDragOverIdx(null); return; }
    const fromItem = displayList[dragIdx];
    if (!fromItem || 'empty' in fromItem) { setDragIdx(null); setDragOverIdx(null); return; }
    const reordered = [...images];
    const fromImageIdx = reordered.findIndex(i => i.angle === fromItem.angle);
    if (fromImageIdx < 0) { setDragIdx(null); setDragOverIdx(null); return; }
    const toItem = displayList[dropIdx];
    let toImageIdx: number;
    if ('empty' in toItem) { toImageIdx = reordered.length - 1; } else { toImageIdx = reordered.findIndex(i => i.angle === toItem.angle); }
    const [moved] = reordered.splice(fromImageIdx, 1);
    reordered.splice(toImageIdx, 0, moved);
    const updated = reordered.map((img, i) => ({ ...img, isCover: i === 0 }));
    onImagesChange(updated);
    setSelectedIdx(dropIdx);
    setDragIdx(null);
    setDragOverIdx(null);
  };
  const handleThumbDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

  const showArrows = displayList.length > 1;
  const mainMaxH = aspectRatio === '4:5' ? '420px' : '380px';
  const mainAspect = aspectRatio === '4:5' ? '4/5' : '1/1';

  return (
    <div className="flex-1 flex flex-col min-h-0" ref={containerRef} tabIndex={0} style={{ outline: 'none' }}>
      {/* Main image viewer */}
      <div
        className="relative rounded-[10px] overflow-hidden bg-card mx-auto w-full"
        style={{ aspectRatio: mainAspect, maxHeight: mainMaxH }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Empty state */}
        {displayList.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-[10px]">
            <Camera className="w-8 h-8 text-muted-foreground/40" />
            <span className="text-[12px] text-muted-foreground">Gere ou faça upload das imagens</span>
            <span className="text-[10px] text-muted-foreground/60">As imagens aparecerão aqui</span>
          </div>
        )}

        {/* Generating state (no image yet) */}
        {displayList.length > 0 && !currentImage && isCurrentGenerating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 skeleton-shimmer" style={{ animation: 'pulse-border 1.5s infinite' }}>
            {angleStartTimes[currentItem.angle] ? <SlotTimer startTime={angleStartTimes[currentItem.angle]} /> : (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-[11px] text-muted-foreground">Gerando...</span>
              </>
            )}
          </div>
        )}

        {/* Empty slot (not generating) */}
        {displayList.length > 0 && !currentImage && !isCurrentGenerating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-border rounded-[10px]">
            <Plus className="w-5 h-5 text-muted-foreground/40" />
            <span className="text-[10px] text-muted-foreground/50">{currentLabel}</span>
          </div>
        )}

        {currentImage && (
          <img
            src={currentImage.url}
            alt={currentLabel}
            className="w-full h-full object-cover"
            style={{
              transition: 'transform 0.15s ease-out, opacity 0.15s ease-out',
              transform: isSliding
                ? `translateX(${slideDir === 'right' ? '-30px' : '30px'})`
                : 'translateX(0)',
              opacity: isSliding ? 0 : 1,
              ...(completedAngles.has(currentImage.angle) && !isSliding ? { animation: 'fade-in 0.3s ease-out' } : {}),
            }}
          />
        )}

        {/* Angle label top left */}
        {displayList.length > 0 && (
          <span className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/60 text-white/90 backdrop-blur-sm">
            {currentLabel}
          </span>
        )}

        {/* Image counter top right */}
        {displayList.length > 1 && (
          <span className="absolute top-2 right-2 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm">
            {clampedIdx + 1} / {displayList.length}
          </span>
        )}

        {/* Success badge */}
        {currentImage && completedAngles.has(currentImage.angle) && (
          <span className="absolute top-2 right-2 flex items-center gap-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[hsl(var(--success))]/80 text-white" style={{ animation: 'scale-in 0.2s ease-out' }}>
            <Check className="w-3 h-3" /> Pronta
          </span>
        )}

        {/* Progress bar for generating */}
        {isCurrentGenerating && angleStartTimes[currentItem.angle] && (
          <GeneratingProgressBar startTime={angleStartTimes[currentItem.angle]} />
        )}

        {/* Hover action buttons */}
        {currentImage && hovered && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 transition-opacity duration-150" style={{ animation: 'fade-in 0.15s ease-out' }}>
            <button onClick={() => setPreviewOpen(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/15 hover:bg-white/25 text-white text-[10px] transition-colors backdrop-blur-sm">
              <Eye className="w-3.5 h-3.5" /> Ver
            </button>
            <button onClick={() => onRegenerate(currentImage.angle)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/15 hover:bg-white/25 text-white text-[10px] transition-colors backdrop-blur-sm">
              <RefreshCw className="w-3.5 h-3.5" /> Regenerar
            </button>
            <button onClick={() => onRemove(currentImage.angle)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/15 hover:bg-white/25 text-white text-[10px] transition-colors backdrop-blur-sm">
              <Trash2 className="w-3.5 h-3.5" /> Remover
            </button>
            {!currentImage.isCover && (
              <button onClick={() => onSetCover(currentImage.angle)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/15 hover:bg-white/25 text-white text-[10px] transition-colors backdrop-blur-sm">
                <Star className="w-3.5 h-3.5" /> Capa
              </button>
            )}
          </div>
        )}

        {/* Navigation arrows (visible on hover) */}
        {showArrows && hovered && (
          <>
            <button
              onClick={() => goTo(clampedIdx - 1)}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 border border-[#E5E7EB] flex items-center justify-center hover:bg-white hover:shadow-md transition-all"
              style={{ animation: 'fade-in 0.15s ease-out' }}
            >
              <ChevronLeft className="w-4 h-4 text-[#374151]" />
            </button>
            <button
              onClick={() => goTo(clampedIdx + 1)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 border border-[#E5E7EB] flex items-center justify-center hover:bg-white hover:shadow-md transition-all"
              style={{ animation: 'fade-in 0.15s ease-out' }}
            >
              <ChevronRight className="w-4 h-4 text-[#374151]" />
            </button>
          </>
        )}
      </div>

      {/* Dot indicators */}
      {displayList.length > 1 && (
        <div className="flex items-center justify-center gap-[5px] mt-2">
          {displayList.map((_, i) => (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-150 ${i === clampedIdx ? 'bg-foreground' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
            />
          ))}
        </div>
      )}

      {/* Summary + Add button */}
      {displayList.length > 0 && (
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-muted-foreground">
            {images.length} {images.length === 1 ? 'imagem' : 'imagens'}{images.length > 1 ? ' · arraste para reorganizar' : ''}
          </span>
          <button
            onClick={onAddUpload}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
          >
            <Plus className="w-3 h-3" /> Adicionar
          </button>
        </div>
      )}

      {/* Thumbnail strip */}
      {displayList.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2 overflow-x-auto scrollbar-thin pb-1" style={{ scrollbarWidth: 'thin' }}>
          {displayList.map((item, i) => {
            const isImg = !('empty' in item);
            const img = isImg ? (item as GeneratedImage) : null;
            const angle = item.angle;
            const isActive = i === clampedIdx;
            const isGen = generatingAngles.has(angle);
            const label = ANGLE_OPTIONS.find(a => a.id === angle)?.label || angle;
            const isFirst = i === 0;

            return (
              <div
                key={`thumb-${angle}-${i}`}
                className={`relative shrink-0 cursor-pointer rounded-md overflow-hidden transition-all duration-150
                  ${isActive ? 'border-2 border-primary opacity-100' : 'border-2 border-transparent opacity-60 hover:opacity-100 hover:border-primary/40'}
                  ${dragOverIdx === i && dragIdx !== i ? 'ring-2 ring-primary' : ''}
                  ${dragIdx === i ? 'opacity-30' : ''}
                `}
                style={{ width: '72px', aspectRatio: aspectRatio === '4:5' ? '4/5' : '1/1' }}
                onClick={() => setSelectedIdx(i)}
                draggable={!!img}
                onDragStart={e => handleThumbDragStart(e, i)}
                onDragOver={e => handleThumbDragOver(e, i)}
                onDrop={e => handleThumbDrop(e, i)}
                onDragEnd={handleThumbDragEnd}
              >
                {/* Image thumbnail */}
                {img && (
                  <img src={img.url} alt={label} className="w-full h-full object-cover" />
                )}

                {/* Generating thumbnail */}
                {!img && isGen && (
                  <div className="w-full h-full bg-card flex items-center justify-center" style={{ animation: 'pulse-border 1.5s infinite' }}>
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  </div>
                )}

                {/* Empty thumbnail */}
                {!img && !isGen && (
                  <div className="w-full h-full bg-card border border-dashed border-border flex flex-col items-center justify-center gap-0.5 rounded-md">
                    <Plus className="w-3 h-3 text-muted-foreground/40" />
                    <span className="text-[8px] text-muted-foreground/40 leading-tight">{label}</span>
                  </div>
                )}

                {/* "Capa" badge on first thumbnail */}
                {isFirst && img && (
                  <span className="absolute bottom-0.5 left-0.5 text-[7px] font-semibold px-1 py-px rounded bg-black/60 text-white/80">
                    Capa
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen preview dialog */}
      {currentImage && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-3xl p-2 bg-background border-border">
            <img src={currentImage.url} alt={currentLabel} className="w-full h-full rounded-lg object-contain max-h-[80vh]" />
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
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <Clock className="w-3 h-3 animate-pulse" />
      <span>
        {remaining > 0 ? `Tempo estimado: ${remaining}s` : 'Finalizando...'} · {completedCount}/{totalImages} prontas
      </span>
    </div>
  );
}

/* ─── Slot Elapsed Timer ─── */
function SlotTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime]);
  const statusText = elapsed < 10 ? 'Gerando...' : elapsed < 20 ? 'Processando...' : 'Finalizando...';
  const progress = Math.min(90, (elapsed / 30) * 90);
  return (
    <>
      <Loader2 className="w-4 h-4 animate-spin text-primary" />
      <span className="text-[10px] text-muted-foreground">{statusText}</span>
      <span className="text-[9px] text-muted-foreground/60">{elapsed}s</span>
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-border/30 overflow-hidden rounded-b-lg">
        <div className="h-full bg-primary transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }} />
      </div>
    </>
  );
}

/* ─── Generating Progress Bar (for main viewer) ─── */
function GeneratingProgressBar({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime]);
  const progress = Math.min(90, (elapsed / 30) * 90);
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-border/30 overflow-hidden">
      <div className="h-full bg-primary transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }} />
    </div>
  );
}
