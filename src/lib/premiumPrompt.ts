// ─── Premium Product Prompt Enhancer ───────────────────────────────────────
// Single source of truth for all image generation prompts in the app.
// Applied uniformly to: Step 1 (ImageGenerationStep), BulkVariantGenerator,
// and ImageGeneratorModule (standalone).

const LIGHT_TONE_KEYWORDS = [
  'white', 'branco', 'branca', 'ivory', 'marfim', 'cream', 'creme', 'beige', 'bege',
  'ecru', 'écru', 'off-white', 'sand', 'areia', 'champagne', 'pearl', 'pérola',
  'light gray', 'cinza claro', 'pale', 'claro', 'clara', 'nude', 'pastel',
];
const DARK_TONE_KEYWORDS = [
  'black', 'preto', 'preta', 'navy', 'marinho', 'dark brown', 'marrom escuro',
  'chocolate', 'charcoal', 'anthracite', 'antracite', 'grafite', 'midnight',
  'dark', 'escuro', 'escura', 'forest', 'wine', 'vinho', 'burgundy', 'bordô',
];

export type ProductTone = 'light' | 'dark' | 'unknown';

export function detectProductTone(prompt: string): ProductTone {
  const p = prompt.toLowerCase();
  const hasLight = LIGHT_TONE_KEYWORDS.some(k => p.includes(k));
  const hasDark = DARK_TONE_KEYWORDS.some(k => p.includes(k));
  if (hasDark && !hasLight) return 'dark';
  if (hasLight && !hasDark) return 'light';
  return 'unknown';
}

/**
 * Suggests a contrasting background description based on detected product tone.
 * Used when the caller has NOT explicitly chosen a background.
 */
export function suggestContrastBackground(tone: ProductTone): string {
  if (tone === 'light') {
    return 'sophisticated stone gray (#D8D4CC), warm oyster (#C8C2B4) or refined anthracite (#353330) background — must clearly contrast with the light product';
  }
  if (tone === 'dark') {
    return 'warm white (#F7F4EF), soft linen (#EAE5DC) or chalk greige (#E8E2D8) background — must clearly contrast with the dark product';
  }
  return 'sophisticated neutral warm background (soft ecru, light cream or warm beige) chosen to clearly contrast with the product tone';
}

export const UNIVERSAL_NEGATIVE_PROMPT =
  '--no people, person, model, face, hands, body, visible mannequin, harsh shadows, props, objects, plants, flowers, decor, busy background, texture on background, noise, pattern, clutter';

export interface PremiumPromptOptions {
  /** If the caller already chose a specific background (color name, hex, descriptor), pass it here. */
  chosenBackground?: string;
  /** Skip ghost mannequin (e.g., for accessories, shoes, bags, flat-lay shots). */
  skipGhostMannequin?: boolean;
}

/**
 * Wraps any base prompt with the full premium quality enhancement stack.
 * Applies uniformly to EVERY image generation call across the app.
 */
export function enhancePremiumPrompt(basePrompt: string, opts: PremiumPromptOptions = {}): string {
  const trimmed = basePrompt.trim();
  const tone = detectProductTone(trimmed);

  // 1) SMART CONTRAST
  const backgroundLine = opts.chosenBackground
    ? `Background: ${opts.chosenBackground}. The background color provides strong visual contrast with the garment, ensuring the product stands out clearly.`
    : `Background: ${suggestContrastBackground(tone)}. The background color provides strong visual contrast with the garment, ensuring the product stands out clearly.`;

  // 2) GHOST MANNEQUIN
  const ghostMannequin = opts.skipGhostMannequin
    ? ''
    : 'The garment is displayed on an invisible ghost mannequin with structured, well-defined shoulders and a perfectly fitted silhouette, giving the clothing a natural 3D form.';

  // 3) BREATHING ROOM
  const framing = 'The product occupies approximately 70% of the frame, with generous empty space on all sides. The composition is clean and balanced.';

  // 4) DIRECTIONAL LIGHT
  const lighting = 'Soft studio lighting from the upper left creates subtle volume, natural fabric texture, and gentle depth. No harsh shadows anywhere.';

  // 5) SUBTLE SHADOW
  const shadow = 'A very subtle, almost invisible drop shadow grounds the product at the base without drawing attention.';

  // 6) QUALITY SUFFIX
  const quality = 'Shot on medium format camera. Ultra-sharp detail on fabric weave, stitching, and buttons. High-end fashion e-commerce photography. Zegna, Canali, or Loro Piana product page quality. Photorealistic.';

  return `${trimmed}

━━━ PREMIUM PRODUCT PHOTOGRAPHY (MANDATORY) ━━━

${backgroundLine}

${ghostMannequin ? `PRESENTATION:\n${ghostMannequin}\n\n` : ''}FRAMING:
${framing}

LIGHTING:
${lighting}

SHADOW:
${shadow}

QUALITY:
${quality}

NEGATIVE: ${UNIVERSAL_NEGATIVE_PROMPT}`;
}

// ─── Luxury Fashion Model Shot Engine ──────────────────────────────────────
// Smart prompt engine that auto-selects pose / expression / lighting based on
// product type. Used by the "Model Shot" mode in the image generator.

export type ShotType = 'upper_body' | 'lower_body' | 'full_body' | 'shoes' | 'accessory';

export function detectShotType(productName: string): ShotType {
  const p = productName.toLowerCase();
  if (/\b(shirt|tee|t-shirt|henley|polo|sweater|knitwear|knit|cardigan|hoodie|camisa|camiseta|moletom|suéter|sueter|tricot)\b/.test(p)) return 'upper_body';
  if (/\b(pants|trousers|chino|chinos|jeans|shorts|calça|calca|bermuda)\b/.test(p)) return 'lower_body';
  if (/\b(suit|blazer|jacket|coat|overcoat|trench|parka|terno|paletó|paleto|jaqueta|casaco|sobretudo)\b/.test(p)) return 'full_body';
  if (/\b(shoes|sneaker|sneakers|boot|boots|loafer|loafers|oxford|oxfords|derby|sandália|sandalia|tênis|tenis|sapato|bota)\b/.test(p)) return 'shoes';
  if (/\b(belt|watch|wallet|bag|accessory|cinto|relógio|relogio|carteira|bolsa|acessório|acessorio)\b/.test(p)) return 'accessory';
  return 'full_body';
}

const POSE_LIBRARY: Record<ShotType, string[]> = {
  upper_body: [
    'standing with arms relaxed at sides, slight weight shift to right leg, looking directly at camera with calm authority',
    'one hand lightly resting in pocket, other arm relaxed, gaze slightly off camera to the left, contemplative expression',
    'arms crossed loosely at waist level, direct gaze, confident and composed',
  ],
  lower_body: [
    'standing straight, one foot slightly forward, hands in pockets, cropped at waist showing full trouser length',
    'walking stance, mid-stride, natural movement captured, cropped below waist',
  ],
  full_body: [
    'standing tall, one hand in pocket, other arm relaxed, weight on left leg, looking directly at camera',
    'three-quarter turn to the right, looking back at camera over shoulder, relaxed and confident',
    'walking slowly toward camera, natural stride, looking straight ahead with quiet intensity',
    'leaning very slightly against an invisible surface, arms relaxed, gaze off to the side',
  ],
  shoes: [
    'close-up of shoes on feet, model standing, cropped at ankle level, clean floor, perfect leather or material detail',
  ],
  accessory: [
    'ghost product on clean background, no model needed, product centered with soft shadows',
  ],
};

const EXPRESSION_LIBRARY = [
  'neutral expression, lips slightly closed, eyes calm and direct — quiet luxury',
  'subtle serious gaze, slight tension in jaw, looking past the camera — editorial confidence',
  'eyes half-focused into distance, face completely relaxed, effortless presence',
];

const LIGHTING_LIBRARY = [
  'soft Rembrandt lighting from upper left, gentle shadow on right cheek, warm and sculptural',
  'large softbox overhead diffused light, even skin tones, clean and editorial',
  'split between warm key light from left and soft fill from right, balanced and refined',
];

export const MODEL_SHOT_NEGATIVE =
  '--no women, no children, no groups, no visible mannequin, no props, no plants, no busy background, no streetwear, no athletic wear, no sneakers unless product, no text, no logos, no harsh shadows, no overexposed skin, no grain, no blur on product';

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export interface ModelShotSeed {
  pose: string;
  expression: string;
  lighting: string;
  shotType: ShotType;
}

export function rollModelShotSeed(productName: string): ModelShotSeed {
  const shotType = detectShotType(productName);
  return {
    shotType,
    pose: pickRandom(POSE_LIBRARY[shotType]),
    expression: pickRandom(EXPRESSION_LIBRARY),
    lighting: pickRandom(LIGHTING_LIBRARY),
  };
}

export interface ModelShotOptions {
  productName: string;
  backgroundColor?: string; // e.g. "warm cream", "stone gray", "soft ecru"
  age?: string; // default "28-35"
  seed?: ModelShotSeed; // pass an existing seed to keep pose stable across renders
}

/**
 * Builds the full luxury-fashion model-shot prompt.
 * Returns both the assembled prompt and the seed used (for "Regenerate Pose").
 */
export function buildModelShotPrompt(opts: ModelShotOptions): { prompt: string; seed: ModelShotSeed } {
  const seed = opts.seed ?? rollModelShotSeed(opts.productName);
  const age = opts.age ?? '28-35';
  const bg = opts.backgroundColor?.trim() || 'warm cream';

  // Accessory shot has no model — fall back to the standard premium product prompt
  if (seed.shotType === 'accessory') {
    const prompt = enhancePremiumPrompt(opts.productName, {
      chosenBackground: bg,
      skipGhostMannequin: true,
    });
    return { prompt, seed };
  }

  const prompt = `A high-end luxury fashion editorial photograph of a ${age} year old male model wearing ${opts.productName}. ${seed.pose}. ${seed.expression}. ${seed.lighting}. The background is a clean ${bg} seamless studio backdrop, completely empty. The product is the hero of the image — every detail of the fabric, stitching, and construction is visible. Shot on medium format camera, 85mm lens, shallow depth of field. Style reference: Ermenegildo Zegna, Brunello Cucinelli, Loro Piana, or Canali seasonal campaign. The image would appear in GQ, Vogue Hommes, or a luxury brand lookbook. Photorealistic, ultra high resolution, commercial quality.

NEGATIVE: ${MODEL_SHOT_NEGATIVE}`;

  return { prompt, seed };
}

