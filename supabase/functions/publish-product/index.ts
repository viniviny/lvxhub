import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const SHOPIFY_STORE = Deno.env.get('SHOPIFY_STORE');
    const SHOPIFY_TOKEN = Deno.env.get('SHOPIFY_TOKEN');

    if (!SHOPIFY_STORE || !SHOPIFY_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Credenciais Shopify não configuradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
