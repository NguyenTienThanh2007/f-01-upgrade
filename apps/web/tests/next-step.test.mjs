import test from 'node:test';
import assert from 'node:assert/strict';
import { nextStep, planningInProgress, visibleNotice } from '../src/lib/workspace/next-step.ts';
import { availableTemplate, readTemplateChoice, writeTemplateChoice, templateCatalog } from '../src/lib/workspace/template-catalog.ts';

const base = { archived: false, activeRun: null, latestRun: null, currentVersion: null, real: true, proposals: [], requests: [{ id: 'r1', kind: 'initial', created_at: '2026-10-01T08:00:00Z' }], planningPending: false };
const proposal = (over = {}) => ({ id: 'p1', current_context: true, reviewed: false, request_id: 'r1', ...over });

test('archived and running projects take priority over everything else', () => {
  assert.deepEqual(nextStep({ ...base, archived: true, activeRun: { id: 'x', status: 'running', mode: 'real' } }), { kind: 'archived' });
  assert.deepEqual(nextStep({ ...base, activeRun: { id: 'x', status: 'queued', mode: 'real' } }), { kind: 'running', runId: 'x' });
});

test('unknown session capabilities or unloaded lists wait instead of guessing', () => {
  assert.equal(nextStep({ ...base, real: null }).kind, 'loading');
  assert.equal(nextStep({ ...base, proposals: null }).kind, 'loading');
  assert.equal(nextStep({ ...base, requests: null }).kind, 'loading');
});

test('real mode walks plan → review → build → ready', () => {
  assert.deepEqual(nextStep(base), { kind: 'noPlan' });
  assert.deepEqual(nextStep({ ...base, planningPending: true }), { kind: 'planning' });
  assert.deepEqual(nextStep({ ...base, proposals: [proposal()] }), { kind: 'review', proposalId: 'p1' });
  assert.deepEqual(nextStep({ ...base, proposals: [proposal({ reviewed: true })] }), { kind: 'build', proposalId: 'p1' });
  // Publication makes the plan stale, so a version with no current plan is ready.
  assert.deepEqual(nextStep({ ...base, proposals: [proposal({ reviewed: true, current_context: false })], currentVersion: { mode: 'real', created_at: '2026-10-01T09:00:00Z' } }), { kind: 'ready' });
});

test('a change request newer than the current version asks for a plan for that request', () => {
  const requests = [{ id: 'r2', kind: 'change', created_at: '2026-10-02T08:00:00Z' }, ...base.requests];
  const version = { mode: 'real', created_at: '2026-10-01T09:00:00Z' };
  assert.deepEqual(nextStep({ ...base, requests, currentVersion: version, proposals: [proposal({ current_context: false })] }), { kind: 'changePlan', requestId: 'r2' });
  assert.deepEqual(nextStep({ ...base, requests, currentVersion: version, proposals: [proposal({ id: 'p2', request_id: 'r2' })] }), { kind: 'review', proposalId: 'p2' });
  assert.deepEqual(nextStep({ ...base, requests, currentVersion: { ...version, created_at: '2026-10-03T09:00:00Z' }, proposals: [] }), { kind: 'ready' });
});

test('a failed real build of the current reviewed plan offers a retry; a stale plan does not', () => {
  const failed = { id: 'run1', status: 'failed', mode: 'real', request_id: 'r1' };
  assert.deepEqual(nextStep({ ...base, latestRun: failed, proposals: [proposal({ reviewed: true })] }), { kind: 'failed', runId: 'run1', proposalId: 'p1' });
  assert.deepEqual(nextStep({ ...base, latestRun: failed, proposals: [proposal({ reviewed: true, current_context: false })] }), { kind: 'noPlan' });
});

test('demo mode never claims a real build', () => {
  const demo = { ...base, real: false };
  assert.deepEqual(nextStep(demo), { kind: 'demoPending' });
  assert.deepEqual(nextStep({ ...demo, currentVersion: { mode: 'simulated', created_at: '2026-10-01T09:00:00Z' } }), { kind: 'demoReady' });
  assert.deepEqual(nextStep({ ...demo, latestRun: { id: 's1', status: 'failed', mode: 'simulated', request_id: 'r1' } }), { kind: 'failed', runId: 's1' });
});

test('template choice is remembered per project and only for available templates', () => {
  const store = new Map();
  const storage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) };
  assert.equal(templateCatalog.find(item => item.id === 'orders')?.name, 'Quản lý đơn hàng');
  assert.equal(availableTemplate('inventory'), null);
  writeTemplateChoice(storage, 'p', 'orders');
  assert.equal(readTemplateChoice(storage, 'p'), 'orders');
  assert.equal(readTemplateChoice(storage, 'other'), null);
  writeTemplateChoice(storage, 'p', 'inventory');
  assert.equal(readTemplateChoice(storage, 'p'), null);
  store.set('f01.template-choice.v1.p', 'evil');
  assert.equal(readTemplateChoice(storage, 'p'), null);
  const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
  assert.equal(readTemplateChoice(blocked, 'p'), null);
  assert.doesNotThrow(() => writeTemplateChoice(blocked, 'p', 'orders'));
});

test('reviewing a plan is not shown as planning', () => {
  assert.equal(planningInProgress({ running: false, attemptStatus: null }), false);
  assert.equal(planningInProgress({ running: true }), true);
  assert.equal(planningInProgress({ running: false, attemptStatus: 'pending' }), true);
  assert.equal(planningInProgress({ running: false, attemptStatus: 'succeeded' }), false);
  // While the review request is in flight the plan is still current and unreviewed: the step stays "review".
  const reviewing = { archived: false, activeRun: null, latestRun: null, currentVersion: null, real: true, requests: [{ id: 'r1', kind: 'initial', created_at: '2026-10-01T08:00:00Z' }], proposals: [{ id: 'p1', current_context: true, reviewed: false, request_id: 'r1' }] };
  assert.equal(nextStep({ ...reviewing, planningPending: planningInProgress({ running: false, attemptStatus: 'succeeded' }) }).kind, 'review');
});

test('a change-request notice disappears once a newer version is published', () => {
  const notice = { text: 'Đã lưu yêu cầu.', versionId: 'v1' };
  assert.equal(visibleNotice(notice, 'v1'), 'Đã lưu yêu cầu.');
  assert.equal(visibleNotice(notice, 'v2'), '');
  assert.equal(visibleNotice({ text: 'x', versionId: null }, null), 'x');
  assert.equal(visibleNotice(null, 'v1'), '');
});
