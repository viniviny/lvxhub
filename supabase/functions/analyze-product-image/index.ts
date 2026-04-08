import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const systemPrompt = `You are a fashion product image analyst specializing in garment classification.

CLASSIFICATION RULES — use this exact decision order:

1. BLAZER — if the garment has visible lapels, structured shoulder line, tailored silhouette, or formal/smart-casual construction. Do NOT classify as Blazer if it looks like casual knit outerwear with ribbed collar and zipper.

2. SWEATER — if the garment is a pullover with NO full front opening (no full zipper, no full button line). Examples: crewneck knit, turtleneck knit, pullover knit.

3. KNIT JACKET — if the garment has a full front opening (especially a full front zipper) AND is made of knit/textured soft fabric AND is structured like outerwear. Look for: ribbed collar, ribbed cuffs, ribbed hem, jacket-like silhouette. Prefer Knit Jacket over Cardigan when there is a full front zipper or stronger outerwear structure.

4. CARDIGAN — if the garment has a front opening with knit construction but is softer, lighter, often buttoned or open-front, and not structured like outerwear.

DECISION PRIORITY:
1. Visible lapels or clear tailoring → Blazer
2. No full front opening → Sweater
3. Full front opening + knit outerwear structure with zipper/ribbed shape → Knit Jacket
4. Knit front opening + softer/lightweight construction → Cardigan

For non-knitwear products, use the most appropriate type: T-Shirt, Tank Top, Shirt, Hoodie, Jacket, Pants, Shorts, Dress, Sneakers, Handbag, etc.

Return a valid JSON object with these exact fields:
{
  "productType": "the classified product type",
  "confidence": 0.0 to 1.0,
  "reason": "one sentence explaining the classification decision based on visible structural cues",
  "style": "overall style impression (e.g. Minimalist, tailored, streetwear, casual)",
  "mainColor": "primary color visible",
  "secondaryColor": "secondary color if visible, or null",
  "materialLook": "apparent material/fabric impression (e.g. Matte leather, Soft knit, Ribbed cotton)",
  "silhouette": "shape/structure (e.g. Structured, Relaxed, Oversized, Slim, Tailored)",
  "visualDetails": ["array of 3-6 visible design details like 'ribbed collar', 'full front zipper', 'structured shoulders'"],
  "tagsFromImage": ["array of 3-8 inferred tags"]
}

RULES:
- Respond ONLY with the JSON object, nothing else
- Use descriptive but concise language
- Do not invent details that are not visible
- Use null for fields you cannot determine
- Keep productType to the canonical name only (e.g. "Knit Jacket" not "Men's Casual Knit Jacket")`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "imageUrl is required." }),
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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: systemPrompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados. Adicione fundos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("Lovable AI Gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Image analysis failed." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    try {
      const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return new Response(
        JSON.stringify(parsed),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch {
      console.error("Failed to parse AI response as JSON:", content);
      return new Response(
        JSON.stringify({ error: "Invalid AI response format.", raw: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (e) {
    console.error("analyze-product-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error." }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
