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
  imageInsights: ImageInsights;
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
  imageInsights: { ...EMPTY_IMAGE_INSIGHTS },
};

/** Resolve finalProductType from priority chain */
export function resolveFinalProductType(
  manual: string | null,
  aiDetected: string | null,
  titleFallback?: string
): string | null {
  if (manual && manual.trim()) return manual.trim();
  if (aiDetected && aiDetected.trim()) return aiDetected.trim();
  // Lightweight text-based fallback from title
  if (titleFallback && titleFallback.trim()) {
    return inferProductTypeFromText(titleFallback);
  }
  return null;
}

const TYPE_KEYWORDS = [
  'blazer', 'jacket', 'hoodie', 'sweater', 'shirt', 't-shirt', 'tee',
  'tank top', 'polo', 'pants', 'shorts', 'dress', 'skirt', 'handbag',
  'bag', 'shoes', 'sneakers', 'hat', 'belt', 'scarf', 'swimwear',
  'coat', 'vest', 'jeans', 'cardigan', 'blouse',
  // Portuguese equivalents
  'camiseta', 'camisa', 'calça', 'bermuda', 'vestido', 'saia', 'bolsa',
  'sapato', 'tênis', 'boné', 'chapéu', 'cinto', 'cachecol', 'jaqueta',
  'moletom', 'casaco', 'colete', 'regata',
];

function inferProductTypeFromText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const kw of TYPE_KEYWORDS) {
    if (lower.includes(kw)) {
      return kw.charAt(0).toUpperCase() + kw.slice(1);
    }
  }
  return null;
}
