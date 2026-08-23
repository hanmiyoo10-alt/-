const fs = require('node:fs');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const {loadCurrentRelease, assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');

const release = assertCurrentReleaseArtifacts();
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');
const caller = fs.readFileSync(release.callerWorkflow, 'utf8');
const shared = fs.readFileSync(release.sharedWorkflow, 'utf8');

assert.ok(guidelines.includes(release.currentMemory));
assert.ok(guidelines.includes(release.verifiedBaseline));
assert.ok(caller.includes(`release_spec: ${release.specPath}`));
assert.ok(caller.includes(`uses: ./${release.sharedWorkflow}`));
assert.ok(shared.includes('group: usage-dashboard-release'));
assert.ok(!shared.includes('group: repo-main-write'));
assert.ok(shared.includes('scripts/repo-main-write.py'));
assert.ok(shared.includes('check_release_monotonic.py'));

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
