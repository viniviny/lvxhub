import { useRef, useState } from 'react';
import { Plus, Upload, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Model preset images
import modelNone from '@/assets/presets/model-none.jpg';
import modelExec from '@/assets/presets/model-exec.jpg';
import modelYoung from '@/assets/presets/model-young.jpg';
import modelCasual from '@/assets/presets/model-casual.jpg';
import modelAthletic from '@/assets/presets/model-athletic.jpg';

// Background preset images
import bgStudio from '@/assets/presets/bg-studio.jpg';
import bgCream from '@/assets/presets/bg-cream.jpg';
import bgInterior from '@/assets/presets/bg-interior.jpg';
import bgUrban from '@/assets/presets/bg-urban.jpg';
import bgNature from '@/assets/presets/bg-nature.jpg';
import bgDark from '@/assets/presets/bg-dark.jpg';

interface PresetOption {
  id: string;
  label: string;
  descriptor: string;
  image: string;
}

const MODEL_PRESETS: PresetOption[] = [
  { id: 'none', label: 'Sem Modelo', descriptor: 'product only, no person, no model, invisible mannequin, ghost mannequin technique', image: modelNone },
  { id: 'exec', label: 'Executivo Maduro', descriptor: 'MANDATORY MODEL: distinguished well-groomed male model aged 45-55 with short salt-and-pepper beard and elegant glasses, serious refined expression, upright posture, wearing the product naturally — the model MUST match this exact description', image: modelExec },
  { id: 'young', label: 'Profissional Jovem', descriptor: 'MANDATORY MODEL: stylish confident young male model aged 28-38, clean shaven with sharp jawline, modern contemporary look, natural confident expression — the model MUST match this exact description', image: modelYoung },
  { id: 'casual', label: 'Casual Sofisticado', descriptor: 'MANDATORY MODEL: relaxed sophisticated male model aged 30-45, light stubble, effortless natural style, calm composed expression, relaxed body language — the model MUST match this exact description', image: modelCasual },
  { id: 'athletic', label: 'Atlético Premium', descriptor: 'MANDATORY MODEL: athletic fit male model aged 25-35, strong muscular build, broad shoulders, confident powerful posture, defined features — the model MUST match this exact description', image: modelAthletic },
];

const BACKGROUND_PRESETS: PresetOption[] = [
  { id: 'studio', label: 'Estúdio Limpo', descriptor: 'MANDATORY BACKGROUND: pure white seamless studio background, soft even lighting, subtle floor shadow only, no props, no environment', image: bgStudio },
  { id: 'cream', label: 'Neutro Cremoso', descriptor: 'MANDATORY BACKGROUND: warm cream or soft ecru colored background, minimal elegant feel, soft diffused lighting, no props', image: bgCream },
  { id: 'interior', label: 'Interior Premium', descriptor: 'MANDATORY BACKGROUND: sophisticated luxury interior setting with dark wood panelling, warm ambient lighting, leather furniture, bookshelf or fireplace visible, rich warm tones', image: bgInterior },
  { id: 'urban', label: 'Urbano Europeu', descriptor: 'MANDATORY BACKGROUND: European urban street setting, classic stone architecture, wide empty cobblestone avenue, golden hour warm light, cinematic atmosphere', image: bgUrban },
  { id: 'nature', label: 'Natureza Minimalista', descriptor: 'MANDATORY BACKGROUND: minimal outdoor nature setting, soft diffused natural light, neutral earthy tones, blurred greenery, serene and clean', image: bgNature },
  { id: 'dark', label: 'Dark & Dramatic', descriptor: 'MANDATORY BACKGROUND: dark dramatic studio, deep rich shadows, single directional key light, Rembrandt lighting style, moody atmosphere, dark grey or black background', image: bgDark },
];

export interface CustomPreset {
  id: string;
  label: string;
  descriptor: string;
  image: string;
  type: 'model' | 'background';
}

interface ModelBackgroundPresetsProps {
  selectedModel: string | null;
  selectedBackground: string | null;
  onModelChange: (id: string | null) => void;
  onBackgroundChange: (id: string | null) => void;
  customPresets?: CustomPreset[];
  onAddCustomPreset?: (preset: CustomPreset) => void | Promise<void>;
  onRemoveCustomPreset?: (id: string) => void;
  hiddenBuiltinIds?: string[];
  onHideBuiltinPreset?: (id: string) => void;
  onRestoreBuiltinPresets?: () => void;
}

function PresetCard({ preset, active, onClick, onRemove }: { preset: PresetOption | CustomPreset; active: boolean; onClick: () => void; onRemove?: () => void }) {
  return (
    <div className="relative shrink-0 group">
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute -top-1 -right-1 z-10 w-5 h-5 rounded-full bg-background/90 backdrop-blur-sm border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md"
          title="Remover"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      <button
        onClick={onClick}
        className={`flex flex-col items-center w-[80px] rounded-xl border-2 transition-all duration-200 overflow-hidden ${
          active
            ? 'border-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)] scale-[1.02]'
            : 'border-transparent hover:border-border hover:shadow-md bg-card/50'
        }`}
      >
        <div className={`w-full h-[60px] overflow-hidden rounded-t-[10px] ${active ? '' : 'grayscale-[30%] group-hover:grayscale-0'} transition-all duration-200`}>
          <img
            src={preset.image}
            alt={preset.label}
            className={`w-full h-full object-cover transition-all duration-200 ${active ? 'scale-105' : 'group-hover:scale-105'}`}
            loading="lazy"
            width={80}
            height={60}
          />
        </div>
        <div className={`w-full px-1 py-1.5 text-center transition-colors duration-200 ${active ? 'bg-primary/10' : 'bg-card/80'}`}>
          <span className={`text-[9px] font-semibold leading-tight tracking-wide ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
            {preset.label}
          </span>
        </div>
      </button>
    </div>
  );
}

interface AddPresetDialogState {
  open: boolean;
  type: 'model' | 'background';
  file: File | null;
  preview: string | null;
  name: string;
  descriptor: string;
}

function AddPresetButton({ type, onAdd }: { type: 'model' | 'background'; onAdd: (preset: CustomPreset) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dialog, setDialog] = useState<AddPresetDialogState>({
    open: false, type, file: null, preview: null, name: '', descriptor: '',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Máximo 5MB por imagem'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setDialog(prev => ({ ...prev, open: true, file, preview: reader.result as string, name: '', descriptor: '' }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleConfirm = () => {
    if (!dialog.name.trim()) { toast.error('Informe um nome'); return; }
    if (!dialog.preview) return;
    const preset: CustomPreset = {
      id: `custom-${Date.now()}`,
      label: dialog.name.trim(),
      descriptor: dialog.descriptor.trim() || dialog.name.trim(),
      image: dialog.preview,
      type,
    };
    onAdd(preset);
    setDialog(prev => ({ ...prev, open: false, file: null, preview: null, name: '', descriptor: '' }));
    toast.success(`${type === 'model' ? 'Modelo' : 'Fundo'} adicionado!`);
  };

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        className="shrink-0 flex flex-col items-center justify-center gap-1.5 w-[80px] h-[82px] rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 text-muted-foreground hover:text-primary transition-all duration-200 hover:bg-primary/5 hover:shadow-sm"
      >
        <Plus className="w-4 h-4" />
        <span className="text-[8px] font-semibold tracking-wide">Adicionar</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <Dialog open={dialog.open} onOpenChange={(open) => setDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              {type === 'model' ? 'Novo Modelo' : 'Novo Fundo'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Image preview */}
            {dialog.preview && (
              <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border bg-secondary">
                <img src={dialog.preview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => inputRef.current?.click()}
                  className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background/80 backdrop-blur-sm border border-border text-xs text-foreground hover:bg-background transition-colors"
                >
                  <Upload className="w-3 h-3" />
                  Trocar
                </button>
              </div>
            )}

            {/* Name field */}
            <div className="space-y-1.5">
              <Label htmlFor="preset-name" className="text-xs">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id="preset-name"
                placeholder={type === 'model' ? 'Ex: Modelo Clássico' : 'Ex: Escritório Moderno'}
                value={dialog.name}
                onChange={e => setDialog(prev => ({ ...prev, name: e.target.value }))}
                className="h-9 text-sm"
                autoFocus
              />
            </div>

            {/* Descriptor field */}
            <div className="space-y-1.5">
              <Label htmlFor="preset-descriptor" className="text-xs">
                Descritor para a IA
              </Label>
              <Textarea
                id="preset-descriptor"
                placeholder={
                  type === 'model'
                    ? 'Ex: distinguished man aged 40-50, casual style, natural expression'
                    : 'Ex: modern office interior, glass walls, natural light, minimalist'
                }
                value={dialog.descriptor}
                onChange={e => setDialog(prev => ({ ...prev, descriptor: e.target.value }))}
                className="text-sm min-h-[60px] resize-none"
                rows={2}
              />
              <p className="text-[10px] text-muted-foreground">
                Texto em inglês que será combinado ao prompt de geração. Se vazio, usa o nome.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setDialog(prev => ({ ...prev, open: false }))}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={!dialog.name.trim()}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ModelBackgroundPresets({ selectedModel, selectedBackground, onModelChange, onBackgroundChange, customPresets = [], onAddCustomPreset, onRemoveCustomPreset, hiddenBuiltinIds = [], onHideBuiltinPreset, onRestoreBuiltinPresets }: ModelBackgroundPresetsProps) {
  const customModels = customPresets.filter(p => p.type === 'model');
  const customBackgrounds = customPresets.filter(p => p.type === 'background');
  const visibleModels = MODEL_PRESETS.filter(p => !hiddenBuiltinIds.includes(p.id));
  const visibleBackgrounds = BACKGROUND_PRESETS.filter(p => !hiddenBuiltinIds.includes(p.id));
  const hasHidden = hiddenBuiltinIds.length > 0;

  return (
    <div className="space-y-3">
      {/* MODEL SECTION */}
      <div>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">Modelo</span>
        <div className="flex gap-2 mt-1.5 overflow-x-auto pb-1.5 preset-scroll">
          {visibleModels.map(p => (
            <PresetCard key={p.id} preset={p} active={selectedModel === p.id} onClick={() => onModelChange(selectedModel === p.id ? null : p.id)} onRemove={onHideBuiltinPreset ? () => { if (selectedModel === p.id) onModelChange(null); onHideBuiltinPreset(p.id); } : undefined} />
          ))}
          {customModels.map(p => (
            <PresetCard key={p.id} preset={p} active={selectedModel === p.id} onClick={() => onModelChange(selectedModel === p.id ? null : p.id)} onRemove={onRemoveCustomPreset ? () => { if (selectedModel === p.id) onModelChange(null); onRemoveCustomPreset(p.id); } : undefined} />
          ))}
          {onAddCustomPreset && <AddPresetButton type="model" onAdd={onAddCustomPreset} />}
        </div>
      </div>

      {/* BACKGROUND SECTION */}
      <div>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">Fundo</span>
        <div className="flex gap-2 mt-1.5 overflow-x-auto pb-1.5 preset-scroll">
          {visibleBackgrounds.map(p => (
            <PresetCard key={p.id} preset={p} active={selectedBackground === p.id} onClick={() => onBackgroundChange(selectedBackground === p.id ? null : p.id)} onRemove={onHideBuiltinPreset ? () => { if (selectedBackground === p.id) onBackgroundChange(null); onHideBuiltinPreset(p.id); } : undefined} />
          ))}
          {customBackgrounds.map(p => (
            <PresetCard key={p.id} preset={p} active={selectedBackground === p.id} onClick={() => onBackgroundChange(selectedBackground === p.id ? null : p.id)} onRemove={onRemoveCustomPreset ? () => { if (selectedBackground === p.id) onBackgroundChange(null); onRemoveCustomPreset(p.id); } : undefined} />
          ))}
          {onAddCustomPreset && <AddPresetButton type="background" onAdd={onAddCustomPreset} />}
        </div>
      </div>

    </div>
  );
}

export function getModelDescriptor(id: string | null, customPresets: CustomPreset[] = []): string {
  const builtin = MODEL_PRESETS.find(p => p.id === id);
  if (builtin) return builtin.descriptor;
  const custom = customPresets.find(p => p.id === id);
  return custom?.descriptor || '';
}

export function getBackgroundDescriptor(id: string | null, customPresets: CustomPreset[] = []): string {
  const builtin = BACKGROUND_PRESETS.find(p => p.id === id);
  if (builtin) return builtin.descriptor;
  const custom = customPresets.find(p => p.id === id);
  return custom?.descriptor || '';
}

export function getModelImage(id: string | null, customPresets: CustomPreset[] = []): string {
  const builtin = MODEL_PRESETS.find(p => p.id === id);
  if (builtin) return builtin.image;
  const custom = customPresets.find(p => p.id === id);
  return custom?.image || '';
}

export function getBackgroundImage(id: string | null, customPresets: CustomPreset[] = []): string {
  const builtin = BACKGROUND_PRESETS.find(p => p.id === id);
  if (builtin) return builtin.image;
  const custom = customPresets.find(p => p.id === id);
  return custom?.image || '';
}
