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
      if (args[0] === 'run' && args[1] === 'view') return {code: 0, stdout: JSON.stringify({databaseId: 91, conclusion: 'failure', status: 'completed', event: 'workflow_dispatch'}), stderr: ''};
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
        return {code: 0, stdout: JSON.stringify({databaseId: 92, conclusion: 'success', status: 'completed'}), stderr: ''};
      }
      if (args[0] === 'run' && args[1] === 'view' && args.includes('--log')) {
        return {code: 0, stdout: 'another lease completed', stderr: ''};
      }
      throw new Error(`unexpected runner args ${args.join(' ')}`);
    };
    const result = await operator.dispatchPlan({repo: 'hanmiyoo10-alt/-', plan,
      client: fakeClient({state}), runner, sleepFn: () => {}, maxPolls: 1});
    assert.equal(result.status, 'UNKNOWN');
    assert(result.reasonCodes.includes('DISPATCH_RUN_IDENTITY_UNPROVEN'));
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
        return {code: 0, stdout: JSON.stringify({databaseId: 93, conclusion: 'success', status: 'completed'}), stderr: ''};
      }
      if (args[0] === 'run' && args[1] === 'view' && args.includes('--log')) {
        return {code: 0, stdout: `result ${acquired.leaseId}`, stderr: ''};
      }
      throw new Error(`unexpected runner args ${args.join(' ')}`);
    };
    const result = await operator.dispatchPlan({repo: 'hanmiyoo10-alt/-', plan,
      client: fakeClient({state}), runner, sleepFn: () => {}, maxPolls: 1});
    assert.equal(result.status, 'DISPATCH_COMPLETE');
    assert.equal(result.runId, 93);
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
    const request = {expectedGeneration: 7, ...acquireArgs(), packetBodySha256: lease.digest(packetBody())};
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
        return {code: 0, stdout: JSON.stringify({databaseId: 94, conclusion: 'success', status: 'completed'}), stderr: ''};
      }
      if (args[0] === 'run' && args[1] === 'view' && args.includes('--log')) {
        return {code: 0, stdout: `result ${acquired.leaseId}`, stderr: ''};
      }
      throw new Error(`unexpected runner args ${args.join(' ')}`);
    };
    const args = acquireArgs();
    const result = await operator.runCli([
      'lease-acquire', '--repo', 'hanmiyoo10-alt/-', '--packet', '#2378',
      '--route', args.route, '--executor', args.executor,
      '--scopes-json', JSON.stringify(args.scopes), '--scope-disposition', args.scopeDisposition,
      '--workspace-kind', args.workspaceKind, '--branch', args.branch, '--worktree', args.worktree,
      '--observed-base-sha', args.observedBaseSha, '--dispatch',
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
