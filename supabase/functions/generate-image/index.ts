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

    const { prompt, angle, customAngleText, isCustomPrompt, referenceImage, referenceMimeType, aspectRatio } = await req.json();

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

    const ratioInstruction = RATIO_PROMPTS[aspectRatio] || RATIO_PROMPTS['4:5'];
    fullPrompt = `${fullPrompt}. ${ratioInstruction}`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY não configurada.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build angle-specific instruction
    const angleInstruction = angle && ANGLE_SUFFIXES[angle]
      ? `MANDATORY CAMERA ANGLE: ${ANGLE_SUFFIXES[angle]}. You MUST shoot from this exact angle/perspective.`
      : (angle === 'personalizado' && customAngleText ? `MANDATORY CAMERA ANGLE: ${customAngleText}. You MUST shoot from this exact angle/perspective.` : '');

    // Build content parts for the user message
    const contentParts: any[] = [];
    const hasReference = referenceImage && typeof referenceImage === 'string' && referenceImage.length > 100;

    if (hasReference) {
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: `data:${referenceMimeType || 'image/jpeg'};base64,${referenceImage}`,
        },
      });
    }

    // Build text prompt
    let textPrompt: string;
    if (hasReference) {
      textPrompt = `${angleInstruction ? angleInstruction + '\n\n' : ''}This is the exact product to photograph. Use it as your only reference. Keep all details: colors, patterns, cuts, buttons, zippers, fabric texture exactly as shown in the reference. Generate a professional studio e-commerce photo of this product. ${angleInstruction ? 'Remember: strictly follow the camera angle specified above.' : ''} Product description: ${prompt}. ${ratioInstruction} CRITICAL: Show the ENTIRE product in frame — never crop or cut off any part. Include full garment from top to bottom with generous margins. White seamless background. Soft diffused studio lighting. Sharp detail throughout. Premium fashion catalog quality. Do not change any product details. No text, no logos, no watermarks.`;
    } else {
      textPrompt = `${angleInstruction ? angleInstruction + '\n\n' : ''}Generate a professional e-commerce product photo: ${fullPrompt}. ${angleInstruction ? 'Remember: strictly follow the camera angle specified above.' : ''}`;
    }
    contentParts.push({ type: 'text', text: textPrompt });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [
          { role: 'user', content: contentParts },
        ],
        modalities: ['text', 'image'],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições atingido. Tente novamente em instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos esgotados. Adicione fundos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar imagem. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    // Extract image from gateway response
    let imageBase64: string | null = null;
    let imageMimeType = 'image/png';

    const choices = data.choices;
    if (choices && choices.length > 0) {
      const message = choices[0].message;
      if (message?.content) {
        // Handle array content (multimodal response)
        if (Array.isArray(message.content)) {
          for (const part of message.content) {
            if (part.type === 'image_url' && part.image_url?.url) {
              const dataUrl = part.image_url.url;
              const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
              if (match) {
                imageMimeType = match[1];
                imageBase64 = match[2];
                break;
              }
            }
          }
        }
      }
    }

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma imagem foi gerada. Tente outro prompt.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload to Supabase Storage
    try {
      const binaryStr = atob(imageBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const ext = imageMimeType.includes('webp') ? 'webp' : imageMimeType.includes('jpeg') ? 'jpg' : 'png';
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

    // Fallback: return base64 data URL
    return new Response(
      JSON.stringify({ imageUrl: `data:${imageMimeType};base64,${imageBase64}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('Internal error:', e);

    if (e?.status === 429 || e?.message?.includes('429')) {
      return new Response(
        JSON.stringify({ error: 'Limite de requisições atingido. Tente novamente em instantes.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Erro interno. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
