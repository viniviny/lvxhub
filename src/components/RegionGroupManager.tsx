import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RegionGroup } from '@/hooks/useRegionGroups';
import { ShopifyStore } from '@/hooks/useStoreManager';
import { Layers, Plus, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

interface RegionGroupManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: RegionGroup[];
  stores: ShopifyStore[];
  onAddGroup: (name: string, storeIds: string[]) => void;
  onUpdateGroup: (id: string, name: string, storeIds: string[]) => void;
  onRemoveGroup: (id: string) => void;
}

export function RegionGroupManager({
  open, onOpenChange, groups, stores, onAddGroup, onUpdateGroup, onRemoveGroup,
}: RegionGroupManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);

  const handleSave = () => {
    if (!name.trim()) { toast.error('Nome do grupo é obrigatório.'); return; }
    if (selectedStoreIds.length === 0) { toast.error('Selecione ao menos uma loja.'); return; }

    if (editingId) {
      onUpdateGroup(editingId, name.trim(), selectedStoreIds);
      toast.success('Grupo atualizado!');
    } else {
      onAddGroup(name.trim(), selectedStoreIds);
      toast.success('Grupo criado!');
    }
    resetForm();
  };

  const handleEdit = (group: RegionGroup) => {
    setEditingId(group.id);
    setName(group.name);
    setSelectedStoreIds(group.storeIds);
    setIsAdding(true);
  };

  const handleRemove = (id: string) => {
    onRemoveGroup(id);
    toast.success('Grupo removido!');
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setName('');
    setSelectedStoreIds([]);
  };

  const toggleStore = (id: string) => {
    setSelectedStoreIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Grupos de Região</DialogTitle>
              <DialogDescription>
                Crie grupos para publicar em várias lojas de uma vez.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Existing groups */}
          {groups.length > 0 && !isAdding && (
            <div className="space-y-2">
              {groups.map(group => (
                <div key={group.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{group.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.storeIds.length} loja{group.storeIds.length !== 1 ? 's' : ''} •{' '}
                      {stores
                        .filter(s => group.storeIds.includes(s.id))
                        .map(s => s.marketConfig?.countryFlag || '🏪')
                        .join(' ')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(group)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(group.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add/Edit form */}
          {isAdding ? (
            <div className="space-y-3 p-4 rounded-lg border border-border bg-secondary/30">
              <div>
                <Label className="text-sm text-muted-foreground">Nome do grupo</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: LATAM, Europa, DACH..."
                  className="mt-1 bg-secondary border-border"
                />
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Lojas ({selectedStoreIds.length} selecionada{selectedStoreIds.length !== 1 ? 's' : ''})</Label>
                <div className="mt-1.5 space-y-1.5 max-h-[200px] overflow-y-auto">
                  {stores.map(store => (
                    <button
                      key={store.id}
                      onClick={() => toggleStore(store.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedStoreIds.includes(store.id)
                          ? 'bg-primary/10 border border-primary/30 text-foreground'
                          : 'bg-secondary border border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span>{store.marketConfig?.countryFlag || '🏪'}</span>
                      <span className="flex-1 text-left truncate">{store.marketConfig?.marketName || store.domain}</span>
                      {store.marketConfig?.currency && (
                        <span className="text-[11px] text-muted-foreground">{store.marketConfig.currency}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={resetForm} className="flex-1">Cancelar</Button>
                <Button size="sm" onClick={handleSave} className="flex-1">
                  {editingId ? 'Atualizar' : 'Criar Grupo'}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Grupo
            </Button>
          )}

          {groups.length === 0 && !isAdding && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Nenhum grupo criado.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
