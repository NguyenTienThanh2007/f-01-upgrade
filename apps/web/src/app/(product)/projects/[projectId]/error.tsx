'use client';
import { vi } from '@/lib/copy/vi';
export default function Error({ reset }: { reset: () => void }) { return <div className="workspace-document"><h2>{vi.errorPage.surface}</h2><p>{vi.errorPage.surfaceBody}</p><button className="button button-secondary" onClick={reset}>{vi.errorPage.surfaceAction}</button></div>; }
