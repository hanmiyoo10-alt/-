'use strict';

const VALID_STATUS = new Set(['DELIVERED', 'FAILED', 'SUPPRESSED_DUPLICATE']);
const FORBIDDEN_KEYS = /(?:recipient|to|cc|bcc|emailAddress|oauth|password|secret|token|credential|apiKey)/i;

function assertReceipt(receipt) {
  if (!receipt || receipt.schemaVersion !== 1) throw new Error('receipt schemaVersion must be 1');
  if (!receipt.deliveryKey || typeof receipt.deliveryKey !== 'string') throw new Error('deliveryKey is required');
  if (!VALID_STATUS.has(receipt.status)) throw new Error('unsupported receipt status');
  if (receipt.channel !== 'email') throw new Error('only email receipts are supported');
  if (receipt.bridge !== 'chatgpt-github-gmail-condition-watch') throw new Error('unexpected delivery bridge');
  if (!receipt.observedAt || !Number.isFinite(Date.parse(receipt.observedAt))) throw new Error('observedAt must be ISO-8601');
  for (const key of Object.keys(receipt)) {
    if (FORBIDDEN_KEYS.test(key)) throw new Error(`forbidden receipt field: ${key}`);
  }
  return receipt;
}

function receiptMarker(receipt) {
  const normalized = assertReceipt({...receipt});
  const encoded = Buffer.from(JSON.stringify(normalized), 'utf8').toString('base64url');
  return `<!-- canonical-main-delivery-receipt-v1:${encoded} -->`;
}

function compactReceiptMarker(receipt) {
  const normalized = assertReceipt({...receipt});
  if (/[|\s>]/.test(normalized.deliveryKey)) throw new Error('deliveryKey is not compact-marker safe');
  return `<!-- canonical-main-delivery-receipt-v1|${normalized.status}|${normalized.channel}|${normalized.deliveryKey}|${normalized.observedAt} -->`;
}

function parseReceipt(body = '', metadata = {}) {
  const structured = body.match(/<!-- canonical-main-delivery-receipt-v1:([A-Za-z0-9_-]+) -->/);
  if (structured) {
    try {
      const parsed = JSON.parse(Buffer.from(structured[1], 'base64url').toString('utf8'));
      return assertReceipt(parsed);
    } catch (_) {
      return null;
    }
  }

  const compact = body.match(/<!-- canonical-main-delivery-receipt-v1\|([^|\s>]+)\|([^|\s>]+)\|([^|\s>]+)\|([^\s>]+) -->/);
  if (compact) {
    try {
      return assertReceipt({
        schemaVersion: 1,
        bridge: 'chatgpt-github-gmail-condition-watch',
        status: compact[1],
        channel: compact[2],
        deliveryKey: compact[3],
        observedAt: compact[4],
      });
    } catch (_) {
      return null;
    }
  }

  const legacy = body.match(/<!-- canonical-main-delivery-receipt:([^:\s>]+):([^\s>]+) -->/);
  if (!legacy) return null;
  const observedAt = metadata.created_at && Number.isFinite(Date.parse(metadata.created_at))
    ? new Date(metadata.created_at).toISOString()
    : null;
  if (!observedAt) return null;
  return {
    schemaVersion: 0,
    bridge: 'legacy-external-github-app',
    channel: legacy[1],
    deliveryKey: legacy[2],
    status: 'DELIVERED',
    observedAt,
    legacy: true,
  };
}

function receiptFromComment(comment) {
  return parseReceipt(comment?.body || '', {created_at: comment?.created_at});
}

function latestTime(receipts, status) {
  const rows = receipts.filter((row) => row.status === status);
  if (!rows.length) return null;
  return rows.reduce((latest, row) => Date.parse(row.observedAt) > Date.parse(latest) ? row.observedAt : latest, rows[0].observedAt);
}

function summarizeReceipts(comments = [], options = {}) {
  const receipts = comments.map(receiptFromComment).filter(Boolean);
  const latestByKey = new Map();
  for (const receipt of receipts) {
    const previous = latestByKey.get(receipt.deliveryKey);
    if (!previous || Date.parse(receipt.observedAt) >= Date.parse(previous.observedAt)) latestByKey.set(receipt.deliveryKey, receipt);
  }
  const unresolvedFailures = [...latestByKey.values()].filter((row) => row.status === 'FAILED').length;
  const delivered = receipts.filter((row) => row.status === 'DELIVERED').length;
  const failed = receipts.filter((row) => row.status === 'FAILED').length;
  const suppressedKeys = new Set(receipts.filter((row) => row.status === 'SUPPRESSED_DUPLICATE').map((row) => row.deliveryKey));
  const baselineProofAt = options.baselineProofAt && Number.isFinite(Date.parse(options.baselineProofAt))
    ? new Date(options.baselineProofAt).toISOString()
    : null;
  const health = unresolvedFailures > 0
    ? 'DEGRADED'
    : delivered > 0
      ? 'HEALTHY'
      : baselineProofAt
        ? 'PROVEN_IDLE'
        : 'UNKNOWN';
  return {
    health,
    receiptCount: receipts.length,
    deliveredCount: delivered,
    failedCount: failed,
    unresolvedFailureCount: unresolvedFailures,
    suppressedDuplicateCount: suppressedKeys.size,
    lastSuccessAt: latestTime(receipts, 'DELIVERED'),
    lastFailureAt: latestTime(receipts, 'FAILED'),
    baselineProofAt,
  };
}

module.exports = {
  VALID_STATUS,
  assertReceipt,
  receiptMarker,
  compactReceiptMarker,
  parseReceipt,
  receiptFromComment,
  summarizeReceipts,
};
