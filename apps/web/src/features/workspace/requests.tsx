'use client';
import { useEffect, useRef, useState } from 'react';
import { projectRequest, ProjectAPIError } from '@/lib/projects/browser';
import { outcomeIsUnknown } from '@/lib/projects/creation';
import { changeInput, readChangeAttempt, uuid, type ChangeAttempt, type Requests, type RequestRecord } from '@/lib/workspace/contracts';
import { vi } from '@/lib/copy/vi';
import { useWorkspace, useResource, ResourceState, time } from './workspace';
export function RequestHistory() {
  const { id } = useWorkspace(); const [cursor, setCursor] = useState('');
  const result = useResource<Requests>(`/projects/${id}/requests${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`);
  return <section className="request-history" aria-label={vi.history.requests}><div className="section-heading"><h2>{vi.history.requests}</h2><span className="meta">{vi.history.requestsMeta}</span></div><ResourceState {...result} />{result.data?.items.map(record => <RequestCard key={record.id} record={record} />)}{result.data?.items.length === 0 && <p>{vi.history.noRequests}</p>}<div className="record-pagination">{cursor && <button className="button button-quiet" onClick={() => setCursor('')}>{vi.history.newerRequests}</button>}{result.data?.next_cursor && <button className="button button-secondary" onClick={() => setCursor(result.data!.next_cursor!)}>{vi.history.olderRequests}</button>}</div></section>;
}
export function RequestCard({ record }: { record: RequestRecord }) {
  const { snapshot, runCommands, flow } = useWorkspace();
  const eligible = flow.real === false && record.kind === 'change' && record.base_brain_revision_id === snapshot.project.current_brain_revision_id && record.base_version_id === snapshot.project.current_version_id && !snapshot.active_run && !snapshot.project.archived_at;
  return <article className="request-record"><div className="record-heading"><strong>{record.kind === 'initial' ? vi.history.original : vi.history.change}</strong><time dateTime={record.created_at}>{time(record.created_at)}</time></div><p className="preserved-text">{record.text}</p><details><summary>{vi.history.savedContext}</summary><dl><dt>{vi.history.requestId}</dt><dd>{record.id}</dd><dt>{vi.history.author}</dt><dd>{record.created_by}</dd><dt>{vi.history.baseBrain}</dt><dd>{record.base_brain_revision_id ?? vi.history.noBase}</dd><dt>{vi.history.baseVersion}</dt><dd>{record.base_version_id ?? vi.history.noVersion}</dd></dl></details>{record.kind === 'change' && <p className="record-disclosure">{vi.history.recorded}</p>}{eligible && <button className="button button-secondary" disabled={runCommands.pending || Boolean(runCommands.recovery)} onClick={() => void runCommands.start(record.id,record.base_brain_revision_id!)}>{vi.history.simulate}</button>}</article>;
}
/** "Bạn muốn sửa gì?": records a change request through the existing request flow. */
export function EditRequest() {
  const { id, snapshot, refresh, runCommands, flow } = useWorkspace();
  const [text, setText] = useState(''), [pending, setPending] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [review, setReview] = useState(false), [unknown, setUnknown] = useState(false), [ready, setReady] = useState(false);
  const [simulate, setSimulate] = useState(false);
  const [base, setBase] = useState({ brain: snapshot.project.current_brain_revision_id, version: snapshot.project.current_version_id });
  const attempt = useRef<ChangeAttempt | null>(null), busy = useRef(false); const storageKey = `f01.pending-change.v1.${id}`;
  const demo = flow.real === false;
  useEffect(() => { let receipt: ChangeAttempt | null = null; try { receipt = readChangeAttempt(sessionStorage, storageKey); } catch { /* memory recovery remains */ }
    if (receipt) { attempt.current = receipt; setText(receipt.input.text); setBase({ brain: receipt.input.base_brain_revision_id, version: receipt.input.base_version_id }); setSimulate(Boolean(receipt.simulate)); setUnknown(true); } setReady(true);
  }, [storageKey]);
  function forget() { attempt.current = null; try { sessionStorage.removeItem(storageKey); } catch { /* keep no inventory */ } }
  async function save() {
    if (busy.current || !ready) return;
    const data = changeInput(text, base.brain, base.version); if (!data) { setError(vi.edit.invalid); return; }
    if (attempt.current && Date.now() - attempt.current.started >= 86400000) { setError(vi.edit.expired); return; }
    const command = attempt.current ?? { key: crypto.randomUUID(), input: data, started: Date.now(), simulate: demo && simulate }; attempt.current = command;
    try { sessionStorage.setItem(storageKey, JSON.stringify(command)); } catch { /* stable mounted receipt */ }
    busy.current = true; setPending(true); setError(''); setNotice('');
    try { const saved = await projectRequest<RequestRecord>(`/projects/${id}/requests`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': command.key }, body: JSON.stringify(command.input) });
      if (!uuid.test(saved.id) || saved.project_id !== id.toLowerCase() || saved.kind !== 'change' || saved.text !== command.input.text || saved.base_brain_revision_id !== command.input.base_brain_revision_id || saved.base_version_id !== command.input.base_version_id) throw new ProjectAPIError('SERVICE_UNAVAILABLE', 0);
      forget(); setUnknown(false); setText(''); setNotice(demo ? vi.edit.savedDemo : vi.edit.savedReal); const current = await refresh(); flow.reloadLists(); if (current) setBase({ brain: current.project.current_brain_revision_id, version: current.project.current_version_id });
      if (command.simulate) { const run = await runCommands.start(saved.id, command.input.base_brain_revision_id); setNotice(run ? vi.edit.savedDemoRun : vi.edit.savedDemoRunUnknown); }
    } catch (e) { const unresolved = !(e instanceof ProjectAPIError) || outcomeIsUnknown(e.status, e.code) || e.code === 'IDEMPOTENCY_KEY_REUSED'; setUnknown(unresolved); if (!unresolved) forget(); if (e instanceof ProjectAPIError && ['STALE_BRAIN_REVISION', 'STALE_BASE_VERSION'].includes(e.code)) setReview(true); setError(e instanceof Error ? e.message : vi.edit.failed); }
    finally { busy.current = false; setPending(false); }
  }
  async function reviewContext() { setPending(true); const current = await refresh(); if (current) { setBase({ brain: current.project.current_brain_revision_id, version: current.project.current_version_id }); setReview(false); setError(''); setNotice(vi.edit.reviewed); } setPending(false); }
  useEffect(() => { if (ready && !text.trim() && !unknown && !attempt.current) { setBase(value => value.brain === snapshot.project.current_brain_revision_id && value.version === snapshot.project.current_version_id ? value : { brain: snapshot.project.current_brain_revision_id, version: snapshot.project.current_version_id }); setReview(false); } }, [ready,text,unknown,snapshot.project.current_brain_revision_id,snapshot.project.current_version_id]);
  const stale = review || (!unknown && (base.brain !== snapshot.project.current_brain_revision_id || base.version !== snapshot.project.current_version_id));
  const locked = pending || unknown;
  return <form className="edit-request" onSubmit={e => { e.preventDefault(); void save(); }} aria-busy={pending} aria-labelledby="edit-request-title">
    <h2 id="edit-request-title">{vi.edit.title}</h2>
    <label className="sr-only" htmlFor="edit-request">{vi.edit.label}</label>
    <textarea id="edit-request" value={text} readOnly={locked} placeholder={vi.edit.placeholder} onChange={e => { if (!text && !attempt.current) setBase({ brain: snapshot.project.current_brain_revision_id, version: snapshot.project.current_version_id }); setText(e.target.value); }} rows={3} aria-describedby="edit-request-help" />
    <p id="edit-request-help" className="vn-hint">{vi.edit.help}</p>
    {snapshot.active_run && <p className="workspace-notice">{vi.edit.busy}</p>}{snapshot.project.archived_at && <p className="workspace-notice">{vi.edit.archived}</p>}
    {unknown && <p role="status">{vi.edit.unknown}</p>}{stale && <div className="workspace-notice"><p>{vi.edit.stale}</p><button type="button" className="button button-secondary" disabled={pending} onClick={() => void reviewContext()}>{vi.edit.review}</button></div>}
    {demo && <label className="simulation-option"><input type="checkbox" checked={simulate} disabled={locked} onChange={e => setSimulate(e.target.checked)} /> {vi.edit.simulate}</label>}
    {error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status">{notice}</p>}
    <button className="button button-primary" disabled={!ready || pending || stale || (!unknown && Boolean(snapshot.active_run || snapshot.project.archived_at))}>{pending ? vi.edit.submitPending : unknown ? vi.edit.submitRetry : vi.edit.submit}</button>
  </form>;
}
