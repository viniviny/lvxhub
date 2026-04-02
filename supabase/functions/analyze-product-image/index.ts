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
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "imageUrl is required." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_API_KEY not configured." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch image and convert to base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch image." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const imageBytes = new Uint8Array(imageBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < imageBytes.length; i += chunkSize) {
      binary += String.fromCharCode(...imageBytes.subarray(i, i + chunkSize));
    }
    const base64Image = btoa(binary);
    const mimeType = imageResponse.headers.get('content-type') || 'image/png';

    const systemPrompt = `You are a fashion product image analyst. Analyze this product image and extract structured visual details.

Return a valid JSON object with these exact fields:
{
  "productType": "the most likely product type (e.g. T-Shirt, Blazer, Jacket, Hoodie, Pants, Dress, Sneakers, Handbag, etc.)",
  "style": "overall style impression (e.g. Minimalist, tailored, streetwear, casual, editorial, athleisure)",
  "mainColor": "primary color visible (e.g. Dark green, Black, Cream, Navy blue)",
  "secondaryColor": "secondary color if visible, or null",
  "materialLook": "apparent material or fabric impression (e.g. Matte leather, Soft knit, Ribbed cotton, Smooth wool, Structured twill)",
  "silhouette": "shape/structure (e.g. Structured, Relaxed, Oversized, Slim, Tailored, Boxy)",
  "visualDetails": ["array of 3-6 visible design details like 'clean lapel', 'contrast stitching', 'hidden buttons', 'ribbed cuffs'"],
  "tagsFromImage": ["array of 3-8 inferred tags like 'premium', 'formal', 'winter', 'monochrome', 'textured']
}

RULES:
- Respond ONLY with the JSON object, nothing else
- Use descriptive but concise language
- Do not invent details that are not visible
- Use null for fields you cannot determine
- Keep product type generic (e.g. "Jacket" not "Men's Casual Lightweight Zip-Up Jacket")`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { text: systemPrompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Image,
                },
              },
            ],
          }],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google AI Vision error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Image analysis failed." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    let content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Clean markdown code fences if present
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    try {
      const parsed = JSON.parse(content);
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
