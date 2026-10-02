'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const owner = require('../published-progress-recovery.cjs');

function locators() {
  return {
    packet: 'issue:#2744',
    lease: 'issue:#2352',
    manifest: 'receipt:mcl-task-manifest:fixture',
    holder: 'receipt:mcl-workspace-holder:fixture',
    session: 'receipt:mcl-rdc-session-evidence:fixture',
    workspace: 'receipt:workspace-state:fixture',
    publishedIdentity: 'commit:' + 'b'.repeat(40),
    pr: 'pr:#2565',
    changedPaths: 'receipt:pr-paths:fixture',
    descendant: 'receipt:git-descendant:fixture',
    releaseEligibility: 'receipt:d013-release-plan:fixture',
  };
}
function evidence(overrides = {}) {
  return {
    schemaVersion: 1,
    mode: 'PUBLISHED_PROGRESS_RECOVERY_EVIDENCE',
    subject: 'fixture:2744',
    packetState: 'EXACT',
    stageState: 'VALIDATION_MERGE',
    leaseState: 'ACTIVE_EXACT',
    manifestState: 'EXACT',
    holderState: 'PRESENT_EXACT',
    sessionState: 'ABSENT',
    workspaceState: 'CLEAN',
    publishedIdentityState: 'EXACT',
    prState: 'OPEN_EXACT',
    changedPathsState: 'EXACT',
    descendantState: 'PROVEN',
    releaseEligibility: 'PROVEN',
    locators: {...locators(), ...(overrides.locators || {})},
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== 'locators')),
  };
}

for (const subject of ['fixture:2744', 'fixture:2766', 'fixture:2769']) {
  test(subject + ' exact published progress is rebind eligible', () => {
    const out = owner.projectPublishedProgressEvidence(evidence({subject}));
    assert.equal(out.result, 'PASS');
    assert.equal(out.recoveryDisposition, 'PUBLISHED_PROGRESS_REBIND_ELIGIBLE');
    assert.equal(out.publishedProgress, 'EXACT_PRESERVED');
    assert.equal(out.authority.repositoryMutationAuthorized, false);
    assert.equal(out.authority.mergeAuthorized, false);
  });
}
test('session present never becomes positive', () => {
  const out = owner.projectPublishedProgressEvidence(evidence({sessionState: 'PRESENT'}));
  assert.equal(out.result, 'UNKNOWN');
  assert.equal(out.attentionDisposition, 'NEEDS_REVIEW');
  assert.equal(out.reasonCode, 'OWNER_SESSION_PRESENT');
});
test('session unknown never becomes positive', () => {
  const out = owner.projectPublishedProgressEvidence(evidence({sessionState: 'UNKNOWN'}));
  assert.equal(out.result, 'UNKNOWN');
  assert.equal(out.reasonCode, 'SESSION_AUTHORITY_UNRESOLVED');
});
test('dirty workspace is blocked', () => {
  assert.equal(owner.projectPublishedProgressEvidence(evidence({workspaceState: 'DIRTY'})).result, 'BLOCKED');
});
test('published head mismatch is conflict', () => {
  assert.equal(owner.projectPublishedProgressEvidence(evidence({publishedIdentityState: 'CONFLICT'})).result, 'CONFLICT');
});
test('duplicate or conflicting PR is conflict', () => {
  assert.equal(owner.projectPublishedProgressEvidence(evidence({prState: 'CONFLICT'})).result, 'CONFLICT');
});
test('changed paths mismatch is conflict', () => {
  assert.equal(owner.projectPublishedProgressEvidence(evidence({changedPathsState: 'CONFLICT'})).result, 'CONFLICT');
});
test('missing descendant proof is unknown', () => {
  assert.equal(owner.projectPublishedProgressEvidence(evidence({descendantState: 'UNKNOWN'})).result, 'UNKNOWN');
});
test('blocked release planner remains blocked', () => {
  assert.equal(owner.projectPublishedProgressEvidence(evidence({releaseEligibility: 'BLOCKED'})).result, 'BLOCKED');
});
test('packet stage must be validation merge', () => {
  assert.equal(owner.projectPublishedProgressEvidence(evidence({stageState: 'OTHER'})).result, 'CONFLICT');
});
test('main freshness is deliberately not classifier input', () => {
  assert.throws(() => owner.normalizeEvidence({...evidence(), mainFreshness: 'BEHIND'}));
});
test('classifier has no fs network process Git authority imports', () => {
  const source = fs.readFileSync(path.join(__dirname, '../published-progress-recovery.cjs'), 'utf8');
  for (const forbidden of [
    "require('node:fs')", "require('node:child_process')", "require('node:http')",
    "require('node:https')", 'git ', 'gh ', 'fetch(', 'process.env',
  ]) assert.equal(source.includes(forbidden), false, forbidden);
});
