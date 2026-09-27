'use strict';

const RELATIONSHIPS = new Set([
  'DEFERRED_OWNER',
  'BLOCKED_PREDECESSOR',
  'PARENT_WAITING_ON_SUCCESSOR',
]);
const REF_RE = /^#[1-9][0-9]*$/;
const MAX_SOURCE_REFS = 12;

const REASON_CODES = Object.freeze({
  INPUT_INVALID: 'INPUT_INVALID',
  EVIDENCE_INVALID: 'EVIDENCE_INVALID',
  RELATIONSHIP_UNSUPPORTED: 'RELATIONSHIP_UNSUPPORTED',
  CANDIDATE_IDENTITY_CONFLICT: 'CANDIDATE_IDENTITY_CONFLICT',
  REQUESTER_IDENTITY_CONFLICT: 'REQUESTER_IDENTITY_CONFLICT',
  SOURCE_REFS_MISSING: 'SOURCE_REFS_MISSING',
  REPOSITORY_MUTATION_ACTIVE: 'REPOSITORY_MUTATION_ACTIVE',
  ACTIVE_LEASE_PRESENT: 'ACTIVE_LEASE_PRESENT',
  OVERLAPPING_OPEN_PR_PRESENT: 'OVERLAPPING_OPEN_PR_PRESENT',
  EXPLICIT_SEQUENCING_UNPROVEN: 'EXPLICIT_SEQUENCING_UNPROVEN',
  NONCOMPETING_RELATION_PROVEN: 'NONCOMPETING_RELATION_PROVEN',
});

function uniqueRefs(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim()))].slice(0, MAX_SOURCE_REFS);
}

function result(state, reasonCode, candidateRef, requesterRef, sourceRefs, extra = {}) {
  return {
    schemaVersion: 1,
    state,
    reasonCode,
    candidateRef: candidateRef || '<unresolved>',
    requesterRef: requesterRef || '<unresolved>',
    sourceRefs: uniqueRefs(sourceRefs),
    ...extra,
  };
}

function exactKeys(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort();
  return keys.length === allowed.length && keys.every((key, index) => key === [...allowed].sort()[index]);
}

function classifyPacketActivity(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return result('UNKNOWN', REASON_CODES.INPUT_INVALID, null, null, ['caller:input']);
  }
  const candidateRef = typeof input.candidateRef === 'string' ? input.candidateRef.trim() : '';
  const requesterRef = typeof input.requesterRef === 'string' ? input.requesterRef.trim() : '';
  if (!REF_RE.test(candidateRef) || !REF_RE.test(requesterRef)) {
    return result('UNKNOWN', REASON_CODES.INPUT_INVALID, candidateRef, requesterRef, ['caller:input']);
  }
  const evidence = input.evidence;
  const allowed = [
    'schemaVersion', 'mode', 'candidateRef', 'requesterRef', 'relationship',
    'repositoryMutationActive', 'activeLease', 'overlappingOpenPr',
    'sequencingExplicit', 'sourceRefs',
  ];
  if (!exactKeys(evidence, allowed)
      || evidence.schemaVersion !== 1
      || evidence.mode !== 'WORK_SYSTEM_PACKET_ACTIVITY_EVIDENCE'
      || typeof evidence.candidateRef !== 'string'
      || typeof evidence.requesterRef !== 'string'
      || typeof evidence.relationship !== 'string'
      || typeof evidence.repositoryMutationActive !== 'boolean'
      || typeof evidence.activeLease !== 'boolean'
      || typeof evidence.overlappingOpenPr !== 'boolean'
      || typeof evidence.sequencingExplicit !== 'boolean') {
    return result('UNKNOWN', REASON_CODES.EVIDENCE_INVALID, candidateRef, requesterRef,
      uniqueRefs(evidence?.sourceRefs).length ? evidence.sourceRefs : ['caller:packetActivityEvidence']);
  }
  const refs = uniqueRefs(evidence.sourceRefs);
  if (!REF_RE.test(evidence.candidateRef) || evidence.candidateRef !== candidateRef) {
    return result('CONFLICT', REASON_CODES.CANDIDATE_IDENTITY_CONFLICT,
      candidateRef, requesterRef, refs.length ? refs : ['caller:packetActivityEvidence']);
  }
  if (!REF_RE.test(evidence.requesterRef) || evidence.requesterRef !== requesterRef) {
    return result('CONFLICT', REASON_CODES.REQUESTER_IDENTITY_CONFLICT,
      candidateRef, requesterRef, refs.length ? refs : ['caller:packetActivityEvidence']);
  }
  if (!RELATIONSHIPS.has(evidence.relationship)) {
    return result('UNKNOWN', REASON_CODES.RELATIONSHIP_UNSUPPORTED,
      candidateRef, requesterRef, refs.length ? refs : ['caller:packetActivityEvidence']);
  }
  if (refs.length === 0) {
    return result('UNKNOWN', REASON_CODES.SOURCE_REFS_MISSING,
      candidateRef, requesterRef, ['caller:packetActivityEvidence']);
  }
  if (evidence.repositoryMutationActive) {
    return result('ACTIVE_WRITER', REASON_CODES.REPOSITORY_MUTATION_ACTIVE,
      candidateRef, requesterRef, refs, {relationship: evidence.relationship});
  }
  if (evidence.activeLease) {
    return result('ACTIVE_WRITER', REASON_CODES.ACTIVE_LEASE_PRESENT,
      candidateRef, requesterRef, refs, {relationship: evidence.relationship});
  }
  if (evidence.overlappingOpenPr) {
    return result('ACTIVE_WRITER', REASON_CODES.OVERLAPPING_OPEN_PR_PRESENT,
      candidateRef, requesterRef, refs, {relationship: evidence.relationship});
  }
  if (!evidence.sequencingExplicit) {
    return result('UNKNOWN', REASON_CODES.EXPLICIT_SEQUENCING_UNPROVEN,
      candidateRef, requesterRef, refs, {relationship: evidence.relationship});
  }
  return result('NONBLOCKING_PROVEN', REASON_CODES.NONCOMPETING_RELATION_PROVEN,
    candidateRef, requesterRef, refs, {relationship: evidence.relationship});
}

module.exports = {RELATIONSHIPS, REASON_CODES, classifyPacketActivity};
