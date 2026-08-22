const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const currentRelease = assertCurrentReleaseArtifacts();
const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const core = fs.readFileSync(`${root}/src/00-runtime-core.part.js`, 'utf8');
const stability = fs.readFileSync(`${root}/src/06-runtime-stability.part.js`, 'utf8');
const diagnostics = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');


// Attribution only: do not change the controls that could alter runtime behavior.
assert.ok(engine.includes("const CLI_CONCURRENCY = Math.max(1, Math.min(2, Number(process.env.DEVPASS_BRIDGE_CLI_CONCURRENCY || 2)));"));
assert.ok(engine.includes('timeout: 25_000'));
assert.ok(engine.includes("orgs: 30_000"));
assert.ok(engine.includes("'activity:24h': 60_000"));
assert.ok(engine.includes('const CACHE_STALE_MAX_MS = 30 * 60_000'));
assert.ok(diagnostics.includes('parser provider-usage-v3'));
assert.ok(diagnostics.includes('unknown stays unknown'));
assert.ok(diagnostics.includes('missing Write/TTL is never inferred from price/provider'));
assert.ok(diagnostics.includes('Local runtime errors: total'));
assert.ok(diagnostics.includes('active local errors'));

// Snapshot scope must be isolated and measurement-only.
assert.ok(engine.includes("import { AsyncLocalStorage } from 'node:async_hooks';"));
assert.ok(engine.includes('const snapshotAttributionStorage = new AsyncLocalStorage();'));
assert.ok(engine.includes('function createSnapshotAttribution(profile)'));
assert.ok(engine.includes('function timedSnapshotTask(name, task)'));
assert.ok(engine.includes("timedSnapshotTask('organizations', () => loadOrgs())"));
assert.ok(engine.includes("timedSnapshotTask('devpassStatus', () => loadDevPassStatus())"));
assert.ok(engine.includes("timedSnapshotTask('usageScopes', () => usageScopes(resolvedCreditsOrgId))"));
assert.ok(engine.includes("timedSnapshotTask('analyticsScopes', () => analyticsScopes(resolvedCreditsOrgId, { deferLongWindow:true }))"));
assert.ok(engine.includes("timedSnapshotTask(`usage.${scope}`"));
assert.ok(engine.includes("timedSnapshotTask(`analytics.${normalizedScope}.${range}`"));
assert.ok(engine.includes('result.diagnostics.snapshotPerformance = snapshotAttributionSummary(attribution);'));

// Existing module duration plumbing should now receive real snapshot durations.
assert.ok(engine.includes('durationMs: snapshotModuleDuration(family)'));
assert.ok(stability.includes('snapshotPerformance'));
assert.ok(diagnostics.includes('Bridge module duration:'));
assert.ok(diagnostics.includes('Bridge snapshot attribution:'));
assert.ok(diagnostics.includes('Bridge snapshot jobs:'));
assert.ok(diagnostics.includes('Bridge CLI timing:'));
assert.ok(diagnostics.includes('Bridge snapshot cache:'));
assert.ok(diagnostics.includes('Bridge snapshot circuit:'));

// Per-snapshot cache/circuit deltas must augment, not replace, cumulative stats.
for (const counter of [
  "noteSnapshotCounter('cache', 'hits')",
  "noteSnapshotCounter('cache', 'misses')",
  "noteSnapshotCounter('cache', 'joins')",
  "noteSnapshotCounter('cache', 'loads')",
  "noteSnapshotCounter('cache', 'errors')",
  "noteSnapshotCounter('cache', 'staleFallbacks')",
  "noteSnapshotCounter('circuits', 'opens')",
  "noteSnapshotCounter('circuits', 'blocked')",
  "noteSnapshotCounter('circuits', 'recoveries')",
]) assert.ok(engine.includes(counter), `missing snapshot counter ${counter}`);
assert.ok(engine.includes('cacheStats.hits += 1'));
assert.ok(engine.includes('cacheStats.staleFallbacks += 1'));
assert.ok(engine.includes('circuitStats.recoveries += 1'));

// Queue wait and execution must remain separate. No raw CLI args are exported in telemetry.
assert.ok(engine.includes('queueWaitTotalMs'));
assert.ok(engine.includes('executionTotalMs'));
assert.ok(engine.includes('queuedRuns'));
assert.ok(engine.includes('noteSnapshotCliTiming(label, queued, queueWaitMs, executionMs)'));
assert.ok(!engine.includes('snapshotPerformance.rawArgs'));
assert.ok(!engine.includes('snapshotPerformance.commandOutput'));
assert.ok(!diagnostics.includes('DEVPASS_BRIDGE_CAPTURE_FILE'));

// Exercise the sanitized family-label helper directly. Organization IDs and arbitrary
// arguments must never appear in the diagnostic label.
const labelStart = engine.indexOf('function cliOperationLabel(args, extraEnv = {}) {');
const labelEnd = engine.indexOf('\n\nfunction noteSnapshotCliTiming', labelStart);
assert.ok(labelStart >= 0 && labelEnd > labelStart, 'CLI label helper must be extractable');
const labelBlock = engine.slice(labelStart, labelEnd);
const labelContext = {};
vm.createContext(labelContext);
vm.runInContext(`${labelBlock}\nthis.cliOperationLabel = cliOperationLabel;`, labelContext);
const secretOrg = 'TEST_ORG_ID_DO_NOT_LOG';
assert.equal(
  labelContext.cliOperationLabel(['usage','--org',secretOrg,'--by','model','--range','7d','--json'], {}),
  'usage-7d-model',
);
assert.equal(
  labelContext.cliOperationLabel(['orgs','list','--json'], {DEVPASS_BRIDGE_CAPTURE_FILE:'fixtures/test-capture.json',DEVPASS_BRIDGE_ACTIVITY_RANGE:'24h'}),
  'devpass-capture-24h',
);
assert.equal(labelContext.cliOperationLabel(['credits','--json'], {}), 'credits');
assert.ok(!labelContext.cliOperationLabel(['usage','--org',secretOrg,'--range','24h'], {}).includes(secretOrg));

// Summary semantics: zero queued runs means queue latency is unknown/not applicable,
// not fabricated 0ms. Known counters may legitimately be zero.
const summaryStart = engine.indexOf('function snapshotAttributionSummary(attribution) {');
const summaryEnd = engine.indexOf('\n\nasync function withCliSlot', summaryStart);
assert.ok(summaryStart >= 0 && summaryEnd > summaryStart, 'snapshot summary helper must be extractable');
const summaryBlock = engine.slice(summaryStart, summaryEnd);
const summaryContext = { Date: { now: () => 2000 }, CLI_CONCURRENCY: 2, Object, Array, secondaryRefreshSnapshot: () => ({}) };
vm.createContext(summaryContext);
vm.runInContext(`${summaryBlock}\nthis.snapshotAttributionSummary = snapshotAttributionSummary;`, summaryContext);
let summary = summaryContext.snapshotAttributionSummary({
  startedAt:1000,
  tasks:{organizations:100,usageScopes:700},
  cache:{hits:0,misses:1,joins:0,loads:1,errors:0,staleFallbacks:0},
  circuits:{opens:0,blocked:0,recoveries:0},
  cli:{runs:0,queuedRuns:0,queueWaitTotalMs:0,queueWaitMaxMs:0,executionTotalMs:0,executionMaxMs:0,slowestLabel:'',slowestTotalMs:0},
});
assert.equal(summary.totalMs, 1000);
assert.equal(summary.criticalPath, 'organizations→usageScopes');
assert.equal(summary.criticalPathMs, 800);
assert.equal(summary.cli.queueWaitAvgMs, null);
assert.equal(summary.cli.queueWaitMaxMs, null);
assert.equal(summary.cli.executionAvgMs, null);
assert.equal(summary.cache.hits, 0);
summary = summaryContext.snapshotAttributionSummary({
  startedAt:1000,
  tasks:{organizations:50,analyticsScopes:500,'analytics.devpass.30d':900},
  cache:{hits:2,misses:3,joins:1,loads:3,errors:1,staleFallbacks:1},
  circuits:{opens:1,blocked:2,recoveries:1},
  cli:{runs:2,queuedRuns:1,queueWaitTotalMs:300,queueWaitMaxMs:300,executionTotalMs:500,executionMaxMs:350,slowestLabel:'usage-30d-model',slowestTotalMs:650},
});
assert.equal(summary.cli.queueWaitAvgMs, 300);
assert.equal(summary.cli.executionAvgMs, 250);
assert.equal(summary.cli.slowestLabel, 'usage-30d-model');
assert.equal(summary.slowestTask, 'analytics.devpass.30d');
assert.equal(summary.slowestTaskMs, 900);

assert.ok(guidelines.includes(currentRelease.currentMemory));
assert.ok(guidelines.includes(currentRelease.verifiedBaseline));

console.log('usage-dashboard P16 snapshot performance attribution: OK · snapshot/module/CLI/cache/circuit timing is measurable without changing behavior');
