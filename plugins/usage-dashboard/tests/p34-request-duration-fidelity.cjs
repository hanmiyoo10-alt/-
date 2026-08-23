'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');

const release = assertCurrentReleaseArtifacts();
assert.equal(release.productVersion, '3.0.0-alpha.5.70');
assert.equal(release.engineVersion, '1.6.21');
assert.equal(release.managerVersion, '1.3.0');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const cliRuntime = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/30-cli-runtime.part.mjs', 'utf8');
const engineSources = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/40-sources.part.mjs', 'utf8');
const engine = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs', 'utf8');
const requestNormalize = fs.readFileSync('plugins/usage-dashboard/src/10-request-normalize.part.js', 'utf8');
const ledger = fs.readFileSync('plugins/usage-dashboard/src/14-request-ledger.part.js', 'utf8');
const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
const validator = fs.readFileSync(release.validatorWorkflow, 'utf8');
const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');

assert.ok(cliRuntime.includes("typeof row.duration === 'number' && Number.isFinite(row.duration) && row.duration >= 0"), 'capture must accept only explicit numeric non-negative /logs duration');
assert.ok(cliRuntime.includes("durationSource: durationMs !== null ? 'llmgateway-log-duration' : ''"));
assert.ok(cliRuntime.includes("durationFidelity: durationMs !== null ? 'explicit' : 'unknown'"));
assert.ok(cliRuntime.includes("u.pathname = (prefix + '/logs')"), 'existing /logs request must remain the source');
assert.ok(cliRuntime.includes("u.searchParams.set('limit', '100')"), 'existing 100-row capture bound must remain');
assert.ok(cliRuntime.includes('safe.slice(0, 100)'), 'captured log rows must remain bounded to 100');
assert.equal((cliRuntime.match(/pathname = \(prefix \+ '\/logs'\)/g) || []).length, 1, 'duration must not add another /logs endpoint');
assert.ok(cliRuntime.includes('Prompt/response bodies,'));
assert.ok(cliRuntime.includes('messages, custom headers, cookies, and auth material are never persisted.'));

assert.ok(engineSources.includes("durationSource: durationExplicit ? 'llmgateway-log-duration' : ''"));
assert.ok(engineSources.includes("durationFidelity: durationExplicit ? 'explicit' : 'unknown'"));
assert.ok(engineSources.includes("typeof row.durationMs === 'number' && Number.isFinite(row.durationMs) && row.durationMs >= 0"));
assert.ok(engine.includes("const VERSION = '1.6.21';"));
assert.ok(engine.includes("durationSource: durationExplicit ? 'llmgateway-log-duration' : ''"));

assert.ok(requestNormalize.includes("recentRequestValue(row, ['durationMs'], null)"), 'plugin normalization must only consume normalized durationMs');
assert.ok(requestNormalize.includes("source === 'llmgateway-log-duration' && fidelity === 'explicit'"));
assert.ok(requestNormalize.includes("typeof value === 'number' && Number.isFinite(value) && value >= 0"), '0ms must be known while strings/negative/NaN remain unknown');
for (const forbidden of ['updatedAt','updated_at','completedAt','completed_at','startedAt','started_at','tokens /','tokens/','model average','provider average']) {
  const durationHelperStart = requestNormalize.indexOf('function requestDurationMetadata');
  const durationHelperEnd = requestNormalize.indexOf('function requestCacheSignal', durationHelperStart);
  const helper = requestNormalize.slice(durationHelperStart, durationHelperEnd);
  assert.ok(!helper.includes(forbidden), `duration normalizer must not infer from ${forbidden}`);
}

const keyStart = ledger.indexOf('function requestLedgerKey(row)');
const keyEnd = ledger.indexOf('function collectRecentRequestLedger', keyStart);
const requestKey = ledger.slice(keyStart, keyEnd);
assert.ok(keyStart >= 0 && keyEnd > keyStart);
assert.ok(!requestKey.includes('duration'), 'duration must never participate in request dedupe identity');
assert.ok(ledger.includes("incomingDuration.durationFidelity === 'explicit' ? incomingDuration : currentDuration"), 'UNKNOWN→explicit duration must enrich the existing row');
assert.ok(ledger.includes('function requestDurationStats(rows)'));
assert.ok(ledger.includes('Duration known ${durationSummary.explicit}/${durationSummary.rows}'));
assert.ok(ledger.includes('Duration ${requestDurationText(row)}'));
assert.ok(ledger.includes('Duration explicit ${durationFidelity.explicit}/${durationFidelity.rows}'));

assert.ok(diagnostics.includes('Request duration fidelity: explicit ${diagDurationFidelity.explicit}/${diagDurationFidelity.rows}'));
assert.ok(diagnostics.includes("source ${diagDurationFidelity.sources.join(',') || 'none'}"));
assert.ok(diagnostics.includes('average ${formatRequestDurationMs(diagDurationFidelity.averageMs)}'));
assert.ok(diagnostics.includes('slowest ${formatRequestDurationMs(diagDurationFidelity.slowestMs)}'));

assert.match(engine, /const CLI_CONCURRENCY = Math\.max\(1, Math\.min\(2,/);
assert.match(engine, /timeout: 25_000/);
assert.match(engine, /const SECONDARY_REFRESH_CONCURRENCY = 1;/);
assert.match(engine, /const SECONDARY_REFRESH_MAX_KEYS = 32;/);
assert.match(engine, /const CACHE_STALE_MAX_MS = 30 \* 60_000;/);
assert.ok(engine.includes("accountCapture: 30_000"));
assert.ok(engine.includes("'activity:24h': 60_000"));
assert.ok(engine.includes("if (CLI_CONCURRENCY < 2)"));

assert.ok(validator.includes('behavior-request-duration.cjs'));
assert.ok(validator.includes('p34-request-duration-fidelity.cjs'));
assert.match(validator, /permissions:\s*\n\s*contents: read/);
assert.doesNotMatch(validator, /repo-main-write\.py|git push|contents: write/);
assert.ok(manager.includes("const MANAGER_VERSION = '1.3.0';"));
assert.ok(manager.includes("const PRODUCT_VERSION = '3.0.0-alpha.5.70';"));
assert.ok(manager.includes("const BUNDLED_ENGINE_VERSION = '1.6.21';"));

console.log('usage-dashboard P34 Request Duration Fidelity: OK · explicit /logs duration only, UNKNOWN preserved, dedupe identity unchanged, zero/error values retained, no extra network call');
