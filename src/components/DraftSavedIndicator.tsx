import { Check } from 'lucide-react';
import type { DraftSaveStatus } from '@/hooks/useDraftSave';

interface DraftSavedIndicatorProps {
  status: DraftSaveStatus;
}

export function DraftSavedIndicator({ status }: DraftSavedIndicatorProps) {
  if (status !== 'saved') return null;

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full text-muted-foreground animate-fade-in">
      <Check className="w-3 h-3" />
      Rascunho salvo
    </span>
  );
}
