'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_TEST_DIR = path.resolve(__dirname);
const FOUNDATION_TESTS = Object.freeze([
  'foundation.cjs',
  'release-infrastructure-foundation.cjs',
  'current-release-contract.cjs',
  'legacy-release-workflow-archive.cjs',
  'behavior-harness-contract.cjs',
  'runtime-audit-standard-contract.cjs',
  'test-registry-contract.cjs',
  'candidate-ready-contract.cjs',
  'release-candidate-classifier-contract.cjs',
  'release-authority-contract.cjs',
  'candidate-preparation-contract.cjs',
  'candidate-reconciliation-contract.cjs',
  'candidate-stage-policy-contract.cjs',
  'candidate-stage-transaction-contract.cjs',
  'e7-validation-control-command-contract.cjs',
  'release-generic-preflight-contract.cjs',
  'managed-cli-package-authority-contract.cjs',
  'e8-early-failure-orchestration-contract.cjs',
  'e9-durable-release-transaction-contract.cjs',
  'e10-immediate-convergence-contract.cjs',
  'e11-diagnosable-merge-readiness-contract.cjs',
  'e12-event-convergence-simplification-contract.cjs',
  'e13-stage-handoff-wake-simplification-contract.cjs',
  'e14-ancestry-convergence-contract.cjs',
  'e14-governance-alignment-contract.cjs',
  'e15-release-handoff-hygiene-contract.cjs',
  'e16-derived-merge-authority-capsule-contract.cjs',
  'e16-documentation-status-hygiene-contract.cjs',
  'e17-stability-envelope-contract.cjs',
  'e18-semantic-impact-smoke-contract.cjs',
  'e19-shift-left-validation-reuse-contract.cjs',
  'pr-lifecycle-closure-contract.cjs',
]);
const INFRASTRUCTURE_FILES = Object.freeze([
  'registry.cjs',
  'run-all.cjs',
]);

function fail(code, detail = '') {
  const suffix = detail ? `:${detail}` : '';
  throw new Error(`${code}${suffix}`);
}

function uniqueOrFail(items, label) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item)) fail('DUPLICATE_TEST_REGISTRATION', `${label}:${item}`);
    seen.add(item);
  }
}

function regressionNumber(filename) {
  const match = /^p(\d+)-.+\.cjs$/.exec(filename);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isSafeInteger(value) || value < 1) fail('INVALID_REGRESSION_TEST_NAME', filename);
  return value;
}

function discoverTests(options = {}) {
  const testDir = path.resolve(options.testDir || DEFAULT_TEST_DIR);
  const foundation = [...(options.foundationTests || FOUNDATION_TESTS)];
  const infrastructure = [...(options.infrastructureFiles || INFRASTRUCTURE_FILES)];
  uniqueOrFail(foundation, 'foundation');
  uniqueOrFail(infrastructure, 'infrastructure');

  const foundationSet = new Set(foundation);
  const infrastructureSet = new Set(infrastructure);
  for (const name of foundationSet) {
    if (infrastructureSet.has(name)) fail('DUPLICATE_TEST_REGISTRATION', `foundation-infrastructure:${name}`);
  }

  const entries = fs.readdirSync(testDir, {withFileTypes:true});
  const topLevelCjs = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.cjs')).map((entry) => entry.name).sort();
  const present = new Set(topLevelCjs);

  for (const name of foundation) {
    if (!present.has(name)) fail('REGISTERED_TEST_MISSING', name);
  }
  for (const name of infrastructure) {
    if (!present.has(name)) fail('REGISTERED_TEST_MISSING', name);
  }

  const behavior = [];
  const regressions = [];
  const selected = new Set();
  for (const name of foundation) selected.add(name);

  for (const name of topLevelCjs) {
    if (foundationSet.has(name) || infrastructureSet.has(name)) continue;
    if (/^behavior-.+\.cjs$/.test(name)) {
      if (selected.has(name)) fail('DUPLICATE_TEST_REGISTRATION', name);
      selected.add(name);
      behavior.push(name);
      continue;
    }
    const pNumber = regressionNumber(name);
    if (pNumber !== null) {
      if (selected.has(name)) fail('DUPLICATE_TEST_REGISTRATION', name);
      selected.add(name);
      regressions.push({name, number:pNumber});
      continue;
    }
    if (/^p/i.test(name)) fail('INVALID_REGRESSION_TEST_NAME', name);
    fail('UNREGISTERED_TEST_FILE', name);
  }

  behavior.sort((a, b) => a.localeCompare(b));
  regressions.sort((a, b) => a.number - b.number || a.name.localeCompare(b.name));
  const ordered = [...foundation, ...behavior, ...regressions.map((item) => item.name)];
  uniqueOrFail(ordered, 'selected');
  return {testDir, foundation, behavior, regressions:regressions.map((item) => item.name), ordered};
}

module.exports = {
  DEFAULT_TEST_DIR,
  FOUNDATION_TESTS,
  INFRASTRUCTURE_FILES,
  regressionNumber,
  discoverTests,
};
