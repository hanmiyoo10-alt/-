const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const registryPath = '.github/usage-dashboard/archived-release-workflows.json';
const currentPath = '.github/workflows/stage-usage-dashboard-566-managed-direct-cli-runtime.yml';
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

assert.equal(registry.schemaVersion, 1);
assert.equal(registry.currentCaller, currentPath);
assert.equal(new Set(registry.archived).size, registry.archived.length, 'archive paths must be unique');
assert.ok(registry.archived.length >= 20, 'all completed stage callers must be registered');
assert.ok(!registry.archived.includes(currentPath), 'current caller must never be archived');

const stagePaths = fs.readdirSync('.github/workflows')
  .filter((name) => /^stage-usage-dashboard-\d+.*\.yml$/.test(name))
  .map((name) => path.posix.join('.github/workflows', name))
  .sort();
assert.deepEqual(
  registry.archived.slice().sort(),
  stagePaths.filter((entry) => entry !== currentPath),
  'every completed stage caller must be archived and only the current caller may remain active',
);

for (const workflowPath of registry.archived) {
  const source = fs.readFileSync(workflowPath, 'utf8');
  assert.match(source, /^name: (?:Archived\b|.*\(archived\))/im, `${workflowPath} must identify itself as archived`);
  assert.match(source, /^on:\n  workflow_dispatch:\s*$/m, `${workflowPath} must be manual-only`);
  assert.ok(!/^  push:/m.test(source), `${workflowPath} must not run on push`);
  assert.ok(!/^  pull_request:/m.test(source), `${workflowPath} must not run on pull requests`);
  assert.match(source, /^permissions:\n  contents: read$/m);
  assert.ok(!source.includes('contents: write'));
  assert.ok(!source.includes('git push'));
  assert.ok(!source.includes('uses: ./.github/workflows/reusable-usage-dashboard-release.yml'));
}

const current = fs.readFileSync(currentPath, 'utf8');
assert.match(current, /^  push:/m);
assert.match(current, /^  pull_request:/m);
assert.ok(current.includes('uses: ./.github/workflows/reusable-usage-dashboard-release.yml'));
assert.ok(current.includes('release_spec: .github/usage-dashboard/releases/5.66.json'));
assert.ok(current.includes('publish: false'));

console.log('usage-dashboard legacy release workflow archive: OK · completed publishers are manual read-only no-ops and 5.66 remains authoritative');
