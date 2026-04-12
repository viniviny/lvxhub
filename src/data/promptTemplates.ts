import { Image, Eye, ZoomIn, Layout, Shirt } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  prompt_text: string;
  icon: LucideIcon;
  badge: string;
  badgeColor: string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'tpl-fundo-neutro',
    name: 'Foto Produto - Fundo Neutro',
    category: 'imagem',
    prompt_text: 'Professional menswear product photo of {product_name} in {color}, displayed on invisible mannequin or flat lay, pure white or light grey background, soft studio lighting with subtle shadows, sharp focus on fabric texture and stitching details, high-end e-commerce style, photorealistic, 4K quality.',
    icon: Image,
    badge: 'E-commerce',
    badgeColor: 'bg-blue-500/15 text-blue-400',
  },
  {
    id: 'tpl-lifestyle',
    name: 'Lifestyle - Modelo Masculino',
    category: 'imagem',
    prompt_text: 'Lifestyle fashion photo of an elegant man wearing {product_name} in {color}, urban setting or modern minimal interior, natural daylight, authentic candid pose, 25-35 years old male model with confident expression, editorial magazine style, shallow depth of field, warm tones. Premium menswear brand aesthetic.',
    icon: Eye,
    badge: 'Lifestyle',
    badgeColor: 'bg-amber-500/15 text-amber-400',
  },
  {
    id: 'tpl-detalhe',
    name: 'Detalhe - Textura e Acabamento',
    category: 'imagem',
    prompt_text: 'Extreme close-up macro photo of {product_name} fabric texture in {color}, showing weave pattern, material quality and fine stitching details, soft diffused lighting, ultra sharp focus, luxury fashion detail shot.',
    icon: ZoomIn,
    badge: 'Macro',
    badgeColor: 'bg-emerald-500/15 text-emerald-400',
  },
  {
    id: 'tpl-flat-lay',
    name: 'Flat Lay - Composição Editorial',
    category: 'imagem',
    prompt_text: 'Overhead flat lay editorial photo of {product_name} in {color} arranged neatly on clean white surface, styled with complementary accessories (watch, belt), top-down perspective, perfect symmetry, fashion magazine composition, natural soft lighting, premium menswear lookbook style.',
    icon: Layout,
    badge: 'Editorial',
    badgeColor: 'bg-purple-500/15 text-purple-400',
  },
  {
    id: 'tpl-look-completo',
    name: 'Look Completo - Outfit',
    category: 'imagem',
    prompt_text: 'Full outfit fashion photo featuring {product_name} in {color} as the hero piece, styled in a complete menswear look with coordinated pants and shoes, male model in neutral pose, clean studio background or minimal urban setting, professional fashion photography, brand campaign style.',
    icon: Shirt,
    badge: 'Outfit',
    badgeColor: 'bg-rose-500/15 text-rose-400',
  },
];
