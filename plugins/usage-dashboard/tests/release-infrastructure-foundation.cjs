const fs = require('node:fs');
const assert = require('node:assert/strict');

const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const currentRelease = assertCurrentReleaseArtifacts();
const specPath = currentRelease.specPath;
const validatorPath = currentRelease.sharedWorkflow;
const callerPath = currentRelease.callerWorkflow;
const publisherPath = currentRelease.publisherWorkflow;
const adapterPath = 'plugins/usage-dashboard/tools/prepare_release_regressions.py';
const candidateValidatorPath = 'plugins/usage-dashboard/tools/validate_release_candidate.py';

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const validatorWorkflow = fs.readFileSync(validatorPath, 'utf8');
const caller = fs.readFileSync(callerPath, 'utf8');
const publisher = fs.readFileSync(publisherPath, 'utf8');
const candidateValidator = fs.readFileSync(candidateValidatorPath, 'utf8');

assert.deepEqual(
  [spec.productVersion, spec.engineVersion, spec.managerVersion, spec.snapshotContract, spec.recentRequestContract],
  [manifest.productVersion, manifest.components.bridge.requiredVersion, manifest.components.bridgeManager.version,
    manifest.contracts.snapshot, manifest.contracts.recentRequest],
  'release spec and product manifest must describe one candidate',
);

assert.match(validatorWorkflow, /workflow_call:/);
assert.match(validatorWorkflow, /permissions:\s*\n\s*contents: read/);
assert.doesNotMatch(validatorWorkflow, /contents: write/);
assert.doesNotMatch(validatorWorkflow, /repo-main-write\.py/);
assert.doesNotMatch(validatorWorkflow, /git push/);
assert.doesNotMatch(validatorWorkflow, /git switch/);
assert.doesNotMatch(validatorWorkflow, /inputs\.publish/);
assert.match(validatorWorkflow, /CANDIDATE_NOT_MATERIALIZED/);
assert.match(validatorWorkflow, /git status --porcelain --untracked-files=all/);
assert.match(validatorWorkflow, /build_bridge_engine\.cjs --write/);
assert.match(validatorWorkflow, /build_usage_dashboard\.cjs --write/);
assert.match(validatorWorkflow, /validate_release_candidate\.py/);
assert.match(validatorWorkflow, /p31-engine-source-modularization-parity\.cjs/);
assert.doesNotMatch(validatorWorkflow, /product\s*=\s*['"]3\.0\.0-alpha\./, 'validator must remain version-generic');

assert.ok(caller.length < 2400, 'release caller must remain small');
assert.match(caller, /permissions:\s*\n\s*contents: read/);
assert.match(caller, /uses: \.\/\.github\/workflows\/reusable-usage-dashboard-validate\.yml/);
assert.ok(caller.includes(`release_spec: ${currentRelease.specPath}`));
for (const forbidden of ['contents: write', 'git switch', 'git push', 'text.replace', 'check_release_monotonic.py', 'publish: true']) {
  assert.ok(!caller.includes(forbidden), `validation caller must not contain ${forbidden}`);
}

assert.ok(publisherPath, 'Stage A must preserve the legacy publisher as rollback');
assert.match(publisher, /workflow_call:/);
assert.match(publisher, /group: usage-dashboard-release/);
assert.doesNotMatch(publisher, /group: repo-main-write/, 'Usage Dashboard must not share a cross-product cancellation domain');
assert.match(publisher, /cancel-in-progress: false/);
assert.match(publisher, /scripts\/repo-main-write\.py --commit "\$PAYLOAD_COMMIT"/);
assert.match(publisher, /check_release_monotonic\.py/);
assert.match(publisher, /--check-artifacts/);
assert.match(publisher, /RELEASE_REF_MOVED/);
assert.match(publisher, /MAIN_MANIFEST_MOVED/);
assert.match(publisher, /inputs\.publish/);

assert.equal(fs.existsSync(adapterPath), false, 'historical regression adapter must be retired');
assert.ok(!validatorWorkflow.includes('prepare_release_regressions.py'));
assert.ok(!validatorWorkflow.includes('git checkout -- plugins/usage-dashboard/tests'));
assert.match(validatorWorkflow, /TEST_TREE_MUTATED/);

if (spec.releaseCommandWorkflow) {
  const command = fs.readFileSync(spec.releaseCommandWorkflow, 'utf8');
  assert.ok(command.length < 1400, 'release command must remain a bounded legacy publisher caller during Stage A');
  assert.match(command, /push:/);
  assert.match(command, /branches: \[main\]/);
  assert.match(command, /uses: \.\/\.github\/workflows\/reusable-usage-dashboard-release\.yml/);
  assert.ok(command.includes(`release_spec: ${currentRelease.specPath}`));
  assert.match(command, /publish: true/);
}

assert.match(candidateValidator, /sha256 mismatch/);
assert.match(candidateValidator, /snapshot contract/);

console.log('Usage Dashboard release infrastructure foundation: OK · Stage A read-only validation boundary + legacy publisher rollback');
