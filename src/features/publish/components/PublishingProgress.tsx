import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface PublishingProgressProps {
  publishStep: number;
  publishSteps: readonly string[];
  imageUploadProgress: { current: number; total: number } | null;
}

export function PublishingProgress({ publishStep, publishSteps, imageUploadProgress }: PublishingProgressProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      <div className="glass-card p-10 text-center max-w-md w-full">
        <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-6" />
        <h2 className="font-display text-xl font-bold text-foreground mb-2">Publicando no Shopify</h2>

        {imageUploadProgress ? (
          <>
            <p className="text-sm text-muted-foreground mb-2">
              Preparando imagens... {imageUploadProgress.current}/{imageUploadProgress.total}
            </p>
            <div className="space-y-2">
              <Progress value={(imageUploadProgress.current / imageUploadProgress.total) * 100} className="h-2" />
              <p className="text-[10px] text-muted-foreground">
                {imageUploadProgress.current < imageUploadProgress.total
                  ? `Processando imagem ${imageUploadProgress.current + 1} de ${imageUploadProgress.total}...`
                  : 'Todas as imagens processadas!'}
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">{publishSteps[publishStep]} ({publishStep + 1}/{publishSteps.length})</p>
            <Progress value={((publishStep + 1) / publishSteps.length) * 100} className="h-2" />
          </>
        )}
      </div>
    </div>
  );
}