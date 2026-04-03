import { useState, useCallback } from 'react';

export interface MarketConfig {
  countryCode: string;
  countryFlag: string;
  countryName: string;
  currency: string;
  currencySymbol: string;
  currencyPosition: 'before' | 'after';
  language: string; // AI language code like 'en-US', 'pt-BR'
  decimalSeparator: string;
  thousandSeparator: string;
  marketName: string; // custom label
}

export interface ShopifyStore {
  id: string;
  domain: string;
  clientId: string;
  clientSecret: string;
  apiVersion: string;
  redirectUri: string;
  accessToken: string | null;
  connected: boolean;
  connectedAt: string | null;
  isDefault: boolean;
  marketConfig?: MarketConfig;
  logoUrl?: string | null;
}

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
  } catch {
    return [];
  }
}

function loadActiveStoreId(): string | null {
  return localStorage.getItem(ACTIVE_STORE_KEY);
}

function persistStores(stores: ShopifyStore[]) {
  localStorage.setItem(STORES_KEY, JSON.stringify(stores));
}

export function useStoreManager() {
  const [stores, setStores] = useState<ShopifyStore[]>(loadStores);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(loadActiveStoreId);
  const [publishedCount, setPublishedCount] = useState<number>(
    () => parseInt(localStorage.getItem(PUBLISHED_KEY) || '0', 10)
  );

  const activeStore = stores.find(s => s.id === activeStoreId) || stores.find(s => s.connected) || null;
  const hasConnectedStore = stores.some(s => s.connected);

  const setActiveStore = useCallback((id: string) => {
    setActiveStoreId(id);
    localStorage.setItem(ACTIVE_STORE_KEY, id);
  }, []);

  const addStore = useCallback((storeData: {
    domain: string;
    clientId: string;
    clientSecret: string;
    apiVersion: string;
    redirectUri: string;
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
      const isFirst = prev.length === 0;
      if (isFirst) newStore.isDefault = true;
      const updated = [...prev, newStore];
      persistStores(updated);
      return updated;
    });

    setActiveStore(newStore.id);
    return newStore;
  }, [setActiveStore]);

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
    setActiveStore(storeId);
  }, [setActiveStore]);

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
    setActiveStore(storeId);
  }, [setActiveStore]);

  const disconnectStore = useCallback((storeId: string) => {
    setStores(prev => {
      const updated = prev.map(s =>
        s.id === storeId
          ? { ...s, accessToken: null, connected: false, connectedAt: null }
          : s
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
      return updated;
    });
    if (activeStoreId === storeId) {
      const remaining = stores.filter(s => s.id !== storeId);
      const newActive = remaining.find(s => s.connected) || remaining[0] || null;
      if (newActive) {
        setActiveStore(newActive.id);
      } else {
        setActiveStoreId(null);
        localStorage.removeItem(ACTIVE_STORE_KEY);
      }
    }
  }, [activeStoreId, stores, setActiveStore]);

  const setDefault = useCallback((storeId: string) => {
    setStores(prev => {
      const updated = prev.map(s => ({ ...s, isDefault: s.id === storeId }));
      persistStores(updated);
      return updated;
    });
  }, []);

  const updateStoreMarket = useCallback((storeId: string, marketConfig: MarketConfig) => {
    setStores(prev => {
      const updated = prev.map(s =>
        s.id === storeId ? { ...s, marketConfig } : s
      );
      persistStores(updated);
      return updated;
    });
  }, []);

  const updateStoreLogo = useCallback((storeId: string, logoUrl: string | null) => {
    setStores(prev => {
      const updated = prev.map(s =>
        s.id === storeId ? { ...s, logoUrl } : s
      );
      persistStores(updated);
      return updated;
    });
  }, []);

  const startOAuth = useCallback((store: ShopifyStore) => {
    // Save pending store id so callback knows which store to connect
    localStorage.setItem('publify_pending_store', store.id);
    // Also save settings in old format for callback compatibility
    localStorage.setItem('shopify_settings', JSON.stringify({
      storeDomain: store.domain,
      clientId: store.clientId,
      clientSecret: store.clientSecret,
      apiVersion: store.apiVersion,
      redirectUri: store.redirectUri,
    }));

    const scopes = 'write_products,read_products,write_files,read_files';
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

  return {
    stores,
    activeStore,
    activeStoreId,
    hasConnectedStore,
    publishedCount,
    setActiveStore,
    addStore,
    connectStore,
    connectStoreWithMarket,
    disconnectStore,
    removeStore,
    setDefault,
    updateStoreMarket,
    startOAuth,
    incrementPublished,
  };
}
