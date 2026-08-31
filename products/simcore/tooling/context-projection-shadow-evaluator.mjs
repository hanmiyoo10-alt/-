const ROLE_CLASS = Object.freeze({
  USER: 'USER',
  ASSISTANT: 'ASSISTANT',
  NON_CONVERSATION: 'NON_CONVERSATION',
  UNKNOWN: 'UNKNOWN',
});

const NON_CONVERSATION_ROLES = new Set(['system', 'developer', 'tool', 'function']);
const ASSISTANT_ROLES = new Set(['assistant', 'char']);

function classifyRole(role) {
  const value = String(role ?? '').trim().toLowerCase();
  if (value === 'user') return ROLE_CLASS.USER;
  if (ASSISTANT_ROLES.has(value)) return ROLE_CLASS.ASSISTANT;
  if (NON_CONVERSATION_ROLES.has(value)) return ROLE_CLASS.NON_CONVERSATION;
  return ROLE_CLASS.UNKNOWN;
}

function contentChars(content) {
  if (typeof content === 'string') return content.length;
  if (content == null) return 0;
  try { return JSON.stringify(content).length; }
  catch (_) { return 0; }
}

function isIndex(value, length) {
  return Number.isInteger(value) && value >= 0 && value < length;
}

function baseResult(status, reason, messages) {
  const originalContentChars = messages.reduce((sum, row) => sum + contentChars(row?.content), 0);
  return {
    schema: 1,
    candidate: 'ROOT_PREFIX_CUT',
    executionMode: 'SHADOW_ONLY',
    applied: false,
    activeProjectionAuthorized: false,
    status,
    reason,
    originalMessages: messages.length,
    originalContentChars,
    projectedMessages: messages.length,
    projectedContentChars: originalContentChars,
    candidateExcludedMessages: 0,
    candidateExcludedContentChars: 0,
    candidateExcludedIndices: [],
    keptIndices: messages.map((_, index) => index),
    unknownKeptCount: messages.filter((row) => classifyRole(row?.role) === ROLE_CLASS.UNKNOWN).length,
    contentReductionRatio: 0,
    semanticSafety: 'NOT_EVALUATED',
  };
}

function validateAnchors(fixture, messages) {
  const { rootIndex, sourceIndex, currentUserIndex } = fixture;
  if (!isIndex(rootIndex, messages.length)) return 'ROOT_INDEX_INVALID';
  if (!isIndex(sourceIndex, messages.length)) return 'SOURCE_INDEX_INVALID';
  if (!isIndex(currentUserIndex, messages.length)) return 'CURRENT_USER_INDEX_INVALID';
  if (!(rootIndex < sourceIndex && sourceIndex < currentUserIndex)) return 'ANCHOR_ORDER_INVALID';
  if (classifyRole(messages[rootIndex]?.role) !== ROLE_CLASS.USER) return 'ROOT_ROLE_INVALID';
  if (classifyRole(messages[sourceIndex]?.role) !== ROLE_CLASS.ASSISTANT) return 'SOURCE_ROLE_INVALID';
  if (classifyRole(messages[currentUserIndex]?.role) !== ROLE_CLASS.USER) return 'CURRENT_USER_ROLE_INVALID';

  for (let index = rootIndex + 1; index < sourceIndex; index += 1) {
    if (classifyRole(messages[index]?.role) === ROLE_CLASS.ASSISTANT) return 'SOURCE_NOT_FIRST_ASSISTANT_AFTER_ROOT';
  }
  return null;
}

/**
 * Offline fixture evaluator for the frozen Mode C ROOT_PREFIX_CUT design.
 *
 * Fixture fields are evaluator-contract fields, not production runtime fields.
 * Evidence/Lineage authority is supplied to this evaluator; it is never re-derived here.
 */
export function evaluateRootPrefixCutShadow(fixture) {
  const messages = Array.isArray(fixture?.messages) ? fixture.messages : [];
  if (!Array.isArray(fixture?.messages)) return baseResult('FALLBACK', 'MESSAGES_NOT_ARRAY', messages);

  if (String(fixture?.mode || '') !== 'C') return baseResult('INELIGIBLE', 'MODE_NOT_C', messages);
  if (fixture?.sourceAnchoredShortC !== true) return baseResult('INELIGIBLE', 'SHORT_C_SOURCE_ANCHOR_NOT_PROVEN', messages);
  if (String(fixture?.evidenceDisposition || '') !== 'DUAL') return baseResult('INELIGIBLE', 'EVIDENCE_NOT_DUAL', messages);

  const anchorError = validateAnchors(fixture, messages);
  if (anchorError) return baseResult('FALLBACK', anchorError, messages);

  const candidateExcludedIndices = [];
  const keptIndices = [];
  let candidateExcludedContentChars = 0;
  let projectedContentChars = 0;
  let unknownKeptCount = 0;

  for (let index = 0; index < messages.length; index += 1) {
    const row = messages[index] || {};
    const roleClass = classifyRole(row.role);
    const chars = contentChars(row.content);
    const candidate = index < fixture.rootIndex
      && (roleClass === ROLE_CLASS.USER || roleClass === ROLE_CLASS.ASSISTANT);

    if (candidate) {
      candidateExcludedIndices.push(index);
      candidateExcludedContentChars += chars;
      continue;
    }

    keptIndices.push(index);
    projectedContentChars += chars;
    if (roleClass === ROLE_CLASS.UNKNOWN) unknownKeptCount += 1;
  }

  const originalContentChars = messages.reduce((sum, row) => sum + contentChars(row?.content), 0);
  const status = candidateExcludedIndices.length > 0 ? 'ELIGIBLE_SHADOW_PLAN' : 'ELIGIBLE_NO_REDUCTION';
  const reason = candidateExcludedIndices.length > 0 ? 'PRE_ROOT_CONVERSATION_PREFIX_FOUND' : 'NO_PRE_ROOT_CONVERSATION_PREFIX';

  return {
    schema: 1,
    candidate: 'ROOT_PREFIX_CUT',
    executionMode: 'SHADOW_ONLY',
    applied: false,
    activeProjectionAuthorized: false,
    status,
    reason,
    rootIndex: fixture.rootIndex,
    sourceIndex: fixture.sourceIndex,
    currentUserIndex: fixture.currentUserIndex,
    originalMessages: messages.length,
    originalContentChars,
    projectedMessages: keptIndices.length,
    projectedContentChars,
    candidateExcludedMessages: candidateExcludedIndices.length,
    candidateExcludedContentChars,
    candidateExcludedIndices,
    keptIndices,
    unknownKeptCount,
    contentReductionRatio: originalContentChars > 0
      ? candidateExcludedContentChars / originalContentChars
      : 0,
    semanticSafety: candidateExcludedIndices.length > 0 ? 'UNPROVEN_REVIEW_REQUIRED' : 'NO_REDUCTION',
  };
}

export function materializeHypotheticalProjection(fixture, plan = evaluateRootPrefixCutShadow(fixture)) {
  const messages = Array.isArray(fixture?.messages) ? fixture.messages : [];
  if (plan.status !== 'ELIGIBLE_SHADOW_PLAN') return messages.slice();
  const excluded = new Set(plan.candidateExcludedIndices);
  return messages.filter((_, index) => !excluded.has(index));
}

export { classifyRole, contentChars, ROLE_CLASS };
