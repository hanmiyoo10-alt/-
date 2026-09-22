'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const owner = require('../validation-continuation-owner.cjs');
const stageReceipt = require('../../stage-receipt.cjs');

const MAIN = '1'.repeat(40);
const HEAD_A = '2'.repeat(40);
const HEAD_B = '3'.repeat(40);
const MERGE = '4'.repeat(40);
const DIFF_A = 'a'.repeat(64);
const DIFF_B = 'b'.repeat(64);
const PATHS = ['src/a.js', 'src/b.js'];

function baseEvidence(overrides = {}) {
  return {
    packetStage: 'VALIDATION_MERGE',
    prState: 'OPEN',
    candidateAttribution: 'EXACT',
    pathScope: 'EXACT',
    currentization: 'EXACT_CURRENT_MAIN',
    required: 'PASS',
    ownerCI: 'PASS',
    priorCoordination: 'CONVERGED',
    mergeEffect: 'ABSENT',
    ...overrides,
  };
}
function implementationReceipt({
  head = HEAD_A, diff = DIFF_A, main = MAIN, paths = PATHS,
  includeMain = true, includeWorkflow = true, workflowIdentity = null, extraGates = [],
} = {}) {
  const authorityRefs = [
    {kind: 'PR', locator: 'pr:#2464', identity: head},
    {kind: 'COMMIT', locator: 'commit:' + head, identity: head},
  ];
  if (includeMain) authorityRefs.push(
    {kind: 'GIT_REF', locator: 'refs/heads/main', identity: main});
  if (includeWorkflow) authorityRefs.push(
    {kind: 'WORKFLOW_RUN', locator: 'run:12345', identity: workflowIdentity || head});
  return stageReceipt.projectStageReceipt({
    schemaVersion: 1,
    packetNumber: 2463,
    stage: 'IMPLEMENTATION_PR',
    authorityRefs,
    requiredGates: [
      {name: 'Required', result: 'PASS', evidenceLocator: 'run:12345/job:67890'},
      {name: 'owner-ci', result: 'PASS', evidenceLocator: 'run:12345'},
      {name: 'coordination-released', result: 'PASS', evidenceLocator: 'issue:#2352'},
      ...extraGates,
    ],
    scope: {paths, diffRequired: true, diffIdentity: diff, diffEvidenceLocator: 'pr:#2464'},
    proof: [
      {term: 'IMPLEMENTED', evidenceLocator: 'commit:' + head},
      {term: 'CONTRACT_PROVEN', evidenceLocator: 'pr:#2464'},
    ],
    requiredUnknowns: [], conflicts: [], blockers: [], dependencies: [],
    nextLegalAction: 'VALIDATION_MERGE',
  });
}

assert.deepEqual(owner.RESUME_DISPOSITIONS, [
  'ALREADY_MERGED', 'MERGE_ADMISSION_READY', 'CURRENTIZATION_REQUIRED',
  'VALIDATION_REFRESH_REQUIRED', 'NEEDS_RECOVERY_INSPECT', 'BLOCKED',
  'NEEDS_REVIEW', 'UNKNOWN',
]);

let decision = owner.classifyContinuationEvidence(baseEvidence());
assert.equal(decision.resumeDisposition, 'MERGE_ADMISSION_READY');
assert.equal(decision.freshAdmissionRequired, true);
assert.equal(decision.nextLegalAction, 'VALIDATION_MERGE_ADMIT');

decision = owner.classifyContinuationEvidence(baseEvidence({
  prState: 'MERGED', mergeEffect: 'COMPLETE',
}));
assert.equal(decision.resumeDisposition, 'ALREADY_MERGED');
assert.equal(decision.freshAdmissionRequired, false);
assert.equal(decision.nextLegalAction, 'VALIDATION_MERGE_FINALIZE');

decision = owner.classifyContinuationEvidence(baseEvidence({currentization: 'STALE'}));
assert.equal(decision.resumeDisposition, 'CURRENTIZATION_REQUIRED');
decision = owner.classifyContinuationEvidence(baseEvidence({currentization: 'REPLAY_SAFE'}));
assert.equal(decision.resumeDisposition, 'MERGE_ADMISSION_READY');
decision = owner.classifyContinuationEvidence(baseEvidence({required: 'MISSING'}));
assert.equal(decision.resumeDisposition, 'VALIDATION_REFRESH_REQUIRED');
decision = owner.classifyContinuationEvidence(baseEvidence({ownerCI: 'MISSING'}));
assert.equal(decision.resumeDisposition, 'VALIDATION_REFRESH_REQUIRED');
decision = owner.classifyContinuationEvidence(baseEvidence({mergeEffect: 'AMBIGUOUS'}));
assert.equal(decision.resumeDisposition, 'NEEDS_RECOVERY_INSPECT');
decision = owner.classifyContinuationEvidence(baseEvidence({candidateAttribution: 'CONFLICT'}));
assert.equal(decision.resumeDisposition, 'NEEDS_REVIEW');
assert.ok(decision.reasonCodes.includes('VALIDATION_CHECKPOINT_CONFLICT'));
decision = owner.classifyContinuationEvidence(baseEvidence({candidateAttribution: 'MISSING'}));
assert.equal(decision.resumeDisposition, 'NEEDS_REVIEW');
assert.ok(decision.reasonCodes.includes('CANDIDATE_HEAD_ATTRIBUTION_UNKNOWN'));
decision = owner.classifyContinuationEvidence(baseEvidence({currentization: 'UNKNOWN'}));
assert.equal(decision.resumeDisposition, 'UNKNOWN');
decision = owner.classifyContinuationEvidence(baseEvidence({prState: 'CLOSED'}));
assert.equal(decision.resumeDisposition, 'BLOCKED');

const oldReceipt = implementationReceipt({head: HEAD_A, diff: DIFF_A});
const liveReceipt = implementationReceipt({head: HEAD_B, diff: DIFF_A});
const oldCandidate = owner.candidateFromReceipt(oldReceipt, 2463, 2464);
const liveCandidate = owner.candidateFromReceipt(liveReceipt, 2463, 2464);
const productionWorkflowCandidate = owner.candidateFromReceipt(implementationReceipt({
  head: HEAD_B, diff: DIFF_A, workflowIdentity: 'head:' + HEAD_B,
}), 2463, 2464);
assert.equal(productionWorkflowCandidate.ownerCiPass, true);
const malformedWorkflowCandidate = owner.candidateFromReceipt(implementationReceipt({
  head: HEAD_B, diff: DIFF_A, workflowIdentity: 'head:' + HEAD_B + '0',
}), 2463, 2464);
assert.equal(malformedWorkflowCandidate.ownerCiPass, false);
let reduced = owner.reduceCandidates([oldCandidate, liveCandidate], HEAD_B);
assert.equal(reduced.state, 'EXACT');
assert.equal(reduced.candidate.headSha, HEAD_B);
assert.equal(reduced.candidate.diffIdentity, DIFF_A);

const conflictingLive = owner.candidateFromReceipt(
  implementationReceipt({head: HEAD_B, diff: DIFF_B}), 2463, 2464);
reduced = owner.reduceCandidates([liveCandidate, conflictingLive], HEAD_B);
assert.equal(reduced.state, 'CONFLICT');
assert.ok(reduced.reasonCodes.includes('VALIDATION_CHECKPOINT_CONFLICT'));

const lineageCurrentized = owner.candidateFromReceipt(implementationReceipt({
  head: HEAD_B,
  diff: DIFF_A,
  extraGates: [
    {name: 'currentization-diff-preserved', result: 'PASS',
      evidenceLocator: 'issue:#1'},
    {name: 'packet-scoped-currentization-replay', result: 'PASS',
      evidenceLocator: 'receipt:currentness:1'},
  ],
}), 2463, 2464);
const alternateHashDomain = owner.candidateFromReceipt(implementationReceipt({
  head: HEAD_B,
  diff: DIFF_B,
  extraGates: [
    {name: 'currentization-scope-and-blob-preservation', result: 'PASS',
      evidenceLocator: 'issue:#2'},
    {name: 'packet-scoped-currentization-replay', result: 'PASS',
      evidenceLocator: 'receipt:currentness:2'},
  ],
}), 2463, 2464);

reduced = owner.reduceCandidates(
  [oldCandidate, lineageCurrentized, alternateHashDomain], HEAD_B);
assert.equal(reduced.state, 'EXACT');
assert.equal(reduced.candidate.diffIdentity, DIFF_A);
assert.deepEqual(reduced.candidate.receiptDigests, [lineageCurrentized.receiptDigest]);

reduced = owner.reduceCandidates(
  [lineageCurrentized, alternateHashDomain], HEAD_B);
assert.equal(reduced.state, 'CONFLICT');
assert.ok(reduced.reasonCodes.includes('VALIDATION_CHECKPOINT_CONFLICT'));

const duplicateLineage = owner.candidateFromReceipt(implementationReceipt({
  head: HEAD_B,
  diff: DIFF_A,
  extraGates: [
    {name: 'currentization-diff-preserved', result: 'PASS',
      evidenceLocator: 'issue:#3'},
    {name: 'packet-scoped-currentization-replay', result: 'PASS',
      evidenceLocator: 'receipt:currentness:3'},
  ],
}), 2463, 2464);
reduced = owner.reduceCandidates(
  [lineageCurrentized, duplicateLineage], HEAD_B);
assert.equal(reduced.state, 'EXACT');
assert.equal(reduced.candidate.receiptDigests.length, 2);

const historicalDiffB = owner.candidateFromReceipt(
  implementationReceipt({head: HEAD_A, diff: DIFF_B}), 2463, 2464);
reduced = owner.reduceCandidates(
  [oldCandidate, historicalDiffB, lineageCurrentized, alternateHashDomain], HEAD_B);
assert.equal(reduced.state, 'CONFLICT');
assert.ok(reduced.reasonCodes.includes('VALIDATION_CHECKPOINT_CONFLICT'));

assert.equal(owner.currentizationState(liveCandidate, MAIN), 'STALE');
const currentizedCandidate = owner.candidateFromReceipt(implementationReceipt({
  head: HEAD_B,
  extraGates: [{
    name: 'currentization-diff-preserved',
    result: 'PASS',
    evidenceLocator: 'commit:' + HEAD_B,
  }],
}), 2463, 2464);
const currentizedReduced = owner.reduceCandidates([currentizedCandidate], HEAD_B);
assert.equal(currentizedReduced.state, 'EXACT');
assert.equal(currentizedReduced.candidate.exactCurrentizationProof, true);
assert.equal(owner.currentizationState(currentizedReduced.candidate, MAIN), 'EXACT_CURRENT_MAIN');
assert.equal(owner.currentizationState(currentizedReduced.candidate, '5'.repeat(40)), 'STALE');

const replayCandidate = owner.candidateFromReceipt(implementationReceipt({
  head: HEAD_B,
  extraGates: [{
    name: 'currentization-replay-safe',
    result: 'PASS',
    evidenceLocator: 'receipt:currentness:1',
  }],
}), 2463, 2464);
const replayReduced = owner.reduceCandidates([replayCandidate], HEAD_B);
assert.equal(replayReduced.state, 'EXACT');
assert.equal(owner.currentizationState(replayReduced.candidate, MAIN), 'REPLAY_SAFE');
assert.equal(owner.currentizationState(replayReduced.candidate, '5'.repeat(40)), 'REPLAY_SAFE');

const secondMainCandidate = owner.candidateFromReceipt(implementationReceipt({
  head: HEAD_B,
  main: '6'.repeat(40),
  extraGates: [{
    name: 'currentization-diff-preserved',
    result: 'PASS',
    evidenceLocator: 'commit:' + HEAD_B,
  }],
}), 2463, 2464);
const multipleMainReduced = owner.reduceCandidates(
  [currentizedCandidate, secondMainCandidate], HEAD_B);
assert.equal(multipleMainReduced.state, 'EXACT');
assert.equal(owner.currentizationState(multipleMainReduced.candidate, MAIN), 'UNKNOWN');
assert.equal(owner.coordinationState(liveCandidate.requiredGates), 'CONVERGED');
assert.equal(owner.pathScopeCompatibility(PATHS, ['path:src/**'], PATHS), 'EXACT');
assert.equal(owner.pathScopeCompatibility(PATHS, ['path:other/**'], PATHS), 'CONFLICT');
assert.equal(owner.pathScopeCompatibility(PATHS, ['path:src/**', 'path:unused/**'], PATHS), 'CONFLICT');

const tick = String.fromCharCode(96);
function packetBody() {
  return [
    '<!-- canonical-main-work-packet:v1 -->',
    '## State',
    'IN_PROGRESS',
    '## Bounded implementation write scope',
    '- ' + tick + 'path:src/**' + tick,
    '## Interaction stage',
    '- Current stage: VALIDATION_MERGE',
    '- Completed stage(s): AUTHORITY_SCOPE, IMPLEMENTATION_PR',
    '- Next stage: VALIDATION_MERGE',
  ].join('\n');
}
function opsBody() {
  return [
    '## Canonical Operator Capsule',
    '- STATE: ' + tick + 'CLEAR' + tick,
    '- MAIN: ' + tick + MERGE + tick + ' / Required PASS — run 1',
    '- CHANGE: LOW',
    '- WHY: ' + tick + 'NONE' + tick,
    '- NEXT: ' + tick + 'NONE' + tick,
    '- AUTHORITY: none',
    '- UNKNOWN: NONE',
    '',
  ].join('\n');
}
const naturalReceipt = implementationReceipt({
  head: HEAD_B, diff: DIFF_A, includeMain: false,
});
const naturalComment = stageReceipt.renderStageReceipt(naturalReceipt)
  + '\nFresh currentization prose is non-semantic.\n';
const responses = new Map([
  ['/branches/main', {commit: {sha: MERGE}}],
  ['/issues/485', {state: 'open', body: opsBody()}],
  ['/issues/2463', {state: 'open', body: packetBody()}],
  ['/pulls/2464', {
    number: 2464, state: 'closed', merged_at: '2026-09-22T00:00:00Z',
    merge_commit_sha: MERGE,
    head: {sha: HEAD_B, repo: {full_name: 'hanmiyoo10-alt/-'}},
    base: {ref: 'main', sha: MAIN},
  }],
  ['/pulls/2464/files?per_page=100&page=1', PATHS.map((filename) => ({filename}))],
  ['/issues/2463/comments?per_page=100&page=1', [{id: 9, body: naturalComment}]],
]);
const client = {
  async api(endpoint) {
    if (!responses.has(endpoint)) throw new Error('unexpected endpoint ' + endpoint);
    return responses.get(endpoint);
  },
};

(async () => {
  const result = await owner.inspectWithClient({
    client, packetNumber: 2463, prNumber: 2464,
  });
  assert.equal(result.report.resumeDisposition, 'ALREADY_MERGED');
  assert.equal(result.report.candidateHead, HEAD_B);
  assert.equal(result.report.mergeCommit, MERGE);
  assert.equal(result.report.freshAdmissionRequired, false);
  assert.equal(result.receipt.result, 'PASS');
  assert.equal(result.receipt.nextLegalAction, 'VALIDATION_MERGE_FINALIZE');

  const source = fs.readFileSync(path.join(
    ROOT,
    '.github/plugin-control-plane/canonical-main/work-harness/validation-continuation/validation-continuation-owner.cjs',
  ), 'utf8');
  assert.doesNotMatch(source, /created_at|updated_at|comment\.id|latest.comment|newest.comment/i);
  assert.doesNotMatch(source, /workflow_dispatch|git\s+push|merge_pull_request|lease-acquire|lease-release|holder\.claim/i);
  assert.match(source, /freshAdmissionRequired/);
  assert.match(source, /VALIDATION_CHECKPOINT_CONFLICT/);

  console.log('validation-continuation owner contract: ok');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
