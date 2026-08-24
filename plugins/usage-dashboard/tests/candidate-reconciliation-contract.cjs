'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');

const TOOL = 'plugins/usage-dashboard/tools/reconcile_release_candidate.py';
const release = assertCurrentReleaseArtifacts();
const SPEC = release.specPath;
const CRITICAL = [
  'plugins/usage-dashboard/latest.js',
  'plugins/usage-dashboard/runtime/bridge-engine.mjs',
  'plugins/usage-dashboard/runtime/bridge-manager.cjs',
  'plugins/usage-dashboard/runtime/product-manifest.json',
  'plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh',
  'docs/USAGE_DASHBOARD_GUIDELINES.md',
];

const source = fs.readFileSync(TOOL, 'utf8');
for (const marker of [
  "build_bridge_engine.cjs'), '--write'",
  'sync_manager_engine_hash()',
  'sync_manifest_hashes()',
  "build_usage_dashboard.cjs'), '--write'",
  'sync_release_memory(spec)',
  "sync_project_guidelines.py')",
  'validate_identity(spec)',
  'MATERIALIZER_NOT_IDEMPOTENT',
  'MATERIALIZER_CRITICAL_HASH_DRIFT',
  'MATERIALIZER_IDEMPOTENT:',
]) assert.ok(source.includes(marker), `generic reconciler missing ${marker}`);

assert.ok(!source.includes(release.productVersion), 'generic reconciler must not hardcode the current Product version');
assert.ok(!source.includes(release.engineVersion), 'generic reconciler must not hardcode the current Engine version');
assert.ok(!source.includes(release.releaseTitle), 'generic reconciler must not hardcode the current release title');

function sha(path) {
  return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
}
function status() {
  return execFileSync('git', ['status', '--porcelain', '--untracked-files=all', '--',
    'plugins/usage-dashboard/src',
    'plugins/usage-dashboard/latest.js',
    'plugins/usage-dashboard/runtime',
    'plugins/usage-dashboard/runtime-src',
    'docs/USAGE_DASHBOARD_GUIDELINES.md',
  ], {encoding:'utf8'}).trim();
}

assert.equal(status(), '', 'fixture must begin as a fully materialized clean candidate');
const before = Object.fromEntries(CRITICAL.map((path) => [path, sha(path)]));
const output = execFileSync('python3', [TOOL, '--spec', SPEC, '--two-pass'], {
  encoding:'utf8',
  env:{...process.env, PYTHONPYCACHEPREFIX:'/tmp/usage-dashboard-pycache'},
});
assert.ok(output.includes(`MATERIALIZER_IDEMPOTENT:${release.productVersion}`), 'two-pass reconciliation must report the current release identity');
assert.equal(status(), '', 'two-pass reconciliation must leave a complete candidate clean');
const after = Object.fromEntries(CRITICAL.map((path) => [path, sha(path)]));
assert.deepEqual(after, before, 'two-pass reconciliation must preserve production-critical bytes on an already-reconciled candidate');

console.log(`usage-dashboard candidate reconciliation contract: OK · generic two-pass reconciliation is clean and hash-stable on ${release.productVersion}`);
