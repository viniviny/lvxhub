import { useState, useCallback } from 'react';

interface ShopifyConnection {
  shopName: string;
  storeDomain: string;
}

export function useShopifyConnection() {
  const [connection, setConnection] = useState<ShopifyConnection | null>(() => {
    const saved = localStorage.getItem('shopify_connection');
    return saved ? JSON.parse(saved) : null;
  });

  const connect = useCallback((shopName: string, storeDomain: string) => {
    const conn = { shopName, storeDomain };
    setConnection(conn);
    localStorage.setItem('shopify_connection', JSON.stringify(conn));
  }, []);

  const disconnect = useCallback(() => {
    setConnection(null);
    localStorage.removeItem('shopify_connection');
  }, []);

  return { connection, connect, disconnect, isConnected: !!connection };
}
