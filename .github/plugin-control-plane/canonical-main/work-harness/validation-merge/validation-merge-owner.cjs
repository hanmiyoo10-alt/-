#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../..');
const REPO = 'hanmiyoo10-alt/-';
const OPS_ISSUE = 485;
const PAGE_SIZE = 100;
const MAX_PAGES = 20;
const MAX_INPUT_BYTES = 16 * 1024;
const MAX_REPORT_BYTES = 32 * 1024;
const SHA40_RE = /^[0-9a-f]{40}$/;
const PACKET_MARKER = '<!-- canonical-main-work-packet:v1 -->';

const {createGitHubClient} = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/infra/github-client.cjs'));
const packetProjection = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/work-system/packet-projection.cjs'));
const scopeOverlap = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/work-system/scope-overlap.cjs'));
const stageReceipt = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/work-harness/stage-receipt.cjs'));
const executionReceipt = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/work-harness/execution-receipt.cjs'));
const agentDecisionView = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/work-harness/agent-decision-view.cjs'));
const {canonicalize} = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/work-harness/handoff.cjs'));

class OwnerError extends Error {
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
function stableEqual(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}
function sorted(values) {
  return [...new Set(values)].sort();
}
function assertSha(value, reason) {
  if (!SHA40_RE.test(String(value || ''))) throw new OwnerError('UNKNOWN', [reason]);
  return String(value);
}
function readRegularJson(filePath, maxBytes = MAX_INPUT_BYTES) {
  const resolved = path.resolve(filePath);
  const stat = fs.lstatSync(resolved);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxBytes) {
    throw new OwnerError('UNKNOWN', ['INPUT_FILE_INVALID']);
  }
  try {
    return JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch {
    throw new OwnerError('UNKNOWN', ['INPUT_JSON_INVALID']);
  }
}

function stageReceiptFacts(receipt) {
  return {
    schemaVersion: 1,
    packetNumber: receipt.packetNumber,
    stage: receipt.stage,
    authorityRefs: (receipt.authorityRefs || []).map(({kind, locator, identity}) => (
      {kind, locator, identity}
    )),
    requiredGates: (receipt.requiredGates || []).map(({name, result, evidenceLocator}) => (
      {name, result, evidenceLocator}
    )),
    scope: receipt.scope,
    proof: receipt.proof,
    requiredUnknowns: receipt.requiredUnknowns,
    conflicts: receipt.conflicts,
    blockers: receipt.blockers,
    dependencies: receipt.dependencies,
    nextLegalAction: receipt.nextLegalAction,
  };
}

function validateImplementationReceipt(receipt, packetNumber, prNumber) {
  if (!receipt || receipt.mode !== 'CANONICAL_MAIN_STAGE_RECEIPT'
      || receipt.schemaVersion !== 1 || receipt.status !== 'PASS') {
    throw new OwnerError('UNKNOWN', ['IMPLEMENTATION_STAGE_RECEIPT_PASS_REQUIRED']);
  }
  const rebuilt = stageReceipt.projectStageReceipt(stageReceiptFacts(receipt));
  if (rebuilt.status !== 'PASS' || !stableEqual(rebuilt, receipt)) {
    throw new OwnerError('CONFLICT', ['IMPLEMENTATION_STAGE_RECEIPT_IDENTITY_CONFLICT']);
  }
  if (receipt.packetNumber !== packetNumber || receipt.stage !== 'IMPLEMENTATION_PR') {
    throw new OwnerError('CONFLICT', ['IMPLEMENTATION_STAGE_RECEIPT_TARGET_MISMATCH']);
  }
  if ((receipt.requiredUnknowns || []).length || (receipt.conflicts || []).length
      || (receipt.blockers || []).length || (receipt.dependencies || []).length) {
    throw new OwnerError('UNKNOWN', ['IMPLEMENTATION_STAGE_RECEIPT_UNRESOLVED']);
  }
  const proofTerms = new Set((receipt.proof || []).map((row) => row.term));
  if (!proofTerms.has('IMPLEMENTED') || !proofTerms.has('CONTRACT_PROVEN')) {
    throw new OwnerError('UNKNOWN', ['IMPLEMENTATION_STAGE_PROOF_INCOMPLETE']);
  }
  if (!receipt.scope || receipt.scope.diffRequired !== true
      || !Array.isArray(receipt.scope.paths) || !receipt.scope.paths.length
      || !receipt.scope.diffIdentity || !receipt.scope.diffEvidenceLocator) {
    throw new OwnerError('UNKNOWN', ['IMPLEMENTATION_STAGE_SCOPE_INCOMPLETE']);
  }
  if (!String(receipt.nextLegalAction || '').includes('VALIDATION_MERGE')) {
    throw new OwnerError('CONFLICT', ['IMPLEMENTATION_STAGE_NEXT_ACTION_MISMATCH']);
  }
  const prRefs = (receipt.authorityRefs || []).filter((row) => (
    row.kind === 'PR' && row.locator === 'pr:#' + prNumber
  ));
  if (prRefs.length !== 1 || !SHA40_RE.test(String(prRefs[0].identity || ''))) {
    throw new OwnerError('UNKNOWN', ['IMPLEMENTATION_STAGE_PR_IDENTITY_MISSING']);
  }
  return {receipt, expectedHead: prRefs[0].identity, paths: sorted(receipt.scope.paths)};
}

function parseOpsCapsule(body) {
  const text = typeof body === 'string' ? body : '';
  const heading = '## Canonical Operator Capsule';
  const start = text.indexOf(heading);
  if (start < 0) throw new OwnerError('UNKNOWN', ['OPS_CAPSULE_MISSING'], 'issue:#485');
  const lines = text.slice(start + heading.length).split(/\r?\n/).slice(1);
  const order = new Set(['STATE', 'MAIN', 'CHANGE', 'WHY', 'NEXT', 'AUTHORITY', 'UNKNOWN']);
  const fields = {};
  for (const line of lines) {
    if (!line.trim()) break;
    const match = /^- ([A-Z]+): (.+)$/.exec(line);
    if (!match || !order.has(match[1]) || Object.hasOwn(fields, match[1])) {
      throw new OwnerError('UNKNOWN', ['OPS_CAPSULE_INVALID'], 'issue:#485');
    }
    fields[match[1]] = match[2];
  }
  for (const key of order) {
    if (!(key in fields)) throw new OwnerError('UNKNOWN', ['OPS_CAPSULE_INCOMPLETE'], 'issue:#485');
  }
  const main = /^\x60([0-9a-f]{40})\x60 \/ Required (.+)$/.exec(fields.MAIN);
  const state = /^\x60(CLEAR|ATTENTION|INCIDENT|UNKNOWN)\x60$/.exec(fields.STATE);
  if (!main || !state) throw new OwnerError('UNKNOWN', ['OPS_CAPSULE_INVALID'], 'issue:#485');
  return {
    mainSha: main[1],
    requiredSummary: main[2],
    operatorState: state[1],
    unknownField: fields.UNKNOWN,
  };
}

async function api(client, endpoint, label) {
  try {
    return await client.api(endpoint);
  } catch {
    throw new OwnerError('UNKNOWN', ['GITHUB_READ_FAILED_' + label]);
  }
}

async function readCurrentMain(client) {
  const first = await api(client, '/branches/main', 'MAIN_FIRST');
  const issue = await api(client, '/issues/' + OPS_ISSUE, 'OPS');
  const second = await api(client, '/branches/main', 'MAIN_SECOND');
  const firstSha = assertSha(first?.commit?.sha, 'MAIN_SHA_INVALID');
  const secondSha = assertSha(second?.commit?.sha, 'MAIN_SHA_INVALID');
  if (firstSha !== secondSha) throw new OwnerError('UNKNOWN', ['MAIN_CHANGED_DURING_CAPTURE']);
  if (!issue || issue.pull_request || issue.state !== 'open') {
    throw new OwnerError('UNKNOWN', ['OPS_ISSUE_INVALID'], 'issue:#485');
  }
  const capsule = parseOpsCapsule(issue.body);
  if (capsule.mainSha !== firstSha) {
    throw new OwnerError('UNKNOWN', ['OPS_MAIN_MISMATCH'], 'issue:#485');
  }
  if (capsule.operatorState === 'UNKNOWN') {
    throw new OwnerError('UNKNOWN', ['OPS_STATE_UNKNOWN'], 'issue:#485');
  }
  if (capsule.operatorState !== 'CLEAR') {
    throw new OwnerError('BLOCKED', ['OPS_STATE_NOT_CLEAR'], 'issue:#485');
  }
  if (!capsule.requiredSummary.startsWith('PASS')) {
    throw new OwnerError('BLOCKED', ['OPS_REQUIRED_NOT_PASS'], 'issue:#485');
  }
  if (capsule.unknownField !== 'NONE') {
    throw new OwnerError('UNKNOWN', ['OPS_REQUIRED_UNKNOWN_PRESENT'], 'issue:#485');
  }
  return {mainSha: firstSha, evidenceLocator: 'issue:#485'};
}

async function fetchPagedArray(client, endpointBuilder, label, maxPages = MAX_PAGES) {
  const rows = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const value = await api(client, endpointBuilder(page), label);
    if (!Array.isArray(value)) throw new OwnerError('UNKNOWN', ['GITHUB_ARRAY_EXPECTED_' + label]);
    rows.push(...value);
    if (value.length < PAGE_SIZE) return {rows, complete: true};
  }
  return {rows, complete: false};
}

async function readPacket(client, packetNumber) {
  const issue = await api(client, '/issues/' + packetNumber, 'PACKET');
  if (!issue || issue.pull_request || issue.state !== 'open') {
    throw new OwnerError('BLOCKED', ['PACKET_NOT_OPEN'], 'issue:#' + packetNumber);
  }
  const projection = packetProjection.classifyPacketProjection(issue.body);
  if (projection.disposition === 'CONFLICT') {
    throw new OwnerError('CONFLICT', projection.reasonCodes, 'issue:#' + packetNumber);
  }
  if (projection.disposition !== 'PASS') {
    throw new OwnerError('UNKNOWN', projection.reasonCodes, 'issue:#' + packetNumber);
  }
  if (projection.lifecycle !== 'IN_PROGRESS') {
    throw new OwnerError('BLOCKED', ['PACKET_NOT_IN_PROGRESS'], 'issue:#' + packetNumber);
  }
  if (projection.interactionStage !== 'VALIDATION_MERGE') {
    throw new OwnerError('BLOCKED', ['PACKET_STAGE_NOT_VALIDATION_MERGE'], 'issue:#' + packetNumber);
  }
  const parsed = scopeOverlap.extractPacketScopes(issue.body);
  if (!parsed.ok) {
    throw new OwnerError(parsed.conflict ? 'CONFLICT' : 'UNKNOWN',
      [parsed.conflict ? 'PACKET_SCOPE_CONFLICT' : 'PACKET_SCOPE_UNKNOWN'],
      'issue:#' + packetNumber);
  }
  const scopes = parsed.scopes.map((row) => row.normalized).sort();
  const paths = parsed.scopes.filter((row) => row.kind === 'path').map((row) => row.value).sort();
  return {
    bodySha256: sha256(String(issue.body || '')),
    scopes,
    paths,
    evidenceLocator: 'issue:#' + packetNumber,
  };
}

async function readPrHeader(client, prNumber) {
  const pr = await api(client, '/pulls/' + prNumber, 'PR');
  if (!pr || Number(pr.number) !== prNumber) {
    throw new OwnerError('UNKNOWN', ['PR_IDENTITY_INVALID'], 'pr:#' + prNumber);
  }
  return pr;
}

async function readOpenPr(client, prNumber, mainSha, expectedHead, expectedPaths) {
  const pr = await readPrHeader(client, prNumber);
  if (pr.state !== 'open') throw new OwnerError('BLOCKED', ['PR_NOT_OPEN'], 'pr:#' + prNumber);
  if (pr.draft === true) throw new OwnerError('BLOCKED', ['PR_DRAFT'], 'pr:#' + prNumber);
  if (pr.base?.ref !== 'main' || pr.base?.sha !== mainSha) {
    throw new OwnerError('BLOCKED', ['PR_BASE_NOT_CURRENT_MAIN'], 'pr:#' + prNumber);
  }
  if (pr.head?.sha !== expectedHead || pr.head?.repo?.full_name !== REPO) {
    throw new OwnerError('CONFLICT', ['PR_HEAD_IDENTITY_MISMATCH'], 'pr:#' + prNumber);
  }
  if (typeof pr.head?.ref !== 'string' || !pr.head.ref) {
    throw new OwnerError('UNKNOWN', ['PR_HEAD_REF_UNKNOWN'], 'pr:#' + prNumber);
  }
  if (pr.mergeable !== true) {
    throw new OwnerError(pr.mergeable === false ? 'BLOCKED' : 'UNKNOWN',
      [pr.mergeable === false ? 'PR_NOT_MERGEABLE' : 'PR_MERGEABILITY_UNKNOWN'],
      'pr:#' + prNumber);
  }
  const files = await fetchPagedArray(client,
    (page) => '/pulls/' + prNumber + '/files?per_page=' + PAGE_SIZE + '&page=' + page,
    'PR_FILES');
  if (!files.complete) throw new OwnerError('UNKNOWN', ['PR_FILE_INVENTORY_INCOMPLETE']);
  const actual = sorted(files.rows.map((row) => row?.filename).filter(Boolean));
  if (JSON.stringify(actual) !== JSON.stringify(sorted(expectedPaths))) {
    throw new OwnerError('CONFLICT', ['PR_CHANGED_FILES_SCOPE_MISMATCH'], 'pr:#' + prNumber);
  }
  return {
    headSha: expectedHead,
    headRef: pr.head.ref,
    baseSha: mainSha,
    paths: actual,
    evidenceLocator: 'pr:#' + prNumber,
  };
}

const REVIEW_THREADS_QUERY = [
  'query($owner:String!,$name:String!,$number:Int!){',
  ' repository(owner:$owner,name:$name){',
  '  pullRequest(number:$number){',
  '   reviewThreads(first:100){',
  '    pageInfo{hasNextPage}',
  '    nodes{isResolved comments(first:20){pageInfo{hasNextPage} nodes{outdated}}}',
  '   }',
  '  }',
  ' }',
  '}',
].join('\n');

async function readReviewBarrier(client, prNumber) {
  const reviews = await fetchPagedArray(client,
    (page) => '/pulls/' + prNumber + '/reviews?per_page=100&page=' + page, 'REVIEWS');
  const issueComments = await fetchPagedArray(client,
    (page) => '/issues/' + prNumber + '/comments?per_page=100&page=' + page, 'PR_COMMENTS');
  const reviewComments = await fetchPagedArray(client,
    (page) => '/pulls/' + prNumber + '/comments?per_page=100&page=' + page, 'REVIEW_COMMENTS');
  if (!reviews.complete || !issueComments.complete || !reviewComments.complete) {
    throw new OwnerError('UNKNOWN', ['REVIEW_INVENTORY_INCOMPLETE'], 'pr:#' + prNumber);
  }
  const requested = await api(client,
    '/pulls/' + prNumber + '/requested_reviewers?per_page=100', 'REQUESTED_REVIEWERS');
  if (!requested || !Array.isArray(requested.users) || !Array.isArray(requested.teams)
      || requested.users.length >= 100 || requested.teams.length >= 100) {
    throw new OwnerError('UNKNOWN', ['REQUESTED_REVIEWERS_INCOMPLETE'], 'pr:#' + prNumber);
  }
  let threadData;
  try {
    threadData = await client.graphql(REVIEW_THREADS_QUERY, {
      owner: 'hanmiyoo10-alt', name: '-', number: prNumber,
    });
  } catch {
    throw new OwnerError('UNKNOWN', ['REVIEW_THREADS_READ_FAILED'], 'pr:#' + prNumber);
  }
  const threads = threadData?.data?.repository?.pullRequest?.reviewThreads;
  if (!threads || !Array.isArray(threads.nodes) || threads.pageInfo?.hasNextPage) {
    throw new OwnerError('UNKNOWN', ['REVIEW_THREADS_INCOMPLETE'], 'pr:#' + prNumber);
  }
  let unresolved = 0;
  for (const thread of threads.nodes) {
    if (thread?.isResolved === true) continue;
    const comments = thread?.comments;
    if (!comments || !Array.isArray(comments.nodes) || !comments.nodes.length
        || comments.pageInfo?.hasNextPage) {
      throw new OwnerError('UNKNOWN', ['REVIEW_THREAD_STATE_UNKNOWN'], 'pr:#' + prNumber);
    }
    if (!comments.nodes.every((row) => row?.outdated === true)) unresolved += 1;
  }
  const decisive = new Map();
  const ordered = [...reviews.rows].sort((a, b) => (
    (String(a?.submitted_at || '') + ':' + String(a?.id || '')).localeCompare(
      String(b?.submitted_at || '') + ':' + String(b?.id || ''))
  ));
  for (const review of ordered) {
    const login = review?.user?.login;
    const state = String(review?.state || '').toUpperCase();
    if (login && ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(state)) {
      decisive.set(login, state);
    }
  }
  if ([...decisive.values()].includes('CHANGES_REQUESTED')) {
    throw new OwnerError('BLOCKED', ['REVIEW_CHANGES_REQUESTED'], 'pr:#' + prNumber);
  }
  if (unresolved) {
    throw new OwnerError('BLOCKED', ['REVIEW_THREAD_UNRESOLVED'], 'pr:#' + prNumber);
  }
  const pending = requested.users.length + requested.teams.length;
  if (pending) {
    throw new OwnerError('NEEDS_REVIEW', ['REVIEW_REQUEST_PENDING'], 'pr:#' + prNumber);
  }
  return {
    reviewCount: reviews.rows.length,
    issueCommentCount: issueComments.rows.length,
    reviewCommentCount: reviewComments.rows.length,
    unresolvedThreadCount: unresolved,
    pendingReviewerCount: pending,
    evidenceLocator: 'pr:#' + prNumber,
  };
}

async function readRequiredEvidence(client, headSha, prNumber) {
  const data = await api(client,
    '/actions/runs?head_sha=' + headSha + '&per_page=100', 'ACTIONS_RUNS');
  if (!data || !Array.isArray(data.workflow_runs) || !Number.isInteger(data.total_count)
      || data.total_count > 100 || data.workflow_runs.length !== data.total_count) {
    throw new OwnerError('UNKNOWN', ['REQUIRED_RUN_INVENTORY_INCOMPLETE']);
  }
  if (data.workflow_runs.some((run) => run?.head_sha !== headSha)) {
    throw new OwnerError('CONFLICT', ['REQUIRED_RUN_SHA_MISMATCH']);
  }
  const matches = data.workflow_runs.filter((run) => {
    if (run?.event !== 'pull_request') return false;
    const workflowMatch = run?.name === 'SimCore CI'
      || String(run?.path || '').endsWith('.github/workflows/simcore-ci.yml');
    if (!workflowMatch) return false;
    if (Array.isArray(run.pull_requests) && run.pull_requests.length) {
      return run.pull_requests.some((row) => Number(row?.number) === prNumber);
    }
    return true;
  });
  if (matches.length !== 1) {
    throw new OwnerError('UNKNOWN',
      [matches.length ? 'REQUIRED_RUN_AMBIGUOUS' : 'REQUIRED_RUN_MISSING']);
  }
  const run = matches[0];
  if (run.status !== 'completed') {
    throw new OwnerError('BLOCKED', ['REQUIRED_RUN_NOT_COMPLETED'], 'run:' + run.id);
  }
  if (run.conclusion !== 'success') {
    throw new OwnerError('FAIL', ['REQUIRED_RUN_FAILED'], 'run:' + run.id);
  }
  const jobs = await api(client,
    '/actions/runs/' + run.id + '/jobs?per_page=100', 'ACTIONS_JOBS');
  if (!jobs || !Array.isArray(jobs.jobs) || !Number.isInteger(jobs.total_count)
      || jobs.total_count > 100 || jobs.jobs.length !== jobs.total_count) {
    throw new OwnerError('UNKNOWN', ['REQUIRED_JOB_INVENTORY_INCOMPLETE'], 'run:' + run.id);
  }
  const required = jobs.jobs.filter((job) => job?.name === 'Required');
  if (required.length !== 1) {
    throw new OwnerError('UNKNOWN', ['REQUIRED_JOB_AMBIGUOUS'], 'run:' + run.id);
  }
  if (required[0].status !== 'completed') {
    throw new OwnerError('BLOCKED', ['REQUIRED_JOB_NOT_COMPLETED'], 'run:' + run.id);
  }
  if (required[0].conclusion !== 'success') {
    throw new OwnerError('FAIL', ['REQUIRED_JOB_FAILED'], 'run:' + run.id);
  }
  return {
    runId: Number(run.id),
    jobId: Number(required[0].id),
    evidenceLocator: 'run:' + run.id + '/job:' + required[0].id,
  };
}

async function discoverOverlap(client, packetNumber, prNumber, requestedScopes) {
  const issueInventory = await fetchPagedArray(client,
    (page) => '/issues?state=open&per_page=100&page=' + page, 'OPEN_ISSUES');
  const prInventory = await fetchPagedArray(client,
    (page) => '/pulls?state=open&per_page=100&page=' + page, 'OPEN_PRS');
  let discovery = issueInventory.complete && prInventory.complete ? 'COMPLETE' : 'PARTIAL';
  const candidates = issueInventory.rows
    .filter((row) => !row?.pull_request && Number(row?.number) !== packetNumber
      && String(row?.body || '').includes(PACKET_MARKER))
    .map((row) => ({
      type: 'packet', ref: 'issue:#' + row.number, issueState: row.state, body: row.body,
    }));
  for (const pr of prInventory.rows) {
    if (Number(pr?.number) === prNumber) continue;
    const files = await fetchPagedArray(client,
      (page) => '/pulls/' + pr.number + '/files?per_page=100&page=' + page,
      'OVERLAP_PR_FILES');
    if (!files.complete) discovery = 'PARTIAL';
    candidates.push({
      type: 'pr',
      ref: 'pr:#' + pr.number,
      state: pr.state,
      changedFiles: files.rows.map((row) => row?.filename).filter(Boolean),
      filesComplete: files.complete,
    });
  }
  const result = scopeOverlap.resolveScopeOverlap({requestedScopes, discovery, candidates});
  if (result.discovery !== 'COMPLETE') {
    throw new OwnerError('UNKNOWN', ['OVERLAP_DISCOVERY_INCOMPLETE'],
      'owner:work-system-scope-overlap');
  }
  if (result.state === 'CONFLICT') {
    throw new OwnerError('CONFLICT', ['OVERLAP_CONFLICT'], 'owner:work-system-scope-overlap');
  }
  if (result.state === 'UNKNOWN') {
    throw new OwnerError('UNKNOWN', ['OVERLAP_UNKNOWN'], 'owner:work-system-scope-overlap');
  }
  if (result.state === 'OVERLAP' || result.findings.length) {
    throw new OwnerError('BLOCKED', ['OVERLAP_PRESENT'], 'owner:work-system-scope-overlap');
  }
  return {candidateCount: result.candidateCount, evidenceLocator: 'owner:work-system-scope-overlap'};
}

function errorDisposition(error) {
  if (!(error instanceof OwnerError)) {
    return {result: 'UNKNOWN', attentionDisposition: 'UNKNOWN', reasonCodes: ['OWNER_INTERNAL_ERROR']};
  }
  const mapping = {
    CONFLICT: ['CONFLICT', 'CONFLICT'],
    UNKNOWN: ['UNKNOWN', 'UNKNOWN'],
    BLOCKED: ['BLOCKED', 'BLOCKED'],
    NEEDS_REVIEW: ['PARTIAL', 'NEEDS_REVIEW'],
    FAIL: ['FAIL', 'NEEDS_REVIEW'],
  };
  const pair = mapping[error.kind] || mapping.UNKNOWN;
  return {result: pair[0], attentionDisposition: pair[1], reasonCodes: error.reasonCodes};
}
function stepResult(error) {
  if (!(error instanceof OwnerError)) return 'UNKNOWN';
  if (error.kind === 'CONFLICT') return 'CONFLICT';
  if (error.kind === 'BLOCKED') return 'BLOCKED';
  if (error.kind === 'FAIL') return 'FAIL';
  if (error.kind === 'NEEDS_REVIEW') return 'PARTIAL';
  return 'UNKNOWN';
}


function makeReceipt({
  operation, packetNumber, prNumber, headSha, paths, steps, error = null,
  nextLegalAction, artifactLocators = [],
}) {
  const disposition = error
    ? errorDisposition(error)
    : {result: 'PASS', attentionDisposition: 'COMPLETE', reasonCodes: []};
  return executionReceipt.projectExecutionReceipt({
    schemaVersion: 2,
    operationId: 'repo-validation-merge:' + operation + ':' + packetNumber + ':' + prNumber,
    primitiveId: 'repo:validation-merge-' + operation,
    sourceIdentity: {
      kind: 'PULL_REQUEST',
      locator: 'pr:#' + prNumber,
      identity: SHA40_RE.test(String(headSha || '')) ? headSha : 'UNKNOWN',
    },
    executionSurface: 'CANONICAL_MAIN:VALIDATION_MERGE',
    stage: 'VALIDATION_MERGE',
    executionLifecycle: 'FINISHED',
    attentionDisposition: disposition.attentionDisposition,
    result: disposition.result,
    proofScope: operation === 'inspect'
      ? 'read-only validation merge readiness only; merge effect excluded'
      : 'read-only exact merged PR identity finalization only; postmerge convergence excluded',
    steps,
    counters: [
      {name: 'changed_paths', value: Array.isArray(paths) ? paths.length : 0},
      {name: 'merge_effects_performed', value: 0},
    ],
    affectedFiles: Array.isArray(paths) ? paths : [],
    artifactLocators: sorted(['issue:#' + packetNumber, 'pr:#' + prNumber, ...artifactLocators]),
    reasonCodes: disposition.reasonCodes,
    requiredUnknowns: error?.kind === 'UNKNOWN' ? error.reasonCodes : [],
    conflicts: error?.kind === 'CONFLICT' ? error.reasonCodes : [],
    blockers: error?.kind === 'BLOCKED' ? error.reasonCodes : [],
    exitCode: null,
    stderrTail: null,
    nextLegalAction,
  });
}

async function inspectWithClient({client, packetNumber, prNumber, implementationReceipt}) {
  const steps = [];
  const artifacts = [];
  const state = {headSha: null, paths: [], output: {pr: '#' + prNumber, merge: 'NOT_RUN'}};
  async function perform(name, locator, fn) {
    try {
      const value = await fn();
      steps.push({name, result: 'PASS', evidenceLocator: locator});
      return value;
    } catch (error) {
      steps.push({
        name,
        result: stepResult(error),
        evidenceLocator: error?.locator || locator || 'UNKNOWN',
      });
      throw error;
    }
  }
  try {
    const implementation = await perform('implementation-stage-receipt',
      'receipt:canonical-main-stage:IMPLEMENTATION_PR',
      async () => validateImplementationReceipt(implementationReceipt, packetNumber, prNumber));
    state.headSha = implementation.expectedHead;
    state.paths = implementation.paths;
    const current = await perform('main-ops-currentness', 'issue:#485',
      () => readCurrentMain(client));
    const packet = await perform('packet-stage-scope', 'issue:#' + packetNumber,
      () => readPacket(client, packetNumber));
    if (JSON.stringify(packet.paths) !== JSON.stringify(implementation.paths)) {
      throw new OwnerError('CONFLICT', ['IMPLEMENTATION_PACKET_SCOPE_MISMATCH'],
        'issue:#' + packetNumber);
    }
    const pr = await perform('pr-identity-files', 'pr:#' + prNumber,
      () => readOpenPr(client, prNumber, current.mainSha, implementation.expectedHead, packet.paths));
    const reviews = await perform('review-barrier', 'pr:#' + prNumber,
      () => readReviewBarrier(client, prNumber));
    const required = await perform('exact-head-required', 'commit:' + implementation.expectedHead,
      () => readRequiredEvidence(client, implementation.expectedHead, prNumber));
    artifacts.push(required.evidenceLocator);
    const overlap = await perform('fresh-overlap', 'owner:work-system-scope-overlap',
      () => discoverOverlap(client, packetNumber, prNumber, packet.scopes));
    const finalCurrent = await perform('final-main-ops-currentness', 'issue:#485',
      () => readCurrentMain(client));
    const finalPacket = await perform('final-packet-currentness', 'issue:#' + packetNumber,
      () => readPacket(client, packetNumber));
    const finalPr = await perform('final-pr-currentness', 'pr:#' + prNumber,
      () => readOpenPr(client, prNumber, finalCurrent.mainSha, implementation.expectedHead, packet.paths));
    await perform('final-review-currentness', 'pr:#' + prNumber,
      () => readReviewBarrier(client, prNumber));
    await perform('final-overlap-currentness', 'owner:work-system-scope-overlap',
      () => discoverOverlap(client, packetNumber, prNumber, packet.scopes));
    if (finalCurrent.mainSha !== current.mainSha
        || finalPacket.bodySha256 !== packet.bodySha256
        || finalPr.headSha !== pr.headSha || finalPr.baseSha !== pr.baseSha) {
      throw new OwnerError('UNKNOWN', ['VALIDATION_STATE_CHANGED_DURING_CAPTURE']);
    }
    state.output = {
      pr: '#' + prNumber,
      headExact: true,
      baseExact: true,
      reviewClear: true,
      overlap: 'DISJOINT',
      required: 'PASS',
      merge: 'NOT_RUN',
      expectedHead: implementation.expectedHead,
    };
    const receipt = makeReceipt({
      operation: 'inspect',
      packetNumber,
      prNumber,
      headSha: implementation.expectedHead,
      paths: packet.paths,
      steps,
      nextLegalAction: 'MERGE_PR_WITH_EXISTING_EXPECTED_HEAD_ENDPOINT',
      artifactLocators: artifacts,
    });
    return {
      receipt,
      report: {
        schemaVersion: 1,
        mode: 'VALIDATION_MERGE_REPORT',
        operation: 'inspect',
        packetNumber,
        prNumber,
        packetBodySha256: packet.bodySha256,
        currentMainSha: current.mainSha,
        expectedHead: implementation.expectedHead,
        paths: packet.paths,
        scopes: packet.scopes,
        requiredRunId: required.runId,
        requiredJobId: required.jobId,
        overlapCandidateCount: overlap.candidateCount,
        reviewCount: reviews.reviewCount,
        issueCommentCount: reviews.issueCommentCount,
        reviewCommentCount: reviews.reviewCommentCount,
        result: 'PASS',
        receiptDigest: receipt.receiptDigest,
        output: state.output,
      },
    };
  } catch (error) {
    const receipt = makeReceipt({
      operation: 'inspect',
      packetNumber,
      prNumber,
      headSha: state.headSha,
      paths: state.paths,
      steps,
      error,
      nextLegalAction: error?.kind === 'NEEDS_REVIEW'
        ? 'RESOLVE_PENDING_REVIEW'
        : 'TARGETED_DRILLDOWN_REQUIRED',
      artifactLocators: artifacts,
    });
    return {
      receipt,
      report: {
        schemaVersion: 1,
        mode: 'VALIDATION_MERGE_REPORT',
        operation: 'inspect',
        packetNumber,
        prNumber,
        expectedHead: state.headSha,
        paths: state.paths,
        result: receipt.result,
        reasonCodes: receipt.reasonCodes,
        receiptDigest: receipt.receiptDigest,
        output: state.output,
      },
    };
  }
}

function gitAdminDir(root = ROOT) {
  const dotGit = path.join(root, '.git');
  const stat = fs.lstatSync(dotGit);
  if (stat.isDirectory()) return dotGit;
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new OwnerError('UNKNOWN', ['GIT_ADMIN_UNAVAILABLE']);
  }
  const raw = fs.readFileSync(dotGit, 'utf8').trim();
  const match = /^gitdir:\s*(.+)$/.exec(raw);
  if (!match) throw new OwnerError('UNKNOWN', ['GIT_ADMIN_UNAVAILABLE']);
  const resolved = path.resolve(root, match[1]);
  if (!fs.statSync(resolved).isDirectory()) {
    throw new OwnerError('UNKNOWN', ['GIT_ADMIN_UNAVAILABLE']);
  }
  return resolved;
}
function evidencePaths(packetNumber, prNumber, operation, root = ROOT) {
  const dir = path.join(gitAdminDir(root), 'validation-merge-evidence');
  fs.mkdirSync(dir, {recursive: true, mode: 0o700});
  fs.chmodSync(dir, 0o700);
  const prefix = 'packet-' + packetNumber + '-pr-' + prNumber + '.' + operation;
  return {
    receipt: path.join(dir, prefix + '.receipt.json'),
    report: path.join(dir, prefix + '.report.json'),
  };
}
function writeJsonAtomic(filePath, value) {
  const bytes = Buffer.from(JSON.stringify(canonicalize(value), null, 2) + '\n', 'utf8');
  if (bytes.length > MAX_REPORT_BYTES) {
    throw new OwnerError('UNKNOWN', ['EVIDENCE_SIDECAR_TOO_LARGE']);
  }
  const temporary = filePath + '.tmp-' + process.pid;
  let fd;
  try {
    fd = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(fd, bytes);
    fs.closeSync(fd);
    fd = null;
    fs.renameSync(temporary, filePath);
    fs.chmodSync(filePath, 0o600);
  } catch {
    if (fd !== undefined && fd !== null) {
      try { fs.closeSync(fd); } catch {}
    }
    try { fs.unlinkSync(temporary); } catch {}
    throw new OwnerError('UNKNOWN', ['EVIDENCE_SIDECAR_WRITE_FAILED']);
  }
  return 'local-artifact:' + filePath + '#sha256=' + sha256(bytes);
}
function persistResult(result, packetNumber, prNumber, operation, root = ROOT) {
  const paths = evidencePaths(packetNumber, prNumber, operation, root);
  const receiptLocator = writeJsonAtomic(paths.receipt, result.receipt);
  const reportLocator = writeJsonAtomic(paths.report, result.report);
  return {paths, receiptLocator, reportLocator};
}
function projectView(result, locators) {
  return agentDecisionView.projectAgentDecisionView({
    receipt: result.receipt,
    phase: 'VALIDATION_MERGE',
    output: result.report.output || {},
    attention: [],
    receiptLocator: locators.receiptLocator,
    reportLocator: locators.reportLocator,
  });
}


function readCanonicalInspectEvidence(packetNumber, prNumber, root = ROOT) {
  const paths = evidencePaths(packetNumber, prNumber, 'inspect', root);
  const receipt = readRegularJson(paths.receipt, MAX_REPORT_BYTES);
  const report = readRegularJson(paths.report, MAX_REPORT_BYTES);
  const reasons = [];
  const canonicalReceipt = agentDecisionView.validateCanonicalReceipt(receipt, reasons);
  if (!canonicalReceipt || reasons.length) {
    throw new OwnerError('CONFLICT', ['INSPECT_RECEIPT_IDENTITY_CONFLICT']);
  }
  if (report?.schemaVersion !== 1 || report?.mode !== 'VALIDATION_MERGE_REPORT'
      || report?.operation !== 'inspect' || report?.packetNumber !== packetNumber
      || report?.prNumber !== prNumber || report?.result !== 'PASS'
      || report?.receiptDigest !== canonicalReceipt.receiptDigest
      || !SHA40_RE.test(String(report?.expectedHead || ''))) {
    throw new OwnerError('CONFLICT', ['INSPECT_REPORT_IDENTITY_CONFLICT']);
  }
  return {receipt: canonicalReceipt, report};
}

async function finalizeWithClient({client, packetNumber, prNumber, inspectEvidence}) {
  const steps = [];
  const state = {
    headSha: inspectEvidence?.report?.expectedHead || null,
    paths: inspectEvidence?.report?.paths || [],
    output: {pr: '#' + prNumber, merge: 'UNKNOWN'},
  };
  async function perform(name, locator, fn) {
    try {
      const value = await fn();
      steps.push({name, result: 'PASS', evidenceLocator: locator});
      return value;
    } catch (error) {
      steps.push({name, result: stepResult(error), evidenceLocator: error?.locator || locator});
      throw error;
    }
  }
  try {
    await perform('inspect-evidence', 'local-artifact:inspect', async () => {
      if (!inspectEvidence || inspectEvidence.report.result !== 'PASS') {
        throw new OwnerError('UNKNOWN', ['INSPECT_EVIDENCE_REQUIRED']);
      }
      return inspectEvidence;
    });
    const packet = await perform('packet-stage-identity', 'issue:#' + packetNumber,
      () => readPacket(client, packetNumber));
    if (packet.bodySha256 !== inspectEvidence.report.packetBodySha256) {
      throw new OwnerError('CONFLICT', ['PACKET_CHANGED_AFTER_INSPECT'], 'issue:#' + packetNumber);
    }
    const pr = await perform('merged-pr-readback', 'pr:#' + prNumber,
      () => readPrHeader(client, prNumber));
    if (pr.state !== 'closed' || !pr.merged_at) {
      throw new OwnerError('BLOCKED', ['PR_NOT_MERGED'], 'pr:#' + prNumber);
    }
    if (pr.head?.sha !== inspectEvidence.report.expectedHead) {
      throw new OwnerError('CONFLICT', ['MERGED_PR_HEAD_MISMATCH'], 'pr:#' + prNumber);
    }
    const mergeCommit = assertSha(pr.merge_commit_sha, 'MERGE_COMMIT_SHA_INVALID');
    state.output = {
      pr: '#' + prNumber,
      headExact: true,
      reviewClear: true,
      overlap: 'DISJOINT',
      required: 'PASS',
      merge: 'COMPLETE',
      mergeCommit,
    };
    const receipt = makeReceipt({
      operation: 'finalize',
      packetNumber,
      prNumber,
      headSha: inspectEvidence.report.expectedHead,
      paths: inspectEvidence.report.paths,
      steps,
      nextLegalAction: 'POSTMERGE_CONVERGENCE',
      artifactLocators: ['commit:' + mergeCommit],
    });
    return {
      receipt,
      report: {
        schemaVersion: 1,
        mode: 'VALIDATION_MERGE_REPORT',
        operation: 'finalize',
        packetNumber,
        prNumber,
        expectedHead: inspectEvidence.report.expectedHead,
        mergeCommit,
        paths: inspectEvidence.report.paths,
        result: 'PASS',
        receiptDigest: receipt.receiptDigest,
        output: state.output,
      },
    };
  } catch (error) {
    const receipt = makeReceipt({
      operation: 'finalize',
      packetNumber,
      prNumber,
      headSha: state.headSha,
      paths: state.paths,
      steps,
      error,
      nextLegalAction: 'TARGETED_DRILLDOWN_REQUIRED',
    });
    return {
      receipt,
      report: {
        schemaVersion: 1,
        mode: 'VALIDATION_MERGE_REPORT',
        operation: 'finalize',
        packetNumber,
        prNumber,
        expectedHead: state.headSha,
        paths: state.paths,
        result: receipt.result,
        reasonCodes: receipt.reasonCodes,
        receiptDigest: receipt.receiptDigest,
        output: state.output,
      },
    };
  }
}

function createLiveClient({env = process.env, fetchImpl = fetch} = {}) {
  const token = env.GH_TOKEN || env.GITHUB_TOKEN;
  if (!token) throw new OwnerError('UNKNOWN', ['GITHUB_TOKEN_REQUIRED']);
  const rest = createGitHubClient({
    token, repo: REPO, fetchImpl, userAgent: 'canonical-main-validation-merge-owner',
  });
  async function graphql(query, variables) {
    const response = await fetchImpl('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        'User-Agent': 'canonical-main-validation-merge-owner',
      },
      body: JSON.stringify({query, variables}),
    });
    if (!response.ok) throw new Error('graphql read failed');
    const value = await response.json();
    if (value?.errors?.length) throw new Error('graphql returned errors');
    return value;
  }
  return {...rest, graphql};
}

function parseNumber(value, label) {
  const text = String(value || '').replace(/^#/, '');
  if (!/^[1-9][0-9]*$/.test(text)) throw new Error(label + '_INVALID');
  return Number(text);
}
function parseArgs(argv = process.argv.slice(2)) {
  if (!['inspect', 'finalize'].includes(argv[0])) throw new Error('COMMAND_INVALID');
  const command = argv[0];
  const allowed = new Set(['packet', 'pr', 'implementation-receipt-file', 'format']);
  const values = {};
  for (let index = 1; index < argv.length; index += 2) {
    const token = argv[index];
    const value = argv[index + 1];
    if (!token?.startsWith('--') || value === undefined) throw new Error('ARGUMENT_INVALID');
    const key = token.slice(2);
    if (!allowed.has(key) || key in values) throw new Error('ARGUMENT_INVALID');
    values[key] = value;
  }
  const packetNumber = parseNumber(values.packet, 'PACKET');
  const prNumber = parseNumber(values.pr, 'PR');
  const format = values.format || 'receipt';
  if (!['receipt', 'agent-view'].includes(format)) throw new Error('FORMAT_INVALID');
  if (command === 'inspect' && !values['implementation-receipt-file']) {
    throw new Error('IMPLEMENTATION_RECEIPT_REQUIRED');
  }
  if (command === 'finalize' && values['implementation-receipt-file']) {
    throw new Error('ARGUMENT_INVALID');
  }
  return {
    command, packetNumber, prNumber,
    implementationReceiptFile: values['implementation-receipt-file'] || null,
    format,
  };
}

function sidecarFailureResult(args, error) {
  const receipt = makeReceipt({
    operation: args.command,
    packetNumber: args.packetNumber,
    prNumber: args.prNumber,
    headSha: null,
    paths: [],
    steps: [{name: 'evidence-sidecar', result: 'UNKNOWN', evidenceLocator: 'UNKNOWN'}],
    error: error instanceof OwnerError
      ? error
      : new OwnerError('UNKNOWN', ['EVIDENCE_SIDECAR_WRITE_FAILED']),
    nextLegalAction: 'TARGETED_DRILLDOWN_REQUIRED',
  });
  return {
    receipt,
    report: {
      schemaVersion: 1,
      mode: 'VALIDATION_MERGE_REPORT',
      operation: args.command,
      packetNumber: args.packetNumber,
      prNumber: args.prNumber,
      result: receipt.result,
      reasonCodes: receipt.reasonCodes,
      receiptDigest: receipt.receiptDigest,
      output: {pr: '#' + args.prNumber, merge: 'UNKNOWN'},
    },
  };
}

async function runCli(argv = process.argv.slice(2), options = {}) {
  const args = parseArgs(argv);
  const client = options.client || createLiveClient(options);
  let result;
  if (args.command === 'inspect') {
    result = await inspectWithClient({
      client,
      packetNumber: args.packetNumber,
      prNumber: args.prNumber,
      implementationReceipt: readRegularJson(args.implementationReceiptFile),
    });
  } else {
    let inspectEvidence;
    try {
      inspectEvidence = readCanonicalInspectEvidence(
        args.packetNumber, args.prNumber, options.root || ROOT);
    } catch (error) {
      result = sidecarFailureResult(args, error);
    }
    if (!result) {
      result = await finalizeWithClient({
        client, packetNumber: args.packetNumber, prNumber: args.prNumber, inspectEvidence,
      });
    }
  }

  let locators;
  try {
    locators = persistResult(
      result, args.packetNumber, args.prNumber, args.command, options.root || ROOT);
  } catch (error) {
    result = sidecarFailureResult(args, error);
    if (args.format === 'receipt') {
      return {
        text: JSON.stringify(canonicalize(result.receipt), null, 2) + '\n',
        code: executionReceipt.exitCodeFor(result.receipt),
      };
    }
    const invalidView = agentDecisionView.projectAgentDecisionView({
      receipt: result.receipt,
      phase: 'VALIDATION_MERGE',
      output: result.report.output,
      attention: [],
      receiptLocator: '',
      reportLocator: '',
    });
    return {
      text: JSON.stringify(canonicalize(invalidView), null, 2) + '\n',
      code: agentDecisionView.exitCodeFor(invalidView),
    };
  }

  if (args.format === 'receipt') {
    return {
      text: JSON.stringify(canonicalize(result.receipt), null, 2) + '\n',
      code: executionReceipt.exitCodeFor(result.receipt),
    };
  }
  const view = projectView(result, locators);
  return {
    text: JSON.stringify(canonicalize(view), null, 2) + '\n',
    code: agentDecisionView.exitCodeFor(view),
  };
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
      executionLifecycle: 'UNKNOWN',
      attentionDisposition: 'UNKNOWN',
      result: 'UNKNOWN',
      reasonCodes: ['RUNTIME_ERROR'],
    }) + '\n');
    process.exitCode = 2;
  });
}

module.exports = {
  MAX_INPUT_BYTES,
  MAX_PAGES,
  MAX_REPORT_BYTES,
  OPS_ISSUE,
  REPO,
  REVIEW_THREADS_QUERY,
  OwnerError,
  createLiveClient,
  discoverOverlap,
  evidencePaths,
  finalizeWithClient,
  gitAdminDir,
  inspectWithClient,
  makeReceipt,
  parseArgs,
  parseOpsCapsule,
  persistResult,
  projectView,
  readCanonicalInspectEvidence,
  readCurrentMain,
  readOpenPr,
  readPacket,
  readRequiredEvidence,
  readReviewBarrier,
  runCli,
  validateImplementationReceipt,
  writeJsonAtomic,
};
