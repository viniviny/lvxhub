import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  Home,
  Package,
  ClipboardList,
  Store,
  Settings,
  ImageIcon,
  BookOpen,
  Wand2,
  Download,
  LogOut,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { DashboardView } from '@/components/DashboardSidebar';

interface CommandPaletteProps {
  onNavigate?: (view: DashboardView) => void;
  onNewProduct?: () => void;
}

export function CommandPalette({ onNavigate, onNewProduct }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  const go = (view: DashboardView) => {
    setOpen(false);
    if (onNavigate) onNavigate(view);
    else navigate('/dashboard');
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar ações, páginas..." />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        <CommandGroup heading="Ações rápidas">
          <CommandItem onSelect={() => { setOpen(false); onNewProduct?.(); }}>
            <Plus className="mr-2 h-4 w-4" />
            Novo produto
            <CommandShortcut>N</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navegar">
          <CommandItem onSelect={() => go('home')}>
            <Home className="mr-2 h-4 w-4" /> Início
          </CommandItem>
          <CommandItem onSelect={() => go('publish')}>
            <Package className="mr-2 h-4 w-4" /> Publicar produto
          </CommandItem>
          <CommandItem onSelect={() => go('image-generator')}>
            <Wand2 className="mr-2 h-4 w-4" /> Image Generator
          </CommandItem>
          <CommandItem onSelect={() => go('imported')}>
            <Download className="mr-2 h-4 w-4" /> Importados
          </CommandItem>
          <CommandItem onSelect={() => go('history')}>
            <ClipboardList className="mr-2 h-4 w-4" /> Histórico
          </CommandItem>
          <CommandItem onSelect={() => go('library')}>
            <ImageIcon className="mr-2 h-4 w-4" /> Biblioteca
          </CommandItem>
          <CommandItem onSelect={() => { setOpen(false); navigate('/prompts'); }}>
            <BookOpen className="mr-2 h-4 w-4" /> Meus Prompts
          </CommandItem>
          <CommandItem onSelect={() => go('stores')}>
            <Store className="mr-2 h-4 w-4" /> Lojas
          </CommandItem>
          <CommandItem onSelect={() => go('settings')}>
            <Settings className="mr-2 h-4 w-4" /> Configurações
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Conta">
          <CommandItem onSelect={() => { setOpen(false); signOut(); }}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}