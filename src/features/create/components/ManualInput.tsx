import { Input } from '@/components/ui/input';
import { Sparkles } from 'lucide-react';

interface ManualInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function ManualInput({ value, onChange }: ManualInputProps) {
  return (
    <div className="flex flex-col gap-3">
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Nome ou descrição inicial do produto"
        className="text-[13px] h-10"
      />
      <div className="flex items-start gap-2 px-0.5">
        <Sparkles className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          A IA gera título, descrição, SEO e imagens a partir desse texto. Quanto mais específico, melhor o resultado.
        </p>
      </div>
    </div>
  );
}
