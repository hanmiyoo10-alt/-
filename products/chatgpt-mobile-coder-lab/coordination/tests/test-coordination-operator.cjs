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
