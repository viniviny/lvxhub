import { useState } from 'react';
import { ProductFormData, calculateDiscount } from '@/types/product';
import { GeneratedImage } from '@/components/ImageGenerationStep';
import { ChevronDown, ChevronRight, ShoppingCart, Search, User, Star } from 'lucide-react';

interface ShopifyProductPreviewProps {
  form: ProductFormData;
  images: GeneratedImage[];
  imagePreview: string | null;
  storeDomain: string;
  currencySymbol: string;
}

export function ShopifyProductPreview({ form, images, imagePreview, storeDomain, currencySymbol }: ShopifyProductPreviewProps) {
  const allImages = images.filter(i => i.url).map(i => ({ url: i.url!, label: i.angle }));
  if (imagePreview && !allImages.some(i => i.url === imagePreview)) {
    allImages.unshift({ url: imagePreview, label: 'Capa' });
  }

  const [mainImage, setMainImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(form.sizes[0] || form.variants[0]?.name || '');
  const [openAccordion, setOpenAccordion] = useState<string | null>('description');
  const [qty, setQty] = useState(1);

  const discount = calculateDiscount(form.price, form.compareAtPrice);
  const handle = form.title ? form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'product';
  const displayDomain = storeDomain || 'your-store.myshopify.com';

  const currentImg = allImages[mainImage]?.url || '';

  return (
    <div className="flex flex-col">
      {/* Label */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">Pré-visualização da página do produto</span>
        <span className="text-[11px] text-muted-foreground">Como o cliente vai ver ↓</span>
      </div>

      {/* Browser frame */}
      <div className="rounded-xl border border-[hsl(220,13%,87%)] overflow-hidden bg-white">
        {/* Browser bar */}
        <div className="flex items-center h-9 bg-[hsl(220,14%,97%)] border-b border-[hsl(220,13%,90%)] px-3 gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[hsl(0,80%,65%)]" />
            <div className="w-3 h-3 rounded-full bg-[hsl(45,90%,60%)]" />
            <div className="w-3 h-3 rounded-full bg-[hsl(140,60%,50%)]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-white border border-[hsl(220,13%,87%)] rounded-full px-3 py-0.5 text-[11px] text-[hsl(220,9%,46%)] max-w-[60%] truncate text-center">
              https://{displayDomain}/products/{handle}
            </div>
          </div>
          <span className="text-[10px] bg-[hsl(225,100%,96%)] text-[hsl(245,58%,51%)] rounded-full px-2 py-0.5 font-medium">Preview</span>
        </div>

        {/* Store header */}
        <div className="flex items-center justify-between h-[52px] px-6 border-b border-[hsl(220,14%,96%)] bg-white">
          <span className="text-sm font-semibold text-[hsl(220,13%,13%)]">{displayDomain.replace('.myshopify.com', '')}</span>
          <div className="flex items-center gap-5 text-xs text-[hsl(220,9%,46%)]">
            <span className="hover:text-[hsl(220,13%,13%)] cursor-default">Home</span>
            <span className="hover:text-[hsl(220,13%,13%)] cursor-default">Collections</span>
            <span className="hover:text-[hsl(220,13%,13%)] cursor-default">About</span>
          </div>
          <div className="flex items-center gap-3 text-[hsl(220,9%,46%)]">
            <Search className="w-4 h-4" />
            <User className="w-4 h-4" />
            <ShoppingCart className="w-4 h-4" />
          </div>
        </div>

        {/* Product content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
          {/* Left - images */}
          <div className="space-y-2">
            <div className="aspect-square rounded-lg bg-[hsl(220,14%,97%)] overflow-hidden border border-[hsl(220,13%,93%)]">
              {currentImg ? (
                <img src={currentImg} alt={form.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[hsl(220,9%,76%)] text-sm">Sem imagem</div>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setMainImage(i)}
                    className={`w-14 h-14 rounded-md overflow-hidden border-2 flex-shrink-0 transition-all ${i === mainImage ? 'border-[hsl(220,13%,13%)]' : 'border-[hsl(220,13%,90%)] hover:border-[hsl(220,13%,70%)]'}`}
                  >
                    <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right - product info */}
          <div className="space-y-4">
            {/* Vendor */}
            {form.collection && (
              <span className="text-[11px] text-[hsl(220,9%,46%)] uppercase tracking-[0.08em] font-medium">{form.collection}</span>
            )}

            {/* Title */}
            <h1 className="text-xl font-semibold text-[hsl(220,13%,13%)] leading-snug">
              {form.title || <span className="text-[hsl(220,9%,76%)]">Título do produto</span>}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-1.5">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`w-3.5 h-3.5 ${s <= 4 ? 'fill-[hsl(45,93%,47%)] text-[hsl(45,93%,47%)]' : 'fill-[hsl(220,13%,90%)] text-[hsl(220,13%,90%)]'}`} />
              ))}
              <span className="text-xs text-[hsl(220,9%,46%)] ml-1">4.8</span>
              <span className="text-[11px] text-[hsl(220,9%,66%)]">· 124 reviews</span>
            </div>

            {/* Price */}
            <div className="flex items-center gap-2.5">
              <span className="text-2xl font-bold text-[hsl(220,13%,13%)]">{currencySymbol}{form.price.toFixed(2)}</span>
              {form.compareAtPrice && form.compareAtPrice > form.price && (
                <>
                  <span className="text-sm line-through text-[hsl(220,9%,66%)]">{currencySymbol}{form.compareAtPrice.toFixed(2)}</span>
                  {discount && (
                    <span className="text-[11px] font-semibold bg-[hsl(140,60%,95%)] text-[hsl(140,60%,30%)] px-2 py-0.5 rounded-full">{discount}% OFF</span>
                  )}
                </>
              )}
            </div>
            <span className="text-[10px] text-[hsl(220,9%,66%)]">Tax included</span>

            {/* Sizes */}
            {(form.sizes.length > 0 || form.variants.length > 0) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[hsl(220,13%,26%)]">Size</span>
                  <span className="text-[11px] text-[hsl(213,90%,50%)] cursor-default">Size guide →</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(form.variants.length > 0 ? form.variants.map(v => v.name) : form.sizes).map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-3.5 py-1.5 rounded-md text-xs font-medium border transition-all ${
                        selectedSize === size
                          ? 'bg-[hsl(220,13%,13%)] text-white border-[hsl(220,13%,13%)]'
                          : 'bg-white text-[hsl(220,13%,26%)] border-[hsl(220,13%,82%)] hover:border-[hsl(220,13%,50%)]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-[hsl(220,13%,26%)]">Quantity</span>
              <div className="flex items-center border border-[hsl(220,13%,82%)] rounded-md w-[110px]">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-3 py-1.5 text-sm text-[hsl(220,9%,46%)] hover:text-[hsl(220,13%,13%)]">−</button>
                <span className="flex-1 text-center text-sm text-[hsl(220,13%,13%)]">{qty}</span>
                <button onClick={() => setQty(q => q + 1)} className="px-3 py-1.5 text-sm text-[hsl(220,9%,46%)] hover:text-[hsl(220,13%,13%)]">+</button>
              </div>
            </div>

            {/* Add to cart */}
            <button className="w-full h-12 bg-[hsl(220,13%,13%)] text-white rounded-lg text-sm font-medium hover:bg-[hsl(220,13%,20%)] transition-colors cursor-default">
              Add to Cart
            </button>

            {/* Buy now */}
            <button className="w-full h-12 bg-[hsl(263,70%,58%)] text-white rounded-lg text-sm font-medium hover:bg-[hsl(263,70%,52%)] transition-colors cursor-default">
              Buy it now
            </button>

            {/* Accordions */}
            <div className="border-t border-[hsl(220,14%,93%)] pt-3 space-y-0">
              {[
                { id: 'description', label: 'Description', content: form.description || '<span style="color:#9ca3af">Descrição do produto...</span>' },
                { id: 'shipping', label: 'Shipping & Returns', content: '<p>Free shipping on orders over $50.</p><p>Returns accepted within 30 days.</p>' },
                { id: 'sizeguide', label: 'Size Guide', content: '<p>Refer to our size chart for the best fit.</p>' },
              ].map(section => (
                <div key={section.id} className="border-b border-[hsl(220,14%,93%)]">
                  <button
                    onClick={() => setOpenAccordion(openAccordion === section.id ? null : section.id)}
                    className="w-full flex items-center justify-between py-3 text-sm font-medium text-[hsl(220,13%,26%)] hover:text-[hsl(220,13%,13%)]"
                  >
                    {section.label}
                    {openAccordion === section.id
                      ? <ChevronDown className="w-4 h-4 text-[hsl(220,9%,46%)]" />
                      : <ChevronRight className="w-4 h-4 text-[hsl(220,9%,46%)]" />}
                  </button>
                  {openAccordion === section.id && (
                    <div
                      className="pb-3 text-sm text-[hsl(220,9%,46%)] prose prose-sm max-w-none [&_p]:mb-1.5 [&_ul]:pl-4 [&_li]:list-disc"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fake footer */}
        <div className="border-t border-[hsl(220,14%,96%)] py-4 text-center">
          <span className="text-[10px] text-[hsl(220,9%,66%)]">© 2026 {displayDomain.replace('.myshopify.com', '')}. All rights reserved.</span>
        </div>
      </div>
    </div>
  );
}
