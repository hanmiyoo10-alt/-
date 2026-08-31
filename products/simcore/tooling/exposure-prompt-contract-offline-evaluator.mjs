const EXPOSURE_LINES = Object.freeze([
  'short_community_b_exposure_scope=direct_root_broadcast_turn',
  'short_community_b_audience_exposure_basis=current_source_visible_broadcast_prose+current_user_explicit_public_disclosure;mere_mention_or_reaction_request_does_not_publish_hidden_fact=1',
  'short_community_b_source_community_role=derived_social_context_not_event_fact_authority;rumor_opinion_may_recur_only_as_attributed_rumor_opinion_or_reaction=1',
  'short_community_b_source_knowledge_role=continuity_context_not_audience_exposure_authority;reference_context_alone_not_public_knowledge_certificate=1',
  'short_community_b_unknown_exposure=do_not_assert_as_known_public_fact;event_scope_expansion_does_not_expand_audience_exposure=1',
  'short_community_b_visible_cue_inference=allowed_as_inference_opinion_joke;hidden_private_state_not_confirmed_without_exposure=1',
]);

function normalizedMode(value) {
  return String(value ?? '').trim();
}

function normalizedIndex(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : -1;
}

function normalizedDepth(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : -1;
}

function baseResult(status, reason) {
  return {
    schema: 1,
    candidate: 'DIRECT_B_ROOT_MODE_C_EXPOSURE_RESTRAINT',
    executionMode: 'OFFLINE_CONTRACT_ONLY',
    applied: false,
    runtimeMutationAuthorized: false,
    status,
    reason,
    exposureLines: [],
    exposureLineCount: 0,
    insertionContract: 'AFTER_EXISTING_SOURCE_PROVENANCE_BEFORE_NEW_SOURCE_GUIDANCE',
    promptTierExpectation: 'VOLATILE_EXISTING_SHORT_COMMUNITY_CLASSIFIER',
  };
}

/**
 * Offline evaluator for the frozen direct-B-root exposure Prompt contract.
 *
 * Input fields mirror already-prepared Prompt/Handoff facts. This evaluator does
 * not derive lineage, inspect chat history, parse source bodies, or mutate runtime.
 */
export function evaluateDirectBRootExposurePromptContract(facts) {
  if (normalizedMode(facts?.mode) !== 'C') return baseResult('INELIGIBLE', 'MODE_NOT_C');
  if (facts?.communitySourceHandoffEligible !== true) return baseResult('INELIGIBLE', 'SHORT_C_SOURCE_HANDOFF_NOT_ELIGIBLE');
  if (normalizedMode(facts?.communitySourceHandoffRootMode) !== 'B') return baseResult('INELIGIBLE', 'ROOT_MODE_NOT_B');
  if (normalizedMode(facts?.communitySourceHandoffParentMode) !== 'B') return baseResult('INELIGIBLE', 'PARENT_MODE_NOT_B');

  const rootIndex = normalizedIndex(facts?.communitySourceHandoffRootIndex);
  const parentIndex = normalizedIndex(facts?.communitySourceHandoffParentIndex);
  const depth = normalizedDepth(facts?.communitySourceHandoffDepth);

  if (rootIndex < 0) return baseResult('FALLBACK', 'ROOT_INDEX_INVALID');
  if (parentIndex < 0) return baseResult('FALLBACK', 'PARENT_INDEX_INVALID');
  if (parentIndex !== rootIndex) return baseResult('DEFERRED', 'MULTI_B_SOURCE_EXPOSURE_WINDOW_REQUIRED');
  if (depth !== 1) return baseResult('DEFERRED', 'DIRECT_B_ROOT_DEPTH_NOT_ONE');

  return {
    ...baseResult('ELIGIBLE_CONTRACT', 'DIRECT_B_ROOT_SOURCE_ALIGNED'),
    rootIndex,
    parentIndex,
    depth,
    exposureLines: EXPOSURE_LINES.slice(),
    exposureLineCount: EXPOSURE_LINES.length,
  };
}

/**
 * Models only the already-existing runtime-cache classification seam relevant to
 * this contract. Production currently recognizes `short_community_` as volatile
 * handoff/lineage prompt material. It is not a replacement runtime classifier.
 */
export function classifyExposureContractLineForExistingPromptTier(line) {
  const value = String(line ?? '');
  return /short_community_/.test(value)
    ? 'VOLATILE_EXISTING_SHORT_COMMUNITY_CLASSIFIER'
    : 'NOT_CLASSIFIED_BY_THIS_OFFLINE_PROBE';
}

/**
 * Creates a hypothetical line ordering for regression inspection only.
 * The caller supplies the already-existing provenance and new-source lines.
 */
export function composeHypotheticalShortCommunityPrompt(
  facts,
  existingSourceProvenanceLines = [],
  existingNewSourceGuidanceLines = [],
) {
  const result = evaluateDirectBRootExposurePromptContract(facts);
  const before = Array.isArray(existingSourceProvenanceLines) ? existingSourceProvenanceLines.slice() : [];
  const after = Array.isArray(existingNewSourceGuidanceLines) ? existingNewSourceGuidanceLines.slice() : [];
  return {
    result,
    lines: result.status === 'ELIGIBLE_CONTRACT'
      ? [...before, ...result.exposureLines, ...after]
      : [...before, ...after],
  };
}

export { EXPOSURE_LINES };
