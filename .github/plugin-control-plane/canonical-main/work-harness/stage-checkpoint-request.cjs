'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const stageCheckpoint = require('./stage-checkpoint.cjs');
const {createGitHubClient} = require('../infra/github-client.cjs');

const FIXED_REPO = 'hanmiyoo10-alt/-';
const CONTROL_ISSUE = 3469;
const OWNER_LOGIN = 'hanmiyoo10-alt';
const REQUEST_START = '<!-- canonical-main-stage-checkpoint-request:v1 -->';
const REQUEST_END = '<!-- /canonical-main-stage-checkpoint-request:v1 -->';
const BODY_SEPARATOR = '---BODY---';
const RESULT_MARKER = 'canonical-main-stage-checkpoint-result:v1';
const MODE = 'CANONICAL_MAIN_STAGE_CHECKPOINT_REQUEST';
const MAX_EVENT_BYTES = 512 * 1024;
const MAX_REQUEST_BYTES = stageCheckpoint.MAX_BODY_BYTES + 2048;
const SHA256_RE = /^[0-9a-f]{64}$/;
const FORBIDDEN_CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

const DEFAULT_DEPS = Object.freeze({
  stageCheckpoint,
  createGitHubClient,
});

class RequestError extends Error {
  constructor(reasonCode) {
    super(reasonCode);
    this.reasonCode = reasonCode;
  }
}

function sha256Text(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function normalizeText(value) {
  return String(value || '').replace(/\r\n/g, '\n');
}

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function readEventFile(filePath) {
  const resolved = path.resolve(String(filePath || ''));
  const stat = fs.lstatSync(resolved);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0 || stat.size > MAX_EVENT_BYTES) {
    throw new RequestError('EVENT_FILE_INVALID');
  }
  let value;
  try {
    value = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch {
    throw new RequestError('EVENT_JSON_INVALID');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestError('EVENT_SHAPE_INVALID');
  }
  return value;
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

function parseRequestBody(rawBody, deps = DEFAULT_DEPS) {
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
  if (inside.split(BODY_SEPARATOR).length !== 2) throw new RequestError('REQUEST_BODY_SEPARATOR_INVALID');

  const [metadataTextRaw, bodyRaw] = inside.split(BODY_SEPARATOR);
  const metadataText = metadataTextRaw.trim();
  const body = bodyRaw.trim();
  if (!metadataText || !body) throw new RequestError('REQUEST_CONTENT_MISSING');
  if (Buffer.byteLength(body, 'utf8') > deps.stageCheckpoint.MAX_BODY_BYTES) {
    throw new RequestError('REQUEST_CHECKPOINT_BODY_TOO_LARGE');
  }
  if (FORBIDDEN_CONTROL_RE.test(body)) throw new RequestError('REQUEST_CHECKPOINT_BODY_CONTROL_INVALID');

  let metadata;
  try {
    metadata = JSON.parse(metadataText);
  } catch {
    throw new RequestError('REQUEST_METADATA_JSON_INVALID');
  }
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new RequestError('REQUEST_METADATA_INVALID');
  }

  const expectedKeys = [
    'bodySha256',
    'packetBodySha256',
    'packetNumber',
    'schemaVersion',
    'stage',
  ];
  if (Object.keys(metadata).sort().join('\n') !== expectedKeys.join('\n')) {
    throw new RequestError('REQUEST_METADATA_KEYS_INVALID');
  }
  if (metadata.schemaVersion !== 1) throw new RequestError('REQUEST_SCHEMA_UNSUPPORTED');
  if (!positiveInteger(metadata.packetNumber) || metadata.packetNumber === deps.stageCheckpoint.AUDIT_ISSUE) {
    throw new RequestError('REQUEST_PACKET_INVALID');
  }
  if (!deps.stageCheckpoint.STAGES.includes(metadata.stage)) throw new RequestError('REQUEST_STAGE_INVALID');
  if (typeof metadata.bodySha256 !== 'string' || !SHA256_RE.test(metadata.bodySha256)) {
    throw new RequestError('REQUEST_BODY_HASH_INVALID');
  }
  if (metadata.packetBodySha256 !== null
      && (typeof metadata.packetBodySha256 !== 'string' || !SHA256_RE.test(metadata.packetBodySha256))) {
    throw new RequestError('REQUEST_PACKET_BODY_HASH_INVALID');
  }

  const observedBodySha256 = sha256Text(body);
  if (observedBodySha256 !== metadata.bodySha256) throw new RequestError('REQUEST_BODY_HASH_MISMATCH');

  return {
    schemaVersion: 1,
    packetNumber: metadata.packetNumber,
    stage: metadata.stage,
    body,
    bodySha256: metadata.bodySha256,
    packetBodySha256: metadata.packetBodySha256,
  };
}

function compactOwnerResult(ownerResult) {
  return {
    status: ownerResult?.status || 'FAILED',
    checkpointId: ownerResult?.checkpointId || null,
    packet: {
      state: ownerResult?.packet?.state || null,
      commentId: ownerResult?.packet?.commentId ?? null,
    },
    audit: {
      state: ownerResult?.audit?.state || null,
      commentId: ownerResult?.audit?.commentId ?? null,
    },
    reasonCodes: Array.isArray(ownerResult?.reasonCodes)
      ? [...new Set(ownerResult.reasonCodes)].sort()
      : ['OWNER_RESULT_INVALID'],
  };
}

function requestResult({
  disposition,
  requestCommentId,
  request = null,
  ownerResult = null,
  reasonCodes = [],
  queueReceipt = null,
}) {
  return {
    schemaVersion: 1,
    mode: MODE,
    disposition,
    requestCommentId,
    packetNumber: request?.packetNumber ?? null,
    stage: request?.stage ?? null,
    owner: ownerResult ? compactOwnerResult(ownerResult) : null,
    queueReceipt: queueReceipt || {state: 'NOT_WRITTEN', commentId: null},
    reasonCodes: [...new Set(reasonCodes)].sort(),
  };
}

function renderResultComment(result) {
  const marker = `<!-- ${RESULT_MARKER} request=${result.requestCommentId} -->`;
  const payload = {
    schemaVersion: 1,
    disposition: result.disposition,
    requestCommentId: result.requestCommentId,
    packetNumber: result.packetNumber,
    stage: result.stage,
    ownerStatus: result.owner?.status || null,
    checkpointId: result.owner?.checkpointId || null,
    packet: result.owner?.packet || null,
    audit: result.owner?.audit || null,
    reasonCodes: result.reasonCodes,
  };
  const text = [
    marker,
    'Canonical Main Stage Checkpoint publication result',
    '',
    `\`${JSON.stringify(payload)}\``,
    '',
    'Transport receipt only; canonical packet + #293 evidence remains owned by stage-checkpoint.cjs.',
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
    userAgent: 'canonical-main-stage-checkpoint-request',
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

function canWriteQueueResult(event) {
  return eventReplyIdentity(event) !== null;
}

async function executeEvent({
  event,
  token,
  fetchImpl,
  deps = DEFAULT_DEPS,
} = {}) {
  const replyIdentity = eventReplyIdentity(event);
  let comment = null;
  let request = null;
  try {
    comment = validateEvent(event);
    request = parseRequestBody(comment.body, deps);
  } catch (error) {
    const reasonCode = error instanceof RequestError ? error.reasonCode : 'REQUEST_RUNTIME_ERROR';
    let result = requestResult({
      disposition: 'REQUEST_REJECTED',
      requestCommentId: replyIdentity?.commentId ?? event?.comment?.id ?? null,
      request,
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
      request,
      reasonCodes: ['ACTIONS_TOKEN_REQUIRED'],
    });
  }

  let ownerResult;
  try {
    const checkpointClient = deps.stageCheckpoint.createStageCheckpointClient({
      token,
      repo: FIXED_REPO,
      fetchImpl,
      packetNumber: request.packetNumber,
    });
    ownerResult = await deps.stageCheckpoint.recordCheckpoint({
      client: checkpointClient,
      packetNumber: request.packetNumber,
      stage: request.stage,
      body: request.body,
      expectedPacketBodySha256: request.packetBodySha256,
    });
  } catch {
    ownerResult = {
      status: 'FAILED',
      checkpointId: null,
      packet: {state: 'MISSING', commentId: null},
      audit: {state: 'MISSING', commentId: null},
      reasonCodes: ['CHECKPOINT_OWNER_RUNTIME_ERROR'],
    };
  }

  let result = requestResult({
    disposition: 'REQUEST_ACCEPTED',
    requestCommentId: comment.id,
    request,
    ownerResult,
    reasonCodes: ownerResult?.reasonCodes || [],
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
  if (result?.owner?.status === 'COMPLETE') return 0;
  if (['PARTIAL', 'UNKNOWN'].includes(result?.owner?.status)) return 3;
  return 2;
}

async function run({
  env = process.env,
  event = null,
  token = null,
  fetchImpl,
  deps = DEFAULT_DEPS,
} = {}) {
  const resolvedEvent = event || readEventFile(env.GITHUB_EVENT_PATH);
  if (env.GITHUB_REPOSITORY && env.GITHUB_REPOSITORY !== FIXED_REPO) {
    throw new RequestError('ENV_REPOSITORY_DENIED');
  }
  const resolvedToken = token || env.GITHUB_TOKEN || null;
  return executeEvent({event: resolvedEvent, token: resolvedToken, fetchImpl, deps});
}

async function main() {
  let result;
  try {
    result = await run();
  } catch (error) {
    result = requestResult({
      disposition: 'REQUEST_REJECTED',
      requestCommentId: null,
      reasonCodes: [error instanceof RequestError ? error.reasonCode : 'REQUEST_RUNTIME_ERROR'],
    });
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = exitCodeFor(result);
}

if (require.main === module) main();

module.exports = {
  BODY_SEPARATOR,
  CONTROL_ISSUE,
  DEFAULT_DEPS,
  FIXED_REPO,
  MAX_EVENT_BYTES,
  MAX_REQUEST_BYTES,
  MODE,
  OWNER_LOGIN,
  REQUEST_END,
  REQUEST_START,
  RESULT_MARKER,
  RequestError,
  canWriteQueueResult,
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