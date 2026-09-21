'use strict';

const crypto = require('node:crypto');
const executionReceipt = require('../execution-receipt.cjs');
const agentDecisionView = require('../agent-decision-view.cjs');
const {canonicalize, stableHash} = require('../handoff.cjs');

const MAX_INPUT_BYTES = 16 * 1024;
const MAX_TEXT_BYTES = 320;
const SHA256_RE = /^[0-9a-f]{64}$/;
const PACKET_REF_RE = /^#[1-9][0-9]*$/;
const PHASE_RE = /^[A-Z][A-Z0-9_]{1,79}$/;
const OWNER_RE = /^[a-z][a-z0-9._:-]{1,159}$/;
const RUN_ID_RE = /^run-[0-9a-f]{64}$/;

const CONNECTION_OBSERVATIONS = Object.freeze([
  'ATTACHED', 'DETACHED', 'REATTACHED', 'UNKNOWN',
]);
const RUNTIME_CAPABILITIES = Object.freeze([
  'DETACHED_CAPABLE', 'NOT_DETACHED_CAPABLE', 'UNKNOWN',
]);
const OWNER_LIVENESS = Object.freeze(['LIVE', 'ABSENT', 'UNKNOWN']);
const CONTINUITY_LIFECYCLES = Object.freeze([
  'QUEUED', 'RUNNING', 'WAITING', 'FINISHED', 'UNKNOWN',
]);
const CHECKPOINT_STATES = Object.freeze(['EXACT', 'ABSENT', 'CONFLICT', 'UNKNOWN']);
const JOURNAL_STATES = Object.freeze(['EXACT', 'ABSENT', 'CONFLICT', 'UNKNOWN']);
const REMOTE_EFFECT_STATES = Object.freeze([
  'PROVEN', 'NOT_APPLICABLE', 'CONFLICT', 'UNKNOWN',
]);
const CONTINUATION_STATES = Object.freeze([
  'PROVEN', 'BLOCKED', 'CONFLICT', 'UNKNOWN',
]);
const NEXT_PRIMITIVE_STATES = Object.freeze([
  'PROVEN', 'NOT_APPLICABLE', 'BLOCKED', 'UNKNOWN',
]);
const FINAL_RECEIPT_STATES = Object.freeze([
  'EXACT', 'ABSENT', 'CONFLICT', 'UNKNOWN',
]);
const RESUME_DISPOSITIONS = Object.freeze([
  'OWNER_STILL_RUNNING',
  'CONTINUE_FROM_CHECKPOINT',
  'ALREADY_FINISHED',
  'NEEDS_RECOVERY_INSPECT',
  'BLOCKED',
  'UNKNOWN',
]);

const CHECKPOINT_RANK = Object.freeze({
  NONE: 0,
  WORKSPACE_READY: 10,
  SOURCE_MUTATION_COMPLETE: 20,
  VALIDATION_PASS: 30,
  COMMIT_CREATED: 40,
  PUSH_COMPLETE: 50,
  REMOTE_HEAD_VERIFIED: 60,
  PR_CREATED: 70,
  COORDINATION_RELEASED: 80,
  FINISHED: 90,
});
const CHECKPOINTS = Object.freeze([...Object.keys(CHECKPOINT_RANK), 'UNKNOWN']);

const TOP_FIELDS = new Set([
  'schemaVersion', 'mode',
  'packetRef', 'phase', 'ownerId', 'activationDigest', 'runId', 'attemptId',
  'connectionObservation', 'runtimeCapability', 'ownerLiveness', 'executionLifecycle',
  'checkpoint', 'journal', 'remoteEffect', 'continuationAuthority',
  'nextPrimitive', 'finalReceipt',
]);
const CHECKPOINT_FIELDS = new Set(['state', 'name', 'evidenceLocator']);
const JOURNAL_FIELDS = new Set(['state', 'effectKey', 'evidenceLocator']);
const REMOTE_FIELDS = new Set([
  'state', 'primitiveId', 'targetIdentity', 'evidenceLocator',
]);
const CONTINUATION_FIELDS = new Set(['state', 'evidenceLocator']);
const NEXT_FIELDS = new Set(['state', 'name', 'evidenceLocator']);
const FINAL_FIELDS = new Set(['state', 'digest', 'evidenceLocator']);

const RECORD_FIELDS = new Set([
  'runId', 'generation', 'previousRecordDigest', 'attemptId',
  'executionLifecycle', 'lastDurableCheckpoint', 'checkpointEvidence',
  'nextPrimitive', 'finalReceiptDigest',
]);
const EFFECT_FIELDS = new Set([
  'runId', 'primitiveId', 'targetIdentity', 'effectKey', 'status', 'evidenceLocator',
]);

class ContinuityInputError extends Error {
  constructor(reasonCodes) {
    super(reasonCodes[0] || 'CONTINUITY_INPUT_INVALID');
    this.reasonCodes = [...new Set(reasonCodes)].sort();
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}
function same(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
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
function atom(value, field, reasons, {
  required = true, maxBytes = MAX_TEXT_BYTES, pattern = null,
} = {}) {
  if (value === null || value === undefined || value === '') {
    if (required) reasons.push('INPUT_FIELD_MISSING:' + field);
    return null;
  }
  if (typeof value !== 'string') {
    reasons.push('INPUT_FIELD_TYPE_INVALID:' + field);
    return null;
  }
  const text = value.trim();
  if (!text) {
    if (required) reasons.push('INPUT_FIELD_MISSING:' + field);
    return null;
  }
  if (Buffer.byteLength(text, 'utf8') > maxBytes) {
    reasons.push('INPUT_FIELD_TOO_LARGE:' + field);
  }
  if (/[\u0000-\u001f\u007f]/.test(text)) {
    reasons.push('INPUT_FIELD_CONTROL_CHAR:' + field);
  }
  if (pattern && !pattern.test(text)) reasons.push('INPUT_FIELD_INVALID:' + field);
  return text;
}
function enumValue(value, allowed, field, reasons) {
  const text = atom(value, field, reasons, {maxBytes: 80});
  if (text && !allowed.includes(text)) reasons.push('INPUT_ENUM_INVALID:' + field);
  return text;
}
function nullableLocator(value, field, reasons, required) {
  return atom(value, field, reasons, {required, maxBytes: 320});
}
function optionalSha(value, field, reasons, required = false) {
  return atom(value, field, reasons, {required, maxBytes: 64, pattern: SHA256_RE});
}

function deriveRunId({packetRef, phase, ownerId, activationDigest}) {
  if (!PACKET_REF_RE.test(String(packetRef || ''))) throw new Error('PACKET_REF_INVALID');
  if (!PHASE_RE.test(String(phase || ''))) throw new Error('PHASE_INVALID');
  if (!OWNER_RE.test(String(ownerId || ''))) throw new Error('OWNER_ID_INVALID');
  if (!SHA256_RE.test(String(activationDigest || ''))) throw new Error('ACTIVATION_DIGEST_INVALID');
  return 'run-' + sha256(JSON.stringify([
    String(packetRef), String(phase), String(ownerId), String(activationDigest),
  ]));
}
function deriveEffectKey({runId, primitiveId, targetIdentity}) {
  if (!RUN_ID_RE.test(String(runId || ''))) throw new Error('RUN_ID_INVALID');
  const p = String(primitiveId || '').trim();
  const t = String(targetIdentity || '').trim();
  if (!p || !t || p.length > 160 || t.length > 240) throw new Error('EFFECT_IDENTITY_INVALID');
  return sha256(JSON.stringify([runId, p, t]));
}
function checkpointRank(name) {
  if (name === 'UNKNOWN') return null;
  return Object.hasOwn(CHECKPOINT_RANK, name) ? CHECKPOINT_RANK[name] : null;
}

function normalizeCheckpoint(value, reasons) {
  if (!exactKeys(value, CHECKPOINT_FIELDS, 'checkpoint', reasons)) {
    return {state: 'UNKNOWN', name: 'UNKNOWN', evidenceLocator: null};
  }
  const state = enumValue(value.state, CHECKPOINT_STATES, 'checkpoint.state', reasons);
  const name = enumValue(value.name, CHECKPOINTS, 'checkpoint.name', reasons);
  const needsLocator = state !== 'ABSENT';
  const locator = nullableLocator(
    value.evidenceLocator, 'checkpoint.evidenceLocator', reasons, needsLocator,
  );
  if (state === 'ABSENT' && (name !== 'NONE' || value.evidenceLocator !== null)) {
    reasons.push('CHECKPOINT_ABSENT_SHAPE_INVALID');
  }
  if (state === 'EXACT' && (!name || ['NONE', 'UNKNOWN'].includes(name))) {
    reasons.push('CHECKPOINT_EXACT_NAME_REQUIRED');
  }
  if (state !== 'EXACT' && state !== 'ABSENT' && name !== 'UNKNOWN') {
    reasons.push('CHECKPOINT_UNRESOLVED_NAME_INVALID');
  }
  return {state, name, evidenceLocator: locator};
}
function normalizeJournal(value, reasons) {
  if (!exactKeys(value, JOURNAL_FIELDS, 'journal', reasons)) {
    return {state: 'UNKNOWN', effectKey: null, evidenceLocator: null};
  }
  const state = enumValue(value.state, JOURNAL_STATES, 'journal.state', reasons);
  const effectKey = optionalSha(value.effectKey, 'journal.effectKey', reasons, state === 'EXACT');
  const locator = nullableLocator(
    value.evidenceLocator, 'journal.evidenceLocator', reasons, state !== 'ABSENT',
  );
  if (state === 'ABSENT' && (value.effectKey !== null || value.evidenceLocator !== null)) {
    reasons.push('JOURNAL_ABSENT_SHAPE_INVALID');
  }
  return {state, effectKey, evidenceLocator: locator};
}
function normalizeRemoteEffect(value, reasons) {
  if (!exactKeys(value, REMOTE_FIELDS, 'remoteEffect', reasons)) {
    return {
      state: 'UNKNOWN', primitiveId: null, targetIdentity: null, evidenceLocator: null,
    };
  }
  const state = enumValue(
    value.state, REMOTE_EFFECT_STATES, 'remoteEffect.state', reasons,
  );
  const proven = state === 'PROVEN';
  const primitiveId = atom(
    value.primitiveId, 'remoteEffect.primitiveId', reasons,
    {required: proven, maxBytes: 160},
  );
  const targetIdentity = atom(
    value.targetIdentity, 'remoteEffect.targetIdentity', reasons,
    {required: proven, maxBytes: 240},
  );
  const locator = nullableLocator(
    value.evidenceLocator, 'remoteEffect.evidenceLocator', reasons,
    !['NOT_APPLICABLE'].includes(state),
  );
  if (state === 'NOT_APPLICABLE'
      && (value.primitiveId !== null || value.targetIdentity !== null
        || value.evidenceLocator !== null)) {
    reasons.push('REMOTE_EFFECT_NOT_APPLICABLE_SHAPE_INVALID');
  }
  return {state, primitiveId, targetIdentity, evidenceLocator: locator};
}
function normalizeContinuation(value, reasons) {
  if (!exactKeys(value, CONTINUATION_FIELDS, 'continuationAuthority', reasons)) {
    return {state: 'UNKNOWN', evidenceLocator: null};
  }
  const state = enumValue(
    value.state, CONTINUATION_STATES, 'continuationAuthority.state', reasons,
  );
  const locator = nullableLocator(
    value.evidenceLocator, 'continuationAuthority.evidenceLocator', reasons, true,
  );
  return {state, evidenceLocator: locator};
}
function normalizeNextPrimitive(value, reasons) {
  if (!exactKeys(value, NEXT_FIELDS, 'nextPrimitive', reasons)) {
    return {state: 'UNKNOWN', name: null, evidenceLocator: null};
  }
  const state = enumValue(
    value.state, NEXT_PRIMITIVE_STATES, 'nextPrimitive.state', reasons,
  );
  const name = atom(value.name, 'nextPrimitive.name', reasons, {
    required: state === 'PROVEN', maxBytes: 160,
  });
  const locator = nullableLocator(
    value.evidenceLocator, 'nextPrimitive.evidenceLocator', reasons,
    !['NOT_APPLICABLE'].includes(state),
  );
  if (state === 'NOT_APPLICABLE' && (value.name !== null || value.evidenceLocator !== null)) {
    reasons.push('NEXT_PRIMITIVE_NOT_APPLICABLE_SHAPE_INVALID');
  }
  return {state, name, evidenceLocator: locator};
}
function normalizeFinalReceipt(value, reasons) {
  if (!exactKeys(value, FINAL_FIELDS, 'finalReceipt', reasons)) {
    return {state: 'UNKNOWN', digest: null, evidenceLocator: null};
  }
  const state = enumValue(value.state, FINAL_RECEIPT_STATES, 'finalReceipt.state', reasons);
  const digest = optionalSha(value.digest, 'finalReceipt.digest', reasons, state === 'EXACT');
  const locator = nullableLocator(
    value.evidenceLocator, 'finalReceipt.evidenceLocator', reasons, state !== 'ABSENT',
  );
  if (state === 'ABSENT' && (value.digest !== null || value.evidenceLocator !== null)) {
    reasons.push('FINAL_RECEIPT_ABSENT_SHAPE_INVALID');
  }
  return {state, digest, evidenceLocator: locator};
}

function normalizeEvidence(input) {
  const reasons = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ContinuityInputError(['INPUT_OBJECT_REQUIRED']);
  }
  if (Buffer.byteLength(JSON.stringify(input), 'utf8') > MAX_INPUT_BYTES) {
    throw new ContinuityInputError(['INPUT_TOO_LARGE']);
  }
  exactKeys(input, TOP_FIELDS, 'input', reasons);
  if (input.schemaVersion !== 1) reasons.push('INPUT_SCHEMA_UNSUPPORTED');
  if (input.mode !== 'EXECUTION_CONTINUITY_EVIDENCE') reasons.push('INPUT_MODE_UNSUPPORTED');
  const packetRef = atom(input.packetRef, 'packetRef', reasons, {pattern: PACKET_REF_RE});
  const phase = atom(input.phase, 'phase', reasons, {pattern: PHASE_RE, maxBytes: 80});
  const ownerId = atom(input.ownerId, 'ownerId', reasons, {pattern: OWNER_RE, maxBytes: 160});
  const activationDigest = optionalSha(input.activationDigest, 'activationDigest', reasons, true);
  const runId = atom(input.runId, 'runId', reasons, {pattern: RUN_ID_RE, maxBytes: 68});
  if (!Number.isSafeInteger(input.attemptId) || input.attemptId < 1) {
    reasons.push('INPUT_ATTEMPT_ID_INVALID');
  }
  const connectionObservation = enumValue(
    input.connectionObservation, CONNECTION_OBSERVATIONS, 'connectionObservation', reasons,
  );
  const runtimeCapability = enumValue(
    input.runtimeCapability, RUNTIME_CAPABILITIES, 'runtimeCapability', reasons,
  );
  const ownerLiveness = enumValue(
    input.ownerLiveness, OWNER_LIVENESS, 'ownerLiveness', reasons,
  );
  const executionLifecycle = enumValue(
    input.executionLifecycle, CONTINUITY_LIFECYCLES, 'executionLifecycle', reasons,
  );
  const checkpoint = normalizeCheckpoint(input.checkpoint, reasons);
  const journal = normalizeJournal(input.journal, reasons);
  const remoteEffect = normalizeRemoteEffect(input.remoteEffect, reasons);
  const continuationAuthority = normalizeContinuation(input.continuationAuthority, reasons);
  const nextPrimitive = normalizeNextPrimitive(input.nextPrimitive, reasons);
  const finalReceipt = normalizeFinalReceipt(input.finalReceipt, reasons);
  if (reasons.length) throw new ContinuityInputError(reasons);
  return canonicalize({
    schemaVersion: 1,
    mode: 'EXECUTION_CONTINUITY_EVIDENCE',
    packetRef, phase, ownerId, activationDigest, runId,
    attemptId: input.attemptId,
    connectionObservation, runtimeCapability, ownerLiveness, executionLifecycle,
    checkpoint, journal, remoteEffect, continuationAuthority, nextPrimitive, finalReceipt,
  });
}

function decision(e, resumeDisposition, {
  result = 'PASS',
  attentionDisposition = 'COMPLETE',
  reasonCode = null,
  nextLegalAction = 'NONE',
  effectTruth = 'NOT_APPLICABLE',
  duplicateEffectSuppressed = false,
} = {}) {
  return canonicalize({
    runId: e.runId,
    attemptId: e.attemptId,
    packetRef: e.packetRef,
    phase: e.phase,
    ownerId: e.ownerId,
    connectionObservation: e.connectionObservation,
    runtimeCapability: e.runtimeCapability,
    ownerLiveness: e.ownerLiveness,
    continuityLifecycle: e.executionLifecycle,
    lastDurableCheckpoint: e.checkpoint.name,
    checkpointRank: checkpointRank(e.checkpoint.name),
    resumeDisposition,
    nextPrimitive: e.nextPrimitive.name,
    effectTruth,
    duplicateEffectSuppressed,
    result,
    attentionDisposition,
    reasonCode,
    nextLegalAction,
  });
}
function conflictDecision(e, reasonCode) {
  return decision(e, 'UNKNOWN', {
    result: 'CONFLICT',
    attentionDisposition: 'CONFLICT',
    reasonCode,
    nextLegalAction: 'TARGETED_DRILLDOWN_REQUIRED',
    effectTruth: 'CONFLICT',
  });
}
function unknownDecision(e, reasonCode) {
  return decision(e, 'UNKNOWN', {
    result: 'UNKNOWN',
    attentionDisposition: 'UNKNOWN',
    reasonCode,
    nextLegalAction: 'TARGETED_DRILLDOWN_REQUIRED',
    effectTruth: 'UNKNOWN',
  });
}

function effectTruth(e) {
  if (e.journal.state === 'CONFLICT' || e.remoteEffect.state === 'CONFLICT') {
    return {kind: 'CONFLICT', duplicateEffectSuppressed: false};
  }
  if (e.journal.state === 'EXACT') {
    return {kind: 'PROVEN_LOCAL', duplicateEffectSuppressed: false};
  }
  if (e.journal.state === 'ABSENT' && e.remoteEffect.state === 'PROVEN') {
    return {kind: 'PROVEN_REMOTE_LOST_ACK', duplicateEffectSuppressed: true};
  }
  if (e.journal.state === 'ABSENT' && e.remoteEffect.state === 'NOT_APPLICABLE') {
    return {kind: 'NOT_APPLICABLE', duplicateEffectSuppressed: false};
  }
  return {kind: 'AMBIGUOUS', duplicateEffectSuppressed: false};
}

function classifyContinuity(input) {
  const e = normalizeEvidence(input);
  let expectedRun;
  try {
    expectedRun = deriveRunId(e);
  } catch {
    return conflictDecision(e, 'RUN_ID_DERIVATION_CONFLICT');
  }
  if (e.runId !== expectedRun) return conflictDecision(e, 'RUN_ID_CONFLICT');

  if (e.checkpoint.state === 'CONFLICT'
      || e.continuationAuthority.state === 'CONFLICT'
      || e.finalReceipt.state === 'CONFLICT') {
    return conflictDecision(e, 'CONTINUITY_EVIDENCE_CONFLICT');
  }
  const truth = effectTruth(e);
  if (truth.kind === 'CONFLICT') return conflictDecision(e, 'EFFECT_EVIDENCE_CONFLICT');

  if (e.continuationAuthority.state === 'BLOCKED'
      || e.nextPrimitive.state === 'BLOCKED') {
    return decision(e, 'BLOCKED', {
      result: 'BLOCKED',
      attentionDisposition: 'BLOCKED',
      reasonCode: 'CONTINUATION_BLOCKED',
      nextLegalAction: 'RESOLVE_CONTINUATION_BLOCKER',
      effectTruth: truth.kind,
    });
  }

  if (e.executionLifecycle === 'FINISHED') {
    if (e.finalReceipt.state === 'EXACT') {
      return decision(e, 'ALREADY_FINISHED', {
        nextLegalAction: 'NO_CONTINUATION_REQUIRED',
        effectTruth: truth.kind,
        duplicateEffectSuppressed: truth.duplicateEffectSuppressed,
      });
    }
    return unknownDecision(e, 'FINAL_RECEIPT_REQUIRED_FOR_FINISHED_RUN');
  }
  if (e.finalReceipt.state === 'EXACT') {
    return conflictDecision(e, 'FINAL_RECEIPT_LIFECYCLE_CONFLICT');
  }

  if (e.ownerLiveness === 'LIVE') {
    if (e.runtimeCapability === 'DETACHED_CAPABLE') {
      return decision(e, 'OWNER_STILL_RUNNING', {
        nextLegalAction: 'OBSERVE_EXISTING_OWNER',
        effectTruth: truth.kind,
        duplicateEffectSuppressed: truth.duplicateEffectSuppressed,
      });
    }
    return unknownDecision(e, 'DETACHED_CAPABILITY_REQUIRED_FOR_LIVE_OWNER');
  }
  if (e.ownerLiveness === 'UNKNOWN') {
    return unknownDecision(e, 'OWNER_LIVENESS_UNKNOWN');
  }

  if (e.checkpoint.state !== 'EXACT') {
    if (truth.kind === 'AMBIGUOUS') {
      return decision(e, 'NEEDS_RECOVERY_INSPECT', {
        result: 'UNKNOWN',
        attentionDisposition: 'NEEDS_REVIEW',
        reasonCode: 'INTERRUPTED_EFFECT_TRUTH_AMBIGUOUS',
        nextLegalAction: 'INVOKE_EXISTING_EFFECT_RECOVERY_INSPECT',
        effectTruth: 'UNKNOWN',
      });
    }
    return unknownDecision(e, 'EXACT_CHECKPOINT_REQUIRED');
  }

  if (truth.kind === 'AMBIGUOUS') {
    return decision(e, 'NEEDS_RECOVERY_INSPECT', {
      result: 'UNKNOWN',
      attentionDisposition: 'NEEDS_REVIEW',
      reasonCode: 'INTERRUPTED_EFFECT_TRUTH_AMBIGUOUS',
      nextLegalAction: 'INVOKE_EXISTING_EFFECT_RECOVERY_INSPECT',
      effectTruth: 'UNKNOWN',
    });
  }

  if (e.continuationAuthority.state !== 'PROVEN') {
    return unknownDecision(e, 'CONTINUATION_AUTHORITY_UNPROVEN');
  }
  if (e.nextPrimitive.state !== 'PROVEN' || !e.nextPrimitive.name) {
    return unknownDecision(e, 'NEXT_PRIMITIVE_UNPROVEN');
  }
  if (e.finalReceipt.state !== 'ABSENT') {
    return unknownDecision(e, 'FINAL_RECEIPT_STATE_UNRESOLVED');
  }

  return decision(e, 'CONTINUE_FROM_CHECKPOINT', {
    nextLegalAction: 'RERUN_NEXT_PRIMITIVE_CURRENTNESS_THEN_CONTINUE',
    effectTruth: truth.kind,
    duplicateEffectSuppressed: truth.duplicateEffectSuppressed,
  });
}

function evidenceLocators(e) {
  const values = [
    e.checkpoint.evidenceLocator,
    e.journal.evidenceLocator,
    e.remoteEffect.evidenceLocator,
    e.continuationAuthority.evidenceLocator,
    e.nextPrimitive.evidenceLocator,
    e.finalReceipt.evidenceLocator,
  ].filter(Boolean);
  return [...new Set(values)].sort();
}
function stepResultFor(state, passStates) {
  if (passStates.includes(state)) return 'PASS';
  if (state === 'CONFLICT') return 'CONFLICT';
  if (state === 'BLOCKED') return 'BLOCKED';
  return 'UNKNOWN';
}

function projectExecutionReceipt(input) {
  const e = normalizeEvidence(input);
  const d = classifyContinuity(e);
  const runLocator = 'continuity-run:' + e.runId;
  const reasonCodes = d.reasonCode ? [d.reasonCode] : [];
  const requiredUnknowns = d.result === 'UNKNOWN' ? reasonCodes : [];
  const conflicts = d.result === 'CONFLICT' ? reasonCodes : [];
  const blockers = d.result === 'BLOCKED' ? reasonCodes : [];
  const checkpointEvidence = e.checkpoint.evidenceLocator || runLocator;
  const runtimeEvidence = runLocator;
  const continuationEvidence = e.continuationAuthority.evidenceLocator || runLocator;
  const finalEvidence = e.finalReceipt.evidenceLocator || runLocator;
  return executionReceipt.projectExecutionReceipt({
    schemaVersion: 2,
    operationId: 'execution-continuity:' + e.runId + ':attempt-' + e.attemptId,
    primitiveId: 'execution-continuity.v1',
    sourceIdentity: {
      kind: 'CONTINUITY_EVIDENCE',
      locator: runLocator,
      identity: e.activationDigest,
    },
    executionSurface: 'CANONICAL_MAIN:EXECUTION_CONTINUITY',
    stage: 'CONTINUATION_INSPECT',
    executionLifecycle: 'FINISHED',
    attentionDisposition: d.attentionDisposition,
    result: d.result,
    proofScope: 'pure reconnect/resume classification only; no effect or recovery authority',
    steps: [
      {name: 'run-identity', result: e.runId === deriveRunId(e) ? 'PASS' : 'CONFLICT', evidenceLocator: runLocator},
      {
        name: 'runtime-liveness',
        result: e.ownerLiveness === 'UNKNOWN' ? 'UNKNOWN' : 'PASS',
        evidenceLocator: runtimeEvidence,
      },
      {
        name: 'checkpoint-effect',
        result: d.effectTruth === 'CONFLICT' ? 'CONFLICT'
          : d.effectTruth === 'UNKNOWN' ? 'UNKNOWN' : 'PASS',
        evidenceLocator: checkpointEvidence,
      },
      {
        name: 'continuation-authority',
        result: stepResultFor(e.continuationAuthority.state, ['PROVEN']),
        evidenceLocator: continuationEvidence,
      },
      {
        name: 'final-receipt-state',
        result: stepResultFor(e.finalReceipt.state, ['EXACT', 'ABSENT']),
        evidenceLocator: finalEvidence,
      },
    ],
    counters: [
      {name: 'attempt_id', value: e.attemptId},
      {name: 'checkpoint_rank', value: checkpointRank(e.checkpoint.name) || 0},
      {name: 'duplicate_effect_suppressed', value: d.duplicateEffectSuppressed ? 1 : 0},
    ],
    affectedFiles: [],
    artifactLocators: evidenceLocators(e),
    reasonCodes,
    requiredUnknowns,
    conflicts,
    blockers,
    exitCode: null,
    stderrTail: null,
    nextLegalAction: d.nextLegalAction,
  });
}

function projectAgentView(input, {receiptLocator, reportLocator}) {
  const e = normalizeEvidence(input);
  const d = classifyContinuity(e);
  const receipt = projectExecutionReceipt(e);
  return agentDecisionView.projectAgentDecisionView({
    receipt,
    phase: 'EXECUTION_CONTINUITY',
    output: {
      runId: d.runId,
      attemptId: d.attemptId,
      continuityLifecycle: d.continuityLifecycle,
      connectionObservation: d.connectionObservation,
      runtimeCapability: d.runtimeCapability,
      lastCheckpoint: d.lastDurableCheckpoint,
      resumeDisposition: d.resumeDisposition,
      nextPrimitive: d.nextPrimitive || 'NONE',
      effectTruth: d.effectTruth,
      duplicateEffectSuppressed: d.duplicateEffectSuppressed,
    },
    attention: [],
    receiptLocator,
    reportLocator,
  });
}

function normalizeRecord(value) {
  const reasons = [];
  if (!exactKeys(value, RECORD_FIELDS, 'record', reasons)) {
    throw new ContinuityInputError(reasons);
  }
  const runId = atom(value.runId, 'record.runId', reasons, {pattern: RUN_ID_RE, maxBytes: 68});
  if (!Number.isSafeInteger(value.generation) || value.generation < 0) {
    reasons.push('RECORD_GENERATION_INVALID');
  }
  const previousRecordDigest = optionalSha(
    value.previousRecordDigest, 'record.previousRecordDigest', reasons,
    value.generation > 0,
  );
  if (value.generation === 0 && value.previousRecordDigest !== null) {
    reasons.push('RECORD_INITIAL_PREVIOUS_DIGEST_INVALID');
  }
  if (!Number.isSafeInteger(value.attemptId) || value.attemptId < 1) {
    reasons.push('RECORD_ATTEMPT_ID_INVALID');
  }
  const lifecycle = enumValue(
    value.executionLifecycle, CONTINUITY_LIFECYCLES, 'record.executionLifecycle', reasons,
  );
  const checkpoint = enumValue(
    value.lastDurableCheckpoint, CHECKPOINTS, 'record.lastDurableCheckpoint', reasons,
  );
  if (checkpoint === 'UNKNOWN') reasons.push('RECORD_CHECKPOINT_UNKNOWN');
  const checkpointEvidence = atom(
    value.checkpointEvidence, 'record.checkpointEvidence', reasons,
    {required: checkpoint !== 'NONE', maxBytes: 320},
  );
  if (checkpoint === 'NONE' && value.checkpointEvidence !== null) {
    reasons.push('RECORD_NONE_CHECKPOINT_EVIDENCE_INVALID');
  }
  const nextPrimitive = atom(
    value.nextPrimitive, 'record.nextPrimitive', reasons, {required: false, maxBytes: 160},
  );
  const finalReceiptDigest = optionalSha(
    value.finalReceiptDigest, 'record.finalReceiptDigest', reasons, false,
  );
  if (lifecycle === 'FINISHED' && !finalReceiptDigest) {
    reasons.push('RECORD_FINISHED_RECEIPT_REQUIRED');
  }
  if (reasons.length) throw new ContinuityInputError(reasons);
  return canonicalize({
    runId,
    generation: value.generation,
    previousRecordDigest,
    attemptId: value.attemptId,
    executionLifecycle: lifecycle,
    lastDurableCheckpoint: checkpoint,
    checkpointEvidence,
    nextPrimitive,
    finalReceiptDigest,
  });
}
function recordDigest(value) {
  return stableHash(normalizeRecord(value));
}
function validateRecordTransition(previousValue, nextValue) {
  const previous = previousValue === null ? null : normalizeRecord(previousValue);
  const next = normalizeRecord(nextValue);
  const reasons = [];
  if (previous === null) {
    if (next.generation !== 0) reasons.push('RECORD_INITIAL_GENERATION_INVALID');
    if (next.previousRecordDigest !== null) reasons.push('RECORD_INITIAL_PREVIOUS_DIGEST_INVALID');
  } else {
    if (next.runId !== previous.runId) reasons.push('RECORD_RUN_ID_CONFLICT');
    if (next.generation !== previous.generation + 1) reasons.push('RECORD_GENERATION_NOT_NEXT');
    if (next.previousRecordDigest !== stableHash(previous)) reasons.push('RECORD_CAS_DIGEST_CONFLICT');
    if (next.attemptId < previous.attemptId) reasons.push('RECORD_ATTEMPT_REGRESSION');
    const oldRank = checkpointRank(previous.lastDurableCheckpoint);
    const newRank = checkpointRank(next.lastDurableCheckpoint);
    if (newRank < oldRank) reasons.push('RECORD_CHECKPOINT_REGRESSION');
    if (previous.executionLifecycle === 'FINISHED' && !same(previous, next)) {
      reasons.push('RECORD_FINISHED_IMMUTABLE');
    }
  }
  return {
    ok: reasons.length === 0,
    reasonCodes: [...new Set(reasons)].sort(),
    nextDigest: reasons.length ? null : stableHash(next),
  };
}

function normalizeEffectEntry(value) {
  const reasons = [];
  if (!exactKeys(value, EFFECT_FIELDS, 'effect', reasons)) {
    throw new ContinuityInputError(reasons);
  }
  const runId = atom(value.runId, 'effect.runId', reasons, {pattern: RUN_ID_RE, maxBytes: 68});
  const primitiveId = atom(value.primitiveId, 'effect.primitiveId', reasons, {maxBytes: 160});
  const targetIdentity = atom(
    value.targetIdentity, 'effect.targetIdentity', reasons, {maxBytes: 240},
  );
  const effectKey = optionalSha(value.effectKey, 'effect.effectKey', reasons, true);
  if (!['PROVEN', 'UNKNOWN'].includes(value.status)) reasons.push('EFFECT_STATUS_INVALID');
  const evidenceLocator = atom(
    value.evidenceLocator, 'effect.evidenceLocator', reasons, {maxBytes: 320},
  );
  if (reasons.length) throw new ContinuityInputError(reasons);
  const expectedKey = deriveEffectKey({runId, primitiveId, targetIdentity});
  if (effectKey !== expectedKey) throw new ContinuityInputError(['EFFECT_KEY_CONFLICT']);
  return canonicalize({
    runId, primitiveId, targetIdentity, effectKey,
    status: value.status, evidenceLocator,
  });
}
function classifyJournalAppend(existingValue, candidateValue) {
  const candidate = normalizeEffectEntry(candidateValue);
  if (existingValue === null) {
    return {disposition: 'APPEND', reasonCodes: [], effect: candidate};
  }
  const existing = normalizeEffectEntry(existingValue);
  if (existing.effectKey !== candidate.effectKey) {
    return {disposition: 'APPEND', reasonCodes: [], effect: candidate};
  }
  if (same(existing, candidate)) {
    return {disposition: 'IDEMPOTENT', reasonCodes: [], effect: existing};
  }
  return {
    disposition: 'CONFLICT',
    reasonCodes: ['EFFECT_EVIDENCE_REWRITE_CONFLICT'],
    effect: existing,
  };
}

module.exports = {
  CHECKPOINT_RANK,
  CHECKPOINTS,
  CONNECTION_OBSERVATIONS,
  CONTINUITY_LIFECYCLES,
  ContinuityInputError,
  RESUME_DISPOSITIONS,
  RUNTIME_CAPABILITIES,
  classifyContinuity,
  classifyJournalAppend,
  checkpointRank,
  deriveEffectKey,
  deriveRunId,
  normalizeEvidence,
  normalizeRecord,
  projectAgentView,
  projectExecutionReceipt,
  recordDigest,
  validateRecordTransition,
};
