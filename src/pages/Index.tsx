import { useState, useRef, useCallback } from 'react';
import { ProductFormData, ProductSize, AVAILABLE_SIZES, COLLECTIONS } from '@/types/product';
import { useShopifyAuth } from '@/hooks/useShopifyAuth';
import { SettingsDialog } from '@/components/SettingsDialog';
import { OnboardingGuide } from '@/components/OnboardingGuide';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Settings, Send, Loader2, Upload, CheckCircle2, ExternalLink,
  Package, XCircle, Zap
} from 'lucide-react';

const initialForm: ProductFormData = {
  title: '',
  description: '',
  price: 0,
  sizes: [],
  collection: '',
  imagePrompt: '',
};

const Index = () => {
  const {
    settings, accessToken, isAuthenticated, hasSettings,
    publishedCount, saveSettings, startOAuth, clearToken, incrementPublished,
  } = useShopifyAuth();

  const [showHelp, setShowHelp] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [form, setForm] = useState<ProductFormData>(initialForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ title: string; shopifyUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSize = (size: ProductSize) => {
    setForm(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size],
    }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato inválido. Use PNG, JPG ou WEBP.');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // strip data:...;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePublish = async () => {
    if (!imageFile || !accessToken || !settings) return;
    if (!form.title.trim()) {
      toast.error('Informe o título do produto.');
      return;
    }

    setIsPublishing(true);
    setPublishResult(null);

    try {
      const imageBase64 = await fileToBase64(imageFile);

      const { data, error } = await supabase.functions.invoke('shopify-publish', {
        body: {
          title: form.title,
          description: form.description,
          price: form.price,
          sizes: form.sizes,
          collection: form.collection,
          imageBase64,
          imageName: imageFile.name,
          storeDomain: settings.storeDomain,
          accessToken,
          apiVersion: settings.apiVersion,
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Erro ao publicar');
      }

      incrementPublished();
      setPublishResult({ title: data.title, shopifyUrl: data.shopifyUrl });
      toast.success('Produto publicado como rascunho no Shopify!');
    } catch (err: any) {
      console.error('Publish error:', err);
      toast.error(err.message || 'Erro ao publicar produto.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleNewProduct = () => {
    setForm(initialForm);
    setImageFile(null);
    setImagePreview(null);
    setPublishResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Show setup screen if not configured
  const showSetup = !hasSettings;


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl font-bold gradient-text flex items-center gap-1.5">
              <Zap className="w-5 h-5 text-primary" />
              Publify
            </h1>
            {publishedCount > 0 && (
              <Badge variant="secondary" className="font-display">
                <Package className="w-3 h-3 mr-1" />
                {publishedCount} publicado{publishedCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[hsl(var(--success)/0.1)] border border-[hsl(var(--success)/0.3)] text-sm">
                <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
                <span className="text-[hsl(var(--success))] font-medium text-xs">Loja Conectada</span>
                <span className="text-muted-foreground text-xs">·</span>
                <span className="text-foreground font-medium text-xs">{settings?.storeDomain}</span>
                <button
                  onClick={clearToken}
                  className="text-muted-foreground hover:text-destructive text-xs underline ml-1 transition-colors"
                  title="Desconectar"
                >
                  Desconectar
                </button>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHelp(true)}
              title="Tutorial"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
              title="Configurações"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        currentSettings={settings}
        onSave={saveSettings}
        onConnect={startOAuth}
        isAuthenticated={isAuthenticated}
      />

      <OnboardingGuide open={showHelp} onOpenChange={setShowHelp} />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Setup Screen */}
        {showSetup && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="glass-card p-10 text-center max-w-md w-full">
              <Settings className="w-16 h-16 mx-auto text-primary mb-6" />
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">Configuração Inicial</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Configure suas credenciais do Shopify para começar a publicar produtos.
              </p>
              <Button onClick={() => setShowSettings(true)} className="w-full font-display font-semibold">
                <Settings className="w-4 h-4 mr-2" />
                Configurar Shopify
              </Button>
            </div>
          </div>
        )}

        {/* Connect Screen */}
        {hasSettings && !isAuthenticated && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="glass-card p-10 text-center max-w-md w-full">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <ExternalLink className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">Conectar ao Shopify</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Suas configurações estão salvas. Agora conecte-se ao Shopify via OAuth para autorizar o app.
              </p>
              <Button onClick={startOAuth} className="w-full font-display font-semibold">
                <ExternalLink className="w-4 h-4 mr-2" />
                Conectar ao Shopify
              </Button>
            </div>
          </div>
        )}

        {/* Product Form */}
        {isAuthenticated && !publishResult && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="font-display font-semibold text-foreground mb-5">Novo Produto</h3>

              <div className="space-y-5">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Título do Produto *</Label>
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
                      placeholder="189.90"
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
                  <div className="flex flex-wrap gap-2 mt-1.5">
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
              </div>
            </div>

            {/* Image + Publish */}
            <div className="flex flex-col gap-6">
              <div className="glass-card p-6">
                <h3 className="font-display font-semibold text-foreground mb-4">Imagem do Produto</h3>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  onChange={handleImageSelect}
                  className="hidden"
                />

                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full rounded-lg border border-border object-contain max-h-80"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 hover:bg-destructive/80 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-border rounded-lg p-12 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-secondary/30 transition-all"
                  >
                    <Upload className="w-10 h-10 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Clique para enviar uma imagem</span>
                    <span className="text-xs text-muted-foreground/60">PNG, JPG ou WEBP</span>
                  </button>
                )}
              </div>

              <Button
                onClick={handlePublish}
                disabled={isPublishing || !imageFile || !form.title.trim()}
                size="lg"
                className="w-full font-display font-semibold text-base"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publicar no Shopify
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Success Screen */}
        {isAuthenticated && publishResult && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="glass-card p-10 text-center max-w-md w-full">
              <CheckCircle2 className="w-16 h-16 mx-auto text-[hsl(var(--success))] mb-6" />
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">Produto Publicado!</h2>
              <p className="text-muted-foreground text-sm mb-1">
                <strong className="text-foreground">{publishResult.title}</strong> foi criado como rascunho.
              </p>
              <a
                href={publishResult.shopifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary text-sm mt-3 hover:underline"
              >
                Ver no Shopify Admin <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <div className="mt-6">
                <Button onClick={handleNewProduct} className="w-full font-display font-semibold">
                  <Package className="w-4 h-4 mr-2" />
                  Criar Novo Produto
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
