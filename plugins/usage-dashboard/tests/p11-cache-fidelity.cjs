const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const core = fs.readFileSync(`${root}/src/00-runtime-core.part.js`, 'utf8');
const diagnostics = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));

assert.ok(core.includes("const VERSION = '3.0.0-alpha.5.51';"));
assert.ok(core.includes("const REQUIRED_BRIDGE_VERSION = '1.6.7';"));
assert.ok(source.includes('//@version 3.0.0-alpha.5.51'));
assert.ok(source.includes("const VERSION = '3.0.0-alpha.5.51';"));
assert.ok(engine.includes("const VERSION = '1.6.7';"));
assert.ok(engine.includes("Symbol.for('llmgateway.devpass.bridge.capture.v9')"));
assert.ok(manager.includes("const MANAGER_VERSION = '1.2.6';"));
assert.ok(manager.includes("const PRODUCT_VERSION = '3.0.0-alpha.5.51';"));
assert.ok(manager.includes("const BUNDLED_ENGINE_VERSION = '1.6.7';"));
assert.equal(manifest.productVersion, '3.0.0-alpha.5.51');
assert.equal(manifest.components.plugin.version, '3.0.0-alpha.5.51');
assert.equal(manifest.components.bridge.requiredVersion, '1.6.7');
assert.equal(manifest.components.bridgeManager.version, '1.2.6');
assert.equal(manifest.components.bridgeManager.productVersion, '3.0.0-alpha.5.51');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

assert.ok(diagnostics.includes('parser provider-usage-v2'));
assert.ok(diagnostics.includes('LLMGateway cachedTokens = provider cache Read'));
assert.ok(diagnostics.includes('cached total = Read + Write when both are known'));
assert.ok(!source.includes('providerManagerCache'));
assert.ok(!source.includes('Provider Manager cache IPC'));
assert.ok(!source.includes('pm_request_logs'));

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

const llmgatewayLog = parse({
  requestId: 'req-cache-1',
  createdAt: '2026-08-19T10:00:00.000Z',
  promptTokens: 12000,
  completionTokens: 500,
  totalTokens: 12500,
  cachedTokens: 8000,
  cacheWriteTokens: 1200,
  cacheWrite5mTokens: 1000,
  cacheWrite1hTokens: 200,
});
assert.equal(llmgatewayLog.source, 'llmgateway-log-cache-v1');
assert.equal(llmgatewayLog.inputTokens, 12000);
assert.equal(llmgatewayLog.outputTokens, 500);
assert.equal(llmgatewayLog.totalTokens, 12500);
assert.equal(llmgatewayLog.cacheReadInputTokens, 8000);
assert.equal(llmgatewayLog.cacheCreationInputTokens, 1200);
assert.equal(llmgatewayLog.cacheCreation5mTokens, 1000);
assert.equal(llmgatewayLog.cacheCreation1hTokens, 200);
assert.equal(llmgatewayLog.cachedInputTokens, 9200);

const llmgatewayWriteOnly = parse({
  requestId: 'req-cache-2',
  createdAt: '2026-08-19T10:01:00.000Z',
  cachedTokens: 0,
  cacheWriteTokens: 4096,
  cacheWrite5mTokens: 4096,
  cacheWrite1hTokens: 0,
});
assert.equal(llmgatewayWriteOnly.source, 'llmgateway-log-cache-v1');
assert.equal(llmgatewayWriteOnly.cacheReadInputTokens, 0);
assert.equal(llmgatewayWriteOnly.cacheCreationInputTokens, 4096);
assert.equal(llmgatewayWriteOnly.cacheCreation5mTokens, 4096);
assert.equal(llmgatewayWriteOnly.cacheCreation1hTokens, 0);
assert.equal(llmgatewayWriteOnly.cachedInputTokens, 4096);

const generic = parse({usage:{inputTokens:55,outputTokens:5,cachedTokens:33,cacheWriteTokens:4}});
assert.equal(generic.source, 'llmgateway-usage');
assert.equal(generic.cachedInputTokens, 33);
assert.equal(generic.cacheReadInputTokens, null);
assert.equal(generic.cacheCreationInputTokens, 4);

const anthropic = parse({usage:{
  input_tokens:100,
  output_tokens:20,
  cache_read_input_tokens:60,
  cache_creation_input_tokens:30,
  cache_creation:{ephemeral_5m_input_tokens:20,ephemeral_1h_input_tokens:10},
}});
assert.equal(anthropic.source, 'anthropic-usage');
assert.equal(anthropic.cacheReadInputTokens, 60);
assert.equal(anthropic.cacheCreationInputTokens, 30);
assert.equal(anthropic.cacheCreation5mTokens, 20);
assert.equal(anthropic.cacheCreation1hTokens, 10);
assert.equal(anthropic.cachedInputTokens, 90);

const sanitizeStart = engine.indexOf('  const sanitizeLogs = (value) => {');
const sanitizeEnd = engine.indexOf('\n  const storeStatus =', sanitizeStart);
assert.ok(sanitizeStart >= 0 && sanitizeEnd > sanitizeStart);
const sanitizeBlock = engine.slice(sanitizeStart, sanitizeEnd);
for (const forbidden of ['requestBody:', 'responseBody:', 'messages:', 'authorization:', 'apiKey:', 'cookie:']) {
  assert.ok(!sanitizeBlock.includes(forbidden), `sanitized log projection must not persist ${forbidden}`);
}
assert.ok(sanitizeBlock.includes('cacheReadInputTokens: cacheUsage?.cacheReadInputTokens'));
assert.ok(sanitizeBlock.includes('cacheCreation5mTokens: cacheUsage?.cacheCreation5mTokens'));
assert.ok(sanitizeBlock.includes('cacheCreation1hTokens: cacheUsage?.cacheCreation1hTokens'));

console.log('usage-dashboard P11 cache fidelity: OK · LLMGateway log cache read/write/TTL fields preserved independently');
