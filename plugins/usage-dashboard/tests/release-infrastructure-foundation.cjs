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
const oneShotMaterializeCommand = caller.includes('materialize-command:')
  && caller.includes("github.head_ref == 'release/usage-dashboard-569-publish-command'");

assert.deepEqual(
  [spec.productVersion, spec.engineVersion, spec.managerVersion, spec.snapshotContract, spec.recentRequestContract],
  [manifest.productVersion, manifest.components.bridge.requiredVersion, manifest.components.bridgeManager.version,
    manifest.contracts.snapshot, manifest.contracts.recentRequest],
  'release spec and product manifest must describe one candidate',
);
assert.match(reusable, /workflow_call:/);
assert.match(reusable, /group: usage-dashboard-release/);
assert.doesNotMatch(reusable, /group: repo-main-write/, 'Usage Dashboard must not share a cross-product cancellation domain');
assert.match(reusable, /cancel-in-progress: false/);
assert.match(reusable, /scripts\/repo-main-write\.py --commit "\$PAYLOAD_COMMIT"/);
for (const ownedPath of [
  'plugins/usage-dashboard/src/',
  'plugins/usage-dashboard/latest.js',
  'plugins/usage-dashboard/runtime/',
  'plugins/usage-dashboard/runtime-src/',
  'docs/USAGE_DASHBOARD_GUIDELINES.md',
]) {
  assert.ok(reusable.includes(`--allow ${ownedPath}`), `main-write helper must retain Usage Dashboard ownership for ${ownedPath}`);
}
assert.ok(!reusable.includes('git push origin HEAD:main'), 'release writer must not directly push main');
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

assert.ok(caller.length < (oneShotMaterializeCommand ? 7000 : 2200), 'release caller must remain bounded');
assert.match(caller, /uses: \.\/\.github\/workflows\/reusable-usage-dashboard-release\.yml/);
assert.ok(caller.includes(`release_spec: ${currentRelease.specPath}`));
assert.match(caller, /publish: false/);
assert.equal(spec.sharedWorkflow, reusablePath);
for (const forbidden of ['git switch', 'text.replace', 'check_release_monotonic.py']) {
  assert.ok(!caller.includes(forbidden), `caller must not duplicate ${forbidden}`);
}
if (oneShotMaterializeCommand) {
  assert.match(caller, /needs: release/);
  assert.match(caller, /release_engine_source_modularization_569\.py/);
  assert.match(caller, /git checkout origin\/main --/);
  assert.match(caller, /git push origin HEAD:\$\{GITHUB_HEAD_REF\}/);
} else {
  assert.ok(!caller.includes('git push'), 'normal stage caller must not push');
}

if (spec.releaseCommandWorkflow) {
  const command = fs.readFileSync(spec.releaseCommandWorkflow, 'utf8');
  assert.ok(command.length < 1400, 'release command must remain a bounded reusable-workflow caller');
  assert.match(command, /push:/);
  assert.match(command, /branches: \[main\]/);
  assert.ok(command.includes(`- '${spec.releaseCommandWorkflow}'`), 'release command must trigger only from its own main materialization');
  assert.match(command, /uses: \.\/\.github\/workflows\/reusable-usage-dashboard-release\.yml/);
  assert.ok(command.includes(`release_spec: ${currentRelease.specPath}`));
  assert.match(command, /publish: true/);
  for (const forbidden of ['git switch', 'git push', 'text.replace', 'check_release_monotonic.py']) {
    assert.ok(!command.includes(forbidden), `release command must not duplicate ${forbidden}`);
  }
}

assert.match(validator, /sha256 mismatch/);
assert.match(validator, /snapshot contract/);

console.log('Usage Dashboard release infrastructure foundation: OK · immutable regressions, product-local main-write integration, bounded stage/release authority');
