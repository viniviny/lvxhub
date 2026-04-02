import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRODUCT_TYPES = [
  'T-Shirt',
  'Tank Top',
  'Shirt',
  'Polo',
  'Hoodie',
  'Jacket',
  'Blazer',
  'Sweater',
  'Pants',
  'Shorts',
  'Dress',
  'Skirt',
  'Handbag',
  'Shoes',
  'Sneakers',
  'Accessories',
  'Hat',
  'Belt',
  'Scarf',
  'Swimwear',
];

interface ProductTypeComboboxProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ProductTypeCombobox({ value, onChange, className }: ProductTypeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = PRODUCT_TYPES.filter(t =>
    t.toLowerCase().includes((search || value).toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (item: string) => {
    onChange(item);
    setSearch('');
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    onChange(val);
    if (!open) setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setSearch('');
    }
    if (e.key === 'Enter' && filtered.length === 1) {
      handleSelect(filtered[0]);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className="flex items-center mt-1 bg-secondary border border-border rounded-md h-8 px-2 cursor-text transition-all duration-150 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:border-primary"
        onClick={() => { inputRef.current?.focus(); setOpen(true); }}
      >
        <input
          ref={inputRef}
          value={search || value}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Selecione ou digite..."
          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
        />
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-[200px] overflow-y-auto rounded-md border border-border bg-popover shadow-[0_8px_24px_rgba(0,0,0,0.4)] animate-in fade-in slide-in-from-top-1 duration-100">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-muted-foreground">
              "{search || value}" será usado como tipo personalizado
            </div>
          ) : (
            filtered.map(item => (
              <button
                key={item}
                type="button"
                onClick={() => handleSelect(item)}
                className={cn(
                  'flex items-center w-full px-3 py-1.5 text-xs text-left transition-colors hover:bg-accent hover:text-accent-foreground',
                  value === item && 'bg-accent/50'
                )}
              >
                <Check className={cn('w-3 h-3 mr-2 flex-shrink-0', value === item ? 'opacity-100' : 'opacity-0')} />
                {item}
              </button>
            ))
          )}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground mt-1">
        Ajuda a IA a gerar títulos, descrições e SEO mais precisos.
      </p>
    </div>
  );
}

export { PRODUCT_TYPES };
