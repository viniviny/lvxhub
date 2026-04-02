import { useState } from 'react';
import { ProductFormData, AVAILABLE_SIZES, COLLECTIONS, ProductSize } from '@/types/product';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  compareAtPrice: null,
  cost: null,
  sizes: [],
  collection: '',
  imagePrompt: '',
  variants: [],
  inventoryPolicy: 'continue',
  requiresShipping: true,
  weight: 0,
  weightUnit: 'kg',
  countryOfOrigin: '',
  selectedChannels: [],
  tags: '',
  productType: '',
};

export function ProductForm({ onGenerateImage, isGenerating, hasImage }: ProductFormProps) {
  const [form, setForm] = useState<ProductFormData>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (form.title && form.title.length > 255) {
      newErrors.title = 'Máximo de 255 caracteres.';
    }

    if (form.price < 0) {
      newErrors.price = 'O preço deve ser positivo.';
    } else if (form.price > 0 && !/^\d+(\.\d{1,2})?$/.test(form.price.toString())) {
      newErrors.price = 'Máximo de 2 casas decimais.';
    }

    if (form.imagePrompt && form.imagePrompt.length > 1000) {
      newErrors.imagePrompt = 'Máximo de 1000 caracteres.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
    if (!validate()) return;
    onGenerateImage(form.imagePrompt);
  };

  // Strip HTML tags from text input
  const sanitizeText = (text: string) => text.replace(/<[^>]*>/g, '');

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-medium text-muted-foreground">Título do Produto</Label>
        <Input
          value={form.title}
          onChange={e => {
            const val = sanitizeText(e.target.value).slice(0, 255);
            setForm(prev => ({ ...prev, title: val }));
            if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
          }}
          placeholder="Ex: Camiseta Urban Flow"
          className={`mt-1.5 bg-secondary border-border focus:ring-primary ${errors.title ? 'border-destructive' : ''}`}
          maxLength={255}
        />
        {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
      </div>

      <div>
        <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
        <Textarea
          value={form.description}
          onChange={e => setForm(prev => ({ ...prev, description: sanitizeText(e.target.value) }))}
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
            onChange={e => {
              const val = parseFloat(e.target.value) || 0;
              setForm(prev => ({ ...prev, price: Math.max(0, val) }));
              if (errors.price) setErrors(prev => ({ ...prev, price: '' }));
            }}
            placeholder="99.90"
            className={`mt-1.5 bg-secondary border-border focus:ring-primary ${errors.price ? 'border-destructive' : ''}`}
          />
          {errors.price && <p className="text-xs text-destructive mt-1">{errors.price}</p>}
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
        <Label className="text-sm font-medium text-muted-foreground">Prompt da Imagem (IA)</Label>
        <Textarea
          value={form.imagePrompt}
          onChange={e => {
            setForm(prev => ({ ...prev, imagePrompt: e.target.value.slice(0, 1000) }));
            if (errors.imagePrompt) setErrors(prev => ({ ...prev, imagePrompt: '' }));
          }}
          placeholder="Ex: Camiseta preta com estampa urbana minimalista, fotografia de estúdio com fundo branco..."
          rows={3}
          className={`mt-1.5 bg-secondary border-border focus:ring-primary resize-none ${errors.imagePrompt ? 'border-destructive' : ''}`}
          maxLength={1000}
        />
        {errors.imagePrompt && <p className="text-xs text-destructive mt-1">{errors.imagePrompt}</p>}
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
