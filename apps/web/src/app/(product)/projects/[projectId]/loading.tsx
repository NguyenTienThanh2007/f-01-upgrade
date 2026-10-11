import { vi } from '@/lib/copy/vi';
export default function Loading() { return <div className="workspace-document"><p role="status">{vi.errorPage.loadingSurface}</p><div className="workspace-skeleton" aria-hidden="true" /></div>; }
