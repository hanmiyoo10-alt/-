const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const core = fs.readFileSync(`${root}/src/00-runtime-core.part.js`, 'utf8');
const ledger = fs.readFileSync(`${root}/src/14-request-ledger.part.js`, 'utf8');
const diagnostics = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));

assert.ok(core.includes("const VERSION = '3.0.0-alpha.5.53';"));
assert.ok(source.includes('//@version 3.0.0-alpha.5.53'));
assert.ok(manager.includes("const PRODUCT_VERSION = '3.0.0-alpha.5.53';"));
assert.equal(manifest.productVersion, '3.0.0-alpha.5.53');
assert.equal(manifest.components.plugin.version, '3.0.0-alpha.5.53');
assert.equal(manifest.components.bridge.requiredVersion, '1.6.8');
assert.equal(manifest.components.bridgeManager.version, '1.2.6');
assert.equal(manifest.components.bridgeManager.productVersion, '3.0.0-alpha.5.53');

// 5.53 must be diagnostics-only: keep the 5.52 provider parser and engine version intact.
assert.ok(engine.includes("const VERSION = '1.6.8';"));
assert.ok(engine.includes('cacheWriteTelemetry'));
assert.ok(engine.includes('cacheTtlTelemetry'));
assert.ok(diagnostics.includes('parser provider-usage-v3'));
assert.ok(diagnostics.includes('missing Write/TTL is never inferred from price/provider'));

// Separate explicit provenance from observable row shape. Old 5.52 labelled
// writeNotReported as read-without-write, which made legacy provenance look like zero.
assert.ok(ledger.includes('writeUnknownOnCache:0'));
assert.ok(ledger.includes('readWithoutWriteValue:0'));
assert.ok(ledger.includes('ttlUnknownAfterWrite:0'));
assert.ok(ledger.includes('stats.writeUnknownOnCache += 1'));
assert.ok(ledger.includes('stats.readWithoutWriteValue += 1'));
assert.ok(ledger.includes('stats.ttlUnknownAfterWrite += 1'));
assert.ok(diagnostics.includes('write not-reported'));
assert.ok(diagnostics.includes('write unknown-on-cache'));
assert.ok(diagnostics.includes('read/no-write-value'));
assert.ok(diagnostics.includes('TTL unknown-after-write'));
assert.ok(!diagnostics.includes('read-without-write ${writeNotReported}'));

// Unknown remains unknown; no migration is allowed to rewrite legacy rows.
assert.ok(!ledger.includes("cacheWriteTelemetry:'not-reported'"));
assert.ok(!ledger.includes("cacheTtlTelemetry:'not-reported'"));

console.log('usage-dashboard P13 cache provenance diagnostics: OK · provenance and observable row shape are separated without inference');
