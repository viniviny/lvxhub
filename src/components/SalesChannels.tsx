import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Monitor, ShoppingBag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Publication {
  id: number;
  name: string;
}

interface SalesChannelsProps {
  selectedChannels: string[];
  onChannelsChange: (channels: string[]) => void;
}

export function SalesChannels({ selectedChannels, onChannelsChange }: SalesChannelsProps) {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPublications = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('shopify-get-publications');
        if (!error && data?.publications) {
          setPublications(data.publications.map((p: any) => ({ id: p.id, name: p.name || `Canal ${p.id}` })));
          // Auto-select "Online Store" if found
          const onlineStore = data.publications.find((p: any) => (p.name || '').toLowerCase().includes('online store'));
          if (onlineStore && selectedChannels.length === 0) {
            onChannelsChange([onlineStore.id.toString()]);
          }
        }
      } catch {
        // Fallback with default channel
        setPublications([{ id: 0, name: 'Loja virtual (Online Store)' }]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPublications();
  }, []);

  const toggleChannel = (id: string) => {
    onChannelsChange(
      selectedChannels.includes(id)
        ? selectedChannels.filter(c => c !== id)
        : [...selectedChannels, id]
    );
  };

  const channelIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('online') || n.includes('virtual')) return <Monitor className="w-4 h-4" />;
    return <ShoppingBag className="w-4 h-4" />;
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold text-foreground">Canais de venda</Label>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando canais...
        </div>
      ) : (
        <div className="space-y-2">
          {publications.map(pub => (
            <label key={pub.id} className="flex items-center gap-3 p-2.5 rounded-md bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors">
              <Checkbox
                checked={selectedChannels.includes(pub.id.toString())}
                onCheckedChange={() => toggleChannel(pub.id.toString())}
              />
              {channelIcon(pub.name)}
              <span className="text-sm text-foreground">{pub.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
