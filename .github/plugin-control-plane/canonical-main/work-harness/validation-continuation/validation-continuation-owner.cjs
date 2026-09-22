#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../..');
const REPO = 'hanmiyoo10-alt/-';
const PAGE_SIZE = 100;
const MAX_PAGES = 20;
const SHA40_RE = /^[0-9a-f]{40}$/;

const validationMerge = require('../validation-merge/validation-merge-owner.cjs');
const stageReceipt = require('../stage-receipt.cjs');
const executionReceipt = require('../execution-receipt.cjs');
const agentDecisionView = require('../agent-decision-view.cjs');
const scopeOverlap = require('../../work-system/scope-overlap.cjs');
const {canonicalize} = require('../handoff.cjs');

const RESUME_DISPOSITIONS = Object.freeze([
  'ALREADY_MERGED',
  'MERGE_ADMISSION_READY',
  'CURRENTIZATION_REQUIRED',
  'VALIDATION_REFRESH_REQUIRED',
  'NEEDS_RECOVERY_INSPECT',
  'BLOCKED',
  'NEEDS_REVIEW',
  'UNKNOWN',
]);
const CURRENTIZATION_STATES = Object.freeze([
  'EXACT_CURRENT_MAIN', 'REPLAY_SAFE', 'STALE', 'UNKNOWN',
]);

class ContinuationError extends Error {
  constructor(kind, reasonCodes, locator = null) {
    super(reasonCodes[0] || kind);
    this.kind = kind;
    this.reasonCodes = [...new Set(reasonCodes)].sort();
    this.locator = locator;
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function sorted(values) {
  return [...new Set(values)].sort();
}
function same(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}
function exactPaths(left, right) {
  return JSON.stringify(sorted(left || [])) === JSON.stringify(sorted(right || []));
}
function pathScopeCompatibility(candidatePaths, packetScopes, prFiles) {
  const exactCandidate = sorted(candidatePaths || []);
  const exactPr = sorted(prFiles || []);
  if (!exactPaths(exactCandidate, exactPr)) return 'CONFLICT';
  const packetPaths = (packetScopes || [])
    .filter((raw) => String(raw).startsWith('path:'))
    .map((raw) => scopeOverlap.normalizeScope(raw));
  if (!packetPaths.length || packetPaths.some((row) => !row.ok)) return 'UNKNOWN';
  const candidateScopes = exactCandidate.map((repoPath) =>
    scopeOverlap.normalizeScope('path:' + repoPath));
  if (candidateScopes.some((row) => !row.ok)) return 'UNKNOWN';
  const everyCandidateCovered = candidateScopes.every((candidate) =>
    packetPaths.some((packet) => scopeOverlap.scopesOverlap(packet, candidate)));
  const everyPacketScopeUsed = packetPaths.every((packet) =>
    candidateScopes.some((candidate) => scopeOverlap.scopesOverlap(packet, candidate)));
  return everyCandidateCovered && everyPacketScopeUsed ? 'EXACT' : 'CONFLICT';
}
function candidateSemanticKey(candidate) {
  return JSON.stringify([
    candidate.headSha,
    candidate.diffIdentity,
    sorted(candidate.paths),
  ]);
}
function gateName(row) {
  return String(row?.name || '').toLowerCase();
}

function candidateFromReceipt(receipt, packetNumber, prNumber) {
  if (!receipt || receipt.mode !== 'CANONICAL_MAIN_STAGE_RECEIPT'
      || receipt.status !== 'PASS' || receipt.packetNumber !== packetNumber
      || receipt.stage !== 'IMPLEMENTATION_PR') return null;
  if ((receipt.requiredUnknowns || []).length || (receipt.conflicts || []).length
      || (receipt.blockers || []).length || (receipt.dependencies || []).length) return null;
  const terms = new Set((receipt.proof || []).map((row) => row.term));
  if (!terms.has('IMPLEMENTED') || !terms.has('CONTRACT_PROVEN')) return null;
  if (!String(receipt.nextLegalAction || '').includes('VALIDATION_MERGE')) return null;
  if (!receipt.scope || receipt.scope.diffRequired !== true
      || !/^[0-9a-f]{64}$/.test(String(receipt.scope.diffIdentity || ''))
      || !Array.isArray(receipt.scope.paths) || !receipt.scope.paths.length) return null;
  const prRefs = (receipt.authorityRefs || []).filter(
    (row) => row.kind === 'PR' && row.locator === 'pr:#' + prNumber);
  if (prRefs.length !== 1 || !SHA40_RE.test(String(prRefs[0].identity || ''))) return null;
  const gates = receipt.requiredGates || [];
  const workflowRefs = sorted((receipt.authorityRefs || [])
    .filter((row) => row.kind === 'WORKFLOW_RUN'
      && (row.identity === prRefs[0].identity
        || row.identity === 'head:' + prRefs[0].identity))
    .map((row) => row.locator));
  const workflowSet = new Set(workflowRefs);
  const ownerCiPass = gates.some((row) => row.result === 'PASS'
    && [...workflowSet].some((ref) => row.evidenceLocator === ref
      || String(row.evidenceLocator || '').startsWith(ref + '/job:')));
  return {
    receiptDigest: receipt.receiptDigest,
    headSha: prRefs[0].identity,
    diffIdentity: receipt.scope.diffIdentity,
    paths: sorted(receipt.scope.paths),
    mainRefs: sorted((receipt.authorityRefs || [])
      .filter((row) => row.kind === 'GIT_REF' && row.locator === 'refs/heads/main'
        && SHA40_RE.test(String(row.identity || '')))
      .map((row) => row.identity)),
    workflowRefs,
    ownerCiPass,
    requiredGates: gates,
  };
}

async function fetchPaged(client, endpointBuilder, label) {
  const rows = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    let value;
    try { value = await client.api(endpointBuilder(page)); }
    catch { throw new ContinuationError('UNKNOWN', ['GITHUB_READ_FAILED_' + label]); }
    if (!Array.isArray(value)) throw new ContinuationError('UNKNOWN', ['GITHUB_ARRAY_EXPECTED_' + label]);
    rows.push(...value);
    if (value.length < PAGE_SIZE) return rows;
  }
  throw new ContinuationError('UNKNOWN', [label + '_PAGINATION_BOUND']);
}

async function readComments(client, packetNumber) {
  return fetchPaged(client,
    (page) => '/issues/' + packetNumber + '/comments?per_page=' + PAGE_SIZE + '&page=' + page,
    'COMMENTS');
}
async function readPrFiles(client, prNumber) {
  const rows = await fetchPaged(client,
    (page) => '/pulls/' + prNumber + '/files?per_page=' + PAGE_SIZE + '&page=' + page,
    'PR_FILES');
  return sorted(rows.map((row) => row?.filename).filter(Boolean));
}
async function readPr(client, prNumber) {
  let pr;
  try { pr = await client.api('/pulls/' + prNumber); }
  catch { throw new ContinuationError('UNKNOWN', ['GITHUB_READ_FAILED_PR'], 'pr:#' + prNumber); }
  if (!pr || Number(pr.number) !== prNumber || pr.head?.repo?.full_name !== REPO
      || !SHA40_RE.test(String(pr.head?.sha || ''))) {
    throw new ContinuationError('UNKNOWN', ['PR_IDENTITY_INVALID'], 'pr:#' + prNumber);
  }
  if (pr.merged_at) {
    return {
      raw: pr, state: 'MERGED', headSha: pr.head.sha,
      mergeEffect: SHA40_RE.test(String(pr.merge_commit_sha || '')) ? 'COMPLETE' : 'AMBIGUOUS',
      mergeCommit: SHA40_RE.test(String(pr.merge_commit_sha || '')) ? pr.merge_commit_sha : null,
    };
  }
  if (pr.state === 'open') {
    return {raw: pr, state: 'OPEN', headSha: pr.head.sha, mergeEffect: 'ABSENT', mergeCommit: null};
  }
  if (pr.state === 'closed') {
    return {raw: pr, state: 'CLOSED', headSha: pr.head.sha, mergeEffect: 'ABSENT', mergeCommit: null};
  }
  return {raw: pr, state: 'UNKNOWN', headSha: pr.head.sha, mergeEffect: 'UNKNOWN', mergeCommit: null};
}

function collectCanonicalCandidates(comments, packetNumber, prNumber) {
  const candidates = [];
  const invalid = [];
  for (const comment of comments) {
    const body = typeof comment?.body === 'string' ? comment.body : '';
    if (!body.includes('canonical-main-stage-receipt:v1')) continue;
    const parsed = stageReceipt.parseRenderedStageReceipt(body);
    if (parsed.status !== 'VALID') {
      if (body.includes('Canonical-main stage receipt — IMPLEMENTATION_PR')
          && body.includes('- packet: #' + packetNumber)) {
        invalid.push(...parsed.reasonCodes);
      }
      continue;
    }
    const candidate = candidateFromReceipt(parsed.value, packetNumber, prNumber);
    if (candidate) candidates.push(candidate);
  }
  return {candidates, invalid: sorted(invalid)};
}

function reduceCandidates(candidates, liveHead) {
  const matching = candidates.filter((row) => row.headSha === liveHead);
  if (!matching.length) {
    return {
      state: 'MISSING', candidate: null,
      reasonCodes: candidates.length > 1
        ? ['CANDIDATE_HEAD_ATTRIBUTION_UNKNOWN']
        : ['CANONICAL_CANDIDATE_RECEIPT_MISSING'],
    };
  }
  const keys = sorted(matching.map(candidateSemanticKey));
  if (keys.length !== 1) {
    return {state: 'CONFLICT', candidate: null, reasonCodes: ['VALIDATION_CHECKPOINT_CONFLICT']};
  }
  const representative = [...matching].sort(
    (a, b) => a.receiptDigest.localeCompare(b.receiptDigest))[0];
  const mainRefs = sorted(matching.flatMap((row) => row.mainRefs));
  const workflowRefs = sorted(matching.flatMap((row) => row.workflowRefs));
  const gates = matching.flatMap((row) => row.requiredGates);
  return {
    state: 'EXACT',
    candidate: {
      ...representative,
      receiptDigests: sorted(matching.map((row) => row.receiptDigest)),
      mainRefs,
      workflowRefs,
      requiredGatePass: gates.some((row) => /required/i.test(String(row.name || ''))
        && row.result === 'PASS'),
      ownerCiPass: matching.some((row) => row.ownerCiPass === true),
      exactCurrentizationProof: gates.some((row) =>
        ['currentization-scope-and-blob-preservation', 'currentization-diff-preserved']
          .includes(gateName(row)) && row.result === 'PASS'),
      replaySafe: gates.some((row) =>
        ['packet-scoped-currentization-replay', 'currentization-replay-safe']
          .includes(gateName(row)) && row.result === 'PASS'),
      coordination: coordinationState(gates),
    },
    reasonCodes: [],
  };
}

function coordinationState(gates) {
  if (gates.some((row) =>
    (gateName(row).includes('d013-release') || gateName(row) === 'coordination-released')
    && row.result === 'PASS')) return 'CONVERGED';
  if (gates.some((row) => gateName(row) === 'coordination-not-applicable'
      && ['PASS', 'NOT_APPLICABLE'].includes(row.result))) return 'NOT_APPLICABLE';
  return 'UNKNOWN';
}
function currentizationState(candidate, currentMain) {
  if (!candidate) return 'UNKNOWN';
  if (candidate.mainRefs.length !== 1) return 'UNKNOWN';
  if (candidate.replaySafe) return 'REPLAY_SAFE';
  if (!candidate.exactCurrentizationProof) return 'STALE';
  if (candidate.mainRefs[0] !== currentMain) return 'STALE';
  return 'EXACT_CURRENT_MAIN';
}

async function readRequiredState(client, headSha, prNumber) {
  try {
    const evidence = await validationMerge.readRequiredEvidence(client, headSha, prNumber);
    return {state: 'PASS', evidenceLocator: evidence.evidenceLocator, reasonCodes: []};
  } catch (error) {
    const reasons = error instanceof validationMerge.OwnerError
      ? error.reasonCodes : ['REQUIRED_EVIDENCE_READ_FAILED'];
    const all = new Set(reasons);
    if (error instanceof validationMerge.OwnerError && error.kind === 'CONFLICT') {
      return {state: 'CONFLICT', evidenceLocator: error.locator || null, reasonCodes: reasons};
    }
    if (error instanceof validationMerge.OwnerError && error.kind === 'FAIL') {
      return {state: 'FAIL', evidenceLocator: error.locator || null, reasonCodes: reasons};
    }
    if ([...all].some((code) => code.includes('MISSING') || code.includes('NOT_COMPLETED')
        || code.includes('AMBIGUOUS'))) {
      return {state: 'MISSING', evidenceLocator: error.locator || null, reasonCodes: reasons};
    }
    return {state: 'UNKNOWN', evidenceLocator: error?.locator || null, reasonCodes: reasons};
  }
}

function classifyContinuationEvidence(evidence) {
  const base = {
    freshAdmissionRequired: true,
    result: 'PASS',
    attentionDisposition: 'COMPLETE',
    reasonCodes: [],
  };
  if (evidence.candidateAttribution === 'CONFLICT' || evidence.pathScope === 'CONFLICT') {
    return {...base, resumeDisposition: 'NEEDS_REVIEW', result: 'PARTIAL',
      attentionDisposition: 'NEEDS_REVIEW', reasonCodes: ['VALIDATION_CHECKPOINT_CONFLICT'],
      nextLegalAction: 'SEMANTIC_REVIEW'};
  }
  if (evidence.candidateAttribution !== 'EXACT') {
    return {...base, resumeDisposition: 'NEEDS_REVIEW', result: 'PARTIAL',
      attentionDisposition: 'NEEDS_REVIEW',
      reasonCodes: ['CANDIDATE_HEAD_ATTRIBUTION_UNKNOWN'], nextLegalAction: 'SEMANTIC_REVIEW'};
  }
  if (evidence.mergeEffect === 'AMBIGUOUS') {
    return {...base, resumeDisposition: 'NEEDS_RECOVERY_INSPECT',
      reasonCodes: ['MERGE_EFFECT_AMBIGUOUS'], nextLegalAction: 'EFFECT_RECOVERY_INSPECT'};
  }
  if (evidence.mergeEffect === 'UNKNOWN') {
    return {...base, resumeDisposition: 'UNKNOWN', result: 'UNKNOWN',
      attentionDisposition: 'UNKNOWN', reasonCodes: ['MERGE_EFFECT_UNKNOWN'],
      nextLegalAction: 'TARGETED_DRILL_DOWN'};
  }
  if (evidence.prState === 'MERGED' && evidence.mergeEffect === 'COMPLETE') {
    return {...base, resumeDisposition: 'ALREADY_MERGED', freshAdmissionRequired: false,
      nextLegalAction: 'VALIDATION_MERGE_FINALIZE'};
  }
  if (evidence.prState === 'CLOSED') {
    return {...base, resumeDisposition: 'BLOCKED', result: 'BLOCKED',
      attentionDisposition: 'BLOCKED', reasonCodes: ['PR_CLOSED_UNMERGED'],
      nextLegalAction: 'SEMANTIC_REVIEW'};
  }
  if (evidence.prState !== 'OPEN') {
    return {...base, resumeDisposition: 'UNKNOWN', result: 'UNKNOWN',
      attentionDisposition: 'UNKNOWN', reasonCodes: ['PR_STATE_UNKNOWN'],
      nextLegalAction: 'TARGETED_DRILL_DOWN'};
  }
  if (evidence.packetStage !== 'VALIDATION_MERGE') {
    return {...base, resumeDisposition: 'BLOCKED', result: 'BLOCKED',
      attentionDisposition: 'BLOCKED', reasonCodes: ['PACKET_STAGE_NOT_VALIDATION_MERGE'],
      nextLegalAction: 'SEMANTIC_REVIEW'};
  }
  if (evidence.currentization === 'STALE') {
    return {...base, resumeDisposition: 'CURRENTIZATION_REQUIRED',
      reasonCodes: ['CURRENTIZATION_PROOF_STALE'],
      nextLegalAction: 'PACKET_SCOPED_CURRENTIZATION'};
  }
  if (!['EXACT_CURRENT_MAIN', 'REPLAY_SAFE'].includes(evidence.currentization)) {
    return {...base, resumeDisposition: 'UNKNOWN', result: 'UNKNOWN',
      attentionDisposition: 'UNKNOWN', reasonCodes: ['CURRENTIZATION_PROOF_UNKNOWN'],
      nextLegalAction: 'TARGETED_DRILL_DOWN'};
  }
  if (evidence.required === 'CONFLICT') {
    return {...base, resumeDisposition: 'NEEDS_REVIEW', result: 'PARTIAL',
      attentionDisposition: 'NEEDS_REVIEW', reasonCodes: ['EXACT_HEAD_VALIDATION_CONFLICT'],
      nextLegalAction: 'SEMANTIC_REVIEW'};
  }
  if (['MISSING', 'FAIL'].includes(evidence.required)
      || ['MISSING', 'FAIL'].includes(evidence.ownerCI)) {
    return {...base, resumeDisposition: 'VALIDATION_REFRESH_REQUIRED',
      reasonCodes: ['EXACT_HEAD_VALIDATION_MISSING'],
      nextLegalAction: 'EXACT_HEAD_VALIDATION_REFRESH'};
  }
  if (evidence.required !== 'PASS' || evidence.ownerCI !== 'PASS') {
    return {...base, resumeDisposition: 'UNKNOWN', result: 'UNKNOWN',
      attentionDisposition: 'UNKNOWN', reasonCodes: ['EXACT_HEAD_VALIDATION_UNKNOWN'],
      nextLegalAction: 'TARGETED_DRILL_DOWN'};
  }
  if (!['CONVERGED', 'NOT_APPLICABLE'].includes(evidence.priorCoordination)) {
    return {...base, resumeDisposition: 'UNKNOWN', result: 'UNKNOWN',
      attentionDisposition: 'UNKNOWN', reasonCodes: ['PRIOR_COORDINATION_UNPROVEN'],
      nextLegalAction: 'TARGETED_DRILL_DOWN'};
  }
  if (evidence.mergeEffect !== 'ABSENT') {
    return {...base, resumeDisposition: 'UNKNOWN', result: 'UNKNOWN',
      attentionDisposition: 'UNKNOWN', reasonCodes: ['MERGE_EFFECT_UNKNOWN'],
      nextLegalAction: 'TARGETED_DRILL_DOWN'};
  }
  return {...base, resumeDisposition: 'MERGE_ADMISSION_READY',
    nextLegalAction: 'VALIDATION_MERGE_ADMIT'};
}

function receiptFor({packetNumber, prNumber, candidate, paths, decision, steps, artifacts}) {
  return executionReceipt.projectExecutionReceipt({
    schemaVersion: 2,
    operationId: 'repo-validation-continuation:inspect:' + packetNumber + ':' + prNumber,
    primitiveId: 'repo:validation-continuation-inspect',
    sourceIdentity: {
      kind: 'PULL_REQUEST',
      locator: 'pr:#' + prNumber,
      identity: candidate?.headSha || 'UNKNOWN',
    },
    executionSurface: 'CANONICAL_MAIN:VALIDATION_CONTINUATION',
    stage: 'VALIDATION_MERGE',
    executionLifecycle: 'FINISHED',
    attentionDisposition: decision.attentionDisposition,
    result: decision.result,
    proofScope: 'READ_ONLY_VALIDATION_CONTINUATION_PROJECTION',
    steps,
    counters: [
      {name: 'candidate_receipt_count', value: candidate?.receiptDigests?.length || 0},
      {name: 'merge_effects_performed', value: 0},
      {name: 'changed_paths', value: paths.length},
    ],
    affectedFiles: paths,
    artifactLocators: sorted(artifacts),
    reasonCodes: decision.reasonCodes,
    requiredUnknowns: decision.result === 'UNKNOWN' ? decision.reasonCodes : [],
    conflicts: decision.reasonCodes.includes('VALIDATION_CHECKPOINT_CONFLICT')
      ? decision.reasonCodes : [],
    blockers: decision.result === 'BLOCKED' ? decision.reasonCodes : [],
    exitCode: null,
    stderrTail: null,
    nextLegalAction: decision.nextLegalAction,
  });
}

async function inspectWithClient({client, packetNumber, prNumber}) {
  const steps = [];
  const artifacts = ['issue:#' + packetNumber, 'pr:#' + prNumber];
  const current = await validationMerge.readCurrentMain(client);
  steps.push({name: 'main-ops-currentness', result: 'PASS', evidenceLocator: current.evidenceLocator});
  const packet = await validationMerge.readPacket(client, packetNumber);
  steps.push({name: 'packet-stage-scope', result: 'PASS', evidenceLocator: packet.evidenceLocator});
  const pr = await readPr(client, prNumber);
  steps.push({name: 'live-pr-state', result: 'PASS', evidenceLocator: 'pr:#' + prNumber});
  const files = await readPrFiles(client, prNumber);
  const comments = await readComments(client, packetNumber);
  const canonical = collectCanonicalCandidates(comments, packetNumber, prNumber);
  if (canonical.invalid.length) {
    throw new ContinuationError('UNKNOWN',
      ['CANONICAL_STAGE_EVIDENCE_INVALID', ...canonical.invalid], 'issue:#' + packetNumber);
  }
  const reduced = reduceCandidates(canonical.candidates, pr.headSha);
  const candidate = reduced.candidate;
  let candidateAttribution = reduced.state === 'EXACT' ? 'EXACT'
    : reduced.state === 'CONFLICT' ? 'CONFLICT' : 'MISSING';
  const pathScope = candidate
    ? pathScopeCompatibility(candidate.paths, packet.scopes, files)
    : 'UNKNOWN';
  const currentization = currentizationState(candidate, current.mainSha);
  let required = {state: candidate?.requiredGatePass ? 'PASS' : 'MISSING',
    evidenceLocator: null, reasonCodes: []};
  if (pr.state === 'OPEN' && candidateAttribution === 'EXACT') {
    required = await readRequiredState(client, candidate.headSha, prNumber);
    if (required.evidenceLocator) artifacts.push(required.evidenceLocator);
  }
  const ownerCI = candidate?.ownerCiPass ? 'PASS' : 'MISSING';
  const priorCoordination = candidate?.coordination || 'UNKNOWN';
  const evidence = {
    packetStage: 'VALIDATION_MERGE',
    prState: pr.state,
    candidateAttribution,
    pathScope,
    currentization,
    required: required.state,
    ownerCI,
    priorCoordination,
    mergeEffect: pr.mergeEffect,
  };
  const decision = classifyContinuationEvidence(evidence);
  steps.push({
    name: 'canonical-checkpoint-reduction',
    result: decision.result === 'PASS' ? 'PASS'
      : decision.result === 'PARTIAL' ? 'PARTIAL' : decision.result,
    evidenceLocator: candidate ? 'receipt:canonical-main-stage:' + candidate.receiptDigest
      : 'issue:#' + packetNumber,
  });
  const output = {
    pr: '#' + prNumber,
    resumeDisposition: decision.resumeDisposition,
    candidateHead: candidate?.headSha || 'UNKNOWN',
    diffIdentity: candidate?.diffIdentity || 'UNKNOWN',
    currentization,
    required: required.state,
    ownerCI,
    priorCoordination,
    mergeEffect: pr.mergeEffect,
    freshAdmissionRequired: decision.freshAdmissionRequired,
  };
  const receipt = receiptFor({
    packetNumber, prNumber, candidate, paths: candidate?.paths || packet.paths,
    decision, steps, artifacts,
  });
  const report = {
    schemaVersion: 1,
    mode: 'VALIDATION_CONTINUATION_REPORT',
    packetNumber,
    prNumber,
    currentMain: current.mainSha,
    packetBodySha256: packet.bodySha256,
    candidateReceiptDigests: candidate?.receiptDigests || [],
    candidateHead: candidate?.headSha || null,
    diffIdentity: candidate?.diffIdentity || null,
    pathCount: candidate?.paths?.length || 0,
    prState: pr.state,
    mergeCommit: pr.mergeCommit,
    evidence,
    resumeDisposition: decision.resumeDisposition,
    nextLegalAction: decision.nextLegalAction,
    freshAdmissionRequired: decision.freshAdmissionRequired,
    reasonCodes: decision.reasonCodes,
    receiptDigest: receipt.receiptDigest,
    output,
  };
  return {receipt, report};
}

function evidencePaths(packetNumber, prNumber, root = ROOT) {
  const dir = path.join(validationMerge.gitAdminDir(root), 'validation-continuation-evidence');
  fs.mkdirSync(dir, {recursive: true, mode: 0o700});
  fs.chmodSync(dir, 0o700);
  const prefix = 'packet-' + packetNumber + '-pr-' + prNumber + '.inspect';
  return {
    receipt: path.join(dir, prefix + '.receipt.json'),
    report: path.join(dir, prefix + '.report.json'),
  };
}
function persistResult(result, packetNumber, prNumber, root = ROOT) {
  const paths = evidencePaths(packetNumber, prNumber, root);
  const receiptLocator = validationMerge.writeJsonAtomic(paths.receipt, result.receipt);
  const reportLocator = validationMerge.writeJsonAtomic(paths.report, result.report);
  return {paths, receiptLocator, reportLocator};
}
function projectView(result, locators) {
  return agentDecisionView.projectAgentDecisionView({
    receipt: result.receipt,
    phase: 'VALIDATION_MERGE',
    output: result.report.output,
    attention: [],
    receiptLocator: locators.receiptLocator,
    reportLocator: locators.reportLocator,
  });
}

function parseNumber(value, field) {
  const text = String(value || '').replace(/^#/, '');
  if (!/^[1-9][0-9]*$/.test(text)) throw new Error(field + '_INVALID');
  return Number(text);
}
function parseArgs(argv = process.argv.slice(2)) {
  if (argv[0] !== 'inspect') throw new Error('COMMAND_INVALID');
  const allowed = new Set(['packet', 'pr', 'format']);
  const values = {};
  for (let index = 1; index < argv.length; index += 2) {
    const token = argv[index];
    const value = argv[index + 1];
    if (!token?.startsWith('--') || value === undefined) throw new Error('ARGUMENT_INVALID');
    const key = token.slice(2);
    if (!allowed.has(key) || key in values) throw new Error('ARGUMENT_INVALID');
    values[key] = value;
  }
  const format = values.format || 'agent-view';
  if (!['agent-view', 'receipt'].includes(format)) throw new Error('FORMAT_INVALID');
  return {packetNumber: parseNumber(values.packet, 'PACKET'),
    prNumber: parseNumber(values.pr, 'PR'), format};
}

function errorResult(packetNumber, prNumber, error) {
  const kind = error instanceof ContinuationError ? error.kind : 'UNKNOWN';
  const reasons = error instanceof ContinuationError ? error.reasonCodes : ['CONTINUATION_INTERNAL_ERROR'];
  const decision = {
    resumeDisposition: kind === 'BLOCKED' ? 'BLOCKED'
      : kind === 'NEEDS_REVIEW' || kind === 'CONFLICT' ? 'NEEDS_REVIEW' : 'UNKNOWN',
    freshAdmissionRequired: true,
    result: kind === 'BLOCKED' ? 'BLOCKED'
      : kind === 'NEEDS_REVIEW' || kind === 'CONFLICT' ? 'PARTIAL' : 'UNKNOWN',
    attentionDisposition: kind === 'BLOCKED' ? 'BLOCKED'
      : kind === 'NEEDS_REVIEW' || kind === 'CONFLICT' ? 'NEEDS_REVIEW' : 'UNKNOWN',
    reasonCodes: reasons,
    nextLegalAction: kind === 'BLOCKED' ? 'SEMANTIC_REVIEW' : 'TARGETED_DRILL_DOWN',
  };
  const receipt = receiptFor({
    packetNumber, prNumber, candidate: null, paths: [], decision,
    steps: [{name: 'validation-continuation', result: decision.result,
      evidenceLocator: error?.locator || 'issue:#' + packetNumber}],
    artifacts: ['issue:#' + packetNumber, 'pr:#' + prNumber],
  });
  return {
    receipt,
    report: {
      schemaVersion: 1, mode: 'VALIDATION_CONTINUATION_REPORT',
      packetNumber, prNumber, currentMain: null, packetBodySha256: null,
      candidateReceiptDigests: [], candidateHead: null, diffIdentity: null,
      pathCount: 0, prState: 'UNKNOWN', mergeCommit: null,
      evidence: {}, resumeDisposition: decision.resumeDisposition,
      nextLegalAction: decision.nextLegalAction,
      freshAdmissionRequired: true, reasonCodes: reasons,
      receiptDigest: receipt.receiptDigest,
      output: {
        pr: '#' + prNumber, resumeDisposition: decision.resumeDisposition,
        candidateHead: 'UNKNOWN', diffIdentity: 'UNKNOWN', currentization: 'UNKNOWN',
        required: 'UNKNOWN', ownerCI: 'UNKNOWN', priorCoordination: 'UNKNOWN',
        mergeEffect: 'UNKNOWN', freshAdmissionRequired: true,
      },
    },
  };
}

async function runCli(argv = process.argv.slice(2), options = {}) {
  const args = parseArgs(argv);
  const client = options.client || validationMerge.createLiveClient(options);
  let result;
  try {
    result = await inspectWithClient({
      client, packetNumber: args.packetNumber, prNumber: args.prNumber,
    });
  } catch (error) {
    result = errorResult(args.packetNumber, args.prNumber, error);
  }
  let locators;
  try {
    locators = persistResult(result, args.packetNumber, args.prNumber, options.root || ROOT);
  } catch (error) {
    result = errorResult(args.packetNumber, args.prNumber,
      new ContinuationError('UNKNOWN', ['EVIDENCE_SIDECAR_WRITE_FAILED']));
    if (args.format === 'receipt') {
      return {text: JSON.stringify(canonicalize(result.receipt), null, 2) + '\n',
        code: executionReceipt.exitCodeFor(result.receipt)};
    }
    const view = agentDecisionView.projectAgentDecisionView({
      receipt: result.receipt, phase: 'VALIDATION_MERGE', output: result.report.output,
      attention: [], receiptLocator: '', reportLocator: '',
    });
    return {text: JSON.stringify(canonicalize(view), null, 2) + '\n',
      code: agentDecisionView.exitCodeFor(view)};
  }
  if (args.format === 'receipt') {
    return {text: JSON.stringify(canonicalize(result.receipt), null, 2) + '\n',
      code: executionReceipt.exitCodeFor(result.receipt)};
  }
  const view = projectView(result, locators);
  return {text: JSON.stringify(canonicalize(view), null, 2) + '\n',
    code: agentDecisionView.exitCodeFor(view)};
}

if (require.main === module) {
  runCli().then(({text, code}) => {
    process.stdout.write(text);
    process.exitCode = code;
  }).catch(() => {
    process.stdout.write(JSON.stringify({
      schemaVersion: 1,
      mode: 'REPOSITORY_AGENT_DECISION_VIEW',
      validity: 'INVALID',
      phase: 'UNKNOWN',
      result: 'UNKNOWN',
      reasonCodes: ['RUNTIME_ERROR'],
    }) + '\n');
    process.exitCode = 2;
  });
}

module.exports = {
  CURRENTIZATION_STATES,
  ContinuationError,
  RESUME_DISPOSITIONS,
  candidateFromReceipt,
  classifyContinuationEvidence,
  collectCanonicalCandidates,
  coordinationState,
  currentizationState,
  inspectWithClient,
  parseArgs,
  pathScopeCompatibility,
  persistResult,
  projectView,
  readPr,
  reduceCandidates,
  runCli,
};
