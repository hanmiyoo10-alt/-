const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const resolver = require('../tools/resolve_release_spec.cjs');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const release = assertCurrentReleaseArtifacts();

const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const specs = resolver.loadSpecs('.github/usage-dashboard/releases');
assert.equal(
  resolver.resolveReleaseSpec({manifest, specs}),
  release.specPath,
  'current manifest tuple must resolve to exactly one current release spec',
);

const currentSpec = JSON.parse(fs.readFileSync(release.specPath, 'utf8'));
const exact = {path:'duplicate.json', spec:{...currentSpec}};
assert.throws(
  () => resolver.resolveReleaseSpec({manifest, specs:[...specs, exact]}),
  /RELEASE_SPEC_AMBIGUOUS/,
  'duplicate exact tuples must fail closed',
);
const mismatch = {
  path:'mismatch.json',
  spec:{...currentSpec, engineVersion:'9.9.9'},
};
assert.throws(
  () => resolver.resolveReleaseSpec({manifest, specs:[mismatch]}),
  /RELEASE_SPEC_MANIFEST_MISMATCH/,
  'same product version with a different tuple must fail closed',
);
assert.throws(
  () => resolver.resolveReleaseSpec({manifest, specs:[]}),
  /RELEASE_SPEC_NOT_FOUND/,
  'missing release spec must fail closed',
);
assert.throws(
  () => resolver.resolveReleaseSpec({manifest:{...manifest, product:'Other Product'}, specs}),
  /RELEASE_SPEC_MANIFEST_MISMATCH:unexpected-product/,
  'other products must never resolve through Usage Dashboard release specs',
);

assert.equal(release.callerWorkflow, '.github/workflows/usage-dashboard-validate.yml');
assert.equal(release.sharedWorkflow, '.github/workflows/reusable-usage-dashboard-validate.yml');
assert.equal(release.validatorWorkflow, '.github/workflows/reusable-usage-dashboard-validate.yml');
assert.equal(release.publisherWorkflow, '.github/workflows/reusable-usage-dashboard-promote.yml');
assert.ok(!Object.hasOwn(currentSpec, 'releaseCommandWorkflow'), 'current spec must not point at a version-specific release command');

const validateCaller = fs.readFileSync(release.callerWorkflow, 'utf8');
assert.match(validateCaller, /^  pull_request:/m);
assert.match(validateCaller, /^permissions:\n  contents: read$/m);
assert.ok(validateCaller.includes(`uses: ./${release.validatorWorkflow}`));
assert.ok(!validateCaller.includes('release_spec:'));
assert.ok(!validateCaller.includes(release.productVersion));
assert.ok(!validateCaller.includes(release.specPath));
assert.ok(!validateCaller.includes('contents: write'));
assert.ok(!/^  push:/m.test(validateCaller));

const reusableValidate = fs.readFileSync(release.validatorWorkflow, 'utf8');
assert.match(reusableValidate, /release_spec:[\s\S]*required: false[\s\S]*default: ''/);
assert.match(reusableValidate, /resolve_release_spec\.cjs --manifest plugins\/usage-dashboard\/runtime\/product-manifest\.json/);
assert.match(reusableValidate, /^permissions:\n  contents: read$/m);
assert.ok(reusableValidate.includes('CANDIDATE_NOT_MATERIALIZED'));
assert.ok(reusableValidate.includes('plugins/usage-dashboard/tests/run-all.cjs'));
assert.ok(!reusableValidate.includes('tests=('), 'generic validator must not own the complete test list');
for (const forbidden of ['contents: write','repo-main-write.py','git push','inputs.publish']) {
  assert.ok(!reusableValidate.includes(forbidden), `generic validator must not contain ${forbidden}`);
}

const promoteCallerPath = '.github/workflows/usage-dashboard-promote.yml';
const promoteCaller = fs.readFileSync(promoteCallerPath, 'utf8');
assert.match(promoteCaller, /^  pull_request:/m);
assert.match(promoteCaller, /types: \[closed\]/);
assert.match(promoteCaller, /if: github\.event\.pull_request\.merged == true/);
assert.match(promoteCaller, /^permissions:\n  contents: write$/m);
assert.ok(promoteCaller.includes(`uses: ./${release.publisherWorkflow}`));
assert.match(promoteCaller, /candidate_sha: \$\{\{ github\.event\.pull_request\.merge_commit_sha \}\}/);
assert.ok(!promoteCaller.includes('github.sha'));
assert.ok(!promoteCaller.includes('release_spec:'));
assert.ok(!promoteCaller.includes(release.productVersion));

const reusablePromote = fs.readFileSync(release.publisherWorkflow, 'utf8');
assert.match(reusablePromote, /group: usage-dashboard-release/);
assert.match(reusablePromote, /cancel-in-progress: false/);
assert.match(reusablePromote, /resolve_release_spec\.cjs --manifest plugins\/usage-dashboard\/runtime\/product-manifest\.json/);
assert.match(reusablePromote, /promote_release_blobs\.cjs/);
assert.match(reusablePromote, /ref: \$\{\{ inputs\.candidate_sha \}\}/);
for (const forbidden of ['repo-main-write.py','git switch','git push','cp -R','build_bridge_engine.cjs','build_usage_dashboard.cjs','materializer']) {
  assert.ok(!reusablePromote.includes(forbidden), `generic promoter must not contain ${forbidden}`);
}

const workflows = fs.readdirSync('.github/workflows');
assert.deepEqual(
  workflows.filter((name) => /^release-command-usage-dashboard-\d+\.yml$/.test(name)),
  [],
  'version-specific Usage Dashboard release commands must stay retired',
);
assert.equal(fs.existsSync('.github/workflows/reusable-usage-dashboard-release.yml'), false, 'legacy rebuild/copy publisher must stay retired');

const registry = JSON.parse(fs.readFileSync('.github/usage-dashboard/archived-release-workflows.json', 'utf8'));
assert.equal(registry.currentCaller, release.callerWorkflow);
for (const retired of registry.retiredCommands || []) assert.equal(fs.existsSync(retired), false, `${retired} must stay retired`);
for (const archived of registry.archived) {
  const source = fs.readFileSync(archived, 'utf8');
  assert.match(source, /^on:\n  workflow_dispatch:\s*$/m, `${archived} must remain manual-only`);
  assert.match(source, /^permissions:\n  contents: read$/m, `${archived} must remain read-only`);
  assert.ok(!/^  pull_request:/m.test(source), `${archived} must not compete with generic validation`);
  assert.ok(!/^  push:/m.test(source), `${archived} must not auto-publish`);
}

console.log('usage-dashboard P33 generic release controller: OK · tuple resolver, registry-backed validation, merged exact-byte promotion, and version-workflow retirement locked');
