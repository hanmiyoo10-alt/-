'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflowDir = '.github/workflows';
const allowedProductionWriters = new Set([
  '.github/workflows/usage-dashboard-promote.yml',
  '.github/workflows/reusable-usage-dashboard-promote.yml',
]);
const inventory = JSON.parse(fs.readFileSync('.github/usage-dashboard/legacy-release-authority.json','utf8'));

assert.equal(inventory.schemaVersion, 1);
assert.equal(inventory.retired.length, 16, 'all legacy Usage Dashboard release writers must be inventoried');
assert.equal(inventory.retired.filter((item) => item.classification === 'ACTIVE_LEGACY_WRITER').length, 1);
assert.equal(inventory.retired.filter((item) => item.classification === 'DORMANT_LEGACY_WRITER').length, 15);
for (const item of inventory.retired) {
  assert.match(item.blobSha, /^[0-9a-f]{40}$/);
  assert.equal(fs.existsSync(item.path), false, `${item.path} must be retired from active Actions`);
}

const workflowNames = fs.readdirSync(workflowDir).filter((name) => /\.ya?ml$/.test(name));
assert.deepEqual(workflowNames.filter((name) => /^release-local-usage-.*\.ya?ml$/.test(name)), [], 'legacy release-local-usage workflows must stay absent');

for (const name of workflowNames) {
  const file = path.join(workflowDir, name).replace(/\\/g,'/');
  const source = fs.readFileSync(file,'utf8');
  const touchesRelease = source.includes('release-usage-dashboard');
  const writeCapable = /contents:\s*write/.test(source) || /git\s+push[^\n]*release-usage-dashboard/.test(source) || /git\s+switch[^\n]*release-usage-dashboard/.test(source);
  if (touchesRelease && writeCapable) {
    assert.ok(allowedProductionWriters.has(file), `unexpected Usage Dashboard production writer: ${file}`);
  }
}

const caller = fs.readFileSync('.github/workflows/usage-dashboard-promote.yml','utf8');
const reusable = fs.readFileSync('.github/workflows/reusable-usage-dashboard-promote.yml','utf8');
assert.match(caller, /^permissions:\n  contents: read$/m);
assert.equal((caller.match(/contents: write/g) || []).length, 1, 'only classified release job may request write');
assert.match(reusable, /^permissions:\n  contents: write$/m);
assert.match(reusable, /promote_release_blobs\.cjs/);
assert.doesNotMatch(reusable, /git switch|git push|cp -R|repo-main-write\.py/);

console.log('usage-dashboard release authority contract: OK · 16 legacy writers retired, exact-byte promoter is sole production write authority');
