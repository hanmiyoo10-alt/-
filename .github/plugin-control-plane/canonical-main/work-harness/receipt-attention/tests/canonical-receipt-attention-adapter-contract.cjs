'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const stageReceipt = require('../../stage-receipt.cjs');
const executionReceipt = require('../../execution-receipt.cjs');
const agentDecisionView = require('../../agent-decision-view.cjs');
const {
  ADAPTER_LOCATOR,
  DEFAULT_DEPS,
  projectCanonicalReceiptAttention,
} = require('../canonical-receipt-attention-adapter.cjs');

const MAIN = '4fbe96298e2e6e6dc6c8da3d1ca8e201071453e5';
const DIFF = 'a'.repeat(64);
const LOCATOR = 'receipt:fixture:canonical-stage-v1';

function facts(stage = 'VALIDATION_MERGE') {
  return {
    schemaVersion: 1,
    packetNumber: 2948,
    stage,
    authorityRefs: [
      {kind: 'COMMIT', locator: 'candidate-head', identity: MAIN},
      {kind: 'ISSUE', locator: 'issue:#2948', identity: 'state:IN_PROGRESS'},
    ],
    requiredGates: [
      {name: 'Required', result: 'PASS', evidenceLocator: 'run:36117294474'},
      {name: 'focused-contract', result: 'PASS', evidenceLocator: 'local:receipt-attention-contract'},
    ],
    scope: {
      paths: [
        '.github/plugin-control-plane/canonical-main/work-harness/receipt-attention/README.md',
        '.github/plugin-control-plane/canonical-main/work-harness/receipt-attention/canonical-receipt-attention-adapter.cjs',
        '.github/plugin-control-plane/canonical-main/work-harness/receipt-attention/tests/canonical-receipt-attention-adapter-contract.cjs',
      ],
      diffRequired: true,
      diffIdentity: DIFF,
      diffEvidenceLocator: 'git-diff:fixture',
    },
    proof: [
      {term: 'IMPLEMENTED', evidenceLocator: 'commit:' + MAIN},
      {term: 'CONTRACT_PROVEN', evidenceLocator: 'local:receipt-attention-contract'},
    ],
    requiredUnknowns: [],
    conflicts: [],
    blockers: [],
    dependencies: [],
    nextLegalAction: 'POSTMERGE_CONVERGENCE',
  };
}

function rendered(input = facts()) {
  return stageReceipt.renderStageReceipt(stageReceipt.projectStageReceipt(input));
}

function project(receiptText, expectedStage = 'VALIDATION_MERGE', receiptLocator = LOCATOR) {
  return projectCanonicalReceiptAttention({receiptText, expectedStage, receiptLocator});
}

assert.equal(DEFAULT_DEPS.stageReceipt, stageReceipt);
assert.equal(DEFAULT_DEPS.executionReceipt, executionReceipt);
assert.equal(DEFAULT_DEPS.agentDecisionView, agentDecisionView);

const clean = project(rendered());
assert.equal(clean.receipt.schemaVersion, 2);
assert.equal(clean.receipt.mode, 'REPOSITORY_EXECUTION_RECEIPT');
assert.equal(clean.receipt.validity, 'VALID');
assert.equal(clean.receipt.executionLifecycle, 'FINISHED');
assert.equal(clean.receipt.attentionDisposition, 'COMPLETE');
assert.equal(clean.receipt.result, 'PASS');
assert.equal(clean.receipt.stage, 'VALIDATION_MERGE');
assert.equal(clean.receipt.nextLegalAction, 'POSTMERGE_CONVERGENCE');
assert.equal(clean.receipt.sourceIdentity.locator, LOCATOR);
assert.match(clean.receipt.sourceIdentity.identity, /^[0-9a-f]{64}$/);
assert.equal(clean.receipt.mutationAuthorized, false);
assert.equal(clean.receipt.executionAuthorized, false);
assert.equal(clean.receipt.mergeAuthorized, false);
assert.equal(clean.receipt.releaseAuthorized, false);
assert.equal(clean.receipt.productionAuthorized, false);
assert.equal(clean.receipt.runtimeAuthorityGranted, false);
assert.equal(clean.receipt.securityAuthorityGranted, false);
assert.equal(clean.view.validity, 'VALID');
assert.equal(clean.view.attentionCount, 0);
assert.equal(clean.view.shown, 0);
assert.equal(clean.view.truncated, false);
assert.equal(clean.view.nextLegalAction, 'POSTMERGE_CONVERGENCE');
assert.equal(clean.view.output.sourceStatus, 'PASS');
assert.equal(clean.view.output.sourceStage, 'VALIDATION_MERGE');
assert.equal(clean.view.output.expectedStage, 'VALIDATION_MERGE');
assert.match(clean.view.output.canonicalReceiptDigest, /^[0-9a-f]{64}$/);
assert.equal(clean.receipt.counters.find((row) => row.name === 'targeted_drilldowns').value, 0);
assert.equal(clean.receipt.counters.find((row) => row.name === 'raw_receipt_exposed').value, 0);
assert.equal(clean.receipt.counters.find((row) => row.name === 'effects_performed').value, 0);

const mismatch = project(rendered(), 'IMPLEMENTATION_PR');
assert.equal(mismatch.receipt.result, 'CONFLICT');
assert.equal(mismatch.receipt.attentionDisposition, 'CONFLICT');
assert.ok(mismatch.receipt.conflicts.some((row) => row.startsWith('RECEIPT_EXPECTED_STAGE_CONFLICT:')));
assert.equal(mismatch.view.attentionCount, 1);
assert.equal(mismatch.view.attention[0].constraint, 'RECEIPT_ATTENTION_ADAPTER');
assert.equal(mismatch.view.attention[0].locator, LOCATOR);
assert.equal(mismatch.view.nextLegalAction, 'TARGETED_RECEIPT_DRILLDOWN');

const failFacts = facts();
failFacts.requiredGates[0] = {
  name: 'Required', result: 'FAIL', evidenceLocator: 'run:failed',
};
const failed = project(rendered(failFacts));
assert.equal(failed.receipt.result, 'FAIL');
assert.equal(failed.receipt.attentionDisposition, 'NEEDS_REVIEW');
assert.equal(failed.view.attentionCount, 1);
assert.equal(failed.view.attention[0].severity, 'FAIL');
assert.equal(failed.view.output.sourceStatus, 'FAIL');

const blockedFacts = facts();
blockedFacts.blockers = ['MERGE_EFFECT_NOT_AUTHORIZED'];
const blocked = project(rendered(blockedFacts));
assert.equal(blocked.receipt.result, 'BLOCKED');
assert.equal(blocked.receipt.attentionDisposition, 'BLOCKED');
assert.equal(blocked.view.attentionCount, 1);
assert.equal(blocked.view.attention[0].severity, 'BLOCKER');

const unknownFacts = facts();
unknownFacts.requiredUnknowns = ['CURRENTNESS_UNKNOWN'];
const unknown = project(rendered(unknownFacts));
assert.equal(unknown.receipt.result, 'UNKNOWN');
assert.equal(unknown.receipt.attentionDisposition, 'UNKNOWN');
assert.ok(unknown.receipt.requiredUnknowns.includes('CURRENTNESS_UNKNOWN'));
assert.equal(unknown.view.attentionCount, 1);
assert.equal(unknown.view.attention[0].severity, 'UNKNOWN');

const conflictFacts = facts();
conflictFacts.conflicts = ['MERGE_IDENTITY_CONFLICT'];
const conflict = project(rendered(conflictFacts));
assert.equal(conflict.receipt.result, 'CONFLICT');
assert.equal(conflict.receipt.attentionDisposition, 'CONFLICT');
assert.ok(conflict.receipt.conflicts.includes('MERGE_IDENTITY_CONFLICT'));
assert.equal(conflict.view.attentionCount, 1);
assert.equal(conflict.view.attention[0].severity, 'CONFLICT');

const canonicalText = rendered();
const tamperedDigest = canonicalText.replace(
  /canonical-main-stage-receipt:v1 digest=[0-9a-f]{64}/,
  'canonical-main-stage-receipt:v1 digest=' + 'b'.repeat(64),
);
const digestConflict = project(tamperedDigest);
assert.equal(digestConflict.receipt.result, 'CONFLICT');
assert.ok(digestConflict.receipt.conflicts.includes('STAGE_RECEIPT_DIGEST_CONFLICT'));
assert.equal(digestConflict.view.attentionCount, 1);
assert.equal(digestConflict.view.attention[0].locator, LOCATOR);

const malformed = project(canonicalText.replace('- packet: #2948', '- packet: nope'));
assert.equal(malformed.receipt.result, 'UNKNOWN');
assert.ok(malformed.receipt.requiredUnknowns.includes('STAGE_RECEIPT_FORMAT_INVALID'));
assert.equal(malformed.view.attentionCount, 1);

const unsupported = project(canonicalText.replace(
  'canonical-main-stage-receipt:v1',
  'canonical-main-stage-receipt:v2',
));
assert.equal(unsupported.receipt.result, 'UNKNOWN');
assert.ok(unsupported.receipt.requiredUnknowns.includes('STAGE_RECEIPT_MARKER_MISSING'));
assert.equal(unsupported.view.attentionCount, 1);

const duplicate = project(canonicalText + '\n' + canonicalText);
assert.equal(duplicate.receipt.result, 'CONFLICT');
assert.ok(duplicate.receipt.conflicts.includes('STAGE_RECEIPT_MARKER_DUPLICATE'));
assert.equal(duplicate.view.attentionCount, 1);

const badInput = projectCanonicalReceiptAttention({
  receiptText: canonicalText,
  expectedStage: 'NOT_A_STAGE',
  receiptLocator: LOCATOR,
});
assert.equal(badInput.receipt.result, 'UNKNOWN');
assert.ok(badInput.receipt.requiredUnknowns.includes('EXPECTED_STAGE_UNSUPPORTED'));
assert.equal(badInput.view.attentionCount, 1);
assert.equal(badInput.view.phase, 'UNKNOWN');

const extraInput = projectCanonicalReceiptAttention({
  receiptText: canonicalText,
  expectedStage: 'VALIDATION_MERGE',
  receiptLocator: LOCATOR,
  parser: 'caller-selected',
});
assert.equal(extraInput.receipt.result, 'UNKNOWN');
assert.ok(extraInput.receipt.requiredUnknowns.includes('INPUT_FIELD_UNSUPPORTED:parser'));

const sensitiveLocator = projectCanonicalReceiptAttention({
  receiptText: canonicalText,
  expectedStage: 'VALIDATION_MERGE',
  receiptLocator: 'token=do-not-echo-secret-value',
});
assert.equal(sensitiveLocator.receipt.result, 'UNKNOWN');
assert.ok(sensitiveLocator.receipt.requiredUnknowns.includes('RECEIPT_LOCATOR_INVALID'));
assert.doesNotMatch(JSON.stringify(sensitiveLocator), /do-not-echo-secret-value/);
assert.equal(sensitiveLocator.view.reportLocator, ADAPTER_LOCATOR);

const root = path.resolve(__dirname, '../../../../../..');
const sourcePath = path.join(
  root,
  '.github/plugin-control-plane/canonical-main/work-harness/receipt-attention/canonical-receipt-attention-adapter.cjs',
);
const source = fs.readFileSync(sourcePath, 'utf8');
assert.match(source, /parseRenderedStageReceipt/);
assert.match(source, /projectExecutionReceipt/);
assert.match(source, /projectAgentDecisionView/);
assert.doesNotMatch(source, /require\(['"]node:fs['"]\)/);
assert.doesNotMatch(source, /require\(['"]node:path['"]\)/);
assert.doesNotMatch(source, /child_process|createGitHubClient|\bfetch\s*\(|gh api|readFileSync|writeFileSync|appendFileSync/);
assert.doesNotMatch(source, /process\.argv|--input-file|--parser|--schema|--projector|--command/);

console.log('canonical receipt attention adapter contract: 12/12 PASS');
