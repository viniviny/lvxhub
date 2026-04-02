export interface ImageInsights {
  style: string | null;
  mainColor: string | null;
  secondaryColor: string | null;
  materialLook: string | null;
  silhouette: string | null;
  visualDetails: string[];
  tagsFromImage: string[];
}

export interface ProductUnderstanding {
  manualProductType: string | null;
  aiDetectedProductType: string | null;
  finalProductType: string | null;
  manualMaterial: string;
  manualStyle: string;
  manualColor: string;
  manualFit: string;
  useCase: string;
  imageInsights: ImageInsights;
  selectedTitlePromptId: string | null;
  selectedDescriptionPromptId: string | null;
}

export const EMPTY_IMAGE_INSIGHTS: ImageInsights = {
  style: null,
  mainColor: null,
  secondaryColor: null,
  materialLook: null,
  silhouette: null,
  visualDetails: [],
  tagsFromImage: [],
};

export const EMPTY_UNDERSTANDING: ProductUnderstanding = {
  manualProductType: null,
  aiDetectedProductType: null,
  finalProductType: null,
  manualMaterial: '',
  manualStyle: '',
  manualColor: '',
  manualFit: '',
  useCase: '',
  imageInsights: { ...EMPTY_IMAGE_INSIGHTS },
  selectedTitlePromptId: null,
  selectedDescriptionPromptId: null,
};

/** Resolve finalProductType from priority chain */
export function resolveFinalProductType(
  manual: string | null,
  aiDetected: string | null,
  titleFallback?: string
): string | null {
  if (manual && manual.trim()) return manual.trim();
  if (aiDetected && aiDetected.trim()) return aiDetected.trim();
  if (titleFallback && titleFallback.trim()) {
    return inferProductTypeFromText(titleFallback);
  }
  return null;
}

/** Resolve a field with priority: manual > image insight > fallback */
function resolveField(manual: string, imageValue: string | null): string {
  if (manual && manual.trim()) return manual.trim();
  if (imageValue && imageValue.trim()) return imageValue.trim();
  return '';
}

export interface ProductAIContext {
  product_type: string;
  gender: string;
  style: string;
  main_color: string;
  material_look: string;
  fit: string;
  use_case: string;
  visual_details: string;
  tags: string;
  language: string;
}

/** Build the resolved AI context from understanding + form data */
export function buildProductAIContext(
  understanding: ProductUnderstanding,
  gender: string,
  tags: string,
  language: string
): ProductAIContext {
  const ins = understanding.imageInsights;
  return {
    product_type: understanding.finalProductType || '',
    gender: gender || '',
    style: resolveField(understanding.manualStyle, ins.style),
    main_color: resolveField(understanding.manualColor, ins.mainColor),
    material_look: resolveField(understanding.manualMaterial, ins.materialLook),
    fit: resolveField(understanding.manualFit, ins.silhouette),
    use_case: understanding.useCase || '',
    visual_details: ins.visualDetails.length > 0 ? ins.visualDetails.join(', ') : '',
    tags: [tags, ...(ins.tagsFromImage || [])].filter(Boolean).join(', '),
    language,
  };
}

/** Inject context variables into a prompt template */
export function injectPromptVariables(promptText: string, context: ProductAIContext): string {
  let result = promptText;
  const entries = Object.entries(context) as [string, string][];
  for (const [key, value] of entries) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  // Clean up any remaining unreplaced variables
  result = result.replace(/\{\{[a-z_]+\}\}/g, '');
  return result.trim();
}

const TYPE_KEYWORDS = [
  'cardigan', 'sweater', 'blazer', 'knit jacket', 'jacket', 'hoodie',
  't-shirt', 'tee', 'tank top', 'shirt', 'pants', 'shorts',
  'camiseta', 'camisa', 'calça', 'bermuda', 'jaqueta', 'moletom', 'casaco', 'colete', 'regata',
];

const FORBIDDEN_WORDS = [
  'wool', 'cotton', 'polyester', 'denim', 'leather', 'knit',
  'slim', 'casual', 'premium', 'lã', 'algodão', 'poliéster', 'couro',
];

/** Clean AI-detected product type by stripping material/style words */
export function cleanProductType(rawType: string | null): string | null {
  if (!rawType) return null;
  let type = rawType.toLowerCase();
  for (const word of FORBIDDEN_WORDS) {
    type = type.replace(new RegExp(`\\b${word}\\b`, 'g'), '');
  }
  type = type.replace(/\s+/g, ' ').trim();
  if (type.includes('cardigan')) return 'Cardigan';
  if (type.includes('sweater')) return 'Sweater';
  if (type.includes('knit jacket')) return 'Knit Jacket';
  if (type.includes('jacket')) return 'Jacket';
  if (type.includes('blazer')) return 'Blazer';
  if (type.includes('hoodie')) return 'Hoodie';
  if (type.includes('t-shirt') || type.includes('tee')) return 'T-Shirt';
  if (type.includes('tank top')) return 'Tank Top';
  if (type.includes('shirt')) return 'Shirt';
  if (type.includes('pants')) return 'Pants';
  if (type.includes('shorts')) return 'Shorts';
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : null;
}

function inferProductTypeFromText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const kw of TYPE_KEYWORDS) {
    if (lower.includes(kw)) {
      return kw.charAt(0).toUpperCase() + kw.slice(1);
    }
  }
  return null;
}
