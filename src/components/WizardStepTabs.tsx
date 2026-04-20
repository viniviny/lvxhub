import { Check } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';

interface WizardStepTabsProps {
  steps: string[]; // labels (length = total steps)
  current: number; // 1-indexed
  completed: Set<number>;
  onSelect: (step: number) => void;
}

/**
 * Tabs do wizard com indicador animado (layoutId) que desliza
 * entre o step ativo via spring do framer-motion.
 */
export function WizardStepTabs({ steps, current, completed, onSelect }: WizardStepTabsProps) {
  return (
    <LayoutGroup id="wizard-step-tabs">
      <div className="flex items-center gap-1.5 mb-3">
        {steps.map((label, i) => {
          const step = i + 1;
          const isCompleted = completed.has(step);
          const isCurrent = current === step;
          const isFuture = step > current && !isCompleted;
          const disabled = isFuture && !completed.has(step - 1);

          return (
            <button
              key={step}
              onClick={() => !disabled && onSelect(step)}
              disabled={disabled}
              className={`relative flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium overflow-hidden transition-colors duration-200 press disabled:opacity-40 disabled:cursor-not-allowed ${
                isCurrent
                  ? 'text-primary-foreground'
                  : isCompleted
                    ? 'text-[hsl(var(--success))] border border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.12)] hover:bg-[hsl(var(--success)/0.2)]'
                    : 'text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80'
              }`}
            >
              {/* Animated active background (shared layoutId) */}
              {isCurrent && (
                <motion.span
                  layoutId="wizard-active-tab"
                  className="absolute inset-0 rounded-md bg-primary shadow-sm pointer-events-none"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}

              <span className="relative z-10 flex items-center gap-1.5">
                {isCompleted && !isCurrent ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] ${isCurrent ? 'border-primary-foreground/50' : ''}`}>{step}</span>
                )}
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
