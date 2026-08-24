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
    bridgeBase:'http://127.0.0.1:39117', bridgeEnabled:true, bridgeStatus:'connected',
    refreshMs:0, backgroundPause:false, syncOnFocus:false, performanceGuard:false,
    adaptiveRefresh:false, schedulerEnabled:false, staleAfterMs:0, stalePolicyV37Migrated:true,
    widgetVisible:false, dashboardView:'settings', usageScopeView:'all', refreshCount:0,
    consecutiveFailures:0,
    requestLedger:[{
      timestamp:ts(10_000), timestampPrecision:'exact', timestampSource:'timestamp',
      provider:'anthropic', model:'claude-sonnet', requestNumber:'scope-enrich',
      requestStatus:'completed', success:true, requestAccountScope:'unknown',
      requestScopeFidelity:'unknown', scopes:['all'],
    }],
  };
}

const rows = {
  devpass:{
    timestamp:iso(10_000), provider:'anthropic', model:'claude-sonnet', requestNumber:'scope-enrich',
    status:'completed', success:true, cost:0.042, totalTokens:18200,
    requestedServiceTier:'flex', servedServiceTier:'flex',
    durationMs:2310, durationSource:'llmgateway-log-duration', durationFidelity:'explicit',
    requestAccountScope:'devpass', requestScopeFidelity:'explicit-project', requestScopeConflict:false,
  },
  credits:{
    timestamp:iso(20_000), provider:'google', model:'gemini-flash', requestNumber:'scope-credits',
    status:'completed', success:true, cost:0.006, totalTokens:4800,
    requestedServiceTier:'flex', servedServiceTier:'flex',
    durationMs:1420, durationSource:'llmgateway-log-duration', durationFidelity:'explicit',
    requestAccountScope:'credits', requestScopeFidelity:'explicit-org-billing', requestScopeConflict:false,
  },
  unknown:{
    timestamp:iso(30_000), provider:'fixture', model:'some-model', requestNumber:'scope-unknown',
    status:'completed', success:true, durationMs:3170,
    durationSource:'llmgateway-log-duration', durationFidelity:'explicit',
    requestAccountScope:'unknown', requestScopeFidelity:'unknown', requestScopeConflict:false,
  },
  devpassCreditsMode:{
    timestamp:iso(40_000), provider:'google', model:'gemini-helper-looking-name', requestNumber:'scope-devpass-priority',
    status:'completed', success:true, cost:0.01, totalTokens:1200,
    requestedServiceTier:'standard', servedServiceTier:'standard',
    requestAccountScope:'devpass', requestScopeFidelity:'explicit-project', requestScopeConflict:true,
  },
};

function scopePayload(recentRequests, requestProvenance) {
  return {
    totalRequests:recentRequests.length,
    totalCost:recentRequests.reduce((sum,row) => sum + Number(row.cost || 0), 0),
    totalTokens:recentRequests.reduce((sum,row) => sum + Number(row.totalTokens || 0), 0),
    providers:[], models:[], recentRequests, requestProvenance,
  };
}

function snapshot() {
  const all = [rows.devpass,rows.credits,rows.unknown,rows.devpassCreditsMode];
  const provenance = {
    captureMode:'account-wide', rows:4, fallbackCount:0,
    devpass:2, credits:1, unknown:1, conflict:1, modelInference:0,
    authority:'project-exact+credits-org-used-mode',
  };
  return {
    protocolVersion:2, bridgeVersion:currentRelease.engineVersion,
    fetchedAt:new Date(now).toISOString(),
    bridgeManager:{managed:true,selfUpdate:true,engineManaged:true,managementProtocol:'bridge-manager-v1',version:currentRelease.managerVersion,productVersion:currentRelease.productVersion},
    activity:{totalRequests:4,totalCost:0.058,totalTokens:24200,errorRate:0,source:'request-provenance-process-harness'},
    usageScopes:{
      scopes:{
        all:scopePayload(all, provenance),
        devpass:scopePayload([rows.devpass,rows.devpassCreditsMode], provenance),
        credits:scopePayload([rows.credits], provenance),
      },
      errors:{},
    },
  };
}

(async () => {
  const run = await runDashboard({
    state:initialState(), token:'request-provenance-fixture-token', snapshot:snapshot(),
    captureSettingsViews:true, captureRefreshViews:true, waitFor:'views', expectedViews:1, timeoutMs:5_000,
  });

  const view = run.views.find(row => String(row.reason || '').startsWith('refresh:init:'));
  assert.ok(view && !view.error, `post-refresh provenance view missing: ${view?.error || 'not captured'}`);
  assert.ok(view.diag.includes('Account request capture: account-wide · rows 4 · fallback 0'));
  assert.ok(view.diag.includes('Request account scope fidelity: DevPass 2/4 · Credits 1/4 · Unknown 1/4 · conflict 1'));
  assert.ok(view.diag.includes('Scope authority: DevPass project exact · Credits organization + usedMode credits · model inference 0'));
  assert.ok(view.html.includes('DevPass · FLEX'), 'DevPass request must carry proven account bucket beside service tier');
  assert.ok(view.html.includes('Credits · FLEX'), 'Credits request must carry proven account bucket beside service tier');
  assert.ok(view.html.includes('— · TIER ?'), 'UNKNOWN request must render without invented account bucket');

  const ledger = Array.isArray(run.state?.requestLedger) ? run.state.requestLedger : [];
  assert.equal(ledger.length, 4, 'UNKNOWN→explicit provenance enrichment must not duplicate request identity');
  const enriched = ledger.find(row => row.requestNumber === 'scope-enrich');
  assert.equal(enriched?.requestAccountScope, 'devpass');
  assert.equal(enriched?.requestScopeFidelity, 'explicit-project');
  const credits = ledger.find(row => row.requestNumber === 'scope-credits');
  assert.equal(credits?.requestAccountScope, 'credits');
  assert.equal(credits?.requestScopeFidelity, 'explicit-org-billing');
  const unknown = ledger.find(row => row.requestNumber === 'scope-unknown');
  assert.equal(unknown?.requestAccountScope, 'unknown');
  assert.equal(unknown?.requestScopeFidelity, 'unknown');
  const priority = ledger.find(row => row.requestNumber === 'scope-devpass-priority');
  assert.equal(priority?.requestAccountScope, 'devpass', 'DevPass project authority must remain DevPass even when billing evidence conflicts');
  assert.equal(priority?.requestScopeConflict, true);

  assert.equal(run.tokenStored, true);
  assert.equal(run.fetches.filter(row => row.url.includes('/snapshot')).length, 1);
  const serialized = JSON.stringify(run);
  assert.ok(!serialized.includes('request-provenance-fixture-token'));
  assert.ok(!serialized.includes('requestProjectId'));
  assert.ok(!serialized.includes('requestOrganizationId'));

  console.log(`usage-dashboard request provenance behavior: OK · ${currentRelease.productVersion} preserves explicit DevPass/Credits/UNKNOWN, in-place enrichment, scope labels, and privacy`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
