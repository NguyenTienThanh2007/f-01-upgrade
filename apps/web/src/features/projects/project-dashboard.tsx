'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ProjectPulse } from '@/features/project-pulse/project-pulse';
import { projectRequest } from '@/lib/projects/browser';
import { stateNames, states, type ProjectList, type Project } from '@/lib/projects/contracts';
import { vi, viDateTime } from '@/lib/copy/vi';
import { ProjectSettings } from './project-settings';

export function ProjectDashboard({ q, status, archived, cursor }: { q: string; status: string; archived: boolean; cursor: string }) {
  const [data, setData] = useState<ProjectList | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [refresh, setRefresh] = useState(0), [selected, setSelected] = useState<string | null>(null);
  const params = new URLSearchParams({ q, status, archived: String(archived) }); if (cursor) params.set('cursor', cursor);
  const query = params.toString();
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    projectRequest<ProjectList>(`/projects?${query}`, { signal: controller.signal }).then(result => { if (!controller.signal.aborted) setData(result); }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, refresh]);
  function saved(project: Project) { setData(old => old ? { ...old, items: old.items.filter(item => item.id !== project.id || Boolean(project.archived_at) === archived).map(item => item.id === project.id ? project : item) } : old); setRefresh(n => n + 1); }
  function nextURL(cursor: string) { const next = new URLSearchParams(params); next.set('cursor', cursor); return `/projects?${next}`; }
  const filtered = Boolean(q || status || archived || cursor);
  const empty = !loading && !error && data?.items.length === 0;
  // Filters only help once there is something to filter; a first-time visitor sees one sentence and one button.
  const showFilters = filtered || Boolean(data?.items.length);
  return <div className="page dashboard persisted-dashboard">
    <div className="page-eyebrow"><span>{vi.dashboard.eyebrow}</span></div>
    <div className="page-heading"><div><h1>{vi.dashboard.title}</h1><p className="muted">{vi.dashboard.lede}</p></div>{!empty && <Link href="/projects/new" className="button button-primary">{vi.dashboard.newProject} <span aria-hidden="true">↗</span></Link>}</div>
    {showFilters && <form className="workspace-toolbar project-filters" action="/projects" method="get">
      <div className="workspace-search"><label className="sr-only" htmlFor="project-search">{vi.dashboard.searchLabel}</label><input id="project-search" name="q" type="search" defaultValue={q} placeholder={vi.dashboard.searchPlaceholder} maxLength={100} /></div>
      <label className="sr-only" htmlFor="project-filter">{vi.dashboard.stateLabel}</label><select id="project-filter" name="status" defaultValue={status}><option value="">{vi.dashboard.allStates}</option>{states.map(state => <option key={state} value={state}>{stateNames[state]}</option>)}</select>
      <label className="sr-only" htmlFor="archive-filter">{vi.dashboard.archiveLabel}</label><select id="archive-filter" name="archived" defaultValue={String(archived)}><option value="false">{vi.dashboard.active}</option><option value="true">{vi.dashboard.archived}</option></select><button className="button button-secondary">{vi.dashboard.apply}</button>
    </form>}
    <div className="project-list-state" role="status">{loading ? vi.dashboard.loading : error ? vi.dashboard.unavailable : data?.items.length ? vi.dashboard.count(data.items.length, archived) : ''}</div>
    {error && <div className="project-connection-error"><p className="form-error" role="alert">{error}</p><Link className="button button-secondary" href="/account">{vi.dashboard.reviewAccess}</Link><button className="button button-secondary" disabled={loading} onClick={() => setRefresh(n => n + 1)}>{vi.dashboard.retry}</button></div>}
    {loading && !data && <div className="project-skeletons" aria-hidden="true">{[0, 1, 2].map(n => <div key={n}><span /><i /></div>)}</div>}
    {Boolean(data?.items.length) && <section className="project-register" aria-label={vi.dashboard.listLabel} aria-busy={loading}>{data!.items.map((project, index) => <article className={`saved-project ${selected === project.id ? 'selected-project' : ''}`} key={project.id}>
      <div className="saved-project-row"><span className="project-index meta">{String(index + 1).padStart(2, '0')}</span><div className="project-identity"><Link href={`/projects/${project.id}`} className="saved-project-title">{project.title}<span aria-hidden="true">↗</span></Link><span className="meta">{project.archived_at ? vi.dashboard.archivedTag : ''}{vi.dashboard.projectTag} {project.id.slice(0, 8).toUpperCase()}</span></div><ProjectPulse state={project.lifecycle} label={stateNames[project.lifecycle]} /><div className="project-time"><span>{vi.dashboard.lastActivity}</span><time dateTime={project.last_activity_at}>{viDateTime(project.last_activity_at)}</time></div><button className="button button-quiet" aria-expanded={selected === project.id} aria-controls={`settings-${project.id}`} onClick={() => setSelected(selected === project.id ? null : project.id)}>{selected === project.id ? vi.dashboard.closeSettings : vi.dashboard.settings}</button></div>
      {selected === project.id && <div id={`settings-${project.id}`}><ProjectSettings project={project} onSaved={saved} /></div>}
    </article>)}</section>}
    {empty && <section className="vn-empty" aria-labelledby="empty-title"><h2 id="empty-title">{filtered ? vi.dashboard.filteredTitle : vi.dashboard.emptyTitle}</h2><p>{filtered ? vi.dashboard.filteredLine : vi.dashboard.emptyLine}</p>{filtered ? <Link href="/projects" className="button button-secondary">{vi.dashboard.filteredAction}</Link> : <Link href="/projects/new" className="button button-primary">{vi.dashboard.emptyAction} <span aria-hidden="true">↗</span></Link>}</section>}
    {data?.next_cursor && <div className="project-pagination"><Link className="button button-secondary" href={nextURL(data.next_cursor)}>{vi.dashboard.next}</Link><Link href="/projects">{vi.dashboard.reset}</Link></div>}
  </div>;
}
