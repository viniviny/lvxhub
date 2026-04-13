import { User, UserRound, Briefcase, Shirt, Dumbbell, Sun, Palette, Building2, TreePine, Lamp, Drama } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface PresetOption {
  id: string;
  label: string;
  descriptor: string;
  icon: LucideIcon;
}

const MODEL_PRESETS: PresetOption[] = [
  { id: 'none', label: 'Sem Modelo', descriptor: 'product only, no person, invisible mannequin', icon: Shirt },
  { id: 'exec', label: 'Executivo Maduro', descriptor: 'distinguished well-groomed man aged 45-55, beard, glasses, serious refined expression', icon: Briefcase },
  { id: 'young', label: 'Profissional Jovem', descriptor: 'stylish confident man aged 28-38, clean shaven, modern look', icon: User },
  { id: 'casual', label: 'Casual Sofisticado', descriptor: 'relaxed sophisticated man aged 30-45, effortless style, natural expression', icon: UserRound },
  { id: 'athletic', label: 'Atlético Premium', descriptor: 'athletic fit man aged 25-35, strong build, confident posture', icon: Dumbbell },
];

const BACKGROUND_PRESETS: PresetOption[] = [
  { id: 'studio', label: 'Estúdio Limpo', descriptor: 'pure white studio background, seamless, soft shadows', icon: Sun },
  { id: 'cream', label: 'Neutro Cremoso', descriptor: 'warm cream or soft ecru background, minimal, elegant', icon: Palette },
  { id: 'interior', label: 'Interior Premium', descriptor: 'sophisticated interior, dark wood panelling, warm ambient light, fireplace or library', icon: Lamp },
  { id: 'urban', label: 'Urbano Europeu', descriptor: 'European urban setting, stone architecture, wide empty avenue, golden hour', icon: Building2 },
  { id: 'nature', label: 'Natureza Minimalista', descriptor: 'minimal outdoor nature setting, soft natural light, neutral tones', icon: TreePine },
  { id: 'dark', label: 'Dark & Dramatic', descriptor: 'dark dramatic studio, deep shadows, single directional light, Rembrandt lighting', icon: Drama },
];

interface ModelBackgroundPresetsProps {
  selectedModel: string | null;
  selectedBackground: string | null;
  onModelChange: (id: string | null) => void;
  onBackgroundChange: (id: string | null) => void;
}

export function ModelBackgroundPresets({ selectedModel, selectedBackground, onModelChange, onBackgroundChange }: ModelBackgroundPresetsProps) {
  return (
    <div className="space-y-2">
      {/* MODEL SECTION */}
      <div>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Modelo</span>
        <div className="flex gap-1.5 mt-1 overflow-x-auto pb-1 scrollbar-thin">
          {MODEL_PRESETS.map(p => {
            const active = selectedModel === p.id;
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                onClick={() => onModelChange(active ? null : p.id)}
                className={`shrink-0 flex flex-col items-center gap-1 w-[62px] py-1.5 px-1 rounded-lg border text-center transition-all ${
                  active
                    ? 'border-primary bg-primary/15 text-[hsl(213,97%,67%)]'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[9px] font-medium leading-tight">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* BACKGROUND SECTION */}
      <div>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Fundo</span>
        <div className="flex gap-1.5 mt-1 overflow-x-auto pb-1 scrollbar-thin">
          {BACKGROUND_PRESETS.map(p => {
            const active = selectedBackground === p.id;
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                onClick={() => onBackgroundChange(active ? null : p.id)}
                className={`shrink-0 flex flex-col items-center gap-1 w-[62px] py-1.5 px-1 rounded-lg border text-center transition-all ${
                  active
                    ? 'border-primary bg-primary/15 text-[hsl(213,97%,67%)]'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[9px] font-medium leading-tight">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function getModelDescriptor(id: string | null): string {
  return MODEL_PRESETS.find(p => p.id === id)?.descriptor || '';
}

export function getBackgroundDescriptor(id: string | null): string {
  return BACKGROUND_PRESETS.find(p => p.id === id)?.descriptor || '';
}
