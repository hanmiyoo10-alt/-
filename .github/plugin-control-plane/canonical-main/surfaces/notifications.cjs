'use strict';

const {summarizeReceipts} = require('../delivery-receipt.cjs');
function fmtOptionalTime(value) { return value || 'NONE'; }
function renderNotificationStatus(policy, receiptSummary = null) {
  const config = policy.notifications || {}, severityText = (config.severities || []).join('/') || 'NONE', channels = (config.channels || []).join(', ') || 'NONE';
  const summary = receiptSummary || summarizeReceipts([], {baselineProofAt: config.receiptTracking?.baselineProofAt});
  return [`- Outbox: \`${config.outboxEnabled === true ? 'ACTIVE' : 'DISABLED'}\` — ${severityText} OPEN${config.includeRecovery === true ? ' + RECOVERED' : ''}`, `- Channel handoff: \`${channels}\``, `- Delivery bridge: \`${config.bridgeState || 'UNKNOWN'}\` / \`${config.deliveryBridge || 'UNKNOWN'}\``, `- Bridge health: \`${summary.health}\``, `- Last delivery success: ${fmtOptionalTime(summary.lastSuccessAt)}${summary.lastSuccessAt ? '' : summary.baselineProofAt ? ` — baseline proof ${summary.baselineProofAt}` : ''}`, `- Last delivery failure: ${fmtOptionalTime(summary.lastFailureAt)}`, `- Delivery receipts: ${summary.receiptCount} total / ${summary.unresolvedFailureCount} unresolved failure`, `- Unique duplicate suppressions recorded: ${summary.suppressedDuplicateCount}`, '- Delivery bridge health is intentionally non-authoritative for release/main health.'].join('\n');
}
module.exports = {fmtOptionalTime, renderNotificationStatus};
