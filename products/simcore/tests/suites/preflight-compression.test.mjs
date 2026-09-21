import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assert, equal, deepEqual } from '../../tooling/assertions.mjs';
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
  const historicalSeal06409 = fs.readFileSync('docs/SIMCORE_R2_4_HISTORICAL_TERMINAL_DEBT_SEAL_06409_2026-09-21.md', 'utf8');
  const historicalSeal06410 = fs.readFileSync('docs/SIMCORE_R2_4_HISTORICAL_TERMINAL_DEBT_SEAL_06410_2026-09-21.md', 'utf8');
  const historicalSeal06411 = fs.readFileSync('docs/SIMCORE_R2_4_HISTORICAL_TERMINAL_DEBT_SEAL_06411_2026-09-21.md', 'utf8');

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
  equal(unitC?.status, 'HISTORICAL_ADMIN_SEALS_PROVEN_06409_06410_06411', 'R2.4-C historical admin seal status');

  const compatibility = status.terminalDebt?.historicalAdminSeal;
  equal(compatibility?.workItemIssue, 660, 'compatibility seal must remain #660');
  equal(compatibility?.releaseVersion, '0.64.9', 'compatibility seal release');
  equal(compatibility?.sealEvidenceRef, 'docs/SIMCORE_R2_4_HISTORICAL_TERMINAL_DEBT_SEAL_06409_2026-09-21.md', 'compatibility seal ref');

  const ledger = status.terminalDebt?.historicalAdminSeals;
  equal(Array.isArray(ledger), true, 'historical seal ledger missing');
  equal(ledger.length, 3, 'historical seal ledger must contain exactly three separately reviewed entries');
  deepEqual(ledger[0], compatibility, 'first proven #660 seal compatibility projection changed');

  const seal679 = ledger[1];
  equal(seal679?.status, 'HISTORICAL_ADMIN_SEAL_PROVEN_06410', '#679 seal status');
  equal(seal679?.workItemIssue, 679, '#679 seal target');
  equal(seal679?.releaseVersion, '0.64.10', '#679 release version');
  equal(seal679?.terminalDisposition, 'LIVE_FAIL_HANDOFF_TO_NEW_RELEASE', '#679 terminal disposition');
  equal(seal679?.humanEvidenceAccepted, true, '#679 HUMAN_EVIDENCE acceptance');
  equal(seal679?.humanEvidenceRef, 'docs/SIMCORE_LIVE_06410_HOST_LOCAL_CAPSULE_OVERSIZE_2026-08-28.md', '#679 HUMAN_EVIDENCE ref');
  equal(seal679?.humanEvidenceCommit, '3baf4b7e349f2f97c2c669f40eae1a7a12d3112b', '#679 HUMAN_EVIDENCE commit');
  equal(seal679?.directSuccessorIssue, 704, '#679 direct successor');
  equal(seal679?.directSuccessorVersion, '0.64.11', '#679 successor version');
  equal(seal679?.predecessorProductionCommit, 'e43ace74241984f21f69299eff690d0c4f483381', '#679 historical production commit');
  equal(seal679?.predecessorProductionBlob, 'b7d76bd03a435356eeea6948968b0d33ac564ae7', '#679 historical production blob');
  equal(seal679?.sealEvidenceRef, 'docs/SIMCORE_R2_4_HISTORICAL_TERMINAL_DEBT_SEAL_06410_2026-09-21.md', '#679 seal evidence ref');

  const seal704 = ledger[2];
  equal(seal704?.status, 'HISTORICAL_ADMIN_SEAL_PROVEN_06411', '#704 seal status');
  equal(seal704?.workItemIssue, 704, '#704 seal target');
  equal(seal704?.releaseVersion, '0.64.11', '#704 release version');
  equal(seal704?.terminalDisposition, 'SUPERSEDED', '#704 terminal disposition');
  equal(seal704?.durableTerminalEvidence, true, '#704 durable terminal evidence');
  deepEqual(seal704?.terminalEvidenceRefs, [
    'docs/SIMCORE_LIVE_06411_PRE_REFRESH_COMPACTION_PASS_RUNTIME_IDENTITY_SPLIT_2026-08-28.md',
    'docs/SIMCORE_06500_COMBINED_IDENTITY_M2_3_RELEASE_DECISION_2026-08-28.md',
    'docs/SIMCORE_LIVE_06500_SUBGATE_A_RELOAD_ADOPTION_2026-08-28.md',
  ], '#704 terminal evidence refs');
  equal(seal704?.predecessorProductionCommit, '7765ad75359f8d9736a7dea65141e4e45b713c10', '#704 historical production commit');
  equal(seal704?.predecessorProductionBlob, 'cb2fe57da379f9b552f05d0f33eae9cffe498e52', '#704 historical production blob');
  equal(seal704?.successorRelation, 'DIRECT_RELEASE_TRANSACTION', '#704 successor relation');
  equal(seal704?.successorReleaseVersion, '0.65.0', '#704 successor release version');
  equal(seal704?.successorImplementationPr, 721, '#704 successor implementation PR');
  equal(seal704?.successorReleaseId, 'simcore-v0.65.0-new-05', '#704 successor release id');
  equal(seal704?.successorProductionCommit, 'c6659296c68b4322d0ed43f7d8a3339e57f1cbf1', '#704 successor production commit');
  equal(seal704?.successorProductionBlob, '1b38e2b2874f2581edae8f1080edc39558febefa', '#704 successor production blob');
  equal(seal704?.successorTerminalClosurePr, 755, '#704 successor terminal PR3');
  equal(seal704?.sealEvidenceRef, 'docs/SIMCORE_R2_4_HISTORICAL_TERMINAL_DEBT_SEAL_06411_2026-09-21.md', '#704 seal evidence ref');

  for (const row of ledger) {
    equal(row?.maxDebtItems, 1, 'each historical admin transaction must remain one-item-only');
    equal(row?.administrativePrCount, 1, 'each historical admin entry must represent one administrative PR');
    equal(row?.cleanPathPr, false, 'historical admin seal counted as clean release PR');
    equal(row?.sealAloneCloseEligible, false, 'historical admin seal alone became close-eligible');
    equal(row?.autoClosesIssue, false, 'historical admin seal gained auto-close');
    equal(row?.chainWalk, false, 'historical admin seal gained chain walk');
    equal(row?.mutatesReleaseSimcore, false, 'historical admin seal gained release-simcore mutation');
    equal(row?.mutatesRuntime, false, 'historical admin seal gained runtime mutation');
    equal(row?.requiresMerge, true, 'historical admin seal no longer requires merge');
    equal(row?.requiresPostMergeReobservation, true, 'historical admin seal lost postmerge reobservation');
    equal(row?.otherDebtItemsSealed?.length, 0, 'one historical admin PR sealed another debt item');
  }

  for (const token of [
    'historicalAdminSeals[]',
    '#679 / v0.64.10',
    'direct successor #704 / v0.64.11',
    'docs/SIMCORE_R2_4_HISTORICAL_TERMINAL_DEBT_SEAL_06410_2026-09-21.md',
  ]) assert(design.includes(token) || implementationEvidence.includes(token), `R2.4-C repeated-seal authority/evidence missing: ${token}`);

  for (const token of [
    'workItemIssue = 660',
    'directSuccessorIssue = 679',
    '#679 and #704 remain unresolved separate debt items',
  ]) assert(historicalSeal06409.includes(token), `#660 seal evidence changed/missing: ${token}`);

  for (const token of [
    'workItemIssue = 679',
    'releaseVersion = 0.64.10',
    'terminalDisposition = LIVE_FAIL_HANDOFF_TO_NEW_RELEASE',
    'humanEvidenceRef = docs/SIMCORE_LIVE_06410_HOST_LOCAL_CAPSULE_OVERSIZE_2026-08-28.md',
    'humanEvidenceCommit = 3baf4b7e349f2f97c2c669f40eae1a7a12d3112b',
    'directSuccessorIssue = 704',
    'predecessorProductionCommit = e43ace74241984f21f69299eff690d0c4f483381',
    '#704 is a direct successor reference only and remains unresolved/open',
  ]) assert(historicalSeal06410.includes(token), `#679 seal evidence missing: ${token}`);

  for (const token of [
    'terminalDisposition = SUPERSEDED',
    'durableTerminalEvidence = true',
    'successorRelation = DIRECT_RELEASE_TRANSACTION',
    'successorReleaseVersion = 0.65.0',
    'successorImplementationPr = 721',
    'successorReleaseId = simcore-v0.65.0-new-05',
    'successorTerminalClosurePr = 755',
    'The previous v0.64.11 runtime identity split is closed by the real v0.65.0 episode.',
  ]) assert(historicalSeal06411.includes(token), `#704 seal evidence missing: ${token}`);

  for (const token of [
    'SUPERSEDED debt may freeze a direct release-transaction successor',
    'DIRECT_RELEASE_TRANSACTION',
    '#704 / v0.64.11',
    'terminal PR3 = #755',
  ]) assert(design.includes(token) || implementationEvidence.includes(token), `#704 successor authority/evidence missing: ${token}`);

  const preMerge679 = evaluateCleanReleaseWorkItemClosure({
    terminalDisposition: seal679.terminalDisposition,
    humanEvidenceAccepted: seal679.humanEvidenceAccepted,
    terminalClosurePrMerged: false,
    mainTerminalStateReobserved: false,
    productionIdentityReobserved: false,
    workItemClosureEvidenceRefPresent: true,
  });
  equal(preMerge679.closeEligible, false, '#679 historical seal candidate closed before merge');

  const postMerge679 = evaluateCleanReleaseWorkItemClosure({
    terminalDisposition: seal679.terminalDisposition,
    humanEvidenceAccepted: seal679.humanEvidenceAccepted,
    terminalClosurePrMerged: true,
    mainTerminalStateReobserved: true,
    productionIdentityReobserved: true,
    workItemClosureEvidenceRefPresent: true,
  });
  equal(postMerge679.state, 'TERMINAL_REOBSERVED_CLOSE_ELIGIBLE', '#679 postmerge terminal state');
  equal(postMerge679.closeEligible, true, 'unchanged R2.3 evaluator rejected complete #679 historical seal');
  equal(postMerge679.missingEvidence.length, 0, 'complete #679 seal still missing evidence');

  const preMerge704 = evaluateCleanReleaseWorkItemClosure({
    terminalDisposition: seal704.terminalDisposition,
    durableTerminalEvidence: seal704.durableTerminalEvidence,
    terminalClosurePrMerged: false,
    mainTerminalStateReobserved: false,
    productionIdentityReobserved: false,
    workItemClosureEvidenceRefPresent: true,
  });
  equal(preMerge704.closeEligible, false, '#704 SUPERSEDED seal candidate closed before merge');
  assert(preMerge704.missingEvidence.includes('terminalClosurePrMerged'), '#704 seal merge evidence not required');

  const postMerge704 = evaluateCleanReleaseWorkItemClosure({
    terminalDisposition: seal704.terminalDisposition,
    durableTerminalEvidence: seal704.durableTerminalEvidence,
    terminalClosurePrMerged: true,
    mainTerminalStateReobserved: true,
    productionIdentityReobserved: true,
    workItemClosureEvidenceRefPresent: true,
  });
  equal(postMerge704.state, 'TERMINAL_REOBSERVED_CLOSE_ELIGIBLE', '#704 postmerge terminal state');
  equal(postMerge704.closeEligible, true, 'unchanged R2.3 evaluator rejected complete #704 SUPERSEDED seal');
  equal(postMerge704.missingEvidence.length, 0, 'complete #704 seal still missing evidence');

  equal(status.objective.newPublisher, 0, 'publisher count changed');
  equal(status.objective.newCleanPathPr, 0, 'clean-path PR count changed');
  equal(status.objective.steadyStatePrsToLivePending, 2, 'LIVE_PENDING clean-path PR target changed');
  equal(status.objective.steadyStatePrsThroughTerminalClosure, 3, 'terminal clean-path PR target changed');
  equal(status.objective.newPolling, 0, 'polling introduced');
  equal(status.objective.newIssueAutomationController, 0, 'issue automation controller introduced');
  equal(status.runtimeMutation, 'NONE', 'R2.4 historical seal mutated runtime');
  equal(status.releaseSimcoreMutation, 'NONE', 'R2.4 historical seal mutated release-simcore');
  pass('r24-c-historical-admin-seal-ledger-one-item-transactions-and-cost-freeze');

  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
