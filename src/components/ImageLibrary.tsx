import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search, Download, Trash2, Tag, Pencil, Check, X, Image as ImageIcon,
  CheckSquare, Square, Grid3X3, LayoutGrid, Eye, ArrowUpDown, Store, Filter
} from 'lucide-react';
import { toast } from 'sonner';

interface LibraryImage {
  id: string;
  name: string;
  url: string;
  storage_path: string | null;
  tags: string[];
  product_name: string | null;
  angle: string | null;
  created_at: string;
  status: string | null;
  store_domain: string | null;
}

type ViewSize = 'small' | 'large';
type SortOrder = 'newest' | 'oldest';
type StatusFilter = 'all' | 'rascunho' | 'publicado' | 'erro';
type OriginFilter = 'all' | 'generator' | 'product';

const isGenerator = (img: LibraryImage) => (img.tags || []).includes('image-generator');

function groupByDate(images: LibraryImage[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const weekAgo = today - 7 * 86400000;
  const monthAgo = today - 30 * 86400000;

  const groups: Record<string, LibraryImage[]> = {
    'Hoje': [],
    'Ontem': [],
    'Esta semana': [],
    'Este mês': [],
    'Mais antigos': [],
  };
  images.forEach(img => {
    const t = new Date(img.created_at).getTime();
    if (t >= today) groups['Hoje'].push(img);
    else if (t >= yesterday) groups['Ontem'].push(img);
    else if (t >= weekAgo) groups['Esta semana'].push(img);
    else if (t >= monthAgo) groups['Este mês'].push(img);
    else groups['Mais antigos'].push(img);
  });
  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

export function ImageLibrary() {
  const { user } = useAuth();
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [filterStore, setFilterStore] = useState<string>('all');
  const [filterOrigin, setFilterOrigin] = useState<OriginFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTags, setEditTags] = useState('');
  const [previewImage, setPreviewImage] = useState<LibraryImage | null>(null);
  const [viewSize, setViewSize] = useState<ViewSize>('large');
  const [newTag, setNewTag] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('image_library')
      .select('id, name, url, storage_path, tags, product_name, angle, created_at, status, store_domain')
      .order('created_at', { ascending: sortOrder === 'oldest' });

    if (error) {
      console.error('Error fetching library:', error);
      toast.error('Erro ao carregar biblioteca');
    } else {
      setImages((data as LibraryImage[]) || []);
    }
    setLoading(false);
  }, [user, sortOrder]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  // Get all unique tags and stores
  const allTags = Array.from(new Set(images.flatMap(i => i.tags || [])));
  const allStores = Array.from(new Set(images.map(i => i.store_domain).filter(Boolean))) as string[];

  // Filter images
  const filtered = images.filter(img => {
    const matchSearch = !search || img.name.toLowerCase().includes(search.toLowerCase()) ||
      img.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      img.angle?.toLowerCase().includes(search.toLowerCase());
    const matchTag = !filterTag || img.tags?.includes(filterTag);
    const matchStatus = filterStatus === 'all' || (img.status || 'rascunho') === filterStatus;
    const matchStore = filterStore === 'all' || img.store_domain === filterStore;
    return matchSearch && matchTag && matchStatus && matchStore;
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(i => i.id)));
    }
  };

  const handleDelete = async (ids: string[]) => {
    if (!ids.length) return;
    const { error } = await supabase
      .from('image_library')
      .delete()
      .in('id', ids);
    if (error) {
      toast.error('Erro ao deletar');
    } else {
      toast.success(`${ids.length} imagen${ids.length > 1 ? 's' : ''} removida${ids.length > 1 ? 's' : ''}`);
      setImages(prev => prev.filter(i => !ids.includes(i.id)));
      setSelected(new Set());
    }
  };

  const handleDownload = async (img: LibraryImage) => {
    try {
      const a = document.createElement('a');
      a.href = img.url;
      a.download = img.name || `image-${img.id}`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      toast.error('Erro ao baixar imagem');
    }
  };

  const startEdit = (img: LibraryImage) => {
    setEditingId(img.id);
    setEditName(img.name);
    setEditTags((img.tags || []).join(', '));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const tags = editTags.split(',').map(t => t.trim()).filter(Boolean);
    const { error } = await supabase
      .from('image_library')
      .update({ name: editName.trim(), tags, updated_at: new Date().toISOString() })
      .eq('id', editingId);
    if (error) {
      toast.error('Erro ao salvar');
    } else {
      setImages(prev => prev.map(i =>
        i.id === editingId ? { ...i, name: editName.trim(), tags } : i
      ));
      toast.success('Imagem atualizada');
    }
    setEditingId(null);
  };

  const handleAddTag = async (imgId: string) => {
    if (!newTag.trim()) return;
    const img = images.find(i => i.id === imgId);
    if (!img) return;
    const updated = [...new Set([...(img.tags || []), newTag.trim()])];
    const { error } = await supabase
      .from('image_library')
      .update({ tags: updated })
      .eq('id', imgId);
    if (error) {
      toast.error('Erro ao adicionar tag');
    } else {
      setImages(prev => prev.map(i => i.id === imgId ? { ...i, tags: updated } : i));
    }
    setNewTag('');
  };

  const handleRemoveTag = async (imgId: string, tag: string) => {
    const img = images.find(i => i.id === imgId);
    if (!img) return;
    const updated = (img.tags || []).filter(t => t !== tag);
    await supabase.from('image_library').update({ tags: updated }).eq('id', imgId);
    setImages(prev => prev.map(i => i.id === imgId ? { ...i, tags: updated } : i));
  };

  const gridCols = viewSize === 'small'
    ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8'
    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Biblioteca de Imagens</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{images.length} imagen{images.length !== 1 ? 's' : ''} gerada{images.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-4">
        {/* Row 1: Search + Sort + View toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do produto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-secondary border-border"
            />
          </div>

          {/* Status filter */}
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as StatusFilter)}>
            <SelectTrigger className="w-[140px] h-9 text-xs bg-secondary border-border">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="publicado">Publicado</SelectItem>
              <SelectItem value="erro">Erro</SelectItem>
            </SelectContent>
          </Select>

          {/* Store filter */}
          {allStores.length > 0 && (
            <Select value={filterStore} onValueChange={setFilterStore}>
              <SelectTrigger className="w-[160px] h-9 text-xs bg-secondary border-border">
                <Store className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Loja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as lojas</SelectItem>
                {allStores.map(store => (
                  <SelectItem key={store} value={store}>{store}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Sort order */}
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
            <SelectTrigger className="w-[140px] h-9 text-xs bg-secondary border-border">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Mais recentes</SelectItem>
              <SelectItem value="oldest">Mais antigos</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setViewSize('large')}
              className={`p-1.5 rounded-md transition-colors ${viewSize === 'large' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewSize('small')}
              className={`p-1.5 rounded-md transition-colors ${viewSize === 'small' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Tag filter chips + active filter count */}
        <div className="flex items-center gap-2 flex-wrap">
          {(filterStatus !== 'all' || filterStore !== 'all' || filterTag) && (
            <button
              onClick={() => { setFilterStatus('all'); setFilterStore('all'); setFilterTag(null); setSearch(''); }}
              className="text-[11px] text-destructive hover:text-destructive/80 transition-colors"
            >
              Limpar filtros
            </button>
          )}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setFilterTag(null)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  !filterTag ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                Todas
              </button>
              {allTags.slice(0, 8).map(tag => (
                <button
                  key={tag}
                  onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    filterTag === tag ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">
            {filtered.length} de {images.length} imagens
          </span>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 p-2.5 rounded-lg bg-secondary/80 border border-border">
          <button onClick={selectAll} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <CheckSquare className="w-3.5 h-3.5" />
            {selected.size === filtered.length ? 'Desmarcar' : 'Selecionar'} todas
          </button>
          <span className="text-xs text-muted-foreground">{selected.size} selecionada{selected.size > 1 ? 's' : ''}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => handleDelete(Array.from(selected))}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />Excluir ({selected.size})
            </Button>
          </div>
        </div>
      )}

      {/* Image Grid */}
      {loading ? (
        <div className="grid gap-3 ${gridCols}">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-secondary animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ImageIcon className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {search || filterTag ? 'Nenhuma imagem encontrada' : 'Biblioteca vazia'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {search || filterTag
              ? 'Tente ajustar os filtros de busca.'
              : 'As imagens geradas para seus produtos aparecerão aqui automaticamente.'}
          </p>
        </div>
      ) : (
        <div className={`grid gap-3 ${gridCols}`}>
          {filtered.map(img => {
            const isSelected = selected.has(img.id);
            const isEditing = editingId === img.id;

            return (
              <div
                key={img.id}
                className={`group relative rounded-lg overflow-hidden border transition-all ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                {/* Image */}
                <div
                  className="aspect-square bg-secondary cursor-pointer"
                  onClick={() => setPreviewImage(img)}
                >
                  <img src={img.url} alt={img.name} className="w-full h-full object-contain" loading="lazy" />
                </div>

                {/* Select checkbox */}
                <button
                  onClick={e => { e.stopPropagation(); toggleSelect(img.id); }}
                  className={`absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-black/40 text-white opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {isSelected ? <Check className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                </button>

                {/* Quick actions */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); handleDownload(img); }}
                    className="w-7 h-7 rounded-md bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); startEdit(img); }}
                    className="w-7 h-7 rounded-md bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete([img.id]); }}
                    className="w-7 h-7 rounded-md bg-black/40 text-white flex items-center justify-center hover:bg-red-600/80 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Info footer */}
                <div className="p-2 bg-background">
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="h-7 text-xs bg-secondary"
                        placeholder="Nome da imagem"
                        autoFocus
                      />
                      <Input
                        value={editTags}
                        onChange={e => setEditTags(e.target.value)}
                        className="h-7 text-xs bg-secondary"
                        placeholder="Tags (separadas por vírgula)"
                      />
                      <div className="flex gap-1">
                        <Button size="sm" className="h-6 text-[10px] flex-1" onClick={saveEdit}>
                          <Check className="w-3 h-3 mr-0.5" />Salvar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setEditingId(null)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium text-foreground truncate flex-1">
                          {img.name || img.angle || 'Sem nome'}
                        </p>
                        {(img.status || 'rascunho') === 'publicado' && (
                          <span className="shrink-0 text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]">Publicado</span>
                        )}
                        {(img.status || 'rascunho') === 'erro' && (
                          <span className="shrink-0 text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive">Erro</span>
                        )}
                        {(img.status || 'rascunho') === 'rascunho' && (
                          <span className="shrink-0 text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Rascunho</span>
                        )}
                      </div>
                      {img.product_name && (
                        <p className="text-[10px] text-muted-foreground truncate">{img.product_name}</p>
                      )}
                      {img.tags && img.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {img.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0 h-4">{tag}</Badge>
                          ))}
                          {img.tags.length > 3 && (
                            <span className="text-[9px] text-muted-foreground">+{img.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{previewImage?.name || previewImage?.angle || 'Imagem'}</DialogTitle>
            <DialogDescription>
              {previewImage?.product_name && `Produto: ${previewImage.product_name}`}
              {previewImage?.angle && ` · Ângulo: ${previewImage.angle}`}
            </DialogDescription>
          </DialogHeader>

          {previewImage && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden bg-secondary">
                <img src={previewImage.url} alt={previewImage.name} className="w-full h-auto" />
              </div>

              {/* Tags management */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Tags</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(previewImage.tags || []).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
                      {tag}
                      <button
                        onClick={() => {
                          handleRemoveTag(previewImage.id, tag);
                          setPreviewImage(prev => prev ? { ...prev, tags: prev.tags.filter(t => t !== tag) } : null);
                        }}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    ref={tagInputRef}
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleAddTag(previewImage.id);
                        setPreviewImage(prev => prev ? { ...prev, tags: [...new Set([...prev.tags, newTag.trim()])] } : null);
                      }
                    }}
                    placeholder="Nova tag..."
                    className="h-8 text-sm flex-1 bg-secondary"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8"
                    onClick={() => {
                      handleAddTag(previewImage.id);
                      setPreviewImage(prev => prev ? { ...prev, tags: [...new Set([...prev.tags, newTag.trim()])] } : null);
                    }}
                  >
                    <Tag className="w-3.5 h-3.5 mr-1" />Adicionar
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => handleDownload(previewImage)}>
                  <Download className="w-4 h-4 mr-2" />Baixar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDelete([previewImage.id]);
                    setPreviewImage(null);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />Excluir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
