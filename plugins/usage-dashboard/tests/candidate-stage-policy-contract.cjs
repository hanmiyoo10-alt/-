'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const policy = require('../tools/candidate_stage_policy.cjs');

assert.equal(policy.classifyPath('.github/usage-dashboard/releases/5.72.json'), 'release-spec');
assert.equal(policy.classifyPath('plugins/usage-dashboard/src/10-request-normalize.part.js'), 'plugin-source');
assert.equal(policy.classifyPath('plugins/usage-dashboard/runtime-src/bridge-engine/40-sources.part.mjs'), 'engine-source');
assert.equal(policy.classifyPath('plugins/usage-dashboard/tests/behavior-new.cjs'), 'test');
assert.equal(policy.classifyPath('docs/USAGE_DASHBOARD_NEW_FEATURE.md'), 'doc');
assert.equal(policy.classifyPath('plugins/usage-dashboard/latest.js'), 'generated');
assert.equal(policy.classifyPath('plugins/usage-dashboard/src/manifest.json'), 'generated');
assert.equal(policy.classifyPath('plugins/usage-dashboard/runtime/bridge-engine.mjs'), 'generated');
assert.equal(policy.classifyPath('docs/USAGE_DASHBOARD_GUIDELINES.md'), 'generated');
assert.equal(policy.classifyPath('.github/workflows/usage-dashboard-temp.yml'), 'denied');
assert.equal(policy.classifyPath('plugins/simcore/latest.js'), 'denied');
assert.throws(() => policy.assertAllowedPaths(['plugins/usage-dashboard/latest.js'], ''), /CANDIDATE_STAGE_GENERATED_EDIT_DENIED/);
assert.throws(() => policy.assertAllowedPaths(['plugins/simcore/latest.js'], ''), /CANDIDATE_STAGE_PATH_DENIED/);
assert.equal(policy.parseAlphaBuild('3.0.0-alpha.5.71'), 71);
assert.throws(() => policy.parseAlphaBuild('3.0.0-beta.1'), /CANDIDATE_STAGE_VERSION_SERIES_UNSUPPORTED/);

function git(cwd, args) { return execFileSync('git', args, {cwd, encoding:'utf8'}).trim(); }
function write(root, rel, text) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), {recursive:true});
  fs.writeFileSync(file, text);
}
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-dashboard-e5b-'));
const original = process.cwd();
try {
  git(temp, ['init']);
  git(temp, ['config', 'user.name', 'test']);
  git(temp, ['config', 'user.email', 'test@example.invalid']);
  write(temp, 'plugins/usage-dashboard/runtime/product-manifest.json', JSON.stringify({productVersion:'3.0.0-alpha.5.71'}) + '\n');
  write(temp, 'plugins/usage-dashboard/src/00-runtime-core.part.js', 'base\n');
  git(temp, ['add', '.']);
  git(temp, ['commit', '-m', 'base']);
  const base = git(temp, ['rev-parse', 'HEAD']);

  const spec = {
    releaseTitle:'Fixture', productVersion:'3.0.0-alpha.5.72', engineVersion:'1.6.23', managerVersion:'1.3.0',
    snapshotContract:1, recentRequestContract:1, materializer:'plugins/usage-dashboard/tools/release_fixture_572.py',
  };
  write(temp, '.github/usage-dashboard/releases/5.72.json', JSON.stringify(spec) + '\n');
  write(temp, 'plugins/usage-dashboard/tools/release_fixture_572.py', 'print("fixture")\n');
  write(temp, 'plugins/usage-dashboard/src/10-request-normalize.part.js', 'source\n');
  write(temp, 'plugins/usage-dashboard/runtime-src/bridge-engine/40-sources.part.mjs', 'engine\n');
  write(temp, 'plugins/usage-dashboard/tests/behavior-fixture.cjs', 'console.log("fixture")\n');
  git(temp, ['add', '.']);
  git(temp, ['commit', '-m', 'feature']);
  const source = git(temp, ['rev-parse', 'HEAD']);
  process.chdir(temp);
  const inspected = policy.inspectCandidate(base, source);
  assert.equal(inspected.releaseSpec, '.github/usage-dashboard/releases/5.72.json');
  assert.equal(inspected.materializer, 'plugins/usage-dashboard/tools/release_fixture_572.py');
  assert.equal(inspected.productVersion, '3.0.0-alpha.5.72');
  assert.equal(inspected.engineChanged, true);
  assert.equal(inspected.pluginChanged, true);

  git(temp, ['checkout', '-q', base]);
  write(temp, '.github/usage-dashboard/releases/5.72.json', JSON.stringify(spec) + '\n');
  write(temp, 'plugins/usage-dashboard/tools/release_fixture_572.py', 'print("fixture")\n');
  write(temp, 'plugins/usage-dashboard/latest.js', 'hand-edited-generated-output\n');
  git(temp, ['add', '.']);
  git(temp, ['commit', '-m', 'bad-generated']);
  const bad = git(temp, ['rev-parse', 'HEAD']);
  assert.throws(() => policy.inspectCandidate(base, bad), /CANDIDATE_STAGE_GENERATED_EDIT_DENIED/);

  git(temp, ['checkout', '-q', base]);
  const nonMonotonic = {...spec, productVersion:'3.0.0-alpha.5.71'};
  write(temp, '.github/usage-dashboard/releases/5.72.json', JSON.stringify(nonMonotonic) + '\n');
  write(temp, 'plugins/usage-dashboard/tools/release_fixture_572.py', 'print("fixture")\n');
  git(temp, ['add', '.']);
  git(temp, ['commit', '-m', 'bad-version']);
  const badVersion = git(temp, ['rev-parse', 'HEAD']);
  assert.throws(() => policy.inspectCandidate(base, badVersion), /CANDIDATE_STAGE_NON_MONOTONIC_TARGET/);
} finally {
  process.chdir(original);
  fs.rmSync(temp, {recursive:true, force:true});
}

console.log('usage-dashboard candidate stage policy contract: OK · one spec, semantic diff budget, generated-output denial, monotonic target');
