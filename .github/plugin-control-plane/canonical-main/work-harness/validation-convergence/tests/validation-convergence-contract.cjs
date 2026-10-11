'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const convergence = require('../validation-convergence.cjs');
const stageReceipt = require('../../stage-receipt.cjs');
const attention = require('../../validation-attention/validation-attention-owner.cjs');

const PACKET = 4001;
const PR = 4002;
const MAIN = '1'.repeat(40);
const OLD = '2'.repeat(40);
const LIVE = '3'.repeat(40);
const DIFF_A = 'a'.repeat(64);
const DIFF_B = 'b'.repeat(64);
const PATHS = ['src/a.js'];

function implementationReceipt({
  head = LIVE,
  diff = DIFF_A,
  gateLocator = 'issue:#4001',
  proofLocator = 'issue:#4001',
} = {}) {
  return stageReceipt.projectStageReceipt({
    schemaVersion: 1,
    packetNumber: PACKET,
    stage: 'IMPLEMENTATION_PR',
    authorityRefs: [
      {kind: 'COMMIT', locator: 'candidate-head', identity: head},
      {kind: 'GIT_REF', locator: 'refs/heads/main', identity: MAIN},
      {kind: 'PR', locator: 'pr:#' + PR, identity: head},
      {kind: 'WORKFLOW_RUN', locator: 'run:12345', identity: head},
    ],
    requiredGates: [
      {name: 'Required', result: 'PASS', evidenceLocator: 'run:12345/job:67890'},
      {name: 'owner-ci', result: 'PASS', evidenceLocator: 'run:12345'},
      {name: 'coordination-not-applicable', result: 'NOT_APPLICABLE',
        evidenceLocator: 'issue:#' + PACKET},
      {name: 'currentization-scope-and-blob-preservation', result: 'PASS',
        evidenceLocator: gateLocator},
    ],
    scope: {
      paths: PATHS,
      diffRequired: true,
      diffIdentity: diff,
      diffEvidenceLocator: 'pr:#' + PR,
    },
    proof: [
      {term: 'IMPLEMENTED', evidenceLocator: 'commit:' + head},
      {term: 'CONTRACT_PROVEN', evidenceLocator: proofLocator},
    ],
    requiredUnknowns: [],
    conflicts: [],
    blockers: [],
    dependencies: [],
    nextLegalAction: 'VALIDATION_MERGE',
  });
}

function comment(receipt) {
  return {body: stageReceipt.renderStageReceipt(receipt)};
}

function throwsKind(fn, kind, reason) {
  let caught = null;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, 'expected error');
  assert.equal(caught.kind, kind);
  if (reason) assert.ok(caught.reasonCodes.includes(reason));
}

function cliContract() {
  assert.deepEqual(
    convergence.parseArgs(['inspect', '--packet', '#12', '--pr', '13']),
    {command: 'inspect', packetNumber: 12, prNumber: 13, format: 'agent-view'},
  );
  assert.deepEqual(
    convergence.parseArgs(['finalize', '--packet', '12', '--pr', '13', '--format', 'receipt']),
    {command: 'finalize', packetNumber: 12, prNumber: 13, format: 'receipt'},
  );
  for (const argv of [
    ['inspect', '--packet', '12', '--pr', '13', '--implementation-receipt-file', '/tmp/x'],
    ['inspect', '--packet', '12', '--pr', '13', '--repo', 'other/repo'],
    ['inspect', '--packet', '12', '--pr', '13', '--head', LIVE],
    ['inspect', '--packet', '12', '--pr', '13', '--command', 'anything'],
    ['inspect', '--packet', '12', '--pr', '13', '--format', 'raw'],
    ['merge', '--packet', '12', '--pr', '13'],
  ]) {
    assert.throws(() => convergence.parseArgs(argv));
  }
}

function liveHeadSelectionContract() {
  const oldReceipt = implementationReceipt({head: OLD});
  const liveReceipt = implementationReceipt({head: LIVE});
  const selected = convergence.selectCurrentImplementationReceipt({
    comments: [comment(oldReceipt), comment(liveReceipt)],
    packetNumber: PACKET,
    prNumber: PR,
    liveHead: LIVE,
  });
  assert.equal(selected.receipt.receiptDigest, liveReceipt.receiptDigest);
  assert.equal(selected.candidate.headSha, LIVE);
}

function historicalOnlyFailsClosed() {
  const oldReceipt = implementationReceipt({head: OLD});
  throwsKind(
    () => convergence.selectCurrentImplementationReceipt({
      comments: [comment(oldReceipt)],
      packetNumber: PACKET,
      prNumber: PR,
      liveHead: LIVE,
    }),
    'NEEDS_REVIEW',
    'CANONICAL_CANDIDATE_RECEIPT_MISSING',
  );
}

function malformedCanonicalEvidenceFailsClosed() {
  const liveReceipt = implementationReceipt({head: LIVE});
  const malformed = stageReceipt.renderStageReceipt(liveReceipt)
    .replace(liveReceipt.receiptDigest, 'f'.repeat(64));
  throwsKind(
    () => convergence.selectCurrentImplementationReceipt({
      comments: [{body: malformed}, comment(liveReceipt)],
      packetNumber: PACKET,
      prNumber: PR,
      liveHead: LIVE,
    }),
    'UNKNOWN',
    'CANONICAL_STAGE_EVIDENCE_INVALID',
  );
}

function conflictingLiveHeadFailsClosed() {
  const left = implementationReceipt({head: LIVE, diff: DIFF_A});
  const right = implementationReceipt({head: LIVE, diff: DIFF_B});
  throwsKind(
    () => convergence.selectCurrentImplementationReceipt({
      comments: [comment(left), comment(right)],
      packetNumber: PACKET,
      prNumber: PR,
      liveHead: LIVE,
    }),
    'CONFLICT',
    'VALIDATION_CHECKPOINT_CONFLICT',
  );
}

function equivalentVariantUsesExistingReducer() {
  const left = implementationReceipt({
    head: LIVE,
    gateLocator: 'issue:#5001',
    proofLocator: 'issue:#5001',
  });
  const right = implementationReceipt({
    head: LIVE,
    gateLocator: 'issue:#5002',
    proofLocator: 'issue:#5002',
  });
  assert.notEqual(left.receiptDigest, right.receiptDigest);
  const expected = [left.receiptDigest, right.receiptDigest].sort()[0];
  const selected = convergence.selectCurrentImplementationReceipt({
    comments: [comment(right), comment(left)],
    packetNumber: PACKET,
    prNumber: PR,
    liveHead: LIVE,
  });
  assert.equal(selected.candidate.receiptDigest, expected);
  assert.equal(selected.receipt.receiptDigest, expected);
}

async function inspectDelegatesSelectedReceiptUnchanged() {
  const liveReceipt = implementationReceipt({head: LIVE});
  let captured = null;
  const fakeAttention = {
    ...attention,
    inspectComposition: async (input) => {
      captured = input.implementationReceipt;
      return {receipt: {result: 'PASS'}, report: {output: {mergeAdmission: 'READY'}}};
    },
  };
  const deps = {...convergence.DEFAULT_DEPS, attention: fakeAttention};
  const client = {
    async api(endpoint) {
      if (endpoint === '/pulls/' + PR) {
        return {
          number: PR,
          state: 'open',
          head: {sha: LIVE, repo: {full_name: 'hanmiyoo10-alt/-'}},
          merge_commit_sha: null,
        };
      }
      if (endpoint.startsWith('/issues/' + PACKET + '/comments?')) {
        return [comment(liveReceipt)];
      }
      throw new Error('unexpected endpoint ' + endpoint);
    },
  };
  const result = await convergence.inspectWithClient({
    client,
    packetNumber: PACKET,
    prNumber: PR,
    deps,
    root: process.cwd(),
  });
  assert.equal(result.receipt.result, 'PASS');
  assert.deepEqual(captured, liveReceipt);
}

async function finalizeDelegatesOnlyIdentity() {
  let captured = null;
  const fakeAttention = {
    ...attention,
    finalizeComposition: async (input) => {
      captured = input;
      return {receipt: {result: 'PASS'}, report: {output: {finalization: 'ALREADY_FINALIZED'}}};
    },
  };
  const deps = {...convergence.DEFAULT_DEPS, attention: fakeAttention};
  const client = {api: async () => { throw new Error('should not read in wrapper'); }};
  const result = await convergence.finalizeWithClient({
    client,
    packetNumber: PACKET,
    prNumber: PR,
    deps,
    root: '/tmp/example-root',
  });
  assert.equal(result.receipt.result, 'PASS');
  assert.equal(captured.client, client);
  assert.equal(captured.packetNumber, PACKET);
  assert.equal(captured.prNumber, PR);
  assert.equal(captured.root, '/tmp/example-root');
  assert.deepEqual(Object.keys(captured).sort(), ['client','packetNumber','prNumber','root']);
}

async function boundedCommentReadContract() {
  let calls = 0;
  const client = {
    async api(endpoint) {
      calls += 1;
      assert.ok(endpoint.startsWith('/issues/' + PACKET + '/comments?per_page=100&page='));
      return calls === 1 ? Array.from({length: 100}, () => ({body: 'x'})) : [{body: 'y'}];
    },
  };
  const rows = await convergence.readPacketComments(client, PACKET);
  assert.equal(rows.length, 101);
  assert.equal(calls, 2);
  assert.equal(convergence.MAX_COMMENT_PAGES, 20);
  assert.equal(convergence.PAGE_SIZE, 100);
}

function sourceAuthorityCeilingContract() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'validation-convergence.cjs'), 'utf8');
  for (const forbidden of [
    "require('node:child_process')",
    'workflow_dispatch',
    'merge_pull_request',
    'update_ref',
    'create_commit',
    'git merge',
    'git rebase',
    'implementation-receipt-file',
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
  assert.ok(source.includes('continuation.collectCanonicalCandidates'));
  assert.ok(source.includes('continuation.reduceCandidates'));
  assert.ok(source.includes('attention.inspectComposition'));
  assert.ok(source.includes('attention.finalizeComposition'));
  assert.ok(source.includes('stageReceipt.parseRenderedStageReceipt'));
}

function manifestRegistrationContract() {
  const manifestPath = path.resolve(
    __dirname, '../../../../../tooling/ci-summary/manifests/plugin-control-plane.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const matches = manifest.checks.filter(
    (row) => row.name === 'work-harness-validation-convergence-contract');
  assert.equal(matches.length, 1);
  assert.deepEqual(matches[0].command, [
    'node',
    '.github/plugin-control-plane/canonical-main/work-harness/validation-convergence/tests/validation-convergence-contract.cjs',
  ]);
}

async function main() {
  cliContract();
  liveHeadSelectionContract();
  historicalOnlyFailsClosed();
  malformedCanonicalEvidenceFailsClosed();
  conflictingLiveHeadFailsClosed();
  equivalentVariantUsesExistingReducer();
  await inspectDelegatesSelectedReceiptUnchanged();
  await finalizeDelegatesOnlyIdentity();
  await boundedCommentReadContract();
  sourceAuthorityCeilingContract();
  manifestRegistrationContract();
  console.log('validation-convergence-contract: ok');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
