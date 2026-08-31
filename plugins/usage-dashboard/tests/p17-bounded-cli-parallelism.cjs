const assert = require('node:assert/strict');
const fs = require('node:fs');

const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const currentRelease = assertCurrentReleaseArtifacts();
const root = 'plugins/usage-dashboard';
const diagnostics = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');

const concurrencyLine = "const CLI_CONCURRENCY = Math.max(1, Math.min(2, Number(process.env.DEVPASS_BRIDGE_CLI_CONCURRENCY || 2)));";
assert.ok(engine.includes(concurrencyLine));
assert.ok(!engine.includes('DEVPASS_BRIDGE_CLI_CONCURRENCY || 3'));
const resolvedLimit = (value) => Math.max(1, Math.min(2, Number(value || 2)));
assert.equal(resolvedLimit(undefined), 2);
assert.equal(resolvedLimit('1'), 1);
assert.equal(resolvedLimit('2'), 2);
assert.equal(resolvedLimit('9'), 2);

assert.ok(engine.includes('timeout: 25_000'));
assert.ok(engine.includes("orgs: 30_000"));
assert.ok(engine.includes("'activity:24h': 60_000"));
assert.ok(engine.includes("'activity:7d': 300_000"));
assert.ok(engine.includes("'activity:30d': 600_000"));
assert.ok(engine.includes('const CACHE_STALE_MAX_MS = 30 * 60_000'));
assert.ok(engine.includes('snapshotAttributionStorage'));
assert.ok(engine.includes('queueWaitTotalMs'));
assert.ok(engine.includes('executionTotalMs'));
assert.ok(engine.includes('maxActive:0'));
assert.ok(engine.includes('attribution.cli.maxActive = Math.max'));
assert.ok(engine.includes('limit: CLI_CONCURRENCY'));
assert.ok(engine.includes('peakActive: runs > 0 ? Number(cli.maxActive || 0) : null'));

assert.ok(diagnostics.includes('parser provider-usage-v3'));
assert.ok(diagnostics.includes('unknown stays unknown'));
assert.ok(diagnostics.includes('missing Write/TTL is never inferred from price/provider'));
assert.ok(diagnostics.includes('Local runtime errors: total'));
assert.ok(diagnostics.includes('active local errors'));
assert.ok(diagnostics.includes('limit ${num(cli.limit) ? Number(cli.limit) :'));
assert.ok(diagnostics.includes('peak active ${num(cli.peakActive) ? Number(cli.peakActive) :'));
assert.ok(diagnostics.includes('Bridge snapshot attribution:'));
assert.ok(diagnostics.includes('Bridge snapshot jobs:'));
assert.ok(diagnostics.includes('Bridge snapshot cache:'));
assert.ok(diagnostics.includes('Bridge snapshot circuit:'));
assert.ok(!engine.includes('snapshotPerformance.rawArgs'));
assert.ok(!engine.includes('snapshotPerformance.commandOutput'));
assert.ok(!diagnostics.includes('DEVPASS_BRIDGE_CAPTURE_FILE'));

if (currentRelease.releaseEvidence) {
  assert.ok(currentRelease.releaseEvidence.acceptedBaseline, 'structured release evidence must retain an accepted baseline');
  assert.ok(currentRelease.releaseEvidence.latestInstalled, 'structured release evidence must retain latest-installed evidence');
} else {
  assert.ok(guidelines.includes(currentRelease.verifiedBaseline));
}
assert.ok(guidelines.includes(currentRelease.currentMemory));
assert.ok(guidelines.includes('Preserve the hard CLI concurrency cap'));

console.log('usage-dashboard P17 bounded CLI parallelism: OK · invariant guards retained; two-lane behavior delegated to black-box Engine harness');
