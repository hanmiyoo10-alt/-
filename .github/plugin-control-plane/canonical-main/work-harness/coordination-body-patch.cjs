'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createGitHubClient } = require('../infra/github-client.cjs');

const MODE = 'CANONICAL_MAIN_COORDINATION_BODY_PATCH';
const PACKET_MARKER = '<!-- canonical-main-work-packet:v1 -->';
const QUEUE_MARKER = '<!-- canonical-main-work-queue:v1 -->';
const QUEUE_ISSUE = 465;
const MAX_REQUEST_BYTES = 32768;
const SHA256_RE = /^[0-9a-f]{64}$/;
const SURFACES = Object.freeze(['WORK_PACKET', 'WORK_QUEUE']);
const OPERATIONS = Object.freeze(['replaceExact', 'replaceMarkerBlock']);

function bodyDigest(body) {
  return crypto.createHash('sha256').update(String(body), 'utf8').digest('hex');
}

function countOccurrences(text, token) {
  if (!token) return 0;
  let count = 0;
  let offset = 0;
  while (offset <= text.length) {
    const found = text.indexOf(token, offset);
    if (found < 0) return count;
    count += 1;
    offset = found + token.length;
  }
  return count;
}
function countStandaloneMarkerLines(text, marker) {
  return String(text).split(/\r?\n/).filter((line) => line.trim() === marker).length;
}

function extraKeys(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const expected = new Set(allowed);
  return Object.keys(value).filter((key) => !expected.has(key)).sort();
}

function hasNul(value) {
  return typeof value === 'string' && value.includes('\u0000');
}

function validateOperation(operation) {
  const reasons = [];
  if (!operation || typeof operation !== 'object' || Array.isArray(operation)) {
    return ['PATCH_OPERATION_OBJECT_REQUIRED'];
  }
  if (!OPERATIONS.includes(operation.type)) return ['PATCH_OPERATION_TYPE_INVALID'];

  const allowed = operation.type === 'replaceExact'
    ? ['type', 'oldText', 'newText']
    : ['type', 'startMarker', 'endMarker', 'replacementBlock'];
  if (extraKeys(operation, allowed).length) reasons.push('PATCH_OPERATION_FIELDS_INVALID');

  if (operation.type === 'replaceExact') {
    if (typeof operation.oldText !== 'string' || operation.oldText.length === 0) reasons.push('PATCH_OLD_TEXT_INVALID');
    if (typeof operation.newText !== 'string') reasons.push('PATCH_NEW_TEXT_INVALID');
    if (hasNul(operation.oldText) || hasNul(operation.newText)) reasons.push('PATCH_TEXT_NUL_FORBIDDEN');
  } else {
    if (typeof operation.startMarker !== 'string' || operation.startMarker.length === 0) reasons.push('PATCH_START_MARKER_INVALID');
    if (typeof operation.endMarker !== 'string' || operation.endMarker.length === 0) reasons.push('PATCH_END_MARKER_INVALID');
    if (operation.startMarker === operation.endMarker) reasons.push('PATCH_MARKERS_IDENTICAL');
    if (typeof operation.replacementBlock !== 'string') reasons.push('PATCH_REPLACEMENT_BLOCK_INVALID');
    if (hasNul(operation.startMarker) || hasNul(operation.endMarker) || hasNul(operation.replacementBlock)) reasons.push('PATCH_TEXT_NUL_FORBIDDEN');
  }
  return [...new Set(reasons)].sort();
}
function validateRequest(request) {
  const reasons = [];
  if (!request || typeof request !== 'object' || Array.isArray(request)) return ['REQUEST_OBJECT_REQUIRED'];
  if (extraKeys(request, ['schemaVersion', 'issueNumber', 'surface', 'expectedBodySha256', 'operation']).length) {
    reasons.push('REQUEST_FIELDS_INVALID');
  }
  if (request.schemaVersion !== 1) reasons.push('REQUEST_SCHEMA_VERSION_INVALID');
  if (!Number.isSafeInteger(request.issueNumber) || request.issueNumber <= 0) reasons.push('ISSUE_NUMBER_INVALID');
  if (!SURFACES.includes(request.surface)) reasons.push('SURFACE_INVALID');
  if (typeof request.expectedBodySha256 !== 'string' || !SHA256_RE.test(request.expectedBodySha256)) {
    reasons.push('EXPECTED_BODY_SHA256_INVALID');
  }
  reasons.push(...validateOperation(request.operation));
  return [...new Set(reasons)].sort();
}

function validateTarget(issue, issueNumber, surface) {
  const reasons = [];
  if (!issue || typeof issue !== 'object' || issue.pull_request) return ['TARGET_NOT_ELIGIBLE'];
  if (Number.isSafeInteger(issue.number) && issue.number !== issueNumber) reasons.push('TARGET_IDENTITY_MISMATCH');
  if (typeof issue.body !== 'string') reasons.push('TARGET_BODY_INVALID');
  const body = typeof issue.body === 'string' ? issue.body : '';

  if (surface === 'WORK_PACKET') {
    if (issueNumber === QUEUE_ISSUE) reasons.push('WORK_QUEUE_SURFACE_REQUIRED');
    if (!['open', 'closed'].includes(issue.state)) reasons.push('TARGET_STATE_INVALID');
    if (countStandaloneMarkerLines(body, PACKET_MARKER) !== 1) reasons.push('WORK_PACKET_MARKER_COUNT_INVALID');
  } else if (surface === 'WORK_QUEUE') {
    if (issueNumber !== QUEUE_ISSUE) reasons.push('WORK_QUEUE_ISSUE_INVALID');
    if (issue.state !== 'open') reasons.push('WORK_QUEUE_NOT_OPEN');
    if (countStandaloneMarkerLines(body, QUEUE_MARKER) !== 1) reasons.push('WORK_QUEUE_MARKER_COUNT_INVALID');
  }
  return [...new Set(reasons)].sort();
}
function applyPatch(body, operation) {
  const validation = validateOperation(operation);
  if (validation.length) return { ok: false, reasonCodes: validation, body };

  if (operation.type === 'replaceExact') {
    const matches = countOccurrences(body, operation.oldText);
    if (matches === 0) return { ok: false, reasonCodes: ['PATCH_TARGET_NOT_FOUND'], body };
    if (matches !== 1) return { ok: false, reasonCodes: ['PATCH_TARGET_NOT_UNIQUE'], body };
    if (operation.oldText === operation.newText) return { ok: false, reasonCodes: ['PATCH_NOOP_FORBIDDEN'], body };
    const at = body.indexOf(operation.oldText);
    const next = `${body.slice(0, at)}${operation.newText}${body.slice(at + operation.oldText.length)}`;
    return { ok: true, reasonCodes: ['PATCH_EXACT_READY'], body: next };
  }

  const starts = countOccurrences(body, operation.startMarker);
  const ends = countOccurrences(body, operation.endMarker);
  if (starts !== 1) return { ok: false, reasonCodes: ['PATCH_START_MARKER_COUNT_INVALID'], body };
  if (ends !== 1) return { ok: false, reasonCodes: ['PATCH_END_MARKER_COUNT_INVALID'], body };
  const start = body.indexOf(operation.startMarker);
  const end = body.indexOf(operation.endMarker);
  if (end < start) return { ok: false, reasonCodes: ['PATCH_MARKER_ORDER_INVALID'], body };
  if (start + operation.startMarker.length > end) return { ok: false, reasonCodes: ['PATCH_MARKER_RANGE_OVERLAP'], body };
  if (!operation.replacementBlock.startsWith(operation.startMarker)
      || !operation.replacementBlock.endsWith(operation.endMarker)
      || countOccurrences(operation.replacementBlock, operation.startMarker) !== 1
      || countOccurrences(operation.replacementBlock, operation.endMarker) !== 1) {
    return { ok: false, reasonCodes: ['PATCH_REPLACEMENT_MARKERS_INVALID'], body };
  }
  const after = end + operation.endMarker.length;
  const currentBlock = body.slice(start, after);
  if (currentBlock === operation.replacementBlock) return { ok: false, reasonCodes: ['PATCH_NOOP_FORBIDDEN'], body };
  return { ok: true, reasonCodes: ['PATCH_MARKER_BLOCK_READY'], body: `${body.slice(0, start)}${operation.replacementBlock}${body.slice(after)}` };
}
function result(status, reasonCodes, extras = {}) {
  return {
    schemaVersion: 1,
    mode: MODE,
    status,
    issueNumber: Number.isSafeInteger(extras.issueNumber) ? extras.issueNumber : null,
    surface: extras.surface || null,
    operation: extras.operation || null,
    changed: status === 'UPDATED',
    mutationObserved: status === 'UPDATED',
    mutationMayHaveOccurred: Boolean(extras.mutationMayHaveOccurred),
    expectedBodySha256: extras.expectedBodySha256 || null,
    observedBeforeSha256: extras.observedBeforeSha256 || null,
    expectedAfterSha256: extras.expectedAfterSha256 || null,
    observedAfterSha256: extras.observedAfterSha256 || null,
    issueBodyMutationOnly: true,
    issueStateMutationAuthorized: false,
    commentMutationAuthorized: false,
    repositoryMutationAuthorized: false,
    releaseMutationAuthorized: false,
    productionMutationAuthorized: false,
    runtimeMutationAuthorized: false,
    reasonCodes: [...new Set(reasonCodes)].sort(),
  };
}

function resultFromRequest(status, reasons, request, extras = {}) {
  return result(status, reasons, {
    issueNumber: request?.issueNumber,
    surface: request?.surface,
    operation: request?.operation?.type,
    expectedBodySha256: request?.expectedBodySha256,
    ...extras,
  });
}
async function executeCoordinationBodyPatch({ client, request } = {}) {
  const requestReasons = validateRequest(request);
  if (requestReasons.length) return resultFromRequest('BLOCKED', requestReasons, request);
  if (!client || typeof client.api !== 'function') return resultFromRequest('BLOCKED', ['CLIENT_REQUIRED'], request);

  let first;
  try {
    first = await client.api(`/issues/${request.issueNumber}`);
  } catch {
    return resultFromRequest('UNKNOWN', ['INITIAL_READ_FAILED'], request);
  }
  const targetReasons = validateTarget(first, request.issueNumber, request.surface);
  if (targetReasons.length) return resultFromRequest('BLOCKED', targetReasons, request);

  const firstBody = first.body;
  const observedBeforeSha256 = bodyDigest(firstBody);
  if (observedBeforeSha256 !== request.expectedBodySha256) {
    return resultFromRequest('BLOCKED', ['EXPECTED_BODY_SHA256_MISMATCH'], request, { observedBeforeSha256 });
  }
  const patch = applyPatch(firstBody, request.operation);
  if (!patch.ok) return resultFromRequest('BLOCKED', patch.reasonCodes, request, { observedBeforeSha256 });
  const expectedAfterSha256 = bodyDigest(patch.body);

  let barrier;
  try {
    barrier = await client.api(`/issues/${request.issueNumber}`);
  } catch {
    return resultFromRequest('BLOCKED', ['PREWRITE_READ_FAILED'], request, { observedBeforeSha256, expectedAfterSha256 });
  }
  const barrierReasons = validateTarget(barrier, request.issueNumber, request.surface);
  if (barrierReasons.length) {
    return resultFromRequest('BLOCKED', ['TARGET_CHANGED_BEFORE_WRITE', ...barrierReasons], request, { observedBeforeSha256, expectedAfterSha256 });
  }
  if (barrier.body !== firstBody || bodyDigest(barrier.body) !== observedBeforeSha256) {
    return resultFromRequest('BLOCKED', ['BODY_CHANGED_BEFORE_WRITE'], request, { observedBeforeSha256, expectedAfterSha256 });
  }
  let patchFailed = false;
  try {
    await client.api(`/issues/${request.issueNumber}`, {
      method: 'PATCH',
      body: { body: patch.body },
    });
  } catch {
    patchFailed = true;
  }

  let after;
  try {
    after = await client.api(`/issues/${request.issueNumber}`);
  } catch {
    return resultFromRequest('UNKNOWN', [
      ...(patchFailed ? ['PATCH_REQUEST_FAILED'] : []),
      'POSTWRITE_READ_FAILED',
    ], request, {
      observedBeforeSha256,
      expectedAfterSha256,
      mutationMayHaveOccurred: true,
    });
  }

  const afterBody = typeof after?.body === 'string' ? after.body : '';
  const observedAfterSha256 = bodyDigest(afterBody);
  if (patchFailed) {
    return resultFromRequest('UNKNOWN', ['PATCH_REQUEST_FAILED'], request, {
      observedBeforeSha256,
      expectedAfterSha256,
      observedAfterSha256,
      mutationMayHaveOccurred: true,
    });
  }
  if (afterBody !== patch.body || observedAfterSha256 !== expectedAfterSha256) {
    return resultFromRequest('UNKNOWN', ['POSTWRITE_BODY_MISMATCH'], request, {
      observedBeforeSha256,
      expectedAfterSha256,
      observedAfterSha256,
      mutationMayHaveOccurred: true,
    });
  }
  return resultFromRequest('UPDATED', ['POSTWRITE_READBACK_VERIFIED'], request, {
    observedBeforeSha256,
    expectedAfterSha256,
    observedAfterSha256,
  });
}
function parseArgs(argv = process.argv.slice(2)) {
  if (argv.length !== 2 || argv[0] !== '--request-file' || !argv[1]) {
    throw new Error('usage: node coordination-body-patch.cjs --request-file <request.json>');
  }
  return { requestFile: argv[1] };
}

function readRequestFile(requestFile) {
  const resolved = path.resolve(requestFile);
  const stat = fs.statSync(resolved);
  if (!stat.isFile()) throw new Error('request-file must be a regular file');
  if (stat.size > MAX_REQUEST_BYTES) throw new Error(`request-file exceeds ${MAX_REQUEST_BYTES} bytes`);
  const parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  return parsed;
}

function exitCodeFor(output) {
  if (output?.status === 'UPDATED') return 0;
  if (output?.status === 'UNKNOWN') return 3;
  return 2;
}

async function run({ argv = process.argv.slice(2), env = process.env, fetchImpl } = {}) {
  const args = parseArgs(argv);
  const request = readRequestFile(args.requestFile);
  const repo = String(env.GITHUB_REPOSITORY || '').trim();
  if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) {
    return resultFromRequest('BLOCKED', ['REPOSITORY_IDENTITY_INVALID'], request);
  }
  const client = createGitHubClient({
    token: env.GH_TOKEN || env.GITHUB_TOKEN,
    repo,
    fetchImpl,
    userAgent: 'canonical-main-coordination-body-patch',
  });
  return executeCoordinationBodyPatch({ client, request });
}
async function main() {
  try {
    const output = await run();
    process.stdout.write(`${JSON.stringify(output)}\n`);
    process.exitCode = exitCodeFor(output);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({
      schemaVersion: 1,
      mode: MODE,
      status: 'UNKNOWN',
      changed: false,
      mutationObserved: false,
      mutationMayHaveOccurred: false,
      reasonCodes: ['RUNTIME_ERROR'],
      error: String(error?.message || error).slice(0, 300),
    })}\n`);
    process.exitCode = 3;
  }
}

if (require.main === module) main();

module.exports = {
  MAX_REQUEST_BYTES,
  MODE,
  OPERATIONS,
  PACKET_MARKER,
  QUEUE_ISSUE,
  QUEUE_MARKER,
  SURFACES,
  applyPatch,
  bodyDigest,
  countOccurrences,
  countStandaloneMarkerLines,
  executeCoordinationBodyPatch,
  exitCodeFor,
  parseArgs,
  readRequestFile,
  result,
  validateOperation,
  validateRequest,
  validateTarget,
};
