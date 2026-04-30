import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UA = 'Mozilla/5.0 (compatible; Publify/1.0)';

async function fetchJSON(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar ${url}`);
  return res.json();
}

function mapProduct(p: any) {
  return {
    handle: p.handle,
    title: p.title,
    image: p.images?.[0]?.src || p.image?.src || null,
    price: p.variants?.[0]?.price || '0.00',
    imagesCount: p.images?.length || 0,
    variantsCount: p.variants?.length || 0,
    vendor: p.vendor || '',
    productType: p.product_type || '',
    raw: p,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) throw new Error('url é obrigatório');

    const parsed = new URL(url);
    const origin = parsed.origin;
    const pathname = parsed.pathname.replace(/\/$/, '');

    // Produto único: /products/{handle}
    const productMatch = pathname.match(/^\/products\/([^/]+)$/);
    if (productMatch) {
      const handle = productMatch[1];
      const data = await fetchJSON(`${origin}/products/${handle}.json`);
      const product = data.product;
      if (!product) throw new Error('Produto não encontrado');
      return new Response(JSON.stringify({
        success: true,
        type: 'product',
        origin,
        title: product.title,
        total: 1,
        products: [mapProduct(product)],
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Coleção ou domínio raiz
    const isCollection = pathname.match(/^\/collections\/([^/]+)$/);
    const basePath = isCollection ? pathname : '';
    const collectionTitle = isCollection ? isCollection[1].replace(/-/g, ' ') : parsed.hostname;

    const products: any[] = [];
    for (let page = 1; page <= 4; page++) {
      const data = await fetchJSON(`${origin}${basePath}/products.json?limit=250&page=${page}`);
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
      products: products.map(mapProduct),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
