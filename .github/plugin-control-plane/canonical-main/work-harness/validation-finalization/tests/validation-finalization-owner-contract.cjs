'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const owner = require('../validation-finalization-owner.cjs');

const CANDIDATE = 'a'.repeat(40);
const MERGE = 'b'.repeat(40);
const DIFF = 'sha256:' + 'c'.repeat(64);
const SCOPE = 'sha256:' + 'd'.repeat(64);

function evidence(overrides = {}) {
  const base = {
    schemaVersion: 1,
    mode: 'VALIDATION_FINALIZATION_EVIDENCE',
    subject: 'issue:#2231',
    packetRef: '#2231',
    packetState: 'EXACT',
    validationStageState: 'COMPATIBLE',
    expected: {
      prNumber: 2242,
      candidateHead: CANDIDATE,
      diffIdentity: DIFF,
      pathScopeDigest: SCOPE,
    },
    mergeEvidence: {
      state: 'MERGED',
      prNumber: 2242,
      candidateHead: CANDIDATE,
      mergeCommit: MERGE,
      diffIdentity: DIFF,
      pathScopeDigest: SCOPE,
    },
    validationEvidence: {
      state: 'PASS',
      candidateHead: CANDIDATE,
      diffIdentity: DIFF,
    },
    stageReceipt: {
      state: 'PASS',
      packetRef: '#2231',
      prNumber: 2242,
      candidateHead: CANDIDATE,
      mergeCommit: MERGE,
      diffIdentity: DIFF,
      pathScopeDigest: SCOPE,
      nextLegalAction: 'POSTMERGE_CONVERGENCE',
    },
    coordinationState: 'COMPLETE',
    workspaceState: 'CLEAN',
    requiredUnknownState: 'NONE',
    sourceRefs: ['issue:#2231', 'pr:#2242'],
  };
  return {
    ...base,
    ...overrides,
    expected: {...base.expected, ...(overrides.expected || {})},
    mergeEvidence: {...base.mergeEvidence, ...(overrides.mergeEvidence || {})},
    validationEvidence: {...base.validationEvidence, ...(overrides.validationEvidence || {})},
    stageReceipt: {...base.stageReceipt, ...(overrides.stageReceipt || {})},
  };
}

test('#2231/#2242-equivalent exact fixture is already finalized', () => {
  const out = owner.projectValidationFinalization(evidence());
  assert.equal(out.result, 'PASS');
  assert.equal(out.finalizationDisposition, 'ALREADY_FINALIZED');
  assert.equal(out.nextLegalAction, 'POSTMERGE_CONVERGENCE');
  assert.deepEqual(out.requiredEffectClasses, []);
  assert.equal(out.effectsPerformed, false);
});

test('#2569 canonical finalized fixture is already finalized', () => {
  const candidate = 'e'.repeat(40);
  const merge = 'f'.repeat(40);
  const diff = 'sha256:' + '1'.repeat(64);
  const scope = 'sha256:' + '2'.repeat(64);
  const out = owner.projectValidationFinalization(evidence({
    subject: 'issue:#2569',
    packetRef: '#2569',
    expected: {prNumber: 2765, candidateHead: candidate, diffIdentity: diff, pathScopeDigest: scope},
    mergeEvidence: {
      prNumber: 2765,
      candidateHead: candidate,
      mergeCommit: merge,
      diffIdentity: diff,
      pathScopeDigest: scope,
    },
    validationEvidence: {candidateHead: candidate, diffIdentity: diff},
    stageReceipt: {
      packetRef: '#2569',
      prNumber: 2765,
      candidateHead: candidate,
      mergeCommit: merge,
      diffIdentity: diff,
      pathScopeDigest: scope,
    },
    sourceRefs: ['issue:#2569', 'pr:#2765'],
  }));
  assert.equal(out.finalizationDisposition, 'ALREADY_FINALIZED');
});

test('#2463/#2464-style exact merged evidence is not rewound to invent effects', () => {
  const out = owner.projectValidationFinalization(evidence({
    subject: 'issue:#2463',
    packetRef: '#2463',
    expected: {prNumber: 2464},
    mergeEvidence: {prNumber: 2464},
    stageReceipt: {
      state: 'ABSENT',
      packetRef: null,
      prNumber: null,
      candidateHead: null,
      mergeCommit: null,
      diffIdentity: null,
      pathScopeDigest: null,
      nextLegalAction: 'UNKNOWN',
    },
    sourceRefs: ['issue:#2463', 'pr:#2464'],
  }));
  assert.equal(out.finalizationDisposition, 'FINALIZATION_REQUIRED');
  assert.deepEqual(out.requiredEffectClasses, ['CANONICAL_VALIDATION_MERGE_RECEIPT']);
  assert.equal(out.effectsPerformed, false);
});

test('merged PR without exact candidate attribution stays unknown', () => {
  const out = owner.projectValidationFinalization(evidence({
    mergeEvidence: {candidateHead: null},
  }));
  assert.equal(out.result, 'UNKNOWN');
  assert.equal(out.reasonCode, 'MERGE_IDENTITY_UNKNOWN');
});

test('ambiguous lost-ack merge truth routes only to recovery inspect', () => {
  const out = owner.projectValidationFinalization(evidence({
    mergeEvidence: {
      state: 'AMBIGUOUS',
      prNumber: null,
      candidateHead: null,
      mergeCommit: null,
      diffIdentity: null,
      pathScopeDigest: null,
    },
  }));
  assert.equal(out.finalizationDisposition, 'NEEDS_RECOVERY_INSPECT');
  assert.equal(out.nextLegalAction, 'RECOVERY_INSPECT');
  assert.equal(out.effectsPerformed, false);
});

test('not-merged evidence does not authorize a merge retry', () => {
  const out = owner.projectValidationFinalization(evidence({
    mergeEvidence: {
      state: 'NOT_MERGED',
      prNumber: null,
      candidateHead: null,
      mergeCommit: null,
      diffIdentity: null,
      pathScopeDigest: null,
    },
  }));
  assert.equal(out.finalizationDisposition, 'MERGE_NOT_PROVEN');
  assert.equal(out.nextLegalAction, 'VALIDATION_STAGE_REEVALUATION');
});

test('exact merge plus absent stage receipt is finalization required', () => {
  const out = owner.projectValidationFinalization(evidence({
    stageReceipt: {
      state: 'ABSENT',
      packetRef: null,
      prNumber: null,
      candidateHead: null,
      mergeCommit: null,
      diffIdentity: null,
      pathScopeDigest: null,
      nextLegalAction: 'UNKNOWN',
    },
  }));
  assert.equal(out.result, 'PASS');
  assert.equal(out.finalizationDisposition, 'FINALIZATION_REQUIRED');
  assert.deepEqual(out.requiredEffectClasses, ['CANONICAL_VALIDATION_MERGE_RECEIPT']);
  assert.equal(out.nextLegalAction, 'FIXED_FINALIZATION_EFFECT_REVIEW');
});

test('incomplete neutral coordination is finalization required', () => {
  const out = owner.projectValidationFinalization(evidence({
    coordinationState: 'INCOMPLETE',
    stageReceipt: {
      state: 'ABSENT',
      packetRef: null,
      prNumber: null,
      candidateHead: null,
      mergeCommit: null,
      diffIdentity: null,
      pathScopeDigest: null,
      nextLegalAction: 'UNKNOWN',
    },
  }));
  assert.equal(out.finalizationDisposition, 'FINALIZATION_REQUIRED');
  assert.deepEqual(
    out.requiredEffectClasses,
    ['CANONICAL_VALIDATION_MERGE_RECEIPT', 'COORDINATION_FINALIZATION'],
  );
});

test('repository-only NOT_APPLICABLE coordination can be already finalized', () => {
  const out = owner.projectValidationFinalization(evidence({
    coordinationState: 'NOT_APPLICABLE',
    workspaceState: 'NOT_APPLICABLE',
  }));
  assert.equal(out.finalizationDisposition, 'ALREADY_FINALIZED');
});

test('dirty workspace plus absent receipt is finalization required', () => {
  const out = owner.projectValidationFinalization(evidence({
    workspaceState: 'DIRTY',
    stageReceipt: {
      state: 'ABSENT',
      packetRef: null,
      prNumber: null,
      candidateHead: null,
      mergeCommit: null,
      diffIdentity: null,
      pathScopeDigest: null,
      nextLegalAction: 'UNKNOWN',
    },
  }));
  assert.equal(out.finalizationDisposition, 'FINALIZATION_REQUIRED');
  assert.deepEqual(
    out.requiredEffectClasses,
    ['CANONICAL_VALIDATION_MERGE_RECEIPT', 'WORKSPACE_CLEAN_PROOF'],
  );
});

test('premature PASS receipt conflicts with incomplete coordination', () => {
  const out = owner.projectValidationFinalization(evidence({coordinationState: 'INCOMPLETE'}));
  assert.equal(out.result, 'CONFLICT');
  assert.equal(out.reasonCode, 'PREMATURE_FINALIZATION_RECEIPT_CONFLICT');
});

test('merge candidate mismatch is conflict', () => {
  const out = owner.projectValidationFinalization(evidence({
    mergeEvidence: {candidateHead: '9'.repeat(40)},
  }));
  assert.equal(out.result, 'CONFLICT');
  assert.equal(out.reasonCode, 'MERGE_IDENTITY_CONFLICT');
});

test('stage receipt merge identity mismatch is conflict', () => {
  const out = owner.projectValidationFinalization(evidence({
    stageReceipt: {mergeCommit: '8'.repeat(40)},
  }));
  assert.equal(out.result, 'CONFLICT');
  assert.equal(out.reasonCode, 'VALIDATION_STAGE_RECEIPT_IDENTITY_CONFLICT');
});

test('head-bound validation identity mismatch is conflict', () => {
  const out = owner.projectValidationFinalization(evidence({
    validationEvidence: {diffIdentity: 'sha256:' + '7'.repeat(64)},
  }));
  assert.equal(out.result, 'CONFLICT');
  assert.equal(out.reasonCode, 'HEAD_BOUND_VALIDATION_IDENTITY_CONFLICT');
});

test('receipt cannot route backward or sideways from a finalized stage', () => {
  const out = owner.projectValidationFinalization(evidence({
    stageReceipt: {nextLegalAction: 'OTHER'},
  }));
  assert.equal(out.result, 'CONFLICT');
  assert.equal(out.reasonCode, 'VALIDATION_STAGE_RECEIPT_NEXT_ACTION_CONFLICT');
});

test('head-bound validation non-pass never finalizes', () => {
  const out = owner.projectValidationFinalization(evidence({
    validationEvidence: {state: 'FAIL'},
  }));
  assert.equal(out.finalizationDisposition, 'BLOCKED');
  assert.equal(out.reasonCode, 'HEAD_BOUND_VALIDATION_NOT_PASS');
});

test('required UNKNOWN blocks finalization', () => {
  const out = owner.projectValidationFinalization(evidence({
    requiredUnknownState: 'PRESENT',
  }));
  assert.equal(out.finalizationDisposition, 'BLOCKED');
  assert.equal(out.reasonCode, 'REQUIRED_UNKNOWN_PRESENT');
});

test('decision is deterministic, bounded and authority-false', () => {
  const first = owner.projectValidationFinalization(evidence());
  const second = owner.projectValidationFinalization(evidence());
  assert.deepEqual(first, second);
  assert.match(first.evidenceDigest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(first.effectsPerformed, false);
  assert.deepEqual(first.authority, {
    repositoryMutationAuthorized: false,
    deviceMutationAuthorized: false,
    mergeAuthorized: false,
    releaseAuthorized: false,
    productionAuthorized: false,
  });
  assert.ok(Buffer.byteLength(JSON.stringify(first), 'utf8') < 8192);
});

test('sensitive source refs are rejected instead of echoed', () => {
  assert.throws(
    () => owner.projectValidationFinalization(evidence({
      sourceRefs: ['issue:#2231', 'token=do-not-echo'],
    })),
    owner.ValidationFinalizationInputError,
  );
});

test('unknown input fields fail closed', () => {
  assert.throws(
    () => owner.projectValidationFinalization({...evidence(), command: 'git merge'}),
    owner.ValidationFinalizationInputError,
  );
});

test('source is pure and contains no MCL coordination dependency', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../validation-finalization-owner.cjs'),
    'utf8',
  );
  for (const forbidden of [
    "require('node:fs')",
    "require('node:child_process')",
    "require('node:http')",
    "require('node:https')",
    'process.env',
    'fetch(',
    'D-013',
    'D-014',
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});

test('normal next actions never invoke merge or currentization effects', () => {
  const cases = [
    owner.projectValidationFinalization(evidence()),
    owner.projectValidationFinalization(evidence({
      mergeEvidence: {
        state: 'NOT_MERGED',
        prNumber: null,
        candidateHead: null,
        mergeCommit: null,
        diffIdentity: null,
        pathScopeDigest: null,
      },
    })),
    owner.projectValidationFinalization(evidence({
      stageReceipt: {
        state: 'ABSENT',
        packetRef: null,
        prNumber: null,
        candidateHead: null,
        mergeCommit: null,
        diffIdentity: null,
        pathScopeDigest: null,
        nextLegalAction: 'UNKNOWN',
      },
    })),
  ];
  for (const out of cases) {
    assert.notEqual(out.nextLegalAction, 'VALIDATION_MERGE');
    assert.notEqual(out.nextLegalAction, 'CURRENTIZATION');
  }
});
