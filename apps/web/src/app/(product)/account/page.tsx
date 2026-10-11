'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {projectRequest} from '@/lib/projects/browser';
import type {Session} from '@/lib/projects/contracts';
import {vi,viDateTime} from '@/lib/copy/vi';
export default function AccountPage(){
 const [signOutError,setSignOutError]=useState(false);
 useEffect(()=>setSignOutError(new URL(location.href).searchParams.get('error')==='sign-out'),[]);
 const [session,setSession]=useState<Session|null>(null),[pending,setPending]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{const controller=new AbortController();setPending(true);projectRequest<Session>('/session',{signal:controller.signal}).then(value=>{setSession(value);setError('');}).catch(e=>{if(!controller.signal.aborted){setSession(null);setError(e.message);}}).finally(()=>{if(!controller.signal.aborted)setPending(false);});return()=>controller.abort();},[attempt]);
 return <div className="page narrow-page"><span className="page-eyebrow">{vi.account.eyebrow}</span><h1>{vi.account.title}</h1>{signOutError&&<p role="alert">{vi.account.signOutError}</p>}{pending&&<p role="status">{vi.account.checking}</p>}{error&&<><p role="alert">{error}</p><Link className="button button-primary" href="/sign-in">{vi.account.signIn}</Link><button className="button button-secondary" onClick={()=>setAttempt(v=>v+1)}>{vi.account.retry}</button></>}{session&&<section className="detail-section"><h2>{session.principal.identity_mode==='development'?vi.nav.accountDev:session.principal.display_name}</h2><p>{session.principal.identity_mode==='oidc'?vi.account.owner:vi.account.dev}</p><p className="muted">{vi.account.note}</p>{session.expires_at&&<p>{vi.account.expires(viDateTime(session.expires_at))}</p>}{session.principal.identity_mode==='oidc'&&<form method="post" action="/api/auth/sign-out"><button className="button button-secondary" type="submit">{vi.account.signOut}</button></form>}</section>}</div>;
}
