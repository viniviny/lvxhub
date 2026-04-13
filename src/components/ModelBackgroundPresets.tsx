import { useRef } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

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
}

function PresetCard({ preset, active, onClick }: { preset: PresetOption | CustomPreset; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 flex flex-col items-center gap-1 w-[72px] rounded-lg border transition-all overflow-hidden ${
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
  );
}

function AddPresetButton({ onFileSelected }: { onFileSelected: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
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
        onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) { toast.error('Máx. 5MB'); return; }
          onFileSelected(file);
          e.target.value = '';
        }}
      />
    </>
  );
}

export function ModelBackgroundPresets({ selectedModel, selectedBackground, onModelChange, onBackgroundChange, customPresets = [], onAddCustomPreset }: ModelBackgroundPresetsProps) {
  const customModels = customPresets.filter(p => p.type === 'model');
  const customBackgrounds = customPresets.filter(p => p.type === 'background');

  const handleUpload = (file: File, type: 'model' | 'background') => {
    const reader = new FileReader();
    reader.onload = () => {
      const name = prompt(type === 'model' ? 'Nome do modelo:' : 'Nome do fundo:');
      if (!name) return;
      const descriptor = prompt('Descritor para a IA (ex: "man aged 40, casual style"):') || name;
      const preset: CustomPreset = {
        id: `custom-${Date.now()}`,
        label: name,
        descriptor,
        image: reader.result as string,
        type,
      };
      onAddCustomPreset?.(preset);
      toast.success(`${type === 'model' ? 'Modelo' : 'Fundo'} adicionado!`);
    };
    reader.readAsDataURL(file);
  };

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
          {onAddCustomPreset && <AddPresetButton onFileSelected={f => handleUpload(f, 'model')} />}
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
          {onAddCustomPreset && <AddPresetButton onFileSelected={f => handleUpload(f, 'background')} />}
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
