'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import type {Session} from '@/lib/projects/contracts';
import { Sheet } from '@/components/ui/sheet';
import { vi } from '@/lib/copy/vi';
function RailContent({ close,session }: { close?: () => void;session:Session|null }) {
  const pathname = usePathname();
  const accountName=session ? session.principal.identity_mode==='development' ? vi.nav.accountDev : session.principal.display_name : vi.nav.accountFallback;
  const identityLabel=session ? session.principal.identity_mode==='development' ? vi.nav.accountDevNote : vi.nav.accountOwner : vi.nav.accountSignIn;
  const [line1,line2]=vi.nav.railLine.split('\n'),[cap1,cap2]=vi.nav.railCaption.split('\n');
  return <>
    <Link className="wordmark" href="/" onClick={close} aria-label={vi.app.home}>F<span>01</span><small>{vi.nav.workspace}</small></Link>
    <div className="rail-section-label">{vi.nav.railSection}</div>
    <nav className="rail-nav" aria-label={vi.nav.main}><Link href="/" onClick={close} aria-label={vi.nav.start}><span className="nav-glyph" aria-hidden="true">⌂</span><span className="nav-text">{vi.nav.start}</span></Link><Link href="/projects" onClick={close} aria-label={vi.nav.projects} aria-current={pathname === '/projects' || (pathname.startsWith('/projects/') && pathname !== '/projects/new') ? 'page' : undefined}><span className="nav-glyph" aria-hidden="true">▤</span><span className="nav-text">{vi.nav.projects}</span></Link><Link href="/projects/new" onClick={close} aria-label={vi.nav.newProject} aria-current={pathname === '/projects/new' ? 'page' : undefined}><span className="nav-glyph" aria-hidden="true">+</span><span className="nav-text">{vi.nav.newProject}</span></Link></nav>
    <div className="rail-context"><span className="rail-rule" /><p>{line1}<br />{line2}</p><span className="rail-caption">{cap1}<br />{cap2}</span></div>
    <Link href="/account" className="account-link" onClick={close} aria-label={`${accountName} · ${identityLabel}`}><span className="avatar" aria-hidden="true">{accountName[0]}</span><span className="nav-text">{accountName}<small>{identityLabel}</small></span></Link>
  </>;
}
export function ProductShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [session,setSession]=useState<Session|null>(null),pathname=usePathname();
  useEffect(()=>{const controller=new AbortController();fetch('/api/v1/session',{signal:controller.signal,cache:'no-store'}).then(async response=>{setSession(response.ok?await response.json() as Session:null);}).catch(()=>{});return()=>controller.abort();},[pathname]);
  return <div className="product-shell"><a href="#main-content" className="skip-link">{vi.app.skip}</a><aside className="global-rail"><RailContent session={session} /></aside>
    <header className="mobile-header"><button className="icon-button" aria-label={vi.nav.open} onClick={() => setOpen(true)}>☰</button><Link href="/">F01</Link><span className="meta">{vi.nav.workspace}</span></header>
    <Sheet open={open} onClose={() => setOpen(false)} title={vi.nav.sheetTitle}><div className="mobile-rail"><RailContent session={session} close={() => setOpen(false)} /></div></Sheet>
    <main id="main-content" className="product-main" tabIndex={-1}>{children}</main>
  </div>;
}
