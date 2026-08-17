const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const fixture = JSON.parse(fs.readFileSync(`${root}/tests/fixtures/alpha543-structural-baseline.json`, 'utf8'));
const version = (source.match(/^\/\/@version (.+)$/m) || [])[1] || '';
if (version === '3.0.0-alpha.5.44') {
  const normalized = source.replaceAll('3.0.0-alpha.5.44', '__PRODUCT_VERSION__');
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');
  assert.equal(hash, fixture.normalizedArtifactSha256, '5.44 changed runtime bytes beyond the product version');
} else {
  assert.ok(version === '3.0.0-alpha.5.47' || /^3\.0\.0-rc\.\d+$/.test(version) || version === '3.0.0' || version === '3.0.1', `unexpected post-5.44 version: ${version}`);
}
assert.ok(source.includes("const REQUIRED_BRIDGE_VERSION = '1.6.5';"));
assert.ok(source.includes("const STATE_KEY = 'local-usage-dashboard-v3';"));
assert.ok(source.includes("const TOKEN_KEY = 'local-usage-dashboard-bridge-token-v1';"));
console.log('usage-dashboard P5 structural artifact parity: OK · 5.43 → 5.44');
