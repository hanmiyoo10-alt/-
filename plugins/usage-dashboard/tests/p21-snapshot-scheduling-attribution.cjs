const assert = require('node:assert/strict');
const fs = require('node:fs');

const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const currentRelease = assertCurrentReleaseArtifacts();
const root = 'plugins/usage-dashboard';
const diagnostics = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');

assert.ok(engine.includes("const CLI_CONCURRENCY = Math.max(1, Math.min(2, Number(process.env.DEVPASS_BRIDGE_CLI_CONCURRENCY || 2)));"));
assert.ok(!engine.includes('DEVPASS_BRIDGE_CLI_CONCURRENCY || 3'));
assert.ok(engine.includes('timeout: 25_000'));
assert.ok(engine.includes('accountCapture: 30_000'));
assert.ok(engine.includes("'activity:24h': 60_000"));
assert.ok(engine.includes("'activity:7d': 300_000"));
assert.ok(engine.includes("'activity:30d': 600_000"));
assert.ok(engine.includes('const CACHE_STALE_MAX_MS = 30 * 60_000'));
assert.ok(engine.includes("cached('accountCapture', async () => captureAccountDetailsViaCliSession('24h'))"));
assert.ok(engine.includes("discoveryMode = 'capture-primary'"));
assert.ok(engine.includes("discoveryMode = 'plain-orgs-fallback'"));

const rootAwait = "const orgsResult = await Promise.allSettled([timedSnapshotTask('organizations', () => loadOrgs())]);";
assert.ok(engine.includes(rootAwait));
assert.ok(engine.indexOf(rootAwait) < engine.indexOf('const jobs = [', engine.indexOf(rootAwait)));
assert.ok(engine.includes('taskTimeline: Object.create(null)'));
assert.ok(engine.includes('cliOperations: []'));
assert.ok(engine.includes('if (attribution.cliOperations.length >= 8) return;'));
assert.ok(engine.includes('noteSnapshotCliOperation(label, queuedAt, executionStartedAt, endedAt, launcherMeta)'));
assert.ok(engine.includes('attribution.cliOperations.slice(0, 8).map((item) => ({...item}))'));
assert.ok(engine.includes('Object.fromEntries(Object.entries(attribution.taskTimeline).map(([name, value]) => [name, {...value}]))'));

assert.ok(diagnostics.includes('function bridgeSnapshotTimelineText(performance)'));
assert.ok(diagnostics.includes('function bridgeCliOperationsText(performance)'));
assert.ok(diagnostics.includes('Bridge snapshot timeline:'));
assert.ok(diagnostics.includes('Bridge CLI operations:'));
assert.ok(diagnostics.includes('.slice(0, 8)'));
for (const forbidden of ['DEVPASS_BRIDGE_CAPTURE_FILE','captureFile','rawArgs','commandOutput','authorization']) {
  assert.ok(!diagnostics.includes(forbidden));
}

assert.ok(diagnostics.includes('parser provider-usage-v3'));
assert.ok(diagnostics.includes('unknown stays unknown'));
assert.ok(diagnostics.includes('active local errors'));
assert.ok(diagnostics.includes('Bridge 24h capture reuse:'));
assert.ok(diagnostics.includes('Bridge organization discovery:'));
if (currentRelease.releaseEvidence) {
  assert.ok(currentRelease.releaseEvidence.acceptedBaseline, 'structured release evidence must retain an accepted baseline');
  assert.ok(currentRelease.releaseEvidence.latestInstalled, 'structured release evidence must retain latest-installed evidence');
} else {
  assert.ok(guidelines.includes(currentRelease.verifiedBaseline));
}
assert.ok(guidelines.includes(currentRelease.currentMemory));
assert.ok(guidelines.includes('Keep 24h usage and DevPass Activity on the foreground truth path.'));
assert.ok(guidelines.includes('Provisioning adds no snapshot source operation or endpoint.'));
assert.ok(guidelines.includes('Keep UNKNOWN distinct from known zero'));

console.log('usage-dashboard P21 snapshot scheduling attribution: OK · bounded timeline invariants retained; scheduling evidence delegated to black-box Engine harness');
