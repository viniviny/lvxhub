import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ShopifyConnection {
  id: string;
  shopName: string;
  storeDomain: string;
}

export function useShopifyConnection() {
  const [connection, setConnection] = useState<ShopifyConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch active connection on mount
  useEffect(() => {
    const fetchConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('shopify_connections')
          .select('id, shop_name, store_domain')
          .eq('is_active', true)
          .maybeSingle();

        if (!error && data) {
          setConnection({
            id: data.id,
            shopName: data.shop_name,
            storeDomain: data.store_domain,
          });
        }
      } catch (err) {
        console.error('Error fetching shopify connection:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnection();
  }, []);

  const connect = useCallback((shopName: string, storeDomain: string) => {
    // The edge function already saved to DB, just update local state
    setConnection({ id: crypto.randomUUID(), shopName, storeDomain });
  }, []);

  const disconnect = useCallback(async () => {
    if (!connection) return;
    try {
      await supabase
        .from('shopify_connections')
        .update({ is_active: false } as any)
        .eq('is_active', true);
      setConnection(null);
    } catch (err) {
      console.error('Error disconnecting:', err);
    }
  }, [connection]);

  return { connection, connect, disconnect, isConnected: !!connection, isLoading };
}
