'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {discoverTests} = require('./registry.cjs');
const profile = require('../tools/release_path_profile.cjs');
const pluginBuild = require('../tools/build_usage_dashboard.cjs');
const engineBuild = require('../tools/build_bridge_engine.cjs');
const genericPreflight = require('../tools/release_generic_preflight.cjs');
const focusedPreflight = require('../tools/release_focused_preflight_e27.cjs');
const currentRelease = require('./helpers/current-release.cjs');

const {LEGACY_ROOT, TARGET_ROOT} = profile;
const SPEC = '.github/usage-dashboard/releases/5.109.json';

assert.equal(pluginBuild.parseArgs([]).sourceRoot, LEGACY_ROOT);
assert.equal(pluginBuild.parseArgs(['--root', TARGET_ROOT, '--check']).sourceRoot, TARGET_ROOT);
assert.throws(() => pluginBuild.parseArgs(['--root', 'plugins/other']), /RELEASE_PATH_PROFILE_UNKNOWN_ROOT/);

assert.equal(engineBuild.parseArgs([]).sourceRoot, LEGACY_ROOT);
assert.equal(engineBuild.parseArgs(['--root', TARGET_ROOT, '--check']).sourceRoot, TARGET_ROOT);
assert.throws(() => engineBuild.parseArgs(['--root', '../plugins/usage-dashboard']), /RELEASE_PATH_PROFILE/);

assert.equal(genericPreflight.testRootForSourceRoot(LEGACY_ROOT), `${LEGACY_ROOT}/tests`);
assert.equal(genericPreflight.testRootForSourceRoot(TARGET_ROOT), `${TARGET_ROOT}/tests`);
assert.equal(genericPreflight.parseArgs(['--spec', SPEC, '--root', TARGET_ROOT]).sourceRoot, TARGET_ROOT);
assert.throws(() => genericPreflight.testRootForSourceRoot('plugins/other'), /RELEASE_PATH_PROFILE_UNKNOWN_ROOT/);

assert.deepEqual(focusedPreflight.rootContext(TARGET_ROOT), {
  root:TARGET_ROOT,
  testPrefix:`${TARGET_ROOT}/tests/`,
  e21Test:`${TARGET_ROOT}/tests/e21-evidence-consumer-convergence-contract.cjs`,
  ownerRoots:[`${TARGET_ROOT}/src`, `${TARGET_ROOT}/runtime-src`],
});
assert.equal(
  focusedPreflight.normalizeFocusedRegressionPath(`${TARGET_ROOT}/tests/p999-target.cjs`, TARGET_ROOT),
  `${TARGET_ROOT}/tests/p999-target.cjs`,
);
assert.throws(
  () => focusedPreflight.normalizeFocusedRegressionPath(`${LEGACY_ROOT}/tests/p999-legacy.cjs`, TARGET_ROOT),
  (error) => error.code === 'RED_SPEC',
);

assert.equal(currentRelease.resolveSourceRoot(), LEGACY_ROOT);
assert.equal(currentRelease.resolveSourceRoot(TARGET_ROOT), TARGET_ROOT);
assert.throws(() => currentRelease.resolveSourceRoot('plugins/other'), /RELEASE_PATH_PROFILE_UNKNOWN_ROOT/);

const pythonProbe = spawnSync('python3', ['-c', [
  "import sys",
  "sys.path.insert(0, 'plugins/usage-dashboard/tools')",
  "from validate_release_candidate import normalize_root",
  `assert normalize_root('${TARGET_ROOT}') == '${TARGET_ROOT}'`,
  "try:",
  "    normalize_root('plugins/other')",
  "except ValueError as exc:",
  "    assert 'UD_SOURCE_ROOT_UNKNOWN' in str(exc)",
  "else:",
  "    raise AssertionError('unknown root accepted')",
].join('\n')], {
  encoding:'utf8',
  env:{...process.env, PYTHONDONTWRITEBYTECODE:'1'},
});
assert.equal(pythonProbe.status, 0, pythonProbe.stderr || pythonProbe.stdout);

for (const [tool, args, marker] of [
  ['plugins/usage-dashboard/tools/validate_release_candidate.py', ['--spec', SPEC, '--root', 'plugins/other'], 'UD_SOURCE_ROOT_UNKNOWN'],
  ['plugins/usage-dashboard/tools/reconcile_release_candidate.py', ['--spec', SPEC, '--root', 'plugins/other'], 'RECONCILE_SOURCE_ROOT_REJECTED'],
  ['plugins/usage-dashboard/tools/sync_project_guidelines.py', ['--check', '--root', 'plugins/other'], 'UD_SOURCE_ROOT_UNKNOWN'],
]) {
  const result = spawnSync('python3', [tool, ...args], {
    encoding:'utf8',
    env:{...process.env, PYTHONDONTWRITEBYTECODE:'1'},
  });
  assert.notEqual(result.status, 0, `${tool} must reject unknown root`);
  assert.ok(`${result.stdout}\n${result.stderr}`.includes(marker), `${tool} missing rejection marker ${marker}`);
}

const reconcileSource = fs.readFileSync('plugins/usage-dashboard/tools/reconcile_release_candidate.py', 'utf8');
for (const marker of [
  "parser.add_argument('--root'",
  "run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--write', '--root', root",
  "run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write', '--root', root",
  "run('python3', str(TOOLS / 'sync_project_guidelines.py'), '--root', root",
  "'validate_release_candidate.py'), '--spec', str(spec_path), '--root', root",
  "'--root', ROOT.as_posix()",
  "env['UD_SOURCE_ROOT'] = ROOT.as_posix()",
]) {
  assert.ok(reconcileSource.includes(marker), `R1B reconciler root propagation missing: ${marker}`);
}

const targetEntries = fs.readdirSync(TARGET_ROOT).sort();
assert.deepEqual(targetEntries, ['README.md'], 'R1B target landing must remain navigation-only');

const workflowDir = '.github/workflows';
for (const name of fs.readdirSync(workflowDir).filter((entry) => entry.includes('usage-dashboard') && entry.endsWith('.yml'))) {
  const source = fs.readFileSync(path.join(workflowDir, name), 'utf8');
  assert.equal(source.includes(`--root ${TARGET_ROOT}`), false, `R1B must not activate target root in ${name}`);
}

const suite = discoverTests();
assert.ok(suite.regressions.includes('p79-production-root-candidate-source-parameterization.cjs'));
assert.equal(suite.ordered.length, 149, 'R1B baseline should contain 149 discovered tests');

console.log('USAGE_DASHBOARD_PRODUCTION_ROOT_RELOCATION:R1B_CANDIDATE_SOURCE_ROOT_PARAMETERIZATION_LOCKED');
