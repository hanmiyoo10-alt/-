'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {bundleEligibleNotifications, systemKey} = require('../domains/notifications.cjs');

const root = path.resolve(__dirname, '../../../..');
const policy = JSON.parse(fs.readFileSync(path.join(__dirname, '../policy.json'), 'utf8'));
const bridge = JSON.parse(fs.readFileSync(path.join(__dirname, '../native-mail-bridge.json'), 'utf8'));

assert.equal(policy.notifications.aggregation.enabled, true);
assert.equal(policy.notifications.aggregation.unit, 'system-per-check');
assert.equal(policy.notifications.aggregation.groupBy, 'most-specific-operational-scope');
assert.equal(policy.notifications.aggregation.maxMessagesPerSystemPerCheck, 1);
assert.equal(policy.notifications.aggregation.mergeAcrossSystems, false);
assert.equal(policy.notifications.aggregation.preserveIndividualDeliveryKeys, true);
assert.equal(policy.notifications.aggregation.preserveIndividualReceipts, true);
assert.equal(policy.notifications.aggregation.sameCorrelationOpenRecovered, 'single-bundle-history');
assert.deepEqual(bridge.aggregation, {
  enabled: true,
  unit: 'system-per-check',
  groupBy: 'most-specific-operational-scope',
  maxMessagesPerSystemPerCheck: 1,
  mergeAcrossSystems: false,
  preserveIndividualDeliveryKeys: true,
  preserveIndividualReceipts: true,
  sameCorrelationOpenRecovered: 'single-bundle-history',
  ordering: 'severity-then-transition-time',
});

function envelope({deliveryKey, correlationKey, scope, severity = 'P1', transition = 'OPEN', eligible = true, eventId = deliveryKey}) {
  return {deliveryKey, correlationKey, scope, severity, transition, eligible, eventId};
}

const simOpen = envelope({deliveryKey: 'sim-open', correlationKey: 'sim-a', scope: ['scope:repo', 'plugin:simcore'], severity: 'P1', transition: 'OPEN'});
const simRecovery = envelope({deliveryKey: 'sim-recovered', correlationKey: 'sim-a', scope: ['plugin:simcore', 'scope:repo'], severity: 'P1', transition: 'RECOVERED'});
const simP0 = envelope({deliveryKey: 'sim-p0', correlationKey: 'sim-b', scope: ['plugin:simcore'], severity: 'P0', transition: 'OPEN'});
const usage = envelope({deliveryKey: 'usage-open', correlationKey: 'usage-a', scope: ['plugin:usage-dashboard', 'scope:repo']});
const repo = envelope({deliveryKey: 'repo-open', correlationKey: 'repo-a', scope: ['scope:repo']});
const ineligible = envelope({deliveryKey: 'skip', correlationKey: 'skip-a', scope: ['plugin:simcore'], eligible: false});

assert.equal(systemKey(simOpen), 'plugin:simcore');
assert.equal(systemKey(usage), 'plugin:usage-dashboard');
assert.equal(systemKey(repo), 'scope:repo');

const bundles = bundleEligibleNotifications([simOpen, usage, simRecovery, repo, simP0, ineligible]);
assert.deepEqual(bundles.map((bundle) => bundle.systemKey), ['plugin:simcore', 'plugin:usage-dashboard', 'scope:repo']);
assert.equal(bundles.length, 3, 'different systems must never be merged into one delivery bundle');

const simBundle = bundles.find((bundle) => bundle.systemKey === 'plugin:simcore');
assert.deepEqual(simBundle.deliveryKeys.sort(), ['sim-open', 'sim-p0', 'sim-recovered']);
assert.deepEqual(simBundle.items.map((item) => item.deliveryKey), ['sim-p0', 'sim-open', 'sim-recovered'], 'same-system alerts must be ordered by severity and keep OPEN before RECOVERED for one correlation');
assert.equal(new Set(simBundle.items.map((item) => item.deliveryKey)).size, simBundle.items.length, 'individual delivery keys must remain distinct inside a bundle');

const ciManifest = JSON.parse(fs.readFileSync(path.join(root, '.github/tooling/ci-summary/manifests/plugin-control-plane.json'), 'utf8'));
assert.ok(
  ciManifest.checks.some((check) => Array.isArray(check.command) && check.command.includes('.github/plugin-control-plane/canonical-main/tests/notification-bundling-contract.cjs')),
  'notification bundling contract must remain in the Plugin Control Plane CI execution manifest'
);

console.log('canonical-main notification bundling contract: OK');
