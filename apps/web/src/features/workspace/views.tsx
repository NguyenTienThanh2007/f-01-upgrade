'use client';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProjectSettings } from '@/features/projects/project-settings';
import { ProjectPulse } from '@/features/project-pulse/project-pulse';
import type { Brain, Revisions, Provenance, Statement, Events, Versions, Version } from '@/lib/workspace/contracts';
import { vi } from '@/lib/copy/vi';
import { useWorkspace, useResource, ResourceState, time } from './workspace';
import { RequestHistory, RequestCard, EditRequest } from './requests';
import { PreviewFrame, ViewportControl, DeviceFrame } from './preview';
import { focusEditRequest } from './next-step';

export function PreviewView() {
  const { id, snapshot, viewport, setViewport, setInspectedVersion } = useWorkspace(); const versionId = useSearchParams().get('version');
  const selected = useResource<Version>(versionId ? `/projects/${id}/versions/${encodeURIComponent(versionId)}` : null);
  const version = versionId ? selected.data : snapshot.current_version;
  useEffect(() => { setInspectedVersion(version?.number ?? null); return () => setInspectedVersion(null); }, [version?.number, setInspectedVersion]);
  const historical = Boolean(versionId && version && version.id !== snapshot.project.current_version_id);
  return <section className="workspace-preview vn-app" aria-labelledby="preview-title">
    <div className="preview-toolbar"><h2 id="preview-title">{version ? vi.workspace.version(version.number, version.mode === 'real') : vi.preview.emptyTitle}</h2><ViewportControl value={viewport} onChange={setViewport} /></div>
    {versionId && <><ResourceState {...selected} /><Link className="text-action" href={`/projects/${id}`}>{vi.preview.returnCurrent}</Link></>}
    {snapshot.latest_run?.status === 'failed' && snapshot.current_version && !versionId && <p className="workspace-notice">{vi.preview.failedUpdate(snapshot.current_version.number)}</p>}
    <div className="vn-app-grid">
      <div className="vn-app-preview">
        {version ? <><PreviewFrame descriptor={version.preview_descriptor} viewport={viewport} /><p className="vn-hint">{historical ? vi.preview.historical : version.mode === 'real' ? vi.preview.noteReal : vi.preview.noteDemo}</p></>
          : !versionId && <DeviceFrame viewport={viewport} label={vi.preview.frameLabel}><div className="device-state device-empty"><ProjectPulse state={snapshot.active_run ? 'building' : 'idle'} label={snapshot.active_run ? vi.nextStep.building.title : vi.preview.emptyTitle} animate={Boolean(snapshot.active_run)} /><p>{vi.preview.emptyBody}</p><span className="device-skeleton" aria-hidden="true"><i /><i /><i /></span></div></DeviceFrame>}
      </div>
      <div className="vn-app-edit"><EditRequest /></div>
    </div>
  </section>;
}
export function BriefView() {
  const { id } = useWorkspace(); const result = useResource<Brain>(`/projects/${id}/brain`); const original = result.data?.context.requests.find(r => r.kind === 'initial');
  return <div className="workspace-document"><DocumentHeading title={vi.brief.title} description={vi.brief.lede} /><ResourceState {...result} />{original && <RequestCard record={original} />}<Link className="button button-secondary" href={`/projects/${id}`} onClick={() => setTimeout(focusEditRequest, 300)}>{vi.brief.record}</Link><RequestHistory /></div>;
}
export function ProvenanceLabel({ value }: { value: Provenance }) { return <details className={`provenance provenance-${value.source}`}><summary>{vi.brain.provenance[value.source]}</summary><span>{value.source === 'user_request' ? vi.brain.provenanceRequest(String(value.request_id)) : value.source === 'template' ? value.fixture_ref : vi.brain.provenanceRun(String(value.run_id), String(value.event_sequence))}</span></details>; }
function StatementView({ value }: { value: Statement }) { return <div className="brain-statement"><p className="preserved-text">{value.text}</p><ProvenanceLabel value={value.provenance} /></div>; }
function DocumentHeading({ title, description }: { title: string; description: string }) { return <div className="document-heading"><span className="meta">{vi.workspace.technical.toUpperCase()}</span><h2>{title}</h2><p>{description}</p></div>; }
export function BrainView() {
  const { id, snapshot } = useWorkspace(), router = useRouter(), query = useSearchParams(); const revision = query.get('revision'); const [cursor, setCursor] = useState('');
  const result = useResource<Brain>(`/projects/${id}/brain${revision ? `?revision=${encodeURIComponent(revision)}` : ''}`), list = useResource<Revisions>(`/projects/${id}/brain/revisions${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`);
  const record = result.data?.revision, content = record?.content;
  return <div className="workspace-document brain-document"><DocumentHeading title={vi.brain.title} description={vi.brain.lede} /><div className="brain-revision-controls"><label htmlFor="brain-revision">{vi.brain.inspect}</label><select id="brain-revision" value={record?.revision ?? ''} onChange={e => router.push(`/projects/${id}/brain?revision=${e.target.value}`)}><option value="" disabled>{vi.brain.choose}</option>{record && !list.data?.items.some(item => item.id === record.id) && <option value={record.revision}>{vi.brain.revision(record.revision)} · {vi.brain.selected}</option>}{list.data?.items.map(r => <option key={r.id} value={r.revision}>{vi.brain.revision(r.revision)}{r.id === snapshot.project.current_brain_revision_id ? ` · ${vi.brain.currentTag}` : ''}</option>)}</select><Link href={`/projects/${id}/brain`}>{vi.brain.current}</Link>{cursor && <button onClick={() => setCursor('')}>{vi.brain.newer}</button>}{list.data?.next_cursor && <button onClick={() => setCursor(list.data!.next_cursor!)}>{vi.brain.older}</button>}</div><ResourceState {...list} /><ResourceState {...result} />
    {record && content && <><div className="revision-metadata"><span className="mode-label">{vi.brain.immutable(record.revision)}</span><span className="meta">{vi.brain.meta(record.schema_version, record.id === snapshot.project.current_brain_revision_id)}</span><p>{vi.brain.saved(time(record.created_at), record.source_request_id)}</p>{record.source_run_id && <p>{vi.brain.sourceRun}: {record.source_run_id}</p>}<p>{vi.brain.revisionId}: {record.id}</p></div>
      <section className="brain-section"><h3>{vi.brain.summary}</h3><StatementView value={content.product.summary} /></section>
      <section className="brain-section"><h3>{vi.brain.requirements}</h3>{content.product.requirements.map(r => <article key={r.requirement_id}><div className="entry-meta">{vi.brain.priority(r.requirement_id, r.priority, Boolean(r.assumption))}</div><StatementView value={r} /><h4>{vi.brain.acceptance}</h4>{r.acceptance_criteria.map((a, n) => <StatementView key={n} value={a} />)}</article>)}</section>
      <section className="brain-section"><h3>{vi.brain.plan}</h3>{content.plan.map(s => <article key={s.step_id}><div className="entry-meta">{s.step_id} / {s.phase} / {s.status}</div><StatementView value={s} /><p className="context-reference">{vi.brain.planRefs(s.requirement_ids.join(', '), s.dependencies.join(', '))}</p></article>)}</section>
      <section className="brain-section"><h3>{vi.brain.architecture} · {content.architecture.evidence}</h3><StatementView value={content.architecture.overview} />{content.architecture.component_relationships.map((s, n) => <StatementView key={n} value={s} />)}<h4>{vi.brain.rationale}</h4><StatementView value={content.architecture.rationale} /></section>
      <section className="brain-section"><h3>{vi.brain.stack}</h3><p>{vi.brain.stackNote}</p>{(['frontend', 'backend', 'database', 'rationale'] as const).map(k => <article key={k}><h4>{vi.brain.stackKeys[k]}</h4><StatementView value={content.stack[k]} /></article>)}</section>
      <section className="brain-section"><h3>{vi.brain.database}</h3>{content.database.entities.length === 0 && <p>{vi.brain.noEntities}</p>}{content.database.entities.map(entity => <article key={entity.entity_id}><span className="entry-meta">{entity.entity_id}</span><StatementView value={entity} /><h4>{vi.brain.fields}</h4>{entity.fields.map((s,n) => <StatementView key={n} value={s} />)}<h4>{vi.brain.relationships}</h4>{entity.relationships.map((s,n) => <StatementView key={n} value={s} />)}</article>)}{content.database.unresolved.map((s,n) => <StatementView key={n} value={s} />)}</section>
      <section className="brain-section"><h3>{vi.brain.features}</h3>{content.features.map(f => <article key={f.feature_id}><div className="entry-meta">{f.feature_id} / {f.state}</div><StatementView value={f} /><p className="context-reference">{vi.brain.featureRefs(f.requirement_ids.join(', '))}</p></article>)}</section>
      <section className="brain-section"><h3>{vi.brain.decisions}</h3>{content.design_decisions.map(d => <article key={d.decision_id}><span className="entry-meta">{d.decision_id}</span><h4>{d.choice}</h4><p>{d.reason}</p><ProvenanceLabel value={d.provenance} />{d.supersedes_decision_id && <p>{vi.brain.supersedes(d.supersedes_decision_id)}</p>}</article>)}</section>
      <section className="brain-section"><h3>{vi.brain.constraints}</h3>{content.constraints.map((s,n) => <StatementView key={`c${n}`} value={s} />)}{content.open_questions.map((s,n) => <StatementView key={`q${n}`} value={s} />)}</section>
      <section className="brain-section"><h3>{vi.brain.historyRefs}</h3><p>{vi.brain.historyNote}</p>{Object.entries(content.history).map(([k,v]) => <p key={k} className="context-reference">{k.replaceAll('_',' ')}: {v.join(', ') || vi.common.none}</p>)}</section>
      <section className="brain-section"><h3>{vi.brain.canonical}</h3><p>{vi.brain.counts(result.data!.context.requests.length, result.data!.context.issue_events.length, result.data!.context.versions.length, result.data!.context.deployments.length)}</p>{result.data!.context.requests.map(r => <RequestCard key={r.id} record={r} />)}{result.data!.context.issue_events.map(e => <p key={e.id}>{vi.brain.issue(e.sequence, e.message)}</p>)}{result.data!.context.versions.map(v => <p key={v.id}>{vi.brain.version(v.number, v.summary)}</p>)}{result.data!.context.deployments.map(d => <p key={d.id}>{vi.brain.deployment(d.status)}</p>)}</section>
    </>}
  </div>;
}
export function ActivityView() {
  const { id } = useWorkspace(); const [after, setAfter] = useState('0'); const result = useResource<Events>(`/projects/${id}/events?after_sequence=${after}`);
  return <div className="workspace-document"><DocumentHeading title={vi.activity.title} description={vi.activity.lede} /><ResourceState {...result} />{result.data?.items.length === 0 && <p>{vi.activity.empty}</p>}<ol className="activity-list">{result.data?.items.map(e => <li key={e.id}><div className="activity-time"><time dateTime={e.occurred_at}>{time(e.occurred_at)}</time><span>#{e.sequence}</span></div><div><span className="meta">{e.mode === 'simulated' ? vi.activity.modeDemo : e.mode === 'real' ? vi.activity.modeReal : vi.activity.modeUser} / {e.severity}{e.phase ? ` / ${e.phase}` : ''}</span><p>{e.message}</p><details><summary>{vi.activity.references}</summary><dl><dt>{vi.activity.type}</dt><dd>{e.type}</dd><dt>{vi.activity.actor}</dt><dd>{e.payload.actor_user_id ?? vi.activity.actorSystem}</dd><dt>{vi.activity.request}</dt><dd>{e.request_id ?? vi.common.none}</dd><dt>{vi.activity.run}</dt><dd>{e.run_id ?? vi.common.none}</dd><dt>{vi.activity.utc}</dt><dd>{e.occurred_at}</dd></dl></details></div></li>)}</ol><div className="record-pagination">{after !== '0' && <button onClick={() => setAfter('0')}>{vi.activity.first}</button>}{result.data?.next_cursor && <button className="button button-secondary" onClick={() => setAfter(result.data!.next_cursor!)}>{vi.activity.next}</button>}</div></div>;
}
/** Lịch sử tab: finished versions plus the requests that led to them. */
export function VersionsView() {
  const { id, snapshot } = useWorkspace(); const [cursor, setCursor] = useState(''); const result = useResource<Versions>(`/projects/${id}/versions${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`);
  return <div className="workspace-document"><div className="document-heading"><h2>{vi.history.title}</h2><p>{vi.history.lede}</p></div>
    <section aria-labelledby="versions-title"><div className="section-heading"><h2 id="versions-title">{vi.history.versions}</h2></div><ResourceState {...result} />{result.data?.items.length === 0 && <div className="workspace-empty-surface"><h3>{vi.history.noVersions}</h3><p>{vi.history.noVersionsBody}</p></div>}
    {result.data?.items.map(v => <article className="version-record" key={v.id}><span className="meta">{v.mode === 'real' ? vi.history.real : vi.history.demo} / {vi.history.versionN(v.number)} · {v.id === snapshot.project.current_version_id ? vi.history.current : vi.history.old}</span><h3>{v.summary}</h3><time dateTime={v.created_at}>{time(v.created_at)}</time><dl><dt>{vi.history.runLabel}</dt><dd>{v.run_id}</dd><dt>{vi.history.brainLabel}</dt><dd>{v.brain_revision_id}</dd><dt>{vi.history.idLabel}</dt><dd>{v.id}</dd></dl><Link className="text-action" href={`/projects/${id}?version=${v.id}`}>{vi.history.view}</Link><Link className="text-action" href={`/projects/${id}?panel=run&run=${v.run_id}`}>{vi.history.viewRun}</Link></article>)}
    <div className="record-pagination">{cursor && <button onClick={() => setCursor('')}>{vi.history.newer}</button>}{result.data?.next_cursor && <button className="button button-secondary" onClick={() => setCursor(result.data!.next_cursor!)}>{vi.history.older}</button>}</div></section>
    <RequestHistory /></div>;
}
export function SettingsView() {
  const { snapshot, refresh, flow } = useWorkspace();
  return <div className="workspace-document"><div className="document-heading"><h2>{vi.settings.pageTitle}</h2><p>{vi.settings.pageLede}</p></div><ProjectSettings project={snapshot.project} onSaved={() => void refresh()} /><section className="brain-section"><h3>{vi.settings.modeTitle}</h3><p>{flow.real ? vi.settings.modeReal : vi.settings.modeDemo}</p></section></div>;
}
