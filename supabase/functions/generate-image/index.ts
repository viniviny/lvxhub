import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

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

    // Initialize Google Generative AI with Nano Banana Pro
    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      } as any,
    });

    // Build content parts
    const parts: any[] = [];
    const hasReference = referenceImage && typeof referenceImage === 'string' && referenceImage.length > 100;

    // Add reference image if provided as base64
    if (hasReference) {
      console.log('Reference image included, size:', referenceImage.length);
      parts.push({
        inlineData: {
          data: referenceImage,
          mimeType: referenceMimeType || 'image/jpeg',
        },
      });
    }

    // Build angle-specific instruction
    const angleName = angle ? (ANGLE_SUFFIXES[angle] ? angle : 'custom') : 'general';
    const angleInstruction = angle && ANGLE_SUFFIXES[angle] 
      ? `MANDATORY CAMERA ANGLE: ${ANGLE_SUFFIXES[angle]}. You MUST shoot from this exact angle/perspective.`
      : (angle === 'personalizado' && customAngleText ? `MANDATORY CAMERA ANGLE: ${customAngleText}. You MUST shoot from this exact angle/perspective.` : '');

    // Use different prompt when reference image exists
    if (hasReference) {
      parts.push({ text: `${angleInstruction ? angleInstruction + '\n\n' : ''}This is the exact product to photograph. Use it as your only reference. Keep all details: colors, patterns, cuts, buttons, zippers, fabric texture exactly as shown in the reference. Generate a professional studio e-commerce photo of this product. ${angleInstruction ? 'Remember: strictly follow the camera angle specified above.' : ''} Product description: ${prompt}. ${ratioInstruction} White seamless background. Soft diffused studio lighting. Sharp detail throughout. Premium fashion catalog quality. Do not change any product details. No text, no logos, no watermarks.` });
    } else {
      parts.push({ text: `${angleInstruction ? angleInstruction + '\n\n' : ''}Generate a professional e-commerce product photo: ${fullPrompt}. ${angleInstruction ? 'Remember: strictly follow the camera angle specified above.' : ''}` });
    }

    const result = await model.generateContent(parts);

    // Extract image from response
    let imageBase64: string | null = null;
    let imageMimeType = 'image/png';

    const candidates = result.response.candidates;
    if (candidates && candidates.length > 0) {
      for (const part of candidates[0].content.parts) {
        if ((part as any).inlineData) {
          imageBase64 = (part as any).inlineData.data;
          imageMimeType = (part as any).inlineData.mimeType || 'image/png';
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
