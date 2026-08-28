import fs from 'node:fs';
import { assert, equal, deepEqual } from '../../tooling/assertions.mjs';
import {
  CLEAN_RELEASE_WORK_ITEM_STATES,
  evaluateCleanReleaseWorkItemClosure,
  assertCleanReleaseWorkItemClosureTruth,
  releaseWorkItemOpenThroughText,
} from '../../tooling/release-work-item-closure-policy.mjs';
import {
  evaluateReleaseBlockerIncident,
  RELEASE_BLOCKER_INCIDENT_STATES,
} from '../../tooling/release-blocker-incident-policy.mjs';

function expectCode(fn, code) {
  let got = null;
  try { fn(); } catch (error) { got = error?.code || null; }
  equal(got, code, `expected ${code}`);
}

function livePassEvidence(overrides = {}) {
  return {
    livePendingConverged: true,
    terminalDisposition: 'LIVE_PASS',
    humanEvidenceAccepted: true,
    terminalClosurePrMerged: true,
    mainTerminalStateReobserved: true,
    productionIdentityReobserved: true,
    workItemClosureEvidenceRefPresent: true,
    ...overrides,
  };
}

function explicitTerminal(disposition, overrides = {}) {
  return {
    terminalDisposition: disposition,
    durableTerminalEvidence: true,
    terminalClosurePrMerged: true,
    mainTerminalStateReobserved: true,
    productionIdentityReobserved: true,
    workItemClosureEvidenceRefPresent: true,
    ...overrides,
  };
}

export async function runSuite() {
  const assertions = [];
  const pass = (id) => assertions.push({ id, status: 'PASS' });

  const fixture = JSON.parse(fs.readFileSync('products/simcore/tests/fixtures/stability-seal/case.json', 'utf8'));
  equal(fixture.input.releaseVersion, '0.64.9', 'v0.64.9 replay fixture');
  equal(fixture.input.currentLifecycle, 'LIVE_PENDING', 'fixture current lifecycle');
  equal(fixture.input.workItemIssue, 660, 'fixture work item');
  pass('R2.3-fixture-v0.64.9-clean-path-boundary');

  const wording = releaseWorkItemOpenThroughText();
  for (const token of [
    'candidate qualification',
    'exact approval',
    'permanent publication',
    'production reobservation',
    'LIVE_PENDING',
    'HUMAN_EVIDENCE / PR3 terminal disposition',
  ]) assert(wording.includes(token), `work-item wording missing: ${token}`);
  pass('R2.3-A-work-item-wording-open-through-terminal-disposition');

  const pending = evaluateCleanReleaseWorkItemClosure({
    livePendingConverged: true,
    labels: ['scope:unclassified'],
  });
  equal(pending.state, CLEAN_RELEASE_WORK_ITEM_STATES.LIVE_PENDING, 'LIVE_PENDING state');
  equal(pending.closeEligible, false, 'LIVE_PENDING must stay open');
  assert(pending.missingEvidence.includes('terminalDisposition'), 'terminal disposition must be missing');
  expectCode(
    () => assertCleanReleaseWorkItemClosureTruth({ livePendingConverged: true, issueClosed: true }),
    'CLEAN_RELEASE_WORK_ITEM_PREMATURE_CLOSURE',
  );
  pass('R2.3-A-live-pending-alone-never-close-eligible');

  const noHuman = evaluateCleanReleaseWorkItemClosure(livePassEvidence({ humanEvidenceAccepted: false }));
  equal(noHuman.closeEligible, false, 'LIVE_PASS without HUMAN_EVIDENCE');
  assert(noHuman.missingEvidence.includes('humanEvidenceAccepted'), 'missing HUMAN_EVIDENCE not reported');
  expectCode(
    () => assertCleanReleaseWorkItemClosureTruth(livePassEvidence({ humanEvidenceAccepted: false, issueClosed: true })),
    'CLEAN_RELEASE_WORK_ITEM_PREMATURE_CLOSURE',
  );
  pass('R2.3-B-live-pass-requires-human-evidence');

  const noPr3 = evaluateCleanReleaseWorkItemClosure(livePassEvidence({ terminalClosurePrMerged: false }));
  equal(noPr3.state, CLEAN_RELEASE_WORK_ITEM_STATES.TERMINAL_EVIDENCE_ACCEPTED, 'HUMAN_EVIDENCE awaiting PR3');
  equal(noPr3.closeEligible, false, 'no PR3 no closure');
  pass('R2.3-B-human-evidence-without-pr3-stays-open');

  const noReobserve = evaluateCleanReleaseWorkItemClosure(livePassEvidence({ mainTerminalStateReobserved: false }));
  equal(noReobserve.state, CLEAN_RELEASE_WORK_ITEM_STATES.PR3_MERGED, 'PR3 awaiting reobservation');
  equal(noReobserve.closeEligible, false, 'PR3 without reobservation no closure');
  pass('R2.3-B-pr3-needs-post-merge-reobservation');

  const livePass = evaluateCleanReleaseWorkItemClosure(livePassEvidence());
  equal(livePass.state, CLEAN_RELEASE_WORK_ITEM_STATES.TERMINAL_REOBSERVED, 'terminal reobserved state');
  equal(livePass.closeEligible, true, 'complete LIVE_PASS close eligibility');
  equal(livePass.missingEvidence.length, 0, 'complete LIVE_PASS missing evidence');
  assertCleanReleaseWorkItemClosureTruth(livePassEvidence({ issueClosed: true }));
  pass('R2.3-B-complete-live-pass-terminal-seal');

  for (const disposition of ['CANCELLED', 'ROLLED_BACK', 'SUPERSEDED']) {
    const withoutEvidence = evaluateCleanReleaseWorkItemClosure(explicitTerminal(disposition, { durableTerminalEvidence: false }));
    equal(withoutEvidence.closeEligible, false, `${disposition} without durable terminal evidence`);
    const terminal = evaluateCleanReleaseWorkItemClosure(explicitTerminal(disposition));
    equal(terminal.closeEligible, true, `${disposition} terminal closure`);
    equal(terminal.terminalDisposition, disposition, `${disposition} terminal disposition`);
  }
  pass('R2.3-A-explicit-non-live-terminal-dispositions-durable');

  const liveFailWithoutHuman = evaluateCleanReleaseWorkItemClosure({
    ...explicitTerminal('LIVE_FAIL_HANDOFF_TO_NEW_RELEASE'),
    humanEvidenceAccepted: false,
  });
  equal(liveFailWithoutHuman.closeEligible, false, 'LIVE_FAIL handoff requires HUMAN_EVIDENCE');
  const liveFail = evaluateCleanReleaseWorkItemClosure({
    ...explicitTerminal('LIVE_FAIL_HANDOFF_TO_NEW_RELEASE'),
    humanEvidenceAccepted: true,
  });
  equal(liveFail.closeEligible, true, 'LIVE_FAIL handoff with HUMAN_EVIDENCE terminal closure');
  pass('R2.3-A-live-fail-handoff-requires-human-evidence');

  const durableInput = livePassEvidence();
  const unclassified = evaluateCleanReleaseWorkItemClosure({ ...durableInput, labels: ['scope:unclassified'] });
  const classified = evaluateCleanReleaseWorkItemClosure({ ...durableInput, labels: ['scope:simcore'] });
  deepEqual(unclassified, classified, 'labels changed closure authority decision');
  equal(unclassified.labelAuthorityUsed, false, 'label authority must be unused');
  pass('R2.3-C-labels-are-non-authority');

  const policySource = fs.readFileSync('products/simcore/tooling/release-work-item-closure-policy.mjs', 'utf8');
  for (const token of [
    'release-publish.mjs',
    'repo-main-write.py',
    'api.github.com',
    'setInterval(',
    'setTimeout(',
    'fetch(',
    'git push',
    'update_issue',
  ]) assert(!policySource.includes(token), `R2.3 policy gained forbidden authority: ${token}`);
  pass('R2.3-policy-pure-no-publisher-network-polling-issue-controller');

  const r2_2Recovered = evaluateReleaseBlockerIncident({
    defectFixed: true,
    recoveryAppendOnlyPreserved: true,
    exactCandidateApprovalVerified: true,
    permanentReleaseSucceeded: true,
    productionCommitReobserved: true,
    latestInstallEqualReobserved: true,
    livePendingStateConverged: true,
  });
  equal(r2_2Recovered.state, RELEASE_BLOCKER_INCIDENT_STATES.RECOVERED, 'R2.2 blocker semantics changed');
  equal(r2_2Recovered.closeEligible, true, 'R2.2 blocker recovered closure changed');
  pass('R2.3-preserves-R2.2-blocker-semantics');

  const registrySource = fs.readFileSync('products/simcore/tests/registry.mjs', 'utf8');
  for (const id of ['release-spec-contract', 'closure-integrity', 'stability-seal']) {
    assert(registrySource.includes(`id: '${id}'`), `required regression missing: ${id}`);
  }
  pass('R2.3-preserves-prior-required-regressions');

  const policyDoc = fs.readFileSync('docs/SIMCORE_RELEASE_SYSTEM_V2_3_STABILITY_SEAL_POLICY.md', 'utf8');
  for (const token of [
    '`LIVE_PENDING` is not a terminal work-item state',
    'HUMAN_EVIDENCE accepted',
    'terminal closure PR / PR3 merged',
    'Repository labels are convenience metadata only',
    'REAL PR3 TERMINAL PROOF PENDING',
  ]) assert(policyDoc.includes(token), `R2.3 policy doc token missing: ${token}`);
  pass('R2.3-durable-policy-surface');

  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
