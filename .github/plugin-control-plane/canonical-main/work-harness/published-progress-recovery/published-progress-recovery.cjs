'use strict';

const {canonicalize, stableHash} = require('../handoff.cjs');

const MAX_INPUT_BYTES = 16 * 1024;
const FALSE_AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});
const FIELDS = Object.freeze({
  packetState: ['EXACT', 'DRIFTED', 'UNKNOWN'],
  stageState: ['VALIDATION_MERGE', 'OTHER', 'UNKNOWN'],
  leaseState: ['ACTIVE_EXACT', 'ABSENT', 'CONFLICT', 'UNKNOWN'],
  manifestState: ['EXACT', 'CONFLICT', 'UNKNOWN'],
  holderState: ['PRESENT_EXACT', 'ABSENT', 'CONFLICT', 'UNKNOWN'],
  sessionState: ['ABSENT', 'PRESENT', 'UNKNOWN'],
  workspaceState: ['CLEAN', 'DIRTY', 'CONFLICT', 'UNKNOWN'],
  publishedIdentityState: ['EXACT', 'CONFLICT', 'UNKNOWN'],
  prState: ['OPEN_EXACT', 'ABSENT', 'CONFLICT', 'UNKNOWN'],
  changedPathsState: ['EXACT', 'CONFLICT', 'UNKNOWN'],
  descendantState: ['PROVEN', 'CONFLICT', 'UNKNOWN'],
  releaseEligibility: ['PROVEN', 'BLOCKED', 'UNKNOWN'],
});
const LOCATOR_KEYS = Object.freeze([
  'packet', 'lease', 'manifest', 'holder', 'session', 'workspace',
  'publishedIdentity', 'pr', 'changedPaths', 'descendant', 'releaseEligibility',
]);
const INPUT_KEYS = new Set([
  'schemaVersion', 'mode', 'subject', ...Object.keys(FIELDS), 'locators',
]);
const SUBJECT_RE = /^(?:issue:#[1-9][0-9]*|fixture:[A-Za-z0-9._/-]{1,160})$/;

class PublishedProgressInputError extends Error {
  constructor(reasonCodes) {
    super(reasonCodes[0] || 'PUBLISHED_PROGRESS_INPUT_INVALID');
    this.reasonCodes = [...new Set(reasonCodes)].sort();
  }
}
function sensitiveText(text) {
  return /(authorization\s*:|bearer\s+|token\s*=|secret\s*=|api[_-]?key\s*=|gh[pousr]_[A-Za-z0-9_]{8,}|github_pat_[A-Za-z0-9_]+)/i.test(text);
}
function atom(value, field, reasons, maxBytes = 320) {
  if (typeof value !== 'string' || !value.trim()) {
    reasons.push('INPUT_FIELD_INVALID:' + field);
    return null;
  }
  const text = value.trim();
  if (Buffer.byteLength(text, 'utf8') > maxBytes) reasons.push('INPUT_FIELD_TOO_LARGE:' + field);
  if (/[\u0000-\u001f\u007f]/.test(text)) reasons.push('INPUT_FIELD_CONTROL_CHAR:' + field);
  if (sensitiveText(text)) reasons.push('INPUT_FIELD_SENSITIVE:' + field);
  return text;
}
function exactKeys(value, allowed, field, reasons) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    reasons.push('INPUT_OBJECT_REQUIRED:' + field);
    return false;
  }
  for (const key of Object.keys(value)) if (!allowed.has(key)) reasons.push('INPUT_FIELD_UNSUPPORTED:' + field + '.' + key);
  for (const key of allowed) if (!(key in value)) reasons.push('INPUT_FIELD_MISSING:' + field + '.' + key);
  return true;
}
function enumValue(input, field, reasons) {
  const value = atom(input[field], field, reasons, 64);
  if (value && !FIELDS[field].includes(value)) reasons.push('INPUT_ENUM_INVALID:' + field);
  return value;
}
function normalizeLocators(input, reasons) {
  if (!exactKeys(input, new Set(LOCATOR_KEYS), 'locators', reasons)) return {};
  const out = {};
  for (const key of LOCATOR_KEYS) {
    const value = atom(input[key], 'locators.' + key, reasons);
    if (value) out[key] = value;
  }
  return out;
}
function normalizeEvidence(input) {
  const reasons = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new PublishedProgressInputError(['INPUT_OBJECT_REQUIRED']);
  if (Buffer.byteLength(JSON.stringify(input), 'utf8') > MAX_INPUT_BYTES) throw new PublishedProgressInputError(['INPUT_TOO_LARGE']);
  exactKeys(input, INPUT_KEYS, 'input', reasons);
  if (input.schemaVersion !== 1) reasons.push('INPUT_SCHEMA_UNSUPPORTED');
  if (input.mode !== 'PUBLISHED_PROGRESS_RECOVERY_EVIDENCE') reasons.push('INPUT_MODE_UNSUPPORTED');
  const subject = atom(input.subject, 'subject', reasons, 200);
  if (subject && !SUBJECT_RE.test(subject)) reasons.push('INPUT_SUBJECT_INVALID');
  const out = {schemaVersion: 1, mode: 'PUBLISHED_PROGRESS_RECOVERY_EVIDENCE', subject};
  for (const field of Object.keys(FIELDS)) out[field] = enumValue(input, field, reasons);
  out.locators = normalizeLocators(input.locators, reasons);
  if (reasons.length) throw new PublishedProgressInputError(reasons);
  return canonicalize(out);
}
function decision(kind, reasonCode, locatorKey, constraint, nextLegalAction) {
  const pass = kind === 'PUBLISHED_PROGRESS_REBIND_ELIGIBLE';
  const conflict = kind === 'CONFLICT';
  const blocked = kind === 'BLOCKED';
  return {
    recoveryDisposition: kind,
    result: pass ? 'PASS' : conflict ? 'CONFLICT' : blocked ? 'BLOCKED' : 'UNKNOWN',
    attentionDisposition: pass ? 'COMPLETE' : conflict ? 'CONFLICT' : blocked ? 'BLOCKED' : kind === 'NEEDS_REVIEW' ? 'NEEDS_REVIEW' : 'UNKNOWN',
    publishedProgress: pass ? 'EXACT_PRESERVED' : 'UNPROVEN',
    reasonCode: pass ? null : reasonCode,
    locatorKey: pass ? null : locatorKey,
    constraint: pass ? null : constraint,
    nextLegalAction,
  };
}
function conflict(reason, key) {
  return decision('CONFLICT', reason, key, 'NO_REBIND_WITH_CONFLICTING_PUBLISHED_IDENTITY', 'SEMANTIC_REVIEW_REQUIRED');
}
function unknown(reason, key) {
  return decision('UNKNOWN', reason, key, 'NO_REBIND_WITH_UNRESOLVED_PUBLISHED_IDENTITY', 'TARGETED_DRILLDOWN_REQUIRED');
}
function review(reason, key) {
  return decision('NEEDS_REVIEW', reason, key, 'NO_REBIND_WITHOUT_SESSION_OR_IDENTITY_REVIEW', 'SEMANTIC_REVIEW_REQUIRED');
}
function blocked(reason, key) {
  return decision('BLOCKED', reason, key, 'PUBLISHED_PROGRESS_RECOVERY_BLOCKED', 'RESOLVE_RECOVERY_BLOCKER');
}
function classifyNormalized(e) {
  const conflicts = [
    [e.packetState === 'DRIFTED', 'PACKET_AUTHORITY_CONFLICT', 'packet'],
    [e.stageState === 'OTHER', 'PACKET_STAGE_CONFLICT', 'packet'],
    [e.leaseState === 'CONFLICT', 'LEASE_AUTHORITY_CONFLICT', 'lease'],
    [e.manifestState === 'CONFLICT', 'MANIFEST_AUTHORITY_CONFLICT', 'manifest'],
    [e.holderState === 'CONFLICT', 'HOLDER_AUTHORITY_CONFLICT', 'holder'],
    [e.workspaceState === 'CONFLICT', 'WORKSPACE_STATE_CONFLICT', 'workspace'],
    [e.publishedIdentityState === 'CONFLICT', 'PUBLISHED_HEAD_IDENTITY_CONFLICT', 'publishedIdentity'],
    [e.prState === 'CONFLICT', 'PR_IDENTITY_CONFLICT', 'pr'],
    [e.changedPathsState === 'CONFLICT', 'PR_CHANGED_PATHS_CONFLICT', 'changedPaths'],
    [e.descendantState === 'CONFLICT', 'PUBLISHED_HEAD_ANCESTRY_CONFLICT', 'descendant'],
  ];
  for (const [matched, reason, key] of conflicts) if (matched) return conflict(reason, key);

  if (e.sessionState === 'PRESENT') return review('OWNER_SESSION_PRESENT', 'session');
  if (e.workspaceState === 'DIRTY') return blocked('DIRTY_WORKSPACE_BLOCKS_PUBLISHED_PROGRESS_RECOVERY', 'workspace');
  if (e.releaseEligibility === 'BLOCKED') return blocked('D013_RELEASE_NOT_ELIGIBLE', 'releaseEligibility');

  const unknowns = [
    [e.packetState === 'UNKNOWN', 'PACKET_AUTHORITY_UNRESOLVED', 'packet'],
    [e.stageState === 'UNKNOWN', 'PACKET_STAGE_UNRESOLVED', 'packet'],
    [e.leaseState !== 'ACTIVE_EXACT', 'ACTIVE_LEASE_NOT_PROVEN', 'lease'],
    [e.manifestState !== 'EXACT', 'MANIFEST_AUTHORITY_UNRESOLVED', 'manifest'],
    [e.holderState !== 'PRESENT_EXACT', 'HOLDER_AUTHORITY_UNRESOLVED', 'holder'],
    [e.sessionState === 'UNKNOWN', 'SESSION_AUTHORITY_UNRESOLVED', 'session'],
    [e.workspaceState === 'UNKNOWN', 'WORKSPACE_STATE_UNRESOLVED', 'workspace'],
    [e.publishedIdentityState === 'UNKNOWN', 'PUBLISHED_HEAD_IDENTITY_UNRESOLVED', 'publishedIdentity'],
    [e.prState !== 'OPEN_EXACT', 'OPEN_PR_NOT_PROVEN', 'pr'],
    [e.changedPathsState === 'UNKNOWN', 'PR_CHANGED_PATHS_UNRESOLVED', 'changedPaths'],
    [e.descendantState === 'UNKNOWN', 'PUBLISHED_HEAD_ANCESTRY_UNRESOLVED', 'descendant'],
    [e.releaseEligibility === 'UNKNOWN', 'D013_RELEASE_ELIGIBILITY_UNRESOLVED', 'releaseEligibility'],
  ];
  for (const [matched, reason, key] of unknowns) if (matched) return unknown(reason, key);

  return decision('PUBLISHED_PROGRESS_REBIND_ELIGIBLE', null, null, null, 'PUBLISHED_PROGRESS_RECOVERY_EFFECT_REVIEW');
}
function classifyPublishedProgressEvidence(input) {
  return classifyNormalized(normalizeEvidence(input));
}
function projectPublishedProgressEvidence(input) {
  const evidence = normalizeEvidence(input);
  const decisionValue = classifyNormalized(evidence);
  return {
    schemaVersion: 1,
    mode: 'PUBLISHED_PROGRESS_RECOVERY_DECISION',
    validity: 'VALID',
    subject: evidence.subject,
    evidenceDigest: 'sha256:' + stableHash(evidence),
    recoveryDisposition: decisionValue.recoveryDisposition,
    result: decisionValue.result,
    attentionDisposition: decisionValue.attentionDisposition,
    publishedProgress: decisionValue.publishedProgress,
    reasonCode: decisionValue.reasonCode,
    constraint: decisionValue.constraint,
    nextLegalAction: decisionValue.nextLegalAction,
    locator: decisionValue.locatorKey ? evidence.locators[decisionValue.locatorKey] : evidence.locators.pr,
    authority: {...FALSE_AUTHORITY},
  };
}

module.exports = {
  FALSE_AUTHORITY,
  FIELDS,
  LOCATOR_KEYS,
  PublishedProgressInputError,
  classifyPublishedProgressEvidence,
  normalizeEvidence,
  projectPublishedProgressEvidence,
};
