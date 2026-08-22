const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

(async () => {
  const root = 'plugins/usage-dashboard';
  const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
  const core = fs.readFileSync(`${root}/src/00-runtime-core.part.js`, 'utf8');
  const diagnostics = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
  const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
  const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
  const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));
  const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');

  assert.ok(core.includes("const VERSION = '3.0.0-alpha.5.56';"));
  assert.ok(core.includes("const REQUIRED_BRIDGE_VERSION = '1.6.10';"));
  assert.ok(source.includes('//@version 3.0.0-alpha.5.56'));
  assert.ok(engine.includes("const VERSION = '1.6.10';"));
  assert.ok(manager.includes("const PRODUCT_VERSION = '3.0.0-alpha.5.56';"));
  assert.ok(manager.includes("const BUNDLED_ENGINE_VERSION = '1.6.10';"));
  assert.equal(manifest.productVersion, '3.0.0-alpha.5.56');
  assert.equal(manifest.components.plugin.version, '3.0.0-alpha.5.56');
  assert.equal(manifest.components.bridge.requiredVersion, '1.6.10');
  assert.equal(manifest.components.bridgeManager.version, '1.2.6');
  assert.equal(manifest.components.bridgeManager.productVersion, '3.0.0-alpha.5.56');

  // One repair only: default CLI concurrency 1 -> bounded 2.
  const concurrencyLine = "const CLI_CONCURRENCY = Math.max(1, Math.min(2, Number(process.env.DEVPASS_BRIDGE_CLI_CONCURRENCY || 2)));";
  assert.ok(engine.includes(concurrencyLine));
  assert.ok(!engine.includes("DEVPASS_BRIDGE_CLI_CONCURRENCY || 3"));
  const resolvedLimit = value => Math.max(1, Math.min(2, Number(value || 2)));
  assert.equal(resolvedLimit(undefined), 2, 'default must be two lanes');
  assert.equal(resolvedLimit('1'), 1, 'env=1 must preserve serial rollback');
  assert.equal(resolvedLimit('2'), 2);
  assert.equal(resolvedLimit('9'), 2, 'hard cap must remain two lanes');

  // Controls outside the target remain frozen.
  assert.ok(engine.includes('timeout: 25_000'));
  assert.ok(engine.includes("orgs: 30_000"));
  assert.ok(engine.includes("'activity:24h': 60_000"));
  assert.ok(engine.includes("'activity:7d': 300_000"));
  assert.ok(engine.includes("'activity:30d': 600_000"));
  assert.ok(engine.includes('const CACHE_STALE_MAX_MS = 30 * 60_000'));
  assert.ok(diagnostics.includes('parser provider-usage-v3'));
  assert.ok(diagnostics.includes('unknown stays unknown'));
  assert.ok(diagnostics.includes('missing Write/TTL is never inferred from price/provider'));
  assert.ok(diagnostics.includes('Local runtime errors: total'));
  assert.ok(diagnostics.includes('active local errors'));

  // Keep 5.55 attribution and add current-snapshot lane verification.
  assert.ok(engine.includes('snapshotAttributionStorage'));
  assert.ok(engine.includes('queueWaitTotalMs'));
  assert.ok(engine.includes('executionTotalMs'));
  assert.ok(engine.includes('maxActive:0'));
  assert.ok(engine.includes('attribution.cli.maxActive = Math.max'));
  assert.ok(engine.includes('limit: CLI_CONCURRENCY'));
  assert.ok(engine.includes('peakActive: runs > 0 ? Number(cli.maxActive || 0) : null'));
  assert.ok(diagnostics.includes('limit ${num(cli.limit) ? Number(cli.limit) :'));
  assert.ok(diagnostics.includes('peak active ${num(cli.peakActive) ? Number(cli.peakActive) :'));
  assert.ok(diagnostics.includes('Bridge snapshot attribution:'));
  assert.ok(diagnostics.includes('Bridge snapshot jobs:'));
  assert.ok(diagnostics.includes('Bridge snapshot cache:'));
  assert.ok(diagnostics.includes('Bridge snapshot circuit:'));

  // Exercise the shipped limiter directly: four jobs may use two slots, never three,
  // and completion/error cleanup must leave no active/queued slot behind.
  const slotStart = engine.indexOf('async function withCliSlot(label, task) {');
  const slotEnd = engine.indexOf('\nconst logThrottle', slotStart);
  assert.ok(slotStart >= 0 && slotEnd > slotStart, 'withCliSlot must be extractable');
  const slotBlock = engine.slice(slotStart, slotEnd);
  const slotContext = { setTimeout, clearTimeout, Promise, Math, Number };
  vm.createContext(slotContext);
  vm.runInContext(`
    const CLI_CONCURRENCY = 2;
    const cliWaiters = [];
    const cliStats = {active:0,queued:0,runs:0,maxActive:0};
    const attribution = {cli:{maxActive:0}};
    const timings = [];
    function currentSnapshotAttribution(){ return attribution; }
    function noteSnapshotCliTiming(...args){ timings.push(args); }
    ${slotBlock}
    this.withCliSlot = withCliSlot;
    this.cliStats = cliStats;
    this.cliWaiters = cliWaiters;
    this.attribution = attribution;
    this.timings = timings;
  `, slotContext);

  let running = 0;
  let taskPeak = 0;
  const task = async () => {
    running += 1;
    taskPeak = Math.max(taskPeak, running);
    await new Promise(resolve => setTimeout(resolve, 25));
    running -= 1;
    return true;
  };
  await Promise.all([
    slotContext.withCliSlot('a', task),
    slotContext.withCliSlot('b', task),
    slotContext.withCliSlot('c', task),
    slotContext.withCliSlot('d', task),
  ]);
  assert.equal(taskPeak, 2, 'default repair must allow two concurrent tasks');
  assert.equal(slotContext.cliStats.maxActive, 2, 'global guard must never exceed two');
  assert.equal(slotContext.attribution.cli.maxActive, 2, 'snapshot attribution must see peak active two');
  assert.equal(slotContext.cliStats.active, 0, 'slots must be fully released');
  assert.equal(slotContext.cliStats.queued, 0, 'queue count must drain');
  assert.equal(slotContext.cliWaiters.length, 0, 'waiter queue must drain');
  assert.equal(slotContext.timings.length, 4, 'every CLI run must retain timing telemetry');

  let rejected = false;
  try {
    await slotContext.withCliSlot('error-case', async () => { throw new Error('synthetic'); });
  } catch { rejected = true; }
  assert.equal(rejected, true);
  assert.equal(slotContext.cliStats.active, 0, 'failed tasks must not leak slots');
  assert.equal(slotContext.cliStats.queued, 0);

  // No secrets/raw command payloads become diagnostic fields.
  assert.ok(!engine.includes('snapshotPerformance.rawArgs'));
  assert.ok(!engine.includes('snapshotPerformance.commandOutput'));
  assert.ok(!diagnostics.includes('DEVPASS_BRIDGE_CAPTURE_FILE'));

  assert.ok(guidelines.includes('Last verified real-device baseline: `3.0.0-alpha.5.55 — Snapshot Performance Attribution`'));
  assert.ok(guidelines.includes('Current release implementation: `3.0.0-alpha.5.56 — Snapshot Performance Repair: Bounded CLI Parallelism`'));
  assert.ok(guidelines.includes('`DEVPASS_BRIDGE_CLI_CONCURRENCY=1` restores the previous serial execution mode'));

  console.log('usage-dashboard P17 bounded CLI parallelism: OK · default two lanes, hard cap two, env=1 rollback, no slot leak');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
