const assert = require('node:assert/strict');
const fs = require('node:fs');

const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const currentRelease = assertCurrentReleaseArtifacts();
const root = 'plugins/usage-dashboard';
const stability = fs.readFileSync(`${root}/src/06-runtime-stability.part.js`, 'utf8');
const diagnostics = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');

assert.ok(engine.includes("const CLI_CONCURRENCY = Math.max(1, Math.min(2, Number(process.env.DEVPASS_BRIDGE_CLI_CONCURRENCY || 2)));"));
assert.ok(engine.includes('timeout: 25_000'));
assert.ok(engine.includes("orgs: 30_000"));
assert.ok(engine.includes("'activity:24h': 60_000"));
assert.ok(engine.includes('const CACHE_STALE_MAX_MS = 30 * 60_000'));
assert.ok(diagnostics.includes('parser provider-usage-v3'));
assert.ok(diagnostics.includes('unknown stays unknown'));
assert.ok(diagnostics.includes('missing Write/TTL is never inferred from price/provider'));

assert.ok(engine.includes("import { AsyncLocalStorage } from 'node:async_hooks';"));
assert.ok(engine.includes('const snapshotAttributionStorage = new AsyncLocalStorage();'));
assert.ok(engine.includes('function createSnapshotAttribution(profile)'));
assert.ok(engine.includes('async function timedSnapshotTask(name, task)'));
assert.ok(engine.includes("timedSnapshotTask('organizations', () => loadOrgs())"));
assert.ok(engine.includes("timedSnapshotTask('devpassStatus', () => loadDevPassStatus())"));
assert.ok(engine.includes("timedSnapshotTask('usageScopes', () => usageScopes(resolvedCreditsOrgId))"));
assert.ok(engine.includes("timedSnapshotTask('analyticsScopes', () => analyticsScopes(resolvedCreditsOrgId, { deferLongWindow:true }))"));
assert.ok(engine.includes('result.diagnostics.snapshotPerformance = snapshotAttributionSummary(attribution);'));
assert.ok(engine.includes('durationMs: snapshotModuleDuration(family)'));
assert.ok(stability.includes('snapshotPerformance'));

for (const counter of [
  "noteSnapshotCounter('cache', 'hits')", "noteSnapshotCounter('cache', 'misses')",
  "noteSnapshotCounter('cache', 'joins')", "noteSnapshotCounter('cache', 'loads')",
  "noteSnapshotCounter('cache', 'errors')", "noteSnapshotCounter('cache', 'staleFallbacks')",
  "noteSnapshotCounter('circuits', 'opens')", "noteSnapshotCounter('circuits', 'blocked')",
  "noteSnapshotCounter('circuits', 'recoveries')",
]) assert.ok(engine.includes(counter));

assert.ok(engine.includes('queueWaitTotalMs'));
assert.ok(engine.includes('executionTotalMs'));
assert.ok(engine.includes('queuedRuns'));
assert.ok(engine.includes('queuedRuns > 0 ? Number(cli.queueWaitTotalMs || 0) / queuedRuns : null'));
assert.ok(engine.includes('runs > 0 ? Number(cli.executionTotalMs || 0) / runs : null'));
assert.ok(!engine.includes('snapshotPerformance.rawArgs'));
assert.ok(!engine.includes('snapshotPerformance.commandOutput'));
assert.ok(!diagnostics.includes('DEVPASS_BRIDGE_CAPTURE_FILE'));

assert.ok(diagnostics.includes('Bridge module duration:'));
assert.ok(diagnostics.includes('Bridge snapshot attribution:'));
assert.ok(diagnostics.includes('Bridge snapshot jobs:'));
assert.ok(diagnostics.includes('Bridge CLI timing:'));
assert.ok(diagnostics.includes('Bridge snapshot cache:'));
assert.ok(diagnostics.includes('Bridge snapshot circuit:'));
assert.ok(guidelines.includes(currentRelease.currentMemory));
if (currentRelease.releaseEvidence) {
  assert.ok(currentRelease.releaseEvidence.acceptedBaseline, 'structured release evidence must retain an accepted baseline');
  assert.ok(currentRelease.releaseEvidence.latestInstalled, 'structured release evidence must retain latest-installed evidence');
} else {
  assert.ok(guidelines.includes(currentRelease.verifiedBaseline));
}

console.log('usage-dashboard P16 snapshot performance attribution: OK · invariants retained; emitted timing behavior delegated to black-box Engine harness');
