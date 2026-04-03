import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MarketConfig, ShopifyStore } from '@/hooks/useStoreManager';

interface StoreContextType {
  stores: ShopifyStore[];
  activeStore: ShopifyStore | null;
  activeStoreId: string | null;
  hasConnectedStore: boolean;
  publishedCount: number;
  isLoading: boolean;
  setActiveStore: (id: string) => void;
  addStore: (data: { domain: string; clientId: string; clientSecret: string; apiVersion: string; redirectUri: string }) => ShopifyStore;
  connectStoreWithMarket: (storeId: string, accessToken: string, marketConfig?: MarketConfig) => void;
  connectStore: (storeId: string, accessToken: string) => void;
  disconnectStore: (storeId: string) => void;
  removeStore: (storeId: string) => void;
  setDefault: (storeId: string) => void;
  updateStoreMarket: (storeId: string, marketConfig: MarketConfig) => void;
  updateStoreLogo: (storeId: string, logoUrl: string | null) => void;
  startOAuth: (store: ShopifyStore) => void;
  incrementPublished: () => void;
  refreshStores: () => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

const STORES_KEY = 'publify_stores';
const ACTIVE_STORE_KEY = 'publify_active_store';
const PUBLISHED_KEY = 'shopify_published_count';

function generateId(): string {
  return `store_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadStores(): ShopifyStore[] {
  try {
    const raw = localStorage.getItem(STORES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persistStores(stores: ShopifyStore[]) {
  localStorage.setItem(STORES_KEY, JSON.stringify(stores));
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<ShopifyStore[]>(loadStores);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_STORE_KEY)
  );
  const [publishedCount, setPublishedCount] = useState<number>(
    () => parseInt(localStorage.getItem(PUBLISHED_KEY) || '0', 10)
  );
  const [isLoading, setIsLoading] = useState(true);

  const activeStore = stores.find(s => s.id === activeStoreId) || stores.find(s => s.connected) || null;
  const hasConnectedStore = stores.some(s => s.connected);

  // Sync with Supabase on mount — load connections from DB
  useEffect(() => {
    const syncFromDb = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session) { setIsLoading(false); return; }

        const { data: connections } = await supabase
          .from('shopify_connections')
          .select('id, shop_name, store_domain, is_active')
          .eq('is_active', true);

        if (connections && connections.length > 0) {
          const localStores = loadStores();
          let updated = false;

          for (const conn of connections) {
            const exists = localStores.some(
              s => s.domain === conn.store_domain && s.connected
            );
            if (!exists) {
              // Add store from DB that's missing locally
              const settingsRaw = localStorage.getItem('shopify_settings');
              const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
              const marketConfig = settings.marketConfig || undefined;

              const newStore: ShopifyStore = {
                id: generateId(),
                domain: conn.store_domain,
                clientId: settings.clientId || '',
                clientSecret: '',
                apiVersion: settings.apiVersion || '2026-01',
                redirectUri: settings.redirectUri || `${window.location.origin}/callback`,
                accessToken: null, // Never store token client-side
                connected: true,
                connectedAt: new Date().toISOString().split('T')[0],
                isDefault: localStores.length === 0,
                ...(marketConfig ? { marketConfig } : {}),
              };
              localStores.push(newStore);
              updated = true;
            }
          }

          if (updated) {
            persistStores(localStores);
            setStores(localStores);
            if (!localStorage.getItem(ACTIVE_STORE_KEY) && localStores.length > 0) {
              const connected = localStores.find(s => s.connected);
              if (connected) {
                localStorage.setItem(ACTIVE_STORE_KEY, connected.id);
                setActiveStoreId(connected.id);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error syncing stores from DB:', err);
      } finally {
        setIsLoading(false);
      }
    };

    syncFromDb();
  }, []);

  const refreshStores = useCallback(() => {
    const loaded = loadStores();
    setStores(loaded);
    const activeId = localStorage.getItem(ACTIVE_STORE_KEY);
    setActiveStoreId(activeId);
  }, []);

  const setActiveStoreAction = useCallback((id: string) => {
    setActiveStoreId(id);
    localStorage.setItem(ACTIVE_STORE_KEY, id);
  }, []);

  const addStore = useCallback((storeData: {
    domain: string; clientId: string; clientSecret: string; apiVersion: string; redirectUri: string;
  }): ShopifyStore => {
    const newStore: ShopifyStore = {
      id: generateId(),
      ...storeData,
      accessToken: null,
      connected: false,
      connectedAt: null,
      isDefault: false,
    };
    setStores(prev => {
      if (prev.length === 0) newStore.isDefault = true;
      const updated = [...prev, newStore];
      persistStores(updated);
      return updated;
    });
    setActiveStoreAction(newStore.id);
    return newStore;
  }, [setActiveStoreAction]);

  const connectStoreWithMarket = useCallback((storeId: string, accessToken: string, marketConfig?: MarketConfig) => {
    setStores(prev => {
      const updated = prev.map(s =>
        s.id === storeId
          ? { ...s, accessToken, connected: true, connectedAt: new Date().toISOString().split('T')[0], ...(marketConfig ? { marketConfig } : {}) }
          : s
      );
      persistStores(updated);
      return updated;
    });
    setActiveStoreAction(storeId);
  }, [setActiveStoreAction]);

  const connectStore = useCallback((storeId: string, accessToken: string) => {
    setStores(prev => {
      const updated = prev.map(s =>
        s.id === storeId
          ? { ...s, accessToken, connected: true, connectedAt: new Date().toISOString().split('T')[0] }
          : s
      );
      persistStores(updated);
      return updated;
    });
    setActiveStoreAction(storeId);
  }, [setActiveStoreAction]);

  const disconnectStore = useCallback((storeId: string) => {
    setStores(prev => {
      const updated = prev.map(s =>
        s.id === storeId ? { ...s, accessToken: null, connected: false, connectedAt: null } : s
      );
      persistStores(updated);
      return updated;
    });
  }, []);

  const removeStore = useCallback((storeId: string) => {
    setStores(prev => {
      const updated = prev.filter(s => s.id !== storeId);
      if (updated.length > 0 && !updated.some(s => s.isDefault)) {
        updated[0].isDefault = true;
      }
      persistStores(updated);
      if (activeStoreId === storeId) {
        const next = updated.find(s => s.connected) || updated[0] || null;
        if (next) {
          setActiveStoreId(next.id);
          localStorage.setItem(ACTIVE_STORE_KEY, next.id);
        } else {
          setActiveStoreId(null);
          localStorage.removeItem(ACTIVE_STORE_KEY);
        }
      }
      return updated;
    });
  }, [activeStoreId]);

  const setDefault = useCallback((storeId: string) => {
    setStores(prev => {
      const updated = prev.map(s => ({ ...s, isDefault: s.id === storeId }));
      persistStores(updated);
      return updated;
    });
  }, []);

  const updateStoreMarket = useCallback((storeId: string, marketConfig: MarketConfig) => {
    setStores(prev => {
      const updated = prev.map(s => s.id === storeId ? { ...s, marketConfig } : s);
      persistStores(updated);
      return updated;
    });
  }, []);

  const startOAuth = useCallback((store: ShopifyStore) => {
    localStorage.setItem('publify_pending_store', store.id);
    localStorage.setItem('shopify_settings', JSON.stringify({
      storeDomain: store.domain,
      clientId: store.clientId,
      clientSecret: store.clientSecret,
      apiVersion: store.apiVersion,
      redirectUri: store.redirectUri,
    }));
    const scopes = 'write_products,read_products,write_files,read_files,read_inventory,write_inventory,read_locations,read_publications,write_publications,write_metafields,read_themes';
    const url = `https://${store.domain}/admin/oauth/authorize?client_id=${store.clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(store.redirectUri)}`;
    window.location.href = url;
  }, []);

  const incrementPublished = useCallback(() => {
    setPublishedCount(prev => {
      const next = prev + 1;
      localStorage.setItem(PUBLISHED_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <StoreContext.Provider value={{
      stores, activeStore, activeStoreId, hasConnectedStore, publishedCount, isLoading,
      setActiveStore: setActiveStoreAction, addStore, connectStore, connectStoreWithMarket,
      disconnectStore, removeStore, setDefault, updateStoreMarket, startOAuth,
      incrementPublished, refreshStores,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStoreContext() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStoreContext must be used within StoreProvider');
  return ctx;
}
