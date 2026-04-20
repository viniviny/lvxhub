import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
      authHeader.replace('Bearer ', '')
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Sessão inválida. Faça login novamente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    const { title, description, price, sizes, collection, imageUrl, imageBase64, imageName, vendor: bodyVendor } = await req.json();

    // Input validation
    if (!title || typeof title !== 'string' || title.length > 255) {
      return new Response(
        JSON.stringify({ error: 'Título inválido (máx. 255 caracteres).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      return new Response(
        JSON.stringify({ error: 'Preço inválido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user's active connection using service role
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: conn, error: connError } = await adminClient
      .from('shopify_connections')
      .select('store_domain, access_token, shop_name')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (connError || !conn) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma loja Shopify conectada. Conecte sua loja primeiro.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Strip HTML from description
    const cleanDescription = (description || '').replace(/<[^>]*>/g, '');

    // Vendor: prefer client-provided value, fall back to the store name.
    const vendor = (typeof bodyVendor === 'string' && bodyVendor.trim()) || conn.shop_name || conn.store_domain;

    const variants = (sizes && sizes.length > 0 ? sizes : ['Único']).map((size: string) => ({
      option1: size,
      price: (price || 0).toString(),
      inventory_management: 'shopify',
    }));

    // Image handling: prefer base64 (durable upload, AliExpress URLs may expire), fallback to src URL.
    const productImages: any[] = [];
    if (imageBase64) {
      productImages.push({
        attachment: imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
        filename: imageName || 'product.jpg',
      });
    } else if (imageUrl) {
      productImages.push({ src: imageUrl });
    }

    const productPayload = {
      product: {
        title,
        body_html: cleanDescription ? `<p>${cleanDescription}</p>` : '',
        vendor,
        product_type: collection || '',
        status: 'draft',
        options: [{ name: 'Tamanho', values: sizes && sizes.length > 0 ? sizes : ['Único'] }],
        variants,
        images: productImages,
      },
    };

    const shopifyUrl = `https://${conn.store_domain}/admin/api/2024-01/products.json`;
    const response = await fetch(shopifyUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': conn.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productPayload),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Erro ao criar produto no Shopify. Tente novamente.' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const product = data.product;

    return new Response(
      JSON.stringify({
        productId: product.id.toString(),
        shopifyUrl: `https://${conn.store_domain}/admin/products/${product.id}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Erro interno. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
