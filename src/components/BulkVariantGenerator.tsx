import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Loader2, Upload, Library, Image as ImageIcon, Sparkles, X, Check, Layers, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface BulkColor {
  id: string;
  name: string;
  hex: string;
  imageUrl?: string;
}

export interface BulkReference {
  id: string;
  url: string;       // displayable URL (data: or http)
  base64: string;    // raw base64 (no prefix)
  mimeType: string;
  source: 'upload' | 'library' | 'gallery';
  label?: string;
}

interface BulkVariantGeneratorProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  colors: BulkColor[];
  baseImageUrl?: string | null; // cover/base image of the product
  galleryImages?: { id: string; url: string }[]; // existing Step1 images
  aspectRatio?: '1:1' | '4:5';
  /** Called when one variant image is generated. UI updates incrementally. */
  onVariantGenerated: (colorId: string, imageUrl: string, refLabel: string) => void;
}

async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const mimeType = blob.type || 'image/png';
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    return { base64, mimeType };
  } catch {
    return null;
  }
}

async function fileToRef(file: File): Promise<BulkReference | null> {
  if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: muito grande (máx 10MB)`); return null; }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [meta, b64] = result.split(',');
      const mt = meta.match(/data:(.*?);/)?.[1] || file.type || 'image/png';
      resolve({
        id: crypto.randomUUID(),
        url: result,
        base64: b64,
        mimeType: mt,
        source: 'upload',
        label: file.name,
      });
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export function BulkVariantGenerator({
  open, onOpenChange, colors, baseImageUrl, galleryImages = [], aspectRatio = '4:5', onVariantGenerated,
}: BulkVariantGeneratorProps) {
  const [refs, setRefs] = useState<BulkReference[]>([]);
  const [selectedColorIds, setSelectedColorIds] = useState<Set<string>>(new Set(colors.map(c => c.id)));
  const [variationsPerCombo, setVariationsPerCombo] = useState(1);
  const [extraInstruction, setExtraInstruction] = useState('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: '' });
  const [tab, setTab] = useState<'upload' | 'library' | 'gallery'>('upload');
  const [libraryImages, setLibraryImages] = useState<{ id: string; url: string; name: string }[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelectedColorIds(new Set(colors.map(c => c.id)));
      setProgress({ done: 0, total: 0, current: '' });
    }
  }, [open, colors]);

  // Load library images on demand
  useEffect(() => {
    if (!open || tab !== 'library' || libraryImages.length > 0) return;
    setLoadingLibrary(true);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingLibrary(false); return; }
      const { data } = await supabase
        .from('image_library')
        .select('id, url, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(60);
      setLibraryImages((data as any[]) || []);
      setLoadingLibrary(false);
    })();
  }, [open, tab, libraryImages.length]);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const newRefs: BulkReference[] = [];
    for (const f of Array.from(files)) {
      const r = await fileToRef(f);
      if (r) newRefs.push(r);
    }
    setRefs(prev => [...prev, ...newRefs]);
    if (newRefs.length) toast.success(`${newRefs.length} referência(s) adicionada(s)`);
  };

  const addFromUrl = async (url: string, source: 'library' | 'gallery', label?: string) => {
    if (refs.some(r => r.url === url)) { toast.info('Já adicionada'); return; }
    const data = await urlToBase64(url);
    if (!data) { toast.error('Falha ao carregar imagem'); return; }
    setRefs(prev => [...prev, {
      id: crypto.randomUUID(),
      url, base64: data.base64, mimeType: data.mimeType, source, label,
    }]);
    toast.success('Referência adicionada');
  };

  const removeRef = (id: string) => setRefs(prev => prev.filter(r => r.id !== id));

  const toggleColor = (id: string) => {
    setSelectedColorIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedColors = colors.filter(c => selectedColorIds.has(c.id));
  const totalImages = selectedColors.length * Math.max(1, refs.length || 1) * variationsPerCombo;

  const handleGenerate = useCallback(async () => {
    if (!baseImageUrl) { toast.error('Imagem base do produto não disponível'); return; }
    if (selectedColors.length === 0) { toast.error('Selecione ao menos uma cor'); return; }

    const baseRef = await urlToBase64(baseImageUrl);
    if (!baseRef) { toast.error('Falha ao ler imagem base'); return; }

    setGenerating(true);
    const usedRefs = refs.length > 0 ? refs : [null];
    const total = selectedColors.length * usedRefs.length * variationsPerCombo;
    setProgress({ done: 0, total, current: '' });

    let done = 0;
    for (const color of selectedColors) {
      for (let r = 0; r < usedRefs.length; r++) {
        const ref = usedRefs[r];
        for (let v = 0; v < variationsPerCombo; v++) {
          const refLabel = ref ? (ref.label || `Ref ${r + 1}`) : 'sem ref';
          setProgress(p => ({ ...p, current: `${color.name} · ${refLabel} · v${v + 1}` }));
          try {
            const additionalReferences = ref
              ? [{ base64: ref.base64, mimeType: ref.mimeType, label: 'STYLE REFERENCE' }]
              : [];
            const { data, error } = await supabase.functions.invoke('generate-with-gemini', {
              body: {
                mode: 'generate-color-variant',
                baseImage: baseRef.base64,
                baseMimeType: baseRef.mimeType,
                colorName: color.name,
                colorHex: color.hex,
                aspectRatio,
                additionalReferences,
                extraInstruction: extraInstruction.trim() || undefined,
              },
            });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);
            const newUrl = data?.imageUrl;
            if (newUrl) {
              onVariantGenerated(color.id, newUrl, refLabel);
            }
          } catch (e: any) {
            console.error('Bulk variant error:', e);
            toast.error(`Falha em ${color.name}: ${e?.message || 'erro'}`);
          } finally {
            done++;
            setProgress(p => ({ ...p, done }));
          }
        }
      }
    }

    setGenerating(false);
    toast.success(`${done} imagem(ns) gerada(s)!`);
  }, [baseImageUrl, selectedColors, refs, variationsPerCombo, aspectRatio, extraInstruction, onVariantGenerated]);

  return (
    <Dialog open={open} onOpenChange={(o) => !generating && onOpenChange(o)}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Geração em massa de variantes
          </DialogTitle>
          <DialogDescription>
            Selecione referências, cores e variações. Será gerado: <span className="font-semibold text-foreground">{totalImages}</span> imagem(ns).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* References */}
          <div>
            <Label className="text-xs font-semibold mb-2 block">1. Imagens de referência ({refs.length})</Label>
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid grid-cols-3 h-8">
                <TabsTrigger value="upload" className="text-xs"><Upload className="w-3 h-3 mr-1" />Upload</TabsTrigger>
                <TabsTrigger value="library" className="text-xs"><Library className="w-3 h-3 mr-1" />Biblioteca</TabsTrigger>
                <TabsTrigger value="gallery" className="text-xs" disabled={galleryImages.length === 0}>
                  <ImageIcon className="w-3 h-3 mr-1" />Galeria atual
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="mt-2">
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg py-6 cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Clique ou arraste imagens (PNG, JPG, WEBP — máx 10MB cada)</span>
                  <input
                    type="file" multiple accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
                  />
                </label>
              </TabsContent>

              <TabsContent value="library" className="mt-2">
                {loadingLibrary ? (
                  <div className="flex items-center justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                ) : libraryImages.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Biblioteca vazia.</p>
                ) : (
                  <div className="grid grid-cols-6 gap-1.5 max-h-[180px] overflow-y-auto">
                    {libraryImages.map(img => {
                      const added = refs.some(r => r.url === img.url);
                      return (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => !added && addFromUrl(img.url, 'library', img.name)}
                          className={cn(
                            'aspect-square rounded-md overflow-hidden border-2 transition-all relative',
                            added ? 'border-primary opacity-50' : 'border-border hover:border-primary/50'
                          )}
                        >
                          <img src={img.url} alt={img.name} className="w-full h-full object-cover" loading="lazy" />
                          {added && <Check className="absolute inset-0 m-auto w-4 h-4 text-primary drop-shadow" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="gallery" className="mt-2">
                <div className="grid grid-cols-6 gap-1.5 max-h-[180px] overflow-y-auto">
                  {galleryImages.map(img => {
                    const added = refs.some(r => r.url === img.url);
                    return (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => !added && addFromUrl(img.url, 'gallery', `Galeria #${img.id.slice(0, 4)}`)}
                        className={cn(
                          'aspect-square rounded-md overflow-hidden border-2 transition-all relative',
                          added ? 'border-primary opacity-50' : 'border-border hover:border-primary/50'
                        )}
                      >
                        <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        {added && <Check className="absolute inset-0 m-auto w-4 h-4 text-primary drop-shadow" />}
                      </button>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>

            {/* Selected refs */}
            {refs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {refs.map(r => (
                  <div key={r.id} className="relative group">
                    <img src={r.url} alt={r.label} className="w-12 h-12 rounded-md object-cover border border-border" />
                    <button
                      onClick={() => removeRef(r.id)}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setRefs([])}
                  className="w-12 h-12 rounded-md border border-dashed border-border text-muted-foreground hover:text-destructive hover:border-destructive flex items-center justify-center transition-colors"
                  title="Limpar todas"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Colors */}
          <div>
            <Label className="text-xs font-semibold mb-2 block">2. Cores ({selectedColors.length} de {colors.length})</Label>
            <div className="flex flex-wrap gap-1.5">
              {colors.map(c => {
                const sel = selectedColorIds.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleColor(c.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-all',
                      sel ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-secondary text-muted-foreground'
                    )}
                  >
                    <span className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: c.hex }} />
                    {c.name}
                    {sel && <Check className="w-3 h-3 text-primary" />}
                  </button>
                );
              })}
              {colors.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Cadastre cores primeiro.</p>
              )}
            </div>
          </div>

          {/* Variations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold">3. Variações por (cor × referência)</Label>
              <Badge variant="secondary" className="text-xs">{variationsPerCombo}x</Badge>
            </div>
            <Slider
              value={[variationsPerCombo]}
              onValueChange={([v]) => setVariationsPerCombo(v)}
              min={1} max={4} step={1}
              disabled={generating}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>1</span><span>2</span><span>3</span><span>4</span>
            </div>
          </div>

          {/* Extra instruction */}
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">4. Direção adicional (opcional)</Label>
            <Input
              value={extraInstruction}
              onChange={(e) => setExtraInstruction(e.target.value)}
              placeholder='Ex: "vista frontal, modelo olhando para câmera"'
              className="h-8 text-xs bg-secondary"
              disabled={generating}
            />
          </div>

          {/* Progress */}
          {generating && (
            <div className="rounded-lg bg-secondary/50 border border-border p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  Gerando: {progress.current}
                </span>
                <span className="text-muted-foreground">{progress.done}/{progress.total}</span>
              </div>
              <div className="h-1.5 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Action */}
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={generating} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating || selectedColors.length === 0 || !baseImageUrl}
              className="flex-1"
            >
              {generating ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Gerando {progress.done}/{progress.total}</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Gerar {totalImages} imagem(ns)</>
              )}
            </Button>
          </div>

          {!baseImageUrl && (
            <p className="text-[10px] text-destructive italic">
              ⚠ Gere a imagem do produto na Etapa 1 primeiro.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
