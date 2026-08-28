import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assert, equal } from '../../tooling/assertions.mjs';
import { qualifyPr1 } from '../../tooling/ci/pr1-dry-qualification.mjs';

function run(cwd, command, args, allowFailure = false) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 90000,
    maxBuffer: 2 * 1024 * 1024,
  });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')}: ${result.stderr || result.stdout}`);
  }
  return { status: result.status, stdout: String(result.stdout || '').trim(), stderr: String(result.stderr || '').trim() };
}

function git(cwd, ...args) { return run(cwd, 'git', args).stdout; }

function write(root, rel, text) {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text, 'utf8');
}

function requestFor(fixture, parent, builderPath) {
  return {
    schemaVersion: 1,
    intentId: fixture.intentId,
    product: 'SimCore',
    targetVersion: fixture.targetVersion,
    releaseName: fixture.releaseName,
    releaseMode: 'NEW_VERSION',
    expectedProductionCommit: parent,
    builderPath,
    verificationSuite: 'batch-a',
    allowedRuntimePaths: ['plugins/simcore/latest.js', 'plugins/simcore/install.js'],
    changeClass: 'RUNTIME_FEATURE',
    primaryGoalId: fixture.primaryGoalId,
    liveGate: { required: true, scenarioId: fixture.liveScenarioId, closeAuthority: 'HUMAN_EVIDENCE' },
    evidenceRefs: [],
  };
}

function makeScenario(fixture, { builder, harness = 'process.exit(0);\n', extraFiles = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-r24-dry-root-'));
  const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-r24-dry-origin-'));
  git(root, 'init');
  git(root, 'config', 'user.name', 'fixture');
  git(root, 'config', 'user.email', 'fixture@example.invalid');
  write(root, 'plugins/simcore/latest.js', '//@version 0.0.1\nconst value = 1;\n');
  write(root, 'plugins/simcore/install.js', '//@version 0.0.1\nconst value = 1;\n');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'fixture production');
  const production = git(root, 'rev-parse', 'HEAD');

  const builderPath = 'products/simcore/tooling/build-r24-dry-fixture.py';
  write(root, builderPath, builder);
  write(root, 'products/simcore/tooling/test.mjs', harness);
  for (const [rel, text] of Object.entries(extraFiles)) write(root, rel, text);
  const requestPath = `products/simcore/releases/candidate-requests/${fixture.intentId}.json`;
  write(root, requestPath, `${JSON.stringify(requestFor(fixture, production, builderPath), null, 2)}\n`);
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'fixture release authoring');
  const head = git(root, 'rev-parse', 'HEAD');

  git(bare, 'init', '--bare');
  git(root, 'remote', 'add', 'origin', bare);
  git(root, 'push', 'origin', 'HEAD:refs/heads/main');
  return { root, bare, production, head, requestPath };
}

function cleanup(scenario) {
  fs.rmSync(scenario.root, { recursive: true, force: true });
  fs.rmSync(scenario.bare, { recursive: true, force: true });
}

function expectCode(fn, expected) {
  let seen = null;
  try { fn(); } catch (error) { seen = error?.code || null; }
  equal(seen, expected, `expected ${expected}`);
}

export async function runSuite({ fixtures }) {
  const fixture = fixtures[0].input;
  const expected = fixtures[0].expected;
  const assertions = [];
  const pass = (id) => assertions.push({ id, status: 'PASS' });

  const validBuilder = `from pathlib import Path\ntext='//@version 0.0.2\\nconst value = 2;\\n'\nfor rel in ['plugins/simcore/latest.js','plugins/simcore/install.js']:\n    Path(rel).write_text(text, encoding='utf-8')\n`;
  const valid = makeScenario(fixture, { builder: validBuilder });
  try {
    const reportPath = path.join(valid.root, 'dry-report.json');
    const report = qualifyPr1({
      root: valid.root,
      'base-commit': valid.production,
      'head-commit': valid.head,
      'production-commit': valid.production,
      report: reportPath,
    });
    equal(report.result, 'PASS', 'valid dry qualification');
    equal(report.authority, expected.authority, 'dry authority');
    equal(report.productionMutation, expected.productionMutation, 'dry production mutation');
    equal(report.candidateDisposition, expected.candidateDisposition, 'dry disposition');
    equal(report.durableCandidateCreated, false, 'dry candidate creation');
    const remote = run(valid.root, 'git', ['ls-remote', '--heads', 'origin', `refs/heads/candidate/simcore/${fixture.intentId}`]).stdout;
    equal(remote, '', 'dry qualification created candidate ref');
    pass('r24-valid-single-file-dry-pass-no-authority');
  } finally { cleanup(valid); }

  const siblingBuilder = `from helper import render\nfrom pathlib import Path\ntext=render()\nfor rel in ['plugins/simcore/latest.js','plugins/simcore/install.js']:\n    Path(rel).write_text(text, encoding='utf-8')\n`;
  const sibling = makeScenario(fixture, {
    builder: siblingBuilder,
    extraFiles: { 'products/simcore/tooling/helper.py': "def render():\n    return '//@version 0.0.2\\nconst value = 2;\\n'\n" },
  });
  try {
    expectCode(() => qualifyPr1({
      root: sibling.root,
      'base-commit': sibling.production,
      'head-commit': sibling.head,
      'production-commit': sibling.production,
      report: path.join(sibling.root, 'dry-report.json'),
    }), 'CANDIDATE_BUILDER_FAILED');
    const remote = run(sibling.root, 'git', ['ls-remote', '--heads', 'origin', `refs/heads/candidate/simcore/${fixture.intentId}`]).stdout;
    equal(remote, '', 'failed sibling dry created candidate ref');
    pass('r24-v06410-sibling-packaging-fails-premerge');
  } finally { cleanup(sibling); }

  const regression = makeScenario(fixture, { builder: validBuilder, harness: 'process.exit(1);\n' });
  try {
    expectCode(() => qualifyPr1({
      root: regression.root,
      'base-commit': regression.production,
      'head-commit': regression.head,
      'production-commit': regression.production,
      report: path.join(regression.root, 'dry-report.json'),
    }), 'CANDIDATE_REGRESSION_FAILED');
    pass('r24-candidate-specific-regression-fails-premerge');
  } finally { cleanup(regression); }

  const tool = fs.readFileSync('products/simcore/tooling/ci/pr1-dry-qualification.mjs', 'utf8');
  const check = fs.readFileSync('products/simcore/tooling/check.mjs', 'utf8');
  const semantic = fs.readFileSync('products/simcore/tests/suites/host-local-telemetry-v06410.test.mjs', 'utf8');
  const status = JSON.parse(fs.readFileSync('products/simcore/releases/R_V2_4_PREFLIGHT_COMPRESSION_STATUS.json', 'utf8'));

  for (const forbidden of ['git push', 'release-publish.mjs', 'candidate-receipt.mjs', 'repo-main-write.py', 'release-simcore']) {
    assert(!tool.includes(forbidden), `PR1 dry tool gained authority primitive: ${forbidden}`);
  }
  assert(tool.includes("mode: 'verify'"), 'dry lane does not reuse canonical verify materialization');
  assert(tool.includes("authority: 'EPHEMERAL_QUALIFICATION_ONLY'"), 'dry authority marker missing');
  assert(check.includes('GATE_PR1_DRY'), 'PR1 dry gate not wired into permanent verifier');
  assert(check.includes('candidate-requests'), 'PR1 dry trigger is not request-scoped');
  assert(check.includes('pr1-dry-qualification.mjs'), 'PR1 dry verifier invocation missing');
  pass('r24-authority-freeze-and-gate-wiring');

  const guard = semantic.indexOf("typeof hostApi.getLocalPluginStorage !== 'function'");
  const call = semantic.indexOf('await hostApi.getLocalPluginStorage()');
  const bounded = semantic.indexOf("actualTelemetrySource.match(/getLocalPluginStorage/g)");
  const baseRun = semantic.indexOf('runBaseSuite(');
  assert(guard >= 0 && call >= 0 && bounded >= 0, 'semantic Host API surfaces missing');
  assert(baseRun > guard && baseRun > call, 'semantic Host checks must precede legacy compatibility execution');
  assert(!semantic.includes('actualSource.match(/getLocalPluginStorage/g)'), 'whole-source Host API count returned');
  pass('r24-semantic-assertion-discipline');

  const unitC = status.units.find((row) => row.id === 'R2_4_C_DIRECT_PREDECESSOR_TERMINAL_DEBT_SEAL');
  assert(unitC && String(unitC.status).includes('HELD_FOR_REAL_PR3'), 'R2.4-C implementation hold was lost');
  equal(status.objective.newPublisher, 0, 'publisher count changed');
  equal(status.objective.newCleanPathPr, 0, 'clean-path PR count changed');
  equal(status.objective.newPolling, 0, 'polling introduced');
  pass('r24-c-held-and-cost-freeze');

  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
