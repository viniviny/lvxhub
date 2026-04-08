import { ProductFormData } from './product';
import { ProductUnderstanding } from './productUnderstanding';
import { GeneratedImage } from '@/components/ImageGenerationStep';
import type { ProductSpecs } from '@/hooks/useProductSpecs';

export interface ProjectProductData {
  title: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  cost: number | null;
  sizes: string[];
  collection: string;
  imagePrompt: string;
  variants: any[];
  inventoryPolicy: string;
  requiresShipping: boolean;
  weight: number;
  weightUnit: string;
  countryOfOrigin: string;
  selectedChannels: string[];
  tags: string;
  productType: string;
  gender: string;
  pricingCurrency: string;
  pricingCpa: number;
  pricingMargin: number;
  pricingShipping: number;
  pricingPlatform: string;
}

export interface ProjectAIData {
  manualProductType: string | null;
  aiDetectedProductType: string | null;
  finalProductType: string | null;
  selectedTitlePromptId: string | null;
  selectedDescriptionPromptId: string | null;
  imageInsights: any | null;
}

export interface ProjectSEOData {
  seoTitle: string;
  seoDescription: string;
}

export interface ProjectImage {
  id: string;
  url: string;
  storagePath: string | null;
  isCover: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
  step: number;
  productData: ProjectProductData;
  aiData: ProjectAIData;
  seoData: ProjectSEOData;
  specs: ProductSpecs | null;
  images: ProjectImage[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const EMPTY_PRODUCT_DATA: ProjectProductData = {
  title: '',
  description: '',
  price: 0,
  compareAtPrice: null,
  cost: null,
  sizes: [],
  collection: '',
  imagePrompt: '',
  variants: [],
  inventoryPolicy: 'continue',
  requiresShipping: true,
  weight: 0,
  weightUnit: 'kg',
  countryOfOrigin: '',
  selectedChannels: ['online'],
  tags: '',
  productType: '',
  gender: '',
  pricingCurrency: 'USD',
  pricingCpa: 5,
  pricingMargin: 60,
  pricingShipping: 0,
  pricingPlatform: 'shopify',
};

export const EMPTY_AI_DATA: ProjectAIData = {
  manualProductType: null,
  aiDetectedProductType: null,
  finalProductType: null,
  selectedTitlePromptId: null,
  selectedDescriptionPromptId: null,
  imageInsights: null,
};

export const EMPTY_SEO_DATA: ProjectSEOData = {
  seoTitle: '',
  seoDescription: '',
};
