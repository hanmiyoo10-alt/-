'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  ATTENTION_DISPOSITIONS,
  ATTENTION_STATES,
  EXECUTION_LIFECYCLES,
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
assert.deepEqual(EXECUTION_LIFECYCLES, [
  'QUEUED', 'RUNNING', 'FINISHED', 'UNKNOWN',
]);
assert.deepEqual(ATTENTION_DISPOSITIONS, [
  'COMPLETE', 'NEEDS_REVIEW', 'BLOCKED', 'UNKNOWN', 'CONFLICT',
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
assert.equal(pass.receiptDigest, 'f2e9da03591fa8f1acfb50622d408ec8e15aad822433f86017ec79aefbac136a');
assert.equal('executionLifecycle' in pass, false);
assert.equal('attentionDisposition' in pass, false);
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

function fixtureV2(overrides = {}) {
  const value = fixture();
  value.schemaVersion = 2;
  delete value.attentionState;
  value.executionLifecycle = 'FINISHED';
  value.attentionDisposition = 'COMPLETE';
  return { ...value, ...overrides };
}

const v2Pass = projectExecutionReceipt(fixtureV2());
assert.equal(v2Pass.validity, 'VALID');
assert.equal(v2Pass.schemaVersion, 2);
assert.equal(v2Pass.executionLifecycle, 'FINISHED');
assert.equal(v2Pass.attentionDisposition, 'COMPLETE');
assert.equal(v2Pass.result, 'PASS');
assert.equal('attentionState' in v2Pass, false);
assert.equal(exitCodeFor(v2Pass), 0);
for (const field of [
  'mutationAuthorized',
  'executionAuthorized',
  'mergeAuthorized',
  'releaseAuthorized',
  'productionAuthorized',
  'runtimeAuthorityGranted',
  'securityAuthorityGranted',
]) {
  assert.equal(v2Pass[field], false, `v2 ${field} must remain false`);
}

const v2Queued = projectExecutionReceipt(fixtureV2({
  executionLifecycle: 'QUEUED',
  result: 'PARTIAL',
  reasonCodes: ['EXECUTION_QUEUED'],
  exitCode: null,
}));
assert.equal(v2Queued.validity, 'VALID');
assert.equal(v2Queued.result, 'PARTIAL');
assert.equal(exitCodeFor(v2Queued), 3);

const v2Running = projectExecutionReceipt(fixtureV2({
  executionLifecycle: 'RUNNING',
  result: 'PARTIAL',
  reasonCodes: ['EXECUTION_RUNNING'],
  exitCode: null,
}));
assert.equal(v2Running.validity, 'VALID');
assert.equal(v2Running.attentionDisposition, 'COMPLETE');
assert.equal(v2Running.result, 'PARTIAL');
assert.equal(exitCodeFor(v2Running), 3);

const v2RunningReview = projectExecutionReceipt(fixtureV2({
  executionLifecycle: 'RUNNING',
  attentionDisposition: 'NEEDS_REVIEW',
  result: 'UNKNOWN',
  reasonCodes: ['SEMANTIC_REVIEW_REQUIRED'],
  requiredUnknowns: ['SEMANTIC_INTERPRETATION_PENDING'],
  exitCode: null,
}));
assert.equal(v2RunningReview.validity, 'VALID');
assert.equal(v2RunningReview.executionLifecycle, 'RUNNING');
assert.equal(v2RunningReview.attentionDisposition, 'NEEDS_REVIEW');
assert.equal(v2RunningReview.result, 'UNKNOWN');
assert.equal(exitCodeFor(v2RunningReview), 3);

const v2FailInput = fixtureV2({
  result: 'FAIL',
  reasonCodes: ['EXECUTION_FAILED'],
  exitCode: 7,
  steps: [
    { name: 'bundle-verify', result: 'PASS', evidenceLocator: 'artifact:runs/bundle-verify.json' },
    { name: 'query-batch', result: 'FAIL', evidenceLocator: 'artifact:runs/query-failure.json' },
  ],
});
const v2Fail = projectExecutionReceipt(v2FailInput);
assert.equal(v2Fail.validity, 'VALID');
assert.equal(v2Fail.result, 'FAIL');
assert.equal(exitCodeFor(v2Fail), 2);

const v2Blocked = projectExecutionReceipt(fixtureV2({
  attentionDisposition: 'BLOCKED',
  result: 'BLOCKED',
  reasonCodes: ['CAPABILITY_UNAVAILABLE'],
  blockers: ['REMOTE_TOOL_OFFLINE'],
  exitCode: null,
  steps: [
    { name: 'capability-check', result: 'BLOCKED', evidenceLocator: 'artifact:runs/capability.json' },
  ],
}));
assert.equal(v2Blocked.validity, 'VALID');
assert.equal(v2Blocked.result, 'BLOCKED');
assert.equal(exitCodeFor(v2Blocked), 3);

const v2Conflict = projectExecutionReceipt(fixtureV2({
  attentionDisposition: 'CONFLICT',
  result: 'CONFLICT',
  reasonCodes: ['EXECUTION_EVIDENCE_CONFLICT'],
  conflicts: ['SOURCE_RESULT_CONFLICT'],
  exitCode: null,
}));
assert.equal(v2Conflict.validity, 'VALID');
assert.equal(v2Conflict.result, 'CONFLICT');
assert.equal(exitCodeFor(v2Conflict), 2);

const v2Unknown = projectExecutionReceipt(fixtureV2({
  executionLifecycle: 'UNKNOWN',
  attentionDisposition: 'UNKNOWN',
  result: 'UNKNOWN',
  reasonCodes: ['EXECUTION_STATE_UNKNOWN'],
  requiredUnknowns: ['EXECUTION_COMPLETION_UNKNOWN'],
  exitCode: null,
}));
assert.equal(v2Unknown.validity, 'VALID');
assert.equal(v2Unknown.result, 'UNKNOWN');
assert.equal(exitCodeFor(v2Unknown), 3);

const v2UnknownPass = projectExecutionReceipt(fixtureV2({
  executionLifecycle: 'UNKNOWN',
}));
assert.equal(v2UnknownPass.validity, 'VALID');
assert.equal(v2UnknownPass.result, 'UNKNOWN');
assert.ok(v2UnknownPass.requiredUnknowns.includes('EXECUTION_LIFECYCLE_UNKNOWN'));
assert.equal(exitCodeFor(v2UnknownPass), 3);

const v2RunningPass = projectExecutionReceipt(fixtureV2({
  executionLifecycle: 'RUNNING',
  exitCode: null,
}));
assert.equal(v2RunningPass.result, 'CONFLICT');
assert.ok(v2RunningPass.conflicts.includes('RUNNING_CONFLICTS_WITH_TERMINAL_RESULT'));
assert.equal(exitCodeFor(v2RunningPass), 2);

const v2QueuedFail = projectExecutionReceipt(fixtureV2({
  executionLifecycle: 'QUEUED',
  result: 'FAIL',
  reasonCodes: ['EXECUTION_FAILED'],
  exitCode: 7,
}));
assert.equal(v2QueuedFail.result, 'CONFLICT');
assert.ok(v2QueuedFail.conflicts.includes('QUEUED_CONFLICTS_WITH_TERMINAL_RESULT'));
assert.equal(exitCodeFor(v2QueuedFail), 2);

const v2BlockedContradiction = projectExecutionReceipt(fixtureV2({
  attentionDisposition: 'BLOCKED',
}));
assert.equal(v2BlockedContradiction.result, 'CONFLICT');
assert.ok(v2BlockedContradiction.conflicts.includes('BLOCKED_DISPOSITION_CONFLICTS_WITH_RESULT'));

const v2MissingSource = fixtureV2();
delete v2MissingSource.sourceIdentity;
const v2MissingSourceReceipt = projectExecutionReceipt(v2MissingSource);
assert.equal(v2MissingSourceReceipt.result, 'UNKNOWN');
assert.ok(v2MissingSourceReceipt.requiredUnknowns.includes('SOURCE_IDENTITY_MISSING'));

const v2FailedStep = fixtureV2();
v2FailedStep.steps[1] = {
  name: 'query-batch',
  result: 'FAIL',
  evidenceLocator: 'artifact:runs/query-failure.json',
};
const v2FailedStepReceipt = projectExecutionReceipt(v2FailedStep);
assert.equal(v2FailedStepReceipt.result, 'CONFLICT');
assert.ok(v2FailedStepReceipt.conflicts.includes('PASS_CONFLICTS_WITH_STEP_FAIL:query-batch'));

const v2LegacyField = fixtureV2();
v2LegacyField.attentionState = 'COMPLETE';
const v2LegacyFieldResult = projectExecutionReceipt(v2LegacyField);
assert.equal(v2LegacyFieldResult.validity, 'INVALID');
assert.ok(v2LegacyFieldResult.reasonCodes.includes('INPUT_FIELD_UNSUPPORTED:input.attentionState'));

const v2MissingLifecycle = fixtureV2();
delete v2MissingLifecycle.executionLifecycle;
const v2MissingLifecycleResult = projectExecutionReceipt(v2MissingLifecycle);
assert.equal(v2MissingLifecycleResult.validity, 'INVALID');
assert.ok(v2MissingLifecycleResult.reasonCodes.includes('INPUT_FIELD_MISSING:executionLifecycle'));

const v2MissingDisposition = fixtureV2();
delete v2MissingDisposition.attentionDisposition;
const v2MissingDispositionResult = projectExecutionReceipt(v2MissingDisposition);
assert.equal(v2MissingDispositionResult.validity, 'INVALID');
assert.ok(v2MissingDispositionResult.reasonCodes.includes('INPUT_FIELD_MISSING:attentionDisposition'));

const v2BadLifecycle = projectExecutionReceipt(fixtureV2({ executionLifecycle: 'DONE' }));
assert.equal(v2BadLifecycle.validity, 'INVALID');
assert.ok(v2BadLifecycle.reasonCodes.includes('INPUT_EXECUTION_LIFECYCLE_INVALID'));

const v2BadDisposition = projectExecutionReceipt(fixtureV2({ attentionDisposition: 'RUNNING' }));
assert.equal(v2BadDisposition.validity, 'INVALID');
assert.ok(v2BadDisposition.reasonCodes.includes('INPUT_ATTENTION_DISPOSITION_INVALID'));

const v2LifecycleDigestA = projectExecutionReceipt(fixtureV2({
  executionLifecycle: 'QUEUED',
  result: 'PARTIAL',
  reasonCodes: ['NONTERMINAL_EXECUTION'],
  exitCode: null,
}));
const v2LifecycleDigestB = projectExecutionReceipt(fixtureV2({
  executionLifecycle: 'RUNNING',
  result: 'PARTIAL',
  reasonCodes: ['NONTERMINAL_EXECUTION'],
  exitCode: null,
}));
assert.notEqual(v2LifecycleDigestA.receiptDigest, v2LifecycleDigestB.receiptDigest);

const v2DispositionDigestA = projectExecutionReceipt(fixtureV2({
  executionLifecycle: 'RUNNING',
  attentionDisposition: 'COMPLETE',
  result: 'PARTIAL',
  reasonCodes: ['NONTERMINAL_EXECUTION'],
  exitCode: null,
}));
const v2DispositionDigestB = projectExecutionReceipt(fixtureV2({
  executionLifecycle: 'RUNNING',
  attentionDisposition: 'NEEDS_REVIEW',
  result: 'PARTIAL',
  reasonCodes: ['NONTERMINAL_EXECUTION'],
  exitCode: null,
}));
assert.notEqual(v2DispositionDigestA.receiptDigest, v2DispositionDigestB.receiptDigest);

const v2Sensitive = fixtureV2();
v2Sensitive.stderrTail = 'Authorization: Bearer abcdefghijklmnop';
const v2SensitiveResult = projectExecutionReceipt(v2Sensitive);
assert.equal(v2SensitiveResult.schemaVersion, 2);
assert.equal(v2SensitiveResult.validity, 'INVALID');
assert.ok(v2SensitiveResult.reasonCodes.includes('INPUT_FIELD_SENSITIVE:stderrTail'));

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
assert.match(compactnessSkill, /executionLifecycle = QUEUED \| RUNNING \| FINISHED \| UNKNOWN/);
assert.match(compactnessSkill, /attentionDisposition = COMPLETE \| NEEDS_REVIEW \| BLOCKED \| UNKNOWN \| CONFLICT/);
assert.match(compactnessSkill, /Never guess v2 values from v1/);
assert.match(compactnessSkill, /NEEDS_REVIEW/);
assert.match(compactnessSkill, /targeted drill-down/);

const harnessReadme = fs.readFileSync(
  path.join(root, '.github/plugin-control-plane/canonical-main/work-harness/README.md'),
  'utf8',
);
assert.match(harnessReadme, /Generic repository execution receipt/);
assert.match(harnessReadme, /V1 is preserved for compatibility/);
assert.match(harnessReadme, /executionLifecycle/);
assert.match(harnessReadme, /attentionDisposition/);
assert.match(harnessReadme, /does not infer v2 axes from v1/);
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
