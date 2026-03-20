import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShopifyStore } from '@/hooks/useStoreManager';
import { RegionGroup } from '@/hooks/useRegionGroups';
import { getCountryByCode, formatPrice, type Country } from '@/data/countries';
import { getAILanguageByCode } from '@/data/languages';
import { Send, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

type PublishTarget = 'single' | 'group' | 'all';
type StoreStatus = 'pending' | 'translating' | 'publishing' | 'done' | 'error';

interface StoreProgress {
  storeId: string;
  status: StoreStatus;
  message: string;
  localPrice?: string;
}

interface GlobalPublishFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: ShopifyStore[];
  groups: RegionGroup[];
  activeStore: ShopifyStore | null;
  basePrice: number;
  productTitle: string;
  convert: (amount: number, from: string, to: string) => number;
  onPublish: (store: ShopifyStore) => Promise<boolean>;
}

export function GlobalPublishFlow({
  open, onOpenChange, stores, groups, activeStore,
  basePrice, productTitle, convert, onPublish,
}: GlobalPublishFlowProps) {
  const [target, setTarget] = useState<PublishTarget>('single');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [progress, setProgress] = useState<StoreProgress[]>([]);
  const [phase, setPhase] = useState<'select' | 'confirm' | 'progress'>('select');

  const connectedStores = stores.filter(s => s.connected);

  const getTargetStores = (): ShopifyStore[] => {
    if (target === 'single') return activeStore ? [activeStore] : [];
    if (target === 'group' && selectedGroupId) {
      const group = groups.find(g => g.id === selectedGroupId);
      return group ? connectedStores.filter(s => group.storeIds.includes(s.id)) : [];
    }
    return connectedStores;
  };

  const targetStores = getTargetStores();

  const getLocalPrice = (store: ShopifyStore): string => {
    if (!store.marketConfig) return `$${basePrice.toFixed(2)}`;
    const country = getCountryByCode(store.marketConfig.countryCode);
    if (!country) return `${store.marketConfig.currencySymbol} ${basePrice.toFixed(2)}`;
    const baseCurrency = activeStore?.marketConfig?.currency || 'USD';
    const converted = convert(basePrice, baseCurrency, store.marketConfig.currency);
    return formatPrice(converted, country);
  };

  const handleConfirm = () => {
    setPhase('confirm');
    setProgress(targetStores.map(s => ({
      storeId: s.id,
      status: 'pending',
      message: 'Aguardando...',
      localPrice: getLocalPrice(s),
    })));
  };

  const handlePublishAll = async () => {
    setPhase('progress');
    setIsPublishing(true);

    for (const store of targetStores) {
      const lang = store.marketConfig?.language
        ? getAILanguageByCode(store.marketConfig.language)
        : null;

      // Update status: translating
      setProgress(prev => prev.map(p =>
        p.storeId === store.id
          ? { ...p, status: 'translating' as StoreStatus, message: `Traduzindo para ${lang?.label || 'inglês'}...` }
          : p
      ));
      await new Promise(r => setTimeout(r, 800));

      // Update status: publishing
      setProgress(prev => prev.map(p =>
        p.storeId === store.id
          ? { ...p, status: 'publishing' as StoreStatus, message: 'Publicando...' }
          : p
      ));

      try {
        const success = await onPublish(store);
        setProgress(prev => prev.map(p =>
          p.storeId === store.id
            ? { ...p, status: success ? 'done' : 'error', message: success ? `Publicado — ${p.localPrice}` : 'Erro ao publicar' }
            : p
        ));
      } catch {
        setProgress(prev => prev.map(p =>
          p.storeId === store.id
            ? { ...p, status: 'error', message: 'Erro ao publicar' }
            : p
        ));
      }
    }

    setIsPublishing(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setPhase('select');
      setTarget('single');
      setSelectedGroupId(null);
      setProgress([]);
    }, 300);
  };

  const StatusIcon = ({ status }: { status: StoreStatus }) => {
    switch (status) {
      case 'done': return <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />;
      case 'error': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'translating': case 'publishing': return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Publicar Globalmente</DialogTitle>
          <DialogDescription>
            Publique "{productTitle}" em múltiplas lojas.
          </DialogDescription>
        </DialogHeader>

        {/* Phase: select target */}
        {phase === 'select' && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              {[
                { key: 'single' as PublishTarget, label: 'Loja atual', desc: activeStore?.marketConfig?.marketName || activeStore?.domain || '—' },
                ...(groups.length > 0 ? [{ key: 'group' as PublishTarget, label: 'Grupo de região', desc: 'Publicar em um grupo' }] : []),
                { key: 'all' as PublishTarget, label: 'Todas as lojas', desc: `${connectedStores.length} lojas conectadas` },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setTarget(opt.key)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    target === opt.key
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border bg-secondary/30 hover:bg-secondary/60'
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </button>
              ))}
            </div>

            {target === 'group' && groups.length > 0 && (
              <div className="space-y-1.5">
                {groups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroupId(g.id)}
                    className={`w-full text-left p-2.5 rounded-md border text-sm transition-colors ${
                      selectedGroupId === g.id
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border hover:bg-secondary/40'
                    }`}
                  >
                    <span className="font-medium">{g.name}</span>
                    <span className="text-muted-foreground ml-2">({g.storeIds.length} lojas)</span>
                  </button>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button
                onClick={handleConfirm}
                disabled={targetStores.length === 0 || (target === 'group' && !selectedGroupId)}
              >
                Revisar ({targetStores.length} loja{targetStores.length !== 1 ? 's' : ''})
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Phase: confirm */}
        {phase === 'confirm' && (
          <div className="space-y-4 py-2">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {progress.map(p => {
                const store = stores.find(s => s.id === p.storeId);
                if (!store) return null;
                const lang = store.marketConfig?.language
                  ? getAILanguageByCode(store.marketConfig.language)
                  : null;
                return (
                  <div key={p.storeId} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/40 border border-border">
                    <span className="text-lg">{store.marketConfig?.countryFlag || '🏪'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {store.marketConfig?.marketName || store.domain}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lang?.label || 'Inglês'} • {p.localPrice}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPhase('select')}>Voltar</Button>
              <Button onClick={handlePublishAll}>
                <Send className="w-4 h-4 mr-2" />
                Publicar em {targetStores.length} loja{targetStores.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Phase: progress */}
        {phase === 'progress' && (
          <div className="space-y-4 py-2">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {progress.map(p => {
                const store = stores.find(s => s.id === p.storeId);
                if (!store) return null;
                return (
                  <div key={p.storeId} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/40 border border-border">
                    <StatusIcon status={p.status} />
                    <span className="text-lg">{store.marketConfig?.countryFlag || '🏪'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {store.marketConfig?.marketName || store.domain}
                      </p>
                      <p className={`text-xs ${p.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {p.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button onClick={handleClose} disabled={isPublishing}>
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publicando...
                  </>
                ) : 'Fechar'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
