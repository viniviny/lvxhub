import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserPrompts, UserPrompt, UserPromptInsert } from '@/hooks/useUserPrompts';
import { BookOpen, Plus, Search, MoreHorizontal, Pencil, Copy, Trash2, ArrowLeft, SortAsc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardSidebar, DashboardView } from '@/components/DashboardSidebar';
import { useStoreContext } from '@/hooks/useStoreContext';
import { UserMenu } from '@/components/UserMenu';

const ANGLE_OPTIONS = [
  { id: 'front', label: 'Frente' },
  { id: 'back', label: 'Costas' },
  { id: 'detail', label: 'Detalhe' },
  { id: 'side', label: 'Lateral' },
  { id: 'flat-lay', label: 'Flat lay' },
  { id: 'texture', label: 'Textura' },
  { id: 'full-look', label: 'Look completo' },
];

type SortMode = 'recent' | 'most_used' | 'az';

export default function PromptsPage() {
  const { prompts, isLoading, createPrompt, updatePrompt, deletePrompt } = useUserPrompts();
  const { stores, activeStoreId, setActiveStore, addStore } = useStoreContext();
  const [editing, setEditing] = useState<UserPrompt | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('recent');
  const [sidebarView, setSidebarView] = useState<DashboardView>('publish');

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [promptText, setPromptText] = useState('');
  const [angles, setAngles] = useState<string[]>([]);
  const [ratio, setRatio] = useState('4:5');
  const [notes, setNotes] = useState('');

  const categories = useMemo(() => {
    const cats = new Set(prompts.map(p => p.category).filter(Boolean) as string[]);
    return Array.from(cats);
  }, [prompts]);

  const filtered = useMemo(() => {
    let list = prompts.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(search.toLowerCase())
    );
    if (sort === 'recent') list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    else if (sort === 'most_used') list.sort((a, b) => b.usage_count - a.usage_count);
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [prompts, search, sort]);

  const openCreate = () => {
    setEditing('new');
    setName(''); setCategory(''); setPromptText(''); setAngles([]); setRatio('4:5'); setNotes('');
  };

  const openEdit = (p: UserPrompt) => {
    setEditing(p);
    setName(p.name); setCategory(p.category || ''); setPromptText(p.prompt_text);
    setAngles(p.default_angles || []); setRatio(p.default_ratio || '4:5'); setNotes(p.personal_notes || '');
  };

  const handleSave = async () => {
    const input: UserPromptInsert = {
      name, category: category || null, prompt_text: promptText,
      default_angles: angles, default_ratio: ratio, personal_notes: notes || null,
    };
    if (editing === 'new') {
      await createPrompt.mutateAsync(input);
    } else if (editing) {
      await updatePrompt.mutateAsync({ id: editing.id, ...input });
    }
    setEditing(null);
  };

  const handleDuplicate = async (p: UserPrompt) => {
    await createPrompt.mutateAsync({
      name: `${p.name} (cópia)`, category: p.category, prompt_text: p.prompt_text,
      default_angles: p.default_angles, default_ratio: p.default_ratio, personal_notes: p.personal_notes,
    });
  };

  const toggleAngle = (id: string) => {
    setAngles(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  // Form view
  if (editing) {
    return (
      <div className="min-h-screen bg-background flex">
        <DashboardSidebar stores={stores} activeStoreId={activeStoreId} onSelectStore={setActiveStore} onAddStore={() => {}} currentView={sidebarView} onViewChange={setSidebarView} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-[52px] flex items-center justify-between px-5 border-b border-border bg-card/50">
            <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <UserMenu />
          </header>
          <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
            <h1 className="font-display text-xl font-semibold text-foreground mb-6">
              {editing === 'new' ? 'Criar prompt' : 'Editar prompt'}
            </h1>

            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Nome *</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Jaqueta Fundo Branco" className="bg-card border-border" />
              </div>

              {/* Category */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Categoria</label>
                <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex: Jaquetas, Camisetas..." list="cat-suggestions" className="bg-card border-border" />
                <datalist id="cat-suggestions">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              {/* Prompt text */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Prompt *</label>
                <Textarea value={promptText} onChange={e => setPromptText(e.target.value.slice(0, 1000))} placeholder="Escreva o prompt que será enviado para a IA ao gerar as imagens.&#10;&#10;Dica: escreva em inglês para melhores resultados." rows={8} className="bg-card border-border resize-none" />
                <span className="text-[10px] text-muted-foreground mt-1 block text-right">{promptText.length}/1000</span>
              </div>

              {/* Default angles */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Ângulos padrão</label>
                <p className="text-[10px] text-muted-foreground/60 mb-2">Esses ângulos serão pré-selecionados ao usar este prompt</p>
                <div className="flex flex-wrap gap-1.5">
                  {ANGLE_OPTIONS.map(a => (
                    <button key={a.id} onClick={() => toggleAngle(a.id)}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                        angles.includes(a.id)
                          ? 'bg-primary/15 border-primary text-[#58A6FF]'
                          : 'bg-card border-border text-muted-foreground hover:border-muted-foreground/40'
                      }`}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default ratio */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Proporção padrão</label>
                <div className="flex gap-2">
                  {['1:1', '4:5'].map(r => (
                    <button key={r} onClick={() => setRatio(r)}
                      className={`px-4 py-2 rounded-md text-[12px] font-medium border transition-all ${
                        ratio === r
                          ? 'bg-primary/15 border-primary text-[#58A6FF]'
                          : 'bg-card border-border text-muted-foreground'
                      }`}>
                      {r === '1:1' ? '⬜ 1:1 Quadrado' : '📱 4:5 Retrato'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Notas</label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações pessoais sobre quando usar este prompt..." rows={2} className="bg-card border-border resize-none" />
              </div>

              {/* Actions */}
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
      <DashboardSidebar stores={stores} activeStoreId={activeStoreId} onSelectStore={setActiveStore} onAddStore={() => {}} currentView={sidebarView} onViewChange={setSidebarView} />
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
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou categoria..." className="pl-9 bg-card border-border h-9 text-[12px]" />
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
                  <div key={p.id} onClick={() => openEdit(p)} className="group bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-primary/30 transition-all">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-[13px] font-medium text-foreground truncate pr-2">{p.name}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <button className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); openEdit(p); }}>
                            <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); handleDuplicate(p); }}>
                            <Copy className="w-3.5 h-3.5 mr-2" /> Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); deletePrompt.mutate(p.id); }} className="text-destructive">
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {p.category && <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{p.category}</span>}
                    <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{p.prompt_text}</p>
                    <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground/60">
                      {p.default_angles.length > 0 && (
                        <span>Ângulos: {p.default_angles.map(a => ANGLE_OPTIONS.find(o => o.id === a)?.label || a).join(' · ')}</span>
                      )}
                      <span>Proporção: {p.default_ratio}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground/40">
                      <span>Usado {p.usage_count}x</span>
                      <span>{new Date(p.updated_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span>
                    </div>
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
