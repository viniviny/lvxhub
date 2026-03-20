import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/hooks/useStoreContext';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

const STORES_KEY = 'publify_stores';

interface ConnectedStoreInfo {
  shopName: string;
  domain: string;
  flag?: string;
  countryName?: string;
  currency?: string;
}

const Callback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshStores } = useStoreContext();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [storeInfo, setStoreInfo] = useState<ConnectedStoreInfo | null>(null);

  useEffect(() => {
    const exchangeToken = async () => {
      const code = searchParams.get('code');
      const shop = searchParams.get('shop');

      if (!code) {
        setStatus('error');
        setErrorMsg('Código de autorização não encontrado na URL.');
        return;
      }

      try {
        const settingsRaw = localStorage.getItem('shopify_settings');
        if (!settingsRaw) {
          setStatus('error');
          setErrorMsg('Configurações não encontradas. Configure o app primeiro.');
          return;
        }

        const settings = JSON.parse(settingsRaw);
        const domain = shop || settings.storeDomain;

        // Step 1: Exchange code for token via edge function (token saved server-side)
        const { data, error } = await supabase.functions.invoke('shopify-exchange-token', {
          body: {
            code,
            shop: domain,
            clientId: settings.clientId,
            clientSecret: settings.clientSecret,
          },
        });

        if (error || data?.error) {
          throw new Error(data?.error || error?.message || 'Erro ao trocar token');
        }

        // Step 2: Build the store object for localStorage
        const marketConfig = settings.marketConfig || undefined;
        const pendingStoreId = localStorage.getItem('publify_pending_store');
        const storesRaw = localStorage.getItem(STORES_KEY);
        let stores = storesRaw ? JSON.parse(storesRaw) : [];

        const shopName = data.shopName || domain.replace('.myshopify.com', '');

        // Check if this store already exists (by pending ID or by domain)
        const existingIndex = stores.findIndex((s: any) =>
          s.id === pendingStoreId || s.domain === domain
        );

        if (existingIndex >= 0) {
          // Update existing store
          stores[existingIndex] = {
            ...stores[existingIndex],
            connected: true,
            connectedAt: new Date().toISOString().split('T')[0],
            accessToken: null, // Token is server-side only
            ...(marketConfig ? { marketConfig } : {}),
          };
        } else {
          // Create new store entry
          const newStore = {
            id: pendingStoreId || `store_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            domain,
            clientId: settings.clientId || '',
            clientSecret: '',
            apiVersion: settings.apiVersion || '2026-01',
            redirectUri: settings.redirectUri || `${window.location.origin}/callback`,
            accessToken: null,
            connected: true,
            connectedAt: new Date().toISOString().split('T')[0],
            isDefault: stores.length === 0,
            ...(marketConfig ? { marketConfig } : {}),
          };
          stores.push(newStore);
        }

        // Step 3: Save to localStorage
        localStorage.setItem(STORES_KEY, JSON.stringify(stores));

        // Set active store
        const connectedStore = stores.find((s: any) => s.domain === domain) || stores[stores.length - 1];
        localStorage.setItem('publify_active_store', connectedStore.id);
        localStorage.removeItem('publify_pending_store');

        // Step 4: Refresh global context so sidebar/dashboard re-render
        refreshStores();

        // Step 5: Show success with store info
        setStoreInfo({
          shopName,
          domain,
          flag: marketConfig?.countryFlag,
          countryName: marketConfig?.countryName,
          currency: marketConfig?.currency,
        });

        setStatus('success');

        // Step 6: Redirect after 2 seconds
        setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
      } catch (err: any) {
        console.error('Token exchange error:', err);
        setStatus('error');
        setErrorMsg(err.message || 'Erro ao conectar com Shopify.');
      }
    };

    exchangeToken();
  }, [searchParams, navigate, refreshStores]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="glass-card p-10 text-center max-w-md w-full">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground">Conectando ao Shopify...</h2>
            <p className="text-muted-foreground mt-2 text-sm">Trocando código por token de acesso.</p>
          </>
        )}
        {status === 'success' && (
          <div className="animate-scale-in">
            <div className="w-16 h-16 mx-auto rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-[hsl(var(--success))]" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">Loja conectada com sucesso!</h2>
            <p className="text-muted-foreground mt-2 text-[13px]">{storeInfo?.domain}</p>
            {storeInfo?.flag && (
              <p className="text-muted-foreground mt-1 text-sm flex items-center justify-center gap-1.5">
                <span className="text-lg">{storeInfo.flag}</span>
                <span>{storeInfo.countryName}</span>
                {storeInfo.currency && <span>· {storeInfo.currency}</span>}
              </p>
            )}
            <p className="text-muted-foreground mt-3 text-xs flex items-center justify-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Redirecionando...
            </p>
          </div>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground">Erro na conexão</h2>
            <p className="text-muted-foreground mt-2 text-sm">{errorMsg}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 text-primary underline text-sm"
            >
              Tentar novamente
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Callback;
