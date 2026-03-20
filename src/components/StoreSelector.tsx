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
    <div className="flex items-center gap-2">
      <Select value={activeStoreId || ''} onValueChange={onSelectStore}>
        <SelectTrigger className="flex-1 bg-secondary border-border h-9 text-sm">
          <SelectValue placeholder="Selecione uma loja..." />
        </SelectTrigger>
        <SelectContent>
          {stores.map(store => (
            <SelectItem key={store.id} value={store.id}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  store.connected ? 'bg-[hsl(var(--success))]' : 'bg-muted-foreground'
                }`} />
                <span className="truncate">{store.domain}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 flex-shrink-0"
        onClick={onAddStore}
        title="Adicionar loja"
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}
