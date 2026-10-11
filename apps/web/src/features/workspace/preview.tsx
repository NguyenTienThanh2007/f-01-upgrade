'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { ProjectPulse } from '@/features/project-pulse/project-pulse';
import { fixturePath, type Descriptor } from '@/lib/workspace/contracts';
import { vi } from '@/lib/copy/vi';

type Viewport = 'desktop' | 'tablet' | 'phone';

/** Phone (or desktop) bezel around preview content; never an empty white page. */
export function DeviceFrame({ viewport, children, label }: { viewport: Viewport; children: ReactNode; label: string }) {
  return <div className={`device-frame device-${viewport === 'phone' ? 'phone' : 'desktop'}`} role="group" aria-label={label}><div className="device-screen">{children}</div></div>;
}

export function PreviewFrame({ descriptor, viewport }: { descriptor: Descriptor; viewport: Viewport }) {
  const [key, setKey] = useState(0), [loadedFrame, setLoadedFrame] = useState(''), [elapsed, setElapsed] = useState<'fresh' | 'slow' | 'failed'>('fresh');
  const path = descriptor.kind === 'fixture' ? fixturePath(descriptor) : isolatedPreviewPath(descriptor.url, descriptor.expires_at);
  const frameKey = `${path}-${key}`;
  const loaded = loadedFrame === frameKey;
  // Cross-origin frames do not report load errors, so a missing load event is treated as failure.
  useEffect(() => { setElapsed('fresh'); if (!path) return; const slow = setTimeout(() => setElapsed('slow'), 8000), failed = setTimeout(() => setElapsed('failed'), 25000); return () => { clearTimeout(slow); clearTimeout(failed); }; }, [frameKey, path]);
  const title = descriptor.kind === 'fixture' ? vi.preview.fixtureTitle(descriptor.fixture_id === 'crm-v1') : vi.preview.realTitle;
  return <div className="preview-stage">
    <div className="preview-frame-status"><span className="meta">{descriptor.kind === 'fixture' ? vi.preview.titleDemo : vi.preview.titleReal}</span>{path && <button className="button button-quiet" onClick={() => setKey(n => n + 1)}>{vi.preview.reload}</button>}</div>
    <DeviceFrame viewport={viewport} label={vi.preview.frameLabel}>
      {!path ? <div className="device-state" role="alert"><ProjectPulse state="error" label={vi.preview.expired} /></div> : <>
        {!loaded && <div className={`device-state ${elapsed === 'failed' ? 'device-error' : ''}`} role={elapsed === 'failed' ? 'alert' : 'status'}>
          {elapsed === 'failed' ? <><ProjectPulse state="error" label={vi.preview.failed} /><button className="button button-secondary" onClick={() => setKey(n => n + 1)}>{vi.preview.reload}</button></> : <><ProjectPulse state="building" label={elapsed === 'slow' ? vi.preview.slow : vi.preview.loading} animate /><span className="device-skeleton" aria-hidden="true"><i /><i /><i /></span></>}
        </div>}
        <iframe key={frameKey} src={path} title={title} className={loaded ? 'is-loaded' : ''} sandbox="allow-scripts" referrerPolicy="no-referrer" onLoad={() => setLoadedFrame(frameKey)} />
      </>}
    </DeviceFrame>
  </div>;
}
export function isolatedPreviewPath(value: string, expires: string): string | null {
  try { const url = new URL(value); if(Date.parse(expires)<=Date.now()||!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||!/^\/p\/[a-f0-9-]{36}\/[A-Za-z0-9_-]{43}\/$/.test(url.pathname)) return null; if(typeof window !== 'undefined' && url.hostname === window.location.hostname)return null;return url.href; } catch { return null; }
}
export function ViewportControl({ value, onChange }: { value: Viewport; onChange: (v: Viewport) => void }) {
  return <div className="viewport-controls" role="group" aria-label={vi.preview.viewport}>{(['phone', 'desktop'] as const).map(v => <button key={v} aria-pressed={value === v} onClick={() => onChange(v)}>{v === 'phone' ? vi.preview.phone : vi.preview.desktop}</button>)}</div>;
}
export function FixtureShowcase() { const [fixture, setFixture] = useState<'crm-v1' | 'generic-v1'>('crm-v1'), [viewport, setViewport] = useState<Viewport>('phone'); return <div className="page fixture-showcase"><span className="meta">DEVELOPMENT / SYNTHETIC DATA</span><h1>{vi.preview.titleDemo}</h1><p>{vi.preview.noteDemo}</p><div className="preview-toolbar"><label htmlFor="fixture-select">{vi.preview.titleDemo}</label><select id="fixture-select" value={fixture} onChange={e => setFixture(e.target.value as typeof fixture)}><option value="crm-v1">CRM</option><option value="generic-v1">Generic</option></select><ViewportControl value={viewport} onChange={setViewport} /></div><PreviewFrame descriptor={{ kind: 'fixture', fixture_id: fixture }} viewport={viewport} /></div>; }
