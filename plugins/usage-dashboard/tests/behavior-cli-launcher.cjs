'use strict';

const assert = require('node:assert/strict');
const {startBridge} = require('./harness/bridge-process.cjs');

async function withBridge(options, task) {
  const bridge = await startBridge(options);
  try { return await task(bridge); }
  finally { await bridge.stop(); }
}

(async () => {
  await withBridge({managed:true,direct:true}, async (bridge) => {
    const response = await bridge.request('/devpass-status');
    assert.equal(response.status, 200);
    const calls = bridge.ledger().filter((row) => row.type === 'start');
    assert.deepEqual(calls.map((row) => row.launcher), ['managed']);
  });

  await withBridge({managed:true,direct:true,config:{failureByLauncher:{managed:17}}}, async (bridge) => {
    const response = await bridge.request('/devpass-status');
    assert.equal(response.status, 502);
    const calls = bridge.ledger().filter((row) => row.type === 'start');
    assert.deepEqual(calls.map((row) => row.launcher), ['managed'], 'managed execution failure must be authoritative');
  });

  await withBridge({managed:true,managedEntryOutside:true,direct:true}, async (bridge) => {
    const response = await bridge.request('/devpass-status');
    assert.equal(response.status, 200);
    const calls = bridge.ledger().filter((row) => row.type === 'start');
    assert.deepEqual(calls.map((row) => row.launcher), ['direct'], 'descriptor entries outside the managed root must be rejected before execution');
  });

  await withBridge({managed:false,direct:true,config:{failureByLauncher:{direct:17}}}, async (bridge) => {
    const response = await bridge.request('/devpass-status');
    assert.equal(response.status, 502);
    const calls = bridge.ledger().filter((row) => row.type === 'start');
    assert.deepEqual(calls.map((row) => row.launcher), ['direct'], 'non-ENOENT direct failure must not fall back');
  });

  await withBridge({managed:false,direct:false,preferOffline:true}, async (bridge) => {
    const response = await bridge.request('/snapshot?profile=light&creditsOrgId=fixture-credits');
    assert.equal(response.status, 200);
    const calls = bridge.ledger().filter((row) => row.type === 'start');
    assert.ok(calls.length >= 3);
    assert.ok(calls.every((row) => row.launcher === 'npx'));
    assert.ok(calls.every((row) => row.rawArgs.includes('--prefer-offline')));
    const operations = response.body?.diagnostics?.snapshotPerformance?.cliOperations || [];
    assert.ok(operations.length > 0);
    assert.ok(operations.every((row) => row.launcher === 'npx-fallback'));
    assert.ok(operations.every((row) => row.npxPolicy === 'prefer-offline'));
  });

  await withBridge({managed:false,direct:false,preferOffline:false}, async (bridge) => {
    const response = await bridge.request('/devpass-status');
    assert.equal(response.status, 200);
    const call = bridge.ledger().find((row) => row.type === 'start');
    assert.equal(call.launcher, 'npx');
    assert.ok(!call.rawArgs.includes('--prefer-offline'));
    assert.deepEqual(call.rawArgs.slice(0, 2), ['--yes','@llmgateway/cli@1.10.0']);
  });

  console.log('usage-dashboard CLI launcher behavior: OK · actual Engine process preserves managed/direct/npx authority and rollback');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
