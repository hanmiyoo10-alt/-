'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const operator = require('../mcl-coordination-operator.cjs');
const lease = require('../task-lease.cjs');
const handoff = require('../task-handoff.cjs');

let count = 0;
async function test(name, fn) {
  await fn();
  count += 1;
  process.stdout.write(`ok ${count} - ${name}\n`);
}

function packetBody(state = 'IN_PROGRESS') {
  return `<!-- canonical-main-work-packet:v1 -->\n\n## State\n${state}\n`;
}

function ledgerState(generation = 7, activeLeases = []) {
  return {
    schemaVersion: 1, scope: 'chatgpt-mobile-coder-lab', mode: 'MCL_TASK_LEASE_LEDGER', status: 'ACTIVE',
    generation, controllerPath: lease.CONTROLLER_PATH, controllerCommit: 'a'.repeat(40),
    packetRef: lease.OWNER_PACKET_REF, activeLeases, lastRelease: null,
  };
}
function fakeClient({body = packetBody(), state = ledgerState()} = {}) {
  const calls = [];
  return {
    calls,
    async api(endpoint, options) {
      calls.push({endpoint, options});
      if (endpoint === '/issues/2378') return {state: 'open', body};
      if (endpoint === '/issues/2352') return {state: 'open', body: lease.renderLedger(state)};
      throw new Error(`unexpected endpoint ${endpoint}`);
    },
  };
}

function acquireArgs(overrides = {}) {
  return {
    packetRef: '#2378', route: 'S', executor: 'S',
    scopes: ['path:products/chatgpt-mobile-coder-lab/coordination/mcl-coordination-operator.cjs'],
    scopeDisposition: 'DISJOINT', workspaceKind: 'repository',
    branch: 'server/coordination-operator-2378',
    worktree: '/root/nyang-worktrees/coordination-operator-2378',
    observedBaseSha: 'b'.repeat(40), ...overrides,
  };
}

function activeReleaseFixture({generation = 7, body = packetBody()} = {}) {
  const request = {expectedGeneration: generation, ...acquireArgs(), packetBodySha256: lease.digest(body)};
  const acquired = lease.planAcquire(ledgerState(generation), request);
  const state = lease.parseLedger(acquired.updatedBody).state;
  return {body, leaseId: acquired.leaseId, state};
}

function dynamicClient({body = packetBody(), states}) {
  let ledgerReads = 0;
  return {
    async api(endpoint) {
      if (endpoint === '/issues/2378') return {state: 'open', body};
      if (endpoint === '/issues/2352') {
        const state = states[Math.min(ledgerReads, states.length - 1)];
        ledgerReads += 1;
        return {state: 'open', body: lease.renderLedger(state)};
      }
      throw new Error(`unexpected endpoint ${endpoint}`);
    },
  };
}

function failedRunRunner({runId = 501, packetRef = '#2378', leaseId,
  event = 'workflow_dispatch', workflowName = 'MCL Task Lease',
  status = 'completed', conclusion = 'failure',
  operation = 'release', transient = true, packetOverride = packetRef,
  leaseOverride = leaseId, viewCode = 0, logCode = 0, rawMarker = ''} = {}) {
  const calls = [];
  const runner = (args) => {
    calls.push(args);
    if (args[0] === 'run' && args[1] === 'view' && args.includes('--json')) {
      return {code: viewCode, stdout: viewCode === 0 ? JSON.stringify({
        databaseId: runId, event, workflowName, status, conclusion,
      }) : '', stderr: rawMarker};
    }
    if (args[0] === 'run' && args[1] === 'view' && args.includes('--log')) {
      const log = [
        `MCL_LEASE_OPERATION: ${operation}`,
        `MCL_LEASE_PACKET_REF: ${packetOverride}`,
        `MCL_LEASE_ID: ${leaseOverride}`,
        transient ? 'mcl-task-lease fatal: fetch failed' : 'mcl-task-lease fatal: semantic failure',
        rawMarker,
      ].join('\n');
      return {code: logCode, stdout: logCode === 0 ? log : '', stderr: rawMarker};
    }
    throw new Error(`unexpected runner args ${args.join(' ')}`);
  };
  return {calls, runner};
}

function dispatchRunInfo(runId, {status = 'completed', conclusion = 'success'} = {}) {
  return JSON.stringify({
    databaseId: runId,
    event: 'workflow_dispatch',
    workflowName: 'MCL Task Lease',
    status,
    conclusion,
  });
}

function dispatchLog(plan, {
  resultLeaseId = plan.leaseId,
  generation = 8,
  resultStatus = plan.operation === 'acquire' ? 'ACQUIRE_UPDATED' : 'RELEASE_UPDATED',
  includeResult = true,
  overrides = {},
} = {}) {
  const names = {
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
  const inputs = {...plan.workflowInputs, ...overrides};
  const lines = Object.entries(inputs).map(([key, value]) =>
    `${names[key]}: ${String(value ?? '')}`);
  if (includeResult) {
    lines.push(JSON.stringify({
      schemaVersion: 1,
      mode: 'MCL_TASK_LEASE',
      status: resultStatus,
      changed: true,
      generation,
      leaseId: resultLeaseId,
      reasonCodes: [],
    }));
  }
  return lines.join('\n');
}

function manifestInput() {
  return {
    schemaVersion: 1, mode: 'MCL_TASK_MANIFEST', packetRef: '#2378', packetBodySha256: 'c'.repeat(64),
    phaseId: 'implementation-pr', phaseClass: 'REPOSITORY_MUTATION', route: 'S', executor: 'S',
    scopes: ['path:products/chatgpt-mobile-coder-lab/coordination/mcl-coordination-operator.cjs'],
    workspace: {kind: 'repository', branch: 'server/coordination-operator-2378', worktree: '/root/nyang-worktrees/coordination-operator-2378'},
    observedBaseSha: 'b'.repeat(40), leaseRequirement: 'REQUIRED',
    leaseEvidence: {ledgerRef: '#2352', leaseId: 'd'.repeat(64), acquiredGeneration: 8, acquireEvidenceRef: 'run:1'},
    sourceAuthorityRefs: ['#2378'], inputRefs: ['doc:products/chatgpt-mobile-coder-lab/docs/task-handoff.md'],
    expectedOutputRefs: ['pr:#2379'], acceptanceRefs: ['#2378'],
    stopCondition: 'Open a bounded PR and release the lease.', authority: {...handoff.AUTHORITY_FLAGS},
  };
}

(async () => {
  await test('packet hashing preserves terminal newline exactly', async () => {
    const a = fakeClient({body: packetBody()});
    const b = fakeClient({body: `${packetBody()}\n`});
    const left = await operator.readContext({client: a, packetRef: '#2378'});
    const right = await operator.readContext({client: b, packetRef: '#2378'});
    assert.notEqual(left.packetBodySha256, right.packetBodySha256);
    assert.equal(left.packetBodySha256, crypto.createHash('sha256').update(packetBody()).digest('hex'));
  });

  await test('inspect reports current generation and matching lease without writes', async () => {
    const base = ledgerState();
    const request = {expectedGeneration: 7, ...acquireArgs(), packetBodySha256: lease.digest(packetBody())};
    const planned = lease.planAcquire(base, request);
    const state = lease.parseLedger(planned.updatedBody).state;
    const client = fakeClient({state});
    const result = await operator.readContext({client, packetRef: '#2378'});
    assert.equal(result.ledgerGeneration, 8);
    assert.deepEqual(result.matchingLeaseIds, [planned.leaseId]);
    assert(client.calls.every((call) => call.options === undefined));
  });
  await test('invalid and duplicate scopes fail before dispatch', async () => {
    assert.equal(operator.normalizeRequestedScopes(['not-a-scope']).ok, false);
    assert.deepEqual(operator.normalizeRequestedScopes(['path:a', 'path:a']).reasonCodes, ['REQUEST_SCOPE_DUPLICATE']);
  });

  await test('missing lifecycle preserves PACKET_LIFECYCLE_UNKNOWN', async () => {
    const client = fakeClient({body: '<!-- canonical-main-work-packet:v1 -->\n\n## State\nstage-only\n'});
    const result = await operator.readContext({client, packetRef: '#2378'});
    assert.equal(result.status, 'BLOCKED');
    assert(result.reasonCodes.includes('PACKET_LIFECYCLE_UNKNOWN'));
  });

  await test('acquire plan contains exact fresh normalized workflow inputs', async () => {
    const client = fakeClient();
    const result = await operator.planAcquire({client, ...acquireArgs()});
    assert.equal(result.status, 'PLAN_READY');
    assert.equal(result.ledgerGeneration, 7);
    assert.equal(result.workflowInputs.packet_ref, '#2378');
    assert.equal(result.workflowInputs.expected_generation, '7');
    assert.equal(result.workflowInputs.scope_disposition, 'DISJOINT');
    assert.equal(result.workflowInputs.scopes_json, JSON.stringify(acquireArgs().scopes));
    assert.equal(result.workflowInputs.observed_base_sha, 'b'.repeat(40));
    assert(client.calls.every((call) => call.options === undefined));
  });

  await test('release plan rejects packet and lease identity mismatch', async () => {
    const request = {expectedGeneration: 7, ...acquireArgs({packetRef: '#9999'}), packetBodySha256: 'e'.repeat(64)};
    const planned = lease.planAcquire(ledgerState(), request);
    const state = lease.parseLedger(planned.updatedBody).state;
    const client = fakeClient({state});
    const result = await operator.planRelease({client, packetRef: '#2378', leaseId: planned.leaseId});
    assert.equal(result.status, 'CONFLICT');
    assert(result.reasonCodes.includes('LEASE_PACKET_IDENTITY_MISMATCH'));
  });

  await test('dispatch argv pins explicit repository, workflow, and main ref', async () => {
    const args = operator.buildDispatchArgs('hanmiyoo10-alt/-', {operation: 'release', expected_generation: '9', packet_ref: '#2378', lease_id: 'f'.repeat(64)});
    assert.deepEqual(args.slice(0, 7), ['workflow', 'run', 'mcl-task-lease.yml', '--repo', 'hanmiyoo10-alt/-', '--ref', 'main']);
    assert(args.includes('operation=release'));
    assert(!args.includes('--shell'));
  });

  await test('failed stale workflow is surfaced without semantic auto retry', async () => {
    const calls = [];
    let listCount = 0;
    const runner = (args) => {
      calls.push(args);
      if (args[0] === 'run' && args[1] === 'list') {
        listCount += 1;
        const runs = listCount === 1 ? [] : [{databaseId: 91, headSha: 'a'.repeat(40), status: 'completed', conclusion: 'failure', createdAt: '2026-09-17T00:00:00Z'}];
        return {code: 0, stdout: JSON.stringify(runs), stderr: ''};
      }
      if (args[0] === 'workflow') return {code: 0, stdout: '', stderr: ''};
      if (args[0] === 'run' && args[1] === 'watch') return {code: 1, stdout: '', stderr: ''};
      if (args[0] === 'run' && args[1] === 'view' && args.includes('--json')) {
        return {code: 0, stdout: dispatchRunInfo(91, {conclusion: 'failure'}), stderr: ''};
      }
      if (args[0] === 'run' && args[1] === 'view' && args.includes('--log')) {
        return {code: 0, stdout: dispatchLog(plan, {includeResult: false}), stderr: ''};
      }
      throw new Error(`unexpected runner args ${args.join(' ')}`);
    };
    const plan = {status: 'PLAN_READY', operation: 'acquire', leaseId: 'f'.repeat(64),
      workflowInputs: {operation: 'acquire', packet_ref: '#2378'}};
    const result = await operator.dispatchPlan({repo: 'hanmiyoo10-alt/-', plan,
      client: fakeClient(), runner, sleepFn: () => {}, maxPolls: 1});
    assert.equal(result.status, 'DISPATCH_FAILED');
    assert(result.reasonCodes.includes('WORKFLOW_FAILED_NO_AUTO_RETRY'));
    assert.equal(calls.filter((args) => args[0] === 'workflow' && args[1] === 'run').length, 1);
  });

  await test('release recovery rejects missing failed-run id before effect', async () => {
    const fixture = activeReleaseFixture();
    let runnerCalls = 0;
    const result = await operator.planReleaseRecovery({
      repo: 'hanmiyoo10-alt/-',
      client: fakeClient({body: fixture.body, state: fixture.state}),
      runner: () => { runnerCalls += 1; throw new Error('runner must not execute'); },
      packetRef: '#2378', leaseId: fixture.leaseId, failedRunId: null,
    });
    assert.equal(result.status, 'BLOCKED');
    assert(result.reasonCodes.includes('RECOVERY_FAILED_RUN_ID_INVALID'));
    assert.equal(runnerCalls, 0);
  });

  await test('lease-release-recover CLI exposes only a fresh bounded recovery plan', async () => {
    const fixture = activeReleaseFixture();
    const calls = [];
    const runner = (args) => {
      calls.push(args);
      if (args[0] === 'api') {
        if (args[1] === 'repos/hanmiyoo10-alt/-/issues/2378') {
          return {code: 0, stdout: JSON.stringify({state: 'open', body: fixture.body}), stderr: ''};
        }
        if (args[1] === 'repos/hanmiyoo10-alt/-/issues/2352') {
          return {code: 0, stdout: JSON.stringify({state: 'open', body: lease.renderLedger(fixture.state)}), stderr: ''};
        }
      }
      if (args[0] === 'run' && args[1] === 'view' && args.includes('--json')) {
        return {code: 0, stdout: JSON.stringify({
          databaseId: 501, event: 'workflow_dispatch', workflowName: 'MCL Task Lease',
          status: 'completed', conclusion: 'failure',
        }), stderr: ''};
      }
      if (args[0] === 'run' && args[1] === 'view' && args.includes('--log')) {
        return {code: 0, stdout: [
          'MCL_LEASE_OPERATION: release',
          'MCL_LEASE_PACKET_REF: #2378',
          `MCL_LEASE_ID: ${fixture.leaseId}`,
          'mcl-task-lease fatal: fetch failed',
        ].join('\n'), stderr: ''};
      }
      throw new Error(`unexpected runner args ${args.join(' ')}`);
    };
    const result = await operator.runCli([
      'lease-release-recover', '--repo', 'hanmiyoo10-alt/-', '--packet', '#2378',
      '--lease-id', fixture.leaseId, '--failed-run-id', '501',
    ], {}, {runner});
    assert.equal(result.code, 0);
    const parsed = JSON.parse(result.text);
    assert.equal(parsed.status, 'PLAN_READY');
    assert.equal(parsed.recoveryOfRunId, 501);
    assert.equal(parsed.workflowInputs.expected_generation, String(fixture.state.generation));
    assert.equal(calls.filter((args) => args[0] === 'workflow').length, 0);
  });

  await test('release recovery accepts only exact transient failed-run evidence without leaking raw log', async () => {
    const fixture = activeReleaseFixture();
    const bad = failedRunRunner({leaseId: fixture.leaseId, transient: false, rawMarker: 'PRIVATE_LOG_MARKER'});
    const rejected = operator.readFailedReleaseEvidence({
      repo: 'hanmiyoo10-alt/-', failedRunId: 501, packetRef: '#2378',
      leaseId: fixture.leaseId, runner: bad.runner,
    });
    assert.equal(rejected.status, 'BLOCKED');
    assert(rejected.reasonCodes.includes('RECOVERY_FAILURE_CLASS_NOT_ELIGIBLE'));
    assert(!JSON.stringify(rejected).includes('PRIVATE_LOG_MARKER'));

    const mismatch = failedRunRunner({leaseId: fixture.leaseId, packetOverride: '#9999'});
    const mismatchResult = operator.readFailedReleaseEvidence({
      repo: 'hanmiyoo10-alt/-', failedRunId: 501, packetRef: '#2378',
      leaseId: fixture.leaseId, runner: mismatch.runner,
    });
    assert.equal(mismatchResult.status, 'BLOCKED');
    assert(mismatchResult.reasonCodes.includes('RECOVERY_FAILED_RUN_PACKET_MISMATCH'));
  });

  await test('release recovery rejects non-workflow or non-failed run evidence', async () => {
    const fixture = activeReleaseFixture();
    const wrongEvent = failedRunRunner({leaseId: fixture.leaseId, event: 'push'});
    const eventResult = operator.readFailedReleaseEvidence({
      repo: 'hanmiyoo10-alt/-', failedRunId: 501, packetRef: '#2378',
      leaseId: fixture.leaseId, runner: wrongEvent.runner,
    });
    assert.equal(eventResult.status, 'BLOCKED');
    assert(eventResult.reasonCodes.includes('RECOVERY_FAILED_RUN_EVENT_MISMATCH'));

    const wrongWorkflow = failedRunRunner({leaseId: fixture.leaseId, workflowName: 'Other Workflow'});
    const workflowResult = operator.readFailedReleaseEvidence({
      repo: 'hanmiyoo10-alt/-', failedRunId: 501, packetRef: '#2378',
      leaseId: fixture.leaseId, runner: wrongWorkflow.runner,
    });
    assert.equal(workflowResult.status, 'BLOCKED');
    assert(workflowResult.reasonCodes.includes('RECOVERY_FAILED_RUN_WORKFLOW_MISMATCH'));

    const successfulRun = failedRunRunner({leaseId: fixture.leaseId, conclusion: 'success'});
    const successResult = operator.readFailedReleaseEvidence({
      repo: 'hanmiyoo10-alt/-', failedRunId: 501, packetRef: '#2378',
      leaseId: fixture.leaseId, runner: successfulRun.runner,
    });
    assert.equal(successResult.status, 'BLOCKED');
    assert(successResult.reasonCodes.includes('RECOVERY_FAILED_RUN_NOT_COMPLETED_FAILURE'));
  });

  await test('release recovery does not bypass terminal packet semantics', async () => {
    const fixture = activeReleaseFixture();
    const failed = failedRunRunner({leaseId: fixture.leaseId});
    const result = await operator.planReleaseRecovery({
      repo: 'hanmiyoo10-alt/-',
      client: fakeClient({body: packetBody('DONE'), state: fixture.state}),
      runner: failed.runner, packetRef: '#2378', leaseId: fixture.leaseId, failedRunId: 501,
    });
    assert.equal(result.status, 'BLOCKED');
    assert(result.reasonCodes.includes('PACKET_TERMINAL'));
  });

  await test('release recovery replans from fresh generation when exact lease identity remains active', async () => {
    const fixture = activeReleaseFixture();
    const advanced = {...fixture.state, generation: 12};
    const failed = failedRunRunner({leaseId: fixture.leaseId});
    const result = await operator.planReleaseRecovery({
      repo: 'hanmiyoo10-alt/-', client: fakeClient({body: fixture.body, state: advanced}),
      runner: failed.runner, packetRef: '#2378', leaseId: fixture.leaseId, failedRunId: 501,
    });
    assert.equal(result.status, 'PLAN_READY');
    assert.equal(result.recoveryOfRunId, 501);
    assert.equal(result.ledgerGeneration, 12);
    assert.equal(result.workflowInputs.expected_generation, '12');
    assert.equal(result.workflowInputs.lease_id, fixture.leaseId);
    assert(result.reasonCodes.includes('RECOVERY_TRANSIENT_FETCH_FAILURE_PROVEN'));
  });

  await test('release recovery blocks packet digest drift before recovery dispatch', async () => {
    const fixture = activeReleaseFixture();
    const failed = failedRunRunner({leaseId: fixture.leaseId});
    const result = await operator.planReleaseRecovery({
      repo: 'hanmiyoo10-alt/-',
      client: fakeClient({body: `${fixture.body}\n## Note\nnew semantic body\n`, state: fixture.state}),
      runner: failed.runner, packetRef: '#2378', leaseId: fixture.leaseId, failedRunId: 501,
    });
    assert.equal(result.status, 'BLOCKED');
    assert(result.reasonCodes.includes('RECOVERY_PACKET_DIGEST_DRIFT'));
  });

  await test('release recovery is a no-op when exact lease is already released', async () => {
    const fixture = activeReleaseFixture();
    const releasedPlan = lease.planRelease(fixture.state, {
      expectedGeneration: fixture.state.generation, leaseId: fixture.leaseId, packetRef: '#2378',
    });
    const released = lease.parseLedger(releasedPlan.updatedBody).state;
    const failed = failedRunRunner({leaseId: fixture.leaseId});
    const plan = await operator.planReleaseRecovery({
      repo: 'hanmiyoo10-alt/-', client: fakeClient({body: fixture.body, state: released}),
      runner: failed.runner, packetRef: '#2378', leaseId: fixture.leaseId, failedRunId: 501,
    });
    assert.equal(plan.status, 'RECOVERY_COMPLETE');
    assert(plan.reasonCodes.includes('LEASE_ALREADY_RELEASED'));
    let dispatchCalls = 0;
    const result = await operator.dispatchRecoveryPlan({
      repo: 'hanmiyoo10-alt/-', plan, client: fakeClient({body: fixture.body, state: released}),
      runner: () => { dispatchCalls += 1; throw new Error('must not dispatch'); },
    });
    assert.equal(result.status, 'RECOVERY_COMPLETE');
    assert.equal(dispatchCalls, 0);
  });

  await test('failed recovery dispatch stops after exactly one new workflow dispatch', async () => {
    const fixture = activeReleaseFixture();
    const failedEvidence = failedRunRunner({leaseId: fixture.leaseId});
    const plan = await operator.planReleaseRecovery({
      repo: 'hanmiyoo10-alt/-', client: fakeClient({body: fixture.body, state: fixture.state}),
      runner: failedEvidence.runner, packetRef: '#2378', leaseId: fixture.leaseId, failedRunId: 501,
    });
    let listCount = 0;
    const calls = [];
    const runner = (args) => {
      calls.push(args);
      if (args[0] === 'run' && args[1] === 'list') {
        listCount += 1;
        return {code: 0, stdout: JSON.stringify(listCount === 1 ? [] : [
          {databaseId: 601, status: 'completed', conclusion: 'failure'},
        ]), stderr: ''};
      }
      if (args[0] === 'workflow' && args[1] === 'run') return {code: 0, stdout: '', stderr: ''};
      if (args[0] === 'run' && args[1] === 'watch') return {code: 1, stdout: '', stderr: ''};
      if (args[0] === 'run' && args[1] === 'view' && args.includes('--json')) {
        return {code: 0, stdout: dispatchRunInfo(601, {conclusion: 'failure'}), stderr: ''};
      }
      if (args[0] === 'run' && args[1] === 'view' && args.includes('--log')) {
        return {code: 0, stdout: dispatchLog(plan, {includeResult: false}), stderr: ''};
      }
      throw new Error(`unexpected runner args ${args.join(' ')}`);
    };
    const result = await operator.dispatchRecoveryPlan({
      repo: 'hanmiyoo10-alt/-', plan,
      client: fakeClient({body: fixture.body, state: fixture.state}),
      runner, sleepFn: () => {}, maxPolls: 1,
    });
    assert.equal(result.status, 'DISPATCH_FAILED');
    assert.equal(result.recoveryOfRunId, 501);
    assert.equal(result.recoveryRunId, 601);
    assert.equal(calls.filter((args) => args[0] === 'workflow' && args[1] === 'run').length, 1);
  });

  await test('successful release recovery dispatches once and requires exact readback', async () => {
    const fixture = activeReleaseFixture();
    const failedEvidence = failedRunRunner({leaseId: fixture.leaseId});
    const plan = await operator.planReleaseRecovery({
      repo: 'hanmiyoo10-alt/-', client: fakeClient({body: fixture.body, state: fixture.state}),
      runner: failedEvidence.runner, packetRef: '#2378', leaseId: fixture.leaseId, failedRunId: 501,
    });
    const releasedPlan = lease.planRelease(fixture.state, {
      expectedGeneration: fixture.state.generation, leaseId: fixture.leaseId, packetRef: '#2378',
    });
    const released = lease.parseLedger(releasedPlan.updatedBody).state;
    let listCount = 0;
    const calls = [];
    const runner = (args) => {
      calls.push(args);
      if (args[0] === 'run' && args[1] === 'list') {
        listCount += 1;
        return {code: 0, stdout: JSON.stringify(listCount === 1 ? [] : [
          {databaseId: 602, status: 'completed', conclusion: 'success'},
        ]), stderr: ''};
      }
      if (args[0] === 'workflow' && args[1] === 'run') return {code: 0, stdout: '', stderr: ''};
      if (args[0] === 'run' && args[1] === 'watch') return {code: 0, stdout: '', stderr: ''};
      if (args[0] === 'run' && args[1] === 'view' && args.includes('--json')) {
        return {code: 0, stdout: dispatchRunInfo(602), stderr: ''};
      }
      if (args[0] === 'run' && args[1] === 'view' && args.includes('--log')) {
        return {code: 0, stdout: dispatchLog(plan, {
          generation: released.generation, resultStatus: 'RELEASE_UPDATED',
        }), stderr: ''};
      }
      throw new Error(`unexpected runner args ${args.join(' ')}`);
    };
    const result = await operator.dispatchRecoveryPlan({
      repo: 'hanmiyoo10-alt/-', plan,
      client: fakeClient({body: fixture.body, state: released}),
      runner, sleepFn: () => {}, maxPolls: 1,
    });
    assert.equal(result.status, 'DISPATCH_COMPLETE');
    assert.equal(result.recoveryOfRunId, 501);
    assert.equal(result.recoveryRunId, 602);
    assert.equal(result.leaseId, fixture.leaseId);
    assert.equal(calls.filter((args) => args[0] === 'workflow' && args[1] === 'run').length, 1);
  });

  await test('successful workflow run must prove exact lease identity in log', async () => {
    const request = {expectedGeneration: 7, ...acquireArgs(), packetBodySha256: lease.digest(packetBody())};
    const acquired = lease.planAcquire(ledgerState(), request);
    const state = lease.parseLedger(acquired.updatedBody).state;
    const plan = {status: 'PLAN_READY', operation: 'acquire', leaseId: acquired.leaseId,
      workflowInputs: {operation: 'acquire', packet_ref: '#2378'}};
    let listCount = 0;
    const runner = (args) => {
      if (args[0] === 'run' && args[1] === 'list') {
        listCount += 1;
        const runs = listCount === 1 ? [] : [{databaseId: 92, status: 'completed', conclusion: 'success'}];
        return {code: 0, stdout: JSON.stringify(runs), stderr: ''};
      }
      if (args[0] === 'workflow') return {code: 0, stdout: '', stderr: ''};
      if (args[0] === 'run' && args[1] === 'watch') return {code: 0, stdout: '', stderr: ''};
      if (args[0] === 'run' && args[1] === 'view' && args.includes('--json')) {
        return {code: 0, stdout: dispatchRunInfo(92), stderr: ''};
      }
      if (args[0] === 'run' && args[1] === 'view' && args.includes('--log')) {
        return {code: 0, stdout: dispatchLog(plan, {
          resultLeaseId: '0'.repeat(64), generation: 8,
        }), stderr: ''};
      }
      throw new Error(`unexpected runner args ${args.join(' ')}`);
    };
    const result = await operator.dispatchPlan({repo: 'hanmiyoo10-alt/-', plan,
      client: fakeClient({state}), runner, sleepFn: () => {}, maxPolls: 1});
    assert.equal(result.status, 'UNKNOWN');
    assert(result.reasonCodes.includes('DISPATCH_RUN_ATTRIBUTION_UNRESOLVED'));
  });

  await test('successful workflow run completes only with matching lease log and readback', async () => {
    const request = {expectedGeneration: 7, ...acquireArgs(), packetBodySha256: lease.digest(packetBody())};
    const acquired = lease.planAcquire(ledgerState(), request);
    const state = lease.parseLedger(acquired.updatedBody).state;
    const plan = {status: 'PLAN_READY', operation: 'acquire', leaseId: acquired.leaseId,
      workflowInputs: {operation: 'acquire', packet_ref: '#2378'}};
    let listCount = 0;
    const runner = (args) => {
      if (args[0] === 'run' && args[1] === 'list') {
        listCount += 1;
        const runs = listCount === 1 ? [] : [{databaseId: 93, status: 'completed', conclusion: 'success'}];
        return {code: 0, stdout: JSON.stringify(runs), stderr: ''};
      }
      if (args[0] === 'workflow') return {code: 0, stdout: '', stderr: ''};
      if (args[0] === 'run' && args[1] === 'watch') return {code: 0, stdout: '', stderr: ''};
      if (args[0] === 'run' && args[1] === 'view' && args.includes('--json')) {
        return {code: 0, stdout: dispatchRunInfo(93), stderr: ''};
      }
      if (args[0] === 'run' && args[1] === 'view' && args.includes('--log')) {
        return {code: 0, stdout: dispatchLog(plan, {generation: 8}), stderr: ''};
      }
      throw new Error(`unexpected runner args ${args.join(' ')}`);
    };
    const result = await operator.dispatchPlan({repo: 'hanmiyoo10-alt/-', plan,
      client: fakeClient({state}), runner, sleepFn: () => {}, maxPolls: 1});
    assert.equal(result.status, 'DISPATCH_COMPLETE');
    assert.equal(result.runId, 93);
  });

  await test('zero fresh acquire run reconciles only exact plus-one ledger effect without redispatch', async () => {
    const body = packetBody();
    const request = {expectedGeneration: 7, ...acquireArgs(), packetBodySha256: lease.digest(body)};
    const acquired = lease.planAcquire(ledgerState(), request);
    const state = lease.parseLedger(acquired.updatedBody).state;
    const plan = {status: 'PLAN_READY', operation: 'acquire', ledgerGeneration: 7,
      leaseId: acquired.leaseId, workflowInputs: {
        operation: 'acquire', packet_ref: '#2378', packet_body_sha256: lease.digest(body),
      }};
    let dispatchCalls = 0;
    const runner = (argv) => {
      if (argv[0] === 'run' && argv[1] === 'list') return {code: 0, stdout: '[]', stderr: ''};
      if (argv[0] === 'workflow') { dispatchCalls += 1; return {code: 0, stdout: '', stderr: ''}; }
      throw new Error(`unexpected runner args ${argv.join(' ')}`);
    };
    const client = fakeClient({body, state});
    const result = await operator.dispatchPlan({repo: 'hanmiyoo10-alt/-', plan,
      client, runner, sleepFn: () => {}, maxPolls: 1});
    assert.equal(result.status, 'DISPATCH_READBACK_COMPLETE');
    assert.equal(result.runId, null);
    assert.equal(result.runConclusion, null);
    assert.equal(result.observedGeneration, 8);
    assert.equal(result.leaseId, acquired.leaseId);
    assert.equal(result.evidenceRef,
      `receipt:mcl-task-lease-readback:acquire:${acquired.leaseId}:generation:8`);
    assert.equal(dispatchCalls, 1);
    assert.equal(client.calls.length, 2);
  });

  await test('zero fresh release run reconciles only exact plus-one lastRelease evidence', async () => {
    const fixture = activeReleaseFixture();
    const releasedPlan = lease.planRelease(fixture.state, {
      expectedGeneration: fixture.state.generation, leaseId: fixture.leaseId, packetRef: '#2378',
    });
    const released = lease.parseLedger(releasedPlan.updatedBody).state;
    const plan = {status: 'PLAN_READY', operation: 'release',
      ledgerGeneration: fixture.state.generation, leaseId: fixture.leaseId,
      workflowInputs: {operation: 'release', packet_ref: '#2378', lease_id: fixture.leaseId}};
    let dispatchCalls = 0;
    const runner = (argv) => {
      if (argv[0] === 'run' && argv[1] === 'list') return {code: 0, stdout: '[]', stderr: ''};
      if (argv[0] === 'workflow') { dispatchCalls += 1; return {code: 0, stdout: '', stderr: ''}; }
      throw new Error(`unexpected runner args ${argv.join(' ')}`);
    };
    const client = fakeClient({body: fixture.body, state: released});
    const result = await operator.dispatchPlan({repo: 'hanmiyoo10-alt/-', plan,
      client, runner, sleepFn: () => {}, maxPolls: 1});
    assert.equal(result.status, 'DISPATCH_READBACK_COMPLETE');
    assert.equal(result.runId, null);
    assert.equal(result.observedGeneration, released.generation);
    assert.equal(result.evidenceRef,
      `receipt:mcl-task-lease-readback:release:${fixture.leaseId}:generation:${released.generation}`);
    assert.equal(dispatchCalls, 1);
    assert.equal(client.calls.length, 2);
  });

  await test('zero fresh run generation jump remains original unknown', async () => {
    const body = packetBody();
    const request = {expectedGeneration: 7, ...acquireArgs(), packetBodySha256: lease.digest(body)};
    const acquired = lease.planAcquire(ledgerState(), request);
    const acquiredState = lease.parseLedger(acquired.updatedBody).state;
    const jumped = {...acquiredState, generation: 9};
    const plan = {status: 'PLAN_READY', operation: 'acquire', ledgerGeneration: 7,
      leaseId: acquired.leaseId, workflowInputs: {
        operation: 'acquire', packet_ref: '#2378', packet_body_sha256: lease.digest(body),
      }};
    const runner = (argv) => {
      if (argv[0] === 'run' && argv[1] === 'list') return {code: 0, stdout: '[]', stderr: ''};
      if (argv[0] === 'workflow') return {code: 0, stdout: '', stderr: ''};
      throw new Error(`unexpected runner args ${argv.join(' ')}`);
    };
    const result = await operator.dispatchPlan({repo: 'hanmiyoo10-alt/-', plan,
      client: fakeClient({body, state: jumped}), runner, sleepFn: () => {}, maxPolls: 1});
    assert.equal(result.status, 'UNKNOWN');
    assert(result.reasonCodes.includes('DISPATCH_RUN_NOT_FOUND'));
  });

  await test('fresh nonmatching run never enters zero-run ledger reconciliation', async () => {
    const plan = {status: 'PLAN_READY', operation: 'acquire', ledgerGeneration: 7,
      leaseId: 'f'.repeat(64), workflowInputs: {operation: 'acquire', packet_ref: '#2378'}};
    let listCount = 0;
    const client = fakeClient();
    const runner = (argv) => {
      if (argv[0] === 'run' && argv[1] === 'list') {
        listCount += 1;
        return {code: 0, stdout: JSON.stringify(listCount === 1 ? [] : [
          {databaseId: 140, status: 'completed', conclusion: 'success'},
        ]), stderr: ''};
      }
      if (argv[0] === 'workflow') return {code: 0, stdout: '', stderr: ''};
      if (argv[0] === 'run' && argv[1] === 'view' && argv.includes('--json')) {
        return {code: 0, stdout: dispatchRunInfo(140), stderr: ''};
      }
      if (argv[0] === 'run' && argv[1] === 'view' && argv.includes('--log')) {
        return {code: 0, stdout: 'MCL_LEASE_OPERATION: release\nMCL_LEASE_PACKET_REF: #2378', stderr: ''};
      }
      throw new Error(`unexpected runner args ${argv.join(' ')}`);
    };
    const result = await operator.dispatchPlan({repo: 'hanmiyoo10-alt/-', plan,
      client, runner, sleepFn: () => {}, maxPolls: 1});
    assert.equal(result.status, 'UNKNOWN');
    assert(result.reasonCodes.includes('DISPATCH_RUN_ATTRIBUTION_UNRESOLVED'));
    assert.equal(client.calls.length, 0);
  });

  await test('concurrent fresh acquire runs select only exact packet operation and result', async () => {
    const args = acquireArgs();
    const request = {expectedGeneration: 7, ...args, packetBodySha256: lease.digest(packetBody())};
    const acquired = lease.planAcquire(ledgerState(), request);
    const acquiredState = lease.parseLedger(acquired.updatedBody).state;
    const laterState = {...acquiredState, generation: 9};
    const plan = {status: 'PLAN_READY', operation: 'acquire', leaseId: acquired.leaseId, workflowInputs: {
      operation: 'acquire', expected_generation: '7', packet_ref: '#2378',
      packet_body_sha256: lease.digest(packetBody()), route: args.route, executor: args.executor,
      scopes_json: JSON.stringify(args.scopes), scope_disposition: args.scopeDisposition,
      workspace_kind: args.workspaceKind, branch: args.branch, worktree: args.worktree,
      observed_base_sha: args.observedBaseSha,
    }};
    const otherLease = 'e'.repeat(64);
    const other = {status: 'PLAN_READY', operation: 'release', leaseId: otherLease,
      workflowInputs: {operation: 'release', expected_generation: '7', packet_ref: '#9999', lease_id: otherLease}};
    let listCount = 0;
    const calls = [];
    const runner = (argv) => {
      calls.push(argv);
      if (argv[0] === 'run' && argv[1] === 'list') {
        listCount += 1;
        return {code: 0, stdout: JSON.stringify(listCount === 1 ? [] : [
          {databaseId: 101, status: 'completed', conclusion: 'success'},
          {databaseId: 102, status: 'completed', conclusion: 'success'},
        ]), stderr: ''};
      }
      if (argv[0] === 'workflow') return {code: 0, stdout: '', stderr: ''};
      if (argv[0] === 'run' && argv[1] === 'watch') return {code: 1, stdout: '', stderr: 'transport'};
      const runId = Number(argv[2]);
      if (argv[0] === 'run' && argv[1] === 'view' && argv.includes('--json')) {
        return {code: 0, stdout: dispatchRunInfo(runId), stderr: ''};
      }
      if (argv[0] === 'run' && argv[1] === 'view' && argv.includes('--log')) {
        return {code: 0, stdout: runId === 101
          ? dispatchLog(plan, {generation: 8})
          : dispatchLog(other, {generation: 8, resultStatus: 'RELEASE_UPDATED'}), stderr: ''};
      }
      throw new Error(`unexpected runner args ${argv.join(' ')}`);
    };
    const result = await operator.dispatchPlan({repo: 'hanmiyoo10-alt/-', plan,
      client: fakeClient({state: laterState}), runner, sleepFn: () => {}, maxPolls: 1});
    assert.equal(result.status, 'DISPATCH_COMPLETE');
    assert.equal(result.runId, 101);
    assert.equal(result.observedGeneration, 8);
    assert.equal(calls.filter((argv) => argv[0] === 'workflow' && argv[1] === 'run').length, 1);
  });

  await test('concurrent fresh release runs select only exact packet lease and result', async () => {
    const fixture = activeReleaseFixture();
    const releasedPlan = lease.planRelease(fixture.state, {
      expectedGeneration: fixture.state.generation, leaseId: fixture.leaseId, packetRef: '#2378',
    });
    const released = lease.parseLedger(releasedPlan.updatedBody).state;
    const plan = {status: 'PLAN_READY', operation: 'release', leaseId: fixture.leaseId,
      workflowInputs: {operation: 'release', expected_generation: String(fixture.state.generation),
        packet_ref: '#2378', lease_id: fixture.leaseId}};
    const unrelated = {status: 'PLAN_READY', operation: 'release', leaseId: 'e'.repeat(64),
      workflowInputs: {operation: 'release', expected_generation: String(fixture.state.generation),
        packet_ref: '#9999', lease_id: 'e'.repeat(64)}};
    let listCount = 0;
    const runner = (argv) => {
      if (argv[0] === 'run' && argv[1] === 'list') {
        listCount += 1;
        return {code: 0, stdout: JSON.stringify(listCount === 1 ? [] : [
          {databaseId: 111, status: 'completed', conclusion: 'success'},
          {databaseId: 112, status: 'completed', conclusion: 'success'},
        ]), stderr: ''};
      }
      if (argv[0] === 'workflow') return {code: 0, stdout: '', stderr: ''};
      if (argv[0] === 'run' && argv[1] === 'watch') return {code: 0, stdout: '', stderr: ''};
      const runId = Number(argv[2]);
      if (argv[0] === 'run' && argv[1] === 'view' && argv.includes('--json')) {
        return {code: 0, stdout: dispatchRunInfo(runId), stderr: ''};
      }
      if (argv[0] === 'run' && argv[1] === 'view' && argv.includes('--log')) {
        return {code: 0, stdout: runId === 111
          ? dispatchLog(plan, {generation: released.generation, resultStatus: 'RELEASE_UPDATED'})
          : dispatchLog(unrelated, {generation: released.generation, resultStatus: 'RELEASE_UPDATED'}), stderr: ''};
      }
      throw new Error(`unexpected runner args ${argv.join(' ')}`);
    };
    const result = await operator.dispatchPlan({repo: 'hanmiyoo10-alt/-', plan,
      client: fakeClient({state: released}), runner, sleepFn: () => {}, maxPolls: 1});
    assert.equal(result.status, 'DISPATCH_COMPLETE');
    assert.equal(result.runId, 111);
    assert.equal(result.observedGeneration, released.generation);
  });

  await test('two exact fresh candidates remain ambiguous without retry', async () => {
    const request = {expectedGeneration: 7, ...acquireArgs(), packetBodySha256: lease.digest(packetBody())};
    const acquired = lease.planAcquire(ledgerState(), request);
    const state = lease.parseLedger(acquired.updatedBody).state;
    const plan = {status: 'PLAN_READY', operation: 'acquire', leaseId: acquired.leaseId,
      workflowInputs: {operation: 'acquire', packet_ref: '#2378'}};
    let listCount = 0;
    let dispatchCalls = 0;
    const runner = (argv) => {
      if (argv[0] === 'run' && argv[1] === 'list') {
        listCount += 1;
        return {code: 0, stdout: JSON.stringify(listCount === 1 ? [] : [
          {databaseId: 121, status: 'completed', conclusion: 'success'},
          {databaseId: 122, status: 'completed', conclusion: 'success'},
        ]), stderr: ''};
      }
      if (argv[0] === 'workflow') { dispatchCalls += 1; return {code: 0, stdout: '', stderr: ''}; }
      const runId = Number(argv[2]);
      if (argv[0] === 'run' && argv[1] === 'view' && argv.includes('--json'))
        return {code: 0, stdout: dispatchRunInfo(runId), stderr: ''};
      if (argv[0] === 'run' && argv[1] === 'view' && argv.includes('--log'))
        return {code: 0, stdout: dispatchLog(plan, {generation: 8}), stderr: ''};
      throw new Error(`unexpected runner args ${argv.join(' ')}`);
    };
    const result = await operator.dispatchPlan({repo: 'hanmiyoo10-alt/-', plan,
      client: fakeClient({state}), runner, sleepFn: () => {}, maxPolls: 1});
    assert.equal(result.status, 'UNKNOWN');
    assert(result.reasonCodes.includes('DISPATCH_RUN_AMBIGUOUS'));
    assert.equal(dispatchCalls, 1);
  });

  await test('oversized exact candidate log remains unproven', async () => {
    const plan = {status: 'PLAN_READY', operation: 'acquire', leaseId: 'f'.repeat(64),
      workflowInputs: {operation: 'acquire', packet_ref: '#2378'}};
    let listCount = 0;
    const runner = (argv) => {
      if (argv[0] === 'run' && argv[1] === 'list') {
        listCount += 1;
        return {code: 0, stdout: JSON.stringify(listCount === 1 ? [] : [
          {databaseId: 131, status: 'completed', conclusion: 'success'},
        ]), stderr: ''};
      }
      if (argv[0] === 'workflow') return {code: 0, stdout: '', stderr: ''};
      if (argv[0] === 'run' && argv[1] === 'view' && argv.includes('--json'))
        return {code: 0, stdout: dispatchRunInfo(131), stderr: ''};
      if (argv[0] === 'run' && argv[1] === 'view' && argv.includes('--log'))
        return {code: 0, stdout: 'x'.repeat(64 * 1024 + 1), stderr: ''};
      throw new Error(`unexpected runner args ${argv.join(' ')}`);
    };
    const result = await operator.dispatchPlan({repo: 'hanmiyoo10-alt/-', plan,
      client: fakeClient(), runner, sleepFn: () => {}, maxPolls: 1});
    assert.equal(result.status, 'UNKNOWN');
    assert(result.reasonCodes.includes('DISPATCH_RUN_ATTRIBUTION_UNRESOLVED'));
  });

  await test('env token path preserves fetch client and does not invoke gh fallback', async () => {
    let runnerCalls = 0;
    const fetchImpl = async () => ({
      ok: true, status: 200,
      async json() { return {state: 'open', body: packetBody()}; },
      async text() { return ''; },
    });
    const client = operator.createOperatorGitHubClient({
      repo: 'hanmiyoo10-alt/-', env: {GH_TOKEN: 'fixture'},
      runner: () => { runnerCalls += 1; throw new Error('fallback must not run'); }, fetchImpl,
    });
    const issue = await client.api('/issues/2378');
    assert.equal(issue.state, 'open');
    assert.equal(runnerCalls, 0);
  });

  await test('no-env inspect uses only bounded authenticated gh issue reads', async () => {
    const calls = [];
    const runner = (args) => {
      calls.push(args);
      assert.deepEqual(args.slice(0, 2), ['api', args[1]]);
      assert.deepEqual(args.slice(2), ['--method', 'GET', '--header', 'Accept: application/vnd.github+json']);
      if (args[1] === 'repos/hanmiyoo10-alt/-/issues/2378') {
        return {code: 0, stdout: JSON.stringify({state: 'open', body: packetBody()}), stderr: ''};
      }
      if (args[1] === 'repos/hanmiyoo10-alt/-/issues/2352') {
        return {code: 0, stdout: JSON.stringify({state: 'open', body: lease.renderLedger(ledgerState())}), stderr: ''};
      }
      throw new Error(`unexpected api target ${args[1]}`);
    };
    const result = await operator.runCli([
      'inspect', '--repo', 'hanmiyoo10-alt/-', '--packet', '#2378', '--scopes-json', '[]',
    ], {}, {runner});
    assert.equal(result.code, 0);
    const parsed = JSON.parse(result.text);
    assert.equal(parsed.status, 'READY');
    assert.equal(parsed.ledgerGeneration, 7);
    assert.deepEqual(calls.map((args) => args[1]), [
      'repos/hanmiyoo10-alt/-/issues/2378',
      'repos/hanmiyoo10-alt/-/issues/2352',
    ]);
  });

  await test('gh fallback rejects arbitrary endpoints and request options', async () => {
    const client = operator.createGhIssueReadClient({
      repo: 'hanmiyoo10-alt/-',
      runner: () => { throw new Error('runner must not execute'); },
    });
    await assert.rejects(client.api('/pulls/1'), /GH_API_ISSUE_ENDPOINT_INVALID/);
    await assert.rejects(client.api('/issues/1', {method: 'POST'}), /GH_API_ISSUE_OPTIONS_INVALID/);
    await assert.rejects(client.api('/issues/0'), /GH_API_ISSUE_ENDPOINT_INVALID/);
  });

  await test('gh fallback read failures do not expose raw stderr', async () => {
    const marker = 'PRIVATE_AUTH_MATERIAL';
    const failed = operator.createGhIssueReadClient({
      repo: 'hanmiyoo10-alt/-',
      runner: () => ({code: 1, stdout: '', stderr: marker}),
    });
    await assert.rejects(
      failed.api('/issues/2378'),
      (error) => error.message === 'GH_API_ISSUE_READ_FAILED' && !String(error).includes(marker),
    );
    const malformed = operator.createGhIssueReadClient({
      repo: 'hanmiyoo10-alt/-',
      runner: () => ({code: 0, stdout: '{not-json', stderr: marker}),
    });
    await assert.rejects(
      malformed.api('/issues/2378'),
      (error) => error.message === 'GH_API_ISSUE_RESPONSE_INVALID' && !String(error).includes(marker),
    );
  });

  await test('same injected gh runner serves fallback reads and bounded dispatch', async () => {
    const argsFixture = acquireArgs();
    const request = {expectedGeneration: 7, ...argsFixture, packetBodySha256: lease.digest(packetBody())};
    const acquired = lease.planAcquire(ledgerState(), request);
    const acquiredState = lease.parseLedger(acquired.updatedBody).state;
    let ledgerReads = 0;
    let listCount = 0;
    const calls = [];
    const runner = (args) => {
      calls.push(args);
      if (args[0] === 'api') {
        if (args[1] === 'repos/hanmiyoo10-alt/-/issues/2378') {
          return {code: 0, stdout: JSON.stringify({state: 'open', body: packetBody()}), stderr: ''};
        }
        if (args[1] === 'repos/hanmiyoo10-alt/-/issues/2352') {
          ledgerReads += 1;
          const state = ledgerReads === 1 ? ledgerState() : acquiredState;
          return {code: 0, stdout: JSON.stringify({state: 'open', body: lease.renderLedger(state)}), stderr: ''};
        }
      }
      if (args[0] === 'run' && args[1] === 'list') {
        listCount += 1;
        const runs = listCount === 1 ? [] : [{databaseId: 94, status: 'completed', conclusion: 'success'}];
        return {code: 0, stdout: JSON.stringify(runs), stderr: ''};
      }
      if (args[0] === 'workflow' && args[1] === 'run') return {code: 0, stdout: '', stderr: ''};
      if (args[0] === 'run' && args[1] === 'watch') return {code: 0, stdout: '', stderr: ''};
      if (args[0] === 'run' && args[1] === 'view' && args.includes('--json')) {
        return {code: 0, stdout: dispatchRunInfo(94), stderr: ''};
      }
      if (args[0] === 'run' && args[1] === 'view' && args.includes('--log')) {
        return {code: 0, stdout: dispatchLog({
          status: 'PLAN_READY', operation: 'acquire', leaseId: acquired.leaseId,
          workflowInputs: {
            operation: 'acquire', expected_generation: '7', packet_ref: '#2378',
            packet_body_sha256: lease.digest(packetBody()), route: 'S', executor: 'S',
            scopes_json: JSON.stringify(argsFixture.scopes),
            scope_disposition: 'DISJOINT', workspace_kind: 'repository',
            branch: argsFixture.branch, worktree: argsFixture.worktree,
            observed_base_sha: argsFixture.observedBaseSha,
          },
        }, {generation: 8}), stderr: ''};
      }
      throw new Error(`unexpected runner args ${args.join(' ')}`);
    };
    const result = await operator.runCli([
      'lease-acquire', '--repo', 'hanmiyoo10-alt/-', '--packet', '#2378',
      '--route', argsFixture.route, '--executor', argsFixture.executor,
      '--scopes-json', JSON.stringify(argsFixture.scopes), '--scope-disposition', argsFixture.scopeDisposition,
      '--workspace-kind', argsFixture.workspaceKind, '--branch', argsFixture.branch, '--worktree', argsFixture.worktree,
      '--observed-base-sha', argsFixture.observedBaseSha, '--dispatch',
    ], {}, {runner, sleepFn: () => {}, maxPolls: 1});
    assert.equal(result.code, 0);
    const parsed = JSON.parse(result.text);
    assert.equal(parsed.status, 'DISPATCH_COMPLETE');
    assert.equal(parsed.runId, 94);
    assert(calls.some((args) => args[0] === 'api'));
    assert(calls.some((args) => args[0] === 'workflow' && args[1] === 'run'));
  });

  await test('operator source contains no credential extraction commands', async () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'mcl-coordination-operator.cjs'), 'utf8');
    for (const forbidden of [
      "['auth', 'token']", "['auth', 'login']", "['auth', 'refresh']", "['auth', 'logout']",
    ]) {
      assert(!source.includes(forbidden), forbidden);
    }
  });

  await test('D-014 manifest command reuses canonical builder and renderer', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-operator-'));
    const inputPath = path.join(dir, 'manifest.json');
    fs.writeFileSync(inputPath, JSON.stringify(manifestInput()));
    const rendered = await operator.runCli(['handoff-manifest', '--input', inputPath], {});
    assert.equal(rendered.code, 0);
    const parsed = handoff.parseManifest(rendered.text);
    assert.equal(parsed.status, 'VALID');
    assert.equal(parsed.value.manifestId, handoff.buildManifest(manifestInput()).manifestId);
    fs.rmSync(dir, {recursive: true, force: true});
  });

  await test('D-014 COMPLETE receipt cannot bypass required release evidence', async () => {
    const manifest = handoff.buildManifest(manifestInput());
    assert.throws(() => handoff.buildCompletionReceipt(manifest, {
      disposition: 'COMPLETE', outputRefs: ['pr:#2379'], validationRefs: ['run:2'], observedRefs: [],
      leaseDisposition: 'UNKNOWN', leaseReleaseEvidence: null, workspaceResult: 'clean', blockerRefs: [], requiredUnknownRefs: [],
    }), /RECEIPT_REQUIRED_LEASE_NOT_RELEASED/);
  });
  await test('bounded public inspect output omits raw packet and ledger bodies', async () => {
    const secretMarker = 'PRIVATE_BODY_SHOULD_NOT_ESCAPE';
    const client = fakeClient({body: `${packetBody()}\n${secretMarker}`});
    const context = await operator.readContext({client, packetRef: '#2378'});
    const publicValue = operator.publicContext(context);
    const text = JSON.stringify(publicValue);
    assert(!text.includes(secretMarker));
    assert(!text.includes('activeLeases'));
    assert.equal(publicValue.authority.repositoryMutationAuthorized, false);
  });

  await test('release plan includes fresh generation packet ref and exact lease id', async () => {
    const request = {expectedGeneration: 7, ...acquireArgs(), packetBodySha256: lease.digest(packetBody())};
    const acquired = lease.planAcquire(ledgerState(), request);
    const state = lease.parseLedger(acquired.updatedBody).state;
    const client = fakeClient({state});
    const result = await operator.planRelease({client, packetRef: '#2378', leaseId: acquired.leaseId});
    assert.equal(result.status, 'PLAN_READY');
    assert.equal(result.workflowInputs.expected_generation, '8');
    assert.equal(result.workflowInputs.packet_ref, '#2378');
    assert.equal(result.workflowInputs.lease_id, acquired.leaseId);
    assert(client.calls.every((call) => call.options === undefined));
  });

  await test('handoff receipt command accepts rendered manifest and preserves canonical identity', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-operator-receipt-'));
    const manifest = handoff.buildManifest(manifestInput());
    const manifestPath = path.join(dir, 'manifest.md');
    const resultPath = path.join(dir, 'result.json');
    fs.writeFileSync(manifestPath, handoff.renderManifest(manifest));
    fs.writeFileSync(resultPath, JSON.stringify({disposition: 'COMPLETE', outputRefs: ['pr:#2379'], validationRefs: ['run:2'], observedRefs: [], leaseDisposition: 'RELEASED', leaseReleaseEvidence: {ledgerRef: '#2352', leaseId: 'd'.repeat(64), releasedGeneration: 9, evidenceRef: 'run:3'}, workspaceResult: 'clean', blockerRefs: [], requiredUnknownRefs: []}));
    const rendered = await operator.runCli(['handoff-receipt', '--manifest', manifestPath, '--input', resultPath], {});
    const parsed = handoff.parseCompletionReceipt(rendered.text);
    assert.equal(parsed.status, 'VALID');
    assert.equal(parsed.value.manifestId, manifest.manifestId);
    fs.rmSync(dir, {recursive: true, force: true});
  });

  process.stdout.write(`1..${count}\n`);
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
