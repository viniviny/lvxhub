export type ProductGender = 'masculino' | 'feminino' | 'unissex' | 'infantil' | '';

export type ProductSize = string;

export type ProductStatus = 'rascunho' | 'publicado';

export type WeightUnit = 'kg' | 'lb' | 'g' | 'oz';

export interface VariantData {
  id: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  cost: number | null;
  sku: string;
  stock: number;
  requiresShipping: boolean;
  weight: number;
  weightUnit: WeightUnit;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  sizes: ProductSize[];
  collection: string;
  imagePrompt: string;
  imageUrl: string | null;
  status: ProductStatus;
  shopifyUrl: string | null;
  createdAt: string;
}

export interface ProductFormData {
  title: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  cost: number | null;
  sizes: ProductSize[];
  collection: string;
  imagePrompt: string;
  variants: VariantData[];
  inventoryPolicy: 'continue' | 'deny';
  requiresShipping: boolean;
  weight: number;
  weightUnit: WeightUnit;
  countryOfOrigin: string;
  selectedChannels: string[];
  tags: string;
  productType: string;
  gender: ProductGender;
  pricingCurrency: string;
  pricingCpa: number;
  pricingMargin: number;
  pricingShipping: number;
  pricingPlatform: string;
}

export const AVAILABLE_SIZES: ProductSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export const COLLECTIONS = [
  'Casual',
  'Streetwear',
  'Fitness',
  'Formal',
  'Acessórios',
  'Calçados',
  'Inverno',
  'Verão',
];

export function generateSKU(productType: string, size: string, color?: string): string {
  const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  const parts = [clean(productType || 'PROD'), clean(size)];
  if (color) parts.push(clean(color));
  return parts.join('-');
}

export function calculateMargin(price: number, cost: number | null): { margin: number; percent: number; color: string } | null {
  if (!cost || cost <= 0 || price <= 0) return null;
  const margin = price - cost;
  const percent = (margin / price) * 100;
  const color = percent >= 40 ? 'text-[hsl(var(--success))]' : percent >= 20 ? 'text-[hsl(var(--warning))]' : 'text-destructive';
  return { margin, percent, color };
}

export function calculateDiscount(price: number, compareAtPrice: number | null): number | null {
  if (!compareAtPrice || compareAtPrice <= price) return null;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}
