const fs = require('node:fs');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const {loadCurrentRelease, assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');

const release = assertCurrentReleaseArtifacts();
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');
const caller = fs.readFileSync(release.callerWorkflow, 'utf8');
const validator = fs.readFileSync(release.validatorWorkflow, 'utf8');
const publisher = fs.readFileSync(release.publisherWorkflow, 'utf8');
const resolver = fs.readFileSync('plugins/usage-dashboard/tools/resolve_release_spec.cjs', 'utf8');

assert.ok(guidelines.includes(release.currentMemory));
const evidence = release.evidenceView;
assert.ok(evidence && ['structured','legacy'].includes(evidence.mode));
assert.ok(evidence.display.acceptedBaseline);
if (evidence.mode === 'structured') {
  assert.ok(evidence.acceptedBaseline && evidence.latestInstalled);
  assert.ok(evidence.display.acceptedBaseline.includes(evidence.acceptedBaseline.productVersion));
  assert.ok(evidence.display.acceptedBaseline.includes(evidence.acceptedBaseline.releaseSha.slice(0, 12)));
  assert.ok(evidence.display.latestInstalled.includes(evidence.latestInstalled.productVersion));
  assert.ok(evidence.display.latestInstalled.includes(evidence.latestInstalled.releaseSha.slice(0, 12)));
  assert.ok(evidence.display.latestInstalled.endsWith(`· ${evidence.latestInstalled.verdict}`));
} else {
  assert.ok(guidelines.includes(evidence.display.acceptedBaseline));
}
assert.equal(release.callerWorkflow, '.github/workflows/usage-dashboard-validate.yml');
assert.ok(caller.includes(`uses: ./${release.validatorWorkflow}`));
assert.ok(!caller.includes('release_spec:'));
assert.ok(!caller.includes(release.specPath));
assert.ok(!caller.includes(release.productVersion));
assert.match(caller, /^permissions:\n  contents: read$/m);
assert.ok(!caller.includes('contents: write'));

assert.match(validator, /permissions:\s*\n\s*contents: read/);
assert.ok(!validator.includes('group: repo-main-write'));
assert.ok(!validator.includes('scripts/repo-main-write.py'));
assert.ok(!validator.includes('git push'));
assert.ok(validator.includes('CANDIDATE_NOT_MATERIALIZED'));
assert.ok(validator.includes('resolve_release_spec.cjs'));

assert.ok(fs.existsSync(release.publisherWorkflow));
assert.match(publisher, /group: usage-dashboard-release/);
assert.match(publisher, /promote_release_blobs\.cjs/);
assert.match(publisher, /resolve_release_spec\.cjs/);
for (const forbidden of ['scripts/repo-main-write.py','PAYLOAD_COMMIT','git push origin HEAD:main','git switch','cp -R','build_bridge_engine.cjs','build_usage_dashboard.cjs']) {
  assert.ok(!publisher.includes(forbidden), `generic promoter must not contain ${forbidden}`);
}
assert.ok(resolver.includes('RELEASE_SPEC_NOT_FOUND'));
assert.ok(resolver.includes('RELEASE_SPEC_MANIFEST_MISMATCH'));
assert.ok(resolver.includes('RELEASE_SPEC_AMBIGUOUS'));

const loadedAgain = loadCurrentRelease();
assert.deepEqual(loadedAgain, release);

const denied = spawnSync(process.execPath, ['-e', "require('./plugins/usage-dashboard/tests/helpers/current-release.cjs').loadCurrentRelease()"], {
  cwd:process.cwd(),
  encoding:'utf8',
  env:{...process.env,UD_RELEASE_SPEC:'../outside-release-spec.json'},
});
assert.notEqual(denied.status, 0, 'release spec outside the bounded directory must fail closed');
assert.match(denied.stderr, /release spec path denied/);
console.log(`Usage Dashboard current release contract: OK · ${release.productVersion} / Engine ${release.engineVersion} / Manager ${release.managerVersion} · generic controller`);
