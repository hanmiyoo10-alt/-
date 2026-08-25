'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  START,
  END,
  parseBridgeHealth,
  deriveBridgeHealth,
  renderBridgeHealth,
} = require('../bridge-health.cjs');
const {
  renderSection,
  upsertSection,
} = require('../bridge-health-sync.cjs');

const root = path.resolve(__dirname, '../../../..');
const policy = JSON.parse(fs.readFileSync(path.join(__dirname, '../policy.json'), 'utf8'));
const bridge = JSON.parse(fs.readFileSync(path.join(__dirname, '../native-mail-bridge.json'), 'utf8'));

assert.equal(policy.notifications.bridgeHealthIssueTitle, '[repo-mail-bridge]');
assert.equal(policy.notifications.bridgeHealthFreshnessMinutes, 150);
assert.equal(bridge.source.healthIssue, 317);
assert.equal(bridge.health.surfaceTitle, '[repo-mail-bridge]');
assert.equal(bridge.health.nonAuthoritative, true);
assert.equal(bridge.authority.releaseBlocking, false);
assert.equal(bridge.authority.mainWriteBlocking, false);

function body(data) {
  return [
    '# health',
    START,
    '```json',
    JSON.stringify(data),
    '```',
    END,
  ].join('\n');
}

const current = {
  schemaVersion: 1,
  bridge: 'chatgpt-github-gmail-condition-watch',
  state: 'ACTIVE_PROVEN',
  lastCheckAt: '2026-08-25T03:40:00Z',
  lastSuccessAt: '2026-08-25T03:36:52Z',
  lastOutcome: 'NOOP',
  successCount: 2,
  failureCount: 0,
  suppressedDuplicateCount: 1,
  consecutiveFailureCount: 0,
};
const parsed = parseBridgeHealth(body(current));
assert.deepEqual(parsed, current);
assert.equal(parseBridgeHealth('missing'), null);
assert.equal(parseBridgeHealth(`${START}\n\`\`\`json\n{broken}\n\`\`\`\n${END}`), null);

const now = Date.parse('2026-08-25T04:00:00Z');
const active = deriveBridgeHealth({body: body(current)}, now, 150);
assert.equal(active.state, 'ACTIVE_PROVEN');
assert.equal(active.fresh, true);
assert.match(renderBridgeHealth(active, 317), /ACTIVE_PROVEN/);
assert.match(renderBridgeHealth(active, 317), /duplicate-suppressed `1`/);

const degraded = deriveBridgeHealth({body: body({...current, state: 'DEGRADED', lastOutcome: 'FAILED', failureCount: 1, consecutiveFailureCount: 1, lastError: 'gmail send failed'})}, now, 150);
assert.equal(degraded.state, 'DEGRADED');
assert.equal(degraded.fresh, true);

const stale = deriveBridgeHealth({body: body({...current, lastCheckAt: '2026-08-25T00:00:00Z'})}, now, 150);
assert.equal(stale.state, 'STALE');
assert.equal(stale.fresh, false);
assert.equal(deriveBridgeHealth(null, now, 150).state, 'UNKNOWN');
assert.equal(deriveBridgeHealth({body: 'broken'}, now, 150).state, 'UNKNOWN');

const section = renderSection(active, {number: 317});
assert.match(section, /Delivery bridge health/);
const ops = '# ops\n\n## Active P0/P1 incidents\n\n- none\n';
const once = upsertSection(ops, section);
assert.match(once, /canonical-main-mail-bridge-summary:start/);
assert.match(once, /## Delivery bridge health/);
const twice = upsertSection(once, section);
assert.equal(twice, once, 'bridge health summary insertion must be idempotent');

const workflow = fs.readFileSync(path.join(root, '.github/workflows/canonical-main-ops.yml'), 'utf8');
const refreshIndex = workflow.indexOf('ops-controller.cjs refresh');
const healthIndex = workflow.indexOf('bridge-health-sync.cjs sync');
assert(refreshIndex >= 0 && healthIndex > refreshIndex, 'bridge health sync must run after canonical-main refresh');
assert.match(workflow, /contents:\s*read/);
assert.match(workflow, /actions:\s*read/);
assert.match(workflow, /issues:\s*write/);
assert.doesNotMatch(workflow, /contents:\s*write/);
assert.doesNotMatch(workflow, /git\s+push/);

console.log('CANONICAL_MAIN_BRIDGE_HEALTH_CONTRACTS:OK');
