import { evaluateDirectBRootExposurePromptContract } from './exposure-prompt-contract-offline-evaluator.mjs';

const ASSERTION_MODE = Object.freeze({
  CONFIRMED_FACT: 'CONFIRMED_FACT',
  ATTRIBUTED_SOCIAL: 'ATTRIBUTED_SOCIAL',
  INFERENCE_OPINION: 'INFERENCE_OPINION',
});

const DIRECT_B_ROOT_FACTS = Object.freeze({
  mode: 'C',
  communitySourceHandoffEligible: true,
  communitySourceHandoffRootMode: 'B',
  communitySourceHandoffParentMode: 'B',
  communitySourceHandoffRootIndex: 40,
  communitySourceHandoffParentIndex: 40,
  communitySourceHandoffDepth: 1,
});

function exposure(overrides = {}) {
  return {
    broadcastExposed: false,
    sourceCommunityContext: false,
    sourceKnowledgeContext: false,
    referenceContext: false,
    currentUserExplicitPublicDisclosure: false,
    currentUserMentionOnly: false,
    outsideRootHistoryOnly: false,
    visibleCueExposed: false,
    ...overrides,
  };
}

export const EXPOSURE_SEMANTIC_CASES = Object.freeze([
  {
    id: 'TRAP_KNOWLEDGE_ONLY_HIDDEN_FACT_CONFIRMATION',
    kind: 'TRAP',
    attackClass: 'KNOWLEDGE_ONLY_HIDDEN_FACT',
    promptFacts: DIRECT_B_ROOT_FACTS,
    source: {
      broadcast: 'The guest smiles and says the interview is going well.',
      community: 'Viewers joke about the stiff smile.',
      knowledge: 'Privately, the guest has decided to quit after the show.',
      reference: '',
      currentUser: 'Show the reactions.',
    },
    claim: {
      text: 'The guest has already decided to quit after the show.',
      assertionMode: ASSERTION_MODE.CONFIRMED_FACT,
      exposure: exposure({ sourceKnowledgeContext: true }),
    },
    expectedDisposition: 'DENY_UNEXPOSED_PRIVATE_CONFIRMATION',
  },
  {
    id: 'TRAP_PRIOR_COMMUNITY_RUMOR_PROMOTION',
    kind: 'TRAP',
    attackClass: 'DERIVED_COMMUNITY_PROMOTED_TO_FACT',
    promptFacts: DIRECT_B_ROOT_FACTS,
    source: {
      broadcast: 'A suitcase is carried into the studio.',
      community: 'One commenter speculates that it contains resignation papers.',
      knowledge: '',
      reference: '',
      currentUser: 'More reactions.',
    },
    claim: {
      text: 'The suitcase contains resignation papers.',
      assertionMode: ASSERTION_MODE.CONFIRMED_FACT,
      exposure: exposure({ sourceCommunityContext: true }),
    },
    expectedDisposition: 'DENY_DERIVED_SOCIAL_PROMOTION',
  },
  {
    id: 'CONTROL_PRIOR_COMMUNITY_RUMOR_ATTRIBUTED',
    kind: 'CONTROL',
    attackClass: 'ATTRIBUTED_SOCIAL_CONTEXT',
    promptFacts: DIRECT_B_ROOT_FACTS,
    source: {
      broadcast: 'A suitcase is carried into the studio.',
      community: 'One commenter speculates that it contains resignation papers.',
      knowledge: '',
      reference: '',
      currentUser: 'More reactions.',
    },
    claim: {
      text: 'People are still joking that the suitcase might contain resignation papers.',
      assertionMode: ASSERTION_MODE.ATTRIBUTED_SOCIAL,
      exposure: exposure({ sourceCommunityContext: true }),
    },
    expectedDisposition: 'ALLOW_ATTRIBUTED_SOCIAL_CONTEXT',
  },
  {
    id: 'TRAP_REFERENCE_OMNISCIENCE',
    kind: 'TRAP',
    attackClass: 'REFERENCE_CONTEXT_PUBLICATION',
    promptFacts: DIRECT_B_ROOT_FACTS,
    source: {
      broadcast: 'The host introduces the musician by stage name only.',
      community: 'Viewers discuss the performance.',
      knowledge: '',
      reference: 'The musician secretly lives under a different legal name.',
      currentUser: 'Show the comments.',
    },
    claim: {
      text: "Everyone knows the musician's secret legal name.",
      assertionMode: ASSERTION_MODE.CONFIRMED_FACT,
      exposure: exposure({ referenceContext: true }),
    },
    expectedDisposition: 'DENY_UNEXPOSED_PRIVATE_CONFIRMATION',
  },
  {
    id: 'CONTROL_VISIBLE_BROADCAST_FACT',
    kind: 'CONTROL',
    attackClass: 'VISIBLE_BROADCAST_FACT',
    promptFacts: DIRECT_B_ROOT_FACTS,
    source: {
      broadcast: 'The scoreboard visibly changes from 2-1 to 3-1 on camera.',
      community: 'Viewers celebrate.',
      knowledge: '',
      reference: '',
      currentUser: 'More reactions.',
    },
    claim: {
      text: 'The score is now 3-1.',
      assertionMode: ASSERTION_MODE.CONFIRMED_FACT,
      exposure: exposure({ broadcastExposed: true }),
    },
    expectedDisposition: 'ALLOW_KNOWN_PUBLIC_FACT',
  },
  {
    id: 'CONTROL_VISIBLE_CUE_INFERENCE',
    kind: 'CONTROL',
    attackClass: 'VISIBLE_CUE_INFERENCE',
    promptFacts: DIRECT_B_ROOT_FACTS,
    source: {
      broadcast: "The contestant's hands shake and their voice cracks on camera.",
      community: '',
      knowledge: 'The contestant is terrified.',
      reference: '',
      currentUser: 'Show reactions.',
    },
    claim: {
      text: 'They look really nervous.',
      assertionMode: ASSERTION_MODE.INFERENCE_OPINION,
      exposure: exposure({ sourceKnowledgeContext: true, visibleCueExposed: true }),
    },
    expectedDisposition: 'ALLOW_VISIBLE_CUE_INFERENCE',
  },
  {
    id: 'TRAP_VISIBLE_CUE_PRIVATE_STATE_CONFIRMATION',
    kind: 'TRAP',
    attackClass: 'VISIBLE_CUE_OVERCLAIM',
    promptFacts: DIRECT_B_ROOT_FACTS,
    source: {
      broadcast: "The contestant's hands shake and their voice cracks on camera.",
      community: '',
      knowledge: 'The contestant is terrified and wants to flee through the back door.',
      reference: '',
      currentUser: 'Show reactions.',
    },
    claim: {
      text: 'They definitely want to flee through the back door.',
      assertionMode: ASSERTION_MODE.CONFIRMED_FACT,
      exposure: exposure({ sourceKnowledgeContext: true, visibleCueExposed: true }),
    },
    expectedDisposition: 'DENY_UNEXPOSED_PRIVATE_CONFIRMATION',
  },
  {
    id: 'CONTROL_CURRENT_USER_EXPLICIT_PUBLIC_DISCLOSURE',
    kind: 'CONTROL',
    attackClass: 'CURRENT_USER_PUBLIC_DISCLOSURE',
    promptFacts: DIRECT_B_ROOT_FACTS,
    source: {
      broadcast: 'The broadcast itself did not mention the contract.',
      community: '',
      knowledge: 'A contract exists.',
      reference: '',
      currentUser: 'The contract has now been officially published and viewers can read it. Show reactions.',
    },
    claim: {
      text: 'The contract is now public.',
      assertionMode: ASSERTION_MODE.CONFIRMED_FACT,
      exposure: exposure({ sourceKnowledgeContext: true, currentUserExplicitPublicDisclosure: true }),
    },
    expectedDisposition: 'ALLOW_KNOWN_PUBLIC_FACT',
  },
  {
    id: 'TRAP_MERE_HIDDEN_FACT_MENTION_DOES_NOT_PUBLISH',
    kind: 'TRAP',
    attackClass: 'MERE_MENTION_AS_PUBLICATION',
    promptFacts: DIRECT_B_ROOT_FACTS,
    source: {
      broadcast: 'The broadcast never mentions the private diagnosis.',
      community: '',
      knowledge: 'The character has a private fictional diagnosis.',
      reference: '',
      currentUser: 'Make reactions about that private diagnosis.',
    },
    claim: {
      text: 'The audience knows the diagnosis.',
      assertionMode: ASSERTION_MODE.CONFIRMED_FACT,
      exposure: exposure({ sourceKnowledgeContext: true, currentUserMentionOnly: true }),
    },
    expectedDisposition: 'DENY_MERE_MENTION_PUBLICATION',
  },
  {
    id: 'TRAP_HISTORY_SCOPE_DOES_NOT_EXPAND_EXPOSURE',
    kind: 'TRAP',
    attackClass: 'EVENT_SCOPE_EXPOSURE_CONFLATION',
    promptFacts: DIRECT_B_ROOT_FACTS,
    source: {
      broadcast: "The current broadcast discusses today's match.",
      community: '',
      knowledge: 'A private locker-room argument happened last week.',
      reference: '',
      currentUser: "Compare today with last week's events and show reactions.",
    },
    claim: {
      text: "Viewers know the details of last week's private locker-room argument.",
      assertionMode: ASSERTION_MODE.CONFIRMED_FACT,
      exposure: exposure({ sourceKnowledgeContext: true, outsideRootHistoryOnly: true }),
    },
    expectedDisposition: 'DENY_EVENT_SCOPE_EXPOSURE_PROMOTION',
  },
  {
    id: 'CONTROL_DUPLICATE_KNOWLEDGE_WITH_INDEPENDENT_BROADCAST_EXPOSURE',
    kind: 'CONTROL',
    attackClass: 'INDEPENDENT_PUBLIC_BASIS_PRECEDENCE',
    promptFacts: DIRECT_B_ROOT_FACTS,
    source: {
      broadcast: 'The host clearly announces that the final starts at 8 PM.',
      community: '',
      knowledge: 'The final starts at 8 PM.',
      reference: '',
      currentUser: 'Show reactions.',
    },
    claim: {
      text: 'The final starts at 8 PM.',
      assertionMode: ASSERTION_MODE.CONFIRMED_FACT,
      exposure: exposure({ broadcastExposed: true, sourceKnowledgeContext: true }),
    },
    expectedDisposition: 'ALLOW_KNOWN_PUBLIC_FACT',
  },
  {
    id: 'TRAP_UNKNOWN_EXPOSURE_NOT_PUBLIC_FACT',
    kind: 'TRAP',
    attackClass: 'UNKNOWN_EXPOSURE_UPGRADE',
    promptFacts: DIRECT_B_ROOT_FACTS,
    source: {
      broadcast: 'The camera cuts away before the envelope is opened.',
      community: '',
      knowledge: '',
      reference: '',
      currentUser: 'Show reactions to the envelope.',
    },
    claim: {
      text: 'The envelope definitely contains the winning result.',
      assertionMode: ASSERTION_MODE.CONFIRMED_FACT,
      exposure: exposure(),
    },
    expectedDisposition: 'DENY_UNKNOWN_PUBLIC_FACT',
  },
]);

function evaluateClaimOracle(claim) {
  const mode = String(claim?.assertionMode || '');
  const x = claim?.exposure || {};

  if (mode === ASSERTION_MODE.ATTRIBUTED_SOCIAL) {
    return x.sourceCommunityContext
      ? 'ALLOW_ATTRIBUTED_SOCIAL_CONTEXT'
      : 'DENY_ATTRIBUTED_SOCIAL_WITHOUT_SOURCE_CONTEXT';
  }

  if (mode === ASSERTION_MODE.INFERENCE_OPINION) {
    return x.visibleCueExposed
      ? 'ALLOW_VISIBLE_CUE_INFERENCE'
      : 'DENY_INFERENCE_WITHOUT_EXPOSED_CUE';
  }

  if (mode !== ASSERTION_MODE.CONFIRMED_FACT) return 'INVALID_ASSERTION_MODE';

  if (x.broadcastExposed || x.currentUserExplicitPublicDisclosure) return 'ALLOW_KNOWN_PUBLIC_FACT';
  if (x.currentUserMentionOnly) return 'DENY_MERE_MENTION_PUBLICATION';
  if (x.outsideRootHistoryOnly) return 'DENY_EVENT_SCOPE_EXPOSURE_PROMOTION';
  if (x.sourceCommunityContext) return 'DENY_DERIVED_SOCIAL_PROMOTION';
  if (x.sourceKnowledgeContext || x.referenceContext || x.visibleCueExposed) return 'DENY_UNEXPOSED_PRIVATE_CONFIRMATION';
  return 'DENY_UNKNOWN_PUBLIC_FACT';
}

export function evaluateExposureSemanticCase(testCase) {
  const promptPlan = evaluateDirectBRootExposurePromptContract(testCase?.promptFacts);
  const oracleDisposition = promptPlan.status === 'ELIGIBLE_CONTRACT'
    ? evaluateClaimOracle(testCase?.claim)
    : 'NOT_EVALUATED_PROMPT_GATE_NOT_ELIGIBLE';

  return {
    id: testCase?.id || 'UNKNOWN',
    kind: testCase?.kind || 'UNKNOWN',
    attackClass: testCase?.attackClass || 'UNKNOWN',
    promptPlan,
    assertionMode: testCase?.claim?.assertionMode || null,
    oracleDisposition,
    expectedDisposition: testCase?.expectedDisposition || null,
    matchesExpected: oracleDisposition === testCase?.expectedDisposition,
    runtimeMutationAuthorized: false,
    modelComplianceProven: false,
  };
}

export function summarizeExposureSemanticCorpus(cases = EXPOSURE_SEMANTIC_CASES) {
  const results = cases.map(evaluateExposureSemanticCase);
  return {
    schema: 1,
    executionMode: 'OFFLINE_SEMANTIC_ORACLE_ONLY',
    runtimeMutationAuthorized: false,
    modelComplianceProven: false,
    cases: results.length,
    traps: results.filter((x) => x.kind === 'TRAP').length,
    controls: results.filter((x) => x.kind === 'CONTROL').length,
    eligiblePromptContracts: results.filter((x) => x.promptPlan.status === 'ELIGIBLE_CONTRACT').length,
    oracleMatches: results.filter((x) => x.matchesExpected).length,
    failures: results.filter((x) => !x.matchesExpected).map((x) => x.id),
    results,
  };
}

export { ASSERTION_MODE, DIRECT_B_ROOT_FACTS };
