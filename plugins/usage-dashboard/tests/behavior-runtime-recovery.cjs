'use strict';

const assert = require('node:assert/strict');
const {runDashboard} = require('./harness/dashboard-process.cjs');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');

const currentRelease = assertCurrentReleaseArtifacts();

function recoveryState() {
  return {
    bridgeBase:'http://127.0.0.1:39117',
    bridgeEnabled:true,
    bridgeStatus:'connected',
    refreshMs:120,
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
  };
}

function recoverySnapshot() {
  return {
    protocolVersion:2,
    bridgeVersion:currentRelease.engineVersion,
    fetchedAt:new Date().toISOString(),
    bridgeManager:{
      managed:true,
      selfUpdate:true,
      engineManaged:true,
      managementProtocol:'bridge-manager-v1',
      version:currentRelease.managerVersion,
      productVersion:currentRelease.productVersion,
    },
    activity:{
      totalRequests:1,
      totalCost:0.1,
      totalTokens:10,
      errorRate:0,
      source:'runtime-recovery-process-harness',
    },
  };
}

(async () => {
  const run = await runDashboard({
    state:recoveryState(),
    token:'runtime-recovery-fixture-token',
    snapshot:recoverySnapshot(),
    failStateWrites:1,
    captureSettingsViews:true,
    waitFor:'views',
    expectedViews:2,
    timeoutMs:5_000,
  });

  assert.ok(run.stateWriteAttempts >= 2, 'recovery must reach a second state persist attempt');
  assert.ok(run.writes.includes('[state-write-failed:1]'), 'first refresh persist must be fault-injected');
  assert.ok(run.writes.includes('local-usage-dashboard-v3'), 'later refresh persist must recover');
  assert.ok(Number(run.state?.refreshCount || 0) >= 2, 'timer refresh must run after the injected persist failure');
  assert.equal(run.state?.bridgeStatus, 'connected');
  assert.equal(run.state?.consecutiveFailures, 0, 'local persist failure must not masquerade as a bridge failure');

  const failure = run.views.find(view => view.reason === 'state-write-failed:1');
  const recovered = run.views.find(view => view.reason === 'state-write-recovered');
  assert.ok(failure && !failure.error, `failure diagnostics view missing: ${failure?.error || 'not captured'}`);
  assert.ok(recovered && !recovered.error, `recovery diagnostics view missing: ${recovered?.error || 'not captured'}`);

  assert.ok(failure.html.includes('active local errors 1'), 'active local persist error must block stable readiness');
  assert.ok(failure.html.includes('Stable readiness:'), 'failure view must expose stable readiness diagnostics');
  assert.ok(!failure.html.includes('Stable readiness: READY'), 'active local error must not report READY');

  assert.ok(recovered.html.includes('Stable readiness: READY'), 'successful persist recovery must restore READY');
  assert.ok(recovered.html.includes('active 0'), 'recovered diagnostics must report zero active local errors');
  assert.ok(recovered.html.includes('recoveries 1'), 'recovered diagnostics must retain recovery history');
  assert.ok(recovered.html.includes('total 1'), 'recovered diagnostics must retain cumulative failure history');

  assert.equal(run.tokenStored, true);
  assert.ok(run.fetches.filter(row => row.url.includes('/snapshot')).length >= 2, 'recovery must use a later production snapshot refresh');
  assert.ok(!JSON.stringify(run).includes('runtime-recovery-fixture-token'), 'harness output must not retain the bridge token');

  console.log('usage-dashboard runtime recovery behavior: OK · actual dashboard process blocks on active persist error and returns READY after recovery while retaining history');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
