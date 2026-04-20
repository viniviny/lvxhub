/**
 * useGenerationSession — Phase 1 of the Visual Consistency System
 * ────────────────────────────────────────────────────────────────
 * Locks per-publication-session variables so every image generated
 * during the same product session shares the same DNA:
 *
 *   • sessionId        → unique id for the whole session
 *   • seed             → fixed integer (sent as metadata for now;
 *                        Gemini Image API does not honor seed yet,
 *                        but we already persist it for parity with
 *                        the long-term plan and use it inside the
 *                        prompt as a stability anchor)
 *   • presetSignature  → "<modelId>|<bgId>" — when this changes we
 *                        treat it as a NEW session (user explicitly
 *                        switched the visual direction)
 *   • backgroundMaster → URL of the FIRST successfully generated
 *                        image. From the 2nd generation onwards the
 *                        client re-injects it as an extra reference
 *                        so Gemini keeps background / lighting /
 *                        shadow consistent across all variants.
 *
 * Nothing here touches the database. Everything lives in React
 * state + sessionStorage so a page reload during the same flow
 * keeps the same lock.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'publify_generation_session_v1';

export interface GenerationSession {
  sessionId: string;
  seed: number;
  presetSignature: string;
  backgroundMaster: string | null;
  systemRulesVersion: string;
}

const SYSTEM_RULES_VERSION = '1.0.0';

function makeSeed(): number {
  // 7-digit positive integer — fits any seed field upstream
  return Math.floor(Math.random() * 9_000_000) + 1_000_000;
}

function makeSession(presetSignature: string): GenerationSession {
  return {
    sessionId:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    seed: makeSeed(),
    presetSignature,
    backgroundMaster: null,
    systemRulesVersion: SYSTEM_RULES_VERSION,
  };
}

function readStoredSession(): GenerationSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.sessionId || typeof parsed.seed !== 'number') return null;
    return parsed as GenerationSession;
  } catch {
    return null;
  }
}

function writeStoredSession(session: GenerationSession) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* storage may be unavailable — non-fatal */
  }
}

export function useGenerationSession(
  selectedModel: string | null,
  selectedBackground: string | null,
) {
  const presetSignature = useMemo(
    () => `${selectedModel ?? 'none'}|${selectedBackground ?? 'none'}`,
    [selectedModel, selectedBackground],
  );

  const [session, setSession] = useState<GenerationSession>(() => {
    const stored = readStoredSession();
    if (stored && stored.presetSignature === presetSignature) return stored;
    const fresh = makeSession(presetSignature);
    writeStoredSession(fresh);
    return fresh;
  });

  // If the user changes preset (model or background) we reset the lock —
  // it would be a lie to keep the same "background master" after the
  // user explicitly chose a different visual direction.
  useEffect(() => {
    if (session.presetSignature === presetSignature) return;
    const fresh = makeSession(presetSignature);
    writeStoredSession(fresh);
    setSession(fresh);
  }, [presetSignature, session.presetSignature]);

  const setBackgroundMaster = useCallback((url: string | null) => {
    setSession((prev) => {
      // Only store the very FIRST master. Subsequent generations
      // must keep referencing the same anchor — that is the whole
      // point of the lock.
      if (prev.backgroundMaster && url) return prev;
      const next = { ...prev, backgroundMaster: url };
      writeStoredSession(next);
      return next;
    });
  }, []);

  const resetSession = useCallback(() => {
    const fresh = makeSession(presetSignature);
    writeStoredSession(fresh);
    setSession(fresh);
  }, [presetSignature]);

  return { session, setBackgroundMaster, resetSession };
}