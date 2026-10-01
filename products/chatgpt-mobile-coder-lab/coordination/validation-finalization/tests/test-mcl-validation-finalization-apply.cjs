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
  assert.deepEqual(
    owner.parseArgs(['inspect', '--packet', '#3043', '--format', 'agent-view']),
    {command: 'inspect', packetRef: '#3043', format: 'agent-view'},
  );
  assert.deepEqual(
    owner.parseArgs(['inspect', '--packet', '#3051', '--format', 'agent-view']),
    {command: 'inspect', packetRef: '#3051', format: 'agent-view'},
  );
  assert.deepEqual(
    owner.parseArgs(['inspect', '--packet', '#3092', '--format', 'agent-view']),
    {command: 'inspect', packetRef: '#3092', format: 'agent-view'},
  );
  assert.deepEqual(
    owner.parseArgs(['inspect', '--packet', '#3099', '--format', 'agent-view']),
    {command: 'inspect', packetRef: '#3099', format: 'agent-view'},
  );
  assert.deepEqual(
    owner.parseArgs(['inspect', '--packet', '#3144', '--format', 'agent-view']),
    {command: 'inspect', packetRef: '#3144', format: 'agent-view'},
  );
  assert.deepEqual(
    owner.parseArgs(['inspect', '--packet', '#3149', '--format', 'agent-view']),
    {command: 'inspect', packetRef: '#3149', format: 'agent-view'},
  );
  for (const argv of [
    ['apply', '--packet', '#0', '--format', 'json'],
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

test('compile-time profiles are exactly #2463, #2786, #3043, #3051, #3092, #3099 and #3144', () => {
  assert.deepEqual(Object.keys(owner.PROFILES).sort(), ['#2463', '#2786', '#3043', '#3051', '#3092', '#3099', '#3144']);
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
  assert.equal(owner.TARGET_3043.packet, 3043);
  assert.equal(owner.TARGET_3043.pr, 3046);
  assert.equal(owner.TARGET_3043.candidate,
    'a2c0e07b591d501c1142e160e035f470e8eee99b');
  assert.equal(owner.TARGET_3043.merge,
    'c12f904cf8c322c3431e4689e85554e645df77be');
  assert.equal(owner.TARGET_3043.implementationReceiptDigest,
    '705334f84db38572a6ef5e63097c695605b15e347da90cd5c354090e0d3a8da2');
  assert.deepEqual(owner.TARGET_3043.requiredCoordinationGates, [
    'd013-release',
    'd014-completion',
    'currentization-coordination-released',
    'currentization-d014-complete',
    'currentization-scope-and-blob-preservation',
    'currentization-replay-safe',
  ]);
  assert.equal(owner.TARGET_3051.packet, 3051);
  assert.equal(owner.TARGET_3051.pr, 3053);
  assert.equal(owner.TARGET_3051.candidate,
    '86eeab83a743bda412d6e2e0ab8ad4d7fd89c012');
  assert.equal(owner.TARGET_3051.merge,
    'f01f6f40df00c3886f553931f0aaa1cfa3b99bee');
  assert.equal(owner.TARGET_3051.implementationReceiptDigest,
    '3db0f963b917b627ddb90f8ed3d005cf2fd2e3f092abbe60e1890d133cc6b03c');
  assert.deepEqual(owner.TARGET_3051.requiredCoordinationGates, [
    'currentization-scope-and-blob-preservation',
    'd013-d014-holder-convergence',
    'd013-release',
    'd014-completion',
  ]);
  assert.equal(owner.TARGET_3092.packet, 3092);
  assert.equal(owner.TARGET_3092.pr, 3094);
  assert.equal(owner.TARGET_3092.candidate,
    'f8541fa5637296575deda6b561520401e14ca782');
  assert.equal(owner.TARGET_3092.merge,
    'eee0ed8f3172d31d7ec967fb330227045926e3cb');
  assert.equal(owner.TARGET_3092.implementationReceiptDigest,
    'a142d048af6026ad708d7566379d792a83b56e3d0dcfe7561fa1778bf076eba5');
  assert.deepEqual(owner.TARGET_3092.requiredCoordinationGates, [
    'currentization-scope-and-blob-preservation',
    'd013-release',
    'd014-completion',
  ]);
  assert.equal(owner.TARGET_3099.packet, 3099);
  assert.equal(owner.TARGET_3099.pr, 3102);
  assert.equal(owner.TARGET_3099.candidate,
    'e7866d0a9869a9f46f5ea5b8ee6890087497ec5d');
  assert.equal(owner.TARGET_3099.merge,
    '4a9b242380b05582eae7221f11686986c55f8b26');
  assert.equal(owner.TARGET_3099.workspaceManifestId,
    'fad85ff9e714d7c17495849dc84f75e460b82228e8f985716d8c4dde8355611a');
  assert.equal(owner.TARGET_3099.workspaceManifestPhaseId,
    '3099-implementation-pr-stage-entry');
  assert.equal(owner.TARGET_3099.workspaceLeaseId,
    '0e91520c043389d3845001900db31d2c16638f27180766d66b96951a92cfd7c9');
  assert.equal(owner.TARGET_3099.workspaceAcquiredGeneration, 626);
  assert.equal(owner.TARGET_3099.workspaceBranch, 'server/mcl-packet-3099');
  assert.equal(owner.TARGET_3099.workspaceWorktree, '/root/nyang-worktrees/mcl-packet-3099');
  assert.equal(owner.TARGET_3099.implementationReceiptDigest,
    'd11741c406b8786fb9365dc107fd63fcad04bd1f427b31aa7608aa700a0e5896');
  assert.deepEqual(owner.TARGET_3099.requiredCoordinationGates, [
    'currentization-scope-and-blob-preservation',
    'd013-release',
    'd014-completion',
  ]);
  assert.equal(owner.TARGET_3144.packet, 3144);
  assert.equal(owner.TARGET_3144.pr, 3147);
  assert.equal(owner.TARGET_3144.candidate,
    '900d3c67d9ff0f831b6efaec0dee69f1ebba4ee7');
  assert.equal(owner.TARGET_3144.merge,
    '2db2e75187c67a39e6b1b012a704f871982ba930');
  assert.equal(owner.TARGET_3144.workspaceManifestId,
    '9a4f4d2b279942ffbb462e9fa135dca89a3de1a02c3650b284817d44bc1da89c');
  assert.equal(owner.TARGET_3144.workspaceManifestPhaseId,
    '3144-implementation-pr-stage-entry');
  assert.equal(owner.TARGET_3144.workspaceLeaseId,
    'f83f3788990ce9567a804f0e08b8886cc0cdddb596ccaf9e88046088d2ad29c5');
  assert.equal(owner.TARGET_3144.workspaceAcquiredGeneration, 664);
  assert.equal(owner.TARGET_3144.workspaceBranch, 'server/mcl-packet-3144');
  assert.equal(owner.TARGET_3144.workspaceWorktree, '/root/nyang-worktrees/mcl-packet-3144');
  assert.equal(owner.TARGET_3144.implementationReceiptDigest,
    '5ab640da43f4b8ced263ada4b021d6760249535ac5959c7a3a054425b74fb78d');
  assert.deepEqual(owner.TARGET_3144.requiredCoordinationGates, [
    'currentization-scope-and-blob-preservation',
    'd013-release',
    'd014-completion',
  ]);
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
test('#3043 fixed profile reuses stage-receipt-only implementation coordination path', () => {
  let phase = 0;
  const calls = [];
  const ctx = {
    ...fake2786Context(),
    target: owner.TARGET_3043,
    packet: 3043,
    packetRef: '#3043',
  };
  const result = owner.applyPacket('#3043', {
    createContext: () => ctx,
    readState: () => phase === 0
      ? fake2786State()
      : fake2786State({disposition: 'ALREADY_FINALIZED', stage: 'PASS'}),
    buildValidationStageText: () => ({text: 'STAGE3043'}),
    publishExact: (packet, body) => {
      calls.push([packet, body]);
      phase = 1;
      return {written: 1, reused: 0, lostAckRecovered: false};
    },
  });
  assert.equal(result.status, 'PASS');
  assert.equal(result.packetRef, '#3043');
  assert.deepEqual(result.effects, {
    holderCleaned: 0, d014Published: 0, stageReceiptPublished: 1,
  });
  assert.deepEqual(calls, [[3043, 'STAGE3043']]);
});

test('#3051 fixed profile reuses stage-receipt-only implementation coordination path', () => {
  let phase = 0;
  const calls = [];
  const ctx = {
    ...fake2786Context(),
    target: owner.TARGET_3051,
    packet: 3051,
    packetRef: '#3051',
  };
  const result = owner.applyPacket('#3051', {
    createContext: () => ctx,
    readState: () => phase === 0
      ? fake2786State()
      : fake2786State({disposition: 'ALREADY_FINALIZED', stage: 'PASS'}),
    buildValidationStageText: () => ({text: 'STAGE3051'}),
    publishExact: (packet, body) => {
      calls.push([packet, body]);
      phase = 1;
      return {written: 1, reused: 0, lostAckRecovered: false};
    },
  });
  assert.equal(result.status, 'PASS');
  assert.equal(result.packetRef, '#3051');
  assert.deepEqual(result.effects, {
    holderCleaned: 0, d014Published: 0, stageReceiptPublished: 1,
  });
  assert.deepEqual(calls, [[3051, 'STAGE3051']]);
});

test('#3092 fixed profile reuses stage-receipt-only implementation coordination path', () => {
  let phase = 0;
  const calls = [];
  const ctx = {
    ...fake2786Context(),
    target: owner.TARGET_3092,
    packet: 3092,
    packetRef: '#3092',
  };
  const result = owner.applyPacket('#3092', {
    createContext: () => ctx,
    readState: () => phase === 0
      ? fake2786State()
      : fake2786State({disposition: 'ALREADY_FINALIZED', stage: 'PASS'}),
    buildValidationStageText: () => ({text: 'STAGE3092'}),
    publishExact: (packet, body) => {
      calls.push([packet, body]);
      phase = 1;
      return {written: 1, reused: 0, lostAckRecovered: false};
    },
  });
  assert.equal(result.status, 'PASS');
  assert.equal(result.packetRef, '#3092');
  assert.deepEqual(result.effects, {
    holderCleaned: 0, d014Published: 0, stageReceiptPublished: 1,
  });
  assert.deepEqual(calls, [[3092, 'STAGE3092']]);
});

test('#3099 fixed profile reuses stage-receipt-only implementation coordination path', () => {
  let phase = 0;
  const calls = [];
  const ctx = {
    ...fake2786Context(),
    target: owner.TARGET_3099,
    packet: 3099,
    packetRef: '#3099',
  };
  const result = owner.applyPacket('#3099', {
    createContext: () => ctx,
    readState: () => phase === 0
      ? fake2786State()
      : fake2786State({disposition: 'ALREADY_FINALIZED', stage: 'PASS'}),
    buildValidationStageText: () => ({text: 'STAGE3099'}),
    publishExact: (packet, body) => {
      calls.push([packet, body]);
      phase = 1;
      return {written: 1, reused: 0, lostAckRecovered: false};
    },
  });
  assert.equal(result.status, 'PASS');
  assert.equal(result.packetRef, '#3099');
  assert.deepEqual(result.effects, {
    holderCleaned: 0, d014Published: 0, stageReceiptPublished: 1,
  });
  assert.deepEqual(calls, [[3099, 'STAGE3099']]);
});

test('#3144 fixed profile reuses stage-receipt-only implementation coordination path', () => {
  let phase = 0;
  const calls = [];
  const ctx = {
    ...fake2786Context(),
    target: owner.TARGET_3144,
    packet: 3144,
    packetRef: '#3144',
  };
  const result = owner.applyPacket('#3144', {
    createContext: () => ctx,
    readState: () => phase === 0
      ? fake2786State()
      : fake2786State({disposition: 'ALREADY_FINALIZED', stage: 'PASS'}),
    buildValidationStageText: () => ({text: 'STAGE3144'}),
    publishExact: (packet, body) => {
      calls.push([packet, body]);
      phase = 1;
      return {written: 1, reused: 0, lostAckRecovered: false};
    },
  });
  assert.equal(result.status, 'PASS');
  assert.equal(result.packetRef, '#3144');
  assert.deepEqual(result.effects, {
    holderCleaned: 0, d014Published: 0, stageReceiptPublished: 1,
  });
  assert.deepEqual(calls, [[3144, 'STAGE3144']]);
});

test('#3092 receipt selection requires exact digest and all fixed coordination gates', () => {
  const target = owner.TARGET_3092;
  const row = {
    comment: {id: 1},
    receipt: {
      stage: 'IMPLEMENTATION_PR',
      packetNumber: 3092,
      status: 'PASS',
      nextLegalAction: 'VALIDATION_MERGE',
      receiptDigest: target.implementationReceiptDigest,
      authorityRefs: [
        {kind: 'PR', locator: 'pr:#3094', identity: target.candidate},
      ],
      requiredGates: target.requiredCoordinationGates.map((name) => ({
        name, result: 'PASS',
      })),
    },
  };
  assert.equal(owner.select2786ImplementationReceipt(
    [row], {head: {sha: target.candidate}}, target), row);
  assert.throws(() => owner.select2786ImplementationReceipt(
    [{...row, receipt: {...row.receipt,
      requiredGates: row.receipt.requiredGates.slice(1)}}],
    {head: {sha: target.candidate}}, target), owner.ApplyError);
  assert.throws(() => owner.select2786ImplementationReceipt(
    [{...row, receipt: {...row.receipt, receiptDigest: 'a'.repeat(64)}}],
    {head: {sha: target.candidate}}, target), owner.ApplyError);
});

test('#3099 receipt selection requires exact digest and all fixed coordination gates', () => {
  const target = owner.TARGET_3099;
  const row = {
    comment: {id: 1},
    receipt: {
      stage: 'IMPLEMENTATION_PR',
      packetNumber: 3099,
      status: 'PASS',
      nextLegalAction: 'VALIDATION_MERGE',
      receiptDigest: target.implementationReceiptDigest,
      authorityRefs: [
        {kind: 'PR', locator: 'pr:#3102', identity: target.candidate},
      ],
      requiredGates: target.requiredCoordinationGates.map((name) => ({
        name, result: 'PASS',
      })),
    },
  };
  assert.equal(owner.select2786ImplementationReceipt(
    [row], {head: {sha: target.candidate}}, target), row);
  assert.throws(() => owner.select2786ImplementationReceipt(
    [{...row, receipt: {...row.receipt,
      requiredGates: row.receipt.requiredGates.slice(1)}}],
    {head: {sha: target.candidate}}, target), owner.ApplyError);
  assert.throws(() => owner.select2786ImplementationReceipt(
    [{...row, receipt: {...row.receipt, receiptDigest: 'a'.repeat(64)}}],
    {head: {sha: target.candidate}}, target), owner.ApplyError);
});

test('#3144 receipt selection requires exact digest and all fixed coordination gates', () => {
  const target = owner.TARGET_3144;
  const row = {
    comment: {id: 1},
    receipt: {
      stage: 'IMPLEMENTATION_PR',
      packetNumber: 3144,
      status: 'PASS',
      nextLegalAction: 'VALIDATION_MERGE',
      receiptDigest: target.implementationReceiptDigest,
      authorityRefs: [
        {kind: 'PR', locator: 'pr:#3147', identity: target.candidate},
      ],
      requiredGates: target.requiredCoordinationGates.map((name) => ({
        name, result: 'PASS',
      })),
    },
  };
  assert.equal(owner.select2786ImplementationReceipt(
    [row], {head: {sha: target.candidate}}, target), row);
  assert.throws(() => owner.select2786ImplementationReceipt(
    [{...row, receipt: {...row.receipt,
      requiredGates: row.receipt.requiredGates.slice(1)}}],
    {head: {sha: target.candidate}}, target), owner.ApplyError);
  assert.throws(() => owner.select2786ImplementationReceipt(
    [{...row, receipt: {...row.receipt, receiptDigest: 'a'.repeat(64)}}],
    {head: {sha: target.candidate}}, target), owner.ApplyError);
});

test('#3051 receipt selection requires exact digest and all fixed coordination gates', () => {
  const target = owner.TARGET_3051;
  const row = {
    comment: {id: 1},
    receipt: {
      stage: 'IMPLEMENTATION_PR',
      packetNumber: 3051,
      status: 'PASS',
      nextLegalAction: 'VALIDATION_MERGE',
      receiptDigest: target.implementationReceiptDigest,
      authorityRefs: [
        {kind: 'PR', locator: 'pr:#3053', identity: target.candidate},
      ],
      requiredGates: target.requiredCoordinationGates.map((name) => ({
        name, result: 'PASS',
      })),
    },
  };
  assert.equal(owner.select2786ImplementationReceipt(
    [row], {head: {sha: target.candidate}}, target), row);
  assert.throws(() => owner.select2786ImplementationReceipt(
    [{...row, receipt: {...row.receipt,
      requiredGates: row.receipt.requiredGates.slice(1)}}],
    {head: {sha: target.candidate}}, target), owner.ApplyError);
  assert.throws(() => owner.select2786ImplementationReceipt(
    [{...row, receipt: {...row.receipt, receiptDigest: 'a'.repeat(64)}}],
    {head: {sha: target.candidate}}, target), owner.ApplyError);
});

test('#3043 receipt selection requires all fixed currentization coordination gates', () => {
  const target = owner.TARGET_3043;
  const row = {
    comment: {id: 1},
    receipt: {
      stage: 'IMPLEMENTATION_PR',
      packetNumber: 3043,
      status: 'PASS',
      nextLegalAction: 'VALIDATION_MERGE',
      receiptDigest: target.implementationReceiptDigest,
      authorityRefs: [
        {kind: 'PR', locator: 'pr:#3046', identity: target.candidate},
      ],
      requiredGates: target.requiredCoordinationGates.map((name) => ({
        name, result: 'PASS',
      })),
    },
  };
  assert.equal(owner.select2786ImplementationReceipt(
    [row], {head: {sha: target.candidate}}, target), row);
  assert.throws(() => owner.select2786ImplementationReceipt(
    [{...row, receipt: {...row.receipt,
      requiredGates: row.receipt.requiredGates.slice(1)}}],
    {head: {sha: target.candidate}}, target), owner.ApplyError);
});

test('arbitrary packet remains outside reviewed finalization targets', () => {
  assert.throws(
    () => owner.inspectPacket('#9999', {
      createSelfOwnerContext: () => {
        throw new owner.ApplyError('BLOCKED', ['PACKET_NOT_REVIEWED_TARGET']);
      },
      readState: () => fake2786State(),
    }),
    (error) => error instanceof owner.ApplyError
      && error.reasonCodes.includes('PACKET_NOT_REVIEWED_TARGET'),
  );
});
test('self-owner class reuses receipt-only implementation coordination path', () => {
  let phase = 0;
  const calls = [];
  const target = {
    ...owner.TARGET_3092,
    packet: 3149,
    packetRef: '#3149',
    pr: 3152,
    candidate: 'a'.repeat(40),
    merge: 'b'.repeat(40),
  };
  const ctx = {
    ...fake2786Context(),
    target,
    packet: 3149,
    packetRef: '#3149',
  };
  const result = owner.applyPacket('#3149', {
    createSelfOwnerContext: () => ctx,
    readState: () => phase === 0
      ? fake2786State()
      : fake2786State({disposition: 'ALREADY_FINALIZED', stage: 'PASS'}),
    buildValidationStageText: () => ({text: 'SELF-STAGE'}),
    publishExact: (packet, body) => {
      calls.push([packet, body]);
      phase = 1;
      return {written: 1, reused: 0, lostAckRecovered: false};
    },
  });
  assert.equal(result.status, 'PASS');
  assert.equal(result.packetRef, '#3149');
  assert.deepEqual(result.effects, {
    holderCleaned: 0, d014Published: 0, stageReceiptPublished: 1,
  });
  assert.deepEqual(calls, [[3149, 'SELF-STAGE']]);
});
test('self-owner implementation receipt requires exact scope and fixed gates', () => {
  const gates = owner.SELF_OWNER_REQUIRED_GATES.map((name) => ({name, result: 'PASS'}));
  const row = {
    comment: {id: 1},
    receipt: {
      stage: 'IMPLEMENTATION_PR',
      packetNumber: 3149,
      status: 'PASS',
      nextLegalAction: 'VALIDATION_MERGE',
      receiptDigest: 'a'.repeat(64),
      authorityRefs: [
        {kind: 'COMMIT', locator: 'candidate-head', identity: 'b'.repeat(40)},
        {kind: 'PR', locator: 'pr:#3152', identity: 'b'.repeat(40)},
      ],
      requiredGates: gates,
      scope: {
        paths: owner.SELF_OWNER_PATHS,
        diffRequired: true,
        diffIdentity: 'c'.repeat(64),
      },
    },
  };
  const selected = owner.selectSelfOwnerImplementationReceipt([row], 3149);
  assert.equal(selected.pr, 3152);
  assert.equal(selected.candidate, 'b'.repeat(40));
  assert.equal(selected.row, row);
  assert.throws(() => owner.selectSelfOwnerImplementationReceipt([{
    ...row,
    receipt: {...row.receipt, requiredGates: gates.slice(1)},
  }], 3149), owner.ApplyError);
  assert.throws(() => owner.selectSelfOwnerImplementationReceipt([{
    ...row,
    receipt: {...row.receipt, scope: {
      ...row.receipt.scope,
      paths: [...owner.SELF_OWNER_PATHS, 'products/near-match.txt'].sort(),
    }},
  }], 3149), owner.ApplyError);
});
test('self-owner implementation receipt conflicts on semantic merged generation drift', () => {
  const gates = owner.SELF_OWNER_REQUIRED_GATES.map((name) => ({name, result: 'PASS'}));
  const make = (id, pr, sha) => ({
    comment: {id},
    receipt: {
      stage: 'IMPLEMENTATION_PR',
      packetNumber: 3149,
      status: 'PASS',
      nextLegalAction: 'VALIDATION_MERGE',
      receiptDigest: String(id).repeat(64).slice(0, 64),
      authorityRefs: [
        {kind: 'COMMIT', locator: 'candidate-head', identity: sha},
        {kind: 'PR', locator: 'pr:#' + pr, identity: sha},
      ],
      requiredGates: gates,
      scope: {paths: owner.SELF_OWNER_PATHS, diffRequired: true, diffIdentity: 'd'.repeat(64)},
    },
  });
  assert.throws(() => owner.selectSelfOwnerImplementationReceipt([
    make(1, 3152, 'b'.repeat(40)),
    make(2, 3153, 'e'.repeat(40)),
  ], 3149), owner.ApplyError);
});
test('self-owner workspace manifest follows selected D014 completion lineage', () => {
  const makeManifest = (leaseId, generation, base) => handoff.buildManifest({
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: '#3149',
    packetBodySha256: 'a'.repeat(64),
    phaseId: '3149-implementation-pr-stage-entry',
    phaseClass: 'REPOSITORY_MUTATION',
    route: 'S',
    executor: 'S',
    scopes: owner.SELF_OWNER_SCOPES,
    workspace: {
      kind: 'repository',
      branch: 'server/mcl-packet-3149',
      worktree: '/root/nyang-worktrees/mcl-packet-3149',
    },
    observedBaseSha: base,
    leaseRequirement: 'REQUIRED',
    leaseEvidence: {
      ledgerRef: '#2352',
      leaseId,
      acquiredGeneration: generation,
      acquireEvidenceRef: 'receipt:mcl-task-lease:' + leaseId + ':generation:' + generation,
    },
    sourceAuthorityRefs: ['#3149', 'issue:#2352'],
    inputRefs: ['commit:' + base],
    expectedOutputRefs: owner.SELF_OWNER_PATHS.map((repoPath) => 'path:' + repoPath),
    acceptanceRefs: ['#3149'],
    stopCondition: 'Test stable self-owner manifest selection.',
    authority: {...handoff.AUTHORITY_FLAGS},
  });
  const historical = makeManifest('b'.repeat(64), 8, 'e'.repeat(40));
  const selectedManifest = makeManifest('c'.repeat(64), 10, 'f'.repeat(40));
  const completion = handoff.buildCompletionReceipt(selectedManifest, {
    disposition: 'COMPLETE',
    outputRefs: ['commit:' + 'd'.repeat(40), 'pr:#3152'],
    validationRefs: ['issue:#3149'],
    observedRefs: ['commit:' + 'd'.repeat(40)],
    leaseDisposition: 'RELEASED',
    leaseReleaseEvidence: {
      ledgerRef: '#2352',
      leaseId: 'c'.repeat(64),
      releasedGeneration: 11,
      evidenceRef: 'run:123',
    },
    workspaceResult: 'clean',
    blockerRefs: [],
    requiredUnknownRefs: [],
  });
  const gates = owner.SELF_OWNER_REQUIRED_GATES.map((name) => ({
    name,
    result: 'PASS',
    evidenceLocator: name === 'd014-completion' ? 'issue-comment:2' : 'issue-comment:1',
  }));
  const impl = {pr: 3152, row: {receipt: {requiredGates: gates}}};
  const comments = [
    {id: 1, body: handoff.renderManifest(historical)},
    {id: 3, body: handoff.renderManifest(selectedManifest)},
    {id: 2, body: handoff.renderCompletionReceipt(completion)},
  ];
  const selected = owner.selectSelfOwnerWorkspaceManifest(
    comments, 3149, '#3149', impl);
  assert.equal(selected.manifest.manifestId, selectedManifest.manifestId);
  assert.equal(selected.manifest.leaseEvidence.acquiredGeneration, 10);
  assert.notEqual(selected.manifest.manifestId, historical.manifestId);

  const missingLocator = {pr: 3152, row: {receipt: {requiredGates: gates.map((gate) =>
    gate.name === 'd014-completion' ? {...gate, evidenceLocator: 'UNKNOWN'} : gate)}}};
  assert.throws(() => owner.selectSelfOwnerWorkspaceManifest(
    comments, 3149, '#3149', missingLocator), owner.ApplyError);

  assert.throws(() => owner.selectSelfOwnerWorkspaceManifest(
    comments.filter((comment) => comment.id !== 3), 3149, '#3149', impl), owner.ApplyError);
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


function validationSetRow(target, {
  gateName = 'gate-a',
  gateEvidence = 'issue:#2463',
  extraWorkflow = false,
  mergeCommit = target.merge,
} = {}) {
  const authorityRefs = [
    {kind: 'COMMIT', locator: 'candidate-head', identity: target.candidate},
    {kind: 'COMMIT', locator: 'merge:#' + target.pr, identity: mergeCommit},
    {kind: 'PR', locator: 'pr:#' + target.pr, identity: target.candidate},
    {kind: 'GIT_REF', locator: 'refs/heads/main', identity: mergeCommit},
  ];
  if (extraWorkflow) {
    authorityRefs.push({kind: 'WORKFLOW_RUN', locator: 'run:12345', identity: target.candidate});
  }
  const receipt = stageReceipt.projectStageReceipt({
    schemaVersion: 1,
    packetNumber: target.packet,
    stage: 'VALIDATION_MERGE',
    authorityRefs,
    requiredGates: [{name: gateName, result: 'PASS', evidenceLocator: gateEvidence}],
    scope: {
      paths: ['products/example.txt'],
      diffRequired: true,
      diffIdentity: '1'.repeat(64),
      diffEvidenceLocator: 'pr:#' + target.pr,
    },
    proof: [
      {term: 'IMPLEMENTED', evidenceLocator: 'commit:' + target.candidate},
      {term: 'CONTRACT_PROVEN', evidenceLocator: gateEvidence},
    ],
    requiredUnknowns: [], conflicts: [], blockers: [], dependencies: [],
    nextLegalAction: 'POSTMERGE_CONVERGENCE',
  });
  assert.equal(receipt.status, 'PASS');
  return {comment: {id: Number(gateName.length)}, receipt,
    text: stageReceipt.renderStageReceipt(receipt)};
}

test('validation stage accepts multiple equivalent immutable canonical receipts', () => {
  const target = owner.TARGET;
  const first = validationSetRow(target);
  const second = validationSetRow(target, {
    gateName: 'gate-b', gateEvidence: 'run:67890', extraWorkflow: true,
  });
  assert.notEqual(first.receipt.receiptDigest, second.receipt.receiptDigest);
  const selected = owner.validationStageState(
    [second, first],
    {scope: {paths: ['products/example.txt'], diffIdentity: '1'.repeat(64)}},
    {merge_commit_sha: target.merge},
  );
  assert.equal(selected.status, 'PASS');
  assert.equal(selected.receiptSetStatus, 'MULTIPLE_EQUIVALENT');
  assert.equal(selected.receipt.receiptDigest,
    [first.receipt.receiptDigest, second.receipt.receiptDigest].sort()[0]);
});

test('equivalent validation receipt set composes with zero-effect ALREADY_FINALIZED retry', () => {
  const target = owner.TARGET;
  const first = validationSetRow(target);
  const second = validationSetRow(target, {
    gateName: 'gate-b', gateEvidence: 'run:67890', extraWorkflow: true,
  });
  const selected = owner.validationStageState(
    [first, second],
    {scope: {paths: ['products/example.txt'], diffIdentity: '1'.repeat(64)}},
    {merge_commit_sha: target.merge},
  );
  let effects = 0;
  const terminal = fakeState({
    disposition: 'ALREADY_FINALIZED', holderState: 'ABSENT',
    completion: 'COMPLETE', stage: 'PASS',
  });
  terminal.validationStage = selected;
  const result = owner.applyPacket('#2463', {
    createContext: () => fakeContext(),
    readState: () => terminal,
    cleanupHolder: () => { effects += 1; },
    publishExact: () => { effects += 1; },
  });
  assert.equal(result.status, 'PASS');
  assert.equal(result.finalizationDisposition, 'ALREADY_FINALIZED');
  assert.equal(effects, 0);
});

test('validation stage still fails closed on semantic receipt-set conflict', () => {
  const target = owner.TARGET;
  const first = validationSetRow(target);
  const conflicting = validationSetRow(target, {mergeCommit: 'a'.repeat(40)});
  assert.throws(() => owner.validationStageState(
    [first, conflicting],
    {scope: {paths: ['products/example.txt'], diffIdentity: '1'.repeat(64)}},
    {merge_commit_sha: target.merge},
  ), (error) => error instanceof owner.ApplyError
    && error.reasonCodes.includes('VALIDATION_STAGE_RECEIPT_CONFLICT'));
});

test('#2786 validation stage shares equivalent receipt-set semantics', () => {
  const target = owner.TARGET_2786;
  const first = validationSetRow(target);
  const second = validationSetRow(target, {
    gateName: 'gate-b', gateEvidence: 'run:67890', extraWorkflow: true,
  });
  const selected = owner.validationStageState2786(
    [first, second],
    {scope: {paths: ['products/example.txt'], diffIdentity: '1'.repeat(64)}},
    {merge_commit_sha: target.merge}, target,
  );
  assert.equal(selected.status, 'PASS');
  assert.equal(selected.receiptSetStatus, 'MULTIPLE_EQUIVALENT');
});

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

test('implementation-coordination profiles cannot synthesize a validation manifest', () => {
  const source = fs.readFileSync(path.join(__dirname,
    '../mcl-validation-finalization-apply.cjs'), 'utf8');
  assert.equal(source.includes('handoff.buildManifest'), false);
  assert.equal(source.includes('buildManifest('), false);
  assert.match(source, /2786_D014_COMPLETION_MUST_BE_NOT_APPLICABLE/);
  assert.equal(source.includes('const target = TARGET_2786;'), false);
  assert.equal(source.includes('publishExact(TARGET_2786.packet'), false);
});

test('runCli rejects unsupported selectors before any live owner call', () => {
  const out = owner.runCli([
    'apply', '--packet', '#2463', '--format', 'json', '--command', 'x',
  ]);
  assert.equal(out.code, 2);
  assert.equal(out.result.status, 'UNKNOWN');
  assert.ok(out.result.reasonCodes.length > 0);
});
