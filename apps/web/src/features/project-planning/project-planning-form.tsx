'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useDraftPlan } from './use-draft-plan';
import { Button } from '@/components/ui/button';
import { ProjectPulse } from '@/features/project-pulse/project-pulse';
import { IDEA_LIMIT, planningErrors } from '@/lib/planning/contracts';
import { PlanView } from './plan-view';
import { ProjectStarters, projectStarters, type StarterId } from './project-starters';
import { vi } from '@/lib/copy/vi';

export function ProjectPlanningForm({ presentation = 'project', initialIdea = '', companion, onStarterChange }: {
  presentation?: 'home' | 'project'; initialIdea?: string; companion?: ReactNode; onStarterChange?: (id: StarterId) => void;
}) {
  const [idea, setIdea] = useState(initialIdea);
  const [selectedStarter, setSelectedStarter] = useState<StarterId | undefined>(() => projectStarters.find(item => item.brief === initialIdea)?.id);
  const [validation, setValidation] = useState('');
  const draft = useDraftPlan(), state = draft.state;
  const brief = useRef<HTMLTextAreaElement>(null);
  const result = useRef<HTMLDivElement>(null);
  const pending = state.kind === 'pending';

  useEffect(() => { if (state.kind === 'success') result.current?.focus(); }, [state]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await draft.submit(idea) === 'invalid') { setValidation(planningErrors.VALIDATION_ERROR.message); brief.current?.focus(); return; }
    setValidation('');
  }

  function cancel() { draft.cancel(); brief.current?.focus(); }

  return <div className={`planning-flow planning-${presentation}`}>
    <div className="planning-composition">
    <form className="project-form" id={presentation === 'home' ? 'command-surface' : undefined} onSubmit={submit} noValidate aria-busy={pending}>
      <div className="composer-topline"><span className="meta">{presentation === 'home' ? vi.planner.homeTopline : vi.planner.projectTopline}</span><ProjectPulse state={pending ? 'planning' : 'idle'} label={pending ? vi.planner.pulsePending : vi.planner.pulseIdle} animate={pending} /></div>
      {presentation === 'home' && <div className="command-intention"><span className="command-cursor" aria-hidden="true">↳</span><p>{vi.planner.intention}</p><span className="meta">{vi.planner.intentionMeta}</span></div>}
      <div className="brief-label"><label htmlFor="brief">{vi.planner.label}</label><span className="meta">{vi.planner.labelMeta}</span></div>
      <textarea ref={brief} id="brief" name="idea" rows={5} value={idea} readOnly={pending}
        placeholder={presentation === 'home' ? vi.planner.homePlaceholder : vi.planner.projectPlaceholder} aria-required="true" aria-invalid={Boolean(validation)}
        aria-describedby={`brief-help brief-count${validation ? ' brief-error' : ''}`}
        onChange={event => { setIdea(event.target.value); setSelectedStarter(undefined); setValidation(''); if (state.kind === 'error') draft.reset(); }} />
      <div className="brief-support"><p id="brief-help">{vi.planner.help}</p><span id="brief-count" className="meta">{vi.planner.count(Array.from(idea).length, IDEA_LIMIT)}</span></div>
      {validation && <p id="brief-error" className="form-error" role="alert">{validation}</p>}
      <div className="planning-actions"><Button type="submit" pending={pending}>{pending ? vi.planner.submitPending : state.kind === 'success' ? vi.planner.submitAgain : vi.planner.submit}</Button>
        {pending && <Button type="button" variant="quiet" onClick={cancel}>{vi.common.cancel}</Button>}
        {!pending && <span className="meta">{vi.planner.flow}</span>}
      </div>
      <p className="planning-footnote">{vi.planner.footnote}</p>
      <ProjectStarters selected={selectedStarter} disabled={pending} categoryFirst={presentation === 'home'} onSelect={(id, starterBrief) => { setIdea(starterBrief); setSelectedStarter(id); setValidation(''); draft.reset(); onStarterChange?.(id); brief.current?.focus(); }} />
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
