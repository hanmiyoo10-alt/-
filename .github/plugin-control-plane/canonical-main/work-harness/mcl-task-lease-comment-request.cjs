'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const taskLease = require('../../../../products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs');
const {createGitHubClient} = require('../infra/github-client.cjs');

const FIXED_REPO = 'hanmiyoo10-alt/-';
const CONTROL_ISSUE = 3782;
const OWNER_LOGIN = 'hanmiyoo10-alt';
const REQUEST_START = '<!-- mcl-task-lease-comment-request:v1 -->';
const REQUEST_END = '<!-- /mcl-task-lease-comment-request:v1 -->';
const RESULT_MARKER = 'mcl-task-lease-comment-result:v1';
const MODE = 'MCL_TASK_LEASE_COMMENT_REQUEST';
const MAX_EVENT_BYTES = 512 * 1024;
const MAX_REQUEST_BYTES = 24 * 1024;
const MAX_SCOPES = 16;
const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const PACKET_RE = /^#[1-9][0-9]*$/;
const FORBIDDEN_CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

const ACQUIRE_KEYS = Object.freeze([
  'branch', 'executor', 'expectedGeneration', 'observedBaseSha', 'operation',
  'packetBodySha256', 'packetRef', 'route', 'schemaVersion', 'scopeDisposition',
  'scopes', 'workspaceKind', 'worktree',
]);
const RELEASE_KEYS = Object.freeze([
  'expectedGeneration', 'leaseId', 'operation', 'packetRef', 'schemaVersion',
]);

const DEFAULT_DEPS = Object.freeze({
  taskLease,
  createGitHubClient,
});

class RequestError extends Error {
  constructor(reasonCode) {
    super(reasonCode);
    this.reasonCode = reasonCode;
  }
}

function sha256Text(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function normalizeText(value) {
  return String(value || '').replace(/\r\n/g, '\n');
}

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function boundedString(value, maxBytes) {
  return typeof value === 'string'
    && value.length > 0
    && Buffer.byteLength(value, 'utf8') <= maxBytes
    && !FORBIDDEN_CONTROL_RE.test(value);
}

function exactKeys(value, expected) {
  return value
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.keys(value).sort().join('\n') === expected.join('\n');
}

function readEventFile(filePath) {
  const resolved = path.resolve(String(filePath || ''));
  const stat = fs.lstatSync(resolved);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0 || stat.size > MAX_EVENT_BYTES) {
    throw new RequestError('EVENT_FILE_INVALID');
  }
  try {
    const value = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new RequestError('EVENT_SHAPE_INVALID');
    }
    return value;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError('EVENT_JSON_INVALID');
  }
}

function eventReplyIdentity(event) {
  const issueNumber = event?.issue?.number;
  const commentId = event?.comment?.id;
  return event?.repository?.full_name === FIXED_REPO
    && issueNumber === CONTROL_ISSUE
    && event?.issue?.pull_request == null
    && positiveInteger(commentId)
    ? {issueNumber, commentId}
    : null;
}

function validateEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new RequestError('EVENT_SHAPE_INVALID');
  }
  if (event.action !== 'created') throw new RequestError('EVENT_ACTION_DENIED');
  if (event?.repository?.full_name !== FIXED_REPO) throw new RequestError('EVENT_REPOSITORY_DENIED');
  if (event?.repository?.owner?.login !== OWNER_LOGIN) throw new RequestError('EVENT_REPOSITORY_OWNER_DENIED');
  if (event?.issue?.number !== CONTROL_ISSUE) throw new RequestError('EVENT_CONTROL_ISSUE_DENIED');
  if (event?.issue?.pull_request != null) throw new RequestError('EVENT_PULL_REQUEST_DENIED');
  if (event?.issue?.state !== 'open') throw new RequestError('EVENT_CONTROL_ISSUE_NOT_OPEN');
  if (!positiveInteger(event?.comment?.id)) throw new RequestError('EVENT_COMMENT_ID_INVALID');
  if (event?.comment?.user?.login !== OWNER_LOGIN) throw new RequestError('EVENT_ACTOR_DENIED');
  if (event?.comment?.author_association !== 'OWNER') throw new RequestError('EVENT_ACTOR_ASSOCIATION_DENIED');
  if (event?.comment?.user?.type === 'Bot') throw new RequestError('EVENT_BOT_DENIED');
  if (typeof event?.comment?.body !== 'string') throw new RequestError('EVENT_COMMENT_BODY_INVALID');
  return event.comment;
}

function parseAcquire(value) {
  if (!exactKeys(value, ACQUIRE_KEYS)) throw new RequestError('REQUEST_KEYS_INVALID');
  if (value.schemaVersion !== 1) throw new RequestError('REQUEST_SCHEMA_UNSUPPORTED');
  if (value.operation !== 'acquire') throw new RequestError('REQUEST_OPERATION_INVALID');
  if (!Number.isSafeInteger(value.expectedGeneration) || value.expectedGeneration < 0) {
    throw new RequestError('REQUEST_GENERATION_INVALID');
  }
  if (typeof value.packetRef !== 'string' || !PACKET_RE.test(value.packetRef)) {
    throw new RequestError('REQUEST_PACKET_REF_INVALID');
  }
  if (typeof value.packetBodySha256 !== 'string' || !SHA256_RE.test(value.packetBodySha256)) {
    throw new RequestError('REQUEST_PACKET_HASH_INVALID');
  }
  if (!taskLease.ROUTES.includes(value.route)) throw new RequestError('REQUEST_ROUTE_INVALID');
  if (!taskLease.EXECUTORS.has(value.executor)) throw new RequestError('REQUEST_EXECUTOR_INVALID');
  if (value.scopeDisposition !== 'DISJOINT') throw new RequestError('REQUEST_SCOPE_DISPOSITION_INVALID');
  if (!Array.isArray(value.scopes) || value.scopes.length < 1 || value.scopes.length > MAX_SCOPES) {
    throw new RequestError('REQUEST_SCOPES_INVALID');
  }
  if (new Set(value.scopes).size !== value.scopes.length
      || value.scopes.some((item) => !boundedString(item, 512))) {
    throw new RequestError('REQUEST_SCOPES_INVALID');
  }
  if (!taskLease.WORKSPACE_KINDS.includes(value.workspaceKind)) {
    throw new RequestError('REQUEST_WORKSPACE_KIND_INVALID');
  }
  if (!boundedString(value.branch, 300) || !boundedString(value.worktree, 1024)) {
    throw new RequestError('REQUEST_WORKSPACE_INVALID');
  }
  if (value.observedBaseSha !== null
      && (typeof value.observedBaseSha !== 'string'
        || !SHA40_RE.test(value.observedBaseSha))) {
    throw new RequestError('REQUEST_BASE_SHA_INVALID');
  }
  return {
    expectedGeneration: value.expectedGeneration,
    packetRef: value.packetRef,
    packetBodySha256: value.packetBodySha256,
    route: value.route,
    executor: value.executor,
    scopes: [...value.scopes],
    scopeDisposition: value.scopeDisposition,
    workspaceKind: value.workspaceKind,
    branch: value.branch,
    worktree: value.worktree,
    observedBaseSha: value.observedBaseSha,
  };
}

function parseRelease(value) {
  if (!exactKeys(value, RELEASE_KEYS)) throw new RequestError('REQUEST_KEYS_INVALID');
  if (value.schemaVersion !== 1) throw new RequestError('REQUEST_SCHEMA_UNSUPPORTED');
  if (value.operation !== 'release') throw new RequestError('REQUEST_OPERATION_INVALID');
  if (!Number.isSafeInteger(value.expectedGeneration) || value.expectedGeneration < 0) {
    throw new RequestError('REQUEST_GENERATION_INVALID');
  }
  if (typeof value.packetRef !== 'string' || !PACKET_RE.test(value.packetRef)) {
    throw new RequestError('REQUEST_PACKET_REF_INVALID');
  }
  if (typeof value.leaseId !== 'string' || !SHA256_RE.test(value.leaseId)) {
    throw new RequestError('REQUEST_LEASE_ID_INVALID');
  }
  return {
    expectedGeneration: value.expectedGeneration,
    packetRef: value.packetRef,
    leaseId: value.leaseId,
  };
}

function parseRequestBody(rawBody) {
  const normalized = normalizeText(rawBody);
  if (Buffer.byteLength(normalized, 'utf8') > MAX_REQUEST_BYTES) {
    throw new RequestError('REQUEST_COMMENT_TOO_LARGE');
  }
  if (FORBIDDEN_CONTROL_RE.test(normalized)) throw new RequestError('REQUEST_TEXT_CONTROL_INVALID');
  if (normalized.split(REQUEST_START).length !== 2 || normalized.split(REQUEST_END).length !== 2) {
    throw new RequestError('REQUEST_MARKER_COUNT_INVALID');
  }
  const [beforeStart, afterStart] = normalized.split(REQUEST_START);
  const [inside, afterEnd] = afterStart.split(REQUEST_END);
  if (beforeStart.trim() || afterEnd.trim()) throw new RequestError('REQUEST_EXTRANEOUS_TEXT');
  const jsonText = inside.trim();
  if (!jsonText || jsonText.includes(REQUEST_START) || jsonText.includes(REQUEST_END)) {
    throw new RequestError('REQUEST_CONTENT_INVALID');
  }
  let value;
  try { value = JSON.parse(jsonText); }
  catch { throw new RequestError('REQUEST_JSON_INVALID'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestError('REQUEST_JSON_SHAPE_INVALID');
  }
  let request;
  if (value.operation === 'acquire') request = parseAcquire(value);
  else if (value.operation === 'release') request = parseRelease(value);
  else throw new RequestError('REQUEST_OPERATION_UNSUPPORTED');
  return {
    schemaVersion: 1,
    operation: value.operation,
    request,
    requestDigest: sha256Text(normalized),
  };
}

function compactOwnerResult(output) {
  return {
    status: output?.status || 'UNKNOWN',
    generation: Number.isSafeInteger(output?.generation) ? output.generation : null,
    leaseId: SHA256_RE.test(output?.leaseId || '') ? output.leaseId : null,
    reasonCodes: Array.isArray(output?.reasonCodes)
      ? [...new Set(output.reasonCodes)].sort()
      : ['OWNER_RESULT_INVALID'],
  };
}

function requestResult({
  disposition,
  requestCommentId,
  requestDigest = null,
  operation = null,
  owner = null,
  reasonCodes = [],
  queueReceipt = null,
}) {
  return {
    schemaVersion: 1,
    mode: MODE,
    disposition,
    requestCommentId,
    requestDigest,
    operation,
    owner,
    queueReceipt: queueReceipt || {state: 'NOT_WRITTEN', commentId: null},
    reasonCodes: [...new Set(reasonCodes)].sort(),
  };
}

function renderResultComment(result) {
  const payload = {
    schemaVersion: 1,
    requestCommentId: result.requestCommentId,
    requestDigest: result.requestDigest,
    operation: result.operation,
    ownerStatus: result.owner?.status || null,
    generation: result.owner?.generation ?? null,
    leaseId: result.owner?.leaseId || null,
    reasonCodes: result.reasonCodes,
  };
  const text = [
    `<!-- ${RESULT_MARKER} request=${result.requestCommentId} -->`,
    'MCL D-013 task lease comment result',
    '',
    `\`${JSON.stringify(payload)}\``,
    '',
    'Transport receipt only; #2352 and task-lease.cjs remain the D-013 authority.',
  ].join('\n');
  if (text.includes(REQUEST_START) || text.includes(REQUEST_END)) {
    throw new Error('RESULT_RECURSION_MARKER_INVALID');
  }
  return text + '\n';
}

async function writeQueueResult({token, fetchImpl, result, deps = DEFAULT_DEPS}) {
  const client = deps.createGitHubClient({
    token,
    repo: FIXED_REPO,
    fetchImpl,
    userAgent: 'mcl-task-lease-comment-request',
  });
  const created = await client.api(`/issues/${CONTROL_ISSUE}/comments`, {
    method: 'POST',
    body: {body: renderResultComment(result)},
  });
  return {
    state: positiveInteger(created?.id) ? 'WRITTEN' : 'UNKNOWN',
    commentId: positiveInteger(created?.id) ? created.id : null,
  };
}

async function executeEvent({event, token, fetchImpl, deps = DEFAULT_DEPS} = {}) {
  const replyIdentity = eventReplyIdentity(event);
  let comment = null;
  let parsed = null;
  try {
    comment = validateEvent(event);
    parsed = parseRequestBody(comment.body);
  } catch (error) {
    const reasonCode = error instanceof RequestError ? error.reasonCode : 'REQUEST_RUNTIME_ERROR';
    let result = requestResult({
      disposition: 'REQUEST_REJECTED',
      requestCommentId: replyIdentity?.commentId ?? event?.comment?.id ?? null,
      requestDigest: typeof event?.comment?.body === 'string'
        ? sha256Text(normalizeText(event.comment.body))
        : null,
      reasonCodes: [reasonCode],
    });
    if (replyIdentity && token) {
      try {
        const queueReceipt = await writeQueueResult({token, fetchImpl, result, deps});
        result = {...result, queueReceipt};
      } catch {
        result = {
          ...result,
          queueReceipt: {state: 'FAILED', commentId: null},
          reasonCodes: [...new Set([...result.reasonCodes, 'QUEUE_RESULT_WRITE_FAILED'])].sort(),
        };
      }
    }
    return result;
  }

  if (!token) {
    return requestResult({
      disposition: 'REQUEST_REJECTED',
      requestCommentId: comment.id,
      requestDigest: parsed.requestDigest,
      operation: parsed.operation,
      reasonCodes: ['ACTIONS_TOKEN_REQUIRED'],
    });
  }

  const client = deps.createGitHubClient({
    token,
    repo: FIXED_REPO,
    fetchImpl,
    userAgent: 'mcl-task-lease-comment-request-owner',
  });

  let ownerOutput;
  try {
    const raw = await deps.taskLease.executeOperation({
      client,
      operation: parsed.operation,
      request: parsed.request,
      actor: event.comment.user.login,
      repositoryOwner: event.repository.owner.login,
    });
    ownerOutput = deps.taskLease.publicResult(raw);
  } catch {
    ownerOutput = deps.taskLease.publicResult(
      deps.taskLease.result('UNKNOWN', ['TASK_LEASE_OWNER_RUNTIME_ERROR'])
    );
  }
  const owner = compactOwnerResult(ownerOutput);
  let result = requestResult({
    disposition: 'REQUEST_ACCEPTED',
    requestCommentId: comment.id,
    requestDigest: parsed.requestDigest,
    operation: parsed.operation,
    owner,
    reasonCodes: owner.reasonCodes,
  });

  try {
    const queueReceipt = await writeQueueResult({token, fetchImpl, result, deps});
    result = {...result, queueReceipt};
  } catch {
    result = {
      ...result,
      queueReceipt: {state: 'FAILED', commentId: null},
      reasonCodes: [...new Set([...result.reasonCodes, 'QUEUE_RESULT_WRITE_FAILED'])].sort(),
    };
  }
  return result;
}

function exitCodeFor(result) {
  if (result?.disposition !== 'REQUEST_ACCEPTED') return 2;
  if (result?.queueReceipt?.state !== 'WRITTEN') return 3;
  const status = result?.owner?.status || 'UNKNOWN';
  if (/_UPDATED$|_NOOP$/.test(status)) return 0;
  if (status === 'CONFLICT') return 3;
  if (status === 'UNKNOWN') return 4;
  return 2;
}

async function run({env = process.env, event = null, token = null, fetchImpl, deps = DEFAULT_DEPS} = {}) {
  const resolvedEvent = event || readEventFile(env.GITHUB_EVENT_PATH);
  if (env.GITHUB_REPOSITORY && env.GITHUB_REPOSITORY !== FIXED_REPO) {
    throw new RequestError('ENV_REPOSITORY_DENIED');
  }
  const resolvedToken = token || env.GITHUB_TOKEN || null;
  return executeEvent({event: resolvedEvent, token: resolvedToken, fetchImpl, deps});
}

async function main() {
  let output;
  try {
    output = await run();
  } catch (error) {
    output = requestResult({
      disposition: 'REQUEST_REJECTED',
      requestCommentId: null,
      reasonCodes: [error instanceof RequestError ? error.reasonCode : 'REQUEST_RUNTIME_ERROR'],
    });
  }
  process.stdout.write(`${JSON.stringify(output)}\n`);
  process.exitCode = exitCodeFor(output);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`mcl-task-lease-comment fatal: ${error?.message || error}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  ACQUIRE_KEYS,
  CONTROL_ISSUE,
  DEFAULT_DEPS,
  FIXED_REPO,
  MAX_EVENT_BYTES,
  MAX_REQUEST_BYTES,
  MODE,
  OWNER_LOGIN,
  RELEASE_KEYS,
  REQUEST_END,
  REQUEST_START,
  RESULT_MARKER,
  RequestError,
  compactOwnerResult,
  eventReplyIdentity,
  executeEvent,
  exitCodeFor,
  normalizeText,
  parseRequestBody,
  readEventFile,
  renderResultComment,
  requestResult,
  run,
  sha256Text,
  validateEvent,
  writeQueueResult,
};
