'use strict';

const assert = require('node:assert/strict');
const {
  TBD,
  RAW_TEXT_SIGNAL_TABLE,
  inferIdeaClassificationSignals,
  draftIdeaClassificationFromText,
} = require('../core/idea-classification.cjs');

function testSignalTableIsFrozen() {
  assert.equal(Object.isFrozen(RAW_TEXT_SIGNAL_TABLE), true);
  assert.equal(Object.isFrozen(RAW_TEXT_SIGNAL_TABLE.systemImpact), true);
  assert.equal(Object.isFrozen(RAW_TEXT_SIGNAL_TABLE.systemImpact[0]), true);
}

function testEnglishSignalsComposeIntoA1Draft() {
  const draft = draftIdeaClassificationFromText({
    title: 'Add workflow for canonical-main idea intake',
    notes: 'importance: high difficulty: low size: small',
    dependencyUnlock: false,
  });

  assert.deepEqual(draft.classification, {
    systemImpact: 'SYSTEM_UPDATE_REQUIRED',
    importance: '높음',
    difficulty: '낮음',
    size: '작음',
  });
  assert.equal(draft.needsReview, false);
  assert.equal(draft.inference.precedence.systemImpact, 'INFERRED');
  assert.equal(draft.inference.axes.systemImpact.status, 'PROPOSED');
  assert.equal(
    draft.inference.axes.systemImpact.matches.some((match) => match.ruleId === 'SYS-YES-CHANGE-EN'),
    true,
  );
  assert.match(draft.explanations.importance.reason, /^RAW_TEXT_SIGNAL:/);
}

function testKoreanCanonicalAliasesAreRecognized() {
  const draft = draftIdeaClassificationFromText({
    title: '워크플로 변경 필요',
    notes: '중요도: 높음 난이도: 낮음 크기: 작음',
    dependencyUnlock: true,
  });

  assert.deepEqual(draft.classification, {
    systemImpact: 'SYSTEM_UPDATE_REQUIRED',
    importance: '높음',
    difficulty: '낮음',
    size: '작음',
  });
  assert.equal(draft.needsReview, false);
  assert.equal(
    draft.inference.axes.systemImpact.matches.some((match) => match.ruleId === 'SYS-YES-CHANGE-KO'),
    true,
  );
}

function testExplicitNoSystemChangeCanBeDrafted() {
  const draft = draftIdeaClassificationFromText({
    title: '문서만 변경',
    notes: 'importance: medium difficulty: low size: small',
    dependencyUnlock: false,
  });

  assert.equal(draft.classification.systemImpact, 'NO_SYSTEM_UPDATE');
  assert.equal(draft.classification.importance, '중간');
  assert.equal(draft.needsReview, false);
  assert.equal(
    draft.inference.axes.systemImpact.matches.some((match) => match.ruleId === 'SYS-NO-PHRASE-KO'),
    true,
  );
}

function testConflictingSignalsFailOpenToTbd() {
  const draft = draftIdeaClassificationFromText({
    title: 'docs-only but add workflow for automation',
    notes: 'importance: high difficulty: low size: small',
    dependencyUnlock: false,
  });

  assert.equal(draft.classification.systemImpact, TBD);
  assert.equal(draft.needsReview, true);
  assert.equal(draft.reviewAxes.includes('systemImpact'), true);
  assert.equal(draft.inference.axes.systemImpact.status, 'CONFLICT');
  assert.deepEqual(
    [...draft.inference.axes.systemImpact.candidates].sort(),
    ['NO_SYSTEM_UPDATE', 'SYSTEM_UPDATE_REQUIRED'].sort(),
  );
  assert.equal(draft.inference.precedence.systemImpact, 'CONFLICT');
}

function testAmbiguousTextDoesNotInventClassification() {
  const draft = draftIdeaClassificationFromText({
    title: 'Make the operator experience clearer',
    problem: 'The current wording is confusing in some sessions.',
    dependencyUnlock: false,
  });

  assert.deepEqual(draft.classification, {
    systemImpact: TBD,
    importance: TBD,
    difficulty: TBD,
    size: TBD,
  });
  assert.deepEqual(draft.reviewAxes, ['systemImpact', 'importance', 'difficulty', 'size']);
  for (const axis of ['systemImpact', 'importance', 'difficulty', 'size']) {
    assert.equal(draft.inference.axes[axis].status, 'NO_SIGNAL');
  }
}

function testExplicitProposalOutranksInferenceEvenWhenInvalid() {
  const draft = draftIdeaClassificationFromText({
    title: 'Add workflow for canonical-main idea intake',
    notes: 'importance: low difficulty: high size: large',
    proposals: {
      importance: { value: '높음', reason: 'explicit operator proposal' },
      size: '거대함',
    },
    dependencyUnlock: false,
  });

  assert.equal(draft.classification.systemImpact, 'SYSTEM_UPDATE_REQUIRED');
  assert.equal(draft.classification.importance, '높음');
  assert.equal(draft.classification.difficulty, '높음');
  assert.equal(draft.classification.size, TBD);
  assert.equal(draft.inference.precedence.importance, 'EXPLICIT');
  assert.equal(draft.inference.precedence.size, 'EXPLICIT');
  assert.equal(draft.explanations.importance.reason, 'explicit operator proposal');
  assert.equal(draft.explanations.size.status, 'NEEDS_REVIEW');
  assert.equal(draft.inference.axes.size.status, 'PROPOSED', 'inference remains evidence but cannot override explicit input');
}

function testInferenceDoesNotMutateCallerInput() {
  const input = {
    title: 'Change runtime for the classifier',
    notes: ['importance: high', 'difficulty: medium', 'size: medium'],
    proposals: { importance: '높음' },
    dependencyUnlock: false,
    owner: 'must-remain-external',
    overlap: 'must-remain-external',
  };
  const snapshot = JSON.stringify(input);
  const draft = draftIdeaClassificationFromText(input);

  assert.equal(JSON.stringify(input), snapshot);
  assert.equal('owner' in draft, false);
  assert.equal('overlap' in draft, false);
  assert.equal(draft.inference.source.normalizedLength > 0, true);
}

function testRawStringSignalInspection() {
  const inference = inferIdeaClassificationSignals('system impact: NO_SYSTEM_UPDATE importance: high');
  assert.equal(inference.proposals.systemImpact.value, 'NO_SYSTEM_UPDATE');
  assert.equal(inference.proposals.importance.value, '높음');
  assert.deepEqual(inference.source.fields, ['text']);
}

testSignalTableIsFrozen();
testEnglishSignalsComposeIntoA1Draft();
testKoreanCanonicalAliasesAreRecognized();
testExplicitNoSystemChangeCanBeDrafted();
testConflictingSignalsFailOpenToTbd();
testAmbiguousTextDoesNotInventClassification();
testExplicitProposalOutranksInferenceEvenWhenInvalid();
testInferenceDoesNotMutateCallerInput();
testRawStringSignalInspection();

console.log('idea-classification-signal-contract: PASS');
