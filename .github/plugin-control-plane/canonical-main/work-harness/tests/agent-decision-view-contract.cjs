'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../../../../..');
const view = require('../agent-decision-view.cjs');
const receiptProjector = require('../execution-receipt.cjs');

function receipt(overrides = {}) {
  return receiptProjector.projectExecutionReceipt({
    schemaVersion: 2,
    operationId: 'fixture:agent-view',
    primitiveId: 'fixture:owner',
    sourceIdentity: {
      kind: 'repository-file',
      locator: 'path:fixture-owner.cjs',
      identity: 'sha256:' + 'a'.repeat(64),
    },
    executionSurface: 'FIXTURE',
    stage: 'IMPLEMENTATION_EFFECT',
    executionLifecycle: 'FINISHED',
    attentionDisposition: 'COMPLETE',
    result: 'PASS',
    proofScope: 'fixture proof',
    steps: [
      {name: 'prepare', result: 'PASS', evidenceLocator: 'artifact:fixture#prepare'},
      {name: 'commit', result: 'PASS', evidenceLocator: 'artifact:fixture#commit'},
      {name: 'push', result: 'PASS', evidenceLocator: 'artifact:fixture#push'},
      {name: 'optional', result: 'SKIPPED', evidenceLocator: 'UNKNOWN'},
    ],
    counters: [{name: 'files', value: 2}],
    affectedFiles: ['a.txt', 'b.txt'],
    artifactLocators: ['artifact:fixture'],
    reasonCodes: [],
    requiredUnknowns: [],
    conflicts: [],
    blockers: [],
    exitCode: 0,
    stderrTail: null,
    nextLegalAction: 'NEXT_REVIEWED_ACTION',
    ...overrides,
  });
}
function input(overrides = {}) {
  return {
    receipt: receipt(),
    phase: 'IMPLEMENTATION_EFFECT',
    output: {
      owner: 'fixture-owner',
      filesChanged: 2,
      commitCreated: true,
      remoteHeadExact: true,
      pr: null,
    },
    attention: [],
    receiptLocator: 'local-artifact:fixture/receipt.json#sha256=' + 'b'.repeat(64),
    reportLocator: 'local-artifact:fixture/report.json#sha256=' + 'c'.repeat(64),
    ...overrides,
  };
}
test('PASS v2 receipt projects bounded complete decision view', () => {
  const projected = view.projectAgentDecisionView(input());
  assert.equal(projected.validity, 'VALID');
  assert.equal(projected.mode, 'REPOSITORY_AGENT_DECISION_VIEW');
  assert.equal(projected.executionLifecycle, 'FINISHED');
  assert.equal(projected.attentionDisposition, 'COMPLETE');
  assert.equal(projected.result, 'PASS');
  assert.equal(projected.summary.PASS, 3);
  assert.equal(projected.summary.NOT_RUN, 1);
  assert.equal(projected.attentionCount, 0);
  assert.equal(projected.shown, 0);
  assert.equal(projected.truncated, false);
  assert.equal(projected.criticalTruncated, false);
  assert.equal(projected.output.filesChanged, 2);
  assert.equal(projected.nextLegalAction, 'NEXT_REVIEWED_ACTION');
  assert.equal(projected.receiptDigest, input().receipt.receiptDigest);
  assert.match(projected.viewDigest, /^[0-9a-f]{64}$/);
  assert.equal(view.exitCodeFor(projected), 0);
});

test('legacy v1 receipt is never silently upgraded', () => {
  const legacy = receiptProjector.projectExecutionReceipt({
    schemaVersion: 1,
    operationId: 'legacy',
    primitiveId: 'legacy-owner',
    sourceIdentity: {kind: 'x', locator: 'x', identity: 'x'},
    executionSurface: 'FIXTURE',
    stage: 'IMPLEMENTATION_EFFECT',
    attentionState: 'COMPLETE',
    result: 'PASS',
    proofScope: 'legacy',
    steps: [{name: 'x', result: 'PASS', evidenceLocator: 'artifact:x'}],
    counters: [],
    affectedFiles: [],
    artifactLocators: ['artifact:x'],
    reasonCodes: [],
    requiredUnknowns: [],
    conflicts: [],
    blockers: [],
    exitCode: 0,
    stderrTail: null,
    nextLegalAction: 'NEXT',
  });
  const projected = view.projectAgentDecisionView(input({receipt: legacy}));
  assert.equal(projected.validity, 'INVALID');
  assert.equal(projected.result, 'UNKNOWN');
  assert(projected.reasonCodes.includes('RECEIPT_V2_VALID_REQUIRED'));
});

test('forged canonical receipt fails closed', () => {
  const forged = receipt();
  forged.nextLegalAction = 'FORGED_ACTION';
  const projected = view.projectAgentDecisionView(input({receipt: forged}));
  assert.equal(projected.validity, 'INVALID');
  assert(projected.reasonCodes.includes('RECEIPT_CANONICAL_IDENTITY_CONFLICT'));
});
test('non-PASS without owner attention gets one deterministic fallback', () => {
  const blocked = receipt({
    attentionDisposition: 'BLOCKED',
    result: 'BLOCKED',
    reasonCodes: ['CAPABILITY_UNAVAILABLE'],
    blockers: ['CAPABILITY_UNAVAILABLE'],
    exitCode: null,
  });
  const projected = view.projectAgentDecisionView(input({receipt: blocked}));
  assert.equal(projected.validity, 'VALID');
  assert.equal(projected.attentionDisposition, 'BLOCKED');
  assert.equal(projected.result, 'BLOCKED');
  assert.equal(projected.attentionCount, 1);
  assert.equal(projected.attention[0].severity, 'BLOCKER');
  assert.equal(projected.attention[0].reasonCode, 'CAPABILITY_UNAVAILABLE');
  assert.equal(projected.attention[0].nextPhase, 'NEEDS_SEMANTIC_DECISION');
  assert.equal(view.exitCodeFor(projected), 3);
});

test('attention is priority ordered, bounded to five, and critical truncation explicit', () => {
  const conflicted = receipt({
    attentionDisposition: 'CONFLICT',
    result: 'CONFLICT',
    reasonCodes: ['CONFLICT_PRESENT'],
    conflicts: ['CONFLICT_PRESENT'],
    exitCode: 2,
  });
  const severities = ['WARN', 'FAIL', 'BLOCKER', 'UNKNOWN', 'CONFLICT', 'FAIL', 'UNKNOWN'];
  const attention = severities.map((severity, index) => ({
    subject: 'subject-' + index,
    reasonCode: 'REASON_' + index,
    severity,
    constraint: 'FIXTURE_CONSTRAINT',
    nextPhase: 'NEEDS_SEMANTIC_DECISION',
    locator: 'artifact:fixture#' + index,
  }));
  const projected = view.projectAgentDecisionView(input({receipt: conflicted, attention}));
  assert.equal(projected.validity, 'VALID');
  assert.equal(projected.shown, 5);
  assert.equal(projected.attentionCount, 7);
  assert.equal(projected.truncated, true);
  assert.equal(projected.criticalTruncated, true);
  assert.equal(projected.attention[0].severity, 'CONFLICT');
  assert.equal(view.exitCodeFor(projected), 2);
});

test('PASS COMPLETE cannot hide contradictory attention', () => {
  const attention = [{
    subject: 'fixture',
    reasonCode: 'SHOULD_NOT_EXIST',
    severity: 'WARN',
    constraint: 'NONE',
    nextPhase: 'NONE',
    locator: 'artifact:fixture#warn',
  }];
  const projected = view.projectAgentDecisionView(input({attention}));
  assert.equal(projected.validity, 'INVALID');
  assert(projected.reasonCodes.includes('PASS_COMPLETE_ATTENTION_CONFLICT'));
});
test('owner output rejects sensitive, nested, oversized and control values', () => {
  for (const bad of [
    {token: 'token=secret-value'},
    {nested: {bad: true}},
    {huge: 'x'.repeat(300)},
    {control: 'bad\u0001value'},
  ]) {
    const projected = view.projectAgentDecisionView(input({output: bad}));
    assert.equal(projected.validity, 'INVALID');
    assert.equal(projected.result, 'UNKNOWN');
  }
});

test('unsupported top-level fields and missing locators fail closed', () => {
  const extra = view.projectAgentDecisionView({...input(), command: 'git status'});
  assert.equal(extra.validity, 'INVALID');
  assert(extra.reasonCodes.some((code) => code.includes('INPUT_FIELD_UNSUPPORTED')));

  const missing = input();
  delete missing.reportLocator;
  const projected = view.projectAgentDecisionView(missing);
  assert.equal(projected.validity, 'INVALID');
  assert(projected.reasonCodes.some((code) => code.includes('INPUT_FIELD_MISSING')));
});

test('canonical axes and next action are copied rather than inferred', () => {
  const review = receipt({
    attentionDisposition: 'NEEDS_REVIEW',
    result: 'PARTIAL',
    reasonCodes: ['SEMANTIC_REVIEW_REQUIRED'],
    nextLegalAction: 'OWNER_SPECIFIC_REVIEW',
    exitCode: null,
  });
  const projected = view.projectAgentDecisionView(input({receipt: review}));
  assert.equal(projected.executionLifecycle, review.executionLifecycle);
  assert.equal(projected.attentionDisposition, review.attentionDisposition);
  assert.equal(projected.result, review.result);
  assert.equal(projected.nextLegalAction, 'OWNER_SPECIFIC_REVIEW');
  assert.equal(projected.attention[0].nextPhase, 'NEEDS_SEMANTIC_DECISION');
});

test('projector source is pure and has no execution/network authority surface', () => {
  const source = fs.readFileSync(
    path.join(ROOT, '.github/plugin-control-plane/canonical-main/work-harness/agent-decision-view.cjs'),
    'utf8',
  );
  assert(!source.includes('child_process'));
  assert(!source.includes('fetch('));
  assert(!source.includes('gh api'));
  assert(!source.includes('https://api.github.com'));
  assert(!source.includes('spawn'));
  assert(!source.includes('execFile'));
  assert(source.includes('MAX_SHOWN = 5'));
  assert(source.includes('REPOSITORY_AGENT_DECISION_VIEW'));
});
