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

function implementationReceipt({paths = PATHS, extraGates = []} = {}) {
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
      ...extraGates,
    ],
    scope: {
      paths,
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
  priorCoordination = 'NOT_APPLICABLE',
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
        priorCoordination,
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
  paths = PATHS,
  scopes = [...paths.map((p) => 'path:' + p), 'surface:repo:validation-attention-projection'],
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
      paths,
      scopes,
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
    pathScopes: PATHS.map((p) => 'path:' + p),
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
      async inspectWithClient(args) {
        calls.push('merge.inspect');
        if (options.onMergeInspect) options.onMergeInspect(args);
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
  const inspectArgs = attention.parseArgs([
    'inspect', '--packet', '#2875', '--pr', '4000',
    '--implementation-receipt-file', '/tmp/r.json',
    '--packet-activity-evidence-file', '/tmp/activity.json',
  ]);
  assert.equal(inspectArgs.command, 'inspect');
  assert.equal(inspectArgs.packetActivityEvidenceFile, '/tmp/activity.json');
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
  assert.throws(() => attention.parseArgs([
    'finalize', '--packet', '2875', '--pr', '4000',
    '--packet-activity-evidence-file', '/tmp/activity.json',
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

test('inspect forwards normalized packet activity evidence only to merge admission child', async () => {
  const evidence = realMerge.normalizePacketActivityEvidenceSet({
    schemaVersion: 1,
    mode: realMerge.PACKET_ACTIVITY_EVIDENCE_MODE,
    requesterRef: '#' + PACKET,
    candidates: [{
      candidateRef: '#9999',
      evidence: {
        schemaVersion: 1,
        mode: 'WORK_SYSTEM_PACKET_ACTIVITY_EVIDENCE',
        candidateRef: '#9999',
        requesterRef: '#' + PACKET,
        relationship: 'PARENT_WAITING_ON_SUCCESSOR',
        repositoryMutationActive: false,
        activeLease: false,
        overlappingOpenPr: false,
        sequencingExplicit: true,
        sourceRefs: ['#9999', '#' + PACKET],
      },
    }],
  }, PACKET);
  let observed = null;
  const {deps} = fixtureDeps({onMergeInspect: (args) => {
    observed = args.packetActivityEvidence;
  }});
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: implementationReceipt(),
    packetActivityEvidence: evidence,
    deps,
  });
  assert.equal(result.receipt.result, 'PASS');
  assert.deepEqual(observed, evidence);
});

test('path-only canonical-main packet blocks finalization routing before merge', async () => {
  const {deps, calls} = fixtureDeps({
    mergeInspect: mergeInspectResult({scopes: PATHS.map((p) => 'path:' + p)}),
  });
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: implementationReceipt(), deps,
  });
  assert(calls.includes('merge.inspect'));
  assert.equal(result.receipt.result, 'BLOCKED');
  assert.equal(result.receipt.nextLegalAction,
    'DECLARE_REPO_FINALIZATION_ROUTE_AT_AUTHORITY_SCOPE');
  assert(result.receipt.blockers.includes('REPO_NEUTRAL_FINALIZATION_SCOPE_REQUIRED'));
  assert.equal(result.report.output.mergeAdmission, 'BLOCKED');
  assert.equal(result.report.attention[0].reasonCode,
    'REPO_NEUTRAL_FINALIZATION_SCOPE_REQUIRED');
  assert.equal(result.receipt.counters.find(
    (row) => row.name === 'merge_effects_performed').value, 0);
});

test('reviewed external finalizer gate preserves intentional path-only repo packet', async () => {
  const {deps} = fixtureDeps({
    mergeInspect: mergeInspectResult({scopes: PATHS.map((p) => 'path:' + p)}),
  });
  const receipt = implementationReceipt({extraGates: [{
    name: 'validation-finalization-external-owner-reviewed',
    result: 'PASS',
    evidenceLocator: 'issue:#9999',
  }]});
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: receipt, deps,
  });
  assert.equal(result.receipt.result, 'PASS');
  assert.equal(result.report.output.mergeAdmission, 'READY');
});

test('non-PASS external finalizer gate cannot bypass repo-neutral admission', async () => {
  const {deps} = fixtureDeps({
    mergeInspect: mergeInspectResult({scopes: PATHS.map((p) => 'path:' + p)}),
  });
  const receipt = implementationReceipt({extraGates: [{
    name: 'validation-finalization-external-owner-reviewed',
    result: 'NOT_APPLICABLE',
    evidenceLocator: 'issue:#9999',
  }]});
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: receipt, deps,
  });
  assert.equal(result.receipt.result, 'BLOCKED');
  assert(result.receipt.blockers.includes('REPO_NEUTRAL_FINALIZATION_SCOPE_REQUIRED'));
});

test('repo-common tools/repo-env packet uses repository-neutral pre-merge route', async () => {
  const repoPaths = [
    'tools/repo-env/wsl/README.md',
    'tools/repo-env/wsl/bootstrap.ps1',
    'tools/repo-env/wsl/tests/test_bootstrap_contract.py',
  ];
  const {deps} = fixtureDeps({
    mergeInspect: mergeInspectResult({
      paths: repoPaths,
      scopes: [...repoPaths.map((p) => 'path:' + p), 'surface:repo:host-tooling-wsl'],
    }),
  });
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: implementationReceipt({paths: repoPaths}), deps,
  });
  assert.equal(result.receipt.result, 'PASS');
  assert.equal(result.report.output.mergeAdmission, 'READY');
});

test('Repository Patch Write packet uses repository-neutral pre-merge route', async () => {
  const repoPaths = [
    'tools/repo-write/README.md',
    'tools/repo-write/currentize_candidate.py',
    'tools/repo-write/tests/test_currentize_candidate.py',
  ];
  const {deps} = fixtureDeps({
    mergeInspect: mergeInspectResult({
      paths: repoPaths,
      scopes: [...repoPaths.map((p) => 'path:' + p), 'surface:repo:pr-currentization-effect'],
    }),
  });
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: implementationReceipt({paths: repoPaths}), deps,
  });
  assert.equal(result.receipt.result, 'PASS');
  assert.equal(result.report.output.mergeAdmission, 'READY');
});

test('GitHub Discussions MCP packet uses repository-neutral pre-merge route', async () => {
  const repoPaths = [
    'tools/github-discussions-mcp/README.md',
    'tools/github-discussions-mcp/github_discussions_mcp/service.py',
    'tools/github-discussions-mcp/tests/test_service.py',
  ];
  const {deps} = fixtureDeps({
    mergeInspect: mergeInspectResult({
      paths: repoPaths,
      scopes: [
        ...repoPaths.map((p) => 'path:' + p),
        'surface:repo:github-discussions-connector',
      ],
    }),
  });
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: implementationReceipt({paths: repoPaths}), deps,
  });
  assert.equal(result.receipt.result, 'PASS');
  assert.equal(result.report.output.mergeAdmission, 'READY');
});

test('GitHub Discussions MCP route rejects non-repo semantic surface', async () => {
  const repoPaths = ['tools/github-discussions-mcp/README.md'];
  const {deps} = fixtureDeps({
    mergeInspect: mergeInspectResult({
      paths: repoPaths,
      scopes: [
        'path:tools/github-discussions-mcp/README.md',
        'surface:repo-ops:github-discussions-connector',
      ],
    }),
  });
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: implementationReceipt({paths: repoPaths}), deps,
  });
  assert.equal(result.receipt.result, 'BLOCKED');
  assert(result.receipt.blockers.includes('REPO_NEUTRAL_FINALIZATION_SCOPE_REQUIRED'));
});

test('reviewed external route can admit a non-neutral NOT_APPLICABLE packet', async () => {
  const otherPaths = ['docs/example.md'];
  const {deps} = fixtureDeps({
    mergeInspect: mergeInspectResult({
      paths: otherPaths,
      scopes: otherPaths.map((p) => 'path:' + p),
    }),
  });
  const receipt = implementationReceipt({
    paths: otherPaths,
    extraGates: [{
      name: 'validation-finalization-external-owner-reviewed',
      result: 'PASS',
      evidenceLocator: 'issue:#9999',
    }],
  });
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: receipt, deps,
  });
  assert.equal(result.receipt.result, 'PASS');
  assert.equal(result.report.output.mergeAdmission, 'READY');
});

test('coordination-converged product packet keeps existing merge admission semantics', async () => {
  const productPaths = ['products/example/README.md'];
  const {deps} = fixtureDeps({
    continuation: continuationResult({priorCoordination: 'CONVERGED'}),
    mergeInspect: mergeInspectResult({
      paths: productPaths,
      scopes: productPaths.map((p) => 'path:' + p),
    }),
  });
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: implementationReceipt({paths: productPaths}), deps,
  });
  assert.equal(result.receipt.result, 'PASS');
  assert.equal(result.report.output.mergeAdmission, 'READY');
});

test('non-neutral NOT_APPLICABLE packet blocks before merge without a reviewed route', async () => {
  const productPaths = ['products/example/README.md'];
  const {deps} = fixtureDeps({
    mergeInspect: mergeInspectResult({
      paths: productPaths,
      scopes: productPaths.map((p) => 'path:' + p),
    }),
  });
  const result = await attention.inspectComposition({
    client: {}, packetNumber: PACKET, prNumber: PR,
    implementationReceipt: implementationReceipt({paths: productPaths}), deps,
  });
  assert.equal(result.receipt.result, 'BLOCKED');
  assert.equal(result.report.output.mergeAdmission, 'BLOCKED');
  assert(result.receipt.blockers.includes('REPO_NEUTRAL_FINALIZATION_SCOPE_REQUIRED'));
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

test('already merged wildcard packet scope contains exact implementation paths', async () => {
  const prefix = '.github/plugin-control-plane/canonical-main/work-harness/validation-attention';
  const packet = {
    bodySha256: 'e'.repeat(64),
    paths: [prefix],
    pathScopes: ['path:' + prefix + '/**'],
    scopes: ['path:' + prefix + '/**', 'surface:repo:validation-attention-projection'],
    evidenceLocator: 'issue:#' + PACKET,
  };
  const {deps, calls} = fixtureDeps({
    continuation: continuationResult({
      disposition: 'ALREADY_MERGED', nextLegalAction: 'VALIDATION_MERGE_FINALIZE',
    }),
    packet,
  });
  const root = makeTempRoot();
  try {
    await persistAlreadyMergedInspect(root, deps);
    const inspectEvidence = attention.readCanonicalInspectEvidence(PACKET, PR, root, deps);
    const recovered = attention.alreadyMergedFinalizeEvidence({
      packetNumber: PACKET, prNumber: PR, inspectEvidence, packet,
    });
    assert.deepEqual(recovered.report.paths, PATHS);
    const result = await attention.finalizeComposition({
      client: {}, packetNumber: PACKET, prNumber: PR, root, deps,
    });
    assert.equal(result.receipt.result, 'PASS');
    assert.equal(calls.includes('merge.inspect'), false);
    assert.equal(calls.includes('merge.read-inspect'), false);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('already merged packet scope rejects exact implementation path outside ceiling', async () => {
  const {deps, calls} = fixtureDeps({
    continuation: continuationResult({
      disposition: 'ALREADY_MERGED', nextLegalAction: 'VALIDATION_MERGE_FINALIZE',
    }),
    packet: {
      bodySha256: 'e'.repeat(64),
      paths: [PATHS[0]],
      pathScopes: ['path:' + PATHS[0]],
      scopes: ['path:' + PATHS[0], 'surface:repo:validation-attention-projection'],
      evidenceLocator: 'issue:#' + PACKET,
    },
  });
  const root = makeTempRoot();
  try {
    await persistAlreadyMergedInspect(root, deps);
    const result = await attention.finalizeComposition({
      client: {}, packetNumber: PACKET, prNumber: PR, root, deps,
    });
    assert.equal(result.receipt.result, 'CONFLICT');
    assert(result.receipt.conflicts.includes('ALREADY_MERGED_PACKET_SCOPE_CONFLICT'));
    assert.equal(calls.includes('merge.finalize'), false);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('already merged packet scope rejects malformed or non-path ceilings', async () => {
  for (const pathScopes of [['path:../escape/**'], ['surface:repo:not-a-path']]) {
    const {deps, calls} = fixtureDeps({
      continuation: continuationResult({
        disposition: 'ALREADY_MERGED', nextLegalAction: 'VALIDATION_MERGE_FINALIZE',
      }),
      packet: {
        bodySha256: 'e'.repeat(64), paths: PATHS, pathScopes,
        scopes: [...pathScopes, 'surface:repo:validation-attention-projection'],
        evidenceLocator: 'issue:#' + PACKET,
      },
    });
    const root = makeTempRoot();
    try {
      await persistAlreadyMergedInspect(root, deps);
      const result = await attention.finalizeComposition({
        client: {}, packetNumber: PACKET, prNumber: PR, root, deps,
      });
      assert.equal(result.receipt.result, 'CONFLICT');
      assert(result.receipt.conflicts.includes('ALREADY_MERGED_PACKET_SCOPE_CONFLICT'));
      assert.equal(calls.includes('merge.finalize'), false);
    } finally {
      fs.rmSync(root, {recursive: true, force: true});
    }
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
      pathScopes: PATHS.map((p) => 'path:' + p),
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
      pathScopes: ['path:products/chatgpt-mobile-coder-lab/x.js'],
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

test('repo-neutral predicate is narrow, explicit and reviewed-prefix bounded', () => {
  assert.equal(attention.repoNeutralPacket({
    paths: PATHS,
    scopes: [...PATHS.map((p) => 'path:' + p), 'surface:repo:validation-attention-projection'],
  }), true);
  assert.equal(attention.repoNeutralPacket({
    paths: ['tools/repo-env/wsl'],
    scopes: ['path:tools/repo-env/wsl/**', 'surface:repo:host-tooling-wsl'],
  }), true);
  assert.equal(attention.repoNeutralPacket({
    paths: ['tools/repo-ci-mcp/README.md'],
    scopes: ['path:tools/repo-ci-mcp/README.md', 'surface:repo:repository-read-mcp'],
  }), true);
  assert.equal(attention.repoNeutralPacket({
    paths: ['tools/repo-ci-mcp/README.md'],
    scopes: ['path:tools/repo-ci-mcp/README.md', 'surface:repo-ops:repository-read-mcp'],
  }), false);
  assert.equal(attention.repoNeutralPacket({
    paths: ['tools/github-discussions-mcp/README.md'],
    scopes: [
      'path:tools/github-discussions-mcp/README.md',
      'surface:repo:github-discussions-connector',
    ],
  }), true);
  assert.equal(attention.repoNeutralPacket({
    paths: ['tools/github-discussions-mcp/README.md'],
    scopes: [
      'path:tools/github-discussions-mcp/README.md',
      'surface:repo-ops:github-discussions-connector',
    ],
  }), false);
  assert.equal(attention.repoNeutralPacket({
    paths: ['tools/other/README.md'],
    scopes: ['path:tools/other/README.md', 'surface:repo:other-tool'],
  }), false);
  assert.equal(attention.repoNeutralPacket({
    paths: ['.github/tooling/ci-summary/manifests/plugin-control-plane.json'],
    scopes: [
      'path:.github/tooling/ci-summary/manifests/plugin-control-plane.json',
      'surface:repo:plugin-control-plane-ci-manifest',
    ],
  }), true);
  assert.equal(attention.repoNeutralPacket({
    paths: ['.github/workflows/canonical-main-stage-checkpoint-publish.yml'],
    scopes: [
      'path:.github/workflows/canonical-main-stage-checkpoint-publish.yml',
      'surface:repo:canonical-stage-checkpoint-publication',
    ],
  }), true);
  assert.equal(attention.repoNeutralPacket({
    paths: ['.github/plugin-control-plane/taxonomy.json'],
    scopes: [
      'path:.github/plugin-control-plane/taxonomy.json',
      'surface:repo:github-discussions-connector',
    ],
  }), true);
  assert.equal(attention.repoNeutralPacket({
    paths: ['.github/plugin-control-plane/taxonomy.json'],
    scopes: [
      'path:.github/plugin-control-plane/taxonomy.json',
      'surface:repo-ops:github-discussions-connector',
    ],
  }), false);
  assert.equal(attention.repoNeutralPacket({
    paths: ['.github/plugin-control-plane/registry.json'],
    scopes: [
      'path:.github/plugin-control-plane/registry.json',
      'surface:repo:github-discussions-connector',
    ],
  }), false);
  assert.equal(attention.repoNeutralPacket({
    paths: ['.github/plugin-control-plane/other.json'],
    scopes: [
      'path:.github/plugin-control-plane/other.json',
      'surface:repo:github-discussions-connector',
    ],
  }), false);
  assert.equal(attention.repoNeutralPacket({
    paths: ['.github/plugin-control-plane/taxonomy.json'],
    scopes: [
      'path:.github/plugin-control-plane/taxonomy.json/**',
      'surface:repo:github-discussions-connector',
    ],
  }), false);
  assert.equal(attention.repoNeutralPacket({
    paths: ['.github/workflows/canonical-main-stage-checkpoint-publish.yml.bak'],
    scopes: [
      'path:.github/workflows/canonical-main-stage-checkpoint-publish.yml.bak',
      'surface:repo:canonical-stage-checkpoint-publication',
    ],
  }), false);
  assert.equal(attention.repoNeutralPacket({
    paths: ['.github/workflows/canonical-main-stage-checkpoint-publish.yml'],
    scopes: [
      'path:.github/workflows/canonical-main-stage-checkpoint-publish.yml',
      'surface:repo-ops:canonical-stage-checkpoint-publication',
    ],
  }), false);
  assert.equal(attention.repoNeutralPacket({
    paths: ['.github/workflows/canonical-main-ops.yml'],
    scopes: [
      'path:.github/workflows/canonical-main-ops.yml',
      'surface:repo:canonical-stage-checkpoint-publication',
    ],
  }), false);
  assert.equal(attention.repoNeutralPacket({
    paths: ['.github/tooling/ci-summary/manifests/plugin-control-plane.json.bak'],
    scopes: [
      'path:.github/tooling/ci-summary/manifests/plugin-control-plane.json.bak',
      'surface:repo:plugin-control-plane-ci-manifest',
    ],
  }), false);
  assert.equal(attention.repoNeutralPacket({
    paths: ['.github/tooling/ci-summary/manifests/plugin-control-plane.json'],
    scopes: [
      'path:.github/tooling/ci-summary/manifests/plugin-control-plane.json/**',
      'surface:repo:plugin-control-plane-ci-manifest',
    ],
  }), false);
  assert.equal(attention.repoNeutralPacket({
    paths: ['.github/tooling/ci-summary/receipt_runner.py'],
    scopes: [
      'path:.github/tooling/ci-summary/receipt_runner.py',
      'surface:repo:plugin-control-plane-ci-manifest',
    ],
  }), false);
  assert.equal(attention.repoNeutralPacket({
    paths: ['.github/tooling/ci-summary/manifests/plugin-control-plane.json'],
    scopes: [
      'path:.github/tooling/ci-summary/manifests/plugin-control-plane.json',
      'surface:repo-ops:plugin-control-plane-ci-manifest',
    ],
  }), false);
  assert.equal(attention.repoNeutralPacket({
    paths: ['tools/repo-write/README.md'],
    scopes: ['path:tools/repo-write/README.md', 'surface:repo:repository-write'],
  }), true);
  assert.equal(attention.repoNeutralPacket({
    paths: ['tools/repo-write/README.md'],
    scopes: ['path:tools/repo-write/README.md', 'surface:repo-ops:repository-write'],
  }), false);
  assert.equal(attention.repoNeutralPacket({
    paths: ['tools/other/README.md'],
    scopes: ['path:tools/other/README.md', 'surface:repo:other-tooling'],
  }), false);
  assert.equal(attention.repoNeutralPacket({
    paths: ['products/x/a.js'],
    scopes: ['path:products/x/a.js', 'surface:repo:x'],
  }), false);
  assert.equal(attention.repoNeutralPacket({
    paths: ['tools/repo-env/wsl'],
    scopes: ['path:tools/repo-env/wsl/**', 'surface:mcl:x'],
  }), false);
  assert.equal(attention.repoNeutralPacket({
    paths: PATHS,
    scopes: [...PATHS.map((p) => 'path:' + p), 'surface:mcl:x'],
  }), false);
});

test('reviewed repo-neutral prefix roots are admitted without widening siblings', () => {
  const reviewedPrefixes = [
    '.github/plugin-control-plane/canonical-main/',
    'tools/repo-env/',
    'tools/repo-ci-mcp/',
    'tools/repo-write/',
    'tools/github-discussions-mcp/',
  ];
  for (const prefix of reviewedPrefixes) {
    const root = prefix.slice(0, -1);
    assert.equal(attention.repoNeutralPacket({
      paths: [root],
      scopes: ['path:' + root + '/**', 'surface:repo:reviewed-prefix-root'],
    }), true);
    assert.equal(attention.repoNeutralPacket({
      paths: [root + '/README.md'],
      scopes: ['path:' + root + '/README.md', 'surface:repo:reviewed-prefix-child'],
    }), true);
  }
  assert.equal(attention.repoNeutralPacket({
    paths: ['tools/github-discussions-mcp', '.github/plugin-control-plane/taxonomy.json'],
    scopes: [
      'path:tools/github-discussions-mcp/**',
      'path:.github/plugin-control-plane/taxonomy.json',
      'surface:repo:github-discussions-connector',
    ],
  }), true);
  assert.equal(attention.repoNeutralPacket({
    paths: ['tools/github-discussions-mcp-other'],
    scopes: [
      'path:tools/github-discussions-mcp-other/**',
      'surface:repo:github-discussions-connector',
    ],
  }), false);
  assert.equal(attention.repoNeutralPacket({
    paths: ['tools/other'],
    scopes: ['path:tools/other/**', 'surface:repo:other-tooling'],
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
