'use client';
// One instance per open project (created by Workspace): planning and build commands with
// their idempotency receipts, shared by the next-step bar and the technical Kế hoạch page.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { components } from '@f01/api-client/schema';
import { projectRequest, ProjectAPIError } from '@/lib/projects/browser';
import { errorMessage, type Session } from '@/lib/projects/contracts';
import { planningErrors } from '@/lib/planning/contracts';
import { uuid, type Snapshot, type RequestRecord, type Requests } from '@/lib/workspace/contracts';
import { buildReceipt, type BuildReceipt, type TemplateId } from '@/lib/workspace/build-receipt';
import { vi } from '@/lib/copy/vi';

export type Proposal = components['schemas']['ProposalRecord'];
export type Attempt = components['schemas']['AttemptRecord'];
type PlanInput = components['schemas']['PlanInput'];
type PlanReceipt = { key: string; requestKey: string; input: PlanInput; intent: string; created: number; attemptId?: string; record?: boolean };

function parsePlanReceipt(raw: string | null): PlanReceipt | null {
  try {
    const r = JSON.parse(raw ?? 'null') as PlanReceipt;
    if (r && uuid.test(r.key) && uuid.test(r.requestKey) && ['initial', 'change'].includes(r.input.kind) && uuid.test(r.input.request_id) && uuid.test(r.input.base_brain_revision_id) && (r.input.base_version_id === null || uuid.test(r.input.base_version_id)) && typeof r.intent === 'string' && r.intent.length <= 10000 && Date.now() - r.created < 86400000 && Date.now() >= r.created && (!r.attemptId || uuid.test(r.attemptId))) return r;
  } catch { /* invalid receipt is ignored */ }
  return null;
}
function message(e: unknown, fallback: string) { return e instanceof Error ? e.message : fallback; }

export function useProjectFlow(id: string, snapshot: Snapshot | null, refresh: () => Promise<Snapshot | null>, generation: number) {
  const [session, setSession] = useState<Session | null>(null), [sessionChecked, setSessionChecked] = useState(false);
  const [proposals, setProposals] = useState<Proposal[] | null>(null), [requests, setRequests] = useState<RequestRecord[] | null>(null), [listError, setListError] = useState('');
  const [reload, setReload] = useState(0);
  const loaded = Boolean(snapshot);
  useEffect(() => { const c = new AbortController(); projectRequest<Session>('/session', { signal: c.signal }).then(setSession).catch(() => {}).finally(() => { if (!c.signal.aborted) setSessionChecked(true); }); return () => c.abort(); }, []);
  useEffect(() => {
    if (!loaded) return;
    const c = new AbortController();
    Promise.all([projectRequest<{ items: Proposal[] }>(`/projects/${id}/planning/proposals`, { signal: c.signal }), projectRequest<Requests>(`/projects/${id}/requests`, { signal: c.signal })])
      .then(([p, r]) => { if (!c.signal.aborted) { setProposals(p.items); setRequests(r.items); setListError(''); } })
      .catch(e => { if (!c.signal.aborted) setListError(message(e, vi.common.loadingRecords)); });
    return () => c.abort();
  }, [id, loaded, generation, reload]);
  const reloadLists = useCallback(() => setReload(n => n + 1), []);

  // Planning commands (same receipt format and storage key as before).
  const planStorage = `f01-context-plan:${id}`;
  const [planReceipt, setPlanReceipt] = useState<PlanReceipt | null>(null), [planBusy, setPlanBusy] = useState(false), [planError, setPlanError] = useState(''), [attempt, setAttempt] = useState<Attempt | null>(null), [planReady, setPlanReady] = useState(false);
  const planBusyRef = useRef(false), pollRef = useRef<AbortController | null>(null);
  useEffect(() => { try { setPlanReceipt(parsePlanReceipt(sessionStorage.getItem(planStorage))); } catch { /* storage blocked */ } setPlanReady(true); return () => pollRef.current?.abort(); }, [planStorage]);
  function savePlan(r: PlanReceipt | null) { setPlanReceipt(r); try { if (r) sessionStorage.setItem(planStorage, JSON.stringify(r)); else sessionStorage.removeItem(planStorage); } catch { /* memory receipt remains */ } }
  async function finish(value: Attempt) {
    setAttempt(value);
    if (value.status === 'pending') return false;
    savePlan(null);
    if (value.status !== 'succeeded') setPlanError(value.error_code && value.error_code in planningErrors ? planningErrors[value.error_code as keyof typeof planningErrors].message : errorMessage(value.error_code ?? 'INTERNAL_ERROR'));
    await refresh(); reloadLists(); return true;
  }
  async function runPlan(start: PlanReceipt | null) {
    if (planBusyRef.current || !snapshot) return;
    planBusyRef.current = true; pollRef.current = null; setPlanBusy(true); setPlanError(''); setAttempt(null);
    let r = start;
    try {
      if (!r) throw new Error(vi.planning.staleError);
      savePlan(r);
      if (r.record) {
        const recorded = await projectRequest<RequestRecord>(`/projects/${id}/requests`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': r.requestKey }, body: JSON.stringify({ text: r.intent, base_brain_revision_id: r.input.base_brain_revision_id, base_version_id: r.input.base_version_id }) });
        r = { ...r, record: false, input: { ...r.input, request_id: recorded.id } }; savePlan(r);
      }
      let value = await projectRequest<Attempt>(`/projects/${id}/planning/attempts`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': r.key }, body: JSON.stringify(r.input) });
      r = { ...r, attemptId: value.id }; savePlan(r);
      if (await finish(value)) return;
      const controller = new AbortController(); pollRef.current = controller;
      const started = Date.now();
      while (Date.now() - started < 135000 && !controller.signal.aborted) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (controller.signal.aborted) return;
        value = await projectRequest<Attempt>(`/projects/${id}/planning/attempts/${value.id}`, { signal: controller.signal });
        if (await finish(value)) return;
      }
    } catch (e) {
      if (pollRef.current?.signal.aborted) return;
      if (e instanceof ProjectAPIError && e.status >= 400 && e.status < 500 && e.code !== 'IDEMPOTENCY_IN_PROGRESS') { savePlan(null); await refresh(); }
      if (!(e instanceof DOMException && e.name === 'AbortError')) setPlanError(message(e, vi.planning.unavailable));
    } finally { planBusyRef.current = false; setPlanBusy(false); }
  }
  const fresh = (input: PlanInput, intent = '', record = false): PlanReceipt => ({ key: crypto.randomUUID(), requestKey: crypto.randomUUID(), input, intent, created: Date.now(), record });
  const planning = {
    busy: planBusy, error: planError, attempt, receipt: planReceipt, ready: planReady,
    pending: planBusy || attempt?.status === 'pending',
    initial: () => snapshot && !planReceipt ? runPlan(fresh({ kind: 'initial', request_id: snapshot.current_brain.content.original_request_id, base_brain_revision_id: snapshot.project.current_brain_revision_id, base_version_id: snapshot.project.current_version_id })) : Promise.resolve(),
    forRequest: (request: RequestRecord) => !planReceipt && request.base_brain_revision_id ? runPlan(fresh({ kind: 'change', request_id: request.id, base_brain_revision_id: request.base_brain_revision_id, base_version_id: request.base_version_id })) : Promise.resolve(),
    recordAndPlan: (intent: string, bases: { brain: string; version: string | null }) => snapshot && !planReceipt ? runPlan(fresh({ kind: 'change', request_id: snapshot.current_brain.content.original_request_id, base_brain_revision_id: bases.brain, base_version_id: bases.version }, intent, true)) : Promise.resolve(),
    resume: () => runPlan(planReceipt),
    cancel: async () => { if (!attempt || attempt.status !== 'pending') return; try { const value = await projectRequest<Attempt>(`/projects/${id}/planning/attempts/${attempt.id}/cancel`, { method: 'POST' }); pollRef.current?.abort(); await finish(value); } catch (e) { setPlanError(message(e, vi.planning.cancelUnavailable)); } },
    review: async (proposalId: string) => { if (planBusyRef.current) return false; planBusyRef.current = true; setPlanBusy(true); try { await projectRequest(`/projects/${id}/planning/proposals/${proposalId}/review`, { method: 'POST' }); await refresh(); reloadLists(); return true; } catch (e) { setPlanError(message(e, vi.planning.reviewUnavailable)); return false; } finally { planBusyRef.current = false; setPlanBusy(false); } },
  };

  // Build commands (same receipt format and storage key as the earlier build panel).
  const buildStorage = `f01:build:${id}`;
  const [buildReceiptState, setBuildReceipt] = useState<BuildReceipt | null>(null), [buildPending, setBuildPending] = useState(false), [buildError, setBuildError] = useState('');
  useEffect(() => { try { setBuildReceipt(buildReceipt(JSON.parse(sessionStorage.getItem(buildStorage) ?? 'null'), id)); } catch { /* invalid receipt is ignored */ } }, [buildStorage, id]);
  async function perform(command: BuildReceipt) {
    setBuildPending(true); setBuildError(''); setBuildReceipt(command);
    try { sessionStorage.setItem(buildStorage, JSON.stringify(command)); } catch { /* memory receipt remains */ }
    try {
      await projectRequest(command.path, { method: 'POST', headers: { 'Idempotency-Key': command.key, 'Content-Type': 'application/json' }, body: JSON.stringify(command.body) });
      try { sessionStorage.removeItem(buildStorage); } catch { /* nothing stored */ }
      setBuildReceipt(null); await refresh(); reloadLists(); return true;
    } catch (e) {
      setBuildError(message(e, vi.commands.buildFailed));
      if (e instanceof ProjectAPIError && e.status >= 400 && e.status < 500 && ![408, 425].includes(e.status)) { try { sessionStorage.removeItem(buildStorage); } catch { /* nothing stored */ } setBuildReceipt(null); }
      return false;
    } finally { setBuildPending(false); }
  }
  const build = {
    pending: buildPending, error: buildError, receipt: buildReceiptState,
    start: (proposalId: string, template: TemplateId | null) => perform({ key: crypto.randomUUID(), path: `/projects/${id}/builds`, body: template ? { proposal_id: proposalId, template } : { proposal_id: proposalId } }),
    retry: (runId: string) => perform({ key: crypto.randomUUID(), path: `/projects/${id}/builds/${runId}/retry`, body: {} }),
    cancel: (runId: string) => perform({ key: crypto.randomUUID(), path: `/projects/${id}/builds/${runId}/cancel`, body: {} }),
    resume: () => buildReceiptState ? perform(buildReceiptState) : Promise.resolve(false),
  };
  return { session, sessionChecked, real: sessionChecked ? session?.capabilities?.real_generation === true : null, proposals, requests, listError, reloadLists, planning, build };
}
export type ProjectFlow = ReturnType<typeof useProjectFlow>;
