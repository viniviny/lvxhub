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

// ═══════════════════════════════════════════════════════════════════════
// UNIVERSAL PRODUCT TYPE STRATEGY MAP
// Aplicado automaticamente a TODO produto adicionado ao Publify.
// Detecta o tipo a partir do campo productType / título e seleciona
// a estratégia de tom, foco, keywords e ângulo de descrição.
// ═══════════════════════════════════════════════════════════════════════
interface ProductStrategy {
  tone: string;
  focus: string;
  keywords: string[];
  descriptionAngle: string;
}

const PRODUCT_STRATEGIES: Record<string, ProductStrategy> = {
  't-shirt': {
    tone: 'casual luxury, everyday refinement',
    focus: 'fabric feel, breathability, versatility, layering',
    keywords: ['premium cotton', 'everyday elegance', 'soft hand feel', 'versatile layering'],
    descriptionAngle: 'comfort and craftsmanship for daily wear',
  },
  polo: {
    tone: 'smart casual, refined sportswear heritage',
    focus: 'collar construction, fabric performance, clean silhouette',
    keywords: ['piqué texture', 'smart casual', 'clean lines', 'refined polo'],
    descriptionAngle: 'the intersection of sport and elegance',
  },
  knitwear: {
    tone: 'warmth, artisanal quality, timeless',
    focus: 'yarn quality, knit construction, layering weight',
    keywords: ['merino wool', 'fine knit', 'artisan quality', 'seasonal warmth'],
    descriptionAngle: 'enduring warmth with understated luxury',
  },
  shirt: {
    tone: 'classic, versatile, refined',
    focus: 'collar style, cuff detail, fabric weight, occasion',
    keywords: ['woven cotton', 'tailored fit', 'refined shirt', 'versatile dressing'],
    descriptionAngle: 'precision tailoring for modern men',
  },
  blazer: {
    tone: 'formal, architectural, powerful',
    focus: 'lapel construction, lining, shoulder structure, silhouette',
    keywords: ['structured silhouette', 'sartorial excellence', 'refined tailoring', 'impeccable finish'],
    descriptionAngle: 'commanding presence through precise construction',
  },
  suit: {
    tone: 'ceremonial, authoritative, impeccable',
    focus: 'canvas construction, fabric weight, drape, lining',
    keywords: ['full canvas', 'Italian craftsmanship', 'ceremonial elegance', 'tailored authority'],
    descriptionAngle: 'the pinnacle of menswear craftsmanship',
  },
  jacket: {
    tone: 'functional luxury, modern outerwear',
    focus: 'outer shell, lining, closures, weather performance',
    keywords: ['premium outerwear', 'refined protection', 'functional elegance', 'modern jacket'],
    descriptionAngle: 'refined protection for the modern man',
  },
  coat: {
    tone: 'grand, enveloping, heritage',
    focus: 'length, weight, collar, seasonal authority',
    keywords: ['overcoat', 'heritage tailoring', 'seasonal authority', 'refined outerwear'],
    descriptionAngle: 'the ultimate statement in cold-weather refinement',
  },
  pants: {
    tone: 'relaxed precision, modern tailoring',
    focus: 'waistband, drape, cut, hem break',
    keywords: ['clean drape', 'modern cut', 'relaxed elegance', 'refined trousers'],
    descriptionAngle: 'modern tailoring with effortless movement',
  },
  shorts: {
    tone: 'relaxed luxury, summer refinement',
    focus: 'inseam length, fabric, waistband, occasion',
    keywords: ['premium shorts', 'summer elegance', 'refined casual', 'lightweight fabric'],
    descriptionAngle: 'warm-weather sophistication',
  },
  shoes: {
    tone: 'craftsmanship, heritage, material mastery',
    focus: 'leather quality, sole construction, finish, lasting',
    keywords: ['full-grain leather', 'handcrafted', 'refined step', 'lasting quality'],
    descriptionAngle: 'every step grounded in artisan tradition',
  },
  boots: {
    tone: 'rugged elegance, durability, character',
    focus: 'shaft height, leather, sole, weather resistance',
    keywords: ['premium leather boots', 'refined durability', 'artisan boots', 'lasting construction'],
    descriptionAngle: 'crafted for those who move with purpose',
  },
  sneakers: {
    tone: 'modern luxury, athletic heritage, clean design',
    focus: 'upper material, sole technology, colorway, clean lines',
    keywords: ['luxury sneakers', 'premium upper', 'clean silhouette', 'refined sport'],
    descriptionAngle: 'sport heritage refined for modern luxury',
  },
  belt: {
    tone: 'minimal, precise, functional luxury',
    focus: 'leather grade, buckle finish, width, stitching',
    keywords: ['full-grain leather belt', 'refined hardware', 'precise finishing', 'understated luxury'],
    descriptionAngle: 'the defining detail of a refined wardrobe',
  },
  watch: {
    tone: 'precise, heritage, timeless',
    focus: 'case material, movement, dial, strap',
    keywords: ['precision timepiece', 'refined movement', 'heritage watchmaking', 'enduring design'],
    descriptionAngle: 'time measured with intention',
  },
  wallet: {
    tone: 'minimal, refined, daily luxury',
    focus: 'leather type, card capacity, stitching, patina potential',
    keywords: ['slim leather wallet', 'premium grain', 'refined daily carry', 'understated craftsmanship'],
    descriptionAngle: 'refined simplicity for daily life',
  },
  bag: {
    tone: 'utilitarian luxury, structure, material',
    focus: 'leather or canvas, hardware, interior organization, handles',
    keywords: ['premium bag', 'refined carry', 'structured luxury', 'artisan leather'],
    descriptionAngle: 'form and function in perfect balance',
  },
  default: {
    tone: 'refined, minimal, confident',
    focus: 'material, construction, occasion, lifestyle',
    keywords: ['premium quality', 'refined design', 'luxury menswear', 'Rilmont'],
    descriptionAngle: 'understated luxury for the modern man',
  },
};

const TYPE_ALIASES: Record<string, string> = {
  tee: 't-shirt', tshirt: 't-shirt', 't shirt': 't-shirt', camiseta: 't-shirt', henley: 't-shirt',
  'polo shirt': 'polo', polos: 'polo',
  sweater: 'knitwear', cardigan: 'knitwear', crewneck: 'knitwear', knit: 'knitwear',
  pullover: 'knitwear', rollneck: 'knitwear', sweatshirt: 'knitwear', hoodie: 'knitwear',
  'dress shirt': 'shirt', overshirt: 'shirt', 'long-sleeve shirt': 'shirt', camisa: 'shirt',
  'suit jacket': 'blazer', 'sport coat': 'blazer',
  bomber: 'jacket', 'field jacket': 'jacket', parka: 'jacket', 'coach jacket': 'jacket', jaqueta: 'jacket',
  overcoat: 'coat', raincoat: 'coat', trench: 'coat', casaco: 'coat',
  trousers: 'pants', chino: 'pants', chinos: 'pants', jeans: 'pants', joggers: 'pants', 'cargo pants': 'pants', calça: 'pants',
  'swim shorts': 'shorts', bermuda: 'shorts',
  loafers: 'shoes', oxfords: 'shoes', derby: 'shoes', sapato: 'shoes',
  bota: 'boots', botas: 'boots',
  sneaker: 'sneakers', tênis: 'sneakers', tenis: 'sneakers',
  cinto: 'belt',
  relogio: 'watch', relógio: 'watch', timepiece: 'watch',
  carteira: 'wallet',
  bolsa: 'bag', backpack: 'bag', mochila: 'bag', tote: 'bag', briefcase: 'bag',
};

function detectProductType(rawType: string | undefined | null, fallbackTitle?: string): { key: string; strategy: ProductStrategy } {
  const candidates = [rawType, fallbackTitle].filter(Boolean) as string[];
  for (const candidate of candidates) {
    const lower = candidate.toLowerCase().trim();
    if (PRODUCT_STRATEGIES[lower]) return { key: lower, strategy: PRODUCT_STRATEGIES[lower] };
    if (TYPE_ALIASES[lower]) {
      const key = TYPE_ALIASES[lower];
      return { key, strategy: PRODUCT_STRATEGIES[key] };
    }
    for (const key of Object.keys(PRODUCT_STRATEGIES)) {
      if (key !== 'default' && lower.includes(key)) return { key, strategy: PRODUCT_STRATEGIES[key] };
    }
    for (const [alias, key] of Object.entries(TYPE_ALIASES)) {
      if (lower.includes(alias)) return { key, strategy: PRODUCT_STRATEGIES[key] };
    }
  }
  return { key: 'default', strategy: PRODUCT_STRATEGIES.default };
}

function buildStrategyBlock(strategy: ProductStrategy, key: string): string {
  return `\n\nPRODUCT-TYPE STRATEGY (auto-detected: "${key}"):\n- Tone: ${strategy.tone}\n- Focus: ${strategy.focus}\n- Keywords to include naturally (do NOT keyword-stuff): ${strategy.keywords.join(', ')}\n- Angle: ${strategy.descriptionAngle}`;
}

const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
const GEMINI_VALIDATION_MODEL = 'gemini-2.5-flash-lite';
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

// ─── Validation: verify generated image matches references ───

async function validateGeneratedImage(
  apiKey: string,
  generatedBase64: string,
  generatedMimeType: string,
  presetImages?: { base64: string; mimeType: string; label: string }[],
  referenceImage?: string,
  referenceMimeType?: string,
): Promise<{ isValid: boolean; reason?: string }> {
  if (!presetImages?.length && !referenceImage) return { isValid: true };

  const parts: any[] = [];
  parts.push({ text: `You are a strict quality control inspector for e-commerce product photography.

Compare the GENERATED IMAGE against the PROVIDED REFERENCE IMAGES and answer with ONLY a JSON object.

CHECK EACH APPLICABLE CRITERION:
- "background_match": Does the generated background match the background reference? (true/false/null if no bg reference)
- "model_match": Does the model type/style match the model reference? (true/false/null if no model reference)  
- "product_intact": Is the product fully visible without cropping? (true/false)
- "overall_valid": true ONLY if ALL non-null checks are true

Respond with ONLY valid JSON, no markdown:
{"background_match": bool|null, "model_match": bool|null, "product_intact": bool, "overall_valid": bool, "reason": "brief explanation if invalid"}` });

  parts.push({ text: '[GENERATED IMAGE — evaluate this]' });
  parts.push({ inlineData: { mimeType: generatedMimeType, data: generatedBase64 } });

  if (presetImages) {
    for (const pi of presetImages) {
      const label = pi.label === 'BACKGROUND STYLE' ? 'BACKGROUND REFERENCE' : 'MODEL REFERENCE';
      parts.push({ text: `[${label} — compare against this]` });
      parts.push({ inlineData: { mimeType: pi.mimeType, data: pi.base64 } });
    }
  }

  if (referenceImage && referenceMimeType) {
    parts.push({ text: '[PRODUCT REFERENCE — the product should match this]' });
    parts.push({ inlineData: { mimeType: referenceMimeType, data: referenceImage } });
  }

  try {
    const url = `${GEMINI_BASE}/${GEMINI_VALIDATION_MODEL}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    if (!res.ok) {
      console.warn('Validation call failed, accepting image:', res.status);
      return { isValid: true };
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const result = JSON.parse(text);
    return { isValid: !!result.overall_valid, reason: result.reason };
  } catch (e) {
    console.warn('Validation parse error, accepting image:', e);
    return { isValid: true };
  }
}

async function callGeminiImage(
  apiKey: string,
  prompt: string,
  referenceImage?: string,
  referenceMimeType?: string,
  presetImages?: { base64: string; mimeType: string; label: string }[]
) {
  const parts: any[] = [];

  const hasProduct = referenceImage && referenceMimeType;
  const hasModel = presetImages?.some(p => p.label === 'MODEL TYPE');
  const hasBg = presetImages?.some(p => p.label === 'BACKGROUND STYLE');
  const isComposition = hasProduct && (hasModel || hasBg);

  if (isComposition) {
    // ─── COMPOSITION MODE: high-end editorial product photography ───
    parts.push({ text: `You are a high-end fashion editorial image generation AI.
Your goal is to create a premium product image with strong visual quality and creative direction.

━━━━━━━━━━━━━━━━━━━━━━━
MODEL IDENTITY VS EXPRESSION (CRITICAL)
${hasModel ? `- Use the provided model image ONLY as IDENTITY reference: face structure, facial features, hair, body type, proportions
- DO NOT copy the facial expression from the reference image
- DO NOT replicate the original emotion or pose
- DO NOT copy the background or scene from the model image
- Generate a NEW facial expression based on fashion editorial direction
- The expression must be DIFFERENT from the reference — improve it to professional model standard
- The final face must look like the SAME PERSON but with a DIFFERENT expression and pose
- FORBIDDEN: cloning the face exactly as-is, keeping the same emotion from the reference` : '- No model — show product only (invisible mannequin or flat lay)'}

━━━━━━━━━━━━━━━━━━━━━━━
BACKGROUND (MANDATORY)
${hasBg ? `- Use the selected background reference EXACTLY as shown
- The environment must match the background reference image
- Clean, consistent, and realistic` : '- White seamless studio background, soft diffused lighting'}

━━━━━━━━━━━━━━━━━━━━━━━
PRODUCT RULES
- Use the exact product from the product reference (shape, color, material, texture, pattern)
- Do NOT modify the product design in any way
- Product must be clearly visible and fully in frame
- No cropping — show the ENTIRE product

━━━━━━━━━━━━━━━━━━━━━━━
CREATIVE DIRECTION — POSES (USE AS INSPIRATION, NOT EXACT COPY)
${hasModel ? `Pick ONE pose naturally from this pool — do NOT repeat across generations:
- walking naturally (subtle motion, relaxed arms)
- standing straight with relaxed posture
- slight lean against wall or surface
- hands in pockets (one or both)
- adjusting clothing (collar, zipper, sleeves)
- sitting casually (chair, bench, minimal surface)
- turning slightly sideways (3/4 angle)
- looking down naturally (introspective mood)
- mid-step motion (editorial walking shot)
- relaxed crossed arms (confident but minimal)
- one hand touching neck or chin
- standing with weight shifted to one leg
- slow movement posture (cinematic feel)

FACIAL EXPRESSION (HIGH-END MENSWEAR):
Pick ONE expression — vary across generations, NEVER repeat:
- neutral editorial (primary — default premium look)
- calm confidence
- introspective / thoughtful
- subtle serious luxury
- effortless relaxed
- side gaze (not always looking at camera)
- walking focus expression

EXPRESSION RULES:
- Expression must be subtle and natural — no exaggerated emotion, no big smile, no forced face, no empty/lifeless look
- Relaxed facial muscles, natural eyes, balanced gaze
- The model must look like a real fashion model from a premium menswear campaign

IMPORTANT:
- Avoid exaggerated fashion poses or dramatic expressions
- Keep everything natural and effortless — luxury uses subtlety, not exaggeration
- Each image must feel like a DIFFERENT moment with a DIFFERENT pose AND expression
- NEVER repeat the same pose or expression across generations
- NEVER use stiff or mannequin-like poses` : '- Clean product presentation, professional angles'}

━━━━━━━━━━━━━━━━━━━━━━━
STYLE
- Premium fashion photography — clean composition, natural lighting, soft shadows
- High-end editorial look (Zara, COS, Massimo Dutti quality)
- Photorealistic with natural skin texture, visible pores, realistic eye reflections
- Minimalism preferred — elegance through restraint

━━━━━━━━━━━━━━━━━━━━━━━
NEGATIVE (AVOID)
- using original background from model image
- stiff, repeated, or exaggerated poses
- dramatic expressions
- low quality, blurry
- distorted anatomy or unrealistic fabric
- cropped or cut product
- messy composition
━━━━━━━━━━━━━━━━━━━━━━━` });

    // Add reference images with clear labels
    if (presetImages) {
      for (const pi of presetImages) {
        if (pi.label === 'BACKGROUND STYLE') {
          parts.push({ text: '[BACKGROUND REFERENCE] Replicate this EXACT background environment — setting, colors, textures, lighting, atmosphere. Do NOT deviate.' });
        } else {
          parts.push({ text: '[MODEL REFERENCE] Use this person\'s face, hairstyle, body type, and proportions ONLY. Place them in a NEW scene with a NEW pose. Do NOT copy the background or pose from this image.' });
        }
        parts.push({ inlineData: { mimeType: pi.mimeType, data: pi.base64 } });
      }
    }

    parts.push({ text: '[PRODUCT REFERENCE] This is the EXACT product to use. Keep all details identical — colors, patterns, texture, shape, design.' });
    parts.push({ inlineData: { mimeType: referenceMimeType!, data: referenceImage! } });

    parts.push({ text: `━━━━━━━━━━━━━━━━━━━━━━━
FINAL INSTRUCTION
Generate a high-quality fashion image where the model is consistent with the reference identity, placed in the correct background, wearing the exact product, with a natural, creative, and premium editorial pose.

VARIETY SEED #${Math.floor(Math.random() * 9999)} — use a DIFFERENT pose than previous generations.

${prompt}` });

  } else {
    // ─── STANDARD MODE: single/no reference ───
    if (presetImages && presetImages.length > 0) {
      for (const pi of presetImages) {
        const isBg = pi.label === 'BACKGROUND STYLE';
        const isStyle = pi.label === 'STYLE REFERENCE';
        const instruction = isBg
          ? `[MANDATORY BACKGROUND REFERENCE — ${pi.label}] You MUST replicate this EXACT background environment, setting, colors, textures, lighting, and atmosphere. The generated image background must be virtually identical to this reference. Do NOT change the background style, do NOT simplify it, do NOT substitute it with a different setting. Copy it faithfully.`
          : isStyle
          ? `[STYLE REFERENCE — ${pi.label}] Use this image ONLY as INSPIRATION for pose, framing, lighting, mood and composition. Do NOT copy it literally. Do NOT replace the product with anything from this image. The actual product comes from the [PRODUCT REFERENCE] only.`
          : `[VISUAL REFERENCE — ${pi.label}] Study this reference image carefully. Match the same type/style but ELEVATE the quality to premium fashion photography level. Better lighting, richer detail, more cinematic presence.`;
        parts.push({ text: instruction });
        parts.push({ inlineData: { mimeType: pi.mimeType, data: pi.base64 } });
      }
    }

    if (hasProduct) {
      parts.push({ text: '[PRODUCT REFERENCE] This is the exact product to photograph. Keep all details identical.' });
      parts.push({ inlineData: { mimeType: referenceMimeType!, data: referenceImage! } });
    }

    parts.push({ text: prompt });
  }

  const url = `${GEMINI_BASE}/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`;

  // Hard timeout: edge function platform kills the request at 150s.
  // Abort the Gemini call before that so we return a clean error instead of a 504.
  const controller = new AbortController();
  const timeoutMs = 120_000; // 120s — leaves headroom for upload + response
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
        },
      }),
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e?.name === 'AbortError') {
      console.error('Gemini image timed out after', timeoutMs, 'ms');
      throw { status: 504, message: 'A geração demorou muito (>120s). Tente novamente com um prompt mais curto ou menos imagens de referência.' };
    }
    throw e;
  }
  clearTimeout(timeoutId);

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
      const { prompt, angle, customAngleText, isCustomPrompt, referenceImage, referenceMimeType, aspectRatio, hasPresets, modelPresetImage, modelPresetMimeType, bgPresetImage, bgPresetMimeType, additionalReferences } = body;
      if (!prompt) {
        return new Response(JSON.stringify({ error: 'prompt is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ━━━ STRICT PRIORITY HEADER (overrides default behavior) ━━━
      const STRICT_HEADER = `You are generating a product image and MUST strictly follow ALL instructions below.

━━━━━━━━━━━━━━━━━━━━━━━
PRIORITY RULE (CRITICAL)
The instructions in this prompt OVERRIDE any default behavior.
You MUST follow the prompt exactly. The USER PROMPT is the highest-priority creative directive.

━━━━━━━━━━━━━━━━━━━━━━━
PRODUCT CONSISTENCY (NON-NEGOTIABLE)
- Keep the product identical to the [PRODUCT REFERENCE] image
- Do NOT change color, shape, fabric, pattern or design details
- The product silhouette and identity must remain 100% intact

━━━━━━━━━━━━━━━━━━━━━━━`;

      let fullPrompt = `${STRICT_HEADER}

${prompt}`;

      // Add angle instruction
      if (angle && angle !== 'personalizado' && ANGLE_SUFFIXES[angle]) {
        fullPrompt += `\n\n${ANGLE_SUFFIXES[angle]}`;
      } else if (angle === 'personalizado' && customAngleText) {
        fullPrompt += `\n\nMANDATORY ANGLE: ${customAngleText}`;
      }

      // Add aspect ratio instruction
      if (aspectRatio && RATIO_PROMPTS[aspectRatio]) {
        fullPrompt += `\n\n${RATIO_PROMPTS[aspectRatio]}`;
      }

      // Add model interaction directives when model presets are selected
      if (modelPresetImage) {
        fullPrompt += `

━━━━━━━━━━━━━━━━━━━━━━━
MODEL RULES (STRICT)
- Use the [MODEL TYPE] image ONLY as identity reference (face structure, body proportions, ethnicity, age range)
- DO NOT copy the original pose from the model reference
- DO NOT copy the original facial expression from the model reference
- Generate a COMPLETELY NEW pose and a NEW expression for this shot

MODEL INTERACTION & POSE:
The model must interact with the product naturally. Choose a purposeful pose that highlights the product.
VARIETY SEED #${Math.floor(Math.random() * 9999)} — pick a DIFFERENT pose each time:
- Adjusting collar/lapel, hands in pockets, walking mid-stride, turning to show side cut
- Rolling sleeves, leaning casually, mid-laugh candid moment, one hand on hip
- Arms crossed showing chest fit, stepping forward dynamically, looking over shoulder
NEVER use a stiff mannequin pose. The model must feel ALIVE — a candid editorial moment.
Face: photorealistic with natural skin texture, visible pores, realistic eye reflections.
Expression must match the product mood — relaxed for casual, sharp for formal, edgy for streetwear.`;
      }

      // Add background fidelity when background preset is selected
      if (bgPresetImage) {
        fullPrompt += `

━━━━━━━━━━━━━━━━━━━━━━━
BACKGROUND RULES (STRICT — NON-NEGOTIABLE)
- Use ONLY the [BACKGROUND STYLE] image as the background source
- IGNORE any background present in [PRODUCT REFERENCE] or [STYLE REFERENCE] images
- The background MUST be EXACTLY as shown in [BACKGROUND STYLE]: replicate setting, colors, textures, lighting and atmosphere faithfully
- Do NOT substitute, simplify or deviate. The final background must be virtually identical to the reference.`;
      }

      // ━━━ FINAL ENFORCEMENT BLOCK (always appended last for max weight) ━━━
      fullPrompt += `

━━━━━━━━━━━━━━━━━━━━━━━
VARIATION RULES
- Create a NEW pose (different from any reference)
- Create a NEW expression
- Make it look like a real fashion photoshoot, not a static catalog shot

━━━━━━━━━━━━━━━━━━━━━━━
QUALITY RULES
- High-end fashion photography
- Sharp focus on the product
- Professional lighting and color grading
- Clean, intentional composition

━━━━━━━━━━━━━━━━━━━━━━━
FORBIDDEN
- Do NOT ignore the USER PROMPT
- Do NOT reuse the original pose or expression from any reference
- Do NOT change the product (color, shape, design, fabric)
- Do NOT add watermarks, text overlays or logos that are not part of the product

━━━━━━━━━━━━━━━━━━━━━━━
FINAL
Generate the image strictly following ALL rules above. The USER PROMPT and PRODUCT CONSISTENCY are the highest priorities.`;

      console.log('[generate-image] FINAL PROMPT length:', fullPrompt.length);


      // Build preset reference images array
      const presetImages: { base64: string; mimeType: string; label: string }[] = [];
      if (modelPresetImage && modelPresetMimeType) {
        presetImages.push({ base64: modelPresetImage, mimeType: modelPresetMimeType, label: 'MODEL TYPE' });
      }
      if (bgPresetImage && bgPresetMimeType) {
        presetImages.push({ base64: bgPresetImage, mimeType: bgPresetMimeType, label: 'BACKGROUND STYLE' });
      }
      // Additional references = inspiration for pose/mood/composition (not the product itself)
      if (Array.isArray(additionalReferences)) {
        for (const ref of additionalReferences) {
          if (ref?.base64 && ref?.mimeType) {
            presetImages.push({ base64: ref.base64, mimeType: ref.mimeType, label: 'STYLE REFERENCE' });
          }
        }
      }
      const hasStyleRefs = presetImages.some(p => p.label === 'STYLE REFERENCE');
      if (hasStyleRefs) {
        fullPrompt += `\n\nSTYLE REFERENCES (INSPIRATION ONLY):
- Use the [STYLE REFERENCE] images ONLY as inspiration for pose, framing, lighting, mood and composition.
- Do NOT copy them literally. Do NOT replace the product with anything from them.
- The product identity (from [PRODUCT REFERENCE]) MUST remain 100% intact: same shape, color, fabric, design, details.
- Mix the style cues across the references to create a fresh, premium editorial result.`;
      }

      // Single-pass generation. Validation retry was disabled because two
      // sequential Gemini calls frequently exceeded the 150s edge function limit.
      const imageResult = await callGeminiImage(
        GEMINI_API_KEY,
        fullPrompt,
        referenceImage,
        referenceMimeType,
        presetImages.length > 0 ? presetImages : undefined,
      );

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

    // ═══ MODE: generate-color-variant ═══
    // Generates the SAME product in a different color, keeping model identity,
    // background and lighting consistent. Pose, angle and expression vary.
    if (mode === 'generate-color-variant') {
      const {
        baseImage,            // base64 of the cover/reference image (REQUIRED)
        baseMimeType,         // mime type of base image
        colorReferenceImage,  // optional base64 of a color swatch / reference
        colorReferenceMimeType,
        additionalReferences, // optional array of { base64, mimeType, label? } for extra style/context refs
        colorName,            // e.g. "Azul marinho"
        colorHex,             // e.g. "#1B2A4E"
        aspectRatio,
        extraInstruction,     // optional free-text instruction (e.g. "front view, looking at camera")
      } = body;

      if (!baseImage || !baseMimeType) {
        return new Response(JSON.stringify({ error: 'baseImage and baseMimeType are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!colorName && !colorHex && !colorReferenceImage) {
        return new Response(JSON.stringify({ error: 'Provide colorName, colorHex or colorReferenceImage' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const colorDescriptor = [colorName, colorHex ? `(exact hex ${colorHex})` : '']
        .filter(Boolean).join(' ');

      const variantPrompt = `COLOR VARIANT GENERATION — STRICT RULES

GOAL
Generate the EXACT SAME product as in the [PRODUCT REFERENCE], but recolored to: ${colorDescriptor || 'the color shown in the [COLOR REFERENCE] image'}.

ABSOLUTE RULES
- The product must remain IDENTICAL in structure, fabric, cut, stitching, buttons, zippers, prints, logos, proportions and silhouette.
- ONLY the color of the product changes. Do NOT alter design, material or details.
- Do NOT invent new colors. Do NOT mix colors. Do NOT add gradients or patterns that are not in the reference.
${colorReferenceImage ? '- The new color must MATCH the [COLOR REFERENCE] image exactly.' : ''}
${colorHex ? `- The new color must match hex ${colorHex} as closely as physically plausible on the fabric.` : ''}
${Array.isArray(additionalReferences) && additionalReferences.length > 0 ? '- Use the [STYLE REFERENCE] images as inspiration for pose, framing, mood and styling — but do NOT copy them literally.' : ''}

CONSISTENCY (KEEP IDENTICAL TO REFERENCE)
- Same model identity (face, hair, body, skin tone) if a person is present
- Same background, setting and atmosphere
- Same lighting style, color temperature and shadow direction
- Same camera quality and photographic style (premium fashion editorial)

VARIATION (MUST DIFFER FROM REFERENCE)
- Different pose
- Different camera angle / framing
- Different facial expression (subtle, natural, never exaggerated)
${aspectRatio && RATIO_PROMPTS[aspectRatio] ? `\n${RATIO_PROMPTS[aspectRatio]}` : ''}
${extraInstruction ? `\nADDITIONAL DIRECTION: ${extraInstruction}` : ''}

NEGATIVE
- Do not change the garment design or proportions
- Do not change background or lighting
- Do not produce a flat color swatch — produce a full photographic shot
- Do not crop or cut the product
- No text, no watermark, no logo overlay

VARIETY SEED #${Math.floor(Math.random() * 9999)}

Generate a realistic, premium editorial photo of the SAME product recolored as specified, with a unique pose, angle and expression.`;

      const presetImages: { base64: string; mimeType: string; label: string }[] = [];
      if (colorReferenceImage && colorReferenceMimeType) {
        presetImages.push({
          base64: colorReferenceImage,
          mimeType: colorReferenceMimeType,
          label: 'COLOR REFERENCE',
        });
      }
      if (Array.isArray(additionalReferences)) {
        for (const ref of additionalReferences) {
          if (ref?.base64 && ref?.mimeType) {
            presetImages.push({
              base64: ref.base64,
              mimeType: ref.mimeType,
              label: ref.label || 'STYLE REFERENCE',
            });
          }
        }
      }

      const imageResult = await callGeminiImage(
        GEMINI_API_KEY,
        variantPrompt,
        baseImage,
        baseMimeType,
        presetImages.length > 0 ? presetImages : undefined,
      );

      // Try to upload to Supabase Storage
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
      const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

      if (SUPABASE_URL && SERVICE_ROLE_KEY) {
        try {
          const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
          const ext = imageResult.mimeType.includes('png') ? 'png' : 'webp';
          const safeName = (colorName || 'variant').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24);
          const fileName = `variant-${safeName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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

      // ─── Universal product-type strategy detection ───
      // Aplica-se a TODA geração de conteúdo (description, seo-title, seo-description).
      const detectedTypeRaw = productContext?.product_type || '';
      const { key: strategyKey, strategy } = detectProductType(detectedTypeRaw, title || brief);
      const strategyBlock = buildStrategyBlock(strategy, strategyKey);

      let systemPrompt = '';
      let userPrompt = '';

      if (type === 'title') {
        // Busca títulos já publicados para evitar repetição
        let publishedTitles: string[] = [];
        try {
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
          const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
          const adminClient = createClient(supabaseUrl, serviceKey);
          const { data: published } = await adminClient
            .from('published_products')
            .select('title')
            .order('created_at', { ascending: false })
            .limit(100);
          publishedTitles = (published || []).map((p: any) => p.title).filter(Boolean);
        } catch(e) {
          publishedTitles = [];
        }

        const allUsedNames = [...(Array.isArray(usedNames) ? usedNames : []), ...publishedTitles];
        const usedList = allUsedNames.length > 0
          ? `\n\nPREVIOUSLY USED TITLES — DO NOT REPEAT OR USE SIMILAR TO ANY OF THESE:\n${allUsedNames.join('\n')}`
          : '';
        systemPrompt = `You are the lead copywriter for Rilmont, a premium men's fashion brand selling in the United States, United Kingdom and Europe. Products are priced between $60 and $300. Aesthetic references: Mr Porter, COS, Arket, Norse Projects, Cos, A.P.C.

Your job is to generate ONE clean professional product title.

══════════════════════════════════
TITLE FORMAT (always follow this)
══════════════════════════════════
Men's [Treatment or Fit] [Material] [Garment Type]

══════════════════════════════════
MATERIAL NAMES — USE THESE EXACTLY
══════════════════════════════════
Cotton fabrics:
- Generic cotton → Pima Cotton or Supima Cotton
- Treated cotton → Garment-Dyed Cotton, Washed Cotton, Enzyme-Washed Cotton
- Loop cotton → French Terry
- Stretch cotton → Stretch Cotton

Linen fabrics:
- Generic linen → French Linen or Washed Linen
- Treated linen → Garment-Dyed Linen

Wool fabrics:
- Generic wool → Merino Wool
- Fine wool → Lambswool, Shetland Wool
- Thick wool → Double-Faced Wool, Boiled Wool

Silk and blends:
- Silk blend → Silk-Blend
- Ice silk → Ice Silk (acceptable for modern performance fabrics)

Fleece and knit:
- Fleece → Brushed Fleece or French Terry
- Generic knit → Fine-Knit, Ribbed Knit, Chunky Knit

Denim:
- Raw → Raw Denim
- Treated → Washed Denim, Stretch Denim

══════════════════════════════════
FIT AND TREATMENT WORDS
══════════════════════════════════
Fit: Slim-Fit, Relaxed-Fit, Regular-Fit, Tapered, Straight-Leg, Wide-Leg, Oversized
Treatment: Washed, Garment-Dyed, Brushed, Stonewashed, Ribbed, Striped, Textured, Quilted, Double-Faced, Bonded, Printed, Embroidered

══════════════════════════════════
GARMENT TYPE NAMES — USE EXACTLY
══════════════════════════════════
Tops: T-Shirt, Polo Shirt, Shirt, Overshirt, Henley, Tank Top
Knitwear: Sweater, Crewneck, V-Neck Sweater, Cardigan, Zip-Up Sweater, Rollneck Sweater
Outerwear: Jacket, Field Jacket, Bomber Jacket, Coach Jacket, Overcoat, Parka, Raincoat, Gilet
Bottoms: Trousers, Chino Trousers, Cargo Trousers, Shorts, Swim Shorts, Joggers
Suits: Blazer, Suit Jacket
Casual: Sweatshirt, Hoodie, Track Jacket, Track Pants

══════════════════════════════════
GOOD EXAMPLES
══════════════════════════════════
Men's Washed Linen Overshirt
Men's Striped Pima Cotton Polo Shirt
Men's Slim-Fit Merino Wool Trousers
Men's Garment-Dyed French Terry Sweatshirt
Men's Double-Faced Wool Overcoat
Men's Ribbed Cotton Crewneck Sweater
Men's Ice Silk Short-Sleeve Shirt
Men's Relaxed-Fit Chino Trousers
Men's Oversized Brushed Fleece Hoodie
Men's Tapered Stretch Denim Trousers
Men's Fine-Knit Merino Wool Cardigan
Men's Garment-Dyed Cotton Field Jacket

══════════════════════════════════
BAD EXAMPLES — NEVER DO THIS
══════════════════════════════════
2026 New Fashion Men's 100% Cotton T-Shirt Casual Style Design
Youth Casual Beach Short Sleeve Shirts Solid Color Loose Breathable
Summer Men's Polo Shirts Stripe Design Ice Silk Cool Touch
Black Knit Zip Jacket Warm Comfortable Fashion Men Outwear
AIOPESON Men's Cotton Stripe Tee Shirt Soft Comfortable O-Neck

══════════════════════════════════
TRANSFORMATION EXAMPLES
══════════════════════════════════
INPUT: "2026 New Fashion Men's 100% Cotton T-Shirts Solid Color O-Neck Soft Touch Comfortable Breathable Short Sleeve"
OUTPUT: Men's Pima Cotton Crewneck T-Shirt

INPUT: "Youth Casual Beach Short Sleeve Shirts Solid Color Loose Casual Breathable Shirt"
OUTPUT: Men's Relaxed-Fit Linen Short-Sleeve Shirt

INPUT: "Summer Men's Polo Shirts Stripe Design Ice Silk Short Sleeve Cool Touch Breathable"
OUTPUT: Men's Striped Ice Silk Polo Shirt

INPUT: "Black Knit Zip Jacket Warm Comfortable Fashion Men Outwear"
OUTPUT: Men's Ribbed Knit Zip-Up Jacket

INPUT: "Autumn Winter Men's Woolen Coat Double Breasted Lapel Collar Long Sleeve Overcoat"
OUTPUT: Men's Double-Breasted Merino Wool Overcoat

INPUT: "Men's Casual Linen Pants Summer Beach Drawstring Elastic Waist Trousers"
OUTPUT: Men's Relaxed-Fit French Linen Trousers

INPUT: "Streetwear Hip Hop Oversized Hoodie Men Fleece Pullover Sweatshirt"
OUTPUT: Men's Oversized Brushed Fleece Hoodie

INPUT: "Men's Slim Fit Business Casual Dress Shirt Long Sleeve Formal"
OUTPUT: Men's Slim-Fit Cotton Dress Shirt

══════════════════════════════════
STRICT RULES
══════════════════════════════════
✅ Always start with "Men's"
✅ Maximum 65 characters total
✅ Title Case for every word
✅ Be specific about material — never just say "Fabric" or "Textile"
✅ Be specific about garment type — never just say "Top" or "Bottom"
✅ Use the exact garment names from the list above

❌ Never include brand names or supplier names
❌ Never include percentages like 100%, 95%, 80%
❌ Never include years like 2024, 2025, 2026
❌ Never include model numbers or SKU codes
❌ Never include vague quality words: Fashion, Style, Casual, Design, New, Hot, Cool, Trendy, Modern, Classic, Premium, Luxury, High Quality, Best, Comfortable, Breathable, Soft, Nice, Good
❌ Never include origin words: Chinese, Asian, European, American
❌ Never include demographic words: Youth, Boys, Adult, Men (except the opening "Men's")
❌ Never include colors — colors belong in variants not in the title
❌ Never include sizes or measurements
❌ Never add quotes, explanations, options or any other text${contextBlock}${specsBlock}${usedList}

UNIQUENESS RULE: The generated title must NOT match or closely resemble any title in the PREVIOUSLY USED TITLES list above. If the title you are about to generate is too similar to one already used, choose a different treatment word, fit descriptor, or material synonym to make it distinct.

Return ONLY the final title. One single line. No quotes. No period at the end. Nothing else.`;
        userPrompt = customPrompt || brief || 'Generate a premium product title';
      } else if (type === 'description') {
        systemPrompt = `You are a senior copywriter for Rilmont, a luxury menswear brand on Shopify. Write product descriptions in ${lang.name}.\nBrand tone: ${toneLabel}.${genderLabel ? `\nTarget: ${genderLabel}.` : ''}${contextBlock}${specsBlock}${strategyBlock}\n\nWRITE EXACTLY 3 SENTENCES:\n1) Introduce the garment with material and defining style.\n2) Highlight construction, fit, and unique features specific to this product type — using the strategy "Focus" above.\n3) Describe the lifestyle and who wears it, using the brand tone and the strategy "Angle" above.\n\nRULES:\n- Write like Brunello Cucinelli, Loro Piana, or Zegna product pages.\n- Naturally weave in the strategy keywords; never keyword-stuff.\n- Skip empty fields silently — never mention them.\n- Never use exclamation marks.\n- Never use: "perfect for", "elevate your style", "versatile addition", "any occasion".\n- Each product must read uniquely — never reuse a structure verbatim.\n- Return ONLY the description text. No labels, no markdown, no quotes.`;
        userPrompt = customPrompt || `Write a product description for: ${title || brief}`;
      } else if (type === 'seo-title') {
        systemPrompt = `You are an SEO specialist for Rilmont luxury menswear. Write a Shopify SEO title in ${lang.name}.${contextBlock}${strategyBlock}\n\nFORMAT: [Primary Keyword] — [Key Feature] | Rilmont\n\nRULES:\n- Max 60 characters total (hard limit).\n- Lead with the most-searched keyword for this product category (use strategy keywords above).\n- Title Case. No quotes. No emojis. No exclamation marks.\n- Return ONLY the title, single line.`;
        userPrompt = `Optimize this product title for SEO: ${title || brief}`;
      } else if (type === 'seo-description') {
        systemPrompt = `You are an SEO specialist for Rilmont luxury menswear. Write a Shopify meta description in ${lang.name}.${contextBlock}${strategyBlock}\n\nRULES:\n- Max 155 characters (hard limit).\n- Start with an action verb.\n- Include product type + material + occasion as natural keywords (from strategy and context).\n- End with "Rilmont".\n- No exclamation marks. No quotes. No emojis.\n- Return ONLY the meta description, single line.`;
        userPrompt = `Write a meta description for: ${title || brief}`;
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
