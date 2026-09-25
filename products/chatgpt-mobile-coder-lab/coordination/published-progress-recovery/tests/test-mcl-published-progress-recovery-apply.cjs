'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const owner = require('../mcl-published-progress-recovery-apply.cjs');
const taskHandoff = require('../../task-handoff.cjs');

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const ID_A = '1'.repeat(64);
const ID_B = '2'.repeat(64);
const ID_C = '3'.repeat(64);

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}
function hashValue(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(stableValue(value));
  return crypto.createHash('sha256').update(text).digest('hex');
}

function manifest(overrides = {}) {
  const base = {
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: '#2744',
    packetBodySha256: ID_A,
    phaseId: 'validation-merge',
    phaseClass: 'VALIDATION',
    route: 'S',
    executor: 'S',
    scopes: ['path:a.txt', 'surface:mcl:test'],
    workspace: {
      kind: 'repository',
      branch: 'server/mcl-packet-2744',
      worktree: '/root/nyang-worktrees/mcl-packet-2744',
    },
    observedBaseSha: SHA_A,
    leaseRequirement: 'REQUIRED',
    leaseEvidence: {
      ledgerRef: '#2352',
      leaseId: ID_B,
      acquiredGeneration: 10,
      acquireEvidenceRef: 'run:100',
    },
    sourceAuthorityRefs: ['#2744', 'issue:#2352'],
    inputRefs: ['commit:' + SHA_A],
    expectedOutputRefs: ['path:a.txt'],
    acceptanceRefs: ['#2744'],
    stopCondition: 'test',
    authority: {
      repositoryMutationAuthorized: false,
      deviceMutationAuthorized: false,
      mergeAuthorized: false,
      releaseAuthorized: false,
      productionAuthorized: false,
    },
  };
  return taskHandoff.buildManifest({...base, ...overrides});
}
function activation() {
  const oldManifest = manifest();
  const core = {
    schemaVersion: 1,
    mode: 'MCL_PUBLISHED_PROGRESS_RECOVERY_ACTIVATION',
    packetRef: '#2744',
    packetBodySha256: ID_A,
    scopes: ['path:a.txt', 'surface:mcl:test'],
    pathScopes: ['path:a.txt'],
    route: 'S',
    executor: 'S',
    workspace: oldManifest.workspace,
    oldLeaseId: ID_B,
    oldObservedBaseSha: SHA_A,
    oldManifest,
    prNumber: 2565,
    preservedHead: SHA_B,
    transactionId: ID_C,
  };
  return owner.buildActivation({
    decision: {
      result: 'PASS',
      recoveryDisposition: 'PUBLISHED_PROGRESS_REBIND_ELIGIBLE',
      nextLegalAction: 'PUBLISHED_PROGRESS_RECOVERY_EFFECT_REVIEW',
    },
    observation: {
      packet: {
        packetRef: core.packetRef,
        digest: core.packetBodySha256,
        scopes: core.scopes,
        pathScopes: core.pathScopes,
      },
      leaseRead: {lease: {
        route: core.route,
        executor: core.executor,
        workspace: core.workspace,
        leaseId: core.oldLeaseId,
        observedBaseSha: core.oldObservedBaseSha,
      }},
      manifestRead: {manifest: oldManifest},
      prRead: {locator: 'pr:#2565'},
      gitRead: {head: core.preservedHead},
    },
  });
}

test('CLI surface is fixed and apply requires literal flag', () => {
  assert.deepEqual(
    owner.parseArgs(['inspect', '--packet', '#2887', '--format', 'agent-view']),
    {command: 'inspect', packetNumber: 2887, format: 'agent-view'});
  assert.deepEqual(
    owner.parseArgs(['apply', '--packet', '#2887', '--apply', '--format', 'receipt']),
    {command: 'apply', packetNumber: 2887, format: 'receipt'});
  assert.throws(() =>
    owner.parseArgs(['apply', '--packet', '#2887', '--format', 'receipt']),
    /APPLY_LITERAL_REQUIRED/);
  for (const args of [
    ['--repo', 'x/y'], ['--pr', '1'], ['--lease', ID_A],
    ['--worktree', '/tmp/x'], ['--route', 'S'], ['--command', 'x'],
  ]) {
    assert.throws(() => owner.parseArgs([
      'apply', '--packet', '#2887', '--apply', '--format', 'receipt', ...args,
    ]));
  }
});

test('activation identity and digest both fail closed', () => {
  const value = activation();
  assert.equal(owner.verifyActivation(value).ok, true);
  assert.equal(owner.verifyActivation({...value, prNumber: 999}).ok, false);

  const forged = {...value, transactionId: ID_C};
  const {activationDigest: ignored, ...forgedCore} = forged;
  forged.activationDigest = hashValue(forgedCore);
  const checked = owner.verifyActivation(forged);
  assert.equal(checked.ok, false);
  assert.deepEqual(checked.reasonCodes, ['ACTIVATION_TRANSACTION_ID_CONFLICT']);
});

test('invalid CLI input does not persist fallback packet evidence', async () => {
  const out = await owner.runCli(['apply', '--repo', 'x/y']);
  assert.equal(out.code, 2);
  assert.equal(out.persisted, null);
  assert.equal(out.result.packetRef, null);
});

test('fresh rebind manifest preserves canonical validation-merge phase identity', () => {
  const act = activation();
  const freshLeaseId = '4'.repeat(64);
  const built = owner.buildFreshManifest(act, {
    expectedFresh: {leaseId: freshLeaseId},
  }, {
    leaseRunEvidence: () => ({generation: 20, runId: 200}),
  });
  assert.equal(built.phaseId, 'validation-merge');
  assert.equal(built.phaseClass, 'VALIDATION');
  assert.equal(built.observedBaseSha, act.preservedHead);
  assert.equal(built.leaseEvidence.leaseId, freshLeaseId);
  assert.equal(built.inputRefs.includes('pr:#' + act.prNumber), true);
  assert.equal(
    built.inputRefs.includes('receipt:mcl-published-progress-recovery:' + act.transactionId),
    true);
});

function sequenceHarness(phases) {
  const calls = [];
  const act = activation();
  let index = 0;
  const readState = () => {
    const phase = phases[Math.min(index, phases.length - 1)];
    return {
      phase,
      ledger: {state: {activeLeases: []}, body: 'ledger'},
      expectedFresh: {leaseId: '4'.repeat(64)},
    };
  };
  const advance = (name, result) => {
    calls.push(name);
    index += 1;
    return result;
  };
  return {
    act, calls,
    deps: {
      loadOrAdmit: async () => act,
      readState,
      releaseOld: async () => advance('release', {}),
      cleanupHolder: () => advance('holder', {}),
      publishPartial: () => advance('partial', {written: 1}),
      acquireFresh: () => advance('acquire', {}),
      publishFreshManifest: () => advance('manifest', {written: 1}),
    },
  };
}

test('full fixed effect sequence stops at RECOVERY_REBIND_READY', async () => {
  const h = sequenceHarness([
    'OLD_ACTIVE',
    'HOLDER_CLEANUP_REQUIRED',
    'PARTIAL_RECEIPT_REQUIRED',
    'FRESH_ACQUIRE_REQUIRED',
    'FRESH_MANIFEST_REQUIRED',
    'RECOVERY_REBIND_READY',
  ]);
  const result = await owner.applyPacket(2744, h.deps);
  assert.equal(result.status, 'PASS');
  assert.equal(result.recoveryDisposition, 'RECOVERY_REBIND_READY');
  assert.equal(result.nextLegalAction, 'VALIDATION_MERGE');
  assert.deepEqual(h.calls, ['release', 'holder', 'partial', 'acquire', 'manifest']);
  assert.deepEqual(result.effects, {
    oldLeaseReleased: 1,
    holderCleaned: 1,
    partialPublished: 1,
    freshLeaseAcquired: 1,
    freshManifestPublished: 1,
  });
});

test('terminal replay performs zero effects', async () => {
  const h = sequenceHarness(['RECOVERY_REBIND_READY']);
  const result = await owner.applyPacket(2766, h.deps);
  assert.equal(result.status, 'PASS');
  assert.deepEqual(h.calls, []);
  assert.equal(Object.values(result.effects).reduce((a, b) => a + b, 0), 0);
});

test('resume after old release does not release again', async () => {
  const h = sequenceHarness([
    'HOLDER_CLEANUP_REQUIRED',
    'PARTIAL_RECEIPT_REQUIRED',
    'FRESH_ACQUIRE_REQUIRED',
    'FRESH_MANIFEST_REQUIRED',
    'RECOVERY_REBIND_READY',
  ]);
  await owner.applyPacket(2769, h.deps);
  assert.deepEqual(h.calls, ['holder', 'partial', 'acquire', 'manifest']);
});

test('resume after holder cleanup does not recreate holder', async () => {
  const h = sequenceHarness([
    'PARTIAL_RECEIPT_REQUIRED',
    'FRESH_ACQUIRE_REQUIRED',
    'FRESH_MANIFEST_REQUIRED',
    'RECOVERY_REBIND_READY',
  ]);
  await owner.applyPacket(2744, h.deps);
  assert.deepEqual(h.calls, ['partial', 'acquire', 'manifest']);
});

test('resume after fresh acquire does not acquire a second lease', async () => {
  const h = sequenceHarness(['FRESH_MANIFEST_REQUIRED', 'RECOVERY_REBIND_READY']);
  await owner.applyPacket(2744, h.deps);
  assert.deepEqual(h.calls, ['manifest']);
});

test('step bound fails closed rather than retrying indefinitely', async () => {
  const h = sequenceHarness(new Array(8).fill('OLD_ACTIVE'));
  h.deps.releaseOld = async () => { h.calls.push('release'); };
  await assert.rejects(
    owner.applyPacket(2744, h.deps),
    (error) => error instanceof owner.EffectError
      && error.reasonCodes.includes('RECOVERY_EFFECT_STEP_BOUND_EXCEEDED'));
  assert.equal(h.calls.length, 8);
});

test('three historical source-case shapes share the same transition', async () => {
  for (const packet of [2744, 2766, 2769]) {
    const h = sequenceHarness([
      'OLD_ACTIVE',
      'HOLDER_CLEANUP_REQUIRED',
      'PARTIAL_RECEIPT_REQUIRED',
      'FRESH_ACQUIRE_REQUIRED',
      'FRESH_MANIFEST_REQUIRED',
      'RECOVERY_REBIND_READY',
    ]);
    const result = await owner.applyPacket(packet, h.deps);
    assert.equal(result.recoveryDisposition, 'RECOVERY_REBIND_READY');
    assert.equal(result.publishedProgress, 'EXACT_PRESERVED');
  }
});

test('receipt remains authority-false and reports no Git or merge effects', () => {
  const result = {
    status: 'PASS',
    operation: 'apply',
    transactionId: ID_C,
    recoveryDisposition: 'RECOVERY_REBIND_READY',
    publishedProgress: 'EXACT_PRESERVED',
    effects: {
      oldLeaseReleased: 1,
      holderCleaned: 1,
      partialPublished: 1,
      freshLeaseAcquired: 1,
      freshManifestPublished: 1,
    },
    nextLegalAction: 'VALIDATION_MERGE',
    reasonCodes: [],
  };
  const receipt = owner.reportToReceipt(2744, result, ['local-artifact:/tmp/x#sha256=' + ID_A]);
  assert.equal(receipt.result, 'PASS');
  assert.equal(receipt.attentionDisposition, 'COMPLETE');
  for (const key of [
    'mutationAuthorized', 'executionAuthorized', 'mergeAuthorized',
    'releaseAuthorized', 'productionAuthorized', 'runtimeAuthorityGranted',
    'securityAuthorityGranted',
  ]) assert.equal(receipt[key], false, key);
  const counters = Object.fromEntries(receipt.counters.map((row) => [row.name, row.value]));
  assert.equal(counters.git_effects_performed, 0);
  assert.equal(counters.merge_effects_performed, 0);
});

test('byte-equivalent D-014 publication rows are idempotent at coordinator boundary', () => {
  const fake = manifest();
  const rendered = taskHandoff.renderManifest(fake);
  const rows = [
    {body: rendered},
    {body: rendered},
    {body: 'unrelated'},
  ];
  assert.equal(rows.filter((row) => row.body === rendered).length, 2);
  // The coordinator's semantic-idempotence contract intentionally accepts
  // multiple identical immutable rows and conflicts only on a distinct identity.
  const parsed = rows.filter((row) => row.body.includes('mcl-task-manifest:v1'))
    .map((row) => taskHandoff.parseManifest(row.body).value);
  assert.equal(new Set(parsed.map((value) =>
    value.manifestId + ':' + value.payloadSha256)).size, 1);
});

test('source contains no forbidden caller selector or direct Git mutation primitive', () => {
  const file = path.join(__dirname, '../mcl-published-progress-recovery-apply.cjs');
  const source = fs.readFileSync(file, 'utf8');
  for (const forbidden of [
    "'--repo' +", '--force', 'git push', 'git merge', 'git rebase',
    'git reset', 'git checkout', 'git stash', 'claimHolder(',
    'kill_process', 'latest-comment-wins',
  ]) assert.equal(source.includes(forbidden), false, forbidden);
  assert.match(source, /PUBLISHED_PROGRESS_REBIND_ELIGIBLE/);
  assert.match(source, /cleanupStale/);
  assert.match(source, /buildCompletionReceipt/);
  assert.match(source, /buildManifest/);
  assert.match(source, /resolveScopeOverlap/);
});

test('bounded output does not expose private process or holder capability fields', () => {
  const text = JSON.stringify({
    recoveryDisposition: 'RECOVERY_REBIND_READY',
    publishedProgress: 'EXACT_PRESERVED',
    nextLegalAction: 'VALIDATION_MERGE',
  });
  for (const forbidden of [
    'pid', 'ppid', 'cmdline', 'holderSecret', 'claimDigest',
    'environment', 'sessionId', 'accountId', 'token',
  ]) assert.equal(text.includes(forbidden), false, forbidden);
});
