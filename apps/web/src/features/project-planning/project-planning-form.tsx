'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ProjectPulse } from '@/features/project-pulse/project-pulse';
import { IDEA_LIMIT, isErrorCode, isProjectPlan, parseIdea, planningErrors, record, type PlanningError, type ProjectPlan } from '@/lib/planning/contracts';
import { PlanView } from './plan-view';
import { ProjectStarters, projectStarters, type StarterId } from './project-starters';
import { vi } from '@/lib/copy/vi';

type State = { kind: 'idle' } | { kind: 'pending' } | { kind: 'success'; plan: ProjectPlan; idea: string } | { kind: 'error'; error: PlanningError };

function clientError(code: PlanningError['code']): PlanningError {
  return { code, message: planningErrors[code].message, request_id: '' };
}

export function ProjectPlanningForm({ presentation = 'project', initialIdea = '', companion, onStarterChange }: {
  presentation?: 'home' | 'project'; initialIdea?: string; companion?: ReactNode; onStarterChange?: (id: StarterId) => void;
}) {
  const [idea, setIdea] = useState(initialIdea);
  const [selectedStarter, setSelectedStarter] = useState<StarterId | undefined>(() => projectStarters.find(item => item.brief === initialIdea)?.id);
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [validation, setValidation] = useState('');
  const active = useRef<AbortController | null>(null);
  const brief = useRef<HTMLTextAreaElement>(null);
  const result = useRef<HTMLDivElement>(null);
  const pending = state.kind === 'pending';

  useEffect(() => () => { active.current?.abort(); }, []);
  useEffect(() => { if (state.kind === 'success') result.current?.focus(); }, [state]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current) return;
    const input = parseIdea({ idea });
    if (!input) {
      setValidation(planningErrors.VALIDATION_ERROR.message);
      brief.current?.focus();
      return;
    }
    setValidation('');
    setState({ kind: 'pending' });
    const controller = new AbortController();
    active.current = controller;
    const timer = setTimeout(() => controller.abort('deadline'), 140_000);
    try {
      const response = await fetch('/api/v1/plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: input }), signal: controller.signal, cache: 'no-store',
      });
      const payload: unknown = await response.json();
      if (active.current !== controller) return;
      if (!response.ok) {
        const error = record(payload) && record(payload.error) ? payload.error : null;
        const code = error && isErrorCode(error.code) ? error.code : 'INTERNAL_ERROR';
        const requestId = error && typeof error.request_id === 'string' && /^[0-9a-f-]{36}$/i.test(error.request_id) ? error.request_id : '';
        setState({ kind: 'error', error: { ...clientError(code), request_id: requestId } });
      } else if (!isProjectPlan(payload)) {
        setState({ kind: 'error', error: clientError('PROVIDER_INVALID_RESPONSE') });
      } else {
        setState({ kind: 'success', plan: payload, idea: input });
      }
    } catch {
      if (active.current === controller) {
        setState({ kind: 'error', error: clientError(controller.signal.aborted ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE') });
      }
    } finally {
      clearTimeout(timer);
      if (active.current === controller) active.current = null;
    }
  }

  function cancel() {
    active.current?.abort();
    active.current = null;
    setState({ kind: 'idle' });
    brief.current?.focus();
  }

  return <div className={`planning-flow planning-${presentation}`}>
    <div className="planning-composition">
    <form className="project-form" id={presentation === 'home' ? 'command-surface' : undefined} onSubmit={submit} noValidate aria-busy={pending}>
      <div className="composer-topline"><span className="meta">{presentation === 'home' ? vi.planner.homeTopline : vi.planner.projectTopline}</span><ProjectPulse state={pending ? 'planning' : 'idle'} label={pending ? vi.planner.pulsePending : vi.planner.pulseIdle} animate={pending} /></div>
      {presentation === 'home' && <div className="command-intention"><span className="command-cursor" aria-hidden="true">↳</span><p>{vi.planner.intention}</p><span className="meta">{vi.planner.intentionMeta}</span></div>}
      <div className="brief-label"><label htmlFor="brief">{vi.planner.label}</label><span className="meta">{vi.planner.labelMeta}</span></div>
      <textarea ref={brief} id="brief" name="idea" rows={5} value={idea} readOnly={pending}
        placeholder={presentation === 'home' ? vi.planner.homePlaceholder : vi.planner.projectPlaceholder} aria-required="true" aria-invalid={Boolean(validation)}
        aria-describedby={`brief-help brief-count${validation ? ' brief-error' : ''}`}
        onChange={event => { setIdea(event.target.value); setSelectedStarter(undefined); setValidation(''); if (state.kind === 'error') setState({ kind: 'idle' }); }} />
      <div className="brief-support"><p id="brief-help">{vi.planner.help}</p><span id="brief-count" className="meta">{vi.planner.count(Array.from(idea).length, IDEA_LIMIT)}</span></div>
      {validation && <p id="brief-error" className="form-error" role="alert">{validation}</p>}
      <div className="planning-actions"><Button type="submit" pending={pending}>{pending ? vi.planner.submitPending : state.kind === 'success' ? vi.planner.submitAgain : vi.planner.submit}</Button>
        {pending && <Button type="button" variant="quiet" onClick={cancel}>{vi.common.cancel}</Button>}
        {!pending && <span className="meta">{vi.planner.flow}</span>}
      </div>
      <p className="planning-footnote">{vi.planner.footnote}</p>
      <ProjectStarters selected={selectedStarter} disabled={pending} categoryFirst={presentation === 'home'} onSelect={(id, starterBrief) => { setIdea(starterBrief); setSelectedStarter(id); setValidation(''); setState({ kind: 'idle' }); onStarterChange?.(id); brief.current?.focus(); }} />
    </form>
    {companion}
    </div>

    <div className="planning-feedback" role="status" aria-live="polite" aria-atomic="true">
      {pending && <div className="planning-progress"><ProjectPulse state="planning" animate /><p>{vi.planner.progress}</p></div>}
      {state.kind === 'success' && <p className="planning-success">{vi.planner.success}</p>}
    </div>
    {state.kind === 'error' && <div className="planning-error" role="alert"><h2>{vi.planner.errorTitle}</h2><p>{state.error.message}</p>
      {state.error.request_id && <span className="meta">{vi.planner.errorReference}: {state.error.request_id}</span>}
      <p className="muted">{vi.planner.errorKept}</p>
    </div>}
    {state.kind === 'success' && <div ref={result} className="planning-result" tabIndex={-1} aria-label={vi.planner.resultLabel}>
      {idea.trim() !== state.idea && <p className="plan-stale">{vi.planner.stale}</p>}
      <PlanView plan={state.plan} />
    </div>}
  </div>;
}
