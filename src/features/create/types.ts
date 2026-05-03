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

export type JobStepId =
  | 'import'
  | 'analyze'
  | 'recreate-images'
  | 'generate-text'
  | 'calculate-price';

export type JobStepStatus = 'pending' | 'doing' | 'done' | 'error';

export interface JobStep {
  id: JobStepId;
  label: string;
  sublabel: string;
  status: JobStepStatus;
  startedAt?: number;
  finishedAt?: number;
  error?: string;
}

export type JobStatus = 'idle' | 'running' | 'success' | 'error' | 'cancelled';

export interface CreateJobResult {
  productId?: string;
  title: string;
  description: string;
  category?: string;
  material?: string;
  images: { url: string; angle: string }[];
  variants: { type: string; values: string[] }[];
  pricing: {
    cost?: number;
    suggestedPrice: number;
    multiplier: number;
  };
  rawSourceUrl?: string;
}

export interface CreateJob {
  id: string;
  status: JobStatus;
  steps: JobStep[];
  startedAt: number;
  finishedAt?: number;
  result?: CreateJobResult;
  error?: string;
}
