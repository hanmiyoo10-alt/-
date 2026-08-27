'use strict';

const TBD = 'TBD';

const CANONICAL_VALUES = Object.freeze({
  systemImpact: Object.freeze(['NO_SYSTEM_UPDATE', 'SYSTEM_UPDATE_REQUIRED']),
  importance: Object.freeze(['최상', '높음', '중간', '낮음']),
  difficulty: Object.freeze(['낮음', '중간', '높음', '매우 높음']),
  size: Object.freeze(['작음', '중간', '큼', '매우 큼']),
});

const SORT_RANK = Object.freeze({
  importance: Object.freeze({ 최상: 0, 높음: 1, 중간: 2, 낮음: 3, [TBD]: 9 }),
  difficulty: Object.freeze({ 낮음: 0, 중간: 1, 높음: 2, '매우 높음': 3, [TBD]: 9 }),
  size: Object.freeze({ 작음: 0, 중간: 1, 큼: 2, '매우 큼': 3, [TBD]: 9 }),
});

function normalizeProposal(axis, proposal) {
  const rawValue = proposal && typeof proposal === 'object' ? proposal.value : proposal;
  const rawReason = proposal && typeof proposal === 'object' ? proposal.reason : '';
  const reason = typeof rawReason === 'string' ? rawReason.trim() : '';
  const allowed = CANONICAL_VALUES[axis];

  if (allowed.includes(rawValue)) {
    return Object.freeze({
      value: rawValue,
      status: 'PROPOSED',
      reason: reason || 'EXPLICIT_CANONICAL_PROPOSAL',
    });
  }

  return Object.freeze({
    value: TBD,
    status: 'NEEDS_REVIEW',
    reason: reason || 'MISSING_OR_INVALID_PROPOSAL',
  });
}

function normalizeDependencyUnlock(value) {
  if (value === true || value === false) return value;
  return null;
}

function draftIdeaClassification(input = {}) {
  const proposals = input && typeof input.proposals === 'object' && input.proposals
    ? input.proposals
    : {};

  const systemImpact = normalizeProposal('systemImpact', proposals.systemImpact);
  const importance = normalizeProposal('importance', proposals.importance);
  const difficulty = normalizeProposal('difficulty', proposals.difficulty);
  const size = normalizeProposal('size', proposals.size);
  const dependencyUnlock = normalizeDependencyUnlock(input.dependencyUnlock);

  const reviewAxes = [];
  for (const [axis, result] of Object.entries({ systemImpact, importance, difficulty, size })) {
    if (result.status === 'NEEDS_REVIEW') reviewAxes.push(axis);
  }
  if (dependencyUnlock === null) reviewAxes.push('dependencyUnlock');

  return Object.freeze({
    schemaVersion: 1,
    classification: Object.freeze({
      systemImpact: systemImpact.value,
      importance: importance.value,
      difficulty: difficulty.value,
      size: size.value,
    }),
    dependencyUnlock,
    needsReview: reviewAxes.length > 0,
    reviewAxes: Object.freeze([...reviewAxes]),
    explanations: Object.freeze({
      systemImpact,
      importance,
      difficulty,
      size,
      dependencyUnlock: Object.freeze({
        value: dependencyUnlock,
        status: dependencyUnlock === null ? 'NEEDS_REVIEW' : 'PROPOSED',
        reason: dependencyUnlock === null
          ? 'MISSING_OR_INVALID_PROPOSAL'
          : 'EXPLICIT_CANONICAL_PROPOSAL',
      }),
    }),
  });
}

function readClassificationValue(idea, axis) {
  const nested = idea && idea.classification && idea.classification[axis];
  const direct = idea && idea[axis];
  const value = nested !== undefined ? nested : direct;
  return CANONICAL_VALUES[axis].includes(value) ? value : TBD;
}

function dependencyUnlockRank(value) {
  if (value === true) return 0;
  if (value === false) return 1;
  return 2;
}

function canonicalIdeaSortKey(idea = {}) {
  const importance = readClassificationValue(idea, 'importance');
  const difficulty = readClassificationValue(idea, 'difficulty');
  const size = readClassificationValue(idea, 'size');
  const id = typeof idea.id === 'string' && idea.id.trim() ? idea.id.trim() : '~';

  return Object.freeze([
    SORT_RANK.importance[importance],
    SORT_RANK.difficulty[difficulty],
    SORT_RANK.size[size],
    dependencyUnlockRank(idea.dependencyUnlock),
    id,
  ]);
}

function compareCanonicalIdeas(a, b) {
  const left = canonicalIdeaSortKey(a);
  const right = canonicalIdeaSortKey(b);

  for (let index = 0; index < left.length - 1; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left[left.length - 1].localeCompare(right[right.length - 1]);
}

function sortCanonicalIdeas(ideas) {
  if (!Array.isArray(ideas)) throw new TypeError('ideas must be an array');
  return [...ideas].sort(compareCanonicalIdeas);
}

module.exports = {
  TBD,
  CANONICAL_VALUES,
  draftIdeaClassification,
  canonicalIdeaSortKey,
  compareCanonicalIdeas,
  sortCanonicalIdeas,
};
