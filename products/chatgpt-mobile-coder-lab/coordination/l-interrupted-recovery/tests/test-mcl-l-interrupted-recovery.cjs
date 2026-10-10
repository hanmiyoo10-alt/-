#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const owner = require('../mcl-l-interrupted-recovery.cjs');

function session(overrides = {}) {
  return {
    schema: 'mcl-l-rdc-session-evidence.v1',
    status: 'PASS',
    executor: 'L',
    sessionState: 'ABSENT',
    reasonCode: 'SOLE_RDC_COMMAND_SESSION',
    owner: 'mcl-l-rdc-session-evidence',
    details: 'withheld',
    authority: {
      repositoryMutationAuthorized: false,
      deviceMutationAuthorized: false,
      mergeAuthorized: false,
      releaseAuthorized: false,
      productionAuthorized: false,
    },
    ...overrides,
  };
}

function locators() {
  return {
    packet: 'issue:#3473',
    lease: 'issue:#2352',
    manifest: 'receipt:mcl-task-manifest:3473',
    holder: 'receipt:mcl-workspace-holder:3473',
    workspace: 'receipt:mcl-recovery-workspace:3473',
    dirtyScope: 'receipt:mcl-recovery-dirty-scope:3473',
    gitIdentity: 'commit:f36a04355b9a17f05c96da929a9e6b925044f1e5',
    remoteBranch: 'receipt:mcl-recovery-remote-branch:3473',
    pr: 'receipt:mcl-recovery-pr-state:3473',
    releaseEligibility: 'receipt:mcl-d013-release-plan:3473',
  };
}

function facts(overrides = {}) {
  return {
    schemaVersion: 1,
    mode: 'EFFECT_RECOVERY_EVIDENCE',
    subject: 'issue:#3473',
    packetState: 'EXACT',
    leaseState: 'ACTIVE_EXACT',
    manifestState: 'EXACT',
    holderState: 'PRESENT_EXACT',
    workspaceState: 'DIRTY_PRESERVED',
    dirtyScopeState: 'EXACT',
    gitIdentityState: 'EXACT',
    remoteBranchState: 'UNCHANGED_BASE',
    prState: 'ABSENT',
    releaseEligibility: 'PROVEN',
    locators: {...locators()},
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    schemaVersion: 1,
    mode: owner.MODE,
    recoveryFacts: facts(),
    sessionEvidence: session(),
    sessionEvidenceLocator: 'receipt:mcl-l-rdc-session-evidence:3473',
    sourceRefs: ['issue:#3473', 'issue:#3481', 'issue:#3486'],
    ...overrides,
  };
}

test('exact ABSENT receipt maps to generic ABSENT and core abandoned-release classification', () => {
  const out = owner.composeRecovery(input());
  assert.equal(out.evidence.sessionState, 'ABSENT');
  assert.equal(out.decision.recoveryDisposition, 'ABANDONED_LEASE_RELEASE');
  assert.equal(
    out.output.nextLegalAction,
    'RELEASE_PRIOR_D013_THROUGH_EXISTING_OWNER_THEN_REACQUIRE_REBIND'
  );
  assert.equal(out.output.status, 'PASS');
});

test('PRESENT receipt maps to generic UNKNOWN and never LIVE', () => {
  const out = owner.composeRecovery(input({
    sessionEvidence: session({
      sessionState: 'PRESENT',
      reasonCode: 'OTHER_RDC_COMMAND_SESSION_PRESENT',
    }),
  }));
  assert.equal(out.evidence.sessionState, 'UNKNOWN');
  assert.notEqual(out.evidence.sessionState, 'LIVE');
  assert.equal(out.decision.recoveryDisposition, 'NEEDS_REVIEW');
  assert.equal(out.decision.reasonCode, 'HOLDER_AUTHORITY_UNRESOLVED');
});

test('UNKNOWN receipt remains generic UNKNOWN', () => {
  const out = owner.composeRecovery(input({
    sessionEvidence: session({
      status: 'UNKNOWN',
      sessionState: 'UNKNOWN',
      reasonCode: 'RDC_AGENT_TOPOLOGY_AMBIGUOUS',
    }),
  }));
  assert.equal(out.evidence.sessionState, 'UNKNOWN');
  assert.equal(out.output.mappedSessionState, 'UNKNOWN');
});

test('wrong session schema fails closed', () => {
  assert.throws(
    () => owner.composeRecovery(input({sessionEvidence: session({schema: 'wrong'})})),
    (error) => error.reasonCodes.includes('SESSION_SCHEMA_INVALID')
  );
});

test('wrong executor, owner or details fails closed', () => {
  for (const override of [
    {executor: 'S'},
    {owner: 'other'},
    {details: 'raw'},
  ]) {
    assert.throws(() => owner.composeRecovery(input({sessionEvidence: session(override)})));
  }
});

test('any true session authority flag fails closed', () => {
  const value = session();
  value.authority.releaseAuthorized = true;
  assert.throws(
    () => owner.composeRecovery(input({sessionEvidence: value})),
    (error) => error.reasonCodes.includes('SESSION_AUTHORITY_TRUE:releaseAuthorized')
  );
});

test('invalid session semantic tuples fail closed', () => {
  for (const value of [
    session({status: 'PASS', sessionState: 'UNKNOWN', reasonCode: 'X'}),
    session({status: 'PASS', sessionState: 'ABSENT', reasonCode: 'OTHER_RDC_COMMAND_SESSION_PRESENT'}),
    session({status: 'UNKNOWN', sessionState: 'PRESENT', reasonCode: 'X'}),
  ]) {
    assert.throws(() => owner.composeRecovery(input({sessionEvidence: value})));
  }
});

test('caller cannot supply generic sessionState', () => {
  const value = facts();
  value.sessionState = 'ABSENT';
  assert.throws(
    () => owner.composeRecovery(input({recoveryFacts: value})),
    (error) => error.reasonCodes.some((reason) =>
      reason.includes('sessionState') || reason === 'CALLER_SESSION_STATE_FORBIDDEN')
  );
});

test('caller cannot supply generic session locator', () => {
  const value = facts();
  value.locators.session = 'receipt:caller-selected';
  assert.throws(
    () => owner.composeRecovery(input({recoveryFacts: value})),
    (error) => error.reasonCodes.some((reason) =>
      reason.includes('locators.session') || reason === 'CALLER_SESSION_LOCATOR_FORBIDDEN')
  );
});

test('release BLOCKED remains BLOCKED even with ABSENT session', () => {
  const value = facts({releaseEligibility: 'BLOCKED'});
  const out = owner.composeRecovery(input({recoveryFacts: value}));
  assert.equal(out.decision.recoveryDisposition, 'BLOCKED');
  assert.equal(out.output.status, 'BLOCKED');
  assert.equal(out.decision.reasonCode, 'D013_RELEASE_NOT_ELIGIBLE');
});

test('release UNKNOWN remains UNKNOWN even with ABSENT session', () => {
  const value = facts({releaseEligibility: 'UNKNOWN'});
  const out = owner.composeRecovery(input({recoveryFacts: value}));
  assert.equal(out.decision.recoveryDisposition, 'UNKNOWN');
  assert.equal(out.decision.reasonCode, 'D013_RELEASE_ELIGIBILITY_UNRESOLVED');
});

test('remote advancement and open PR semantics remain core-owned', () => {
  const advanced = owner.composeRecovery(input({
    recoveryFacts: facts({remoteBranchState: 'ADVANCED'}),
  }));
  assert.equal(advanced.decision.recoveryDisposition, 'NEEDS_REVIEW');
  assert.equal(advanced.decision.reasonCode, 'REMOTE_BRANCH_ADVANCED_REQUIRES_REVIEW');

  const published = owner.composeRecovery(input({
    recoveryFacts: facts({prState: 'OPEN_EXACT'}),
  }));
  assert.equal(published.decision.recoveryDisposition, 'NEEDS_REVIEW');
  assert.equal(published.decision.reasonCode, 'PR_ALREADY_PUBLISHED_REQUIRES_REVIEW');
});

test('age, timestamp and latest-wins inputs are rejected', () => {
  for (const [key, value] of [
    ['ageSeconds', 1],
    ['timestamp', '2026-10-10T00:00:00Z'],
    ['latestWins', true],
  ]) {
    const top = input();
    top.recoveryFacts[key] = value;
    assert.throws(() => owner.composeRecovery(top));
  }
});

test('output grants no effect authority', () => {
  const out = owner.composeRecovery(input());
  for (const value of Object.values(out.output.authority)) assert.equal(value, false);
  assert.equal(out.output.details, 'withheld');
});

test('source contains no mutation, process-control, network or Git effect surface', () => {
  const source = fs.readFileSync(path.join(__dirname, '../mcl-l-interrupted-recovery.cjs'), 'utf8');
  for (const forbidden of [
    'node:child_process',
    'spawnSync',
    'execSync',
    'fetch(',
    'git ',
    'lease-release',
    'cleanup-stale',
    'process.kill',
    'kill(',
    'unlinkSync',
    'writeFileSync',
    'renameSync',
    'Date.now',
    'new Date',
  ]) assert.equal(source.includes(forbidden), false, forbidden);
});

test('CLI accepts JSON on stdin only and rejects argv selectors', () => {
  let output = '';
  const original = process.stdout.write;
  process.stdout.write = (text) => { output += text; return true; };
  try {
    const rc = owner.runCli(['--packet', '3473'], JSON.stringify(input()));
    assert.equal(rc, 64);
    assert.equal(JSON.parse(output).reasonCode, 'ARGUMENT_UNSUPPORTED');
  } finally {
    process.stdout.write = original;
  }
});

test('input is byte bounded', () => {
  const value = input({sourceRefs: ['x'.repeat(owner.MAX_INPUT_BYTES)]});
  assert.throws(
    () => owner.composeRecovery(value),
    (error) => error.reasonCodes.includes('INPUT_TOO_LARGE')
  );
});
