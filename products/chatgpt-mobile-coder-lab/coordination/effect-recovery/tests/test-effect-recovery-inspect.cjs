#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const owner = require('../mcl-effect-recovery-inspect.cjs');
const ROOT = path.resolve(__dirname, '../../../../..');
const handoff = require(path.join(ROOT, 'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));

const BASE = '1111111111111111111111111111111111111111';
const LEASE = 'a'.repeat(64);
const MANIFEST = 'b'.repeat(64);
const PACKET_HASH = 'c'.repeat(64);

function activeLease() {
  return {
    leaseId: LEASE,
    packetRef: '#2693',
    packetBodySha256: PACKET_HASH,
    route: 'S',
    executor: 'S',
    scopes: [
      'path:products/chatgpt-mobile-coder-lab/device-ops/example/README.md',
      'surface:mcl:example',
    ],
    workspace: {
      kind: 'repository',
      branch: 'server/mcl-packet-2693',
      worktree: '/root/nyang-worktrees/mcl-packet-2693',
    },
    observedBaseSha: BASE,
  };
}

function packet() {
  return {
    packetRef: '#2693',
    body: 'fixture',
    digest: PACKET_HASH,
    scopes: [...activeLease().scopes],
    pathScopes: ['path:products/chatgpt-mobile-coder-lab/device-ops/example/README.md'],
    exact: true,
    reasons: [],
  };
}

function manifest() {
  return handoff.buildManifest({
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: '#2693',
    packetBodySha256: PACKET_HASH,
    phaseId: '2693-implementation-pr-stage-entry',
    phaseClass: 'REPOSITORY_MUTATION',
    route: 'S',
    executor: 'S',
    scopes: [...activeLease().scopes],
    workspace: {...activeLease().workspace},
    observedBaseSha: BASE,
    leaseRequirement: 'REQUIRED',
    leaseEvidence: {
      ledgerRef: '#2352',
      leaseId: LEASE,
      acquiredGeneration: 1,
      acquireEvidenceRef: 'run:1',
    },
    sourceAuthorityRefs: ['#2693', 'issue:#2352'],
    inputRefs: ['commit:' + BASE],
    expectedOutputRefs: ['path:products/chatgpt-mobile-coder-lab/device-ops/example/README.md'],
    acceptanceRefs: ['#2693'],
    stopCondition: 'fixture',
    authority: {
      repositoryMutationAuthorized: false,
      deviceMutationAuthorized: false,
      mergeAuthorized: false,
      releaseAuthorized: false,
      productionAuthorized: false,
    },
  });
}

function observation(overrides = {}) {
  const m = manifest();
  const base = {
    packet: packet(),
    mainSha: '2'.repeat(40),
    currentBarrierExact: true,
    currentBarrierConflict: false,
    ledgerRead: {status: 'EXACT', state: {}, reasons: []},
    leaseRead: {state: 'ACTIVE_EXACT', lease: activeLease(), reasons: []},
    manifestRead: {state: 'EXACT', manifest: m, reasons: []},
    holderState: {state: 'PRESENT_EXACT', reasons: []},
    workspaceRead: {
      workspaceState: 'DIRTY_PRESERVED',
      dirtyScopeState: 'EXACT',
      gitIdentityState: 'EXACT',
      reasons: [],
    },
    remoteRead: {state: 'UNCHANGED_BASE', sha: BASE, reasons: []},
    prRead: {state: 'ABSENT', locator: null, reasons: []},
    releaseRead: {state: 'PROVEN', reasons: []},
    sessionRead: {state: 'ABSENT', reason: 'SOLE_RDC_COMMAND_SESSION'},
    reasonCodes: [],
  };
  return {
    ...base,
    ...overrides,
    packet: overrides.packet || base.packet,
    leaseRead: overrides.leaseRead || base.leaseRead,
    manifestRead: overrides.manifestRead || base.manifestRead,
    holderState: overrides.holderState || base.holderState,
    workspaceRead: overrides.workspaceRead || base.workspaceRead,
    remoteRead: overrides.remoteRead || base.remoteRead,
    prRead: overrides.prRead || base.prRead,
    releaseRead: overrides.releaseRead || base.releaseRead,
    sessionRead: overrides.sessionRead || base.sessionRead,
  };
}

const artifactWriter = {
  writeReport() {
    return 'local-artifact:fixture/recovery.report.json#sha256=' + 'd'.repeat(64);
  },
  writeReceipt() {
    return 'local-artifact:fixture/recovery.receipt.json#sha256=' + 'e'.repeat(64);
  },
};

async function inspect(obs) {
  return owner.inspectPacket(2693, {
    collectObservation: async () => obs,
    artifactWriter,
    runner() {
      return {code: 1, stdout: '', stderr: ''};
    },
  });
}

test('one-call fixture classifies #2693-like abandoned lease release', async () => {
  const out = await inspect(observation());
  assert.equal(out.view.result, 'PASS');
  assert.equal(out.view.attentionDisposition, 'COMPLETE');
  assert.equal(out.view.output.recoveryDisposition, 'ABANDONED_LEASE_RELEASE');
  assert.equal(out.view.output.sessionState, 'ABSENT');
  assert.equal(out.view.output.dirtyState, 'PRESERVED');
  assert.equal(
    out.view.nextLegalAction,
    'RELEASE_PRIOR_D013_THROUGH_EXISTING_OWNER_THEN_REACQUIRE_REBIND',
  );
});

test('another RDC command session fails closed and never becomes LIVE', async () => {
  const obs = observation({
    sessionRead: {state: 'UNKNOWN', reason: 'OTHER_RDC_COMMAND_SESSION_PRESENT'},
    reasonCodes: ['OTHER_RDC_COMMAND_SESSION_PRESENT'],
  });
  const out = await inspect(obs);
  assert.equal(out.view.result, 'UNKNOWN');
  assert.equal(out.view.attentionDisposition, 'NEEDS_REVIEW');
  assert.equal(out.view.attention[0].reasonCode, 'HOLDER_AUTHORITY_UNRESOLVED');
  assert.notEqual(out.evidence.sessionState, 'LIVE');
});

test('session snapshot projects only ABSENT or UNKNOWN', () => {
  assert.deepEqual(
    owner.sessionStateFromSnapshot({
      topologyResolved: true,
      currentRootShell: true,
      otherShellCount: 0,
      unexpectedChildCount: 0,
    }),
    {state: 'ABSENT', reason: 'SOLE_RDC_COMMAND_SESSION'},
  );
  assert.equal(owner.sessionStateFromSnapshot({
    topologyResolved: true,
    currentRootShell: true,
    otherShellCount: 1,
    unexpectedChildCount: 0,
  }).state, 'UNKNOWN');
  assert.equal(owner.sessionStateFromSnapshot({
    topologyResolved: false,
  }).state, 'UNKNOWN');
  for (const snapshot of [
    {topologyResolved: true, currentRootShell: true, otherShellCount: 0, unexpectedChildCount: 0},
    {topologyResolved: true, currentRootShell: true, otherShellCount: 2, unexpectedChildCount: 0},
    {topologyResolved: false},
  ]) {
    assert.notEqual(owner.sessionStateFromSnapshot(snapshot).state, 'LIVE');
  }
});


function procRow(root, pid, ppid, comm, argv) {
  const dir = path.join(root, String(pid));
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, 'stat'), `${pid} (${comm}) S ${ppid} 0 0 0 0\n`);
  fs.writeFileSync(path.join(dir, 'comm'), comm + '\n');
  fs.writeFileSync(path.join(dir, 'cmdline'), Buffer.from(argv.join('\0') + '\0'));
}

test('scanLocalSession excludes current command root and proves sole-session absence', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-recovery-proc-'));
  try {
    procRow(root, 10, 20, 'node', ['node', 'inspect.js']);
    procRow(root, 20, 30, 'sh', ['/bin/sh', '-c', 'node inspect.js']);
    procRow(root, 30, 40, 'node-MainThread', [
      '/data/data/com.termux/files/usr/bin/node',
      '/root/.local/share/desktop-commander-remote/node_modules/@wonderwhy-er/desktop-commander/dist/index.js',
    ]);
    const result = owner.scanLocalSession({procRoot: root, selfPid: 10});
    assert.deepEqual(result, {state: 'ABSENT', reason: 'SOLE_RDC_COMMAND_SESSION'});
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('scanLocalSession treats another command root as UNKNOWN', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-recovery-proc-'));
  try {
    procRow(root, 10, 20, 'node', ['node', 'inspect.js']);
    procRow(root, 20, 30, 'sh', ['/bin/sh', '-c', 'node inspect.js']);
    procRow(root, 30, 40, 'node-MainThread', [
      '/data/data/com.termux/files/usr/bin/node',
      '/root/.local/share/desktop-commander-remote/node_modules/@wonderwhy-er/desktop-commander/dist/index.js',
    ]);
    procRow(root, 21, 30, 'sh', ['/bin/sh', '-c', 'sleep 20']);
    const result = owner.scanLocalSession({procRoot: root, selfPid: 10});
    assert.equal(result.state, 'UNKNOWN');
    assert.equal(result.reason, 'OTHER_RDC_COMMAND_SESSION_PRESENT');
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});


test('collector read failure still returns canonical UNKNOWN view', async () => {
  const out = await owner.inspectPacket(2693, {
    collectObservation: async () => {
      throw new owner.InspectError(['GITHUB_READ_FAILED']);
    },
    artifactWriter,
    runner() {
      return {code: 1, stdout: '', stderr: 'private raw error'};
    },
  });
  assert.equal(out.view.validity, 'VALID');
  assert.equal(out.view.result, 'UNKNOWN');
  assert.equal(out.view.attentionDisposition, 'UNKNOWN');
  assert.equal(out.view.attention[0].reasonCode, 'PACKET_AUTHORITY_UNRESOLVED');
  assert.ok(out.observation.reasonCodes.includes('GITHUB_READ_FAILED'));
});

test('dirty scope mismatch is conflict', async () => {
  const out = await inspect(observation({
    workspaceRead: {
      workspaceState: 'DIRTY_PRESERVED',
      dirtyScopeState: 'CONFLICT',
      gitIdentityState: 'EXACT',
      reasons: ['DIRTY_SCOPE_CONFLICT'],
    },
    reasonCodes: ['DIRTY_SCOPE_CONFLICT'],
  }));
  assert.equal(out.view.result, 'CONFLICT');
});

test('remote branch advancement requires semantic review', async () => {
  const out = await inspect(observation({
    remoteRead: {state: 'ADVANCED', sha: '3'.repeat(40), reasons: []},
  }));
  assert.equal(out.view.result, 'UNKNOWN');
  assert.equal(out.view.attention[0].reasonCode, 'REMOTE_BRANCH_ADVANCED_REQUIRES_REVIEW');
});

test('published PR requires semantic review', async () => {
  const out = await inspect(observation({
    prRead: {state: 'OPEN_EXACT', locator: 'pr:#999', reasons: []},
  }));
  assert.equal(out.view.result, 'UNKNOWN');
  assert.equal(out.view.attention[0].reasonCode, 'PR_ALREADY_PUBLISHED_REQUIRES_REVIEW');
});

test('partial PR discovery cannot prove absence', () => {
  const out = owner.prObservation(
    {complete: false, rows: []},
    activeLease(),
    {state: 'UNCHANGED_BASE', sha: BASE, reasons: []},
  );
  assert.equal(out.state, 'UNKNOWN');
  assert.ok(out.reasons.includes('PR_DISCOVERY_PARTIAL'));
});

test('blocked release plan stays blocked', async () => {
  const out = await inspect(observation({
    releaseRead: {state: 'BLOCKED', reasons: ['LEASE_RELEASE_BLOCKED']},
  }));
  assert.equal(out.view.result, 'BLOCKED');
  assert.ok(out.receipt.blockers.includes('D013_RELEASE_NOT_ELIGIBLE'));
});

test('manifest conflict fails closed', async () => {
  const out = await inspect(observation({
    manifestRead: {state: 'CONFLICT', manifest: null, reasons: ['MANIFEST_MATCH_DUPLICATE']},
  }));
  assert.equal(out.view.result, 'CONFLICT');
});

test('holder mismatch fails closed', async () => {
  const out = await inspect(observation({
    holderState: {state: 'CONFLICT', reasons: ['HOLDER_IDENTITY_CONFLICT']},
  }));
  assert.equal(out.view.result, 'CONFLICT');
});

test('manifest candidate selection rejects duplicate matching envelopes', () => {
  const m = manifest();
  const rendered = handoff.renderManifest(m);
  const result = owner.manifestCandidates(
    {complete: true, rows: [{body: rendered}, {body: rendered}]},
    packet(),
    activeLease(),
    {record: {manifestId: m.manifestId, leaseId: LEASE}},
  );
  assert.equal(result.state, 'CONFLICT');
  assert.ok(result.reasons.includes('MANIFEST_MATCH_DUPLICATE'));
});

test('holder finalization requires exact manifest identity', () => {
  const m = manifest();
  const result = owner.finalizeHolderState(
    {
      state: 'PRESENT_UNBOUND',
      record: {manifestId: 'f'.repeat(64), leaseId: LEASE},
      reasons: [],
    },
    {state: 'EXACT', manifest: m, reasons: []},
    activeLease(),
  );
  assert.equal(result.state, 'CONFLICT');
});

test('release eligibility mapping is plan only', () => {
  assert.equal(owner.releaseEligibilityObservation({
    status: 'PLAN_READY',
    operation: 'release',
  }).state, 'PROVEN');
  assert.equal(owner.releaseEligibilityObservation({
    status: 'BLOCKED',
    reasonCodes: ['X'],
  }).state, 'BLOCKED');
  assert.equal(owner.releaseEligibilityObservation({
    status: 'UNKNOWN',
    reasonCodes: ['Y'],
  }).state, 'UNKNOWN');
});

test('CLI is fixed and rejects repo, owner or process selectors', () => {
  assert.deepEqual(owner.parseArgs([
    'inspect', '--packet', '#2706', '--format', 'agent-view',
  ]), {packetNumber: 2706, format: 'agent-view'});
  for (const argv of [
    ['inspect', '--packet', '#2706', '--format', 'agent-view', '--repo', 'other/x'],
    ['inspect', '--packet', '#2706', '--format', 'agent-view', '--owner', 'x'],
    ['inspect', '--packet', '#2706', '--format', 'agent-view', '--pid', '1'],
    ['inspect', '--packet', '#2706', '--format', 'agent-view', '--worktree', '/tmp/x'],
  ]) {
    assert.throws(() => owner.parseArgs(argv));
  }
});

test('sanitized report excludes process and holder capability material', () => {
  const obs = observation({
    reasonCodes: ['OTHER_RDC_COMMAND_SESSION_PRESENT'],
  });
  const evidence = owner.buildRecoveryEvidence(obs);
  const report = owner.sanitizedReport(obs, evidence, {
    recoveryDisposition: 'NEEDS_REVIEW',
    result: 'UNKNOWN',
    attentionDisposition: 'NEEDS_REVIEW',
    reasonCode: 'HOLDER_AUTHORITY_UNRESOLVED',
    nextLegalAction: 'SEMANTIC_REVIEW_REQUIRED',
  });
  const text = JSON.stringify(report);
  for (const forbidden of [
    'claimDigest', 'holderClaim', 'cmdline', 'ppid', 'pid', 'session_id',
    'device_id', 'auth_token', 'processTree', 'environment',
  ]) assert.equal(text.includes(forbidden), false, forbidden);
});

test('source has no recovery or repository mutation effect surface', () => {
  const source = fs.readFileSync(path.join(__dirname, '../mcl-effect-recovery-inspect.cjs'), 'utf8');
  for (const forbidden of [
    'dispatchPlan(',
    'dispatchRecoveryPlan(',
    'claimHolder(',
    'releaseHolder(',
    'cleanupStale(',
    "['workflow', 'run'",
    "'PATCH'",
    "'POST'",
    "['add'",
    "['commit'",
    "['push'",
    "['reset'",
    "['checkout'",
    "['clean'",
    'process.kill(',
    'childProcess.kill',
  ]) assert.equal(source.includes(forbidden), false, forbidden);
  assert.ok(source.includes('operator.planRelease('));
  assert.ok(source.includes('recovery.projectRecoveryEvidence('));
});

test('buildRecoveryEvidence never manufactures LIVE session authority', () => {
  const abs = owner.buildRecoveryEvidence(observation());
  assert.equal(abs.sessionState, 'ABSENT');
  const unknown = owner.buildRecoveryEvidence(observation({
    sessionRead: {state: 'UNKNOWN', reason: 'OTHER_RDC_COMMAND_SESSION_PRESENT'},
  }));
  assert.equal(unknown.sessionState, 'UNKNOWN');
  assert.notEqual(abs.sessionState, 'LIVE');
  assert.notEqual(unknown.sessionState, 'LIVE');
});
