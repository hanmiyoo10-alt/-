const fs = require('node:fs');
const assert = require('node:assert/strict');

const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const currentRelease = assertCurrentReleaseArtifacts();
const specPath = currentRelease.specPath;
const validatorPath = currentRelease.validatorWorkflow;
const callerPath = currentRelease.callerWorkflow;
const publisherPath = currentRelease.publisherWorkflow;
const promoterToolPath = 'plugins/usage-dashboard/tools/promote_release_blobs.cjs';
const adapterPath = 'plugins/usage-dashboard/tools/prepare_release_regressions.py';
const candidateValidatorPath = 'plugins/usage-dashboard/tools/validate_release_candidate.py';

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const validatorWorkflow = fs.readFileSync(validatorPath, 'utf8');
const caller = fs.readFileSync(callerPath, 'utf8');
const publisher = fs.readFileSync(publisherPath, 'utf8');
const promoterTool = fs.readFileSync(promoterToolPath, 'utf8');
const candidateValidator = fs.readFileSync(candidateValidatorPath, 'utf8');

assert.deepEqual(
  [spec.productVersion, spec.engineVersion, spec.managerVersion, spec.snapshotContract, spec.recentRequestContract],
  [manifest.productVersion, manifest.components.bridge.requiredVersion, manifest.components.bridgeManager.version, manifest.contracts.snapshot, manifest.contracts.recentRequest],
  'release spec and product manifest must describe one candidate',
);
assert.match(validatorWorkflow, /workflow_call:/);
assert.match(validatorWorkflow, /permissions:\s*\n\s*contents: read/);
assert.doesNotMatch(validatorWorkflow, /contents: write|repo-main-write\.py|git push|git switch|inputs\.publish/);
assert.match(validatorWorkflow, /CANDIDATE_NOT_MATERIALIZED/);
assert.match(validatorWorkflow, /build_bridge_engine\.cjs --write/);
assert.match(validatorWorkflow, /build_usage_dashboard\.cjs --write/);
assert.match(validatorWorkflow, /p32-exact-byte-release-promotion\.cjs/);
assert.doesNotMatch(validatorWorkflow, /product\s*=\s*['"]3\.0\.0-alpha\./, 'validator must remain version-generic');

assert.ok(caller.length < 2400, 'release caller must remain small');
assert.match(caller, /permissions:\s*\n\s*contents: read/);
assert.ok(caller.includes(`uses: ./${currentRelease.validatorWorkflow}`));
assert.ok(caller.includes(`release_spec: ${currentRelease.specPath}`));
for (const forbidden of ['contents: write','git switch','git push','check_release_monotonic.py','publish: true']) assert.ok(!caller.includes(forbidden));

assert.match(publisher, /workflow_call:/);
assert.match(publisher, /permissions:\s*\n\s*contents: write/);
assert.match(publisher, /group: usage-dashboard-release/);
assert.match(publisher, /candidate_sha/);
assert.match(publisher, /promote_release_blobs\.cjs/);
for (const forbidden of ['repo-main-write.py','PAYLOAD_COMMIT','git push','git switch','cp -R','build_bridge_engine.cjs','build_usage_dashboard.cjs','materializer']) {
  assert.ok(!publisher.includes(forbidden), `Stage C promoter must not contain ${forbidden}`);
}
for (const marker of ['force:false','RELEASE_REF_MOVED','RELEASE_BLOB_IDENTITY_MISMATCH','RELEASE_RUNTIME_SOURCE_PRESENT','UNEXPECTED_RELEASE_PATHS','SAME_VERSION_ARTIFACT_DIVERGENCE']) {
  assert.ok(promoterTool.includes(marker), `promoter must retain ${marker}`);
}
for (const path of [
  'plugins/usage-dashboard/latest.js',
  'plugins/usage-dashboard/runtime/bridge-engine.mjs',
  'plugins/usage-dashboard/runtime/bridge-manager.cjs',
  'plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh',
  'plugins/usage-dashboard/runtime/product-manifest.json',
]) assert.ok(promoterTool.includes(`'${path}'`));

assert.equal(fs.existsSync(adapterPath), false, 'historical regression adapter must be retired');
assert.match(candidateValidator, /sha256 mismatch/);
assert.match(candidateValidator, /snapshot contract/);

if (spec.releaseCommandWorkflow) {
  const command = fs.readFileSync(spec.releaseCommandWorkflow, 'utf8');
  assert.ok(command.length < 1400);
  assert.match(command, /push:/);
  assert.match(command, /branches: \[main\]/);
  assert.ok(command.includes(`uses: ./${currentRelease.publisherWorkflow}`));
  assert.match(command, /candidate_sha: \$\{\{ github\.sha \}\}/);
  assert.doesNotMatch(command, /release_spec:|publish: true|reusable-usage-dashboard-release\.yml/);
}

console.log('Usage Dashboard release infrastructure foundation: OK · Stage C exact-byte release promotion + read-only candidate validation');
