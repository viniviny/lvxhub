import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';

interface SEOCardProps {
  title: string;
  description: string;
  storeDomain: string;
  productTitle: string;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
}

export function SEOCard({ title, description, storeDomain, productTitle, onTitleChange, onDescriptionChange }: SEOCardProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);

  const seoTitle = title || productTitle || '';
  const seoDesc = description || '';
  const handle = productTitle ? productTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'product';

  const titleLen = seoTitle.length;
  const descLen = seoDesc.length;

  const titleColor = titleLen === 0 ? 'text-muted-foreground' : titleLen <= 60 ? 'text-[hsl(var(--success))]' : titleLen <= 70 ? 'text-[hsl(var(--warning))]' : 'text-destructive';
  const descColor = descLen === 0 ? 'text-muted-foreground' : descLen <= 155 ? 'text-[hsl(var(--success))]' : descLen <= 160 ? 'text-[hsl(var(--warning))]' : 'text-destructive';

  const titleStatus = titleLen === 0 ? '' : titleLen <= 60 ? '✓' : titleLen <= 70 ? '⚠' : '✗';
  const descStatus = descLen === 0 ? '' : descLen <= 155 ? '✓' : descLen <= 160 ? '⚠' : '✗';

  const handleOptimize = useCallback(async () => {
    if (!productTitle) return;
    setIsOptimizing(true);
    // Auto-generate SEO from product title
    await new Promise(r => setTimeout(r, 800));
    const generated = productTitle.slice(0, 60);
    const generatedDesc = `Compre ${productTitle} com o melhor preço. Envio rápido e seguro. Confira!`.slice(0, 155);
    onTitleChange(generated);
    onDescriptionChange(generatedDesc);
    setIsOptimizing(false);
  }, [productTitle, onTitleChange, onDescriptionChange]);

  return (
    <div className="glass-card p-4 space-y-3 h-full flex flex-col">
      <h3 className="font-display font-semibold text-[13px] text-foreground">SEO</h3>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs font-medium text-muted-foreground">Título SEO</Label>
          <span className={`text-[10px] font-medium ${titleColor}`}>{titleLen}/70 {titleStatus}</span>
        </div>
        <Input
          value={seoTitle}
          onChange={e => onTitleChange(e.target.value.slice(0, 100))}
          placeholder="Título para buscadores"
          className="bg-secondary border-border text-xs h-8"
          maxLength={100}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs font-medium text-muted-foreground">Meta descrição</Label>
          <span className={`text-[10px] font-medium ${descColor}`}>{descLen}/160 {descStatus}</span>
        </div>
        <Textarea
          value={seoDesc}
          onChange={e => onDescriptionChange(e.target.value.slice(0, 200))}
          placeholder="Descrição para resultados de busca"
          className="bg-secondary border-border resize-none text-xs min-h-0"
          style={{ height: '56px' }}
          maxLength={200}
        />
      </div>

      {/* Google Preview */}
      <div className="flex-1">
        <Label className="text-[10px] font-medium text-muted-foreground mb-1 block">Prévia do Google</Label>
        <div className="bg-secondary rounded-md p-3 border border-border space-y-1">
          <p className="text-[10px] text-muted-foreground truncate">
            {storeDomain || 'your-store.myshopify.com'} › products › {handle}
          </p>
          <p className="text-[13px] text-primary font-medium truncate leading-tight">
            {seoTitle || 'Título do produto'}
          </p>
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
            {seoDesc || 'Adicione uma meta descrição para melhorar o SEO do seu produto...'}
          </p>
        </div>
      </div>

      <Button
        onClick={handleOptimize}
        disabled={isOptimizing || !productTitle}
        variant="outline"
        size="sm"
        className="w-full text-xs h-8"
      >
        {isOptimizing ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1.5" />}
        Otimizar SEO com IA
      </Button>
    </div>
  );
}
