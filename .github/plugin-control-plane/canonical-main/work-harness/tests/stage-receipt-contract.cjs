'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {
  MAX_RENDER_BYTES,
  PROOF_TERMS,
  STAGES,
  exitCodeFor,
  parseArgs,
  projectStageReceipt,
  renderStageReceipt,
  run,
} = require('../stage-receipt.cjs');

const MAIN = '3e9e1138f7ef7e886e17ebeadce727bd2ea2c66f';
const DIFF = 'a'.repeat(64);
const LOCKED = [
  '.github/plugin-control-plane/canonical-main/work-harness/stage-receipt.cjs',
  '.github/plugin-control-plane/canonical-main/work-harness/tests/stage-receipt-contract.cjs',
  '.github/plugin-control-plane/canonical-main/work-harness/README.md',
  '.github/tooling/ci-summary/manifests/plugin-control-plane.json',
];

function fixture(stage = 'IMPLEMENTATION_PR') {
  const diffRequired = stage !== 'AUTHORITY_SCOPE';
  return {
    schemaVersion: 1,
    packetNumber: 2338,
    stage,
    authorityRefs: [
      { kind: 'GIT_REF', locator: 'refs/heads/main', identity: MAIN },
      { kind: 'ISSUE', locator: 'issue:#485', identity: 'updated:2026-09-16T07:38:54Z' },
    ],
    requiredGates: [
      { name: 'Required', result: 'PASS', evidenceLocator: 'workflow-run:35058781034' },
      { name: 'stage-receipt-contract', result: 'PASS', evidenceLocator: 'local:stage-receipt-contract' },
    ],
    scope: {
      paths: [...LOCKED],
      diffRequired,
      ...(diffRequired ? { diffIdentity: DIFF, diffEvidenceLocator: 'git-diff:working-tree' } : {}),
    },
    proof: [
      { term: 'IMPLEMENTED', evidenceLocator: `commit:${MAIN}` },
      { term: 'CONTRACT_PROVEN', evidenceLocator: 'local:stage-receipt-contract' },
    ],
    requiredUnknowns: [],
    conflicts: [],
    blockers: [],
    dependencies: [],
    nextLegalAction: stage === 'AUTHORITY_SCOPE' ? 'IMPLEMENTATION_PR' : 'VALIDATION_MERGE',
  };
}

assert.deepEqual(STAGES.slice(0, 4), [
  'AUTHORITY_SCOPE', 'IMPLEMENTATION_PR', 'VALIDATION_MERGE', 'POSTMERGE_CONVERGENCE',
]);
assert.ok(PROOF_TERMS.includes('CONTRACT_PROVEN'));
for (const stage of STAGES.slice(0, 4)) {
  const receipt = projectStageReceipt(fixture(stage));
  assert.equal(receipt.status, 'PASS', `${stage} fixture must project cleanly`);
  assert.equal(receipt.packetNumber, 2338);
  assert.equal(receipt.stage, stage);
  assert.equal(receipt.mutationAuthorized, false);
  assert.equal(receipt.executionAuthorized, false);
  assert.match(receipt.receiptDigest, /^[0-9a-f]{64}$/);
  assert.deepEqual(receipt.proof.map((row) => row.term), ['IMPLEMENTED', 'CONTRACT_PROVEN']);
  assert.ok(!receipt.proof.some((row) => row.term === 'LIVE_PROVEN' || row.term === 'DONE'));
}

const canonical = projectStageReceipt(fixture());
const reordered = fixture();
reordered.authorityRefs.reverse();
reordered.requiredGates.reverse();
reordered.scope.paths.reverse();
reordered.proof.reverse();
assert.equal(projectStageReceipt(reordered).receiptDigest, canonical.receiptDigest);
assert.equal(exitCodeFor(canonical), 0);

const missingPassEvidence = fixture();
missingPassEvidence.requiredGates[0] = { name: 'Required', result: 'PASS' };
const unknownGate = projectStageReceipt(missingPassEvidence);
assert.equal(unknownGate.status, 'UNKNOWN');
assert.equal(unknownGate.requiredGates.find((row) => row.name === 'Required').result, 'UNKNOWN');
assert.ok(unknownGate.requiredUnknowns.includes('GATE_EVIDENCE_MISSING:Required:PASS'));
assert.equal(exitCodeFor(unknownGate), 3);

const omittedBlockers = fixture();
delete omittedBlockers.blockers;
const omittedBlockersResult = projectStageReceipt(omittedBlockers);
assert.equal(omittedBlockersResult.status, 'UNKNOWN');
assert.ok(omittedBlockersResult.requiredUnknowns.includes('INPUT_FIELD_OMITTED:blockers'));

const expectedNoRun = fixture();
expectedNoRun.requiredGates = [{ name: 'Path-filtered CI', result: 'EXPECTED_NO_RUN', evidenceLocator: 'trigger-proof:path-filter' }];
const expectedNoRunResult = projectStageReceipt(expectedNoRun);
assert.equal(expectedNoRunResult.status, 'PASS');
assert.equal(expectedNoRunResult.requiredGates[0].result, 'EXPECTED_NO_RUN');
const authorityConflictInput = fixture();
authorityConflictInput.authorityRefs.push({
  kind: 'GIT_REF', locator: 'refs/heads/main', identity: 'b'.repeat(40),
});
const authorityConflict = projectStageReceipt(authorityConflictInput);
assert.equal(authorityConflict.status, 'CONFLICT');
assert.ok(authorityConflict.conflicts.includes('AUTHORITY_REF_CONFLICT:GIT_REF:refs/heads/main'));

const gateConflictInput = fixture();
gateConflictInput.requiredGates.push({ name: 'Required', result: 'FAIL', evidenceLocator: 'workflow-run:other' });
const gateConflict = projectStageReceipt(gateConflictInput);
assert.equal(gateConflict.status, 'CONFLICT');
assert.ok(gateConflict.conflicts.includes('GATE_CONFLICT:Required'));

const doneInput = fixture();
doneInput.proof.push({ term: 'DONE', evidenceLocator: 'issue:#2338' });
doneInput.requiredUnknowns.push('POSTMERGE_EVIDENCE_PENDING');
const rejectedDone = projectStageReceipt(doneInput);
assert.equal(rejectedDone.status, 'CONFLICT');
assert.ok(!rejectedDone.proof.some((row) => row.term === 'DONE'));
assert.ok(rejectedDone.reasonCodes.includes('PROOF_DONE_REJECTED'));

const noDiffInput = fixture('AUTHORITY_SCOPE');
noDiffInput.scope.diffIdentity = DIFF;
noDiffInput.scope.diffEvidenceLocator = 'git-diff:unexpected';
const noDiffConflict = projectStageReceipt(noDiffInput);
assert.equal(noDiffConflict.status, 'CONFLICT');
assert.ok(noDiffConflict.conflicts.includes('SCOPE_DIFF_NOT_APPLICABLE_CONFLICT'));

const missingScopePathsInput = fixture('AUTHORITY_SCOPE');
missingScopePathsInput.scope.paths = [];
const missingScopePaths = projectStageReceipt(missingScopePathsInput);
assert.equal(missingScopePaths.status, 'UNKNOWN');
assert.ok(missingScopePaths.requiredUnknowns.includes('SCOPE_PATHS_MISSING'));
const unsupported = fixture();
unsupported.logs = ['arbitrary raw log'];
const unsupportedResult = projectStageReceipt(unsupported);
assert.equal(unsupportedResult.status, 'INVALID');
assert.ok(unsupportedResult.reasonCodes.includes('INPUT_FIELD_UNSUPPORTED:input.logs'));

const sensitive = fixture();
sensitive.nextLegalAction = 'token=super-secret-value';
const sensitiveResult = projectStageReceipt(sensitive);
assert.equal(sensitiveResult.status, 'INVALID');
assert.ok(sensitiveResult.reasonCodes.includes('INPUT_FIELD_SENSITIVE:nextLegalAction'));
assert.doesNotMatch(JSON.stringify(sensitiveResult), /super-secret-value/);

const rendered = renderStageReceipt(canonical);
assert.match(rendered, /canonical-main-stage-receipt:v1/);
assert.match(rendered, /mutationAuthorized: `false`/);
assert.match(rendered, /executionAuthorized: `false`/);
assert.match(rendered, new RegExp(canonical.receiptDigest));
assert.ok(Buffer.byteLength(rendered, 'utf8') <= MAX_RENDER_BYTES);

assert.deepEqual(
  parseArgs(['--input-file', 'facts.json', '--format', 'markdown']),
  { format: 'markdown', inputFile: 'facts.json' },
);
assert.throws(() => parseArgs(['--format', 'yaml', '--input-file', 'facts.json']), /json or markdown/);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage-receipt-'));
const inputPath = path.join(tempDir, 'facts.json');
fs.writeFileSync(inputPath, JSON.stringify(fixture()), 'utf8');
const cliProjection = run(['--input-file', inputPath, '--format', 'markdown']);
assert.equal(cliProjection.receipt.status, 'PASS');
assert.match(cliProjection.output, /Canonical-main stage receipt/);
fs.rmSync(tempDir, { recursive: true, force: true });

const root = path.resolve(__dirname, '../../../../..');
const source = fs.readFileSync(path.join(root, '.github/plugin-control-plane/canonical-main/work-harness/stage-receipt.cjs'), 'utf8');
assert.doesNotMatch(source, /createGitHubClient|child_process|\.api\(|writeFileSync|appendFileSync/);
const manifest = JSON.parse(fs.readFileSync(
  path.join(root, '.github/tooling/ci-summary/manifests/plugin-control-plane.json'), 'utf8',
));
const commands = manifest.checks.map((check) => check.command.join(' '));
assert.ok(commands.includes(
  'node .github/plugin-control-plane/canonical-main/work-harness/tests/stage-receipt-contract.cjs',
));
assert.ok(commands.includes(
  'node .github/plugin-control-plane/canonical-main/work-harness/tests/stage-checkpoint-contract.cjs',
));

console.log('work-harness stage-receipt-contract: ok');
