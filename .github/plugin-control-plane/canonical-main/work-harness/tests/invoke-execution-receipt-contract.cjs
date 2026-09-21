'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { stableHash } = require('../handoff.cjs');
const {
  MAX_STDERR_TAIL_BYTES,
  projectInvokeExecutionFacts,
  utf8Tail,
} = require('../invoke-execution-receipt.cjs');
const { projectExecutionReceipt, exitCodeFor } = require('../execution-receipt.cjs');

const root = path.resolve(__dirname, '../../../../..');

function handoff(overrides = {}) {
  const draft = {
    schemaVersion: 1,
    mode: 'EXECUTOR_HANDOFF',
    workId: 'TEST-INVOKE-RECEIPT',
    scopeId: 'simcore',
    requiredCapability: 'SIMCORE_HARNESS_SELF_TEST',
    dispatchStatus: 'DISPATCH_READY',
    preflightDisposition: 'PARALLEL_SAFE',
    status: 'HANDOFF_EXECUTABLE_READ_ONLY',
    adapterId: 'simcore-test-harness',
    route: {
      capability: 'SIMCORE_HARNESS_SELF_TEST',
      targetKind: 'LOCAL_NODE',
      target: 'products/simcore/tooling/test.mjs',
      fixedArgs: ['--self-test'],
      executionClass: 'READ_ONLY',
      mutationClass: null,
      invokePolicy: 'READ_ONLY_LOCAL',
    },
    guards: [],
    reasonCodes: ['HANDOFF_ROUTE_MATCHED', 'READ_ONLY_LOCAL_ROUTE_AUTHORIZED'],
    executionAuthorized: true,
    legalNextAction: 'INVOKE_BOUNDED_READ_ONLY_ROUTE',
    handoffHash: null,
    ...overrides,
  };
  const { handoffHash, ...hashable } = draft;
  return { ...draft, handoffHash: stableHash(hashable) };
}

function result(h, overrides = {}) {
  return {
    schemaVersion: 1,
    mode: 'EXECUTOR_RESULT',
    workId: h.workId,
    handoffHash: h.handoffHash,
    adapterId: h.adapterId,
    status: 'PASS',
    executed: true,
    exitCode: 0,
    signal: null,
    reasonCodes: ['EXECUTOR_READ_ONLY_PASS'],
    stdout: 'bounded self-test output',
    stderr: '',
    ...overrides,
  };
}

function input(h = handoff(), r = null) {
  return {
    schemaVersion: 1,
    handoff: h,
    result: r || result(h),
    sourceIdentity: {
      kind: 'REPOSITORY_SHA',
      locator: 'refs/heads/main',
      identity: 'a'.repeat(40),
    },
    executionSurface: 'LOCAL_HARNESS:WORK_HARNESS',
    artifactLocator: 'artifact:work-harness/invoke-result.json',
  };
}
const passInput = input();
passInput.result.stdout = 'PASS_OUTPUT_SENTINEL_SHOULD_NOT_LEAK';
const passFacts = projectInvokeExecutionFacts(passInput);
assert.equal(passFacts.attentionState, 'COMPLETE');
assert.equal(passFacts.result, 'PASS');
assert.equal(passFacts.exitCode, 0);
assert.equal(passFacts.stderrTail, null);
assert.deepEqual(passFacts.reasonCodes, []);
assert.ok(!JSON.stringify(passFacts).includes('PASS_OUTPUT_SENTINEL_SHOULD_NOT_LEAK'));
assert.equal(passFacts.steps[0].result, 'PASS');
assert.equal(passFacts.steps[0].evidenceLocator, 'artifact:work-harness/invoke-result.json');
assert.deepEqual(passFacts.counters, [
  { name: 'executed', value: 1 },
  { name: 'execution_authorized', value: 1 },
]);

const passReceipt = projectExecutionReceipt(passFacts);
assert.equal(passReceipt.validity, 'VALID');
assert.equal(passReceipt.result, 'PASS');
assert.equal(exitCodeFor(passReceipt), 0);

const failHandoff = handoff();
const failFacts = projectInvokeExecutionFacts(input(
  failHandoff,
  result(failHandoff, {
    status: 'FAIL',
    exitCode: 7,
    reasonCodes: ['EXECUTOR_READ_ONLY_FAIL'],
    stdout: 'irrelevant failure stdout',
    stderr: 'focused failure detail\nsecond line',
  }),
));
assert.equal(failFacts.attentionState, 'COMPLETE');
assert.equal(failFacts.result, 'FAIL');
assert.equal(failFacts.exitCode, 7);
assert.match(failFacts.stderrTail, /second line/);
assert.ok(failFacts.reasonCodes.includes('INVOKE_RESULT_FAIL'));
const failReceipt = projectExecutionReceipt(failFacts);
assert.equal(failReceipt.validity, 'VALID');
assert.equal(failReceipt.result, 'FAIL');
assert.equal(exitCodeFor(failReceipt), 2);

const infraHandoff = handoff();
const infraFacts = projectInvokeExecutionFacts(input(
  infraHandoff,
  result(infraHandoff, {
    status: 'INFRA_ERROR',
    executed: true,
    exitCode: null,
    signal: 'SIGTERM',
    reasonCodes: ['EXECUTOR_INFRA_ERROR'],
    stderr: 'process terminated by runtime',
  }),
));
assert.equal(infraFacts.attentionState, 'BLOCKED');
assert.equal(infraFacts.result, 'BLOCKED');
assert.deepEqual(infraFacts.blockers, ['INVOKE_INFRA_ERROR']);
const infraReceipt = projectExecutionReceipt(infraFacts);
assert.equal(infraReceipt.validity, 'VALID');
assert.equal(infraReceipt.result, 'BLOCKED');
assert.equal(exitCodeFor(infraReceipt), 3);
const blockedHandoff = handoff({
  status: 'HANDOFF_BLOCKED',
  executionAuthorized: false,
  route: null,
  reasonCodes: ['DISPATCH_NOT_HANDOFF_READY'],
  legalNextAction: 'RESOLVE_DISPATCH_BLOCK',
});
const blockedFacts = projectInvokeExecutionFacts(input(
  blockedHandoff,
  result(blockedHandoff, {
    status: 'NOT_EXECUTED',
    executed: false,
    exitCode: null,
    reasonCodes: ['HANDOFF_NOT_EXECUTION_AUTHORIZED', 'DISPATCH_NOT_HANDOFF_READY'],
    stdout: '',
    stderr: '',
  }),
));
assert.equal(blockedFacts.attentionState, 'BLOCKED');
assert.equal(blockedFacts.result, 'BLOCKED');
assert.equal(blockedFacts.counters.find((row) => row.name === 'executed').value, 0);
assert.equal(blockedFacts.counters.find((row) => row.name === 'execution_authorized').value, 0);
assert.ok(blockedFacts.reasonCodes.includes('INVOKE_NOT_EXECUTED'));
const blockedReceipt = projectExecutionReceipt(blockedFacts);
assert.equal(blockedReceipt.validity, 'VALID');
assert.equal(blockedReceipt.result, 'BLOCKED');

const mismatchHandoff = handoff();
const mismatchResult = result(mismatchHandoff, { workId: 'OTHER-WORK' });
const mismatchFacts = projectInvokeExecutionFacts(input(mismatchHandoff, mismatchResult));
assert.equal(mismatchFacts.result, 'CONFLICT');
assert.equal(mismatchFacts.attentionState, 'UNKNOWN');
assert.ok(mismatchFacts.conflicts.includes('INVOKE_WORK_ID_MISMATCH'));
const mismatchReceipt = projectExecutionReceipt(mismatchFacts);
assert.equal(mismatchReceipt.validity, 'VALID');
assert.equal(mismatchReceipt.result, 'CONFLICT');
assert.equal(exitCodeFor(mismatchReceipt), 2);

const authConflictHandoff = handoff({
  status: 'HANDOFF_READY',
  executionAuthorized: false,
});
const authConflictResult = result(authConflictHandoff);
const authConflictFacts = projectInvokeExecutionFacts(input(authConflictHandoff, authConflictResult));
assert.equal(authConflictFacts.result, 'CONFLICT');
assert.ok(authConflictFacts.conflicts.includes('INVOKE_PASS_NOT_AUTHORIZED'));

const tamperedHandoff = handoff();
tamperedHandoff.workId = 'TAMPERED-WITHOUT-REHASH';
assert.throws(
  () => projectInvokeExecutionFacts(input(tamperedHandoff, result(tamperedHandoff))),
  /handoff integrity hash invalid/,
);
const sensitiveHandoff = handoff();
const sensitiveFacts = projectInvokeExecutionFacts(input(
  sensitiveHandoff,
  result(sensitiveHandoff, {
    status: 'FAIL',
    exitCode: 2,
    reasonCodes: ['EXECUTOR_READ_ONLY_FAIL'],
    stderr: 'Authorization: Bearer abcdefghijklmnop',
  }),
));
const sensitiveReceipt = projectExecutionReceipt(sensitiveFacts);
assert.equal(sensitiveReceipt.validity, 'INVALID');
assert.ok(sensitiveReceipt.reasonCodes.includes('INPUT_FIELD_SENSITIVE:stderrTail'));

const longHandoff = handoff();
const longFacts = projectInvokeExecutionFacts(input(
  longHandoff,
  result(longHandoff, {
    status: 'FAIL',
    exitCode: 3,
    reasonCodes: ['EXECUTOR_READ_ONLY_FAIL'],
    stderr: 'λ'.repeat(3000),
  }),
));
assert.ok(Buffer.byteLength(longFacts.stderrTail, 'utf8') <= MAX_STDERR_TAIL_BYTES);
assert.equal(projectExecutionReceipt(longFacts).validity, 'VALID');
assert.ok(Buffer.byteLength(utf8Tail('가'.repeat(1000)), 'utf8') <= MAX_STDERR_TAIL_BYTES);

const unresolvedHandoff = handoff({
  status: 'HANDOFF_BLOCKED',
  adapterId: null,
  executionAuthorized: false,
  route: null,
  reasonCodes: ['HANDOFF_ADAPTER_UNRESOLVED'],
  legalNextAction: 'FIX_ADAPTER_REGISTRY',
});
const unresolvedResult = result(unresolvedHandoff, {
  adapterId: null,
  status: 'NOT_EXECUTED',
  executed: false,
  exitCode: null,
  reasonCodes: ['HANDOFF_NOT_EXECUTION_AUTHORIZED', 'HANDOFF_ADAPTER_UNRESOLVED'],
  stdout: '',
});
const unresolvedFacts = projectInvokeExecutionFacts(input(unresolvedHandoff, unresolvedResult));
assert.deepEqual(unresolvedFacts.requiredUnknowns, ['ADAPTER_ID_UNKNOWN']);
assert.equal(projectExecutionReceipt(unresolvedFacts).result, 'BLOCKED');

assert.throws(
  () => projectInvokeExecutionFacts({ ...input(), unsupported: true }),
  /unsupported field/,
);

const source = fs.readFileSync(
  path.join(root, '.github/plugin-control-plane/canonical-main/work-harness/invoke-execution-receipt.cjs'),
  'utf8',
);
for (const forbidden of [
  'node:child_process',
  'spawnSync',
  'execSync',
  'execFileSync',
  'createGitHubClient',
  'writeFileSync',
  'appendFileSync',
  'workflow_dispatch',
]) {
  assert.ok(!source.includes(forbidden), `invoke receipt adapter must stay pure: ${forbidden}`);
}
assert.match(source, /AUDITED_READ_ONLY_INVOKE/);
assert.match(source, /projectInvokeExecutionFacts/);

console.log('work-harness invoke-execution-receipt-contract: ok');
