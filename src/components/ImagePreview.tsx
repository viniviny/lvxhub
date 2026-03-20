import { Button } from '@/components/ui/button';
import { RefreshCw, Check, ImageIcon, Loader2 } from 'lucide-react';

interface ImagePreviewProps {
  imageUrl: string | null;
  isGenerating: boolean;
  onRegenerate: () => void;
  onApprove: () => void;
  isApproved: boolean;
}

export function ImagePreview({ imageUrl, isGenerating, onRegenerate, onApprove, isApproved }: ImagePreviewProps) {
  return (
    <div className="glass-card p-6 h-full flex flex-col">
      <h3 className="font-display font-semibold text-foreground mb-4">Pré-visualização</h3>

      <div className="flex-1 flex items-center justify-center rounded-lg overflow-hidden bg-secondary/50 min-h-[320px]">
        {isGenerating ? (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <span className="text-sm">Gerando imagem...</span>
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt="Imagem gerada"
            className="w-full h-full object-contain max-h-[400px]"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <ImageIcon className="w-12 h-12" />
            <span className="text-sm">Nenhuma imagem gerada</span>
          </div>
        )}
      </div>

      {imageUrl && !isGenerating && (
        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            onClick={onRegenerate}
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerar
          </Button>
          <Button
            onClick={onApprove}
            disabled={isApproved}
            className="flex-1"
          >
            <Check className="w-4 h-4 mr-2" />
            {isApproved ? 'Aprovada' : 'Aprovar'}
          </Button>
        </div>
      )}
    </div>
  );
}
