export type CreateInputMode = 'links' | 'upload' | 'manual';

export type ImageStylePreset =
  | 'luxury-minimal'
  | 'editorial-grey'
  | 'studio-bright'
  | 'dark-premium';

export interface ImageStylePresetMeta {
  id: ImageStylePreset;
  label: string;
  description: string;
  backgroundColor: string;
  promptKeywords: string;
}

export interface CreateInput {
  mode: CreateInputMode;
  // mode='links'
  links?: string[];
  // mode='upload'
  files?: File[];
  // mode='manual'
  initialDescription?: string;
}

export interface CreateOptions {
  stylePreset: ImageStylePreset;
  storeId: string;
}
