'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ProjectPulse } from '@/features/project-pulse/project-pulse';
import { PlanView } from '@/features/project-planning/plan-view';
import { useDraftPlan } from '@/features/project-planning/use-draft-plan';
import { projectRequest, ProjectAPIError } from '@/lib/projects/browser';
import { createInput, type Created, type Session } from '@/lib/projects/contracts';
import { ATTEMPT_STORAGE, readAttempt, outcomeIsUnknown, type Attempt } from '@/lib/projects/creation';
import { availableTemplate, templateCatalog, writeTemplateChoice } from '@/lib/workspace/template-catalog';
import { vi } from '@/lib/copy/vi';

export function ProjectCreation({ initialIdea, initialTemplate }: { initialIdea: string; initialTemplate: string | null }) {
  const router = useRouter();
  const preset = availableTemplate(initialTemplate);
  const [title, setTitle] = useState(''), [brief, setBrief] = useState(preset?.brief || initialIdea), [error, setError] = useState(''), [pending, setPending] = useState(false), [unknown, setUnknown] = useState(false), [ready, setReady] = useState(false);
  const [template, setTemplate] = useState<string | null>(preset?.id ?? null);
  const [session, setSession] = useState<Session | null>(null), [sessionChecked, setSessionChecked] = useState(false);
  const draft = useDraftPlan();
  const attempt = useRef<Attempt | null>(null), busy = useRef(false), briefRef = useRef<HTMLTextAreaElement>(null), result = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let saved: Attempt | null = null;
    try { saved = readAttempt(sessionStorage); } catch { /* Private browsing may block storage. */ }
    if (saved) { attempt.current = saved; setTitle(saved.input.title ?? ''); setBrief(saved.input.brief); setUnknown(true); }
    setReady(true);
    const controller = new AbortController();
    projectRequest<Session>('/session', { signal: controller.signal }).then(setSession).catch(() => {}).finally(() => { if (!controller.signal.aborted) setSessionChecked(true); });
    return () => controller.abort();
  }, []);
  useEffect(() => { if (draft.state.kind === 'success') result.current?.focus(); }, [draft.state]);
  function forgetReceipt() { attempt.current = null; try { sessionStorage.removeItem(ATTEMPT_STORAGE); } catch { /* memory receipt still works */ } }
  function chooseTemplate(id: string) {
    const entry = availableTemplate(id);
    if (!entry) return;
    if (template === entry.id) { setTemplate(null); return; }
    setTemplate(entry.id);
    // One click: fill the description unless the owner already wrote their own.
    if (!brief.trim() || templateCatalog.some(item => item.brief === brief)) setBrief(entry.brief);
    setError(''); draft.reset(); briefRef.current?.focus();
  }
  async function create() {
    if (busy.current || !ready) return;
    const input = createInput(title, brief);
    if (!input) { setError(vi.create.invalid); briefRef.current?.focus(); return; }
    if (attempt.current && Date.now() - attempt.current.started >= 24 * 60 * 60 * 1000) { setError(vi.create.expired); return; }
    const command = attempt.current ?? { key: crypto.randomUUID(), input, started: Date.now() };
    attempt.current = command;
    try { sessionStorage.setItem(ATTEMPT_STORAGE, JSON.stringify(command)); } catch { /* Keep the same receipt in memory when storage is blocked. */ }
    busy.current = true; setPending(true); setError('');
    try {
      const result = await projectRequest<Created>('/projects', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': command.key }, body: JSON.stringify(command.input) });
      if (!/^[0-9a-f-]{36}$/i.test(result.project.id) || result.execution_mode !== 'simulated') throw new ProjectAPIError('SERVICE_UNAVAILABLE', 0);
      forgetReceipt(); setUnknown(false);
      writeTemplateChoice(localStorage, result.project.id, template);
      router.push(`/projects/${result.project.id}`);
    } catch (reason) {
      const unresolved = !(reason instanceof ProjectAPIError) || outcomeIsUnknown(reason.status, reason.code) || reason.code === 'IDEMPOTENCY_KEY_REUSED';
      setUnknown(unresolved); if (!unresolved) forgetReceipt();
      setError(reason instanceof Error ? reason.message : vi.create.unknownError);
      busy.current = false; setPending(false);
    }
  }
  async function previewPlan() {
    if (await draft.submit(brief) === 'invalid') { setError(vi.planningErrors.VALIDATION_ERROR); briefRef.current?.focus(); return; }
    setError('');
  }
  const locked = pending || unknown;
  const real = session?.capabilities?.real_generation === true;
  const drafting = draft.state.kind === 'pending';
  return <div className="vn-create">
    <form className="project-form saved-project-form vn-create-form" onSubmit={event => { event.preventDefault(); void create(); }} noValidate aria-busy={pending || drafting}>
      <div className="brief-label"><label htmlFor="saved-project-brief">{vi.create.briefLabel}</label><span className="meta">{vi.create.briefMeta}</span></div>
      <textarea ref={briefRef} id="saved-project-brief" name="brief" rows={5} value={brief} readOnly={locked || drafting} onChange={event => { setBrief(event.target.value); if (draft.state.kind === 'error') draft.reset(); }} placeholder={vi.create.briefPlaceholder} aria-required="true" aria-invalid={Boolean(error)} aria-describedby="saved-brief-help creation-mode" />
      <div className="brief-support"><p id="saved-brief-help">{vi.create.briefHelp}</p><span className="meta">{vi.create.count(Array.from(brief).length)}</span></div>
      <fieldset className="vn-templates" disabled={locked}>
        <legend>{vi.templates.heading}</legend>
        <p className="vn-hint">{vi.templates.note}</p>
        <div className="vn-template-grid">{templateCatalog.map(item => item.available
          ? <button key={item.id} type="button" className="template-choice" aria-pressed={template === item.id} onClick={() => chooseTemplate(item.id)}><strong>{item.name}</strong><span>{item.summary}</span>{template === item.id && <em>{vi.templates.selected}</em>}</button>
          : <div key={item.id} className="template-choice template-soon" aria-disabled="true"><strong>{item.name}</strong><span>{item.summary}</span><em>{vi.templates.soon}</em></div>)}</div>
      </fieldset>
      <label className="create-title-label" htmlFor="new-project-title">{vi.create.titleLabel} <span>{vi.create.titleHint}</span></label><input id="new-project-title" name="title" value={title} readOnly={locked} onChange={event => setTitle(event.target.value)} placeholder={vi.create.titlePlaceholder} />
      {unknown && <div className="unresolved-creation" role="status">{vi.create.unresolved}</div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="planning-actions vn-actions"><button className="button button-primary" disabled={pending || !ready || drafting}>{pending ? vi.create.submitPending : unknown ? vi.create.submitRetry : vi.create.submit}</button>
        <Button type="button" variant="secondary" pending={drafting} disabled={locked} onClick={() => void previewPlan()}>{drafting ? vi.create.draftPending : vi.create.draft}</Button>
        {drafting && <Button type="button" variant="quiet" onClick={() => draft.cancel()}>{vi.common.cancel}</Button>}</div>
      <p className="vn-mode" id="creation-mode"><ProjectPulse state={pending ? 'thinking' : 'idle'} label={!sessionChecked ? vi.create.modeUnknown : real ? vi.create.modeReal : vi.create.modeDemo} /></p>
      {sessionChecked && <details className="vn-mode-details"><summary>{vi.common.details}</summary><p>{real ? vi.create.modeDetailsReal : vi.create.modeDetailsDemo}</p><p>{vi.create.draftNote}</p></details>}
    </form>
    <div className="planning-feedback" role="status" aria-live="polite" aria-atomic="true">{drafting && <p>{vi.planner.progress}</p>}{draft.state.kind === 'success' && <p className="planning-success">{vi.planner.success}</p>}</div>
    {draft.state.kind === 'error' && <div className="planning-error" role="alert"><h2>{vi.planner.errorTitle}</h2><p>{draft.state.error.message}</p>{draft.state.error.request_id && <span className="meta">{vi.planner.errorReference}: {draft.state.error.request_id}</span>}<p className="muted">{vi.planner.errorKept}</p></div>}
    {draft.state.kind === 'success' && <div ref={result} className="planning-result" tabIndex={-1} aria-label={vi.planner.resultLabel}>{brief.trim() !== draft.state.idea && <p className="plan-stale">{vi.planner.stale}</p>}<PlanView plan={draft.state.plan} /></div>}
  </div>;
}
