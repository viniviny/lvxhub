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
