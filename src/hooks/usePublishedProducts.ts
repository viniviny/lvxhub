import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PublishedProduct {
  id: string;
  shopify_product_id: string | null;
  title: string;
  description: string | null;
  collection: string | null;
  sizes: string[];
  image_url: string | null;
  store_domain: string;
  country_code: string | null;
  country_flag: string | null;
  country_name: string | null;
  currency: string | null;
  currency_symbol: string | null;
  local_price: number | null;
  base_price: number | null;
  base_currency: string | null;
  language: string | null;
  language_label: string | null;
  market_name: string | null;
  region_group: string | null;
  shopify_url: string | null;
  status: string;
  created_at: string;
}

export interface HistoryFilters {
  countryCode?: string;
  regionGroup?: string;
  currency?: string;
  language?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function usePublishedProducts() {
  const [products, setProducts] = useState<PublishedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<HistoryFilters>({});

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('published_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.countryCode) query = query.eq('country_code', filters.countryCode);
      if (filters.regionGroup) query = query.eq('region_group', filters.regionGroup);
      if (filters.currency) query = query.eq('currency', filters.currency);
      if (filters.language) query = query.eq('language', filters.language);
      if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
      if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

      const { data, error } = await query;
      if (error) throw error;
      setProducts((data as PublishedProduct[]) || []);
    } catch (err) {
      console.error('Error fetching published products:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, filters, setFilters, refetch: fetchProducts };
}
