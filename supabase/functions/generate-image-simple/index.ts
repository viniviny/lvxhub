/**
 * ═══════════════════════════════════════════════════════════════════════
 * Edge Function: generate-image-simple
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Módulo "Image Generator" — geração simples de imagens comerciais por IA.
 * Funciona de forma independente do fluxo de publicação principal.
 *
 * Inputs (JSON body):
 *   - prompt: string (obrigatório) — descrição do que gerar
 *   - imageReference?: string — base64 da imagem de referência (opcional)
 *   - imageReferenceMimeType?: string
 *   - variations?: number — 1 a 4 (padrão 1)
 *   - aspectRatio?: '1:1' | '4:5' | '16:9' | '9:16'
 *
 * Saída: { images: string[] (data URLs base64), enhancedPrompt: string }
 * ═══════════════════════════════════════════════════════════════════════
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image-preview';
const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

type AspectRatio = '1:1' | '4:5' | '16:9' | '9:16';

const RATIO_INSTRUCTIONS: Record<AspectRatio, string> = {
  '1:1': 'MANDATORY OUTPUT FORMAT: Square 1:1 aspect ratio. Compose subject centered and balanced for square framing.',
  '4:5': 'MANDATORY OUTPUT FORMAT: Portrait 4:5 aspect ratio (vertical, slightly taller than wide). Optimized for social feed.',
  '16:9': 'MANDATORY OUTPUT FORMAT: Landscape 16:9 aspect ratio (wide horizontal). Optimized for banners, web headers, and YouTube. Compose with horizontal flow and negative space on the sides.',
  '9:16': 'MANDATORY OUTPUT FORMAT: Vertical 9:16 aspect ratio (tall portrait, mobile full-screen). Optimized for Stories and Reels. Compose subject vertically with full-frame impact.',
};

async function enhancePrompt(apiKey: string, userPrompt: string): Promise<string> {
  const system = `You are a senior prompt engineer for commercial product image generation.
Improve the user prompt to maximize visual quality.
Keep the original intent but add: composition, lighting, materials, mood, camera angle, and quality keywords.
Return ONLY the improved prompt as plain text — no explanations, no quotes, no markdown.`;

  try {
    const url = `${GEMINI_BASE}/${GEMINI_TEXT_MODEL}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${system}\n\nUSER PROMPT:\n${userPrompt}` }] },
        ],
        generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
      }),
    });
    if (!res.ok) return userPrompt;
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || userPrompt;
  } catch {
    return userPrompt;
  }
}

async function generateOne(
  apiKey: string,
  finalPrompt: string,
  imageReference?: string,
  imageReferenceMimeType?: string,
  variationSeed?: number,
): Promise<string | null> {
  const parts: any[] = [];
  parts.push({
    text: `${finalPrompt}\n\nMANDATORY: Commercial-grade quality, sharp focus, professional lighting, no watermarks, no text overlays.${variationSeed !== undefined ? `\nVARIATION SEED #${variationSeed} — produce a UNIQUE composition different from other variations.` : ''}`,
  });

  if (imageReference && imageReferenceMimeType) {
    parts.unshift({ text: '[REFERENCE IMAGE — use this as visual inspiration for subject and colors]' });
    parts.push({ inlineData: { mimeType: imageReferenceMimeType, data: imageReference } });
  }

  const url = `${GEMINI_BASE}/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 110000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimeout(timeout);
    if (e?.name === 'AbortError') {
      console.error('Gemini timeout after 110s');
      throw { status: 504, message: 'Geração demorou demais. Tente reduzir o número de variações.' };
    }
    throw e;
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const errText = await res.text();
    console.error('Gemini image error:', res.status, errText);
    if (res.status === 429) throw { status: 429, message: 'Limite de requisições atingido. Tente novamente em instantes.' };
    if (res.status === 402) throw { status: 402, message: 'Créditos insuficientes.' };
    throw { status: res.status, message: errText };
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData?.data);
  if (!imagePart) {
    console.error('No image in response:', JSON.stringify(data).slice(0, 500));
    return null;
  }
  const mimeType = imagePart.inlineData.mimeType || 'image/png';
  return `data:${mimeType};base64,${imagePart.inlineData.data}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Decode JWT payload to validate session (avoids version-specific SDK methods)
    const token = authHeader.replace('Bearer ', '').trim();
    let userId: string | null = null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) throw new Error('expired');
      userId = payload.sub;
    } catch (e) {
      console.error('JWT decode error:', e);
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const prompt: string = (body.prompt || '').toString().trim();
    const imageReference: string | undefined = body.imageReference;
    const imageReferenceMimeType: string | undefined = body.imageReferenceMimeType;
    const variations = Math.min(Math.max(parseInt(body.variations) || 1, 1), 4);
    const aspectRatio: AspectRatio = (body.aspectRatio as AspectRatio) || '1:1';

    if (!prompt || prompt.length < 3) {
      return new Response(JSON.stringify({ error: 'Prompt obrigatório (mínimo 3 caracteres)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (prompt.length > 2000) {
      return new Response(JSON.stringify({ error: 'Prompt muito longo (máx. 2000)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!RATIO_INSTRUCTIONS[aspectRatio]) {
      return new Response(JSON.stringify({ error: 'Formato inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Enhance prompt automatically
    const enhanced = await enhancePrompt(GEMINI_API_KEY, prompt);
    const finalPrompt = `${enhanced}\n\n${RATIO_INSTRUCTIONS[aspectRatio]}`;

    // 2. Generate N variations in parallel
    const tasks = Array.from({ length: variations }, (_, i) =>
      generateOne(
        GEMINI_API_KEY,
        finalPrompt,
        imageReference,
        imageReferenceMimeType,
        variations > 1 ? Math.floor(Math.random() * 99999) + i : undefined,
      ).catch((e) => {
        console.error(`Variation ${i} failed:`, e);
        return null;
      }),
    );
    const results = await Promise.all(tasks);
    const images = results.filter((x): x is string => !!x);

    if (images.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhuma imagem foi gerada. Tente novamente.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ images, enhancedPrompt: enhanced, aspectRatio, count: images.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('generate-image-simple error:', err);
    const status = err?.status || 500;
    const message = err?.message || 'Erro ao gerar imagem';
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
