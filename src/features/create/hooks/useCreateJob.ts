import { useCallback, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import type {
  CreateInput,
  CreateOptions,
  CreateJob,
  JobStep,
  JobStepId,
} from '../types';

interface StepDefinition {
  id: JobStepId;
  label: string;
  buildSublabel: (input: CreateInput) => string;
  simulatedMs: { min: number; max: number };
  todoEdgeFunction: string;
}

const STEP_DEFS: StepDefinition[] = [
  {
    id: 'import',
    label: 'Importando produto',
    buildSublabel: (input) => {
      if (input.mode === 'links') {
        const n = input.links?.length ?? 0;
        return n === 1 ? 'Da URL fornecida' : `De ${n} URLs`;
      }
      if (input.mode === 'upload') {
        const n = input.files?.length ?? 0;
        return n === 1 ? '1 imagem carregada' : `${n} imagens carregadas`;
      }
      return 'A partir da descrição';
    },
    simulatedMs: { min: 800, max: 1400 },
    // TODO PR 5: import-shopify-direct (links) | direct upload (files) | skip (manual)
    todoEdgeFunction: 'import-shopify-direct',
  },
  {
    id: 'analyze',
    label: 'Analisando características',
    buildSublabel: () => 'Categoria, material, variantes',
    simulatedMs: { min: 1000, max: 1800 },
    // TODO PR 5: generate-with-gemini (mode: analyze-image)
    todoEdgeFunction: 'analyze-product-image',
  },
  {
    id: 'recreate-images',
    label: 'Recriando imagens',
    buildSublabel: () => 'Aplicando estilo da marca',
    simulatedMs: { min: 2500, max: 4000 },
    // TODO PR 5: generate-with-gemini (mode: generate-image) por ângulo
    todoEdgeFunction: 'generate-with-gemini',
  },
  {
    id: 'generate-text',
    label: 'Gerando título e descrição',
    buildSublabel: () => 'Voz editorial em inglês',
    simulatedMs: { min: 800, max: 1500 },
    // TODO PR 5: generate-with-gemini (mode: generate-text + generate-specs)
    todoEdgeFunction: 'generate-text + generate-specs',
  },
  {
    id: 'calculate-price',
    label: 'Calculando preço',
    buildSublabel: () => 'Margem e psicológico',
    simulatedMs: { min: 400, max: 800 },
    // TODO PR 5: client-side calculation via PricingEngine (no edge function needed)
    todoEdgeFunction: 'client-side calculation',
  },
];

function makeInitialJob(input: CreateInput): CreateJob {
  return {
    id: crypto.randomUUID(),
    status: 'running',
    startedAt: Date.now(),
    steps: STEP_DEFS.map(def => ({
      id: def.id,
      label: def.label,
      sublabel: def.buildSublabel(input),
      status: 'pending',
    })),
  };
}

function abortableDelay(ms: { min: number; max: number }, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const duration = ms.min + Math.random() * (ms.max - ms.min);
    const timeout = setTimeout(resolve, duration);
    signal.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new DOMException('Cancelled', 'AbortError'));
    }, { once: true });
  });
}

export function useCreateJob() {
  const [job, setJob] = useState<CreateJob | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const updateStep = useCallback((id: JobStepId, patch: Partial<JobStep>) => {
    setJob(prev =>
      prev
        ? { ...prev, steps: prev.steps.map(s => (s.id === id ? { ...s, ...patch } : s)) }
        : prev,
    );
  }, []);

  const run = useCallback(
    async (input: CreateInput, options: CreateOptions) => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      const newJob = makeInitialJob(input);
      setJob(newJob);

      logger.info('CreateJob started', {
        jobId: newJob.id,
        mode: input.mode,
        preset: options.stylePreset,
      });

      try {
        for (const def of STEP_DEFS) {
          if (signal.aborted) break;
          updateStep(def.id, { status: 'doing', startedAt: Date.now() });
          // TODO PR 5: substituir por chamada real à edge function `${def.todoEdgeFunction}`
          await abortableDelay(def.simulatedMs, signal);
          updateStep(def.id, { status: 'done', finishedAt: Date.now() });
        }

        if (signal.aborted) return;

        // TODO PR 5: resultado real da pipeline — por ora mock pra validar UX
        const mockResult = {
          title: 'Sweater Aurel Layer',
          description:
            'Cable-knit half-zip in soft merino blend. Refined silhouette built for layering.',
          category: 'Mens Knitwear',
          material: 'Merino blend',
          images: [
            { url: '', angle: 'frente' },
            { url: '', angle: 'costas' },
            { url: '', angle: 'detalhe' },
          ],
          variants: [
            { type: 'color', values: ['Navy', 'Cream', 'Charcoal'] },
            { type: 'size', values: ['S', 'M', 'L', 'XL'] },
          ],
          pricing: { suggestedPrice: 89, multiplier: 3.2 },
        };

        setJob(prev =>
          prev
            ? { ...prev, status: 'success', finishedAt: Date.now(), result: mockResult }
            : prev,
        );

        logger.info('CreateJob succeeded', { jobId: newJob.id });
      } catch (error) {
        const isCancel = (error as DOMException)?.name === 'AbortError';
        if (!isCancel) logger.error('CreateJob failed', error);
        setJob(prev =>
          prev
            ? {
                ...prev,
                status: isCancel ? 'cancelled' : 'error',
                finishedAt: Date.now(),
                error: isCancel
                  ? 'Cancelado pelo usuário'
                  : (error as Error)?.message || 'Erro desconhecido',
              }
            : prev,
        );
      }
    },
    [updateStep],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setJob(null);
    abortRef.current = null;
  }, []);

  return { job, run, cancel, reset };
}
