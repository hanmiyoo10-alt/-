import fs from 'node:fs';
import { assert, equal } from '../../tooling/assertions.mjs';
import {
  RELEASE_BLOCKER_INCIDENT_STATES,
  evaluateReleaseBlockerIncident,
  assertIncidentClosureTruth,
  repairPrReferenceVerb,
} from '../../tooling/release-blocker-incident-policy.mjs';

function count(text, token) {
  return text.split(token).length - 1;
}

function expectCode(fn, code) {
  let got = null;
  try { fn(); } catch (error) { got = error?.code || null; }
  equal(got, code, `expected ${code}`);
}

function recoveredEvidence(overrides = {}) {
  return {
    defectFixed: true,
    recoveryAppendOnlyPreserved: true,
    exactCandidateApprovalVerified: true,
    permanentReleaseSucceeded: true,
    productionCommitReobserved: true,
    latestInstallEqualReobserved: true,
    livePendingStateConverged: true,
    ...overrides,
  };
}

function activeHumanSection(text) {
  const startMarker = '# 1. Current Operational State';
  const start = text.indexOf(startMarker);
  assert(start >= 0, 'current operational state section missing');
  const historical = text.indexOf('## Historical validated precursor', start);
  const fallback = text.indexOf('# 2.', start);
  const end = historical >= 0 ? historical : fallback;
  assert(end > start, 'active human current-state boundary missing');
  return text.slice(start, end);
}

export async function runSuite() {
  const assertions = [];
  const pass = (id) => assertions.push({ id, status: 'PASS' });

  const current = fs.readFileSync('docs/CURRENT_DEVELOPMENT.md', 'utf8');
  equal(count(current, '<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:BEGIN -->'), 1, 'single production snapshot begin');
  equal(count(current, '<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:END -->'), 1, 'single production snapshot end');
  const releaseBegins = [...current.matchAll(/<!-- SIMCORE_RELEASE_STATE:([^:]+):BEGIN -->/g)].map((m) => m[1]);
  const releaseEnds = [...current.matchAll(/<!-- SIMCORE_RELEASE_STATE:([^:]+):END -->/g)].map((m) => m[1]);
  equal(releaseBegins.length, 1, 'single active release-state begin');
  equal(releaseEnds.length, 1, 'single active release-state end');
  equal(releaseBegins[0], releaseEnds[0], 'release-state begin/end mode');
  pass('R2.2-A-machine-current-authority-unique');

  const active = activeHumanSection(current);
  assert(active.includes('## How to read current operational state'), 'identity-free current-state guide missing');
  assert(!active.includes('## Production verdict'), 'duplicate Production verdict remains');
  assert(!/v0\.\d+\.\d+/.test(active), 'active human current-state prose duplicates version literal');
  assert(!/\b[0-9a-f]{40}\b/i.test(active), 'active human current-state prose duplicates commit literal');
  assert(!/\b064\d{2}_[A-Z0-9_]+\b/.test(active), 'active human current-state prose duplicates live-gate literal');
  pass('R2.2-A-human-current-prose-identity-free');

  const initial = evaluateReleaseBlockerIncident({});
  equal(initial.state, RELEASE_BLOCKER_INCIDENT_STATES.BLOCKER_ACTIVE, 'initial blocker state');
  equal(initial.closeEligible, false, 'initial blocker closure');
  pass('R2.2-B-blocker-active-open');

  const repaired = evaluateReleaseBlockerIncident({ defectFixed: true });
  equal(repaired.state, RELEASE_BLOCKER_INCIDENT_STATES.RECOVERY_PENDING, 'repair-only incident state');
  equal(repaired.closeEligible, false, 'repair-only closure');
  equal(repaired.repairPrReferenceVerb, 'Refs', 'repair PR verb');
  equal(repairPrReferenceVerb(), 'Refs', 'policy reference verb');
  pass('R2.2-B-defect-fixed-recovery-pending');

  const partial = evaluateReleaseBlockerIncident(recoveredEvidence({ livePendingStateConverged: false }));
  equal(partial.state, RELEASE_BLOCKER_INCIDENT_STATES.RECOVERY_PENDING, 'partial recovery state');
  equal(partial.closeEligible, false, 'partial recovery closure');
  assert(partial.missingEvidence.includes('livePendingStateConverged'), 'partial recovery missing evidence not reported');
  pass('R2.2-B-partial-recovery-stays-open');

  const recovered = evaluateReleaseBlockerIncident(recoveredEvidence());
  equal(recovered.state, RELEASE_BLOCKER_INCIDENT_STATES.RECOVERED, 'recovered state');
  equal(recovered.closeEligible, true, 'recovered closure');
  equal(recovered.missingEvidence.length, 0, 'recovered missing evidence');
  pass('R2.2-B-recovered-production-reobserved-close-eligible');

  expectCode(
    () => assertIncidentClosureTruth({ defectFixed: true, issueClosed: true }),
    'RELEASE_BLOCKER_PREMATURE_CLOSURE',
  );
  assertIncidentClosureTruth(recoveredEvidence({ issueClosed: true }));
  pass('R2.2-B-premature-close-negative-control');

  for (const terminalDisposition of ['CANCELLED', 'ROLLED_BACK']) {
    const pendingTerminal = evaluateReleaseBlockerIncident({ defectFixed: true, terminalDisposition });
    equal(pendingTerminal.closeEligible, false, `${terminalDisposition} without durable evidence`);
    const durableTerminal = evaluateReleaseBlockerIncident({
      defectFixed: true,
      terminalDisposition,
      durableTerminalEvidence: true,
    });
    equal(durableTerminal.state, RELEASE_BLOCKER_INCIDENT_STATES.TERMINATED, `${terminalDisposition} terminal state`);
    equal(durableTerminal.closeEligible, true, `${terminalDisposition} terminal closure`);
  }
  pass('R2.2-B-explicit-terminal-disposition-requires-evidence');

  const policyDoc = fs.readFileSync('docs/SIMCORE_RELEASE_SYSTEM_V2_2_BLOCKER_INCIDENT_POLICY.md', 'utf8');
  for (const token of [
    'Refs #<issue>',
    'Fixes #<issue>',
    'Closes #<issue>',
    'DEFECT_FIXED / RELEASE_RECOVERY_PENDING',
    'RECOVERED / PRODUCTION_REOBSERVED',
  ]) assert(policyDoc.includes(token), `policy token missing: ${token}`);
  pass('R2.2-B-durable-policy-surface');

  const policySource = fs.readFileSync('products/simcore/tooling/release-blocker-incident-policy.mjs', 'utf8');
  for (const token of [
    'release-publish.mjs',
    'repo-main-write.py',
    'api.github.com',
    'setInterval(',
    'setTimeout(',
    'fetch(',
    'git push',
  ]) assert(!policySource.includes(token), `incident policy gained forbidden authority: ${token}`);
  pass('R2.2-B-policy-is-pure-no-publisher-network-polling');

  const registrySource = fs.readFileSync('products/simcore/tests/registry.mjs', 'utf8');
  assert(registrySource.includes("id: 'release-spec-contract'"), 'R2.1 release-spec-contract regression missing');
  assert(registrySource.includes("id: 'closure-integrity'"), 'R2.2 closure-integrity regression missing');
  pass('R2.2-preserves-R2.1-contract-parity-regression');

  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
