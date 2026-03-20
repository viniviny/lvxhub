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
    const body = await req.json();
    const { title, description, price, sizes, collection, imageBase64, imageName,
      countryCode, countryFlag, countryName, currency: bodyCurrency, currencySymbol,
      localPrice, baseCurrency, language: bodyLanguage, languageLabel, marketName, regionGroup, imageUrl: bodyImageUrl
    } = body;

    // Input validation
    if (!title || typeof title !== 'string' || title.length > 255) {
      return new Response(
        JSON.stringify({ error: 'Título inválido (máx. 255 caracteres).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user's active connection using service role (token never sent to frontend)
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: conn, error: connError } = await adminClient
      .from('shopify_connections')
      .select('store_domain, access_token')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (connError || !conn) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma loja conectada. Conecte sua loja primeiro.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiVersion = '2024-01';
    const baseUrl = `https://${conn.store_domain}/admin/api/${apiVersion}`;
    const accessToken = conn.access_token;

    // Upload image if provided
    let imageSrc: string | null = null;

    if (imageBase64 && imageName) {
      const stageRes = await fetch(`${baseUrl}/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
            stagedUploadsCreate(input: $input) {
              stagedTargets { url resourceUrl parameters { name value } }
              userErrors { field message }
            }
          }`,
          variables: {
            input: [{
              resource: "IMAGE",
              filename: imageName,
              mimeType: imageName.endsWith('.png') ? 'image/png' : imageName.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
              httpMethod: "PUT",
            }]
          }
        }),
      });

      if (stageRes.ok) {
        const stageData = await stageRes.json();
        const target = stageData?.data?.stagedUploadsCreate?.stagedTargets?.[0];

        if (target?.url) {
          const binaryStr = atob(imageBase64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const mimeType = imageName.endsWith('.png') ? 'image/png' : imageName.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
          await fetch(target.url, {
            method: 'PUT',
            headers: { 'Content-Type': mimeType },
            body: bytes,
          });
          imageSrc = target.resourceUrl;
        }
      }
    }

    // Strip HTML from description
    const cleanDescription = (description || '').replace(/<[^>]*>/g, '');

    const variants = (sizes && sizes.length > 0 ? sizes : ['Único']).map((size: string) => ({
      option1: size,
      price: (price || 0).toString(),
      inventory_management: 'shopify',
    }));

    const productPayload: Record<string, unknown> = {
      product: {
        title: title || 'Produto sem título',
        body_html: cleanDescription ? `<p>${cleanDescription}</p>` : '',
        vendor: 'Publify',
        product_type: collection || '',
        status: 'draft',
        options: [{ name: 'Tamanho', values: sizes && sizes.length > 0 ? sizes : ['Único'] }],
        variants,
        ...(imageSrc ? { images: [{ src: imageSrc }] } : imageBase64 ? {
          images: [{ attachment: imageBase64, filename: imageName || 'product-image.jpg' }]
        } : {}),
      },
    };

    const createRes = await fetch(`${baseUrl}/products.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productPayload),
    });

    if (!createRes.ok) {
      return new Response(
        JSON.stringify({ error: 'Erro ao criar produto no Shopify. Tente novamente.' }),
        { status: createRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const productData = await createRes.json();
    const product = productData.product;
    const shopifyProductUrl = `https://${conn.store_domain}/admin/products/${product.id}`;

    // Persist to published_products
    await adminClient.from('published_products').insert({
      user_id: userId,
      shopify_product_id: product.id.toString(),
      title: product.title,
      description: (description || '').replace(/<[^>]*>/g, ''),
      collection: collection || null,
      sizes: sizes || [],
      image_url: bodyImageUrl || imageSrc || null,
      store_domain: conn.store_domain,
      country_code: countryCode || null,
      country_flag: countryFlag || null,
      country_name: countryName || null,
      currency: bodyCurrency || null,
      currency_symbol: currencySymbol || null,
      local_price: localPrice || price || null,
      base_price: price || null,
      base_currency: baseCurrency || null,
      language: bodyLanguage || null,
      language_label: languageLabel || null,
      market_name: marketName || null,
      region_group: regionGroup || null,
      shopify_url: shopifyProductUrl,
    });

    return new Response(
      JSON.stringify({
        productId: product.id.toString(),
        title: product.title,
        shopifyUrl: shopifyProductUrl,
        status: product.status,
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
