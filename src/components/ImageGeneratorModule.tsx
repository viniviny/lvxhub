import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Upload, X, Download, RefreshCw, BookmarkPlus, Image as ImageIcon, Wand2, Square, Smartphone, Monitor, RectangleVertical } from 'lucide-react';
import { toast } from 'sonner';

type StyleId = 'realistic' | 'ecommerce' | 'lifestyle' | 'ads' | 'fashion';
type AspectRatio = '1:1' | '4:5' | '16:9' | '9:16';

const STYLES: { id: StyleId; label: string; desc: string }[] = [
  { id: 'realistic', label: 'Realista premium', desc: '8K cinematográfico, foco editorial' },
  { id: 'ecommerce', label: 'E-commerce clean (fundo branco)', desc: 'Padrão Amazon/Shopify' },
  { id: 'lifestyle', label: 'Lifestyle moderno', desc: 'Cena natural, mood de marca' },
  { id: 'ads', label: 'Publicidade / Ads', desc: 'Alto impacto, otimizado para conversão' },
  { id: 'fashion', label: 'Studio fashion', desc: 'Editorial Vogue/Zara' },
];

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

export function ImageGeneratorModule() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<StyleId>('realistic');
  const [variations, setVariations] = useState<1 | 2 | 4>(1);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [reference, setReference] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const { data, error } = await supabase.functions.invoke('generate-image-simple', {
        body: {
          prompt: prompt.trim(),
          style,
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
      // Convert dataURL back to base64 + mime
      const match = sourceUrl.match(/^data:(.*?);base64,(.*)$/);
      if (!match) throw new Error('Formato de imagem inválido');
      const [, mt, b64] = match;
      const { data, error } = await supabase.functions.invoke('generate-image-simple', {
        body: {
          prompt: prompt.trim() + ' — different angle and composition',
          style,
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

      // Upload to storage
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

      const { error: insErr } = await (supabase as any).from('image_library').insert({
        user_id: user.id,
        url: publicUrl,
        storage_path: path,
        name: prompt.slice(0, 80) || 'Imagem gerada',
        tags: [style, 'image-generator'],
        status: 'active',
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

      <div className="glass-card p-6 space-y-5">
        {/* Prompt */}
        <div>
          <Label className="text-sm font-medium text-foreground">Descreva sua imagem</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
            placeholder="Ex.: Tênis de corrida masculino preto e laranja, sola translúcida, fotografado de perfil"
            rows={3}
            className="mt-1.5 resize-none"
            maxLength={2000}
          />
          <p className="text-[11px] text-muted-foreground mt-1">{prompt.length}/2000</p>
        </div>

        {/* Style + Variations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-foreground">Estilo</Label>
            <Select value={style} onValueChange={(v) => setStyle(v as StyleId)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{s.label}</span>
                      <span className="text-[11px] text-muted-foreground">{s.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground">Variações</Label>
            <div className="flex gap-2 mt-1.5">
              {[1, 2, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setVariations(n as 1 | 2 | 4)}
                  className={`flex-1 h-10 rounded-md text-sm font-medium transition-all border ${
                    variations === n
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Aspect ratio */}
        <div>
          <Label className="text-sm font-medium text-foreground">Formato</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
            {RATIOS.map((r) => {
              const Icon = r.icon;
              const active = aspectRatio === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setAspectRatio(r.id)}
                  className={`flex items-center gap-2 px-3 h-12 rounded-md text-sm font-medium transition-all border text-left ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <div className="flex flex-col leading-tight min-w-0">
                    <span className="font-semibold">{r.label}</span>
                    <span className={`text-[10px] ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {r.hint}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reference image */}
        <div>
          <Label className="text-sm font-medium text-foreground">Imagem de referência (opcional)</Label>
          <div className="mt-1.5">
            {reference ? (
              <div className="flex items-center gap-3 p-2 border border-border rounded-md bg-background">
                <img src={reference.preview} alt="ref" className="w-16 h-16 object-cover rounded" />
                <div className="flex-1 text-xs text-muted-foreground">Referência carregada</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReference(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-20 border border-dashed border-border rounded-md flex items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-secondary transition"
              >
                <Upload className="w-4 h-4" /> Enviar imagem de referência
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFile}
            />
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="w-full font-display font-semibold h-11"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" /> Gerar imagem
            </>
          )}
        </Button>
      </div>

      {/* Results gallery */}
      {(() => {
        const aspectClass = RATIOS.find((r) => r.id === aspectRatio)?.aspectClass || 'aspect-square';
        const isWide = aspectRatio === '16:9';
        const gridCols = isWide ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2';
        return (
          <>
            {(loading && results.length === 0) && (
              <div className={`mt-6 grid ${gridCols} gap-4`}>
                {Array.from({ length: variations }).map((_, i) => (
                  <div key={i} className={`${aspectClass} rounded-lg border border-border bg-secondary animate-pulse flex items-center justify-center`}>
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </>
        );
      })()}

      {results.length > 0 && (() => {
        const aspectClass = RATIOS.find((r) => r.id === aspectRatio)?.aspectClass || 'aspect-square';
        const isWide = aspectRatio === '16:9';
        const gridCols = isWide ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2';
        return (
          <div className="mt-6">
            {enhancedPrompt && (
              <div className="mb-4 p-3 bg-secondary rounded-md text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Prompt aprimorado:</span> {enhancedPrompt}
              </div>
            )}
            <div className={`grid ${gridCols} gap-4`}>
              {results.map((url, idx) => (
                <div key={idx} className="group relative rounded-lg overflow-hidden border border-border bg-secondary">
                  <img src={url} alt={`Gerada ${idx + 1}`} className={`w-full ${aspectClass} object-cover`} />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 h-8 text-xs"
                    onClick={() => handleDownload(url, idx)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Baixar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 h-8 text-xs"
                    onClick={() => handleVariation(url)}
                    disabled={loading}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Variar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 h-8 text-xs"
                    onClick={() => handleSave(url, idx)}
                    disabled={savingIdx === idx}
                  >
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
        <div className="mt-6 glass-card p-10 text-center">
          <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Suas imagens geradas aparecerão aqui.
          </p>
        </div>
      )}
    </div>
  );
}
