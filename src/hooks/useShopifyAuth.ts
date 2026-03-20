import { useState, useCallback } from 'react';

export interface ShopifySettings {
  storeDomain: string;
  clientId: string;
  apiVersion: string;
  redirectUri: string;
}

export interface ShopifyAuthState {
  settings: ShopifySettings | null;
  isAuthenticated: boolean;
  publishedCount: number;
}

const SETTINGS_KEY = 'shopify_settings_safe';
const CONNECTED_KEY = 'shopify_connected';
const COUNT_KEY = 'shopify_published_count';

function loadSettings(): ShopifySettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function useShopifyAuth() {
  const [settings, setSettings] = useState<ShopifySettings | null>(loadSettings);
  const [publishedCount, setPublishedCount] = useState<number>(
    () => parseInt(localStorage.getItem(COUNT_KEY) || '0', 10)
  );
  const [isConnected, setIsConnected] = useState<boolean>(
    () => localStorage.getItem(CONNECTED_KEY) === 'true'
  );

  const isAuthenticated = isConnected;
  const hasSettings = !!settings?.storeDomain && !!settings?.clientId;

  const saveSettings = useCallback((s: ShopifySettings) => {
    // Never store client_secret or access_token in localStorage
    const safeSettings: ShopifySettings = {
      storeDomain: s.storeDomain,
      clientId: s.clientId,
      apiVersion: s.apiVersion,
      redirectUri: s.redirectUri,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(safeSettings));
    setSettings(safeSettings);
  }, []);

  const markConnected = useCallback(() => {
    localStorage.setItem(CONNECTED_KEY, 'true');
    setIsConnected(true);
  }, []);

  const clearConnection = useCallback(() => {
    localStorage.removeItem(CONNECTED_KEY);
    setIsConnected(false);
  }, []);

  const incrementPublished = useCallback(() => {
    setPublishedCount(prev => {
      const next = prev + 1;
      localStorage.setItem(COUNT_KEY, String(next));
      return next;
    });
  }, []);

  const startOAuth = useCallback(() => {
    if (!settings) return;
    const { storeDomain, clientId, redirectUri } = settings;
    const scopes = 'write_products,read_products,write_files,read_files';
    const url = `https://${storeDomain}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = url;
  }, [settings]);

  return {
    settings,
    accessToken: null, // Token is never exposed to frontend
    isAuthenticated,
    hasSettings,
    publishedCount,
    saveSettings,
    saveToken: markConnected, // Kept for API compat but only marks connected
    clearToken: clearConnection,
    startOAuth,
    incrementPublished,
  };
}
