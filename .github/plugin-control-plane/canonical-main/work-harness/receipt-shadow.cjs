'use strict';

const { parseReceiptMarker, validateCoordinationReceipt } = require('./receipt.cjs');

const RECEIPT_STATES = Object.freeze(['ABSENT', 'VALID', 'STALE', 'INVALID']);

function sortedUnique(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter((value) => typeof value === 'string' && value))].sort();
}

function issueMap(issues) {
  const map = new Map();
  for (const issue of Array.isArray(issues) ? issues : []) {
    if (Number.isInteger(issue && issue.number)) map.set(issue.number, issue);
  }
  return map;
}

function entry(workId, issueNumber, status, reasonCodes, receiptId = null) {
  if (!RECEIPT_STATES.includes(status)) throw new Error(`unsupported receipt shadow state: ${status}`);
  return {
    workId,
    issueNumber: Number.isInteger(issueNumber) ? issueNumber : null,
    status,
    receiptId: typeof receiptId === 'string' && receiptId ? receiptId : null,
    reasonCodes: sortedUnique(reasonCodes),
    coordinationReady: status === 'VALID',
    mutationAuthorized: false,
    executionAuthorized: false,
  };
}

function summarize(results) {
  const counts = { total: results.length, absent: 0, valid: 0, stale: 0, invalid: 0 };
  for (const result of results) counts[result.status.toLowerCase()] += 1;
  return counts;
}

function revalidateActiveWorkReceipts({ issues, discovery, observedRefs, adapterRegistry, projectRegistry } = {}) {
  const records = Array.isArray(discovery && discovery.records) ? discovery.records : [];
  const provenance = Array.isArray(discovery && discovery.provenance) ? discovery.provenance : [];
  const recordsById = new Map(records.map((record) => [record.workId, record]));
  const issuesByNumber = issueMap(issues);
  const results = [];

  for (const source of [...provenance].sort((a, b) => String(a.workId || '').localeCompare(String(b.workId || '')))) {
    const workId = source && source.workId;
    const workRecord = recordsById.get(workId);
    const issue = issuesByNumber.get(source && source.issueNumber);
    if (!workRecord || !issue) {
      results.push(entry(workId || 'UNKNOWN_WORK', source && source.issueNumber, 'INVALID', ['RECEIPT_SHADOW_SOURCE_UNRESOLVED']));
      continue;
    }

    const parsed = parseReceiptMarker(issue.body);
    if (!parsed.marked) {
      results.push(entry(workId, source.issueNumber, 'ABSENT', ['COORDINATION_RECEIPT_ABSENT']));
      continue;
    }
    if (parsed.error) {
      results.push(entry(workId, source.issueNumber, 'INVALID', [parsed.error, ...(parsed.validationErrors || [])]));
      continue;
    }

    const validation = validateCoordinationReceipt(
      parsed.receipt,
      workRecord,
      records,
      observedRefs,
      adapterRegistry,
      projectRegistry,
    );
    if (validation.valid) {
      results.push(entry(workId, source.issueNumber, 'VALID', validation.reasonCodes, parsed.receipt.receiptId));
    } else if (validation.status === 'RECEIPT_STALE') {
      results.push(entry(workId, source.issueNumber, 'STALE', validation.reasonCodes, parsed.receipt.receiptId));
    } else {
      results.push(entry(workId, source.issueNumber, 'INVALID', validation.reasonCodes, parsed.receipt.receiptId));
    }
  }

  return {
    schemaVersion: 1,
    mode: 'RECEIPT_REVALIDATION_SHADOW',
    observedRefs: observedRefs && typeof observedRefs === 'object' ? observedRefs : {},
    counts: summarize(results),
    results,
    mutationAuthorized: false,
    executionAuthorized: false,
  };
}

module.exports = { RECEIPT_STATES, revalidateActiveWorkReceipts };
