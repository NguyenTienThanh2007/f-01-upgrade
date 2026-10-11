'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Sheet } from '@/components/ui/sheet';
import { PulseMark } from '@/features/project-pulse/project-pulse';
import { vi } from '@/lib/copy/vi';

const destinations = [
  { label: vi.nav.projects, href: '/projects', note: vi.dashboard.lede },
  { label: vi.nav.templates, href: '#templates', note: vi.home.templatesLede },
  { label: vi.nav.faq, href: '#faq', note: vi.home.faqLede },
];

export function EntryNavigation() {
  const [open, setOpen] = useState(false);
  return <header className="os-navigation">
    <Link href="/" className="os-wordmark" aria-label={vi.app.home}><PulseMark /><span>F01<small>{vi.nav.workspace}</small></span></Link>
    <nav className="os-nav-links" aria-label={vi.nav.main}>{destinations.map(item => <a key={item.label} href={item.href}>{item.label}</a>)}</nav>
    <div className="os-nav-actions"><Link href="/account" className="os-account">{vi.nav.account}</Link><Link className="button button-primary" href="/projects/new">{vi.nav.newProject}<span aria-hidden="true">↗</span></Link><button type="button" className="icon-button os-menu-toggle" onClick={() => setOpen(true)} aria-label={vi.nav.open}>☰</button></div>
    <Sheet open={open} onClose={() => setOpen(false)} title={vi.nav.sheetTitle}><nav className="os-mobile-navigation" aria-label={vi.nav.main}>{destinations.map(item => <a key={item.label} href={item.href} onClick={() => setOpen(false)}><span>{item.label}<small>{item.note}</small></span><span aria-hidden="true">↗</span></a>)}<Link href="/projects/new" onClick={() => setOpen(false)}><span>{vi.nav.newProject}<small>{vi.create.intro}</small></span><span aria-hidden="true">↗</span></Link><Link href="/account" onClick={() => setOpen(false)}><span>{vi.nav.account}<small>{vi.nav.accountDevNote}</small></span><span aria-hidden="true">↗</span></Link></nav></Sheet>
  </header>;
}
