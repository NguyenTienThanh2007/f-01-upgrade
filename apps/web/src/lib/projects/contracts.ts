import { vi } from '../copy/vi.ts';
import type { components } from '@f01/api-client/schema';
export type Project = components['schemas']['ProjectSummary'];
export type ProjectList = components['schemas']['ProjectList'];
export type Created = components['schemas']['ProjectCreated'];
export type CreateInput = components['schemas']['CreateProject'];
export type UpdateInput = components['schemas']['UpdateProject'];
export type Session = components['schemas']['SessionView'];
export const states = ['idle', 'understanding', 'planning', 'building', 'verifying', 'deploying', 'live', 'error'] as const;
export const stateNames: Record<Project['lifecycle'], string> = { idle: vi.states.idle, understanding: vi.states.understanding, planning: vi.states.planning, building: vi.states.building, verifying: vi.states.verifying, deploying: vi.states.deploying, live: vi.states.live, error: vi.states.error };
export function createInput(title: string, brief: string): CreateInput | null {
  const text = brief.trim(), name = title.trim();
  if (Array.from(name).length > 100 || Array.from(text).length < 20 || Array.from(text).length > 10000) return null;
  return { title: name || null, brief: text };
}
export const errors: Record<string, string> = vi.errors;
export function errorMessage(code: string): string { return errors[code] ?? errors.INTERNAL_ERROR!; }
export function projectETag(project: Project): string { return `"project-${project.id}-m${project.metadata_version}"`; }
