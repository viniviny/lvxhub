import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';

export interface ProductColor {
  id: string;
  name: string;
  hex: string;
}

interface ColorManagerProps {
  colors: ProductColor[];
  onColorsChange: (colors: ProductColor[]) => void;
}

export function ColorManager({ colors, onColorsChange }: ColorManagerProps) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#000000');

  const addColor = () => {
    if (!name.trim()) return;
    onColorsChange([...colors, { id: crypto.randomUUID(), name: name.trim(), hex }]);
    setName('');
    setHex('#000000');
    setAdding(false);
  };

  const removeColor = (id: string) => onColorsChange(colors.filter(c => c.id !== id));

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-[13px] text-foreground">Cor</h3>
        {!adding && (
          <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground" onClick={() => setAdding(true)}>
            <Plus className="w-3 h-3 mr-1" />Adicionar cor
          </Button>
        )}
      </div>

      {colors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {colors.map(c => (
            <div key={c.id} className="flex items-center gap-1.5 bg-secondary rounded-full px-2.5 py-1 border border-border">
              <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: c.hex }} />
              <span className="text-[11px] text-foreground">{c.name}</span>
              <button onClick={() => removeColor(c.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-[10px] text-muted-foreground">Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Azul marinho" className="bg-secondary border-border text-xs h-8 mt-0.5" />
          </div>
          <div className="w-16">
            <Label className="text-[10px] text-muted-foreground">Cor</Label>
            <input type="color" value={hex} onChange={e => setHex(e.target.value)} className="w-full h-8 rounded border border-border cursor-pointer mt-0.5" />
          </div>
          <Button size="sm" className="h-8 text-xs" onClick={addColor}>OK</Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setAdding(false)}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
