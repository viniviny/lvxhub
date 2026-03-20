import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRight, ArrowLeft, Sparkles, AppWindow, Shield, KeyRound, PlugZap,
  Image, FileText, ShoppingBag, CheckCircle2
} from 'lucide-react';

const ONBOARDING_KEY = 'onboarding_done';

interface Step {
  icon: React.ReactNode;
  title: string;
  text: string;
  instructions?: string[];
  badges?: string[];
  finalMessage?: string;
}

const steps: Step[] = [
  {
    icon: <Sparkles className="w-10 h-10" />,
    title: 'Bem-vindo ao Publify',
    text: 'Publique produtos na Shopify em segundos. Vamos configurar tudo em 4 passos simples.',
  },
  {
    icon: <AppWindow className="w-10 h-10" />,
    title: 'Passo 1 — Crie um app na Shopify',
    text: 'Acesse o painel admin da sua loja e crie um app de desenvolvimento para conectar ao Publify.',
    instructions: [
      'Acesse sua loja em myshopify.com/admin',
      'Vá em Configurações → Apps e canais de vendas',
      'Clique em "Desenvolver apps"',
      'Clique em "Criar um app"',
      'Dê o nome "Publify" e salve',
    ],
  },
  {
    icon: <Shield className="w-10 h-10" />,
    title: 'Passo 2 — Configure as permissões',
    text: 'O app precisa de permissão para criar produtos e fazer upload de imagens na sua loja.',
    instructions: [
      'Dentro do app criado, clique em "Configurar escopos da API Admin"',
      'Marque exatamente estas 4 permissões:',
      'Clique em Salvar',
    ],
    badges: ['read_products', 'write_products', 'read_files', 'write_files'],
  },
  {
    icon: <KeyRound className="w-10 h-10" />,
    title: 'Passo 3 — Copie as credenciais',
    text: 'Você vai precisar do Client ID e Client Secret do app para conectar ao Fashion Publisher.',
    instructions: [
      'No menu lateral clique em "Configurações"',
      'Copie o "ID do cliente"',
      'Clique no ícone de olho ao lado de "Chave secreta" e copie',
      'Guarde esses dois valores — você vai colar na próxima tela',
    ],
  },
  {
    icon: <PlugZap className="w-10 h-10" />,
    title: 'Passo 4 — Conecte sua loja',
    text: 'Agora é só colar as credenciais, clicar em Conectar Loja e aprovar na Shopify. Pronto!',
    instructions: [
      'Preencha o domínio da loja (ex: minha-loja.myshopify.com)',
      'Cole o Client ID e Client Secret',
      'Clique em "Conectar Loja"',
      'Você será redirecionado para a Shopify para aprovar',
      'Após aprovar, volte ao app com a loja conectada ✓',
    ],
    finalMessage: 'Isso é tudo! Vamos começar?',
  },
];

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(
    () => localStorage.getItem(ONBOARDING_KEY) !== 'true'
  );

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  }, []);

  return { showOnboarding, completeOnboarding };
}

interface OnboardingGuideProps {
  onComplete: () => void;
}

export function OnboardingGuide({ onComplete }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const goNext = () => {
    if (isLast) {
      onComplete();
      return;
    }
    setDirection('next');
    setCurrentStep(prev => prev + 1);
  };

  const goPrev = () => {
    if (isFirst) return;
    setDirection('prev');
    setCurrentStep(prev => prev - 1);
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-semibold text-muted-foreground">
            {currentStep + 1} de {steps.length}
          </span>
        </div>
        <button
          onClick={handleSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          Pular tutorial
        </button>
      </div>

      {/* Progress */}
      <div className="px-6">
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-8 overflow-y-auto">
        <div
          key={currentStep}
          className="max-w-lg w-full animate-fade-in"
        >
          {/* Step Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              {step.icon}
            </div>
          </div>

          {/* Welcome flow illustration */}
          {isFirst && (
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <Image className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">Imagem</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">Formulário</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">Shopify</span>
              </div>
            </div>
          )}

          {/* Title & Text */}
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground text-center mb-3">
            {step.title}
          </h2>
          <p className="text-muted-foreground text-center text-sm md:text-base leading-relaxed mb-6">
            {step.text}
          </p>

          {/* Instructions */}
          {step.instructions && (
            <div className="glass-card p-5 mb-6">
              <ol className="space-y-3">
                {step.instructions.map((instruction, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary font-display font-semibold text-xs flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-foreground/90 leading-relaxed">{instruction}</span>
                  </li>
                ))}
              </ol>

              {/* Permission badges */}
              {step.badges && (
                <div className="flex flex-wrap gap-2 mt-3 ml-9">
                  {step.badges.map(badge => (
                    <span
                      key={badge}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs font-mono text-primary"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {badge}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Final message */}
          {step.finalMessage && (
            <p className="text-center text-primary font-display font-semibold text-lg mb-2">
              {step.finalMessage}
            </p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="px-6 py-5 border-t border-border/50">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={goPrev}
            disabled={isFirst}
            className="font-display font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Voltar
          </Button>

          {/* Step dots */}
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? 'bg-primary w-6'
                    : i < currentStep
                      ? 'bg-primary/40'
                      : 'bg-secondary'
                }`}
              />
            ))}
          </div>

          <Button
            onClick={goNext}
            className="font-display font-semibold"
          >
            {isLast ? (
              <>
                Começar configuração
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </>
            ) : (
              <>
                Próximo
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
