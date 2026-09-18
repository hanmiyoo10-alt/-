'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  ATTENTION_STATES,
  RESULTS,
  MAX_STDERR_TAIL_BYTES,
  exitCodeFor,
  parseArgs,
  projectExecutionReceipt,
} = require('../execution-receipt.cjs');

const root = path.resolve(__dirname, '../../../../..');
const MAIN = '8c931bf1e906c1772be5db85b9b79b013c7703b1';

function fixture() {
  return {
    schemaVersion: 1,
    operationId: 'static-analysis-2449-e0-r3',
    primitiveId: 'repo-owned-analysis-harness',
    sourceIdentity: {
      kind: 'REPOSITORY_SHA',
      locator: 'refs/heads/main',
      identity: MAIN,
    },
    executionSurface: 'REMOTE_HARNESS:M',
    stage: 'QUERY_BATCH',
    attentionState: 'COMPLETE',
    result: 'PASS',
    proofScope: 'bounded static-analysis execution only',
    steps: [
      { name: 'bundle-verify', result: 'PASS', evidenceLocator: 'artifact:runs/bundle-verify.json' },
      { name: 'query-batch', result: 'PASS', evidenceLocator: 'artifact:runs/results.csv' },
    ],
    counters: [
      { name: 'findings', value: 3 },
      { name: 'affected_files', value: 2 },
    ],
    affectedFiles: ['src/bar.ts', 'src/foo.ts'],
    artifactLocators: ['artifact:runs/results.csv', 'artifact:runs/resource.csv'],
    reasonCodes: [],
    requiredUnknowns: [],
    conflicts: [],
    blockers: [],
    exitCode: 0,
    nextLegalAction: 'INTERPRET_RECEIPT',
  };
}

assert.deepEqual(ATTENTION_STATES, [
  'RUNNING', 'COMPLETE', 'NEEDS_REVIEW', 'BLOCKED', 'UNKNOWN',
]);
assert.deepEqual(RESULTS, [
  'PASS', 'FAIL', 'PARTIAL', 'UNKNOWN', 'CONFLICT', 'BLOCKED',
]);

const pass = projectExecutionReceipt(fixture());
assert.equal(pass.validity, 'VALID');
assert.equal(pass.mode, 'REPOSITORY_EXECUTION_RECEIPT');
assert.equal(pass.attentionState, 'COMPLETE');
assert.equal(pass.result, 'PASS');
assert.equal(exitCodeFor(pass), 0);
assert.match(pass.receiptDigest, /^[0-9a-f]{64}$/);
for (const field of [
  'mutationAuthorized',
  'executionAuthorized',
  'mergeAuthorized',
  'releaseAuthorized',
  'productionAuthorized',
  'runtimeAuthorityGranted',
  'securityAuthorityGranted',
]) {
  assert.equal(pass[field], false, `${field} must remain false`);
}

const reordered = fixture();
reordered.steps.reverse();
reordered.counters.reverse();
reordered.affectedFiles.reverse();
reordered.artifactLocators.reverse();
assert.equal(projectExecutionReceipt(reordered).receiptDigest, pass.receiptDigest);

const reviewInput = fixture();
reviewInput.attentionState = 'NEEDS_REVIEW';
reviewInput.reasonCodes = ['SEMANTIC_RESULT_ANOMALY'];
reviewInput.counters.push({ name: 'semantic_candidates', value: 0 });
const review = projectExecutionReceipt(reviewInput);
assert.equal(review.validity, 'VALID');
assert.equal(review.attentionState, 'NEEDS_REVIEW');
assert.equal(review.result, 'PASS');
assert.equal(exitCodeFor(review), 3);
assert.deepEqual(review.reasonCodes, ['SEMANTIC_RESULT_ANOMALY']);

const blockedInput = fixture();
blockedInput.attentionState = 'BLOCKED';
blockedInput.result = 'BLOCKED';
blockedInput.reasonCodes = ['CAPABILITY_UNAVAILABLE'];
blockedInput.blockers = ['REMOTE_TOOL_OFFLINE'];
blockedInput.steps = [
  { name: 'capability-check', result: 'BLOCKED', evidenceLocator: 'artifact:runs/capability.json' },
];
const blocked = projectExecutionReceipt(blockedInput);
assert.equal(blocked.validity, 'VALID');
assert.equal(blocked.result, 'BLOCKED');
assert.equal(exitCodeFor(blocked), 3);

const missingSource = fixture();
delete missingSource.sourceIdentity;
const unknown = projectExecutionReceipt(missingSource);
assert.equal(unknown.validity, 'VALID');
assert.equal(unknown.result, 'UNKNOWN');
assert.ok(unknown.requiredUnknowns.includes('SOURCE_IDENTITY_MISSING'));

const unknownStep = fixture();
unknownStep.steps[1] = { name: 'query-batch', result: 'UNKNOWN' };
const unknownStepReceipt = projectExecutionReceipt(unknownStep);
assert.equal(unknownStepReceipt.result, 'UNKNOWN');
assert.ok(unknownStepReceipt.requiredUnknowns.includes('STEP_UNKNOWN:query-batch'));

const failedStep = fixture();
failedStep.steps[1] = { name: 'query-batch', result: 'FAIL', evidenceLocator: 'artifact:runs/query-failure.json' };
const failedStepReceipt = projectExecutionReceipt(failedStep);
assert.equal(failedStepReceipt.result, 'CONFLICT');
assert.ok(failedStepReceipt.conflicts.includes('PASS_CONFLICTS_WITH_STEP_FAIL:query-batch'));

const duplicateStep = fixture();
duplicateStep.steps.push({
  name: 'query-batch',
  result: 'FAIL',
  evidenceLocator: 'artifact:runs/query-failure.json',
});
const conflicted = projectExecutionReceipt(duplicateStep);
assert.equal(conflicted.validity, 'VALID');
assert.equal(conflicted.result, 'CONFLICT');
assert.ok(conflicted.conflicts.includes('STEP_CONFLICT:query-batch'));
assert.equal(exitCodeFor(conflicted), 2);

const badExit = fixture();
badExit.exitCode = 2;
const exitConflict = projectExecutionReceipt(badExit);
assert.equal(exitConflict.result, 'CONFLICT');
assert.ok(exitConflict.conflicts.includes('PASS_CONFLICTS_WITH_NONZERO_EXIT'));

const missingReviewReason = fixture();
missingReviewReason.attentionState = 'NEEDS_REVIEW';
const reviewUnknown = projectExecutionReceipt(missingReviewReason);
assert.equal(reviewUnknown.result, 'UNKNOWN');
assert.ok(reviewUnknown.requiredUnknowns.includes('REASON_CODE_MISSING'));
const multilineTail = fixture();
multilineTail.stderrTail = 'first failing detail\nsecond failing detail';
assert.equal(projectExecutionReceipt(multilineTail).validity, 'VALID');

const sensitive = fixture();
sensitive.stderrTail = 'Authorization: Bearer abcdefghijklmnop';
const sensitiveResult = projectExecutionReceipt(sensitive);
assert.equal(sensitiveResult.validity, 'INVALID');
assert.ok(sensitiveResult.reasonCodes.includes('INPUT_FIELD_SENSITIVE:stderrTail'));

const oversized = fixture();
oversized.stderrTail = 'x'.repeat(MAX_STDERR_TAIL_BYTES + 1);
const oversizedResult = projectExecutionReceipt(oversized);
assert.equal(oversizedResult.validity, 'INVALID');
assert.ok(oversizedResult.reasonCodes.includes('INPUT_FIELD_TOO_LARGE:stderrTail'));

const badPath = fixture();
badPath.affectedFiles = ['../outside.txt'];
const badPathResult = projectExecutionReceipt(badPath);
assert.equal(badPathResult.validity, 'INVALID');
assert.ok(badPathResult.reasonCodes.some((code) => code.startsWith('INPUT_AFFECTED_PATH_INVALID:')));

assert.deepEqual(
  parseArgs(['--input-file', '/tmp/receipt.json']),
  { inputFile: '/tmp/receipt.json' },
);
assert.throws(() => parseArgs([]), /usage:/);
assert.throws(() => parseArgs(['--input-file', 'a', '--format', 'json']), /usage:/);

const source = fs.readFileSync(
  path.join(root, '.github/plugin-control-plane/canonical-main/work-harness/execution-receipt.cjs'),
  'utf8',
);
assert.doesNotMatch(source, /child_process|createGitHubClient|writeFileSync|appendFileSync|fetch\s*\(/);
assert.match(source, /MAX_STDERR_TAIL_BYTES = 1024/);
assert.match(source, /REPOSITORY_EXECUTION_RECEIPT/);
const commonRules = fs.readFileSync(
  path.join(root, 'docs/REPOSITORY_COMMON_RULES.md'),
  'utf8',
);
assert.match(commonRules, /bounded execution receipt/);
assert.match(commonRules, /targeted drill-down/);

const compactnessSkill = fs.readFileSync(
  path.join(root, '.agents/skills/agent-execution-compactness/SKILL.md'),
  'utf8',
);
assert.match(compactnessSkill, /Execution receipt companion contract/);
assert.match(compactnessSkill, /NEEDS_REVIEW/);
assert.match(compactnessSkill, /targeted drill-down/);

const harnessReadme = fs.readFileSync(
  path.join(root, '.github/plugin-control-plane/canonical-main/work-harness/README.md'),
  'utf8',
);
assert.match(harnessReadme, /Generic repository execution receipt/);
assert.match(harnessReadme, /execution-receipt\.cjs/);

const manifest = JSON.parse(fs.readFileSync(
  path.join(root, '.github/tooling/ci-summary/manifests/plugin-control-plane.json'),
  'utf8',
));
const commands = manifest.checks.map((check) => check.command.join(' '));
assert.ok(commands.includes(
  'node .github/plugin-control-plane/canonical-main/work-harness/tests/execution-receipt-contract.cjs',
));

console.log('work-harness execution-receipt-contract: ok');
