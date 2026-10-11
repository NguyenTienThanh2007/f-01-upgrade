import Link from 'next/link';
import { vi } from '@/lib/copy/vi';
export const dynamic='force-dynamic';
export default async function SignIn({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  const query=await searchParams,oidc=process.env.AUTH_MODE==='oidc';
  return <main className="sign-in"><span className="wordmark">F01</span><h1>{vi.signIn.title}</h1>
    {query.error&&<p role="alert">{vi.signIn.error}</p>}
    {query.signed_out&&<p role="status">{vi.signIn.signedOut}</p>}
    {oidc ? <><p>{vi.signIn.oidc}</p><form method="post" action="/api/auth/sign-in"><button className="button button-primary" type="submit">{vi.signIn.oidcAction}</button></form></> : <><p>{vi.signIn.dev}</p><Link className="button button-primary" href="/projects">{vi.signIn.devAction}</Link></>}
  </main>;
}
