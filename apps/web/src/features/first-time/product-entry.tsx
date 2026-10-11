'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ProjectPlanningForm } from '@/features/project-planning/project-planning-form';
import type { StarterId } from '@/features/project-planning/project-starters';
import { vi } from '@/lib/copy/vi';
import { LifecycleDemo } from './lifecycle-demo';
import { EntryNavigation } from './entry-navigation';
import { PlatformIndex } from './platform-index';

export function ProductEntry() {
  const [starter, setStarter] = useState<StarterId>('tea');
  const [line1, line2] = vi.home.registerTitle.split('\n');
  return <div className="entry-page os-entry">
    <a href="#main-content" className="skip-link">{vi.app.skip}</a>
    <EntryNavigation />
    <main id="main-content" tabIndex={-1}>
      <div className="entry-heading"><div className="entry-eyebrow"><span className="meta">{vi.home.eyebrow}</span><span className="meta">{vi.home.eyebrowRight}</span></div><div className="os-hero-grid"><div><h1>{vi.home.titleLead}<br /><span>{vi.home.titleRest} <em>{vi.home.titleEmphasis}</em></span></h1><p>{vi.home.lede}</p></div><aside className="hero-register" aria-label={vi.home.registerLabel}><span className="meta">F01 / 2026</span><p>{line1}<br />{line2}</p><dl><div><dt>{vi.home.available}</dt><dd>{vi.home.availableValue}</dd></div><div><dt>{vi.home.ahead}</dt><dd>{vi.home.aheadValue}</dd></div></dl></aside></div></div>
      <div className="workbench-rule"><span className="meta">{vi.home.ruleCommand}</span><span className="workbench-bridge" aria-hidden="true">↳</span><span className="meta">{vi.home.ruleDemo}</span></div>
      <ProjectPlanningForm presentation="home" onStarterChange={setStarter} companion={<LifecycleDemo starter={starter} />} />
      <nav className="os-lifecycle-rail" aria-label={vi.home.stepsLabel}>{vi.home.steps.map((step, index) => <a key={step.title} href={step.href}><span className="meta">{step.meta}</span><strong>{step.title}</strong><span aria-hidden="true">{index === vi.home.steps.length - 1 ? '↗' : '→'}</span></a>)}</nav>
      <PlatformIndex />
    </main>
    <footer className="entry-footer"><span>{vi.home.footerName}</span><span>{vi.home.footerNote}</span><Link href="/projects">{vi.home.footerLink}</Link></footer>
  </div>;
}
