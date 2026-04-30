import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_VERSION = '2026-01';

async function shopifyFetch(url: string, init: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url, init);
    if (res.status !== 429) return res;
    const wait = Number(res.headers.get('Retry-After') || '2') * 1000;
    await new Promise(r => setTimeout(r, wait));
  }
  return fetch(url, init);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { products, origin, storeId } = await req.json();
    if (!products?.length || !origin || !storeId) {
      throw new Error('products, origin e storeId são obrigatórios.');
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: conn, error: connErr } = await admin
      .from('shopify_connections')
      .select('store_domain, access_token, shop_name, market_config')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    if (connErr || !conn) throw new Error('Loja Shopify não encontrada ou inativa.');

    const baseUrl = `https://${conn.store_domain}/admin/api/${API_VERSION}`;
    const headers = {
      'X-Shopify-Access-Token': conn.access_token,
      'Content-Type': 'application/json',
    };

    const mc: any = conn.market_config || {};
    const created: any[] = [];
    const errors: string[] = [];

    for (const item of products) {
      const raw = item.raw || item;
      try {
        const images = (raw.images || [])
          .map((img: any) => ({ src: img.src }))
          .filter((i: any) => i.src);

        const options = (raw.options || []).map((o: any) => ({ name: o.name }));

        const variants = (raw.variants || []).map((v: any) => ({
          option1: v.option1 || null,
          option2: v.option2 || null,
          option3: v.option3 || null,
          price: String(v.price || '0.00'),
          compare_at_price: v.compare_at_price ? String(v.compare_at_price) : null,
          sku: v.sku || '',
          inventory_management: 'shopify',
          inventory_policy: 'continue',
          requires_shipping: v.requires_shipping !== false,
          weight: v.weight || 0,
          weight_unit: v.weight_unit || 'kg',
        }));

        const payload = {
          product: {
            title: raw.title,
            body_html: raw.body_html || '',
            vendor: raw.vendor || conn.shop_name,
            product_type: raw.product_type || '',
            tags: Array.isArray(raw.tags) ? raw.tags.join(', ') : (raw.tags || ''),
            status: 'active',
            published: true,
            images,
            options: options.length ? options : undefined,
            variants: variants.length ? variants : undefined,
          },
        };

        const res = await shopifyFetch(`${baseUrl}/products.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Shopify ${res.status}: ${txt.slice(0, 200)}`);
        }

        const json = await res.json();
        const sp = json.product;
        const shopifyUrl = `https://${conn.store_domain}/products/${sp.handle}`;

        await admin.from('published_products').insert({
          user_id: user.id,
          store_domain: conn.store_domain,
          title: sp.title,
          description: raw.body_html || '',
          image_url: images[0]?.src || null,
          shopify_product_id: String(sp.id),
          shopify_url: shopifyUrl,
          base_price: parseFloat(raw.variants?.[0]?.price || '0') || 0,
          base_currency: 'USD',
          local_price: parseFloat(raw.variants?.[0]?.price || '0') || 0,
          currency: mc.currency || 'USD',
          currency_symbol: mc.currencySymbol || '$',
          country_code: mc.countryCode || null,
          country_name: mc.countryName || null,
          country_flag: mc.countryFlag || null,
          language: mc.language || null,
          language_label: mc.languageLabel || null,
          status: 'publicado',
          sizes: variants.map((v: any) => v.option1).filter(Boolean),
        });

        created.push({ id: sp.id, title: sp.title, url: shopifyUrl });
      } catch (err: any) {
        errors.push(`${raw.title || 'desconhecido'}: ${err.message}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      created: created.length,
      failed: errors.length,
      total: products.length,
      products: created,
      ...(errors.length > 0 && { errors }),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});