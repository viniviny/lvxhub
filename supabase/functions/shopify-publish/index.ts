import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// --- Helpers: timeout + retry on Shopify rate limit (429) ---
const FUNCTION_TIMEOUT_MS = 140_000;

async function shopifyFetch(
  url: string,
  init: RequestInit,
  opts: { retries?: number; label?: string } = {},
): Promise<Response> {
  const retries = opts.retries ?? 3;
  const label = opts.label ?? url;
  let lastRes: Response | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, init);
    if (res.status !== 429) return res;
    lastRes = res;
    const retryAfter = Number(res.headers.get('Retry-After') || '2');
    const waitMs = Math.min(10_000, Math.max(500, retryAfter * 1000)) * (attempt + 1);
    console.warn(`[shopify-publish] 429 on ${label}, retrying in ${waitMs}ms (attempt ${attempt + 1}/${retries})`);
    await new Promise((r) => setTimeout(r, waitMs));
  }
  return lastRes!;
}

async function runInBatches<T>(items: T[], batchSize: number, worker: (item: T, idx: number) => Promise<void>) {
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    await Promise.all(slice.map((it, j) => worker(it, i + j)));
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Hard internal timeout so we always return a clean error before runtime kills us.
  const timeoutPromise = new Promise<Response>((resolve) => {
    setTimeout(() => {
      resolve(new Response(
        JSON.stringify({ error: 'Tempo limite excedido ao publicar (140s). Tente novamente — algumas operações podem já ter sido aplicadas no Shopify.', step: 'timeout' }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      ));
    }, FUNCTION_TIMEOUT_MS);
  });

  return await Promise.race([handle(req), timeoutPromise]);
});

async function handle(req: Request): Promise<Response> {
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
      title, description, price, compareAtPrice, cost, sizes, collection, productType, gender, tags,
      imageBase64, imageName, imageUrl: bodyImageUrl, vendor: bodyVendor,
      countryCode, countryFlag, countryName, currency: bodyCurrency, currencySymbol,
      localPrice, baseCurrency, language: bodyLanguage, languageLabel, marketName, regionGroup,
      variants: bodyVariants, inventoryPolicy, requiresShipping, weight, weightUnit, countryOfOrigin,
      selectedChannels, colorImages, additionalImages, shopifyProductId,
    } = body;

    if (!title || typeof title !== 'string' || title.length > 255) {
      return new Response(JSON.stringify({ error: 'Título inválido (máx. 255 caracteres).' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: conn } = await adminClient.from('shopify_connections').select('store_domain, access_token, shop_name').eq('user_id', userId).eq('is_active', true).maybeSingle();
    if (!conn) {
      return new Response(JSON.stringify({ error: 'Nenhuma loja conectada.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const apiVersion = '2026-01';
    const baseUrl = `https://${conn.store_domain}/admin/api/${apiVersion}`;
    const accessToken = conn.access_token;
    // Vendor: prefer client-provided value, fall back to the store name (never a hardcoded brand).
    const vendor = (typeof bodyVendor === 'string' && bodyVendor.trim()) || conn.shop_name || conn.store_domain;
    const steps: string[] = [];

    // Language-aware option names
    const sizeLabels: Record<string, { option: string; fallback: string; untitled: string }> = {
      pt: { option: 'Tamanho', fallback: 'Único', untitled: 'Produto sem título' },
      es: { option: 'Talla', fallback: 'Talla única', untitled: 'Producto sin título' },
      fr: { option: 'Taille', fallback: 'Taille unique', untitled: 'Produit sans titre' },
      de: { option: 'Größe', fallback: 'Einheitsgröße', untitled: 'Produkt ohne Titel' },
      it: { option: 'Taglia', fallback: 'Taglia unica', untitled: 'Prodotto senza titolo' },
      ja: { option: 'サイズ', fallback: 'フリーサイズ', untitled: '無題の商品' },
      ko: { option: '사이즈', fallback: '프리사이즈', untitled: '제목 없는 상품' },
      zh: { option: '尺码', fallback: '均码', untitled: '无标题产品' },
      ar: { option: 'المقاس', fallback: 'مقاس واحد', untitled: 'منتج بدون عنوان' },
      nl: { option: 'Maat', fallback: 'One Size', untitled: 'Product zonder titel' },
      en: { option: 'Size', fallback: 'One Size', untitled: 'Untitled Product' },
    };
    const lang = bodyLanguage || 'en';
    const labels = sizeLabels[lang] || sizeLabels['en'];

    // --- STEP 1: Create or Update product ---
    const isUpdate = !!shopifyProductId;
    steps.push(isUpdate ? 'Atualizando produto...' : 'Criando produto...');
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
      : (sizes && sizes.length > 0 ? sizes : [labels.fallback]).map((size: string) => ({
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
      : (sizes && sizes.length > 0 ? sizes : [labels.fallback]);

    // Build images array: main image + all additional images inline
    const productImages: { attachment: string; filename: string; position?: number }[] = [];
    if (imageBase64) {
      productImages.push({ attachment: imageBase64, filename: imageName || 'product-image.jpg', position: 1 });
    }
    if (additionalImages && Array.isArray(additionalImages)) {
      for (let i = 0; i < additionalImages.length; i++) {
        const ai = additionalImages[i];
        if (ai.imageBase64) {
          productImages.push({
            attachment: ai.imageBase64,
            filename: ai.imageName || `product-image-${i + 2}.png`,
            position: productImages.length + 1,
          });
        }
      }
    }

    let product: any;

    let createdNew = false;

    if (isUpdate) {
      // UPDATE existing product
      console.log(`[shopify-publish] Updating product ${shopifyProductId} with ${productImages.length} images`);

      // First check if product still exists
      const checkRes = await fetch(`${baseUrl}/products/${shopifyProductId}.json`, {
        headers: { 'X-Shopify-Access-Token': accessToken },
      });

      if (checkRes.status === 404) {
        // Product no longer exists — fall back to creating a new one
        console.warn(`[shopify-publish] Product ${shopifyProductId} not found, creating new product instead`);
        await checkRes.text(); // consume body
        createdNew = true;
      } else if (!checkRes.ok) {
        const errText = await checkRes.text();
        console.error('[shopify-publish] Check product error:', errText);
        return new Response(JSON.stringify({ error: 'Erro ao verificar produto no Shopify.', step: 'check_product', details: errText }), { status: checkRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } else {
        await checkRes.text(); // consume body

        const combinedTags = [tags || '', gender ? `gender:${gender}` : '', collection ? `collection:${collection}` : '']
          .filter(Boolean).join(', ');
        const updatePayload: Record<string, unknown> = {
          product: {
            id: shopifyProductId,
            title: title || labels.untitled,
            body_html: cleanDescription || '',
            product_type: productType || collection || '',
            tags: combinedTags,
            variants: variantsPayload,
            options: [{ name: labels.option, values: optionValues }],
          },
        };

        const updateRes = await fetch(`${baseUrl}/products/${shopifyProductId}.json`, {
          method: 'PUT',
          headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });

        if (!updateRes.ok) {
          const errText = await updateRes.text();
          console.error('[shopify-publish] Update product error:', errText);
          return new Response(JSON.stringify({ error: 'Erro ao atualizar produto no Shopify.', step: 'update_product', details: errText }), { status: updateRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const updateData = await updateRes.json();
        product = updateData.product;

      // If new images provided, delete old images first then upload new ones
      if (productImages.length > 0) {
        // Delete existing images
        try {
          const existingImgsRes = await fetch(`${baseUrl}/products/${shopifyProductId}/images.json`, {
            headers: { 'X-Shopify-Access-Token': accessToken },
          });
          if (existingImgsRes.ok) {
            const existingImgs = await existingImgsRes.json();
            for (const img of (existingImgs.images || [])) {
              await fetch(`${baseUrl}/products/${shopifyProductId}/images/${img.id}.json`, {
                method: 'DELETE',
                headers: { 'X-Shopify-Access-Token': accessToken },
              });
            }
          }
        } catch (err) {
          console.warn('[shopify-publish] Failed to delete old images:', err);
        }

        // Upload new images
        for (const img of productImages) {
          try {
            await fetch(`${baseUrl}/products/${shopifyProductId}/images.json`, {
              method: 'POST',
              headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: { attachment: img.attachment, filename: img.filename, position: img.position } }),
            });
          } catch (err) {
            console.warn('[shopify-publish] Failed to upload image:', err);
          }
        }

        // Refresh product data to get image URLs
        const refreshRes = await fetch(`${baseUrl}/products/${shopifyProductId}.json`, {
          headers: { 'X-Shopify-Access-Token': accessToken },
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          product = refreshData.product;
        }
      }

      steps.push(`Produto atualizado com ${product.images?.length || 0} imagens!`);
      console.log(`[shopify-publish] Product updated: ${product.id}, images: ${product.images?.length || 0}`);
      }
    }

    if (!isUpdate || createdNew) {
      // CREATE new product
      console.log(`[shopify-publish] Creating product with ${productImages.length} images`);

      const combinedTagsCreate = [tags || '', gender ? `gender:${gender}` : '', collection ? `collection:${collection}` : '']
        .filter(Boolean).join(', ');
      const productPayload: Record<string, unknown> = {
        product: {
          title: title || labels.untitled,
          body_html: cleanDescription || '',
          vendor,
          product_type: productType || collection || '',
          tags: combinedTagsCreate,
          status: 'draft',
          options: [{ name: labels.option, values: optionValues }],
          variants: variantsPayload,
          ...(productImages.length > 0 ? { images: productImages } : {}),
        },
      };

      const createRes = await fetch(`${baseUrl}/products.json`, {
        method: 'POST',
        headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify(productPayload),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error('[shopify-publish] Create product error:', errText);
        return new Response(JSON.stringify({ error: 'Erro ao criar produto no Shopify.', step: 'create_product', details: errText }), { status: createRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const productData = await createRes.json();
      product = productData.product;
      steps.push(`Produto criado com ${product.images?.length || 0} imagens!`);
      console.log(`[shopify-publish] Product created: ${product.id}, images: ${product.images?.length || 0}`);
    }

    const shopifyProductUrl = `https://${conn.store_domain}/admin/products/${product.id}`;

    // --- STEP 2: Upload color variant images and assign to variants ---
    if (colorImages && Array.isArray(colorImages) && colorImages.length > 0 && product.variants?.length > 0) {
      steps.push('Enviando imagens das variantes...');
      for (const ci of colorImages) {
        if (!ci.imageBase64 || !ci.variantName) continue;
        const matchingVariant = product.variants.find((v: any) => v.option1 === ci.variantName);
        if (!matchingVariant) {
          console.warn(`[shopify-publish] No matching variant for color: ${ci.variantName}`);
          continue;
        }

        try {
          const imgRes = await fetch(`${baseUrl}/products/${product.id}/images.json`, {
            method: 'POST',
            headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: {
                attachment: ci.imageBase64,
                filename: ci.imageName || `variant-${ci.variantName}.png`,
                variant_ids: [matchingVariant.id],
              },
            }),
          });
          if (!imgRes.ok) {
            const errText = await imgRes.text();
            console.error(`[shopify-publish] Variant image upload failed for ${ci.variantName}:`, errText);
          } else {
            console.log(`[shopify-publish] Variant image uploaded for ${ci.variantName}`);
          }
        } catch (err) {
          console.error(`[shopify-publish] Variant image error for ${ci.variantName}:`, err);
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
    const publishedRecord = {
      user_id: userId,
      shopify_product_id: product.id.toString(),
      title: product.title,
      description: (description || '').replace(/<[^>]*>/g, ''),
      collection: collection || null,
      sizes: sizes || [],
      image_url: product.images?.[0]?.src || bodyImageUrl || null,
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
    };

    if (isUpdate && !createdNew) {
      // Update existing record by shopify_product_id
      await adminClient.from('published_products')
        .update(publishedRecord)
        .eq('shopify_product_id', shopifyProductId)
        .eq('user_id', userId);
    } else {
      await adminClient.from('published_products').insert(publishedRecord);
    }

    return new Response(JSON.stringify({
      productId: product.id.toString(),
      title: product.title,
      shopifyUrl: shopifyProductUrl,
      status: product.status,
      steps,
      imageUrl: product.images?.[0]?.src || bodyImageUrl || null,
      totalImages: product.images?.length || 0,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[shopify-publish] Unexpected error:', e);
    return new Response(JSON.stringify({ error: 'Erro interno. Tente novamente.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
