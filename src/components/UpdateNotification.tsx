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

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const checkForUpdate = useCallback(async () => {
    try {
      const res = await fetch(`${window.location.origin}/index.html`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const html = await res.text();

      // Extract script/css hashes from the fetched HTML
      const currentScripts = document.querySelectorAll('script[src], link[rel="stylesheet"][href]');
      const currentHashes = new Set(
        Array.from(currentScripts).map((el) =>
          el.getAttribute('src') || el.getAttribute('href')
        )
      );

      // Check if the remote HTML references different assets
      const remoteHashes: string[] = [];
      const srcRegex = /(?:src|href)="([^"]*\.[a-z]+\?[^"]*|[^"]*-[a-zA-Z0-9]+\.[a-z]+)"/g;
      let match;
      while ((match = srcRegex.exec(html)) !== null) {
        remoteHashes.push(match[1]);
      }

      if (remoteHashes.length > 0) {
        const hasNew = remoteHashes.some((h) => !currentHashes.has(h));
        if (hasNew) {
          setUpdateAvailable(true);
        }
      }
    } catch {
      // silently ignore network errors
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkForUpdate]);

  const handleRefresh = () => {
    window.location.reload();
  };

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
          <AlertDialogAction onClick={handleRefresh} className="w-full sm:w-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar agora
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
