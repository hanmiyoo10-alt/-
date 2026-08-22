'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');

const currentRelease = assertCurrentReleaseArtifacts();
const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const core = fs.readFileSync(`${root}/src/00-runtime-core.part.js`, 'utf8');
const bridgeIo = fs.readFileSync(`${root}/src/20-bridge-io.part.js`, 'utf8');
const refresh = fs.readFileSync(`${root}/src/30-refresh-runtime.part.js`, 'utf8');
const bootstrap = fs.readFileSync(`${root}/src/90-bootstrap.part.js`, 'utf8');
const requestNormalize = fs.readFileSync(`${root}/src/10-request-normalize.part.js`, 'utf8');
const ledger = fs.readFileSync(`${root}/src/14-request-ledger.part.js`, 'utf8');
const analytics = fs.readFileSync(`${root}/src/16-usage-analytics.part.js`, 'utf8');
const diagnostics = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));
const workflow = fs.readFileSync(currentRelease.sharedWorkflow, 'utf8');

assert.ok(!core.includes('//@allowed-ipc provider-manager'));
assert.ok(!source.includes('providerManagerCache'));
assert.ok(!bridgeIo.includes('providerManagerCache'));
assert.ok(!refresh.includes('scheduleProviderManagerCacheEnrichment'));
assert.ok(!bootstrap.includes('providerManagerCache'));
assert.ok(!diagnostics.includes('Provider Manager cache IPC'));
assert.ok(!source.includes("op:'cacheObservability'"));
assert.ok(!source.includes('pm_request_logs'));

assert.ok(engine.includes("Symbol.for('llmgateway.devpass.bridge.capture.v10')"));
assert.ok(engine.includes('// CACHE_OBSERVER_PARSER_START'));
assert.ok(engine.includes('// CACHE_OBSERVER_PARSER_END'));
assert.ok(engine.includes('const normalizeProviderCacheUsage = (row) =>'));
assert.ok(engine.includes('cachedContentTokenCount'));
assert.ok(engine.includes('cache_read_input_tokens'));
assert.ok(engine.includes('cache_creation.ephemeral_5m_input_tokens'));
assert.ok(engine.includes('cache_creation.ephemeral_1h_input_tokens'));
assert.ok(engine.includes('input_tokens_details.cached_tokens'));
assert.ok(engine.includes('prompt_tokens_details.cached_tokens'));
assert.ok(engine.includes('cacheMetricSource: cacheUsage?.source'));
assert.ok(engine.includes('state.devpassLogs = { range: String(range), rows: safe.slice(0, 100)'));

assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

// Generic cached totals remain separate from explicit provider cache reads.
assert.ok(requestNormalize.includes("'cacheReadInputTokens','cache_read_input_tokens','usage.cacheReadInputTokens','usage.cache_read_input_tokens'"));
assert.ok(requestNormalize.includes("'cachedContentTokenCount','cached_content_token_count','usage.cachedContentTokenCount','usage.cached_content_token_count'"));
assert.ok(requestNormalize.includes("'usage.input_tokens_details.cached_tokens','usage.prompt_tokens_details.cached_tokens'"));
assert.ok(!analytics.includes('cacheReadInputTokens ?? row?.cache_read_input_tokens ?? row?.cachedTokens'));
assert.ok(!analytics.includes('cacheReadInputTokens ?? raw.cache_read_input_tokens ?? raw.cachedTokens'));
assert.ok(ledger.includes('Cached ${cached} · Read ${read}'));
assert.ok(ledger.includes('cacheMetricSource:String('));
assert.ok(diagnostics.includes('Cache observer: ${cacheObserverDiagnosticText(diagLedgerRows)}'));
assert.ok(diagnostics.includes('cached total = Read + Write when both are known'));

assert.ok(workflow.includes('behavior-cache-observer.cjs'));
console.log('usage-dashboard P10 independent cache observer: OK · static independence boundaries retained; exact parser behavior delegated to capture-tap harness');
