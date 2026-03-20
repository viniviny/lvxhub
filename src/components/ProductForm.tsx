import { useState } from 'react';
import { ProductFormData, AVAILABLE_SIZES, COLLECTIONS, ProductSize } from '@/types/product';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';

interface ProductFormProps {
  onGenerateImage: (prompt: string) => void;
  isGenerating: boolean;
  hasImage: boolean;
}

const initialForm: ProductFormData = {
  title: '',
  description: '',
  price: 0,
  sizes: [],
  collection: '',
  imagePrompt: '',
};

export function ProductForm({ onGenerateImage, isGenerating, hasImage }: ProductFormProps) {
  const [form, setForm] = useState<ProductFormData>(initialForm);

  const toggleSize = (size: ProductSize) => {
    setForm(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size],
    }));
  };

  const handleGenerate = () => {
    if (!form.imagePrompt.trim()) return;
    onGenerateImage(form.imagePrompt);
  };

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-medium text-muted-foreground">Título do Produto</Label>
        <Input
          value={form.title}
          onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Ex: Camiseta Urban Flow"
          className="mt-1.5 bg-secondary border-border focus:ring-primary"
        />
      </div>

      <div>
        <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
        <Textarea
          value={form.description}
          onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Descreva o produto..."
          rows={3}
          className="mt-1.5 bg-secondary border-border focus:ring-primary resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Preço (R$)</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={form.price || ''}
            onChange={e => setForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
            placeholder="99.90"
            className="mt-1.5 bg-secondary border-border focus:ring-primary"
          />
        </div>
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Coleção</Label>
          <Select value={form.collection} onValueChange={v => setForm(prev => ({ ...prev, collection: v }))}>
            <SelectTrigger className="mt-1.5 bg-secondary border-border">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {COLLECTIONS.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium text-muted-foreground">Tamanhos</Label>
        <div className="flex gap-2 mt-1.5">
          {AVAILABLE_SIZES.map(size => (
            <button
              key={size}
              type="button"
              onClick={() => toggleSize(size)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                form.sizes.includes(size)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium text-muted-foreground">Prompt da Imagem (DALL-E 3)</Label>
        <Textarea
          value={form.imagePrompt}
          onChange={e => setForm(prev => ({ ...prev, imagePrompt: e.target.value }))}
          placeholder="Ex: Camiseta preta com estampa urbana minimalista, fotografia de estúdio com fundo branco..."
          rows={3}
          className="mt-1.5 bg-secondary border-border focus:ring-primary resize-none"
        />
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !form.imagePrompt.trim()}
        className="w-full font-display font-semibold"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Gerando Imagem...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Gerar Imagem com IA
          </>
        )}
      </Button>
    </div>
  );
}

// Export form data getter via ref pattern
export function useProductFormData() {
  // We'll use a simpler approach - lift state
}
