// Pure decision for the project page's single "Bước tiếp theo" action.
// Planning freshness is decided by the server (proposal.current_context): recording a
// request or renaming the project makes earlier proposals stale.

export type StepKind =
  | 'archived' | 'loading' | 'running' | 'failed'
  | 'noPlan' | 'planning' | 'review' | 'build' | 'changePlan' | 'ready'
  | 'demoReady' | 'demoPending';

export type StepInput = {
  archived: boolean;
  activeRun: { id: string; status: string; mode: string } | null;
  latestRun: { id: string; status: string; mode: string; request_id: string } | null;
  currentVersion: { mode: string; created_at: string } | null;
  /** null while the session capabilities are still loading. */
  real: boolean | null;
  proposals: readonly { id: string; current_context: boolean; reviewed: boolean; request_id: string }[] | null;
  /** Newest first, as returned by the requests API. */
  requests: readonly { id: string; kind: string; created_at: string }[] | null;
  planningPending: boolean;
};

export type Step = { kind: StepKind; proposalId?: string; requestId?: string; runId?: string };

export function nextStep(input: StepInput): Step {
  if (input.archived) return { kind: 'archived' };
  if (input.activeRun) return { kind: 'running', runId: input.activeRun.id };
  if (input.real === null) return { kind: 'loading' };
  const latest = input.latestRun;
  if (!input.real) {
    if (latest?.status === 'failed' && latest.mode === 'simulated') return { kind: 'failed', runId: latest.id };
    return input.currentVersion ? { kind: 'demoReady' } : { kind: 'demoPending' };
  }
  if (input.planningPending) return { kind: 'planning' };
  if (!input.proposals || !input.requests) return { kind: 'loading' };
  const current = input.proposals.find(item => item.current_context);
  if (latest?.status === 'failed' && latest.mode === 'real' && current?.reviewed && latest.request_id === current.request_id) {
    return { kind: 'failed', runId: latest.id, proposalId: current.id };
  }
  if (current) return current.reviewed ? { kind: 'build', proposalId: current.id } : { kind: 'review', proposalId: current.id };
  const newest = input.requests[0];
  const version = input.currentVersion ? Date.parse(input.currentVersion.created_at) : -Infinity;
  if (newest && newest.kind === 'change' && Date.parse(newest.created_at) > version) return { kind: 'changePlan', requestId: newest.id };
  return input.currentVersion ? { kind: 'ready' } : { kind: 'noPlan' };
}

/** Only a planning command or a pending attempt is "planning"; reviewing a plan is not. */
export function planningInProgress(state: { running: boolean; attemptStatus?: string | null }): boolean {
  return state.running || state.attemptStatus === 'pending';
}
