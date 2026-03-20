import { useState, useEffect, useCallback } from 'react';

export interface ShopifySettings {
  storeDomain: string;
  clientId: string;
  clientSecret: string;
  apiVersion: string;
  redirectUri: string;
}

export interface ShopifyAuthState {
  settings: ShopifySettings | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  publishedCount: number;
}

const SETTINGS_KEY = 'shopify_settings';
const TOKEN_KEY = 'shopify_access_token';
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
  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY)
  );
  const [publishedCount, setPublishedCount] = useState<number>(
    () => parseInt(localStorage.getItem(COUNT_KEY) || '0', 10)
  );

  const [isConnected, setIsConnected] = useState<boolean>(
    () => localStorage.getItem(CONNECTED_KEY) === 'true'
  );

  const isAuthenticated = !!accessToken && isConnected;
  const hasSettings = !!settings?.storeDomain && !!settings?.clientId && !!settings?.clientSecret;

  const saveSettings = useCallback((s: ShopifySettings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    setSettings(s);
  }, []);

  const saveToken = useCallback((token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(CONNECTED_KEY, 'true');
    setAccessToken(token);
    setIsConnected(true);
  }, []);

  const clearToken = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CONNECTED_KEY);
    setAccessToken(null);
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
    accessToken,
    isAuthenticated,
    hasSettings,
    publishedCount,
    saveSettings,
    saveToken,
    clearToken,
    startOAuth,
    incrementPublished,
  };
}
