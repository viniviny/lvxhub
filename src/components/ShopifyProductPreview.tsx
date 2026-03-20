import { useState, useEffect, useRef } from 'react';
import { ProductFormData, calculateDiscount } from '@/types/product';
import { GeneratedImage } from '@/components/ImageGenerationStep';
import { ChevronDown, ChevronRight, ShoppingCart, Search, User, Star, Monitor, Tablet, Smartphone, Maximize2, Minimize2, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type DeviceType = 'desktop' | 'tablet' | 'mobile';

interface ShopifyProductPreviewProps {
  form: ProductFormData;
  images: GeneratedImage[];
  imagePreview: string | null;
  storeDomain: string;
  currencySymbol: string;
}

const DEVICE_KEY = 'publify_preview_device';
const ZOOM_KEY = 'publify_preview_zoom';

function DeviceFrame({ device, children }: { device: DeviceType; children: React.ReactNode }) {
  if (device === 'desktop') return <>{children}</>;

  if (device === 'tablet') {
    return (
      <div className="flex justify-center py-4">
        <div className="relative bg-[hsl(240,3%,12%)] rounded-2xl p-3 shadow-2xl" style={{ width: 792 }}>
          {/* Camera */}
          <div className="absolute top-[6px] left-1/2 -translate-x-1/2 w-[6px] h-[6px] rounded-full bg-[hsl(240,3%,20%)]" />
          {/* Screen */}
          <div className="rounded-lg overflow-hidden bg-white" style={{ height: 560, overflowY: 'auto' }}>
            {children}
          </div>
          {/* Home area */}
          <div className="flex justify-center pt-2">
            <div className="w-8 h-8 rounded-full border border-[hsl(240,3%,25%)]" />
          </div>
        </div>
      </div>
    );
  }

  // Mobile
  return (
    <div className="flex justify-center py-4">
      <div className="relative bg-[hsl(240,3%,12%)] rounded-[36px] p-[14px] shadow-2xl" style={{ width: 418 }}>
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[28px] bg-[hsl(240,3%,12%)] rounded-b-2xl z-10" />
        {/* Side buttons */}
        <div className="absolute left-[-3px] top-[100px] w-[3px] h-[30px] bg-[hsl(240,3%,18%)] rounded-l" />
        <div className="absolute left-[-3px] top-[145px] w-[3px] h-[50px] bg-[hsl(240,3%,18%)] rounded-l" />
        <div className="absolute left-[-3px] top-[205px] w-[3px] h-[50px] bg-[hsl(240,3%,18%)] rounded-l" />
        <div className="absolute right-[-3px] top-[130px] w-[3px] h-[60px] bg-[hsl(240,3%,18%)] rounded-r" />
        {/* Screen */}
        <div className="rounded-[22px] overflow-hidden bg-white" style={{ height: 520, overflowY: 'auto' }}>
          {children}
        </div>
        {/* Home indicator */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-[100px] h-[4px] bg-[hsl(240,3%,30%)] rounded-full" />
        </div>
      </div>
    </div>
  );
}

function PreviewContent({ form, images, imagePreview, storeDomain, currencySymbol, device }: ShopifyProductPreviewProps & { device: DeviceType }) {
  const allImages: { url: string; label: string }[] = images.filter(i => i.url).map(i => ({ url: i.url!, label: i.angle }));
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
  const isMobile = device === 'mobile';
  const isTablet = device === 'tablet';

  return (
    <>
      {/* Browser bar - hide on mobile */}
      {!isMobile && (
        <div className="flex items-center h-9 bg-[hsl(220,14%,97%)] border-b border-[hsl(220,13%,90%)] px-3 gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[hsl(0,80%,65%)]" />
            <div className="w-3 h-3 rounded-full bg-[hsl(45,90%,60%)]" />
            <div className="w-3 h-3 rounded-full bg-[hsl(140,60%,50%)]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-white border border-[hsl(220,13%,87%)] rounded-full px-3 py-0.5 text-[11px] text-[hsl(220,9%,46%)] max-w-[70%] truncate text-center">
              https://{displayDomain}/products/{handle}
            </div>
          </div>
          <span className="text-[10px] bg-[hsl(225,100%,96%)] text-[hsl(245,58%,51%)] rounded-full px-2 py-0.5 font-medium">Preview</span>
        </div>
      )}

      {/* Mobile status bar */}
      {isMobile && (
        <div className="flex items-center justify-between h-8 px-5 bg-white text-[10px] font-semibold text-[hsl(220,13%,13%)]">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-2 border border-[hsl(220,13%,13%)] rounded-sm relative">
              <div className="absolute inset-[1px] right-[2px] bg-[hsl(220,13%,13%)] rounded-[1px]" />
            </div>
          </div>
        </div>
      )}

      {/* Store header */}
      <div className={`flex items-center justify-between border-b border-[hsl(220,14%,96%)] bg-white ${isMobile ? 'h-11 px-4' : 'h-[52px] px-6'}`}>
        <span className={`font-semibold text-[hsl(220,13%,13%)] ${isMobile ? 'text-xs' : 'text-sm'}`}>
          {displayDomain.replace('.myshopify.com', '')}
        </span>
        {!isMobile && (
          <div className="flex items-center gap-5 text-xs text-[hsl(220,9%,46%)]">
            <span>Home</span><span>Collections</span><span>About</span>
          </div>
        )}
        <div className={`flex items-center text-[hsl(220,9%,46%)] ${isMobile ? 'gap-3' : 'gap-3'}`}>
          <Search className={isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          <ShoppingCart className={isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </div>
      </div>

      {/* Product content */}
      <div className={`bg-white ${isMobile ? 'p-4' : isTablet ? 'p-5 grid grid-cols-2 gap-5' : 'p-6 grid grid-cols-2 gap-6'}`}>
        {/* Images */}
        <div className="space-y-2">
          <div className={`rounded-lg bg-[hsl(220,14%,97%)] overflow-hidden border border-[hsl(220,13%,93%)] ${isMobile ? 'aspect-square w-full' : 'aspect-square'}`}>
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

        {/* Product info */}
        <div className={`space-y-3 ${isMobile ? 'mt-4' : ''}`}>
          {form.collection && (
            <span className="text-[11px] text-[hsl(220,9%,46%)] uppercase tracking-[0.08em] font-medium">{form.collection}</span>
          )}

          <h1 className={`font-semibold text-[hsl(220,13%,13%)] leading-snug ${isMobile ? 'text-lg' : 'text-xl'}`}>
            {form.title || <span className="text-[hsl(220,9%,76%)]">Título do produto</span>}
          </h1>

          <div className="flex items-center gap-1.5">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className={`w-3.5 h-3.5 ${s <= 4 ? 'fill-[hsl(45,93%,47%)] text-[hsl(45,93%,47%)]' : 'fill-[hsl(220,13%,90%)] text-[hsl(220,13%,90%)]'}`} />
            ))}
            <span className="text-xs text-[hsl(220,9%,46%)] ml-1">4.8</span>
            <span className="text-[11px] text-[hsl(220,9%,66%)]">· 124 reviews</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`font-bold text-[hsl(220,13%,13%)] ${isMobile ? 'text-xl' : 'text-2xl'}`}>{currencySymbol}{form.price.toFixed(2)}</span>
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

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-[hsl(220,13%,26%)]">Quantity</span>
            <div className="flex items-center border border-[hsl(220,13%,82%)] rounded-md w-[110px]">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-3 py-1.5 text-sm text-[hsl(220,9%,46%)] hover:text-[hsl(220,13%,13%)]">−</button>
              <span className="flex-1 text-center text-sm text-[hsl(220,13%,13%)]">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="px-3 py-1.5 text-sm text-[hsl(220,9%,46%)] hover:text-[hsl(220,13%,13%)]">+</button>
            </div>
          </div>

          <button className={`w-full bg-[hsl(220,13%,13%)] text-white rounded-lg text-sm font-medium hover:bg-[hsl(220,13%,20%)] transition-colors cursor-default ${isMobile ? 'h-[52px]' : 'h-12'}`}>
            Add to Cart
          </button>
          <button className={`w-full bg-[hsl(263,70%,58%)] text-white rounded-lg text-sm font-medium hover:bg-[hsl(263,70%,52%)] transition-colors cursor-default ${isMobile ? 'h-[52px]' : 'h-12'}`}>
            Buy it now
          </button>

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

      {/* Footer */}
      <div className="border-t border-[hsl(220,14%,96%)] py-4 text-center bg-white">
        <span className="text-[10px] text-[hsl(220,9%,66%)]">© 2026 {displayDomain.replace('.myshopify.com', '')}. All rights reserved.</span>
      </div>
    </>
  );
}

export function ShopifyProductPreview(props: ShopifyProductPreviewProps) {
  const [device, setDevice] = useState<DeviceType>(() => {
    try { return (localStorage.getItem(DEVICE_KEY) as DeviceType) || 'desktop'; } catch { return 'desktop'; }
  });
  const [zoom, setZoom] = useState<number>(() => {
    try { return Number(localStorage.getItem(ZOOM_KEY)) || 100; } catch { return 100; }
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayDevice, setDisplayDevice] = useState(device);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Close fullscreen on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false); };
    if (isFullscreen) { document.addEventListener('keydown', handler); document.body.style.overflow = 'hidden'; }
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [isFullscreen]);

  useEffect(() => { try { localStorage.setItem(DEVICE_KEY, device); } catch {} }, [device]);
  useEffect(() => { try { localStorage.setItem(ZOOM_KEY, String(zoom)); } catch {} }, [zoom]);

  const handleDeviceChange = (newDevice: DeviceType) => {
    if (newDevice === device) return;
    setIsTransitioning(true);
    clearTimeout(timeoutRef.current);
    // Fade out, then swap device and fade in
    timeoutRef.current = setTimeout(() => {
      setDevice(newDevice);
      setDisplayDevice(newDevice);
      // Small delay to allow DOM to update before fading in
      requestAnimationFrame(() => {
        setIsTransitioning(false);
      });
    }, 200);
  };

  const devices: { type: DeviceType; icon: typeof Monitor; label: string }[] = [
    { type: 'desktop', icon: Monitor, label: 'Desktop' },
    { type: 'tablet', icon: Tablet, label: 'Tablet' },
    { type: 'mobile', icon: Smartphone, label: 'Mobile' },
  ];

  return (
    <TooltipProvider delayDuration={200}>
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        
          <div className="inline-flex items-center bg-secondary/60 border border-[hsl(215,14%,19%)] rounded-full p-[3px] gap-0">
            {devices.map(d => {
              const Icon = d.icon;
              const active = device === d.type;
              return (
                <Tooltip key={d.type}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleDeviceChange(d.type)}
                      className={`w-9 h-[30px] rounded-2xl flex items-center justify-center transition-all duration-150 ${
                        active
                          ? 'bg-[hsl(220,20%,14%)] text-[hsl(220,14%,90%)] border border-[hsl(213,80%,56%)] shadow-sm'
                          : 'text-[hsl(215,8%,55%)] hover:text-[hsl(220,14%,80%)]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">{d.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground">Pré-visualização ao vivo</span>
          <select
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="text-[11px] bg-secondary/60 border border-[hsl(215,14%,19%)] text-muted-foreground rounded-full px-2 py-1 cursor-pointer focus:outline-none"
          >
            <option value={50}>50%</option>
            <option value={75}>75%</option>
            <option value={100}>100%</option>
          </select>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsFullscreen(true)}
                className="w-[30px] h-[30px] rounded-full flex items-center justify-center bg-secondary/60 border border-[hsl(215,14%,19%)] text-[hsl(215,8%,55%)] hover:text-[hsl(220,14%,90%)] hover:border-[hsl(213,80%,56%)] transition-all duration-150"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Tela cheia</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Preview area */}
      <div
        className="origin-top-left"
        style={{
          transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
          transformOrigin: 'top center',
          width: zoom !== 100 ? `${10000 / zoom}%` : undefined,
          transition: 'transform 0.3s ease-out, width 0.3s ease-out',
        }}
      >
        <div
          style={{
            opacity: isTransitioning ? 0 : 1,
            transform: isTransitioning ? 'scale(0.97)' : 'scale(1)',
            filter: isTransitioning ? 'blur(4px)' : 'blur(0px)',
            transition: 'opacity 0.2s ease-out, transform 0.25s cubic-bezier(0.16,1,0.3,1), filter 0.2s ease-out',
          }}
        >
          <DeviceFrame device={displayDevice}>
            <div className={`${displayDevice === 'desktop' ? 'rounded-xl border border-[hsl(220,13%,87%)] overflow-hidden' : ''} bg-white`}>
              <PreviewContent {...props} device={displayDevice} />
            </div>
          </DeviceFrame>
        </div>
      </div>

      {/* Fullscreen overlay */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-[hsl(220,20%,7%)] flex flex-col"
          style={{ animation: 'fade-in 0.25s ease-out' }}
        >
          {/* Fullscreen toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[hsl(215,14%,19%)]">
            <div className="inline-flex items-center bg-secondary/60 border border-[hsl(215,14%,19%)] rounded-full p-[3px] gap-0">
              {devices.map(d => {
                const Icon = d.icon;
                const active = device === d.type;
                return (
                  <Tooltip key={d.type}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleDeviceChange(d.type)}
                        className={`w-9 h-[30px] rounded-2xl flex items-center justify-center transition-all duration-150 ${
                          active
                            ? 'bg-[hsl(220,20%,14%)] text-[hsl(220,14%,90%)] border border-[hsl(213,80%,56%)] shadow-sm'
                            : 'text-[hsl(215,8%,55%)] hover:text-[hsl(220,14%,80%)]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">{d.label}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            <span className="text-xs text-muted-foreground">Pré-visualização em tela cheia</span>

            <div className="flex items-center gap-2">
              <select
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="text-[11px] bg-secondary/60 border border-[hsl(215,14%,19%)] text-muted-foreground rounded-full px-2 py-1 cursor-pointer focus:outline-none"
              >
                <option value={50}>50%</option>
                <option value={75}>75%</option>
                <option value={100}>100%</option>
              </select>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsFullscreen(false)}
                    className="w-[30px] h-[30px] rounded-full flex items-center justify-center bg-secondary/60 border border-[hsl(215,14%,19%)] text-[hsl(215,8%,55%)] hover:text-red-400 hover:border-red-400/50 transition-all duration-150"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Fechar (Esc)</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Fullscreen content */}
          <div className="flex-1 overflow-auto flex justify-center p-6">
            <div
              className="w-full max-w-5xl"
              style={{
                transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
                transformOrigin: 'top center',
                width: zoom !== 100 ? `${10000 / zoom}%` : undefined,
                maxWidth: zoom !== 100 ? `${10000 / zoom}%` : undefined,
                transition: 'transform 0.3s ease-out',
              }}
            >
              <div
                style={{
                  opacity: isTransitioning ? 0 : 1,
                  transform: isTransitioning ? 'scale(0.97)' : 'scale(1)',
                  filter: isTransitioning ? 'blur(4px)' : 'blur(0px)',
                  transition: 'opacity 0.2s ease-out, transform 0.25s cubic-bezier(0.16,1,0.3,1), filter 0.2s ease-out',
                }}
              >
                <DeviceFrame device={displayDevice}>
                  <div className={`${displayDevice === 'desktop' ? 'rounded-xl border border-[hsl(220,13%,87%)] overflow-hidden' : ''} bg-white`}>
                    <PreviewContent {...props} device={displayDevice} />
                  </div>
                </DeviceFrame>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}