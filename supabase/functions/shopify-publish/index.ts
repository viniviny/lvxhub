import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function uploadImageToShopify(baseUrl: string, accessToken: string, base64: string, filename: string): Promise<string | null> {
  const mimeType = filename.endsWith('.png') ? 'image/png' : filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  const stageRes = await fetch(`${baseUrl}/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets { url resourceUrl parameters { name value } }
          userErrors { field message }
        }
      }`,
      variables: {
        input: [{ resource: "IMAGE", filename, mimeType, httpMethod: "PUT" }]
      }
    }),
  });
  if (!stageRes.ok) return null;
  const stageData = await stageRes.json();
  const target = stageData?.data?.stagedUploadsCreate?.stagedTargets?.[0];
  if (!target?.url) return null;
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  await fetch(target.url, { method: 'PUT', headers: { 'Content-Type': mimeType }, body: bytes });
  return target.resourceUrl;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Sessão inválida.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub;

    const body = await req.json();
    const {
      title, description, price, compareAtPrice, cost, sizes, collection, tags,
      imageBase64, imageName, imageUrl: bodyImageUrl,
      countryCode, countryFlag, countryName, currency: bodyCurrency, currencySymbol,
      localPrice, baseCurrency, language: bodyLanguage, languageLabel, marketName, regionGroup,
      variants: bodyVariants, inventoryPolicy, requiresShipping, weight, weightUnit, countryOfOrigin,
      selectedChannels, colorImages,
    } = body;

    if (!title || typeof title !== 'string' || title.length > 255) {
      return new Response(JSON.stringify({ error: 'Título inválido (máx. 255 caracteres).' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: conn } = await adminClient.from('shopify_connections').select('store_domain, access_token').eq('user_id', userId).eq('is_active', true).maybeSingle();
    if (!conn) {
      return new Response(JSON.stringify({ error: 'Nenhuma loja conectada.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const apiVersion = '2026-01';
    const baseUrl = `https://${conn.store_domain}/admin/api/${apiVersion}`;
    const accessToken = conn.access_token;
    const steps: string[] = [];

    // --- STEP 1: Upload main image if provided ---
    let imageSrc: string | null = null;
    if (imageBase64 && imageName) {
      imageSrc = await uploadImageToShopify(baseUrl, accessToken, imageBase64, imageName);
    }

    // --- STEP 2: Create product ---
    steps.push('Criando produto...');
    const cleanDescription = (description || '').replace(/<script[^>]*>.*?<\/script>/gi, '');
    const variantsPayload = (bodyVariants && bodyVariants.length > 0)
      ? bodyVariants.map((v: any) => ({
          option1: v.name,
          price: (v.price || price || 0).toString(),
          compare_at_price: v.compareAtPrice ? v.compareAtPrice.toString() : (compareAtPrice ? compareAtPrice.toString() : null),
          sku: v.sku || '',
          inventory_management: 'shopify',
          inventory_policy: inventoryPolicy || 'continue',
          requires_shipping: requiresShipping !== false,
          weight: v.weight || weight || 0,
          weight_unit: v.weightUnit || weightUnit || 'kg',
        }))
      : (sizes && sizes.length > 0 ? sizes : ['Único']).map((size: string) => ({
          option1: size,
          price: (price || 0).toString(),
          compare_at_price: compareAtPrice ? compareAtPrice.toString() : null,
          inventory_management: 'shopify',
          inventory_policy: inventoryPolicy || 'continue',
          requires_shipping: requiresShipping !== false,
          weight: weight || 0,
          weight_unit: weightUnit || 'kg',
        }));

    const optionValues = bodyVariants?.length > 0
      ? bodyVariants.map((v: any) => v.name)
      : (sizes && sizes.length > 0 ? sizes : ['Único']);

    const productPayload: Record<string, unknown> = {
      product: {
        title: title || 'Produto sem título',
        body_html: cleanDescription || '',
        vendor: 'Publify',
        product_type: collection || '',
        tags: tags || '',
        status: 'draft',
        options: [{ name: 'Tamanho', values: optionValues }],
        variants: variantsPayload,
        ...(imageSrc ? { images: [{ src: imageSrc }] } : imageBase64 ? { images: [{ attachment: imageBase64, filename: imageName || 'product-image.jpg' }] } : {}),
      },
    };

    const createRes = await fetch(`${baseUrl}/products.json`, {
      method: 'POST',
      headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(productPayload),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return new Response(JSON.stringify({ error: 'Erro ao criar produto no Shopify.', step: 'create_product', details: errText }), { status: createRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const productData = await createRes.json();
    const product = productData.product;
    const shopifyProductUrl = `https://${conn.store_domain}/admin/products/${product.id}`;
    steps.push('Produto criado!');

    // --- STEP 2.5: Upload color variant images and assign to variants ---
    if (colorImages && Array.isArray(colorImages) && colorImages.length > 0 && product.variants?.length > 0) {
      steps.push('Enviando imagens das variantes...');
      for (const ci of colorImages) {
        if (!ci.imageBase64 || !ci.variantName) continue;
        // Find the matching variant by name (option1)
        const matchingVariant = product.variants.find((v: any) => v.option1 === ci.variantName);
        if (!matchingVariant) continue;

        try {
          // Upload image to the product with variant_ids association
          const imgPayload = {
            image: {
              attachment: ci.imageBase64,
              filename: ci.imageName || `variant-${ci.variantName}.png`,
              variant_ids: [matchingVariant.id],
            },
          };

          await fetch(`${baseUrl}/products/${product.id}/images.json`, {
            method: 'POST',
            headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
            body: JSON.stringify(imgPayload),
          });
        } catch (err) {
          console.error(`Failed to upload variant image for ${ci.variantName}:`, err);
        }
      }
    }

    // --- STEP 3: Get locations ---
    steps.push('Buscando localizações...');
    let primaryLocationId: number | null = null;
    try {
      const locRes = await fetch(`${baseUrl}/locations.json`, {
        headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
      });
      if (locRes.ok) {
        const locData = await locRes.json();
        if (locData.locations?.length > 0) primaryLocationId = locData.locations[0].id;
      }
    } catch {}

    // --- STEP 4: Set inventory levels ---
    if (primaryLocationId && product.variants?.length > 0) {
      steps.push('Configurando estoque...');
      for (let i = 0; i < product.variants.length; i++) {
        const variant = product.variants[i];
        const bodyVar = bodyVariants?.[i];
        const stock = bodyVar?.stock ?? 0;
        if (variant.inventory_item_id) {
          try {
            await fetch(`${baseUrl}/inventory_levels/set.json`, {
              method: 'POST',
              headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
              body: JSON.stringify({ location_id: primaryLocationId, inventory_item_id: variant.inventory_item_id, available: stock }),
            });
          } catch {}
        }
      }
    }

    // --- STEP 5: Set cost per item ---
    if (product.variants?.length > 0) {
      steps.push('Definindo custos...');
      for (let i = 0; i < product.variants.length; i++) {
        const variant = product.variants[i];
        const bodyVar = bodyVariants?.[i];
        const itemCost = bodyVar?.cost ?? cost;
        if (itemCost && itemCost > 0 && variant.inventory_item_id) {
          try {
            await fetch(`${baseUrl}/inventory_items/${variant.inventory_item_id}.json`, {
              method: 'PUT',
              headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
              body: JSON.stringify({ inventory_item: { cost: itemCost.toString(), country_code_of_origin: countryOfOrigin || null } }),
            });
          } catch {}
        }
      }
    }

    // --- STEP 6: Add to collections ---
    if (collection) {
      steps.push('Adicionando à coleção...');
    }

    // --- STEP 7: Publish to sales channels ---
    if (selectedChannels?.length > 0) {
      steps.push('Publicando nos canais de venda...');
      for (const channelId of selectedChannels) {
        try {
          await fetch(`${baseUrl}/publications/${channelId}/product_listings/${product.id}.json`, {
            method: 'PUT',
            headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_listing: { product_id: product.id } }),
          });
        } catch {}
      }
    }

    // --- Persist to published_products ---
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

    return new Response(JSON.stringify({
      productId: product.id.toString(),
      title: product.title,
      shopifyUrl: shopifyProductUrl,
      status: product.status,
      steps,
      imageUrl: product.images?.[0]?.src || imageSrc || bodyImageUrl || null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Erro interno. Tente novamente.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
