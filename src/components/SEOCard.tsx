import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ProductAIContext } from '@/types/productUnderstanding';

interface SEOCardProps {
  title: string;
  description: string;
  storeDomain: string;
  productTitle: string;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  compact?: boolean;
  language?: string;
  languageCode?: string;
  countryName?: string;
  productContext?: ProductAIContext;
}

export function SEOCard({ title, description, storeDomain, productTitle, onTitleChange, onDescriptionChange, compact, language, languageCode, countryName, productContext }: SEOCardProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

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
    try {
      const seoBody = {
        brief: productTitle,
        title: productTitle,
        language: language || 'English',
        languageCode: languageCode || 'en-US',
        countryName: countryName || '',
        ...(productContext ? { productContext } : {}),
      };
      const [titleRes, descRes] = await Promise.all([
        supabase.functions.invoke('generate-text', {
          body: { ...seoBody, type: 'seo-title' },
        }),
        supabase.functions.invoke('generate-text', {
          body: { ...seoBody, type: 'seo-description' },
        }),
      ]);
      if (titleRes.data?.content) onTitleChange(titleRes.data.content.replace(/^["']|["']$/g, '').slice(0, 70));
      if (descRes.data?.content) onDescriptionChange(descRes.data.content.replace(/^["']|["']$/g, '').slice(0, 160));
      toast.success('SEO otimizado com IA!');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao otimizar SEO');
    } finally {
      setIsOptimizing(false);
    }
  }, [productTitle, onTitleChange, onDescriptionChange, language, languageCode, countryName, imageInsights]);

  if (compact) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="rounded-lg border border-[hsl(215,20%,16%)] bg-[hsl(215,25%,10%)] h-full flex flex-col">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-secondary/20 transition-colors rounded-t-lg">
            <span className="text-[11px] font-semibold text-[hsl(215,10%,45%)] uppercase tracking-wider">SEO</span>
            <div className="flex items-center gap-1.5">
              {!isOpen && (
                <span className="text-[10px] text-muted-foreground">
                  {titleLen}/70 · {descLen}/160
                </span>
              )}
              <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="px-3 pb-3 space-y-2.5 flex-1">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <Label className="text-[10px] font-medium text-[hsl(215,10%,45%)]">Título SEO</Label>
                <span className={`text-[9px] font-medium ${titleColor}`}>{titleLen}/70 {titleStatus}</span>
              </div>
              <Input
                value={seoTitle}
                onChange={e => onTitleChange(e.target.value.slice(0, 100))}
                placeholder="Título para buscadores"
                className="bg-[hsl(215,25%,8%)] border-[hsl(215,20%,16%)] text-[11px] h-[34px]"
                maxLength={100}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-0.5">
                <Label className="text-[10px] font-medium text-[hsl(215,10%,45%)]">Meta descrição</Label>
                <span className={`text-[9px] font-medium ${descColor}`}>{descLen}/160 {descStatus}</span>
              </div>
              <Textarea
                value={seoDesc}
                onChange={e => onDescriptionChange(e.target.value.slice(0, 200))}
                placeholder="Descrição para resultados de busca"
                className="bg-[hsl(215,25%,8%)] border-[hsl(215,20%,16%)] resize-none text-[11px] min-h-0"
                style={{ height: '48px' }}
                maxLength={200}
              />
            </div>

            <div>
              <Label className="text-[9px] font-medium text-[hsl(215,10%,40%)] mb-0.5 block">Preview Google</Label>
              <div className="bg-[hsl(215,30%,6%)] rounded-md p-2.5 border border-[hsl(215,20%,16%)] space-y-0.5">
                <p className="text-[9px] text-muted-foreground truncate">
                  {storeDomain || 'your-store.myshopify.com'} › products › {handle}
                </p>
                <p className="text-[12px] text-primary font-medium truncate leading-tight">
                  {seoTitle || 'Título do produto'}
                </p>
                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-snug">
                  {seoDesc || 'Adicione uma meta descrição...'}
                </p>
              </div>
            </div>

            <button
              onClick={handleOptimize}
              disabled={isOptimizing || !productTitle}
              className="flex items-center justify-center gap-1.5 w-full h-[30px] rounded-md text-[10px] font-medium border border-border text-muted-foreground hover:border-primary/50 hover:text-[hsl(213,97%,67%)] disabled:opacity-40 transition-all"
            >
              {isOptimizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Otimizar SEO com IA
            </button>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

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
