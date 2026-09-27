'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {
  MAX_RENDER_BYTES,
  PROOF_TERMS,
  STAGES,
  exitCodeFor,
  parseArgs,
  parseRenderedStageReceipt,
  projectStageReceipt,
  renderStageReceipt,
  run,
} = require('../stage-receipt.cjs');
const validationStageReceiptSet = require(
  '../validation-finalization/validation-stage-receipt-set.cjs');
const {stableHash} = require('../handoff.cjs');

const MAIN = '3e9e1138f7ef7e886e17ebeadce727bd2ea2c66f';
const DIFF = 'a'.repeat(64);
const LOCKED = [
  '.github/plugin-control-plane/canonical-main/work-harness/stage-receipt.cjs',
  '.github/plugin-control-plane/canonical-main/work-harness/tests/stage-receipt-contract.cjs',
  '.github/plugin-control-plane/canonical-main/work-harness/README.md',
  '.github/tooling/ci-summary/manifests/plugin-control-plane.json',
];

function fixture(stage = 'IMPLEMENTATION_PR') {
  const diffRequired = stage !== 'AUTHORITY_SCOPE';
  return {
    schemaVersion: 1,
    packetNumber: 2338,
    stage,
    authorityRefs: [
      { kind: 'GIT_REF', locator: 'refs/heads/main', identity: MAIN },
      { kind: 'ISSUE', locator: 'issue:#485', identity: 'updated:2026-09-16T07:38:54Z' },
    ],
    requiredGates: [
      { name: 'Required', result: 'PASS', evidenceLocator: 'workflow-run:35058781034' },
      { name: 'stage-receipt-contract', result: 'PASS', evidenceLocator: 'local:stage-receipt-contract' },
    ],
    scope: {
      paths: [...LOCKED],
      diffRequired,
      ...(diffRequired ? { diffIdentity: DIFF, diffEvidenceLocator: 'git-diff:working-tree' } : {}),
    },
    proof: [
      { term: 'IMPLEMENTED', evidenceLocator: `commit:${MAIN}` },
      { term: 'CONTRACT_PROVEN', evidenceLocator: 'local:stage-receipt-contract' },
    ],
    requiredUnknowns: [],
    conflicts: [],
    blockers: [],
    dependencies: [],
    nextLegalAction: stage === 'AUTHORITY_SCOPE' ? 'IMPLEMENTATION_PR' : 'VALIDATION_MERGE',
  };
}

assert.deepEqual(STAGES.slice(0, 4), [
  'AUTHORITY_SCOPE', 'IMPLEMENTATION_PR', 'VALIDATION_MERGE', 'POSTMERGE_CONVERGENCE',
]);
assert.ok(PROOF_TERMS.includes('CONTRACT_PROVEN'));
for (const stage of STAGES.slice(0, 4)) {
  const receipt = projectStageReceipt(fixture(stage));
  assert.equal(receipt.status, 'PASS', `${stage} fixture must project cleanly`);
  assert.equal(receipt.packetNumber, 2338);
  assert.equal(receipt.stage, stage);
  assert.equal(receipt.mutationAuthorized, false);
  assert.equal(receipt.executionAuthorized, false);
  assert.match(receipt.receiptDigest, /^[0-9a-f]{64}$/);
  assert.deepEqual(receipt.proof.map((row) => row.term), ['IMPLEMENTED', 'CONTRACT_PROVEN']);
  assert.ok(!receipt.proof.some((row) => row.term === 'LIVE_PROVEN' || row.term === 'DONE'));
}

const canonical = projectStageReceipt(fixture());

const canonicalPrInput = fixture();
canonicalPrInput.authorityRefs.push({
  kind: 'PR',
  locator: 'pr:#2816',
  identity: '07a4ebc173360113f4ee3779ecbcd3e503208d6e',
});
const canonicalPrReceipt = projectStageReceipt(canonicalPrInput);
assert.equal(canonicalPrReceipt.status, 'PASS');
assert.deepEqual(
  canonicalPrReceipt.authorityRefs.find((row) => row.kind === 'PR'),
  {
    kind: 'PR',
    locator: 'pr:#2816',
    identity: '07a4ebc173360113f4ee3779ecbcd3e503208d6e',
    status: 'KNOWN',
  },
);

const legacyPrLocatorInput = fixture();
legacyPrLocatorInput.authorityRefs.push({
  kind: 'PR',
  locator: '#2816',
  identity: '07a4ebc173360113f4ee3779ecbcd3e503208d6e',
});
const legacyPrLocatorResult = projectStageReceipt(legacyPrLocatorInput);
assert.equal(legacyPrLocatorResult.status, 'INVALID');
assert.ok(legacyPrLocatorResult.reasonCodes.includes(
  'INPUT_AUTHORITY_PR_LOCATOR_INVALID:authorityRefs[2]'));

const legacyPrIdentityInput = fixture();
legacyPrIdentityInput.authorityRefs.push({
  kind: 'PR',
  locator: 'pr:#2816',
  identity: 'head:07a4ebc173360113f4ee3779ecbcd3e503208d6e',
});
const legacyPrIdentityResult = projectStageReceipt(legacyPrIdentityInput);
assert.equal(legacyPrIdentityResult.status, 'INVALID');
assert.ok(legacyPrIdentityResult.reasonCodes.includes(
  'INPUT_AUTHORITY_PR_IDENTITY_INVALID:authorityRefs[2]'));

const missingPrIdentityInput = fixture();
missingPrIdentityInput.authorityRefs.push({
  kind: 'PR',
  locator: 'pr:#2816',
});
const missingPrIdentityResult = projectStageReceipt(missingPrIdentityInput);
assert.equal(missingPrIdentityResult.status, 'INVALID');
assert.ok(missingPrIdentityResult.reasonCodes.includes(
  'INPUT_AUTHORITY_PR_IDENTITY_INVALID:authorityRefs[2]'));

const reordered = fixture();
reordered.authorityRefs.reverse();
reordered.requiredGates.reverse();
reordered.scope.paths.reverse();
reordered.proof.reverse();
assert.equal(projectStageReceipt(reordered).receiptDigest, canonical.receiptDigest);
assert.equal(exitCodeFor(canonical), 0);

const missingPassEvidence = fixture();
missingPassEvidence.requiredGates[0] = { name: 'Required', result: 'PASS' };
const unknownGate = projectStageReceipt(missingPassEvidence);
assert.equal(unknownGate.status, 'UNKNOWN');
assert.equal(unknownGate.requiredGates.find((row) => row.name === 'Required').result, 'UNKNOWN');
assert.ok(unknownGate.requiredUnknowns.includes('GATE_EVIDENCE_MISSING:Required:PASS'));
assert.equal(exitCodeFor(unknownGate), 3);

const omittedBlockers = fixture();
delete omittedBlockers.blockers;
const omittedBlockersResult = projectStageReceipt(omittedBlockers);
assert.equal(omittedBlockersResult.status, 'UNKNOWN');
assert.ok(omittedBlockersResult.requiredUnknowns.includes('INPUT_FIELD_OMITTED:blockers'));

const expectedNoRun = fixture();
expectedNoRun.requiredGates = [{ name: 'Path-filtered CI', result: 'EXPECTED_NO_RUN', evidenceLocator: 'trigger-proof:path-filter' }];
const expectedNoRunResult = projectStageReceipt(expectedNoRun);
assert.equal(expectedNoRunResult.status, 'PASS');
assert.equal(expectedNoRunResult.requiredGates[0].result, 'EXPECTED_NO_RUN');
const authorityConflictInput = fixture();
authorityConflictInput.authorityRefs.push({
  kind: 'GIT_REF', locator: 'refs/heads/main', identity: 'b'.repeat(40),
});
const authorityConflict = projectStageReceipt(authorityConflictInput);
assert.equal(authorityConflict.status, 'CONFLICT');
assert.ok(authorityConflict.conflicts.includes('AUTHORITY_REF_CONFLICT:GIT_REF:refs/heads/main'));

const gateConflictInput = fixture();
gateConflictInput.requiredGates.push({ name: 'Required', result: 'FAIL', evidenceLocator: 'workflow-run:other' });
const gateConflict = projectStageReceipt(gateConflictInput);
assert.equal(gateConflict.status, 'CONFLICT');
assert.ok(gateConflict.conflicts.includes('GATE_CONFLICT:Required'));

const doneInput = fixture();
doneInput.proof.push({ term: 'DONE', evidenceLocator: 'issue:#2338' });
doneInput.requiredUnknowns.push('POSTMERGE_EVIDENCE_PENDING');
const rejectedDone = projectStageReceipt(doneInput);
assert.equal(rejectedDone.status, 'CONFLICT');
assert.ok(!rejectedDone.proof.some((row) => row.term === 'DONE'));
assert.ok(rejectedDone.reasonCodes.includes('PROOF_DONE_REJECTED'));

const noDiffInput = fixture('AUTHORITY_SCOPE');
noDiffInput.scope.diffIdentity = DIFF;
noDiffInput.scope.diffEvidenceLocator = 'git-diff:unexpected';
const noDiffConflict = projectStageReceipt(noDiffInput);
assert.equal(noDiffConflict.status, 'CONFLICT');
assert.ok(noDiffConflict.conflicts.includes('SCOPE_DIFF_NOT_APPLICABLE_CONFLICT'));

const missingScopePathsInput = fixture('AUTHORITY_SCOPE');
missingScopePathsInput.scope.paths = [];
const missingScopePaths = projectStageReceipt(missingScopePathsInput);
assert.equal(missingScopePaths.status, 'UNKNOWN');
assert.ok(missingScopePaths.requiredUnknowns.includes('SCOPE_PATHS_MISSING'));
const unsupported = fixture();
unsupported.logs = ['arbitrary raw log'];
const unsupportedResult = projectStageReceipt(unsupported);
assert.equal(unsupportedResult.status, 'INVALID');
assert.ok(unsupportedResult.reasonCodes.includes('INPUT_FIELD_UNSUPPORTED:input.logs'));

const sensitive = fixture();
sensitive.nextLegalAction = 'token=super-secret-value';
const sensitiveResult = projectStageReceipt(sensitive);
assert.equal(sensitiveResult.status, 'INVALID');
assert.ok(sensitiveResult.reasonCodes.includes('INPUT_FIELD_SENSITIVE:nextLegalAction'));
assert.doesNotMatch(JSON.stringify(sensitiveResult), /super-secret-value/);

const rendered = renderStageReceipt(canonical);
assert.match(rendered, /canonical-main-stage-receipt:v1/);
assert.match(rendered, /mutationAuthorized: `false`/);
assert.match(rendered, /executionAuthorized: `false`/);
assert.match(rendered, new RegExp(canonical.receiptDigest));
assert.ok(Buffer.byteLength(rendered, 'utf8') <= MAX_RENDER_BYTES);

assert.equal(parseRenderedStageReceipt(rendered).status, 'VALID');
assert.equal(parseRenderedStageReceipt(rendered).value.receiptDigest, canonical.receiptDigest);

const withTrailingProse = rendered + '\nCurrentization evidence:\n- preserved externally\n';
const parsedTrailing = parseRenderedStageReceipt(withTrailingProse);
assert.equal(parsedTrailing.status, 'VALID');
assert.equal(parsedTrailing.value.receiptDigest, canonical.receiptDigest);

const historical2812LegacyReceipt = "<!-- canonical-main-stage-receipt:v1 digest=45fd2f1f97baa9cbc732e30d3604da598f35d3b56cc9690a0e0e599acace45b0 -->\n## Canonical-main stage receipt — IMPLEMENTATION_PR\n\n- packet: #2812\n- evidence status: `PASS`\n- authority refs: COMMIT:candidate@07a4ebc173360113f4ee3779ecbcd3e503208d6e[KNOWN]; GIT_REF:refs/heads/main@98bb4d9cc78d3f6d4099b23444b6ee823fae7cc7[KNOWN]; ISSUE:#2812@publication-receipt:326178d6e423944a4df63c18895c33e7e92169e1c79daeec791d20ee0e8b529b[KNOWN]; PR:#2816@head:07a4ebc173360113f4ee3779ecbcd3e503208d6e[KNOWN]; WORKFLOW_RUN:35815689915@success[KNOWN]\n- required gates: bootstrap-validation=PASS@issue-comment:5783121765; candidate-local-remote-exact=PASS@commit:07a4ebc173360113f4ee3779ecbcd3e503208d6e; coordination-converged=PASS@receipt:326178d6e423944a4df63c18895c33e7e92169e1c79daeec791d20ee0e8b529b; exact-head-required=PASS@run:35815689915; exact-ten-path-diff=PASS@pr:#2816; pr-publication=PASS@pr:#2816; runtime-install=EXPECTED_NO_RUN@issue:#2812\n- scope paths: products/chatgpt-mobile-coder-lab/coordination/repository-implementation/mcl-repository-implementation.cjs; products/chatgpt-mobile-coder-lab/coordination/repository-implementation/tests/test-repository-implementation.cjs; products/chatgpt-mobile-coder-lab/device-ops/detached-owner-runtime/README.md; products/chatgpt-mobile-coder-lab/device-ops/detached-owner-runtime/install-s-termux.sh; products/chatgpt-mobile-coder-lab/device-ops/detached-owner-runtime/mcl-detached-owner-runtime-service.cjs; products/chatgpt-mobile-coder-lab/device-ops/detached-owner-runtime/mcl-detached-owner-runtime.cjs; products/chatgpt-mobile-coder-lab/device-ops/detached-owner-runtime/tests/test-detached-owner-runtime.cjs; products/chatgpt-mobile-coder-lab/device-ops/detached-owner-runtime/tests/test-install-contract.sh; products/chatgpt-mobile-coder-lab/device-ops/repository-patch/mcl-repository-patch-owner-invoke.cjs; products/chatgpt-mobile-coder-lab/device-ops/repository-patch/tests/test-owner-invoke.cjs\n- diff identity: e33c1dae6b19d5ca80695bd96e55926331254475e156b2f667314a9698505f9d@pr:#2816\n- proof: IMPLEMENTED@commit:07a4ebc173360113f4ee3779ecbcd3e503208d6e; CONTRACT_PROVEN@run:35815689915\n- required UNKNOWNs: NONE\n- conflicts: NONE\n- blockers: NONE\n- dependencies: NONE\n- next legal action: `VALIDATION_MERGE`\n- mutationAuthorized: `false`\n- executionAuthorized: `false`\n- receipt digest: `45fd2f1f97baa9cbc732e30d3604da598f35d3b56cc9690a0e0e599acace45b0`\n";
const historical2812Parsed = parseRenderedStageReceipt(historical2812LegacyReceipt);
assert.equal(historical2812Parsed.status, 'VALID');
assert.equal(
  historical2812Parsed.value.receiptDigest,
  '45fd2f1f97baa9cbc732e30d3604da598f35d3b56cc9690a0e0e599acace45b0',
);
assert.deepEqual(
  historical2812Parsed.value.authorityRefs.find((row) => row.kind === 'PR'),
  {
    kind: 'PR',
    locator: '#2816',
    identity: 'head:07a4ebc173360113f4ee3779ecbcd3e503208d6e',
    status: 'KNOWN',
  },
);

const mixedHistoricalShape = structuredClone(historical2812Parsed.value);
mixedHistoricalShape.authorityRefs = mixedHistoricalShape.authorityRefs.map((row) => (
  row.kind === 'PR' ? {...row, locator: 'pr:#2816'} : row
));
const {receiptDigest: _mixedDigest, ...mixedHistoricalDraft} = mixedHistoricalShape;
mixedHistoricalShape.receiptDigest = stableHash(mixedHistoricalDraft);
const mixedHistoricalParsed = parseRenderedStageReceipt(renderStageReceipt(mixedHistoricalShape));
assert.equal(mixedHistoricalParsed.status, 'UNKNOWN');
assert.ok(mixedHistoricalParsed.reasonCodes.includes('STAGE_RECEIPT_FORMAT_INVALID'));

assert.equal(parseRenderedStageReceipt('no canonical block').status, 'UNKNOWN');
const duplicateRendered = rendered + '\n' + rendered;
assert.equal(parseRenderedStageReceipt(duplicateRendered).status, 'CONFLICT');

const tamperedDigest = rendered.replace(
  canonical.receiptDigest,
  'b'.repeat(64),
);
assert.equal(parseRenderedStageReceipt(tamperedDigest).status, 'CONFLICT');

const malformedRendered = rendered.replace('- packet: #2338', '- packet: nope');
assert.equal(parseRenderedStageReceipt(malformedRendered).status, 'UNKNOWN');


assert.deepEqual(
  parseArgs(['--input-file', 'facts.json', '--format', 'markdown']),
  { format: 'markdown', inputFile: 'facts.json' },
);
assert.throws(() => parseArgs(['--format', 'yaml', '--input-file', 'facts.json']), /json or markdown/);


const SET_CANDIDATE = 'c'.repeat(40);
const SET_MERGE = 'd'.repeat(40);
const SET_DIFF = 'e'.repeat(64);
function validationSetFixture({
  packetNumber = 3008,
  prNumber = 3009,
  candidateHead = SET_CANDIDATE,
  mergeCommit = SET_MERGE,
  mainIdentity = SET_MERGE,
  scopePaths = ['products/example-a', 'products/example-b'],
  diffIdentity = SET_DIFF,
  gateName = 'gate-a',
  gateEvidence = 'issue:#3008',
  proofTerms = ['IMPLEMENTED', 'CONTRACT_PROVEN'],
  proofEvidenceSuffix = 'a',
  extraWorkflow = false,
  stage = 'VALIDATION_MERGE',
  nextLegalAction = 'POSTMERGE_CONVERGENCE',
  diffRequired = true,
  requiredUnknowns = [],
  conflicts = [],
  blockers = [],
  dependencies = [],
} = {}) {
  const authorityRefs = [
    {kind: 'COMMIT', locator: 'candidate-head', identity: candidateHead},
    {kind: 'COMMIT', locator: 'merge:#' + prNumber, identity: mergeCommit},
    {kind: 'PR', locator: 'pr:#' + prNumber, identity: candidateHead},
  ];
  if (mainIdentity !== null) {
    authorityRefs.push({kind: 'GIT_REF', locator: 'refs/heads/main', identity: mainIdentity});
  }
  if (extraWorkflow) {
    authorityRefs.push({kind: 'WORKFLOW_RUN', locator: 'run:12345', identity: candidateHead});
  }
  return projectStageReceipt({
    schemaVersion: 1,
    packetNumber,
    stage,
    authorityRefs,
    requiredGates: [{name: gateName, result: 'PASS', evidenceLocator: gateEvidence}],
    scope: {
      paths: scopePaths,
      diffRequired,
      ...(diffRequired ? {
        diffIdentity,
        diffEvidenceLocator: 'pr:#' + prNumber,
      } : {}),
    },
    proof: proofTerms.map((term, index) => ({
      term,
      evidenceLocator: term === 'IMPLEMENTED'
        ? 'commit:' + candidateHead
        : 'issue:#' + (3008 + index) + '-' + proofEvidenceSuffix,
    })),
    requiredUnknowns,
    conflicts,
    blockers,
    dependencies,
    nextLegalAction,
  });
}

const setReceiptA = validationSetFixture();
const setReceiptB = validationSetFixture({
  gateName: 'gate-b',
  gateEvidence: 'run:67890',
  proofEvidenceSuffix: 'b',
  extraWorkflow: true,
});
assert.equal(setReceiptA.status, 'PASS');
assert.equal(setReceiptB.status, 'PASS');
assert.notEqual(setReceiptA.receiptDigest, setReceiptB.receiptDigest);
const setTextA = renderStageReceipt(setReceiptA);
const setTextB = renderStageReceipt(setReceiptB);

let setResult = validationStageReceiptSet.classify([setTextA]);
assert.equal(setResult.status, 'SINGLE');
assert.equal(setResult.uniqueReceiptCount, 1);
assert.equal(setResult.representativeReceiptDigest, setReceiptA.receiptDigest);
assert.equal(setResult.mutationAuthorized, false);
assert.equal(setResult.executionAuthorized, false);
assert.equal(setResult.authority.repositoryMutationAuthorized, false);

setResult = validationStageReceiptSet.classify([setTextA, setTextA]);
assert.equal(setResult.status, 'SINGLE');
assert.equal(setResult.uniqueReceiptCount, 1);

setResult = validationStageReceiptSet.classify([setTextB, setTextA]);
assert.equal(setResult.status, 'MULTIPLE_EQUIVALENT');
assert.equal(setResult.uniqueReceiptCount, 2);
assert.equal(setResult.evidenceVariants, true);
assert.equal(setResult.representativeReceiptDigest,
  [setReceiptA.receiptDigest, setReceiptB.receiptDigest].sort()[0]);
assert.match(setResult.validationCoreDigest, /^sha256:[0-9a-f]{64}$/);
assert.equal(setResult.validationCore.packetNumber, 3008);
assert.equal(setResult.validationCore.prNumber, 3009);
assert.equal(setResult.validationCore.candidateHead, SET_CANDIDATE);
assert.equal(setResult.validationCore.mergeCommit, SET_MERGE);
assert.deepEqual(setResult.validationCore.proofTerms, ['CONTRACT_PROVEN', 'IMPLEMENTED']);

const setPacketConflict = validationSetFixture({packetNumber: 3009});
assert.equal(validationStageReceiptSet.classify([
  setTextA, renderStageReceipt(setPacketConflict),
]).status, 'CONFLICT');
const setPrConflict = validationSetFixture({prNumber: 3010});
assert.equal(validationStageReceiptSet.classify([
  setTextA, renderStageReceipt(setPrConflict),
]).status, 'CONFLICT');
const setCandidateConflict = validationSetFixture({candidateHead: 'f'.repeat(40)});
assert.equal(validationStageReceiptSet.classify([
  setTextA, renderStageReceipt(setCandidateConflict),
]).status, 'CONFLICT');
const setMergeConflict = validationSetFixture({
  mergeCommit: 'a'.repeat(40), mainIdentity: 'a'.repeat(40),
});
assert.equal(validationStageReceiptSet.classify([
  setTextA, renderStageReceipt(setMergeConflict),
]).status, 'CONFLICT');
const setMainConflict = validationSetFixture({mainIdentity: 'a'.repeat(40)});
setResult = validationStageReceiptSet.classify([renderStageReceipt(setMainConflict)]);
assert.equal(setResult.status, 'CONFLICT');
assert.ok(setResult.reasonCodes.includes('MAIN_MERGE_IDENTITY_CONFLICT'));
const setPathConflict = validationSetFixture({scopePaths: ['products/example-a']});
assert.equal(validationStageReceiptSet.classify([
  setTextA, renderStageReceipt(setPathConflict),
]).status, 'CONFLICT');
const setDiffConflict = validationSetFixture({diffIdentity: 'f'.repeat(64)});
assert.equal(validationStageReceiptSet.classify([
  setTextA, renderStageReceipt(setDiffConflict),
]).status, 'CONFLICT');
const setProofConflict = validationSetFixture({
  proofTerms: ['IMPLEMENTED', 'CONTRACT_PROVEN', 'LIVE_PROVEN'],
});
assert.equal(validationStageReceiptSet.classify([
  setTextA, renderStageReceipt(setProofConflict),
]).status, 'CONFLICT');
const setNextConflict = validationSetFixture({nextLegalAction: 'EXPERIMENT_CLOSE'});
assert.equal(validationStageReceiptSet.classify([renderStageReceipt(setNextConflict)]).status,
  'CONFLICT');
const setNoDiff = validationSetFixture({diffRequired: false});
assert.equal(validationStageReceiptSet.classify([renderStageReceipt(setNoDiff)]).status,
  'CONFLICT');
for (const unresolved of [
  {requiredUnknowns: ['fixture:unknown']},
  {conflicts: ['fixture:conflict']},
  {blockers: ['fixture:blocker']},
  {dependencies: ['issue:#9999']},
]) {
  const changedCore = validationSetFixture(unresolved);
  assert.equal(validationStageReceiptSet.classify([
    setTextA, renderStageReceipt(changedCore),
  ]).status, 'CONFLICT');
}
const setStageConflict = validationSetFixture({
  stage: 'IMPLEMENTATION_PR', nextLegalAction: 'VALIDATION_MERGE',
});
assert.equal(validationStageReceiptSet.classify([renderStageReceipt(setStageConflict)]).status,
  'CONFLICT');
assert.equal(validationStageReceiptSet.classify(['no canonical receipt']).status, 'UNKNOWN');
const setTampered = setTextA.replace(setReceiptA.receiptDigest, '0'.repeat(64));
assert.equal(validationStageReceiptSet.classify([setTampered]).status, 'CONFLICT');

const setSource = fs.readFileSync(path.join(path.resolve(__dirname, '../../../../..'),
  '.github/plugin-control-plane/canonical-main/work-harness/validation-finalization/validation-stage-receipt-set.cjs'), 'utf8');
for (const forbidden of [
  'child_process', 'http://', 'https://', 'gh api', 'fetch(',
  'writeFile', 'appendFile', 'createWriteStream', 'process.env',
]) assert.equal(setSource.includes(forbidden), false, forbidden);
assert.match(setSource, /parseRenderedStageReceipt/);
assert.doesNotMatch(setSource, /Date\.|timestamp|createdAt|updatedAt|latest/i);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage-receipt-'));
const inputPath = path.join(tempDir, 'facts.json');
fs.writeFileSync(inputPath, JSON.stringify(fixture()), 'utf8');
const cliProjection = run(['--input-file', inputPath, '--format', 'markdown']);
assert.equal(cliProjection.receipt.status, 'PASS');
assert.match(cliProjection.output, /Canonical-main stage receipt/);
fs.rmSync(tempDir, { recursive: true, force: true });

const root = path.resolve(__dirname, '../../../../..');
const source = fs.readFileSync(path.join(root, '.github/plugin-control-plane/canonical-main/work-harness/stage-receipt.cjs'), 'utf8');
assert.doesNotMatch(source, /createGitHubClient|child_process|\.api\(|writeFileSync|appendFileSync/);
const manifest = JSON.parse(fs.readFileSync(
  path.join(root, '.github/tooling/ci-summary/manifests/plugin-control-plane.json'), 'utf8',
));
const commands = manifest.checks.map((check) => check.command.join(' '));
assert.ok(commands.includes(
  'node .github/plugin-control-plane/canonical-main/work-harness/tests/stage-receipt-contract.cjs',
));
assert.ok(commands.includes(
  'node .github/plugin-control-plane/canonical-main/work-harness/tests/stage-checkpoint-contract.cjs',
));

console.log('work-harness stage-receipt-contract: ok');
