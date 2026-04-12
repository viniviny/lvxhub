import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Trash2 } from 'lucide-react';

interface DraftResumeDialogProps {
  open: boolean;
  draftTitle?: string;
  draftDate?: string;
  onResume: () => void;
  onDiscard: () => void;
}

export function DraftResumeDialog({ open, draftTitle, draftDate, onResume, onDiscard }: DraftResumeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <FileText className="w-5 h-5 text-primary" />
            Rascunho encontrado
          </DialogTitle>
          <DialogDescription>
            Você tem um rascunho não finalizado
            {draftTitle && <> — <strong className="text-foreground">{draftTitle}</strong></>}
            {draftDate && <span className="text-muted-foreground"> (salvo {draftDate})</span>}.
            Deseja continuar de onde parou?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={onDiscard} className="gap-2">
            <Trash2 className="w-4 h-4" />
            Descartar
          </Button>
          <Button onClick={onResume} className="gap-2">
            <FileText className="w-4 h-4" />
            Continuar rascunho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
