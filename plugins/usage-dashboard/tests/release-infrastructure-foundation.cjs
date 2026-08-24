const fs = require('node:fs');
const assert = require('node:assert/strict');

const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const currentRelease = assertCurrentReleaseArtifacts();
const specPath = currentRelease.specPath;
const validatorPath = currentRelease.validatorWorkflow;
const callerPath = currentRelease.callerWorkflow;
const publisherPath = currentRelease.publisherWorkflow;
const promoterToolPath = 'plugins/usage-dashboard/tools/promote_release_blobs.cjs';
const resolverPath = 'plugins/usage-dashboard/tools/resolve_release_spec.cjs';
const reconcilerPath = 'plugins/usage-dashboard/tools/reconcile_release_candidate.py';
const adapterPath = 'plugins/usage-dashboard/tools/prepare_release_regressions.py';
const candidateValidatorPath = 'plugins/usage-dashboard/tools/validate_release_candidate.py';

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const validatorWorkflow = fs.readFileSync(validatorPath, 'utf8');
const caller = fs.readFileSync(callerPath, 'utf8');
const publisher = fs.readFileSync(publisherPath, 'utf8');
const promoterTool = fs.readFileSync(promoterToolPath, 'utf8');
const resolver = fs.readFileSync(resolverPath, 'utf8');
const reconciler = fs.readFileSync(reconcilerPath, 'utf8');
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
assert.match(validatorWorkflow, /resolve_release_spec\.cjs/);
assert.match(validatorWorkflow, /reconcile_release_candidate\.py --spec "\$RELEASE_SPEC" --two-pass/);
assert.match(validatorWorkflow, /tests\/run-all\.cjs/);
assert.doesNotMatch(validatorWorkflow, /\btests=\(/, 'validator must delegate test discovery to the registry runner');
assert.doesNotMatch(validatorWorkflow, /product\s*=\s*['"]3\.0\.0-alpha\./, 'validator must remain version-generic');
for (const marker of [
  "build_bridge_engine.cjs'), '--write'",
  'sync_manager_engine_hash()',
  'sync_manifest_hashes()',
  "build_usage_dashboard.cjs'), '--write'",
  'MATERIALIZER_NOT_IDEMPOTENT',
  'MATERIALIZER_IDEMPOTENT:',
]) assert.ok(reconciler.includes(marker), `generic reconciler must retain ${marker}`);

assert.ok(caller.length < 2400, 'generic validation caller must remain small');
assert.match(caller, /permissions:\s*\n\s*contents: read/);
assert.ok(caller.includes(`uses: ./${currentRelease.validatorWorkflow}`));
for (const forbidden of ['release_spec:','contents: write','git switch','git push','check_release_monotonic.py','publish: true',currentRelease.productVersion,currentRelease.specPath]) {
  assert.ok(!caller.includes(forbidden), `generic validation caller must not contain ${forbidden}`);
}

assert.match(publisher, /workflow_call:/);
assert.match(publisher, /permissions:\s*\n\s*contents: write/);
assert.match(publisher, /group: usage-dashboard-release/);
assert.match(publisher, /candidate_sha/);
assert.match(publisher, /resolve_release_spec\.cjs/);
assert.match(publisher, /promote_release_blobs\.cjs/);
for (const forbidden of ['repo-main-write.py','PAYLOAD_COMMIT','git push','git switch','cp -R','build_bridge_engine.cjs','build_usage_dashboard.cjs','materializer']) {
  assert.ok(!publisher.includes(forbidden), `generic promoter must not contain ${forbidden}`);
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

for (const marker of ['RELEASE_SPEC_NOT_FOUND','RELEASE_SPEC_MANIFEST_MISMATCH','RELEASE_SPEC_AMBIGUOUS']) assert.ok(resolver.includes(marker));
assert.equal(fs.existsSync('.github/workflows/reusable-usage-dashboard-release.yml'), false, 'legacy rebuild/copy publisher must be retired');
assert.equal(fs.existsSync(adapterPath), false, 'historical regression adapter must be retired');
assert.match(candidateValidator, /sha256 mismatch/);
assert.match(candidateValidator, /snapshot contract/);

console.log('Usage Dashboard release infrastructure foundation: OK · generic reconciliation + registry validation + merged exact-byte promotion');
