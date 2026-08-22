const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const currentRelease = assertCurrentReleaseArtifacts();
(async () => {
  const root = 'plugins/usage-dashboard';
  const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
  const core = fs.readFileSync(`${root}/src/00-runtime-core.part.js`, 'utf8');
  const diagnostics = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
  const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
  const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
  const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));
  const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');


  // Freeze the verified performance/safety envelope. 5.58 removes one normal
  // capture, not by widening concurrency or changing timeout/cache behavior.
  assert.ok(engine.includes("const CLI_CONCURRENCY = Math.max(1, Math.min(2, Number(process.env.DEVPASS_BRIDGE_CLI_CONCURRENCY || 2)));"));
  assert.ok(!engine.includes('DEVPASS_BRIDGE_CLI_CONCURRENCY || 3'));
  assert.ok(engine.includes('timeout: 25_000'));
  assert.ok(engine.includes('accountCapture: 30_000'));
  assert.ok(engine.includes("'activity:24h': 60_000"));
  assert.ok(engine.includes("'activity:7d': 300_000"));
  assert.ok(engine.includes("'activity:30d': 600_000"));
  assert.ok(engine.includes('const CACHE_STALE_MAX_MS = 30 * 60_000'));
  assert.ok(engine.includes("name !== 'accountCapture'"), 'accountCapture must retain no-stale semantics');

  // The existing accountCapture cache now asks the already-capable tap for 24h
  // activity/logs. No new cache key/TTL is introduced.
  const accountStart = engine.indexOf('async function loadAccountCapture() {');
  const accountEnd = engine.indexOf('\nasync function cached(', accountStart);
  assert.ok(accountStart >= 0 && accountEnd > accountStart, 'loadAccountCapture must be extractable');
  const accountBlock = engine.slice(accountStart, accountEnd);
  assert.ok(accountBlock.includes("cached('accountCapture'"));
  assert.ok(accountBlock.includes("captureAccountDetailsViaCliSession('24h')"));
  assert.ok(!engine.includes("cached('accountCapture24h'"));
  assert.ok(!engine.includes("sharedCapture:24h"));

  // 24h DevPass activity attempts the shared account capture first. Dedicated
  // capture survives only as a fallback. 7d/30d remain independent.
  const activityStart = engine.indexOf("async function devPassActivityForRange(range = '24h', options = {}) {");
  const activityEnd = engine.indexOf('\nfunction legacyDevPassUsageOrganization', activityStart);
  assert.ok(activityStart >= 0 && activityEnd > activityStart, 'devPassActivityForRange must be extractable');
  const activityBlock = engine.slice(activityStart, activityEnd);
  assert.ok(activityBlock.includes("if (normalizedRange === '24h')"));
  assert.ok(activityBlock.includes('captured = await loadAccountCapture()'));
  assert.ok(activityBlock.includes("captured = await captureAccountDetailsViaCliSession('24h')"));
  assert.ok(activityBlock.includes('captured = await captureAccountDetailsViaCliSession(normalizedRange)'));
  assert.ok(activityBlock.indexOf('captured = await loadAccountCapture()') < activityBlock.indexOf("captured = await captureAccountDetailsViaCliSession('24h')"));
  assert.ok(activityBlock.includes('officialActivityRows(sharedRawActivity).length'));
  assert.ok(activityBlock.includes('activityReuseChecks += 1'));
  assert.ok(activityBlock.includes('activityShared += 1'));
  assert.ok(activityBlock.includes('dedicated24hFallbacks += 1'));

  const makeAttribution = () => ({
    captureReuse: { bootstrapRange:'24h', activityReuseChecks:0, activityShared:0, dedicated24hFallbacks:0 },
  });
  const context = {
    Promise,
    Boolean,
    Date,
    Error,
    String,
    attribution: makeAttribution(),
    cached: async (_name, loader) => loader(),
    currentSnapshotAttribution: () => context.attribution,
    officialActivityRows: raw => Array.isArray(raw?.rows) ? raw.rows : [],
    normalizeIndependentDevPassStatus: raw => raw && typeof raw === 'object' ? {
      plan: raw.plan || 'max',
      organizationId: raw.organizationId || 'dev-org',
      projectId: raw.projectId || 'project-1',
    } : null,
    normalizeUsageActivity: (raw, org, range) => ({ range, orgId:org?.id || null, rows:raw.rows.length }),
    normalizeCapturedRecentLogs: logs => Array.isArray(logs?.rows) ? logs.rows : [],
  };
  vm.createContext(context);
  vm.runInContext(`${activityBlock}\nthis.devPassActivityForRange = devPassActivityForRange;`, context);

  // Normal 24h path: the account bootstrap already contains usable activity,
  // so there is no second dedicated capture.
  let dedicatedCalls = [];
  context.attribution = makeAttribution();
  context.loadAccountCapture = async () => ({
    devPlanStatus: { plan:'max', organizationId:'dev-org', projectId:'project-1' },
    devpassActivity: { payload:{ rows:[{ requestCount:1 }] } },
    devpassLogs: { rows:[{ id:'log-1' }] },
  });
  context.captureAccountDetailsViaCliSession = async range => {
    dedicatedCalls.push(range);
    throw new Error('dedicated capture must not run on shared success');
  };
  const shared = await context.devPassActivityForRange('24h');
  assert.equal(shared.range, '24h');
  assert.equal(shared.recentRequests.length, 1);
  assert.deepEqual(dedicatedCalls, []);
  assert.equal(context.attribution.captureReuse.activityReuseChecks, 1);
  assert.equal(context.attribution.captureReuse.activityShared, 1);
  assert.equal(context.attribution.captureReuse.dedicated24hFallbacks, 0);

  // Missing shared activity: preserve the old dedicated 24h capture exactly once.
  dedicatedCalls = [];
  context.attribution = makeAttribution();
  context.loadAccountCapture = async () => ({
    devPlanStatus: { plan:'max', organizationId:'dev-org', projectId:'project-1' },
    devpassActivity: null,
  });
  context.captureAccountDetailsViaCliSession = async range => {
    dedicatedCalls.push(range);
    return {
      devPlanStatus: { plan:'max', organizationId:'dev-org', projectId:'project-1' },
      devpassActivity: { payload:{ rows:[{ requestCount:2 }] } },
      devpassLogs: { rows:[{ id:'fallback-log' }] },
    };
  };
  const fallback = await context.devPassActivityForRange('24h');
  assert.equal(fallback.range, '24h');
  assert.deepEqual(dedicatedCalls, ['24h']);
  assert.equal(context.attribution.captureReuse.activityReuseChecks, 1);
  assert.equal(context.attribution.captureReuse.activityShared, 0);
  assert.equal(context.attribution.captureReuse.dedicated24hFallbacks, 1);

  // 7d remains independent and must not touch the shared account capture.
  dedicatedCalls = [];
  context.attribution = makeAttribution();
  context.loadAccountCapture = async () => { throw new Error('7d must not use account capture'); };
  context.captureAccountDetailsViaCliSession = async range => {
    dedicatedCalls.push(range);
    return {
      devPlanStatus: { plan:'max', organizationId:'dev-org', projectId:'project-1' },
      devpassActivity: { payload:{ rows:[{ requestCount:7 }] } },
    };
  };
  const seven = await context.devPassActivityForRange('7d');
  assert.equal(seven.range, '7d');
  assert.deepEqual(dedicatedCalls, ['7d']);
  assert.equal(context.attribution.captureReuse.activityReuseChecks, 0);
  assert.equal(context.attribution.captureReuse.dedicated24hFallbacks, 0);

  // Unknown stays unknown: if shared and dedicated captures both lack activity,
  // the old unavailable error remains; no empty/zero usage result is invented.
  dedicatedCalls = [];
  context.attribution = makeAttribution();
  context.loadAccountCapture = async () => ({
    devPlanStatus: { plan:'max', organizationId:'dev-org', projectId:'project-1' },
    devpassActivity: null,
  });
  context.captureAccountDetailsViaCliSession = async range => {
    dedicatedCalls.push(range);
    return {
      devPlanStatus: { plan:'max', organizationId:'dev-org', projectId:'project-1' },
      devpassActivity: null,
    };
  };
  await assert.rejects(
    () => context.devPassActivityForRange('24h'),
    /DevPass \/activity 24h unavailable/,
  );
  assert.deepEqual(dedicatedCalls, ['24h']);
  assert.equal(context.attribution.captureReuse.dedicated24hFallbacks, 1);

  // Safe per-snapshot diagnostics expose only the reuse decision/counter.
  assert.ok(engine.includes("captureReuse: { bootstrapRange:'24h', activityReuseChecks:0, activityShared:0, dedicated24hFallbacks:0 }"));
  assert.ok(engine.includes("captureReuse: attribution?.captureReuse && typeof attribution.captureReuse === 'object'"));
  assert.ok(diagnostics.includes('function bridgeCaptureReuseText(performance)'));
  assert.ok(diagnostics.includes('Bridge 24h capture reuse:'));
  assert.ok(diagnostics.includes('activity shared ${activityState}'));
  assert.ok(!diagnostics.includes('DEVPASS_BRIDGE_CAPTURE_FILE'));
  assert.ok(!diagnostics.includes('captureFile'));

  // Preserve 5.57 organization/fidelity/recovery contracts.
  assert.ok(engine.includes("discoveryMode = 'capture-primary'"));
  assert.ok(engine.includes("discoveryMode = 'plain-orgs-fallback'"));
  assert.ok(engine.includes("No organizations found in CLI output"));
  assert.ok(diagnostics.includes('parser provider-usage-v3'));
  assert.ok(diagnostics.includes('unknown stays unknown'));
  assert.ok(diagnostics.includes('missing Write/TTL is never inferred from price/provider'));
  assert.ok(diagnostics.includes('active local errors'));
  assert.ok(diagnostics.includes('Bridge snapshot attribution:'));
  assert.ok(diagnostics.includes('Bridge CLI timing:'));

  assert.ok(guidelines.includes(currentRelease.verifiedBaseline));
  assert.ok(guidelines.includes(currentRelease.currentMemory));
  assert.ok(guidelines.includes('Keep 24h usage and DevPass Activity on the foreground truth path.'));
  assert.ok(guidelines.includes('shared capture behavior'));
  assert.ok(guidelines.includes('Keep already-working behavior unchanged unless the release goal requires touching it.'));
  assert.ok(guidelines.includes('Keep UNKNOWN distinct from known zero'));

  console.log('usage-dashboard P20 shared 24h capture: OK · account/status/activity share 24h bootstrap, dedicated fallback preserved, 7d/30d unchanged');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

