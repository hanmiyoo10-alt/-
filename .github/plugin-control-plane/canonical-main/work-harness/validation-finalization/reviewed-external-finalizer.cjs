#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../..');
const REPO = 'hanmiyoo10-alt/-';
const LEDGER_ISSUE = 2352;
const PAGE_SIZE = 100;
const MAX_PAGES = 20;
const ADMISSION_MODE = 'REVIEWED_EXTERNAL_FINALIZER_ADMISSION';
const ADMISSION_MARKER = 'canonical-main-reviewed-external-finalizer-admission:v1';

const validationMerge = require('../validation-merge/validation-merge-owner.cjs');
const validationAttention = require('../validation-attention/validation-attention-owner.cjs');
const finalization = require('./validation-finalization-owner.cjs');
const validationStageSet = require('./validation-stage-receipt-set.cjs');
const stageReceipt = require('../stage-receipt.cjs');
const taskLease = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs'));
const {canonicalize, stableHash} = require('../handoff.cjs');

const FALSE_AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});

const TARGET = Object.freeze({
  packet: 3050,
  packetRef: '#3050',
  pr: 3052,
  paths: Object.freeze([
    'products/chatgpt-mobile-coder-lab/coordination/validation-finalization/README.md',
    'products/chatgpt-mobile-coder-lab/coordination/validation-finalization/mcl-validation-finalization-apply.cjs',
    'products/chatgpt-mobile-coder-lab/coordination/validation-finalization/tests/test-mcl-validation-finalization-apply.cjs',
  ]),
  blobs: Object.freeze({
    'products/chatgpt-mobile-coder-lab/coordination/validation-finalization/README.md':
      'd5e79beee83b2a2a81e9c365c2c42779a23db218',
    'products/chatgpt-mobile-coder-lab/coordination/validation-finalization/mcl-validation-finalization-apply.cjs':
      '462940a61fbe41c380b9c8e440986c15c5baadd8',
    'products/chatgpt-mobile-coder-lab/coordination/validation-finalization/tests/test-mcl-validation-finalization-apply.cjs':
      '63d656ab4d0b36329c3bba998d1c0a50f4ebef20',
  }),
  diffIdentity: '5ab8c112cc752e80e62a6569b6f33f3a5ad7207c879406b179a9c53b961a2793',
});

const REQUIRED_IMPL_GATES = Object.freeze([
  'currentization-scope-and-blob-preservation',
  'd013-release',
  'd014-completion',
  'holder-absent',
  'exact-head-required',
  'exact-head-verify',
  'exact-three-path-diff',
]);

class ReviewedExternalFinalizerError extends Error {
  constructor(kind, reasonCodes) {
    const unique = [...new Set(reasonCodes)].sort();
    super(unique[0] || kind);
    this.kind = kind;
    this.reasonCodes = unique;
  }
}

function fail(kind, ...reasonCodes) {
  throw new ReviewedExternalFinalizerError(kind, reasonCodes);
}
function sha256(text) {
  return crypto.createHash('sha256').update(String(text ?? '')).digest('hex');
}
function sorted(values) {
  return [...new Set(values)].sort();
}
function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
function commentBody(comment) {
  return String(comment?.body || '').replace(/\r\n/g, '\n');
}
function fixedContentsEndpoint(repoPath, ref) {
  return '/contents/' + repoPath.split('/').map(encodeURIComponent).join('/')
    + '?ref=' + encodeURIComponent(ref);
}
const FIXED_CONTENT_PATHS = new Set(TARGET.paths.map((repoPath) =>
  '/contents/' + repoPath.split('/').map(encodeURIComponent).join('/')));
function reviewedContentEndpointAllowed(endpoint) {
  const match = /^(\/contents\/[^?]+)\?ref=([0-9a-f]{40})$/.exec(String(endpoint || ''));
  return Boolean(match && FIXED_CONTENT_PATHS.has(match[1]));
}
function parseGhContentRead(result) {
  if (!result || result.code !== 0) throw new Error('reviewed content read failed');
  try { return JSON.parse(result.stdout || ''); }
  catch { throw new Error('reviewed content read failed'); }
}
function createReviewedLiveClient(options = {}) {
  const env = options.env || process.env;
  const runner = options.runner || validationMerge.defaultGhRunner;
  const base = validationMerge.createLiveClient(options);
  if (env.GH_TOKEN || env.GITHUB_TOKEN) return base;
  return {
    ...base,
    async api(endpoint, requestOptions = {}) {
      if (!reviewedContentEndpointAllowed(endpoint)) {
        return base.api(endpoint, requestOptions);
      }
      if (requestOptions && Object.keys(requestOptions).length) {
        throw new Error('reviewed content read options forbidden');
      }
      return parseGhContentRead(runner([
        'api', 'repos/' + REPO + endpoint, '--method', 'GET',
        '--header', 'Accept: application/vnd.github+json',
      ]));
    },
  };
}
async function api(client, endpoint, label) {
  try { return await client.api(endpoint); }
  catch { fail('UNKNOWN', 'GITHUB_READ_FAILED_' + label); }
}
async function readComments(client) {
  const rows = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const value = await api(client,
      '/issues/' + TARGET.packet + '/comments?per_page=' + PAGE_SIZE + '&page=' + page,
      'COMMENTS');
    if (!Array.isArray(value)) fail('UNKNOWN', 'COMMENTS_ARRAY_REQUIRED');
    rows.push(...value);
    if (value.length < PAGE_SIZE) return rows;
  }
  fail('UNKNOWN', 'COMMENTS_PAGINATION_INCOMPLETE');
}

function validateImplementationReceipt(receipt) {
  const projected = validationMerge.validateImplementationReceipt(
    receipt, TARGET.packet, TARGET.pr);
  if (!same(projected.paths, [...TARGET.paths].sort())) {
    fail('CONFLICT', 'IMPLEMENTATION_PATH_SET_CONFLICT');
  }
  if (receipt.scope.diffIdentity !== TARGET.diffIdentity) {
    fail('CONFLICT', 'IMPLEMENTATION_DIFF_IDENTITY_CONFLICT');
  }
  const gates = new Map((receipt.requiredGates || []).map((row) => [row.name, row]));
  for (const name of REQUIRED_IMPL_GATES) {
    const gate = gates.get(name);
    if (!gate || gate.result !== 'PASS' || !gate.evidenceLocator) {
      fail('UNKNOWN', 'IMPLEMENTATION_GATE_MISSING_' + name.toUpperCase().replace(/-/g, '_'));
    }
  }
  return projected;
}

async function verifySemanticBlobs(client, candidateHead) {
  const observed = {};
  for (const repoPath of TARGET.paths) {
    const value = await api(client, fixedContentsEndpoint(repoPath, candidateHead), 'BLOB');
    if (!value || value.type !== 'file' || value.sha !== TARGET.blobs[repoPath]) {
      fail('CONFLICT', 'REVIEWED_SEMANTIC_BLOB_CONFLICT');
    }
    observed[repoPath] = value.sha;
  }
  return canonicalize(observed);
}
function buildAdmissionPayload({
  packetBodySha256, currentMain, candidateHead, implementationReceiptDigest,
  validationAttentionReceiptDigest, semanticBlobs, requiredObservation,
}) {
  return canonicalize({
    schemaVersion: 1,
    mode: ADMISSION_MODE,
    packetNumber: TARGET.packet,
    prNumber: TARGET.pr,
    packetBodySha256,
    currentMain,
    candidateHead,
    implementationReceiptDigest,
    validationAttentionReceiptDigest,
    reviewedPaths: [...TARGET.paths],
    reviewedSemanticBlobs: semanticBlobs,
    reviewedDiffIdentity: TARGET.diffIdentity,
    requiredObservation,
  });
}
function renderAdmission(payload) {
  const digest = stableHash(payload);
  return [
    '<!-- ' + ADMISSION_MARKER + ' digest=' + digest + ' -->',
    '\x60\x60\x60json',
    JSON.stringify(payload),
    '\x60\x60\x60',
    '',
  ].join('\n');
}

function validateAdmissionPayload(value) {
  const exactKeys = [
    'schemaVersion', 'mode', 'packetNumber', 'prNumber', 'packetBodySha256',
    'currentMain', 'candidateHead', 'implementationReceiptDigest',
    'validationAttentionReceiptDigest', 'reviewedPaths',
    'reviewedSemanticBlobs', 'reviewedDiffIdentity', 'requiredObservation',
  ].sort();
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || !same(Object.keys(value).sort(), exactKeys)) {
    fail('CONFLICT', 'ADMISSION_SCHEMA_CONFLICT');
  }
  if (value.schemaVersion !== 1 || value.mode !== ADMISSION_MODE
      || value.packetNumber !== TARGET.packet || value.prNumber !== TARGET.pr
      || !/^[0-9a-f]{64}$/.test(value.packetBodySha256 || '')
      || !/^[0-9a-f]{40}$/.test(value.currentMain || '')
      || !/^[0-9a-f]{40}$/.test(value.candidateHead || '')
      || !/^[0-9a-f]{64}$/.test(value.implementationReceiptDigest || '')
      || !/^[0-9a-f]{64}$/.test(value.validationAttentionReceiptDigest || '')
      || value.reviewedDiffIdentity !== TARGET.diffIdentity
      || !same(value.reviewedPaths, TARGET.paths)) {
    fail('CONFLICT', 'ADMISSION_IDENTITY_CONFLICT');
  }
  if (!same(value.reviewedSemanticBlobs, TARGET.blobs)) {
    fail('CONFLICT', 'ADMISSION_BLOB_CONTRACT_CONFLICT');
  }
  if (typeof value.requiredObservation !== 'string' || !value.requiredObservation) {
    fail('UNKNOWN', 'ADMISSION_REQUIRED_OBSERVATION_MISSING');
  }
  return canonicalize(value);
}

function parseAdmission(text) {
  const escaped = ADMISSION_MARKER.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const pattern = new RegExp(
    '^<!-- ' + escaped + ' digest=([0-9a-f]{64}) -->\\n'
    + '\\x60\\x60\\x60json\\n([^\\n]+)\\n'
    + '\\x60\\x60\\x60\\n?$');
  const match = pattern.exec(String(text || '').replace(/\r\n/g, '\n'));
  if (!match) return null;
  let value;
  try { value = JSON.parse(match[2]); } catch { return {conflict: true}; }
  try {
    const normalized = validateAdmissionPayload(value);
    if (!same(normalized, value) || stableHash(normalized) !== match[1]) {
      return {conflict: true};
    }
    return {conflict: false, digest: match[1], value: normalized};
  } catch {
    return {conflict: true};
  }
}
function selectAdmission(comments) {
  const parsed = comments.map((row) => parseAdmission(commentBody(row))).filter(Boolean);
  if (parsed.some((row) => row.conflict)) fail('CONFLICT', 'ADMISSION_FORMAT_CONFLICT');
  const byDigest = new Map(parsed.map((row) => [row.digest, row.value]));
  if (byDigest.size === 0) fail('BLOCKED', 'ADMISSION_MISSING');
  if (byDigest.size !== 1 || parsed.length !== 1) fail('CONFLICT', 'ADMISSION_MULTIPLE');
  return {digest: [...byDigest.keys()][0], value: [...byDigest.values()][0]};
}

async function publishExactComment(client, body, runner = validationMerge.defaultGhRunner) {
  const before = (await readComments(client)).filter((row) => commentBody(row) === body);
  if (before.length > 1) fail('CONFLICT', 'EXACT_COMMENT_DUPLICATE');
  if (before.length === 1) return {written: 0, reused: 1};
  const result = runner([
    'api', 'repos/' + REPO + '/issues/' + TARGET.packet + '/comments',
    '--method', 'POST',
    '--header', 'Accept: application/vnd.github+json',
    '--input', '-',
  ], {input: JSON.stringify({body})});
  const after = (await readComments(client)).filter((row) => commentBody(row) === body);
  if (after.length > 1) fail('CONFLICT', 'EXACT_COMMENT_DUPLICATE');
  if (after.length === 1) {
    return {written: 1, reused: 0, lostAckRecovered: result.code !== 0};
  }
  if (result.code !== 0) fail('UNKNOWN', 'COMMENT_WRITE_ACK_UNKNOWN');
  fail('UNKNOWN', 'COMMENT_WRITE_READBACK_MISSING');
}

async function runAttentionInspect({client, implementationReceipt, deps = {}}) {
  if (deps.attentionResult) return deps.attentionResult;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewed-external-finalizer-'));
  try {
    return await validationAttention.inspectComposition({
      client,
      packetNumber: TARGET.packet,
      prNumber: TARGET.pr,
      implementationReceipt,
      root: temp,
    });
  } finally {
    try { fs.rmSync(temp, {recursive: true, force: true}); } catch {}
  }
}

async function captureAdmissionFacts({client, implementationReceipt, deps = {}}) {
  const implementation = validateImplementationReceipt(implementationReceipt);
  const packet = await validationMerge.readPacket(client, TARGET.packet);
  const main = await validationMerge.readCurrentMain(client);
  const pr = await api(client, '/pulls/' + TARGET.pr, 'PR');
  if (!pr || pr.state !== 'open' || pr.draft
      || pr.head?.sha !== implementation.expectedHead
      || pr.base?.sha !== main.mainSha) {
    fail('BLOCKED', 'PR_NOT_CURRENT_OPEN_EXACT_HEAD');
  }
  const semanticBlobs = await verifySemanticBlobs(client, implementation.expectedHead);
  const attention = await runAttentionInspect({client, implementationReceipt, deps});
  if (attention.receipt?.result !== 'PASS'
      || attention.receipt?.attentionDisposition !== 'COMPLETE'
      || attention.report?.output?.mergeAdmission !== 'READY') {
    fail(attention.receipt?.result === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED',
      'VALIDATION_ATTENTION_ADMISSION_NOT_READY');
  }
  return {implementation, packet, main, pr, semanticBlobs, attention};
}

async function admit({client, implementationReceipt, runner, deps = {}}) {
  const facts = await captureAdmissionFacts({client, implementationReceipt, deps});
  const payload = buildAdmissionPayload({
    packetBodySha256: facts.packet.bodySha256,
    currentMain: facts.main.mainSha,
    candidateHead: facts.implementation.expectedHead,
    implementationReceiptDigest: implementationReceipt.receiptDigest,
    validationAttentionReceiptDigest: facts.attention.receipt.receiptDigest,
    semanticBlobs: facts.semanticBlobs,
    requiredObservation: String(facts.attention.report.output.required || 'PASS'),
  });
  const text = renderAdmission(payload);
  const effect = deps.publishExact
    ? await deps.publishExact(text)
    : await publishExactComment(client, text, runner);
  return output('PASS', {
    operation: 'admit',
    admissionDigest: stableHash(payload),
    candidateHead: facts.implementation.expectedHead,
    effects: {admissionComments: effect.written || 0, stageReceiptComments: 0},
    nextLegalAction: 'MERGE_PR_WITH_EXISTING_EXPECTED_HEAD_ENDPOINT',
  });
}

function implementationFromComments(comments, digest) {
  const matches = [];
  for (const row of comments) {
    const parsed = stageReceipt.parseRenderedStageReceipt(commentBody(row));
    if (parsed.status !== 'VALID') continue;
    if (parsed.value.packetNumber === TARGET.packet
        && parsed.value.stage === 'IMPLEMENTATION_PR'
        && parsed.value.receiptDigest === digest) matches.push(parsed.value);
  }
  if (matches.length !== 1) {
    fail(matches.length > 1 ? 'CONFLICT' : 'UNKNOWN',
      matches.length > 1
        ? 'IMPLEMENTATION_RECEIPT_DUPLICATE'
        : 'IMPLEMENTATION_RECEIPT_NOT_FOUND');
  }
  validateImplementationReceipt(matches[0]);
  return matches[0];
}

function validationStageState(comments, admission, mergeCommit) {
  const texts = [];
  for (const row of comments) {
    const parsed = stageReceipt.parseRenderedStageReceipt(commentBody(row));
    if (parsed.status === 'VALID'
        && parsed.value.packetNumber === TARGET.packet
        && parsed.value.stage === 'VALIDATION_MERGE') texts.push(commentBody(row));
  }
  if (!texts.length) return {state: 'ABSENT', core: null};
  const classified = validationStageSet.classify(texts);
  if (!['SINGLE', 'MULTIPLE_EQUIVALENT'].includes(classified.status)) {
    fail(classified.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
      'VALIDATION_STAGE_RECEIPT_SET_' + classified.status);
  }
  const core = classified.validationCore;
  if (core.packetNumber !== TARGET.packet || core.prNumber !== TARGET.pr
      || core.candidateHead !== admission.candidateHead
      || core.mergeCommit !== mergeCommit
      || core.diffIdentity !== TARGET.diffIdentity
      || !same(core.scopePaths, TARGET.paths)) {
    fail('CONFLICT', 'VALIDATION_STAGE_CORE_CONFLICT');
  }
  return {state: 'PASS', core, classified};
}

async function noCurrentPacketLease(client) {
  const issue = await api(client, '/issues/' + LEDGER_ISSUE, 'LEDGER');
  const parsed = taskLease.parseLedger(String(issue?.body || ''));
  if (!parsed.ok) fail('UNKNOWN', 'D013_LEDGER_INVALID');
  if (parsed.state.activeLeases.some((row) => row.packetRef === TARGET.packetRef)) {
    fail('BLOCKED', 'TARGET_D013_LEASE_ACTIVE');
  }
  return parsed.state.generation;
}

function finalizationEvidence({admission, mergeCommit, stageState}) {
  const diff = 'sha256:' + TARGET.diffIdentity;
  const scopeDigest = validationAttention.pathScopeDigest(TARGET.paths);
  const stage = stageState.state === 'PASS'
    ? {
      state: 'PASS',
      packetRef: TARGET.packetRef,
      prNumber: TARGET.pr,
      candidateHead: admission.candidateHead,
      mergeCommit,
      diffIdentity: diff,
      pathScopeDigest: scopeDigest,
      nextLegalAction: 'POSTMERGE_CONVERGENCE',
    }
    : {
      state: 'ABSENT',
      packetRef: null,
      prNumber: null,
      candidateHead: null,
      mergeCommit: null,
      diffIdentity: null,
      pathScopeDigest: null,
      nextLegalAction: 'UNKNOWN',
    };
  return {
    schemaVersion: 1,
    mode: 'VALIDATION_FINALIZATION_EVIDENCE',
    subject: 'issue:' + TARGET.packetRef,
    packetRef: TARGET.packetRef,
    packetState: 'EXACT',
    validationStageState: 'COMPATIBLE',
    expected: {
      prNumber: TARGET.pr,
      candidateHead: admission.candidateHead,
      diffIdentity: diff,
      pathScopeDigest: scopeDigest,
    },
    mergeEvidence: {
      state: 'MERGED',
      prNumber: TARGET.pr,
      candidateHead: admission.candidateHead,
      mergeCommit,
      diffIdentity: diff,
      pathScopeDigest: scopeDigest,
    },
    validationEvidence: {
      state: 'PASS',
      candidateHead: admission.candidateHead,
      diffIdentity: diff,
    },
    stageReceipt: stage,
    coordinationState: 'COMPLETE',
    workspaceState: 'CLEAN',
    requiredUnknownState: 'NONE',
    sourceRefs: ['issue:' + TARGET.packetRef, 'pr:#' + TARGET.pr],
  };
}

function buildValidationStageReceipt({implementationReceipt, admission, mergeCommit}) {
  const workflowRefs = (implementationReceipt.authorityRefs || [])
    .filter((row) => row.kind === 'WORKFLOW_RUN')
    .map(({kind, locator, identity}) => ({kind, locator, identity}));
  const receipt = stageReceipt.projectStageReceipt({
    schemaVersion: 1,
    packetNumber: TARGET.packet,
    stage: 'VALIDATION_MERGE',
    authorityRefs: [
      {kind: 'COMMIT', locator: 'candidate-head', identity: admission.candidateHead},
      {kind: 'COMMIT', locator: 'merge:#' + TARGET.pr, identity: mergeCommit},
      {kind: 'PR', locator: 'pr:#' + TARGET.pr, identity: admission.candidateHead},
      ...workflowRefs,
    ],
    requiredGates: [
      {name: 'implementation-stage-receipt', result: 'PASS',
        evidenceLocator: 'receipt:' + implementationReceipt.receiptDigest},
      {name: 'reviewed-external-finalizer-admission', result: 'PASS',
        evidenceLocator: 'receipt:' + stableHash(admission)},
      {name: 'validation-attention-admission', result: 'PASS',
        evidenceLocator: 'receipt:' + admission.validationAttentionReceiptDigest},
      {name: 'expected-head-merge', result: 'PASS',
        evidenceLocator: 'commit:' + mergeCommit},
      {name: 'current-packet-lease-absence', result: 'PASS',
        evidenceLocator: 'issue:#' + LEDGER_ISSUE},
      {name: 'currentization-coordination-converged', result: 'PASS',
        evidenceLocator: 'receipt:' + implementationReceipt.receiptDigest},
    ],
    scope: {
      paths: [...TARGET.paths],
      diffRequired: true,
      diffIdentity: TARGET.diffIdentity,
      diffEvidenceLocator: 'pr:#' + TARGET.pr,
    },
    proof: [
      {term: 'IMPLEMENTED', evidenceLocator: 'commit:' + admission.candidateHead},
      {term: 'CONTRACT_PROVEN',
        evidenceLocator: 'receipt:' + implementationReceipt.receiptDigest},
    ],
    requiredUnknowns: [],
    conflicts: [],
    blockers: [],
    dependencies: [],
    nextLegalAction: 'POSTMERGE_CONVERGENCE',
  });
  if (receipt.status !== 'PASS') fail('UNKNOWN', 'STAGE_RECEIPT_BUILD_NOT_PASS');
  return receipt;
}

async function captureApplyFacts({client}) {
  const comments = await readComments(client);
  const selected = selectAdmission(comments);
  const admission = selected.value;
  const packet = await validationMerge.readPacket(client, TARGET.packet);
  if (packet.bodySha256 !== admission.packetBodySha256) {
    fail('BLOCKED', 'PACKET_BODY_DRIFT');
  }
  const pr = await api(client, '/pulls/' + TARGET.pr, 'PR');
  if (!pr || pr.state !== 'closed' || !pr.merged_at
      || pr.head?.sha !== admission.candidateHead
      || !/^[0-9a-f]{40}$/.test(pr.merge_commit_sha || '')) {
    fail('BLOCKED', 'PR_NOT_MERGED_AS_ADMITTED');
  }
  await noCurrentPacketLease(client);
  const implementationReceipt = implementationFromComments(
    comments, admission.implementationReceiptDigest);
  const stageState = validationStageState(comments, admission, pr.merge_commit_sha);
  return {comments, admission, packet, pr, implementationReceipt, stageState};
}

async function apply({client, runner, deps = {}}) {
  let facts = await captureApplyFacts({client});
  let pre = finalization.projectValidationFinalization(finalizationEvidence({
    admission: facts.admission,
    mergeCommit: facts.pr.merge_commit_sha,
    stageState: facts.stageState,
  }));
  const effects = {admissionComments: 0, stageReceiptComments: 0};
  if (pre.finalizationDisposition === 'ALREADY_FINALIZED'
      && pre.result === 'PASS'
      && pre.nextLegalAction === 'POSTMERGE_CONVERGENCE') {
    return output('PASS', {
      operation: 'apply', pre, post: pre, effects,
      nextLegalAction: 'POSTMERGE_CONVERGENCE',
    });
  }
  if (pre.finalizationDisposition !== 'FINALIZATION_REQUIRED'
      || pre.result !== 'PASS'
      || !same(pre.requiredEffectClasses, ['CANONICAL_VALIDATION_MERGE_RECEIPT'])) {
    fail(pre.result === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED',
      'PRE_EFFECT_FINALIZATION_NOT_RECEIPT_ONLY');
  }
  const receipt = buildValidationStageReceipt({
    implementationReceipt: facts.implementationReceipt,
    admission: facts.admission,
    mergeCommit: facts.pr.merge_commit_sha,
  });
  const text = stageReceipt.renderStageReceipt(receipt);
  const effect = deps.publishExact
    ? await deps.publishExact(text)
    : await publishExactComment(client, text, runner);
  effects.stageReceiptComments += effect.written || 0;
  facts = await captureApplyFacts({client});
  const post = finalization.projectValidationFinalization(finalizationEvidence({
    admission: facts.admission,
    mergeCommit: facts.pr.merge_commit_sha,
    stageState: facts.stageState,
  }));
  if (post.finalizationDisposition !== 'ALREADY_FINALIZED'
      || post.result !== 'PASS'
      || post.attentionDisposition !== 'COMPLETE'
      || post.requiredEffectClasses.length !== 0
      || post.nextLegalAction !== 'POSTMERGE_CONVERGENCE') {
    fail(post.result === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED',
      'POST_EFFECT_REINSPECT_NOT_ALREADY_FINALIZED');
  }
  return output('PASS', {
    operation: 'apply',
    pre,
    post,
    effects,
    mergeCommit: facts.pr.merge_commit_sha,
    nextLegalAction: 'POSTMERGE_CONVERGENCE',
  });
}

function output(status, extras = {}, reasonCodes = []) {
  return canonicalize({
    schemaVersion: 1,
    mode: 'REVIEWED_EXTERNAL_FINALIZER_RESULT',
    status,
    reasonCodes: sorted(reasonCodes),
    ...extras,
    authority: {...FALSE_AUTHORITY},
  });
}
function errorResult(error) {
  const kind = error instanceof ReviewedExternalFinalizerError ? error.kind : 'UNKNOWN';
  return output(kind, {
    operation: null,
    effects: {admissionComments: 0, stageReceiptComments: 0},
    nextLegalAction: kind === 'CONFLICT'
      ? 'SEMANTIC_REVIEW_REQUIRED' : 'TARGETED_DRILLDOWN_REQUIRED',
  }, error instanceof ReviewedExternalFinalizerError
    ? error.reasonCodes : ['RUNTIME_ERROR']);
}

function readRegularJson(filePath) {
  const resolved = path.resolve(filePath);
  const stat = fs.lstatSync(resolved);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 64 * 1024) {
    throw new Error('INPUT_FILE_INVALID');
  }
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}
function parseArgs(argv = process.argv.slice(2)) {
  if (!['admit', 'apply'].includes(argv[0])) throw new Error('COMMAND_INVALID');
  if (argv[0] === 'admit') {
    if (argv.length !== 3 || argv[1] !== '--implementation-receipt-file') {
      throw new Error('ARGUMENT_INVALID');
    }
    return {command: 'admit', receiptFile: argv[2]};
  }
  if (argv.length !== 2 || argv[1] !== '--apply') {
    throw new Error('EXPLICIT_APPLY_REQUIRED');
  }
  return {command: 'apply', receiptFile: null};
}
async function runCli(argv = process.argv.slice(2), options = {}) {
  let result;
  try {
    const args = parseArgs(argv);
    const client = options.client || createReviewedLiveClient(options);
    result = args.command === 'admit'
      ? await admit({
        client,
        implementationReceipt: readRegularJson(args.receiptFile),
        runner: options.runner,
        deps: options.deps || {},
      })
      : await apply({
        client,
        runner: options.runner,
        deps: options.deps || {},
      });
  } catch (error) {
    result = errorResult(error);
  }
  const code = result.status === 'PASS' ? 0
    : result.status === 'CONFLICT' ? 3 : 2;
  return {code, text: JSON.stringify(result, null, 2) + '\n', result};
}

if (require.main === module) {
  runCli().then(({code, text}) => {
    process.stdout.write(text);
    process.exitCode = code;
  }).catch(() => {
    const result = errorResult(new Error('RUNTIME_ERROR'));
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exitCode = 2;
  });
}

module.exports = {
  ADMISSION_MARKER,
  FALSE_AUTHORITY,
  REQUIRED_IMPL_GATES,
  ReviewedExternalFinalizerError,
  TARGET,
  admit,
  apply,
  buildAdmissionPayload,
  buildValidationStageReceipt,
  captureAdmissionFacts,
  captureApplyFacts,
  createReviewedLiveClient,
  errorResult,
  finalizationEvidence,
  fixedContentsEndpoint,
  implementationFromComments,
  noCurrentPacketLease,
  parseAdmission,
  parseArgs,
  publishExactComment,
  renderAdmission,
  reviewedContentEndpointAllowed,
  runCli,
  selectAdmission,
  validateAdmissionPayload,
  validateImplementationReceipt,
  validationStageState,
  verifySemanticBlobs,
};
