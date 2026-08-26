'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {cliFootprint, localCostMap} = require('../tools/nonversion-audit.cjs');
const {startBridge} = require('./harness/bridge-process.cjs');

function createCliFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-dashboard-cli-footprint-fixture-'));
  const packageRoot = path.join(root, 'node_modules', '@llmgateway', 'cli');
  fs.mkdirSync(packageRoot, {recursive:true});
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({private:true,dependencies:{'@llmgateway/cli':'1.9.0'}}));
  fs.writeFileSync(path.join(root, 'package-lock.json'), JSON.stringify({
    name:'fixture', lockfileVersion:3, packages:{
      '':{dependencies:{'@llmgateway/cli':'1.9.0'}},
      'node_modules/@llmgateway/cli':{version:'1.9.0'},
      'node_modules/fixture-dependency':{version:'1.0.0'},
    },
  }));
  fs.writeFileSync(path.join(packageRoot, 'package.json'), JSON.stringify({name:'@llmgateway/cli',version:'1.9.0',bin:{llmgateway:'cli.cjs'}}));
  fs.writeFileSync(path.join(packageRoot, 'cli.cjs'), "#!/usr/bin/env node\nif (process.argv.includes('--help')) { console.log('fixture help'); process.exit(0); }\n", {mode:0o755});
  return root;
}

function assertFiniteSummary(summary) {
  assert.ok(Number.isInteger(summary.count) && summary.count > 0);
  for (const key of ['minMs','p50Ms','p95Ms','maxMs']) {
    assert.equal(Number.isFinite(summary[key]), true, `${key} must be finite`);
    assert.ok(summary[key] >= 0, `${key} must be nonnegative`);
  }
  assert.ok(summary.minMs <= summary.p50Ms);
  assert.ok(summary.p50Ms <= summary.p95Ms);
  assert.ok(summary.p95Ms <= summary.maxMs);
}

function processAlive(pid) {
  try { process.kill(pid, 0); return true; }
  catch (error) { return error?.code !== 'ESRCH'; }
}

(async () => {
  const cliRoot = createCliFixture();
  try {
    const footprint = cliFootprint(cliRoot, {expectedVersion:'1.9.0'});
    assert.equal(footprint.audit, 'NV-CLI-FOOTPRINT');
    assert.equal(footprint.package, '@llmgateway/cli');
    assert.equal(footprint.version, '1.9.0');
    assert.ok(footprint.installedBytes > 0);
    assert.ok(footprint.installedFiles >= 4);
    assert.equal(footprint.dependencyGraphPackages, 2);
    assert.equal(footprint.lockfileObserved, true);
    assert.ok(Number.isFinite(footprint.coldStartHelpMs) && footprint.coldStartHelpMs >= 0);
  } finally {
    fs.rmSync(cliRoot, {recursive:true,force:true});
  }

  const cost = localCostMap({iterations:12});
  assert.equal(cost.audit, 'NV-LOCAL-COST-MAP');
  assert.equal(cost.iterations, 12);
  assertFiniteSummary(cost.parse);
  assertFiniteSummary(cost.transform);
  assertFiniteSummary(cost.render);
  assertFiniteSummary(cost.atomicPersistReadback);

  const lifecycle = [];
  for (let cycle = 0; cycle < 8; cycle += 1) {
    const bridge = await startBridge({managed:false,direct:true});
    const pid = bridge.child.pid;
    const root = bridge.fixtureRoot;
    try {
      const health = await bridge.request('/health');
      assert.equal(health.status, 200, `cycle ${cycle} health`);
      const snapshot = await bridge.request('/snapshot?profile=light&creditsOrgId=fixture-credits');
      assert.equal(snapshot.status, 200, `cycle ${cycle} snapshot`);
      assert.doesNotThrow(() => JSON.parse(JSON.stringify(snapshot.body)), `cycle ${cycle} state must remain serializable`);
      lifecycle.push({cycle,pid,snapshotStatus:snapshot.body?.status || null});
    } finally {
      await bridge.stop();
    }
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(fs.existsSync(root), false, `cycle ${cycle} fixture cleanup`);
    assert.equal(processAlive(pid), false, `cycle ${cycle} bridge process must not remain orphaned`);
  }
  assert.equal(new Set(lifecycle.map((row) => row.pid)).size, lifecycle.length);

  console.log(JSON.stringify({
    audit:'UPDATE_N_REPO_PROOF',
    cliFixture:{package:'@llmgateway/cli',version:'1.9.0'},
    localCost:cost,
    lifecycle:{audit:'NV-LIFECYCLE-STRESS',cycles:lifecycle.length,orphanProcesses:0,corruptSnapshots:0},
  }));
  console.log('usage-dashboard non-version audit behavior: OK · footprint tool, local cost map, and lifecycle stress verified');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
