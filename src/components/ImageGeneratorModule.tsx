import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Sparkles,
  Loader2,
  Upload,
  X,
  Download,
  RefreshCw,
  BookmarkPlus,
  Image as ImageIcon,
  Wand2,
  Square,
  Smartphone,
  Monitor,
  RectangleVertical,
  Layers,
  Ratio,
  ChevronDown,
  Check,
  ImagePlus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type AspectRatio = '1:1' | '4:5' | '16:9' | '9:16';

const RATIOS: { id: AspectRatio; label: string; hint: string; icon: React.ComponentType<{ className?: string }>; aspectClass: string }[] = [
  { id: '1:1', label: '1:1', hint: 'Quadrado / feed', icon: Square, aspectClass: 'aspect-square' },
  { id: '4:5', label: '4:5', hint: 'Feed vertical', icon: RectangleVertical, aspectClass: 'aspect-[4/5]' },
  { id: '16:9', label: '16:9', hint: 'Banner / web', icon: Monitor, aspectClass: 'aspect-[16/9]' },
  { id: '9:16', label: '9:16', hint: 'Story / Reels', icon: Smartphone, aspectClass: 'aspect-[9/16]' },
];

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [meta, b64] = result.split(',');
      const mt = meta.match(/data:(.*?);/)?.[1] || file.type || 'image/png';
      resolve({ base64: b64, mimeType: mt });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Premium editorial style — Hermès / Louis Vuitton / Vogue level
const PREMIUM_STYLE_SUFFIX = `

PREMIUM EDITORIAL STYLE (MANDATORY — Hermès / Louis Vuitton / Vogue level):
- Soft Vogue-style studio lighting: large diffused softbox from above-front, gentle side fill, subtle rim light
- Sophisticated neutral background: warm beige, light cream, soft ecru or off-white tones (never cold pure white)
- Refined high-contrast finish: deep but never crushed blacks, luminous highlights, rich editorial color grading
- Warm, sophisticated palette with subtle amber/cream undertones, gallery-like atmosphere
- Tack-sharp focus, premium texture clearly visible, 8K hyper-realistic magazine-grade quality
- Editorial campaign aesthetic — Hermès, Louis Vuitton, Bottega Veneta, Loro Piana catalog feel

LUXURY SHADOW SYSTEM (MANDATORY — two layers):
1) DIFFUSED BACKGROUND SHADOW: very soft, low-opacity (10–15%) gradient shadow projected slightly behind the subject, blends smoothly into the surface
2) MICRO CONTACT SHADOW: tight, slightly darker (20–30% opacity) micro-shadow directly under the subject where it meets the surface
- Both shadows feathered, gradient, soft — never harsh, sharp or stamped`;

export function ImageGeneratorModule() {
  const [prompt, setPrompt] = useState('');
  const [variations, setVariations] = useState<1 | 2 | 4>(1);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [reference, setReference] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  const prevImage = useCallback(() => {
    setLightboxIdx((i) => (i === null ? null : (i - 1 + results.length) % results.length));
  }, [results.length]);
  const nextImage = useCallback(() => {
    setLightboxIdx((i) => (i === null ? null : (i + 1) % results.length));
  }, [results.length]);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') prevImage();
      else if (e.key === 'ArrowRight') nextImage();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightboxIdx, closeLightbox, prevImage, nextImage]);

  // style removed from UI
  const currentRatio = RATIOS.find((r) => r.id === aspectRatio)!;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx. 8MB)');
      return;
    }
    try {
      const { base64, mimeType } = await fileToBase64(file);
      setReference({ base64, mimeType, preview: `data:${mimeType};base64,${base64}` });
    } catch {
      toast.error('Falha ao ler imagem');
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.trim().length < 3) {
      toast.error('Descreva sua imagem (mínimo 3 caracteres)');
      return;
    }
    setLoading(true);
    setResults([]);
    setEnhancedPrompt(null);
    try {
      // Ensure session is fresh (auto-refresh expired tokens)
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData.session) {
        toast.error('Sessão expirada. Faça login novamente.');
        window.location.href = '/login';
        return;
      }
      const { data, error } = await supabase.functions.invoke('generate-image-simple', {
        body: {
          prompt: prompt.trim(),
          variations,
          aspectRatio,
          imageReference: reference?.base64,
          imageReferenceMimeType: reference?.mimeType,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResults(data.images || []);
      setEnhancedPrompt(data.enhancedPrompt || null);
      toast.success(`${data.images?.length || 0} imagem(ns) gerada(s)!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erro ao gerar imagem');
    } finally {
      setLoading(false);
    }
  };

  const handleVariation = async (sourceUrl: string) => {
    if (!prompt.trim()) {
      toast.error('Mantenha o prompt para gerar variação');
      return;
    }
    setLoading(true);
    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData.session) {
        toast.error('Sessão expirada. Faça login novamente.');
        window.location.href = '/login';
        return;
      }
      const match = sourceUrl.match(/^data:(.*?);base64,(.*)$/);
      if (!match) throw new Error('Formato de imagem inválido');
      const [, mt, b64] = match;
      const { data, error } = await supabase.functions.invoke('generate-image-simple', {
        body: {
          prompt: prompt.trim() + ' — different angle and composition',
          variations: 1,
          aspectRatio,
          imageReference: b64,
          imageReferenceMimeType: mt,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResults((prev) => [...prev, ...(data.images || [])]);
      toast.success('Variação gerada!');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar variação');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (url: string, idx: number) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `image-${Date.now()}-${idx + 1}.png`;
    a.click();
  };

  const handleSave = async (url: string, idx: number) => {
    setSavingIdx(idx);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const match = url.match(/^data:(.*?);base64,(.*)$/);
      if (!match) throw new Error('Formato inválido');
      const [, mt, b64] = match;
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: mt });
      const ext = mt.split('/')[1] || 'png';
      const path = `${user.id}/generator/${Date.now()}-${idx}.${ext}`;
      const { error: upErr } = await supabase.storage.from('product-images').upload(path, blob, {
        contentType: mt,
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('product-images').getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      // Get image dimensions
      const dims = await new Promise<{ w: number; h: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: 0, h: 0 });
        img.src = url;
      });

      const { error: insErr } = await (supabase as any).from('image_library').insert({
        user_id: user.id,
        url: publicUrl,
        storage_path: path,
        name: prompt.slice(0, 80) || 'Imagem gerada',
        product_name: 'Image Generator',
        angle: currentRatio.label,
        tags: ['image-generator', aspectRatio],
        status: 'rascunho',
        width: dims.w,
        height: dims.h,
        size_bytes: blob.size,
      });
      if (insErr) throw insErr;
      toast.success('Salvo na biblioteca!');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erro ao salvar');
    } finally {
      setSavingIdx(null);
    }
  };

  const aspectClass = currentRatio.aspectClass;
  const isWide = aspectRatio === '16:9';
  const gridCols = isWide ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2';

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-primary" /> Image Generator
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Gere imagens comerciais de alta qualidade com IA — prompt aprimorado automaticamente.
        </p>
      </div>

      {/* === RESULTS / PREVIEW (TOP) === */}
      <div className="mb-6">
        {loading && results.length === 0 && (
          <div className={`grid ${gridCols} gap-4`}>
            {Array.from({ length: variations }).map((_, i) => (
              <div
                key={i}
                className={`${aspectClass} rounded-lg border border-border bg-secondary animate-pulse flex items-center justify-center`}
              >
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div>
            {enhancedPrompt && (
              <div className="mb-4 p-3 bg-secondary rounded-md text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Prompt aprimorado:</span> {enhancedPrompt}
              </div>
            )}
            <div className={`grid ${gridCols} gap-4`}>
              {results.map((url, idx) => (
                <div key={idx} className="group relative rounded-lg overflow-hidden border border-border bg-secondary">
                  <button
                    type="button"
                    onClick={() => setLightboxIdx(idx)}
                    className="block w-full cursor-zoom-in"
                    aria-label={`Abrir imagem ${idx + 1} em tela cheia`}
                  >
                    <img src={url} alt={`Gerada ${idx + 1}`} className={`w-full ${aspectClass} object-cover`} />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition flex gap-2">
                    <Button size="sm" variant="secondary" className="flex-1 h-8 text-xs" onClick={() => handleDownload(url, idx)}>
                      <Download className="w-3.5 h-3.5 mr-1" /> Baixar
                    </Button>
                    <Button size="sm" variant="secondary" className="flex-1 h-8 text-xs" onClick={() => handleVariation(url)} disabled={loading}>
                      <RefreshCw className="w-3.5 h-3.5 mr-1" /> Variar
                    </Button>
                    <Button size="sm" variant="secondary" className="flex-1 h-8 text-xs" onClick={() => handleSave(url, idx)} disabled={savingIdx === idx}>
                      {savingIdx === idx ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <BookmarkPlus className="w-3.5 h-3.5 mr-1" />
                      )}
                      Salvar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && results.length === 0 && (
          <div className={`${aspectClass} max-h-[420px] glass-card flex flex-col items-center justify-center text-center p-10`}>
            <ImageIcon className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Suas imagens geradas aparecerão aqui.</p>
            <p className="text-[11px] text-muted-foreground mt-1">Descreva sua imagem abaixo e clique em Gerar.</p>
          </div>
        )}
      </div>

      {/* === COMPACT CONTROLS BAR === */}
      <div className="glass-card p-4 space-y-3">
        {/* Prompt */}
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
          placeholder="Descreva sua imagem... Ex.: Tênis de corrida masculino preto e laranja, sola translúcida, perfil"
          rows={2}
          className="resize-none border-0 bg-transparent focus-visible:ring-0 px-0 text-sm placeholder:text-muted-foreground"
          maxLength={2000}
        />

        {/* Hidden options as dropdowns */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">

          {/* VARIATIONS */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium border border-border bg-background text-foreground hover:bg-secondary transition"
              >
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span className="text-muted-foreground">Variações:</span>
                <span>{variations}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-40 p-1">
              {[1, 2, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setVariations(n as 1 | 2 | 4)}
                  className={cn(
                    'w-full text-left px-2.5 py-1.5 rounded-sm text-xs transition flex items-center gap-2',
                    variations === n ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary'
                  )}
                >
                  <Check className={cn('w-3.5 h-3.5 flex-shrink-0', variations === n ? 'opacity-100 text-primary' : 'opacity-0')} />
                  <span className="font-medium">{n} imagem{n > 1 ? 'ns' : ''}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* ASPECT RATIO */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium border border-border bg-background text-foreground hover:bg-secondary transition"
              >
                <Ratio className="w-3.5 h-3.5 text-primary" />
                <span className="text-muted-foreground">Formato:</span>
                <span>{currentRatio.label}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-1">
              {RATIOS.map((r) => {
                const Icon = r.icon;
                const active = aspectRatio === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setAspectRatio(r.id)}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded-sm text-xs transition flex items-center gap-2',
                      active ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary'
                    )}
                  >
                    <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
                    <span className="font-semibold w-10">{r.label}</span>
                    <span className="text-[10px] text-muted-foreground">{r.hint}</span>
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>

          {/* REFERENCE IMAGE */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium border transition',
                  reference
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-background text-foreground hover:bg-secondary'
                )}
              >
                <ImagePlus className="w-3.5 h-3.5 text-primary" />
                <span>{reference ? 'Referência ✓' : 'Referência'}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-3">
              <Label className="text-[11px] text-muted-foreground">Imagem de referência (opcional)</Label>
              <div className="mt-2">
                {reference ? (
                  <div className="flex items-center gap-2 p-2 border border-border rounded-md bg-background">
                    <img src={reference.preview} alt="ref" className="w-12 h-12 object-cover rounded" />
                    <div className="flex-1 text-[11px] text-muted-foreground">Carregada</div>
                    <Button variant="ghost" size="sm" onClick={() => setReference(null)} className="h-7 w-7 p-0">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-20 border border-dashed border-border rounded-md flex items-center justify-center gap-2 text-xs text-muted-foreground hover:bg-secondary transition"
                  >
                    <Upload className="w-3.5 h-3.5" /> Enviar imagem
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFile} />
              </div>
            </PopoverContent>
          </Popover>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">{prompt.length}/2000</span>
            <Button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              size="sm"
              className="font-display font-semibold h-8"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Gerar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* === FULLSCREEN LIGHTBOX === */}
      {lightboxIdx !== null && results[lightboxIdx] && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center animate-fade-in"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium">
            {lightboxIdx + 1} / {results.length}
          </div>

          {/* Prev */}
          {results.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-4 z-10 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Image */}
          <img
            src={results[lightboxIdx]}
            alt={`Imagem ${lightboxIdx + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          {results.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-4 z-10 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              aria-label="Próxima imagem"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Action bar */}
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full p-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-3 text-xs text-white hover:bg-white/20 hover:text-white rounded-full"
              onClick={() => handleDownload(results[lightboxIdx], lightboxIdx)}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" /> Baixar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-3 text-xs text-white hover:bg-white/20 hover:text-white rounded-full"
              onClick={() => {
                handleVariation(results[lightboxIdx]);
                closeLightbox();
              }}
              disabled={loading}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Variar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-3 text-xs text-white hover:bg-white/20 hover:text-white rounded-full"
              onClick={() => handleSave(results[lightboxIdx], lightboxIdx)}
              disabled={savingIdx === lightboxIdx}
            >
              {savingIdx === lightboxIdx ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <BookmarkPlus className="w-3.5 h-3.5 mr-1.5" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
