'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  receiptMarker,
  parseReceipt,
  summarizeReceipts,
} = require('../delivery-receipt.cjs');

function comment(receipt, createdAt = receipt.observedAt) {
  return {
    created_at: createdAt,
    body: [
      `Canonical-main delivery receipt: ${receipt.status}`,
      receiptMarker(receipt),
    ].join('\n'),
  };
}

const base = {
  schemaVersion: 1,
  bridge: 'chatgpt-github-gmail-condition-watch',
  channel: 'email',
  deliveryKey: 'delivery-1',
  observedAt: '2026-08-25T03:45:00Z',
};

const delivered = {...base, status: 'DELIVERED', providerMessageId: 'provider-1'};
assert.deepEqual(parseReceipt(receiptMarker(delivered)), delivered);
assert.doesNotMatch(receiptMarker(delivered), /@|password|oauth|secret|token/i);
assert.throws(() => receiptMarker({...delivered, recipient: 'x@example.com'}), /forbidden receipt field/);

const provenIdle = summarizeReceipts([], {baselineProofAt: '2026-08-25T03:25:00Z'});
assert.equal(provenIdle.health, 'PROVEN_IDLE');
assert.equal(provenIdle.lastSuccessAt, null);

const healthy = summarizeReceipts([
  comment(delivered),
  comment({...base, status: 'SUPPRESSED_DUPLICATE', observedAt: '2026-08-25T03:46:00Z'}),
], {baselineProofAt: '2026-08-25T03:25:00Z'});
assert.equal(healthy.health, 'HEALTHY');
assert.equal(healthy.deliveredCount, 1);
assert.equal(healthy.suppressedDuplicateCount, 1);
assert.equal(healthy.lastSuccessAt, '2026-08-25T03:45:00Z');

const degraded = summarizeReceipts([
  comment(delivered),
  comment({...base, deliveryKey: 'delivery-2', status: 'FAILED', observedAt: '2026-08-25T03:47:00Z', errorClass: 'GMAIL_SEND_FAILED'}),
], {baselineProofAt: '2026-08-25T03:25:00Z'});
assert.equal(degraded.health, 'DEGRADED');
assert.equal(degraded.unresolvedFailureCount, 1);
assert.equal(degraded.lastFailureAt, '2026-08-25T03:47:00Z');

const recoveredDelivery = summarizeReceipts([
  comment({...base, deliveryKey: 'delivery-2', status: 'FAILED', observedAt: '2026-08-25T03:47:00Z', errorClass: 'GMAIL_SEND_FAILED'}),
  comment({...base, deliveryKey: 'delivery-2', status: 'DELIVERED', observedAt: '2026-08-25T03:48:00Z', providerMessageId: 'provider-2'}),
]);
assert.equal(recoveredDelivery.health, 'HEALTHY');
assert.equal(recoveredDelivery.unresolvedFailureCount, 0);

const legacy = parseReceipt(
  '<!-- canonical-main-delivery-receipt:email:legacy-key -->',
  {created_at: '2026-08-25T03:49:00Z'},
);
assert.equal(legacy.status, 'DELIVERED');
assert.equal(legacy.deliveryKey, 'legacy-key');

const root = path.resolve(__dirname, '../../../..');
const policy = JSON.parse(fs.readFileSync(path.join(__dirname, '../policy.json'), 'utf8'));
assert.equal(policy.notifications.receiptTracking.enabled, true);
assert.equal(policy.notifications.receiptTracking.source, 'incident-comments');
assert.deepEqual(policy.notifications.receiptTracking.statuses, ['DELIVERED', 'FAILED', 'SUPPRESSED_DUPLICATE']);
assert.equal(policy.notifications.receiptTracking.maxIncidentIssues, 25);

const bridge = JSON.parse(fs.readFileSync(path.join(__dirname, '../native-mail-bridge.json'), 'utf8'));
assert.equal(bridge.receipts.enabled, true);
assert.equal(bridge.receipts.recipientDataAllowed, false);
assert.equal(bridge.receipts.credentialDataAllowed, false);
assert.deepEqual(bridge.receipts.bridgeHealthStates, ['HEALTHY', 'DEGRADED', 'PROVEN_IDLE', 'UNKNOWN']);

const controller = fs.readFileSync(path.join(__dirname, '../ops-controller.cjs'), 'utf8');
assert.match(controller, /deliveryReceiptSummary/);
assert.match(controller, /\/comments\?per_page=100/);
assert.match(controller, /Bridge health:/);
assert.match(controller, /Unique duplicate suppressions recorded:/);
assert.match(controller, /non-authoritative for release\/main health/);

const workflow = fs.readFileSync(path.join(root, '.github/workflows/canonical-main-ops.yml'), 'utf8');
assert.match(workflow, /issues:\s*write/);
assert.doesNotMatch(workflow, /contents:\s*write/);

console.log('CANONICAL_MAIN_DELIVERY_RECEIPT_CONTRACTS:OK');
