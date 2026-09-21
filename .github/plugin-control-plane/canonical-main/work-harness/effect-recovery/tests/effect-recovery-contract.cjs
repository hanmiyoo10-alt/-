#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../../../../../..');
const owner = require('../effect-recovery.cjs');

function locators() {
  return {
    packet: 'issue:#2693',
    lease: 'issue:#2352',
    manifest: 'receipt:mcl-task-manifest:fixture',
    holder: 'receipt:mcl-workspace-holder:fixture',
    session: 'receipt:rdc-session-evidence:fixture',
    workspace: 'receipt:workspace-state:fixture',
    dirtyScope: 'receipt:dirty-scope:fixture',
    gitIdentity: 'commit:ed062764611a7a5cbef68f6aaea5551ac5bbaa96',
    remoteBranch: 'receipt:remote-branch:fixture',
    pr: 'receipt:pr-state:fixture',
    releaseEligibility: 'receipt:d013-release-plan:fixture',
  };
}

function evidence(overrides = {}) {
  return {
    schemaVersion: 1,
    mode: 'EFFECT_RECOVERY_EVIDENCE',
    subject: 'fixture:2693',
    packetState: 'EXACT',
    leaseState: 'ACTIVE_EXACT',
    manifestState: 'EXACT',
    holderState: 'PRESENT_EXACT',
    sessionState: 'LIVE',
    workspaceState: 'DIRTY_PRESERVED',
    dirtyScopeState: 'EXACT',
    gitIdentityState: 'EXACT',
    remoteBranchState: 'UNCHANGED_BASE',
    prState: 'ABSENT',
    releaseEligibility: 'PROVEN',
    locators: {...locators(), ...(overrides.locators || {})},
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== 'locators')),
  };
}

function project(input) {
  return owner.projectRecoveryEvidence(input, {
    receiptLocator: 'local-artifact:fixture/recovery.receipt.json',
    reportLocator: 'local-artifact:fixture/recovery.report.json',
  });
}

test('live exact owning session resumes without takeover', () => {
  const out = project(evidence());
  assert.equal(out.decision.recoveryDisposition, 'SAME_SESSION_RESUME');
  assert.equal(out.receipt.result, 'PASS');
  assert.equal(out.receipt.attentionDisposition, 'COMPLETE');
  assert.equal(out.receipt.nextLegalAction, 'IMPLEMENTATION_CONTINUE_WITH_EXISTING_OWNER');
  assert.equal(out.view.phase, 'EFFECT_RECOVERY');
  assert.equal(out.view.output.recoveryDisposition, 'SAME_SESSION_RESUME');
  assert.equal(out.view.output.dirtyState, 'PRESERVED');
  assert.equal(out.view.output.operationAuthority, 'PROVEN_FOR_CLASSIFICATION');
  assert.deepEqual(out.view.attention, []);
});

test('active exact holder plus unresolved session never implies abandonment', () => {
  const out = project(evidence({sessionState: 'UNKNOWN'}));
  assert.equal(out.decision.recoveryDisposition, 'NEEDS_REVIEW');
  assert.equal(out.receipt.result, 'UNKNOWN');
  assert.equal(out.receipt.attentionDisposition, 'NEEDS_REVIEW');
  assert.equal(out.receipt.reasonCodes[0], 'HOLDER_AUTHORITY_UNRESOLVED');
  assert.equal(out.view.attention[0].constraint, 'NO_TAKEOVER_WITH_UNRESOLVED_HOLDER_AUTHORITY');
  assert.equal(out.view.attention[0].nextPhase, 'SEMANTIC_REVIEW');
});

test('absent session plus exact preserved dirty state classifies abandoned lease release', () => {
  const out = project(evidence({sessionState: 'ABSENT'}));
  assert.equal(out.decision.recoveryDisposition, 'ABANDONED_LEASE_RELEASE');
  assert.equal(out.receipt.result, 'PASS');
  assert.equal(
    out.receipt.nextLegalAction,
    'RELEASE_PRIOR_D013_THROUGH_EXISTING_OWNER_THEN_REACQUIRE_REBIND',
  );
  assert.equal(out.view.output.operationAuthority, 'PROVEN_FOR_CLASSIFICATION');
});

test('dirty scope unknown fails closed', () => {
  const out = project(evidence({sessionState: 'ABSENT', dirtyScopeState: 'UNKNOWN'}));
  assert.equal(out.decision.recoveryDisposition, 'UNKNOWN');
  assert.equal(out.receipt.result, 'UNKNOWN');
  assert.ok(out.receipt.requiredUnknowns.includes('DIRTY_SCOPE_UNRESOLVED'));
});

test('dirty scope conflict is conflict', () => {
  const out = project(evidence({dirtyScopeState: 'CONFLICT'}));
  assert.equal(out.decision.recoveryDisposition, 'CONFLICT');
  assert.equal(out.receipt.result, 'CONFLICT');
  assert.ok(out.receipt.conflicts.includes('DIRTY_SCOPE_CONFLICT'));
});

test('remote branch advancement requires semantic review', () => {
  const out = project(evidence({remoteBranchState: 'ADVANCED'}));
  assert.equal(out.decision.recoveryDisposition, 'NEEDS_REVIEW');
  assert.equal(out.receipt.result, 'UNKNOWN');
  assert.equal(out.receipt.reasonCodes[0], 'REMOTE_BRANCH_ADVANCED_REQUIRES_REVIEW');
});

test('published PR requires semantic review', () => {
  const out = project(evidence({prState: 'OPEN_EXACT'}));
  assert.equal(out.decision.recoveryDisposition, 'NEEDS_REVIEW');
  assert.equal(out.receipt.result, 'UNKNOWN');
  assert.equal(out.receipt.reasonCodes[0], 'PR_ALREADY_PUBLISHED_REQUIRES_REVIEW');
});

test('merged PR is a recovery conflict', () => {
  const out = project(evidence({prState: 'MERGED_EXACT'}));
  assert.equal(out.decision.recoveryDisposition, 'CONFLICT');
  assert.equal(out.receipt.result, 'CONFLICT');
  assert.ok(out.receipt.conflicts.includes('EFFECT_ALREADY_MERGED'));
});

test('blocked D013 release stays blocked for abandoned-session path', () => {
  const out = project(evidence({sessionState: 'ABSENT', releaseEligibility: 'BLOCKED'}));
  assert.equal(out.decision.recoveryDisposition, 'BLOCKED');
  assert.equal(out.receipt.result, 'BLOCKED');
  assert.ok(out.receipt.blockers.includes('D013_RELEASE_NOT_ELIGIBLE'));
});

test('release eligibility unknown cannot become abandoned-release PASS', () => {
  const out = project(evidence({sessionState: 'ABSENT', releaseEligibility: 'UNKNOWN'}));
  assert.equal(out.decision.recoveryDisposition, 'UNKNOWN');
  assert.equal(out.receipt.result, 'UNKNOWN');
  assert.ok(out.receipt.requiredUnknowns.includes('D013_RELEASE_ELIGIBILITY_UNRESOLVED'));
});

test('released lease plus clean exact stale holder classifies clean abort only', () => {
  const out = project(evidence({
    sessionState: 'ABSENT',
    leaseState: 'ABSENT_EXACT',
    workspaceState: 'CLEAN',
    dirtyScopeState: 'NOT_APPLICABLE',
    releaseEligibility: 'NOT_APPLICABLE',
  }));
  assert.equal(out.decision.recoveryDisposition, 'CLEAN_ABORT');
  assert.equal(out.receipt.result, 'PASS');
  assert.equal(out.receipt.nextLegalAction, 'CLEANUP_STALE_HOLDER_THROUGH_EXISTING_OWNER');
});

test('released lease plus dirty state is not clean-abort takeover', () => {
  const out = project(evidence({
    sessionState: 'ABSENT',
    leaseState: 'ABSENT_EXACT',
    releaseEligibility: 'NOT_APPLICABLE',
  }));
  assert.equal(out.decision.recoveryDisposition, 'NEEDS_REVIEW');
  assert.equal(out.receipt.reasonCodes[0], 'DIRTY_STATE_WITHOUT_ACTIVE_LEASE');
});

test('live session without active lease is conflict', () => {
  const out = project(evidence({
    leaseState: 'ABSENT_EXACT',
    workspaceState: 'CLEAN',
    dirtyScopeState: 'NOT_APPLICABLE',
    releaseEligibility: 'NOT_APPLICABLE',
  }));
  assert.equal(out.decision.recoveryDisposition, 'CONFLICT');
  assert.ok(out.receipt.conflicts.includes('LIVE_SESSION_WITHOUT_ACTIVE_LEASE'));
});

test('active lease without exact holder cannot classify abandonment', () => {
  const out = project(evidence({sessionState: 'ABSENT', holderState: 'ABSENT_EXACT'}));
  assert.equal(out.decision.recoveryDisposition, 'NEEDS_REVIEW');
  assert.equal(out.receipt.reasonCodes[0], 'ACTIVE_LEASE_WITHOUT_EXACT_HOLDER');
});

test('clean workspace and dirty-scope claim conflict fail closed', () => {
  const out = project(evidence({
    workspaceState: 'CLEAN',
    dirtyScopeState: 'EXACT',
  }));
  assert.equal(out.decision.recoveryDisposition, 'CONFLICT');
  assert.ok(out.receipt.conflicts.includes('DIRTY_SCOPE_STATE_CONFLICT'));
});

test('receipt and view grant no effect authority', () => {
  const out = project(evidence());
  for (const key of [
    'mutationAuthorized', 'executionAuthorized', 'mergeAuthorized',
    'releaseAuthorized', 'productionAuthorized', 'runtimeAuthorityGranted',
    'securityAuthorityGranted',
  ]) assert.equal(out.receipt[key], false);
  assert.equal(out.view.nextLegalAction, 'IMPLEMENTATION_CONTINUE_WITH_EXISTING_OWNER');
});

test('unsupported age or timestamp fields are rejected', () => {
  assert.throws(
    () => owner.normalizeEvidence({...evidence(), ageSeconds: 60}),
    (error) => error.reasonCodes.includes('INPUT_FIELD_UNSUPPORTED:input.ageSeconds'),
  );
  assert.throws(
    () => owner.normalizeEvidence({...evidence(), timestamp: '2026-09-21T00:00:00Z'}),
    (error) => error.reasonCodes.includes('INPUT_FIELD_UNSUPPORTED:input.timestamp'),
  );
});

test('raw holder claim escape hatch is rejected', () => {
  assert.throws(
    () => owner.normalizeEvidence({...evidence(), holderClaim: 'opaque'}),
    (error) => error.reasonCodes.includes('INPUT_FIELD_UNSUPPORTED:input.holderClaim'),
  );
});

test('sensitive locator material is rejected', () => {
  const input = evidence({locators: {session: 'token=do-not-emit'}});
  assert.throws(
    () => owner.normalizeEvidence(input),
    (error) => error.reasonCodes.includes('INPUT_FIELD_SENSITIVE:locators.session'),
  );
});

test('input is byte bounded', () => {
  const input = evidence({subject: 'fixture:' + 'a'.repeat(owner.MAX_INPUT_BYTES)});
  assert.throws(
    () => owner.normalizeEvidence(input),
    (error) => error.reasonCodes.includes('INPUT_TOO_LARGE'),
  );
});

test('implementation source is pure and has no live evidence/effect surface', () => {
  const source = fs.readFileSync(path.join(__dirname, '../effect-recovery.cjs'), 'utf8');
  for (const forbidden of [
    "require('node:fs')",
    'node:child_process',
    'process.env',
    'process.cwd',
    'fetch(',
    'Date.now',
    'new Date',
    'setTimeout(',
    '.spawn(',
    '.exec(',
    'cleanupStale(',
    'lease-release --dispatch',
  ]) assert.equal(source.includes(forbidden), false, forbidden);
});

test('only reviewed recovery disposition vocabulary is exported', () => {
  assert.deepEqual(owner.DISPOSITIONS, [
    'SAME_SESSION_RESUME',
    'ABANDONED_LEASE_RELEASE',
    'CLEAN_ABORT',
    'NEEDS_REVIEW',
    'BLOCKED',
    'UNKNOWN',
    'CONFLICT',
  ]);
});
