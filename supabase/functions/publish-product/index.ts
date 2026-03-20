import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, price, sizes, collection, imageUrl } = await req.json();

    // Read Shopify credentials from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: conn, error: connError } = await supabase
      .from('shopify_connections')
      .select('store_domain, access_token')
      .eq('is_active', true)
      .maybeSingle();

    if (connError || !conn) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma loja Shopify conectada. Conecte sua loja primeiro.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SHOPIFY_STORE = conn.store_domain;
    const SHOPIFY_TOKEN = conn.access_token;

    // Build variants from sizes
    const variants = sizes.map((size: string) => ({
      option1: size,
      price: price.toString(),
      inventory_management: 'shopify',
    }));

    const productPayload = {
      product: {
        title,
        body_html: `<p>${description}</p>`,
        vendor: 'Fashion Publisher',
        product_type: collection,
        status: 'draft',
        options: [{ name: 'Tamanho', values: sizes }],
        variants,
        images: imageUrl ? [{ src: imageUrl }] : [],
      },
    };

    const shopifyUrl = `https://${SHOPIFY_STORE}/admin/api/2024-01/products.json`;
    const response = await fetch(shopifyUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productPayload),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Shopify error:', response.status, err);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar produto no Shopify', details: err }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const product = data.product;

    return new Response(
      JSON.stringify({
        productId: product.id.toString(),
        shopifyUrl: `https://${SHOPIFY_STORE}/admin/products/${product.id}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('publish-product error:', e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
