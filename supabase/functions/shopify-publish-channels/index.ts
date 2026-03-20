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

    const { product_id, publication_ids } = await req.json();
    if (!product_id || !publication_ids?.length) {
      return new Response(JSON.stringify({ error: 'product_id e publication_ids são obrigatórios.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: conn } = await adminClient.from('shopify_connections').select('store_domain, access_token').eq('user_id', userId).eq('is_active', true).maybeSingle();
    if (!conn) {
      return new Response(JSON.stringify({ error: 'Nenhuma loja conectada.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const baseUrl = `https://${conn.store_domain}/admin/api/2026-01`;
    const results: { publicationId: string; success: boolean }[] = [];

    for (const pubId of publication_ids) {
      try {
        const res = await fetch(`${baseUrl}/publications/${pubId}/product_listings/${product_id}.json`, {
          method: 'PUT',
          headers: { 'X-Shopify-Access-Token': conn.access_token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_listing: { product_id } }),
        });
        const text = await res.text();
        results.push({ publicationId: pubId, success: res.ok });
      } catch {
        results.push({ publicationId: pubId, success: false });
      }
    }

    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
