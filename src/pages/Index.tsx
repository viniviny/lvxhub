import { useState, useRef } from 'react';
import { ProductFormData, ProductSize, AVAILABLE_SIZES, COLLECTIONS } from '@/types/product';
import { useStoreManager } from '@/hooks/useStoreManager';
import { SettingsDialog } from '@/components/SettingsDialog';
import { OnboardingGuide } from '@/components/OnboardingGuide';
import { StoreManagementDialog } from '@/components/StoreManagementDialog';
import { DashboardSidebar, DashboardView } from '@/components/DashboardSidebar';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserMenu } from '@/components/UserMenu';
import {
  Send, Loader2, Upload, CheckCircle2, ExternalLink,
  Package, XCircle, Zap, HelpCircle, Store, ClipboardList, Settings
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
    stores, activeStore, activeStoreId, hasConnectedStore, publishedCount,
    setActiveStore, addStore, removeStore, setDefault, startOAuth, incrementPublished,
  } = useStoreManager();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showManagement, setShowManagement] = useState(false);
  const [currentView, setCurrentView] = useState<DashboardView>('publish');
  const [form, setForm] = useState<ProductFormData>(initialForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ title: string; shopifyUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAuthenticated = !!activeStore?.connected;

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

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handlePublish = async () => {
    if (!imageFile || !activeStore?.accessToken || !activeStore) return;
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
          storeDomain: activeStore.domain,
          accessToken: activeStore.accessToken,
          apiVersion: activeStore.apiVersion,
        },
      });

      if (error || data?.error) throw new Error(data?.error || error?.message || 'Erro ao publicar');

      incrementPublished();
      setPublishResult({ title: data.title, shopifyUrl: data.shopifyUrl });
      toast.success(`Produto publicado em ${activeStore.domain}!`);
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

  const handleAddStore = () => {
    if (stores.length > 0) {
      setShowSettings(true);
    } else {
      setShowOnboarding(true);
    }
  };

  const handleCredentialsSubmit = (data: {
    domain: string; clientId: string; clientSecret: string;
    apiVersion: string; redirectUri: string;
  }) => {
    const store = addStore(data);
    setShowSettings(false);
    startOAuth(store);
  };

  const handleReconnect = (store: import('@/hooks/useStoreManager').ShopifyStore) => {
    setShowManagement(false);
    startOAuth(store);
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-sidebar sticky top-0 z-10">
        <div className="w-full px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-lg font-bold text-accent flex items-center gap-1.5">
              <Zap className="w-5 h-5" />
              Publify
            </h1>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-display font-medium tracking-wide uppercase border-border text-muted-foreground">
              beta
            </Badge>
            {publishedCount > 0 && (
              <Badge variant="secondary" className="font-display text-xs">
                <Package className="w-3 h-3 mr-1" />
                {publishedCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowOnboarding(true)}
              title="Como funciona?"
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
            {stores.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowManagement(true)}
                title="Gerenciar lojas"
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Dialogs */}
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} onSaveAndConnect={handleCredentialsSubmit} />
      <OnboardingGuide
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onConfigureCredentials={() => { setShowOnboarding(false); setShowSettings(true); }}
      />
      <StoreManagementDialog
        open={showManagement}
        onOpenChange={setShowManagement}
        stores={stores}
        onRemove={removeStore}
        onReconnect={handleReconnect}
        onSetDefault={setDefault}
      />

      {/* ============ NOT CONNECTED ============ */}
      {!hasConnectedStore && (
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="glass-card p-12 text-center max-w-lg w-full animate-fade-in">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-8">
              <Zap className="w-10 h-10 text-primary" />
            </div>

            <h2 className="font-display text-3xl font-bold text-foreground mb-2">
              Conectar ao Shopify
            </h2>
            <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto leading-relaxed">
              Gerencie múltiplas lojas e publique produtos com um clique
            </p>

            <Button onClick={handleAddStore} size="lg" className="w-full font-display font-semibold text-base mb-6">
              <ExternalLink className="w-4 h-4 mr-2" />
              Conectar ao Shopify
            </Button>

            {/* Feature highlights */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-secondary/40">
                <span className="text-lg">⚡</span>
                <span className="text-xs text-muted-foreground font-medium">Publicação instantânea</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-secondary/40">
                <span className="text-lg">🏪</span>
                <span className="text-xs text-muted-foreground font-medium">Múltiplas lojas</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-secondary/40">
                <span className="text-lg">📦</span>
                <span className="text-xs text-muted-foreground font-medium">Produtos em rascunho</span>
              </div>
            </div>

            <button
              onClick={() => setShowOnboarding(true)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
            >
              Como funciona?
            </button>
          </div>
        </main>
      )}

      {/* ============ CONNECTED — DASHBOARD ============ */}
      {hasConnectedStore && (
        <div className="flex-1 flex">
          {/* Sidebar */}
          <DashboardSidebar
            stores={stores}
            activeStoreId={activeStore?.id || null}
            onSelectStore={setActiveStore}
            onAddStore={handleAddStore}
            currentView={currentView}
            onViewChange={setCurrentView}
          />

          {/* Mobile nav */}
          <div className="lg:hidden border-b border-border/50 w-full flex overflow-x-auto">
            {(['publish', 'history', 'stores', 'settings'] as DashboardView[]).map(view => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`flex-1 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors ${
                  currentView === view
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground'
                }`}
              >
                {view === 'publish' && '📦 Publicar'}
                {view === 'history' && '📋 Histórico'}
                {view === 'stores' && '🏪 Lojas'}
                {view === 'settings' && '⚙️ Config'}
              </button>
            ))}
          </div>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-8">

              {/* ---- PUBLISH VIEW ---- */}
              {currentView === 'publish' && !publishResult && (
                <div className="animate-fade-in">
                  <div className="mb-6">
                    <h2 className="font-display text-2xl font-bold text-foreground">Publicar Produto</h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      Publicando em <span className="text-primary font-medium">{activeStore?.domain}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Product details card */}
                    <div className="glass-card p-6">
                      <h3 className="font-display font-semibold text-foreground mb-5 text-sm uppercase tracking-wider text-muted-foreground">
                        Detalhes do Produto
                      </h3>
                      <div className="space-y-5">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Título *</Label>
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

                    {/* Image + Publish card */}
                    <div className="flex flex-col gap-6">
                      <div className="glass-card p-6">
                        <h3 className="font-display font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
                          Imagem do Produto
                        </h3>
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
                              className="w-full rounded-lg border border-border object-contain max-h-72"
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
                            className="w-full border-2 border-dashed border-border rounded-lg p-10 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-secondary/30 transition-all"
                          >
                            <Upload className="w-8 h-8 text-muted-foreground" />
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
                            Publicar em {activeStore?.domain}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ---- PUBLISH SUCCESS ---- */}
              {currentView === 'publish' && publishResult && (
                <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
                  <div className="glass-card p-10 text-center max-w-md w-full">
                    <CheckCircle2 className="w-16 h-16 mx-auto text-[hsl(var(--success))] mb-6" />
                    <h2 className="font-display text-2xl font-bold text-foreground mb-2">Produto Publicado!</h2>
                    <p className="text-muted-foreground text-sm mb-1">
                      <strong className="text-foreground">{publishResult.title}</strong> foi criado como rascunho em{' '}
                      <strong className="text-foreground">{activeStore?.domain}</strong>.
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

              {/* ---- HISTORY VIEW ---- */}
              {currentView === 'history' && (
                <div className="animate-fade-in">
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">Histórico</h2>
                  <p className="text-muted-foreground text-sm mb-6">Histórico de produtos publicados.</p>
                  <div className="glass-card p-10 text-center">
                    <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-sm">
                      {publishedCount > 0
                        ? `Você publicou ${publishedCount} produto${publishedCount !== 1 ? 's' : ''}.`
                        : 'Nenhum produto publicado ainda.'}
                    </p>
                  </div>
                </div>
              )}

              {/* ---- STORES VIEW ---- */}
              {currentView === 'stores' && (
                <div className="animate-fade-in">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-foreground">Lojas</h2>
                      <p className="text-muted-foreground text-sm mt-1">Gerencie suas lojas conectadas.</p>
                    </div>
                    <Button onClick={handleAddStore} size="sm" variant="secondary" className="font-display font-medium">
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Adicionar loja
                    </Button>
                  </div>

                  {stores.length === 0 ? (
                    <div className="glass-card p-10 text-center">
                      <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-sm">Nenhuma loja conectada.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {stores.map(store => (
                        <div key={store.id} className="glass-card p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                              store.connected ? 'bg-[hsl(var(--success))]' : 'bg-muted-foreground'
                            }`} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground truncate">{store.domain}</span>
                                {store.isDefault && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Padrão</Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {store.connected ? `Conectada em ${store.connectedAt}` : 'Desconectada'}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {!store.connected && (
                              <Button variant="ghost" size="sm" className="text-primary text-xs"
                                onClick={() => handleReconnect(store)}>
                                Reconectar
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="text-destructive text-xs"
                              onClick={() => { removeStore(store.id); toast.success('Loja removida.'); }}>
                              Remover
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ---- SETTINGS VIEW ---- */}
              {currentView === 'settings' && (
                <div className="animate-fade-in">
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">Configurações</h2>
                  <p className="text-muted-foreground text-sm mb-6">Preferências do aplicativo.</p>
                  <div className="glass-card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Versão</p>
                        <p className="text-xs text-muted-foreground">Publify Beta v0.1.0</p>
                      </div>
                    </div>
                    <div className="border-t border-border/50 pt-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Lojas conectadas</p>
                        <p className="text-xs text-muted-foreground">{stores.filter(s => s.connected).length} ativa{stores.filter(s => s.connected).length !== 1 ? 's' : ''}</p>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => setCurrentView('stores')} className="font-display text-xs">
                        Gerenciar
                      </Button>
                    </div>
                    <div className="border-t border-border/50 pt-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Produtos publicados</p>
                        <p className="text-xs text-muted-foreground">{publishedCount} produto{publishedCount !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>
      )}
    </div>
  );
};

export default Index;
