const fs = require('node:fs');
const assert = require('node:assert/strict');

const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const currentRelease = assertCurrentReleaseArtifacts();
const specPath = currentRelease.specPath;
const reusablePath = currentRelease.sharedWorkflow;
const callerPath = currentRelease.callerWorkflow;
const adapterPath = 'plugins/usage-dashboard/tools/prepare_release_regressions.py';
const validatorPath = 'plugins/usage-dashboard/tools/validate_release_candidate.py';

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const reusable = fs.readFileSync(reusablePath, 'utf8');
const caller = fs.readFileSync(callerPath, 'utf8');
const validator = fs.readFileSync(validatorPath, 'utf8');

assert.deepEqual(
  [spec.productVersion, spec.engineVersion, spec.managerVersion, spec.snapshotContract, spec.recentRequestContract],
  [manifest.productVersion, manifest.components.bridge.requiredVersion, manifest.components.bridgeManager.version,
    manifest.contracts.snapshot, manifest.contracts.recentRequest],
  'release spec and product manifest must describe one candidate',
);
assert.match(reusable, /workflow_call:/);
assert.match(reusable, /group: repo-main-write/);
assert.match(reusable, /cancel-in-progress: false/);
assert.match(reusable, /check_release_monotonic\.py/);
assert.match(reusable, /--check-artifacts/);
assert.match(reusable, /RELEASE_REF_MOVED/);
assert.match(reusable, /MAIN_MANIFEST_MOVED/);
assert.match(reusable, /inputs\.publish/);
assert.doesNotMatch(reusable, /product\s*=\s*['"]3\.0\.0-alpha\./, 'historical adapter must not remain inline');
assert.equal(fs.existsSync(adapterPath), false, 'historical regression adapter must be retired');
assert.ok(!reusable.includes('prepare_release_regressions.py'));
assert.ok(!reusable.includes('git checkout -- plugins/usage-dashboard/tests'));
assert.match(reusable, /status="\$\(git status --porcelain --untracked-files=all -- plugins\/usage-dashboard\/tests\)"/);
assert.match(reusable, /TEST_TREE_MUTATED/);
assert.equal((reusable.match(/assert_test_tree_clean/g) || []).length, 3, 'test-tree guard must be defined once and run twice');

assert.ok(caller.length < 2200, 'release caller must remain small');
assert.match(caller, /uses: \.\/\.github\/workflows\/reusable-usage-dashboard-release\.yml/);
assert.ok(caller.includes(`release_spec: ${currentRelease.specPath}`));
assert.match(caller, /publish: false/);
assert.equal(spec.sharedWorkflow, reusablePath);
for (const forbidden of ['git switch', 'git push', 'text.replace', 'check_release_monotonic.py']) {
  assert.ok(!caller.includes(forbidden), `caller must not duplicate ${forbidden}`);
}

assert.match(validator, /sha256 mismatch/);
assert.match(validator, /snapshot contract/);

console.log('Usage Dashboard release infrastructure foundation: OK · immutable regressions, reusable workflow, release spec, bounded maintenance caller');
