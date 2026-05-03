import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CreateJob, JobStep } from './types';

interface ProcessingViewProps {
  job: CreateJob;
  presetLabel: string;
  onCancel: () => void;
}

export function ProcessingView({ job, presetLabel, onCancel }: ProcessingViewProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (job.status !== 'running') return;
    const interval = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(interval);
  }, [job.status]);

  const elapsedSec = Math.max(0, Math.round((now - job.startedAt) / 1000));

  return (
    <div className="max-w-[460px] mx-auto py-10 px-6">
      <h2 className="text-[17px] font-medium tracking-tight">Criando teu produto</h2>
      <p className="text-[12px] text-muted-foreground mt-1 mb-6">
        Aplicando {presetLabel}
      </p>

      <div className="rounded-lg border border-border bg-card p-1.5">
        {job.steps.map((step, i) => (
          <StepRow
            key={step.id}
            step={step}
            isLast={i === job.steps.length - 1}
          />
        ))}
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {elapsedSec}s
        </span>
        {job.status === 'running' && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="h-7 text-[12px]"
          >
            Cancelar
          </Button>
        )}
      </div>

      {job.status === 'error' && (
        <div className="mt-4 p-3 rounded-md border border-destructive/30 bg-destructive/5 text-[12px] text-destructive">
          {job.error || 'Algo deu errado. Tente novamente.'}
        </div>
      )}
    </div>
  );
}

function StepRow({ step, isLast }: { step: JobStep; isLast: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 ${
        isLast ? '' : 'border-b border-border/60'
      }`}
    >
      <StatusDot status={step.status} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate">{step.label}</div>
        {step.sublabel && (
          <div className="text-[11px] text-muted-foreground truncate">{step.sublabel}</div>
        )}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: JobStep['status'] }) {
  if (status === 'done') {
    return (
      <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
        <Check className="w-2 h-2 text-white" strokeWidth={3} />
      </span>
    );
  }
  if (status === 'doing') {
    return (
      <span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-primary border-t-transparent animate-spin flex-shrink-0" />
    );
  }
  if (status === 'error') {
    return (
      <span className="w-3.5 h-3.5 rounded-full bg-destructive flex items-center justify-center flex-shrink-0">
        <X className="w-2 h-2 text-white" strokeWidth={3} />
      </span>
    );
  }
  return <span className="w-3.5 h-3.5 rounded-full border border-border flex-shrink-0" />;
}
