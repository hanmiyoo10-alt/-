const fs = require('node:fs');
const assert = require('node:assert/strict');

const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const currentRelease = assertCurrentReleaseArtifacts();
const engine = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs', 'utf8');
const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
const latest = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const snapshotContract = JSON.parse(fs.readFileSync('plugins/usage-dashboard/contracts/snapshot-v1.schema.json', 'utf8'));
const recentContract = JSON.parse(fs.readFileSync('plugins/usage-dashboard/contracts/recent-request-v1.schema.json', 'utf8'));
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');

assert.equal(manifest.contracts.snapshot, 1);
assert.equal(manifest.contracts.recentRequest, 1);
assert.ok(snapshotContract && recentContract);

assert.match(engine, /const CLI_CONCURRENCY = Math\.max\(1, Math\.min\(2, Number\(process\.env\.DEVPASS_BRIDGE_CLI_CONCURRENCY \|\| 2\)\)\);/);
assert.match(engine, /const CACHE_STALE_MAX_MS = 30 \* 60_000;/);
assert.match(engine, /timeout: 25_000/);
assert.match(engine, /accountCapture: 30_000/);
assert.match(engine, /creditsBootstrap: 30_000/);
assert.match(engine, /'activity:24h': 60_000/);
assert.match(engine, /'activity:7d': 300_000/);
assert.match(engine, /'activity:30d': 600_000/);
const runCliOccurrences = (engine.match(/\brunCli\(/g) || []).length;
const runCliDefinitions = (engine.match(/async function runCli\(/g) || []).length;
assert.equal(runCliDefinitions, 1);
assert.equal(runCliOccurrences - runCliDefinitions, 5);
assert.ok(engine.includes("captureReuse: { bootstrapRange:'24h'"));
assert.ok(engine.includes("runCli(['orgs', 'list', '--json'])"));
assert.ok(engine.includes("throw new Error('No organizations found in CLI output')"));

assert.match(engine, /const SECONDARY_REFRESH_CONCURRENCY = 1;/);
assert.match(engine, /const SECONDARY_REFRESH_MAX_KEYS = 32;/);
assert.ok(engine.includes('if (secondaryDrainScheduled || secondaryRefreshRunning || foregroundSnapshotsActive > 0 || !secondaryRefreshQueue.length) return;'));
assert.ok(engine.includes('if (inFlight.has(name) || secondaryRefreshKeys.has(name)) return true;'));
assert.ok(engine.includes('if (secondaryRefreshKeys.size >= SECONDARY_REFRESH_MAX_KEYS)'));
assert.ok(engine.includes('const previousAt = Number(cache.get(job.name)?.at || 0);'));
assert.ok(engine.includes('const currentAt = Number(cache.get(job.name)?.at || 0);'));
assert.ok(engine.includes('if (currentAt > previousAt)'));
assert.ok(engine.includes('snapshotAttributionStorage.run(undefined'));
assert.ok(engine.includes('foregroundSnapshotsActive += 1;'));
assert.ok(engine.includes('foregroundSnapshotsActive = Math.max(0, foregroundSnapshotsActive - 1);'));
assert.ok(engine.includes('lastForegroundEndedAt = Date.now();'));

assert.ok(engine.includes("runwayFor(creditsOrg.id, { deferExpired:true })"));
assert.ok(engine.includes("analyticsScopes(resolvedCreditsOrgId, { deferLongWindow:true })"));
assert.ok(engine.includes("return json(res, 200, await analyticsScopes(creditsOrgId))"));
assert.ok(engine.includes("return json(res, 200, await runwayFor(decodeURIComponent(match[1])))"));
assert.ok(engine.includes("options?.deferExpired === true && ['7d','30d'].includes(String(range))"));
assert.ok(engine.includes("options?.deferExpired === true && ['7d','30d'].includes(normalizedRange)"));
assert.ok(!/usageForOrg\([^\n]*'24h'[^\n]*deferExpired:true/.test(engine));

assert.ok(engine.includes('}, { deferExpired:options?.deferExpired === true });'));
assert.ok(engine.includes("const usage = await usageForOrg(org, '7d');"));
assert.ok(!engine.includes("usageForOrg(org, '7d',"));
assert.ok(engine.includes("const creditsOnly = await activityForScope('7d', 'credits', orgId);"));
assert.ok(!engine.includes("activityForScope('7d', 'credits', orgId,"));
assert.ok(engine.includes("if (valueIsStale(usage)) throw new Error('Runway usage source is stale')"));
assert.ok(engine.includes("if (valueIsStale(creditsOnly)) throw new Error('Runway activity source is stale')"));

assert.ok(engine.includes('if (valueIsStale(value))'));
assert.ok(engine.includes('if (value?._cache?.stale === true) metadata.push(value._cache);'));
assert.ok(engine.includes("if (value.windows && typeof value.windows === 'object')"));
assert.ok(engine.includes("if (value.scopes && typeof value.scopes === 'object')"));
assert.ok(engine.includes('return valueIsStale(value) ? \'stale\' : \'ok\';'));
assert.ok(engine.includes('const staleInputs = (items || []).map((item) => item?._cache).filter((meta) => meta?.stale === true);'));
assert.ok(engine.includes("reason: staleInputs.some((meta) => String(meta?.reason) === 'deferred-refresh') ? 'deferred-refresh' : 'source-stale'"));
assert.ok(engine.includes('ageMs: Math.max(...staleInputs.map((meta) => Number(meta?.ageMs)).filter(Number.isFinite), 0)'));

assert.ok(diagnostics.includes("['hit','miss','join','load','stale','deferred','blocked','error']"));
assert.ok(diagnostics.includes("['empty','expired','deferred-refresh','circuit-open','refresh-error']"));
assert.ok(diagnostics.includes('function bridgeSecondaryRefreshText(performance)'));
assert.ok(latest.includes('Bridge secondary refresh:'));
assert.ok(latest.includes('deferred-refresh'));

assert.ok(guidelines.includes(currentRelease.currentMemory));
assert.ok(currentRelease.evidenceView?.display?.acceptedBaseline, 'canonical evidence view must retain accepted-baseline evidence');
assert.ok(guidelines.includes('UNKNOWN stays distinct from known zero'));
assert.ok(guidelines.includes('## Long-term update roadmap'));

console.log('usage-dashboard P25 Long-window Critical Path Decoupling: OK · source invariants retained; queue and stale behavior delegated to black-box Engine harness');
