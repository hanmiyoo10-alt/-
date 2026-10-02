'use strict';

const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createGitHubClient } = require('../infra/github-client.cjs');
const { classifyPacketProjection } = require('../work-system/packet-projection.cjs');

const FIXED_REPO = 'hanmiyoo10-alt/-';
const AUDIT_ISSUE = 293;
const PACKET_MARKER = '<!-- canonical-main-work-packet:v1 -->';
const MAX_BODY_BYTES = 8192;
const MAX_COMMENT_BODY_BYTES = MAX_BODY_BYTES + 1024;
const MAX_COMMENT_PAGES = 20;
const STAGES = Object.freeze([
  'AUTHORITY_SCOPE',
  'IMPLEMENTATION_PR',
  'VALIDATION_MERGE',
  'POSTMERGE_CONVERGENCE',
  'EXPERIMENT_CLOSE',
]);
const INSPECT_MODE = 'CANONICAL_MAIN_STAGE_CHECKPOINT_INSPECT';
const CHECKPOINT_MARKER_TOKEN = 'canonical-main-stage-checkpoint:v1';
const CHECKPOINT_MARKER_RE = /^<!-- canonical-main-stage-checkpoint:v1 packet=([1-9][0-9]*) stage=(AUTHORITY_SCOPE|IMPLEMENTATION_PR|VALIDATION_MERGE|POSTMERGE_CONVERGENCE|EXPERIMENT_CLOSE) digest=([0-9a-f]{64}) surface=(packet|audit) -->$/;

const ISSUE_GET_RE = /^\/issues\/([1-9][0-9]*)$/;
const COMMENTS_GET_RE = /^\/issues\/([1-9][0-9]*)\/comments\?per_page=100&page=([1-9][0-9]*)$/;
const COMMENTS_POST_RE = /^\/issues\/([1-9][0-9]*)\/comments$/;

function validRepo(repo) {
  return /^[^/\s]+\/[^/\s]+$/.test(String(repo || '').trim());
}

function defaultGhRunner(args, options = {}) {
  const result = childProcess.spawnSync('gh', args, {
    encoding: 'utf8',
    shell: false,
    input: options.input,
  });
  return {code: result.status ?? 1, stdout: result.stdout || '', stderr: result.stderr || ''};
}

function parseGhJson(result, expectedShape) {
  if (!result || result.code !== 0) throw new Error('GH_API_REQUEST_FAILED');
  let value;
  try {
    value = JSON.parse(result.stdout || '');
  } catch {
    throw new Error('GH_API_RESPONSE_INVALID');
  }
  if (expectedShape === 'array' && !Array.isArray(value)) throw new Error('GH_API_RESPONSE_INVALID');
  if (expectedShape === 'object' && (!value || typeof value !== 'object' || Array.isArray(value))) {
    throw new Error('GH_API_RESPONSE_INVALID');
  }
  return value;
}

function createGhCheckpointClient({
  repo = FIXED_REPO,
  packetNumber,
  runner = defaultGhRunner,
} = {}) {
  if (repo !== FIXED_REPO) throw new Error('GH_API_REPOSITORY_INVALID');
  if (!Number.isInteger(packetNumber) || packetNumber <= 0 || packetNumber === AUDIT_ISSUE) {
    throw new Error('GH_API_PACKET_INVALID');
  }
  const allowedCommentIssues = new Set([packetNumber, AUDIT_ISSUE]);
  const baseArgs = (endpoint, method) => [
    'api', `repos/${repo}${endpoint}`, '--method', method,
    '--header', 'Accept: application/vnd.github+json',
  ];
  return {
    repo,
    async api(endpoint, options = {}) {
      const issueGet = String(endpoint || '').match(ISSUE_GET_RE);
      const commentsGet = String(endpoint || '').match(COMMENTS_GET_RE);
      const commentsPost = String(endpoint || '').match(COMMENTS_POST_RE);

      if (issueGet) {
        if (Number(issueGet[1]) !== packetNumber) throw new Error('GH_API_ENDPOINT_INVALID');
        if (options && Object.keys(options).length > 0) throw new Error('GH_API_OPTIONS_INVALID');
        return parseGhJson(runner(baseArgs(endpoint, 'GET')), 'object');
      }

      if (commentsGet) {
        if (!allowedCommentIssues.has(Number(commentsGet[1]))) throw new Error('GH_API_ENDPOINT_INVALID');
        if (options && Object.keys(options).length > 0) throw new Error('GH_API_OPTIONS_INVALID');
        if (Number(commentsGet[2]) > MAX_COMMENT_PAGES) throw new Error('GH_API_COMMENT_PAGE_INVALID');
        return parseGhJson(runner(baseArgs(endpoint, 'GET')), 'array');
      }

      if (commentsPost) {
        if (!allowedCommentIssues.has(Number(commentsPost[1]))) throw new Error('GH_API_ENDPOINT_INVALID');
        const keys = Object.keys(options || {}).sort();
        if (keys.length !== 2 || keys[0] !== 'body' || keys[1] !== 'method' || options.method !== 'POST') {
          throw new Error('GH_API_OPTIONS_INVALID');
        }
        const body = options.body;
        if (!body || typeof body !== 'object' || Array.isArray(body)
            || Object.keys(body).length !== 1 || typeof body.body !== 'string'
            || body.body.length === 0 || body.body.includes('\u0000')
            || Buffer.byteLength(body.body, 'utf8') > MAX_COMMENT_BODY_BYTES) {
          throw new Error('GH_API_COMMENT_BODY_INVALID');
        }
        const result = runner([...baseArgs(endpoint, 'POST'), '--input', '-'], {
          input: JSON.stringify(body),
        });
        return parseGhJson(result, 'object');
      }

      throw new Error('GH_API_ENDPOINT_INVALID');
    },
  };
}

function createStageCheckpointClient({repo, token, fetchImpl, runner, packetNumber} = {}) {
  if (token) {
    return createGitHubClient({
      token,
      repo,
      fetchImpl,
      userAgent: 'canonical-main-stage-checkpoint',
    });
  }
  return createGhCheckpointClient({repo, runner, packetNumber});
}

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

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function inspectionResult({
  packetNumber,
  disposition,
  nativeState = null,
  lifecycle = null,
  currentStage = null,
  stageDigests = new Map(),
  rebindDisposition = null,
  nextStage = null,
  nextLegalAction = null,
  reasonCodes = [],
}) {
  const stages = STAGES.map((stage) => {
    const pairedDigests = [...(stageDigests.get(stage) || [])].sort();
    return {
      stage,
      completed: pairedDigests.length > 0,
      variantCount: pairedDigests.length,
      pairedDigests,
    };
  });
  const completedStages = stages.filter((row) => row.completed).map((row) => row.stage);
  return {
    schemaVersion: 1,
    mode: INSPECT_MODE,
    disposition,
    packetNumber,
    nativeState,
    lifecycle,
    currentStage,
    completedStages,
    furthestCompletedStage: completedStages.at(-1) || null,
    stages,
    rebindDisposition,
    nextStage,
    nextLegalAction,
    reasonCodes: uniqueSorted(reasonCodes),
    mutationAuthorized: false,
    executionAuthorized: false,
  };
}

function parseCheckpointSurface(comments, packetNumber, expectedSurface) {
  const counts = new Map();
  const reasonCodes = [];
  for (const comment of comments) {
    const lines = String(comment?.body || '').replace(/\r\n/g, '\n').split('\n');
    for (const line of lines) {
      if (!line.includes(CHECKPOINT_MARKER_TOKEN)) continue;
      const match = line.match(CHECKPOINT_MARKER_RE);
      if (!match) {
        if (line.includes(`packet=${packetNumber}`)) reasonCodes.push('CHECKPOINT_MARKER_MALFORMED');
        continue;
      }
      const markerPacket = Number(match[1]);
      const stage = match[2];
      const digest = match[3];
      const surface = match[4];
      if (markerPacket !== packetNumber) continue;
      if (surface !== expectedSurface) {
        reasonCodes.push('CHECKPOINT_SURFACE_MISMATCH');
        continue;
      }
      const key = `${stage}:${digest}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return { counts, reasonCodes };
}

async function inspectCheckpoint({ client, packetNumber }) {
  if (!Number.isInteger(packetNumber) || packetNumber <= 0 || packetNumber === AUDIT_ISSUE) {
    return inspectionResult({
      packetNumber,
      disposition: 'UNKNOWN',
      reasonCodes: ['PACKET_NUMBER_INVALID'],
    });
  }

  let issue;
  let packetComments;
  let auditComments;
  try {
    [issue, packetComments, auditComments] = await Promise.all([
      client.api(`/issues/${packetNumber}`),
      listIssueComments(client, packetNumber),
      listIssueComments(client, AUDIT_ISSUE),
    ]);
  } catch {
    return inspectionResult({
      packetNumber,
      disposition: 'UNKNOWN',
      reasonCodes: ['CHECKPOINT_INSPECT_READ_FAILED'],
    });
  }

  const reasonCodes = [];
  let conflict = false;
  let unknown = false;
  if (!issue || issue.pull_request) {
    conflict = true;
    reasonCodes.push('PACKET_TARGET_NOT_ISSUE');
  }

  const nativeState = issue?.state || null;
  if (!['open', 'closed'].includes(nativeState)) {
    conflict = true;
    reasonCodes.push('PACKET_NATIVE_STATE_INVALID');
  }

  const projection = classifyPacketProjection(String(issue?.body || ''));
  if (projection.disposition === 'CONFLICT') conflict = true;
  if (projection.disposition === 'UNKNOWN') unknown = true;
  reasonCodes.push(...projection.reasonCodes);

  const packetMarkers = parseCheckpointSurface(packetComments, packetNumber, 'packet');
  const auditMarkers = parseCheckpointSurface(auditComments, packetNumber, 'audit');
  if (packetMarkers.reasonCodes.length || auditMarkers.reasonCodes.length) conflict = true;
  reasonCodes.push(...packetMarkers.reasonCodes, ...auditMarkers.reasonCodes);

  const stageDigests = new Map(STAGES.map((stage) => [stage, new Set()]));
  const keys = new Set([...packetMarkers.counts.keys(), ...auditMarkers.counts.keys()]);
  for (const key of keys) {
    const packetCount = packetMarkers.counts.get(key) || 0;
    const auditCount = auditMarkers.counts.get(key) || 0;
    if (packetCount > 1 || auditCount > 1) {
      conflict = true;
      reasonCodes.push('CHECKPOINT_MARKER_DUPLICATE');
      continue;
    }
    if (packetCount !== 1 || auditCount !== 1) {
      unknown = true;
      reasonCodes.push('CHECKPOINT_PAIR_INCOMPLETE');
      continue;
    }
    const separator = key.indexOf(':');
    const stage = key.slice(0, separator);
    const digest = key.slice(separator + 1);
    stageDigests.get(stage).add(digest);
  }

  let prefixLength = 0;
  while (prefixLength < STAGES.length && stageDigests.get(STAGES[prefixLength]).size > 0) {
    prefixLength += 1;
  }
  for (let index = prefixLength + 1; index < STAGES.length; index += 1) {
    if (stageDigests.get(STAGES[index]).size > 0) {
      conflict = true;
      reasonCodes.push('CHECKPOINT_STAGE_PREFIX_CONFLICT');
      break;
    }
  }

  let rebindDisposition = null;
  let nextStage = null;
  let nextLegalAction = null;
  const lifecycle = projection.lifecycle;
  const currentStage = projection.interactionStage;

  if (!conflict && !unknown) {
    if (nativeState === 'closed') {
      if (lifecycle === 'DONE') {
        rebindDisposition = 'STOP_TERMINAL';
        nextLegalAction = 'NONE_TERMINAL_PACKET_COMPLETE';
      } else {
        conflict = true;
        reasonCodes.push('PACKET_LIFECYCLE_NATIVE_CONFLICT');
      }
    } else if (lifecycle === 'DONE') {
      rebindDisposition = 'CONTINUE_TRANSACTION_CLOSURE';
      nextLegalAction = 'SELF_CLOSE_SYNC_CURRENT_PACKET';
    } else if (lifecycle !== 'IN_PROGRESS') {
      unknown = true;
      reasonCodes.push('PACKET_LIFECYCLE_NOT_IN_PROGRESS');
    } else if (prefixLength === STAGES.length) {
      rebindDisposition = 'CONTINUE_TRANSACTION_CLOSURE';
      nextLegalAction = 'SELF_CLOSE_SYNC_CURRENT_PACKET';
    } else {
      const currentIndex = STAGES.indexOf(currentStage);
      if (currentIndex < 0) {
        unknown = true;
        reasonCodes.push('PACKET_CURRENT_STAGE_UNKNOWN');
      } else if (currentIndex < prefixLength) {
        rebindDisposition = 'REUSE_COMPLETED_STAGE';
        nextStage = STAGES[prefixLength];
        nextLegalAction = `ADVANCE_TO_${nextStage}`;
      } else if (currentIndex === prefixLength) {
        rebindDisposition = 'CONTINUE_CURRENT_STAGE';
        nextStage = currentStage;
        nextLegalAction = `CONTINUE_${currentStage}`;
      } else {
        conflict = true;
        reasonCodes.push('PACKET_STAGE_AHEAD_OF_DURABLE_PREFIX');
      }
    }
  }

  return inspectionResult({
    packetNumber,
    disposition: conflict ? 'CONFLICT' : unknown ? 'UNKNOWN' : 'PASS',
    nativeState,
    lifecycle,
    currentStage,
    stageDigests,
    rebindDisposition,
    nextStage,
    nextLegalAction,
    reasonCodes,
  });
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

function parseInspectArgs(argv = process.argv.slice(2)) {
  if (argv.length !== 3 || argv[0] !== 'inspect' || argv[1] !== '--packet' || !/^[1-9]\d*$/.test(argv[2])) {
    throw new Error('usage: node stage-checkpoint.cjs inspect --packet <number>');
  }
  return { packetNumber: Number(argv[2]) };
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
  if (result?.mode === INSPECT_MODE) {
    if (result?.disposition === 'PASS') return 0;
    if (result?.disposition === 'UNKNOWN') return 3;
    return 2;
  }
  if (result?.status === 'COMPLETE') return 0;
  if (result?.status === 'PARTIAL' || result?.status === 'UNKNOWN') return 3;
  return 2;
}

async function run({
  argv = process.argv.slice(2),
  token,
  repo,
  fetchImpl,
  env = process.env,
  runner = defaultGhRunner,
} = {}) {
  const inspectMode = argv[0] === 'inspect';
  const args = inspectMode ? parseInspectArgs(argv) : parseArgs(argv);
  const body = inspectMode ? null : readBodyFile(args.bodyFile);
  const resolvedToken = token || env.GH_TOKEN || env.GITHUB_TOKEN;
  const resolvedRepo = String(repo || env.GITHUB_REPOSITORY || (!resolvedToken ? FIXED_REPO : '')).trim();
  if (!validRepo(resolvedRepo) || (!resolvedToken && resolvedRepo !== FIXED_REPO)) {
    if (inspectMode) {
      return inspectionResult({
        packetNumber: args.packetNumber,
        disposition: 'UNKNOWN',
        reasonCodes: ['REPOSITORY_IDENTITY_INVALID'],
      });
    }
    return resultBase(args.packetNumber, args.stage, null,
      destination(args.packetNumber), destination(AUDIT_ISSUE), ['REPOSITORY_IDENTITY_INVALID'], 'FAILED');
  }
  const client = createStageCheckpointClient({
    token: resolvedToken,
    repo: resolvedRepo,
    fetchImpl,
    runner,
    packetNumber: args.packetNumber,
  });
  if (inspectMode) return inspectCheckpoint({ client, packetNumber: args.packetNumber });
  return recordCheckpoint({ client, packetNumber: args.packetNumber, stage: args.stage, body });
}

async function main() {
  try {
    const result = await run();
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = exitCodeFor(result);
  } catch (error) {
    const inspectMode = process.argv.slice(2)[0] === 'inspect';
    process.stdout.write(`${JSON.stringify({
      schemaVersion: 1,
      mode: inspectMode ? INSPECT_MODE : 'CANONICAL_MAIN_STAGE_CHECKPOINT',
      ...(inspectMode ? { disposition: 'UNKNOWN' } : { status: 'FAILED' }),
      reasonCodes: ['RUNTIME_ERROR'],
      error: String(error?.message || error).slice(0, 300),
    })}\n`);
    process.exitCode = 2;
  }
}

if (require.main === module) main();

module.exports = {
  FIXED_REPO,
  AUDIT_ISSUE,
  MAX_BODY_BYTES,
  MAX_COMMENT_BODY_BYTES,
  PACKET_MARKER,
  STAGES,
  checkpointDigest,
  checkpointMarker,
  createGhCheckpointClient,
  inspectCheckpoint,
  inspectionResult,
  createStageCheckpointClient,
  defaultGhRunner,
  exitCodeFor,
  findMarkerComments,
  parseArgs,
  parseCheckpointSurface,
  parseInspectArgs,
  recordCheckpoint,
  renderComment,
  run,
  validateInput,
  validatePacketIssue,
};
