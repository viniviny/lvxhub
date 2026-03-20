import { useState, useCallback } from 'react';
import { ProductFormData, ProductSize, AVAILABLE_SIZES, COLLECTIONS } from '@/types/product';
import { useProducts } from '@/hooks/useProducts';
import { ImagePreview } from '@/components/ImagePreview';
import { ProductTable } from '@/components/ProductTable';
import { PublishConfirmation } from '@/components/PublishConfirmation';
import { ShopifyConnectDialog } from '@/components/ShopifyConnectDialog';
import { Product } from '@/types/product';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Send, LayoutDashboard, PlusCircle, Store } from 'lucide-react';

type View = 'dashboard' | 'create';

const initialForm: ProductFormData = {
  title: '',
  description: '',
  price: 0,
  sizes: [],
  collection: '',
  imagePrompt: '',
};

const Index = () => {
  const [view, setView] = useState<View>('dashboard');
  const [form, setForm] = useState<ProductFormData>(initialForm);
  const [imageApproved, setImageApproved] = useState(false);
  const [publishedProduct, setPublishedProduct] = useState<Product | null>(null);
  const [showShopifyDialog, setShowShopifyDialog] = useState(false);

  const {
    products,
    isGenerating,
    isPublishing,
    generatedImageUrl,
    generateImage,
    publishProduct,
    resetImage,
  } = useProducts();

  const handleGenerate = () => {
    if (!form.imagePrompt.trim()) return;
    setImageApproved(false);
    generateImage(form.imagePrompt);
  };

  const handleRegenerate = () => {
    setImageApproved(false);
    generateImage(form.imagePrompt);
  };

  const handlePublish = async () => {
    if (!generatedImageUrl || !imageApproved) return;
    const result = await publishProduct(form, generatedImageUrl);
    if (result) {
      setPublishedProduct(result);
    }
  };

  const handleNewProduct = () => {
    setForm(initialForm);
    setImageApproved(false);
    setPublishedProduct(null);
    resetImage();
  };

  const toggleSize = (size: ProductSize) => {
    setForm(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size],
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="font-display text-xl font-bold gradient-text">Fashion Publisher</h1>
          <nav className="flex gap-1">
            <Button
              variant={view === 'dashboard' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('dashboard')}
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Painel
            </Button>
            <Button
              variant={view === 'create' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => { setView('create'); handleNewProduct(); }}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Novo Produto
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShopifyDialog(true)}
            >
              <Store className="w-4 h-4 mr-2" />
              Conectar Shopify
            </Button>
          </nav>
        </div>
      </header>

      <ShopifyConnectDialog open={showShopifyDialog} onOpenChange={setShowShopifyDialog} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {view === 'dashboard' && (
          <div>
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-foreground">Produtos Publicados</h2>
              <p className="text-sm text-muted-foreground mt-1">{products.length} produto(s) no catálogo</p>
            </div>
            <ProductTable products={products} />
          </div>
        )}

        {view === 'create' && (
          <>
            {publishedProduct ? (
              <PublishConfirmation
                product={publishedProduct}
                isPublishing={false}
                onBack={handleNewProduct}
              />
            ) : isPublishing ? (
              <PublishConfirmation
                product={null}
                isPublishing={true}
                onBack={handleNewProduct}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form */}
                <div className="glass-card p-6">
                  <h3 className="font-display font-semibold text-foreground mb-5">Novo Produto</h3>

                  <div className="space-y-5">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Título do Produto</Label>
                      <Input
                        value={form.title}
                        onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Ex: Camiseta Urban Flow"
                        className="mt-1.5 bg-secondary border-border"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
                      <Textarea
                        value={form.description}
                        onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descreva o produto..."
                        rows={3}
                        className="mt-1.5 bg-secondary border-border resize-none"
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
                          className="mt-1.5 bg-secondary border-border"
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
                        placeholder="Ex: Camiseta preta com estampa urbana minimalista, fotografia de estúdio..."
                        rows={3}
                        className="mt-1.5 bg-secondary border-border resize-none"
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
                </div>

                {/* Preview + Publish */}
                <div className="flex flex-col gap-6">
                  <ImagePreview
                    imageUrl={generatedImageUrl}
                    isGenerating={isGenerating}
                    onRegenerate={handleRegenerate}
                    onApprove={() => setImageApproved(true)}
                    isApproved={imageApproved}
                  />

                  {imageApproved && generatedImageUrl && (
                    <Button
                      onClick={handlePublish}
                      disabled={isPublishing || !form.title.trim()}
                      size="lg"
                      className="w-full font-display font-semibold text-base"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Publicar no Shopify
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
