// Template choices shown in the UI. `available` templates must also exist in the
// backend registry (apps/api/src/f01/application/templates.py) and in build-receipt.ts.
import type { TemplateId } from './build-receipt.ts';
import { vi } from '../copy/vi.ts';

export type CatalogEntry = { id: string; name: string; summary: string; available: boolean; brief: string };

const availableIds: readonly string[] = ['orders'];
export const templateCatalog: readonly CatalogEntry[] = vi.templates.catalog.map(entry => ({ ...entry, available: availableIds.includes(entry.id) }));

export function availableTemplate(id: string | null | undefined): (CatalogEntry & { id: TemplateId }) | null {
  const entry = templateCatalog.find(item => item.id === id && item.available);
  return entry ? entry as CatalogEntry & { id: TemplateId } : null;
}

const key = (project: string) => `f01.template-choice.v1.${project}`;

/** Template chosen at project creation; browser-only, read back before the first build. */
export function readTemplateChoice(storage: Pick<Storage, 'getItem'>, project: string): TemplateId | null {
  try { return availableTemplate(storage.getItem(key(project)))?.id ?? null; } catch { return null; }
}
export function writeTemplateChoice(storage: Pick<Storage, 'setItem' | 'removeItem'>, project: string, id: string | null): void {
  try { if (availableTemplate(id)) storage.setItem(key(project), id!); else storage.removeItem(key(project)); } catch { /* storage may be blocked */ }
}
