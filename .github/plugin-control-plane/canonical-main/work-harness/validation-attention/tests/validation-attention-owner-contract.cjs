'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../../../../../..');
const attention = require('../validation-attention-owner.cjs');
const stageReceipt = require('../../stage-receipt.cjs');
const executionReceipt = require('../../execution-receipt.cjs');
const agentDecisionView = require('../../agent-decision-view.cjs');
const realMerge = require('../../validation-merge/validation-merge-owner.cjs');
const realFinalization = require('../../validation-finalization/validation-finalization-owner.cjs');

const PACKET = 2875;
const PR = 4000;
const BASE = 'a'.repeat(40);
const HEAD = 'b'.repeat(40);
const MERGE = 'c'.repeat(40);
const DIFF = 'd'.repeat(64);
const PATHS = [
  '.github/plugin-control-plane/canonical-main/work-harness/validation-attention/README.md',
  '.github/plugin-control-plane/canonical-main/work-harness/validation-attention/tests/validation-attention-owner-contract.cjs',
  '.github/plugin-control-plane/canonical-main/work-harness/validation-attention/validation-attention-owner.cjs',
].sort();

function implementationReceipt() {
  return stageReceipt.projectStageReceipt({
    schemaVersion: 1,
    packetNumber: PACKET,
    stage: 'IMPLEMENTATION_PR',
    authorityRefs: [
      {kind: 'GIT_REF', locator: 'refs/heads/main', identity: BASE},
      {kind: 'PR', locator: 'pr:#' + PR, identity: HEAD},
      {kind: 'COMMIT', locator: 'candidate-head', identity: HEAD},
    ],
    requiredGates: [
      {name: 'composition-contract', result: 'PASS', evidenceLocator: 'local:test'},
      {name: 'coordination-not-applicable', result: 'NOT_APPLICABLE',
        evidenceLocator: 'issue:#' + PACKET},
    ],
    scope: {
      paths: PATHS,
      diffRequired: true,
      diffIdentity: DIFF,
      diffEvidenceLocator: 'commit:' + HEAD,
    },
    proof: [
      {term: 'IMPLEMENTED', evidenceLocator: 'commit:' + HEAD},
      {term: 'CONTRACT_PROVEN', evidenceLocator: 'local:test'},
    ],
    requiredUnknowns: [],
    conflicts: [],
    blockers: [],
    dependencies: [],
    nextLegalAction: 'VALIDATION_MERGE',
  });
}

function childReceipt({
  primitiveId,
  result = 'PASS',
  attentionDisposition = 'COMPLETE',
  reasonCodes = [],
  unknowns = [],
  conflicts = [],
  blockers = [],
  nextLegalAction,
  stepResult = 'PASS',
}) {
  return executionReceipt.projectExecutionReceipt({
    schemaVersion: 2,
    operationId: 'fixture:' + primitiveId,
    primitiveId,
    sourceIdentity: {kind: 'PULL_REQUEST', locator: 'pr:#' + PR, identity: HEAD},
    executionSurface: 'FIXTURE',
    stage: 'VALIDATION_MERGE',
    executionLifecycle: 'FINISHED',
    attentionDisposition,
    result,
    proofScope: 'fixture',
    steps: [{name: 'fixture', result: stepResult, evidenceLocator: 'artifact:' + primitiveId}],
    counters: [{name: 'merge_effects_performed', value: 0}],
    affectedFiles: PATHS,
    artifactLocators: ['artifact:' + primitiveId],
    reasonCodes,
    requiredUnknowns: unknowns,
    conflicts,
    blockers,
    exitCode: null,
    stderrTail: null,
    nextLegalAction,
  });
}

function continuationResult({
  disposition = 'MERGE_ADMISSION_READY',
  result = 'PASS',
  attentionDisposition = 'COMPLETE',
  reasonCodes = [],
  nextLegalAction = 'VALIDATION_MERGE_ADMIT',
  currentization = 'EXACT_CURRENT_MAIN',
  required = 'PASS',
} = {}) {
  const conflicts = result === 'CONFLICT' ? reasonCodes : [];
  const unknowns = result === 'UNKNOWN' ? reasonCodes : [];
  const blockers = result === 'BLOCKED' ? reasonCodes : [];
  return {
    receipt: childReceipt({
      primitiveId: 'repo:validation-continuation-inspect',
      result, attentionDisposition, reasonCodes, unknowns, conflicts, blockers,
      nextLegalAction,
      stepResult: result === 'PASS' ? 'PASS' : result,
    }),
    report: {
      schemaVersion: 1,
      mode: 'VALIDATION_CONTINUATION_REPORT',
      packetNumber: PACKET,
      prNumber: PR,
      resumeDisposition: disposition,
      nextLegalAction,
      output: {
        currentization,
        required,
        ownerCI: 'PASS',
        priorCoordination: 'NOT_APPLICABLE',
        mergeEffect: disposition === 'ALREADY_MERGED' ? 'COMPLETE' : 'ABSENT',
      },
    },
  };
}

function mergeInspectResult({
  result = 'PASS',
  attentionDisposition = 'COMPLETE',
  reasonCodes = [],
  nextLegalAction = 'MERGE_PR_WITH_EXISTING_EXPECTED_HEAD_ENDPOINT',
} = {}) {
  const conflicts = result === 'CONFLICT' ? reasonCodes : [];
  const unknowns = result === 'UNKNOWN' ? reasonCodes : [];
  const blockers = result === 'BLOCKED' ? reasonCodes : [];
  return {
    receipt: childReceipt({
      primitiveId: 'repo:validation-merge-inspect',
      result, attentionDisposition, reasonCodes, unknowns, conflicts, blockers,
      nextLegalAction,
      stepResult: result === 'PASS' ? 'PASS' : result,
    }),
    report: {
      schemaVersion: 1,
      mode: 'VALIDATION_MERGE_REPORT',
      operation: 'inspect',
      packetNumber: PACKET,
      prNumber: PR,
      packetBodySha256: 'e'.repeat(64),
      currentMainSha: BASE,
      expectedHead: HEAD,
      paths: PATHS,
      scopes: [...PATHS.map((p) => 'path:' + p), 'surface:repo:validation-attention-projection'],
      requiredRunId: 501,
      requiredJobId: 601,
      strictProtection: true,
      mergeStateStatus: result === 'PASS' ? 'CLEAN' : 'BEHIND',
      ancestryStatus: result === 'PASS' ? 'ahead' : 'diverged',
      mergeBaseSha: result === 'PASS' ? BASE : 'f'.repeat(40),
      result,
      output: {
        pr: '#' + PR,
        headExact: true,
        baseExact: true,
        reviewClear: result === 'PASS',
        overlap: 'DISJOINT',
        required: 'PASS',
        merge: 'NOT_RUN',
        expectedHead: HEAD,
      },
    },
  };
}

function mergeFinalizeResult({
  result = 'PASS',
  attentionDisposition = 'COMPLETE',
  reasonCodes = [],
  nextLegalAction = 'POSTMERGE_CONVERGENCE',
} = {}) {
  const conflicts = result === 'CONFLICT' ? reasonCodes : [];
  const unknowns = result === 'UNKNOWN' ? reasonCodes : [];
  const blockers = result === 'BLOCKED' ? reasonCodes : [];
  return {
    receipt: childReceipt({
      primitiveId: 'repo:validation-merge-finalize',
      result, attentionDisposition, reasonCodes, unknowns, conflicts, blockers,
      nextLegalAction,
      stepResult: result === 'PASS' ? 'PASS' : result,
    }),
    report: {
      schemaVersion: 1,
      mode: 'VALIDATION_MERGE_REPORT',
      operation: 'finalize',
      packetNumber: PACKET,
      prNumber: PR,
      expectedHead: HEAD,
      mergeCommit: MERGE,
      paths: PATHS,
      result,
      output: {pr: '#' + PR, merge: result === 'PASS' ? 'COMPLETE' : 'UNKNOWN'},
    },
  };
}

function locators(name) {
  return {
    receiptLocator: 'local-artifact:/tmp/' + name + '.receipt.json#sha256=' + '1'.repeat(64),
    reportLocator: 'local-artifact:/tmp/' + name + '.report.json#sha256=' + '2'.repeat(64),
  };
}

function fixtureDeps(options = {}) {
  const calls = [];
  const cont = options.continuation || continuationResult();
  const mergeInspect = options.mergeInspect || mergeInspectResult();
  const mergeFinalize = options.mergeFinalize || mergeFinalizeResult();
  const packet = options.packet || {
    bodySha256: 'e'.repeat(64),
    paths: PATHS,
    scopes: [...PATHS.map((p) => 'path:' + p), 'surface:repo:validation-attention-projection'],
    evidenceLocator: 'issue:#' + PACKET,
  };
  const deps = {
    executionReceipt,
    agentDecisionView,
    stageReceipt,
    finalization: options.finalization || realFinalization,
    continuation: {
      async inspectWithClient() {
        calls.push('continuation.inspect');
        return cont;
      },
      persistResult() {
        calls.push('continuation.persist');
        return locators('continuation');
      },
    },
    validationMerge: {
      ...realMerge,
      async inspectWithClient() {
        calls.push('merge.inspect');
        return mergeInspect;
      },
      async finalizeWithClient() {
        calls.push('merge.finalize');
        return mergeFinalize;
      },
      persistResult(result, packetNumber, prNumber, operation) {
        calls.push('merge.persist.' + operation);
        return locators('merge-' + operation);
      },
      readCanonicalInspectEvidence() {
        calls.push('merge.read-inspect');
        return mergeInspect;
      },
      async readPacket() {
        calls.push('merge.read-packet');
        return packet;
      },
    },
  };
  return {deps, calls, cont, mergeInspect, mergeFinalize};
}

function viewFor(result) {
  return attention.projectView(result, {
    receiptLocator: 'local-artifact:/tmp/attention.receipt.json#sha256=' + '3'.repeat(64),
    reportLocator: 'local-artifact:/tmp/attention.report.json#sha256=' + '4'.repeat(64),
  });
}

test('CLI exposes only inspect/finalize and fixed packet/pr/receipt/format arguments', () => {
  assert.equal(attention.parseArgs([
    'inspect', '--packet', '#2875', '--pr', '4000',
    '--implementation-receipt-file', '/tmp/r.json',
  ]).command, 'inspect');
  assert.equal(attention.parseArgs(['finalize', '--packet', '2875', '--pr', '4000']).command,
    'finalize');
  assert.throws(() => attention.parseArgs([
    'inspect', '--packet', '2875', '--pr', '4000',
    '--implementation-receipt-file', '/tmp/r.json', '--repo', 'other/repo',
  ]), /ARGUMENT_INVALID/);
  assert.throws(() => attention.parseArgs([
    'finalize', '--packet', '2875', '--pr', '4000',
    '--implementation-receipt-file', '/tmp/r.json',
  ]), /ARGUMENT_INVALID/);
});

test('clean inspect composes continuation then merge admission into zero-attention view', async () => {
  const {deps, calls} = fixtureDeps();
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: implementationReceipt(), deps,
  });
  assert.deepEqual(calls, [
    'continuation.inspect', 'continuation.persist', 'merge.inspect', 'merge.persist.inspect',
  ]);
  assert.equal(result.receipt.result, 'PASS');
  assert.equal(result.receipt.attentionDisposition, 'COMPLETE');
  assert.equal(result.receipt.nextLegalAction, 'MERGE_PR_WITH_EXISTING_EXPECTED_HEAD_ENDPOINT');
  assert.equal(result.report.output.currentization, 'NOT_REQUIRED');
  assert.equal(result.report.output.required, 'PASS');
  assert.equal(result.report.output.reviews, 'CLEAR');
  assert.equal(result.report.output.threads, 'CLEAR');
  assert.equal(result.report.output.branchProtection, 'PASS');
  assert.equal(result.report.output.overlap, 'DISJOINT');
  assert.equal(result.report.output.mergeAdmission, 'READY');
  assert.equal(result.report.attention.length, 0);
  assert.equal(result.report.semanticSurfaceBudget, 3);
  assert.equal(result.report.targetedDrilldowns, 0);
  assert.equal(result.report.rawTranscriptExposed, 0);
  const projected = viewFor(result);
  assert.equal(projected.validity, 'VALID');
  assert.equal(projected.attentionCount, 0);
  assert.equal(projected.shown, 0);
  assert.equal(projected.truncated, false);
});

test('CURRENTIZATION_REQUIRED blocks before merge admission and preserves locator', async () => {
  const {deps, calls} = fixtureDeps({
    continuation: continuationResult({
      disposition: 'CURRENTIZATION_REQUIRED',
      reasonCodes: ['CURRENTIZATION_PROOF_STALE'],
      nextLegalAction: 'PACKET_SCOPED_CURRENTIZATION',
      currentization: 'STALE',
    }),
  });
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: implementationReceipt(), deps,
  });
  assert.equal(calls.includes('merge.inspect'), false);
  assert.equal(result.receipt.result, 'BLOCKED');
  assert.equal(result.receipt.nextLegalAction, 'PACKET_SCOPED_CURRENTIZATION');
  assert.equal(result.report.attention[0].reasonCode, 'CURRENTIZATION_PROOF_STALE');
  assert.match(result.report.attention[0].locator, /^local-artifact:/);
  assert.equal(viewFor(result).attentionCount, 1);
});

test('VALIDATION_REFRESH_REQUIRED blocks and routes to existing refresh owner', async () => {
  const {deps, calls} = fixtureDeps({
    continuation: continuationResult({
      disposition: 'VALIDATION_REFRESH_REQUIRED',
      reasonCodes: ['EXACT_HEAD_VALIDATION_MISSING'],
      nextLegalAction: 'EXACT_HEAD_VALIDATION_REFRESH',
      required: 'MISSING',
    }),
  });
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: implementationReceipt(), deps,
  });
  assert.equal(calls.includes('merge.inspect'), false);
  assert.equal(result.receipt.result, 'BLOCKED');
  assert.equal(result.receipt.nextLegalAction, 'EXACT_HEAD_VALIDATION_REFRESH');
  assert.equal(result.report.output.required, 'REFRESH_REQUIRED');
});

test('ambiguous merge recovery is attention-only and never merge admission', async () => {
  const {deps, calls} = fixtureDeps({
    continuation: continuationResult({
      disposition: 'NEEDS_RECOVERY_INSPECT',
      reasonCodes: ['MERGE_EFFECT_AMBIGUOUS'],
      nextLegalAction: 'EFFECT_RECOVERY_INSPECT',
    }),
  });
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: implementationReceipt(), deps,
  });
  assert.equal(calls.includes('merge.inspect'), false);
  assert.equal(result.receipt.result, 'PARTIAL');
  assert.equal(result.receipt.attentionDisposition, 'NEEDS_REVIEW');
  assert.equal(result.receipt.nextLegalAction, 'EFFECT_RECOVERY_INSPECT');
});

test('continuation CONFLICT is never weakened to PARTIAL', async () => {
  const {deps} = fixtureDeps({
    continuation: continuationResult({
      disposition: 'NEEDS_REVIEW',
      result: 'CONFLICT',
      attentionDisposition: 'CONFLICT',
      reasonCodes: ['VALIDATION_CHECKPOINT_CONFLICT'],
      nextLegalAction: 'SEMANTIC_REVIEW',
    }),
  });
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: implementationReceipt(), deps,
  });
  assert.equal(result.receipt.result, 'CONFLICT');
  assert.equal(result.receipt.attentionDisposition, 'CONFLICT');
  assert.equal(result.report.attention[0].reasonCode, 'VALIDATION_CHECKPOINT_CONFLICT');
});

test('continuation UNKNOWN remains UNKNOWN', async () => {
  const {deps} = fixtureDeps({
    continuation: continuationResult({
      disposition: 'UNKNOWN',
      result: 'UNKNOWN',
      attentionDisposition: 'UNKNOWN',
      reasonCodes: ['CURRENTIZATION_PROOF_UNKNOWN'],
      nextLegalAction: 'TARGETED_DRILL_DOWN',
    }),
  });
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: implementationReceipt(), deps,
  });
  assert.equal(result.receipt.result, 'UNKNOWN');
  assert(result.receipt.requiredUnknowns.includes('CURRENTIZATION_PROOF_UNKNOWN'));
});

test('strict BEHIND child blocker is preserved with currentization action', async () => {
  const {deps} = fixtureDeps({
    mergeInspect: mergeInspectResult({
      result: 'BLOCKED',
      attentionDisposition: 'BLOCKED',
      reasonCodes: ['PR_HEAD_BEHIND_STRICT_BASE'],
      nextLegalAction: 'CURRENTIZE_PR_THROUGH_EXISTING_OWNER',
    }),
  });
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: implementationReceipt(), deps,
  });
  assert.equal(result.receipt.result, 'BLOCKED');
  assert.equal(result.receipt.nextLegalAction, 'CURRENTIZE_PR_THROUGH_EXISTING_OWNER');
  assert.equal(result.report.attention[0].reasonCode, 'PR_HEAD_BEHIND_STRICT_BASE');
  assert.equal(result.report.output.currentization, 'REQUIRED');
});

test('review pending child result stays NEEDS_REVIEW with stable locator', async () => {
  const {deps} = fixtureDeps({
    mergeInspect: mergeInspectResult({
      result: 'PARTIAL',
      attentionDisposition: 'NEEDS_REVIEW',
      reasonCodes: ['REVIEW_REQUEST_PENDING'],
      nextLegalAction: 'RESOLVE_PENDING_REVIEW',
    }),
  });
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: implementationReceipt(), deps,
  });
  assert.equal(result.receipt.result, 'PARTIAL');
  assert.equal(result.receipt.attentionDisposition, 'NEEDS_REVIEW');
  assert.equal(result.report.attention[0].reasonCode, 'REVIEW_REQUEST_PENDING');
  assert.match(result.report.attention[0].locator, /^local-artifact:/);
});

test('merge admission UNKNOWN remains UNKNOWN', async () => {
  const {deps} = fixtureDeps({
    mergeInspect: mergeInspectResult({
      result: 'UNKNOWN',
      attentionDisposition: 'UNKNOWN',
      reasonCodes: ['STRICT_COMPARE_UNKNOWN'],
      nextLegalAction: 'TARGETED_DRILLDOWN_REQUIRED',
    }),
  });
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: implementationReceipt(), deps,
  });
  assert.equal(result.receipt.result, 'UNKNOWN');
  assert(result.receipt.requiredUnknowns.includes('STRICT_COMPARE_UNKNOWN'));
});

test('already merged exact head never invokes merge admission or retry', async () => {
  const {deps, calls} = fixtureDeps({
    continuation: continuationResult({
      disposition: 'ALREADY_MERGED',
      nextLegalAction: 'VALIDATION_MERGE_FINALIZE',
    }),
  });
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: implementationReceipt(), deps,
  });
  assert.equal(calls.includes('merge.inspect'), false);
  assert.equal(result.receipt.result, 'PASS');
  assert.equal(result.receipt.nextLegalAction, 'VALIDATION_MERGE_FINALIZE');
  assert.equal(result.report.output.mergeAdmission, 'ALREADY_MERGED');
  assert.equal(result.report.attention.length, 0);
});

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'validation-attention-'));
  fs.mkdirSync(path.join(root, '.git'));
  return root;
}

async function persistCleanInspect(root, deps) {
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: implementationReceipt(), root, deps,
  });
  attention.persistResult(result, PACKET, PR, 'inspect', root, deps);
  return result;
}

async function persistAlreadyMergedInspect(root, deps) {
  return persistCleanInspect(root, deps);
}


test('already merged finalize skips merge admission replay and reuses merge finalize', async () => {
  const {deps, calls} = fixtureDeps({
    continuation: continuationResult({
      disposition: 'ALREADY_MERGED',
      nextLegalAction: 'VALIDATION_MERGE_FINALIZE',
    }),
  });
  const root = makeTempRoot();
  try {
    await persistAlreadyMergedInspect(root, deps);
    const result = await attention.finalizeComposition({
      client: {}, packetNumber: PACKET, prNumber: PR, root, deps,
    });
    assert.equal(result.receipt.result, 'PASS');
    assert.equal(result.receipt.attentionDisposition, 'COMPLETE');
    assert.equal(result.receipt.nextLegalAction, 'POSTMERGE_CONVERGENCE');
    assert.equal(result.report.output.mergeAdmission, 'ALREADY_MERGED');
    assert.equal(result.report.output.finalization, 'ALREADY_FINALIZED');
    assert.equal(result.report.stageReceipt.status, 'PASS');
    assert.equal(result.report.stageReceipt.requiredGates.some(
      (row) => row.name === 'validation-merge-inspect'), false);
    assert.equal(result.report.stageReceipt.requiredGates.some(
      (row) => row.name === 'validation-continuation-already-merged'), true);
    assert.equal(calls.includes('merge.inspect'), false);
    assert.equal(calls.includes('merge.read-inspect'), false);
    assert.equal(calls.filter((row) => row === 'merge.finalize').length, 1);
    assert(calls.includes('merge.read-packet'));
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('already merged product packet routes to coordination finalizer after exact merge readback', async () => {
  const {deps, calls} = fixtureDeps({
    continuation: continuationResult({
      disposition: 'ALREADY_MERGED',
      nextLegalAction: 'VALIDATION_MERGE_FINALIZE',
    }),
    packet: {
      bodySha256: 'e'.repeat(64),
      paths: PATHS,
      scopes: [...PATHS.map((p) => 'path:' + p), 'surface:mcl:x'],
      evidenceLocator: 'issue:#' + PACKET,
    },
  });
  const root = makeTempRoot();
  try {
    await persistAlreadyMergedInspect(root, deps);
    const result = await attention.finalizeComposition({
      client: {}, packetNumber: PACKET, prNumber: PR, root, deps,
    });
    assert.equal(result.receipt.result, 'BLOCKED');
    assert(result.receipt.blockers.includes('REPO_NEUTRAL_FINALIZATION_SCOPE_REQUIRED'));
    assert.equal(result.receipt.nextLegalAction,
      'EXISTING_COORDINATION_FINALIZATION_OWNER_REQUIRED');
    assert.equal(result.receipt.blockers.includes(
      'ATTENTION_INSPECT_NOT_MERGE_ADMISSION_READY'), false);
    assert.equal(calls.includes('merge.inspect'), false);
    assert.equal(calls.includes('merge.read-inspect'), false);
    assert.equal(calls.filter((row) => row === 'merge.finalize').length, 1);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('clean finalize reuses merge finalize, stage receipt and finalization owner', async () => {
  const {deps, calls} = fixtureDeps();
  const root = makeTempRoot();
  try {
    await persistCleanInspect(root, deps);
    const result = await attention.finalizeComposition({
      client: {}, packetNumber: PACKET, prNumber: PR, root, deps,
    });
    assert.equal(result.receipt.result, 'PASS');
    assert.equal(result.receipt.attentionDisposition, 'COMPLETE');
    assert.equal(result.receipt.nextLegalAction, 'POSTMERGE_CONVERGENCE');
    assert.equal(result.report.output.mergeAdmission, 'COMPLETE');
    assert.equal(result.report.output.finalization, 'ALREADY_FINALIZED');
    assert.equal(result.report.stageReceipt.status, 'PASS');
    assert.equal(result.report.stageReceipt.stage, 'VALIDATION_MERGE');
    assert.equal(result.report.finalizationDecision.finalizationDisposition, 'ALREADY_FINALIZED');
    assert.equal(result.report.attention.length, 0);
    assert(calls.includes('merge.finalize'));
    assert(calls.includes('merge.read-packet'));
    assert.equal(viewFor(result).attentionCount, 0);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('product/non-repo coordination cannot be relabeled NOT_APPLICABLE', async () => {
  const {deps} = fixtureDeps({
    packet: {
      bodySha256: 'e'.repeat(64),
      paths: ['products/chatgpt-mobile-coder-lab/x.js'],
      scopes: ['path:products/chatgpt-mobile-coder-lab/x.js', 'surface:mcl:x'],
      evidenceLocator: 'issue:#' + PACKET,
    },
  });
  const root = makeTempRoot();
  try {
    await persistCleanInspect(root, deps);
    const result = await attention.finalizeComposition({
      client: {}, packetNumber: PACKET, prNumber: PR, root, deps,
    });
    assert.equal(result.receipt.result, 'BLOCKED');
    assert(result.receipt.blockers.includes('REPO_NEUTRAL_FINALIZATION_SCOPE_REQUIRED'));
    assert.equal(result.receipt.nextLegalAction, 'EXISTING_COORDINATION_FINALIZATION_OWNER_REQUIRED');
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('finalize requires a canonical matching attention inspect sidecar', async () => {
  const {deps} = fixtureDeps();
  const root = makeTempRoot();
  try {
    const result = await attention.finalizeComposition({
      client: {}, packetNumber: PACKET, prNumber: PR, root, deps,
    });
    assert.equal(result.receipt.result, 'UNKNOWN');
    assert.equal(result.receipt.nextLegalAction, 'VALIDATION_ATTENTION_INSPECT_REQUIRED');
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('merge child identity drift is CONFLICT before finalize', async () => {
  const {deps} = fixtureDeps();
  const root = makeTempRoot();
  try {
    await persistCleanInspect(root, deps);
    const different = mergeInspectResult();
    different.receipt = {...different.receipt, receiptDigest: 'f'.repeat(64)};
    deps.validationMerge.readCanonicalInspectEvidence = () => different;
    const result = await attention.finalizeComposition({
      client: {}, packetNumber: PACKET, prNumber: PR, root, deps,
    });
    assert.equal(result.receipt.result, 'CONFLICT');
    assert(result.receipt.conflicts.includes('MERGE_INSPECT_CHILD_IDENTITY_CONFLICT'));
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('same-state clean inspect is deterministic and effect-free', async () => {
  const a = fixtureDeps();
  const b = fixtureDeps();
  const left = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: implementationReceipt(), deps: a.deps,
  });
  const right = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: implementationReceipt(), deps: b.deps,
  });
  assert.deepEqual(left, right);
  assert.equal(left.receipt.counters.find((x) => x.name === 'merge_effects_performed').value, 0);
  assert.equal(left.receipt.counters.find((x) => x.name === 'targeted_drilldowns').value, 0);
  assert.equal(left.receipt.counters.find((x) => x.name === 'raw_transcript_exposed').value, 0);
});

test('aggregate sidecars are restrictive, bounded and outside tracked bytes', async () => {
  const {deps} = fixtureDeps();
  const root = makeTempRoot();
  try {
    const result = await attention.inspectComposition({
      client: {}, packetNumber: PACKET, prNumber: PR,
      implementationReceipt: implementationReceipt(), deps,
    });
    const loc = attention.persistResult(result, PACKET, PR, 'inspect', root, deps);
    assert(loc.receiptLocator.startsWith('local-artifact:' + path.join(root, '.git')));
    assert.equal(fs.statSync(loc.paths.receipt).mode & 0o777, 0o600);
    assert.equal(fs.statSync(loc.paths.report).mode & 0o777, 0o600);
    const raw = fs.readFileSync(loc.paths.report, 'utf8');
    assert.doesNotMatch(raw, /authorization|bearer|token=|secret=/i);
    assert(Buffer.byteLength(raw, 'utf8') < attention.MAX_REPORT_BYTES);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('repo-neutral predicate is narrow and explicit', () => {
  assert.equal(attention.repoNeutralPacket({
    paths: PATHS,
    scopes: [...PATHS.map((p) => 'path:' + p), 'surface:repo:validation-attention-projection'],
  }), true);
  assert.equal(attention.repoNeutralPacket({
    paths: ['products/x/a.js'],
    scopes: ['path:products/x/a.js', 'surface:repo:x'],
  }), false);
  assert.equal(attention.repoNeutralPacket({
    paths: PATHS,
    scopes: [...PATHS.map((p) => 'path:' + p), 'surface:mcl:x'],
  }), false);
});

test('source is thin composition with no direct effect/network/shell/review-onset surface', () => {
  const source = fs.readFileSync(path.join(__dirname, '../validation-attention-owner.cjs'), 'utf8');
  assert.doesNotMatch(source, /child_process|spawnSync|execFile|execSync|fetch\(|https:\/\/api\.github\.com/);
  assert.doesNotMatch(source, /pulls\/.*\/merge|update-ref|force-with-lease|workflow_dispatch/);
  assert.doesNotMatch(source, /2874|review-onset|banner|classifier/i);
  assert.match(source, /validation-continuation-owner\.cjs/);
  assert.match(source, /validation-merge-owner\.cjs/);
  assert.match(source, /validation-finalization-owner\.cjs/);
  assert.match(source, /execution-receipt\.cjs/);
  assert.match(source, /agent-decision-view\.cjs/);
});

test('generic receipt and Agent Decision View remain canonical authority-false surfaces', async () => {
  const {deps} = fixtureDeps();
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: implementationReceipt(), deps,
  });
  assert.equal(result.receipt.mutationAuthorized, false);
  assert.equal(result.receipt.executionAuthorized, false);
  assert.equal(result.receipt.mergeAuthorized, false);
  assert.equal(result.receipt.releaseAuthorized, false);
  assert.equal(result.receipt.productionAuthorized, false);
  const projected = viewFor(result);
  assert.equal(projected.mode, 'REPOSITORY_AGENT_DECISION_VIEW');
  assert.equal(projected.result, 'PASS');
});
