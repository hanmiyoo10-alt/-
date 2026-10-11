'use strict';

const {canonicalize, stableHash} = require('../handoff.cjs');

const MAX_INPUT_BYTES = 24 * 1024;
const FALSE_AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});

const ENUMS = Object.freeze({
  packetState: ['EXACT', 'CONFLICT', 'UNKNOWN'],
  validationStageState: ['COMPATIBLE', 'CONFLICT', 'UNKNOWN'],
  mergeState: ['MERGED', 'NOT_MERGED', 'AMBIGUOUS', 'UNKNOWN'],
  validationState: ['PASS', 'FAIL', 'CONFLICT', 'UNKNOWN'],
  stageReceiptState: ['PASS', 'ABSENT', 'FAIL', 'CONFLICT', 'UNKNOWN'],
  stageReceiptNextAction: ['POSTMERGE_CONVERGENCE', 'OTHER', 'UNKNOWN'],
  coordinationState: ['NOT_APPLICABLE', 'COMPLETE', 'INCOMPLETE', 'CONFLICT', 'UNKNOWN'],
  workspaceState: ['NOT_APPLICABLE', 'CLEAN', 'DIRTY', 'CONFLICT', 'UNKNOWN'],
  requiredUnknownState: ['NONE', 'PRESENT', 'CONFLICT', 'UNKNOWN'],
});

const INPUT_KEYS = new Set([
  'schemaVersion', 'mode', 'subject', 'packetRef', 'packetState',
  'validationStageState', 'expected', 'mergeEvidence', 'validationEvidence',
  'stageReceipt', 'coordinationState', 'workspaceState',
  'requiredUnknownState', 'sourceRefs',
]);
const EXPECTED_KEYS = new Set(['prNumber', 'candidateHead', 'diffIdentity', 'pathScopeDigest']);
const MERGE_KEYS = new Set([
  'state', 'prNumber', 'candidateHead', 'mergeCommit', 'diffIdentity', 'pathScopeDigest',
]);
const VALIDATION_KEYS = new Set(['state', 'candidateHead', 'diffIdentity']);
const RECEIPT_KEYS = new Set([
  'state', 'packetRef', 'prNumber', 'candidateHead', 'mergeCommit',
  'diffIdentity', 'pathScopeDigest', 'nextLegalAction',
]);

const PACKET_RE = /^#[1-9][0-9]*$/;
const SUBJECT_RE = /^(?:issue:#[1-9][0-9]*|fixture:[A-Za-z0-9._/-]{1,160})$/;
const SHA40_RE = /^[0-9a-f]{40}$/;
const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;
const SOURCE_REF_RE = /^[A-Za-z][A-Za-z0-9+._:/#@-]{1,240}$/;

class ValidationFinalizationInputError extends Error {
  constructor(reasonCodes) {
    const unique = [...new Set(reasonCodes)].sort();
    super(unique[0] || 'VALIDATION_FINALIZATION_INPUT_INVALID');
    this.reasonCodes = unique;
  }
}

function sensitiveText(text) {
  return /(authorization\s*:|bearer\s+|token\s*=|secret\s*=|api[_-]?key\s*=|gh[pousr]_[A-Za-z0-9_]{8,}|github_pat_[A-Za-z0-9_]+)/i.test(text);
}

function exactKeys(value, allowed, field, reasons) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    reasons.push('INPUT_OBJECT_REQUIRED:' + field);
    return false;
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) reasons.push('INPUT_FIELD_UNSUPPORTED:' + field + '.' + key);
  }
  for (const key of allowed) {
    if (!(key in value)) reasons.push('INPUT_FIELD_MISSING:' + field + '.' + key);
  }
  return true;
}

function textAtom(value, field, reasons, pattern, maxBytes = 256, nullable = false) {
  if (nullable && value === null) return null;
  if (typeof value !== 'string' || !value.trim()) {
    reasons.push('INPUT_FIELD_INVALID:' + field);
    return null;
  }
  const text = value.trim();
  if (Buffer.byteLength(text, 'utf8') > maxBytes) reasons.push('INPUT_FIELD_TOO_LARGE:' + field);
  if (/[\u0000-\u001f\u007f]/.test(text)) reasons.push('INPUT_FIELD_CONTROL_CHAR:' + field);
  if (sensitiveText(text)) reasons.push('INPUT_FIELD_SENSITIVE:' + field);
  if (pattern && !pattern.test(text)) reasons.push('INPUT_FIELD_FORMAT_INVALID:' + field);
  return text;
}

function integerAtom(value, field, reasons, nullable = false) {
  if (nullable && value === null) return null;
  if (!Number.isInteger(value) || value < 1 || value > 2147483647) {
    reasons.push('INPUT_FIELD_INVALID:' + field);
    return null;
  }
  return value;
}

function enumAtom(value, field, values, reasons) {
  const text = textAtom(value, field, reasons, null, 64);
  if (text && !values.includes(text)) reasons.push('INPUT_ENUM_INVALID:' + field);
  return text;
}

function sourceRefs(value, reasons) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 16) {
    reasons.push('INPUT_SOURCE_REFS_INVALID');
    return [];
  }
  const refs = [];
  for (let i = 0; i < value.length; i += 1) {
    const ref = textAtom(value[i], 'sourceRefs[' + i + ']', reasons, SOURCE_REF_RE, 240);
    if (ref) refs.push(ref);
  }
  if (new Set(refs).size !== refs.length) reasons.push('INPUT_SOURCE_REFS_DUPLICATE');
  return refs;
}

function normalizeExpected(value, reasons) {
  if (!exactKeys(value, EXPECTED_KEYS, 'expected', reasons)) return {};
  return {
    prNumber: integerAtom(value.prNumber, 'expected.prNumber', reasons),
    candidateHead: textAtom(value.candidateHead, 'expected.candidateHead', reasons, SHA40_RE, 40),
    diffIdentity: textAtom(value.diffIdentity, 'expected.diffIdentity', reasons, DIGEST_RE, 71),
    pathScopeDigest: textAtom(value.pathScopeDigest, 'expected.pathScopeDigest', reasons, DIGEST_RE, 71),
  };
}

function normalizeMerge(value, reasons) {
  if (!exactKeys(value, MERGE_KEYS, 'mergeEvidence', reasons)) return {};
  return {
    state: enumAtom(value.state, 'mergeEvidence.state', ENUMS.mergeState, reasons),
    prNumber: integerAtom(value.prNumber, 'mergeEvidence.prNumber', reasons, true),
    candidateHead: textAtom(value.candidateHead, 'mergeEvidence.candidateHead', reasons, SHA40_RE, 40, true),
    mergeCommit: textAtom(value.mergeCommit, 'mergeEvidence.mergeCommit', reasons, SHA40_RE, 40, true),
    diffIdentity: textAtom(value.diffIdentity, 'mergeEvidence.diffIdentity', reasons, DIGEST_RE, 71, true),
    pathScopeDigest: textAtom(value.pathScopeDigest, 'mergeEvidence.pathScopeDigest', reasons, DIGEST_RE, 71, true),
  };
}

function normalizeValidation(value, reasons) {
  if (!exactKeys(value, VALIDATION_KEYS, 'validationEvidence', reasons)) return {};
  return {
    state: enumAtom(value.state, 'validationEvidence.state', ENUMS.validationState, reasons),
    candidateHead: textAtom(value.candidateHead, 'validationEvidence.candidateHead', reasons, SHA40_RE, 40, true),
    diffIdentity: textAtom(value.diffIdentity, 'validationEvidence.diffIdentity', reasons, DIGEST_RE, 71, true),
  };
}

function normalizeReceipt(value, reasons) {
  if (!exactKeys(value, RECEIPT_KEYS, 'stageReceipt', reasons)) return {};
  return {
    state: enumAtom(value.state, 'stageReceipt.state', ENUMS.stageReceiptState, reasons),
    packetRef: textAtom(value.packetRef, 'stageReceipt.packetRef', reasons, PACKET_RE, 32, true),
    prNumber: integerAtom(value.prNumber, 'stageReceipt.prNumber', reasons, true),
    candidateHead: textAtom(value.candidateHead, 'stageReceipt.candidateHead', reasons, SHA40_RE, 40, true),
    mergeCommit: textAtom(value.mergeCommit, 'stageReceipt.mergeCommit', reasons, SHA40_RE, 40, true),
    diffIdentity: textAtom(value.diffIdentity, 'stageReceipt.diffIdentity', reasons, DIGEST_RE, 71, true),
    pathScopeDigest: textAtom(value.pathScopeDigest, 'stageReceipt.pathScopeDigest', reasons, DIGEST_RE, 71, true),
    nextLegalAction: enumAtom(
      value.nextLegalAction,
      'stageReceipt.nextLegalAction',
      ENUMS.stageReceiptNextAction,
      reasons,
    ),
  };
}

function normalizeEvidence(input) {
  const reasons = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationFinalizationInputError(['INPUT_OBJECT_REQUIRED']);
  }
  if (Buffer.byteLength(JSON.stringify(input), 'utf8') > MAX_INPUT_BYTES) {
    throw new ValidationFinalizationInputError(['INPUT_TOO_LARGE']);
  }
  exactKeys(input, INPUT_KEYS, 'input', reasons);
  if (input.schemaVersion !== 1) reasons.push('INPUT_SCHEMA_UNSUPPORTED');
  if (input.mode !== 'VALIDATION_FINALIZATION_EVIDENCE') reasons.push('INPUT_MODE_UNSUPPORTED');

  const normalized = {
    schemaVersion: 1,
    mode: 'VALIDATION_FINALIZATION_EVIDENCE',
    subject: textAtom(input.subject, 'subject', reasons, SUBJECT_RE, 200),
    packetRef: textAtom(input.packetRef, 'packetRef', reasons, PACKET_RE, 32),
    packetState: enumAtom(input.packetState, 'packetState', ENUMS.packetState, reasons),
    validationStageState: enumAtom(
      input.validationStageState,
      'validationStageState',
      ENUMS.validationStageState,
      reasons,
    ),
    expected: normalizeExpected(input.expected, reasons),
    mergeEvidence: normalizeMerge(input.mergeEvidence, reasons),
    validationEvidence: normalizeValidation(input.validationEvidence, reasons),
    stageReceipt: normalizeReceipt(input.stageReceipt, reasons),
    coordinationState: enumAtom(
      input.coordinationState,
      'coordinationState',
      ENUMS.coordinationState,
      reasons,
    ),
    workspaceState: enumAtom(
      input.workspaceState,
      'workspaceState',
      ENUMS.workspaceState,
      reasons,
    ),
    requiredUnknownState: enumAtom(
      input.requiredUnknownState,
      'requiredUnknownState',
      ENUMS.requiredUnknownState,
      reasons,
    ),
    sourceRefs: sourceRefs(input.sourceRefs, reasons),
  };
  if (reasons.length) throw new ValidationFinalizationInputError(reasons);
  return canonicalize(normalized);
}

function sameIdentity(expected, observed) {
  return observed.prNumber === expected.prNumber
    && observed.candidateHead === expected.candidateHead
    && observed.diffIdentity === expected.diffIdentity
    && observed.pathScopeDigest === expected.pathScopeDigest;
}

function decision(finalizationDisposition, {
  result,
  attentionDisposition,
  reasonCode = null,
  requiredEffectClasses = [],
  nextLegalAction,
}) {
  return {
    finalizationDisposition,
    result,
    attentionDisposition,
    reasonCode,
    requiredEffectClasses: [...requiredEffectClasses].sort(),
    nextLegalAction,
  };
}

function classifyNormalized(e) {
  const conflict = (reasonCode) => decision('CONFLICT', {
    result: 'CONFLICT',
    attentionDisposition: 'CONFLICT',
    reasonCode,
    nextLegalAction: 'SEMANTIC_REVIEW_REQUIRED',
  });
  const unknown = (reasonCode) => decision('UNKNOWN', {
    result: 'UNKNOWN',
    attentionDisposition: 'UNKNOWN',
    reasonCode,
    nextLegalAction: 'TARGETED_DRILLDOWN_REQUIRED',
  });
  const blocked = (reasonCode) => decision('BLOCKED', {
    result: 'BLOCKED',
    attentionDisposition: 'BLOCKED',
    reasonCode,
    nextLegalAction: 'RESOLVE_VALIDATION_FINALIZATION_BLOCKER',
  });

  if (e.packetState === 'CONFLICT') return conflict('PACKET_IDENTITY_CONFLICT');
  if (e.validationStageState === 'CONFLICT') return conflict('VALIDATION_STAGE_CONFLICT');
  if (e.validationEvidence.state === 'CONFLICT') return conflict('HEAD_BOUND_VALIDATION_CONFLICT');
  if (e.stageReceipt.state === 'CONFLICT') return conflict('VALIDATION_STAGE_RECEIPT_CONFLICT');
  if (e.coordinationState === 'CONFLICT') return conflict('COORDINATION_FINALIZATION_CONFLICT');
  if (e.workspaceState === 'CONFLICT') return conflict('WORKSPACE_FINALIZATION_CONFLICT');
  if (e.requiredUnknownState === 'CONFLICT') return conflict('REQUIRED_UNKNOWN_STATE_CONFLICT');

  if (e.mergeEvidence.state === 'AMBIGUOUS') {
    return decision('NEEDS_RECOVERY_INSPECT', {
      result: 'UNKNOWN',
      attentionDisposition: 'NEEDS_REVIEW',
      reasonCode: 'MERGE_EFFECT_TRUTH_AMBIGUOUS',
      nextLegalAction: 'RECOVERY_INSPECT',
    });
  }
  if (e.mergeEvidence.state === 'NOT_MERGED') {
    return decision('MERGE_NOT_PROVEN', {
      result: 'BLOCKED',
      attentionDisposition: 'BLOCKED',
      reasonCode: 'MERGE_NOT_PROVEN',
      nextLegalAction: 'VALIDATION_STAGE_REEVALUATION',
    });
  }
  if (e.mergeEvidence.state === 'UNKNOWN') return unknown('MERGE_IDENTITY_UNKNOWN');

  if (e.mergeEvidence.prNumber === null
      || e.mergeEvidence.candidateHead === null
      || e.mergeEvidence.mergeCommit === null
      || e.mergeEvidence.diffIdentity === null
      || e.mergeEvidence.pathScopeDigest === null) {
    return unknown('MERGE_IDENTITY_UNKNOWN');
  }
  if (!sameIdentity(e.expected, e.mergeEvidence)) return conflict('MERGE_IDENTITY_CONFLICT');

  if (e.packetState === 'UNKNOWN') return unknown('PACKET_IDENTITY_UNKNOWN');
  if (e.validationStageState === 'UNKNOWN') return unknown('VALIDATION_STAGE_UNKNOWN');

  if (e.validationEvidence.state === 'FAIL') return blocked('HEAD_BOUND_VALIDATION_NOT_PASS');
  if (e.validationEvidence.state === 'UNKNOWN') return unknown('HEAD_BOUND_VALIDATION_UNKNOWN');
  if (e.validationEvidence.candidateHead === null || e.validationEvidence.diffIdentity === null) {
    return unknown('HEAD_BOUND_VALIDATION_IDENTITY_UNKNOWN');
  }
  if (e.validationEvidence.candidateHead !== e.expected.candidateHead
      || e.validationEvidence.diffIdentity !== e.expected.diffIdentity) {
    return conflict('HEAD_BOUND_VALIDATION_IDENTITY_CONFLICT');
  }

  if (e.requiredUnknownState === 'PRESENT') return blocked('REQUIRED_UNKNOWN_PRESENT');
  if (e.requiredUnknownState === 'UNKNOWN') return unknown('REQUIRED_UNKNOWN_STATE_UNRESOLVED');
  if (e.coordinationState === 'UNKNOWN') return unknown('COORDINATION_FINALIZATION_UNKNOWN');
  if (e.workspaceState === 'UNKNOWN') return unknown('WORKSPACE_FINALIZATION_UNKNOWN');

  if (e.stageReceipt.state === 'FAIL') return blocked('VALIDATION_STAGE_RECEIPT_NOT_PASS');
  if (e.stageReceipt.state === 'UNKNOWN') return unknown('VALIDATION_STAGE_RECEIPT_UNKNOWN');

  const missing = [];
  if (e.coordinationState === 'INCOMPLETE') missing.push('COORDINATION_FINALIZATION');
  if (e.workspaceState === 'DIRTY') missing.push('WORKSPACE_CLEAN_PROOF');

  if (e.stageReceipt.state === 'ABSENT') {
    missing.push('CANONICAL_VALIDATION_MERGE_RECEIPT');
  } else {
    const receiptIdentityComplete = e.stageReceipt.packetRef !== null
      && e.stageReceipt.prNumber !== null
      && e.stageReceipt.candidateHead !== null
      && e.stageReceipt.mergeCommit !== null
      && e.stageReceipt.diffIdentity !== null
      && e.stageReceipt.pathScopeDigest !== null;
    if (!receiptIdentityComplete) return unknown('VALIDATION_STAGE_RECEIPT_IDENTITY_UNKNOWN');
    const receiptExact = e.stageReceipt.packetRef === e.packetRef
      && e.stageReceipt.prNumber === e.expected.prNumber
      && e.stageReceipt.candidateHead === e.expected.candidateHead
      && e.stageReceipt.mergeCommit === e.mergeEvidence.mergeCommit
      && e.stageReceipt.diffIdentity === e.expected.diffIdentity
      && e.stageReceipt.pathScopeDigest === e.expected.pathScopeDigest;
    if (!receiptExact) return conflict('VALIDATION_STAGE_RECEIPT_IDENTITY_CONFLICT');
    if (e.stageReceipt.nextLegalAction === 'UNKNOWN') {
      return unknown('VALIDATION_STAGE_RECEIPT_NEXT_ACTION_UNKNOWN');
    }
    if (e.stageReceipt.nextLegalAction !== 'POSTMERGE_CONVERGENCE') {
      return conflict('VALIDATION_STAGE_RECEIPT_NEXT_ACTION_CONFLICT');
    }
    if (missing.length) return conflict('PREMATURE_FINALIZATION_RECEIPT_CONFLICT');
  }

  if (missing.length) {
    return decision('FINALIZATION_REQUIRED', {
      result: 'PASS',
      attentionDisposition: 'ACTION_REQUIRED',
      requiredEffectClasses: missing,
      nextLegalAction: 'FIXED_FINALIZATION_EFFECT_REVIEW',
    });
  }

  return decision('ALREADY_FINALIZED', {
    result: 'PASS',
    attentionDisposition: 'COMPLETE',
    nextLegalAction: 'POSTMERGE_CONVERGENCE',
  });
}

function classifyValidationFinalization(input) {
  return classifyNormalized(normalizeEvidence(input));
}

function projectValidationFinalization(input) {
  const evidence = normalizeEvidence(input);
  const classified = classifyNormalized(evidence);
  return {
    schemaVersion: 1,
    mode: 'VALIDATION_FINALIZATION_DECISION',
    validity: 'VALID',
    subject: evidence.subject,
    packetRef: evidence.packetRef,
    evidenceDigest: 'sha256:' + stableHash(evidence),
    finalizationDisposition: classified.finalizationDisposition,
    result: classified.result,
    attentionDisposition: classified.attentionDisposition,
    mergeCommit: evidence.mergeEvidence.state === 'MERGED'
      ? evidence.mergeEvidence.mergeCommit
      : null,
    requiredEffectClasses: classified.requiredEffectClasses,
    reasonCode: classified.reasonCode,
    nextLegalAction: classified.nextLegalAction,
    sourceRefs: evidence.sourceRefs,
    effectsPerformed: false,
    authority: {...FALSE_AUTHORITY},
  };
}

module.exports = {
  ENUMS,
  FALSE_AUTHORITY,
  ValidationFinalizationInputError,
  classifyValidationFinalization,
  normalizeEvidence,
  projectValidationFinalization,
};
