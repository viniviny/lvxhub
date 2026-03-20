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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Serviço de geração de imagem indisponível.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build message content
    const messageContent: any[] = [{ type: 'text', text: `Generate a high-quality product photo: ${fullPrompt}` }];
    if (referenceImageUrl) {
      messageContent.push({ type: 'image_url', image_url: { url: referenceImageUrl } });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-image-preview',
        messages: [{ role: 'user', content: messageContent }],
        modalities: ['image', 'text'],
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
          JSON.stringify({ error: 'Créditos insuficientes.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar imagem. Tente novamente.' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const base64Url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!base64Url) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma imagem foi gerada. Tente outro prompt.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload to Supabase Storage as WebP
    try {
      const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, '');
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const fileName = `${user.id}/${angle || 'custom'}-${Date.now()}.webp`;

      const { error: uploadError } = await adminClient.storage
        .from('product-images')
        .upload(fileName, bytes.buffer, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (!uploadError) {
        const { data: urlData } = adminClient.storage
          .from('product-images')
          .getPublicUrl(fileName);

        return new Response(
          JSON.stringify({
            imageUrl: urlData.publicUrl,
            format: 'webp',
            size: bytes.length,
            stored: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If upload fails, fall back to returning base64 URL
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
