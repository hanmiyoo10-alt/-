import { evaluateRootPrefixCutShadow } from './context-projection-shadow-evaluator.mjs';

function shortCFixture(messages, rootIndex = 3, sourceIndex = 4, currentUserIndex = 5) {
  return {
    mode: 'C',
    sourceAnchoredShortC: true,
    evidenceDisposition: 'DUAL',
    rootIndex,
    sourceIndex,
    currentUserIndex,
    messages,
  };
}

const STANDARD_TAIL = Object.freeze({ role: 'system', content: 'simcore-runtime-tail' });

export const DEPENDENCY_TRAP_CASES = Object.freeze([
  {
    id: 'TRAP_ENTITY_ALIAS_BINDING',
    kind: 'TRAP',
    dependencyClass: 'ENTITY_ALIAS_BINDING',
    semanticOracle: 'PRE_ROOT_REQUIRED',
    requiredPreRootIndices: [1],
    fixture: shortCFixture([
      { role: 'system', content: 'host-system' },
      { role: 'user', content: 'For this operation, Bluebird means Warehouse 17 on the east pier.' },
      { role: 'assistant', content: 'Understood. Bluebird refers to Warehouse 17.' },
      { role: 'user', content: 'Proceed with the Bluebird plan.' },
      { role: 'assistant', content: 'I will use the agreed destination.' },
      { role: 'user', content: 'What address are we using?' },
      STANDARD_TAIL,
    ]),
  },
  {
    id: 'TRAP_USER_CONSTRAINT',
    kind: 'TRAP',
    dependencyClass: 'USER_CONSTRAINT',
    semanticOracle: 'PRE_ROOT_REQUIRED',
    requiredPreRootIndices: [1],
    fixture: shortCFixture([
      { role: 'system', content: 'host-system' },
      { role: 'user', content: 'Keep every scene strictly platonic. Do not introduce romance.' },
      { role: 'assistant', content: 'I will keep the relationship platonic.' },
      { role: 'user', content: 'Continue the scene from here.' },
      { role: 'assistant', content: 'They continue talking by the station.' },
      { role: 'user', content: 'Continue naturally.' },
      STANDARD_TAIL,
    ]),
  },
  {
    id: 'TRAP_WORLD_STATE_CONTINUITY',
    kind: 'TRAP',
    dependencyClass: 'WORLD_STATE_CONTINUITY',
    semanticOracle: 'PRE_ROOT_REQUIRED',
    requiredPreRootIndices: [1],
    fixture: shortCFixture([
      { role: 'system', content: 'host-system' },
      { role: 'user', content: 'The east gate collapsed during the storm and cannot be used.' },
      { role: 'assistant', content: 'The east gate is now unusable.' },
      { role: 'user', content: 'Take the safest route into the city.' },
      { role: 'assistant', content: 'We avoid the unusable entrance and circle around.' },
      { role: 'user', content: 'Which entrance should we take?' },
      STANDARD_TAIL,
    ]),
  },
  {
    id: 'TRAP_SECRET_LITERAL',
    kind: 'TRAP',
    dependencyClass: 'SECRET_LITERAL',
    semanticOracle: 'PRE_ROOT_REQUIRED',
    requiredPreRootIndices: [1],
    fixture: shortCFixture([
      { role: 'system', content: 'host-system' },
      { role: 'user', content: 'The fictional archive keypad code is 7391.' },
      { role: 'assistant', content: 'I will remember 7391 for this scene.' },
      { role: 'user', content: 'Open the archive with the code I gave you.' },
      { role: 'assistant', content: 'I enter the supplied code and open it.' },
      { role: 'user', content: 'What code did we use?' },
      STANDARD_TAIL,
    ]),
  },
  {
    id: 'TRAP_PRONOUN_ANTECEDENT',
    kind: 'TRAP',
    dependencyClass: 'PRONOUN_ANTECEDENT',
    semanticOracle: 'PRE_ROOT_REQUIRED',
    requiredPreRootIndices: [1],
    fixture: shortCFixture([
      { role: 'system', content: 'host-system' },
      { role: 'user', content: 'Mina is the medic. Joon is the scout.' },
      { role: 'assistant', content: 'Mina is the medic and Joon is the scout.' },
      { role: 'user', content: 'Ask her to treat Joon.' },
      { role: 'assistant', content: 'I call her over to help him.' },
      { role: 'user', content: 'Who is "her" here?' },
      STANDARD_TAIL,
    ]),
  },
  {
    id: 'TRAP_EXCEPTION_RULE',
    kind: 'TRAP',
    dependencyClass: 'EXCEPTION_RULE',
    semanticOracle: 'PRE_ROOT_REQUIRED',
    requiredPreRootIndices: [1],
    fixture: shortCFixture([
      { role: 'system', content: 'host-system' },
      { role: 'user', content: 'Every red door is trapped except the third one.' },
      { role: 'assistant', content: 'Only the third red door is safe.' },
      { role: 'user', content: 'Go through the safe red door.' },
      { role: 'assistant', content: 'We choose the exception and move through it.' },
      { role: 'user', content: 'Which numbered door was that?' },
      STANDARD_TAIL,
    ]),
  },
  {
    id: 'TRAP_PRIOR_ASSISTANT_DERIVATION',
    kind: 'TRAP',
    dependencyClass: 'PRIOR_ASSISTANT_DERIVATION',
    semanticOracle: 'PRE_ROOT_REQUIRED',
    requiredPreRootIndices: [2],
    fixture: shortCFixture([
      { role: 'system', content: 'host-system' },
      { role: 'user', content: 'Summarize the scan result and use it later.' },
      { role: 'assistant', content: 'Scan summary: Sector 9 is the only clear route.' },
      { role: 'user', content: 'Move through the clear sector.' },
      { role: 'assistant', content: 'We head for the sector identified as clear.' },
      { role: 'user', content: 'Which sector are we entering?' },
      STANDARD_TAIL,
    ]),
  },
  {
    id: 'TRAP_INVENTORY_STATE',
    kind: 'TRAP',
    dependencyClass: 'INVENTORY_STATE',
    semanticOracle: 'PRE_ROOT_REQUIRED',
    requiredPreRootIndices: [1, 2],
    fixture: shortCFixture([
      { role: 'system', content: 'host-system' },
      { role: 'user', content: 'We have two antidotes. Use one on the guide now.' },
      { role: 'assistant', content: 'One antidote is used on the guide, leaving one.' },
      { role: 'user', content: 'Use the remaining antidote on the pilot.' },
      { role: 'assistant', content: 'I use the remaining dose on the pilot.' },
      { role: 'user', content: 'How many antidotes should be left now?' },
      STANDARD_TAIL,
    ]),
  },
  {
    id: 'CONTROL_SELF_CONTAINED_ROOT',
    kind: 'CONTROL',
    dependencyClass: 'NONE_DECLARED',
    semanticOracle: 'NO_DECLARED_PRE_ROOT_DEPENDENCY',
    requiredPreRootIndices: [],
    fixture: shortCFixture([
      { role: 'system', content: 'host-system' },
      { role: 'user', content: 'Old unrelated chat about tea.' },
      { role: 'assistant', content: 'Tea acknowledged.' },
      { role: 'user', content: 'For this task only, answer with the word cobalt.' },
      { role: 'assistant', content: 'cobalt' },
      { role: 'user', content: 'Repeat the required word.' },
      STANDARD_TAIL,
    ]),
  },
  {
    id: 'CONTROL_NO_PRE_ROOT_CONVERSATION',
    kind: 'CONTROL',
    dependencyClass: 'NO_PREFIX',
    semanticOracle: 'NO_DECLARED_PRE_ROOT_DEPENDENCY',
    requiredPreRootIndices: [],
    fixture: shortCFixture([
      { role: 'system', content: 'host-system' },
      { role: 'user', content: 'Answer from this root.' },
      { role: 'assistant', content: 'Root source.' },
      { role: 'user', content: 'Continue.' },
      STANDARD_TAIL,
    ], 1, 2, 3),
  },
]);

export function evaluateDependencyTrapCase(testCase) {
  const plan = evaluateRootPrefixCutShadow(testCase.fixture);
  const excluded = new Set(plan.candidateExcludedIndices);
  const severedRequiredIndices = testCase.requiredPreRootIndices.filter((index) => excluded.has(index));
  const dependencySevered = testCase.semanticOracle === 'PRE_ROOT_REQUIRED'
    && severedRequiredIndices.length > 0;

  return {
    id: testCase.id,
    kind: testCase.kind,
    dependencyClass: testCase.dependencyClass,
    semanticOracle: testCase.semanticOracle,
    plan,
    severedRequiredIndices,
    dependencySevered,
    structuralFalseSafe: plan.status === 'ELIGIBLE_SHADOW_PLAN' && dependencySevered,
    activeProjectionDisposition: dependencySevered
      ? 'BLOCK_ACTIVE_PROJECTION'
      : 'NO_CORPUS_BLOCK',
  };
}
