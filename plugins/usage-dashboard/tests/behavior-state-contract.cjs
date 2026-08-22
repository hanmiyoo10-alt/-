'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const {runDashboard} = require('./harness/dashboard-process.cjs');

const root = 'plugins/usage-dashboard';
const clone = value => JSON.parse(JSON.stringify(value));
const json = relative => JSON.parse(fs.readFileSync(`${root}/${relative}`, 'utf8'));

function assertPreserved(saved, hydrated, label) {
  for (const [key, value] of Object.entries(saved)) {
    assert.deepEqual(hydrated?.[key], value, `${label} field changed: ${key}`);
  }
}

function refreshState(extra = {}) {
  return {
    bridgeBase:'http://127.0.0.1:39117',
    bridgeEnabled:true,
    bridgeStatus:'connected',
    refreshMs:0,
    backgroundPause:false,
    syncOnFocus:false,
    performanceGuard:false,
    adaptiveRefresh:false,
    schedulerEnabled:false,
    staleAfterMs:0,
    stalePolicyV37Migrated:true,
    widgetVisible:false,
    ...extra,
  };
}

function displayable(snapshot) {
  return {
    ...clone(snapshot),
    activity:{
      totalRequests:1,
      totalCost:0.1,
      totalTokens:10,
      errorRate:0,
      source:'state-contract-process-harness',
    },
  };
}

(async () => {
  const alpha543State = {
    bridgeEnabled:false, bridgeStatus:'paused', refreshMs:600000,
    backgroundPause:false, syncOnFocus:false, performanceGuard:false, adaptiveRefresh:false,
    widgetVisible:false, widgetMode:'detailed', widgetX:12, widgetY:34, widgetDockSide:'left',
    usageScopeView:'devpass', recentRequestFilter:'error', selectedHourKey:'2026-08-17T16',
    analyticsScopeView:'credits', dashboardView:'settings', selectedCreditsOrgId:'org-test',
    requestLedger:[{timestamp:123,requestNumber:'42',requestedServiceTier:'flex',servedServiceTier:'flex',scopes:['devpass']}],
    bridgePausedAt:111, bridgeLastReconnectAt:222, bridgeTokenClearedAt:333,
  };
  const alpha543 = await runDashboard({state:alpha543State});
  assertPreserved(alpha543State, alpha543.state, 'alpha-5.43-state');
  assert.equal(alpha543.state.bridgeBase, 'http://127.0.0.1:39117');
  assert.equal(alpha543.state.stalePolicyV37Migrated, true);
  assert.equal(alpha543.state.requestLedger[0].servedServiceTier, 'flex');

  const rcSaved = json('tests/fixtures/alpha544-rc-state.json');
  const rc = await runDashboard({state:rcSaved});
  assertPreserved(rcSaved, rc.state, 'alpha-5.44-rc-state');
  assert.equal(rc.state.stalePolicyV37Migrated, true);
  assert.equal(rc.state.widgetDockSide, 'right');
  assert.equal(rc.state.dashboardView, 'settings');
  assert.equal(rc.state.selectedCreditsOrgId, 'org-rc-migration');
  assert.equal(rc.state.requestLedger[0].servedServiceTier, 'flex');

  const foundationSaved = json('tests/fixtures/state-v3.json');
  const foundationInput = {...clone(foundationSaved),stalePolicyV37Migrated:false};
  const foundationState = await runDashboard({state:foundationInput});
  assertPreserved(foundationSaved, foundationState.state, 'state-v3-foundation');
  assert.equal(foundationState.state.bridgeError, '');
  assert.equal(foundationState.state.schedulerEnabled, true);

  const p1Snapshot = displayable(json('tests/fixtures/p1-bridge-contract.json'));
  p1Snapshot.analyticsScopes = {
    scopes:{all:{windows:{'24h':{totalRequests:1,totalCost:0.1}}}},
    errors:{devpass:'analytics unavailable'},
  };
  const p1 = await runDashboard({
    state:refreshState(),
    token:'process-fixture-token',
    snapshot:p1Snapshot,
    waitFor:'refresh',
  });
  const p1Data = p1.state.data;
  assert.equal(p1Data.bridge.modules.activity.status, 'ok');
  assert.equal(p1Data.bridge.modules.activity.stale, false);
  assert.equal(p1Data.bridge.modules.activity.durationMs, 142);
  assert.ok(Number.isFinite(p1Data.bridge.modules.activity.fetchedAt));
  assert.equal(p1Data.bridge.modules.credits.status, 'partial');
  assert.equal(p1Data.bridge.modules.credits.stale, true);
  assert.equal(p1Data.bridge.modules.credits.durationMs, 921);
  assert.equal(p1Data.bridge.modules.credits.errorCode, 'timeout');
  assert.equal(p1Data.bridge.modules.credits.errorType, 'upstream_error');
  assert.equal(p1Data.bridge.modules.credits.errorMessage, 'Credits CLI timeout');
  assert.deepEqual(p1Data.usageScopes.errors.credits, {
    code:'timeout',type:'upstream_error',message:'Credits CLI timeout',
  });
  assert.equal(p1Data.usageScopes.scopes.all.cacheCount, null);
  assert.equal(p1Data.usageScopes.scopes.all.cacheRate, null);
  assert.equal(p1Data.usageScopes.scopes.credits.cacheCount, 0);
  assert.equal(p1Data.usageScopes.scopes.credits.cacheRate, 0);
  assert.deepEqual(p1Data.analyticsScopes.errors.devpass, {
    code:'',type:'',message:'analytics unavailable',
  });

  const foundationSnapshot = displayable(json('tests/fixtures/foundation-snapshot.json'));
  foundationSnapshot.usageScopes.scopes.all.recent[0].prompt = 'must not escape';
  foundationSnapshot.usageScopes.scopes.all.recent[0].response = 'must not escape';
  foundationSnapshot.usageScopes.scopes.all.recent[0].messages = ['must not escape'];
  foundationSnapshot.usageScopes.scopes.all.recent[0].content = 'must not escape';
  foundationSnapshot.usageScopes.scopes.all.recent.push({
    timestamp:'2026-08-14T07:27:00.000Z',
    provider:'example',
    model:'example/model',
    sequence:42,
    success:false,
  });
  const foundation = await runDashboard({
    state:refreshState(),
    token:'process-fixture-token',
    snapshot:foundationSnapshot,
    waitFor:'refresh',
  });
  const normalized = foundation.state.data.usageScopes.scopes.all;
  assert.equal(normalized.totalRequests, 4);
  assert.equal(normalized.cacheCount, 2);
  assert.equal(normalized.cacheRate, 50);
  assert.equal(normalized.providers[0].cacheCount, 2);
  assert.equal(normalized.providers[0].cacheRate, 66.7);
  assert.equal(normalized.providers[0].errorRate, 33.3);
  assert.equal(normalized.providers[0].totalTokens, 2400);
  assert.equal(normalized.providers[1].cacheCount, 0);
  assert.equal(normalized.providers[1].cacheRate, 0);
  assert.equal(normalized.models[0].cacheRate, 66.7);
  const request44 = normalized.recent.find(row => row.requestNumber === '44');
  assert.ok(request44);
  assert.equal(request44.cacheHit, true);
  for (const forbidden of ['prompt','response','messages','content']) {
    assert.equal(request44[forbidden], undefined, `normalized row leaked ${forbidden}`);
  }
  const request43 = normalized.recent.find(row => row.requestNumber === '43');
  assert.equal(request43.success, false);
  assert.equal(request43.errorCode, '429');
  assert.equal(request43.errorType, 'upstream_error');
  assert.equal(request43.cacheHit, false);
  const request42 = normalized.recent.find(row => row.requestNumber === '42');
  assert.equal(request42.success, false);
  assert.equal(request42.errorCode, '');
  assert.equal(request42.errorType, '');

  const zeroSnapshot = displayable({
    protocolVersion:2,
    bridgeVersion:'1.6.19',
    fetchedAt:'2026-08-14T07:55:00.000Z',
    usageScopes:{scopes:{all:json('tests/fixtures/cache-zero.json')},errors:{}},
  });
  const zero = await runDashboard({
    state:refreshState(),
    token:'process-fixture-token',
    snapshot:zeroSnapshot,
    waitFor:'refresh',
  });
  assert.equal(zero.state.data.usageScopes.scopes.all.cacheCount, 0);
  assert.equal(zero.state.data.usageScopes.scopes.all.cacheRate, 0);
  assert.equal(zero.state.data.usageScopes.scopes.all.providers[0].cacheCount, 0);
  assert.equal(zero.state.data.usageScopes.scopes.all.providers[0].cacheRate, 0);

  for (const run of [p1, foundation, zero]) {
    assert.equal(run.tokenStored, true);
    assert.ok(run.fetches.some(row => row.url.includes('/snapshot')), 'production refresh must request the snapshot contract');
    assert.ok(!JSON.stringify(run).includes('process-fixture-token'), 'harness output must not retain the bridge token');
  }

  console.log('usage-dashboard state/contract behavior: OK · full production dashboard process preserves state and normalizes contract fixtures without VM extraction');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
