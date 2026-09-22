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
