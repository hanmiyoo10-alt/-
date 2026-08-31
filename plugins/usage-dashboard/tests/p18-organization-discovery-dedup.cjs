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
assert.ok(engine.includes('orgs: 30_000'));
assert.ok(engine.includes('accountCapture: 30_000'));
assert.ok(engine.includes("'activity:24h': 60_000"));
assert.ok(engine.includes('const CACHE_STALE_MAX_MS = 30 * 60_000'));

const loadOrgsAt = engine.indexOf('async function loadOrgs() {');
const captureAt = engine.indexOf('const capturePromise = loadAccountCapture()', loadOrgsAt);
const creditsAt = engine.indexOf('loadCreditsBootstrap()', captureAt);
const fallbackAt = engine.indexOf("const rawOrgs = await runCli(['orgs', 'list', '--json']);", captureAt);
assert.ok(loadOrgsAt >= 0 && captureAt > loadOrgsAt && creditsAt > captureAt && fallbackAt > captureAt);
assert.ok(engine.includes("discoveryMode = 'capture-primary'"));
assert.ok(engine.includes("discoveryMode = 'plain-orgs-fallback'"));
assert.ok(engine.includes('captured?.orgs ?? captured'));
assert.ok(engine.includes('enrichDevPassFromStatus(organizations, captured.devPlanStatus)'));
assert.ok(engine.includes('sharedAccountCapture: Boolean(captured)'));
assert.ok(engine.includes('captureErrorCode: captureResult.error ? classifyError(captureResult.error) : null'));
assert.ok(engine.includes("throw new Error('No organizations found in CLI output')"));

assert.ok(engine.includes('organizationDiscovery: null'));
assert.ok(engine.includes('attribution.organizationDiscovery = { ...value.organizationDiscovery }'));
assert.ok(engine.includes("organizationDiscovery: attribution?.organizationDiscovery && typeof attribution.organizationDiscovery === 'object'"));
assert.ok(diagnostics.includes('function bridgeOrganizationDiscoveryText(performance)'));
assert.ok(diagnostics.includes('Bridge organization discovery:'));
assert.ok(diagnostics.includes("shared account capture ${discovery.sharedAccountCapture ? 'yes' : 'no'}"));
assert.ok(!diagnostics.includes('captureErrorCode'));
assert.ok(!diagnostics.includes('DEVPASS_BRIDGE_CAPTURE_FILE'));

const runCliOccurrences = (engine.match(/\brunCli\(/g) || []).length;
const runCliDefinitions = (engine.match(/async function runCli\(/g) || []).length;
assert.equal(runCliOccurrences - runCliDefinitions, 5);
assert.ok(engine.includes('limit: CLI_CONCURRENCY'));
assert.ok(engine.includes('peakActive: runs > 0 ? Number(cli.maxActive || 0) : null'));
assert.ok(diagnostics.includes('unknown stays unknown'));
assert.ok(diagnostics.includes('missing Write/TTL is never inferred from price/provider'));
assert.ok(diagnostics.includes('active local errors'));

if (currentRelease.releaseEvidence) {
  assert.ok(currentRelease.releaseEvidence.acceptedBaseline, 'structured release evidence must retain an accepted baseline');
  assert.ok(currentRelease.releaseEvidence.latestInstalled, 'structured release evidence must retain latest-installed evidence');
} else {
  assert.ok(guidelines.includes(currentRelease.verifiedBaseline));
}
assert.ok(guidelines.includes(currentRelease.currentMemory));
assert.ok(guidelines.includes('Keep UNKNOWN distinct from known zero'));
assert.ok(guidelines.includes('Keep already-working behavior unchanged unless the release goal requires touching it.'));

console.log('usage-dashboard P18 organization discovery deduplication: OK · source invariants retained; primary/fallback behavior delegated to black-box Engine harness');
