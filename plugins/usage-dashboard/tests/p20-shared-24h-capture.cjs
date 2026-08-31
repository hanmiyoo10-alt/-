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
assert.ok(engine.includes("name !== 'accountCapture'"));

assert.ok(engine.includes("cached('accountCapture', async () => captureAccountDetailsViaCliSession('24h'))"));
assert.ok(!engine.includes("cached('accountCapture24h'"));
assert.ok(!engine.includes('sharedCapture:24h'));
const activityAt = engine.indexOf("async function devPassActivityForRange(range = '24h', options = {}) {");
const sharedAt = engine.indexOf('captured = await loadAccountCapture()', activityAt);
const fallbackAt = engine.indexOf("captured = await captureAccountDetailsViaCliSession('24h')", sharedAt);
const independentAt = engine.indexOf('captured = await captureAccountDetailsViaCliSession(normalizedRange)', fallbackAt);
assert.ok(activityAt >= 0 && sharedAt > activityAt && fallbackAt > sharedAt && independentAt > fallbackAt);
assert.ok(engine.includes("if (normalizedRange === '24h')"));
assert.ok(engine.includes('officialActivityRows(sharedRawActivity).length'));
assert.ok(engine.includes('activityReuseChecks += 1'));
assert.ok(engine.includes('activityShared += 1'));
assert.ok(engine.includes('dedicated24hFallbacks += 1'));
assert.ok(engine.includes("throw new Error(`DevPass /activity ${normalizedRange} unavailable for the authenticated project`)"));

assert.ok(engine.includes("captureReuse: { bootstrapRange:'24h', activityReuseChecks:0, activityShared:0, dedicated24hFallbacks:0 }"));
assert.ok(engine.includes("captureReuse: attribution?.captureReuse && typeof attribution.captureReuse === 'object'"));
assert.ok(diagnostics.includes('function bridgeCaptureReuseText(performance)'));
assert.ok(diagnostics.includes('Bridge 24h capture reuse:'));
assert.ok(diagnostics.includes('activity shared ${activityState}'));
assert.ok(!diagnostics.includes('DEVPASS_BRIDGE_CAPTURE_FILE'));
assert.ok(!diagnostics.includes('captureFile'));

assert.ok(engine.includes("discoveryMode = 'capture-primary'"));
assert.ok(engine.includes("discoveryMode = 'plain-orgs-fallback'"));
assert.ok(engine.includes('No organizations found in CLI output'));
assert.ok(diagnostics.includes('unknown stays unknown'));
assert.ok(diagnostics.includes('missing Write/TTL is never inferred from price/provider'));
assert.ok(diagnostics.includes('active local errors'));

assert.ok(currentRelease.evidenceView?.display?.acceptedBaseline, 'canonical evidence view must retain accepted-baseline evidence');
assert.ok(guidelines.includes(currentRelease.currentMemory));
assert.ok(guidelines.includes('Keep 24h usage and DevPass Activity on the foreground truth path.'));
assert.ok(guidelines.includes('shared capture behavior'));
assert.ok(guidelines.includes('Keep already-working behavior unchanged unless the release goal requires touching it.'));
assert.ok(guidelines.includes('Keep UNKNOWN distinct from known zero'));

console.log('usage-dashboard P20 shared 24h capture: OK · source invariants retained; shared/dedicated range behavior delegated to black-box Engine harness');
