'use strict';

const crypto = require('crypto');
const {parseEnvelope, deliveryReceiptMarker} = require('../notification.cjs');

function verifyWebhookSignature(rawBody, signature, secret) {
  if (!secret || !signature || !signature.startsWith('sha256=')) return false;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function deliveryFromIssueWebhook({eventName, action, issue}) {
  if (eventName !== 'issues') return null;
  if (!issue || typeof issue.body !== 'string') return null;
  const envelope = parseEnvelope(issue.body);
  if (!envelope || envelope.schemaVersion !== 1 || envelope.eligible !== true) return null;
  if (!(envelope.channels || []).includes('email')) return null;
  return {
    schemaVersion: 1,
    channel: 'email',
    deliveryKey: envelope.deliveryKey,
    action,
    incident: {
      number: issue.number,
      url: issue.html_url,
      title: issue.title,
      state: issue.state,
    },
    envelope,
  };
}

function buildEmailHandoff(delivery) {
  if (!delivery || delivery.channel !== 'email') return null;
  const envelope = delivery.envelope;
  const scope = (envelope.scope || []).join(', ') || 'UNKNOWN';
  const evidence = (envelope.evidence || []).map((row) => `- ${row}`).join('\n') || '- UNKNOWN';
  return {
    deliveryKey: delivery.deliveryKey,
    subject: `[${envelope.severity}] canonical main ${envelope.transition}: ${envelope.reasonCode}`,
    text: [
      `Canonical main incident ${envelope.transition}`,
      '',
      `Severity: ${envelope.severity}`,
      `Reason: ${envelope.reasonCode}`,
      `Scope: ${scope}`,
      `Summary: ${envelope.summary}`,
      '',
      'Evidence:',
      evidence,
      '',
      `Incident: ${delivery.incident.url || `#${delivery.incident.number}`}`,
      `Delivery key: ${delivery.deliveryKey}`,
    ].join('\n'),
  };
}

function buildDeliveryReceipt({delivery, providerMessageId = 'UNKNOWN', deliveredAt = new Date().toISOString()}) {
  if (!delivery) throw new Error('delivery is required');
  return [
    'Canonical-main notification delivery receipt',
    '',
    `- Channel: \`${delivery.channel}\``,
    `- Delivery key: \`${delivery.deliveryKey}\``,
    `- Delivered at: ${deliveredAt}`,
    `- Provider message id: \`${String(providerMessageId).replace(/`/g, '')}\``,
    '',
    '> Receipt contains delivery metadata only. Recipient addresses and provider credentials are intentionally omitted.',
    '',
    deliveryReceiptMarker(delivery.deliveryKey, delivery.channel),
  ].join('\n');
}

module.exports = {
  verifyWebhookSignature,
  deliveryFromIssueWebhook,
  buildEmailHandoff,
  buildDeliveryReceipt,
};
