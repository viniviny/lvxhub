import { SaveStatus } from '@/types/project';
import { Check, Loader2, AlertCircle, Cloud } from 'lucide-react';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
}

export function SaveStatusIndicator({ status }: SaveStatusIndicatorProps) {
  if (status === 'idle') return null;

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full transition-all duration-300">
      {status === 'saving' && (
        <span className="text-muted-foreground flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Salvando...
        </span>
      )}
      {status === 'saved' && (
        <span className="text-[hsl(var(--success))] flex items-center gap-1">
          <Check className="w-3 h-3" />
          Salvo
        </span>
      )}
      {status === 'error' && (
        <span className="text-destructive flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Erro ao salvar
        </span>
      )}
    </span>
  );
}
