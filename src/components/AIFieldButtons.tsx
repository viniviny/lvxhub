import { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, Check, X, BookOpen, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useApiUsage } from '@/hooks/useApiUsage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserPrompts } from '@/hooks/useUserPrompts';
import type { ProductAIContext } from '@/types/productUnderstanding';

interface AIFieldButtonsProps {
  type: 'title' | 'description';
  brief: string;
  title?: string;
  language: string;
  languageCode?: string;
  countryName?: string;
  countryFlag?: string;
  currentValue: string;
  onGenerated: (content: string) => void;
  tone?: 'minimal' | 'bold' | 'casual' | 'editorial';
  usedNames?: string[];
  productContext?: ProductAIContext;
  gender?: string;
  productSpecs?: Record<string, any> | null;
  onBeforeGenerate?: () => Promise<void>;
}

const CATEGORY_MAP: Record<string, string> = {
  title: 'titulo',
  description: 'descricao',
};

export function AIFieldButtons({ type, brief, title, language, languageCode, countryName, countryFlag, currentValue, onGenerated, tone, usedNames, productContext, gender, productSpecs, onBeforeGenerate }: AIFieldButtonsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedLang, setGeneratedLang] = useState('');
  const [showPopover, setShowPopover] = useState(false);
  const [isCustomGenerating, setIsCustomGenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingContent, setPendingContent] = useState('');
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const { prompts, incrementUsage } = useUserPrompts();
  const { logUsage } = useApiUsage();
  const categoryKey = CATEGORY_MAP[type] || type;
  const filteredPrompts = prompts.filter(p => p.category === categoryKey);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPopover(false);
    };
    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showPopover]);

  const applyContent = (content: string) => {
    const hasExisting = currentValue && currentValue.trim().length > 0 && currentValue !== '<p></p>';
    if (hasExisting) {
      setPendingContent(content);
      setShowConfirm(true);
    } else {
      onGenerated(content);
      flashSuccess();
    }
  };

  const flashSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => { setShowSuccess(false); setGeneratedLang(''); }, 3000);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      if (onBeforeGenerate) await onBeforeGenerate();
      const body: Record<string, any> = { type, brief, title, language, languageCode, countryName, tone, gender };
      if (type === 'title' && usedNames && usedNames.length > 0) {
        body.usedNames = usedNames;
      }
      if (productContext) {
        body.productContext = productContext;
      }
      if (productSpecs) {
        body.productSpecs = productSpecs;
      }
      const { data, error } = await supabase.functions.invoke('generate-text', { body });
      if (error) throw error;
      if (data?.content) {
        setGeneratedLang(data.language || language);
        applyContent(data.content);
        logUsage({ service: 'text-generation', action: `Gerar ${type === 'title' ? 'título' : 'descrição'}`, metadata: { model: 'gpt-4o-mini', provider: 'OpenAI' } });
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar conteúdo');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePromptGenerate = async (promptId: string) => {
    const prompt = filteredPrompts.find(p => p.id === promptId);
    if (!prompt) return;
    setIsCustomGenerating(true);
    setSelectedPromptId(promptId);
    try {
      if (onBeforeGenerate) await onBeforeGenerate();
      incrementUsage.mutate(promptId);
      const body: Record<string, any> = {
        type,
        customPrompt: prompt.prompt_text,
        language,
        languageCode,
        countryName,
        tone,
      };
      if (productContext) {
        body.productContext = productContext;
      }
      if (productSpecs) {
        body.productSpecs = productSpecs;
      }
      const { data, error } = await supabase.functions.invoke('generate-text', { body });
      if (error) throw error;
      if (data?.content) {
        setGeneratedLang(data.language || language);
        applyContent(data.content);
        setShowPopover(false);
        logUsage({ service: 'text-generation', action: `Gerar ${type} (prompt customizado)`, metadata: { model: 'gpt-4o-mini', provider: 'OpenAI' } });
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar conteúdo');
    } finally {
      setIsCustomGenerating(false);
      setSelectedPromptId(null);
    }
  };

  const tooltipLabel = `Gerar em ${language || 'Inglês'}`;

  return (
    <div className="relative flex items-center gap-1">
      {showConfirm && (
        <div className="absolute right-0 top-6 z-50 bg-card border border-border rounded-lg p-3 shadow-[0_8px_24px_rgba(0,0,0,0.4)] w-[220px]">
          <p className="text-[11px] text-foreground mb-2">Substituir conteúdo atual?</p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowConfirm(false); setPendingContent(''); }}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                onGenerated(pendingContent);
                setShowConfirm(false);
                setPendingContent('');
                flashSuccess();
              }}
              className="text-[10px] px-2 py-0.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Substituir
            </button>
          </div>
        </div>
      )}

      {showSuccess && generatedLang && (
        <span className="text-[9px] text-muted-foreground mr-0.5">
          {countryFlag || '🌐'} {generatedLang}
        </span>
      )}

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`flex items-center gap-1 h-[22px] px-2 rounded text-[10px] font-medium transition-all border ${
                showSuccess
                  ? 'border-[hsl(var(--chart-2))] bg-[hsl(var(--chart-2))]/15 text-[hsl(var(--chart-2))]'
                  : 'border-primary/50 bg-primary/15 text-[hsl(213,97%,67%)] hover:bg-primary/25'
              }`}
            >
              {isGenerating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : showSuccess ? (
                <>
                  <Check className="w-3 h-3" />
                  Gerado
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  Gerar
                </>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[10px]">
            {tooltipLabel}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <button
        onClick={() => setShowPopover(!showPopover)}
        className="flex items-center gap-1 h-[22px] px-2 rounded text-[10px] font-medium transition-all border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30"
      >
        <BookOpen className="w-3 h-3" />
        Prompts
        <ChevronDown className="w-2.5 h-2.5" />
      </button>

      {showPopover && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-7 z-50 w-[260px] bg-card border border-border rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.4)] animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-[11px] text-muted-foreground">
              Meus prompts de {type === 'title' ? 'título' : 'descrição'}
            </span>
            <button onClick={() => setShowPopover(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {filteredPrompts.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <BookOpen className="w-5 h-5 text-muted-foreground/30 mx-auto mb-1.5" />
              <p className="text-[10px] text-muted-foreground">
                Nenhum prompt de {type === 'title' ? 'título' : 'descrição'} salvo
              </p>
              <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                Crie prompts na página Meus Prompts. Use variáveis como {'{{product_type}}'}, {'{{style}}'}, {'{{main_color}}'}.
              </p>
            </div>
          ) : (
            <div className="max-h-[200px] overflow-y-auto">
              {filteredPrompts.map(p => (
                <button
                  key={p.id}
                  onClick={() => handlePromptGenerate(p.id)}
                  disabled={isCustomGenerating}
                  className="w-full text-left px-3 py-2.5 hover:bg-accent/50 transition-colors border-b border-border/50 last:border-0 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-foreground truncate">{p.name}</span>
                    {isCustomGenerating && selectedPromptId === p.id ? (
                      <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                    )}
                  </div>
                  <p className="text-[9px] text-muted-foreground line-clamp-1 mt-0.5">{p.prompt_text}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
