'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const owner = require('../mcl-validation-finalization-apply.cjs');
const ROOT = path.resolve(__dirname, '../../../../..');
const handoff = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));
const stageReceipt = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/work-harness/stage-receipt.cjs'));

function decision(kind, overrides = {}) {
  if (kind === 'ALREADY_FINALIZED') {
    return {
      finalizationDisposition: 'ALREADY_FINALIZED',
      result: 'PASS',
      attentionDisposition: 'COMPLETE',
      requiredEffectClasses: [],
      nextLegalAction: 'POSTMERGE_CONVERGENCE',
      evidenceDigest: 'sha256:' + 'a'.repeat(64),
      ...overrides,
    };
  }
  if (kind === 'FINALIZATION_REQUIRED') {
    return {
      finalizationDisposition: 'FINALIZATION_REQUIRED',
      result: 'PASS',
      attentionDisposition: 'ACTION_REQUIRED',
      requiredEffectClasses: [...owner.EXPECTED_EFFECTS],
      nextLegalAction: 'FIXED_FINALIZATION_EFFECT_REVIEW',
      evidenceDigest: 'sha256:' + 'b'.repeat(64),
      ...overrides,
    };
  }
  return {
    finalizationDisposition: kind,
    result: kind === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
    attentionDisposition: kind === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
    requiredEffectClasses: [],
    nextLegalAction: 'TARGETED_DRILLDOWN_REQUIRED',
    evidenceDigest: 'sha256:' + 'c'.repeat(64),
    ...overrides,
  };
}
function fakeState({
  disposition = 'FINALIZATION_REQUIRED',
  holderState = 'PRESENT_EXACT',
  completion = 'ABSENT',
  stage = 'ABSENT',
  workspace = 'CLEAN',
  requiredEffects = null,
} = {}) {
  const d = decision(disposition);
  if (requiredEffects) d.requiredEffectClasses = requiredEffects;
  return {
    workspace: {holderState, state: workspace},
    completion: {
      status: completion,
      receiptIds: completion === 'COMPLETE' ? ['d'.repeat(64)] : [],
      representativeReceiptId: completion === 'COMPLETE' ? 'd'.repeat(64) : null,
    },
    validationStage: {status: stage, receipt: stage === 'PASS' ? {} : null},
    decision: d,
  };
}
function fakeContext() {
  return {packet: 2463, packetRef: '#2463', runner: () => ({code: 0, stdout: '[]'}),
    implReceipt: {scope: {paths: ['products/example.txt'], diffIdentity: '1'.repeat(64)}}};
}
function decision2786(kind, overrides = {}) {
  if (kind === 'ALREADY_FINALIZED') return decision(kind, overrides);
  if (kind === 'FINALIZATION_REQUIRED') {
    return decision(kind, {
      requiredEffectClasses: [...owner.EXPECTED_EFFECTS_2786],
      ...overrides,
    });
  }
  return decision(kind, overrides);
}
function fake2786State({
  disposition = 'FINALIZATION_REQUIRED',
  stage = 'ABSENT',
  workspace = 'CLEAN',
  holderState = 'ABSENT',
  completion = 'NOT_APPLICABLE',
  requiredEffects = null,
} = {}) {
  const d = decision2786(disposition);
  if (requiredEffects) d.requiredEffectClasses = requiredEffects;
  return {
    workspace: {holderState, state: workspace},
    completion: {status: completion, receiptIds: [], representativeReceiptId: null},
    validationStage: {status: stage, receipt: stage === 'PASS' ? {} : null},
    decision: d,
  };
}
function fake2786Context() {
  return {
    target: owner.TARGET_2786,
    packet: 2786,
    packetRef: '#2786',
    runner: () => ({code: 0, stdout: '[]'}),
    implReceipt: {
      receiptDigest: 'f'.repeat(64),
      authorityRefs: [],
      scope: {paths: ['products/example.txt'], diffIdentity: '1'.repeat(64)},
    },
  };
}

test('public parser accepts only inspect/apply packet+format', () => {
  assert.deepEqual(
    owner.parseArgs(['inspect', '--packet', '#2463', '--format', 'agent-view']),
    {command: 'inspect', packetRef: '#2463', format: 'agent-view'},
  );
  assert.deepEqual(
    owner.parseArgs(['apply', '--packet', '#2463', '--format', 'json']),
    {command: 'apply', packetRef: '#2463', format: 'json'},
  );
  assert.deepEqual(
    owner.parseArgs(['inspect', '--packet', '#2786', '--format', 'agent-view']),
    {command: 'inspect', packetRef: '#2786', format: 'agent-view'},
  );
  for (const argv of [
    ['apply', '--packet', '#1', '--format', 'json'],
    ['apply', '--packet', '#2463', '--format', 'json', '--repo', 'x/y'],
    ['apply', '--packet', '#2463', '--format', 'json', '--pr', '2464'],
    ['apply', '--packet', '#2463', '--format', 'json', '--manifest', 'x'],
    ['apply', '--packet', '#2463', '--format', 'json', '--lease-id', 'x'],
    ['apply', '--packet', '#2463', '--format', 'json', '--worktree', '/tmp/x'],
    ['apply', '--packet', '#2463', '--format', 'raw'],
  ]) assert.throws(() => owner.parseArgs(argv));
});

test('exact V1 effect pair is required', () => {
  assert.equal(owner.effectPairExact(decision('FINALIZATION_REQUIRED')), true);
  assert.equal(owner.effectPairExact(decision('FINALIZATION_REQUIRED', {
    requiredEffectClasses: ['CANONICAL_VALIDATION_MERGE_RECEIPT'],
  })), false);
  assert.equal(owner.effectPairExact(decision('ALREADY_FINALIZED')), false);
});

test('compile-time profiles are exactly #2463 and #2786', () => {
  assert.deepEqual(Object.keys(owner.PROFILES).sort(), ['#2463', '#2786']);
  assert.equal(owner.TARGET_2786.packet, 2786);
  assert.equal(owner.TARGET_2786.pr, 2878);
  assert.equal(owner.TARGET_2786.candidate,
    '81049faef1f4a029af42b3be4d4146341b5167da');
  assert.equal(owner.TARGET_2786.merge,
    '0a25b7691bf5d768aced94403b32ebdb50f12cc3');
  assert.equal(owner.TARGET_2786.workspaceManifestId,
    '60ecd6edd15f59ad81bcaf8bee601490c12f94734ff1111b338eaff2e5048756');
  assert.equal(owner.TARGET_2786.workspaceManifestPhaseId,
    '2786-implementation-pr-stage-entry');
});
test('#2786 exact effect pair is stage-receipt only', () => {
  assert.equal(owner.effectPair2786Exact(decision2786('FINALIZATION_REQUIRED')), true);
  assert.equal(owner.effectPair2786Exact(decision2786('FINALIZATION_REQUIRED', {
    requiredEffectClasses: [...owner.EXPECTED_EFFECTS],
  })), false);
  assert.equal(owner.effectPair2786Exact(decision2786('ALREADY_FINALIZED')), false);
});
test('#2786 implementation receipt requires exact digest and coordination gates', () => {
  const target = {
    ...owner.TARGET_2786,
    implementationReceiptDigest: 'a'.repeat(64),
    requiredCoordinationGates: ['gate-a', 'gate-b'],
  };
  const row = {
    comment: {id: 1},
    receipt: {
      stage: 'IMPLEMENTATION_PR',
      packetNumber: 2786,
      status: 'PASS',
      nextLegalAction: 'VALIDATION_MERGE',
      receiptDigest: 'a'.repeat(64),
      authorityRefs: [
        {kind: 'PR', locator: 'pr:#2878', identity: target.candidate},
      ],
      requiredGates: [
        {name: 'gate-a', result: 'PASS'},
        {name: 'gate-b', result: 'PASS'},
      ],
    },
  };
  assert.equal(owner.select2786ImplementationReceipt(
    [row], {head: {sha: target.candidate}}, target), row);
  assert.throws(
    () => owner.select2786ImplementationReceipt(
      [{...row, receipt: {...row.receipt,
        requiredGates: [{name: 'gate-a', result: 'PASS'}]}}],
      {head: {sha: target.candidate}}, target),
    owner.ApplyError,
  );
});
test('#2786 workspace manifest selection ignores unrelated invalid historical envelopes', () => {
  const manifest = handoff.buildManifest({
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: '#2786',
    packetBodySha256: 'a'.repeat(64),
    phaseId: 'test-2786-stage-entry',
    phaseClass: 'REPOSITORY_MUTATION',
    route: 'S',
    executor: 'S',
    scopes: ['path:products/example.txt'],
    workspace: {
      kind: 'repository',
      branch: 'server/test-2786',
      worktree: '/root/nyang-worktrees/test-2786',
    },
    observedBaseSha: 'b'.repeat(40),
    leaseRequirement: 'REQUIRED',
    leaseEvidence: {
      ledgerRef: '#2352',
      leaseId: 'c'.repeat(64),
      acquiredGeneration: 10,
      acquireEvidenceRef: 'receipt:mcl-task-lease:' + 'c'.repeat(64) + ':generation:10',
    },
    sourceAuthorityRefs: ['#2786', 'issue:#2352'],
    inputRefs: ['commit:' + 'b'.repeat(40)],
    expectedOutputRefs: ['path:products/example.txt'],
    acceptanceRefs: ['#2786'],
    stopCondition: 'Test exact fixed workspace evidence selection.',
    authority: {...handoff.AUTHORITY_FLAGS},
  });
  const target = {
    ...owner.TARGET_2786,
    workspaceManifestId: manifest.manifestId,
    workspaceManifestPhaseId: manifest.phaseId,
    workspaceLeaseId: manifest.leaseEvidence.leaseId,
    workspaceAcquiredGeneration: manifest.leaseEvidence.acquiredGeneration,
    workspaceBranch: manifest.workspace.branch,
    workspaceWorktree: manifest.workspace.worktree,
  };
  const comments = [
    {id: 1, body: '[Reading output]\n<!-- mcl-task-manifest:v1 -->\nnot-json'},
    {id: 2, body: handoff.renderManifest(manifest)},
  ];
  const selected = owner.select2786WorkspaceManifest(comments, target);
  assert.equal(selected.comment.id, 2);
  assert.equal(selected.manifest.manifestId, manifest.manifestId);
});

test('#2786 apply publishes only canonical stage receipt', () => {
  let phase = 0;
  const calls = [];
  const deps = {
    createContext: () => fake2786Context(),
    readState: () => phase === 0
      ? fake2786State()
      : fake2786State({disposition: 'ALREADY_FINALIZED', stage: 'PASS'}),
    buildValidationStageText: () => ({text: 'STAGE2786'}),
    publishExact: (packet, body) => {
      calls.push([packet, body]);
      phase = 1;
      return {written: 1, reused: 0, lostAckRecovered: false};
    },
  };
  const result = owner.applyPacket('#2786', deps);
  assert.equal(result.status, 'PASS');
  assert.equal(result.packetRef, '#2786');
  assert.deepEqual(result.effects, {
    holderCleaned: 0, d014Published: 0, stageReceiptPublished: 1,
  });
  assert.deepEqual(calls, [[2786, 'STAGE2786']]);
});
test('#2786 already-finalized retry is zero-effect', () => {
  let writes = 0;
  const result = owner.applyPacket('#2786', {
    createContext: () => fake2786Context(),
    readState: () => fake2786State({
      disposition: 'ALREADY_FINALIZED', stage: 'PASS',
    }),
    publishExact: () => { writes += 1; return {written: 1}; },
  });
  assert.equal(result.status, 'PASS');
  assert.equal(writes, 0);
  assert.deepEqual(result.effects, {
    holderCleaned: 0, d014Published: 0, stageReceiptPublished: 0,
  });
});
test('#2786 blocks D014 completion or legacy two-effect admission', () => {
  assert.throws(
    () => owner.applyPacket('#2786', {
      createContext: () => fake2786Context(),
      readState: () => fake2786State({completion: 'COMPLETE'}),
    }),
    owner.ApplyError,
  );
  assert.throws(
    () => owner.applyPacket('#2786', {
      createContext: () => fake2786Context(),
      readState: () => fake2786State({
        requiredEffects: [...owner.EXPECTED_EFFECTS],
      }),
    }),
    owner.ApplyError,
  );
});
test('#2786 stage receipt contains no synthetic D014 gate', () => {
  const built = owner.build2786ValidationStageText(fake2786Context());
  const parsed = stageReceipt.parseRenderedStageReceipt(built.text);
  assert.equal(parsed.status, 'VALID');
  assert.equal(parsed.value.packetNumber, 2786);
  assert.equal(parsed.value.stage, 'VALIDATION_MERGE');
  assert.equal(parsed.value.nextLegalAction, 'POSTMERGE_CONVERGENCE');
  const gateNames = parsed.value.requiredGates.map((row) => row.name);
  assert(gateNames.includes('implementation-coordination-converged'));
  assert.equal(gateNames.includes('d014-complete'), false);
});
test('#2786 parsed authority refs are adapted before stage projection', () => {
  const target = owner.TARGET_2786;
  const implementation = stageReceipt.projectStageReceipt({
    schemaVersion: 1,
    packetNumber: 2786,
    stage: 'IMPLEMENTATION_PR',
    authorityRefs: [
      {kind: 'COMMIT', locator: 'commit:' + target.candidate, identity: target.candidate},
      {kind: 'GIT_REF', locator: 'refs/heads/main', identity: 'a53657666566bec4f860f9ef1a76fb7e06d5ae1f'},
      {kind: 'PR', locator: 'pr:#2878', identity: target.candidate},
      {kind: 'WORKFLOW_RUN', locator: 'run:35980921245', identity: 'head:' + target.candidate},
      {kind: 'WORKFLOW_RUN', locator: 'run:35980921358', identity: 'head:' + target.candidate},
    ],
    requiredGates: [
      {name: 'candidate-pr-readback', result: 'PASS', evidenceLocator: 'pr:#2878'},
      {name: 'currentization-scope-and-blob-preservation', result: 'PASS', evidenceLocator: 'issue-comment:5812570628'},
      {name: 'exact-five-path-diff', result: 'PASS', evidenceLocator: 'issue-comment:5811466841'},
      {name: 'exact-head-Required', result: 'PASS', evidenceLocator: 'run:35980921245/job:107572429402'},
      {name: 'exact-head-Verify', result: 'PASS', evidenceLocator: 'run:35980921245/job:107572339322'},
      {name: 'git-diff-check', result: 'PASS', evidenceLocator: 'issue-comment:5811466841'},
      {name: 'guard-anchor-regression', result: 'PASS', evidenceLocator: 'issue-comment:5811466841'},
      {name: 'implementation-coordination-readback', result: 'PASS', evidenceLocator: 'issue-comment:5811466841'},
      {name: 'implementation-d013-release', result: 'PASS', evidenceLocator: 'issue:#2352'},
      {name: 'pocketrisu-helper-docs', result: 'PASS', evidenceLocator: 'run:35980921358'},
      {name: 'shell-syntax', result: 'PASS', evidenceLocator: 'issue-comment:5811466841'},
    ],
    scope: {
      paths: [
        'products/pocketrisu-helper-mod/docs/features/main-phone/main-ssh-tunnel/README.md',
        'products/pocketrisu-helper-mod/docs/features/main-phone/main-ssh-tunnel/UPSTREAM.md',
        'products/pocketrisu-helper-mod/docs/features/main-phone/main-ssh-tunnel/files/21-pocketrisu-core-supervisor-guard',
        'products/pocketrisu-helper-mod/docs/features/main-phone/main-ssh-tunnel/files/pocketrisu-core-supervisor-guard.sh',
        'products/pocketrisu-helper-mod/docs/features/main-phone/main-ssh-tunnel/tests/test-core-supervisor-guard.sh',
      ],
      diffRequired: true,
      diffIdentity: '9bc6c230391527b90c098b61f792ea503e10aeaeb7aa63862d261347bd7ed4ac',
      diffEvidenceLocator: 'pr:#2878',
    },
    proof: [
      {term: 'IMPLEMENTED', evidenceLocator: 'commit:' + target.candidate},
      {term: 'CONTRACT_PROVEN', evidenceLocator: 'issue-comment:5811466841'},
    ],
    requiredUnknowns: [],
    conflicts: [],
    blockers: [],
    dependencies: [],
    nextLegalAction: 'VALIDATION_MERGE',
  });
  assert.equal(implementation.status, 'PASS');
  assert.equal(implementation.receiptDigest, target.implementationReceiptDigest);
  const parsed = stageReceipt.parseRenderedStageReceipt(
    stageReceipt.renderStageReceipt(implementation));
  assert.equal(parsed.status, 'VALID');
  const parsedRuns = parsed.value.authorityRefs.filter((row) => row.kind === 'WORKFLOW_RUN');
  assert.equal(parsedRuns.length, 2);
  assert(parsedRuns.every((row) => row.status === 'KNOWN'));
  assert.deepEqual(owner.stageReceiptAuthorityInput(parsedRuns[0]), {
    kind: parsedRuns[0].kind,
    locator: parsedRuns[0].locator,
    identity: parsedRuns[0].identity,
  });
  const context = fake2786Context();
  context.implReceipt = parsed.value;
  const built = owner.build2786ValidationStageText(context);
  assert.equal(built.receipt.status, 'PASS');
  assert.equal(built.receipt.receiptDigest,
    'e7653e074ecdc65f58119cb37116fa3d5e18846b43d69abd1ce234a600d166f1');
  const finalParsed = stageReceipt.parseRenderedStageReceipt(built.text);
  assert.equal(finalParsed.status, 'VALID');
  assert.equal(finalParsed.value.packetNumber, 2786);
  assert.equal(finalParsed.value.stage, 'VALIDATION_MERGE');
  assert.equal(finalParsed.value.nextLegalAction, 'POSTMERGE_CONVERGENCE');
});

test('#2786 coordination proof fails closed when one gate is missing', () => {
  assert.equal(owner.coordinationGatesProven({
    requiredGates: [
      {name: 'implementation-coordination-readback', result: 'PASS'},
      {name: 'implementation-d013-release', result: 'PASS'},
    ],
  }), true);
  assert.throws(() => owner.coordinationGatesProven({
    requiredGates: [
      {name: 'implementation-d013-release', result: 'PASS'},
    ],
  }), owner.ApplyError);
});

test('apply performs holder cleanup, D014 publish, stage publish, then ALREADY_FINALIZED', () => {
  let phase = 0;
  const calls = [];
  const deps = {
    createContext: () => fakeContext(),
    readState: () => {
      if (phase === 0) return fakeState();
      if (phase === 1) return fakeState({holderState: 'ABSENT'});
      if (phase === 2) return fakeState({
        holderState: 'ABSENT', completion: 'COMPLETE',
      });
      return fakeState({
        disposition: 'ALREADY_FINALIZED',
        holderState: 'ABSENT', completion: 'COMPLETE', stage: 'PASS',
      });
    },
    cleanupHolder: () => { calls.push('holder'); phase = 1; return {cleaned: 1}; },
    buildCompletionText: () => ({text: 'D014'}),
    buildValidationStageText: () => ({text: 'STAGE'}),
    publishExact: (_packet, body) => {
      calls.push(body);
      phase = body === 'D014' ? 2 : 3;
      return {written: 1, reused: 0, lostAckRecovered: false};
    },
  };
  const result = owner.applyPacket('#2463', deps);
  assert.equal(result.status, 'PASS');
  assert.equal(result.finalizationDisposition, 'ALREADY_FINALIZED');
  assert.deepEqual(result.effects, {
    holderCleaned: 1, d014Published: 1, stageReceiptPublished: 1,
  });
  assert.deepEqual(calls, ['holder', 'D014', 'STAGE']);
});

test('already finalized apply is zero-effect idempotent', () => {
  let effectCalls = 0;
  const deps = {
    createContext: () => fakeContext(),
    readState: () => fakeState({
      disposition: 'ALREADY_FINALIZED',
      holderState: 'ABSENT', completion: 'COMPLETE', stage: 'PASS',
    }),
    cleanupHolder: () => { effectCalls += 1; return {cleaned: 1}; },
    publishExact: () => { effectCalls += 1; return {written: 1}; },
  };
  const result = owner.applyPacket('#2463', deps);
  assert.equal(result.status, 'PASS');
  assert.equal(effectCalls, 0);
  assert.deepEqual(result.effects, {
    holderCleaned: 0, d014Published: 0, stageReceiptPublished: 0,
  });
});

test('wrong effect-class subset blocks before all effects', () => {
  let effects = 0;
  const deps = {
    createContext: () => fakeContext(),
    readState: () => fakeState({
      requiredEffects: ['CANONICAL_VALIDATION_MERGE_RECEIPT'],
    }),
    cleanupHolder: () => { effects += 1; },
    publishExact: () => { effects += 1; },
  };
  assert.throws(
    () => owner.applyPacket('#2463', deps),
    (error) => error instanceof owner.ApplyError
      && error.reasonCodes.includes('PRE_EFFECT_FINALIZATION_DISPOSITION_NOT_V1_PAIR'),
  );
  assert.equal(effects, 0);
});

for (const disposition of ['UNKNOWN', 'CONFLICT', 'BLOCKED', 'MERGE_NOT_PROVEN']) {
  test(disposition + ' pre-state performs zero effects', () => {
    let effects = 0;
    const deps = {
      createContext: () => fakeContext(),
      readState: () => fakeState({disposition}),
      cleanupHolder: () => { effects += 1; },
      publishExact: () => { effects += 1; },
    };
    assert.throws(() => owner.applyPacket('#2463', deps), owner.ApplyError);
    assert.equal(effects, 0);
  });
}

test('holder cleanup failure stops before comment writes', () => {
  let writes = 0;
  const deps = {
    createContext: () => fakeContext(),
    readState: () => fakeState(),
    cleanupHolder: () => {
      throw new owner.ApplyError('BLOCKED', ['HOLDER_CLEANUP_FAILED']);
    },
    publishExact: () => { writes += 1; return {written: 1}; },
  };
  assert.throws(() => owner.applyPacket('#2463', deps), owner.ApplyError);
  assert.equal(writes, 0);
});

test('dirty workspace blocks before comment writes', () => {
  let writes = 0;
  let reads = 0;
  const deps = {
    createContext: () => fakeContext(),
    readState: () => {
      reads += 1;
      return reads === 1
        ? fakeState({holderState: 'ABSENT', workspace: 'DIRTY'})
        : fakeState({holderState: 'ABSENT'});
    },
    publishExact: () => { writes += 1; return {written: 1}; },
  };
  assert.throws(
    () => owner.applyPacket('#2463', deps),
    (error) => error.reasonCodes.includes('WORKSPACE_NOT_CLEAN'),
  );
  assert.equal(writes, 0);
});

test('post-effect reinspection must be ALREADY_FINALIZED', () => {
  let phase = 0;
  const deps = {
    createContext: () => fakeContext(),
    readState: () => {
      if (phase === 0) return fakeState({holderState: 'ABSENT'});
      if (phase === 1) return fakeState({holderState: 'ABSENT', completion: 'COMPLETE'});
      return fakeState({holderState: 'ABSENT', completion: 'COMPLETE', stage: 'PASS'});
    },
    buildCompletionText: () => ({text: 'D014'}),
    buildValidationStageText: () => ({text: 'STAGE'}),
    publishExact: (_packet, body) => {
      phase = body === 'D014' ? 1 : 2;
      return {written: 1};
    },
  };
  assert.throws(
    () => owner.applyPacket('#2463', deps),
    (error) => error.reasonCodes.includes('POST_EFFECT_REINSPECT_NOT_ALREADY_FINALIZED'),
  );
});

function manifestFixture() {
  return handoff.buildManifest({
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: '#2463',
    packetBodySha256: 'a'.repeat(64),
    phaseId: 'validation-merge',
    phaseClass: 'VALIDATION',
    route: 'S',
    executor: 'S',
    scopes: ['path:products/example.txt'],
    workspace: {
      kind: 'repository',
      branch: 'server/mcl-wireless-adb-new-chat-landing-2463',
      worktree: '/root/nyang-worktrees/mcl-wireless-adb-new-chat-landing-2463',
    },
    observedBaseSha: owner.TARGET.candidate,
    leaseRequirement: 'REQUIRED',
    leaseEvidence: {
      ledgerRef: '#2352',
      leaseId: owner.TARGET.leaseId,
      acquiredGeneration: owner.TARGET.acquiredGeneration,
      acquireEvidenceRef: 'run:35681889305',
    },
    sourceAuthorityRefs: ['#2463', 'issue:#2352'],
    inputRefs: ['commit:' + owner.TARGET.candidate],
    expectedOutputRefs: ['pr:#2464'],
    acceptanceRefs: ['#2463'],
    stopCondition: 'Test exact validation finalization completion evidence.',
    authority: {...handoff.AUTHORITY_FLAGS},
  });
}

test('D014 completion is built through existing task-handoff owner', () => {
  const manifest = manifestFixture();
  const built = owner.buildCompletionText({manifest});
  const parsed = handoff.parseCompletionReceipt(built.text);
  assert.equal(parsed.status, 'VALID');
  assert.equal(parsed.value.disposition, 'COMPLETE');
  assert.equal(parsed.value.leaseDisposition, 'RELEASED');
  assert.equal(parsed.value.leaseReleaseEvidence.leaseId, owner.TARGET.leaseId);
  assert.equal(parsed.value.leaseReleaseEvidence.releasedGeneration,
    owner.TARGET.releasedGeneration);
  assert.equal(parsed.value.workspaceResult, 'clean');
});

function implementationReceiptFixture() {
  const receipt = stageReceipt.projectStageReceipt({
    schemaVersion: 1,
    packetNumber: 2463,
    stage: 'IMPLEMENTATION_PR',
    authorityRefs: [
      {kind: 'COMMIT', locator: 'candidate', identity: owner.TARGET.candidate},
      {kind: 'PR', locator: 'pr:#2464', identity: owner.TARGET.candidate},
    ],
    requiredGates: [
      {name: 'required', result: 'PASS', evidenceLocator: 'run:1'},
    ],
    scope: {
      paths: ['products/example.txt'],
      diffRequired: true,
      diffIdentity: '1'.repeat(64),
      diffEvidenceLocator: 'pr:#2464',
    },
    proof: [
      {term: 'IMPLEMENTED', evidenceLocator: 'commit:' + owner.TARGET.candidate},
      {term: 'CONTRACT_PROVEN', evidenceLocator: 'run:1'},
    ],
    requiredUnknowns: [],
    conflicts: [],
    blockers: [],
    dependencies: [],
    nextLegalAction: 'VALIDATION_MERGE',
  });
  assert.equal(receipt.status, 'PASS');
  return receipt;
}

test('canonical VALIDATION_MERGE receipt is built through existing owner', () => {
  const implReceipt = implementationReceiptFixture();
  const completion = {
    status: 'COMPLETE',
    representativeReceiptId: 'e'.repeat(64),
  };
  const built = owner.buildValidationStageText({implReceipt}, completion);
  const parsed = stageReceipt.parseRenderedStageReceipt(built.text);
  assert.equal(parsed.status, 'VALID');
  assert.equal(parsed.value.stage, 'VALIDATION_MERGE');
  assert.equal(parsed.value.status, 'PASS');
  assert.equal(parsed.value.nextLegalAction, 'POSTMERGE_CONVERGENCE');
  assert.deepEqual(parsed.value.scope.paths, ['products/example.txt']);
  assert.equal(parsed.value.scope.diffIdentity, '1'.repeat(64));
});

function commentRunner({initial = [], postCode = 0, writeOnFailure = false} = {}) {
  const comments = initial.map((body, index) => ({id: index + 1, body}));
  let posts = 0;
  const runner = (args, options = {}) => {
    const endpoint = args[1] || '';
    const methodIndex = args.indexOf('--method');
    const method = methodIndex >= 0 ? args[methodIndex + 1] : 'GET';
    if (!endpoint.includes('/issues/2463/comments')) {
      return {code: 1, stdout: '', stderr: ''};
    }
    if (method === 'GET') {
      return {code: 0, stdout: JSON.stringify(comments), stderr: ''};
    }
    if (method === 'POST') {
      posts += 1;
      const body = JSON.parse(options.input || '{}').body;
      if (postCode === 0 || writeOnFailure) comments.push({id: comments.length + 1, body});
      return {
        code: postCode,
        stdout: postCode === 0 ? JSON.stringify(comments[comments.length - 1]) : '',
        stderr: '',
      };
    }
    return {code: 1, stdout: '', stderr: ''};
  };
  return {runner, comments, posts: () => posts};
}

test('exact comment publication reuses existing body with zero duplicate writes', () => {
  const fake = commentRunner({initial: ['EXACT']});
  const out = owner.postExactComment(2463, 'EXACT', fake.runner);
  assert.equal(out.written, 0);
  assert.equal(out.reused, 1);
  assert.equal(fake.posts(), 0);
});

test('exact comment publication writes once and verifies readback', () => {
  const fake = commentRunner();
  const out = owner.postExactComment(2463, 'EXACT', fake.runner);
  assert.equal(out.written, 1);
  assert.equal(out.lostAckRecovered, false);
  assert.equal(fake.posts(), 1);
  assert.equal(fake.comments.length, 1);
});

test('lost comment acknowledgement is recovered only by exact readback', () => {
  const fake = commentRunner({postCode: 1, writeOnFailure: true});
  const out = owner.postExactComment(2463, 'EXACT', fake.runner);
  assert.equal(out.written, 1);
  assert.equal(out.lostAckRecovered, true);
  assert.equal(fake.posts(), 1);
});

test('failed comment write without exact readback is UNKNOWN and never retried', () => {
  const fake = commentRunner({postCode: 1, writeOnFailure: false});
  assert.throws(
    () => owner.postExactComment(2463, 'EXACT', fake.runner),
    (error) => error instanceof owner.ApplyError
      && error.reasonCodes.includes('COMMENT_WRITE_ACK_UNKNOWN'),
  );
  assert.equal(fake.posts(), 1);
});

test('duplicate exact comments fail closed', () => {
  const fake = commentRunner({initial: ['EXACT', 'EXACT']});
  assert.throws(
    () => owner.postExactComment(2463, 'EXACT', fake.runner),
    (error) => error.reasonCodes.includes('EXACT_COMMENT_DUPLICATE'),
  );
  assert.equal(fake.posts(), 0);
});

test('inspect is read-only and exposes bounded decision only', () => {
  const result = owner.inspectPacket('#2463', {
    createContext: () => fakeContext(),
    readState: () => fakeState(),
  });
  assert.equal(result.operation, 'inspect');
  assert.equal(result.finalizationDisposition, 'FINALIZATION_REQUIRED');
  assert.deepEqual(result.effects, {
    holderCleaned: 0, d014Published: 0, stageReceiptPublished: 0,
  });
  assert.equal(result.authority.repositoryMutationAuthorized, false);
});

test('agent-view output contains no holder capability or raw execution material', () => {
  const result = owner.inspectPacket('#2463', {
    createContext: () => fakeContext(),
    readState: () => fakeState(),
  });
  const rendered = JSON.stringify(owner.render(result, 'agent-view'));
  for (const forbidden of [
    'claimDigest', 'holderSecret', 'pid', 'process.env', 'authorization',
    'bearer ', 'GH_TOKEN', 'GITHUB_TOKEN',
  ]) assert.equal(rendered.includes(forbidden), false, forbidden);
});

test('source contains no Git/PR/lease/currentization mutation surface', () => {
  const source = fs.readFileSync(path.join(__dirname,
    '../mcl-validation-finalization-apply.cjs'), 'utf8');
  for (const forbidden of [
    'git push', 'git merge', 'git rebase', 'git reset', 'git checkout',
    'git commit', 'git clean', 'git branch -', 'lease-acquire',
    'lease-release', 'workflow run', '--method\', \'PATCH',
    '--method\', \'DELETE', 'process.env', 'claimDigest',
  ]) assert.equal(source.includes(forbidden), false, forbidden);
});

test('source owns only the fixed packet comment write endpoint', () => {
  const source = fs.readFileSync(path.join(__dirname,
    '../mcl-validation-finalization-apply.cjs'), 'utf8');
  assert.match(source, /issues\/\' \+ packet \+ '\/comments/);
  assert.equal(source.includes("'/pulls/' + TARGET.pr + '/comments'"), false);
  assert.equal(source.includes('/git/refs'), false);
  assert.equal(source.includes('/merges'), false);
});

test('#2786 profile cannot synthesize a validation manifest', () => {
  const source = fs.readFileSync(path.join(__dirname,
    '../mcl-validation-finalization-apply.cjs'), 'utf8');
  assert.equal(source.includes('handoff.buildManifest'), false);
  assert.equal(source.includes('buildManifest('), false);
  assert.match(source, /2786_D014_COMPLETION_MUST_BE_NOT_APPLICABLE/);
});

test('runCli rejects unsupported selectors before any live owner call', () => {
  const out = owner.runCli([
    'apply', '--packet', '#2463', '--format', 'json', '--command', 'x',
  ]);
  assert.equal(out.code, 2);
  assert.equal(out.result.status, 'UNKNOWN');
  assert.ok(out.result.reasonCodes.length > 0);
});
