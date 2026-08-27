'use strict';

const assert = require('node:assert/strict');
const {
  TBD,
  draftIdeaClassification,
  canonicalIdeaSortKey,
  sortCanonicalIdeas,
} = require('../core/idea-classification.cjs');

function testValidDraftPreservesCanonicalExplicitProposals() {
  const input = {
    id: 'U-X',
    proposals: {
      systemImpact: { value: 'SYSTEM_UPDATE_REQUIRED', reason: 'touches repository control-plane behavior' },
      importance: { value: '높음', reason: 'repeated operator friction' },
      difficulty: { value: '낮음', reason: 'pure deterministic core' },
      size: { value: '작음', reason: 'bounded module plus contract' },
    },
    dependencyUnlock: true,
    owner: 'must-not-be-decided-here',
    overlap: 'must-not-be-decided-here',
  };
  const snapshot = JSON.stringify(input);
  const draft = draftIdeaClassification(input);

  assert.deepEqual(draft.classification, {
    systemImpact: 'SYSTEM_UPDATE_REQUIRED',
    importance: '높음',
    difficulty: '낮음',
    size: '작음',
  });
  assert.equal(draft.dependencyUnlock, true);
  assert.equal(draft.needsReview, false);
  assert.deepEqual(draft.reviewAxes, []);
  assert.equal(draft.explanations.importance.reason, 'repeated operator friction');
  assert.equal('owner' in draft, false);
  assert.equal('overlap' in draft, false);
  assert.equal(JSON.stringify(input), snapshot, 'drafting must not mutate caller input');
}

function testMissingOrInvalidValuesFailOpenToTbd() {
  const draft = draftIdeaClassification({
    proposals: {
      systemImpact: 'UNKNOWN_CLASS',
      importance: '높음',
      difficulty: null,
      size: '거대함',
    },
  });

  assert.equal(draft.classification.systemImpact, TBD);
  assert.equal(draft.classification.importance, '높음');
  assert.equal(draft.classification.difficulty, TBD);
  assert.equal(draft.classification.size, TBD);
  assert.equal(draft.dependencyUnlock, null);
  assert.equal(draft.needsReview, true);
  assert.deepEqual(draft.reviewAxes, ['systemImpact', 'difficulty', 'size', 'dependencyUnlock']);
  assert.equal(draft.explanations.systemImpact.status, 'NEEDS_REVIEW');
}

function testCanonicalSortOrder() {
  const ideas = [
    { id: 'U-30', importance: '높음', difficulty: '낮음', size: '작음', dependencyUnlock: false },
    { id: 'U-31', importance: '최상', difficulty: '매우 높음', size: '매우 큼', dependencyUnlock: false },
    { id: 'U-32', importance: '높음', difficulty: '중간', size: '작음', dependencyUnlock: true },
    { id: 'U-33', importance: '높음', difficulty: '낮음', size: '중간', dependencyUnlock: true },
    { id: 'U-34', importance: '높음', difficulty: '낮음', size: '작음', dependencyUnlock: true },
    { id: 'U-35', importance: '높음', difficulty: '낮음', size: '작음', dependencyUnlock: true },
    { id: 'U-99', importance: 'TBD', difficulty: 'TBD', size: 'TBD' },
  ];

  const originalIds = ideas.map((idea) => idea.id);
  const sorted = sortCanonicalIdeas(ideas);
  assert.deepEqual(sorted.map((idea) => idea.id), [
    'U-31',
    'U-34',
    'U-35',
    'U-30',
    'U-33',
    'U-32',
    'U-99',
  ]);
  assert.deepEqual(ideas.map((idea) => idea.id), originalIds, 'sorting must return a new array');
}

function testNestedClassificationAndStableTieBreak() {
  const left = {
    id: 'U-01',
    classification: { importance: '높음', difficulty: '낮음', size: '작음' },
    dependencyUnlock: true,
  };
  const right = {
    id: 'U-02',
    classification: { importance: '높음', difficulty: '낮음', size: '작음' },
    dependencyUnlock: true,
  };

  assert.deepEqual(canonicalIdeaSortKey(left).slice(0, 4), [1, 0, 0, 0]);
  assert.deepEqual(sortCanonicalIdeas([right, left]).map((idea) => idea.id), ['U-01', 'U-02']);
}

function testInvalidCollectionRejected() {
  assert.throws(() => sortCanonicalIdeas(null), /ideas must be an array/);
}

testValidDraftPreservesCanonicalExplicitProposals();
testMissingOrInvalidValuesFailOpenToTbd();
testCanonicalSortOrder();
testNestedClassificationAndStableTieBreak();
testInvalidCollectionRejected();

console.log('idea-classification-contract: PASS');
