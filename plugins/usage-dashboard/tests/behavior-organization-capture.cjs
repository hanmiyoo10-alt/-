'use strict';

const assert = require('node:assert/strict');
const {startBridge} = require('./harness/bridge-process.cjs');

async function withBridge(options, task) {
  const bridge = await startBridge(options);
  try { return await task(bridge); }
  finally { await bridge.stop(); }
}

function starts(bridge, label) {
  return bridge.ledger().filter((row) => row.type === 'start' && (!label || row.label === label));
}

(async () => {
  await withBridge({managed:false,direct:true}, async (bridge) => {
    const response = await bridge.request('/snapshot?profile=full&creditsOrgId=fixture-credits');
    assert.equal(response.status, 200);
    const performance = response.body?.diagnostics?.snapshotPerformance;
    assert.deepEqual(performance.organizationDiscovery, {
      mode:'capture-primary',fallbackCount:0,sharedAccountCapture:true,captureErrorCode:null,
    });
    assert.deepEqual(performance.captureReuse, {
      bootstrapRange:'24h',activityReuseChecks:1,activityShared:1,dedicated24hFallbacks:0,
    });
    assert.equal(starts(bridge, 'credits').length, 1);
    assert.equal(starts(bridge, 'devpass-capture-24h').length, 1);
    assert.equal(starts(bridge, 'organizations').length, 0);
    assert.equal(starts(bridge, 'devpass-capture-7d').length, 1);
    assert.equal(starts(bridge, 'devpass-capture-30d').length, 1);
  });

  await withBridge({managed:false,direct:true,config:{
    failureByLabel:{'devpass-capture-24h':17},
    plainOrganizations:[{id:'fixture-credits',kind:'default',status:'active',credits:100}],
  }}, async (bridge) => {
    const response = await bridge.request('/snapshot?profile=light&creditsOrgId=fixture-credits');
    assert.equal(response.status, 200);
    const discovery = response.body?.diagnostics?.snapshotPerformance?.organizationDiscovery;
    assert.equal(discovery.mode, 'plain-orgs-fallback');
    assert.equal(discovery.fallbackCount, 1);
    assert.equal(discovery.sharedAccountCapture, false);
    assert.equal(starts(bridge, 'credits').length, 1);
    assert.equal(starts(bridge, 'organizations').length, 1, 'capture failure must own one plain organization fallback');
  });

  await withBridge({managed:false,direct:true,config:{
    captureOrganizations:[],
    plainOrganizations:[],
  }}, async (bridge) => {
    const response = await bridge.request('/orgs');
    assert.equal(response.status, 502, 'empty capture and empty fallback must preserve the hard organization error');
    assert.equal(starts(bridge, 'credits').length, 1);
    assert.equal(starts(bridge, 'devpass-capture-24h').length, 1);
    assert.equal(starts(bridge, 'organizations').length, 1, 'empty capture must try one plain organization fallback');
  });

  await withBridge({managed:false,direct:true,config:{
    captureOrganizations:[],
    plainOrganizations:[{id:'fallback-ok',kind:'default',status:'active'}],
  }}, async (bridge) => {
    const response = await bridge.request('/orgs');
    assert.equal(response.status, 200);
    assert.equal(response.body?.organizations?.[0]?.id, 'fallback-ok');
    assert.deepEqual(response.body?.organizationDiscovery, {
      mode:'plain-orgs-fallback',fallbackCount:1,sharedAccountCapture:true,captureErrorCode:null,
    });
    assert.equal(starts(bridge, 'credits').length, 1);
    assert.equal(starts(bridge, 'devpass-capture-24h').length, 1);
    assert.equal(starts(bridge, 'organizations').length, 1, 'valid fallback must remain a single source call');
  });

  await withBridge({managed:false,direct:true,config:{failureByLabel:{credits:17}}}, async (bridge) => {
    const response = await bridge.request('/orgs');
    assert.equal(response.status, 502);
    assert.equal(starts(bridge, 'credits').length, 1);
    // Credits is authoritative for /orgs. An immediate Credits failure may
    // finish the response before the parallel capture reaches the CLI ledger,
    // so only the absence of an unrelated plain-org fallback is deterministic.
    assert.equal(starts(bridge, 'organizations').length, 0, 'Credits hard failure must not trigger an unrelated organization fallback');
  });

  await withBridge({managed:false,direct:true,config:{
    captureActivityByCall:{'24h':[false,true]},
  }}, async (bridge) => {
    const response = await bridge.request('/snapshot?profile=full&creditsOrgId=fixture-credits');
    assert.equal(response.status, 200);
    const reuse = response.body?.diagnostics?.snapshotPerformance?.captureReuse;
    assert.deepEqual(reuse, {
      bootstrapRange:'24h',activityReuseChecks:1,activityShared:0,dedicated24hFallbacks:1,
    });
    assert.equal(starts(bridge, 'devpass-capture-24h').length, 2, 'missing shared activity must run one dedicated 24h fallback');
    assert.ok(Number(response.body?.analytics?.windows?.['24h']?.totalRequests || 0) > 0, 'fallback activity must remain observable rather than becoming known zero');
  });

  await withBridge({managed:false,direct:true,config:{gateLabels:['devpass-capture-24h']}}, async (bridge) => {
    const pending = bridge.request('/snapshot?profile=light&creditsOrgId=fixture-credits');
    await bridge.waitFor((rows) => rows.some((row) => row.type === 'start' && row.label === 'devpass-capture-24h'));
    await bridge.waitFor((rows) => rows.some((row) => row.type === 'start' && row.label === 'usage-24h-model'));
    assert.ok(!bridge.ledger().some((row) => row.type === 'end' && row.label === 'devpass-capture-24h'));
    bridge.openGate('devpass-capture-24h');
    const response = await pending;
    assert.equal(response.status, 200);
    assert.deepEqual(response.body?.diagnostics?.snapshotPerformance?.creditsEarlyStart, {
      decision:'started',reason:'',candidateMode:'requested-exact',result:'completed',
    });
    assert.equal(starts(bridge, 'credits').length, 1);
    assert.equal(starts(bridge, 'usage-24h-model').length, 1);
  });

  await withBridge({managed:false,direct:true,config:{
    gateLabels:['devpass-capture-24h'],
    creditsRows:[{id:'org-a',credits:10},{id:'org-b',credits:20}],
  }}, async (bridge) => {
    const pending = bridge.request('/snapshot?profile=light');
    await bridge.waitFor((rows) => rows.some((row) => row.type === 'end' && row.label === 'credits'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(starts(bridge, 'usage-24h-model').length, 0, 'ambiguous Credits IDs must not early-start usage');
    bridge.openGate('devpass-capture-24h');
    const response = await pending;
    assert.equal(response.status, 200);
    const early = response.body?.diagnostics?.snapshotPerformance?.creditsEarlyStart;
    assert.equal(early.decision, 'skipped');
    assert.equal(early.reason, 'no-safe-candidate');
    assert.equal(starts(bridge, 'usage-24h-model').length, 1, 'foreground usage still runs after organization resolution');
  });

  await withBridge({managed:false,direct:true,concurrency:1}, async (bridge) => {
    const response = await bridge.request('/snapshot?profile=light&creditsOrgId=fixture-credits');
    assert.equal(response.status, 200);
    const performance = response.body?.diagnostics?.snapshotPerformance;
    assert.equal(performance.creditsEarlyStart.decision, 'skipped');
    assert.equal(performance.creditsEarlyStart.reason, 'serial-mode');
    assert.equal(performance.cli.limit, 1);
    assert.equal(performance.cli.peakActive, 1);
  });

  console.log('usage-dashboard organization/capture behavior: OK · primary, empty/error fallback, shared capture, safe early-start, ambiguity, and serial rollback verified');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
