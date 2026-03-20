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
    const { title, description, price, sizes, collection, imageBase64, imageName, storeDomain, accessToken, apiVersion } = await req.json();

    if (!storeDomain || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Credenciais Shopify não fornecidas.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const version = apiVersion || '2026-01';
    const baseUrl = `https://${storeDomain}/admin/api/${version}`;

    // Step 1: Upload image if provided
    let imageId: string | null = null;
    let imageSrc: string | null = null;

    if (imageBase64 && imageName) {
      // Use staged uploads for the image
      const stageRes = await fetch(`${baseUrl}/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
            stagedUploadsCreate(input: $input) {
              stagedTargets {
                url
                resourceUrl
                parameters { name value }
              }
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
          // Decode base64 and upload
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

    // Step 2: Create product with REST API
    const variants = (sizes && sizes.length > 0 ? sizes : ['Único']).map((size: string) => ({
      option1: size,
      price: price?.toString() || '0.00',
      inventory_management: 'shopify',
    }));

    const productPayload: any = {
      product: {
        title: title || 'Produto sem título',
        body_html: description ? `<p>${description}</p>` : '',
        vendor: 'Publify',
        product_type: collection || '',
        status: 'draft',
        options: [{ name: 'Tamanho', values: sizes && sizes.length > 0 ? sizes : ['Único'] }],
        variants,
      },
    };

    // Attach image
    if (imageSrc) {
      productPayload.product.images = [{ src: imageSrc }];
    } else if (imageBase64) {
      // Fallback: attach base64 directly
      const mimeType = imageName?.endsWith('.png') ? 'image/png' : imageName?.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      productPayload.product.images = [{
        attachment: imageBase64,
        filename: imageName || 'product-image.jpg',
      }];
    }

    const createRes = await fetch(`${baseUrl}/products.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productPayload),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error('Shopify create product error:', createRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar produto no Shopify.', details: errText }),
        { status: createRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const productData = await createRes.json();
    const product = productData.product;

    return new Response(
      JSON.stringify({
        productId: product.id.toString(),
        title: product.title,
        shopifyUrl: `https://${storeDomain}/admin/products/${product.id}`,
        status: product.status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('shopify-publish error:', e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
