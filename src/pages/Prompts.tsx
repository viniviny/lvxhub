import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserPrompts, UserPrompt, UserPromptInsert } from '@/hooks/useUserPrompts';
import { BookOpen, Plus, Search, Pencil, Trash2, ArrowLeft, SortAsc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardSidebar, DashboardView } from '@/components/DashboardSidebar';
import { useStoreContext } from '@/hooks/useStoreContext';
import { UserMenu } from '@/components/UserMenu';

type SortMode = 'recent' | 'most_used' | 'az';

const CATEGORIES = [
  { value: 'produto', label: 'Produto' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'campanha', label: 'Campanha' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'redes-sociais', label: 'Redes Sociais' },
  { value: 'outro', label: 'Outro' },
];

export default function PromptsPage() {
  const navigate = useNavigate();
  const { prompts, isLoading, createPrompt, updatePrompt, deletePrompt } = useUserPrompts();
  const { stores, activeStoreId, setActiveStore } = useStoreContext();
  const [editing, setEditing] = useState<UserPrompt | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('recent');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const handleSidebarNav = (view: DashboardView) => {
    if (view === 'prompts') return;
    navigate('/dashboard');
  };

  // Form state
  const [name, setName] = useState('');
  const [promptText, setPromptText] = useState('');

  const filtered = useMemo(() => {
    let list = prompts.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.prompt_text.toLowerCase().includes(search.toLowerCase())
    );
    if (sort === 'recent') list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    else if (sort === 'most_used') list.sort((a, b) => b.usage_count - a.usage_count);
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [prompts, search, sort]);

  const openCreate = () => {
    setEditing('new');
    setName(''); setPromptText('');
  };

  const openEdit = (p: UserPrompt) => {
    setEditing(p);
    setName(p.name); setPromptText(p.prompt_text);
  };

  const handleSave = async () => {
    const input: UserPromptInsert = {
      name, category: null, prompt_text: promptText,
      default_angles: [], default_ratio: '4:5', personal_notes: null,
    };
    if (editing === 'new') {
      await createPrompt.mutateAsync(input);
    } else if (editing) {
      await updatePrompt.mutateAsync({ id: editing.id, ...input });
    }
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    await deletePrompt.mutateAsync(id);
    setConfirmDeleteId(null);
  };

  const sidebarProps = {
    stores, activeStoreId, onSelectStore: setActiveStore, onAddStore: () => {},
    currentView: 'prompts' as DashboardView, onViewChange: handleSidebarNav,
  };

  // Form view
  if (editing) {
    return (
      <div className="min-h-screen bg-background flex">
        <DashboardSidebar {...sidebarProps} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-[52px] flex items-center justify-between px-5 border-b border-border bg-card/50">
            <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <UserMenu />
          </header>
          <main className="flex-1 p-6 max-w-lg mx-auto w-full">
            <h1 className="font-display text-xl font-semibold text-foreground mb-6">
              {editing === 'new' ? 'Criar prompt' : 'Editar prompt'}
            </h1>
            <div className="space-y-5">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Nome do prompt *</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Jaqueta Fundo Branco" className="bg-card border-border" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Prompt *</label>
                <Textarea value={promptText} onChange={e => setPromptText(e.target.value.slice(0, 2000))} placeholder="Escreva o prompt em inglês para melhores resultados com a IA..." rows={8} className="bg-card border-border resize-none" />
                <span className="text-[10px] text-muted-foreground mt-1 block text-right">{promptText.length}/2000</span>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button variant="ghost" onClick={() => setEditing(null)} className="text-muted-foreground">Cancelar</Button>
                <Button onClick={handleSave} disabled={!name.trim() || !promptText.trim() || createPrompt.isPending || updatePrompt.isPending} className="bg-primary text-primary-foreground">
                  {(createPrompt.isPending || updatePrompt.isPending) ? 'Salvando...' : 'Salvar prompt →'}
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar {...sidebarProps} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[52px] flex items-center justify-between px-5 border-b border-border bg-card/50">
          <div />
          <UserMenu />
        </header>
        <main className="flex-1 p-6">
          {/* Page header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="font-display text-xl font-semibold text-foreground">Meus Prompts</h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">Crie e gerencie seus prompts de geração de imagem</p>
            </div>
            <Button onClick={openCreate} size="sm" className="bg-primary text-primary-foreground gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Criar prompt
            </Button>
          </div>

          {/* Empty state */}
          {!isLoading && prompts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-[14px] text-foreground font-medium mb-1">Nenhum prompt criado ainda</p>
              <p className="text-[12px] text-muted-foreground mb-5 max-w-xs">Crie seu primeiro prompt para acelerar a geração de imagens</p>
              <Button onClick={openCreate} className="bg-primary text-primary-foreground gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Criar meu primeiro prompt
              </Button>
            </div>
          )}

          {/* Search + Sort */}
          {prompts.length > 0 && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome..." className="pl-9 bg-card border-border h-9 text-[12px]" />
                </div>
                <Select value={sort} onValueChange={v => setSort(v as SortMode)}>
                  <SelectTrigger className="w-[160px] h-9 bg-card border-border text-[12px]">
                    <SortAsc className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Mais recentes</SelectItem>
                    <SelectItem value="most_used">Mais usados</SelectItem>
                    <SelectItem value="az">A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filtered.map(p => (
                  <div key={p.id} className="bg-card border border-border rounded-lg p-4 transition-all hover:border-primary/20">
                    <h3 className="text-[13px] font-semibold text-foreground mb-1.5 truncate">{p.name}</h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">{p.prompt_text}</p>

                    {/* Confirm delete inline */}
                    {confirmDeleteId === p.id ? (
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-muted-foreground">Tem certeza?</span>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
                        <button onClick={() => handleDelete(p.id)} className="text-destructive hover:text-destructive/80 transition-colors font-medium">Excluir</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(p)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-3 h-3" /> Editar
                        </button>
                        <button onClick={() => setConfirmDeleteId(p.id)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3 h-3" /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
