// Supported AI generation languages with locale-specific tones

export interface AILanguage {
  code: string; // unique key like 'en-US', 'pt-BR'
  flag: string;
  label: string; // PT-BR display name
  iso639: string; // base language code
  tone: string; // AI prompt tone description
}

export const AI_LANGUAGES: AILanguage[] = [
  { code: 'en-US', flag: '🇺🇸', label: 'Inglês (EUA)', iso639: 'en', tone: 'casual, direct, value-focused' },
  { code: 'en-GB', flag: '🇬🇧', label: 'Inglês (UK)', iso639: 'en', tone: 'slightly formal, quality-focused' },
  { code: 'en-AU', flag: '🇦🇺', label: 'Inglês (AU)', iso639: 'en', tone: 'casual, friendly, relaxed' },
  { code: 'en-CA', flag: '🇨🇦', label: 'Inglês (CA)', iso639: 'en', tone: 'polite, inclusive, value-focused' },
  { code: 'pt-BR', flag: '🇧🇷', label: 'Português (BR)', iso639: 'pt', tone: 'friendly, casual, relatable' },
  { code: 'pt-PT', flag: '🇵🇹', label: 'Português (PT)', iso639: 'pt', tone: 'formal, elegant, quality-focused' },
  { code: 'es-ES', flag: '🇪🇸', label: 'Espanhol (ES)', iso639: 'es', tone: 'warm, expressive, quality-focused' },
  { code: 'es-MX', flag: '🇲🇽', label: 'Espanhol (MX)', iso639: 'es', tone: 'warm, casual, value-focused' },
  { code: 'es-AR', flag: '🇦🇷', label: 'Espanhol (AR)', iso639: 'es', tone: 'casual, expressive, authentic' },
  { code: 'es-CO', flag: '🇨🇴', label: 'Espanhol (CO)', iso639: 'es', tone: 'polite, warm, friendly' },
  { code: 'de-DE', flag: '🇩🇪', label: 'Alemão', iso639: 'de', tone: 'precise, quality-oriented, detail-focused' },
  { code: 'fr-FR', flag: '🇫🇷', label: 'Francês (FR)', iso639: 'fr', tone: 'elegant, lifestyle-focused' },
  { code: 'fr-CA', flag: '🇨🇦', label: 'Francês (CA)', iso639: 'fr', tone: 'friendly, practical, inclusive' },
  { code: 'it-IT', flag: '🇮🇹', label: 'Italiano', iso639: 'it', tone: 'stylish, fashion-forward' },
  { code: 'nl-NL', flag: '🇳🇱', label: 'Holandês', iso639: 'nl', tone: 'direct, practical, quality-focused' },
  { code: 'sv-SE', flag: '🇸🇪', label: 'Sueco', iso639: 'sv', tone: 'minimalist, design-focused, sustainable' },
  { code: 'no-NO', flag: '🇳🇴', label: 'Norueguês', iso639: 'no', tone: 'clean, functional, quality-focused' },
  { code: 'da-DK', flag: '🇩🇰', label: 'Dinamarquês', iso639: 'da', tone: 'hygge-inspired, cozy, quality-focused' },
  { code: 'fi-FI', flag: '🇫🇮', label: 'Finlandês', iso639: 'fi', tone: 'minimalist, honest, functional' },
  { code: 'pl-PL', flag: '🇵🇱', label: 'Polonês', iso639: 'pl', tone: 'warm, value-focused, practical' },
  { code: 'cs-CZ', flag: '🇨🇿', label: 'Tcheco', iso639: 'cs', tone: 'practical, detail-oriented, quality-focused' },
  { code: 'ro-RO', flag: '🇷🇴', label: 'Romeno', iso639: 'ro', tone: 'warm, expressive, value-focused' },
  { code: 'hu-HU', flag: '🇭🇺', label: 'Húngaro', iso639: 'hu', tone: 'creative, quality-focused, expressive' },
  { code: 'el-GR', flag: '🇬🇷', label: 'Grego', iso639: 'el', tone: 'warm, Mediterranean lifestyle-focused' },
  { code: 'tr-TR', flag: '🇹🇷', label: 'Turco', iso639: 'tr', tone: 'warm, hospitable, value-focused' },
  { code: 'ru-RU', flag: '🇷🇺', label: 'Russo', iso639: 'ru', tone: 'practical, quality and durability-focused' },
  { code: 'uk-UA', flag: '🇺🇦', label: 'Ucraniano', iso639: 'uk', tone: 'warm, patriotic, quality-focused' },
  { code: 'ar-AE', flag: '🇦🇪', label: 'Árabe (EAU)', iso639: 'ar', tone: 'formal, quality and luxury focused' },
  { code: 'ar-SA', flag: '🇸🇦', label: 'Árabe (SA)', iso639: 'ar', tone: 'formal, prestigious, luxury focused' },
  { code: 'he-IL', flag: '🇮🇱', label: 'Hebraico', iso639: 'he', tone: 'direct, innovative, quality-focused' },
  { code: 'hi-IN', flag: '🇮🇳', label: 'Hindi', iso639: 'hi', tone: 'vibrant, value-focused, family-oriented' },
  { code: 'ja-JP', flag: '🇯🇵', label: 'Japonês', iso639: 'ja', tone: 'polite, detail-oriented, formal' },
  { code: 'zh-CN', flag: '🇨🇳', label: 'Chinês Simplificado', iso639: 'zh', tone: 'practical, value and quality focused' },
  { code: 'zh-TW', flag: '🇹🇼', label: 'Chinês Tradicional', iso639: 'zh', tone: 'elegant, quality-focused, refined' },
  { code: 'ko-KR', flag: '🇰🇷', label: 'Coreano', iso639: 'ko', tone: 'trendy, K-culture inspired, youthful' },
  { code: 'th-TH', flag: '🇹🇭', label: 'Tailandês', iso639: 'th', tone: 'polite, friendly, value-focused' },
  { code: 'vi-VN', flag: '🇻🇳', label: 'Vietnamita', iso639: 'vi', tone: 'friendly, practical, value-focused' },
  { code: 'id-ID', flag: '🇮🇩', label: 'Indonésio', iso639: 'id', tone: 'friendly, respectful, value-focused' },
  { code: 'ms-MY', flag: '🇲🇾', label: 'Malaio', iso639: 'ms', tone: 'polite, respectful, practical' },
];

// Map ISO 639-1 language code to best AI language match
const LANGUAGE_MAP: Record<string, string> = {
  en: 'en-US', pt: 'pt-BR', es: 'es-ES', de: 'de-DE', fr: 'fr-FR',
  it: 'it-IT', nl: 'nl-NL', sv: 'sv-SE', no: 'no-NO', da: 'da-DK',
  fi: 'fi-FI', pl: 'pl-PL', cs: 'cs-CZ', ro: 'ro-RO', hu: 'hu-HU',
  el: 'el-GR', tr: 'tr-TR', ru: 'ru-RU', uk: 'uk-UA', ar: 'ar-AE',
  he: 'he-IL', hi: 'hi-IN', ja: 'ja-JP', zh: 'zh-CN', ko: 'ko-KR',
  th: 'th-TH', vi: 'vi-VN', id: 'id-ID', ms: 'ms-MY',
};

export function getAILanguageForCountry(iso639: string): AILanguage {
  const code = LANGUAGE_MAP[iso639] || 'en-US';
  return AI_LANGUAGES.find(l => l.code === code) || AI_LANGUAGES[0];
}

export function getAILanguageByCode(code: string): AILanguage | undefined {
  return AI_LANGUAGES.find(l => l.code === code);
}
