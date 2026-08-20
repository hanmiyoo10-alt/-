const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const engine = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs', 'utf8');
const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');
const workflow = fs.readFileSync('.github/workflows/stage-usage-dashboard-561-credits-usage-early-start.yml', 'utf8');

assert.match(engine, /const VERSION = '1\.6\.14';/);
assert.match(manager, /const MANAGER_VERSION = '1\.2\.6';/);
assert.match(manager, /const PRODUCT_VERSION = '3\.0\.0-alpha\.5\.61';/);
assert.match(manager, /const BUNDLED_ENGINE_VERSION = '1\.6\.14';/);
assert.equal(manifest.productVersion, '3.0.0-alpha.5.61');
assert.equal(manifest.components.bridge.requiredVersion, '1.6.14');
assert.equal(manifest.components.bridgeManager.version, '1.2.6');

// Protected performance/runtime contracts remain intact.
assert.match(engine, /const CLI_CONCURRENCY = Math\.max\(1, Math\.min\(2, Number\(process\.env\.DEVPASS_BRIDGE_CLI_CONCURRENCY \|\| 2\)\)\);/);
assert.match(engine, /timeout: 25_000/);
assert.match(engine, /accountCapture: 30_000/);
assert.match(engine, /creditsBootstrap: 30_000/);
assert.match(engine, /'activity:24h': 60_000/);
assert.match(engine, /'activity:7d': 300_000/);
assert.match(engine, /'activity:30d': 600_000/);
assert.ok(!engine.includes("if (key === 'creditsBootstrap') return 'organizations';"), 'credits bootstrap must not double-count failures against the organizations circuit');
assert.ok(engine.includes("name !== 'accountCapture' && name !== 'creditsBootstrap' && ageMs <= CACHE_STALE_MAX_MS"), 'credits bootstrap must fail closed when its circuit is open');
assert.ok(engine.includes("const allowStale = name !== 'accountCapture' && name !== 'creditsBootstrap';"), 'credits bootstrap must also fail closed on refresh errors');

// One shared Credits CLI read: loadOrgs joins it instead of launching a second credits command.
assert.match(engine, /async function loadCreditsBootstrap\(\) \{\s*return cached\('creditsBootstrap', async \(\) => runCli\(\['credits', '--json'\]\)\);\s*\}/s);
const loadOrgsStart = engine.indexOf('async function loadOrgs() {');
const loadOrgsEnd = engine.indexOf('\nfunction usageOrganizations', loadOrgsStart);
assert.ok(loadOrgsStart >= 0 && loadOrgsEnd > loadOrgsStart);
const loadOrgs = engine.slice(loadOrgsStart, loadOrgsEnd);
assert.ok(loadOrgs.includes('loadCreditsBootstrap()'));
assert.ok(!loadOrgs.includes("runCli(['credits', '--json'])"), 'loadOrgs must not own a duplicate Credits CLI call');
assert.ok(loadOrgs.includes("runCli(['orgs', 'list', '--json'])"), 'plain orgs fallback must remain');
assert.ok(loadOrgs.includes("throw new Error('No organizations found in CLI output')"), 'empty-org error contract must remain');

// The early-start is conservative and disabled for serial rollback.
const candidateStart = engine.indexOf('function creditsBootstrapCandidate(');
const earlyStart = engine.indexOf('function startCreditsUsageEarly(', candidateStart);
const loadOrgsAfterHelpers = engine.indexOf('async function loadOrgs() {', earlyStart);
assert.ok(candidateStart >= 0 && earlyStart > candidateStart && loadOrgsAfterHelpers > earlyStart);
const candidateSource = engine.slice(candidateStart, earlyStart);
const earlySource = engine.slice(earlyStart, loadOrgsAfterHelpers);
assert.ok(earlySource.includes('if (CLI_CONCURRENCY < 2) return Promise.resolve(null);'));
assert.ok(earlySource.includes("usageForOrg({ id: candidate.id, kind: 'default', status: 'active' }, '24h')"));
assert.ok(earlySource.includes('.catch(() => null)'));

// Exercise the exact selector source with small dependency stubs. No guessed ID is allowed.
const context = {
  firstArray(root, preferred = []) {
    if (Array.isArray(root)) return root;
    if (!root || typeof root !== 'object') return [];
    for (const key of preferred) {
      const value = root?.[key];
      if (Array.isArray(value)) return value;
      if (value && typeof value === 'object') {
        for (const nested of ['items', 'organizations', 'data', 'results', 'rows']) {
          if (Array.isArray(value[nested])) return value[nested];
        }
      }
    }
    return [];
  },
  pick(obj, keys, fallback = null) {
    for (const key of keys) {
      let value = obj;
      for (const part of String(key).split('.')) value = value?.[part];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return fallback;
  },
  finite(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  },
};
vm.createContext(context);
vm.runInContext(`${candidateSource}\nthis.creditsBootstrapCandidate = creditsBootstrapCandidate;`, context);
const select = context.creditsBootstrapCandidate;

assert.equal(select({credits:[{id:'org-a', credits:10}]}, '')?.id, 'org-a');
assert.equal(select({credits:[{id:'org-a', credits:10},{id:'org-b', credits:20}]}, ''), null, 'ambiguous source IDs must not early-start');
assert.equal(select({credits:[{id:'org-a', credits:10},{id:'org-b', credits:20}]}, 'org-b')?.id, 'org-b', 'exact requested source ID may early-start');
assert.equal(select({credits:[{id:'org-a'}]}, ''), null, 'ID without a real Credits amount is not enough');
assert.equal(select({credits:[{id:'org-a', credits:10, kind:'chat'}]}, ''), null, 'explicit non-default org must not early-start');
assert.equal(select({credits:[{id:'org-a', credits:10, status:'deleted'}]}, ''), null, 'explicit deleted org must not early-start');

// Snapshot must launch the shared Credits bootstrap before awaiting the full organization root.
const snapshotStart = engine.indexOf('async function snapshotAttributed(');
const bootstrapIndex = engine.indexOf('const creditsBootstrapPromise = loadCreditsBootstrap();', snapshotStart);
const prefetchIndex = engine.indexOf('startCreditsUsageEarly(creditsBootstrapPromise, requestedCreditsOrgId);', snapshotStart);
const rootAwaitIndex = engine.indexOf("const orgsResult = await Promise.allSettled([timedSnapshotTask('organizations', () => loadOrgs())]);", snapshotStart);
assert.ok(snapshotStart >= 0 && bootstrapIndex > snapshotStart && prefetchIndex > bootstrapIndex && rootAwaitIndex > prefetchIndex, 'Credits bootstrap/prefetch must start before root await');

// Existing shared 24h DevPass capture and diagnostic timeline stay available.
assert.ok(engine.includes("captureAccountDetailsViaCliSession('24h')"));
assert.ok(engine.includes("captureReuse: { bootstrapRange:'24h'"));
assert.ok(engine.includes('taskTimeline'));
assert.ok(engine.includes('cliOperations'));

assert.ok(guidelines.includes('Current release implementation: `3.0.0-alpha.5.61 — Credits Usage Early Start`'));
assert.ok(guidelines.includes('Last verified real-device baseline: `3.0.0-alpha.5.59 — Snapshot Scheduling Attribution`'));
assert.ok(guidelines.includes('Next candidate after the 5.55 real-device diagnostic: `3.0.0-alpha.5.56 — Snapshot Performance Repair`'));
assert.ok(guidelines.includes('Historical 5.59 contract remains recorded: Measurement only: do not change snapshot ordering'));
assert.ok(guidelines.includes('fall back to the prior plain `orgs list --json` path'));
assert.ok(guidelines.includes('Ambiguous/missing IDs keep the 5.60 root-gated path.'));
assert.ok(guidelines.includes('dedicated circuit family must not double-count failures against the existing organizations circuit'));
assert.ok(guidelines.includes('`DEVPASS_BRIDGE_CLI_CONCURRENCY=1` disables early-start and restores the previous serial execution mode.'));
assert.ok(guidelines.includes('## Long-term update roadmap'), 'release memory update must preserve durable roadmap');

// Release keeps the 5.60 monotonic guard in front of the release push.
assert.match(workflow, /group: repo-main-write/);
assert.match(workflow, /check_release_monotonic\.py/);
assert.match(workflow, /--check-artifacts/);
assert.match(workflow, /p22-monotonic-release-integrity\.cjs/);
assert.match(workflow, /p23-credits-usage-early-start\.cjs/);
assert.ok(workflow.indexOf('check_release_monotonic.py') < workflow.indexOf("git commit -m 'release: publish Local Usage Dashboard 3.0.0-alpha.5.61 product artifacts'"));

console.log('usage-dashboard P23 Credits Usage Early Start: OK · shared Credits bootstrap, isolated circuit, safe selector, serial rollback, history, monotonic release preserved');
