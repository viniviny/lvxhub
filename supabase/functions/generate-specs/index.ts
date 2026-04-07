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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured." }),
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "product_specs",
              description: "Return structured product specifications",
              parameters: {
                type: "object",
                properties: {
                  material: { type: "string" },
                  fabric_composition: { type: "string" },
                  style: { type: "string" },
                  fit: { type: "string" },
                  thickness: { type: "string" },
                  craft: { type: "string" },
                  collar_type: { type: "string" },
                  sleeve_type: { type: "string" },
                  length: { type: "string" },
                  season: { type: "string" },
                  use_case: { type: "string" },
                  target_audience: { type: "string" },
                  available_colors: { type: "array", items: { type: "string" } },
                  available_sizes: { type: "array", items: { type: "string" } },
                  additional_features: { type: "array", items: { type: "string" } },
                },
                required: [
                  "material", "fabric_composition", "style", "fit", "thickness",
                  "craft", "collar_type", "sleeve_type", "length", "season",
                  "use_case", "target_audience", "available_colors", "available_sizes",
                  "additional_features"
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "product_specs" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted. Add funds in Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Extract from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const specs = typeof toolCall.function.arguments === 'string' 
        ? JSON.parse(toolCall.function.arguments) 
        : toolCall.function.arguments;
      return new Response(
        JSON.stringify({ specs }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: try parsing from content
    const content = data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const specs = JSON.parse(jsonMatch[0]);
      return new Response(
        JSON.stringify({ specs }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Failed to parse specs from AI response" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error("generate-specs error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
