const fs = require('node:fs');
const assert = require('node:assert/strict');

const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const currentRelease = assertCurrentReleaseArtifacts();
const engine = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs', 'utf8');
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');

assert.match(engine, /const CLI_CONCURRENCY = Math\.max\(1, Math\.min\(2, Number\(process\.env\.DEVPASS_BRIDGE_CLI_CONCURRENCY \|\| 2\)\)\);/);
assert.match(engine, /timeout: 25_000/);
assert.match(engine, /accountCapture: 30_000/);
assert.match(engine, /creditsBootstrap: 30_000/);
assert.match(engine, /'activity:24h': 60_000/);
assert.match(engine, /'activity:7d': 300_000/);
assert.match(engine, /'activity:30d': 600_000/);
assert.ok(!engine.includes("if (key === 'creditsBootstrap') return 'organizations';"));
assert.ok(engine.includes("name !== 'accountCapture' && name !== 'creditsBootstrap' && ageMs <= CACHE_STALE_MAX_MS"));
assert.ok(engine.includes("const allowStale = name !== 'accountCapture' && name !== 'creditsBootstrap';"));

assert.match(engine, /async function loadCreditsBootstrap\(\) \{\s*return cached\('creditsBootstrap', async \(\) => runCli\(\['credits', '--json'\]\)\);\s*\}/s);
const loadOrgsAt = engine.indexOf('async function loadOrgs() {');
assert.ok(engine.indexOf('loadCreditsBootstrap()', loadOrgsAt) > loadOrgsAt);
assert.ok(engine.indexOf("runCli(['orgs', 'list', '--json'])", loadOrgsAt) > loadOrgsAt);
assert.ok(engine.includes("throw new Error('No organizations found in CLI output')"));

assert.ok(engine.includes('function creditsBootstrapCandidate('));
assert.ok(engine.includes("if (requestedId && ids.includes(requestedId)) return { id: requestedId, mode: 'requested-exact' };"));
assert.ok(engine.includes("if (ids.length === 1) return { id: ids[0], mode: 'single-credit-id' };"));
assert.ok(engine.includes('return null;'));
assert.ok(engine.includes('function startCreditsUsageEarly('));
assert.ok(engine.includes('if (CLI_CONCURRENCY < 2) {'));
assert.ok(engine.includes("usageForOrg({ id: candidate.id, kind: 'default', status: 'active' }, '24h')"));
assert.ok(engine.includes("reason:'prefetch-error'"));

const snapshotAt = engine.indexOf('async function snapshotAttributed(');
const bootstrapAt = engine.indexOf('const creditsBootstrapPromise = loadCreditsBootstrap();', snapshotAt);
const prefetchAt = engine.indexOf('startCreditsUsageEarly(creditsBootstrapPromise, requestedCreditsOrgId);', bootstrapAt);
const rootAwaitAt = engine.indexOf("const orgsResult = await Promise.allSettled([timedSnapshotTask('organizations', () => loadOrgs())]);", prefetchAt);
assert.ok(snapshotAt >= 0 && bootstrapAt > snapshotAt && prefetchAt > bootstrapAt && rootAwaitAt > prefetchAt);

const runCliOccurrences = (engine.match(/\brunCli\(/g) || []).length;
const runCliDefinitions = (engine.match(/async function runCli\(/g) || []).length;
assert.equal(runCliOccurrences - runCliDefinitions, 5);
assert.ok(engine.includes("captureAccountDetailsViaCliSession('24h')"));
assert.ok(engine.includes("captureReuse: { bootstrapRange:'24h'"));
assert.ok(engine.includes('taskTimeline'));
assert.ok(engine.includes('cliOperations'));

assert.ok(guidelines.includes(currentRelease.currentMemory));
assert.ok(currentRelease.evidenceView?.display?.acceptedBaseline, 'canonical evidence view must retain accepted-baseline evidence');
assert.ok(guidelines.includes('Keep already-working behavior unchanged unless the release goal requires touching it.'));
assert.ok(guidelines.includes('Keep 24h usage and DevPass Activity on the foreground truth path.'));
assert.ok(guidelines.includes('Preserve the hard CLI concurrency cap'));
assert.ok(guidelines.includes('## Long-term update roadmap'));

console.log('usage-dashboard P23 Credits Usage Early Start: OK · source invariants retained; safe candidate and rollback behavior delegated to black-box Engine harness');
