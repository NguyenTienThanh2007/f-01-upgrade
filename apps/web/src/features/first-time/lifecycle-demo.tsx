'use client';

import { useEffect, useState } from 'react';
import { ProjectPulse, type Lifecycle } from '@/features/project-pulse/project-pulse';
import type { StarterId } from '@/features/project-planning/project-starters';
import { SampleInterface } from './sample-interface';
import { vi } from '@/lib/copy/vi';

const pulses: Lifecycle[] = ['understanding', 'planning', 'building', 'verifying', 'live'];
const stages = vi.demo.stages.map((stage, index) => ({ ...stage, pulse: pulses[index]! }));
const scopes: Record<StarterId, { name: string; outcome: string; features: readonly string[] }> = vi.demo.scopes;

export function LifecycleDemo({ starter = 'tea' }: { starter?: StarterId }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState<'preview' | 'blueprint'>('preview');
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!preference.matches) setPlaying(true);
    const changed = () => { if (preference.matches) setPlaying(false); };
    preference.addEventListener('change', changed);
    return () => preference.removeEventListener('change', changed);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (step >= stages.length - 1) setPlaying(false);
      else setStep(value => value + 1);
    }, 1900);
    return () => window.clearTimeout(timer);
  }, [playing, step]);
  const current = stages[step]!;
  const scope = scopes[starter];
  return <section className="lifecycle-demo os-demo" aria-label={vi.demo.label}>
    <header className="demo-topline"><span className="meta">{vi.demo.topline}</span><span className="demo-disclosure">{vi.demo.disclosure}</span></header>
    <div className="demo-workspace-heading"><div className="pulse-instrument"><span className="meta">{vi.demo.pulseMeta(step + 1)}</span><ProjectPulse state={current.pulse} label={current.label} animate={playing} variant="instrument" /></div><div className="sample-identity"><strong>{scope.name}</strong><span className="meta">{vi.demo.stepMeta(step + 1)}</span></div></div>
    <div className="workspace-view-controls"><div className="sample-view-switch" aria-label={vi.demo.views}><button type="button" aria-pressed={view === 'preview'} onClick={() => setView('preview')}>{vi.demo.preview}</button><button type="button" aria-pressed={view === 'blueprint'} onClick={() => setView('blueprint')}>{vi.demo.blueprint}</button></div><button type="button" className="sample-size-control" aria-pressed={compact} onClick={() => setCompact(value => !value)}>{compact ? vi.demo.full : vi.demo.compact}<span aria-hidden="true">{compact ? '↔' : '↦'}</span></button></div>
    <div className={`sample-frame ${compact ? 'sample-compact' : ''}`}><div className="sample-frame-bar"><span className="sample-window-marks" aria-hidden="true"><i /><i /><i /></span><span className="meta">{vi.demo.frameMeta(view === 'preview')}</span></div>{view === 'preview' ? <SampleInterface starter={starter} /> : <div className="sample-blueprint"><span className="meta">{vi.demo.outcome}</span><h3>{scope.outcome}</h3><ol>{scope.features.map((feature, index) => <li key={feature}><span className="meta">R.0{index + 1}</span>{feature}</li>)}</ol><p>{vi.demo.blueprintNote}</p></div>}</div>
    <div className="demo-trace">
      <div className="trace-heading"><h2>{vi.demo.trace}<span className="meta">T / 001—005</span></h2><button type="button" className="trace-control" onClick={() => {
        if (playing) setPlaying(false);
        else { if (step === 4) setStep(0); setPlaying(true); }
      }}>{playing ? vi.demo.pause : step === 4 ? vi.demo.replay : vi.demo.play}<span aria-hidden="true">{playing ? 'Ⅱ' : '↗'}</span></button></div>
      <ol>{stages.map((stage, index) => <li key={stage.label} className={index === step ? 'trace-current' : index < step ? 'trace-complete' : 'trace-next'}>
        <button type="button" className="evidence-row" aria-pressed={index === step} onClick={() => { setStep(index); setPlaying(false); }}><span className="evidence-index">{String(index + 1).padStart(2, '0')}</span><time>{stage.time}</time><span className="evidence-event">{stage.event}</span><span className="trace-status" aria-hidden="true">{index < step ? '✓' : index === step ? '↳' : '·'}</span></button>
      </li>)}</ol>
      <div className="trace-receipt"><span className="meta">{current.receipt}</span><p>{current.detail}</p></div>
      <p>{vi.demo.footnote}</p>
    </div>
  </section>;
}
