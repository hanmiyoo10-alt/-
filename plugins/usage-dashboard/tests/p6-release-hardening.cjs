'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));

const productVersion = (source.match(/^\/\/@version (.+)$/m) || [])[1] || '';
const requiredEngineVersion = String(manifest.components.bridge.requiredVersion || '');
assert.ok(/^1\.6\.\d+$/.test(requiredEngineVersion), `unexpected bridge contract version: ${requiredEngineVersion}`);
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

for (const marker of [
  'lastRefreshPhases',
  "finishRefreshPhase('snapshot'",
  'Refresh phase duration:',
  'Refresh slowest phase:',
  'requestStatus:status',
  'function requestOutcomeCategory(row)',
  'function requestOutcomeStats(rows)',
  'Request outcome taxonomy:',
  'function stableReadinessSnapshot(bridgeDiag, runtimeBridge)',
  'Stable readiness:',
  'Stable contract:',
]) assert.ok(source.includes(marker), `missing release hardening marker: ${marker}`);

// Outcome taxonomy remains observational: existing UI error semantics stay untouched.
assert.ok(source.includes("const success = explicitSuccess !== null ? explicitSuccess : !(failedByStatus || hasErrorObject || (statusCode !== null && statusCode >= 400));"));

console.log(`usage-dashboard P6 release hardening: OK · static hardening/telemetry/outcome boundaries retained; success/error/cancelled/unknown behavior delegated to production process harness · ${productVersion} · engine ${requiredEngineVersion}`);
