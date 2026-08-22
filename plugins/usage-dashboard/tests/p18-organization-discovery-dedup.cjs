const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

(async () => {
  const root = 'plugins/usage-dashboard';
  const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
  const core = fs.readFileSync(`${root}/src/00-runtime-core.part.js`, 'utf8');
  const diagnostics = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
  const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
  const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
  const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));
  const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');

  assert.ok(core.includes("const VERSION = '3.0.0-alpha.5.57';"));
  assert.ok(core.includes("const REQUIRED_BRIDGE_VERSION = '1.6.11';"));
  assert.ok(source.includes('//@version 3.0.0-alpha.5.57'));
  assert.ok(engine.includes("const VERSION = '1.6.11';"));
  assert.ok(manager.includes("const PRODUCT_VERSION = '3.0.0-alpha.5.57';"));
  assert.ok(manager.includes("const BUNDLED_ENGINE_VERSION = '1.6.11';"));
  assert.equal(manifest.productVersion, '3.0.0-alpha.5.57');
  assert.equal(manifest.components.plugin.version, '3.0.0-alpha.5.57');
  assert.equal(manifest.components.bridge.requiredVersion, '1.6.11');
  assert.equal(manifest.components.bridgeManager.version, '1.2.6');
  assert.equal(manifest.components.bridgeManager.productVersion, '3.0.0-alpha.5.57');

  // Freeze the 5.56 repair. This release must not widen concurrency or change
  // timeouts/TTLs while removing the duplicate organization launch.
  const concurrencyLine = "const CLI_CONCURRENCY = Math.max(1, Math.min(2, Number(process.env.DEVPASS_BRIDGE_CLI_CONCURRENCY || 2)));";
  assert.ok(engine.includes(concurrencyLine));
  assert.ok(!engine.includes('DEVPASS_BRIDGE_CLI_CONCURRENCY || 3'));
  assert.ok(engine.includes('timeout: 25_000'));
  assert.ok(engine.includes('orgs: 30_000'));
  assert.ok(engine.includes('accountCapture: 30_000'));
  assert.ok(engine.includes("'activity:24h': 60_000"));
  assert.ok(engine.includes('const CACHE_STALE_MAX_MS = 30 * 60_000'));

  // The normal organization path is capture-primary + Credits. Plain orgs is
  // present only as an explicit fallback inside loadOrgs. Credits may be direct
  // (the original 5.57 shape) or joined through a later shared bootstrap, but it
  // must still execute once beside the account capture.
  const orgStart = engine.indexOf('async function loadOrgs() {');
  const orgEnd = engine.indexOf('\nfunction usageOrganizations', orgStart);
  assert.ok(orgStart >= 0 && orgEnd > orgStart, 'loadOrgs must be extractable');
  const orgBlock = engine.slice(orgStart, orgEnd);
  assert.ok(orgBlock.includes('const capturePromise = loadAccountCapture()'));
  assert.ok(orgBlock.includes("runCli(['credits', '--json'])") || orgBlock.includes('loadCreditsBootstrap()'));
  assert.ok(orgBlock.includes("discoveryMode = 'capture-primary'"));
  assert.ok(orgBlock.includes("discoveryMode = 'plain-orgs-fallback'"));
  assert.ok(orgBlock.includes("const rawOrgs = await runCli(['orgs', 'list', '--json']);"));
  assert.ok(orgBlock.indexOf('const capturePromise = loadAccountCapture()') < orgBlock.indexOf("const rawOrgs = await runCli(['orgs', 'list', '--json']);"));
  assert.ok(orgBlock.includes('captured?.orgs ?? captured'));
  assert.ok(orgBlock.includes('enrichDevPassFromStatus(organizations, captured.devPlanStatus)'));
  assert.ok(orgBlock.includes('sharedAccountCapture: Boolean(captured)'));
  assert.ok(orgBlock.includes('captureErrorCode: captureResult.error ? classifyError(captureResult.error) : null'));

  // Organization discovery provenance travels through the existing isolated
  // snapshot telemetry instead of creating another probe/call.
  assert.ok(engine.includes('organizationDiscovery: null'));
  assert.ok(engine.includes('attribution.organizationDiscovery = { ...value.organizationDiscovery }'));
  assert.ok(engine.includes("organizationDiscovery: attribution?.organizationDiscovery && typeof attribution.organizationDiscovery === 'object'"));
  assert.ok(diagnostics.includes('function bridgeOrganizationDiscoveryText(performance)'));
  assert.ok(diagnostics.includes('Bridge organization discovery:'));
  assert.ok(diagnostics.includes("shared account capture ${discovery.sharedAccountCapture ? 'yes' : 'no'}"));
  assert.ok(!diagnostics.includes('captureErrorCode'));
  assert.ok(!diagnostics.includes('DEVPASS_BRIDGE_CAPTURE_FILE'));

  // Exercise the shipped loadOrgs implementation with synthetic source data.
  const context = {
    Promise,
    Boolean,
    Date,
    Error,
    setTimeout,
    clearTimeout,
    attribution: {},
    cached: async (_name, loader) => loader(),
    normalizeOrganizations: (rawOrgs, rawCredits) => {
      const rows = Array.isArray(rawOrgs?.organizations) ? rawOrgs.organizations : [];
      return rows.map(row => ({ ...row, credits: rawCredits?.credits ?? row.credits ?? null }));
    },
    enrichDevPassFromStatus: (rows, status) => rows.map(row =>
      String(row.id) === String(status?.organizationId)
        ? { ...row, devPlan: status?.plan || 'max', devPlanCycle: status?.cycle || 'monthly' }
        : row
    ),
    hasDevPassCycleDetails: rows => rows.some(row => Boolean(row?.devPlanCycle)),
    currentSnapshotAttribution: () => context.attribution,
    classifyError: () => 'UPSTREAM_ERROR',
  };
  context.loadCreditsBootstrap = () => context.runCli(['credits', '--json']);
  vm.createContext(context);
  vm.runInContext(`${orgBlock}\nthis.loadOrgs = loadOrgs;`, context);

  // Primary path: account capture and Credits start together, captured /orgs is
  // reused, and the plain orgs command is never launched.
  let captureStarted = false;
  let creditsStarted = false;
  let plainOrgCalls = 0;
  let releaseCapture;
  let releaseCredits;
  context.attribution = {};
  context.loadAccountCapture = () => new Promise(resolve => {
    captureStarted = true;
    releaseCapture = resolve;
  });
  context.runCli = args => {
    if (args[0] === 'credits') {
      creditsStarted = true;
      return new Promise(resolve => { releaseCredits = resolve; });
    }
    if (args[0] === 'orgs') {
      plainOrgCalls += 1;
      return Promise.resolve({ organizations: [{ id:'fallback', kind:'default', status:'active' }] });
    }
    throw new Error(`unexpected CLI ${args[0]}`);
  };
  const primaryPromise = context.loadOrgs();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(captureStarted, true, 'account capture must start immediately');
  assert.equal(creditsStarted, true, 'Credits must start beside account capture');
  releaseCapture({
    orgs: { organizations: [{ id:'org-1', kind:'default', status:'active' }] },
    devPlanStatus: { organizationId:'org-1', plan:'max', cycle:'monthly' },
  });
  releaseCredits({ credits: 7 });
  const primary = await primaryPromise;
  assert.equal(plainOrgCalls, 0, 'normal capture path must not launch plain orgs again');
  assert.equal(primary.organizations.length, 1);
  assert.equal(primary.organizations[0].id, 'org-1');
  assert.equal(primary.organizations[0].credits, 7);
  assert.equal(primary.organizations[0].devPlan, 'max');
  assert.equal(primary.organizationDiscovery.mode, 'capture-primary');
  assert.equal(primary.organizationDiscovery.fallbackCount, 0);
  assert.equal(primary.organizationDiscovery.sharedAccountCapture, true);
  assert.equal(context.attribution.organizationDiscovery.mode, 'capture-primary');

  // Capture failure: Credits keeps running once, then only one legacy plain orgs
  // fallback is used. No unknown data is fabricated.
  plainOrgCalls = 0;
  context.attribution = {};
  context.loadAccountCapture = async () => { throw new Error('capture unavailable'); };
  context.runCli = async args => {
    if (args[0] === 'credits') return { credits: 9 };
    if (args[0] === 'orgs') {
      plainOrgCalls += 1;
      return { organizations: [{ id:'org-fallback', kind:'default', status:'active' }] };
    }
    throw new Error(`unexpected CLI ${args[0]}`);
  };
  const fallback = await context.loadOrgs();
  assert.equal(plainOrgCalls, 1);
  assert.equal(fallback.organizations[0].id, 'org-fallback');
  assert.equal(fallback.organizations[0].credits, 9);
  assert.equal(fallback.organizationDiscovery.mode, 'plain-orgs-fallback');
  assert.equal(fallback.organizationDiscovery.fallbackCount, 1);
  assert.equal(fallback.organizationDiscovery.sharedAccountCapture, false);
  assert.equal(fallback.organizationDiscovery.captureErrorCode, 'UPSTREAM_ERROR');
  assert.equal(context.attribution.organizationDiscovery.mode, 'plain-orgs-fallback');

  // Preserve the previous hard Credits failure semantics: a capture success does
  // not turn a Credits failure into a new partial-success mode.
  context.attribution = {};
  plainOrgCalls = 0;
  context.loadAccountCapture = async () => ({
    orgs: { organizations: [{ id:'org-credits-fail', kind:'default', status:'active' }] },
  });
  context.runCli = async args => {
    if (args[0] === 'credits') throw new Error('credits unavailable');
    if (args[0] === 'orgs') {
      plainOrgCalls += 1;
      return { organizations: [{ id:'should-not-run', kind:'default', status:'active' }] };
    }
    throw new Error(`unexpected CLI ${args[0]}`);
  };
  await assert.rejects(() => context.loadOrgs(), /credits unavailable/);
  assert.equal(plainOrgCalls, 0, 'Credits hard failure must not trigger an unrelated org fallback');

  // Existing fidelity/recovery/attribution contracts remain frozen.
  assert.ok(diagnostics.includes('parser provider-usage-v3'));
  assert.ok(diagnostics.includes('unknown stays unknown'));
  assert.ok(diagnostics.includes('missing Write/TTL is never inferred from price/provider'));
  assert.ok(diagnostics.includes('active local errors'));
  assert.ok(diagnostics.includes('Bridge snapshot attribution:'));
  assert.ok(diagnostics.includes('Bridge CLI timing:'));
  assert.ok(engine.includes('limit: CLI_CONCURRENCY'));
  assert.ok(engine.includes('peakActive: runs > 0 ? Number(cli.maxActive || 0) : null'));

  assert.ok(guidelines.includes('Last verified real-device baseline: `3.0.0-alpha.5.56 — Snapshot Performance Repair: Bounded CLI Parallelism`'));
  assert.ok(guidelines.includes('Current release implementation: `3.0.0-alpha.5.57 — Organization Discovery Deduplication`'));
  assert.ok(guidelines.includes('cumulative local persist history remained visible while `active 0` allowed `READY`'));
  assert.ok(guidelines.includes('missing Write/TTL remained UNKNOWN and was never inferred'));
  assert.ok(guidelines.includes('fall back to the prior plain `orgs list --json` path'));

  console.log('usage-dashboard P18 organization discovery deduplication: OK · capture-primary shares org/status source, plain orgs remains fallback, Credits semantics preserved');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});