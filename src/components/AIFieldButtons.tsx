import { useState, useRef, useEffect } from 'react';
import { Sparkles, Keyboard, Loader2, Check, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
}

export function AIFieldButtons({ type, brief, title, language, languageCode, countryName, countryFlag, currentValue, onGenerated, tone }: AIFieldButtonsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedLang, setGeneratedLang] = useState('');
  const [showPopover, setShowPopover] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isCustomGenerating, setIsCustomGenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingContent, setPendingContent] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

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
      const { data, error } = await supabase.functions.invoke('generate-text', {
        body: { type, brief, title, language, languageCode, countryName },
      });
      if (error) throw error;
      if (data?.content) {
        setGeneratedLang(data.language || language);
        applyContent(data.content);
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar conteúdo');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCustomGenerate = async () => {
    if (!customPrompt.trim()) return;
    setIsCustomGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-text', {
        body: { type, customPrompt, language, languageCode, countryName },
      });
      if (error) throw error;
      if (data?.content) {
        setGeneratedLang(data.language || language);
        applyContent(data.content);
        setShowPopover(false);
        setCustomPrompt('');
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar conteúdo');
    } finally {
      setIsCustomGenerating(false);
    }
  };

  const tooltipLabel = `Gerar em ${language || 'Inglês'}`;

  return (
    <div className="relative flex items-center gap-1">
      {/* Confirm replace dialog */}
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

      {/* Generated language badge */}
      {showSuccess && generatedLang && (
        <span className="text-[9px] text-muted-foreground mr-0.5">
          {countryFlag || '🌐'} {generatedLang}
        </span>
      )}

      {/* Generate button with tooltip */}
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

      {/* Custom prompt button */}
      <button
        onClick={() => setShowPopover(!showPopover)}
        className="flex items-center gap-1 h-[22px] px-2 rounded text-[10px] font-medium transition-all border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30"
      >
        <Keyboard className="w-3 h-3" />
        Personalizado
      </button>

      {/* Custom prompt popover */}
      {showPopover && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-7 z-50 w-[280px] bg-card border border-primary/50 rounded-lg p-3 shadow-[0_8px_24px_rgba(0,0,0,0.4)] animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-muted-foreground">Prompt personalizado</span>
            <button onClick={() => setShowPopover(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <Textarea
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            placeholder={
              type === 'title'
                ? 'Ex: Create a catchy SEO-optimized title for a dark green oversized puffer jacket targeting US market, max 60 characters'
                : 'Ex: Write a compelling product description for a puffer jacket. Include: material details, sizing info, style tips. Use bullet points. Max 150 words. Tone: modern and casual.'
            }
            className="bg-secondary border-border text-xs min-h-[80px] resize-none"
            rows={4}
          />
          <p className="text-[9px] text-muted-foreground mt-1.5 mb-2">
            ℹ Escreva em qualquer idioma — a resposta será em {language || 'Inglês'}
          </p>
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setShowPopover(false); setCustomPrompt(''); }}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCustomGenerate}
              disabled={isCustomGenerating || !customPrompt.trim()}
              className="flex items-center gap-1 h-[24px] px-3 rounded text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {isCustomGenerating ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  Gerar {type === 'title' ? 'título' : 'descrição'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
