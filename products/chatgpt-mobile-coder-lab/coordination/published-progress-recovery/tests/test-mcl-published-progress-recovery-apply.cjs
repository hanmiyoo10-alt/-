'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const owner = require('../mcl-published-progress-recovery-apply.cjs');
const handoff = require('../../task-handoff.cjs');

const HEAD = 'a'.repeat(40);
const BASE = 'b'.repeat(40);
const LEASE = 'c'.repeat(64);
const MANIFEST = 'd'.repeat(64);
const PACKET_DIGEST = 'e'.repeat(64);
const SCOPES = [
  'path:products/chatgpt-mobile-coder-lab/x.cjs',
  'surface:mcl:test-published-progress',
];
function manifestInput(executor = 'S') {
  return {
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: '#9001',
    packetBodySha256: PACKET_DIGEST,
    phaseId: 'validation-merge',
    phaseClass: 'VALIDATION',
    route: 'S',
    executor,
    scopes: SCOPES,
    workspace: executor === 'S' ? {
      kind: 'repository',
      branch: 'server/mcl-packet-9001',
      worktree: '/root/nyang-worktrees/mcl-packet-9001',
    } : {
      kind: 'repository',
      branch: 'mainphone/mcl-packet-9001',
      worktree: '/data/data/com.termux/files/home/nyang-worktrees/mcl-packet-9001',
    },
    observedBaseSha: BASE,
    leaseRequirement: 'REQUIRED',
    leaseEvidence: {
      ledgerRef: '#2352',
      leaseId: LEASE,
      acquiredGeneration: 7,
      acquireEvidenceRef: 'run:7001',
    },
    sourceAuthorityRefs: ['#9001', 'issue:#2352'],
    inputRefs: ['commit:' + BASE],
    expectedOutputRefs: ['path:products/chatgpt-mobile-coder-lab/x.cjs'],
    acceptanceRefs: ['#9001', 'issue:#2352'],
    stopCondition: 'test',
    authority: {
      repositoryMutationAuthorized: false,
      deviceMutationAuthorized: false,
      mergeAuthorized: false,
      releaseAuthorized: false,
      productionAuthorized: false,
    },
  };
}
function oldManifest(executor = 'S') {
  return handoff.buildManifest(manifestInput(executor));
}
function fakeAdmission(executor = 'S') {
  const manifest = oldManifest(executor);
  return {
    observation: {
      packet: {
        packetRef: '#9001',
        digest: PACKET_DIGEST,
        pathScopes: [SCOPES[0]],
      },
      leaseRead: {
        lease: {
          packetRef: '#9001',
          route: 'S',
          executor,
          scopes: SCOPES,
          workspace: manifest.workspace,
          observedBaseSha: BASE,
          leaseId: LEASE,
        },
      },
      manifestRead: {manifest},
      gitRead: {head: HEAD},
      prRead: {locator: 'pr:#9002'},
    },
    evidence: {sessionState: 'ABSENT'},
    decision: {
      validity: 'VALID',
      result: 'PASS',
      attentionDisposition: 'COMPLETE',
      recoveryDisposition: 'PUBLISHED_PROGRESS_REBIND_ELIGIBLE',
      publishedProgress: 'EXACT_PRESERVED',
      reasonCode: null,
      nextLegalAction: 'PUBLISHED_PROGRESS_RECOVERY_EFFECT_REVIEW',
    },
    decisionLocator: 'local-artifact:/tmp/decision',
    reportLocator: 'local-artifact:/tmp/report',
  };
}
function comment(body) {
  return {body};
}
function packetBody() {
  return [
    '<!-- canonical-main-work-packet:v1 -->',
    '## State',
    '`IN_PROGRESS`',
    '## Bounded implementation write scope',
    '1. `path:products/chatgpt-mobile-coder-lab/x.cjs`',
    '2. `surface:mcl:test-published-progress`',
    '## Interaction stage',
    '- Current stage: `VALIDATION_MERGE`',
  ].join('\n');
}

test('parseArgs exposes only packet format and literal apply', () => {
  assert.deepEqual(
    owner.parseArgs(['inspect', '--packet', '#12', '--format', 'agent-view']),
    {operation: 'inspect', packetNumber: 12, format: 'agent-view'});
  assert.deepEqual(
    owner.parseArgs(['apply', '--packet', '#12', '--apply', '--format', 'receipt']),
    {operation: 'apply', packetNumber: 12, format: 'receipt'});
  assert.throws(() => owner.parseArgs(['apply', '--packet', '#12', '--format', 'receipt']));
  for (const key of ['repo', 'pr', 'branch', 'worktree', 'lease', 'manifest', 'command', 'executor']) {
    assert.throws(() => owner.parseArgs([
      'inspect', '--packet', '#12', '--format', 'agent-view', '--' + key, 'x',
    ]), key);
  }
});

test('recovery identity is deterministic and abandoned-envelope bound', () => {
  const input = {
    packetRef: '#9001',
    oldLeaseId: LEASE,
    oldManifestId: MANIFEST,
    prNumber: 9002,
    preservedHead: HEAD,
  };
  const one = owner.recoveryIdentity(input);
  const two = owner.recoveryIdentity({...input});
  assert.match(one, /^[0-9a-f]{64}$/);
  assert.equal(one, two);
  assert.notEqual(one, owner.recoveryIdentity({...input, preservedHead: 'f'.repeat(40)}));
});

test('exactAdmission accepts only the frozen positive disposition', () => {
  assert.equal(owner.exactAdmission(fakeAdmission()), true);
  const bad = fakeAdmission();
  bad.decision.recoveryDisposition = 'NEEDS_REVIEW';
  assert.equal(owner.exactAdmission(bad), false);
  const present = fakeAdmission();
  present.decision.result = 'UNKNOWN';
  present.decision.attentionDisposition = 'NEEDS_REVIEW';
  assert.equal(owner.exactAdmission(present), false);
});

test('buildPartialReceipt preserves abandoned envelope and recovery identity', () => {
  const manifest = oldManifest();
  const receipt = owner.buildPartialReceipt(manifest, {
    runId: 7002,
    observedGeneration: 8,
  }, '1'.repeat(64), 9002, HEAD);
  assert.equal(receipt.disposition, 'PARTIAL');
  assert.equal(receipt.leaseDisposition, 'RELEASED');
  assert.equal(receipt.leaseReleaseEvidence.leaseId, LEASE);
  assert.equal(receipt.leaseReleaseEvidence.releasedGeneration, 8);
  assert.ok(receipt.validationRefs.includes(
    'receipt:mcl-published-progress-recovery:' + '1'.repeat(64)));
  assert.equal(handoff.verifyReceiptObject(receipt).ok, true);
});

test('buildFreshManifest binds preserved PR head and fresh lease', () => {
  for (const executor of ['S', 'M']) {
    const prior = oldManifest(executor);
    const packet = {
      packetRef: '#9001',
      digest: PACKET_DIGEST,
      pathScopes: [SCOPES[0]],
    };
    const oldLease = {
      route: 'S',
      executor,
      scopes: SCOPES,
      workspace: prior.workspace,
    };
    const fresh = owner.buildFreshManifest({
      packet,
      oldLease,
      freshLease: {leaseId: '2'.repeat(64), observedGeneration: 9},
      oldManifest: prior,
      prNumber: 9002,
      preservedHead: HEAD,
      txId: '3'.repeat(64),
    });
    assert.equal(fresh.phaseId, '9001-published-progress-validation-rebind');
    assert.equal(fresh.phaseClass, 'VALIDATION');
    assert.equal(fresh.observedBaseSha, HEAD);
    assert.equal(fresh.executor, executor);
    assert.equal(fresh.leaseEvidence.leaseId, '2'.repeat(64));
    assert.ok(fresh.inputRefs.includes('pr:#9002'));
    assert.ok(fresh.inputRefs.includes('commit:' + HEAD));
    assert.equal(handoff.verifyManifestObject(fresh).ok, true);
  }
});

test('fresh manifest exact duplicate rows collapse semantically', () => {
  const prior = oldManifest();
  const fresh = owner.buildFreshManifest({
    packet: {packetRef: '#9001', digest: PACKET_DIGEST, pathScopes: [SCOPES[0]]},
    oldLease: {route: 'S', executor: 'S', scopes: SCOPES, workspace: prior.workspace},
    freshLease: {leaseId: '4'.repeat(64), observedGeneration: 10},
    oldManifest: prior,
    prNumber: 9002,
    preservedHead: HEAD,
    txId: '5'.repeat(64),
  });
  const text = handoff.renderManifest(fresh);
  const found = owner.findFreshManifest({
    complete: true,
    rows: [comment(text), comment(text)],
  }, '#9001', 9001);
  assert.equal(found.value.manifestId, fresh.manifestId);
});

test('distinct fresh manifest identities in one semantic slot conflict', () => {
  const prior = oldManifest();
  const base = {
    packet: {packetRef: '#9001', digest: PACKET_DIGEST, pathScopes: [SCOPES[0]]},
    oldLease: {route: 'S', executor: 'S', scopes: SCOPES, workspace: prior.workspace},
    oldManifest: prior,
    prNumber: 9002,
    preservedHead: HEAD,
  };
  const one = owner.buildFreshManifest({
    ...base, freshLease: {leaseId: '6'.repeat(64), observedGeneration: 11},
    txId: '7'.repeat(64),
  });
  const two = owner.buildFreshManifest({
    ...base, freshLease: {leaseId: '8'.repeat(64), observedGeneration: 12},
    txId: '9'.repeat(64),
  });
  assert.throws(() => owner.findFreshManifest({
    complete: true,
    rows: [comment(handoff.renderManifest(one)), comment(handoff.renderManifest(two))],
  }, '#9001', 9001), /FRESH_MANIFEST_IDENTITY_CONFLICT/);
});

test('recovery PARTIAL exact duplicate rows collapse semantically', () => {
  const receipt = owner.buildPartialReceipt(oldManifest(), {
    runId: 7002,
    observedGeneration: 8,
  }, 'a'.repeat(64), 9002, HEAD);
  const text = handoff.renderCompletionReceipt(receipt);
  const found = owner.findRecoveryPartial({
    complete: true,
    rows: [comment(text), comment(text)],
  }, '#9001');
  assert.equal(found.value.receiptId, receipt.receiptId);
});

test('inspect PASS projects one authority-false bounded receipt', async () => {
  const result = await owner.inspectPacket(9001, {
    inspect: async () => fakeAdmission(),
  });
  assert.equal(result.receipt.result, 'PASS');
  assert.equal(result.receipt.attentionDisposition, 'COMPLETE');
  assert.equal(result.receipt.nextLegalAction, 'PUBLISHED_PROGRESS_RECOVERY_EFFECT_REVIEW');
  assert.equal(result.receipt.mutationAuthorized, false);
  assert.equal(result.receipt.mergeAuthorized, false);
  assert.equal(result.output.recoveryDisposition, 'PUBLISHED_PROGRESS_REBIND_ELIGIBLE');
});

test('inspect non-positive admission preserves bounded attention state', async () => {
  const blocked = fakeAdmission();
  blocked.decision.result = 'UNKNOWN';
  blocked.decision.attentionDisposition = 'NEEDS_REVIEW';
  blocked.decision.reasonCode = 'OWNER_SESSION_PRESENT';
  blocked.decision.nextLegalAction = 'TARGETED_REVIEW';
  const result = await owner.inspectPacket(9001, {inspect: async () => blocked});
  assert.equal(result.receipt.result, 'UNKNOWN');
  assert.ok(result.receipt.reasonCodes.includes('OWNER_SESSION_PRESENT'));
  assert.equal(result.receipt.nextLegalAction, 'TARGETED_REVIEW');
});

test('terminal replay path performs zero recovery effects', async () => {
  const result = await owner.applyPacket(9001, {
    readComments: () => ({complete: true, rows: []}),
    readIssue: () => ({state: 'open', body: packetBody()}),
    readLedger: () => ({issue: {body: 'ledger'}, state: {activeLeases: []}}),
    terminalFromFresh: () => ({
      freshManifest: {manifestId: 'b'.repeat(64)},
      disposition: 'RECOVERY_REBIND_READY',
      nextLegalAction: 'VALIDATION_MERGE',
    }),
  });
  assert.equal(result.receipt.result, 'PASS');
  assert.equal(result.receipt.nextLegalAction, 'VALIDATION_MERGE');
  assert.equal(result.output.effects, 0);
});

test('apply refuses a non-positive session/admission before effects', async () => {
  const bad = fakeAdmission();
  bad.decision.result = 'UNKNOWN';
  bad.decision.attentionDisposition = 'NEEDS_REVIEW';
  bad.decision.reasonCode = 'OWNER_SESSION_PRESENT';
  await assert.rejects(() => owner.applyPacket(9001, {
    readComments: () => ({complete: true, rows: []}),
    readIssue: () => ({state: 'open', body: packetBody()}),
    readLedger: () => ({issue: {body: 'ledger'}, state: {activeLeases: []}}),
    terminalFromFresh: () => null,
    inspect: async () => bad,
  }), /OWNER_SESSION_PRESENT/);
});

test('agent view keeps PASS attention empty and authority false', async () => {
  const result = await owner.inspectPacket(9001, {inspect: async () => fakeAdmission()});
  const view = owner.projectView(result, 'local-artifact:/tmp/report');
  assert.equal(view.result, 'PASS');
  assert.equal(view.attentionCount, 0);
  assert.equal(view.nextLegalAction, 'PUBLISHED_PROGRESS_RECOVERY_EFFECT_REVIEW');
});

test('source imports existing owners and exposes no fresh-holder claim', () => {
  const source = fs.readFileSync(path.join(__dirname,
    '../mcl-published-progress-recovery-apply.cjs'), 'utf8');
  for (const needle of [
    "require('./mcl-published-progress-recovery-inspect.cjs')",
    "require('../task-handoff.cjs')",
    "require('../mcl-workspace-holder.cjs')",
    "require('../mcl-coordination-operator.cjs')",
  ]) assert.equal(source.includes(needle), true, needle);
  assert.equal(source.includes('claimHolder('), false);
  assert.equal(source.includes('force-push'), false);
  assert.equal(source.includes('git reset'), false);
});

test('source has no caller-selected recovery identities', () => {
  const source = fs.readFileSync(path.join(__dirname,
    '../mcl-published-progress-recovery-apply.cjs'), 'utf8');
  assert.equal(source.includes("['packet', 'format']"), true);
  for (const selector of [
    "'repo'", "'pr'", "'branch'", "'worktree'", "'lease'", "'manifest'",
    "'executor'", "'route'", "'command'", "'argv'",
  ]) {
    assert.equal(source.includes("['packet', 'format', " + selector), false, selector);
  }
});

test('packet fixture remains parseable at VALIDATION_MERGE', () => {
  const inspector = require('../mcl-published-progress-recovery-inspect.cjs');
  const parsed = inspector.parsePacket(9001, {state: 'open', body: packetBody()});
  assert.equal(parsed.exact, true);
  assert.equal(parsed.projection.interactionStage, 'VALIDATION_MERGE');
  assert.deepEqual(parsed.scopes, SCOPES);
});


test('resume after old release does not dispatch a second release', async () => {
  const inspector = require('../mcl-published-progress-recovery-inspect.cjs');
  const body = packetBody();
  const packet = inspector.parsePacket(9001, {state: 'open', body});
  const input = manifestInput();
  input.packetBodySha256 = packet.digest;
  const prior = handoff.buildManifest(input);
  const admitted = fakeAdmission();
  admitted.observation.packet.digest = packet.digest;
  admitted.observation.manifestRead.manifest = prior;
  admitted.observation.leaseRead.lease.workspace = prior.workspace;
  const seed = owner.seedFromAdmission(packet, admitted);
  const comments = [comment(handoff.renderManifest(prior))];
  let terminalCalls = 0;
  let releaseCalls = 0;
  let acquireCalls = 0;
  let freshActive = false;
  const freshLeaseId = 'f'.repeat(64);

  const result = await owner.applyPacket(9001, {
    readComments: () => ({complete: true, rows: comments}),
    readIssue: () => ({state: 'open', body}),
    readLedger: () => ({
      issue: {body: 'ledger'},
      state: {
        generation: freshActive ? 9 : 8,
        activeLeases: freshActive ? [{
          packetRef: '#9001',
          leaseId: freshLeaseId,
          route: 'S',
          executor: 'S',
          scopes: SCOPES,
          workspace: prior.workspace,
          observedBaseSha: HEAD,
        }] : [],
        lastRelease: {leaseId: LEASE, releasedAtGeneration: 8},
      },
    }),
    terminalFromFresh: () => {
      terminalCalls += 1;
      return terminalCalls === 1 ? null : {
        freshManifest: {manifestId: '1'.repeat(64)},
        disposition: 'RECOVERY_REBIND_READY',
        nextLegalAction: 'VALIDATION_MERGE',
      };
    },
    findSeedForPacket: () => seed,
    releaseOldLease: async () => {
      releaseCalls += 1;
      throw new Error('must not release twice');
    },
    releaseEvidenceFromState: () => ({
      schemaVersion: 1,
      mode: 'MCL_PUBLISHED_PROGRESS_RECOVERY_EFFECT',
      txId: seed.txId,
      effect: 'OLD_D013_RELEASE',
      leaseId: LEASE,
      runId: null,
      observedGeneration: 8,
      evidenceRef: 'issue:#2352',
    }),
    holderState: () => ({state: 'ABSENT'}),
    assertCurrentBarrier: () => HEAD,
    discoverFreshOverlap: () => ({state: 'DISJOINT', discovery: 'COMPLETE'}),
    recheckPublishedIdentity: () => ({}),
    exactFreshActiveLease: () => null,
    acquireFreshLease: async () => {
      acquireCalls += 1;
      freshActive = true;
      return {leaseId: freshLeaseId, observedGeneration: 9};
    },
    writeImmutableRecord: () => ({written: 1}),
    postSemanticComment: (_packet, text) => {
      comments.push(comment(text));
      return {written: 1, reused: 0};
    },
  });

  assert.equal(releaseCalls, 0);
  assert.equal(acquireCalls, 1);
  assert.equal(result.receipt.result, 'PASS');
  assert.equal(result.receipt.nextLegalAction, 'VALIDATION_MERGE');
});

test('resume after fresh acquire never mints a second same-packet lease', async () => {
  const inspector = require('../mcl-published-progress-recovery-inspect.cjs');
  const body = packetBody();
  const packet = inspector.parsePacket(9001, {state: 'open', body});
  const input = manifestInput();
  input.packetBodySha256 = packet.digest;
  const prior = handoff.buildManifest(input);
  const admitted = fakeAdmission();
  admitted.observation.packet.digest = packet.digest;
  admitted.observation.manifestRead.manifest = prior;
  admitted.observation.leaseRead.lease.workspace = prior.workspace;
  const seed = owner.seedFromAdmission(packet, admitted);
  const release = {
    runId: null,
    observedGeneration: 8,
    evidenceRef: 'issue:#2352',
  };
  const partial = owner.buildPartialReceipt(prior, release, seed.txId, 9002, HEAD);
  const comments = [
    comment(handoff.renderManifest(prior)),
    comment(handoff.renderCompletionReceipt(partial)),
  ];
  const freshLeaseId = 'f'.repeat(64);
  const activeFresh = {
    packetRef: '#9001',
    leaseId: freshLeaseId,
    route: 'S',
    executor: 'S',
    scopes: SCOPES,
    workspace: prior.workspace,
    observedBaseSha: HEAD,
  };
  let acquireCalls = 0;
  let terminalCalls = 0;

  const result = await owner.applyPacket(9001, {
    readComments: () => ({complete: true, rows: comments}),
    readIssue: () => ({state: 'open', body}),
    readLedger: () => ({
      issue: {body: 'ledger'},
      state: {
        generation: 9,
        activeLeases: [activeFresh],
        lastRelease: {leaseId: LEASE, releasedAtGeneration: 8},
      },
    }),
    terminalFromFresh: () => {
      terminalCalls += 1;
      return terminalCalls === 1 ? null : {
        freshManifest: {manifestId: '2'.repeat(64)},
        disposition: 'RECOVERY_REBIND_READY',
        nextLegalAction: 'VALIDATION_MERGE',
      };
    },
    findSeedForPacket: () => seed,
    holderState: () => ({state: 'ABSENT'}),
    assertCurrentBarrier: () => HEAD,
    discoverFreshOverlap: () => ({state: 'DISJOINT', discovery: 'COMPLETE'}),
    recheckPublishedIdentity: () => ({}),
    exactFreshActiveLease: () => activeFresh,
    readFreshLeaseRecord: () => ({
      leaseId: freshLeaseId,
      observedGeneration: 9,
    }),
    acquireFreshLease: async () => {
      acquireCalls += 1;
      throw new Error('must not acquire twice');
    },
    postSemanticComment: (_packet, text) => {
      comments.push(comment(text));
      return {written: 1, reused: 0};
    },
  });

  assert.equal(acquireCalls, 0);
  assert.equal(result.receipt.result, 'PASS');
  assert.equal(result.receipt.nextLegalAction, 'VALIDATION_MERGE');
});
