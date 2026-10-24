#!/usr/bin/env node
'use strict';

const REPO = 'hanmiyoo10-alt/-';
const REPO_OWNER = 'hanmiyoo10-alt';
const STALE_THRESHOLD_MS = 20 * 60 * 1000;
const CODEX_REVIEW_AUTHOR = 'chatgpt-codex-connector[bot]';
const CODEX_REVIEW_SUMMARY_MARKER = '<!-- codex-pull-request-review-summary -->';
const RECOVERY_MARKER_PREFIX = '<!-- canonical-main-codex-review-recovery:v1 ';
const RECOVERY_MARKER_RE = /<!-- canonical-main-codex-review-recovery:v1 ([^\r\n]*?) -->/g;
const SHA40_RE = /^[0-9a-f]{40}$/;
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

class RecoveryError extends Error {
  constructor(disposition, reasonCodes) {
    super(reasonCodes[0] || disposition);
    this.disposition = disposition;
    this.reasonCodes = [...new Set(reasonCodes)].sort();
  }
}

function defaultValidationMerge() {
  return require('../validation-merge/validation-merge-owner.cjs');
}

function exactObjectKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length
    && actual.every((key, index) => key === wanted[index]);
}

function fixedRetriggerBody(headSha) {
  if (!SHA40_RE.test(String(headSha || ''))) {
    throw new RecoveryError('UNKNOWN', ['HEAD_SHA_INVALID']);
  }
  return '@codex review\n\n'
    + RECOVERY_MARKER_PREFIX
    + JSON.stringify({schemaVersion: 1, expectedHead: headSha})
    + ' -->';
}

async function api(client, endpoint, label) {
  try {
    return await client.api(endpoint);
  } catch {
    throw new RecoveryError('UNKNOWN', ['GITHUB_READ_FAILED_' + label]);
  }
}

async function fetchPagedComments(client, prNumber) {
  const rows = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const value = await api(client,
      '/issues/' + prNumber + '/comments?per_page=' + PAGE_SIZE + '&page=' + page,
      'PR_COMMENTS');
    if (!Array.isArray(value)) {
      throw new RecoveryError('UNKNOWN', ['PR_COMMENT_INVENTORY_INVALID']);
    }
    rows.push(...value);
    if (value.length < PAGE_SIZE) return rows;
  }
  throw new RecoveryError('UNKNOWN', ['PR_COMMENT_INVENTORY_INCOMPLETE']);
}

function classifyReviewBarrierError(error) {
  const reasons = Array.isArray(error?.reasonCodes) ? error.reasonCodes : [];
  if (error?.kind === 'NEEDS_REVIEW'
      && reasons.length === 1
      && reasons[0] === 'CODEX_REVIEW_PENDING') {
    return {pending: true};
  }
  if (error?.kind === 'UNKNOWN' || error?.kind === 'CONFLICT') {
    throw new RecoveryError(error.kind, reasons.length ? reasons : ['REVIEW_BARRIER_UNKNOWN']);
  }
  if (error?.kind === 'BLOCKED' || error?.kind === 'FAIL' || error?.kind === 'NEEDS_REVIEW') {
    return {
      pending: false,
      disposition: 'NO_EFFECT',
      reasonCodes: reasons.length ? reasons : ['REVIEW_NOT_RECOVERY_ELIGIBLE'],
    };
  }
  throw new RecoveryError('UNKNOWN', ['REVIEW_BARRIER_UNCLASSIFIED']);
}

function currentnessDisposition(error) {
  const reasons = Array.isArray(error?.reasonCodes) ? error.reasonCodes : [];
  if (error?.kind === 'BLOCKED'
      && reasons.some((code) => (
        code === 'PR_HEAD_BEHIND_STRICT_BASE'
        || code === 'PR_HEAD_NOT_CURRENT_MAIN_ANCESTOR'
      ))) {
    return {currentize: true, reasonCodes: reasons};
  }
  if (error?.kind === 'UNKNOWN' || error?.kind === 'CONFLICT') {
    throw new RecoveryError(error.kind, reasons.length ? reasons : ['PR_CURRENTNESS_UNKNOWN']);
  }
  throw new RecoveryError('UNKNOWN', reasons.length ? reasons : ['PR_CURRENTNESS_UNCLASSIFIED']);
}

function exactHeadRecoveryMarkers(comments, expectedHead) {
  const exact = [];
  for (const row of comments) {
    if (row?.user?.login !== REPO_OWNER || typeof row?.body !== 'string'
        || !row.body.includes(RECOVERY_MARKER_PREFIX)) continue;
    const matches = [...row.body.matchAll(RECOVERY_MARKER_RE)];
    if (matches.length !== 1) {
      throw new RecoveryError('UNKNOWN', ['RECOVERY_MARKER_INVALID']);
    }
    let payload;
    try {
      payload = JSON.parse(matches[0][1]);
    } catch {
      throw new RecoveryError('UNKNOWN', ['RECOVERY_MARKER_INVALID']);
    }
    if (!exactObjectKeys(payload, ['schemaVersion', 'expectedHead'])
        || payload.schemaVersion !== 1
        || !SHA40_RE.test(String(payload.expectedHead || ''))) {
      throw new RecoveryError('UNKNOWN', ['RECOVERY_MARKER_INVALID']);
    }
    if (payload.expectedHead === expectedHead) exact.push(row);
  }
  if (exact.length > 1) {
    throw new RecoveryError('CONFLICT', ['RECOVERY_MARKER_DUPLICATE']);
  }
  return exact;
}

function baseResult(prNumber, headSha, disposition, reasonCodes, extra = {}) {
  return {
    schemaVersion: 1,
    mode: 'CANONICAL_MAIN_CODEX_REVIEW_RECOVERY',
    repository: REPO,
    prNumber,
    expectedHead: headSha || null,
    staleThresholdMinutes: 20,
    disposition,
    reasonCodes: [...new Set(reasonCodes)].sort(),
    retriggerBody: null,
    repositoryMutationAuthorized: false,
    networkWriteAuthorized: false,
    prCommentWriteAuthorized: false,
    mergeAuthorized: false,
    branchMutationAuthorized: false,
    releaseAuthorized: false,
    productionAuthorized: false,
    effectAuthorized: false,
    ...extra,
  };
}

function parseUpdatedAt(value, nowMs) {
  if (typeof value !== 'string' || !value) {
    throw new RecoveryError('UNKNOWN', ['CODEX_SUMMARY_UPDATED_AT_INVALID']);
  }
  const updatedMs = Date.parse(value);
  if (!Number.isFinite(updatedMs)) {
    throw new RecoveryError('UNKNOWN', ['CODEX_SUMMARY_UPDATED_AT_INVALID']);
  }
  if (updatedMs > nowMs) {
    throw new RecoveryError('UNKNOWN', ['CODEX_SUMMARY_UPDATED_AT_FUTURE']);
  }
  return updatedMs;
}

async function inspectWithClient({client, prNumber, nowMs = Date.now(), validationMerge = null}) {
  if (!client || typeof client.api !== 'function') {
    throw new RecoveryError('UNKNOWN', ['CLIENT_INVALID']);
  }
  if (!Number.isSafeInteger(prNumber) || prNumber <= 0) {
    throw new RecoveryError('UNKNOWN', ['PR_NUMBER_INVALID']);
  }
  if (!Number.isFinite(nowMs)) {
    throw new RecoveryError('UNKNOWN', ['CLOCK_INVALID']);
  }

  const vm = validationMerge || defaultValidationMerge();
  const current = await vm.readCurrentMain(client);
  const firstPr = await api(client, '/pulls/' + prNumber, 'PR_FIRST');
  if (!firstPr || Number(firstPr.number) !== prNumber) {
    throw new RecoveryError('UNKNOWN', ['PR_IDENTITY_INVALID']);
  }
  const headSha = String(firstPr?.head?.sha || '');
  if (!SHA40_RE.test(headSha) || firstPr?.head?.repo?.full_name !== REPO) {
    throw new RecoveryError('CONFLICT', ['PR_HEAD_IDENTITY_INVALID']);
  }
  if (firstPr.state !== 'open' || firstPr.draft === true) {
    return baseResult(prNumber, headSha, 'NO_EFFECT', ['PR_NOT_OPEN_NON_DRAFT']);
  }
  if (firstPr?.base?.ref !== 'main') {
    return baseResult(prNumber, headSha, 'NO_EFFECT', ['PR_BASE_NOT_MAIN']);
  }
  if (firstPr?.base?.sha !== current.mainSha) {
    return baseResult(prNumber, headSha, 'CURRENTIZE_FIRST', ['PR_BASE_NOT_CURRENT_MAIN']);
  }

  try {
    await vm.readStrictPrMergeState(client, prNumber, headSha);
    await vm.readStrictAncestry(client, current.mainSha, headSha);
  } catch (error) {
    const classified = currentnessDisposition(error);
    if (classified.currentize) {
      return baseResult(prNumber, headSha, 'CURRENTIZE_FIRST', classified.reasonCodes);
    }
  }

  await vm.readRequiredEvidence(client, headSha, prNumber);

  try {
    await vm.readReviewBarrier(client, prNumber, headSha);
    return baseResult(prNumber, headSha, 'NO_EFFECT', ['CODEX_REVIEW_TERMINAL']);
  } catch (error) {
    const classified = classifyReviewBarrierError(error);
    if (!classified.pending) {
      return baseResult(prNumber, headSha, classified.disposition, classified.reasonCodes);
    }
  }

  const comments = await fetchPagedComments(client, prNumber);
  const summaries = comments.filter((row) => (
    row?.user?.login === CODEX_REVIEW_AUTHOR
    && typeof row?.body === 'string'
    && row.body.includes(CODEX_REVIEW_SUMMARY_MARKER)
  ));
  if (summaries.length !== 1) {
    throw new RecoveryError('UNKNOWN', ['CODEX_SUMMARY_METADATA_CONFLICT']);
  }
  const summary = summaries[0];
  const updatedMs = parseUpdatedAt(summary.updated_at, nowMs);
  const ageMs = nowMs - updatedMs;

  const exactBody = fixedRetriggerBody(headSha);
  const prior = exactHeadRecoveryMarkers(comments, headSha);
  if (prior.length === 1) {
    return baseResult(prNumber, headSha, 'ALREADY_RETRIGGERED',
      ['EXACT_HEAD_RECOVERY_MARKER_PRESENT'], {
        summaryCommentId: Number.isInteger(summary.id) ? summary.id : null,
        summaryUpdatedAt: summary.updated_at,
        staleAgeMs: ageMs,
      });
  }

  if (ageMs < STALE_THRESHOLD_MS) {
    return baseResult(prNumber, headSha, 'TOO_YOUNG',
      ['CODEX_REVIEW_PENDING_BELOW_STALE_THRESHOLD'], {
        summaryCommentId: Number.isInteger(summary.id) ? summary.id : null,
        summaryUpdatedAt: summary.updated_at,
        staleAgeMs: ageMs,
      });
  }

  const secondPr = await api(client, '/pulls/' + prNumber, 'PR_SECOND');
  if (!secondPr || secondPr.state !== 'open' || secondPr.draft === true
      || secondPr?.head?.repo?.full_name !== REPO
      || secondPr?.head?.sha !== headSha
      || secondPr?.base?.ref !== 'main'
      || secondPr?.base?.sha !== current.mainSha) {
    return baseResult(prNumber, headSha, 'NO_EFFECT',
      ['PR_IDENTITY_CHANGED_DURING_INSPECTION']);
  }

  return baseResult(prNumber, headSha, 'ELIGIBLE', ['CODEX_REVIEW_PENDING_STALE'], {
    summaryCommentId: Number.isInteger(summary.id) ? summary.id : null,
    summaryUpdatedAt: summary.updated_at,
    staleAgeMs: ageMs,
    retriggerBody: exactBody,
  });
}

module.exports = {
  REPO,
  REPO_OWNER,
  STALE_THRESHOLD_MS,
  RECOVERY_MARKER_PREFIX,
  Recovery_MARKER_RE: RECOVERY_MARKER_RE,
  RecoveryError,
  exactHeadRecoveryMarkers,
  fixedRetriggerBody,
  inspectWithClient,
};
