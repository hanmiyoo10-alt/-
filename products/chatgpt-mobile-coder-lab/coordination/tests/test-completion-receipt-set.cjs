'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const handoff = require('../task-handoff.cjs');
const classifier = require('../completion-receipt-set.cjs');

const leaseId = 'a'.repeat(64);
const packetHash = 'b'.repeat(64);
const baseSha = 'c'.repeat(40);
const observedSha = 'd'.repeat(40);
const cleanupPath = 'path:products/chatgpt-mobile-coder-lab/device-ops/repository-patch/__pycache__/mcl-worktree-patch.cpython-312.pyc';
const preservedDiffSha = 'f'.repeat(64);
const preservedPath = 'path:products/chatgpt-mobile-coder-lab/device-ops/repository-patch/README.md';

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    process.stdout.write('PASS ' + name + '\n');
  } catch (error) {
    process.stderr.write('FAIL ' + name + ': ' + (error.stack || error) + '\n');
    process.exitCode = 1;
  }
}
function manifestInput(overrides = {}) {
  return {
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: '#2569',
    packetBodySha256: packetHash,
    phaseId: '2569-test',
    phaseClass: 'REPOSITORY_MUTATION',
    route: 'S',
    executor: 'S',
    scopes: ['path:products/chatgpt-mobile-coder-lab/docs/task-handoff.md'],
    workspace: {
      kind: 'repository',
      branch: 'server/mcl-packet-2569',
      worktree: '/root/nyang-worktrees/mcl-packet-2569',
    },
    observedBaseSha: baseSha,
    leaseRequirement: 'REQUIRED',
    leaseEvidence: {
      ledgerRef: '#2352',
      leaseId,
      acquiredGeneration: 7,
      acquireEvidenceRef: 'run:1',
    },
    sourceAuthorityRefs: ['#2569'],
    inputRefs: ['issue:#2352'],
    expectedOutputRefs: [
      'path:products/chatgpt-mobile-coder-lab/docs/task-handoff.md',
    ],
    acceptanceRefs: ['#2569'],
    stopCondition: 'Test completion receipt set semantics.',
    authority: {...handoff.AUTHORITY_FLAGS},
    ...overrides,
  };
}
function receiptInput(overrides = {}) {
  return {
    disposition: 'COMPLETE',
    outputRefs: ['pr:#1'],
    validationRefs: ['run:2'],
    observedRefs: ['commit:' + observedSha],
    leaseDisposition: 'RELEASED',
    leaseReleaseEvidence: {
      ledgerRef: '#2352',
      leaseId,
      releasedGeneration: 8,
      evidenceRef: 'run:3',
    },
    workspaceResult: 'clean',
    blockerRefs: [],
    requiredUnknownRefs: [],
    ...overrides,
  };
}
function rendered(manifest, input = {}) {
  return handoff.renderCompletionReceipt(
    handoff.buildCompletionReceipt(manifest, receiptInput(input)),
  );
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
function preservedInput(evidenceRef = 'run:9', digest = preservedDiffSha, paths = [preservedPath]) {
  return {
    disposition: 'COMPLETE',
    outputRefs: [cleanupPath],
    validationRefs: [evidenceRef],
    observedRefs: ['commit:' + observedSha],
    leaseDisposition: 'RELEASED',
    leaseReleaseEvidence: {
      ledgerRef: '#2352', leaseId, releasedGeneration: 8, evidenceRef: 'run:3',
    },
    workspaceResult: 'preserved_dirty',
    workspacePreservation: {
      kind: 'TRACKED_DIFF_PRESERVED', beforeSha256: digest, afterSha256: digest,
      preservedPathRefs: paths, evidenceRef,
    },
    blockerRefs: [],
    requiredUnknownRefs: [],
  };
}

const manifest = handoff.buildManifest(manifestInput());
const firstText = rendered(manifest);
const first = handoff.parseCompletionReceipt(firstText).value;
const secondText = rendered(manifest, {
  outputRefs: ['pr:#2'],
  validationRefs: ['run:4'],
  observedRefs: ['commit:' + 'e'.repeat(40)],
  leaseReleaseEvidence: {
    ledgerRef: '#2352',
    leaseId,
    releasedGeneration: 8,
    evidenceRef: 'run:5',
  },
});
const second = handoff.parseCompletionReceipt(secondText).value;

test('legacy receipt and completion-core digests remain exact', () => {
  assert.equal(manifest.manifestId, 'be0009285c526ee97c0d0580f28bcf60211cd4706af06af305e44ff16fccb1b8');
  assert.equal(first.receiptId, '9f7b77737bca7198c224f5c21b52ad030af3c1dbbf1e0745184af4c91d22203c');
  assert.equal(first.payloadSha256, '621cc747b2191c19761f413220fc666fba2cf5b5888098c08f387d537a08244b');
  assert.equal('workspacePreservation' in first, false);
  const out = classifier.classify({manifestId: manifest.manifestId, receiptTexts: [firstText]});
  assert.equal(out.completionCoreDigest, '5096913bca8ae72f8e66d5141e5e67e2e64f3444d06eab404cece8c0f6d45907');
});
test('one valid COMPLETE receipt classifies SINGLE', () => {
  const out = classifier.classify({
    manifestId: manifest.manifestId,
    receiptTexts: [firstText],
  });
  assert.equal(out.status, 'SINGLE');
  assert.equal(out.uniqueReceiptCount, 1);
  assert.equal(out.representativeReceiptId, first.receiptId);
  assert.deepEqual(out.receiptIds, [first.receiptId]);
  assert.equal(out.evidenceVariants, false);
  assert.match(out.completionCoreDigest, /^[0-9a-f]{64}$/);
  assert.deepEqual(out.reasonCodes, []);
});

test('exact duplicate receipt replay collapses by receiptId', () => {
  const out = classifier.classify({
    manifestId: manifest.manifestId,
    receiptTexts: [firstText, firstText],
  });
  assert.equal(out.status, 'SINGLE');
  assert.equal(out.uniqueReceiptCount, 1);
});
test('evidence-only variants classify MULTIPLE_EQUIVALENT', () => {
  const out = classifier.classify({
    manifestId: manifest.manifestId,
    receiptTexts: [secondText, firstText],
  });
  assert.equal(out.status, 'MULTIPLE_EQUIVALENT');
  assert.equal(out.uniqueReceiptCount, 2);
  assert.deepEqual(out.receiptIds, [first.receiptId, second.receiptId].sort());
  assert.equal(out.representativeReceiptId, out.receiptIds[0]);
  assert.equal(out.evidenceVariants, true);
  assert.deepEqual(out.reasonCodes, []);
});

test('completion-core mismatch classifies CONFLICT', () => {
  const thirdText = rendered(manifest, {
    leaseReleaseEvidence: {
      ledgerRef: '#2352',
      leaseId,
      releasedGeneration: 9,
      evidenceRef: 'run:6',
    },
  });
  const out = classifier.classify({
    manifestId: manifest.manifestId,
    receiptTexts: [firstText, thirdText],
  });
  assert.equal(out.status, 'CONFLICT');
  assert.equal(out.representativeReceiptId, null);
  assert.equal(out.completionCoreDigest, null);
  assert.equal(out.evidenceVariants, 'UNKNOWN');
  assert.deepEqual(out.reasonCodes, ['COMPLETION_CORE_CONFLICT']);
});
test('preserved-dirty identity is completion core while evidence locator is evidence-only', () => {
  const cleanup = handoff.buildManifest(cleanupManifestInput());
  const oneText = handoff.renderCompletionReceipt(
    handoff.buildCompletionReceipt(cleanup, preservedInput('run:9')),
  );
  const twoText = handoff.renderCompletionReceipt(
    handoff.buildCompletionReceipt(cleanup, preservedInput('run:10')),
  );
  const equivalent = classifier.classify({
    manifestId: cleanup.manifestId,
    receiptTexts: [oneText, twoText],
  });
  assert.equal(equivalent.status, 'MULTIPLE_EQUIVALENT');
  assert.equal(equivalent.evidenceVariants, true);

  const otherIdentityText = handoff.renderCompletionReceipt(
    handoff.buildCompletionReceipt(cleanup, preservedInput('run:11', 'e'.repeat(64))),
  );
  const conflict = classifier.classify({
    manifestId: cleanup.manifestId,
    receiptTexts: [oneText, otherIdentityText],
  });
  assert.equal(conflict.status, 'CONFLICT');
  assert.deepEqual(conflict.reasonCodes, ['COMPLETION_CORE_CONFLICT']);
});

test('manifest mismatch fails closed UNKNOWN', () => {
  const other = handoff.buildManifest(manifestInput({phaseId: 'other-phase'}));
  const out = classifier.classify({
    manifestId: manifest.manifestId,
    receiptTexts: [rendered(other)],
  });
  assert.equal(out.status, 'UNKNOWN');
  assert(out.reasonCodes.includes('RECEIPT_MANIFEST_MISMATCH'));
});

test('invalid envelope fails closed UNKNOWN', () => {
  const out = classifier.classify({
    manifestId: manifest.manifestId,
    receiptTexts: ['{}'],
  });
  assert.equal(out.status, 'UNKNOWN');
  assert.deepEqual(out.reasonCodes, ['RECEIPT_INVALID']);
});

test('non-COMPLETE receipt fails closed UNKNOWN', () => {
  const blocked = handoff.buildCompletionReceipt(manifest, {
    disposition: 'BLOCKED',
    outputRefs: [],
    validationRefs: [],
    observedRefs: [],
    leaseDisposition: 'RELEASED',
    leaseReleaseEvidence: {
      ledgerRef: '#2352',
      leaseId,
      releasedGeneration: 8,
      evidenceRef: 'run:7',
    },
    workspaceResult: 'unknown',
    blockerRefs: ['#1'],
    requiredUnknownRefs: [],
  });
  const out = classifier.classify({
    manifestId: manifest.manifestId,
    receiptTexts: [handoff.renderCompletionReceipt(blocked)],
  });
  assert.equal(out.status, 'UNKNOWN');
  assert.deepEqual(out.reasonCodes, ['RECEIPT_NOT_COMPLETE']);
});

test('malformed input and unknown fields fail closed', () => {
  assert.equal(classifier.classify(null).status, 'UNKNOWN');
  const extra = classifier.classify({
    manifestId: manifest.manifestId,
    receiptTexts: [firstText],
    deviceId: 'forbidden',
  });
  assert.equal(extra.status, 'UNKNOWN');
  assert(extra.reasonCodes.includes('INPUT_UNKNOWN_FIELD:deviceId'));
});

test('oversized receipt text is rejected before parse', () => {
  const out = classifier.classify({
    manifestId: manifest.manifestId,
    receiptTexts: ['x'.repeat(classifier.MAX_RECEIPT_BYTES + 1)],
  });
  assert.equal(out.status, 'UNKNOWN');
  assert(out.reasonCodes.includes('RECEIPT_TEXT_INVALID'));
});
test('output is bounded and contains no raw receipt payload', () => {
  const out = classifier.classify({
    manifestId: manifest.manifestId,
    receiptTexts: [firstText, secondText],
  });
  const text = JSON.stringify(out);
  assert(!text.includes(handoff.RECEIPT_START));
  assert(!text.includes('outputRefs'));
  assert(!text.includes('validationRefs'));
  assert(!text.includes('observedRefs'));
  assert.deepEqual(out.authority, handoff.AUTHORITY_FLAGS);
  assert.equal(out.details, 'withheld');
});

test('source has no network, clock, process, or mutation runner', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'completion-receipt-set.cjs'), 'utf8');
  for (const forbidden of [
    'node:child_process', 'spawn(', 'exec(', 'execFile(', 'fetch(',
    'https://', 'Date.now(', 'new Date(', 'gh api', 'workflow_dispatch',
  ]) {
    assert(!source.includes(forbidden), 'forbidden source token: ' + forbidden);
  }
});

test('CLI accepts only regular bounded JSON input', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-receipt-set-'));
  try {
    const input = path.join(dir, 'input.json');
    fs.writeFileSync(input, JSON.stringify({
      manifestId: manifest.manifestId,
      receiptTexts: [firstText, secondText],
    }), {mode: 0o600});
    const cli = childProcess.spawnSync(
      process.execPath,
      [path.join(__dirname, '..', 'completion-receipt-set.cjs'),
       '--input-file', input],
      {encoding: 'utf8'},
    );
    assert.equal(cli.status, 0);
    const out = JSON.parse(cli.stdout);
    assert.equal(out.status, 'MULTIPLE_EQUIVALENT');

    const link = path.join(dir, 'link.json');
    fs.symlinkSync(input, link);
    const denied = childProcess.spawnSync(
      process.execPath,
      [path.join(__dirname, '..', 'completion-receipt-set.cjs'),
       '--input-file', link],
      {encoding: 'utf8'},
    );
    assert.equal(denied.status, 2);
    assert.equal(JSON.parse(denied.stdout).status, 'UNKNOWN');
    assert(JSON.parse(denied.stdout).reasonCodes.includes('INPUT_FILE_NOT_REGULAR'));
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

process.stdout.write('PASS total=' + passed + '\n');
