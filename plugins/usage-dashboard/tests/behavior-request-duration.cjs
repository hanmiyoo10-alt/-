'use strict';

const assert = require('node:assert/strict');
const {runDashboard} = require('./harness/dashboard-process.cjs');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');

const currentRelease = assertCurrentReleaseArtifacts();
const now = Date.now();
const ts = offset => now - offset;
const iso = offset => new Date(ts(offset)).toISOString();

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
    usageScopeView:'all',
    refreshCount:0,
    consecutiveFailures:0,
    requestLedger:[{
      timestamp:ts(10_000),
      timestampPrecision:'exact',
      timestampSource:'timestamp',
      provider:'fixture-provider',
      model:'fixture-provider/model',
      requestNumber:'duration-1',
      requestStatus:'completed',
      success:true,
      durationMs:null,
      durationSource:'',
      durationFidelity:'unknown',
      scopes:['devpass'],
    }],
  };
}

function recentRows() {
  return [
    {timestamp:iso(10_000),provider:'fixture-provider',model:'fixture-provider/model',requestNumber:'duration-1',status:'completed',success:true,durationMs:2209,durationSource:'llmgateway-log-duration',durationFidelity:'explicit'},
    {timestamp:iso(20_000),provider:'fixture-provider',model:'fixture-provider/model',requestNumber:'duration-zero',status:'completed',success:true,durationMs:0,durationSource:'llmgateway-log-duration',durationFidelity:'explicit'},
    {timestamp:iso(30_000),provider:'fixture-provider',model:'fixture-provider/model',requestNumber:'duration-error',status:'timeout',success:false,durationMs:8420,durationSource:'llmgateway-log-duration',durationFidelity:'explicit',errorCode:'504',errorType:'timeout'},
    {timestamp:iso(40_000),provider:'fixture-provider',model:'fixture-provider/model',requestNumber:'duration-missing',status:'completed',success:true},
    {timestamp:iso(50_000),provider:'fixture-provider',model:'fixture-provider/model',requestNumber:'duration-string',status:'completed',success:true,durationMs:'1500',durationSource:'llmgateway-log-duration',durationFidelity:'explicit'},
  ];
}

function scopePayload() {
  return {
    totalRequests:5,
    totalCost:0.5,
    totalTokens:500,
    providers:[{name:'fixture-provider',requests:5,cost:0.5}],
    models:[{name:'fixture-provider/model',requests:5,cost:0.5}],
    recentRequests:recentRows(),
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
    activity:{totalRequests:5,totalCost:0.5,totalTokens:500,errorRate:20,source:'request-duration-process-harness'},
    usageScopes:{
      scopes:{all:scopePayload(),devpass:scopePayload()},
      errors:{},
    },
  };
}

(async () => {
  assert.ok(currentRelease.productVersion);
  assert.ok(currentRelease.engineVersion);
  assert.ok(currentRelease.managerVersion);

  const run = await runDashboard({
    state:initialState(),
    token:'request-duration-fixture-token',
    snapshot:snapshot(),
    captureSettingsViews:true,
    captureRefreshViews:true,
    waitFor:'views',
    expectedViews:1,
    timeoutMs:5_000,
  });

  const view = run.views.find(row => String(row.reason || '').startsWith('refresh:init:'));
  assert.ok(view && !view.error, `post-refresh duration view missing: ${view?.error || 'not captured'}`);
  assert.ok(view.diag.includes('Request duration fidelity: explicit 3/5 · unknown 2/5 · source llmgateway-log-duration · average 3.54s · slowest 8.42s'), 'diagnostics must report exact duration fidelity without inference');
  assert.ok(view.html.includes('Duration 2.21s'), 'Recent Requests must format explicit millisecond duration in seconds');
  assert.ok(view.html.includes('Duration 0ms'), 'duration=0 must remain a known zero');
  assert.ok(view.html.includes('Duration 8.42s'), 'failed requests must retain explicit duration');
  assert.ok(view.html.includes('Duration —'), 'missing or invalid duration must render UNKNOWN');

  const ledger = Array.isArray(run.state?.requestLedger) ? run.state.requestLedger : [];
  assert.equal(ledger.length, 5, 'duration enrichment must not create a duplicate request identity');
  const enriched = ledger.find(row => row.requestNumber === 'duration-1');
  assert.equal(enriched?.durationMs, 2209);
  assert.equal(enriched?.durationSource, 'llmgateway-log-duration');
  assert.equal(enriched?.durationFidelity, 'explicit');
  assert.deepEqual(new Set(enriched?.scopes || []), new Set(['all','devpass']), 'same request observed across scopes must stay one ledger row');

  const zero = ledger.find(row => row.requestNumber === 'duration-zero');
  assert.equal(zero?.durationMs, 0);
  assert.equal(zero?.durationFidelity, 'explicit');

  const failed = ledger.find(row => row.requestNumber === 'duration-error');
  assert.equal(failed?.durationMs, 8420);
  assert.equal(failed?.durationFidelity, 'explicit');
  assert.equal(failed?.success, false);

  const missing = ledger.find(row => row.requestNumber === 'duration-missing');
  assert.equal(missing?.durationMs, null);
  assert.equal(missing?.durationFidelity, 'unknown');
  const stringValue = ledger.find(row => row.requestNumber === 'duration-string');
  assert.equal(stringValue?.durationMs, null, 'numeric-looking strings must not be promoted to explicit duration');
  assert.equal(stringValue?.durationFidelity, 'unknown');

  assert.equal(run.tokenStored, true);
  assert.equal(run.fetches.filter(row => row.url.includes('/snapshot')).length, 1);
  assert.ok(!JSON.stringify(run).includes('request-duration-fixture-token'), 'harness output must not retain the bridge token');

  console.log('usage-dashboard request duration behavior: OK · explicit /logs duration enriches one ledger identity, preserves 0/error values, and leaves invalid/missing duration UNKNOWN');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
