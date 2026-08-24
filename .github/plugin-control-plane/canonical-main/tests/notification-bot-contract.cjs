'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {envelopeMarker} = require('../notification.cjs');
const {
  verifyWebhookSignature,
  deliveryFromIssueWebhook,
  buildEmailHandoff,
  buildDeliveryReceipt,
} = require('../notification-bot/webhook.cjs');

const botDir = path.join(__dirname, '../notification-bot');
const app = JSON.parse(fs.readFileSync(path.join(botDir, 'app-contract.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(botDir, 'github-app-manifest.template.json'), 'utf8'));

assert.equal(app.installation.state, 'NOT_INSTALLED');
assert.deepEqual(app.webhookEvents, ['issues']);
assert.equal(app.permissions.metadata, 'read');
assert.equal(app.permissions.issues, 'write');
assert.equal(manifest.public, false);
assert.deepEqual(manifest.default_permissions, {issues: 'write'});
assert.deepEqual(manifest.default_events, ['issues']);
assert.equal(manifest.request_oauth_on_install, false);
for (const forbidden of ['actions', 'contents', 'workflows', 'pull_requests', 'checks']) {
  assert.equal(manifest.default_permissions[forbidden], undefined, `${forbidden} must not be requested by the delivery bot`);
}
assert.match(manifest.hook_attributes.url, /^<[^>]+>$/, 'webhook URL must remain a deployment-time placeholder');

const envelope = {
  schemaVersion: 1,
  eligible: true,
  deliveryKey: 'delivery-key-1',
  transition: 'OPEN',
  previousState: 'NONE',
  severity: 'P1',
  reasonCode: 'REQUIRED_CHECK_FAILED',
  eventClass: 'REQUIRED_CI',
  scope: ['scope:repo'],
  subject: {kind: 'workflow', id: 'simcore-ci.yml/main/Required'},
  summary: 'Required failed.',
  evidence: ['run:1'],
  channels: ['email'],
  correlationKey: 'key',
  eventId: 'event-1',
};
const issue = {
  number: 12,
  state: 'open',
  title: 'incident',
  html_url: 'https://github.com/example/repo/issues/12',
  body: `incident\n${envelopeMarker(envelope)}`,
};
const delivery = deliveryFromIssueWebhook({eventName: 'issues', action: 'opened', issue});
assert(delivery);
assert.equal(delivery.deliveryKey, envelope.deliveryKey);
const email = buildEmailHandoff(delivery);
assert.match(email.subject, /\[P1\].*OPEN.*REQUIRED_CHECK_FAILED/);
assert.doesNotMatch(JSON.stringify(email), /recipient|oauth|smtp|password|api[_ -]?key/i);
const receipt = buildDeliveryReceipt({delivery, providerMessageId: 'provider-id', deliveredAt: '2026-08-25T00:00:00Z'});
assert.match(receipt, /canonical-main-delivery-receipt:email:delivery-key-1/);
assert.doesNotMatch(receipt, /@/);

const secret = 'test-secret';
const raw = Buffer.from(JSON.stringify({action: 'opened', issue}));
const signature = `sha256=${crypto.createHmac('sha256', secret).update(raw).digest('hex')}`;
assert.equal(verifyWebhookSignature(raw, signature, secret), true);
assert.equal(verifyWebhookSignature(raw, signature, 'wrong'), false);

console.log('CANONICAL_MAIN_NOTIFICATION_BOT_CONTRACTS:OK');
