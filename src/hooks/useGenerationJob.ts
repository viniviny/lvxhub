import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface GenerationJob {
  id: string;
  status: JobStatus;
  progress: number;
  total_steps: number;
  result: any;
  error_message: string | null;
  type: string;
}

export function useGenerationJob() {
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [isEnqueueing, setIsEnqueueing] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const subscribe = useCallback(
    (jobId: string, onUpdate?: (j: GenerationJob) => void) => {
      cleanup();
      const channel = supabase
        .channel(`job-${jobId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'generation_jobs', filter: `id=eq.${jobId}` },
          (payload) => {
            const next = payload.new as GenerationJob;
            setJob(next);
            onUpdate?.(next);
            if (next.status === 'completed' || next.status === 'failed') {
              cleanup();
            }
          }
        )
        .subscribe();
      channelRef.current = channel;
    },
    [cleanup]
  );

  const enqueue = useCallback(
    async (params: {
      type: string;
      payload: Record<string, any>;
      projectId?: string;
      totalSteps?: number;
      onUpdate?: (j: GenerationJob) => void;
    }) => {
      setIsEnqueueing(true);
      try {
        const { data, error } = await supabase.functions.invoke('enqueue-generation-job', {
          body: {
            type: params.type,
            payload: params.payload,
            projectId: params.projectId,
            totalSteps: params.totalSteps ?? 1,
          },
        });
        if (error) throw error;
        const jobId = (data as any)?.jobId;
        if (!jobId) throw new Error('No jobId returned');

        // Estado inicial
        const initial: GenerationJob = {
          id: jobId,
          status: 'pending',
          progress: 0,
          total_steps: params.totalSteps ?? 1,
          result: {},
          error_message: null,
          type: params.type,
        };
        setJob(initial);
        subscribe(jobId, params.onUpdate);
        return jobId as string;
      } finally {
        setIsEnqueueing(false);
      }
    },
    [subscribe]
  );

  const reset = useCallback(() => {
    cleanup();
    setJob(null);
  }, [cleanup]);

  return { job, isEnqueueing, enqueue, reset };
}