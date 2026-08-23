'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = 'plugins/usage-dashboard';
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const diagnostics = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));

assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});
assert.ok(engine.includes("const capturedRawOrgs = captured?.orgs ?? captured;"));
assert.ok(engine.includes("discoveryMode = 'capture-primary'"));
assert.ok(engine.includes("discoveryMode = 'plain-orgs-fallback'"));
assert.ok(engine.includes("const rawOrgs = await runCli(['orgs', 'list', '--json']);"));
assert.ok(engine.includes("if (!organizations.length) throw new Error('No organizations found in CLI output');"));

const loadOrgsAt = engine.indexOf('async function loadOrgs() {');
const fallbackAt = engine.indexOf("discoveryMode = 'plain-orgs-fallback'", loadOrgsAt);
const failureAt = engine.indexOf("throw new Error('No organizations found in CLI output')", fallbackAt);
assert.ok(loadOrgsAt >= 0 && fallbackAt > loadOrgsAt && failureAt > fallbackAt,
  'plain organization fallback must run before the hard empty result');

assert.ok(engine.includes('fallbackCount = 1;'));
assert.ok(engine.includes('sharedAccountCapture: Boolean(captured)'));
assert.ok(engine.includes('captureErrorCode: captureResult.error ? classifyError(captureResult.error) : null'));
assert.ok(diagnostics.includes('Bridge organization discovery:'));

console.log('usage-dashboard P19 organization empty fallback fidelity: OK · static failure/provenance boundaries retained; empty and valid fallback behavior delegated to Engine harness');
