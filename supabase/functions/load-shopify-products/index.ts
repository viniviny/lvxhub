import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UA = 'Mozilla/5.0 (compatible; Publify/1.0)';
const TIMEOUT_MS = 15000;

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: 'US$', BRL: 'R$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$',
  JPY: '¥', MXN: 'MX$', ARS: 'AR$', CLP: 'CL$', COP: 'CO$', PEN: 'S/',
  CHF: 'CHF', SEK: 'kr', NOK: 'kr', DKK: 'kr', PLN: 'zł', INR: '₹', CNY: '¥',
};

function currencyFromHost(host: string): string {
  const h = host.toLowerCase();
  if (h.endsWith('.com.br') || h.endsWith('.br')) return 'BRL';
  if (h.endsWith('.co.uk') || h.endsWith('.uk')) return 'GBP';
  if (h.endsWith('.de') || h.endsWith('.fr') || h.endsWith('.es') || h.endsWith('.it') || h.endsWith('.pt') || h.endsWith('.eu')) return 'EUR';
  if (h.endsWith('.ca')) return 'CAD';
  if (h.endsWith('.au') || h.endsWith('.com.au')) return 'AUD';
  if (h.endsWith('.jp') || h.endsWith('.co.jp')) return 'JPY';
  if (h.endsWith('.mx') || h.endsWith('.com.mx')) return 'MXN';
  return 'USD';
}

async function fetchJSONWithRetry(url: string, retries = 2): Promise<any> {
  let lastErr: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
      clearTimeout(timer);
      if (res.status === 404) {
        const e: any = new Error('NOT_FOUND'); e.code = 404; throw e;
      }
      if (res.status === 403 || res.status === 401) {
        const e: any = new Error('BLOCKED'); e.code = res.status; throw e;
      }
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        const e: any = new Error('UPSTREAM'); e.code = res.status; throw e;
      }
      if (!res.ok) {
        const e: any = new Error(`HTTP ${res.status}`); e.code = res.status; throw e;
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) {
        const e: any = new Error('NOT_SHOPIFY'); throw e;
      }
      return await res.json();
    } catch (err: any) {
      clearTimeout(timer);
      lastErr = err;
      if (err.name === 'AbortError') {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        const e: any = new Error('TIMEOUT'); throw e;
      }
      if (err.code === 404 || err.message === 'NOT_SHOPIFY' || err.code === 403 || err.code === 401) throw err;
      if (attempt >= retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

function friendlyError(err: any): string {
  if (err?.message === 'TIMEOUT') return 'A loja demorou demais para responder (timeout).';
  if (err?.message === 'BLOCKED' || err?.code === 403 || err?.code === 401) return 'Esta loja bloqueia importação pública (.json desabilitado).';
  if (err?.message === 'NOT_SHOPIFY') return 'Esta URL não parece ser uma loja Shopify válida.';
  if (err?.code === 404) return 'Produto ou coleção não encontrado.';
  if (err?.code >= 500) return 'A loja de origem está com erro no servidor.';
  return err?.message || 'Erro desconhecido ao carregar produtos.';
}

function detectCurrency(p: any, hostFallback: string): string {
  const presentment = p?.variants?.[0]?.presentment_prices?.[0]?.price?.currency_code;
  if (presentment) return presentment;
  return currencyFromHost(hostFallback);
}

function priceRange(p: any): { min: string; max: string; single: boolean } {
  const prices = (p.variants || [])
    .map((v: any) => parseFloat(v.price || '0'))
    .filter((n: number) => !isNaN(n) && n > 0);
  if (prices.length === 0) return { min: '0.00', max: '0.00', single: true };
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min: min.toFixed(2), max: max.toFixed(2), single: min === max };
}

function mapProduct(p: any, host: string) {
  const currency = detectCurrency(p, host);
  const symbol = CURRENCY_SYMBOLS[currency] || currency + ' ';
  const range = priceRange(p);
  return {
    handle: p.handle,
    title: p.title,
    image: p.images?.[0]?.src || p.image?.src || null,
    price: range.min,
    priceMax: range.max,
    priceSingle: range.single,
    currency,
    currencySymbol: symbol,
    imagesCount: p.images?.length || 0,
    variantsCount: p.variants?.length || 0,
    vendor: p.vendor || '',
    productType: p.product_type || '',
    raw: p,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url) throw new Error('url é obrigatório');

    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new Error('URL inválida'); }

    const origin = parsed.origin;
    const host = parsed.hostname;
    const pathname = parsed.pathname.replace(/\/$/, '');

    const productMatch = pathname.match(/^\/products\/([^/]+)$/);
    if (productMatch) {
      const handle = productMatch[1];
      const data = await fetchJSONWithRetry(`${origin}/products/${handle}.json`);
      const product = data.product;
      if (!product) throw new Error('Produto não encontrado');
      return new Response(JSON.stringify({
        success: true,
        type: 'product',
        origin,
        title: product.title,
        total: 1,
        products: [mapProduct(product, host)],
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const isCollection = pathname.match(/^\/collections\/([^/]+)$/);
    const basePath = isCollection ? pathname : '';
    const collectionTitle = isCollection ? isCollection[1].replace(/-/g, ' ') : parsed.hostname;

    const products: any[] = [];
    const MAX_PAGES = 8; // 2000 produtos máx
    for (let page = 1; page <= MAX_PAGES; page++) {
      const data = await fetchJSONWithRetry(`${origin}${basePath}/products.json?limit=250&page=${page}`);
      const batch: any[] = data.products || [];
      if (batch.length === 0) break;
      products.push(...batch);
      if (batch.length < 250) break;
    }

    return new Response(JSON.stringify({
      success: true,
      type: isCollection ? 'collection' : 'store',
      origin,
      title: collectionTitle,
      total: products.length,
      products: products.map(p => mapProduct(p, host)),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: friendlyError(err) }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
