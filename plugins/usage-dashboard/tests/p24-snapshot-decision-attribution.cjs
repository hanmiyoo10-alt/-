const fs = require('node:fs');
const assert = require('node:assert/strict');

const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const currentRelease = assertCurrentReleaseArtifacts();
const engine = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs', 'utf8');
const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
const latest = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');

assert.match(engine, /const CLI_CONCURRENCY = Math\.max\(1, Math\.min\(2, Number\(process\.env\.DEVPASS_BRIDGE_CLI_CONCURRENCY \|\| 2\)\)\);/);
assert.match(engine, /timeout: 25_000/);
assert.match(engine, /accountCapture: 30_000/);
assert.match(engine, /creditsBootstrap: 30_000/);
assert.match(engine, /'activity:24h': 60_000/);
assert.match(engine, /'activity:7d': 300_000/);
assert.match(engine, /'activity:30d': 600_000/);
assert.ok(engine.includes("name !== 'accountCapture' && name !== 'creditsBootstrap' && ageMs <= CACHE_STALE_MAX_MS"));
assert.ok(engine.includes("const allowStale = name !== 'accountCapture' && name !== 'creditsBootstrap';"));
const runCliOccurrences = (engine.match(/\brunCli\(/g) || []).length;
const runCliDefinitions = (engine.match(/async function runCli\(/g) || []).length;
assert.equal(runCliDefinitions, 1);
assert.equal(runCliOccurrences - runCliDefinitions, 5);
assert.ok(engine.includes("runCli(['orgs', 'list', '--json'])"));
assert.ok(engine.includes("throw new Error('No organizations found in CLI output')"));

assert.ok(engine.includes("creditsEarlyStart: { decision:'not-evaluated', reason:'', candidateMode:'', result:'none' }"));
assert.ok(engine.includes('cacheDecisions: []'));
assert.ok(engine.includes('attribution.cacheDecisions.length >= 64'));
assert.ok(engine.includes("['hit','miss','join','load','stale','deferred','blocked','error']"));
assert.ok(engine.includes("['empty','expired','loaded','deferred-refresh','circuit-open','refresh-error']"));
for (const marker of [
  "decision:'skipped', reason:'serial-mode'", "decision:'skipped', reason:'no-safe-candidate'",
  "reason:'prefetch-error', result:'failed'", "decision:'skipped', reason:'bootstrap-error'",
  "decision:'started', reason:'', candidateMode:candidate.mode, result:'in-flight'",
  "noteSnapshotCacheDecision(name, 'hit'", "noteSnapshotCacheDecision(name, 'join'",
  "noteSnapshotCacheDecision(name, 'miss'", "noteSnapshotCacheDecision(name, 'load'",
  "noteSnapshotCacheDecision(name, 'stale'",
]) assert.ok(engine.includes(marker));

assert.ok(engine.includes("if (key.startsWith('usage:'))"));
assert.ok(engine.includes("return { family:'usage', scope:'credits', range };"));
assert.ok(engine.includes("if (key.startsWith('runway:')) return { family:'runway', scope:'credits', range:'7d' };"));
assert.ok(engine.includes("return { family:'other', scope:'', range:'' };"));
assert.ok(diagnostics.includes('function bridgeCreditsEarlyStartText(performance)'));
assert.ok(diagnostics.includes('function bridgeSnapshotCacheDecisionsText(performance)'));
assert.ok(diagnostics.includes('Bridge Credits early-start:'));
assert.ok(diagnostics.includes('Bridge snapshot cache decisions:'));
assert.ok(latest.includes('Bridge Credits early-start:'));
assert.ok(latest.includes('Bridge snapshot cache decisions:'));

assert.ok(guidelines.includes(currentRelease.currentMemory));
if (currentRelease.releaseEvidence) {
  assert.ok(currentRelease.releaseEvidence.acceptedBaseline, 'structured release evidence must retain an accepted baseline');
  assert.ok(currentRelease.releaseEvidence.latestInstalled, 'structured release evidence must retain latest-installed evidence');
} else {
  assert.ok(guidelines.includes(currentRelease.verifiedBaseline));
}
assert.ok(guidelines.includes('Provisioning adds no snapshot source operation or endpoint.'));
assert.ok(guidelines.includes('Keep 24h usage and DevPass Activity on the foreground truth path.'));
assert.ok(guidelines.includes('Diagnostics expose only sanitized family/scope/range'));
assert.ok(guidelines.includes('Evidence outranks roadmap order.'));

console.log('usage-dashboard P24 Snapshot Decision Attribution: OK · decision invariants retained; sanitized cache behavior delegated to black-box Engine harness');
