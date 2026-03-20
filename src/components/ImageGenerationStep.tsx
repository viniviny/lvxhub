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
  Clock, Check
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
            {images.length} imagens{images.length > 1 && ' · arraste para reorganizar'}
          </span>
        </div>

        {/* Gallery grid */}
        <div className="flex-1 min-h-0">
          <DraggableGallery
            images={images}
            allSlots={allSlots}
            generatingAngles={generatingAngles}
            completedAngles={completedAngles}
            angleStartTimes={angleStartTimes}
            onImagesChange={onImagesChange}
            onRegenerate={regenerateAngle}
            onRemove={removeImage}
            onSetCover={setCover}
          />
        </div>

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

/* ─── Draggable Gallery ─── */
interface DraggableGalleryProps {
  images: GeneratedImage[];
  allSlots: ImageAngle[];
  generatingAngles: Set<ImageAngle>;
  completedAngles: Set<ImageAngle>;
  angleStartTimes: Record<string, number>;
  onImagesChange: (images: GeneratedImage[]) => void;
  onRegenerate: (angle: ImageAngle) => void;
  onRemove: (angle: ImageAngle) => void;
  onSetCover: (angle: ImageAngle) => void;
}

function DraggableGallery({ images, allSlots, generatingAngles, completedAngles, angleStartTimes, onImagesChange, onRegenerate, onRemove, onSetCover }: DraggableGalleryProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const imageAngles = images.map(i => i.angle);
  const emptySlots = allSlots.filter(a => !imageAngles.includes(a));
  const displayList: (GeneratedImage | { angle: ImageAngle; empty: true })[] = [
    ...images,
    ...emptySlots.map(a => ({ angle: a, empty: true as const })),
  ];
  const mainSlots = displayList.slice(0, 5);
  const extraSlots = displayList.slice(5);

  const handleDragStart = (e: DragEvent<HTMLDivElement>, idx: number) => {
    const item = mainSlots[idx];
    if ('empty' in item) { e.preventDefault(); return; }
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== idx) setDragOverIdx(idx);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, dropIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); setDragOverIdx(null); return; }
    const reordered = [...images];
    const fromImg = mainSlots[dragIdx];
    const toImg = mainSlots[dropIdx];
    if (!fromImg || 'empty' in fromImg) { setDragIdx(null); setDragOverIdx(null); return; }
    const fromImageIdx = reordered.findIndex(i => i.angle === fromImg.angle);
    if (fromImageIdx < 0) { setDragIdx(null); setDragOverIdx(null); return; }
    let toImageIdx: number;
    if ('empty' in toImg) { toImageIdx = reordered.length - 1; } else { toImageIdx = reordered.findIndex(i => i.angle === toImg.angle); }
    const [moved] = reordered.splice(fromImageIdx, 1);
    reordered.splice(toImageIdx, 0, moved);
    const updated = reordered.map((img, i) => ({ ...img, isCover: i === 0 }));
    onImagesChange(updated);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

  return (
    <div className="space-y-2 h-full">
      {/* Main grid: cover left (3/4 ratio) + 2x2 right */}
      <div className="grid grid-cols-[45%_1fr] gap-2 h-full" style={{ minHeight: '280px' }}>
        {/* Cover slot */}
        {mainSlots.length > 0 && (
          <div
            className={`${dragIdx === 0 ? 'opacity-40' : ''} ${dragOverIdx === 0 && dragIdx !== 0 ? 'ring-2 ring-primary rounded-lg' : ''} transition-all duration-150`}
            draggable={!!(mainSlots[0] && !('empty' in mainSlots[0]))}
            onDragStart={e => handleDragStart(e, 0)}
            onDragOver={e => handleDragOver(e, 0)}
            onDrop={e => handleDrop(e, 0)}
            onDragEnd={handleDragEnd}
          >
            <ImageSlot
              label="Capa"
              angle={mainSlots[0].angle}
              image={'empty' in mainSlots[0] ? null : (mainSlots[0] as GeneratedImage)}
              isGenerating={generatingAngles.has(mainSlots[0].angle)}
              justCompleted={completedAngles.has(mainSlots[0].angle)}
              startTime={angleStartTimes[mainSlots[0].angle]}
              onRegenerate={() => onRegenerate(mainSlots[0].angle)}
              onRemove={() => onRemove(mainSlots[0].angle)}
              onSetCover={() => onSetCover(mainSlots[0].angle)}
              isCover={true}
              tall={true}
              draggable={!!(mainSlots[0] && !('empty' in mainSlots[0]))}
            />
          </div>
        )}
        {/* 2x2 grid */}
        <div className="grid grid-cols-2 grid-rows-2 gap-2">
          {mainSlots.slice(1, 5).map((slot, i) => {
            const idx = i + 1;
            const angle = slot.angle;
            const isImage = !('empty' in slot);
            const image = isImage ? (slot as GeneratedImage) : null;
            const label = ANGLE_OPTIONS.find(a => a.id === angle)?.label || angle;
            return (
              <div
                key={`${angle}-${idx}`}
                className={`${dragIdx === idx ? 'opacity-40' : ''} ${dragOverIdx === idx && dragIdx !== idx ? 'ring-2 ring-primary rounded-lg' : ''} transition-all duration-150`}
                draggable={!!image}
                onDragStart={e => handleDragStart(e, idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDrop={e => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
              >
                <ImageSlot label={label} angle={angle} image={image} isGenerating={generatingAngles.has(angle)} onRegenerate={() => onRegenerate(angle)} onRemove={() => onRemove(angle)} onSetCover={() => onSetCover(angle)} isCover={false} draggable={!!image} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Extra row for 5+ images */}
      {extraSlots.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {extraSlots.map((slot) => {
            const angle = slot.angle;
            const isImage = !('empty' in slot);
            const image = isImage ? (slot as GeneratedImage) : null;
            const label = ANGLE_OPTIONS.find(a => a.id === angle)?.label || angle;
            return (
              <div key={`extra-${angle}`}>
                <ImageSlot label={label} angle={angle} image={image} isGenerating={generatingAngles.has(angle)} onRegenerate={() => onRegenerate(angle)} onRemove={() => onRemove(angle)} onSetCover={() => onSetCover(angle)} isCover={false} draggable={!!image} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Image Slot ─── */
interface ImageSlotProps {
  label?: string;
  angle?: ImageAngle;
  image: GeneratedImage | null;
  isGenerating: boolean;
  onRegenerate: () => void;
  onRemove: () => void;
  onSetCover: () => void;
  isCover: boolean;
  tall?: boolean;
  draggable?: boolean;
}

function ImageSlot({ label, image, isGenerating, onRegenerate, onRemove, onSetCover, isCover, tall, draggable: isDraggable }: ImageSlotProps) {
  const [hovered, setHovered] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  if (isGenerating) {
    return (
      <div className={`rounded-lg border border-primary/60 bg-card flex flex-col items-center justify-center gap-1.5 animate-pulse ${tall ? 'h-full' : 'aspect-square'}`}>
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-[10px] text-muted-foreground">Gerando...</span>
      </div>
    );
  }

  if (image) {
    return (
      <>
        <div
          className={`relative rounded-lg overflow-hidden bg-secondary group ${tall ? 'h-full' : 'aspect-square'}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <img src={image.url} alt={label} className="w-full h-full object-cover" />
          <span className="absolute top-1 left-1 text-[9px] font-medium px-1.5 py-px rounded bg-black/60 text-white">{label}</span>
          {isDraggable && (
            <span className="absolute top-1 right-1 text-white/60 hover:text-white cursor-grab active:cursor-grabbing transition-colors">
              <GripVertical className="w-3 h-3" />
            </span>
          )}
          {hovered && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-1.5 animate-fade-in">
              <button onClick={() => setPreviewOpen(true)} className="p-1.5 rounded-md bg-white/15 hover:bg-white/25 text-white transition-colors" title="Ver imagem"><Eye className="w-3.5 h-3.5" /></button>
              <button onClick={onRegenerate} className="p-1.5 rounded-md bg-white/15 hover:bg-white/25 text-white transition-colors" title="Regenerar"><RefreshCw className="w-3.5 h-3.5" /></button>
              <button onClick={onRemove} className="p-1.5 rounded-md bg-white/15 hover:bg-white/25 text-white transition-colors" title="Remover"><Trash2 className="w-3.5 h-3.5" /></button>
              {!isCover && <button onClick={onSetCover} className="p-1.5 rounded-md bg-white/15 hover:bg-white/25 text-white transition-colors" title="Definir como capa"><Star className="w-3.5 h-3.5" /></button>}
            </div>
          )}
        </div>
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-3xl p-2 bg-background border-border">
            <img src={image.url} alt={label} className="w-full h-auto rounded-lg object-contain max-h-[80vh]" />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className={`rounded-lg border border-dashed border-border bg-card flex flex-col items-center justify-center gap-1 ${tall ? 'h-full' : 'aspect-square'}`}>
      <Plus className="w-4 h-4 text-muted-foreground/50" />
      {label && <span className="text-[9px] text-muted-foreground/50">{label}</span>}
    </div>
  );
}
