import Link from 'next/link';
import { ProjectCreation } from '@/features/projects/project-creation';
import { projectStarters } from '@/features/project-planning/project-starters';
import { vi } from '@/lib/copy/vi';
export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ starter?: string; template?: string }> }) {
  const { starter, template } = await searchParams;
  return <div className="page form-page vn-create-page"><Link href="/projects" className="back-link">{vi.create.back}</Link><div className="page-eyebrow"><span>{vi.create.eyebrow}</span></div><h1>{vi.create.title}</h1><p className="form-introduction">{vi.create.intro}</p><ProjectCreation initialIdea={projectStarters.find(item => item.id === starter)?.brief ?? ''} initialTemplate={template ?? null} /></div>;
}
