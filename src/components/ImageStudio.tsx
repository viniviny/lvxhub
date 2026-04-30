/**
 * Image Studio — independent visual creation tool.
 * No connection to products, drafts, Shopify, stores, markets, or publish.
 * Three-column premium layout: Flow / Canvas / Controls.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2, Plus, FolderPlus, Layers, Image as ImageIcon, Sparkles, Loader2,
  Star, Check, X, Download, Trash2, GitBranch, Anchor, Lock, Unlock,
  Square, RectangleVertical, Smartphone, Monitor, ChevronRight, MoreHorizontal,
  Palette, Camera, Lightbulb, ImagePlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useImageStudio, type StudioImage } from '@/hooks/useImageStudio';

type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9';

const RATIOS: { id: AspectRatio; label: string; icon: any; cls: string }[] = [
  { id: '1:1', label: '1:1', icon: Square, cls: 'aspect-square' },
  { id: '4:5', label: '4:5', icon: RectangleVertical, cls: 'aspect-[4/5]' },
  { id: '9:16', label: '9:16', icon: Smartphone, cls: 'aspect-[9/16]' },
  { id: '16:9', label: '16:9', icon: Monitor, cls: 'aspect-[16/9]' },
];

const ROLE_LABELS_PT: Record<string, string> = {
  anchor: 'âncora',
  variation: 'variação',
  branch: 'ramificação',
  upscale: 'upscale',
};
const roleLabelPt = (r?: string | null) => (r && ROLE_LABELS_PT[r]) || r || '';

type Locks = {
  style: boolean;
  product: boolean;
  background: boolean;
  model: boolean;
  useAnchor: boolean;
  useSeedFamily: boolean;
};

const DEFAULT_LOCKS: Locks = {
  style: true,
  product: true,
  background: false,
  model: false,
  useAnchor: true,
  useSeedFamily: true,
};

export function ImageStudio() {
  const studio = useImageStudio();
  const {
    loading, projects, sessions, images,
    activeProject, activeSession, activeProjectId, activeSessionId,
    createProject, selectProject, selectSession, deleteProject,
    setAnchor, setApproved, deleteImage, generate, updateSessionDNA,
  } = studio;

  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:5');
  const [quantity, setQuantity] = useState<1 | 2 | 4>(1);
  const [quality, setQuality] = useState<'standard' | 'high' | 'ultra'>('high');
  const [format, setFormat] = useState<'png' | 'jpg' | 'webp'>('png');
  const [locks, setLocks] = useState<Locks>(DEFAULT_LOCKS);
  const [generating, setGenerating] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [confirmDeleteImage, setConfirmDeleteImage] = useState<string | null>(null);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'canvas' | 'flow' | 'controls' | 'approved'>('canvas');

  const selectedImage = useMemo(
    () => images.find((i) => i.id === selectedImageId) || images[images.length - 1] || null,
    [images, selectedImageId],
  );
  const anchorImage = useMemo(
    () => images.find((i) => i.id === activeSession?.anchor_image_id) || null,
    [images, activeSession],
  );
  const approvedImages = useMemo(() => images.filter((i) => i.approved), [images]);

  // Auto-select latest image after generation
  useEffect(() => {
    if (!selectedImageId && images.length > 0) {
      setSelectedImageId(images[images.length - 1].id);
    }
  }, [images, selectedImageId]);

  const handleGenerate = async (overrides?: { role?: string; parent_image_id?: string }) => {
    if (!activeProjectId || !activeSessionId) {
      toast.error('Crie um projeto visual primeiro');
      setNewProjectOpen(true);
      return;
    }
    if (prompt.trim().length < 3) {
      toast.error('Descreva sua imagem (mínimo 3 caracteres)');
      return;
    }
    setGenerating(true);
    try {
      await generate({
        user_prompt: prompt.trim(),
        role: overrides?.role || (images.length === 0 ? 'anchor' : 'variation'),
        locks,
        output: { quantity, aspect_ratio: aspectRatio, quality, format },
        parent_image_id: overrides?.parent_image_id,
      });
      toast.success('Imagem gerada');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao gerar');
    } finally {
      setGenerating(false);
    }
  };

  const handleVariation = () => {
    if (!selectedImage) return;
    handleGenerate({ role: 'variation', parent_image_id: selectedImage.id });
  };
  const handleBranch = () => {
    if (!selectedImage) return;
    handleGenerate({ role: 'branch', parent_image_id: selectedImage.id });
  };

  const handleDownload = (img: StudioImage) => {
    const a = document.createElement('a');
    a.href = img.image_url;
    a.download = `studio-${img.id.slice(0, 8)}.${img.format || 'png'}`;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.click();
  };

  const handleNewProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      await createProject(newProjectName.trim());
      setNewProjectName('');
      setNewProjectOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar projeto');
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-120px)]">
        <Skeleton className="col-span-3 h-full" />
        <Skeleton className="col-span-6 h-full" />
        <Skeleton className="col-span-3 h-full" />
      </div>
    );
  }

  // ───────────────────── EMPTY: NO PROJECTS YET ─────────────────────
  if (projects.length === 0) {
    return (
      <>
        <EmptyStudio onCreate={() => setNewProjectOpen(true)} />
        <NewProjectDialog
          open={newProjectOpen}
          onOpenChange={setNewProjectOpen}
          name={newProjectName}
          setName={setNewProjectName}
          onCreate={handleNewProject}
        />
      </>
    );
  }

  // ───────────────────── PANELS ─────────────────────
  const FlowPanel = (
    <FlowSidebar
      projects={projects}
      activeProjectId={activeProjectId}
      sessions={sessions}
      activeSessionId={activeSessionId}
      images={images}
      anchorImage={anchorImage}
      selectedImageId={selectedImage?.id || null}
      approvedImages={approvedImages}
      onSelectProject={selectProject}
      onSelectSession={selectSession}
      onSelectImage={setSelectedImageId}
      onNewProject={() => setNewProjectOpen(true)}
      onDeleteProject={(id) => setConfirmDeleteProject(id)}
    />
  );

  const CanvasPanel = (
    <Canvas
      image={selectedImage}
      isGenerating={generating}
      isAnchor={selectedImage?.id === activeSession?.anchor_image_id}
      anchorImage={anchorImage}
      onSetAnchor={() => selectedImage && setAnchor(selectedImage.id)}
      onApprove={() => selectedImage && setApproved(selectedImage.id, !selectedImage.approved)}
      onDownload={() => selectedImage && handleDownload(selectedImage)}
      onDelete={() => selectedImage && setConfirmDeleteImage(selectedImage.id)}
      onVariation={handleVariation}
      onBranch={handleBranch}
      onStartFromPrompt={() => {
        const el = document.getElementById('studio-prompt-textarea');
        el?.focus();
      }}
    />
  );

  const ControlsPanel = (
    <ControlsSidebar
      prompt={prompt}
      setPrompt={setPrompt}
      aspectRatio={aspectRatio}
      setAspectRatio={setAspectRatio}
      quantity={quantity}
      setQuantity={setQuantity}
      quality={quality}
      setQuality={setQuality}
      format={format}
      setFormat={setFormat}
      locks={locks}
      setLocks={setLocks}
      generating={generating}
      onGenerate={() => handleGenerate()}
      onVariation={handleVariation}
      onBranch={handleBranch}
      hasImage={!!selectedImage}
      hasAnchor={!!anchorImage}
    />
  );

  return (
    <div className="animate-fade-in">
      {/* Studio header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">Image Studio</h2>
            <p className="text-xs text-muted-foreground">
              {activeProject?.name || 'Projeto visual'} · {activeSession?.name || 'Sessão'} ·{' '}
              {images.length} imagens · {approvedImages.length} aprovadas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setNewProjectOpen(true)}>
            <FolderPlus className="w-4 h-4 mr-2" /> Novo Projeto
          </Button>
        </div>
      </div>

      {/* DESKTOP: 3 columns */}
      <div className="hidden lg:grid grid-cols-12 gap-4 h-[calc(100vh-180px)] min-h-[640px]">
        <div className="col-span-3 min-h-0">{FlowPanel}</div>
        <div className="col-span-6 min-h-0">{CanvasPanel}</div>
        <div className="col-span-3 min-h-0">{ControlsPanel}</div>
      </div>

      {/* MOBILE/TABLET: tabs */}
      <div className="lg:hidden">
        <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as any)}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="canvas">Tela</TabsTrigger>
            <TabsTrigger value="flow">Fluxo</TabsTrigger>
            <TabsTrigger value="controls">Controles</TabsTrigger>
            <TabsTrigger value="approved">Aprovadas</TabsTrigger>
          </TabsList>
          <TabsContent value="canvas" className="h-[calc(100vh-220px)] min-h-[480px]">{CanvasPanel}</TabsContent>
          <TabsContent value="flow" className="h-[calc(100vh-220px)] min-h-[480px]">{FlowPanel}</TabsContent>
          <TabsContent value="controls" className="h-[calc(100vh-220px)] min-h-[480px]">{ControlsPanel}</TabsContent>
          <TabsContent value="approved" className="h-[calc(100vh-220px)] min-h-[480px]">
            <ApprovedGrid images={approvedImages} onSelect={(id) => { setSelectedImageId(id); setMobileTab('canvas'); }} />
          </TabsContent>
        </Tabs>
        {/* sticky generate */}
        <div className="fixed bottom-4 left-4 right-4 z-30">
          <Button className="w-full h-12 text-base shadow-2xl" onClick={() => handleGenerate()} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Gerar
          </Button>
        </div>
      </div>

      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        name={newProjectName}
        setName={setNewProjectName}
        onCreate={handleNewProject}
      />

      <AlertDialog open={!!confirmDeleteImage} onOpenChange={(o) => !o && setConfirmDeleteImage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar imagem?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDeleteImage) return;
                await deleteImage(confirmDeleteImage);
                setConfirmDeleteImage(null);
                setSelectedImageId(null);
                toast.success('Imagem apagada');
              }}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDeleteProject} onOpenChange={(o) => !o && setConfirmDeleteProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar projeto visual?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as sessões e imagens deste projeto serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDeleteProject) return;
                await deleteProject(confirmDeleteProject);
                setConfirmDeleteProject(null);
                toast.success('Projeto removido');
              }}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════
function EmptyStudio({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
          <Wand2 className="w-7 h-7 text-primary" />
        </div>
        <h2 className="font-display text-2xl font-semibold tracking-tight mb-2">
          Inicie um fluxo visual
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Crie um projeto visual independente. Defina uma direção, gere variações infinitas e
          mantenha consistência sem depender de produto, loja ou publicação.
        </p>
        <Button onClick={onCreate} size="lg" className="px-6">
          <Plus className="w-4 h-4 mr-2" /> Novo Projeto Visual
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// FLOW SIDEBAR (LEFT)
// ═══════════════════════════════════════════════════════════════════════
function FlowSidebar(props: {
  projects: any[];
  activeProjectId: string | null;
  sessions: any[];
  activeSessionId: string | null;
  images: StudioImage[];
  anchorImage: StudioImage | null;
  selectedImageId: string | null;
  approvedImages: StudioImage[];
  onSelectProject: (id: string) => void;
  onSelectSession: (id: string) => void;
  onSelectImage: (id: string) => void;
  onNewProject: () => void;
  onDeleteProject: (id: string) => void;
}) {
  const variations = props.images.filter((i) => i.role !== 'anchor' && !i.branch_id);
  const branches = props.images.filter((i) => i.role === 'branch' || i.branch_id);

  return (
    <aside className="h-full rounded-xl border border-border bg-card/40 backdrop-blur-sm flex flex-col overflow-hidden">
      <header className="px-3 py-3 border-b border-border flex items-center justify-between">
        <span className="label-mono">Fluxo</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={props.onNewProject}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
        {/* PROJECTS */}
        <section>
          <span className="label-mono mb-2 block">Projetos</span>
          <div className="space-y-1">
            {props.projects.map((p) => {
              const active = p.id === props.activeProjectId;
              return (
                <button
                  key={p.id}
                  onClick={() => props.onSelectProject(p.id)}
                  className={cn(
                    'group w-full text-left px-2.5 py-2 rounded-lg text-[13px] transition flex items-center gap-2',
                    active
                      ? 'bg-primary/10 text-foreground border border-primary/20'
                      : 'hover:bg-secondary/60 text-muted-foreground hover:text-foreground border border-transparent',
                  )}
                >
                  <Layers className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate flex-1">{p.name}</span>
                  {active && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); props.onDeleteProject(p.id); }}
                      className="opacity-0 group-hover:opacity-100 transition cursor-pointer p-1 rounded hover:bg-destructive/10"
                      aria-label="Apagar projeto"
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* SESSIONS */}
        {props.sessions.length > 0 && (
          <section>
            <span className="label-mono mb-2 block">Sessões</span>
            <div className="space-y-1">
              {props.sessions.map((s) => {
                const active = s.id === props.activeSessionId;
                return (
                  <button
                    key={s.id}
                    onClick={() => props.onSelectSession(s.id)}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded-md text-xs transition flex items-center gap-2',
                      active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50',
                    )}
                  >
                    <ChevronRight className="w-3 h-3 opacity-60" />
                    <span className="truncate">{s.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ANCHOR */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <span className="label-mono">Anchor</span>
            {props.anchorImage && (
              <Badge variant="outline" className="h-4 text-[9px] px-1.5 border-primary/30 text-primary">
                ATIVA
              </Badge>
            )}
          </div>
          {props.anchorImage ? (
            <FlowImageThumb image={props.anchorImage} active={props.selectedImageId === props.anchorImage.id} onClick={() => props.onSelectImage(props.anchorImage!.id)} />
          ) : (
            <div className="text-[11px] text-muted-foreground px-2 py-3 rounded-lg border border-dashed border-border">
              Nenhuma âncora. Selecione uma imagem e clique em "Definir como Âncora".
            </div>
          )}
        </section>

        {/* VARIATIONS */}
        {variations.length > 0 && (
          <section>
            <span className="label-mono mb-2 block">Variações ({variations.length})</span>
            <div className="grid grid-cols-2 gap-1.5">
              {variations.slice().reverse().map((img) => (
                <FlowImageThumb
                  key={img.id}
                  image={img}
                  active={props.selectedImageId === img.id}
                  onClick={() => props.onSelectImage(img.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* BRANCHES */}
        {branches.length > 0 && (
          <section>
            <span className="label-mono mb-2 block flex items-center gap-1">
              <GitBranch className="w-3 h-3" /> Branches ({branches.length})
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {branches.slice().reverse().map((img) => (
                <FlowImageThumb
                  key={img.id}
                  image={img}
                  active={props.selectedImageId === img.id}
                  onClick={() => props.onSelectImage(img.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* APPROVED */}
        <section>
          <span className="label-mono mb-2 block flex items-center gap-1">
            <Check className="w-3 h-3" /> Aprovadas ({props.approvedImages.length})
          </span>
          {props.approvedImages.length === 0 ? (
            <p className="text-[11px] text-muted-foreground px-1">Aprove imagens para listar aqui.</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {props.approvedImages.slice().reverse().slice(0, 9).map((img) => (
                <FlowImageThumb
                  key={img.id}
                  image={img}
                  active={props.selectedImageId === img.id}
                  onClick={() => props.onSelectImage(img.id)}
                  small
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}

function FlowImageThumb({
  image, active, onClick, small,
}: { image: StudioImage; active: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative aspect-square rounded-md overflow-hidden border transition',
        active ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-foreground/30',
      )}
    >
      <img src={image.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
      {image.role === 'anchor' && (
        <span className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-sm p-0.5">
          <Anchor className={small ? 'w-2 h-2' : 'w-2.5 h-2.5'} />
        </span>
      )}
      {image.approved && (
        <span className="absolute top-1 right-1 bg-success text-white rounded-sm p-0.5">
          <Check className={small ? 'w-2 h-2' : 'w-2.5 h-2.5'} />
        </span>
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CANVAS (CENTER)
// ═══════════════════════════════════════════════════════════════════════
function Canvas(props: {
  image: StudioImage | null;
  isGenerating: boolean;
  isAnchor: boolean;
  anchorImage: StudioImage | null;
  onSetAnchor: () => void;
  onApprove: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onVariation: () => void;
  onBranch: () => void;
  onStartFromPrompt: () => void;
}) {
  return (
    <div className="h-full rounded-xl border border-border bg-card/40 backdrop-blur-sm flex flex-col overflow-hidden">
      <header className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="label-mono">Tela</span>
        {props.image && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Badge variant="outline" className="h-5 text-[10px] capitalize">
              {roleLabelPt(props.image.role)}
            </Badge>
            {props.image.aspect_ratio && (
              <Badge variant="outline" className="h-5 text-[10px]">{props.image.aspect_ratio}</Badge>
            )}
            {props.image.mode && (
              <Badge variant="outline" className="h-5 text-[10px] capitalize">{modeLabelPt(props.image.mode)}</Badge>
            )}
          </div>
        )}
      </header>

      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden bg-[radial-gradient(ellipse_at_center,hsl(var(--secondary))_0%,hsl(var(--background))_70%)]">
        {props.isGenerating && !props.image ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Gerando direção visual</p>
              <p className="text-xs text-muted-foreground">Isso leva ~30s</p>
            </div>
            <span className="loader-dots text-primary"><span /><span /><span /></span>
          </div>
        ) : props.image ? (
          <AnimatePresence mode="wait">
            <motion.img
              key={props.image.id}
              src={props.image.image_url}
              alt=""
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </AnimatePresence>
        ) : (
          <div className="text-center max-w-sm">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center mb-4">
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg font-semibold mb-1">Crie sua primeira direção visual</h3>
            <p className="text-xs text-muted-foreground mb-5">
              Comece pelo prompt à direita ou carregue uma referência para definir a âncora.
            </p>
            <Button onClick={props.onStartFromPrompt} variant="outline">
              <Sparkles className="w-4 h-4 mr-2" /> Começar pelo prompt
            </Button>
          </div>
        )}
      </div>

      {props.image && (
        <footer className="px-4 py-3 border-t border-border bg-card/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant={props.isAnchor ? 'default' : 'outline'} onClick={props.onSetAnchor} disabled={props.isAnchor}>
              <Anchor className="w-3.5 h-3.5 mr-1.5" />
              {props.isAnchor ? 'Âncora' : 'Definir como Âncora'}
            </Button>
            <Button
              size="sm"
              variant={props.image.approved ? 'default' : 'outline'}
              onClick={props.onApprove}
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              {props.image.approved ? 'Aprovada' : 'Aprovar'}
            </Button>
            <Button size="sm" variant="outline" onClick={props.onVariation}>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Variação
            </Button>
            <Button size="sm" variant="outline" onClick={props.onBranch}>
              <GitBranch className="w-3.5 h-3.5 mr-1.5" /> Ramificar
            </Button>
            <div className="ml-auto flex items-center gap-1.5">
              <Button size="sm" variant="ghost" onClick={props.onDownload}>
                <Download className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={props.onDelete}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CONTROLS SIDEBAR (RIGHT)
// ═══════════════════════════════════════════════════════════════════════
function ControlsSidebar(props: {
  prompt: string; setPrompt: (v: string) => void;
  mode: string; setMode: (v: string) => void;
  aspectRatio: AspectRatio; setAspectRatio: (v: AspectRatio) => void;
  quantity: 1 | 2 | 4; setQuantity: (v: 1 | 2 | 4) => void;
  quality: 'standard' | 'high' | 'ultra'; setQuality: (v: any) => void;
  format: 'png' | 'jpg' | 'webp'; setFormat: (v: any) => void;
  presetId: string; setPresetId: (v: string) => void;
  presets: any[];
  locks: Locks; setLocks: (v: Locks) => void;
  generating: boolean;
  hasImage: boolean; hasAnchor: boolean;
  onGenerate: () => void; onVariation: () => void; onBranch: () => void;
}) {
  const stylePresets = props.presets.filter((p) => p.preset_type === 'style');
  const packPresets = props.presets.filter((p) => p.preset_type === 'pack');

  return (
    <aside className="h-full rounded-xl border border-border bg-card/40 backdrop-blur-sm flex flex-col overflow-hidden">
      <header className="px-3 py-3 border-b border-border flex items-center gap-2">
        <span className="label-mono">Controles</span>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-5">
        {/* PROMPT */}
        <section className="space-y-2">
          <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Prompt</Label>
          <Textarea
            id="studio-prompt-textarea"
            value={props.prompt}
            onChange={(e) => props.setPrompt(e.target.value.slice(0, 2000))}
            placeholder="Ex.: Sweater de cashmere bege em modelo, luz natural editorial, fundo neutro..."
            rows={4}
            className="resize-none text-sm"
          />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{props.prompt.length}/2000</span>
          </div>
        </section>

        {/* PRESET */}
        <section className="space-y-2">
          <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Preset</Label>
          <Select value={props.presetId || 'none'} onValueChange={(v) => props.setPresetId(v === 'none' ? '' : v)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Sem preset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem preset</SelectItem>
              {stylePresets.length > 0 && (
                <>
                  <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wider">Estilo</div>
                  {stylePresets.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </>
              )}
              {packPresets.length > 0 && (
                <>
                  <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wider">Packs</div>
                  {packPresets.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </section>

        {/* MODE */}
        <section className="space-y-2">
          <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Modo</Label>
          <div className="flex flex-wrap gap-1.5">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => props.setMode(m.id)}
                className={cn(
                  'px-2.5 py-1 text-[11px] rounded-full border transition',
                  props.mode === m.id
                    ? 'bg-primary/10 border-primary/30 text-foreground'
                    : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-foreground/30',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </section>

        {/* CONSISTENCY (Visual DNA Locks) */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Consistência</Label>
            <span className="text-[9px] text-muted-foreground">DNA Visual</span>
          </div>
          <div className="space-y-1.5 rounded-lg border border-border bg-secondary/30 p-2.5">
            <LockRow icon={<Palette className="w-3 h-3" />} label="Travar Estilo" enabled={props.locks.style} onChange={(v) => props.setLocks({ ...props.locks, style: v })} />
            <LockRow icon={<Lock className="w-3 h-3" />} label="Travar Produto" enabled={props.locks.product} onChange={(v) => props.setLocks({ ...props.locks, product: v })} />
            <LockRow icon={<ImageIcon className="w-3 h-3" />} label="Travar Fundo" enabled={props.locks.background} onChange={(v) => props.setLocks({ ...props.locks, background: v })} />
            <LockRow icon={<Camera className="w-3 h-3" />} label="Travar Modelo" enabled={props.locks.model} onChange={(v) => props.setLocks({ ...props.locks, model: v })} />
            <LockRow icon={<Anchor className="w-3 h-3" />} label="Usar Âncora" enabled={props.locks.useAnchor} onChange={(v) => props.setLocks({ ...props.locks, useAnchor: v })} disabled={!props.hasAnchor} hint={!props.hasAnchor ? 'Defina uma âncora' : undefined} />
            <LockRow icon={<Sparkles className="w-3 h-3" />} label="Família de Seeds" enabled={props.locks.useSeedFamily} onChange={(v) => props.setLocks({ ...props.locks, useSeedFamily: v })} />
          </div>
        </section>

        {/* OUTPUT */}
        <section className="space-y-3">
          <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Saída</Label>

          <div>
            <span className="text-[10px] text-muted-foreground">Proporção</span>
            <div className="grid grid-cols-4 gap-1.5 mt-1">
              {RATIOS.map((r) => {
                const Icon = r.icon;
                const active = props.aspectRatio === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => props.setAspectRatio(r.id)}
                    className={cn(
                      'h-12 rounded-md border flex flex-col items-center justify-center gap-0.5 transition text-[10px]',
                      active ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-foreground/30',
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-[10px] text-muted-foreground">Quantidade</span>
            <div className="grid grid-cols-3 gap-1.5 mt-1">
              {([1, 2, 4] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => props.setQuantity(n)}
                  className={cn(
                    'h-9 rounded-md border text-xs transition',
                    props.quantity === n ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-foreground/30',
                  )}
                >
                  {n} img
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-muted-foreground">Qualidade</span>
              <Select value={props.quality} onValueChange={props.setQuality}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Padrão</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="ultra">Ultra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground">Formato</span>
              <Select value={props.format} onValueChange={props.setFormat}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="jpg">JPG</SelectItem>
                  <SelectItem value="webp">WebP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>
      </div>

      {/* ACTIONS (sticky) */}
      <div className="border-t border-border p-3 space-y-2 bg-card/60 backdrop-blur-sm">
        <Button className="w-full h-10" onClick={props.onGenerate} disabled={props.generating || props.prompt.trim().length < 3}>
          {props.generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {props.generating ? 'Gerando...' : 'Gerar'}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={props.onVariation} disabled={props.generating || !props.hasImage}>
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Variação
          </Button>
          <Button variant="outline" size="sm" onClick={props.onBranch} disabled={props.generating || !props.hasImage}>
            <GitBranch className="w-3.5 h-3.5 mr-1.5" /> Ramificar
          </Button>
        </div>
      </div>
    </aside>
  );
}

function LockRow({
  icon, label, enabled, onChange, disabled, hint,
}: { icon: React.ReactNode; label: string; enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean; hint?: string }) {
  return (
    <div className={cn('flex items-center justify-between px-1.5 py-1', disabled && 'opacity-50')}>
      <div className="flex items-center gap-2 text-[12px]">
        <span className={cn(enabled ? 'text-primary' : 'text-muted-foreground')}>{icon}</span>
        <span>{label}</span>
        {hint && <span className="text-[10px] text-muted-foreground">({hint})</span>}
      </div>
      <Switch checked={enabled} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// APPROVED GRID (mobile)
// ═══════════════════════════════════════════════════════════════════════
function ApprovedGrid({ images, onSelect }: { images: StudioImage[]; onSelect: (id: string) => void }) {
  if (images.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center text-muted-foreground text-sm">
        Aprove imagens no Canvas para listá-las aqui.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2 p-2">
      {images.map((img) => (
        <button key={img.id} onClick={() => onSelect(img.id)} className="aspect-square rounded-lg overflow-hidden border border-border">
          <img src={img.image_url} alt="" className="w-full h-full object-cover" />
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// NEW PROJECT DIALOG
// ═══════════════════════════════════════════════════════════════════════
function NewProjectDialog({
  open, onOpenChange, name, setName, onCreate,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  name: string; setName: (v: string) => void;
  onCreate: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo projeto visual</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="vp-name">Nome do projeto</Label>
          <Input
            id="vp-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Coleção Inverno — Sweater Premium"
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onCreate(); }}
          />
          <p className="text-[11px] text-muted-foreground">
            Uma sessão inicial será criada automaticamente.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onCreate} disabled={!name.trim()}>Criar projeto</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}