import { Button } from '@/components/ui/button';
import { RefreshCw, Check, ImageIcon, Sparkles } from 'lucide-react';

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
          <div className="relative w-full h-full min-h-[320px] skeleton-shimmer flex flex-col items-center justify-center gap-3 rounded-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">Gerando imagem com IA</p>
                <p className="text-xs text-muted-foreground">Isso leva cerca de 30s</p>
              </div>
              <span className="loader-dots text-primary mt-1"><span /><span /><span /></span>
            </div>
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
