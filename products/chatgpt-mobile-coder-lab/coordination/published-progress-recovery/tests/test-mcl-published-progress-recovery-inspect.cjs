'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const owner = require('../mcl-published-progress-recovery-inspect.cjs');

function observation(overrides = {}) {
  const base = {
    packet: {
      packetRef: '#2744',
      exact: true,
      reasons: [],
      projection: {interactionStage: 'VALIDATION_MERGE'},
      pathScopes: ['path:docs/a.md'],
    },
    leaseRead: {
      state: 'ACTIVE_EXACT',
      lease: {
        leaseId: 'a'.repeat(64),
        executor: 'S',
        observedBaseSha: '1'.repeat(40),
        workspace: {
          kind: 'repository',
          branch: 'server/mcl-packet-2744',
          worktree: '/root/nyang-worktrees/mcl-packet-2744',
        },
      },
      reasons: [],
    },
    manifestRead: {state: 'EXACT', manifest: {manifestId: 'b'.repeat(64)}, reasons: []},
    holderRead: {state: 'PRESENT_EXACT', reasons: []},
    sessionRead: {state: 'ABSENT', reasons: []},
    gitRead: {
      workspaceState: 'CLEAN',
      publishedIdentityState: 'EXACT',
      descendantState: 'PROVEN',
      head: '2'.repeat(40),
      reasons: [],
    },
    prRead: {prState: 'OPEN_EXACT', changedPathsState: 'EXACT', locator: 'pr:#2565', reasons: []},
    releaseRead: {state: 'PROVEN', reasons: []},
    currentBarrierExact: true,
    reasonCodes: [],
  };
  return {...base, ...overrides};
}
const writer = {
  writeReport() { return 'local-artifact:fixture/report.json#sha256=' + 'c'.repeat(64); },
  writeDecision() { return 'local-artifact:fixture/decision.json#sha256=' + 'd'.repeat(64); },
};
async function inspect(obs) {
  return owner.inspectPacket(2744, {collectObservation: async () => obs, artifactWriter: writer});
}

for (const executor of ['S', 'M']) {
  test('normalized ' + executor + ' published-progress fixture passes', async () => {
    const obs = observation();
    obs.leaseRead.lease.executor = executor;
    const out = await inspect(obs);
    assert.equal(out.decision.result, 'PASS');
    assert.equal(out.decision.recoveryDisposition, 'PUBLISHED_PROGRESS_REBIND_ELIGIBLE');
  });
}
test('session PRESENT maps to non-positive takeover block', async () => {
  const out = await inspect(observation({sessionRead: {state: 'PRESENT', reasons: ['OWNER_SESSION_PRESENT']}}));
  assert.equal(out.decision.result, 'UNKNOWN');
  assert.equal(out.decision.reasonCode, 'OWNER_SESSION_PRESENT');
});
test('session UNKNOWN remains unknown', async () => {
  const out = await inspect(observation({sessionRead: {state: 'UNKNOWN', reasons: ['SESSION_TOPOLOGY_UNRESOLVED']}}));
  assert.equal(out.decision.result, 'UNKNOWN');
});
test('unsupported session owner receipt is unknown', () => {
  assert.deepEqual(
    owner.sessionStateFromReceipt(
      {owner: 'mcl-rdc-session-evidence', executor: 'X', status: 'PASS', sessionState: 'ABSENT'},
      'S',
    ),
    {state: 'UNKNOWN', reasons: ['SESSION_OWNER_IDENTITY_UNRESOLVED']},
  );
});
test('exact PR identity requires same repository open non-draft head and exact paths', () => {
  const lease = observation().leaseRead.lease;
  const packet = observation().packet;
  const gitRead = observation().gitRead;
  const pr = {
    number: 99,
    state: 'open',
    draft: false,
    base: {ref: 'main'},
    head: {ref: lease.workspace.branch, sha: gitRead.head, repo: {full_name: 'hanmiyoo10-alt/-'}},
  };
  const result = owner.prIdentityObservation(
    {complete: true, rows: [pr]},
    lease,
    packet,
    gitRead,
    (command, args) => {
      assert.equal(command, 'gh');
      return {code: 0, stdout: JSON.stringify([{filename: 'docs/a.md'}]), stderr: ''};
    },
  );
  assert.equal(result.prState, 'OPEN_EXACT');
  assert.equal(result.changedPathsState, 'EXACT');
});
test('second PR identity conflicts', () => {
  const result = owner.prIdentityObservation(
    {complete: true, rows: [{number: 1}, {number: 2}]},
    observation().leaseRead.lease,
    observation().packet,
    observation().gitRead,
  );
  assert.equal(result.prState, 'CONFLICT');
});
test('changed file mismatch conflicts', () => {
  const lease = observation().leaseRead.lease;
  const packet = observation().packet;
  const gitRead = observation().gitRead;
  const pr = {
    number: 99,
    state: 'open',
    draft: false,
    base: {ref: 'main'},
    head: {ref: lease.workspace.branch, sha: gitRead.head, repo: {full_name: 'hanmiyoo10-alt/-'}},
  };
  const result = owner.prIdentityObservation(
    {complete: true, rows: [pr]},
    lease,
    packet,
    gitRead,
    () => ({code: 0, stdout: JSON.stringify([{filename: 'docs/b.md'}]), stderr: ''}),
  );
  assert.equal(result.changedPathsState, 'CONFLICT');
});
test('CLI is fixed and rejects caller repo session worktree selectors', () => {
  assert.deepEqual(
    owner.parseArgs(['inspect', '--packet', '#2744', '--format', 'agent-view']),
    {packetNumber: 2744, format: 'agent-view'},
  );
  for (const extra of [
    ['--repo', 'x/y'], ['--pid', '1'], ['--session', 'ABSENT'],
    ['--worktree', '/tmp/x'], ['--branch', 'x'],
  ]) {
    assert.throws(() => owner.parseArgs(['inspect', '--packet', '#2744', '--format', 'agent-view', ...extra]));
  }
});
test('sanitized report excludes process and holder capability material', () => {
  const out = owner.sanitizedReport(observation(), {
    recoveryDisposition: 'PUBLISHED_PROGRESS_REBIND_ELIGIBLE',
    result: 'PASS',
    publishedProgress: 'EXACT_PRESERVED',
    reasonCode: null,
    nextLegalAction: 'PUBLISHED_PROGRESS_RECOVERY_EFFECT_REVIEW',
  });
  const text = JSON.stringify(out);
  for (const forbidden of [
    'claimDigest', 'holderClaim', 'cmdline', 'ppid', 'pid',
    'device_id', 'auth_token', 'processTree', 'environment',
  ]) assert.equal(text.includes(forbidden), false, forbidden);
});
test('source consumes reviewed session owner and exposes no mutation surface', () => {
  const source = fs.readFileSync(path.join(__dirname, '../mcl-published-progress-recovery-inspect.cjs'), 'utf8');
  assert.match(source, /rdc-session-evidence\/mcl-rdc-session-evidence\.cjs/);
  for (const forbidden of [
    'claimHolder(', 'releaseHolder(', 'cleanupStale(', 'dispatchPlan(',
    'git push', 'git reset', 'git merge', 'merge_pull_request', 'lease-acquire',
  ]) assert.equal(source.includes(forbidden), false, forbidden);
});
