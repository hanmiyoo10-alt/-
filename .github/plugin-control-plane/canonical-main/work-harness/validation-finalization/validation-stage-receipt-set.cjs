'use strict';

const {canonicalize, stableHash} = require('../handoff.cjs');
const stageReceipt = require('../stage-receipt.cjs');

const MAX_RECEIPTS = 16;
const MAX_RECEIPT_BYTES = 32 * 1024;
const MAX_TOTAL_BYTES = 128 * 1024;
const SHA40_RE = /^[0-9a-f]{40}$/;
const FALSE_AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});

function unique(values) {
  return [...new Set(values)].sort();
}

function result(status, receipts = [], core = null, reasonCodes = []) {
  const receiptDigests = receipts.map((receipt) => receipt.receiptDigest).sort();
  return {
    schemaVersion: 1,
    mode: 'CANONICAL_VALIDATION_STAGE_RECEIPT_SET',
    status,
    uniqueReceiptCount: receiptDigests.length,
    receiptDigests,
    representativeReceiptDigest: receiptDigests[0] || null,
    validationCoreDigest: core ? 'sha256:' + stableHash(core) : null,
    validationCore: core,
    evidenceVariants: receiptDigests.length > 1,
    reasonCodes: unique(reasonCodes),
    mutationAuthorized: false,
    executionAuthorized: false,
    authority: {...FALSE_AUTHORITY},
  };
}

function coreResult(status, core = null, reasonCodes = []) {
  return {status, core, reasonCodes: unique(reasonCodes)};
}

function validationCore(receipt) {
  if (receipt.stage !== 'VALIDATION_MERGE') {
    return coreResult('CONFLICT', null, ['VALIDATION_STAGE_REQUIRED']);
  }
  const prRows = receipt.authorityRefs.filter((row) => row.kind === 'PR');
  if (prRows.length !== 1) {
    return coreResult(prRows.length ? 'CONFLICT' : 'UNKNOWN', null,
      [prRows.length ? 'PR_IDENTITY_AMBIGUOUS' : 'PR_IDENTITY_MISSING']);
  }
  const prRow = prRows[0];
  const prMatch = /^pr:#([1-9][0-9]*)$/.exec(prRow.locator || '');
  if (!prMatch || prRow.status !== 'KNOWN' || !SHA40_RE.test(prRow.identity || '')) {
    return coreResult('UNKNOWN', null, ['PR_IDENTITY_INVALID']);
  }
  const candidateHead = prRow.identity;

  const mergeIdentities = unique(receipt.authorityRefs
    .filter((row) => row.kind === 'COMMIT' && row.status === 'KNOWN')
    .map((row) => row.identity)
    .filter((identity) => identity !== candidateHead));
  if (mergeIdentities.length !== 1 || !SHA40_RE.test(mergeIdentities[0] || '')) {
    return coreResult(mergeIdentities.length > 1 ? 'CONFLICT' : 'UNKNOWN', null,
      [mergeIdentities.length > 1 ? 'MERGE_IDENTITY_AMBIGUOUS' : 'MERGE_IDENTITY_MISSING']);
  }
  const mergeCommit = mergeIdentities[0];

  const mainRows = receipt.authorityRefs.filter((row) =>
    row.kind === 'GIT_REF' && row.locator === 'refs/heads/main');
  if (mainRows.some((row) => row.status !== 'KNOWN' || row.identity !== mergeCommit)) {
    return coreResult('CONFLICT', null, ['MAIN_MERGE_IDENTITY_CONFLICT']);
  }

  if (!receipt.scope || receipt.scope.diffRequired !== true
      || !/^[0-9a-f]{64}$/.test(receipt.scope.diffIdentity || '')) {
    return coreResult('CONFLICT', null, ['DIFF_IDENTITY_REQUIRED']);
  }
  if (receipt.nextLegalAction !== 'POSTMERGE_CONVERGENCE') {
    return coreResult('CONFLICT', null, ['NEXT_ACTION_CONFLICT']);
  }

  return coreResult('VALID', canonicalize({
    packetNumber: receipt.packetNumber,
    stage: receipt.stage,
    status: receipt.status,
    prNumber: Number(prMatch[1]),
    candidateHead,
    mergeCommit,
    scopePaths: [...receipt.scope.paths],
    diffIdentity: receipt.scope.diffIdentity,
    proofTerms: unique(receipt.proof.map((row) => row.term)),
    requiredUnknowns: [...receipt.requiredUnknowns],
    conflicts: [...receipt.conflicts],
    blockers: [...receipt.blockers],
    dependencies: [...receipt.dependencies],
    nextLegalAction: receipt.nextLegalAction,
  }));
}

function classify(receiptTexts) {
  if (!Array.isArray(receiptTexts)
      || receiptTexts.length < 1
      || receiptTexts.length > MAX_RECEIPTS) {
    return result('UNKNOWN', [], null, ['RECEIPT_TEXTS_INVALID']);
  }
  let totalBytes = 0;
  for (const text of receiptTexts) {
    if (typeof text !== 'string') {
      return result('UNKNOWN', [], null, ['RECEIPT_TEXT_INVALID']);
    }
    const size = Buffer.byteLength(text, 'utf8');
    totalBytes += size;
    if (size > MAX_RECEIPT_BYTES || totalBytes > MAX_TOTAL_BYTES) {
      return result('UNKNOWN', [], null, ['RECEIPT_TEXT_TOO_LARGE']);
    }
  }

  const byDigest = new Map();
  let sawUnknown = false;
  for (const text of receiptTexts) {
    const parsed = stageReceipt.parseRenderedStageReceipt(text);
    if (parsed.status === 'CONFLICT') {
      return result('CONFLICT', [], null,
        parsed.reasonCodes.map((code) => 'RECEIPT_PARSE:' + code));
    }
    if (parsed.status !== 'VALID') {
      sawUnknown = true;
      continue;
    }
    byDigest.set(parsed.value.receiptDigest, parsed.value);
  }
  if (sawUnknown) return result('UNKNOWN', [...byDigest.values()], null,
    ['CANONICAL_RECEIPT_UNRESOLVED']);
  if (!byDigest.size) return result('UNKNOWN', [], null, ['NO_VALID_RECEIPTS']);

  const receipts = [...byDigest.values()].sort((a, b) =>
    a.receiptDigest.localeCompare(b.receiptDigest));
  const cores = [];
  let coreUnknown = false;
  for (const receipt of receipts) {
    const projected = validationCore(receipt);
    if (projected.status === 'CONFLICT') {
      return result('CONFLICT', receipts, null, projected.reasonCodes);
    }
    if (projected.status !== 'VALID') {
      coreUnknown = true;
      continue;
    }
    cores.push(projected.core);
  }
  if (coreUnknown) return result('UNKNOWN', receipts, null,
    ['VALIDATION_CORE_UNRESOLVED']);

  const coreDigests = unique(cores.map((core) => stableHash(core)));
  if (coreDigests.length !== 1) {
    return result('CONFLICT', receipts, null, ['VALIDATION_CORE_CONFLICT']);
  }
  const core = cores[0];
  if (core.status !== 'PASS') {
    const unresolved = ['UNKNOWN', 'BLOCKED'].includes(core.status);
    return result(unresolved ? 'UNKNOWN' : 'CONFLICT', receipts, core,
      ['VALIDATION_RECEIPT_NOT_PASS']);
  }
  return result(receipts.length === 1 ? 'SINGLE' : 'MULTIPLE_EQUIVALENT',
    receipts, core, []);
}

module.exports = {
  FALSE_AUTHORITY,
  MAX_RECEIPTS,
  MAX_RECEIPT_BYTES,
  MAX_TOTAL_BYTES,
  classify,
  result,
  validationCore,
};
