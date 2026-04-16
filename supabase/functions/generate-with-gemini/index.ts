/**
 * ═══════════════════════════════════════════════════════════════════════
 * Edge Function: generate-with-gemini
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Função unificada que conecta diretamente à API do Google Gemini
 * para geração de imagens, textos, especificações e análise visual.
 *
 * ─── CONFIGURAÇÃO OBRIGATÓRIA ───
 *
 * Esta função requer a variável de ambiente GEMINI_API_KEY.
 *
 * Para configurar:
 *   1. Acesse o Supabase Dashboard do seu projeto
 *   2. Vá em: Settings > Edge Functions > Secrets
 *   3. Clique em "Add new secret"
 *   4. Nome: GEMINI_API_KEY
 *   5. Valor: Cole sua chave da API do Google Gemini
 *
 * Para obter sua chave:
 *   1. Acesse https://aistudio.google.com/apikey
 *   2. Clique em "Create API key"
 *   3. Copie a chave gerada
 *
 * ─── MODELOS UTILIZADOS ───
 *
 * • Geração de imagens: gemini-3.1-flash-image-preview (Nano Banana 2)
 *   (geração nativa de imagens rápida com qualidade profissional)
 *
 * • Geração de texto/SEO/specs/análise: gemini-2.5-flash
 *   (modelo rápido e eficiente para tarefas de texto)
 *
 * ─── MODOS DISPONÍVEIS (campo "mode" no body) ───
 *
 * • "generate-image"  → Gera imagem de produto a partir de prompt
 * • "generate-text"   → Gera título, descrição ou SEO
 * • "generate-specs"  → Gera especificações técnicas do produto
 * • "analyze-image"   → Analisa imagem e classifica o produto
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
const GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-image-preview';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// ─── Prompt templates ───

const ANGLE_SUFFIXES: Record<string, string> = {
  frente: 'MANDATORY ANGLE: Front view — model facing camera directly, centered in frame, full torso or full body visible.',
  costas: 'MANDATORY ANGLE: Back view — model turned completely away from camera, showing the entire rear of the garment clearly.',
  detalhe: 'MANDATORY ANGLE: Extreme close-up detail shot — macro focus on fabric texture, stitching, buttons, zippers or craftsmanship details. Fill the frame with the detail.',
  lateral: 'MANDATORY ANGLE: Side profile view — model turned 90 degrees, showing the garment silhouette, side seams, and fit from the side.',
  flat_lay: 'MANDATORY ANGLE: Flat lay — product laid flat on a clean surface, shot from directly above (top-down bird\'s eye view), neatly arranged.',
  textura: 'MANDATORY ANGLE: Extreme macro close-up of fabric/material texture only — fill entire frame with the weave, knit pattern, or surface texture.',
  look_completo: 'MANDATORY ANGLE: Full look — complete head-to-toe outfit on the model, full body framing, showing the entire styled look.',
};

const RATIO_PROMPTS: Record<string, string> = {
  '1:1': 'MANDATORY FORMAT: Square composition (1:1 aspect ratio). Frame the subject accordingly.',
  '4:5': 'MANDATORY FORMAT: Portrait composition (4:5 aspect ratio, vertical orientation). Frame the subject accordingly.',
};

const SPECS_SYSTEM = `You are an expert e-commerce product data generator.
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

const ANALYZE_SYSTEM = `You are a fashion product image analyst specializing in garment classification.

CLASSIFICATION RULES — use this exact decision order:

1. BLAZER — if the garment has visible lapels, structured shoulder line, tailored silhouette, or formal/smart-casual construction.
2. SWEATER — if the garment is a pullover with NO full front opening.
3. KNIT JACKET — if the garment has a full front opening AND is made of knit/textured soft fabric AND is structured like outerwear.
4. CARDIGAN — if the garment has a front opening with knit construction but is softer, lighter, often buttoned or open-front.

For non-knitwear products, use the most appropriate type.

Return a valid JSON object with these exact fields:
{
  "productType": "the classified product type",
  "confidence": 0.0 to 1.0,
  "reason": "one sentence explaining the classification",
  "style": "overall style impression",
  "mainColor": "primary color visible",
  "secondaryColor": "secondary color if visible, or null",
  "materialLook": "apparent material/fabric impression",
  "silhouette": "shape/structure",
  "visualDetails": ["array of 3-6 visible design details"],
  "tagsFromImage": ["array of 3-8 inferred tags"]
}
Respond ONLY with the JSON object, nothing else.`;

const LANGUAGE_MAP: Record<string, { name: string; tone: string }> = {
  pt: { name: 'Português (Brasil)', tone: 'natural e envolvente' },
  en: { name: 'English', tone: 'clean and engaging' },
  es: { name: 'Español', tone: 'natural y atractivo' },
  fr: { name: 'Français', tone: 'naturel et engageant' },
  de: { name: 'Deutsch', tone: 'natürlich und ansprechend' },
  it: { name: 'Italiano', tone: 'naturale e coinvolgente' },
  ja: { name: '日本語', tone: '自然で魅力的な' },
  ko: { name: '한국어', tone: '자연스럽고 매력적인' },
  zh: { name: '中文', tone: '自然且吸引人的' },
  ar: { name: 'العربية', tone: 'طبيعي وجذاب' },
};

const GENDER_MAP: Record<string, string> = { masculino: 'Masculino', feminino: 'Feminino', unissex: 'Unissex', infantil: 'Infantil' };
const TONE_MAP: Record<string, string> = { minimal: 'minimalista e direto', bold: 'ousado e impactante', casual: 'casual e descontraído', editorial: 'editorial e sofisticado' };

// ─── Helpers ───

function getLangConfig(code: string, label?: string) {
  return LANGUAGE_MAP[code] || { name: label || 'Português (Brasil)', tone: 'natural e envolvente' };
}

function buildContextBlock(ctx?: Record<string, string>): string {
  if (!ctx) return '';
  const lines = Object.entries(ctx).filter(([, v]) => v).map(([k, v]) => `- ${k}: ${v}`);
  return lines.length ? `\nPRODUCT CONTEXT:\n${lines.join('\n')}` : '';
}

function buildSpecsBlock(specs?: Record<string, any>): string {
  if (!specs) return '';
  const lines = Object.entries(specs).filter(([, v]) => v && v !== 'N/A').map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
  return lines.length ? `\nTECHNICAL SPECS:\n${lines.join('\n')}` : '';
}

async function callGeminiText(apiKey: string, model: string, messages: { role: string; content: any }[], jsonMode = false) {
  const contents = messages.map(m => ({
    role: m.role === 'system' ? 'user' : m.role === 'assistant' ? 'model' : 'user',
    parts: typeof m.content === 'string' ? [{ text: m.content }] : m.content,
  }));

  // For system messages, we prepend them as user context
  const body: any = { contents };
  if (jsonMode) {
    body.generationConfig = { responseMimeType: 'application/json' };
  }

  const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Gemini ${model} error:`, res.status, errText);
    if (res.status === 429) throw { status: 429, message: 'Rate limit exceeded' };
    if (res.status === 403) throw { status: 403, message: 'Invalid API key or access denied' };
    if (res.status === 503) throw { status: 503, message: 'Model temporarily unavailable due to high demand' };
    throw { status: res.status, message: errText };
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callGeminiImage(
  apiKey: string,
  prompt: string,
  referenceImage?: string,
  referenceMimeType?: string,
  presetImages?: { base64: string; mimeType: string; label: string }[]
) {
  const parts: any[] = [];

  // Add preset reference images first so the model sees them before the text instruction
  if (presetImages && presetImages.length > 0) {
    for (const pi of presetImages) {
      const isBg = pi.label === 'BACKGROUND STYLE';
      const instruction = isBg
        ? `[MANDATORY BACKGROUND REFERENCE — ${pi.label}] You MUST replicate this EXACT background environment, setting, colors, textures, lighting, and atmosphere. The generated image background must be virtually identical to this reference. Do NOT change the background style, do NOT simplify it, do NOT substitute it with a different setting. Copy it faithfully.`
        : `[VISUAL REFERENCE — ${pi.label}] Study this reference image carefully. Match the same type/style but ELEVATE the quality to premium fashion photography level. Better lighting, richer detail, more cinematic presence.`;
      parts.push({ text: instruction });
      parts.push({ inlineData: { mimeType: pi.mimeType, data: pi.base64 } });
    }
  }

  // Add product reference image
  if (referenceImage && referenceMimeType) {
    parts.push({ text: '[PRODUCT REFERENCE] This is the exact product to photograph. Keep all details identical.' });
    parts.push({ inlineData: { mimeType: referenceMimeType, data: referenceImage } });
  }

  // Add the main prompt last
  parts.push({ text: prompt });

  const url = `${GEMINI_BASE}/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Gemini image error:`, res.status, errText);
    if (res.status === 429) throw { status: 429, message: 'Rate limit exceeded' };
    if (res.status === 403) throw { status: 403, message: 'Invalid API key' };
    if (res.status === 503) throw { status: 503, message: 'Model temporarily unavailable due to high demand' };
    throw { status: res.status, message: errText };
  }

  const data = await res.json();
  const candidate = data.candidates?.[0]?.content?.parts;
  if (!candidate) throw { status: 500, message: 'No image generated' };

  // Find the image part
  const imagePart = candidate.find((p: any) => p.inlineData);
  if (imagePart) {
    return {
      base64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType || 'image/png',
    };
  }

  throw { status: 500, message: 'No image in response' };
}

// ─── Main handler ───

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured." }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { mode } = body;

    // ═══ MODE: generate-image ═══
    if (mode === 'generate-image') {
      const { prompt, angle, customAngleText, isCustomPrompt, referenceImage, referenceMimeType, aspectRatio, hasPresets, modelPresetImage, modelPresetMimeType, bgPresetImage, bgPresetMimeType } = body;
      if (!prompt) {
        return new Response(JSON.stringify({ error: 'prompt is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let fullPrompt = isCustomPrompt
        ? prompt
        : `Professional e-commerce product photo. ${prompt}`;

      if (angle && angle !== 'personalizado' && ANGLE_SUFFIXES[angle]) {
        fullPrompt += ` ${ANGLE_SUFFIXES[angle]}`;
      } else if (angle === 'personalizado' && customAngleText) {
        fullPrompt += ` ${customAngleText}`;
      }

      if (aspectRatio && RATIO_PROMPTS[aspectRatio]) {
        fullPrompt += ` ${RATIO_PROMPTS[aspectRatio]}`;
      }

      // Build preset reference images array
      const presetImages: { base64: string; mimeType: string; label: string }[] = [];
      if (modelPresetImage && modelPresetMimeType) {
        presetImages.push({ base64: modelPresetImage, mimeType: modelPresetMimeType, label: 'MODEL TYPE' });
      }
      if (bgPresetImage && bgPresetMimeType) {
        presetImages.push({ base64: bgPresetImage, mimeType: bgPresetMimeType, label: 'BACKGROUND STYLE' });
      }

      // When presets are selected, enforce adherence + premium quality
      if (hasPresets) {
        fullPrompt += `

You are an elite fashion photographer with TOTAL CREATIVE FREEDOM to create a premium editorial e-commerce image.

NON-NEGOTIABLE FOUNDATIONS (these override everything else):
- The MANDATORY ANGLE specified above is the EXACT camera angle you MUST use. It defines where the camera is positioned relative to the subject. Do NOT change it.
- The MANDATORY FORMAT specified above is the EXACT aspect ratio. Compose and frame accordingly. Do NOT crop differently.
- These are the technical base — your creative freedom applies to pose, expression, lighting mood, and interaction with the product WITHIN these constraints.

VISUAL QUALITY REQUIREMENTS:
- Ultra high resolution, 8K detail, razor sharp focus throughout
- Professional studio-grade lighting: soft key light with subtle rim light for depth and dimension
- Rich, true-to-life color accuracy with cinematic color grading
- Fabric must show realistic texture, weight, drape, and natural folds
- Subtle depth of field to separate subject from background
- Magazine-cover level retouching: flawless but natural

POSES & INTERACTION WITH THE PRODUCT — TOTAL CREATIVE FREEDOM:
You have COMPLETE creative liberty to choose poses that STRATEGICALLY HIGHLIGHT THE PRODUCT. The model must INTERACT with the garment in a natural, intentional way.

VARIETY SEED #${Math.floor(Math.random() * 9999)} — USE THIS TO ENSURE UNIQUENESS:
For THIS specific generation, you MUST pick a DIFFERENT pose from the list below. Use the random seed above to select — do NOT default to the same safe pose every time.

POSE OPTIONS (pick ONE that you haven't used recently — be unpredictable):
1. Adjusting collar/lapel to show construction quality
2. Buttoning or unbuttoning to reveal interior lining
3. Rolling up sleeves to show fabric weight
4. Hands in pockets, relaxed drape
5. Walking mid-stride, natural movement
6. Turning slightly to reveal side cut
7. Gesturing naturally showing sleeve/shoulder fit
8. Pulling garment to show stretch/structure
9. Leaning casually against a surface
10. Looking over shoulder, back details visible
11. Arms crossed, chest fit emphasis
12. One hand on hip, confident stance
13. Adjusting watch/cuff, lifestyle detail
14. Mid-laugh candid moment
15. Stepping forward dynamically

NEVER use a stiff, lifeless, arms-at-sides mannequin pose. Every pose must feel PURPOSEFUL — like the photographer specifically directed it to showcase a feature of the product.

MODEL FACE & EXPRESSION — NATURAL & VARIED:
- Photorealistic face quality: visible pores, natural skin texture, realistic eye reflections
- Expression must match the MOOD: casual outfit → relaxed confident vibe; formal blazer → sharp composed presence; streetwear → edgy cool energy
- Each generation must feel like a DIFFERENT MOMENT — unique micro-pose, unique expression, unique energy
- The model should feel ALIVE — captured in a candid editorial moment, never a frozen stock photo

PRESET ADHERENCE:
- Match the reference model's age range, build, and grooming — but with FULL creative variety in pose, expression, and interaction with the product
- Match the reference background's style and mood — enhanced with richer depth and cinematic lighting
- The PRODUCT is the HERO: sharpest element, accurate color/texture/construction, always the focal point

PREMIUM BRAND IDENTITY — THIS IS NON-NEGOTIABLE:
- The final image must be INDISTINGUISHABLE from a real campaign photo by Zara, COS, Mr Porter, or Acne Studios
- Think: understated luxury, effortless sophistication, editorial restraint — never overdone, never cheap-looking
- The model must exude QUIET CONFIDENCE — the kind of person who wears expensive clothes without trying to show off
- Body language: relaxed but intentional, never stiff or awkward. Think "caught mid-moment by a fashion photographer" — not "posing for a passport photo"
- Color palette must feel curated and cohesive — product, skin tones, and background should harmonize like a styled editorial spread
- Avoid anything that screams "AI generated": no plastic skin, no uncanny symmetry, no floating limbs, no impossible lighting angles
- The image should make someone WANT to buy the product immediately — aspirational but attainable.`;
      } else {
        fullPrompt += ' Professional studio lighting, clean white background, ultra high resolution, sharp detail, premium fashion catalog quality, cinematic color grading, 8K detail.';
      }

      const imageResult = await callGeminiImage(GEMINI_API_KEY, fullPrompt, referenceImage, referenceMimeType, presetImages.length > 0 ? presetImages : undefined);

      // Try to upload to Supabase Storage
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
      const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

      if (SUPABASE_URL && SERVICE_ROLE_KEY) {
        try {
          const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
          const ext = imageResult.mimeType.includes('png') ? 'png' : 'webp';
          const fileName = `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

          const imageBytes = Uint8Array.from(atob(imageResult.base64), c => c.charCodeAt(0));

          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, imageBytes, { contentType: imageResult.mimeType, upsert: false });

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
            return new Response(JSON.stringify({
              imageUrl: urlData.publicUrl,
              format: ext,
              size: imageBytes.length,
              stored: true,
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        } catch (e) {
          console.warn('Storage upload failed, returning base64:', e);
        }
      }

      return new Response(JSON.stringify({
        imageUrl: `data:${imageResult.mimeType};base64,${imageResult.base64}`,
        format: 'base64',
        stored: false,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══ MODE: generate-text ═══
    if (mode === 'generate-text') {
      const { type, brief, title, language, languageCode, countryName, customPrompt, tone, usedNames, gender, productContext, productSpecs } = body;

      const lang = getLangConfig(languageCode || 'pt', language);
      const genderLabel = GENDER_MAP[gender || ''] || '';
      const toneLabel = TONE_MAP[tone || ''] || TONE_MAP.minimal;
      const contextBlock = buildContextBlock(productContext);
      const specsBlock = buildSpecsBlock(productSpecs);

      let systemPrompt = '';
      let userPrompt = '';

      if (type === 'title') {
        systemPrompt = `You are a senior e-commerce copywriter. Write product titles in ${lang.name}.\nTone: ${toneLabel}.${genderLabel ? `\nTarget: ${genderLabel}.` : ''}${contextBlock}${specsBlock}\n\nRULES:\n- Return ONLY the title text\n- 3-8 words, punchy and memorable\n- No quotes, no prefixes\n- Must feel native in ${lang.name}`;
        userPrompt = customPrompt || `Create a product title for: ${brief}${usedNames?.length ? `\n\nDo NOT use these names (already used): ${usedNames.join(', ')}` : ''}`;
      } else if (type === 'description') {
        systemPrompt = `You are a senior e-commerce copywriter. Write product descriptions in ${lang.name}.\nTone: ${toneLabel}.${genderLabel ? `\nTarget: ${genderLabel}.` : ''}${contextBlock}${specsBlock}\n\nRULES:\n- Return ONLY the description\n- 2-4 sentences\n- Highlight benefits and features\n- Must feel native in ${lang.name}`;
        userPrompt = customPrompt || `Write a product description for: ${title || brief}`;
      } else if (type === 'seo-title') {
        systemPrompt = `You are an SEO specialist. Write optimized meta titles in ${lang.name}.\n\nRULES:\n- Max 60 characters\n- Include primary keyword\n- Return ONLY the meta title`;
        userPrompt = `Optimize this product title for SEO: ${brief}`;
      } else if (type === 'seo-description') {
        systemPrompt = `You are an SEO specialist. Write optimized meta descriptions in ${lang.name}.\n\nRULES:\n- Max 155 characters\n- Include call-to-action\n- Return ONLY the meta description`;
        userPrompt = `Write an SEO meta description for: ${brief}`;
      } else {
        return new Response(JSON.stringify({ error: 'Invalid text type' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const content = await callGeminiText(GEMINI_API_KEY, GEMINI_TEXT_MODEL, [
        { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` },
      ]);

      return new Response(JSON.stringify({ content: content.trim(), language }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══ MODE: generate-specs ═══
    if (mode === 'generate-specs') {
      const { productType, gender, style, mainColor, visualDetails } = body;
      if (!productType) {
        return new Response(JSON.stringify({ error: 'productType is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userPrompt = `PRODUCT TYPE: ${productType}\nGENDER: ${gender || 'Unisex'}\nSTYLE: ${style || 'Not specified'}\nMAIN COLOR: ${mainColor || 'Not specified'}\nVISUAL DETAILS: ${visualDetails || 'Not specified'}`;

      const content = await callGeminiText(GEMINI_API_KEY, GEMINI_TEXT_MODEL, [
        { role: 'user', content: `${SPECS_SYSTEM}\n\n${userPrompt}` },
      ], true);

      const specs = JSON.parse(content);
      return new Response(JSON.stringify({ specs }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══ MODE: analyze-image ═══
    if (mode === 'analyze-image') {
      const { imageUrl } = body;
      if (!imageUrl) {
        return new Response(JSON.stringify({ error: 'imageUrl is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch image and convert to base64 for Gemini native API
      const imgResponse = await fetch(imageUrl);
      if (!imgResponse.ok) {
        throw { status: 400, message: `Failed to fetch image: ${imgResponse.status}` };
      }
      const imgBuffer = await imgResponse.arrayBuffer();
      const imgBytes = new Uint8Array(imgBuffer);
      let imgBinary = '';
      const CHUNK = 8192;
      for (let i = 0; i < imgBytes.length; i += CHUNK) {
        const slice = imgBytes.subarray(i, Math.min(i + CHUNK, imgBytes.length));
        for (let j = 0; j < slice.length; j++) {
          imgBinary += String.fromCharCode(slice[j]);
        }
      }
      const imgBase64 = btoa(imgBinary);
      const imgMimeType = imgResponse.headers.get('content-type') || 'image/jpeg';

      const content = await callGeminiText(GEMINI_API_KEY, GEMINI_TEXT_MODEL, [
        {
          role: 'user',
          content: [
            { text: ANALYZE_SYSTEM },
            { inlineData: { mimeType: imgMimeType, data: imgBase64 } },
          ],
        },
      ], true);

      const parsed = JSON.parse(content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown mode: ${mode}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    console.error('generate-with-gemini error:', e);
    const status = e?.status || 500;
    const message = e?.message || (e instanceof Error ? e.message : 'Internal error');

    if (status === 429) {
      return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (status === 402 || status === 403) {
      return new Response(JSON.stringify({ error: 'Chave API inválida ou sem permissão.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (status === 503 || (typeof message === 'string' && message.includes('503'))) {
      return new Response(JSON.stringify({ error: 'O modelo de IA está temporariamente sobrecarregado. Tente novamente em alguns instantes.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Erro interno ao processar sua solicitação. Tente novamente.' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
