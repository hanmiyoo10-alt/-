'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../../../../..');
const INVOKER_PATH = path.join(
  ROOT,
  'products/chatgpt-mobile-coder-lab/device-ops/working-tree-notebook/mcl-notebook-owner-invoke.cjs',
);
const inv = require(INVOKER_PATH);
const taskHandoff = require(path.join(
  ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs',
));
const taskLease = require(path.join(
  ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs',
));

const BASE = 'a'.repeat(40);
const LEASE = 'b'.repeat(64);
const BODY = [
  '<!-- canonical-main-work-packet:v1 -->',
  '## State',
  'IN_PROGRESS',
  '## Interaction stage',
  '- Current stage: EXPERIMENT_CLOSE',
].join('\n');
const BODY_SHA = taskLease.digest(BODY);
const SCOPE = 'surface:mcl:notebook-owner-invoke-proof-s';
const WORKSPACE = {
  kind: 'repository',
  branch: 'server/notebook-owner-invoke-proof-2510',
  worktree: '/root/nyang-worktrees/notebook-owner-invoke-proof-2510',
};
const AUTHORITY = {...inv.FALSE_AUTHORITY};

function manifest(overrides = {}) {
  const core = {
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: '#2510',
    packetBodySha256: BODY_SHA,
    phaseId: '2510-experiment-close-s',
    phaseClass: 'EXPERIMENT',
    route: 'S',
    executor: 'S',
    scopes: [SCOPE],
    workspace: {...WORKSPACE},
    observedBaseSha: BASE,
    leaseRequirement: 'REQUIRED',
    leaseEvidence: {
      ledgerRef: '#2352',
      leaseId: LEASE,
      acquiredGeneration: 200,
      acquireEvidenceRef: 'run:999001',
    },
    sourceAuthorityRefs: ['#2510', 'issue:#2352'],
    inputRefs: [inv.OWNER_REF],
    expectedOutputRefs: [inv.OWNER_REF],
    acceptanceRefs: ['#2510'],
    stopCondition: 'Invoke the fixed S notebook owner once, then release the lease and record completion.',
    authority: {...AUTHORITY},
  };
  const merged = {...core, ...overrides};
  return taskHandoff.buildManifest(merged);
}

function handoff(m, overrides = {}) {
  return {
    schema: 'mcl-execution-handoff.v1',
    status: 'HANDOFF_READY',
    packet_ref: m.packetRef,
    phase: '1/1',
    route: 'S',
    executor: 'S',
    effect_class: 'repository_mutation',
    manifest_id: m.manifestId,
    lease_id: m.leaseEvidence.leaseId,
    next_owner: 'existing_route_owner',
    reason_codes: [],
    mutation_authorized: false,
    execution_authorized: false,
    details: 'withheld',
    ...overrides,
  };
}

function activeLease(m, overrides = {}) {
  return {
    leaseId: m.leaseEvidence.leaseId,
    packetRef: m.packetRef,
    packetBodySha256: m.packetBodySha256,
    route: m.route,
    executor: m.executor,
    scopes: [...m.scopes],
    scopeFingerprint: 'c'.repeat(64),
    scopeDisposition: 'DISJOINT',
    workspace: {...m.workspace},
    observedBaseSha: m.observedBaseSha,
    sourceRefs: ['#2510', 'issue:#2352'],
    ...overrides,
  };
}

function evidence(m, overrides = {}) {
  const lease = activeLease(m);
  return {
    packet: {state: 'open', body: BODY},
    context: {
      status: 'READY',
      reasonCodes: [],
      packetRef: m.packetRef,
      packetBodySha256: m.packetBodySha256,
      packetLifecycle: 'IN_PROGRESS',
      ledgerGeneration: 200,
      matchingLeaseIds: [lease.leaseId],
      normalizedScopes: [...m.scopes],
      ledgerState: {activeLeases: [lease]},
    },
    ...overrides,
  };
}

function ownerPass(m, overrides = {}) {
  return {
    schema: 'mcl-notebook-live-proof.v1',
    status: 'PASS',
    reason_codes: [],
    executor: 'S',
    base_sha: m.observedBaseSha,
    first_content_sha256: '1'.repeat(64),
    second_content_sha256: '2'.repeat(64),
    reader_source_sha256: '3'.repeat(64),
    harness_source_sha256: '4'.repeat(64),
    head_preserved: true,
    path_state_preserved: true,
    cache_artifact_delta: 'NONE',
    cleanup: 'COMPLETE',
    branch_absent_after: true,
    worktree_absent_after: true,
    control_preserved: true,
    landing_preserved: true,
    authority: {...AUTHORITY},
    ...overrides,
  };
}

function runFor(m, h, current, owner, runOverrides = {}) {
  let calls = 0;
  let captured = null;
  const spawn = (file, args, options) => {
    calls += 1;
    captured = {file, args, options};
    return {
      status: runOverrides.status ?? 0,
      signal: runOverrides.signal ?? null,
      error: runOverrides.error,
      stdout: JSON.stringify(owner),
      stderr: '',
    };
  };
  const receipt = inv.invokeWithCurrentEvidence({
    handoff: h,
    manifest: m,
    packet: current.packet,
    context: current.context,
    spawnSyncImpl: spawn,
    root: ROOT,
    env: {
      PATH: process.env.PATH || '/usr/bin:/bin',
      HOME: '/root',
      GH_TOKEN: 'must-not-propagate',
      GITHUB_TOKEN: 'must-not-propagate',
    },
  });
  return {receipt, calls, captured};
}

test('CLI accepts only repo, handoff-file, and manifest-file', () => {
  const parsed = inv.parseArgs([
    '--repo', 'owner/repo',
    '--handoff-file', '/tmp/handoff.json',
    '--manifest-file', '/tmp/manifest.md',
  ]);
  assert.equal(parsed.repo, 'owner/repo');
  assert.throws(() => inv.parseArgs([
    '--repo', 'owner/repo',
    '--handoff-file', '/tmp/handoff.json',
    '--manifest-file', '/tmp/manifest.md',
    '--command', 'git status',
  ]), /ARGUMENT_INVALID/);
});

test('strict HANDOFF_READY parser rejects non-ready and authority escalation', () => {
  const m = manifest();
  assert.equal(inv.parseHandoffText(JSON.stringify(handoff(m))).status, 'HANDOFF_READY');
  assert.throws(
    () => inv.parseHandoffText(JSON.stringify(handoff(m, {status: 'BLOCKED'}))),
    (error) => error.kind === 'BLOCKED',
  );
  assert.throws(
    () => inv.parseHandoffText(JSON.stringify(handoff(m, {execution_authorized: true}))),
    (error) => error.kind === 'CONFLICT',
  );
});

test('all non-ready handoff dispositions fail closed before owner use', () => {
  const m = manifest();
  for (const status of ['BLOCKED', 'UNKNOWN', 'CONFLICT', 'SEPARATE_OWNER_REQUIRED', 'NOT_APPLICABLE']) {
    assert.throws(
      () => inv.parseHandoffText(JSON.stringify(handoff(m, {status}))),
      (error) => error.kind === 'BLOCKED',
      status,
    );
  }
});

test('handoff manifest and lease identity mismatch fails closed', () => {
  const m = manifest();
  assert.throws(
    () => inv.validateManifestBinding(m, handoff(m, {manifest_id: '9'.repeat(64)})),
    (error) => error.kind === 'CONFLICT' && error.reasonCodes.includes('MANIFEST_ID_CONFLICT'),
  );
  assert.throws(
    () => inv.validateManifestBinding(m, handoff(m, {lease_id: '8'.repeat(64)})),
    (error) => error.kind === 'CONFLICT' && error.reasonCodes.includes('MANIFEST_LEASE_ID_CONFLICT'),
  );
});

test('manifest binding is fixed to S experiment repository owner', () => {
  const m = manifest();
  assert.doesNotThrow(() => inv.validateManifestBinding(m, handoff(m)));
  const wrong = manifest({phaseClass: 'REPOSITORY_MUTATION'});
  assert.throws(
    () => inv.validateManifestBinding(wrong, handoff(wrong)),
    (error) => error.reasonCodes.includes('MANIFEST_PHASE_CLASS_UNSUPPORTED'),
  );
});

test('PASS invokes fixed owner once and returns generic PASS receipt', () => {
  const m = manifest();
  const h = handoff(m);
  const current = evidence(m);
  const result = runFor(m, h, current, ownerPass(m));
  assert.equal(result.calls, 1);
  assert.equal(result.receipt.validity, 'VALID');
  assert.equal(result.receipt.result, 'PASS');
  assert.equal(result.receipt.attentionState, 'COMPLETE');
  assert.equal(result.receipt.primitiveId, 'mcl:notebook-live-proof');
  assert.equal(result.receipt.nextLegalAction, 'RELEASE_D013_AND_RECORD_D014_COMPLETION');
  assert.equal(result.receipt.mutationAuthorized, false);
  assert.equal(result.receipt.executionAuthorized, false);
  assert.equal(result.receipt.releaseAuthorized, false);
  assert.equal(result.receipt.productionAuthorized, false);
  assert.equal(result.captured.file, path.join(ROOT, inv.OWNER_RELATIVE));
  assert.deepEqual(result.captured.args, [
    '--executor', 'S',
    '--base-sha', m.observedBaseSha,
    '--branch', m.workspace.branch,
    '--worktree', m.workspace.worktree,
  ]);
  assert.equal(result.captured.options.shell, false);
  assert.equal(result.captured.options.env.GH_TOKEN, undefined);
  assert.equal(result.captured.options.env.GITHUB_TOKEN, undefined);
});

test('stage drift blocks before spawn', () => {
  const m = manifest();
  const current = evidence(m, {
    packet: {
      state: 'open',
      body: BODY.replace('EXPERIMENT_CLOSE', 'POSTMERGE_CONVERGENCE'),
    },
  });
  current.context.packetBodySha256 = taskLease.digest(current.packet.body);
  const result = runFor(m, handoff(m), current, ownerPass(m));
  assert.equal(result.calls, 0);
  assert.equal(result.receipt.result, 'BLOCKED');
  assert(result.receipt.blockers.includes('PACKET_STAGE_NOT_EXPERIMENT_CLOSE')
    || result.receipt.conflicts.includes('PACKET_BODY_DIGEST_CONFLICT'));
});

test('packet digest drift conflicts before spawn', () => {
  const m = manifest();
  const changedBody = BODY + '\nextra';
  const current = evidence(m, {
    packet: {state: 'open', body: changedBody},
  });
  current.context.packetBodySha256 = taskLease.digest(changedBody);
  const result = runFor(m, handoff(m), current, ownerPass(m));
  assert.equal(result.calls, 0);
  assert.equal(result.receipt.result, 'CONFLICT');
  assert(result.receipt.conflicts.includes('PACKET_BODY_DIGEST_CONFLICT'));
});

test('missing active lease blocks before spawn', () => {
  const m = manifest();
  const current = evidence(m);
  current.context.ledgerState.activeLeases = [];
  current.context.matchingLeaseIds = [];
  const result = runFor(m, handoff(m), current, ownerPass(m));
  assert.equal(result.calls, 0);
  assert.equal(result.receipt.result, 'BLOCKED');
  assert(result.receipt.blockers.includes('ACTIVE_LEASE_REQUIRED'));
});

test('active lease identity disagreement conflicts before spawn', () => {
  const m = manifest();
  const current = evidence(m);
  current.context.ledgerState.activeLeases[0].workspace.branch = 'server/other';
  const result = runFor(m, handoff(m), current, ownerPass(m));
  assert.equal(result.calls, 0);
  assert.equal(result.receipt.result, 'CONFLICT');
  assert(result.receipt.conflicts.includes('LEASE_WORKSPACE_CONFLICT'));
});

test('owner authority escalation becomes CONFLICT', () => {
  const m = manifest();
  const owner = ownerPass(m, {
    authority: {...AUTHORITY, repositoryMutationAuthorized: true},
  });
  const result = runFor(m, handoff(m), evidence(m), owner);
  assert.equal(result.calls, 1);
  assert.equal(result.receipt.result, 'CONFLICT');
  assert(result.receipt.conflicts.includes('OWNER_AUTHORITY_CONFLICT'));
});

test('cleanup failure becomes CONFLICT', () => {
  const m = manifest();
  const owner = ownerPass(m, {cleanup: 'BLOCKED', worktree_absent_after: false});
  const result = runFor(m, handoff(m), evidence(m), owner);
  assert.equal(result.calls, 1);
  assert.equal(result.receipt.result, 'CONFLICT');
  assert(result.receipt.conflicts.includes('OWNER_CLEANUP_INCOMPLETE'));
});

test('PASS with nonzero exit becomes CONFLICT', () => {
  const m = manifest();
  const result = runFor(m, handoff(m), evidence(m), ownerPass(m), {status: 2});
  assert.equal(result.calls, 1);
  assert.equal(result.receipt.result, 'CONFLICT');
  assert(result.receipt.conflicts.includes('OWNER_PASS_EXIT_CONFLICT'));
});

test('owner FAIL remains FAIL', () => {
  const m = manifest();
  const owner = ownerPass(m, {
    status: 'FAIL',
    reason_codes: ['READER_FAILED'],
    cleanup: 'COMPLETE',
  });
  const result = runFor(m, handoff(m), evidence(m), owner, {status: 2});
  assert.equal(result.receipt.result, 'FAIL');
  assert(result.receipt.reasonCodes.includes('NOTEBOOK_OWNER_FAIL'));
});

test('owner BLOCKED remains BLOCKED', () => {
  const m = manifest();
  const owner = ownerPass(m, {
    status: 'BLOCKED',
    reason_codes: ['BASE_COMMIT_UNAVAILABLE'],
    first_content_sha256: null,
    second_content_sha256: null,
    reader_source_sha256: null,
    cleanup: 'NOT_STARTED',
    head_preserved: false,
    path_state_preserved: false,
    branch_absent_after: false,
    worktree_absent_after: false,
    control_preserved: false,
    landing_preserved: false,
  });
  const result = runFor(m, handoff(m), evidence(m), owner, {status: 2});
  assert.equal(result.receipt.result, 'BLOCKED');
  assert(result.receipt.blockers.includes('NOTEBOOK_OWNER_BLOCKED'));
});

test('safe child environment strips auth material', () => {
  assert.deepEqual(inv.safeChildEnv({
    PATH: '/x', HOME: '/h', LANG: 'C', TMPDIR: '/t',
    GH_TOKEN: 'secret', GITHUB_TOKEN: 'secret2', OTHER: 'x',
  }), {PATH: '/x', HOME: '/h', LANG: 'C', TMPDIR: '/t'});
});

test('source has no generic command or owner selector surface', () => {
  const source = fs.readFileSync(INVOKER_PATH, 'utf8');
  assert(!source.includes("'command'"));
  assert(!source.includes("'owner-id'"));
  assert(!source.includes("'adapter-id'"));
  assert(!source.includes('shell: true'));
  assert(source.includes("shell: false"));
  assert(source.includes("new Set(['repo', 'handoff-file', 'manifest-file'])"));
});
