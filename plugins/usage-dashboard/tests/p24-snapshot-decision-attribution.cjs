const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const engine = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs', 'utf8');
const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
const latest = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');
const workflow = fs.readFileSync('.github/workflows/stage-usage-dashboard-562-snapshot-decision-attribution.yml', 'utf8');

assert.match(engine, /const VERSION = '1\.6\.15';/);
assert.match(manager, /const MANAGER_VERSION = '1\.2\.6';/);
assert.match(manager, /const PRODUCT_VERSION = '3\.0\.0-alpha\.5\.62';/);
assert.match(manager, /const BUNDLED_ENGINE_VERSION = '1\.6\.15';/);
assert.equal(manifest.productVersion, '3.0.0-alpha.5.62');
assert.equal(manifest.components.bridge.requiredVersion, '1.6.15');
assert.equal(manifest.components.bridgeManager.version, '1.2.6');

// 5.62 is measurement-only: preserve all protected runtime knobs from 5.61.
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
assert.equal(runCliDefinitions, 1, 'runCli must retain one function definition');
assert.equal(runCliOccurrences - runCliDefinitions, 5, 'decision attribution must not add a runCli call site');
assert.ok(engine.includes("captureReuse: { bootstrapRange:'24h'"));
assert.ok(engine.includes("runCli(['orgs', 'list', '--json'])"), 'plain org recovery fallback must remain');
assert.ok(engine.includes("throw new Error('No organizations found in CLI output')"), 'empty-org error contract must remain');

// Snapshot-local attribution is bounded and contains only sanitized decision fields.
assert.ok(engine.includes("creditsEarlyStart: { decision:'not-evaluated', reason:'', candidateMode:'', result:'none' }"));
assert.ok(engine.includes('cacheDecisions: []'));
assert.ok(engine.includes('attribution.cacheDecisions.length >= 64'));
assert.ok(engine.includes("['hit','miss','join','load','stale','blocked','error']"));
assert.ok(engine.includes("['empty','expired','loaded','circuit-open','refresh-error']"));
assert.ok(engine.includes("decision:'skipped', reason:'serial-mode'"));
assert.ok(engine.includes("decision:'skipped', reason:'no-safe-candidate'"));
assert.ok(engine.includes("reason:'prefetch-error', result:'failed'"));
assert.ok(engine.includes("decision:'skipped', reason:'bootstrap-error'"));
assert.ok(engine.includes("decision:'started', reason:'', candidateMode:candidate.mode, result:'in-flight'"));
assert.ok(engine.includes("noteSnapshotCacheDecision(name, 'hit'"));
assert.ok(engine.includes("noteSnapshotCacheDecision(name, 'join'"));
assert.ok(engine.includes("noteSnapshotCacheDecision(name, 'miss'"));
assert.ok(engine.includes("noteSnapshotCacheDecision(name, 'load'"));
assert.ok(engine.includes("noteSnapshotCacheDecision(name, 'stale'"));

// Exercise the cache descriptor directly: arbitrary org/cache identifiers must
// be discarded rather than copied into snapshot diagnostics.
const descriptorStart = engine.indexOf('function snapshotCacheDescriptor(');
const descriptorEnd = engine.indexOf('\nfunction noteSnapshotCacheDecision(', descriptorStart);
assert.ok(descriptorStart >= 0 && descriptorEnd > descriptorStart);
const descriptorSource = engine.slice(descriptorStart, descriptorEnd);
const descriptorContext = {};
vm.createContext(descriptorContext);
vm.runInContext(`${descriptorSource}\nthis.snapshotCacheDescriptor = snapshotCacheDescriptor;`, descriptorContext);
const describe = descriptorContext.snapshotCacheDescriptor;
const secret = 'SECRET-ORG-9f6a';
for (const key of [
  `usage:${secret}:24h`,
  `activity:credits:${secret}:30d`,
  `analytics:devpass:${secret}`,
  `runway:${secret}`,
  `unknown:${secret}`,
]) {
  const result = describe(key);
  assert.ok(!JSON.stringify(result).includes(secret), `descriptor leaked raw identifier for ${key}`);
}
assert.deepEqual(JSON.parse(JSON.stringify(describe(`usage:${secret}:24h`))), {family:'usage', scope:'credits', range:'24h'});
assert.deepEqual(JSON.parse(JSON.stringify(describe(`activity:devpass:${secret}:7d`))), {family:'activity', scope:'devpass', range:'7d'});
assert.deepEqual(JSON.parse(JSON.stringify(describe(`unknown:${secret}`))), {family:'other', scope:'', range:''});

// Diagnostics consume only sanitized summary fields and compress cache events by
// family/scope/range. They never print raw keys or candidate IDs.
assert.ok(diagnostics.includes('function bridgeCreditsEarlyStartText(performance)'));
assert.ok(diagnostics.includes('function bridgeSnapshotCacheDecisionsText(performance)'));
assert.ok(diagnostics.includes('Bridge Credits early-start:'));
assert.ok(diagnostics.includes('Bridge snapshot cache decisions:'));
const cacheTextStart = diagnostics.indexOf('function bridgeSnapshotCacheDecisionsText(');
const cacheTextEnd = diagnostics.indexOf('\n  function stableReadinessSnapshot(', cacheTextStart);
const cacheTextSource = diagnostics.slice(cacheTextStart, cacheTextEnd);
assert.ok(!/organizationId|orgId|requestedId|selectedId|\.key\b/.test(cacheTextSource), 'cache decision formatter must not access raw IDs/keys');
const cacheContext = { Map, Array, Number, String };
vm.createContext(cacheContext);
vm.runInContext(`${cacheTextSource}\nthis.bridgeSnapshotCacheDecisionsText = bridgeSnapshotCacheDecisionsText;`, cacheContext);
const cacheText = cacheContext.bridgeSnapshotCacheDecisionsText({cacheDecisions:[
  {family:'usage',scope:'credits',range:'30d',action:'miss',reason:'expired',ageMs:600123,ttlMs:600000,rawKey:secret},
  {family:'usage',scope:'credits',range:'30d',action:'load',reason:'loaded',ageMs:null,ttlMs:600000,rawKey:secret},
  {family:'devpassActivity',scope:'devpass',range:'7d',action:'hit',reason:'',ageMs:120000,ttlMs:300000},
]});
assert.ok(cacheText.includes('usage/credits/30d miss(expired)→load'));
assert.ok(cacheText.includes('devpassActivity/devpass/7d hit'));
assert.ok(!cacheText.includes(secret));

assert.ok(latest.includes('Bridge Credits early-start:'));
assert.ok(latest.includes('Bridge snapshot cache decisions:'));
assert.ok(guidelines.includes('Current release implementation: `3.0.0-alpha.5.62 — Snapshot Decision Attribution`'));
assert.ok(guidelines.includes('Last verified real-device baseline: `3.0.0-alpha.5.61 — Credits Usage Early Start`'));
assert.ok(guidelines.includes('The new attribution must add zero CLI/network requests.'));
assert.ok(guidelines.includes('about 17.17s because long-window analytics work became cold'));
assert.ok(guidelines.includes('exact skip reason is UNKNOWN in 5.61 diagnostics'));
assert.ok(guidelines.includes('## Long-term update roadmap'), 'durable roadmap must remain');
assert.ok(guidelines.includes('Evidence outranks roadmap order.'), 'evidence-first roadmap rule must remain');

assert.match(workflow, /group: repo-main-write/);
assert.match(workflow, /check_release_monotonic\.py/);
assert.match(workflow, /--check-artifacts/);
assert.match(workflow, /p22-monotonic-release-integrity\.cjs/);
assert.match(workflow, /p23-credits-usage-early-start\.cjs/);
assert.match(workflow, /p24-snapshot-decision-attribution\.cjs/);
assert.ok(workflow.indexOf('check_release_monotonic.py') < workflow.indexOf("git commit -m 'release: publish Local Usage Dashboard 3.0.0-alpha.5.62 product artifacts'"));

console.log('usage-dashboard P24 Snapshot Decision Attribution: OK · early-start reason + sanitized cache decisions observed with zero new CLI call sites');
