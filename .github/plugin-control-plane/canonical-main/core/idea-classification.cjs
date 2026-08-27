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

const RAW_TEXT_FIELDS = Object.freeze(['title', 'problem', 'benefit', 'notes']);

function signalRule(id, value, pattern) {
  return Object.freeze({ id, value, pattern: Object.freeze(pattern) });
}

const RAW_TEXT_SIGNAL_TABLE = Object.freeze({
  systemImpact: Object.freeze([
    signalRule('SYS-NO-EXPLICIT', 'NO_SYSTEM_UPDATE', /(?:system[\s_-]*impact|시스템\s*영향)\s*[:=]\s*no_system_update\b/i),
    signalRule('SYS-NO-LEGACY', 'NO_SYSTEM_UPDATE', /\bupdate\s*:\s*n\b/i),
    signalRule('SYS-NO-PHRASE-EN', 'NO_SYSTEM_UPDATE', /\b(?:no system update|docs?-only|documentation-only)\b/i),
    signalRule('SYS-NO-PHRASE-KO', 'NO_SYSTEM_UPDATE', /(?:시스템\s*업데이트\s*(?:없음|불필요)|문서\s*만\s*(?:변경|수정))/i),
    signalRule('SYS-YES-EXPLICIT', 'SYSTEM_UPDATE_REQUIRED', /(?:system[\s_-]*impact|시스템\s*영향)\s*[:=]\s*system_update_required\b/i),
    signalRule('SYS-YES-LEGACY', 'SYSTEM_UPDATE_REQUIRED', /\bupdate\s*:\s*y\b/i),
    signalRule('SYS-YES-CHANGE-EN', 'SYSTEM_UPDATE_REQUIRED', /\b(?:add|change|modify|update|replace|remove)\s+(?:a\s+|the\s+)?(?:github\s+actions?\s+)?(?:workflow|ci|runtime|release|writer|mutation|automation|control[- ]plane)\b/i),
    signalRule('SYS-YES-REQUIRED-EN', 'SYSTEM_UPDATE_REQUIRED', /\b(?:workflow|ci|runtime|release|writer|mutation|automation|control[- ]plane)\s+(?:change|update|modification|addition)\s+required\b/i),
    signalRule('SYS-YES-CHANGE-KO', 'SYSTEM_UPDATE_REQUIRED', /(?:워크플로|ci|런타임|릴리스|writer|뮤테이션|자동화|컨트롤\s*플레인)\s*(?:변경|추가|수정)\s*(?:필요|함|한다)/i),
  ]),
  importance: Object.freeze([
    signalRule('IMP-TOP', '최상', /(?:importance|중요도)\s*[:=]\s*(?:(?:very\s+high)\b|최상)/i),
    signalRule('IMP-HIGH', '높음', /(?:importance|중요도)\s*[:=]\s*(?:high\b|높음)/i),
    signalRule('IMP-MEDIUM', '중간', /(?:importance|중요도)\s*[:=]\s*(?:medium\b|중간)/i),
    signalRule('IMP-LOW', '낮음', /(?:importance|중요도)\s*[:=]\s*(?:low\b|낮음)/i),
  ]),
  difficulty: Object.freeze([
    signalRule('DIFF-LOW', '낮음', /(?:difficulty|난이도)\s*[:=]\s*(?:low\b|낮음)/i),
    signalRule('DIFF-MEDIUM', '중간', /(?:difficulty|난이도)\s*[:=]\s*(?:medium\b|중간)/i),
    signalRule('DIFF-HIGH', '높음', /(?:difficulty|난이도)\s*[:=]\s*(?:high\b|높음)/i),
    signalRule('DIFF-VERY-HIGH', '매우 높음', /(?:difficulty|난이도)\s*[:=]\s*(?:(?:very\s+high)\b|매우\s*높음)/i),
  ]),
  size: Object.freeze([
    signalRule('SIZE-SMALL', '작음', /(?:size|크기)\s*[:=]\s*(?:(?:small|s)\b|작음)/i),
    signalRule('SIZE-MEDIUM', '중간', /(?:size|크기)\s*[:=]\s*(?:(?:medium|m)\b|중간)/i),
    signalRule('SIZE-LARGE', '큼', /(?:size|크기)\s*[:=]\s*(?:(?:large|l)\b|큼)/i),
    signalRule('SIZE-VERY-LARGE', '매우 큼', /(?:size|크기)\s*[:=]\s*(?:(?:xl|very\s+large)\b|매우\s*큼)/i),
  ]),
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

function normalizeRawTextValue(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(normalizeRawTextValue).filter(Boolean).join(' ');
  return '';
}

function normalizeRawIdeaText(input = {}) {
  const raw = typeof input === 'string'
    ? input
    : RAW_TEXT_FIELDS.map((field) => normalizeRawTextValue(input && input[field])).filter(Boolean).join(' ');

  return raw
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function freezeMatches(matches) {
  return Object.freeze(matches.map((match) => Object.freeze({ ...match })));
}

function inferAxisSignal(axis, normalizedText) {
  const rules = RAW_TEXT_SIGNAL_TABLE[axis];
  const matches = [];

  for (const rule of rules) {
    const match = normalizedText.match(rule.pattern);
    if (!match) continue;
    matches.push({
      ruleId: rule.id,
      value: rule.value,
      evidence: match[0],
    });
  }

  const candidates = [...new Set(matches.map((match) => match.value))];
  const frozenMatches = freezeMatches(matches);
  const frozenCandidates = Object.freeze([...candidates]);

  if (candidates.length === 1) {
    const ruleIds = matches.map((match) => match.ruleId);
    return Object.freeze({
      status: 'PROPOSED',
      proposal: Object.freeze({
        value: candidates[0],
        reason: `RAW_TEXT_SIGNAL:${ruleIds.join(',')}`,
      }),
      candidates: frozenCandidates,
      matches: frozenMatches,
    });
  }

  return Object.freeze({
    status: candidates.length > 1 ? 'CONFLICT' : 'NO_SIGNAL',
    proposal: null,
    candidates: frozenCandidates,
    matches: frozenMatches,
  });
}

function inferIdeaClassificationSignals(input = {}) {
  const normalizedText = normalizeRawIdeaText(input);
  const axes = {};
  const proposals = {};

  for (const axis of Object.keys(CANONICAL_VALUES)) {
    const result = inferAxisSignal(axis, normalizedText);
    axes[axis] = result;
    if (result.proposal) proposals[axis] = result.proposal;
  }

  return Object.freeze({
    schemaVersion: 1,
    source: Object.freeze({
      fields: typeof input === 'string' ? Object.freeze(['text']) : RAW_TEXT_FIELDS,
      normalizedLength: normalizedText.length,
    }),
    proposals: Object.freeze({ ...proposals }),
    axes: Object.freeze({ ...axes }),
  });
}

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function draftIdeaClassificationFromText(input = {}) {
  const inference = inferIdeaClassificationSignals(input);
  const explicitProposals = input && typeof input === 'object' && input.proposals && typeof input.proposals === 'object'
    ? input.proposals
    : {};
  const mergedProposals = {};
  const precedence = {};

  for (const axis of Object.keys(CANONICAL_VALUES)) {
    if (hasOwn(explicitProposals, axis)) {
      mergedProposals[axis] = explicitProposals[axis];
      precedence[axis] = 'EXPLICIT';
    } else if (inference.proposals[axis]) {
      mergedProposals[axis] = inference.proposals[axis];
      precedence[axis] = 'INFERRED';
    } else {
      precedence[axis] = inference.axes[axis].status;
    }
  }

  const draft = draftIdeaClassification({
    dependencyUnlock: input && typeof input === 'object' ? input.dependencyUnlock : undefined,
    proposals: mergedProposals,
  });

  return Object.freeze({
    ...draft,
    inference: Object.freeze({
      source: inference.source,
      axes: inference.axes,
      precedence: Object.freeze({ ...precedence }),
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
  RAW_TEXT_SIGNAL_TABLE,
  draftIdeaClassification,
  inferIdeaClassificationSignals,
  draftIdeaClassificationFromText,
  canonicalIdeaSortKey,
  compareCanonicalIdeas,
  sortCanonicalIdeas,
};
