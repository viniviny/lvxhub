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
    prompt_text: 'High-end menswear product photography, {product_name} in {color} on a dark walnut wooden hanger, warm cream or soft ecru background, soft directional studio lighting, subtle drop shadow, sharp fabric texture detail, full garment visible, clean minimal composition. Inspired by Loro Piana and Brunello Cucinelli catalog photography. No text, no logos, no watermarks, no overlays, pure product photography only.',
    icon: Image,
    badge: 'E-commerce',
    badgeColor: 'bg-blue-500/15 text-blue-400',
  },
  {
    id: 'tpl-rilmont-lifestyle',
    name: 'Rilmont — Gentleman Lifestyle',
    category: 'imagem',
    prompt_text: 'Premium menswear lifestyle campaign photograph, sophisticated man aged 30-50, well-groomed, wearing {product_name} in {color}, warm upscale interior setting — dark wood panelling, leather furniture, fireplace or library — soft natural window light, relaxed confident posture, serious refined expression, shallow depth of field, muted warm film tones. Inspired by Tom Ford and Ralph Lauren Purple Label campaigns. No text, no logos, no watermarks, no overlays, no typography.',
    icon: Eye,
    badge: 'Lifestyle',
    badgeColor: 'bg-amber-500/15 text-amber-400',
  },
  {
    id: 'tpl-rilmont-editorial',
    name: 'Rilmont — Editorial Urbano',
    category: 'imagem',
    prompt_text: 'High fashion editorial photograph, stylish man aged 28-45 wearing {product_name} in {color}, European urban setting — stone buildings, wide empty avenue, private club entrance — overcast or golden hour light, confident purposeful stride, complete tailored look, cinematic color grading with rich shadows and warm highlights. Inspired by Zegna and Canali editorial campaigns. Absolutely no text, no logos, no watermarks, no overlays anywhere in the image.',
    icon: Layout,
    badge: 'Editorial',
    badgeColor: 'bg-purple-500/15 text-purple-400',
  },
  {
    id: 'tpl-rilmont-detalhe',
    name: 'Rilmont — Detalhe de Craft',
    category: 'imagem',
    prompt_text: 'Luxury fashion macro detail photography, extreme close-up of {product_name} fabric in {color}, revealing weave pattern, yarn texture, stitching precision and material quality, placed on dark walnut wood or natural stone surface, Rembrandt-style single-source lighting from above, ultra sharp focus, rich tonal contrast. Inspired by Loro Piana and Isaia material photography. No text, no logos, no watermarks, no overlays.',
    icon: ZoomIn,
    badge: 'Macro',
    badgeColor: 'bg-emerald-500/15 text-emerald-400',
  },
  {
    id: 'tpl-rilmont-look',
    name: 'Rilmont — Look Completo',
    category: 'imagem',
    prompt_text: 'Premium menswear full look campaign photograph, confident man aged 28-50 wearing {product_name} in {color} as the centerpiece, complete outfit with tailored trousers, leather belt and oxford shoes, minimal neutral studio or architectural interior backdrop, controlled directional lighting with deep shadows, three-quarter body angle, serious composed expression, magazine-quality photography. Inspired by Tom Ford, Zegna and Brioni campaign photography. No text, no logos, no watermarks, no overlays, no typography anywhere.',
    icon: Shirt,
    badge: 'Outfit',
    badgeColor: 'bg-rose-500/15 text-rose-400',
  },
];
