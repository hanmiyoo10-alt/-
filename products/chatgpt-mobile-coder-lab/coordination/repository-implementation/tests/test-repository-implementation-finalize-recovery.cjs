'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../../../../..');
const handoff = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));
const stageEntry = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/stage-entry/mcl-stage-entry.cjs'));
const taskLease = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs'));
const recovery = require('../mcl-repository-implementation-finalize-recovery.cjs');

const PACKET = 9001;
const PACKET_REF = '#9001';
const BODY_SHA = 'a'.repeat(64);
const BASE = '1'.repeat(40);
const HEAD = '2'.repeat(40);
const LEASE = 'b'.repeat(64);
const SCOPES = [
  'path:products/example/README.md',
  'path:products/example/finalize.cjs',
  'path:products/example/tests/test-finalize.cjs',
  'surface:mcl:repository-implementation-finalize-recovery',
];
const WORKSPACE = {
  kind: 'repository',
  branch: 'server/mcl-packet-9001',
  worktree: '/root/nyang-worktrees/mcl-packet-9001',
};function manifestInput(phaseId, inputRefs = []) {
  return {
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: PACKET_REF,
    packetBodySha256: BODY_SHA,
    phaseId,
    phaseClass: 'REPOSITORY_MUTATION',
    route: 'S',
    executor: 'S',
    scopes: SCOPES,
    workspace: WORKSPACE,
    observedBaseSha: BASE,
    leaseRequirement: 'REQUIRED',
    leaseEvidence: {
      ledgerRef: '#2352',
      leaseId: LEASE,
      acquiredGeneration: 10,
      acquireEvidenceRef: 'receipt:mcl-task-lease:' + LEASE + ':generation:10',
    },
    sourceAuthorityRefs: [PACKET_REF, 'issue:#2352'],
    inputRefs,
    expectedOutputRefs: SCOPES.filter((x) => x.startsWith('path:')),
    acceptanceRefs: [PACKET_REF, 'issue:#2352'],
    stopCondition: 'fixture',
    authority: {...handoff.AUTHORITY_FLAGS},
  };
}
function handoffText(manifest) {
  return stageEntry.renderHandoff({
    schema: 'mcl-execution-handoff.v1',
    status: 'HANDOFF_READY',
    packet_ref: PACKET_REF,
    phase: '1/1',
    route: 'S',
    executor: 'S',
    effect_class: 'repository_mutation',
    manifest_id: manifest.manifestId,
    lease_id: LEASE,
    next_owner: 'existing_route_owner',
    reason_codes: [],
    mutation_authorized: false,
    execution_authorized: false,
    details: 'withheld',
  });
}function fixture() {
  const historical = handoff.buildManifest(manifestInput(
    '9001-implementation-pr-stage-entry',
    ['commit:' + '0'.repeat(40), 'receipt:historical'],
  ));
  const parent = handoff.buildManifest(manifestInput(
    '9001-implementation-pr-stage-entry',
    ['commit:' + BASE, 'receipt:current'],
  ));
  const parentUrl = 'https://github.com/hanmiyoo10-alt/-/issues/9001#issuecomment-11';
  const handoffUrl = 'https://github.com/hanmiyoo10-alt/-/issues/9001#issuecomment-12';
  const child = handoff.buildManifest(manifestInput(
    '9001-implementation-pr-effect',
    [
      'commit:' + BASE,
      parentUrl,
      handoffUrl,
      'receipt:mcl-repository-patch-request:' + 'c'.repeat(64),
      'receipt:mcl-repository-validation-request:' + 'd'.repeat(64),
      'receipt:mcl-repository-validation-contract:' + 'e'.repeat(64),
      'receipt:mcl-implementation-validation-adapters:' + 'f'.repeat(64),
      'receipt:mcl-pr-publication-request:' + '1'.repeat(64),
      'receipt:mcl-task-lease:' + LEASE + ':generation:10',
    ],
  ));
  const comments = [
    {id: 1, body: handoff.renderManifest(historical)},
    {id: 11, body: handoff.renderManifest(parent)},
    {id: 12, body: handoffText(parent)},
    {id: 13, created_at: '2026-01-01T00:00:00Z', body: handoff.renderManifest(child)},
    {id: 14, body: handoffText(child)},
  ];
  const pair = recovery.selectManifestPair({
    comments, packet: PACKET, packetRef: PACKET_REF, bodyDigest: BODY_SHA,
  });
  const handoffs = recovery.selectHandoffPair({
    comments, packet: PACKET, packetRef: PACKET_REF,
    parent: pair.parent, child: pair.child,
  });  const ctx = {
    packet: PACKET,
    packetRef: PACKET_REF,
    mainSha: BASE,
    bodyDigest: BODY_SHA,
    requestedScopes: SCOPES,
    comments,
    parent: pair.parent,
    child: pair.child,
    handoffs,
    release: {
      evidence: {
        ledgerRef: '#2352',
        leaseId: LEASE,
        releasedGeneration: 11,
        evidenceRef: 'issue:#2352',
      },
    },
    workspace: {branch: WORKSPACE.branch, head: HEAD, remote: HEAD},
    pr: {
      number: 77,
      head: HEAD,
      changed: SCOPES.filter((x) => x.startsWith('path:')).map((x) => x.slice(5)),
      createdAt: '2026-01-01T00:00:00Z',
    },
  };
  recovery.validateManifestPair(ctx);
  return ctx;
}

test('linked child selects the current parent instead of historical same-phase manifest', () => {
  const ctx = fixture();
  assert.equal(ctx.parent.id, 11);
  assert.equal(ctx.child.id, 13);
  assert.equal(ctx.handoffs.parent.id, 12);
  assert.equal(ctx.handoffs.child.id, 14);
});

test('apply is explicit and inspect cannot carry apply', () => {
  assert.throws(() => recovery.parseArgs(['apply', '--packet', '#9']),
    /EXPLICIT_APPLY_REQUIRED/);
  assert.throws(() => recovery.parseArgs(['inspect', '--packet', '#9', '--apply']),
    /APPLY_NOT_ALLOWED_FOR_INSPECT/);
});test('missing child and parent receipts converge once and exact replay writes zero', () => {
  const ctx = fixture();
  const comments = [...ctx.comments];
  let nextId = 100;
  let writes = 0;
  const deps = {
    postComment(body) {
      comments.push({id: nextId++, body});
      writes += 1;
      return nextId - 1;
    },
    rereadComments() { return [...comments]; },
  };
  const first = recovery.convergeReceipts(ctx, deps);
  assert.equal(first.result, 'PASS');
  assert.equal(writes, 2);
  const parsed = recovery.parseReceiptRows(comments);
  assert.equal(parsed.length, 2);

  ctx.comments = comments;
  const second = recovery.convergeReceipts(ctx, deps);
  assert.equal(second.result, 'PASS');
  assert.equal(writes, 2);
});

test('exact duplicate receipt replay is idempotent but distinct variant conflicts', () => {
  const ctx = fixture();
  const expected = recovery.expectedChildReceipt(ctx);
  const text = handoff.renderCompletionReceipt(expected);
  const exact = [
    {id: 20, body: text},
    {id: 21, body: text},
  ];
  assert.equal(recovery.classifyReceipt(exact, ctx.child.value, expected).state, 'EXACT');

  const variant = handoff.buildCompletionReceipt(ctx.child.value, {
    disposition: expected.disposition,
    outputRefs: expected.outputRefs,
    validationRefs: [...expected.validationRefs, 'issue:#999'],
    observedRefs: expected.observedRefs,
    leaseDisposition: expected.leaseDisposition,
    leaseReleaseEvidence: expected.leaseReleaseEvidence,
    workspaceResult: expected.workspaceResult,
    blockerRefs: expected.blockerRefs,
    requiredUnknownRefs: expected.requiredUnknownRefs,
  });
  const rows = [...exact, {id: 22, body: handoff.renderCompletionReceipt(variant)}];
  assert.throws(() => recovery.classifyReceipt(rows, ctx.child.value, expected),
    /COMPLETION_RECEIPT_VARIANT_CONFLICT/);
});
test('same-main lineage fast path does not call compare', () => {
  const ctx = fixture();
  ctx.mainSha = ctx.child.value.observedBaseSha;
  let calls = 0;
  const result = recovery.validateEffectBaseLineage(ctx, () => {
    calls += 1;
    return {code: 1};
  });
  assert.equal(calls, 0);
  assert.equal(result.status, 'IDENTICAL');
  assert.equal(result.mergeBaseSha, ctx.mainSha);
});

test('moved-main lineage admits exact descendant compare only', () => {
  const ctx = fixture();
  const current = '9'.repeat(40);
  ctx.mainSha = current;
  const runner = (args) => {
    assert.deepEqual(args.slice(0, 2), ['gh', 'api']);
    assert.equal(args[2], 'repos/hanmiyoo10-alt/-/compare/' + BASE + '...' + current);
    return {code: 0, stdout: JSON.stringify({
      status: 'ahead',
      ahead_by: 2,
      behind_by: 0,
      base_commit: {sha: BASE},
      merge_base_commit: {sha: BASE},
      commits: [{sha: '8'.repeat(40)}, {sha: current}],
    })};
  };
  const result = recovery.validateEffectBaseLineage(ctx, runner);
  assert.equal(result.status, 'AHEAD');
  assert.equal(result.mergeBaseSha, BASE);
});

test('moved-main lineage rejects merge-base mismatch, behind/diverged and malformed evidence', () => {
  const current = '9'.repeat(40);
  const make = () => {
    const ctx = fixture();
    ctx.mainSha = current;
    return ctx;
  };
  const row = (overrides = {}) => ({
    status: 'ahead',
    ahead_by: 1,
    behind_by: 0,
    base_commit: {sha: BASE},
    merge_base_commit: {sha: BASE},
    commits: [{sha: current}],
    ...overrides,
  });
  const runnerFor = (value) => () => ({code: 0, stdout: JSON.stringify(value)});
  assert.throws(() => recovery.validateEffectBaseLineage(make(),
    runnerFor(row({merge_base_commit: {sha: '7'.repeat(40)}}))),
  /MAIN_LINEAGE_MERGE_BASE_CONFLICT/);
  for (const status of ['behind', 'diverged']) {
    assert.throws(() => recovery.validateEffectBaseLineage(make(),
      runnerFor(row({status, ahead_by: 0, behind_by: 1}))),
    /MAIN_LINEAGE_NOT_DESCENDANT/);
  }
  assert.throws(() => recovery.validateEffectBaseLineage(make(),
    runnerFor({status: 'ahead'})), /MAIN_LINEAGE_COMPARE_INVALID/);
});

test('released lease fast path uses current exact lastRelease without historical scan', () => {
  const ctx = fixture();
  ctx.ledger = {body: taskLease.renderLedger({
    schemaVersion: 1,
    scope: 'chatgpt-mobile-coder-lab',
    mode: 'MCL_TASK_LEASE_LEDGER',
    status: 'ACTIVE',
    generation: 11,
    controllerPath: 'products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs',
    controllerCommit: '1'.repeat(40),
    packetRef: '#2350',
    activeLeases: [],
    lastRelease: {leaseId: LEASE, releasedAtGeneration: 11},
  })};
  let calls = 0;
  const result = recovery.validateReleasedLease(ctx, () => { calls += 1; return {code: 1}; });
  assert.equal(calls, 0);
  assert.equal(result.evidence.releasedGeneration, 11);
  assert.equal(result.evidence.evidenceRef, 'issue:#2352');
});

test('rotated lastRelease accepts one exact historical successful release run', () => {
  const ctx = fixture();
  ctx.ledger = {body: taskLease.renderLedger({
    schemaVersion: 1,
    scope: 'chatgpt-mobile-coder-lab',
    mode: 'MCL_TASK_LEASE_LEDGER',
    status: 'ACTIVE',
    generation: 20,
    controllerPath: 'products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs',
    controllerCommit: '1'.repeat(40),
    packetRef: '#2350',
    activeLeases: [],
    lastRelease: {leaseId: 'c'.repeat(64), releasedAtGeneration: 20},
  })};
  const runner = (args) => {
    if (args[1] === 'run' && args[2] === 'list') {
      return {code: 0, stdout: JSON.stringify([
        {databaseId: 123, status: 'completed', conclusion: 'success'},
      ])};
    }
    if (args[1] === 'run' && args[2] === 'view') {
      return {code: 0, stdout: 'step\\t' + JSON.stringify({
        leaseId: LEASE, status: 'RELEASE_UPDATED', generation: 11,
      }) + '\\n'};
    }
    return {code: 1, stdout: ''};
  };
  const result = recovery.validateReleasedLease(ctx, runner);
  assert.equal(result.evidence.releasedGeneration, 11);
  assert.equal(result.evidence.evidenceRef, 'run:123');
});

test('active old lease blocks before historical release lookup', () => {
  const ctx = fixture();
  ctx.ledger = {body: taskLease.renderLedger({
    schemaVersion: 1,
    scope: 'chatgpt-mobile-coder-lab',
    mode: 'MCL_TASK_LEASE_LEDGER',
    status: 'ACTIVE',
    generation: 10,
    controllerPath: 'products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs',
    controllerCommit: '1'.repeat(40),
    packetRef: '#2350',
    activeLeases: [{
      leaseId: LEASE,
      packetRef: PACKET_REF,
      packetBodySha256: BODY_SHA,
      route: 'S',
      executor: 'S',
      scopes: SCOPES,
      scopeFingerprint: 'd'.repeat(64),
      scopeDisposition: 'DISJOINT',
      workspace: WORKSPACE,
      observedBaseSha: BASE,
      sourceRefs: [PACKET_REF],
    }],
    lastRelease: null,
  })};
  let calls = 0;
  assert.throws(() => recovery.validateReleasedLease(ctx, () => {
    calls += 1;
    return {code: 0, stdout: '[]'};
  }), /D013_LEASE_STILL_ACTIVE/);
  assert.equal(calls, 0);
});

test('missing or ambiguous historical release proof fails closed', () => {
  assert.throws(() => recovery.historicalReleaseEvidence(LEASE, 10, (args) => {
    if (args[1] === 'run' && args[2] === 'list') {
      return {code: 0, stdout: JSON.stringify([
        {databaseId: 123, status: 'completed', conclusion: 'success'},
      ])};
    }
    return {code: 0, stdout: 'no matching release\n'};
  }), /D013_RELEASE_NOT_PROVEN/);

  assert.throws(() => recovery.historicalReleaseEvidence(LEASE, 10, (args) => {
    if (args[1] === 'run' && args[2] === 'list') {
      return {code: 0, stdout: JSON.stringify([
        {databaseId: 123, status: 'completed', conclusion: 'success'},
        {databaseId: 124, status: 'completed', conclusion: 'success'},
      ])};
    }
    const runId = Number(args[3]);
    return {code: 0, stdout: JSON.stringify({
      leaseId: LEASE, status: 'RELEASE_UPDATED', generation: runId === 123 ? 11 : 12,
    }) + '\\n'};
  }), /D013_RELEASE_PROOF_AMBIGUOUS/);
});

test('historical run reads carry fixed bounded timeout options', () => {
  const seen = [];
  assert.throws(() => recovery.historicalReleaseEvidence(LEASE, 10, (args, options) => {
    seen.push({args, options});
    if (args[1] === 'run' && args[2] === 'list') {
      return {code: 0, stdout: JSON.stringify([
        {databaseId: 123, status: 'completed', conclusion: 'success'},
      ])};
    }
    return {code: 124, stdout: '', stderr: 'timeout'};
  }), /D013_RELEASE_NOT_PROVEN/);
  assert.equal(seen.length, 2);
  assert.equal(seen[0].options.timeout, 10000);
  assert.equal(seen[1].options.timeout, 5000);
});




test('historical release scan also narrows candidates by exact effect base', () => {
  const seen = [];
  const runner = (args) => {
    seen.push(args);
    if (args[1] === 'run' && args[2] === 'list') {
      return {code: 0, stdout: JSON.stringify([
        {databaseId: 123, status: 'completed', conclusion: 'success'},
      ])};
    }
    return {code: 0, stdout: 'step\t' + JSON.stringify({
      leaseId: LEASE, status: 'RELEASE_UPDATED', generation: 11,
    }) + '\n'};
  };
  const result = recovery.historicalReleaseEvidence(
    LEASE, 10, runner, () => 0, '2026-01-01T00:00:00Z', BASE);
  assert.equal(result.runId, 123);
  const commitIndex = seen[0].indexOf('--commit');
  assert.notEqual(commitIndex, -1);
  assert.equal(seen[0][commitIndex + 1], BASE);
});

test('invalid historical release effect base fails closed before GitHub read', () => {
  let calls = 0;
  assert.throws(() => recovery.historicalReleaseEvidence(
    LEASE, 10, () => { calls += 1; return {code: 0, stdout: '[]'}; },
    () => 0, '2026-01-01T00:00:00Z', 'not-a-sha'), /LEASE_RUN_BASE_INVALID/);
  assert.equal(calls, 0);
});

test('historical release scan uses exact PR creation time only as a fixed candidate lower bound', () => {
  const seen = [];
  const runner = (args) => {
    seen.push(args);
    if (args[1] === 'run' && args[2] === 'list') {
      return {code: 0, stdout: JSON.stringify([
        {databaseId: 123, status: 'completed', conclusion: 'success'},
      ])};
    }
    return {code: 0, stdout: 'step\t' + JSON.stringify({
      leaseId: LEASE, status: 'RELEASE_UPDATED', generation: 11,
    }) + '\n'};
  };
  const result = recovery.historicalReleaseEvidence(
    LEASE, 10, runner, () => 0, '2026-01-01T00:00:00Z');
  assert.equal(result.runId, 123);
  const createdIndex = seen[0].indexOf('--created');
  assert.notEqual(createdIndex, -1);
  assert.equal(seen[0][createdIndex + 1], '>=2026-01-01T00:00:00Z');
});

test('invalid historical release candidate window fails closed before GitHub read', () => {
  let calls = 0;
  assert.throws(() => recovery.historicalReleaseEvidence(
    LEASE, 10, () => { calls += 1; return {code: 0, stdout: '[]'}; },
    () => 0, 'not-a-time'), /LEASE_RUN_WINDOW_INVALID/);
  assert.equal(calls, 0);
});

test('historical release scan clamps log reads to remaining aggregate budget', () => {
  const times = [0, 0, 16000, 16000, 16000];
  const now = () => times.length ? times.shift() : 16000;
  const seen = [];
  const runner = (args, options) => {
    seen.push({args, options});
    if (args[1] === 'run' && args[2] === 'list') {
      return {code: 0, stdout: JSON.stringify([
        {databaseId: 123, status: 'completed', conclusion: 'success'},
      ])};
    }
    return {code: 0, stdout: 'step\\t' + JSON.stringify({
      leaseId: LEASE, status: 'RELEASE_UPDATED', generation: 11,
    }) + '\\n'};
  };
  const result = recovery.historicalReleaseEvidence(LEASE, 10, runner, now);
  assert.equal(result.runId, 123);
  assert.equal(seen[0].options.timeout, 10000);
  assert.equal(seen[1].options.timeout, 4000);
});

test('historical release scan aggregate exhaustion fails closed before another log read', () => {
  const times = [0, 0, 20000, 20000];
  const now = () => times.length ? times.shift() : 20000;
  let calls = 0;
  assert.throws(() => recovery.historicalReleaseEvidence(LEASE, 10, (args, options) => {
    calls += 1;
    assert.ok(options.timeout > 0);
    if (args[1] === 'run' && args[2] === 'list') {
      return {code: 0, stdout: JSON.stringify([
        {databaseId: 123, status: 'completed', conclusion: 'success'},
      ])};
    }
    return {code: 0, stdout: ''};
  }, now), /LEASE_RUN_SCAN_TIMEOUT/);
  assert.equal(calls, 1);
});

test('historical release proof rejects wrong lease status and stale generation', () => {
  const cases = [
    {leaseId: 'c'.repeat(64), status: 'RELEASE_UPDATED', generation: 11},
    {leaseId: LEASE, status: 'ACQUIRE_UPDATED', generation: 11},
    {leaseId: LEASE, status: 'RELEASE_UPDATED', generation: 10},
  ];
  for (const row of cases) {
    assert.throws(() => recovery.historicalReleaseEvidence(LEASE, 10, (args) => {
      if (args[1] === 'run' && args[2] === 'list') {
        return {code: 0, stdout: JSON.stringify([
          {databaseId: 123, status: 'completed', conclusion: 'success'},
        ])};
      }
      return {code: 0, stdout: JSON.stringify(row) + '\\n'};
    }), /D013_RELEASE_NOT_PROVEN/);
  }
});

test('source contains no source/commit/push/merge or lease-holder mutation calls', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../mcl-repository-implementation-finalize-recovery.cjs'), 'utf8');
  for (const forbidden of [
    'claimHolder(',
    'releaseHolder(',
    'releaseLease(',
    'create_pull_request',
    'merge_pull_request',
    "['push'",
    "['commit'",
    'git reset',
    'git clean',
    'git stash',
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
  assert.match(source, /taskHandoff\.buildCompletionReceipt/);
  assert.match(source, /D013_RELEASE_NOT_PROVEN/);
  assert.match(source, /HOLDER_NOT_ABSENT/);
  assert.match(source, /PR_CHANGED_PATHS_CONFLICT/);
});
