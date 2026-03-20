export type ProductSize = 'PP' | 'P' | 'M' | 'G' | 'GG';

export type ProductStatus = 'rascunho' | 'publicado';

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
  sizes: ProductSize[];
  collection: string;
  imagePrompt: string;
}

export const AVAILABLE_SIZES: ProductSize[] = ['PP', 'P', 'M', 'G', 'GG'];

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
