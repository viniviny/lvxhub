import { useEffect, useRef, useState, useCallback } from 'react';

const DRAFT_KEY = 'publify_draft';
const SAVE_DEBOUNCE = 1500;

export interface DraftData {
  form: any;
  seoTitle: string;
  seoDescription: string;
  wizardStep: number;
  completedSteps: number[];
  colors: any[];
  generatedImages: any[];
  imagePreview: string | null;
  savedAt: number;
}

export type DraftSaveStatus = 'idle' | 'saved';

export function useDraftSave() {
  const [draftStatus, setDraftStatus] = useState<DraftSaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const statusTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const saveDraft = useCallback((data: Omit<DraftData, 'savedAt'>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const draft: DraftData = { ...data, savedAt: Date.now() };
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setDraftStatus('saved');
        if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
        statusTimerRef.current = setTimeout(() => setDraftStatus('idle'), 3000);
      } catch { /* storage full */ }
    }, SAVE_DEBOUNCE);
  }, []);

  const loadDraft = useCallback((): DraftData | null => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as DraftData;
      // Ignore drafts older than 7 days
      if (Date.now() - data.savedAt > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(DRAFT_KEY);
        return null;
      }
      // Only show resume if there's meaningful content
      if (!data.form?.title && !data.form?.description && (!data.generatedImages || data.generatedImages.length === 0)) {
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setDraftStatus('idle');
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, []);

  return { draftStatus, saveDraft, loadDraft, clearDraft };
}
