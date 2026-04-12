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
    id: 'tpl-rilmont-cabide',
    name: 'Rilmont — Cabide Premium',
    category: 'imagem',
    prompt_text: 'High-end fashion product photography of a {product_name} in {color} hanging on a dark walnut wooden hanger, isolated on a warm cream or soft beige background, soft diffused studio lighting with subtle shadow at base, photorealistic texture detail showing fabric quality, full garment visible, clean and minimal — Rilmont brand identity, luxury British menswear catalog style, 4K resolution.',
    icon: Image,
    badge: 'E-commerce',
    badgeColor: 'bg-blue-500/15 text-blue-400',
  },
  {
    id: 'tpl-rilmont-lifestyle',
    name: 'Rilmont — Gentleman Lifestyle',
    category: 'imagem',
    prompt_text: "Premium menswear lifestyle fashion photograph of a distinguished man aged 45-60, groomed beard and glasses, wearing {product_name} in {color}, seated or standing in a warm sophisticated interior — dark wood furniture, leather armchair, bookshelf or study room — natural window light from the side, confident and calm expression, quiet elegance, no smiling, editorial magazine style — Rilmont 'The Mark of a Refined Gentleman' brand aesthetic, Canon 5D shallow depth of field.",
    icon: Eye,
    badge: 'Lifestyle',
    badgeColor: 'bg-amber-500/15 text-amber-400',
  },
  {
    id: 'tpl-rilmont-editorial',
    name: 'Rilmont — Editorial Urbano',
    category: 'imagem',
    prompt_text: 'Editorial fashion photography of a refined British gentleman in his 50s wearing {product_name} in {color}, urban European setting — stone architecture, cobblestone street, private members club exterior — overcast natural light, purposeful confident stride, tailored complete look with coordinated trousers and leather oxford shoes, film-like color grading with warm shadows — Rilmont refined menswear campaign, Vogue Hommes editorial style, 35mm lens aesthetic.',
    icon: Layout,
    badge: 'Editorial',
    badgeColor: 'bg-purple-500/15 text-purple-400',
  },
  {
    id: 'tpl-rilmont-detalhe',
    name: 'Rilmont — Detalhe de Craft',
    category: 'imagem',
    prompt_text: 'Luxury fashion macro photography of the fabric detail and construction of a {product_name} in {color} — extreme close-up showing the weave, ribbing, stitching precision and material texture — dark walnut surface or natural linen background — Rembrandt lighting, ultra sharp focus, emphasizing British craftsmanship and premium material quality — Rilmont brand detail shot, Wallpaper magazine product photography style.',
    icon: ZoomIn,
    badge: 'Macro',
    badgeColor: 'bg-emerald-500/15 text-emerald-400',
  },
  {
    id: 'tpl-rilmont-look',
    name: 'Rilmont — Look Completo',
    category: 'imagem',
    prompt_text: 'Full look fashion photograph of a distinguished mature gentleman wearing {product_name} in {color} as the centerpiece, complete outfit with tailored trousers, leather belt and oxford shoes — minimal interior or neutral studio backdrop — controlled studio lighting with dramatic shadows, serious confident posture, arms relaxed, side or three-quarter angle — Rilmont complete outfit campaign image, luxury menswear brand catalogue, sophisticated and restrained.',
    icon: Shirt,
    badge: 'Outfit',
    badgeColor: 'bg-rose-500/15 text-rose-400',
  },
];
