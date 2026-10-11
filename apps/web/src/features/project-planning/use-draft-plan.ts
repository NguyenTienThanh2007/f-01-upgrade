'use client';
import { useEffect, useRef, useState } from 'react';
import { isErrorCode, isProjectPlan, parseIdea, planningErrors, record, type PlanningError, type ProjectPlan } from '@/lib/planning/contracts';

export type DraftState = { kind: 'idle' } | { kind: 'pending' } | { kind: 'success'; plan: ProjectPlan; idea: string } | { kind: 'error'; error: PlanningError };

function clientError(code: PlanningError['code']): PlanningError {
  return { code, message: planningErrors[code].message, request_id: '' };
}

/** Draft planning via the fixed /api/v1/plan gateway; nothing is saved. */
export function useDraftPlan() {
  const [state, setState] = useState<DraftState>({ kind: 'idle' });
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => { active.current?.abort(); }, []);
  async function submit(idea: string): Promise<'invalid' | 'started'> {
    if (active.current) return 'started';
    const input = parseIdea({ idea });
    if (!input) return 'invalid';
    setState({ kind: 'pending' });
    const controller = new AbortController();
    active.current = controller;
    const timer = setTimeout(() => controller.abort('deadline'), 140_000);
    try {
      const response = await fetch('/api/v1/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idea: input }), signal: controller.signal, cache: 'no-store' });
      const payload: unknown = await response.json();
      if (active.current !== controller) return 'started';
      if (!response.ok) {
        const error = record(payload) && record(payload.error) ? payload.error : null;
        const code = error && isErrorCode(error.code) ? error.code : 'INTERNAL_ERROR';
        const requestId = error && typeof error.request_id === 'string' && /^[0-9a-f-]{36}$/i.test(error.request_id) ? error.request_id : '';
        setState({ kind: 'error', error: { ...clientError(code), request_id: requestId } });
      } else if (!isProjectPlan(payload)) setState({ kind: 'error', error: clientError('PROVIDER_INVALID_RESPONSE') });
      else setState({ kind: 'success', plan: payload, idea: input });
    } catch {
      if (active.current === controller) setState({ kind: 'error', error: clientError(controller.signal.aborted ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE') });
    } finally {
      clearTimeout(timer);
      if (active.current === controller) active.current = null;
    }
    return 'started';
  }
  function cancel() { active.current?.abort(); active.current = null; setState({ kind: 'idle' }); }
  function reset() { if (!active.current) setState({ kind: 'idle' }); }
  return { state, submit, cancel, reset };
}
