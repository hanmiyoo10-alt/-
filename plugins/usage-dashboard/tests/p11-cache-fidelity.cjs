'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const diagnostics = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));

assert.ok(engine.includes("Symbol.for('llmgateway.devpass.bridge.capture.v10')"));
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

assert.ok(diagnostics.includes('parser provider-usage-v3'));
assert.ok(diagnostics.includes('LLMGateway cachedTokens = provider cache Read'));
assert.ok(diagnostics.includes('cached total = Read + Write when both are known'));
assert.ok(diagnostics.includes('missing Write/TTL is never inferred from price/provider'));
assert.ok(!source.includes('providerManagerCache'));
assert.ok(!source.includes('Provider Manager cache IPC'));
assert.ok(!source.includes('pm_request_logs'));

for (const marker of [
  '// CACHE_OBSERVER_PARSER_START',
  '// CACHE_OBSERVER_PARSER_END',
  'llmgateway-log-cache-v1',
  'anthropic-usage',
  'gemini-usage',
  'openai-chat-usage',
  'openai-responses-usage',
  'llmgateway-usage',
  "'explicit-read-write'",
  "'explicit-read'",
  "'explicit-write'",
  "'cached-total'",
  "'not-reported'",
]) assert.ok(engine.includes(marker), `missing cache fidelity boundary: ${marker}`);

assert.ok(engine.includes('cacheWriteTelemetry: cacheUsage?.cacheWriteTelemetry'));
assert.ok(engine.includes('cacheTtlTelemetry: cacheUsage?.cacheTtlTelemetry'));
assert.ok(engine.includes('rows: safe.slice(0, 100)'));
assert.ok(engine.includes('Prompt/response bodies,'));
assert.ok(engine.includes('messages, custom headers, cookies, and auth material are never persisted.'));

console.log('usage-dashboard P11 cache fidelity: OK · static fidelity/privacy boundaries retained; provider and UNKNOWN behavior delegated to capture-tap harness');
