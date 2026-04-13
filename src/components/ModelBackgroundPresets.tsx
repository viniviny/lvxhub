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
  { id: 'none', label: 'Sem Modelo', descriptor: 'product only, no person, invisible mannequin', image: modelNone },
  { id: 'exec', label: 'Executivo Maduro', descriptor: 'distinguished well-groomed man aged 45-55, beard, glasses, serious refined expression', image: modelExec },
  { id: 'young', label: 'Profissional Jovem', descriptor: 'stylish confident man aged 28-38, clean shaven, modern look', image: modelYoung },
  { id: 'casual', label: 'Casual Sofisticado', descriptor: 'relaxed sophisticated man aged 30-45, effortless style, natural expression', image: modelCasual },
  { id: 'athletic', label: 'Atlético Premium', descriptor: 'athletic fit man aged 25-35, strong build, confident posture', image: modelAthletic },
];

const BACKGROUND_PRESETS: PresetOption[] = [
  { id: 'studio', label: 'Estúdio Limpo', descriptor: 'pure white studio background, seamless, soft shadows', image: bgStudio },
  { id: 'cream', label: 'Neutro Cremoso', descriptor: 'warm cream or soft ecru background, minimal, elegant', image: bgCream },
  { id: 'interior', label: 'Interior Premium', descriptor: 'sophisticated interior, dark wood panelling, warm ambient light, fireplace or library', image: bgInterior },
  { id: 'urban', label: 'Urbano Europeu', descriptor: 'European urban setting, stone architecture, wide empty avenue, golden hour', image: bgUrban },
  { id: 'nature', label: 'Natureza Minimalista', descriptor: 'minimal outdoor nature setting, soft natural light, neutral tones', image: bgNature },
  { id: 'dark', label: 'Dark & Dramatic', descriptor: 'dark dramatic studio, deep shadows, single directional light, Rembrandt lighting', image: bgDark },
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
  onAddCustomPreset?: (preset: CustomPreset) => void;
  onRemoveCustomPreset?: (id: string) => void;
}

function PresetCard({ preset, active, onClick, onRemove }: { preset: PresetOption | CustomPreset; active: boolean; onClick: () => void; onRemove?: () => void }) {
  return (
    <div className="relative shrink-0 group">
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute -top-1.5 -right-1.5 z-10 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
          title="Remover"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
      <button
        onClick={onClick}
        className={`flex flex-col items-center gap-1 w-[72px] rounded-lg border transition-all overflow-hidden ${
          active
            ? 'border-primary ring-1 ring-primary/40'
            : 'border-border hover:border-primary/40'
        }`}
      >
        <div className="w-full h-[52px] overflow-hidden bg-secondary">
          <img
            src={preset.image}
            alt={preset.label}
            className={`w-full h-full object-cover transition-opacity ${active ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
            loading="lazy"
            width={72}
            height={52}
          />
        </div>
        <span className={`text-[9px] font-medium leading-tight px-1 pb-1 text-center ${active ? 'text-[hsl(213,97%,67%)]' : 'text-muted-foreground'}`}>
          {preset.label}
        </span>
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
        className="shrink-0 flex flex-col items-center justify-center gap-1 w-[72px] h-[72px] rounded-lg border border-dashed border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all"
      >
        <Plus className="w-4 h-4" />
        <span className="text-[8px] font-medium">Adicionar</span>
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

export function ModelBackgroundPresets({ selectedModel, selectedBackground, onModelChange, onBackgroundChange, customPresets = [], onAddCustomPreset, onRemoveCustomPreset }: ModelBackgroundPresetsProps) {
  const customModels = customPresets.filter(p => p.type === 'model');
  const customBackgrounds = customPresets.filter(p => p.type === 'background');

  return (
    <div className="space-y-2">
      {/* MODEL SECTION */}
      <div>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Modelo</span>
        <div className="flex gap-1.5 mt-1 overflow-x-auto pb-1 scrollbar-thin">
          {MODEL_PRESETS.map(p => (
            <PresetCard key={p.id} preset={p} active={selectedModel === p.id} onClick={() => onModelChange(selectedModel === p.id ? null : p.id)} />
          ))}
          {customModels.map(p => (
            <PresetCard key={p.id} preset={p} active={selectedModel === p.id} onClick={() => onModelChange(selectedModel === p.id ? null : p.id)} />
          ))}
          {onAddCustomPreset && <AddPresetButton type="model" onAdd={onAddCustomPreset} />}
        </div>
      </div>

      {/* BACKGROUND SECTION */}
      <div>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Fundo</span>
        <div className="flex gap-1.5 mt-1 overflow-x-auto pb-1 scrollbar-thin">
          {BACKGROUND_PRESETS.map(p => (
            <PresetCard key={p.id} preset={p} active={selectedBackground === p.id} onClick={() => onBackgroundChange(selectedBackground === p.id ? null : p.id)} />
          ))}
          {customBackgrounds.map(p => (
            <PresetCard key={p.id} preset={p} active={selectedBackground === p.id} onClick={() => onBackgroundChange(selectedBackground === p.id ? null : p.id)} />
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
