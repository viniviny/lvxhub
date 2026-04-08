import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface AddCustomSizeProps {
  onAdd: (size: string) => void;
}

export function AddCustomSize({ onAdd }: AddCustomSizeProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  const handleAdd = () => {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue('');
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-2.5 py-1 rounded-md text-xs font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary transition-all flex items-center gap-1"
      >
        <Plus className="w-3 h-3" />
        Add
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setOpen(false); }}
        placeholder="e.g. 3XL"
        className="h-7 w-20 text-xs bg-secondary border-border"
        autoFocus
        maxLength={10}
      />
      <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={handleAdd}>
        <Plus className="w-3 h-3" />
      </Button>
    </div>
  );
}
