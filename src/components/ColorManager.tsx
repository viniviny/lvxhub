import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, X, ImageIcon, Check, Sparkles, Loader2, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BulkVariantGenerator } from './BulkVariantGenerator';

export interface ProductColor {
  id: string;
  name: string;
  hex: string;
  imageUrl?: string;
}

interface ColorManagerProps {
  colors: ProductColor[];
  onColorsChange: (colors: ProductColor[]) => void;
  generatedImages?: { id: string; url: string; isCover?: boolean }[];
  aspectRatio?: '1:1' | '4:5';
}

// Convert any image URL (data: or http) to base64 + mimeType
async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const mimeType = blob.type || 'image/png';
    const reader = new FileReader();
    const dataUrl: string = await new Promise((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    return { base64, mimeType };
  } catch (e) {
    console.error('[ColorManager] urlToBase64 failed:', e);
    return null;
  }
}

export function ColorManager({ colors, onColorsChange, generatedImages = [], aspectRatio = '4:5' }: ColorManagerProps) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#000000');
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const coverImage = generatedImages.find(i => i.isCover) || generatedImages[0] || null;

  const addColor = () => {
    if (!name.trim()) return;
    onColorsChange([...colors, {
      id: crypto.randomUUID(),
      name: name.trim(),
      hex,
      imageUrl: selectedImageUrl || undefined,
    }]);
    setName('');
    setHex('#000000');
    setSelectedImageUrl(null);
    setAdding(false);
  };

  const removeColor = (id: string) => onColorsChange(colors.filter(c => c.id !== id));

  const generateVariant = async (color: ProductColor) => {
    if (!coverImage?.url) {
      toast.error('Gere a imagem do produto primeiro (Etapa 1).');
      return;
    }
    setGeneratingId(color.id);
    try {
      const baseRef = await urlToBase64(coverImage.url);
      if (!baseRef) {
        toast.error('Não foi possível ler a imagem base do produto.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-with-gemini', {
        body: {
          mode: 'generate-color-variant',
          baseImage: baseRef.base64,
          baseMimeType: baseRef.mimeType,
          colorName: color.name,
          colorHex: color.hex,
          aspectRatio,
        },
      });

      if (error) {
        const status = (error as any)?.context?.status;
        if (status === 429) toast.error('Limite de requisições atingido. Aguarde alguns segundos.');
        else if (status === 402) toast.error('Créditos esgotados. Adicione fundos ao workspace.');
        else toast.error('Erro ao gerar variante. Tente novamente.');
        return;
      }

      const newUrl = (data as any)?.imageUrl;
      if (!newUrl) {
        toast.error('A IA não retornou imagem. Tente novamente.');
        return;
      }

      onColorsChange(colors.map(c => c.id === color.id ? { ...c, imageUrl: newUrl } : c));
      toast.success(`Variante "${color.name}" gerada!`);
    } catch (e) {
      console.error('[ColorManager] generateVariant error:', e);
      toast.error('Erro ao gerar variante.');
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-[13px] text-foreground">Cor</h3>
        {!adding && (
          <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground" onClick={() => setAdding(true)}>
            <Plus className="w-3 h-3 mr-1" />Adicionar cor
          </Button>
        )}
      </div>

      {colors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {colors.map(c => {
            const isGen = generatingId === c.id;
            return (
              <div key={c.id} className="flex items-center gap-1.5 bg-secondary rounded-full pl-2.5 pr-1.5 py-1 border border-border">
                {c.imageUrl ? (
                  <img src={c.imageUrl} alt={c.name} className="w-5 h-5 rounded-full object-cover border border-border" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: c.hex }} />
                )}
                <span className="text-[11px] text-foreground">{c.name}</span>
                <button
                  type="button"
                  onClick={() => generateVariant(c)}
                  disabled={isGen || !coverImage}
                  title={coverImage ? `Gerar imagem na cor ${c.name}` : 'Gere a imagem do produto primeiro'}
                  className="ml-1 p-1 rounded-full text-muted-foreground hover:text-primary hover:bg-background/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isGen ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                </button>
                <button onClick={() => removeColor(c.id)} className="text-muted-foreground hover:text-destructive transition-colors p-0.5" disabled={isGen}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {adding && (
        <div className="space-y-2.5">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-[10px] text-muted-foreground">Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Azul marinho" className="bg-secondary border-border text-xs h-8 mt-0.5" />
            </div>
            <div className="w-16">
              <Label className="text-[10px] text-muted-foreground">Cor</Label>
              <input type="color" value={hex} onChange={e => setHex(e.target.value)} className="w-full h-8 rounded border border-border cursor-pointer mt-0.5" />
            </div>
            <Button size="sm" className="h-8 text-xs" onClick={addColor}>OK</Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setAdding(false); setSelectedImageUrl(null); }}>
              <X className="w-3 h-3" />
            </Button>
          </div>

          {/* Image selection from generated images */}
          {generatedImages.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">Imagem da variante (opcional)</Label>
              {selectedImageUrl ? (
                <div className="flex items-center gap-2">
                  <img src={selectedImageUrl} alt="Selecionada" className="w-10 h-10 rounded border border-border object-cover" />
                  <span className="text-[10px] text-muted-foreground">Imagem selecionada</span>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setSelectedImageUrl(null)}>
                    <X className="w-3 h-3 mr-0.5" />Remover
                  </Button>
                </div>
              ) : (
                <Dialog open={imagePickerOpen} onOpenChange={setImagePickerOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5 border-dashed">
                      <ImageIcon className="w-3 h-3" />Selecionar imagem gerada
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-sm">Selecionar imagem para a cor</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto py-2">
                      {generatedImages.map(img => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => {
                            setSelectedImageUrl(img.url);
                            setImagePickerOpen(false);
                          }}
                          className="relative group rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors aspect-square"
                        >
                          <img src={img.url} alt="" className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <Check className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </div>
      )}

      {colors.length > 0 && !coverImage && (
        <p className="text-[10px] text-muted-foreground italic">
          Gere a imagem do produto na Etapa 1 para habilitar a geração de variantes de cor.
        </p>
      )}
    </div>
  );
}
