'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const fixture = JSON.parse(fs.readFileSync('plugins/usage-dashboard/tests/fixtures/alpha544-rc-state.json', 'utf8'));
const behavior = fs.readFileSync('plugins/usage-dashboard/tests/behavior-state-contract.cjs', 'utf8');

assert.ok(source.includes("const STATE_KEY = 'local-usage-dashboard-v3';"), 'state key changed');
assert.ok(source.includes("const TOKEN_KEY = 'local-usage-dashboard-bridge-token-v1';"), 'token storage key changed');
assert.equal(fixture.widgetDockSide, 'right');
assert.equal(fixture.dashboardView, 'settings');
assert.equal(fixture.selectedCreditsOrgId, 'org-rc-migration');
assert.equal(fixture.requestLedger[0].servedServiceTier, 'flex');
assert.ok(behavior.includes("json('tests/fixtures/alpha544-rc-state.json')"), 'RC migration fixture must stay exercised by the production process harness');

console.log('usage-dashboard P6 RC migration: OK · storage keys and RC fixture retained; migration behavior delegated to production process harness');
