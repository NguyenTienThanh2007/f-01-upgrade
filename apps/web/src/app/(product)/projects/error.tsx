'use client';
import { Button } from '@/components/ui/button';
import { ProjectPulse } from '@/features/project-pulse/project-pulse';
import { vi } from '@/lib/copy/vi';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="page narrow-page workspace-error" role="alert"><span className="page-eyebrow">{vi.errorPage.eyebrow}</span><ProjectPulse state="error" label={vi.errorPage.pulse} /><h1>{vi.errorPage.title}</h1><p className="muted">{vi.errorPage.body}</p><Button onClick={reset}>{vi.errorPage.action}</Button></div>;
}
