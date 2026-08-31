import assert from 'node:assert/strict';
import {
  EXPOSURE_LINES,
  classifyExposureContractLineForExistingPromptTier,
  composeHypotheticalShortCommunityPrompt,
  evaluateDirectBRootExposurePromptContract,
} from './exposure-prompt-contract-offline-evaluator.mjs';

function directFixture(overrides = {}) {
  return {
    mode: 'C',
    communitySourceHandoffEligible: true,
    communitySourceHandoffRootMode: 'B',
    communitySourceHandoffRootIndex: 10,
    communitySourceHandoffParentMode: 'B',
    communitySourceHandoffParentIndex: 10,
    communitySourceHandoffDepth: 1,
    ...overrides,
  };
}

{
  const fixture = directFixture();
  const before = JSON.stringify(fixture);
  const result = evaluateDirectBRootExposurePromptContract(fixture);
  assert.equal(result.status, 'ELIGIBLE_CONTRACT');
  assert.equal(result.reason, 'DIRECT_B_ROOT_SOURCE_ALIGNED');
  assert.equal(result.applied, false);
  assert.equal(result.runtimeMutationAuthorized, false);
  assert.equal(result.exposureLineCount, 6);
  assert.deepEqual(result.exposureLines, EXPOSURE_LINES);
  assert.equal(new Set(result.exposureLines).size, 6, 'frozen exposure lines must be unique');
  assert.ok(result.exposureLines.every((line) => line.startsWith('short_community_b_')));
  assert.ok(result.exposureLines.every((line) => classifyExposureContractLineForExistingPromptTier(line) === result.promptTierExpectation));
  assert.equal(JSON.stringify(fixture), before, 'evaluator must not mutate supplied facts');
}

{
  const provenance = [
    'specific_event_example_scene_action_item_quote_or_outcome_requires_current_root_support=1',
    'outside_root_specific_event_evidence_only_if_current_user_explicitly_requests_prior_events_history_comparison_or_retrospective=1',
  ];
  const newSource = [
    'short_community_request_reused_with_new_source=B',
    'derive_reaction_from_current_source_not_prior_answer=1',
  ];
  const provenanceBefore = JSON.stringify(provenance);
  const newSourceBefore = JSON.stringify(newSource);
  const composed = composeHypotheticalShortCommunityPrompt(directFixture(), provenance, newSource);
  assert.deepEqual(composed.lines.slice(0, provenance.length), provenance);
  assert.deepEqual(composed.lines.slice(provenance.length, provenance.length + 6), EXPOSURE_LINES);
  assert.deepEqual(composed.lines.slice(-newSource.length), newSource);
  assert.equal(JSON.stringify(provenance), provenanceBefore, 'composition must not mutate provenance lines');
  assert.equal(JSON.stringify(newSource), newSourceBefore, 'composition must not mutate new-source lines');
}

const ineligibleCases = [
  [directFixture({ mode: 'A' }), 'MODE_NOT_C'],
  [directFixture({ mode: 'B_END' }), 'MODE_NOT_C'],
  [directFixture({ communitySourceHandoffEligible: false }), 'SHORT_C_SOURCE_HANDOFF_NOT_ELIGIBLE'],
  [directFixture({ communitySourceHandoffRootMode: 'A' }), 'ROOT_MODE_NOT_B'],
  [directFixture({ communitySourceHandoffRootMode: 'INLINE_C' }), 'ROOT_MODE_NOT_B'],
  [directFixture({ communitySourceHandoffParentMode: 'C' }), 'PARENT_MODE_NOT_B'],
];

for (const [fixture, reason] of ineligibleCases) {
  const result = evaluateDirectBRootExposurePromptContract(fixture);
  assert.equal(result.status, 'INELIGIBLE');
  assert.equal(result.reason, reason);
  assert.equal(result.exposureLineCount, 0);
  assert.deepEqual(result.exposureLines, []);
}

{
  const result = evaluateDirectBRootExposurePromptContract(directFixture({ communitySourceHandoffRootIndex: -1 }));
  assert.equal(result.status, 'FALLBACK');
  assert.equal(result.reason, 'ROOT_INDEX_INVALID');
  assert.equal(result.exposureLineCount, 0);
}

{
  const result = evaluateDirectBRootExposurePromptContract(directFixture({ communitySourceHandoffParentIndex: -1 }));
  assert.equal(result.status, 'FALLBACK');
  assert.equal(result.reason, 'PARENT_INDEX_INVALID');
  assert.equal(result.exposureLineCount, 0);
}

{
  const result = evaluateDirectBRootExposurePromptContract(directFixture({ communitySourceHandoffParentIndex: 14 }));
  assert.equal(result.status, 'DEFERRED');
  assert.equal(result.reason, 'MULTI_B_SOURCE_EXPOSURE_WINDOW_REQUIRED');
  assert.equal(result.exposureLineCount, 0);
}

{
  const result = evaluateDirectBRootExposurePromptContract(directFixture({ communitySourceHandoffDepth: 2 }));
  assert.equal(result.status, 'DEFERRED');
  assert.equal(result.reason, 'DIRECT_B_ROOT_DEPTH_NOT_ONE');
  assert.equal(result.exposureLineCount, 0);
}

{
  const composed = composeHypotheticalShortCommunityPrompt(
    directFixture({ communitySourceHandoffParentIndex: 12 }),
    ['existing-provenance'],
    ['existing-new-source'],
  );
  assert.deepEqual(composed.lines, ['existing-provenance', 'existing-new-source']);
  assert.equal(composed.result.status, 'DEFERRED');
}

{
  assert.equal(
    classifyExposureContractLineForExistingPromptTier('unrelated_prompt_line=1'),
    'NOT_CLASSIFIED_BY_THIS_OFFLINE_PROBE',
  );
}

console.log('exposure-prompt-contract-offline-evaluator: PASS');
