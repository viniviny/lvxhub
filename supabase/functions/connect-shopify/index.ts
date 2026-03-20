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
    const { storeDomain, accessToken } = await req.json();

    if (!storeDomain || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Domínio e token são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate credentials by calling Shopify's shop endpoint
    const shopUrl = `https://${storeDomain}/admin/api/2024-01/shop.json`;
    const response = await fetch(shopUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Shopify validation error:', response.status, errText);
      return new Response(
        JSON.stringify({ error: 'Credenciais inválidas. Verifique o domínio e o token.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const shopName = data.shop?.name || storeDomain;

    return new Response(
      JSON.stringify({ success: true, shopName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('connect-shopify error:', e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
