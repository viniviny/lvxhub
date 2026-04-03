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
import {
  Sparkles, Loader2, Upload, Plus, RefreshCw, Trash2, Star,
  ArrowRight, ImageIcon, X, Info, Eye, GripVertical, Square, RectangleVertical,
  Clock, Check, ChevronLeft, ChevronRight, Camera, BookOpen, Search, ClipboardPaste
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
  id: string;
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
  const navigate = useNavigate();
  const { prompts: savedPrompts, recentPrompts, incrementUsage } = useUserPrompts();
  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const [promptDropdownOpen, setPromptDropdownOpen] = useState(false);
  const [promptSearch, setPromptSearch] = useState('');
  const promptDropdownRef = useRef<HTMLDivElement>(null);
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
  const refDropZoneRef = useRef<HTMLDivElement>(null);

  // Handle paste from clipboard (Ctrl+V anywhere or on the drop zone)
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
        reader.onload = () => setReferenceImage(reader.result as string);
        reader.readAsDataURL(file);
        return;
      }
    }
  }, []);

  // Global paste listener when no reference image is set
  useEffect(() => {
    const handler = (e: globalThis.ClipboardEvent) => {
      // Don't intercept paste if user is typing in an input/textarea
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
          reader.onload = () => setReferenceImage(reader.result as string);
          reader.readAsDataURL(blob);
          return;
        }
      }
      toast.error('Nenhuma imagem encontrada na área de transferência.');
    } catch {
      toast.error('Não foi possível acessar a área de transferência.');
    }
  }, []);

  // Close prompt dropdown on outside click / Escape
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
    const newImages: GeneratedImage[] = [];
    const isCustomPrompt = promptMode === 'custom';
    const promises = angles.map(async (angle) => {
      try {
        let refBase64: string | undefined;
        let refMimeType: string | undefined;
        if (referenceImage) {
          const match = referenceImage.match(/^data:([^;]+);base64,(.+)$/);
          if (match) { refMimeType = match[1]; refBase64 = match[2]; }
        }
        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: { prompt, angle, customAngleText: angle === 'personalizado' ? customAngleText : undefined, isCustomPrompt, referenceImage: refBase64, referenceMimeType: refMimeType, aspectRatio: activeRatio },
        });
        if (error || data?.error) { toast.error(`Erro ao gerar imagem (${ANGLE_OPTIONS.find(a => a.id === angle)?.label})`); return null; }
        const imageUrl = data.imageUrl;
        const newImage: GeneratedImage = { id: crypto.randomUUID(), angle, url: imageUrl, isCover: false, justCompleted: true };
        newImages.push(newImage);
        setGeneratedCount(prev => prev + 1);
        setCompletedAngles(prev => new Set(prev).add(angle));
        setGeneratingAngles(prev => { const next = new Set(prev); next.delete(angle); return next; });
        // Update parent with partial results — append to existing
        const allImgs = [...images, ...newImages];
        if (allImgs.length > 0 && !allImgs.some(r => r.isCover)) allImgs[0].isCover = true;
        onImagesChange(allImgs);
        return newImage;
      } catch { toast.error(`Erro ao gerar imagem (${angle})`); return null; }
    });
    await Promise.all(promises);
    const allFinal = [...images, ...newImages];
    if (allFinal.length > 0 && !allFinal.some(r => r.isCover)) allFinal[0].isCover = true;
    onImagesChange(allFinal.map(r => ({ ...r, justCompleted: false })));
    setIsGenerating(false);
    setGeneratingAngles(new Set());
    setGenStartTime(null);
    setAngleStartTimes({});
    const elapsed = ((Date.now() - now) / 1000).toFixed(0);
    if (newImages.length > 0) toast.success(`${newImages.length} imagens geradas em ${elapsed}s ✓`);
    setTimeout(() => { setCompletedAngles(new Set()); }, 2500);
  }, [prompt, promptMode, selectedAngles, customAngleText, referenceImage, images, onImagesChange, activeRatio]);

  const regenerateImage = useCallback(async (imageId: string) => {
    const target = images.find(i => i.id === imageId);
    if (!target || !prompt.trim()) return;
    setGeneratingAngles(new Set([target.angle]));
    try {
      let refBase64: string | undefined;
      let refMimeType: string | undefined;
      if (referenceImage) {
        const match = referenceImage.match(/^data:([^;]+);base64,(.+)$/);
        if (match) { refMimeType = match[1]; refBase64 = match[2]; }
      }
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt, angle: target.angle, customAngleText: target.angle === 'personalizado' ? customAngleText : undefined, isCustomPrompt: promptMode === 'custom', referenceImage: refBase64, referenceMimeType: refMimeType, aspectRatio: activeRatio },
      });
      if (error || data?.error) { toast.error('Erro ao regenerar imagem'); return; }
      const updated = images.map(img => img.id === imageId ? { ...img, url: data.imageUrl } : img);
      onImagesChange(updated);
      toast.success('Imagem regenerada!');
    } catch { toast.error('Erro ao regenerar imagem'); } finally { setGeneratingAngles(new Set()); }
  }, [prompt, promptMode, customAngleText, referenceImage, images, onImagesChange, activeRatio]);

  const removeImage = (imageId: string) => {
    const updated = images.filter(img => img.id !== imageId);
    if (updated.length > 0 && !updated.some(i => i.isCover)) updated[0].isCover = true;
    onImagesChange(updated);
  };

  const setCover = (imageId: string) => {
    const updated = images.map(img => ({ ...img, isCover: img.id === imageId }));
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
      <div className="glass-card p-3 space-y-2.5">
        {/* 1. Header row */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display font-semibold text-foreground text-[13px]">Gerar imagens com IA</h3>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => refImageInputRef.current?.click()}
                    className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-transparent border border-border text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                    Subir
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Envie uma foto real do produto para guiar a geração da IA</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handlePasteFromButton}
                    className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-transparent border border-border text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    Colar
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Cole uma imagem da área de transferência (Ctrl+V)</p></TooltipContent>
              </Tooltip>
            </div>
            <input ref={refImageInputRef} type="file" accept=".png,.jpg,.jpeg,.webp" onChange={handleReferenceUpload} className="hidden" />
          </div>
          {/* 2. Reference image */}
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

        {/* 3. Prompt with dropdown selector */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <Label className="text-xs font-medium text-muted-foreground">Descreva o produto</Label>
            <div className="relative" ref={promptDropdownRef}>
              <button
                onClick={() => { setPromptDropdownOpen(!promptDropdownOpen); setPromptSearch(''); }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] border transition-all cursor-pointer ${
                  activePromptId
                    ? 'bg-card border-primary text-[#58A6FF]'
                    : 'bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-[#58A6FF]'
                }`}
                style={{ minWidth: 160 }}
              >
                {activePromptId ? (
                  <>
                    <BookOpen className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[100px]">{savedPrompts.find(p => p.id === activePromptId)?.name}</span>
                    <button onClick={e => { e.stopPropagation(); setActivePromptId(null); setPrompt(''); setPromptMode('simple'); }} className="ml-0.5 hover:text-foreground"><X className="w-3 h-3" /></button>
                  </>
                ) : (
                  <>
                    <span>📝</span>
                    <span>Selecionar prompt</span>
                  </>
                )}
                <ChevronRight className={`w-3 h-3 ml-auto shrink-0 transition-transform ${promptDropdownOpen ? 'rotate-90' : ''}`} />
              </button>

              {/* Dropdown panel */}
              {promptDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-[280px] max-h-[300px] overflow-y-auto bg-card border border-border rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-50">
                  {/* Search */}
                  <div className="p-2 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <input
                        value={promptSearch}
                        onChange={e => setPromptSearch(e.target.value)}
                        placeholder="Buscar prompt..."
                        className="w-full bg-secondary border-none rounded-md pl-7 pr-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/50 outline-none"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Simple description option */}
                  <button
                    onClick={() => { setActivePromptId(null); setPromptMode('simple'); setPrompt(''); setPromptDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 hover:bg-primary/5 transition-colors flex items-start gap-2 ${
                      !activePromptId ? 'bg-primary/10 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'
                    }`}
                  >
                    <span className="text-[12px]">✏️</span>
                    <div>
                      <div className="text-[12px] text-foreground font-medium">Descrição simples</div>
                      <div className="text-[10px] text-muted-foreground">Descreva o produto de forma simples</div>
                    </div>
                  </button>

                  {/* Saved prompts */}
                  {savedPrompts.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 border-t border-border">
                        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Meus prompts</span>
                      </div>
                      {savedPrompts
                        .filter(p => !promptSearch || p.name.toLowerCase().includes(promptSearch.toLowerCase()) || (p.category || '').toLowerCase().includes(promptSearch.toLowerCase()))
                        .map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setPrompt(p.prompt_text);
                              setPromptMode('custom');
                              setActivePromptId(p.id);
                              if (p.default_angles.length > 0) setSelectedAngles(new Set(p.default_angles as ImageAngle[]));
                              if (p.default_ratio && onAspectRatioChange) onAspectRatioChange(p.default_ratio as AspectRatio);
                              incrementUsage.mutate(p.id);
                              setPromptDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 hover:bg-primary/5 transition-colors flex items-start gap-2 ${
                              activePromptId === p.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'
                            }`}
                          >
                            <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <div className="text-[12px] text-foreground font-medium truncate">{p.name}</div>
                              <div className="text-[10px] text-muted-foreground truncate">{p.prompt_text.slice(0, 50)}{p.prompt_text.length > 50 ? '...' : ''}</div>
                              {p.default_angles.length > 0 && (
                                <div className="flex gap-1 mt-0.5">
                                  {p.default_angles.slice(0, 4).map(a => (
                                    <span key={a} className="text-[8px] text-muted-foreground/50">{ANGLE_OPTIONS.find(o => o.id === a)?.label?.[0] || a[0]}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                    </>
                  )}

                  {/* Empty state for saved prompts */}
                  {savedPrompts.length === 0 && (
                    <div className="px-3 py-3 border-t border-border text-center">
                      <p className="text-[10px] text-muted-foreground/60">Você ainda não tem prompts salvos</p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="border-t border-border px-3 py-2">
                    <button onClick={() => { setPromptDropdownOpen(false); navigate('/prompts'); }} className="text-[11px] text-[#388BFD] hover:text-[#58A6FF] transition-colors">
                      + Criar novo prompt →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value.slice(0, activePromptId ? 2000 : 1000))}
            placeholder={activePromptId ? 'Prompt carregado — edite se necessário' : 'Ex: oversized denim jacket, white background...'}
            rows={2}
            className="bg-secondary border-border resize-none text-xs min-h-0"
            style={{ height: '48px' }}
            maxLength={activePromptId ? 2000 : 1000}
          />
          {activePromptId && (
            <div className="flex items-center gap-1 mt-1">
              <Info className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
              <span className="text-[9px] text-muted-foreground">Prompt enviado diretamente sem modificações</span>
            </div>
          )}
        </div>

        {/* 4. Ângulos — Toggle pills */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Ângulos</Label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {ANGLE_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => toggleAngle(opt.id)}
                className={`h-7 px-3 rounded-full text-[11px] font-medium border transition-all ${
                  selectedAngles.has(opt.id)
                    ? 'bg-primary/20 border-primary text-[#58A6FF]'
                    : 'bg-card border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                {opt.label}
              </button>
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

        {/* 5. Proporção */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Proporção</Label>
          <div className="grid grid-cols-2 gap-1.5 mt-1.5">
            <button
              onClick={() => handleRatioChange('1:1')}
              className={`flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium transition-all border ${
                activeRatio === '1:1'
                  ? 'bg-primary/20 border-primary text-[#58A6FF]'
                  : 'bg-card border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              <Square className="w-3 h-3" />
              <span>1:1 Quadrado</span>
            </button>
            <button
              onClick={() => handleRatioChange('4:5')}
              className={`flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium transition-all border ${
                activeRatio === '4:5'
                  ? 'bg-primary/20 border-primary text-[#58A6FF]'
                  : 'bg-card border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              <RectangleVertical className="w-3 h-3" />
              <span>4:5 Retrato</span>
            </button>
          </div>
          <p className="text-[9px] text-muted-foreground mt-1">
            {activeRatio === '1:1' ? '1024×1024px · WebP' : '1024×1280px · WebP'}
          </p>
        </div>

        {/* Generation status */}
        {isGenerating && genStartTime && <GenerationCountdown startTime={genStartTime} totalImages={totalToGenerate} completedCount={generatedCount} />}

        {/* 6. Generate button */}
        <Button onClick={isGenerating && images.length > 0 ? undefined : generateImages} disabled={isGenerating || !prompt.trim() || selectedAngles.size === 0} className="w-full font-display font-semibold h-11 text-xs">
          {isGenerating ? (<><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Gerando {generatedCount}/{totalToGenerate}...</>) : images.length > 0 ? (<><Sparkles className="w-3.5 h-3.5 mr-1.5" />Regenerar tudo</>) : (<><Sparkles className="w-3.5 h-3.5 mr-1.5" />Gerar {selectedCount} {selectedCount === 1 ? 'imagem' : 'imagens'}</>)}
        </Button>
        <p className="text-[10px] text-muted-foreground text-center -mt-1">~30s por imagem · Nano Banana Pro</p>

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
      <div className="glass-card p-3 flex flex-col">
        <div className="flex items-center justify-between mb-2 w-full">
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

        {/* Bottom navigation */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
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
  const mainMaxH = aspectRatio === '4:5' ? '620px' : '520px';
  const mainMaxW = aspectRatio === '4:5' ? '496px' : '520px';
  const mainAspect = aspectRatio === '4:5' ? '4/5' : '1/1';

  return (
    <div className="flex-1 flex flex-col min-h-0" ref={containerRef} tabIndex={0} style={{ outline: 'none' }}>
      <div className="flex gap-3 flex-1 min-h-0">
        {/* Thumbnail strip — vertical, left side */}
        {displayList.length > 0 && (
          <div className="flex flex-col gap-2 overflow-y-auto scrollbar-thin pr-0.5" style={{ scrollbarWidth: 'thin', maxHeight: mainMaxH }}>
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
                  style={{ width: '64px', aspectRatio: aspectRatio === '4:5' ? '4/5' : '1/1' }}
                  onClick={() => setSelectedIdx(i)}
                  draggable={!!img}
                  onDragStart={e => handleThumbDragStart(e, i)}
                  onDragOver={e => handleThumbDragOver(e, i)}
                  onDrop={e => handleThumbDrop(e, i)}
                  onDragEnd={handleThumbDragEnd}
                >
                  {img && (
                    <img src={img.url} alt={label} className="w-full h-full object-cover" />
                  )}
                  {!img && isGen && (
                    <div className="w-full h-full bg-card flex items-center justify-center" style={{ animation: 'pulse-border 1.5s infinite' }}>
                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    </div>
                  )}
                  {!img && !isGen && (
                    <div className="w-full h-full bg-card border border-dashed border-border flex flex-col items-center justify-center gap-0.5 rounded-md">
                      <Plus className="w-3 h-3 text-muted-foreground/40" />
                      <span className="text-[7px] text-muted-foreground/40 leading-tight">{label}</span>
                    </div>
                  )}
                  {isFirst && img && (
                    <span className="absolute bottom-0.5 left-0.5 text-[7px] font-semibold px-1 py-0.5 rounded bg-black/70 text-white/90">
                      Capa
                    </span>
                  )}
                </div>
              );
            })}
            {/* Add button at bottom of thumbs */}
            <button
              onClick={onAddUpload}
              className="shrink-0 flex items-center justify-center rounded-md border border-dashed border-border hover:border-primary/40 transition-colors"
              style={{ width: '64px', aspectRatio: '1/1' }}
            >
              <Plus className="w-3.5 h-3.5 text-muted-foreground/50" />
            </button>
          </div>
        )}

        {/* Main image viewer */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 min-w-0">
          <div
            className="relative rounded-[10px] overflow-hidden bg-card w-full mx-auto"
            style={{ aspectRatio: mainAspect, maxHeight: mainMaxH, maxWidth: mainMaxW }}
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
                    <span className="text-[11px] text-muted-foreground">Gerando…</span>
                  </>
                )}
              </div>
            )}

            {/* Image */}
            {currentImage && (
              <img
                src={currentImage.url}
                alt={currentLabel}
                className={`w-full h-full object-cover cursor-pointer transition-all duration-300 ${currentImage.justCompleted ? 'animate-fade-in' : ''}`}
                onClick={() => setPreviewOpen(true)}
              />
            )}

            {/* Hover overlay */}
            {currentImage && hovered && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3 transition-opacity">
                <button onClick={() => onRegenerate(currentImage.angle)} className="p-2 rounded-full bg-black/60 text-white hover:bg-primary transition-colors" title="Regenerar">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button onClick={() => onSetCover(currentImage.angle)} className="p-2 rounded-full bg-black/60 text-white hover:bg-primary transition-colors" title="Definir como capa">
                  <Star className="w-4 h-4" />
                </button>
                <button onClick={() => onRemove(currentImage.angle)} className="p-2 rounded-full bg-black/60 text-white hover:bg-destructive transition-colors" title="Remover">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => setPreviewOpen(true)} className="p-2 rounded-full bg-black/60 text-white hover:bg-primary transition-colors" title="Ampliar">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Navigation arrows */}
            {showArrows && (
              <>
                <button onClick={() => setSelectedIdx(i => Math.max(0, i - 1))} className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white/80 hover:bg-black/70 transition-colors" style={{ display: clampedIdx === 0 ? 'none' : 'flex' }}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setSelectedIdx(i => Math.min(displayList.length - 1, i + 1))} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white/80 hover:bg-black/70 transition-colors" style={{ display: clampedIdx === displayList.length - 1 ? 'none' : 'flex' }}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Angle label */}
            {currentLabel && displayList.length > 0 && (
              <span className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/60 text-white/80 backdrop-blur-sm">
                {currentLabel}
              </span>
            )}
          </div>

          {/* Dots */}
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

          {/* Summary */}
          {displayList.length > 0 && (
            <div className="flex items-center justify-center mt-1">
              <span className="text-[10px] text-muted-foreground">
                {images.length} {images.length === 1 ? 'imagem' : 'imagens'}{images.length > 1 ? ' · arraste para reorganizar' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

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
