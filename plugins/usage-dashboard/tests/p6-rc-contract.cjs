const fs = require('node:fs');
const assert = require('node:assert/strict');
const {PARTS} = require('../src/parts.cjs');
const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));
const srcManifest = JSON.parse(fs.readFileSync(`${root}/src/manifest.json`, 'utf8'));
const productVersion = (source.match(/^\/\/@version (.+)$/m) || [])[1] || '';
const alphaBuild = productVersion.match(/^3\.0\.0-alpha\.5\.(\d+)$/);
const requiredEngineVersion = String(manifest.components.bridge.requiredVersion || '');
assert.ok(/^1\.6\.\d+$/.test(requiredEngineVersion), `unexpected bridge contract version: ${requiredEngineVersion}`);
assert.ok(source.includes("const STATE_KEY = 'local-usage-dashboard-v3';"));
assert.ok(source.includes("const TOKEN_KEY = 'local-usage-dashboard-bridge-token-v1';"));
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});
assert.equal(srcManifest.sourceOfTruth, 'modules');
assert.equal(PARTS.length, 22);
for (const marker of [
  'System Health',
  'systemHealthStatus',
  '<b>Connection</b><span>Bridge endpoint · token</span>',
  '<b>Refresh</b><span>주기 · stale policy</span>',
  '<b>Floating Widget</b><span>표시 정보</span>',
  '<b>Performance</b><span>복귀 · adaptive refresh</span>',
  '<b>Lifecycle & Recovery</b>',
  '요약 · 전체 진단',
  '<span>Manager</span>',
  '<span>Lifecycle</span>',
  '<span>Errors</span>',
]) assert.ok(source.includes(marker), `missing RC productization marker: ${marker}`);
console.log(`usage-dashboard P6 RC contract: OK · productization locked · ${productVersion} · engine ${requiredEngineVersion}`);
