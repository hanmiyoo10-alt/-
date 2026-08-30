'use strict';

const e15 = require('./release_handoff_e15.cjs');

const CAPSULE_SCHEMA = 1;
const CAPSULE_KIND = 'usage-dashboard-e16-merge-authority-capsule';
const CAPSULE_AUTHORITY = 'derived-read-only';
const CAPSULE_NEXT = 'assistant-fresh-reread-and-expected-head-merge';
const READY_VERDICTS = new Set([
  'MERGE_READY_NO_DRIFT',
  'MERGE_READY_WITH_UNRELATED_MAIN_DRIFT',
]);

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function requireObject(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
  return value;
}

function requireString(value, code) {
  const text = String(value ?? '').trim();
  if (!text) fail(code);
  if (/[\r\n]/.test(text)) fail(code, 'multiline');
  return text;
}

function requireNumber(value, code) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) fail(code, String(value));
  return number;
}

function normalizeSha(value, code) {
  const sha = String(value || '').trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(sha)) fail(code, sha || 'missing');
  return sha;
}

function compileMergeCapsule(input = {}) {
  const repository = requireString(input.repository, 'E16_REPOSITORY_MISSING');
  const requestNumber = requireNumber(input.requestNumber, 'E16_REQUEST_NUMBER_INVALID');
  const freshMainSha = normalizeSha(input.freshMainSha, 'E16_FRESH_MAIN_SHA_INVALID');
  const request = requireObject(input.request, 'E16_REQUEST_MISSING');
  const pr = requireObject(input.pr, 'E16_PR_MISSING');
  const validation = requireObject(input.validation, 'E16_VALIDATION_MISSING');
  const mergeGuard = requireObject(input.mergeGuard, 'E16_MERGE_GUARD_MISSING');
  const materialization = requireObject(input.materialization, 'E16_MATERIALIZATION_MISSING');

  const releaseVersion = requireString(request.releaseVersion, 'E16_REQUEST_VERSION_MISSING');
  const sourceSha = normalizeSha(request.sourceSha, 'E16_REQUEST_SOURCE_SHA_INVALID');
  if (request.releaseGeneration !== 'E13') {
    fail('E16_REQUEST_GENERATION_DENIED', String(request.releaseGeneration || 'missing'));
  }

  const requestPrNumber = requireNumber(request.prNumber, 'E16_REQUEST_PR_NUMBER_INVALID');
  const prNumber = requireNumber(pr.number, 'E16_PR_NUMBER_INVALID');
  if (requestPrNumber !== prNumber) fail('E16_PR_NUMBER_MISMATCH', `${prNumber}:expected=${requestPrNumber}`);
  if (pr.base?.ref !== 'main') fail('E16_PR_BASE_DENIED', String(pr.base?.ref || 'missing'));
  if (pr.head?.repo?.full_name !== repository) {
    fail('E16_PR_REPOSITORY_DENIED', String(pr.head?.repo?.full_name || 'missing'));
  }

  const expectedBranch = `stage/usage-dashboard-${releaseVersion}`;
  const prHeadBranch = requireString(pr.head?.ref, 'E16_PR_HEAD_BRANCH_MISSING');
  if (prHeadBranch !== expectedBranch) fail('E16_PR_HEAD_BRANCH_MISMATCH', `${prHeadBranch}:expected=${expectedBranch}`);
  const expectedHeadSha = normalizeSha(pr.head?.sha, 'E16_PR_HEAD_SHA_INVALID');

  try {
    e15.validateStablePrBody(pr.body || '', requestNumber);
  } catch (error) {
    fail('E16_E15_HANDOFF_INVALID', String(error?.message || error));
  }

  if (validation.status !== 'GREEN') {
    fail('E16_VALIDATION_NOT_GREEN', String(validation.status || 'missing'));
  }
  const validatedSha = normalizeSha(validation.validatedSha, 'E16_VALIDATED_SHA_INVALID');
  if (validatedSha !== expectedHeadSha) {
    fail('E16_VALIDATED_SHA_MISMATCH', `${validatedSha}:expected=${expectedHeadSha}`);
  }

  const materializationVersion = requireString(materialization.version, 'E16_MATERIALIZATION_VERSION_MISSING');
  const materializationSourceSha = normalizeSha(materialization.sourceSha, 'E16_MATERIALIZATION_SOURCE_SHA_INVALID');
  if (materializationVersion !== releaseVersion) {
    fail('E16_MATERIALIZATION_VERSION_MISMATCH', `${materializationVersion}:expected=${releaseVersion}`);
  }
  if (materializationSourceSha !== sourceSha) {
    fail('E16_MATERIALIZATION_SOURCE_SHA_MISMATCH', `${materializationSourceSha}:expected=${sourceSha}`);
  }

  const mergeCandidateSha = normalizeSha(mergeGuard.candidateSha, 'E16_MERGE_GUARD_CANDIDATE_SHA_INVALID');
  if (mergeCandidateSha !== expectedHeadSha) {
    fail('E16_MERGE_GUARD_CANDIDATE_SHA_MISMATCH', `${mergeCandidateSha}:expected=${expectedHeadSha}`);
  }
  const mergeMainSha = normalizeSha(mergeGuard.currentMainSha, 'E16_MERGE_GUARD_MAIN_SHA_INVALID');
  if (mergeMainSha !== freshMainSha) {
    fail('E16_MERGE_GUARD_MAIN_SHA_MISMATCH', `${mergeMainSha}:expected=${freshMainSha}`);
  }
  if (!READY_VERDICTS.has(mergeGuard.verdict)) {
    fail('E16_MERGE_GUARD_NOT_READY', String(mergeGuard.verdict || 'missing'));
  }

  const candidateBaseSha = normalizeSha(mergeGuard.candidateBaseSha, 'E16_CANDIDATE_BASE_SHA_INVALID');
  const candidateBaseSource = requireString(mergeGuard.candidateBaseSource, 'E16_CANDIDATE_BASE_SOURCE_MISSING');
  const candidateDagMode = requireString(mergeGuard.candidateDagMode, 'E16_CANDIDATE_DAG_MODE_MISSING');

  return Object.freeze({
    schema: CAPSULE_SCHEMA,
    kind: CAPSULE_KIND,
    releaseVersion,
    requestNumber,
    sourceSha,
    releaseGeneration: 'E13',
    prNumber,
    prHeadBranch,
    expectedHeadSha,
    freshMainSha,
    validationStatus: 'GREEN',
    mergeGuardVerdict: mergeGuard.verdict,
    candidateBaseSha,
    candidateBaseSource,
    candidateDagMode,
    candidateMaterializationVersion: materializationVersion,
    candidateMaterializationSourceSha: materializationSourceSha,
    authority: CAPSULE_AUTHORITY,
    next: CAPSULE_NEXT,
  });
}

function markerForCapsule(capsule) {
  const value = requireObject(capsule, 'E16_CAPSULE_MISSING');
  return `UD_E16_MERGE_CAPSULE:${normalizeSha(value.expectedHeadSha, 'E16_CAPSULE_HEAD_SHA_INVALID')}:${normalizeSha(value.freshMainSha, 'E16_CAPSULE_MAIN_SHA_INVALID')}`;
}

function formatMergeCapsule(capsule) {
  const value = requireObject(capsule, 'E16_CAPSULE_MISSING');
  const marker = markerForCapsule(value);
  return [
    marker,
    `schema: ${value.schema}`,
    `kind: ${value.kind}`,
    `release: ${value.releaseVersion}`,
    `request: #${value.requestNumber}`,
    `source_sha: ${value.sourceSha}`,
    `release_generation: ${value.releaseGeneration}`,
    `pr: #${value.prNumber}`,
    `expected_head_sha: ${value.expectedHeadSha}`,
    `fresh_main_sha: ${value.freshMainSha}`,
    `validation: ${value.validationStatus}`,
    `merge_guard: ${value.mergeGuardVerdict}`,
    `candidate_base_sha: ${value.candidateBaseSha}`,
    `candidate_base_source: ${value.candidateBaseSource}`,
    `candidate_dag_mode: ${value.candidateDagMode}`,
    `authority: ${value.authority}`,
    `next: ${value.next}`,
  ].join('\n');
}

module.exports = {
  CAPSULE_SCHEMA,
  CAPSULE_KIND,
  CAPSULE_AUTHORITY,
  CAPSULE_NEXT,
  READY_VERDICTS,
  compileMergeCapsule,
  markerForCapsule,
  formatMergeCapsule,
};
