'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const handoff = require('../task-handoff.cjs');

const leaseId = 'a'.repeat(64);
const packetHash = 'b'.repeat(64);
const baseSha = 'c'.repeat(40);
const observedSha = 'd'.repeat(40);
const preservedDiffSha = 'f'.repeat(64);
const emptyDiffSha = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const cleanupPath = 'path:products/chatgpt-mobile-coder-lab/device-ops/repository-patch/__pycache__/mcl-worktree-patch.cpython-312.pyc';
const preservedPaths = [
  'path:products/chatgpt-mobile-coder-lab/coordination/repository-implementation/README.md',
  'path:products/chatgpt-mobile-coder-lab/device-ops/repository-patch/README.md',
];
let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; process.stdout.write(`PASS ${name}\n`); }
  catch (error) { process.stderr.write(`FAIL ${name}: ${error.stack || error}\n`); process.exitCode = 1; }
}
function expectThrow(fn, pattern) {
  assert.throws(fn, pattern);
}
function manifestInput(overrides = {}) {
  return {
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: '#2359',
    packetBodySha256: packetHash,
    phaseId: 'implementation-pr',
    phaseClass: 'REPOSITORY_MUTATION',
    route: 'S',
    executor: 'S',
    scopes: [
      'path:products/chatgpt-mobile-coder-lab/docs/task-handoff.md',
      'path:products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs',
    ],
    workspace: { kind: 'repository', branch: 'server/task-handoff-2359', worktree: '/root/nyang-worktrees/task-handoff-2359' },
    observedBaseSha: baseSha,
    leaseRequirement: 'REQUIRED',
    leaseEvidence: { ledgerRef: '#2352', leaseId, acquiredGeneration: 7, acquireEvidenceRef: 'run:35115192104' },
    sourceAuthorityRefs: ['#2359', 'doc:products/chatgpt-mobile-coder-lab/docs/device-routing.md'],
    inputRefs: ['issue:#2352'],
    expectedOutputRefs: ['doc:products/chatgpt-mobile-coder-lab/docs/task-handoff.md'],
    acceptanceRefs: ['#2359'],
    stopCondition: 'Open a bounded PR and release the lease.',
    authority: { ...handoff.AUTHORITY_FLAGS },
    ...overrides,
  };
}
function receiptInput(overrides = {}) {
  return {
    disposition: 'COMPLETE',
    outputRefs: ['pr:#2361'],
    validationRefs: ['run:1'],
    observedRefs: [`commit:${observedSha}`],
    leaseDisposition: 'RELEASED',
    leaseReleaseEvidence: { ledgerRef: '#2352', leaseId, releasedGeneration: 8, evidenceRef: 'run:2' },
    workspaceResult: 'clean',
    blockerRefs: [],
    requiredUnknownRefs: [],
    ...overrides,
  };
}
function cleanupManifestInput(overrides = {}) {
  return manifestInput({
    packetRef: '#2804',
    phaseId: '2804-exact-one-pyc-cleanup',
    scopes: [cleanupPath, 'surface:mcl:validation-residue-cleanup:2775'],
    workspace: {
      kind: 'repository', branch: 'server/mcl-packet-2775',
      worktree: '/root/nyang-worktrees/mcl-packet-2775',
    },
    expectedOutputRefs: [cleanupPath],
    ...overrides,
  });
}
function preservationInput(overrides = {}) {
  return {
    kind: 'TRACKED_DIFF_PRESERVED',
    beforeSha256: preservedDiffSha,
    afterSha256: preservedDiffSha,
    preservedPathRefs: preservedPaths,
    evidenceRef: 'run:9',
    ...overrides,
  };
}
function preservedDirtyReceiptInput(overrides = {}) {
  return receiptInput({
    outputRefs: [cleanupPath],
    validationRefs: ['run:9'],
    workspaceResult: 'preserved_dirty',
    workspacePreservation: preservationInput(),
    ...overrides,
  });
}

const manifest = handoff.buildManifest(manifestInput());

test('manifest identity is key-order independent', () => {
  const reversed = Object.fromEntries(Object.entries(manifestInput()).reverse());
  assert.equal(handoff.buildManifest(reversed).manifestId, manifest.manifestId);
});
test('scope and reference sets canonicalize deterministically', () => {
  const input = manifestInput({ scopes: [...manifestInput().scopes].reverse(), sourceAuthorityRefs: [...manifestInput().sourceAuthorityRefs].reverse() });
  const normalized = handoff.buildManifest(input);
  assert.deepEqual(normalized.scopes, [...normalized.scopes].sort());
  assert.deepEqual(normalized.sourceAuthorityRefs, [...normalized.sourceAuthorityRefs].sort());
});
test('manifest render parse roundtrip', () => {
  const parsed = handoff.parseManifest(handoff.renderManifest(manifest));
  assert.equal(parsed.status, 'VALID');
  assert.deepEqual(parsed.value, manifest);
});
test('missing manifest marker is unknown', () => assert.equal(handoff.parseManifest('{}').status, 'UNKNOWN'));
test('duplicate manifest marker is conflict', () => {
  const text = handoff.renderManifest(manifest);
  assert.equal(handoff.parseManifest(`${text}\n${text}`).status, 'CONFLICT');
});
test('malformed manifest JSON is unknown', () => {
  const text = `${handoff.MANIFEST_START}\n\`\`\`json\n{bad\n\`\`\`\n${handoff.MANIFEST_END}`;
  assert.equal(handoff.parseManifest(text).status, 'UNKNOWN');
});
test('unknown manifest field fails closed', () => {
  const bad = { ...manifest, deviceId: 'forbidden' };
  const text = [handoff.MANIFEST_START, '```json', JSON.stringify(bad), '```', handoff.MANIFEST_END].join('\n');
  const parsed = handoff.parseManifest(text);
  assert.equal(parsed.status, 'UNKNOWN');
  assert(parsed.reasonCodes.some((code) => code.includes('UNKNOWN_FIELD:deviceId')));
});
test('tampered manifest identity fails closed', () => {
  const bad = { ...manifest, manifestId: `0${manifest.manifestId.slice(1)}` };
  const text = [handoff.MANIFEST_START, '```json', JSON.stringify(bad), '```', handoff.MANIFEST_END].join('\n');
  assert.equal(handoff.parseManifest(text).status, 'UNKNOWN');
});
test('route executor mismatch is rejected', () => expectThrow(
  () => handoff.buildManifest(manifestInput({ route: 'S_TERMUX', executor: 'M' })),
  /MANIFEST_ROUTE_EXECUTOR_CONFLICT/,
));
test('ambiguous either executor is rejected', () => expectThrow(
  () => handoff.buildManifest(manifestInput({ executor: 'either' })),
  /MANIFEST_EXECUTOR_INVALID/,
));
test('invalid scope grammar is rejected', () => expectThrow(
  () => handoff.buildManifest(manifestInput({ scopes: ['not-a-scope'] })),
  /MANIFEST_SCOPE_INVALID/,
));
test('S route rejects not-applicable workspace', () => expectThrow(
  () => handoff.buildManifest(manifestInput({ workspace: { kind: 'not_applicable', branch: 'not_applicable', worktree: 'not_applicable' } })),
  /WORKSPACE_S_ROUTE_REPOSITORY_REQUIRED/,
));
test('S route supports documented M repository fallback', () => {
  const m = handoff.buildManifest(manifestInput({
    executor: 'M',
    workspace: { kind: 'repository', branch: 'mainphone/task-handoff-2359', worktree: '/data/data/com.termux/files/home/nyang-worktrees/task-handoff-2359' },
  }));
  assert.equal(m.executor, 'M');
});

test('landing_metadata manifest reuses exact D-013 S identity', () => {
  const m = handoff.buildManifest(manifestInput({
    phaseId: 'landing-refresh-s',
    scopes: ['surface:mcl-landing-origin-main:S'],
    workspace: { kind: 'landing_metadata', branch: 'server/work', worktree: '/root/nyang-repo' },
    observedBaseSha: baseSha,
  }));
  assert.equal(m.workspace.kind, 'landing_metadata');
});
test('landing_metadata manifest supports documented S route fallback to exact M identity', () => {
  const m = handoff.buildManifest(manifestInput({
    phaseId: 'landing-refresh-m-fallback', executor: 'M',
    scopes: ['surface:mcl-landing-origin-main:M'],
    workspace: { kind: 'landing_metadata', branch: 'mainphone/work', worktree: '/data/data/com.termux/files/home/nyang-worktrees/mainphone-work' },
    observedBaseSha: baseSha,
  }));
  assert.equal(m.executor, 'M');
});
test('landing_metadata manifest rejects mismatched scope identity and missing observed head', () => {
  expectThrow(() => handoff.buildManifest(manifestInput({
    scopes: ['surface:mcl-landing-origin-main:M'],
    workspace: { kind: 'landing_metadata', branch: 'server/work', worktree: '/root/nyang-repo' },
  })), /LANDING_METADATA_SCOPE_INVALID/);
  expectThrow(() => handoff.buildManifest(manifestInput({
    scopes: ['surface:mcl-landing-origin-main:S'], observedBaseSha: null,
    workspace: { kind: 'landing_metadata', branch: 'server/work', worktree: '/root/nyang-repo' },
  })), /LANDING_METADATA_BASE_SHA_REQUIRED/);
});
test('landing_branch_repair manifest accepts only exact M/M identity and scope', () => {
  const m = handoff.buildManifest(manifestInput({
    phaseId: 'landing-branch-repair-m',
    route: 'M',
    executor: 'M',
    scopes: ['surface:mcl-landing-branch:M'],
    workspace: { kind: 'landing_branch_repair', branch: 'mainphone/work', worktree: '/data/data/com.termux/files/home/nyang-worktrees/mainphone-work' },
    observedBaseSha: baseSha,
  }));
  assert.equal(m.route, 'M');
  assert.equal(m.executor, 'M');
  assert.equal(m.workspace.kind, 'landing_branch_repair');
});
test('landing_branch_repair manifest rejects fallback mismatched identity scope and missing base', () => {
  const base = {
    phaseId: 'landing-branch-repair-m',
    route: 'M',
    executor: 'M',
    scopes: ['surface:mcl-landing-branch:M'],
    workspace: { kind: 'landing_branch_repair', branch: 'mainphone/work', worktree: '/data/data/com.termux/files/home/nyang-worktrees/mainphone-work' },
    observedBaseSha: baseSha,
  };
  expectThrow(() => handoff.buildManifest(manifestInput({...base, route:'S'})), /LANDING_BRANCH_REPAIR_ROUTE_EXECUTOR_INVALID/);
  expectThrow(() => handoff.buildManifest(manifestInput({...base, route:'S', executor:'S'})), /WORKSPACE_LANDING_BRANCH_REPAIR_EXECUTOR_INVALID|LANDING_BRANCH_REPAIR_ROUTE_EXECUTOR_INVALID/);
  expectThrow(() => handoff.buildManifest(manifestInput({...base, scopes:['surface:mcl-landing-origin-main:M']})), /LANDING_BRANCH_REPAIR_SCOPE_INVALID/);
  expectThrow(() => handoff.buildManifest(manifestInput({...base, observedBaseSha:null})), /LANDING_BRANCH_REPAIR_BASE_SHA_REQUIRED/);
  expectThrow(() => handoff.buildManifest(manifestInput({...base, workspace:{...base.workspace, branch:'mainphone/other'}})), /WORKSPACE_LANDING_BRANCH_REPAIR_IDENTITY_INVALID/);
});
test('context route supports not-applicable repo workspace', () => {
  const m = handoff.buildManifest(manifestInput({
    route: 'M_PRIVATE_LAB', executor: 'M_PRIVATE_LAB', phaseClass: 'EXPERIMENT',
    workspace: { kind: 'not_applicable', branch: 'not_applicable', worktree: 'not_applicable' },
  }));
  assert.equal(m.workspace.kind, 'not_applicable');
});
test('required lease evidence cannot be omitted', () => expectThrow(
  () => handoff.buildManifest(manifestInput({ leaseEvidence: null })),
  /MANIFEST_LEASE_OBJECT_REQUIRED/,
));
test('not-required phase rejects stray lease evidence', () => expectThrow(
  () => handoff.buildManifest(manifestInput({ leaseRequirement: 'NOT_REQUIRED' })),
  /MANIFEST_LEASE_EVIDENCE_FORBIDDEN/,
));
test('builder rejects privacy-forbidden undeclared fields', () => expectThrow(
  () => handoff.buildManifest({ ...manifestInput(), sessionId: 'forbidden' }),
  /MANIFEST_UNKNOWN_FIELD:sessionId/,
));
test('reference fields reject command or raw prose payloads', () => expectThrow(
  () => handoff.buildManifest(manifestInput({ inputRefs: ['command=rm -rf /'] })),
  /MANIFEST_INPUT_REFS_REF_INVALID/,
));
test('identical envelope replay is idempotent', () => {
  assert.equal(handoff.classifyIdentity(manifest, { ...manifest }, 'manifestId').status, 'IDEMPOTENT');
});
test('same claimed identity with different payload is conflict', () => {
  assert.equal(handoff.classifyIdentity(manifest, { ...manifest, phaseId: 'other-phase' }, 'manifestId').status, 'CONFLICT');
});

const receipt = handoff.buildCompletionReceipt(manifest, receiptInput());
test('completion receipt render parse roundtrip', () => {
  const parsed = handoff.parseCompletionReceipt(handoff.renderCompletionReceipt(receipt));
  assert.equal(parsed.status, 'VALID');
  assert.deepEqual(parsed.value, receipt);
});
test('completion receipt is bound to exact manifest', () => {
  assert.equal(handoff.validateReceiptAgainstManifest(receipt, manifest).status, 'VALID');
  const other = handoff.buildManifest(manifestInput({ phaseId: 'validation-merge' }));
  assert.equal(handoff.validateReceiptAgainstManifest(receipt, other).status, 'BLOCKED');
});
test('complete receipt rejects unresolved required unknowns', () => expectThrow(
  () => handoff.buildCompletionReceipt(manifest, receiptInput({ requiredUnknownRefs: ['#2356'] })),
  /RECEIPT_COMPLETE_HAS_REQUIRED_UNKNOWN/,
));
test('lease-required receipt requires explicit release evidence', () => expectThrow(
  () => handoff.buildCompletionReceipt(manifest, receiptInput({ leaseDisposition: 'UNKNOWN', leaseReleaseEvidence: null })),
  /RECEIPT_REQUIRED_LEASE_NOT_RELEASED/,
));
test('release evidence must match acquired lease', () => expectThrow(
  () => handoff.buildCompletionReceipt(manifest, receiptInput({ leaseReleaseEvidence: { ledgerRef: '#2352', leaseId: 'e'.repeat(64), releasedGeneration: 8, evidenceRef: 'run:2' } })),
  /RECEIPT_RELEASE_LEASE_ID_CONFLICT/,
));
test('release generation must advance beyond acquisition', () => expectThrow(
  () => handoff.buildCompletionReceipt(manifest, receiptInput({ leaseReleaseEvidence: { ledgerRef: '#2352', leaseId, releasedGeneration: 7, evidenceRef: 'run:2' } })),
  /RECEIPT_RELEASE_GENERATION_NOT_ADVANCED/,
));
test('complete repository phase requires clean workspace result', () => expectThrow(
  () => handoff.buildCompletionReceipt(manifest, receiptInput({ workspaceResult: 'unknown' })),
  /RECEIPT_COMPLETE_WORKSPACE_NOT_CONVERGED/,
));
test('legacy completion receipt omits optional preservation field', () => {
  assert.equal('workspacePreservation' in receipt, false);
  assert.doesNotMatch(handoff.renderCompletionReceipt(receipt), /workspacePreservation/);
});
test('reviewed cleanup accepts exact preserved-dirty completion proof', () => {
  const m = handoff.buildManifest(cleanupManifestInput());
  const r = handoff.buildCompletionReceipt(m, preservedDirtyReceiptInput());
  assert.equal(r.workspaceResult, 'preserved_dirty');
  assert.deepEqual(r.workspacePreservation.preservedPathRefs, [...preservedPaths].sort());
  assert.equal(handoff.validateReceiptAgainstManifest(r, m).status, 'VALID');
});
test('preserved-dirty proof requires equal non-empty tracked diff identity', () => {
  const m = handoff.buildManifest(cleanupManifestInput());
  expectThrow(
    () => handoff.buildCompletionReceipt(m, preservedDirtyReceiptInput({
      workspacePreservation: preservationInput({afterSha256: 'e'.repeat(64)}),
    })),
    /RECEIPT_PRESERVATION_DIFF_IDENTITY_MISMATCH/,
  );
  expectThrow(
    () => handoff.buildCompletionReceipt(m, preservedDirtyReceiptInput({
      workspacePreservation: preservationInput({beforeSha256: emptyDiffSha, afterSha256: emptyDiffSha}),
    })),
    /RECEIPT_PRESERVATION_EMPTY_DIFF_FORBIDDEN/,
  );
});
test('preserved-dirty path proof is nonempty unique path-only and excludes cleanup path', () => {
  const m = handoff.buildManifest(cleanupManifestInput());
  expectThrow(
    () => handoff.buildCompletionReceipt(m, preservedDirtyReceiptInput({
      workspacePreservation: preservationInput({preservedPathRefs: []}),
    })), /RECEIPT_PRESERVATION_PATH_REFS_INVALID/,
  );
  expectThrow(
    () => handoff.buildCompletionReceipt(m, preservedDirtyReceiptInput({
      workspacePreservation: preservationInput({preservedPathRefs: [preservedPaths[0], preservedPaths[0]]}),
    })), /RECEIPT_PRESERVATION_PATH_REF_DUPLICATE/,
  );
  expectThrow(
    () => handoff.buildCompletionReceipt(m, preservedDirtyReceiptInput({
      workspacePreservation: preservationInput({preservedPathRefs: ['surface:mcl:test']}),
    })), /RECEIPT_PRESERVATION_PATH_REF_INVALID/,
  );
  expectThrow(
    () => handoff.buildCompletionReceipt(m, preservedDirtyReceiptInput({
      workspacePreservation: preservationInput({preservedPathRefs: [cleanupPath]}),
    })), /RECEIPT_PRESERVATION_CLEANUP_PATH_CONFLICT/,
  );
});
test('preserved-dirty evidence must be explicit and included in validation refs', () => {
  const m = handoff.buildManifest(cleanupManifestInput());
  const missing = preservationInput();
  delete missing.evidenceRef;
  expectThrow(
    () => handoff.buildCompletionReceipt(m, preservedDirtyReceiptInput({workspacePreservation: missing})),
    /RECEIPT_PRESERVATION_FIELD_REQUIRED:evidenceRef/,
  );
  expectThrow(
    () => handoff.buildCompletionReceipt(m, preservedDirtyReceiptInput({validationRefs: ['run:10']})),
    /RECEIPT_PRESERVATION_EVIDENCE_NOT_VALIDATED/,
  );
});
test('preserved-dirty completion is cleanup-manifest only', () => {
  expectThrow(
    () => handoff.buildCompletionReceipt(manifest, preservedDirtyReceiptInput()),
    /RECEIPT_PRESERVED_DIRTY_MANIFEST_SCOPE_INVALID|RECEIPT_PRESERVED_DIRTY_EXPECTED_OUTPUT_MISSING/,
  );
});
test('workspace preservation is forbidden outside complete preserved-dirty receipt', () => {
  for (const workspaceResult of ['clean', 'not_applicable', 'unknown']) {
    expectThrow(
      () => handoff.buildCompletionReceipt(manifest, receiptInput({
        workspaceResult, workspacePreservation: preservationInput(),
      })), /RECEIPT_PRESERVATION_UNEXPECTED/,
    );
  }
  const m = handoff.buildManifest(cleanupManifestInput());
  for (const disposition of ['BLOCKED', 'PARTIAL']) {
    expectThrow(
      () => handoff.buildCompletionReceipt(m, preservedDirtyReceiptInput({
        disposition, blockerRefs: disposition === 'BLOCKED' ? ['#2805'] : [],
      })), /RECEIPT_PRESERVED_DIRTY_COMPLETE_REQUIRED/,
    );
  }
});

test('complete landing_metadata phase also requires clean workspace result after release', () => {
  const m = handoff.buildManifest(manifestInput({
    phaseId: 'landing-refresh-receipt',
    scopes: ['surface:mcl-landing-origin-main:S'],
    workspace: { kind: 'landing_metadata', branch: 'server/work', worktree: '/root/nyang-repo' },
    observedBaseSha: baseSha,
  }));
  const r = handoff.buildCompletionReceipt(m, receiptInput());
  assert.equal(handoff.validateReceiptAgainstManifest(r, m).status, 'VALID');
  expectThrow(() => handoff.buildCompletionReceipt(m, receiptInput({workspaceResult:'not_applicable'})), /RECEIPT_COMPLETE_WORKSPACE_NOT_CONVERGED/);
});
test('blocked phase can preserve bounded unknowns after lease release', () => {
  const r = handoff.buildCompletionReceipt(manifest, receiptInput({
    disposition: 'BLOCKED', outputRefs: [], validationRefs: [], workspaceResult: 'unknown',
    blockerRefs: ['#2356'], requiredUnknownRefs: ['#2356'],
  }));
  assert.equal(r.disposition, 'BLOCKED');
});
test('non-lease phase uses NOT_REQUIRED receipt disposition', () => {
  const m = handoff.buildManifest(manifestInput({
    route: 'S_TERMUX', executor: 'S_TERMUX', phaseClass: 'VALIDATION', leaseRequirement: 'NOT_REQUIRED', leaseEvidence: null,
    workspace: { kind: 'not_applicable', branch: 'not_applicable', worktree: 'not_applicable' },
  }));
  const r = handoff.buildCompletionReceipt(m, receiptInput({
    leaseDisposition: 'NOT_REQUIRED', leaseReleaseEvidence: null, workspaceResult: 'not_applicable',
  }));
  assert.equal(handoff.validateReceiptAgainstManifest(r, m).status, 'VALID');
});
test('completion authority flags remain false', () => {
  assert.deepEqual(receipt.authority, handoff.AUTHORITY_FLAGS);
  assert.equal('packetDone' in receipt, false);
});
test('completion builder rejects undeclared private fields', () => expectThrow(
  () => handoff.buildCompletionReceipt(manifest, { ...receiptInput(), deviceId: 'forbidden' }),
  /RECEIPT_INPUT_UNKNOWN_FIELD:deviceId/,
));
test('different semantic phases produce different immutable manifest ids', () => {
  const other = handoff.buildManifest(manifestInput({ phaseId: 'postmerge-convergence' }));
  assert.notEqual(other.manifestId, manifest.manifestId);
});
test('library contains no GitHub network device or shell writer path', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'task-handoff.cjs'), 'utf8');
  assert.doesNotMatch(source, /createGitHubClient|child_process|execSync|spawnSync|https\.request|fetch\s*\(/);
  assert.match(source, /validateWorkspace: validateLeaseWorkspace/);
  assert.match(source, /validateLandingMetadataBinding/);
});
test('library contains no time-based lifetime or latest-wins primitive', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'task-handoff.cjs'), 'utf8');
  assert.doesNotMatch(source, /Date\.now|expiresAt|ttl|latestWins|latest_wins/i);
});

if (process.exitCode) process.exit(process.exitCode);
process.stdout.write(`task-handoff contract: ${passed}/${passed} PASS\n`);
