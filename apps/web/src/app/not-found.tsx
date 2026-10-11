import Link from 'next/link';
import { vi } from '@/lib/copy/vi';
export default function NotFound() { return <main className="sign-in"><span className="meta">404</span><h1>{vi.notFound.title}</h1><p>{vi.notFound.body}</p><Link href="/projects" className="button button-primary">{vi.notFound.action}</Link></main>; }
