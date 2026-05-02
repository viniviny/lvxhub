import { Textarea } from '@/components/ui/textarea';

interface LinksInputProps {
  value: string;
  onChange: (raw: string, links: string[]) => void;
}

function parseLinks(raw: string): string[] {
  return raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('http'));
}

export function LinksInput({ value, onChange }: LinksInputProps) {
  const links = parseLinks(value);

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value, parseLinks(e.target.value))}
        placeholder={
          'Cole um link por linha:\nhttps://aliexpress.com/item/...\nhttps://shopee.com.br/...\nhttps://shein.com.br/...\nhttps://minhaloja.myshopify.com/products/...'
        }
        className="min-h-[140px] text-[13px] font-mono resize-none"
      />
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] text-muted-foreground">
          Suportado: AliExpress · Shopee · Shein · Shopify
        </span>
        {links.length > 0 && (
          <span className="text-[11px] font-medium text-foreground">
            {links.length} {links.length === 1 ? 'link' : 'links'}
          </span>
        )}
      </div>
    </div>
  );
}
