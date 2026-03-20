import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

const Callback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const exchangeToken = async () => {
      const code = searchParams.get('code');
      const shop = searchParams.get('shop');

      if (!code) {
        setStatus('error');
        setErrorMsg('Código de autorização não encontrado na URL.');
        return;
      }

      try {
        const settingsRaw = localStorage.getItem('shopify_settings');
        if (!settingsRaw) {
          setStatus('error');
          setErrorMsg('Configurações não encontradas. Configure o app primeiro.');
          return;
        }

        const settings = JSON.parse(settingsRaw);

        const { data, error } = await supabase.functions.invoke('shopify-exchange-token', {
          body: {
            code,
            shop: shop || settings.storeDomain,
            clientId: settings.clientId,
            clientSecret: settings.clientSecret,
          },
        });

        if (error || data?.error) {
          throw new Error(data?.error || error?.message || 'Erro ao trocar token');
        }

        localStorage.setItem('shopify_access_token', data.accessToken);
        localStorage.setItem('shopify_connected', 'true');
        setStatus('success');

        setTimeout(() => navigate('/', { replace: true }), 1200);
      } catch (err: any) {
        console.error('Token exchange error:', err);
        setStatus('error');
        setErrorMsg(err.message || 'Erro ao conectar com Shopify.');
      }
    };

    exchangeToken();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="glass-card p-10 text-center max-w-md w-full">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground">Conectando ao Shopify...</h2>
            <p className="text-muted-foreground mt-2 text-sm">Trocando código por token de acesso.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto text-[hsl(var(--success))] mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground">Conectado com sucesso!</h2>
            <p className="text-muted-foreground mt-2 text-sm">Redirecionando para o app...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground">Erro na conexão</h2>
            <p className="text-muted-foreground mt-2 text-sm">{errorMsg}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 text-primary underline text-sm"
            >
              Voltar ao app
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Callback;
