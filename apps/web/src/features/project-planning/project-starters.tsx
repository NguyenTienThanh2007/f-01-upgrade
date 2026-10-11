import { vi } from '@/lib/copy/vi';

export const projectStarters = vi.starters.items;

export type StarterId = typeof projectStarters[number]['id'];

export function ProjectStarters({ selected, onSelect, disabled = false, categoryFirst = false }: {
  selected?: StarterId; onSelect: (id: StarterId, brief: string) => void; disabled?: boolean; categoryFirst?: boolean;
}) {
  return <div className="project-starters" aria-label={vi.starters.label}>
    <div className="starter-heading"><span className="meta">{vi.starters.heading}</span><span className="meta">01—03</span></div>
    {projectStarters.map(starter => <button key={starter.id} type="button" disabled={disabled}
      className={`starter-row starter-${starter.id}`} aria-pressed={selected === starter.id}
      onClick={() => onSelect(starter.id, starter.brief)}>
      <span className="starter-mark" aria-hidden="true"><i /><i /><i /></span>
      <span className="starter-description"><span>{categoryFirst ? `${starter.short} / ${starter.category}` : starter.title}</span><small>{categoryFirst ? starter.title : starter.category}</small></span>
      <span className="starter-arrow" aria-hidden="true">↗</span>
    </button>)}
  </div>;
}
