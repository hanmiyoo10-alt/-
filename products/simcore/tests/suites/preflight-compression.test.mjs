import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assert, equal } from '../../tooling/assertions.mjs';
import { qualifyPr1 } from '../../tooling/ci/pr1-dry-qualification.mjs';
import { evaluateCleanReleaseWorkItemClosure } from '../../tooling/release-work-item-closure-policy.mjs';

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
  const design = fs.readFileSync('docs/SIMCORE_RELEASE_SYSTEM_V2_4_PREFLIGHT_COMPRESSION_DESIGN.md', 'utf8');
  const implementationEvidence = fs.readFileSync('docs/SIMCORE_RELEASE_SYSTEM_V2_4_PREFLIGHT_COMPRESSION_IMPLEMENTATION_EVIDENCE.md', 'utf8');
  const historicalSeal = fs.readFileSync('docs/SIMCORE_R2_4_HISTORICAL_TERMINAL_DEBT_SEAL_06409_2026-09-21.md', 'utf8');

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
  const baseRun = semantic.indexOf('const base = await runBaseSuite(');
  assert(guard >= 0 && call >= 0 && bounded >= 0, 'semantic Host API surfaces missing');
  assert(baseRun > guard && baseRun > call, 'semantic Host checks must precede legacy compatibility execution');
  assert(!semantic.includes('actualSource.match(/getLocalPluginStorage/g)'), 'whole-source Host API count returned');
  pass('r24-semantic-assertion-discipline');

  const unitC = status.units.find((row) => row.id === 'R2_4_C_DIRECT_PREDECESSOR_TERMINAL_DEBT_SEAL');
  equal(unitC?.status, 'HISTORICAL_ADMIN_SEAL_PROVEN_06409', 'R2.4-C historical admin seal status');
  const historical = status.terminalDebt?.historicalAdminSeal;
  equal(historical?.workItemIssue, 660, 'historical seal must target exactly #660');
  equal(historical?.releaseVersion, '0.64.9', 'historical seal release');
  equal(historical?.terminalDisposition, 'LIVE_FAIL_HANDOFF_TO_NEW_RELEASE', 'historical seal disposition');
  equal(historical?.humanEvidenceAccepted, true, 'historical seal HUMAN_EVIDENCE acceptance');
  equal(historical?.humanEvidenceRef, 'docs/SIMCORE_LIVE_06409_SESSION_ACCESS_ERROR_2026-08-28.md', 'historical HUMAN_EVIDENCE ref');
  equal(historical?.directSuccessorIssue, 679, 'historical direct successor');
  equal(historical?.directSuccessorVersion, '0.64.10', 'historical successor version');
  equal(historical?.predecessorProductionCommit, '1c1037e44d6b3e903b3d622b579095b1f315758e', 'historical production commit');
  equal(historical?.predecessorProductionBlob, '7d2731d256b8aa18598c389fd919550cf3bbf146', 'historical production blob');
  equal(historical?.maxDebtItems, 1, 'historical admin seal must remain one-item-only');
  equal(historical?.administrativePrCount, 1, 'historical admin seal PR count');
  equal(historical?.cleanPathPr, false, 'historical admin seal must not count as clean release PR');
  equal(historical?.sealAloneCloseEligible, false, 'seal alone must not close the work item');
  equal(historical?.autoClosesIssue, false, 'historical admin seal must not auto-close');
  equal(historical?.chainWalk, false, 'historical admin seal must not chain-walk');
  equal(historical?.mutatesReleaseSimcore, false, 'historical admin seal must not mutate release-simcore');
  equal(historical?.mutatesRuntime, false, 'historical admin seal must not mutate runtime');
  equal(historical?.requiresMerge, true, 'historical admin seal requires merge');
  equal(historical?.requiresPostMergeReobservation, true, 'historical admin seal requires postmerge reobservation');
  equal(historical?.otherDebtItemsSealed?.length, 0, 'historical admin PR must not seal another debt item');

  for (const token of [
    'HISTORICAL_PREDECESSOR_DEBT_SEAL_ACTIVATION / AUTHORITY_MISSING',
    'HISTORICAL_ADMIN_SEAL_PROVEN_06409',
    'docs/SIMCORE_R2_4_HISTORICAL_TERMINAL_DEBT_SEAL_06409_2026-09-21.md',
  ]) assert(design.includes(token) || implementationEvidence.includes(token), `R2.4-C authority/evidence missing: ${token}`);
  for (const token of [
    'workItemIssue = 660',
    'terminalDisposition = LIVE_FAIL_HANDOFF_TO_NEW_RELEASE',
    'directSuccessorIssue = 679',
    'predecessorProductionCommit = 1c1037e44d6b3e903b3d622b579095b1f315758e',
    '#679 and #704 remain unresolved separate debt items',
  ]) assert(historicalSeal.includes(token), `historical seal evidence missing: ${token}`);

  const preMerge = evaluateCleanReleaseWorkItemClosure({
    terminalDisposition: 'LIVE_FAIL_HANDOFF_TO_NEW_RELEASE',
    humanEvidenceAccepted: true,
    terminalClosurePrMerged: false,
    mainTerminalStateReobserved: false,
    productionIdentityReobserved: false,
    workItemClosureEvidenceRefPresent: true,
  });
  equal(preMerge.closeEligible, false, 'historical seal candidate must remain open before merge');

  const postMergeProjection = evaluateCleanReleaseWorkItemClosure({
    terminalDisposition: 'LIVE_FAIL_HANDOFF_TO_NEW_RELEASE',
    humanEvidenceAccepted: true,
    terminalClosurePrMerged: true,
    mainTerminalStateReobserved: true,
    productionIdentityReobserved: true,
    workItemClosureEvidenceRefPresent: true,
  });
  equal(postMergeProjection.closeEligible, true, 'unchanged R2.3 evaluator must accept fully reobserved historical seal');

  equal(status.objective.newPublisher, 0, 'publisher count changed');
  equal(status.objective.newCleanPathPr, 0, 'clean-path PR count changed');
  equal(status.objective.steadyStatePrsToLivePending, 2, 'LIVE_PENDING clean-path PR target changed');
  equal(status.objective.steadyStatePrsThroughTerminalClosure, 3, 'terminal clean-path PR target changed');
  equal(status.objective.newPolling, 0, 'polling introduced');
  equal(status.objective.newIssueAutomationController, 0, 'issue automation controller introduced');
  equal(status.runtimeMutation, 'NONE', 'R2.4 historical seal mutated runtime');
  equal(status.releaseSimcoreMutation, 'NONE', 'R2.4 historical seal mutated release-simcore');
  pass('r24-c-historical-admin-seal-one-item-and-cost-freeze');

  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
