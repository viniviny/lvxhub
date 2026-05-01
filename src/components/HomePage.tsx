import { useAuth } from '@/hooks/useAuth';
import { ArrowRight, Download, Sparkles, ImageIcon, UploadCloud, BookMarked } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HomePageProps {
  onNavigate: (view: string) => void;
}

const QUICK_ACTIONS = [
  { id: 'import',  title: 'Importar produto', desc: 'Via link ou Shopify',     icon: Download,    view: 'import-url' },
  { id: 'publish', title: 'Publicar',         desc: 'Naming, SEO e Shopify',   icon: UploadCloud, view: 'publish' },
  { id: 'image',   title: 'Image Studio',     desc: 'Imagens premium',         icon: ImageIcon,   view: 'image-generator' },
  { id: 'prompts', title: 'Prompts',          desc: 'Templates salvos',        icon: BookMarked,  view: 'prompts' },
];

export function HomePage({ onNavigate }: HomePageProps) {
  const { user } = useAuth();
  const firstName = (user?.user_metadata?.full_name || user?.email?.split('@')[0] || '').split(' ')[0];

  return (
    <div className="max-w-4xl mx-auto py-16 px-4 md:px-8">
      <header className="mb-12 animate-slide-up">
        <p className="text-sm text-muted-foreground mb-2">
          {firstName ? `Olá, ${firstName}` : 'Bem-vindo'}
        </p>
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
          O que vamos criar hoje?
        </h1>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.id}
            onClick={() => onNavigate(a.view)}
            className="group text-left rounded-2xl border border-border bg-card hover:bg-secondary/40 hover:border-primary/30 p-5 transition-all duration-200 flex items-center gap-4"
          >
            <div className="w-11 h-11 rounded-xl border border-border bg-secondary/40 flex items-center justify-center flex-shrink-0 group-hover:border-primary/30 group-hover:bg-primary/10 transition-colors">
              <a.icon className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-base font-semibold text-foreground">{a.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
