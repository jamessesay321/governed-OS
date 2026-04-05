'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UseHoverExplainInput = {
  label: string;
  value: number;
  period: string;
  orgId: string;
  context?: string;
};

type UseHoverExplainResult = {
  explanation: string | null;
  isLoading: boolean;
};

// ---------------------------------------------------------------------------
// Client-side cache (shared across all hook instances)
// ---------------------------------------------------------------------------

const clientCache = new Map<string, string>();

function getCacheKey(label: string, period: string, value: number): string {
  return `${label}-${period}-${value}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Debounced hover explanation hook.
 *
 * Fetches an AI-generated one-sentence explanation for a financial metric.
 * - 500ms debounce: the user must hover for 500ms before the API call fires.
 * - Client-side cache: avoids duplicate fetches for the same metric.
 * - AbortController: cancels in-flight requests when a new hover starts.
 * - No fetch if value is 0 or label is empty.
 */
export function useHoverExplain(
  input: UseHoverExplainInput,
  enabled: boolean,
): UseHoverExplainResult {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchExplanation = useCallback(() => {
    // Guard: skip for empty/zero values
    if (!input.label || input.value === 0) {
      setExplanation(null);
      setIsLoading(false);
      return;
    }

    // Check client cache first
    const cacheKey = getCacheKey(input.label, input.period, input.value);
    const cached = clientCache.get(cacheKey);
    if (cached) {
      setExplanation(cached);
      setIsLoading(false);
      return;
    }

    // Abort any previous in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);

    fetch('/api/explain/hover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: input.label,
        value: input.value,
        period: input.period,
        orgId: input.orgId,
        context: input.context,
      }),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ explanation: string }>;
      })
      .then((data) => {
        clientCache.set(cacheKey, data.explanation);
        setExplanation(data.explanation);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('[useHoverExplain] fetch failed:', err);
        setIsLoading(false);
      });
  }, [input.label, input.value, input.period, input.orgId, input.context]);

  useEffect(() => {
    if (enabled) {
      // 500ms debounce
      timerRef.current = setTimeout(fetchExplanation, 500);
    } else {
      // Mouse left — cancel pending timer and in-flight request
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      setIsLoading(false);
      setExplanation(null);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, fetchExplanation]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  return { explanation, isLoading };
}
