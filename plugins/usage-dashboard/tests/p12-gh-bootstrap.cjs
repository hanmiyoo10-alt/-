const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../..');
const scriptPath = path.join(repoRoot, 'scripts/bootstrap-usage-dashboard.sh');
const vendorScriptPath = path.join(repoRoot, 'plugins/usage-dashboard/tools/vendor_gh_cli.sh');
const vendorDir = path.join(repoRoot, 'plugins/usage-dashboard/tools/vendor/gh/2.97.0');
const script = fs.readFileSync(scriptPath, 'utf8');
const vendorScript = fs.readFileSync(vendorScriptPath, 'utf8');

const AMD64 = 'a2c9b8497e1f85b1ad0dfcb78b5a622e098801b8e461e459e88e1ee12f018112';
const ARM64 = '73ea440ecad9c9e284429997ee6f93577bc6f7bc6fba357ef62c53ad8fb641a5';
const CHECKSUMS = '61905c69ec8660f310814ec98395cdd0c2d07aabf024c597ec45813984a02334';

assert.ok(script.startsWith('#!/usr/bin/env bash'));
assert.ok(script.includes('set -euo pipefail'));
assert.ok(script.includes('USAGE_DASHBOARD_SOURCE_BRANCH:-main'));
assert.ok(script.includes('USAGE_DASHBOARD_RELEASE_BRANCH:-release-usage-dashboard'));
assert.ok(script.includes('USAGE_DASHBOARD_PLUGIN_PATH:-plugins/usage-dashboard'));
assert.ok(script.includes('USAGE_DASHBOARD_GH_HOME'));
assert.ok(script.includes('USAGE_DASHBOARD_GH_VERSION'));
assert.ok(script.includes('USAGE_DASHBOARD_GH_VENDOR_VERSION:-2.97.0'));
assert.ok(script.includes('USAGE_DASHBOARD_GH_VENDOR_DIR'));
assert.ok(script.includes('install_gh_vendor'));
assert.ok(script.includes('using vendored gh'));
assert.ok(script.includes('install_gh_portable'));
assert.ok(script.includes('github.com/cli/cli/releases/download/v${version}'));
assert.ok(script.includes('gh_${version}_checksums.txt'));
assert.ok(script.includes('verify_sha256'));
assert.ok(script.includes('gh auth status'));
assert.ok(script.includes('GH_TOKEN'));
assert.ok(script.includes('this script never writes tokens to disk'));
assert.ok(script.includes('verify_plugin_tree'));
assert.ok(!script.includes('release-simcore'));
assert.ok(!script.includes('SIMCORE_'));

assert.ok(vendorScript.includes('VERSION="${USAGE_DASHBOARD_GH_VENDOR_VERSION:-2.97.0}"'));
assert.ok(vendorScript.includes(AMD64));
assert.ok(vendorScript.includes(ARM64));
assert.ok(vendorScript.includes(CHECKSUMS));
assert.ok(vendorScript.includes('verify_upstream_manifest'));

const vendorDoc = fs.readFileSync(path.join(vendorDir, 'VENDOR.md'), 'utf8');
assert.ok(vendorDoc.includes('cli/cli` v2.97.0'));
assert.ok(vendorDoc.includes(AMD64));
assert.ok(vendorDoc.includes(ARM64));

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

const assets = [
  ['gh_2.97.0_linux_amd64.tar.gz', AMD64],
  ['gh_2.97.0_linux_arm64.tar.gz', ARM64],
  ['gh_2.97.0_checksums.txt', CHECKSUMS],
];

for (const [name, expected] of assets) {
  const file = path.join(vendorDir, name);
  if (fs.existsSync(file)) {
    assert.strictEqual(sha256(file), expected, `${name} checksum`);
  }
}

console.log('usage-dashboard P12 gh bootstrap: OK · vendor-first 2.97.0');
