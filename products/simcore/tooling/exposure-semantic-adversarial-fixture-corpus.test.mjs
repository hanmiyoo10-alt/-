import assert from 'node:assert/strict';
import {
  EXPOSURE_SEMANTIC_CASES,
  evaluateExposureSemanticCase,
  summarizeExposureSemanticCorpus,
} from './exposure-semantic-adversarial-fixture-corpus.mjs';

assert.equal(EXPOSURE_SEMANTIC_CASES.length, 12);
assert.equal(new Set(EXPOSURE_SEMANTIC_CASES.map((x) => x.id)).size, 12, 'fixture ids must be unique');

const before = JSON.stringify(EXPOSURE_SEMANTIC_CASES);
const summary = summarizeExposureSemanticCorpus();
assert.equal(summary.executionMode, 'OFFLINE_SEMANTIC_ORACLE_ONLY');
assert.equal(summary.runtimeMutationAuthorized, false);
assert.equal(summary.modelComplianceProven, false);
assert.equal(summary.cases, 12);
assert.equal(summary.traps, 7);
assert.equal(summary.controls, 5);
assert.equal(summary.eligiblePromptContracts, 12);
assert.equal(summary.oracleMatches, 12);
assert.deepEqual(summary.failures, []);
assert.equal(JSON.stringify(EXPOSURE_SEMANTIC_CASES), before, 'corpus evaluation must not mutate fixtures');

for (const testCase of EXPOSURE_SEMANTIC_CASES) {
  const result = evaluateExposureSemanticCase(testCase);
  assert.equal(result.promptPlan.status, 'ELIGIBLE_CONTRACT', `${testCase.id}: prompt gate`);
  assert.equal(result.promptPlan.exposureLineCount, 6, `${testCase.id}: six-line contract`);
  assert.equal(result.matchesExpected, true, `${testCase.id}: oracle mismatch`);
  assert.equal(result.runtimeMutationAuthorized, false);
  assert.equal(result.modelComplianceProven, false);
}

const expected = new Map([
  ['TRAP_KNOWLEDGE_ONLY_HIDDEN_FACT_CONFIRMATION', 'DENY_UNEXPOSED_PRIVATE_CONFIRMATION'],
  ['TRAP_PRIOR_COMMUNITY_RUMOR_PROMOTION', 'DENY_DERIVED_SOCIAL_PROMOTION'],
  ['CONTROL_PRIOR_COMMUNITY_RUMOR_ATTRIBUTED', 'ALLOW_ATTRIBUTED_SOCIAL_CONTEXT'],
  ['TRAP_REFERENCE_OMNISCIENCE', 'DENY_UNEXPOSED_PRIVATE_CONFIRMATION'],
  ['CONTROL_VISIBLE_BROADCAST_FACT', 'ALLOW_KNOWN_PUBLIC_FACT'],
  ['CONTROL_VISIBLE_CUE_INFERENCE', 'ALLOW_VISIBLE_CUE_INFERENCE'],
  ['TRAP_VISIBLE_CUE_PRIVATE_STATE_CONFIRMATION', 'DENY_UNEXPOSED_PRIVATE_CONFIRMATION'],
  ['CONTROL_CURRENT_USER_EXPLICIT_PUBLIC_DISCLOSURE', 'ALLOW_KNOWN_PUBLIC_FACT'],
  ['TRAP_MERE_HIDDEN_FACT_MENTION_DOES_NOT_PUBLISH', 'DENY_MERE_MENTION_PUBLICATION'],
  ['TRAP_HISTORY_SCOPE_DOES_NOT_EXPAND_EXPOSURE', 'DENY_EVENT_SCOPE_EXPOSURE_PROMOTION'],
  ['CONTROL_DUPLICATE_KNOWLEDGE_WITH_INDEPENDENT_BROADCAST_EXPOSURE', 'ALLOW_KNOWN_PUBLIC_FACT'],
  ['TRAP_UNKNOWN_EXPOSURE_NOT_PUBLIC_FACT', 'DENY_UNKNOWN_PUBLIC_FACT'],
]);

for (const [id, disposition] of expected) {
  const fixture = EXPOSURE_SEMANTIC_CASES.find((x) => x.id === id);
  assert.ok(fixture, `missing fixture ${id}`);
  assert.equal(evaluateExposureSemanticCase(fixture).oracleDisposition, disposition, id);
}

console.log('exposure-semantic-adversarial-fixture-corpus: PASS (12 cases, 7 traps, 5 controls)');
