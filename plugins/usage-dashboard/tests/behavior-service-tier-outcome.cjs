'use strict';

const assert = require('node:assert/strict');
const {runDashboard} = require('./harness/dashboard-process.cjs');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');

const currentRelease = assertCurrentReleaseArtifacts();
const now = Date.now();
const iso = offset => new Date(now - offset).toISOString();

function initialState() {
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
    dashboardView:'settings',
    refreshCount:0,
    consecutiveFailures:0,
    requestLedger:[
      {
        timestamp:now - 50_000,
        timestampPrecision:'exact',
        timestampSource:'timestamp',
        provider:'unknown-fixture',
        model:'unknown-fixture/model',
        requestNumber:'unknown-1',
        requestStatus:'',
        success:null,
        requestedServiceTier:'',
        servedServiceTier:'',
        requestedServiceTierSource:'',
        servedServiceTierSource:'',
        scopes:['all'],
      },
      {
        timestamp:now - 10_000,
        timestampPrecision:'exact',
        timestampSource:'timestamp',
        provider:'fixture-provider',
        model:'fixture-provider/model',
        requestNumber:'tier-1',
        requestStatus:'completed',
        success:true,
        requestedServiceTier:'standard',
        servedServiceTier:'standard',
        requestedServiceTierSource:'legacy-fixture',
        servedServiceTierSource:'legacy-fixture',
        scopes:['all'],
      },
    ],
  };
}

function snapshot() {
  return {
    protocolVersion:2,
    bridgeVersion:currentRelease.engineVersion,
    fetchedAt:new Date(now).toISOString(),
    bridgeManager:{
      managed:true,
      selfUpdate:true,
      engineManaged:true,
      managementProtocol:'bridge-manager-v1',
      version:currentRelease.managerVersion,
      productVersion:currentRelease.productVersion,
    },
    activity:{totalRequests:4,totalCost:0.4,totalTokens:400,errorRate:25,source:'service-tier-outcome-process-harness'},
    usageScopes:{
      scopes:{
        all:{
          totalRequests:4,
          totalCost:0.4,
          totalTokens:400,
          providers:[{name:'fixture-provider',requests:4,cost:0.4}],
          models:[{name:'fixture-provider/model',requests:4,cost:0.4}],
          recent:[
            {timestamp:iso(10_000),provider:'fixture-provider',model:'fixture-provider/model',sequence:'tier-1',status:'completed',success:true,requestedServiceTier:'flex',usedServiceTier:'flex'},
            {timestamp:iso(20_000),provider:'fixture-provider',model:'fixture-provider/model',sequence:'tier-2',status:'completed',success:true,requested_service_tier:'default',served_service_tier:'default'},
            {timestamp:iso(30_000),provider:'fixture-provider',model:'fixture-provider/model',sequence:'tier-3',status:'timeout',success:true,requestedTier:'priority'},
            {timestamp:iso(40_000),provider:'fixture-provider',model:'fixture-provider/model',sequence:'tier-4',status:'cancelled',success:true,request:{serviceTier:'flex'},response:{serviceTier:'default'}},
          ],
        },
      },
      errors:{},
    },
  };
}

(async () => {
  const run = await runDashboard({
    state:initialState(),
    token:'service-tier-outcome-fixture-token',
    snapshot:snapshot(),
    captureSettingsViews:true,
    captureRefreshViews:true,
    waitFor:'views',
    expectedViews:1,
    timeoutMs:5_000,
  });

  const view = run.views.find(row => String(row.reason || '').startsWith('refresh:init:'));
  assert.ok(view && !view.error, `post-refresh diagnostics missing: ${view?.error || 'not captured'}`);
  assert.ok(view.diag.includes('Service tier fidelity: requested known 4/5 · served known 3/5 · served flex 1 · standard 2 · priority 0 · unknown 2'), 'service tier diagnostics must normalize default→standard and retain missing served tier as unknown');
  assert.ok(view.diag.includes('Service tier source fields: requested request.serviceTier,requestedServiceTier,requestedTier,requested_service_tier'), 'requested tier source provenance must remain explicit');
  assert.ok(view.diag.includes('served response.serviceTier,served_service_tier,usedServiceTier'), 'served tier source provenance must remain explicit');
  assert.ok(view.diag.includes('Request outcome taxonomy: success 2 · error 1 · cancelled 1 · unknown 1 · rows 5'), 'outcome taxonomy must preserve status precedence and explicit unknown history');
  assert.ok(view.html.includes('요청 FLEX → 실제 STANDARD'), 'rendered request row must show requested-versus-served tier mismatch');
  assert.ok(view.html.includes('요청 PRIORITY · 실제 ?'), 'rendered request row must keep missing served tier unknown');

  const ledger = Array.isArray(run.state?.requestLedger) ? run.state.requestLedger : [];
  assert.equal(ledger.length, 5, 'same request identity with changed tier must merge rather than duplicate');
  const flexRow = ledger.find(row => row.requestNumber === 'tier-1');
  assert.equal(flexRow?.requestedServiceTier, 'flex');
  assert.equal(flexRow?.servedServiceTier, 'flex');
  assert.equal(flexRow?.requestedServiceTierSource, 'requestedServiceTier', 'fresh tier enrichment must replace legacy tier metadata without changing request identity');
  const defaultRow = ledger.find(row => row.requestNumber === 'tier-2');
  assert.equal(defaultRow?.requestedServiceTier, 'standard');
  assert.equal(defaultRow?.servedServiceTier, 'standard');
  const timeoutRow = ledger.find(row => row.requestNumber === 'tier-3');
  assert.equal(timeoutRow?.requestStatus, 'timeout');
  assert.equal(timeoutRow?.success, true, 'raw success remains observational while timeout status owns outcome taxonomy');
  assert.equal(timeoutRow?.servedServiceTier, '', 'missing served tier must not be invented');

  assert.equal(run.tokenStored, true);
  assert.equal(run.fetches.filter(row => row.url.includes('/snapshot')).length, 1);
  assert.ok(!JSON.stringify(run).includes('service-tier-outcome-fixture-token'), 'harness output must not retain the bridge token');

  console.log('usage-dashboard service-tier/outcome behavior: OK · actual dashboard refresh normalizes tier fidelity, preserves dedupe identity, and emits all four outcome categories without VM extraction');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
