'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { createContext, useContext, useEffect, useState, useCallback, useRef, useId, useLayoutEffect, type ReactNode } from 'react';
import { ProjectPulse } from '@/features/project-pulse/project-pulse';
import { containDialogFocus } from '@/components/ui/dialog-focus';
import { projectRequest } from '@/lib/projects/browser';
import { stateNames } from '@/lib/projects/contracts';
import { uuid, type Snapshot } from '@/lib/workspace/contracts';
import type { BuildEvent } from '@/lib/workspace/trace';
import { useBuildFeed, type Transport } from './feed';
import { useRunCommands } from './run-commands';
import { BuildTrace, RunDetails } from './trace';
import { SourceInspector } from './real-build';
import { useProjectFlow, type ProjectFlow } from './flow';
import { NextStepBar } from './next-step';
import { vi, viDateTime } from '@/lib/copy/vi';
type Context = { historyReady: boolean; events: BuildEvent[]; transport: Transport; inspectedRunId: string | null; setInspectedRunId: (id: string | null) => void; runCommands: ReturnType<typeof useRunCommands>; id: string; snapshot: Snapshot; refresh: () => Promise<Snapshot | null>; generation: number; openPanel: (name: 'trace' | 'run' | 'files') => void; viewport: 'desktop' | 'tablet' | 'phone'; setViewport: (value: 'desktop' | 'tablet' | 'phone') => void; setInspectedVersion: (value: number | null) => void; flow: ProjectFlow };
const WorkspaceContext = createContext<Context | null>(null);
export function useWorkspace() { const value = useContext(WorkspaceContext); if (!value) throw new Error('Workspace context missing'); return value; }
export function useResource<T>(path: string | null) {
  const { generation } = useWorkspace();
  const [state, setState] = useState<{ path: string | null; data: T | null; error: string; pending: boolean }>({ path, data: null, error: '', pending: Boolean(path) });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { if (!path) { setState({ path, data: null, error: '', pending: false }); return; } const controller = new AbortController();
    setState(previous => ({ path, data: previous.path === path ? previous.data : null, error: '', pending: true }));
    projectRequest<T>(path, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setState({ path, data, error: '', pending: false }); }).catch(e => { if (!controller.signal.aborted) setState(previous => ({ ...previous, error: e.message, pending: false })); });
    return () => controller.abort();
  }, [path, generation, attempt]);
  const selected = state.path === path ? state : { data: null, error: '', pending: Boolean(path) };
  return { ...selected, retry: () => setAttempt(n => n + 1) };
}
export function ResourceState({ pending, error, retry }: { pending: boolean; error: string; retry: () => void }) { return <>{pending && <p role="status">{vi.common.loadingRecords}</p>}{error && <div className="workspace-notice"><p role="alert">{error}</p><button className="button button-secondary" onClick={retry}>{vi.common.retryRecords}</button></div>}</>; }
const tabs = [['', vi.workspace.tabs.app], ['/versions', vi.workspace.tabs.history], ['/settings', vi.workspace.tabs.settings]] as const;
const technical = [['/brief', vi.workspace.technicalLinks.brief], ['/brain', vi.workspace.technicalLinks.brain], ['/planning', vi.workspace.technicalLinks.planning], ['/activity', vi.workspace.technicalLinks.activity]] as const;
const utilities = ['trace', 'run', 'files'] as const;
type Panel = typeof utilities[number] | null;
export function Workspace({ id, children }: { id: string; children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null), [error, setError] = useState(''), [pending, setPending] = useState(true), [generation, setGeneration] = useState(0);
  const [panel, setPanel] = useState<Panel>(null), [desktop, setDesktop] = useState(false);
  const [inspectedRunId, setInspectedRunId] = useState<string | null>(null);
  const snapshotRef = useRef<Snapshot | null>(null);
  const [inspectedVersion, setInspectedVersion] = useState<number | null>(null);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'phone'>('phone');
  const pathname = usePathname(), query = useSearchParams();
  const refresh = useCallback(async (quiet = false, resources = true) => {
    if (!quiet) setPending(true);
    try {
      const data = await projectRequest<Snapshot>(`/projects/${id}/workspace`);
      if (!snapshotRef.current || data.last_sequence >= snapshotRef.current.last_sequence) { snapshotRef.current = data; setSnapshot(data); }
      setError(''); if (resources) setGeneration(n => n + 1); return snapshotRef.current;
    } catch (e) { setError(e instanceof Error ? e.message : vi.workspace.unavailable); return null; }
    finally { if (!quiet) setPending(false); }
  }, [id]);
  const onEvents = useCallback((batch: BuildEvent[]) => {
    const relevant = batch.some(event => ['execution.context_resolution','execution.generated','execution.materialization','execution.install','execution.typecheck','execution.build','execution.test','execution.verification','execution.preview_ready','execution.publication','execution.failed','execution.canceled','execution.queued','execution.template_applied','run.phase_changed','run.queued','run.succeeded','run.failed','run.canceled','request.recorded','project.renamed','project.archived','project.unarchived'].includes(event.type));
    const resources = batch.some(event => ['run.queued','run.succeeded','run.failed','run.canceled','execution.preview_ready','execution.failed','request.recorded','project.renamed','project.archived','project.unarchived'].includes(event.type));
    if (relevant) void refresh(true,resources);
  }, [refresh]);
  const feed = useBuildFeed(id,snapshot,onEvents);
  const runCommands = useRunCommands(id,refresh);
  const flow = useProjectFlow(id, snapshot, refresh, generation);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { const media = matchMedia('(min-width: 1280px)'); const update = () => setDesktop(media.matches); update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  const requestedPanel = query.get('panel');
  useEffect(() => { if (utilities.includes(requestedPanel as typeof utilities[number])) setPanel(requestedPanel as Panel); }, [requestedPanel]);
  const requestedRun = query.get('run');
  useEffect(() => { setInspectedRunId(requestedRun && uuid.test(requestedRun) ? requestedRun : null); }, [requestedRun]);
  if (!snapshot) return <div className="page workspace-loading"><Link href="/projects" className="back-link">{vi.workspace.back}</Link>{pending ? <><h1>{vi.workspace.opening}</h1><div className="workspace-skeleton" aria-hidden="true" /><p role="status">{vi.workspace.openingStatus}</p></> : <><h1>{vi.workspace.unavailable}</h1><p role="alert">{error}</p><button className="button button-secondary" onClick={() => void refresh()}>{vi.workspace.retry}</button></>}</div>;
  const project = snapshot.project;
  const real = (snapshot.active_run ?? snapshot.latest_run)?.mode === 'real' || snapshot.current_version?.mode === 'real' || flow.real === true;
  const technicalOpen = technical.some(([suffix]) => pathname === `/projects/${id}${suffix}`);
  const inspector = <div className="workspace-inspector-content">
    <div className="inspector-switches" role="group" aria-label={vi.workspace.inspectorViews}>{utilities.map(name => <button key={name} aria-pressed={panel === name} onClick={() => setPanel(name)}>{vi.workspace.panels[name]}</button>)}</div>
    <div className="inspector-body">
      <div hidden={panel !== 'trace'}><BuildTrace /></div>
      <div hidden={panel !== 'run'}><RunDetails /></div>
      {panel === 'files' && <SourceInspector/>}
    </div>
  </div>;
  return <WorkspaceContext.Provider value={{ historyReady: feed.historyReady, events: feed.events, transport: feed.transport, inspectedRunId, setInspectedRunId, runCommands, id, snapshot, refresh, generation, openPanel: (name: 'trace' | 'run' | 'files') => setPanel(name), viewport, setViewport, setInspectedVersion, flow }}><div className="workspace-page">
    <header className="project-header"><div className="project-heading"><Link className="meta" href="/projects">{vi.workspace.breadcrumb}</Link><h1>{project.title}</h1></div><div className="project-state"><span role="status" aria-live="polite" aria-atomic="true"><ProjectPulse state={project.lifecycle} label={stateNames[project.lifecycle]} /></span><span className="mode-label">{real ? vi.workspace.modeReal : vi.workspace.modeDemo}</span>{(inspectedVersion ?? snapshot.current_version?.number) && <span className="meta">{inspectedVersion && inspectedVersion !== snapshot.current_version?.number ? `${vi.workspace.historical} · ` : ''}{vi.workspace.version(inspectedVersion ?? snapshot.current_version!.number, snapshot.current_version?.mode === 'real')}</span>}{project.archived_at && <span className="meta">{vi.workspace.archived}</span>}<button className="button button-quiet" onClick={() => void refresh()} disabled={pending}>{pending ? vi.common.refreshing : vi.common.refresh}</button></div></header>
    <NextStepBar />
    <div className="workspace-navigation vn-tabs"><nav aria-label={vi.workspace.navLabel} className="workspace-tabs">{tabs.map(([suffix, label]) => <Link key={label} href={`/projects/${id}${suffix}`} aria-current={pathname === `/projects/${id}${suffix}` ? 'page' : undefined}>{label}</Link>)}</nav>
      <details className="tech-details" open={technicalOpen || undefined}><summary>{vi.workspace.technical}</summary><div className="tech-links">{technical.map(([suffix, label]) => <Link key={label} href={`/projects/${id}${suffix}`} aria-current={pathname === `/projects/${id}${suffix}` ? 'page' : undefined}>{label}</Link>)}{utilities.map(name => <button key={name} type="button" aria-pressed={panel === name} onClick={() => setPanel(panel === name ? null : name)}>{vi.workspace.panels[name]}</button>)}</div></details></div>
    {feed.transport !== 'live' && <div className="workspace-connection" role="status"><span>{feed.transport === 'offline' ? vi.workspace.transport.offline : feed.transport === 'polling' ? vi.workspace.transport.polling : feed.transport === 'connecting' ? vi.workspace.transport.connecting : feed.transport === 'session expired' ? vi.workspace.transport.expired : vi.workspace.transport.denied}</span>{['polling','offline'].includes(feed.transport) && <button className="button button-quiet" onClick={feed.retry}>{vi.workspace.transport.retry}</button>}{feed.transport === 'session expired' && <Link href="/sign-in" className="text-action">{vi.workspace.transport.review}</Link>}</div>}
    {error && <p role="alert" className="form-error workspace-refresh-error">{vi.workspace.refreshError(error)}</p>}
    {runCommands.recovery && <div className="workspace-notice run-command-status" aria-label={vi.workspace.commandLabel}><p>{vi.workspace.commandAwaiting}</p><button className="button button-secondary" disabled={runCommands.pending} onClick={() => void runCommands.resume()}>{runCommands.pending ? vi.workspace.commandResuming : vi.workspace.commandResume}</button></div>}
    <div className={`workspace-body ${desktop && panel ? 'with-inspector' : ''}`}><div className="workspace-canvas">{children}</div><WorkspacePanel open={panel !== null} desktop={desktop} onClose={() => setPanel(null)} title={vi.workspace.inspector}>{inspector}</WorkspacePanel></div>
  </div></WorkspaceContext.Provider>;
}
export function time(value: string) { return viDateTime(value); }

function WorkspacePanel({ open, desktop, onClose, title, children }: { open: boolean; desktop: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null), returnFocus = useRef<HTMLElement | null>(null), previousDesktop = useRef(desktop); const titleId = useId();
  useLayoutEffect(() => { const dialog = ref.current; if (!dialog) return;
    if (dialog.open && previousDesktop.current !== desktop) dialog.close();
    previousDesktop.current = desktop;
    if (open && !dialog.open) { if (!returnFocus.current) returnFocus.current = document.activeElement as HTMLElement; if (desktop) dialog.show(); else dialog.showModal(); }
    if (!open && dialog.open) { dialog.close(); returnFocus.current?.focus(); returnFocus.current = null; }
  }, [open, desktop]);
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open || !desktop) return;
    const size = () => dialog.style.setProperty('--inspector-available-height', `${Math.max(300, innerHeight - Math.max(16, dialog.getBoundingClientRect().top) - 16)}px`);
    size(); window.addEventListener('resize', size); window.addEventListener('scroll', size, { passive: true });
    return () => { window.removeEventListener('resize', size); window.removeEventListener('scroll', size); };
  }, [open, desktop, children]);
  useEffect(() => () => { ref.current?.close(); }, []);
  return <dialog ref={ref} tabIndex={-1} className={desktop ? 'workspace-inspector desktop-panel' : 'sheet workspace-panel'} aria-labelledby={titleId} onCancel={e => { e.preventDefault(); onClose(); }} onKeyDown={e => { containDialogFocus(e); if (e.key === 'Escape') { e.preventDefault(); onClose(); } }} onClick={e => { if (!desktop && e.target === ref.current) onClose(); }}><div className="inspector-heading"><h2 id={titleId}>{title}</h2><button className="icon-button" aria-label={vi.workspace.closeInspector} onClick={onClose}>×</button></div>{children}</dialog>;
}
