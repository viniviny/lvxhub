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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Autenticar usuário via JWT
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { products, origin } = await req.json();
    if (!products?.length || !origin) throw new Error('products e origin são obrigatórios');

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const projectIds: string[] = [];
    const errors: string[] = [];

    for (const product of products) {
      try {
        const raw = product.raw || product;
        const allImages: string[] = (raw.images || []).map((img: any) => img.src).filter(Boolean);
        if (allImages.length === 0 && raw.image?.src) allImages.push(raw.image.src);

        const variants = (raw.variants || []).map((v: any) => ({
          id: v.id,
          title: v.title,
          price: v.price,
          compare_at_price: v.compare_at_price,
          sku: v.sku,
          inventory_quantity: v.inventory_quantity,
          option1: v.option1,
          option2: v.option2,
          option3: v.option3,
        }));

        const { data, error } = await adminClient.from('projects').insert({
          user_id: user.id,
          name: raw.title,
          status: 'draft',
          step: 1,
          product_data: {
            cost: parseFloat(raw.variants?.[0]?.price || '0') || 0,
            originalPrice: parseFloat(raw.variants?.[0]?.price || '0') || 0,
            currency: 'USD',
            vendor: raw.vendor || '',
            productType: raw.product_type || '',
            tags: Array.isArray(raw.tags) ? raw.tags.join(', ') : (raw.tags || ''),
            sourceHandle: raw.handle,
            pricingMode: 'original-from-shopify',
            description: raw.body_html || '',
            variants,
            options: raw.options || [],
          },
          ai_data: {
            polishedTitle: raw.title,
            polishedDescription: raw.body_html || '',
            imageInsights: {
              importedFrom: 'shopify',
              sourceImages: allImages,
              sourceUrl: `${origin}/products/${raw.handle}`,
              sourceOrigin: origin,
            },
          },
        }).select('id').single();

        if (error) throw error;
        projectIds.push(data.id);
      } catch (err: any) {
        errors.push(`${product.title || product.raw?.title || 'desconhecido'}: ${err.message}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      created: projectIds.length,
      failed: errors.length,
      total: products.length,
      projectIds,
      ...(errors.length > 0 && { errors }),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
