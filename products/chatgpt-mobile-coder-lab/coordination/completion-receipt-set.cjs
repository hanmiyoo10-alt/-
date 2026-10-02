#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const handoff = require('./task-handoff.cjs');

const SHA256_RE = /^[0-9a-f]{64}$/;
const INPUT_KEYS = new Set(['manifestId', 'receiptTexts']);
const MAX_INPUT_BYTES = 128 * 1024;
const MAX_RECEIPT_BYTES = 32 * 1024;
const MAX_RECEIPTS = 16;
const FALSE_AUTHORITY = Object.freeze({...handoff.AUTHORITY_FLAGS});

function unique(values) {
  return [...new Set(values)].sort();
}
function unknown(manifestId, reasonCodes) {
  return result('UNKNOWN', manifestId, [], null, null, 'UNKNOWN', reasonCodes);
}
function result(status, manifestId, receiptIds, representativeReceiptId,
  completionCoreDigest, evidenceVariants, reasonCodes) {
  return {
    schemaVersion: 1,
    mode: 'MCL_COMPLETION_RECEIPT_SET',
    status,
    manifestId: SHA256_RE.test(manifestId || '') ? manifestId : 'UNKNOWN',
    uniqueReceiptCount: receiptIds.length,
    representativeReceiptId,
    receiptIds,
    completionCoreDigest,
    evidenceVariants,
    reasonCodes: unique(reasonCodes),
    details: 'withheld',
    authority: {...FALSE_AUTHORITY},
  };
}
function validateInput(input) {
  const reasons = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return ['INPUT_OBJECT_REQUIRED'];
  }
  for (const key of Object.keys(input)) {
    if (!INPUT_KEYS.has(key)) reasons.push('INPUT_UNKNOWN_FIELD:' + key);
  }
  for (const key of INPUT_KEYS) {
    if (!(key in input)) reasons.push('INPUT_FIELD_REQUIRED:' + key);
  }
  if (!SHA256_RE.test(input.manifestId || '')) reasons.push('MANIFEST_ID_INVALID');
  if (!Array.isArray(input.receiptTexts)
      || input.receiptTexts.length < 1
      || input.receiptTexts.length > MAX_RECEIPTS) {
    reasons.push('RECEIPT_TEXTS_INVALID');
  } else {
    for (const text of input.receiptTexts) {
      if (typeof text !== 'string'
          || Buffer.byteLength(text, 'utf8') > MAX_RECEIPT_BYTES) {
        reasons.push('RECEIPT_TEXT_INVALID');
      }
    }
  }
  return unique(reasons);
}
function completionCore(receipt) {
  const core = {
    manifestId: receipt.manifestId,
    manifestPayloadSha256: receipt.manifestPayloadSha256,
    packetRef: receipt.packetRef,
    phaseId: receipt.phaseId,
    executor: receipt.executor,
    disposition: receipt.disposition,
    leaseDisposition: receipt.leaseDisposition,
    leaseReleaseEvidence: receipt.leaseReleaseEvidence ? {
      ledgerRef: receipt.leaseReleaseEvidence.ledgerRef,
      leaseId: receipt.leaseReleaseEvidence.leaseId,
      releasedGeneration: receipt.leaseReleaseEvidence.releasedGeneration,
    } : null,
    workspaceResult: receipt.workspaceResult,
    blockerRefs: receipt.blockerRefs,
    requiredUnknownRefs: receipt.requiredUnknownRefs,
    authority: receipt.authority,
  };
  if (receipt.workspacePreservation) {
    core.workspacePreservation = {
      kind: receipt.workspacePreservation.kind,
      beforeSha256: receipt.workspacePreservation.beforeSha256,
      afterSha256: receipt.workspacePreservation.afterSha256,
      preservedPathRefs: receipt.workspacePreservation.preservedPathRefs,
    };
  }
  return core;
}
function evidenceSnapshot(receipt) {
  const evidence = {
    outputRefs: receipt.outputRefs,
    validationRefs: receipt.validationRefs,
    observedRefs: receipt.observedRefs,
    evidenceRef: receipt.leaseReleaseEvidence?.evidenceRef ?? null,
  };
  if (receipt.workspacePreservation) {
    evidence.workspacePreservationEvidenceRef = receipt.workspacePreservation.evidenceRef;
  }
  return evidence;
}
function classify(input) {
  const inputReasons = validateInput(input);
  if (inputReasons.length) return unknown(input?.manifestId, inputReasons);

  const byId = new Map();
  const invalidReasons = [];
  for (const text of input.receiptTexts) {
    const parsed = handoff.parseCompletionReceipt(text);
    if (parsed.status !== 'VALID') {
      invalidReasons.push('RECEIPT_INVALID');
      continue;
    }
    const receipt = parsed.value;
    if (receipt.disposition !== 'COMPLETE') {
      invalidReasons.push('RECEIPT_NOT_COMPLETE');
      continue;
    }
    if (receipt.manifestId !== input.manifestId) {
      invalidReasons.push('RECEIPT_MANIFEST_MISMATCH');
      continue;
    }
    if (!byId.has(receipt.receiptId)) byId.set(receipt.receiptId, receipt);
  }
  if (invalidReasons.length) return unknown(input.manifestId, invalidReasons);
  if (!byId.size) return unknown(input.manifestId, ['NO_VALID_RECEIPTS']);

  const receipts = [...byId.values()].sort((a, b) =>
    a.receiptId.localeCompare(b.receiptId));
  const receiptIds = receipts.map((item) => item.receiptId);
  const coreDigests = receipts.map((item) => handoff.digest(completionCore(item)));
  const uniqueCoreDigests = unique(coreDigests);
  if (uniqueCoreDigests.length !== 1) {
    return result('CONFLICT', input.manifestId, receiptIds, null, null,
      'UNKNOWN', ['COMPLETION_CORE_CONFLICT']);
  }

  const evidenceDigests = unique(receipts.map((item) =>
    handoff.digest(evidenceSnapshot(item))));
  const status = receipts.length === 1 ? 'SINGLE' : 'MULTIPLE_EQUIVALENT';
  return result(status, input.manifestId, receiptIds, receiptIds[0],
    uniqueCoreDigests[0], evidenceDigests.length > 1, []);
}
function readInput(filePath) {
  const resolved = path.resolve(filePath);
  const stat = fs.lstatSync(resolved);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error('INPUT_FILE_NOT_REGULAR');
  }
  if (stat.size > MAX_INPUT_BYTES) throw new Error('INPUT_FILE_TOO_LARGE');
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}
function parseArgs(argv) {
  if (argv.length !== 2 || argv[0] !== '--input-file' || !argv[1]) {
    throw new Error('usage: completion-receipt-set.cjs --input-file <regular-json-file>');
  }
  return path.resolve(argv[1]);
}
function exitCodeFor(status) {
  if (status === 'SINGLE' || status === 'MULTIPLE_EQUIVALENT') return 0;
  if (status === 'CONFLICT') return 3;
  return 2;
}
function runCli(argv = process.argv.slice(2)) {
  let output;
  try {
    output = classify(readInput(parseArgs(argv)));
  } catch (error) {
    output = unknown(null, [
      error?.message === 'INPUT_FILE_TOO_LARGE'
        ? 'INPUT_FILE_TOO_LARGE'
        : error?.message === 'INPUT_FILE_NOT_REGULAR'
          ? 'INPUT_FILE_NOT_REGULAR'
          : 'INPUT_READ_OR_JSON_INVALID',
    ]);
  }
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  return exitCodeFor(output.status);
}

if (require.main === module) process.exitCode = runCli();

module.exports = {
  FALSE_AUTHORITY,
  INPUT_KEYS,
  MAX_INPUT_BYTES,
  MAX_RECEIPT_BYTES,
  MAX_RECEIPTS,
  classify,
  completionCore,
  evidenceSnapshot,
  exitCodeFor,
  parseArgs,
  readInput,
  result,
  runCli,
  validateInput,
};
