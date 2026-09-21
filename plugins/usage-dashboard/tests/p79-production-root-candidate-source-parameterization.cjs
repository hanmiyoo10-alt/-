'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const {spawnSync} = require('node:child_process');
const profile = require('../tools/release_path_profile.cjs');
const genericPreflight = require('../tools/release_generic_preflight.cjs');
const focusedPreflight = require('../tools/release_focused_preflight_e27.cjs');
const currentRelease = require('./helpers/current-release.cjs');
const {discoverTests} = require('./registry.cjs');

const LEGACY = 'plugins/usage-dashboard';
const TARGET = 'plugins/risu/local/usage-dashboard';
const SPEC = '.github/usage-dashboard/releases/5.109.json';

assert.equal(profile.LEGACY_ROOT, LEGACY);
assert.equal(profile.TARGET_ROOT, TARGET);
assert.deepEqual(profile.ALLOWED_ROOTS, [LEGACY, TARGET]);
assert.equal(genericPreflight.testRootForSourceRoot(TARGET), `${TARGET}/tests`);
assert.equal(focusedPreflight.normalizeSourceRoot(TARGET), TARGET);
assert.equal(focusedPreflight.testPrefixForRoot(TARGET), `${TARGET}/tests/`);
assert.equal(focusedPreflight.e21TestForRoot(TARGET), `${TARGET}/tests/e21-evidence-consumer-convergence-contract.cjs`);
assert.deepEqual(focusedPreflight.ownerRootsForRoot(TARGET), [`${TARGET}/src`, `${TARGET}/runtime-src`]);
assert.equal(currentRelease.normalizeSourceRoot(TARGET), TARGET);

for (const fn of [
  () => genericPreflight.testRootForSourceRoot('plugins/other'),
  () => focusedPreflight.normalizeSourceRoot('plugins/other'),
  () => currentRelease.normalizeSourceRoot('plugins/other'),
]) assert.throws(fn, /RELEASE_PATH_PROFILE_UNKNOWN_ROOT/);

assert.equal(
  focusedPreflight.normalizeFocusedRegressionPath(`${LEGACY}/tests/p76-devpass-billing-history.cjs`, TARGET),
  `${TARGET}/tests/p76-devpass-billing-history.cjs`,
);

assert.deepEqual(fs.readdirSync(TARGET).sort(), ['README.md'], 'R1B must not materialize the Local target root');

function expectDenied(command, args, pattern) {
  const result = spawnSync(command, args, {
    encoding:'utf8',
    env:{...process.env, PYTHONPYCACHEPREFIX:'/tmp/usage-dashboard-pycache'},
  });
  assert.notEqual(result.status, 0, `${command} ${args.join(' ')} must fail closed`);
  assert.match(`${result.stdout || ''}\n${result.stderr || ''}`, pattern);
}

expectDenied('python3', ['plugins/usage-dashboard/tools/reconcile_release_candidate.py','--spec',SPEC,'--root','plugins/other'], /R1B_SOURCE_ROOT_UNKNOWN:plugins\/other/);
expectDenied('python3', ['plugins/usage-dashboard/tools/validate_release_candidate.py','--spec',SPEC,'--root','plugins/other'], /R1B_SOURCE_ROOT_UNKNOWN:plugins\/other/);
expectDenied('python3', ['plugins/usage-dashboard/tools/sync_project_guidelines.py','--check','--root','plugins/other'], /R1B_SOURCE_ROOT_UNKNOWN:plugins\/other/);
expectDenied(process.execPath, ['plugins/usage-dashboard/tools/build_usage_dashboard.cjs','--check','--root','plugins/other'], /RELEASE_PATH_PROFILE_UNKNOWN_ROOT/);
expectDenied(process.execPath, ['plugins/usage-dashboard/tools/build_bridge_engine.cjs','--check','--root','plugins/other'], /RELEASE_PATH_PROFILE_UNKNOWN_ROOT/);
expectDenied(process.execPath, ['plugins/usage-dashboard/tools/release_generic_preflight.cjs','--spec',SPEC,'--root','plugins/other'], /RELEASE_PATH_PROFILE_UNKNOWN_ROOT/);
expectDenied(process.execPath, ['plugins/usage-dashboard/tools/release_focused_preflight_e27.cjs','--spec',SPEC,'--root','plugins/other'], /RELEASE_PATH_PROFILE_UNKNOWN_ROOT/);

const reconcileSource = fs.readFileSync('plugins/usage-dashboard/tools/reconcile_release_candidate.py', 'utf8');
for (const marker of [
  "parser.add_argument('--root'",
  'configure_root(args.root)',
  "'--root', ACTIVE_ROOT",
  "TOOLS / 'build_bridge_engine.cjs'",
  "TOOLS / 'build_usage_dashboard.cjs'",
  "TOOLS / 'validate_release_candidate.py'",
  "TOOLS / 'sync_project_guidelines.py'",
  "TESTS / 'current-release-contract.cjs'",
  "TOOLS / 'release_focused_preflight_e27.cjs'",
]) assert.ok(reconcileSource.includes(marker), `R1B root propagation missing: ${marker}`);

for (const workflow of [
  '.github/workflows/usage-dashboard-stage-e7.yml',
  '.github/workflows/usage-dashboard-prepare-candidate.yml',
  '.github/workflows/usage-dashboard-candidate-ready.yml',
  '.github/workflows/reusable-usage-dashboard-validate.yml',
  '.github/workflows/reusable-usage-dashboard-promote.yml',
]) assert.equal(fs.readFileSync(workflow,'utf8').includes(TARGET), false, `R1B target activation leaked into ${workflow}`);

const suite = discoverTests();
assert.ok(suite.regressions.includes('p79-production-root-candidate-source-parameterization.cjs'));
assert.equal(
  suite.regressions.filter((name) => name === 'p79-production-root-candidate-source-parameterization.cjs').length,
  1,
  'R1B regression must be auto-discovered exactly once',
);

console.log('USAGE_DASHBOARD_PRODUCTION_ROOT_RELOCATION:R1B_CANDIDATE_SOURCE_ROOT_PARAMETERIZED');
