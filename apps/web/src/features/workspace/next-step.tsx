'use client';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ProjectPulse } from '@/features/project-pulse/project-pulse';
import { nextStep, type Step } from '@/lib/workspace/next-step';
import { availableTemplate, readTemplateChoice, writeTemplateChoice } from '@/lib/workspace/template-catalog';
import type { TemplateId } from '@/lib/workspace/build-receipt';
import { vi } from '@/lib/copy/vi';
import { useWorkspace } from './workspace';

const pulse: Record<Step['kind'], 'idle' | 'thinking' | 'building' | 'live' | 'error'> = {
  archived: 'idle', loading: 'idle', running: 'building', failed: 'error', noPlan: 'idle', planning: 'thinking', review: 'idle', build: 'idle', changePlan: 'idle', ready: 'live', demoReady: 'live', demoPending: 'idle',
};

export function focusEditRequest() {
  const box = document.getElementById('edit-request') as HTMLTextAreaElement | null;
  box?.scrollIntoView({ block: 'center' }); box?.focus();
}

export function NextStepBar() {
  const { id, snapshot, flow, openPanel, runCommands } = useWorkspace();
  const { planning, build } = flow;
  const [template, setTemplate] = useState<TemplateId | null>(null);
  useEffect(() => { setTemplate(readTemplateChoice(localStorage, id)); }, [id]);
  const step = nextStep({
    archived: Boolean(snapshot.project.archived_at), activeRun: snapshot.active_run, latestRun: snapshot.latest_run,
    currentVersion: snapshot.current_version, real: flow.real, proposals: flow.proposals, requests: flow.requests,
    planningPending: planning.pending,
  });
  // Templates only seed the first version; later builds always patch the current source.
  const seed = !snapshot.current_version ? availableTemplate(template) : null;
  const proposal = step.proposalId ? flow.proposals?.find(item => item.id === step.proposalId) : undefined;
  const request = step.requestId ? flow.requests?.find(item => item.id === step.requestId) : undefined;
  const busy = planning.busy || build.pending || runCommands.pending;
  function clearTemplate() { writeTemplateChoice(localStorage, id, null); setTemplate(null); }
  async function reviewAndBuild() { if (proposal && await planning.review(proposal.id)) await build.start(proposal.id, seed?.id ?? null); }

  let copy: { title: string; body: string } = vi.nextStep.loading;
  let action: ReactNode = null;
  switch (step.kind) {
    case 'archived': copy = vi.nextStep.archived; action = <Link className="button button-primary" href={`/projects/${id}/settings`}>{vi.nextStep.archived.action}</Link>; break;
    case 'running': copy = snapshot.active_run?.status === 'queued' ? vi.nextStep.queued : vi.nextStep.building; action = <Button variant="secondary" onClick={() => openPanel('trace')}>{vi.nextStep.building.action}</Button>; break;
    case 'failed': copy = vi.nextStep.failed; action = <Button pending={busy} onClick={() => void (flow.real ? build.retry(step.runId!) : runCommands.retry(step.runId!))}>{vi.nextStep.failed.action}</Button>; break;
    case 'noPlan': copy = vi.nextStep.noPlan; action = <Button pending={busy} disabled={!planning.ready || Boolean(planning.receipt)} onClick={() => void planning.initial()}>{vi.nextStep.noPlan.action}</Button>; break;
    case 'planning': copy = vi.nextStep.planning; action = planning.attempt?.status === 'pending' ? <Button variant="quiet" onClick={() => void planning.cancel()}>{vi.planning.cancel}</Button> : null; break;
    case 'review': copy = vi.nextStep.review; action = <Button pending={busy} onClick={() => void reviewAndBuild()}>{seed ? vi.nextStep.review.actionTemplate(seed.name) : vi.nextStep.review.action}</Button>; break;
    case 'build': copy = vi.nextStep.build; action = <Button pending={busy} onClick={() => void build.start(step.proposalId!, seed?.id ?? null)}>{seed ? vi.nextStep.build.actionTemplate(seed.name) : vi.nextStep.build.action}</Button>; break;
    case 'changePlan': copy = vi.nextStep.changePlan; action = <Button pending={busy} disabled={!request || Boolean(planning.receipt)} onClick={() => request && void planning.forRequest(request)}>{vi.nextStep.changePlan.action}</Button>; break;
    case 'ready': copy = vi.nextStep.ready; action = <Button onClick={focusEditRequest}>{vi.nextStep.ready.action}</Button>; break;
    case 'demoReady': copy = vi.nextStep.demoReady; action = <Button onClick={focusEditRequest}>{vi.nextStep.demoReady.action}</Button>; break;
    case 'demoPending': copy = vi.nextStep.demoPending; action = <Button variant="secondary" onClick={() => openPanel('trace')}>{vi.nextStep.demoPending.action}</Button>; break;
    case 'loading': break;
  }
  // A saved, unconfirmed command must be resolved before anything else is sent.
  if (build.receipt) action = <Button pending={build.pending} onClick={() => void build.resume()}>{vi.nextStep.resolveSaved}</Button>;
  else if (planning.receipt && !planning.busy) action = <Button onClick={() => void planning.resume()}>{vi.planning.resolve}</Button>;
  const errors = [build.error, planning.error, runCommands.error, flow.listError].filter(Boolean);
  return <section className="next-step" aria-labelledby="next-step-title" data-step={step.kind}>
    <div className="next-step-main">
      <div className="next-step-copy"><span className="meta">{vi.nextStep.label}</span><h2 id="next-step-title">{copy.title}</h2><p>{copy.body}</p></div>
      <div className="next-step-action"><ProjectPulse state={pulse[step.kind]} label={copy.title} />{action}</div>
    </div>
    {seed && ['noPlan', 'planning', 'review', 'build'].includes(step.kind) && <p className="next-step-template">{vi.nextStep.templateChosen(seed.name)} · {vi.nextStep.templateNote} <button type="button" className="text-action" onClick={clearTemplate}>{vi.nextStep.clearTemplate}</button></p>}
    {proposal && step.kind === 'review' && <details className="next-step-plan" open><summary>{vi.nextStep.planSummary}: {proposal.content.plan.project_title}</summary><p>{proposal.content.plan.product_summary}</p><h3>{vi.nextStep.planFeatures}</h3><ul>{proposal.content.plan.core_features.map((feature, index) => <li key={index}><strong>{feature.name}</strong> — {feature.description}</li>)}</ul><Link className="text-action" href={`/projects/${id}/planning`}>{vi.nextStep.planOpen}</Link></details>}
    {errors.map((error, index) => <p key={index} role="alert" className="form-error">{error}</p>)}
    {runCommands.notice && <p role="status">{runCommands.notice}</p>}
  </section>;
}
