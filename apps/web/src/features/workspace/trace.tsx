'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { issueRelationships, phases, type BuildEvent } from '@/lib/workspace/trace';
import type { Run, Runs } from '@/lib/workspace/contracts';
import { useWorkspace, useResource, ResourceState, time } from './workspace';
import { vi } from '@/lib/copy/vi';
const labels = vi.trace.phases;
function groups(events: BuildEvent[]) {
  const result: {phase: keyof typeof labels; events: BuildEvent[]}[] = [];
  for (const event of events) {
    const phase = ['run.succeeded','run.failed','run.canceled'].includes(event.type) ? 'outcome' : event.phase ?? 'understanding';
    if (result.at(-1)?.phase !== phase) result.push({phase,events:[]});
    result.at(-1)!.events.push(event);
  }
  return result;
}
export function BuildTrace() {
  const { snapshot, events, transport, historyReady, inspectedRunId } = useWorkspace();
  const runId = inspectedRunId ?? snapshot.latest_run?.id;
  const selected = events.filter(event => event.run_id === runId);
  const [follow,setFollow] = useState(true), [seen,setSeen] = useState(0);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => { setFollow(true); setSeen(0); },[runId]);
  useEffect(() => { if (follow && scroll.current) { scroll.current.scrollTop = scroll.current.scrollHeight; setSeen(selected.length); } },[selected.length,follow]);
  useEffect(() => {
    const element = scroll.current; if (!element || !follow) return;
    const observer = new ResizeObserver(() => { element.scrollTop = element.scrollHeight; });
    observer.observe(element); return () => observer.disconnect();
  }, [follow]);
  const related = issueRelationships(selected);
  const unread = Math.max(0,selected.length - seen);
  function inspectEvent(eventId: string) { setFollow(false); const target = document.getElementById(`trace-${eventId}`); target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'nearest' }); }
  return <section className="build-trace" aria-label={vi.trace.eyebrow}>
    <span className="meta">{vi.trace.eyebrow}</span><h2>{vi.trace.title}</h2>
    <details className="trace-context" onToggle={event => { if (event.currentTarget.open) setFollow(false); }}><summary>{vi.trace.scope}</summary><p className="record-disclosure">{vi.trace.scopeNote}</p><p className="trace-timezone">{vi.trace.timezone(Intl.DateTimeFormat().resolvedOptions().timeZone)}</p></details>
    <p className="trace-transport" data-transport={transport}>{vi.trace.connection(vi.trace.connectionStates[transport] ?? transport)}{transport === 'session expired' && <> · <Link href="/sign-in">{vi.trace.review}</Link></>}</p>
    {!historyReady && <p className="record-disclosure" role="status">{vi.trace.loadingHistory}</p>}
    <ol className="trace-phase-index" aria-label={vi.trace.phasesLabel}>{[...phases,'outcome' as const].map(phase => <li key={phase}>{labels[phase]}</li>)}</ol>
    <div className="trace-follow"><button className="button button-quiet" aria-pressed={follow} onClick={() => { setFollow(value => !value); setSeen(selected.length); }}>{follow ? vi.trace.pause : vi.trace.follow}</button>{!follow && <button className="button button-secondary" onClick={() => setFollow(true)}>{vi.trace.jump(unread)}</button>}</div>
    <div ref={scroll} className="trace-scroll" tabIndex={0} aria-label={vi.trace.ordered} onScroll={() => {
      const element=scroll.current!; const atEnd=element.scrollHeight-element.clientHeight-element.scrollTop < 24;
      if (!atEnd) setFollow(false); else if (follow) setSeen(selected.length);
    }}>
      {!selected.length && <p>{vi.trace.empty}</p>}
      {groups(selected).map(group => <section className="trace-group" key={group.events[0]!.id} data-phase={group.phase}><h3>{labels[group.phase]}</h3><ol>{group.events.map(event => { const repair = related.find(pair => pair.issue.id === event.id)?.repairs[0]; const issue = related.find(pair => pair.issue.payload.issue_id === event.payload.resolves_issue_id)?.issue; return <li id={`trace-${event.id}`} tabIndex={-1} key={event.id} data-sequence={event.sequence} data-severity={event.severity}>
        <div className="trace-event-meta"><span>#{event.sequence} · {event.mode === 'simulated' ? vi.trace.modeDemo : event.mode === 'real' ? vi.trace.modeReal : vi.trace.modeUser}</span><time dateTime={event.occurred_at}>{new Date(event.occurred_at).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'})}</time></div><p>{event.message}</p>{event.payload.execution_phase && <span className="meta">{event.payload.execution_phase}</span>}
        {event.payload.issue_id && <div className="trace-issue"><strong>{vi.trace.issue(event.payload.issue_id)}</strong><p>{repair ? <a href={`#trace-${repair.id}`} onClick={e => { e.preventDefault(); inspectEvent(repair.id); }}>{vi.trace.linkedRepair(repair.sequence)}</a> : vi.trace.noRepair}</p></div>}
        {event.payload.resolves_issue_id && <p className="trace-issue">{issue ? <a href={`#trace-${issue.id}`} onClick={e => { e.preventDefault(); inspectEvent(issue.id); }}>{vi.trace.repairOf(event.payload.resolves_issue_id)}</a> : <>{vi.trace.repairPending(event.payload.resolves_issue_id)}</>}</p>}
        <details className="trace-references"><summary>{vi.trace.references(event.sequence)}</summary><dl><dt>{vi.trace.event}</dt><dd>{event.type}</dd><dt>{vi.trace.run}</dt><dd>{event.run_id ?? vi.common.none}</dd><dt>{vi.trace.request}</dt><dd>{event.request_id ?? vi.common.none}</dd><dt>{vi.trace.utc}</dt><dd>{event.occurred_at}</dd><dt>{vi.trace.cursor}</dt><dd>{event.payload.step_cursor ?? vi.trace.notFixture}</dd></dl></details>
      </li>; })}</ol></section>)}
    </div>
  </section>;
}
export function RunDetails() {
  const { id,snapshot,inspectedRunId,setInspectedRunId,runCommands } = useWorkspace();
  const [cursor,setCursor] = useState('');
  const list=useResource<Runs>(`/projects/${id}/runs${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`);
  const detail=useResource<Run>(inspectedRunId ? `/projects/${id}/runs/${inspectedRunId}` : null);
  const run=inspectedRunId ? (snapshot.latest_run?.id === inspectedRunId ? snapshot.latest_run : detail.data) : snapshot.latest_run;
  const active=run?.status==='queued' || run?.status==='running';
  return <section className="run-details"><span className="meta">{vi.run.eyebrow(run?.mode === 'real')}</span><h2>{run ? vi.run.title(run.attempt, vi.run.statuses[run.status] ?? run.status) : vi.run.none}</h2>
    <p className="record-disclosure">{inspectedRunId && inspectedRunId !== snapshot.latest_run?.id ? vi.run.historical : vi.run.latest}</p>
    <label htmlFor="run-selection">{vi.run.select}</label><select id="run-selection" value={inspectedRunId ?? ''} onChange={e => setInspectedRunId(e.target.value || null)}><option value="">{vi.run.latestOption}</option>{inspectedRunId && !list.data?.items.some(item => item.id===inspectedRunId) && <option value={inspectedRunId}>{vi.run.selectedOption(inspectedRunId.slice(0,8))}</option>}{list.data?.items.map(item => <option key={item.id} value={item.id}>{vi.run.option(item.attempt, vi.run.statuses[item.status] ?? item.status, item.id.slice(0,8))}</option>)}</select>
    <ResourceState {...list} />{inspectedRunId && <ResourceState {...detail} />}
    <div className="record-pagination">{cursor && <button onClick={() => setCursor('')}>{vi.run.newer}</button>}{list.data?.next_cursor && <button onClick={() => setCursor(list.data!.next_cursor!)}>{vi.run.older}</button>}</div>
    {run && <><dl><dt>{vi.run.fields.id}</dt><dd>{run.id}</dd><dt>{vi.run.fields.scenario}</dt><dd>{run.scenario_id}@{run.scenario_version}</dd><dt>{vi.run.fields.phase}</dt><dd>{run.phase ?? vi.run.queued}</dd><dt>{vi.run.fields.request}</dt><dd>{run.request_id}</dd><dt>{vi.run.fields.brain}</dt><dd>{run.input_brain_revision_id}</dd><dt>{vi.run.fields.base}</dt><dd>{run.base_version_id ?? vi.common.none}</dd><dt>{vi.run.fields.retry}</dt><dd>{run.retry_of_run_id ?? vi.run.first}</dd><dt>{vi.run.fields.cursor}</dt><dd>{run.step_cursor}</dd><dt>{vi.run.fields.created}</dt><dd>{time(run.created_at)}</dd><dt>{vi.run.fields.started}</dt><dd>{run.started_at ? time(run.started_at) : vi.run.notStarted}</dd><dt>{vi.run.fields.finished}</dt><dd>{run.finished_at ? time(run.finished_at) : vi.run.notFinished}</dd><dt>{vi.run.fields.next}</dt><dd>{run.next_step_at ? time(run.next_step_at) : vi.common.none}</dd><dt>{vi.run.fields.error}</dt><dd>{run.error_code ?? vi.common.none}</dd></dl>
      {active && run.mode === 'simulated' && <><p className="record-disclosure">{vi.run.cancelNote(snapshot.current_version?.number ?? null)}</p><button className="button button-secondary" disabled={runCommands.pending || Boolean(runCommands.recovery)} onClick={() => void runCommands.cancel(run.id)}>{vi.run.cancel}</button></>}
      {run.status==='failed' && run.mode === 'simulated' && <><p className="record-disclosure">{vi.run.retryNote}</p><button className="button button-primary" disabled={runCommands.pending || Boolean(runCommands.recovery) || Boolean(snapshot.active_run || snapshot.project.archived_at)} onClick={() => void runCommands.retry(run.id)}>{vi.run.retry}</button></>}
      <p className="record-disclosure">{vi.run.inspectNote}</p></>}
  </section>;
}
