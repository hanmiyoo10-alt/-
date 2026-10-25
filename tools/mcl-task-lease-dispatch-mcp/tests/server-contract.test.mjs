import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  OPERATOR_PATH,
  REPOSITORY,
  TOKEN_ENV,
  WORKFLOW,
  WORKFLOW_NAME,
  WORKFLOW_PATH,
  createD013Service,
  createOperatorClient,
  operator,
  reconcileNoRunReadback,
  validateAcquireArgs,
  validateReleaseArgs
} from '../src/core.mjs';
import {
  TOOLS,
  createD013Server
} from '../src/server.mjs';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const lease = require(join(
  ROOT, 'products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs'
));

const MAIN = 'f'.repeat(40);
const PACKET_REF = '#3771';
const PACKET_BODY = [
  '<!-- canonical-main-work-packet:v1 -->',
  '',
  '# fixture',
  '',
  '## State',
  '',
  '`IN_PROGRESS`',
  '',
  '## Bounded implementation write scope',
  '',
  '- `path:tools/mcl-task-lease-dispatch-mcp/**`',
].join('\n');
const PACKET_HASH = lease.digest(PACKET_BODY);
const SCOPE = 'path:tools/mcl-task-lease-dispatch-mcp/**';
const BRANCH = 'laptop/mcl-task-lease-dispatch-mcp-test';
const WORKTREE = '/home/alsl0/nyang-worktrees/mcl-task-lease-dispatch-mcp-test';

function ledgerState({ generation = 7, activeLeases = [], lastRelease = null } = {}) {
  return {
    schemaVersion: 1,
    scope: 'chatgpt-mobile-coder-lab',
    mode: 'MCL_TASK_LEASE_LEDGER',
    status: 'ACTIVE',
    generation,
    controllerPath: lease.CONTROLLER_PATH,
    controllerCommit: MAIN,
    packetRef: lease.OWNER_PACKET_REF,
    activeLeases,
    lastRelease,
  };
}

function acquireRequest(generation = 7) {
  return {
    expectedGeneration: generation,
    packetRef: PACKET_REF,
    packetBodySha256: PACKET_HASH,
    route: 'L',
    executor: 'L',
    scopes: [SCOPE],
    scopeDisposition: 'DISJOINT',
    workspaceKind: 'repository',
    branch: BRANCH,
    worktree: WORKTREE,
    observedBaseSha: MAIN,
  };
}

function acquireArgs(generation = 7) {
  return {
    packet_ref: PACKET_REF,
    expected_generation: generation,
    route: 'L',
    executor: 'L',
    scopes: [SCOPE],
    scope_disposition: 'DISJOINT',
    workspace_kind: 'repository',
    branch: BRANCH,
    worktree: WORKTREE,
    observed_base_sha: MAIN,
  };
}

function expectedLease(generation = 7) {
  const normalized = lease.normalizeAcquireRequest(acquireRequest(generation));
  assert.equal(normalized.ok, true);
  return normalized.lease;
}

function taskLog(inputs, leaseId, generation, status = 'ACQUIRE_UPDATED') {
  const markers = {
    operation: 'MCL_LEASE_OPERATION',
    expected_generation: 'MCL_LEASE_EXPECTED_GENERATION',
    packet_ref: 'MCL_LEASE_PACKET_REF',
    packet_body_sha256: 'MCL_LEASE_PACKET_BODY_SHA256',
    route: 'MCL_LEASE_ROUTE',
    executor: 'MCL_LEASE_EXECUTOR',
    scopes_json: 'MCL_LEASE_SCOPES_JSON',
    scope_disposition: 'MCL_LEASE_SCOPE_DISPOSITION',
    workspace_kind: 'MCL_LEASE_WORKSPACE_KIND',
    branch: 'MCL_LEASE_BRANCH',
    worktree: 'MCL_LEASE_WORKTREE',
    observed_base_sha: 'MCL_LEASE_OBSERVED_BASE_SHA',
    lease_id: 'MCL_LEASE_ID',
  };
  const lines = Object.entries(inputs).map(
    ([key, value]) => `2026-01-01T00:00:00Z ${markers[key]}: ${value}`
  );
  lines.push(JSON.stringify({
    schemaVersion: 1,
    mode: 'MCL_TASK_LEASE',
    status,
    reasonCodes: [],
    generation,
    leaseId,
  }));
  return lines.join('\n');
}

class FakeGitHub {
  constructor({
    initialState = ledgerState(),
    afterState = null,
    runsAfter = [{ id: 101 }],
    runConclusion = 'success',
    duplicateExactRuns = false,
  } = {}) {
    this.initialState = initialState;
    this.afterState = afterState;
    this.runsAfter = duplicateExactRuns ? [{ id: 101 }, { id: 102 }] : runsAfter;
    this.runConclusion = runConclusion;
    this.dispatched = false;
    this.dispatchCount = 0;
    this.workflowInputs = null;
    this.log = null;
    this.hasCredential = true;
  }

  async readIssue(number) {
    if (number === 3771) return { state: 'open', body: PACKET_BODY };
    if (number === 2352) {
      const state = this.dispatched && this.afterState ? this.afterState : this.initialState;
      return { state: 'open', body: lease.renderLedger(state) };
    }
    throw new Error('unexpected issue');
  }

  async listWorkflowRuns() {
    return this.dispatched ? this.runsAfter : [];
  }

  async dispatchWorkflow(inputs) {
    this.dispatched = true;
    this.dispatchCount += 1;
    this.workflowInputs = structuredClone(inputs);
  }

  async readRun(runId) {
    return {
      id: runId,
      event: 'workflow_dispatch',
      name: WORKFLOW_NAME,
      path: WORKFLOW_PATH,
      head_branch: 'main',
      status: 'completed',
      conclusion: this.runConclusion,
    };
  }

  async readRunJobs() {
    return [{ id: 201, name: 'mutate-ledger' }];
  }

  async readJobLog() {
    if (this.log !== null) return this.log;
    const item = expectedLease();
    return taskLog(
      this.workflowInputs,
      item.leaseId,
      8,
      this.workflowInputs.operation === 'release' ? 'RELEASE_UPDATED' : 'ACQUIRE_UPDATED'
    );
  }
}

test('fixed identities and public tool surface stay exact', () => {
  assert.equal(REPOSITORY, 'hanmiyoo10-alt/-');
  assert.equal(WORKFLOW, 'mcl-task-lease.yml');
  assert.equal(WORKFLOW_NAME, 'MCL Task Lease');
  assert.equal(WORKFLOW_PATH, '.github/workflows/mcl-task-lease.yml');
  assert.equal(TOKEN_ENV, 'GITHUB_D013_DISPATCH_TOKEN');
  assert.deepEqual(TOOLS.map((item) => item.name), ['d013_acquire', 'd013_release']);
  for (const tool of TOOLS) {
    const keys = Object.keys(tool.inputSchema.properties);
    for (const forbidden of [
      'repository', 'workflow', 'ref', 'url', 'endpoint',
      'method', 'token', 'command', 'executable'
    ]) assert.equal(keys.includes(forbidden), false, forbidden);
  }
});

test('argument validators fail closed on extra fields and non-DISJOINT acquire', () => {
  assert.deepEqual(validateAcquireArgs(acquireArgs()), []);
  assert.ok(validateAcquireArgs({ ...acquireArgs(), repository: 'other/repo' }).length);
  assert.ok(validateAcquireArgs({ ...acquireArgs(), scope_disposition: 'UNKNOWN' })
    .includes('REQUEST_SCOPE_DISCOVERY_NOT_DISJOINT'));
  const release = {
    packet_ref: PACKET_REF,
    expected_generation: 8,
    lease_id: 'a'.repeat(64),
  };
  assert.deepEqual(validateReleaseArgs(release), []);
  assert.ok(validateReleaseArgs({ ...release, workflow: 'other.yml' }).length);
});

test('real operator builds the exact L/L acquire plan and lease identity', async () => {
  const github = new FakeGitHub();
  const plan = await operator.planAcquire({
    client: createOperatorClient(github),
    packetRef: PACKET_REF,
    route: 'L',
    executor: 'L',
    scopes: [SCOPE],
    scopeDisposition: 'DISJOINT',
    workspaceKind: 'repository',
    branch: BRANCH,
    worktree: WORKTREE,
    observedBaseSha: MAIN,
  });
  assert.equal(plan.status, 'PLAN_READY');
  assert.equal(plan.ledgerGeneration, 7);
  assert.equal(plan.leaseId, expectedLease().leaseId);
  assert.equal(plan.workflowInputs.operation, 'acquire');
  assert.equal(plan.workflowInputs.scope_disposition, 'DISJOINT');
  assert.equal(plan.workflowInputs.packet_body_sha256, PACKET_HASH);
});

test('stale caller generation performs zero workflow dispatch', async () => {
  const github = new FakeGitHub();
  const service = createD013Service({ github, sleepFn: async () => {} });
  const result = await service.acquire(acquireArgs(6));
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.reasonCodes.includes('STALE_EXPECTED_GENERATION'));
  assert.equal(github.dispatchCount, 0);
});

test('valid acquire dispatches exactly once and requires exact durable readback', async () => {
  const item = expectedLease();
  const after = ledgerState({ generation: 8, activeLeases: [item] });
  const github = new FakeGitHub({ afterState: after });
  const service = createD013Service({ github, sleepFn: async () => {} });
  const result = await service.acquire(acquireArgs(7));
  assert.equal(result.status, 'DISPATCH_COMPLETE');
  assert.equal(result.leaseId, item.leaseId);
  assert.equal(result.observedGeneration, 8);
  assert.equal(github.dispatchCount, 1);
  assert.equal(github.workflowInputs.operation, 'acquire');
  assert.equal(github.workflowInputs.packet_ref, PACKET_REF);
  assert.equal(github.workflowInputs.scopes_json, JSON.stringify([SCOPE]));
});

test('no fresh run uses exact +1 durable acquire readback without second dispatch', async () => {
  const item = expectedLease();
  const after = ledgerState({ generation: 8, activeLeases: [item] });
  const github = new FakeGitHub({ afterState: after, runsAfter: [] });
  const service = createD013Service({ github, sleepFn: async () => {} });
  const result = await service.acquire(acquireArgs(7));
  assert.equal(result.status, 'DISPATCH_READBACK_COMPLETE');
  assert.equal(result.runId, null);
  assert.equal(result.observedGeneration, 8);
  assert.equal(result.leaseId, item.leaseId);
  assert.equal(github.dispatchCount, 1);
});

test('mirrored no-run readback rejects generation jumps and identity drift', () => {
  const item = expectedLease();
  const plan = {
    status: 'PLAN_READY',
    operation: 'acquire',
    ledgerGeneration: 7,
    leaseId: item.leaseId,
    workflowInputs: {
      packet_ref: PACKET_REF,
      packet_body_sha256: PACKET_HASH,
    },
  };
  assert.equal(reconcileNoRunReadback(plan, {
    status: 'READY',
    ledgerGeneration: 9,
    ledgerState: ledgerState({ generation: 9, activeLeases: [item] }),
  }), null);
  assert.equal(reconcileNoRunReadback(plan, {
    status: 'READY',
    ledgerGeneration: 8,
    ledgerState: ledgerState({
      generation: 8,
      activeLeases: [{ ...item, packetRef: '#9999' }],
    }),
  }), null);
});

test('two exact fresh runs remain UNKNOWN rather than picking latest', async () => {
  const item = expectedLease();
  const after = ledgerState({ generation: 8, activeLeases: [item] });
  const github = new FakeGitHub({ afterState: after, duplicateExactRuns: true });
  const service = createD013Service({ github, sleepFn: async () => {} });
  const result = await service.acquire(acquireArgs(7));
  assert.equal(result.status, 'UNKNOWN');
  assert.ok(result.reasonCodes.includes('DISPATCH_RUN_AMBIGUOUS'));
  assert.equal(github.dispatchCount, 1);
});

test('known workflow failure never auto-retries', async () => {
  const github = new FakeGitHub({ runConclusion: 'failure' });
  const service = createD013Service({ github, sleepFn: async () => {} });
  const result = await service.acquire(acquireArgs(7));
  assert.equal(result.status, 'DISPATCH_FAILED');
  assert.ok(result.reasonCodes.includes('WORKFLOW_FAILED_NO_AUTO_RETRY'));
  assert.equal(github.dispatchCount, 1);
});

test('release wrong lease is blocked by the real operator before dispatch', async () => {
  const item = expectedLease();
  const github = new FakeGitHub({
    initialState: ledgerState({ generation: 8, activeLeases: [item] }),
  });
  const service = createD013Service({ github, sleepFn: async () => {} });
  const result = await service.release({
    packet_ref: PACKET_REF,
    expected_generation: 8,
    lease_id: 'b'.repeat(64),
  });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.reasonCodes.includes('ACTIVE_LEASE_NOT_FOUND'));
  assert.equal(github.dispatchCount, 0);
});

test('valid release dispatches once and requires lease absence readback', async () => {
  const item = expectedLease();
  const initial = ledgerState({ generation: 8, activeLeases: [item] });
  const after = ledgerState({
    generation: 9,
    activeLeases: [],
    lastRelease: { leaseId: item.leaseId, releasedAtGeneration: 9 },
  });
  const github = new FakeGitHub({ initialState: initial, afterState: after });
  github.readJobLog = async function () {
    return taskLog(this.workflowInputs, item.leaseId, 9, 'RELEASE_UPDATED');
  };
  const service = createD013Service({ github, sleepFn: async () => {} });
  const result = await service.release({
    packet_ref: PACKET_REF,
    expected_generation: 8,
    lease_id: item.leaseId,
  });
  assert.equal(result.status, 'DISPATCH_COMPLETE');
  assert.equal(result.observedGeneration, 9);
  assert.equal(result.leaseId, item.leaseId);
  assert.equal(github.dispatchCount, 1);
});

test('missing dedicated credential blocks before network and generic token names are absent', async () => {
  let calls = 0;
  const service = createD013Service({
    token: '',
    fetchImpl: async () => {
      calls += 1;
      throw new Error('must not run');
    },
  });
  const result = await service.acquire(acquireArgs(7));
  assert.equal(result.status, 'BLOCKED_CAPABILITY');
  assert.ok(result.reasonCodes.includes('DEDICATED_D013_CREDENTIAL_UNAVAILABLE'));
  assert.equal(calls, 0);
});

async function listeningServer(options = {}) {
  const server = createD013Server(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  return { server, base: `http://127.0.0.1:${port}` };
}

function rpc(id, method, params = undefined) {
  return {
    jsonrpc: '2.0',
    id,
    method,
    ...(params === undefined ? {} : { params }),
  };
}

async function post(base, value) {
  const response = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'mcp-protocol-version': '2025-06-18',
    },
    body: typeof value === 'string' ? value : JSON.stringify(value),
  });
  return { response, body: await response.json() };
}

test('HTTP MCP lists exactly two bounded tools and health is credential-free', async (t) => {
  const stub = {
    acquire: async () => ({ status: 'DISPATCH_COMPLETE' }),
    release: async () => ({ status: 'DISPATCH_COMPLETE' }),
  };
  const { server, base } = await listeningServer({ service: stub });
  t.after(() => server.close());

  const health = await fetch(`${base}/healthz`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).service, 'mcl-task-lease-dispatch-mcp');

  const init = await post(base, rpc(1, 'initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'fixture', version: '1' },
  }));
  assert.equal(init.body.result.protocolVersion, '2025-06-18');

  const listed = await post(base, rpc(2, 'tools/list'));
  assert.deepEqual(
    listed.body.result.tools.map((item) => item.name),
    ['d013_acquire', 'd013_release']
  );
});

test('MCP rejects unknown acquire fields before service invocation', async (t) => {
  let calls = 0;
  const stub = {
    acquire: async () => { calls += 1; return { status: 'DISPATCH_COMPLETE' }; },
    release: async () => ({ status: 'DISPATCH_COMPLETE' }),
  };
  const { server, base } = await listeningServer({ service: stub });
  t.after(() => server.close());

  const result = await post(base, rpc(1, 'tools/call', {
    name: 'd013_acquire',
    arguments: { ...acquireArgs(), repository: 'other/repo' },
  }));
  assert.equal(result.body.error.code, -32602);
  assert.equal(calls, 0);
});

test('shared effect limiter blocks the fourth tool effect without invoking service', async (t) => {
  let calls = 0;
  const stub = {
    acquire: async () => {
      calls += 1;
      return { status: 'DISPATCH_COMPLETE', reasonCodes: [] };
    },
    release: async () => {
      calls += 1;
      return { status: 'DISPATCH_COMPLETE', reasonCodes: [] };
    },
  };
  const { server, base } = await listeningServer({
    service: stub,
    effectMaxPerWindow: 3,
    effectWindowMs: 60000,
  });
  t.after(() => server.close());

  for (let i = 0; i < 3; i += 1) {
    const result = await post(base, rpc(i + 1, 'tools/call', {
      name: 'd013_acquire',
      arguments: acquireArgs(),
    }));
    assert.equal(result.body.result.structuredContent.status, 'DISPATCH_COMPLETE');
  }
  const fourth = await post(base, rpc(4, 'tools/call', {
    name: 'd013_acquire',
    arguments: acquireArgs(),
  }));
  assert.equal(
    fourth.body.result.structuredContent.reasonCodes[0],
    'D013_EFFECT_RATE_LIMITED'
  );
  assert.equal(calls, 3);
});

test('source binds existing operator and contains no generic credential or arbitrary transport surface', async () => {
  const { readFile } = await import('node:fs/promises');
  const core = await readFile(new URL('../src/core.mjs', import.meta.url), 'utf8');
  const server = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
  assert.ok(core.includes(OPERATOR_PATH));
  assert.ok(core.includes('operatorImpl.planAcquire'));
  assert.ok(core.includes('operatorImpl.planRelease'));
  assert.ok(core.includes('operator.readContext'));
  assert.equal(core.includes('process.env.GITHUB_TOKEN'), false);
  assert.equal(core.includes('process.env.GH_TOKEN'), false);
  assert.equal(core.includes('gh auth token'), false);
  assert.equal(server.includes('repository:'), false);
  assert.equal(server.includes('workflow:'), false);
  assert.equal(server.includes('command:'), false);
});
