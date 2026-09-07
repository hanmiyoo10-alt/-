'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createGitHubClient } = require('../infra/github-client.cjs');

const AUDIT_ISSUE = 293;
const PACKET_MARKER = '<!-- canonical-main-work-packet:v1 -->';
const MAX_BODY_BYTES = 8192;
const MAX_COMMENT_PAGES = 20;
const STAGES = Object.freeze([
  'AUTHORITY_SCOPE',
  'IMPLEMENTATION_PR',
  'VALIDATION_MERGE',
  'POSTMERGE_CONVERGENCE',
  'EXPERIMENT_CLOSE',
]);

function checkpointDigest(packetNumber, stage, body) {
  return crypto.createHash('sha256').update(`${packetNumber}\n${stage}\n${body}`, 'utf8').digest('hex');
}

function checkpointMarker(packetNumber, stage, digest, surface) {
  return `<!-- canonical-main-stage-checkpoint:v1 packet=${packetNumber} stage=${stage} digest=${digest} surface=${surface} -->`;
}

function validateInput({ packetNumber, stage, body }) {
  const reasons = [];
  if (!Number.isInteger(packetNumber) || packetNumber <= 0) reasons.push('PACKET_NUMBER_INVALID');
  if (packetNumber === AUDIT_ISSUE) reasons.push('AUDIT_ISSUE_CANNOT_BE_PACKET');
  if (!STAGES.includes(stage)) reasons.push('STAGE_INVALID');
  if (typeof body !== 'string' || body.trim().length === 0) reasons.push('BODY_MISSING');
  if (Buffer.byteLength(String(body || ''), 'utf8') > MAX_BODY_BYTES) reasons.push('BODY_TOO_LARGE');
  if (String(body || '').includes('\u0000')) reasons.push('BODY_NUL_FORBIDDEN');
  return reasons;
}

async function listIssueComments(client, issueNumber, maxPages = MAX_COMMENT_PAGES) {
  const rows = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const batch = await client.api(`/issues/${issueNumber}/comments?per_page=100&page=${page}`);
    if (!Array.isArray(batch)) throw new Error(`comments for #${issueNumber} were not an array`);
    rows.push(...batch);
    if (batch.length < 100) return rows;
  }
  throw new Error(`issue #${issueNumber} comment pagination exceeded safety bound`);
}

function findMarkerComments(comments, marker) {
  return comments.filter((comment) => String(comment?.body || '').includes(marker));
}

function renderComment({ packetNumber, stage, body, digest, surface }) {
  const marker = checkpointMarker(packetNumber, stage, digest, surface);
  const heading = surface === 'packet'
    ? `Canonical-main stage checkpoint — ${stage}`
    : `Canonical-main stage checkpoint audit — #${packetNumber} / ${stage}`;
  return `${marker}\n## ${heading}\n\n${body.trim()}\n`;
}

function destination(issueNumber, existing = null) {
  return {
    issueNumber,
    state: existing ? 'EXISTING' : 'MISSING',
    commentId: existing?.id ?? null,
  };
}

function resultBase(packetNumber, stage, digest, packet, audit, reasonCodes = [], forcedStatus = null) {
  const states = [packet.state, audit.state];
  const good = (state) => state === 'EXISTING' || state === 'WRITTEN';
  const complete = states.every(good);
  const partial = states.some((state) => state === 'FAILED') && states.some(good);
  const identityUnknown = complete && [packet.commentId, audit.commentId].some((id) => id === null);
  const status = forcedStatus || (complete ? (identityUnknown ? 'UNKNOWN' : 'COMPLETE') : partial ? 'PARTIAL' : 'FAILED');
  return {
    schemaVersion: 1,
    mode: 'CANONICAL_MAIN_STAGE_CHECKPOINT',
    status,
    checkpointId: digest,
    packetNumber,
    stage,
    packet,
    audit,
    reasonCodes: [...new Set(reasonCodes)].sort(),
  };
}

async function validatePacketIssue(client, packetNumber) {
  const issue = await client.api(`/issues/${packetNumber}`);
  const body = String(issue?.body || '');
  if (!issue || issue.pull_request) return ['PACKET_TARGET_NOT_ISSUE'];
  if (issue.state !== 'open') return ['PACKET_TARGET_NOT_OPEN'];
  const count = body.split(/\r?\n/).filter((line) => line.trim() === PACKET_MARKER).length;
  if (count !== 1) return [count === 0 ? 'PACKET_MARKER_MISSING' : 'PACKET_MARKER_DUPLICATE'];
  return [];
}

async function recordCheckpoint({ client, packetNumber, stage, body }) {
  const inputReasons = validateInput({ packetNumber, stage, body });
  if (inputReasons.length) {
    return resultBase(packetNumber, stage, null,
      destination(packetNumber), destination(AUDIT_ISSUE), inputReasons, 'FAILED');
  }

  const packetReasons = await validatePacketIssue(client, packetNumber);
  if (packetReasons.length) {
    return resultBase(packetNumber, stage, null,
      destination(packetNumber), destination(AUDIT_ISSUE), packetReasons, 'FAILED');
  }

  const digest = checkpointDigest(packetNumber, stage, body.trim());
  const packetMarker = checkpointMarker(packetNumber, stage, digest, 'packet');
  const auditMarker = checkpointMarker(packetNumber, stage, digest, 'audit');
  let packetComments;
  let auditComments;
  try {
    [packetComments, auditComments] = await Promise.all([
      listIssueComments(client, packetNumber),
      listIssueComments(client, AUDIT_ISSUE),
    ]);
  } catch (error) {
    return resultBase(packetNumber, stage, digest,
      destination(packetNumber), destination(AUDIT_ISSUE), ['COMMENT_READ_FAILED'], 'FAILED');
  }

  const packetMatches = findMarkerComments(packetComments, packetMarker);
  const auditMatches = findMarkerComments(auditComments, auditMarker);
  if (packetMatches.length > 1 || auditMatches.length > 1) {
    return resultBase(packetNumber, stage, digest,
      destination(packetNumber, packetMatches[0]),
      destination(AUDIT_ISSUE, auditMatches[0]),
      ['CHECKPOINT_MARKER_DUPLICATE'], 'FAILED');
  }

  const packet = destination(packetNumber, packetMatches[0]);
  const audit = destination(AUDIT_ISSUE, auditMatches[0]);
  const reasonCodes = [];

  async function writeIfMissing(target, surface) {
    if (target.state === 'EXISTING') return;
    try {
      const created = await client.api(`/issues/${target.issueNumber}/comments`, {
        method: 'POST',
        body: { body: renderComment({ packetNumber, stage, body, digest, surface }) },
      });
      target.state = 'WRITTEN';
      target.commentId = created?.id ?? null;
      if (target.commentId === null) reasonCodes.push(`${surface.toUpperCase()}_COMMENT_ID_UNKNOWN`);
    } catch (error) {
      target.state = 'FAILED';
      reasonCodes.push(`${surface.toUpperCase()}_WRITE_FAILED`);
    }
  }

  await writeIfMissing(packet, 'packet');
  await writeIfMissing(audit, 'audit');
  return resultBase(packetNumber, stage, digest, packet, audit, reasonCodes);
}

function parseArgs(argv = process.argv.slice(2)) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!['--packet', '--stage', '--body-file'].includes(key) || value === undefined) {
      throw new Error('usage: node stage-checkpoint.cjs --packet <number> --stage <stage> --body-file <path>');
    }
    if (parsed[key]) throw new Error(`duplicate argument ${key}`);
    parsed[key] = value;
  }
  if (Object.keys(parsed).length !== 3) throw new Error('packet, stage, and body-file are required');
  if (!/^[1-9]\d*$/.test(parsed['--packet'])) throw new Error('packet must be a positive integer');
  return {
    packetNumber: Number(parsed['--packet']),
    stage: parsed['--stage'],
    bodyFile: parsed['--body-file'],
  };
}

function readBodyFile(bodyFile) {
  const resolved = path.resolve(bodyFile);
  const stat = fs.statSync(resolved);
  if (!stat.isFile()) throw new Error('body-file must be a regular file');
  if (stat.size > MAX_BODY_BYTES) throw new Error(`body-file exceeds ${MAX_BODY_BYTES} bytes`);
  return fs.readFileSync(resolved, 'utf8');
}

function exitCodeFor(result) {
  if (result?.status === 'COMPLETE') return 0;
  if (result?.status === 'PARTIAL' || result?.status === 'UNKNOWN') return 3;
  return 2;
}

async function run({ argv = process.argv.slice(2), token, repo, fetchImpl } = {}) {
  const args = parseArgs(argv);
  const body = readBodyFile(args.bodyFile);
  const resolvedRepo = String(repo || process.env.GITHUB_REPOSITORY || '').trim();
  if (!/^[^/\s]+\/[^/\s]+$/.test(resolvedRepo)) {
    return resultBase(args.packetNumber, args.stage, null,
      destination(args.packetNumber), destination(AUDIT_ISSUE), ['REPOSITORY_IDENTITY_INVALID'], 'FAILED');
  }
  const client = createGitHubClient({
    token: token || process.env.GH_TOKEN || process.env.GITHUB_TOKEN,
    repo: resolvedRepo,
    fetchImpl,
    userAgent: 'canonical-main-stage-checkpoint',
  });
  return recordCheckpoint({ client, packetNumber: args.packetNumber, stage: args.stage, body });
}

async function main() {
  try {
    const result = await run();
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = exitCodeFor(result);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({
      schemaVersion: 1,
      mode: 'CANONICAL_MAIN_STAGE_CHECKPOINT',
      status: 'FAILED',
      reasonCodes: ['RUNTIME_ERROR'],
      error: String(error?.message || error).slice(0, 300),
    })}\n`);
    process.exitCode = 2;
  }
}

if (require.main === module) main();

module.exports = {
  AUDIT_ISSUE,
  MAX_BODY_BYTES,
  PACKET_MARKER,
  STAGES,
  checkpointDigest,
  checkpointMarker,
  exitCodeFor,
  findMarkerComments,
  parseArgs,
  recordCheckpoint,
  renderComment,
  validateInput,
  validatePacketIssue,
};
