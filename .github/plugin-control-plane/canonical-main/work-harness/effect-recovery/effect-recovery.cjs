#!/usr/bin/env node
'use strict';

const {canonicalize, stableHash} = require('../handoff.cjs');
const executionReceipt = require('../execution-receipt.cjs');
const agentDecisionView = require('../agent-decision-view.cjs');

const MAX_INPUT_BYTES = 16 * 1024;
const MAX_TEXT_BYTES = 320;
const SUBJECT_RE = /^(?:issue:#[1-9][0-9]*|fixture:[A-Za-z0-9._/-]{1,160}|receipt:[A-Za-z0-9._:#/-]{1,200})$/;

const FIELDS = Object.freeze({
  packetState: ['EXACT', 'DRIFTED', 'UNKNOWN'],
  leaseState: ['ACTIVE_EXACT', 'ABSENT_EXACT', 'CONFLICT', 'UNKNOWN'],
  manifestState: ['EXACT', 'CONFLICT', 'UNKNOWN'],
  holderState: ['PRESENT_EXACT', 'ABSENT_EXACT', 'CONFLICT', 'UNKNOWN'],
  sessionState: ['LIVE', 'ABSENT', 'UNKNOWN'],
  workspaceState: ['CLEAN', 'DIRTY_PRESERVED', 'CONFLICT', 'UNKNOWN'],
  dirtyScopeState: ['EXACT', 'NOT_APPLICABLE', 'CONFLICT', 'UNKNOWN'],
  gitIdentityState: ['EXACT', 'CONFLICT', 'UNKNOWN'],
  remoteBranchState: ['UNCHANGED_BASE', 'ADVANCED', 'MISSING', 'CONFLICT', 'UNKNOWN'],
  prState: ['ABSENT', 'OPEN_EXACT', 'MERGED_EXACT', 'CONFLICT', 'UNKNOWN'],
  releaseEligibility: ['PROVEN', 'BLOCKED', 'NOT_APPLICABLE', 'UNKNOWN'],
});

const LOCATOR_KEYS = Object.freeze([
  'packet', 'lease', 'manifest', 'holder', 'session', 'workspace',
  'dirtyScope', 'gitIdentity', 'remoteBranch', 'pr', 'releaseEligibility',
]);

const INPUT_KEYS = new Set([
  'schemaVersion', 'mode', 'subject', ...Object.keys(FIELDS), 'locators',
]);

const DISPOSITIONS = Object.freeze([
  'SAME_SESSION_RESUME', 'ABANDONED_LEASE_RELEASE', 'CLEAN_ABORT',
  'NEEDS_REVIEW', 'BLOCKED', 'UNKNOWN', 'CONFLICT',
]);

class RecoveryInputError extends Error {
  constructor(reasonCodes) {
    super(reasonCodes[0] || 'RECOVERY_INPUT_INVALID');
    this.reasonCodes = [...new Set(reasonCodes)].sort();
  }
}

function sensitiveText(text) {
  return /(authorization\s*:|bearer\s+|token\s*=|secret\s*=|api[_-]?key\s*=|gh[pousr]_[A-Za-z0-9_]{8,}|github_pat_[A-Za-z0-9_]+)/i.test(text);
}

function atom(value, field, reasons, maxBytes = MAX_TEXT_BYTES) {
  if (typeof value !== 'string' || !value.trim()) {
    reasons.push(`INPUT_FIELD_INVALID:${field}`);
    return null;
  }
  const text = value.trim();
  if (Buffer.byteLength(text, 'utf8') > maxBytes) reasons.push(`INPUT_FIELD_TOO_LARGE:${field}`);
  if (/[\u0000-\u001f\u007f]/.test(text)) reasons.push(`INPUT_FIELD_CONTROL_CHAR:${field}`);
  if (sensitiveText(text)) reasons.push(`INPUT_FIELD_SENSITIVE:${field}`);
  return text;
}

function exactKeys(value, allowed, field, reasons) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    reasons.push(`INPUT_OBJECT_REQUIRED:${field}`);
    return false;
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) reasons.push(`INPUT_FIELD_UNSUPPORTED:${field}.${key}`);
  }
  for (const key of allowed) {
    if (!(key in value)) reasons.push(`INPUT_FIELD_MISSING:${field}.${key}`);
  }
  return true;
}

function enumValue(input, field, reasons) {
  const value = atom(input[field], field, reasons, 64);
  if (value && !FIELDS[field].includes(value)) reasons.push(`INPUT_ENUM_INVALID:${field}`);
  return value;
}

function normalizeLocators(input, reasons) {
  const allowed = new Set(LOCATOR_KEYS);
  if (!exactKeys(input, allowed, 'locators', reasons)) return {};
  const out = {};
  for (const key of LOCATOR_KEYS) {
    const value = atom(input[key], `locators.${key}`, reasons);
    if (value) out[key] = value;
  }
  return out;
}

function normalizeEvidence(input) {
  const reasons = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new RecoveryInputError(['INPUT_OBJECT_REQUIRED']);
  }
  if (Buffer.byteLength(JSON.stringify(input), 'utf8') > MAX_INPUT_BYTES) {
    throw new RecoveryInputError(['INPUT_TOO_LARGE']);
  }
  exactKeys(input, INPUT_KEYS, 'input', reasons);
  if (input.schemaVersion !== 1) reasons.push('INPUT_SCHEMA_UNSUPPORTED');
  if (input.mode !== 'EFFECT_RECOVERY_EVIDENCE') reasons.push('INPUT_MODE_UNSUPPORTED');
  const subject = atom(input.subject, 'subject', reasons, 200);
  if (subject && !SUBJECT_RE.test(subject)) reasons.push('INPUT_SUBJECT_INVALID');
  const normalized = {
    schemaVersion: 1,
    mode: 'EFFECT_RECOVERY_EVIDENCE',
    subject,
  };
  for (const field of Object.keys(FIELDS)) normalized[field] = enumValue(input, field, reasons);
  normalized.locators = normalizeLocators(input.locators, reasons);
  if (reasons.length) throw new RecoveryInputError(reasons);
  return canonicalize(normalized);
}

function decision(kind, reasonCode, locatorKey, constraint, nextPhase, nextLegalAction) {
  const pass = ['SAME_SESSION_RESUME', 'ABANDONED_LEASE_RELEASE', 'CLEAN_ABORT'].includes(kind);
  let result = 'PASS';
  let attentionDisposition = 'COMPLETE';
  if (kind === 'CONFLICT') {
    result = 'CONFLICT';
    attentionDisposition = 'CONFLICT';
  } else if (kind === 'BLOCKED') {
    result = 'BLOCKED';
    attentionDisposition = 'BLOCKED';
  } else if (kind === 'UNKNOWN') {
    result = 'UNKNOWN';
    attentionDisposition = 'UNKNOWN';
  } else if (kind === 'NEEDS_REVIEW') {
    result = 'UNKNOWN';
    attentionDisposition = 'NEEDS_REVIEW';
  }
  return {
    recoveryDisposition: kind,
    result,
    attentionDisposition,
    reasonCode: pass ? null : reasonCode,
    locatorKey: pass ? null : locatorKey,
    constraint: pass ? null : constraint,
    nextPhase,
    nextLegalAction,
  };
}

function conflict(reason, locatorKey, constraint = 'NO_RECOVERY_WITH_CONFLICTING_OPERATION_AUTHORITY') {
  return decision('CONFLICT', reason, locatorKey, constraint, 'SEMANTIC_REVIEW', 'SEMANTIC_REVIEW_REQUIRED');
}

function unknown(reason, locatorKey, constraint = 'NO_RECOVERY_WITH_UNRESOLVED_OPERATION_AUTHORITY') {
  return decision('UNKNOWN', reason, locatorKey, constraint, 'SEMANTIC_REVIEW', 'TARGETED_DRILLDOWN_REQUIRED');
}

function review(reason, locatorKey, constraint = 'NO_RECOVERY_WITHOUT_SEMANTIC_REVIEW') {
  return decision('NEEDS_REVIEW', reason, locatorKey, constraint, 'SEMANTIC_REVIEW', 'SEMANTIC_REVIEW_REQUIRED');
}

function blocked(reason, locatorKey, constraint = 'RECOVERY_EFFECT_BLOCKED') {
  return decision('BLOCKED', reason, locatorKey, constraint, 'RECOVERY_BLOCKER_RESOLUTION', 'RESOLVE_RECOVERY_BLOCKER');
}

function classifyNormalized(e) {
  const explicitConflicts = [
    [e.packetState === 'DRIFTED', 'PACKET_AUTHORITY_CONFLICT', 'packet'],
    [e.leaseState === 'CONFLICT', 'LEASE_AUTHORITY_CONFLICT', 'lease'],
    [e.manifestState === 'CONFLICT', 'MANIFEST_AUTHORITY_CONFLICT', 'manifest'],
    [e.holderState === 'CONFLICT', 'HOLDER_AUTHORITY_CONFLICT', 'holder'],
    [e.workspaceState === 'CONFLICT', 'WORKSPACE_STATE_CONFLICT', 'workspace'],
    [e.dirtyScopeState === 'CONFLICT', 'DIRTY_SCOPE_CONFLICT', 'dirtyScope'],
    [e.gitIdentityState === 'CONFLICT', 'GIT_IDENTITY_CONFLICT', 'gitIdentity'],
    [e.remoteBranchState === 'CONFLICT', 'REMOTE_BRANCH_CONFLICT', 'remoteBranch'],
    [e.prState === 'CONFLICT', 'PR_IDENTITY_CONFLICT', 'pr'],
    [e.prState === 'MERGED_EXACT', 'EFFECT_ALREADY_MERGED', 'pr'],
  ];
  for (const [matched, reason, locator] of explicitConflicts) {
    if (matched) return conflict(reason, locator);
  }

  if (e.workspaceState === 'CLEAN' && e.dirtyScopeState !== 'NOT_APPLICABLE') {
    if (e.dirtyScopeState === 'UNKNOWN') return unknown('DIRTY_SCOPE_UNRESOLVED', 'dirtyScope');
    return conflict('DIRTY_SCOPE_STATE_CONFLICT', 'dirtyScope');
  }
  if (e.workspaceState === 'DIRTY_PRESERVED' && e.dirtyScopeState === 'NOT_APPLICABLE') {
    return conflict('DIRTY_SCOPE_STATE_CONFLICT', 'dirtyScope');
  }

  const unknownFields = [
    [e.packetState === 'UNKNOWN', 'PACKET_AUTHORITY_UNRESOLVED', 'packet'],
    [e.leaseState === 'UNKNOWN', 'LEASE_AUTHORITY_UNRESOLVED', 'lease'],
    [e.manifestState === 'UNKNOWN', 'MANIFEST_AUTHORITY_UNRESOLVED', 'manifest'],
    [e.holderState === 'UNKNOWN', 'HOLDER_AUTHORITY_UNRESOLVED', 'holder'],
    [e.workspaceState === 'UNKNOWN', 'WORKSPACE_STATE_UNRESOLVED', 'workspace'],
    [e.dirtyScopeState === 'UNKNOWN', 'DIRTY_SCOPE_UNRESOLVED', 'dirtyScope'],
    [e.gitIdentityState === 'UNKNOWN', 'GIT_IDENTITY_UNRESOLVED', 'gitIdentity'],
    [e.remoteBranchState === 'UNKNOWN', 'REMOTE_BRANCH_STATE_UNRESOLVED', 'remoteBranch'],
    [e.prState === 'UNKNOWN', 'PR_STATE_UNRESOLVED', 'pr'],
  ];
  for (const [matched, reason, locator] of unknownFields) {
    if (matched) return unknown(reason, locator);
  }

  if (e.sessionState === 'UNKNOWN') {
    if (e.leaseState === 'ACTIVE_EXACT' && e.holderState === 'PRESENT_EXACT') {
      return review(
        'HOLDER_AUTHORITY_UNRESOLVED',
        'holder',
        'NO_TAKEOVER_WITH_UNRESOLVED_HOLDER_AUTHORITY',
      );
    }
    return unknown(
      'SESSION_AUTHORITY_UNRESOLVED',
      'session',
      'NO_TAKEOVER_WITH_UNRESOLVED_SESSION_AUTHORITY',
    );
  }

  if (e.remoteBranchState === 'ADVANCED') {
    return review(
      'REMOTE_BRANCH_ADVANCED_REQUIRES_REVIEW',
      'remoteBranch',
      'NO_RECOVERY_ACROSS_UNATTRIBUTED_REMOTE_PROGRESS',
    );
  }
  if (e.remoteBranchState === 'MISSING') {
    return review(
      'REMOTE_BRANCH_MISSING_REQUIRES_REVIEW',
      'remoteBranch',
      'NO_RECOVERY_WITH_UNRESOLVED_REMOTE_IDENTITY',
    );
  }
  if (e.prState === 'OPEN_EXACT') {
    return review(
      'PR_ALREADY_PUBLISHED_REQUIRES_REVIEW',
      'pr',
      'NO_RECOVERY_ACROSS_PUBLISHED_EFFECT_WITHOUT_REVIEW',
    );
  }

  const dirtySafe = e.workspaceState === 'CLEAN'
    ? e.dirtyScopeState === 'NOT_APPLICABLE'
    : e.workspaceState === 'DIRTY_PRESERVED' && e.dirtyScopeState === 'EXACT';

  if (e.sessionState === 'LIVE') {
    if (e.leaseState === 'ABSENT_EXACT') {
      return conflict('LIVE_SESSION_WITHOUT_ACTIVE_LEASE', 'lease');
    }
    if (e.leaseState !== 'ACTIVE_EXACT') return unknown('LEASE_AUTHORITY_UNRESOLVED', 'lease');
    if (e.holderState !== 'PRESENT_EXACT') {
      return review(
        'LIVE_SESSION_HOLDER_NOT_PROVEN',
        'holder',
        'NO_CONTINUATION_WITHOUT_EXACT_HOLDER',
      );
    }
    if (!dirtySafe) return unknown('DIRTY_SCOPE_UNRESOLVED', 'dirtyScope');
    if (e.remoteBranchState !== 'UNCHANGED_BASE' || e.prState !== 'ABSENT') {
      return review('SESSION_PROGRESS_REQUIRES_REVIEW', 'session');
    }
    return decision(
      'SAME_SESSION_RESUME', null, null, null,
      'IMPLEMENTATION_CONTINUE', 'IMPLEMENTATION_CONTINUE_WITH_EXISTING_OWNER',
    );
  }

  if (e.sessionState === 'ABSENT' && e.leaseState === 'ACTIVE_EXACT') {
    if (e.holderState !== 'PRESENT_EXACT') {
      return review(
        'ACTIVE_LEASE_WITHOUT_EXACT_HOLDER',
        'holder',
        'NO_ABANDONMENT_WITHOUT_EXACT_HOLDER_IDENTITY',
      );
    }
    if (!dirtySafe) return unknown('DIRTY_SCOPE_UNRESOLVED', 'dirtyScope');
    if (e.releaseEligibility === 'BLOCKED') {
      return blocked(
        'D013_RELEASE_NOT_ELIGIBLE',
        'releaseEligibility',
        'NO_RELEASE_WHILE_D013_RELEASE_BLOCKED',
      );
    }
    if (e.releaseEligibility !== 'PROVEN') {
      return unknown(
        'D013_RELEASE_ELIGIBILITY_UNRESOLVED',
        'releaseEligibility',
        'NO_RELEASE_WITHOUT_PROVEN_D013_ELIGIBILITY',
      );
    }
    return decision(
      'ABANDONED_LEASE_RELEASE', null, null, null,
      'RECOVERY_RELEASE_REBIND',
      'RELEASE_PRIOR_D013_THROUGH_EXISTING_OWNER_THEN_REACQUIRE_REBIND',
    );
  }

  if (e.sessionState === 'ABSENT' && e.leaseState === 'ABSENT_EXACT') {
    if (e.workspaceState === 'DIRTY_PRESERVED') {
      return review(
        'DIRTY_STATE_WITHOUT_ACTIVE_LEASE',
        'workspace',
        'NO_DIRTY_STATE_TAKEOVER_WITHOUT_ACTIVE_LEASE',
      );
    }
    if (e.workspaceState !== 'CLEAN') return unknown('WORKSPACE_STATE_UNRESOLVED', 'workspace');
    if (e.holderState === 'PRESENT_EXACT') {
      return decision(
        'CLEAN_ABORT', null, null, null,
        'RECOVERY_CLEANUP',
        'CLEANUP_STALE_HOLDER_THROUGH_EXISTING_OWNER',
      );
    }
    if (e.holderState === 'ABSENT_EXACT') {
      return decision(
        'CLEAN_ABORT', null, null, null,
        'RECOVERY_COMPLETE',
        'NO_RECOVERY_EFFECT_REQUIRED',
      );
    }
  }

  return review('RECOVERY_STATE_NOT_REVIEWED', 'packet');
}

function classifyRecoveryEvidence(input) {
  const evidence = normalizeEvidence(input);
  return classifyNormalized(evidence);
}

function stepResult(field, value, e, d) {
  if (field === 'releaseEligibility'
      && (d.recoveryDisposition === 'SAME_SESSION_RESUME'
        || e.leaseState === 'ABSENT_EXACT')) return 'SKIPPED';
  if (field === 'dirtyScopeState' && e.workspaceState === 'CLEAN') return 'SKIPPED';
  if (value === 'UNKNOWN') return 'UNKNOWN';
  if (['CONFLICT', 'DRIFTED', 'MERGED_EXACT'].includes(value)) return 'CONFLICT';
  if (field === 'releaseEligibility' && value === 'BLOCKED') return 'BLOCKED';
  if (field === 'remoteBranchState' && ['ADVANCED', 'MISSING'].includes(value)) return 'UNKNOWN';
  if (field === 'prState' && value === 'OPEN_EXACT') return 'UNKNOWN';
  return 'PASS';
}

function buildSteps(e, d) {
  const mappings = [
    ['packet-authority', 'packetState', 'packet'],
    ['d013-lease-authority', 'leaseState', 'lease'],
    ['d014-manifest-authority', 'manifestState', 'manifest'],
    ['workspace-holder-authority', 'holderState', 'holder'],
    ['owning-session-evidence', 'sessionState', 'session'],
    ['workspace-state', 'workspaceState', 'workspace'],
    ['dirty-scope-fidelity', 'dirtyScopeState', 'dirtyScope'],
    ['git-identity', 'gitIdentityState', 'gitIdentity'],
    ['remote-branch-progress', 'remoteBranchState', 'remoteBranch'],
    ['pr-progress', 'prState', 'pr'],
    ['d013-release-eligibility', 'releaseEligibility', 'releaseEligibility'],
  ];
  return mappings.map(([name, field, locator]) => ({
    name,
    result: stepResult(field, e[field], e, d),
    evidenceLocator: e.locators[locator],
  }));
}

function receiptAxes(d) {
  if (d.recoveryDisposition === 'CONFLICT') {
    return {requiredUnknowns: [], conflicts: [d.reasonCode], blockers: []};
  }
  if (d.recoveryDisposition === 'BLOCKED') {
    return {requiredUnknowns: [], conflicts: [], blockers: [d.reasonCode]};
  }
  if (['UNKNOWN', 'NEEDS_REVIEW'].includes(d.recoveryDisposition)) {
    return {requiredUnknowns: [d.reasonCode], conflicts: [], blockers: []};
  }
  return {requiredUnknowns: [], conflicts: [], blockers: []};
}

function buildRecoveryReceipt(input) {
  const e = normalizeEvidence(input);
  const d = classifyNormalized(e);
  const axes = receiptAxes(d);
  const draft = {
    schemaVersion: 2,
    operationId: `effect-recovery:${e.subject}`,
    primitiveId: 'effect-recovery.v1',
    sourceIdentity: {
      kind: 'RECOVERY_EVIDENCE',
      locator: e.subject,
      identity: `sha256:${stableHash(e)}`,
    },
    executionSurface: 'repository:pure-effect-recovery-classifier',
    stage: 'EFFECT_RECOVERY',
    executionLifecycle: 'FINISHED',
    attentionDisposition: d.attentionDisposition,
    result: d.result,
    proofScope: 'INTERRUPTED_EFFECT_RECOVERY_CLASSIFICATION_V1',
    steps: buildSteps(e, d),
    counters: [{name: 'evidence_fact_count', value: LOCATOR_KEYS.length}],
    affectedFiles: [],
    artifactLocators: [...new Set(Object.values(e.locators))].sort(),
    reasonCodes: d.reasonCode ? [d.reasonCode] : [],
    requiredUnknowns: axes.requiredUnknowns,
    conflicts: axes.conflicts,
    blockers: axes.blockers,
    exitCode: d.result === 'PASS' ? 0 : ['CONFLICT', 'BLOCKED'].includes(d.result) ? 2 : 3,
    stderrTail: null,
    nextLegalAction: d.nextLegalAction,
  };
  const receipt = executionReceipt.projectExecutionReceipt(draft);
  if (receipt.validity !== 'VALID') {
    throw new RecoveryInputError(['CANONICAL_RECEIPT_PROJECTION_FAILED', ...(receipt.reasonCodes || [])]);
  }
  return {evidence: e, decision: d, receipt};
}

function attentionFor(e, d) {
  if (!d.reasonCode) return [];
  const severity = d.recoveryDisposition === 'CONFLICT'
    ? 'CONFLICT'
    : d.recoveryDisposition === 'BLOCKED'
      ? 'BLOCKER'
      : 'UNKNOWN';
  return [{
    subject: e.subject,
    reasonCode: d.reasonCode,
    severity,
    constraint: d.constraint,
    nextPhase: d.nextPhase,
    locator: e.locators[d.locatorKey] || e.locators.packet,
  }];
}

function dirtyView(e) {
  if (e.workspaceState === 'DIRTY_PRESERVED') return 'PRESERVED';
  if (e.workspaceState === 'CLEAN') return 'CLEAN';
  return 'UNKNOWN';
}

function authorityView(d) {
  if (d.result === 'PASS') return 'PROVEN_FOR_CLASSIFICATION';
  if (d.recoveryDisposition === 'CONFLICT') return 'CONFLICT';
  if (d.recoveryDisposition === 'BLOCKED') return 'BLOCKED';
  return 'UNRESOLVED';
}

function projectRecoveryEvidence(input, locators) {
  const {evidence, decision: d, receipt} = buildRecoveryReceipt(input);
  const recoveryReceiptLocator = atom(locators?.receiptLocator, 'receiptLocator', [], 320);
  const reportLocator = atom(locators?.reportLocator, 'reportLocator', [], 320);
  if (!recoveryReceiptLocator || !reportLocator) {
    throw new RecoveryInputError(['PROJECTION_LOCATORS_REQUIRED']);
  }
  const view = agentDecisionView.projectAgentDecisionView({
    receipt,
    phase: 'EFFECT_RECOVERY',
    output: {
      recoveryDisposition: d.recoveryDisposition,
      dirtyState: dirtyView(evidence),
      operationAuthority: authorityView(d),
      sessionState: evidence.sessionState,
    },
    attention: attentionFor(evidence, d),
    receiptLocator: recoveryReceiptLocator,
    reportLocator,
  });
  if (view.validity !== 'VALID') {
    throw new RecoveryInputError(['AGENT_VIEW_PROJECTION_FAILED', ...(view.reasonCodes || [])]);
  }
  return {evidence, decision: d, receipt, view};
}

module.exports = {
  DISPOSITIONS,
  FIELDS,
  LOCATOR_KEYS,
  MAX_INPUT_BYTES,
  RecoveryInputError,
  buildRecoveryReceipt,
  classifyRecoveryEvidence,
  normalizeEvidence,
  projectRecoveryEvidence,
};
