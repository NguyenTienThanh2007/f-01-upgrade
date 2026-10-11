import type { Metadata } from 'next';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@/styles/globals.css';
import { vi } from '@/lib/copy/vi';
import '@/styles/experience.css';
import '@/styles/operating-entry.css';
import '@/styles/project-management.css';
import '@/styles/workspace.css';
export const metadata: Metadata = { title: { default: vi.app.title, template: '%s · F01' }, description: vi.app.description, icons: { icon: '/favicon.svg' } };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="vi"><body>{children}</body></html>; }
