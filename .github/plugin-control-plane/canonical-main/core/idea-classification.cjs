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
const TEXT_FIELDS = Object.freeze(['title', 'problem', 'benefit', 'notes']);
const R = (id, value, pattern) => Object.freeze({ id, value, pattern });
const RAW_TEXT_SIGNAL_TABLE = Object.freeze({
  systemImpact: Object.freeze([
    R('SYS-NO-EXPLICIT', 'NO_SYSTEM_UPDATE', /(?:system[\s_-]*impact|시스템\s*영향)\s*[:=]\s*no_system_update\b/i),
    R('SYS-NO-LEGACY', 'NO_SYSTEM_UPDATE', /\bupdate\s*:\s*n\b/i),
    R('SYS-NO-PHRASE-EN', 'NO_SYSTEM_UPDATE', /\b(?:no system update|docs?-only|documentation-only)\b/i),
    R('SYS-NO-PHRASE-KO', 'NO_SYSTEM_UPDATE', /(?:시스템\s*업데이트\s*(?:없음|불필요)|문서\s*만\s*(?:변경|수정))/i),
    R('SYS-YES-EXPLICIT', 'SYSTEM_UPDATE_REQUIRED', /(?:system[\s_-]*impact|시스템\s*영향)\s*[:=]\s*system_update_required\b/i),
    R('SYS-YES-LEGACY', 'SYSTEM_UPDATE_REQUIRED', /\bupdate\s*:\s*y\b/i),
    R('SYS-YES-CHANGE-EN', 'SYSTEM_UPDATE_REQUIRED', /\b(?:add|change|modify|update|replace|remove)\s+(?:a\s+|the\s+)?(?:github\s+actions?\s+)?(?:workflow|ci|runtime|release|writer|mutation|automation|control[- ]plane)\b/i),
    R('SYS-YES-REQUIRED-EN', 'SYSTEM_UPDATE_REQUIRED', /\b(?:workflow|ci|runtime|release|writer|mutation|automation|control[- ]plane)\s+(?:change|update|modification|addition)\s+required\b/i),
    R('SYS-YES-CHANGE-KO', 'SYSTEM_UPDATE_REQUIRED', /(?:워크플로|ci|런타임|릴리스|writer|뮤테이션|자동화|컨트롤\s*플레인)\s*(?:변경|추가|수정)\s*(?:필요|함|한다)/i),
  ]),
  importance: Object.freeze([
    R('IMP-TOP', '최상', /(?:importance|중요도)\s*[:=]\s*(?:(?:very\s+high)\b|최상)/i),
    R('IMP-HIGH', '높음', /(?:importance|중요도)\s*[:=]\s*(?:high\b|높음)/i),
    R('IMP-MEDIUM', '중간', /(?:importance|중요도)\s*[:=]\s*(?:medium\b|중간)/i),
    R('IMP-LOW', '낮음', /(?:importance|중요도)\s*[:=]\s*(?:low\b|낮음)/i),
  ]),
  difficulty: Object.freeze([
    R('DIFF-LOW', '낮음', /(?:difficulty|난이도)\s*[:=]\s*(?:low\b|낮음)/i),
    R('DIFF-MEDIUM', '중간', /(?:difficulty|난이도)\s*[:=]\s*(?:medium\b|중간)/i),
    R('DIFF-HIGH', '높음', /(?:difficulty|난이도)\s*[:=]\s*(?:high\b|높음)/i),
    R('DIFF-VERY-HIGH', '매우 높음', /(?:difficulty|난이도)\s*[:=]\s*(?:(?:very\s+high)\b|매우\s*높음)/i),
  ]),
  size: Object.freeze([
    R('SIZE-SMALL', '작음', /(?:size|크기)\s*[:=]\s*(?:(?:small|s)\b|작음)/i),
    R('SIZE-MEDIUM', '중간', /(?:size|크기)\s*[:=]\s*(?:(?:medium|m)\b|중간)/i),
    R('SIZE-LARGE', '큼', /(?:size|크기)\s*[:=]\s*(?:(?:large|l)\b|큼)/i),
    R('SIZE-VERY-LARGE', '매우 큼', /(?:size|크기)\s*[:=]\s*(?:(?:xl|very\s+large)\b|매우\s*큼)/i),
  ]),
});

function normalizeProposal(axis, proposal) {
  const value = proposal && typeof proposal === 'object' ? proposal.value : proposal;
  const rawReason = proposal && typeof proposal === 'object' ? proposal.reason : '';
  const reason = typeof rawReason === 'string' ? rawReason.trim() : '';
  return CANONICAL_VALUES[axis].includes(value)
    ? Object.freeze({ value, status: 'PROPOSED', reason: reason || 'EXPLICIT_CANONICAL_PROPOSAL' })
    : Object.freeze({ value: TBD, status: 'NEEDS_REVIEW', reason: reason || 'MISSING_OR_INVALID_PROPOSAL' });
}
function normalizeDependencyUnlock(value) { return value === true || value === false ? value : null; }

function draftIdeaClassification(input = {}) {
  const proposals = input && input.proposals && typeof input.proposals === 'object' ? input.proposals : {};
  const results = Object.fromEntries(Object.keys(CANONICAL_VALUES).map((axis) => [axis, normalizeProposal(axis, proposals[axis])]));
  const dependencyUnlock = normalizeDependencyUnlock(input.dependencyUnlock);
  const reviewAxes = Object.entries(results).filter(([, result]) => result.status === 'NEEDS_REVIEW').map(([axis]) => axis);
  if (dependencyUnlock === null) reviewAxes.push('dependencyUnlock');
  return Object.freeze({
    schemaVersion: 1,
    classification: Object.freeze(Object.fromEntries(Object.entries(results).map(([axis, result]) => [axis, result.value]))),
    dependencyUnlock,
    needsReview: reviewAxes.length > 0,
    reviewAxes: Object.freeze(reviewAxes),
    explanations: Object.freeze({ ...results, dependencyUnlock: Object.freeze({
      value: dependencyUnlock,
      status: dependencyUnlock === null ? 'NEEDS_REVIEW' : 'PROPOSED',
      reason: dependencyUnlock === null ? 'MISSING_OR_INVALID_PROPOSAL' : 'EXPLICIT_CANONICAL_PROPOSAL',
    }) }),
  });
}

function normalizeRawIdeaText(input = {}) {
  const value = (x) => typeof x === 'string' ? x : Array.isArray(x) ? x.map(value).filter(Boolean).join(' ') : '';
  const raw = typeof input === 'string' ? input : TEXT_FIELDS.map((field) => value(input && input[field])).filter(Boolean).join(' ');
  return raw.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
}
function inferAxisSignal(axis, text) {
  const matches = RAW_TEXT_SIGNAL_TABLE[axis].flatMap((rule) => {
    const match = text.match(rule.pattern);
    return match ? [Object.freeze({ ruleId: rule.id, value: rule.value, evidence: match[0] })] : [];
  });
  const candidates = Object.freeze([...new Set(matches.map((match) => match.value))]);
  if (candidates.length !== 1) return Object.freeze({ status: candidates.length > 1 ? 'CONFLICT' : 'NO_SIGNAL', proposal: null, candidates, matches: Object.freeze(matches) });
  const proposal = Object.freeze({ value: candidates[0], reason: `RAW_TEXT_SIGNAL:${matches.map((match) => match.ruleId).join(',')}` });
  return Object.freeze({ status: 'PROPOSED', proposal, candidates, matches: Object.freeze(matches) });
}
function inferIdeaClassificationSignals(input = {}) {
  const text = normalizeRawIdeaText(input);
  const axes = Object.fromEntries(Object.keys(CANONICAL_VALUES).map((axis) => [axis, inferAxisSignal(axis, text)]));
  return Object.freeze({
    schemaVersion: 1,
    source: Object.freeze({ fields: typeof input === 'string' ? Object.freeze(['text']) : TEXT_FIELDS, normalizedLength: text.length }),
    proposals: Object.freeze(Object.fromEntries(Object.entries(axes).filter(([, result]) => result.proposal).map(([axis, result]) => [axis, result.proposal]))),
    axes: Object.freeze(axes),
  });
}
function draftIdeaClassificationFromText(input = {}) {
  const inference = inferIdeaClassificationSignals(input);
  const explicit = input && typeof input === 'object' && input.proposals && typeof input.proposals === 'object' ? input.proposals : {};
  const proposals = {}, precedence = {};
  for (const axis of Object.keys(CANONICAL_VALUES)) {
    if (Object.prototype.hasOwnProperty.call(explicit, axis)) { proposals[axis] = explicit[axis]; precedence[axis] = 'EXPLICIT'; }
    else if (inference.proposals[axis]) { proposals[axis] = inference.proposals[axis]; precedence[axis] = 'INFERRED'; }
    else precedence[axis] = inference.axes[axis].status;
  }
  return Object.freeze({ ...draftIdeaClassification({ dependencyUnlock: input && typeof input === 'object' ? input.dependencyUnlock : undefined, proposals }),
    inference: Object.freeze({ source: inference.source, axes: inference.axes, precedence: Object.freeze(precedence) }) });
}

function readClassificationValue(idea, axis) {
  const nested = idea && idea.classification && idea.classification[axis];
  const value = nested !== undefined ? nested : idea && idea[axis];
  return CANONICAL_VALUES[axis].includes(value) ? value : TBD;
}
function dependencyUnlockRank(value) { return value === true ? 0 : value === false ? 1 : 2; }
function canonicalIdeaSortKey(idea = {}) {
  const importance = readClassificationValue(idea, 'importance'), difficulty = readClassificationValue(idea, 'difficulty'), size = readClassificationValue(idea, 'size');
  const id = typeof idea.id === 'string' && idea.id.trim() ? idea.id.trim() : '~';
  return Object.freeze([SORT_RANK.importance[importance], SORT_RANK.difficulty[difficulty], SORT_RANK.size[size], dependencyUnlockRank(idea.dependencyUnlock), id]);
}
function compareCanonicalIdeas(a, b) {
  const left = canonicalIdeaSortKey(a), right = canonicalIdeaSortKey(b);
  for (let index = 0; index < left.length - 1; index += 1) if (left[index] !== right[index]) return left[index] - right[index];
  return left[left.length - 1].localeCompare(right[right.length - 1]);
}
function sortCanonicalIdeas(ideas) {
  if (!Array.isArray(ideas)) throw new TypeError('ideas must be an array');
  return [...ideas].sort(compareCanonicalIdeas);
}

module.exports = { TBD, CANONICAL_VALUES, RAW_TEXT_SIGNAL_TABLE, draftIdeaClassification, inferIdeaClassificationSignals,
  draftIdeaClassificationFromText, canonicalIdeaSortKey, compareCanonicalIdeas, sortCanonicalIdeas };
