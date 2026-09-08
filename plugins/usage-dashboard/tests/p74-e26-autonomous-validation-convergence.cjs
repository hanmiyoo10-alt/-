'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const handoff = require('../tools/release_handoff_e15.cjs');
const e26 = require('../tools/release_validation_convergence_e26.cjs');

const SHA='a'.repeat(40);
const SHA2='b'.repeat(40);
const PR=9912;
const REQUEST=9911;

function comment(body) { return {body}; }
function attempt(attemptNumber, candidateSha=SHA) {
  return comment(e26.formatAttemptReceipt({
    candidateSha,
    prNumber:PR,
    attempt:attemptNumber,
    reason:attemptNumber===1?'first-validation':'retryable-validation-failure',
    retryOf:attemptNumber===2?1:null,
  }));
}
function result({status='GREEN',resultClass='GREEN',attemptNumber=1,reason='exact-registry-green',candidateSha=SHA}={}) {
  return comment([
    'UD_VALIDATION_RESULT',
    `validated_sha: ${candidateSha}`,
    `status: ${status}`,
    `result_class: ${resultClass}`,
    `attempt: ${attemptNumber}`,
    `reason: ${reason}`,
    `request: #${REQUEST}`,
    `pr: #${PR}`,
    'transaction: 123456',
    'authority: E9 exact-SHA full registry',
  ].join('\n'));
}
function classify(comments, overrides={}) {
  return e26.classifyValidationConvergence({
    candidateSha:SHA,
    prNumber:PR,
    handoffOk:true,
    handoffReason:'E15_OK',
    comments,
    ...overrides,
  });
}

const stableBody=handoff.renderStablePrBody({
  version:'3.0.0-alpha.5.999',
  summary:'E26 fixture',
  productVersion:'3.0.0-alpha.5.999',
  engineVersion:'1.9.9',
  managerVersion:'1.3.6',
  snapshotContract:'1',
  recentRequestContract:'1',
  requestNumber:REQUEST,
});
let verdict=e26.evaluateHandoff(stableBody,REQUEST);
assert.deepEqual(verdict,{ok:true,reason:'E15_OK'});
const badBody=`${stableBody}\nCandidate SHA: ${SHA}`;
verdict=e26.evaluateHandoff(badBody,REQUEST);
assert.equal(verdict.ok,false);
assert.equal(verdict.reason,'E15_PR_MUTABLE_SHA_PROSE');

let state=classify([]);
assert.equal(state.action,e26.ACTIONS.DISPATCH_FIRST);
assert.equal(state.nextAttempt,1);

state=classify([attempt(1)]);
assert.equal(state.action,e26.ACTIONS.WAIT_IN_FLIGHT);

state=classify([attempt(1),result()]);
assert.equal(state.action,e26.ACTIONS.CONTINUE_GREEN);
assert.equal(state.validation.status,'GREEN');
assert.equal(state.validation.resultClass,'GREEN');

state=classify([attempt(1),result({status:'RED',resultClass:'RED_LOGICAL',reason:'exact-registry-failed'})]);
assert.equal(state.action,e26.ACTIONS.BLOCK_LOGICAL_RED);

state=classify([attempt(1),result({status:'RED',resultClass:'RED_RETRYABLE',reason:'validation-job-cancelled'})]);
assert.equal(state.action,e26.ACTIONS.RETRY_ONCE);
assert.equal(state.nextAttempt,2);

state=classify([
  attempt(1),
  result({status:'RED',resultClass:'RED_RETRYABLE',reason:'validation-job-cancelled'}),
  attempt(2),
]);
assert.equal(state.action,e26.ACTIONS.WAIT_IN_FLIGHT);

state=classify([
  attempt(1),
  result({status:'RED',resultClass:'RED_RETRYABLE',reason:'validation-job-cancelled'}),
  attempt(2),
  result({status:'GREEN',resultClass:'GREEN',attemptNumber:2,reason:'exact-registry-green'}),
]);
assert.equal(state.action,e26.ACTIONS.CONTINUE_GREEN);
assert.equal(state.validation.attempt,2);

state=classify([
  attempt(1),
  result({status:'RED',resultClass:'RED_RETRYABLE',reason:'validation-job-cancelled'}),
  attempt(2),
  result({status:'RED',resultClass:'RED_RETRYABLE',attemptNumber:2,reason:'validation-job-cancelled'}),
]);
assert.equal(state.action,e26.ACTIONS.BLOCK_RETRY_EXHAUSTED);
assert.equal(state.nextAttempt,null);

state=classify([attempt(1),result({status:'RED',resultClass:'RED_AMBIGUOUS',reason:'validation-outcome-ambiguous'})]);
assert.equal(state.action,e26.ACTIONS.BLOCK_AMBIGUOUS);

state=e26.classifyValidationConvergence({candidateSha:SHA,prNumber:PR,handoffOk:false,handoffReason:'E15_PR_MUTABLE_SHA_PROSE',comments:[]});
assert.equal(state.action,e26.ACTIONS.BLOCK_HANDOFF);
assert.equal(state.reason,'E15_PR_MUTABLE_SHA_PROSE');

const legacyDispatch=comment(`UD_E9_VALIDATION_DISPATCHED:${SHA}`);
state=classify([legacyDispatch]);
assert.equal(state.action,e26.ACTIONS.WAIT_IN_FLIGHT);
assert.equal(state.reason,'E26_LEGACY_VALIDATION_IN_FLIGHT');

const legacyGreen=comment([
  'UD_VALIDATION_RESULT',
  `validated_sha: ${SHA}`,
  'status: GREEN',
  `request: #${REQUEST}`,
  `pr: #${PR}`,
  'transaction: 42',
  'authority: E9 exact-SHA full registry',
].join('\n'));
state=classify([legacyGreen]);
assert.equal(state.action,e26.ACTIONS.CONTINUE_GREEN);
assert.equal(state.validation.legacy,true);

const legacyRed=comment([
  'UD_VALIDATION_RESULT',
  `validated_sha: ${SHA}`,
  'status: RED',
  `request: #${REQUEST}`,
  `pr: #${PR}`,
  'transaction: 43',
  'authority: E9 exact-SHA full registry',
].join('\n'));
state=classify([legacyRed]);
assert.equal(state.action,e26.ACTIONS.BLOCK_LOGICAL_RED);
assert.equal(state.validation.legacy,true);

state=e26.classifyValidationConvergence({candidateSha:SHA2,prNumber:PR,handoffOk:true,handoffReason:'E15_OK',comments:[attempt(1),result()]});
assert.equal(state.action,e26.ACTIONS.DISPATCH_FIRST,'new candidate SHA must reset validation attempt to 1');
assert.equal(state.nextAttempt,1);

const duplicateAttempt=[attempt(1),attempt(1)];
state=classify(duplicateAttempt);
assert.equal(state.action,e26.ACTIONS.BLOCK_AMBIGUOUS);

assert.deepEqual(e26.classifyWorkflowOutcome('success'),{status:'GREEN',resultClass:'GREEN',reason:'exact-registry-green'});
assert.deepEqual(e26.classifyWorkflowOutcome('failure'),{status:'RED',resultClass:'RED_LOGICAL',reason:'exact-registry-failed'});
assert.deepEqual(e26.classifyWorkflowOutcome('cancelled'),{status:'RED',resultClass:'RED_RETRYABLE',reason:'validation-job-cancelled'});
assert.deepEqual(e26.classifyWorkflowOutcome('skipped'),{status:'RED',resultClass:'RED_AMBIGUOUS',reason:'validation-outcome-ambiguous'});

const firstReceipt=e26.formatAttemptReceipt({candidateSha:SHA,prNumber:PR,attempt:1,reason:'first-validation'});
assert.match(firstReceipt,/^UD_E9_VALIDATION_ATTEMPT_V2$/m);
assert.match(firstReceipt,/^attempt: 1$/m);
assert.match(firstReceipt,new RegExp(`^UD_E9_VALIDATION_DISPATCHED:${SHA}$`,'m'));
const retryReceipt=e26.formatAttemptReceipt({candidateSha:SHA,prNumber:PR,attempt:2,reason:'retryable-validation-failure',retryOf:1});
assert.match(retryReceipt,/^attempt: 2$/m);
assert.match(retryReceipt,/^retry_of: 1$/m);
assert.throws(()=>e26.formatAttemptReceipt({candidateSha:SHA,prNumber:PR,attempt:2,reason:'retryable-validation-failure',retryOf:2}),/E26_RETRY_CONTRACT_INVALID/);

const reducer=fs.readFileSync('.github/workflows/usage-dashboard-e9-release-reconcile.yml','utf8');
for(const required of [
  'types: [opened, edited, synchronize, reopened, closed]',
  '"Usage Dashboard E9 Exact-SHA Validation"',
  'release_validation_convergence_e26.cjs',
  '--handoff-file',
  '--classify-file',
  '--format-attempt',
  'UD_E26_HANDOFF_BLOCKED:',
  'UD_E26_VALIDATION_RETRY_EXHAUSTED:',
  'validation_attempt:$attempt',
  'DISPATCH_FIRST|RETRY_ONCE',
  'CONTINUE_GREEN',
  "schedule:\n    - cron: '*/5 * * * *'",
]) assert.ok(reducer.includes(required),required);
assert.ok(reducer.indexOf('--handoff-file') < reducer.indexOf('usage-dashboard-e9-validate.yml/dispatches'),'E15 preflight must happen before E9 dispatch');
assert.equal(reducer.includes('pull-requests: write'),false,'E26 must not broaden reducer PR write authority');
assert.equal(reducer.includes('release_generation: E26'),false,'E26 must remain outside durable release-generation matcher');
assert.equal(reducer.includes('gh pr create'),false);
assert.equal(reducer.includes('auto-merge'),false);

const validator=fs.readFileSync('.github/workflows/usage-dashboard-e9-validate.yml','utf8');
for(const required of [
  'validation_attempt:',
  'RAW_VALIDATION_ATTEMPT',
  '--classify-workflow-outcome',
  'result_class: $RESULT_CLASS',
  'attempt: $VALIDATION_ATTEMPT',
  'reason: $RESULT_REASON',
  "handoff.validateStablePrBody(pr.body||'',Number(requestNumber))",
]) assert.ok(validator.includes(required),required);
assert.ok(validator.includes("RED_RETRYABLE) NEXT='durable reducer may dispatch one bounded same-candidate retry if attempt budget remains'"));
assert.ok(validator.includes("[[ \"$STATUS\" == 'GREEN' ]]"));

const helperSource=fs.readFileSync('plugins/usage-dashboard/tools/release_validation_convergence_e26.cjs','utf8');
for(const forbidden of [
  "require('node:http')",
  "require('node:https')",
  'GITHUB_TOKEN',
  'Authorization:',
  'api.github.com',
  'merge_pull_request',
  'process.env',
]) assert.equal(helperSource.includes(forbidden),false,forbidden);

const requestSource=fs.readFileSync('plugins/usage-dashboard/tools/release_request_e9.cjs','utf8');
assert.match(requestSource,/DURABLE_TRANSACTION_GENERATION_RE = \/\^\(E9\|E10\|E11\|E12\|E13\)\$\//,'E26 must not extend durable release_generation');
assert.equal(requestSource.includes('E26|'),false);

const e11=fs.readFileSync('plugins/usage-dashboard/tools/merge_guard_e11.cjs','utf8');
assert.ok(e11.includes('MERGE_READY_NO_DRIFT'),'E11 no-drift authority remains present');
const e16=fs.readFileSync('plugins/usage-dashboard/tools/release_merge_capsule_e16.cjs','utf8');
assert.ok(e16.includes("require('./release_handoff_e15.cjs')"),'E16 remains derived from existing authority chain');

console.log('usage-dashboard P74 E26 autonomous validation convergence: OK');
