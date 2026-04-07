import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productType, gender, style, mainColor, visualDetails } = await req.json();

    if (!productType) {
      return new Response(
        JSON.stringify({ error: "productType is required." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_API_KEY não configurada." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert e-commerce product data generator.
Based on the provided product context, generate realistic product specifications similar to what is found in large marketplaces like AliExpress.
Be accurate, realistic, and consistent with the product.
Return ONLY a valid JSON object with these exact keys:
{
  "material": string,
  "fabric_composition": string,
  "style": string,
  "fit": string,
  "thickness": string,
  "craft": string,
  "collar_type": string,
  "sleeve_type": string,
  "length": string,
  "season": string,
  "use_case": string,
  "target_audience": string,
  "available_colors": string[],
  "available_sizes": string[],
  "additional_features": string[]
}
Fill every field with a realistic value. For arrays, provide 3-6 items.
If a field doesn't apply to this product type, use "N/A".`;

    const userPrompt = `PRODUCT TYPE: ${productType}
GENDER: ${gender || 'Unisex'}
STYLE: ${style || 'Not specified'}
MAIN COLOR: ${mainColor || 'Not specified'}
VISUAL DETAILS: ${visualDetails || 'Not specified'}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                material: { type: "STRING" },
                fabric_composition: { type: "STRING" },
                style: { type: "STRING" },
                fit: { type: "STRING" },
                thickness: { type: "STRING" },
                craft: { type: "STRING" },
                collar_type: { type: "STRING" },
                sleeve_type: { type: "STRING" },
                length: { type: "STRING" },
                season: { type: "STRING" },
                use_case: { type: "STRING" },
                target_audience: { type: "STRING" },
                available_colors: { type: "ARRAY", items: { type: "STRING" } },
                available_sizes: { type: "ARRAY", items: { type: "STRING" } },
                additional_features: { type: "ARRAY", items: { type: "STRING" } },
              },
              required: [
                "material", "fabric_composition", "style", "fit", "thickness",
                "craft", "collar_type", "sleeve_type", "length", "season",
                "use_case", "target_audience", "available_colors", "available_sizes",
                "additional_features"
              ],
            },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("Google AI error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro na API do Google AI." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (content) {
      const specs = JSON.parse(content);
      return new Response(
        JSON.stringify({ specs }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Falha ao interpretar resposta da IA." }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error("generate-specs error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno." }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
