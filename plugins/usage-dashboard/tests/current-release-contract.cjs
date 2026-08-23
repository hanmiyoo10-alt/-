const fs = require('node:fs');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const {loadCurrentRelease, assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');

const release = assertCurrentReleaseArtifacts();
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');
const caller = fs.readFileSync(release.callerWorkflow, 'utf8');
const validator = fs.readFileSync(release.validatorWorkflow, 'utf8');
const publisher = fs.readFileSync(release.publisherWorkflow, 'utf8');

assert.ok(guidelines.includes(release.currentMemory));
assert.ok(guidelines.includes(release.verifiedBaseline));
assert.ok(caller.includes(`release_spec: ${release.specPath}`));
assert.ok(caller.includes(`uses: ./${release.validatorWorkflow}`));
assert.match(validator, /permissions:\s*\n\s*contents: read/);
assert.ok(!validator.includes('group: repo-main-write'));
assert.ok(!validator.includes('scripts/repo-main-write.py'));
assert.ok(!validator.includes('git push'));
assert.ok(validator.includes('CANDIDATE_NOT_MATERIALIZED'));
assert.ok(fs.existsSync(release.publisherWorkflow));
assert.match(publisher, /group: usage-dashboard-release/);
assert.match(publisher, /promote_release_blobs\.cjs/);
for (const forbidden of ['scripts/repo-main-write.py','PAYLOAD_COMMIT','git push origin HEAD:main','git switch','cp -R','build_bridge_engine.cjs','build_usage_dashboard.cjs']) {
  assert.ok(!publisher.includes(forbidden), `Stage C promoter must not contain ${forbidden}`);
}

const loadedAgain = loadCurrentRelease();
assert.deepEqual(loadedAgain, release);

const denied = spawnSync(process.execPath, ['-e', "require('./plugins/usage-dashboard/tests/helpers/current-release.cjs').loadCurrentRelease()"], {
  cwd:process.cwd(),
  encoding:'utf8',
  env:{...process.env,UD_RELEASE_SPEC:'../outside-release-spec.json'},
});
assert.notEqual(denied.status, 0, 'release spec outside the bounded directory must fail closed');
assert.match(denied.stderr, /release spec path denied/);
console.log(`Usage Dashboard current release contract: OK · ${release.productVersion} / Engine ${release.engineVersion} / Manager ${release.managerVersion}`);
