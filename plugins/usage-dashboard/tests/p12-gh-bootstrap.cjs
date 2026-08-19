const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../..');
const scriptPath = path.join(repoRoot, 'scripts/bootstrap-usage-dashboard.sh');
const script = fs.readFileSync(scriptPath, 'utf8');

assert.ok(script.startsWith('#!/usr/bin/env bash'));
assert.ok(script.includes('set -euo pipefail'));
assert.ok(script.includes('USAGE_DASHBOARD_SOURCE_BRANCH:-main'));
assert.ok(script.includes('USAGE_DASHBOARD_RELEASE_BRANCH:-release-usage-dashboard'));
assert.ok(script.includes('USAGE_DASHBOARD_PLUGIN_PATH:-plugins/usage-dashboard'));
assert.ok(script.includes('gh auth status'));
assert.ok(script.includes('GH_TOKEN'));
assert.ok(script.includes('this script never writes tokens to disk'));
assert.ok(script.includes('verify_plugin_tree'));
assert.ok(!script.includes('release-simcore'));
assert.ok(!script.includes('SIMCORE_'));

console.log('usage-dashboard P12 gh bootstrap: OK');
