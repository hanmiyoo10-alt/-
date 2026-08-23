const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const registryPath = '.github/usage-dashboard/archived-release-workflows.json';
const release = loadCurrentRelease();
const currentPath = release.callerWorkflow;
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

assert.equal(registry.schemaVersion, 1);
assert.equal(registry.currentCaller, currentPath);
assert.equal(new Set(registry.archived).size, registry.archived.length, 'archive paths must be unique');
assert.ok(registry.archived.length >= 23, 'all completed version-specific stage callers must be registered');
assert.ok(!registry.archived.includes(currentPath), 'generic current caller must never be archived');

const candidatePaths = fs.readdirSync('.github/workflows')
  .filter((name) => /^(?:stage|release)-usage-dashboard-\d+.*\.yml$/.test(name))
  .map((name) => path.posix.join('.github/workflows', name))
  .sort();
assert.deepEqual(
  registry.archived.slice().sort(),
  candidatePaths,
  'every version-specific stage/release caller must be archived after generic-controller migration',
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
}

assert.equal(new Set(registry.retiredCommands || []).size, (registry.retiredCommands || []).length, 'retired release commands must be unique');
for (const workflowPath of registry.retiredCommands || []) {
  assert.match(workflowPath, /^\.github\/workflows\/release-command-usage-dashboard-\d+\.yml$/);
  assert.equal(fs.existsSync(workflowPath), false, `${workflowPath} must remain retired`);
}

const current = fs.readFileSync(currentPath, 'utf8');
assert.match(current, /^  pull_request:/m);
assert.ok(current.includes(`uses: ./${release.validatorWorkflow}`));
assert.match(current, /^permissions:\n  contents: read$/m);
assert.ok(!current.includes('release_spec:'));
assert.ok(!current.includes(release.specPath));
assert.ok(!current.includes(release.productVersion));
assert.ok(!current.includes('contents: write'));
assert.ok(!/^  push:/m.test(current), 'generic validator caller must remain validation-only');

console.log(`usage-dashboard legacy release workflow archive: OK · all version-specific callers retired and ${release.productVersion} generic validation is authoritative`);
