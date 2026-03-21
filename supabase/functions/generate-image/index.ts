import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ANGLE_SUFFIXES: Record<string, string> = {
  frente: 'front view, white seamless studio background, professional ecommerce photography, soft lighting, ultra realistic, no text no watermark',
  costas: 'back view, white seamless studio background, professional ecommerce photography',
  detalhe: 'extreme close up detail, fabric texture and stitching, macro photography, white background, sharp focus',
  lateral: 'side view, white studio background',
  flat_lay: 'flat lay top view, white surface, perfectly arranged, overhead shot',
  textura: 'macro fabric texture, extreme close up, sharp detail',
  look_completo: 'full outfit invisible mannequin, white studio background, head to toe',
};

const RATIO_PROMPTS: Record<string, string> = {
  '1:1': 'Square 1:1 aspect ratio, 1024x1024 pixels.',
  '4:5': 'Portrait 4:5 aspect ratio, vertical orientation, suitable for fashion e-commerce and Instagram.',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Sessão inválida. Faça login novamente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prompt, angle, customAngleText, isCustomPrompt, referenceImageUrl, aspectRatio } = await req.json();

    if (!prompt || typeof prompt !== 'string' || prompt.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Prompt inválido (máx. 2000 caracteres).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the full prompt with angle suffix and aspect ratio
    let fullPrompt = prompt;
    if (!isCustomPrompt) {
      if (angle && angle === 'personalizado' && customAngleText) {
        fullPrompt = `${prompt}, ${customAngleText}`;
      } else if (angle && ANGLE_SUFFIXES[angle]) {
        fullPrompt = `${prompt}, ${ANGLE_SUFFIXES[angle]}`;
      }
    }

    // Add aspect ratio instruction
    const ratioInstruction = RATIO_PROMPTS[aspectRatio] || RATIO_PROMPTS['4:5'];
    fullPrompt = `${fullPrompt}. ${ratioInstruction}`;

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    if (!GOOGLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_API_KEY não configurada.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build request parts for Gemini
    const parts: any[] = [{ text: `Generate a high-quality product photo: ${fullPrompt}` }];
    if (referenceImageUrl) {
      // If reference image is a base64 data URL, extract the data
      const match = referenceImageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições atingido. Tente novamente em instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 403) {
        return new Response(
          JSON.stringify({ error: 'API key inválida ou sem permissão para gerar imagens.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Google AI image error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar imagem. Tente novamente.' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    // Extract image from Gemini response
    let imageBase64: string | null = null;
    let imageMimeType = 'image/png';
    const candidate = data.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          imageBase64 = part.inlineData.data;
          imageMimeType = part.inlineData.mimeType || 'image/png';
          break;
        }
      }
    }

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma imagem foi gerada. Tente outro prompt.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const base64Url = `data:${imageMimeType};base64,${imageBase64}`;

    // Upload to Supabase Storage as WebP
    try {
      const binaryStr = atob(imageBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const ext = imageMimeType.includes('webp') ? 'webp' : 'png';
      const fileName = `${user.id}/${angle || 'custom'}-${Date.now()}.${ext}`;

      const { error: uploadError } = await adminClient.storage
        .from('product-images')
        .upload(fileName, bytes.buffer, {
          contentType: imageMimeType,
          upsert: false,
        });

      if (!uploadError) {
        const { data: urlData } = adminClient.storage
          .from('product-images')
          .getPublicUrl(fileName);

        return new Response(
          JSON.stringify({
            imageUrl: urlData.publicUrl,
            format: ext,
            size: bytes.length,
            stored: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.error('Storage upload failed:', uploadError);
    } catch (storageErr) {
      console.error('Storage error:', storageErr);
    }

    // Fallback: return the base64 URL directly
    return new Response(
      JSON.stringify({ imageUrl: base64Url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Erro interno. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
