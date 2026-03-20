import { ShopifyStore } from '@/hooks/useStoreManager';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface StoreSelectorProps {
  stores: ShopifyStore[];
  activeStoreId: string | null;
  onSelectStore: (id: string) => void;
  onAddStore: () => void;
}

export function StoreSelector({ stores, activeStoreId, onSelectStore, onAddStore }: StoreSelectorProps) {
  if (stores.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <Select value={activeStoreId || ''} onValueChange={onSelectStore}>
        <SelectTrigger className="flex-1 bg-card border-border h-8 text-[13px]">
          <SelectValue placeholder="Selecione uma loja..." />
        </SelectTrigger>
        <SelectContent>
          {stores.map(store => (
            <SelectItem key={store.id} value={store.id}>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  store.connected ? 'bg-[hsl(var(--success))]' : 'bg-muted-foreground'
                }`} />
                <span className="truncate text-[13px]">{store.domain}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0"
        onClick={onAddStore}
        title="Adicionar loja"
      >
        <Plus className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
