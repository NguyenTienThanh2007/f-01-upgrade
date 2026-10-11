import { vi } from '../copy/vi.ts';
export interface ProjectPlan {
  project_title: string;
  product_summary: string;
  target_users: string[];
  core_features: { name: string; description: string }[];
  recommended_stack: { frontend: string; backend: string; database: string; rationale: string };
  implementation_milestones: { title: string; deliverables: string[] }[];
}

export const IDEA_LIMIT = 10_000;
export const planningErrors = {
  VALIDATION_ERROR: { status: 422, message: vi.planningErrors.VALIDATION_ERROR },
  REQUEST_FORBIDDEN: { status: 403, message: vi.planningErrors.REQUEST_FORBIDDEN },
  UNSUPPORTED_MEDIA_TYPE: { status: 415, message: vi.planningErrors.UNSUPPORTED_MEDIA_TYPE },
  REQUEST_TOO_LARGE: { status: 413, message: vi.planningErrors.REQUEST_TOO_LARGE },
  PLANNING_NOT_CONFIGURED: { status: 503, message: vi.planningErrors.PLANNING_NOT_CONFIGURED },
  AUTHENTICATION_REQUIRED: { status: 503, message: vi.planningErrors.AUTHENTICATION_REQUIRED },
  PROVIDER_NOT_CONFIGURED: { status: 503, message: vi.planningErrors.PROVIDER_NOT_CONFIGURED },
  PROVIDER_AUTHENTICATION_FAILED: { status: 502, message: vi.planningErrors.PROVIDER_AUTHENTICATION_FAILED },
  PROVIDER_QUOTA_EXCEEDED: { status: 503, message: vi.planningErrors.PROVIDER_QUOTA_EXCEEDED },
  PROVIDER_RATE_LIMITED: { status: 429, message: vi.planningErrors.PROVIDER_RATE_LIMITED },
  PROVIDER_TIMEOUT: { status: 504, message: vi.planningErrors.PROVIDER_TIMEOUT },
  PROVIDER_UNAVAILABLE: { status: 503, message: vi.planningErrors.PROVIDER_UNAVAILABLE },
  PROVIDER_INVALID_RESPONSE: { status: 502, message: vi.planningErrors.PROVIDER_INVALID_RESPONSE },
  PROVIDER_INCOMPLETE_RESPONSE: { status: 502, message: vi.planningErrors.PROVIDER_INCOMPLETE_RESPONSE },
  PROVIDER_REFUSED: { status: 422, message: vi.planningErrors.PROVIDER_REFUSED },
  PROVIDER_ERROR: { status: 502, message: vi.planningErrors.PROVIDER_ERROR },
  INTERNAL_ERROR: { status: 500, message: vi.planningErrors.INTERNAL_ERROR },
} as const;
export type PlanningErrorCode = keyof typeof planningErrors;
export interface PlanningError { code: PlanningErrorCode; message: string; request_id: string }

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function isErrorCode(value: unknown): value is PlanningErrorCode {
  return typeof value === 'string' && Object.hasOwn(planningErrors, value);
}
function text(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && Array.from(value).length <= max;
}
function keys(value: unknown, fields: string[]): value is Record<string, unknown> {
  return record(value) && Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field));
}
function list(value: unknown, max: number, item: (value: unknown) => boolean): boolean {
  return Array.isArray(value) && value.length >= 1 && value.length <= max && value.every(item);
}
export function parseIdea(value: unknown): string | null {
  if (!keys(value, ['idea']) || typeof value.idea !== 'string') return null;
  const idea = value.idea.trim();
  return text(idea, IDEA_LIMIT) ? idea : null;
}
// Mirrors the bounded Pydantic ProjectPlan contract; no provider wire types enter the UI.
export function isProjectPlan(value: unknown): value is ProjectPlan {
  if (!keys(value, ['project_title', 'product_summary', 'target_users', 'core_features', 'recommended_stack', 'implementation_milestones'])) return false;
  const stack = value.recommended_stack;
  return text(value.project_title, 100) && text(value.product_summary, 1000)
    && list(value.target_users, 10, item => text(item, 200))
    && list(value.core_features, 16, item => keys(item, ['name', 'description']) && text(item.name, 100) && text(item.description, 1000))
    && keys(stack, ['frontend', 'backend', 'database', 'rationale'])
    && text(stack.frontend, 200) && text(stack.backend, 200) && text(stack.database, 200) && text(stack.rationale, 1000)
    && list(value.implementation_milestones, 12, item => keys(item, ['title', 'deliverables']) && text(item.title, 100) && list(item.deliverables, 10, deliverable => text(deliverable, 200)));
}
