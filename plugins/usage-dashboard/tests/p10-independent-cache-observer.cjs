const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

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
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));

assert.ok(core.includes("const VERSION = '3.0.0-alpha.5.50';"));
assert.ok(core.includes("const REQUIRED_BRIDGE_VERSION = '1.6.6';"));
assert.ok(!core.includes('//@allowed-ipc provider-manager'));
assert.ok(!source.includes('providerManagerCache'));
assert.ok(!bridgeIo.includes('providerManagerCache'));
assert.ok(!refresh.includes('scheduleProviderManagerCacheEnrichment'));
assert.ok(!bootstrap.includes('providerManagerCache'));
assert.ok(!diagnostics.includes('Provider Manager cache IPC'));
assert.ok(!source.includes("op:'cacheObservability'"));
assert.ok(!source.includes('pm_request_logs'));

assert.ok(engine.includes("const VERSION = '1.6.6';"));
assert.ok(engine.includes("Symbol.for('llmgateway.devpass.bridge.capture.v8')"));
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
assert.ok(engine.includes('cacheMetricSource: String(row.cacheMetricSource ||'));

assert.ok(manager.includes("const MANAGER_VERSION = '1.2.6';"));
assert.ok(manager.includes("const PRODUCT_VERSION = '3.0.0-alpha.5.50';"));
assert.ok(manager.includes("const BUNDLED_ENGINE_VERSION = '1.6.6';"));
assert.equal(manifest.productVersion, '3.0.0-alpha.5.50');
assert.equal(manifest.components.plugin.version, '3.0.0-alpha.5.50');
assert.equal(manifest.components.bridge.requiredVersion, '1.6.6');
assert.equal(manifest.components.bridgeManager.version, '1.2.6');
assert.equal(manifest.components.bridgeManager.productVersion, '3.0.0-alpha.5.50');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

// The Dashboard must preserve generic cached totals without claiming they are
// explicit provider cache reads.
const readMetricStart = requestNormalize.indexOf('    const cacheReadInputTokens = metric([');
const readMetricEnd = requestNormalize.indexOf('    ]);', readMetricStart);
assert.ok(readMetricStart >= 0 && readMetricEnd > readMetricStart);
const readMetricBlock = requestNormalize.slice(readMetricStart, readMetricEnd);
assert.ok(!readMetricBlock.includes('cachedContentTokenCount'));
assert.ok(!readMetricBlock.includes('prompt_tokens_details.cached_tokens'));
assert.ok(!readMetricBlock.includes('input_tokens_details.cached_tokens'));
assert.ok(!readMetricBlock.includes("'cachedTokens'"));

const cachedMetricStart = requestNormalize.indexOf('    const explicitCachedInputTokens = metric([');
const cachedMetricEnd = requestNormalize.indexOf('    ]);', cachedMetricStart);
const cachedMetricBlock = requestNormalize.slice(cachedMetricStart, cachedMetricEnd);
assert.ok(cachedMetricBlock.includes('cachedContentTokenCount'));
assert.ok(cachedMetricBlock.includes('prompt_tokens_details.cached_tokens'));
assert.ok(cachedMetricBlock.includes('input_tokens_details.cached_tokens'));
assert.ok(!analytics.includes('cacheReadInputTokens ?? row?.cache_read_input_tokens ?? row?.cachedTokens'));
assert.ok(!analytics.includes('cacheReadInputTokens ?? raw.cache_read_input_tokens ?? raw.cachedTokens'));
assert.ok(ledger.includes('Cached ${cached} · Read ${read}'));
assert.ok(ledger.includes('cacheMetricSource:String('));
assert.ok(diagnostics.includes('Cache observer: ${cacheObserverDiagnosticText(diagLedgerRows)}'));
assert.ok(diagnostics.includes('cached total != explicit Read'));

// Evaluate the clean-room provider parser in isolation. The marker block is
// deliberately dependency-free so these fixtures lock semantics, not minified
// implementation details.
const parserStartMarker = '  // CACHE_OBSERVER_PARSER_START\n';
const parserEndMarker = '  // CACHE_OBSERVER_PARSER_END';
const parserStart = engine.indexOf(parserStartMarker);
const parserEnd = engine.indexOf(parserEndMarker, parserStart);
assert.ok(parserStart >= 0 && parserEnd > parserStart, 'cache observer parser block must be extractable');
const parser = engine.slice(parserStart + parserStartMarker.length, parserEnd);
const context = {};
vm.createContext(context);
vm.runInContext(`${parser}\nthis.normalizeProviderCacheUsage = normalizeProviderCacheUsage;`, context);
const parse = context.normalizeProviderCacheUsage;

const anthropic = parse({usage:{
  input_tokens:100,
  output_tokens:20,
  cache_read_input_tokens:60,
  cache_creation_input_tokens:30,
  cache_creation:{ephemeral_5m_input_tokens:20,ephemeral_1h_input_tokens:10},
}});
assert.equal(anthropic.source, 'anthropic-usage');
assert.equal(anthropic.inputTokens, 100);
assert.equal(anthropic.outputTokens, 20);
assert.equal(anthropic.cacheReadInputTokens, 60);
assert.equal(anthropic.cacheCreationInputTokens, 30);
assert.equal(anthropic.cacheCreation5mTokens, 20);
assert.equal(anthropic.cacheCreation1hTokens, 10);
assert.equal(anthropic.cachedInputTokens, 90);

const anthropicTtlOnly = parse({usage:{
  input_tokens:100,
  cache_read_input_tokens:40,
  cache_creation:{ephemeral_5m_input_tokens:12,ephemeral_1h_input_tokens:8},
}});
assert.equal(anthropicTtlOnly.cacheCreationInputTokens, 20);
assert.equal(anthropicTtlOnly.cachedInputTokens, 60);

const gemini = parse({usageMetadata:{
  promptTokenCount:120,
  candidatesTokenCount:25,
  cachedContentTokenCount:80,
  totalTokenCount:145,
}});
assert.equal(gemini.source, 'gemini-usage');
assert.equal(gemini.cachedInputTokens, 80);
assert.equal(gemini.cacheReadInputTokens, null);
assert.equal(gemini.cacheCreationInputTokens, null);

const openAiChat = parse({usage:{
  prompt_tokens:90,
  completion_tokens:11,
  prompt_tokens_details:{cached_tokens:50,cache_write_tokens:7},
}});
assert.equal(openAiChat.source, 'openai-chat-usage');
assert.equal(openAiChat.cachedInputTokens, 50);
assert.equal(openAiChat.cacheReadInputTokens, null);
assert.equal(openAiChat.cacheCreationInputTokens, 7);

const openAiResponses = parse({usage:{
  input_tokens:75,
  output_tokens:9,
  input_tokens_details:{cached_tokens:44,cache_write_tokens:6},
}});
assert.equal(openAiResponses.source, 'openai-responses-usage');
assert.equal(openAiResponses.cachedInputTokens, 44);
assert.equal(openAiResponses.cacheReadInputTokens, null);
assert.equal(openAiResponses.cacheCreationInputTokens, 6);

const gateway = parse({usage:{inputTokens:55,outputTokens:5,cachedTokens:33,cacheWriteTokens:4}});
assert.equal(gateway.source, 'llmgateway-usage');
assert.equal(gateway.cachedInputTokens, 33);
assert.equal(gateway.cacheReadInputTokens, null);
assert.equal(gateway.cacheCreationInputTokens, 4);

assert.equal(parse({usage:{input_tokens:10,output_tokens:2}}), null, 'ordinary token usage must not be labeled cache metadata');
assert.equal(parse({usageMetadata:{promptTokenCount:10,candidatesTokenCount:2}}), null, 'Gemini without cached content must remain unknown');

const sanitizeStart = engine.indexOf('  const sanitizeLogs = (value) => {');
const sanitizeEnd = engine.indexOf('\n  const storeStatus =', sanitizeStart);
assert.ok(sanitizeStart >= 0 && sanitizeEnd > sanitizeStart);
const sanitizeBlock = engine.slice(sanitizeStart, sanitizeEnd);
for (const forbidden of ['requestBody:', 'responseBody:', 'messages:', 'authorization:', 'apiKey:', 'cookie:']) {
  assert.ok(!sanitizeBlock.includes(forbidden), `sanitized log projection must not persist ${forbidden}`);
}

console.log('usage-dashboard P10 independent cache observer: OK · provider cache semantics extracted without Provider Manager dependency');
