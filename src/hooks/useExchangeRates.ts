// Exchange rate fetching with 1-hour cache

import { useState, useCallback, useEffect } from 'react';

interface RateCache {
  rates: Record<string, number>;
  base: string;
  timestamp: number;
}

const CACHE_KEY = 'publify_exchange_rates';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function loadCache(): RateCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: RateCache = JSON.parse(raw);
    if (Date.now() - cache.timestamp > CACHE_TTL) return null;
    return cache;
  } catch {
    return null;
  }
}

export function useExchangeRates(baseCurrency = 'USD') {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async (base: string) => {
    const cached = loadCache();
    if (cached && cached.base === base) {
      setRates(cached.rates);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Using free exchange rate API
      const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`);
      if (!res.ok) throw new Error('Falha ao buscar taxas de câmbio');
      const data = await res.json();
      const newRates = data.rates as Record<string, number>;
      setRates(newRates);
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        rates: newRates,
        base,
        timestamp: Date.now(),
      }));
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar câmbio');
      // Fallback: set 1:1 for base
      setRates({ [base]: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates(baseCurrency);
  }, [baseCurrency, fetchRates]);

  const convert = useCallback((amount: number, from: string, to: string): number => {
    if (from === to) return amount;
    const fromRate = rates[from] || 1;
    const toRate = rates[to] || 1;
    return (amount / fromRate) * toRate;
  }, [rates]);

  return { rates, loading, error, convert, refetch: () => fetchRates(baseCurrency) };
}
