'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const lease = require('../task-lease.cjs');

let count = 0;
function ok(name, fn) {
  fn();
  count += 1;
  process.stdout.write(`ok ${count} - ${name}\n`);
}

async function okAsync(name, fn) {
  await fn();
  count += 1;
  process.stdout.write(`ok ${count} - ${name}\n`);
}

function inactiveState() {
  return {
    schemaVersion: 1,
    scope: 'chatgpt-mobile-coder-lab',
    mode: 'MCL_TASK_LEASE_LEDGER',
    status: 'INACTIVE',
    generation: 0,
    controllerPath: lease.CONTROLLER_PATH,
    controllerCommit: null,
    packetRef: lease.OWNER_PACKET_REF,
    activeLeases: [],
    lastRelease: null,
  };
}
function activeState() {
  return {...inactiveState(), status: 'ACTIVE', generation: 1, controllerCommit: 'a'.repeat(40)};
}

function acquireRequest(overrides = {}) {
  return {
    expectedGeneration: 1,
    packetRef: '#2350',
    packetBodySha256: 'b'.repeat(64),
    route: 'S',
    executor: 'S',
    scopes: ['path:products/chatgpt-mobile-coder-lab/coordination/task-a.cjs'],
    scopeDisposition: 'DISJOINT',
    workspaceKind: 'repository',
    branch: 'server/task-a',
    worktree: '/root/nyang-worktrees/task-a',
    observedBaseSha: 'c'.repeat(40),
    ...overrides,
  };
}

function stateFromPlan(plan) {
  assert.equal(plan.changed, true);
  const parsed = lease.parseLedger(plan.updatedBody);
  assert.equal(parsed.ok, true);
  return parsed.state;
}

ok('empty ledger render parses with generation zero', () => {
  const state = inactiveState();
  assert.deepEqual(lease.validateLedger(state), []);
  const parsed = lease.parseLedger(lease.renderLedger(state));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.state.generation, 0);
  assert.equal(parsed.state.activeLeases.length, 0);
});
ok('activation advances generation and binds exact controller commit', () => {
  const plan = lease.planActivate(inactiveState(), {expectedGeneration: 0, controllerCommit: 'a'.repeat(40)});
  assert.equal(plan.status, 'ACTIVATE_READY');
  const next = stateFromPlan(plan);
  assert.equal(next.status, 'ACTIVE');
  assert.equal(next.generation, 1);
  assert.equal(next.controllerCommit, 'a'.repeat(40));
});

ok('acquire succeeds from exact expected generation', () => {
  const plan = lease.planAcquire(activeState(), acquireRequest());
  assert.equal(plan.status, 'ACQUIRE_READY');
  const next = stateFromPlan(plan);
  assert.equal(next.generation, 2);
  assert.equal(next.activeLeases.length, 1);
  assert.equal(next.activeLeases[0].leaseId, plan.leaseId);
});

ok('identical acquire retry is idempotent after single acquire advance', () => {
  const first = lease.planAcquire(activeState(), acquireRequest());
  const next = stateFromPlan(first);
  const retry = lease.planAcquire(next, acquireRequest());
  assert.equal(retry.status, 'ACQUIRE_NOOP');
  assert.equal(retry.changed, false);
  assert.equal(retry.generation, 2);
});

ok('stale expected generation blocks a different acquire', () => {
  const next = stateFromPlan(lease.planAcquire(activeState(), acquireRequest()));
  const stale = lease.planAcquire(next, acquireRequest({packetRef:'#2353', branch:'server/task-b', worktree:'/root/nyang-worktrees/task-b'}));
  assert.equal(stale.status, 'BLOCKED');
  assert.ok(stale.reasonCodes.includes('STALE_EXPECTED_GENERATION'));
});
ok('malformed and duplicate markers fail closed', () => {
  const rendered = lease.renderLedger(inactiveState());
  assert.equal(lease.parseLedger(rendered.replace(lease.LEDGER_MARKER, 'missing-marker')).ok, false);
  assert.equal(lease.parseLedger(`${rendered}\n${lease.LEDGER_MARKER}`).ok, false);
});

ok('invalid ledger state never resets to empty', () => {
  const bad = lease.renderLedger(inactiveState()).replace('"generation":0', '"generation":9');
  const parsed = lease.parseLedger(bad);
  assert.equal(parsed.ok, false);
  assert.ok(parsed.reasonCodes.includes('LEDGER_STATE_INVALID'));
});

ok('same packet with materially different profile conflicts', () => {
  const next = stateFromPlan(lease.planAcquire(activeState(), acquireRequest()));
  const conflict = lease.planAcquire(next, acquireRequest({
    expectedGeneration: 2,
    scopes: ['path:products/chatgpt-mobile-coder-lab/coordination/task-b.cjs'],
    branch: 'server/task-b',
    worktree: '/root/nyang-worktrees/task-b',
  }));
  assert.equal(conflict.status, 'CONFLICT');
  assert.ok(conflict.reasonCodes.includes('PACKET_ALREADY_LEASED_WITH_DIFFERENT_PROFILE'));
});

ok('active lease scope overlap conflicts through shared Work System grammar', () => {
  const next = stateFromPlan(lease.planAcquire(activeState(), acquireRequest()));
  const overlap = lease.planAcquire(next, acquireRequest({
    expectedGeneration: 2,
    packetRef: '#2353',
    scopes: ['path:products/chatgpt-mobile-coder-lab/coordination/**'],
    branch: 'server/task-c',
    worktree: '/root/nyang-worktrees/task-c',
  }));
  assert.equal(overlap.status, 'CONFLICT');
  assert.ok(overlap.reasonCodes.includes('ACTIVE_LEASE_SCOPE_OVERLAP'));
});
ok('disjoint scopes on one executor remain parallel eligible with distinct workspaces', () => {
  const first = stateFromPlan(lease.planAcquire(activeState(), acquireRequest()));
  const secondPlan = lease.planAcquire(first, acquireRequest({
    expectedGeneration: 2,
    packetRef: '#2353',
    scopes: ['path:products/chatgpt-mobile-coder-lab/docs/task-b.md'],
    branch: 'server/task-b',
    worktree: '/root/nyang-worktrees/task-b',
  }));
  assert.equal(secondPlan.status, 'ACQUIRE_READY');
  assert.equal(stateFromPlan(secondPlan).activeLeases.length, 2);
});

ok('duplicate branch reservation blocks even with disjoint scopes', () => {
  const first = stateFromPlan(lease.planAcquire(activeState(), acquireRequest()));
  const conflict = lease.planAcquire(first, acquireRequest({
    expectedGeneration: 2,
    packetRef: '#2353',
    scopes: ['path:products/chatgpt-mobile-coder-lab/docs/task-b.md'],
    worktree: '/root/nyang-worktrees/task-b',
  }));
  assert.equal(conflict.status, 'CONFLICT');
  assert.ok(conflict.reasonCodes.includes('ACTIVE_LEASE_BRANCH_RESERVED'));
});

ok('duplicate worktree reservation blocks even with a distinct branch', () => {
  const first = stateFromPlan(lease.planAcquire(activeState(), acquireRequest()));
  const conflict = lease.planAcquire(first, acquireRequest({
    expectedGeneration: 2,
    packetRef: '#2353',
    scopes: ['path:products/chatgpt-mobile-coder-lab/docs/task-b.md'],
    branch: 'server/task-b',
  }));
  assert.equal(conflict.status, 'CONFLICT');
  assert.ok(conflict.reasonCodes.includes('ACTIVE_LEASE_WORKTREE_RESERVED'));
});
ok('release requires current generation and exact active identity', () => {
  const acquiredPlan = lease.planAcquire(activeState(), acquireRequest());
  const acquired = stateFromPlan(acquiredPlan);
  const releasePlan = lease.planRelease(acquired, {
    expectedGeneration: 2,
    leaseId: acquiredPlan.leaseId,
    packetRef: '#2350',
  });
  assert.equal(releasePlan.status, 'RELEASE_READY');
  const released = stateFromPlan(releasePlan);
  assert.equal(released.generation, 3);
  assert.equal(released.activeLeases.length, 0);
  assert.equal(released.lastRelease.leaseId, acquiredPlan.leaseId);
});

ok('release retry is idempotent after success at current generation', () => {
  const acquiredPlan = lease.planAcquire(activeState(), acquireRequest());
  const acquired = stateFromPlan(acquiredPlan);
  const released = stateFromPlan(lease.planRelease(acquired, {expectedGeneration:2, leaseId:acquiredPlan.leaseId, packetRef:'#2350'}));
  const retry = lease.planRelease(released, {expectedGeneration:3, leaseId:acquiredPlan.leaseId, packetRef:'#2350'});
  assert.equal(retry.status, 'RELEASE_NOOP');
  assert.equal(retry.changed, false);
});

ok('ambiguous either executor and non-DISJOINT discovery fail closed', () => {
  const either = lease.normalizeAcquireRequest(acquireRequest({executor:'either'}));
  assert.equal(either.ok, false);
  assert.ok(either.reasonCodes.includes('REQUEST_EXECUTOR_INVALID'));
  const unknown = lease.planAcquire(activeState(), acquireRequest({scopeDisposition:'UNKNOWN'}));
  assert.equal(unknown.status, 'BLOCKED');
  assert.ok(unknown.reasonCodes.includes('REQUEST_SCOPE_DISCOVERY_NOT_DISJOINT'));
});
ok('routing compatibility permits S fallback to M but not semantic context substitution', () => {
  assert.equal(lease.normalizeAcquireRequest(acquireRequest({executor:'M', workspaceKind:'repository', branch:'mainphone/task-a', worktree:'/data/data/com.termux/files/home/nyang-worktrees/task-a'})).ok, true);
  const wrong = lease.normalizeAcquireRequest(acquireRequest({route:'S_TERMUX', executor:'S'}));
  assert.equal(wrong.ok, false);
  assert.ok(wrong.reasonCodes.includes('REQUEST_ROUTE_EXECUTOR_CONFLICT'));
});

ok('landing branches and permanent repository paths are not leasable workspaces', () => {
  const landing = lease.normalizeAcquireRequest(acquireRequest({branch:'server/work'}));
  assert.equal(landing.ok, false);
  const permanent = lease.normalizeAcquireRequest(acquireRequest({worktree:'/root/nyang-repo'}));
  assert.equal(permanent.ok, false);
});

ok('non-repository semantic contexts require explicit not_applicable workspace', () => {
  const lab = lease.normalizeAcquireRequest(acquireRequest({
    route:'M_PRIVATE_LAB', executor:'M_PRIVATE_LAB', workspaceKind:'not_applicable',
    branch:'not_applicable', worktree:'not_applicable', observedBaseSha:null,
  }));
  assert.equal(lab.ok, true);
});

ok('ledger and outward result deny stronger mutation authority', () => {
  const output = lease.publicResult(lease.planAcquire(activeState(), acquireRequest()));
  assert.equal(output.repositoryMutationAuthorized, false);
  assert.equal(output.deviceMutationAuthorized, false);
  assert.equal(output.mergeAuthorized, false);
  assert.equal(output.releaseAuthorized, false);
  assert.equal(output.productionAuthorized, false);
  assert.equal(Object.hasOwn(output, 'updatedBody'), false);
});
ok('controller source contains no automatic expiry path', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../task-lease.cjs'), 'utf8');
  for (const forbidden of ['setTimeout(', 'setInterval(', 'Date.now(', 'expiresAt', 'ttlMs']) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});

ok('rendered active state contains no account, device, session, token, log, command, or environment identity fields', () => {
  const acquired = stateFromPlan(lease.planAcquire(activeState(), acquireRequest()));
  const body = lease.renderLedger(acquired);
  for (const forbidden of ['deviceId', 'sessionId', 'accountId', 'authToken', 'privateLog', 'commandLine', 'environmentDump']) {
    assert.equal(body.includes(forbidden), false, forbidden);
  }
});

ok('workflow is one fixed owner-only serialized issue writer', () => {
  const repoRoot = path.resolve(__dirname, '../../../..');
  const workflow = fs.readFileSync(path.join(repoRoot, '.github/workflows/mcl-task-lease.yml'), 'utf8');
  assert.ok(workflow.includes('contents: read\n  issues: write'));
  assert.ok(workflow.includes('group: mcl-task-lease-v1'));
  assert.ok(workflow.includes('cancel-in-progress: false'));
  assert.ok(workflow.includes('if: github.actor == github.repository_owner'));
  assert.ok(workflow.includes('ref: main'));
  assert.equal(workflow.includes('issue_number:'), false);
  assert.equal(workflow.includes('shell_command'), false);
  assert.equal(workflow.includes('workflow_call:'), false);
});
class FakeClient {
  constructor(state, packetBody) {
    this.body = lease.renderLedger(state);
    this.packetBody = packetBody;
    this.patches = 0;
  }

  async api(endpoint, options = {}) {
    if (endpoint === `/issues/${lease.STATE_ISSUE_NUMBER}` && (!options.method || options.method === 'GET')) {
      return {state:'open', pull_request:null, body:this.body};
    }
    if (endpoint === `/issues/${lease.STATE_ISSUE_NUMBER}` && options.method === 'PATCH') {
      this.body = options.body.body;
      this.patches += 1;
      return {state:'open', pull_request:null, body:this.body};
    }
    if (endpoint === '/issues/2350') return {state:'open', pull_request:null, body:this.packetBody};
    if (endpoint === '/branches/main') return {commit:{sha:'a'.repeat(40)}};
    throw new Error(`unexpected endpoint ${endpoint}`);
  }
}

okAsync('execute acquire verifies packet hash, writes once, and validates readback', async () => {
  const packetBody = '<!-- canonical-main-work-packet:v1 -->\n## State\nIN_PROGRESS\n';
  const client = new FakeClient(activeState(), packetBody);
  const request = acquireRequest({packetBodySha256:lease.digest(packetBody)});
  const output = await lease.executeOperation({client, operation:'acquire', request, actor:'owner', repositoryOwner:'owner'});
  assert.equal(output.status, 'ACQUIRE_UPDATED');
  assert.equal(client.patches, 1);
  assert.equal(lease.parseLedger(client.body).state.activeLeases.length, 1);
});

ok('S semantic route requires an isolated repository workspace', () => {
  const invalid = lease.normalizeAcquireRequest(acquireRequest({
    workspaceKind:'not_applicable', branch:'not_applicable', worktree:'not_applicable', observedBaseSha:null,
  }));
  assert.equal(invalid.ok, false);
  assert.ok(invalid.reasonCodes.includes('REQUEST_S_ROUTE_REPOSITORY_REQUIRED'));
});
