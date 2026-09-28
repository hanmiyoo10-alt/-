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
    {id: 13, body: handoff.renderManifest(child)},
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
});test('source contains no source/commit/push/merge or lease-holder mutation calls', () => {
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
