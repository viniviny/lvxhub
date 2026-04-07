import { useState, useEffect, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { RefreshCw } from 'lucide-react';

// Captures the initial asset fingerprints when the app first loads
function getInitialAssets(): Set<string> {
  const elements = document.querySelectorAll('script[src], link[rel="stylesheet"][href]');
  return new Set(
    Array.from(elements).map((el) => el.getAttribute('src') || el.getAttribute('href') || '')
  );
}

const initialAssets = getInitialAssets();

export function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const checkForUpdate = useCallback(async () => {
    if (updateAvailable) return;
    try {
      const res = await fetch(`${window.location.origin}/index.html`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const html = await res.text();

      const srcRegex = /(?:src|href)="(\/assets\/[^"]+)"/g;
      let match;
      while ((match = srcRegex.exec(html)) !== null) {
        if (!initialAssets.has(match[1])) {
          setUpdateAvailable(true);
          return;
        }
      }
    } catch {
      // ignore
    }
  }, [updateAvailable]);

  useEffect(() => {
    // Check when user returns to the tab (after a Lovable deploy)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [checkForUpdate]);

  return (
    <AlertDialog open={updateAvailable}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-primary" />
            </div>
          </div>
          <AlertDialogTitle className="text-center">Nova atualização disponível</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Uma nova versão do app está disponível. Atualize para ter acesso às melhorias mais recentes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction onClick={() => window.location.reload()} className="w-full sm:w-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar agora
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
