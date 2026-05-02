import type { ImageStylePresetMeta } from './types';

export const IMAGE_STYLE_PRESETS: Record<string, ImageStylePresetMeta> = {
  'luxury-minimal': {
    id: 'luxury-minimal',
    label: 'Luxury Minimal',
    description: 'Cream warm, soft luxury aesthetic',
    backgroundColor: '#EDEAE3',
    promptKeywords: 'minimalist luxury, soft cream warm background, editorial photography, clean shadow, neutral 5500K lighting, SSENSE aesthetic',
  },
  'editorial-grey': {
    id: 'editorial-grey',
    label: 'Editorial',
    description: 'Medium grey, moody editorial',
    backgroundColor: '#B0B2B5',
    promptKeywords: 'editorial photography, medium cool grey gradient background, moody lighting from top-left, Highsnobiety aesthetic',
  },
  'studio-bright': {
    id: 'studio-bright',
    label: 'Studio Bright',
    description: 'Pure white, clean e-commerce',
    backgroundColor: '#FFFFFF',
    promptKeywords: 'clean e-commerce photography, pure white seamless background, soft diffused overhead lighting, Net-a-Porter style',
  },
  'dark-premium': {
    id: 'dark-premium',
    label: 'Dark Premium',
    description: 'Deep charcoal, luxury fashion',
    backgroundColor: '#1F1F22',
    promptKeywords: 'luxury fashion photography, deep charcoal background, dramatic key light from top-left, Bottega Veneta aesthetic',
  },
};

export const DEFAULT_PRESET: keyof typeof IMAGE_STYLE_PRESETS = 'luxury-minimal';
