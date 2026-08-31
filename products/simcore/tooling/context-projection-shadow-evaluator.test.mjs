import assert from 'node:assert/strict';
import {
  evaluateRootPrefixCutShadow,
  materializeHypotheticalProjection,
} from './context-projection-shadow-evaluator.mjs';

function baseFixture(overrides = {}) {
  return {
    mode: 'C',
    sourceAnchoredShortC: true,
    evidenceDisposition: 'DUAL',
    rootIndex: 5,
    sourceIndex: 6,
    currentUserIndex: 8,
    messages: [
      { role: 'system', content: 'host-system' },
      { role: 'user', content: 'old-user' },
      { role: 'assistant', content: 'old-assistant' },
      { role: 'tool', content: 'host-tool' },
      { role: 'mystery', content: 'unknown-keep' },
      { role: 'user', content: '<CURRENT_ROOT_EVIDENCE>root</CURRENT_ROOT_EVIDENCE>' },
      { role: 'assistant', content: '<CURRENT_SOURCE_EVIDENCE>source</CURRENT_SOURCE_EVIDENCE>' },
      { role: 'assistant', content: 'same-lineage-followup' },
      { role: 'user', content: 'current-user' },
      { role: 'system', content: 'simcore-runtime-tail' },
    ],
    ...overrides,
  };
}

{
  const fixture = baseFixture();
  const before = JSON.stringify(fixture);
  const plan = evaluateRootPrefixCutShadow(fixture);
  assert.equal(plan.status, 'ELIGIBLE_SHADOW_PLAN');
  assert.equal(plan.applied, false);
  assert.equal(plan.activeProjectionAuthorized, false);
  assert.deepEqual(plan.candidateExcludedIndices, [1, 2]);
  assert.deepEqual(plan.keptIndices, [0, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(plan.unknownKeptCount, 1);
  assert.equal(plan.projectedMessages, 8);
  assert.equal(plan.candidateExcludedContentChars, 'old-user'.length + 'old-assistant'.length);
  assert.equal(plan.projectedContentChars, plan.originalContentChars - plan.candidateExcludedContentChars);
  assert.ok(plan.contentReductionRatio > 0 && plan.contentReductionRatio < 1);
  assert.equal(plan.semanticSafety, 'UNPROVEN_REVIEW_REQUIRED');
  assert.equal(JSON.stringify(fixture), before, 'shadow planner must not mutate fixture/request');
  assert.deepEqual(materializeHypotheticalProjection(fixture, plan), [
    fixture.messages[0], fixture.messages[3], fixture.messages[4], fixture.messages[5],
    fixture.messages[6], fixture.messages[7], fixture.messages[8], fixture.messages[9],
  ]);
}

{
  const fixture = baseFixture({
    rootIndex: 1,
    sourceIndex: 2,
    currentUserIndex: 3,
    messages: [
      { role: 'system', content: 'system-before-root' },
      { role: 'user', content: 'root' },
      { role: 'assistant', content: 'source' },
      { role: 'user', content: 'current' },
      { role: 'system', content: 'runtime-tail' },
    ],
  });
  const plan = evaluateRootPrefixCutShadow(fixture);
  assert.equal(plan.status, 'ELIGIBLE_NO_REDUCTION');
  assert.deepEqual(plan.candidateExcludedIndices, []);
  assert.deepEqual(plan.keptIndices, [0, 1, 2, 3, 4]);
}

{
  const plan = evaluateRootPrefixCutShadow(baseFixture({ evidenceDisposition: 'ROOT_ONLY' }));
  assert.equal(plan.status, 'INELIGIBLE');
  assert.equal(plan.reason, 'EVIDENCE_NOT_DUAL');
  assert.equal(plan.candidateExcludedMessages, 0);
}

{
  const plan = evaluateRootPrefixCutShadow(baseFixture({ mode: 'A' }));
  assert.equal(plan.status, 'INELIGIBLE');
  assert.equal(plan.reason, 'MODE_NOT_C');
}

{
  const plan = evaluateRootPrefixCutShadow(baseFixture({ sourceAnchoredShortC: false }));
  assert.equal(plan.status, 'INELIGIBLE');
  assert.equal(plan.reason, 'SHORT_C_SOURCE_ANCHOR_NOT_PROVEN');
}

{
  const plan = evaluateRootPrefixCutShadow(baseFixture({ sourceIndex: 99 }));
  assert.equal(plan.status, 'FALLBACK');
  assert.equal(plan.reason, 'SOURCE_INDEX_INVALID');
}

{
  const fixture = baseFixture({
    rootIndex: 3,
    sourceIndex: 5,
    currentUserIndex: 6,
    messages: [
      { role: 'user', content: 'old' },
      { role: 'assistant', content: 'old-answer' },
      { role: 'system', content: 'keep-system' },
      { role: 'user', content: 'root' },
      { role: 'assistant', content: 'unexpected-earlier-assistant' },
      { role: 'assistant', content: 'claimed-source' },
      { role: 'user', content: 'current' },
    ],
  });
  const plan = evaluateRootPrefixCutShadow(fixture);
  assert.equal(plan.status, 'FALLBACK');
  assert.equal(plan.reason, 'SOURCE_NOT_FIRST_ASSISTANT_AFTER_ROOT');
}

{
  const fixture = baseFixture({
    rootIndex: 4,
    sourceIndex: 5,
    currentUserIndex: 6,
    messages: [
      { role: 'user', content: 'old-user' },
      { role: 'char', content: 'old-char' },
      { role: 'developer', content: 'keep-developer' },
      { role: 'opaque-role', content: 'keep-unknown' },
      { role: 'user', content: 'root' },
      { role: 'char', content: 'source-char' },
      { role: 'user', content: 'current' },
    ],
  });
  const plan = evaluateRootPrefixCutShadow(fixture);
  assert.equal(plan.status, 'ELIGIBLE_SHADOW_PLAN');
  assert.deepEqual(plan.candidateExcludedIndices, [0, 1]);
  assert.deepEqual(plan.keptIndices, [2, 3, 4, 5, 6]);
  assert.equal(plan.unknownKeptCount, 1);
}

{
  const fixture = baseFixture({
    rootIndex: 2,
    sourceIndex: 3,
    currentUserIndex: 5,
    messages: [
      { role: 'user', content: 'old-root-from-abandoned-branch' },
      { role: 'assistant', content: 'old-source-from-abandoned-branch' },
      { role: 'user', content: 'new-root' },
      { role: 'assistant', content: 'new-source' },
      { role: 'assistant', content: 'new-chain' },
      { role: 'user', content: 'current' },
    ],
  });
  const plan = evaluateRootPrefixCutShadow(fixture);
  assert.deepEqual(plan.candidateExcludedIndices, [0, 1], 'new root recomputes boundary from supplied current authority');
  assert.deepEqual(plan.keptIndices, [2, 3, 4, 5]);
}

console.log('context-projection-shadow-evaluator: PASS');
