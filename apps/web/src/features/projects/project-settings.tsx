'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { projectRequest, ProjectAPIError } from '@/lib/projects/browser';
import { projectETag, type Project, type UpdateInput } from '@/lib/projects/contracts';
import { vi } from '@/lib/copy/vi';

export function ProjectSettings({ project, onSaved }: { project: Project; onSaved: (project: Project) => void }) {
  const [title, setTitle] = useState(project.title);
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [latest, setLatest] = useState(project), [conflict, setConflict] = useState(false);
  const busy = useRef(false);
  const displayed = project.metadata_version > latest.metadata_version ? project : latest;
  const active = ['understanding','planning','building','verifying','deploying'].includes(project.lifecycle);
  useEffect(() => { if (project.metadata_version > latest.metadata_version) { setConflict(true); setError(vi.settings.conflict); } }, [project.metadata_version,latest.metadata_version]);
  async function save(update: UpdateInput) {
    if (busy.current || conflict || ('archived' in update && active)) return;
    if ('title' in update && (!title.trim() || Array.from(title.trim()).length > 100)) { setError(vi.settings.invalidTitle); return; }
    busy.current = true; setPending(true); setError(''); setNotice('');
    try {
      const saved = await projectRequest<Project>(`/projects/${project.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'If-Match': projectETag(latest) }, body: JSON.stringify(update) });
      setLatest(saved); setConflict(false); setTitle(saved.title); setNotice(vi.settings.saved); onSaved(saved);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : vi.settings.saveFailed);
      if (reason instanceof ProjectAPIError && reason.status === 412) setConflict(true);
    } finally { busy.current = false; setPending(false); }
  }
  async function review() {
    if (busy.current) return;
    busy.current = true; setPending(true); setError('');
    try { const saved = await projectRequest<Project>(`/projects/${project.id}`); setLatest(saved); setConflict(false); setNotice(vi.settings.reviewed(saved.title, Boolean(saved.archived_at))); }
    catch (reason) { setError(reason instanceof Error ? reason.message : vi.settings.refreshFailed); }
    finally { busy.current = false; setPending(false); }
  }
  return <section className="project-settings" aria-label={vi.settings.label(project.title)} aria-busy={pending}>
    <form onSubmit={event => { event.preventDefault(); void save({ title: title.trim() }); }}>
      <label htmlFor={`title-${project.id}`}>{vi.settings.title}</label><div className="rename-line"><input id={`title-${project.id}`} value={title} onChange={event => setTitle(event.target.value)} readOnly={pending} aria-invalid={Boolean(error && (!title.trim() || Array.from(title.trim()).length > 100))} /><button className="button button-secondary" disabled={pending || conflict}>{pending ? vi.common.saving : vi.settings.saveTitle}</button></div>
    </form>
    {conflict && <div className="metadata-review"><p>{vi.settings.current}: <strong>{displayed.title}</strong> · {displayed.archived_at ? vi.settings.archived : vi.settings.active}</p><button className="button button-secondary" disabled={pending} onClick={() => void review()}>{vi.settings.review}</button></div>}
    <div className="archive-line"><div><p>{displayed.archived_at ? vi.settings.unarchiveHint : vi.settings.archiveHint}</p>{active && <p id={`archive-reason-${project.id}`}>{vi.settings.busy} <Link className="text-action" href={`/projects/${project.id}?panel=run`}>{vi.settings.busyLink}</Link></p>}</div><button className="button button-secondary" disabled={pending || conflict || active} aria-describedby={active ? `archive-reason-${project.id}` : undefined} onClick={() => void save({ archived: !latest.archived_at })}>{displayed.archived_at ? vi.settings.unarchive : vi.settings.archive}</button></div>
    {error && <p className="form-error" role="alert">{error}</p>}{notice && <p role="status" className="settings-notice">{notice}</p>}
  </section>;
}
