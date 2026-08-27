'use strict';

const {createGitHubClient} = require('./infra/github-client.cjs');
const {parseAnchorMarker} = require('./main-delta-anchor.cjs');
const mainDelta = require('./observers/main-delta.cjs');
const {changeSummary} = require('./surfaces/summary.cjs');

const CAPSULE_HEADING = '## Canonical Operator Capsule';
const BRIEF_START = '<!-- canonical-main-session-brief:v1:start -->';
const BRIEF_END = '<!-- canonical-main-session-brief:v1:end -->';
const FIELD_ORDER = Object.freeze(['STATE', 'MAIN', 'CHANGE', 'WHY', 'NEXT', 'AUTHORITY', 'UNKNOWN']);
const SHA_RE = /^[0-9a-f]{40}$/;

function result(status, reasonCodes = [], extras = {}) {
  return {
    schemaVersion: 1,
    mode: 'CANONICAL_MAIN_SESSION_START_COMPOSE',
    status,
    staged: Boolean(extras.staged),
    issueCommentAuthorized: Boolean(extras.issueCommentAuthorized),
    anchorMutationAuthorized: false,
    mainMutationAuthorized: false,
    releaseMutationAuthorized: false,
    expectedAnchorSha: extras.expectedAnchorSha || null,
    targetMainSha: extras.targetMainSha || null,
    anchorGeneration: Number.isSafeInteger(extras.anchorGeneration) ? extras.anchorGeneration : null,
    commentId: Number.isSafeInteger(extras.commentId) ? extras.commentId : null,
    brief: extras.brief || null,
    reasonCodes: [...new Set(reasonCodes)].sort(),
  };
}

function parseCapsule(body) {
  const text = typeof body === 'string' ? body : '';
  const start = text.indexOf(CAPSULE_HEADING);
  if (start < 0) return {ok: false, reasonCode: 'SESSION_CAPSULE_MISSING'};
  const lines = text.slice(start + CAPSULE_HEADING.length).split(/\r?\n/).slice(1);
  const fields = {};
  for (const line of lines) {
    if (!line.trim()) break;
    const match = /^- ([A-Z]+): (.+)$/.exec(line);
    if (!match) return {ok: false, reasonCode: 'SESSION_CAPSULE_ROW_INVALID'};
    if (!FIELD_ORDER.includes(match[1]) || Object.prototype.hasOwnProperty.call(fields, match[1])) {
      return {ok: false, reasonCode: 'SESSION_CAPSULE_FIELDS_INVALID'};
    }
    fields[match[1]] = match[2];
  }
  if (FIELD_ORDER.some((field) => !Object.prototype.hasOwnProperty.call(fields, field))) {
    return {ok: false, reasonCode: 'SESSION_CAPSULE_FIELDS_INCOMPLETE'};
  }
  const mainMatch = /^`([0-9a-f]{40})` \/ Required (.+)$/.exec(fields.MAIN);
  if (!mainMatch) return {ok: false, reasonCode: 'SESSION_CAPSULE_MAIN_INVALID'};
  const stateMatch = /^`(CLEAR|ATTENTION|INCIDENT|UNKNOWN)`$/.exec(fields.STATE);
  if (!stateMatch) return {ok: false, reasonCode: 'SESSION_CAPSULE_STATE_INVALID'};
  return {
    ok: true,
    fields,
    mainSha: mainMatch[1],
    requiredSummary: mainMatch[2],
    operatorState: stateMatch[1],
  };
}

function buildBrief({capsule, delta, anchorState, mainSha}) {
  const data = delta.data;
  const marker = {
    schemaVersion: 1,
    mode: 'CANONICAL_MAIN_SESSION_BRIEF',
    deliveryState: 'PENDING_USER_VISIBLE_DELIVERY',
    expectedAnchorSha: anchorState.anchorSha,
    targetMainSha: mainSha,
    anchorGeneration: anchorState.generation,
    commitCount: data.commitCount,
    meaningfulCommitCount: Number.isSafeInteger(data.meaningfulCommitCount) ? data.meaningfulCommitCount : data.commitCount,
    routineGeneratedDocCommitCount: Number.isSafeInteger(data.routineGeneratedDocCommitCount) ? data.routineGeneratedDocCommitCount : 0,
    fileCount: data.fileCount,
    riskLevel: data.riskLevel,
    actionRequired: Boolean(data.actionRequired),
    actionCode: data.actionCode,
    claimsCurrentHealth: true,
    anchorMutationAuthorized: false,
  };
  const lines = [
    '## Canonical Main Session Brief',
    '- DELIVERY: `PENDING_USER_VISIBLE_DELIVERY`',
    `- STATE: ${capsule.fields.STATE}`,
    `- MAIN: ${capsule.fields.MAIN}`,
    `- CHANGE: ${changeSummary(delta)}`,
    `- WHY: ${capsule.fields.WHY}`,
    `- NEXT: ${capsule.fields.NEXT}`,
    `- AUTHORITY: ${capsule.fields.AUTHORITY}`,
    `- UNKNOWN: ${capsule.fields.UNKNOWN}`,
    '',
    '- Anchor advancement is NOT authorized by this staged brief.',
    '- After actual chat delivery, re-read current main and #562. Only an exact unchanged expected/target barrier may invoke the existing anchor CAS command.',
    '',
    BRIEF_START,
    '```json',
    JSON.stringify(marker, null, 2),
    '```',
    BRIEF_END,
  ];
  return {marker, markdown: `${lines.join('\n')}\n`};
}

async function executeSessionCompose({client, anchorIssue = 562, opsIssue = 485} = {}) {
  if (!client || typeof client.api !== 'function') return result('SESSION_COMPOSE_BLOCKED', ['SESSION_CLIENT_REQUIRED']);
  if (!Number.isSafeInteger(anchorIssue) || anchorIssue <= 0) return result('SESSION_COMPOSE_BLOCKED', ['SESSION_ANCHOR_ISSUE_INVALID']);
  if (!Number.isSafeInteger(opsIssue) || opsIssue <= 0) return result('SESSION_COMPOSE_BLOCKED', ['SESSION_OPS_ISSUE_INVALID']);

  const main = await client.api('/branches/main');
  const ops = await client.api(`/issues/${opsIssue}`);
  const anchor = await client.api(`/issues/${anchorIssue}`);
  const mainSha = main?.commit?.sha;
  if (!SHA_RE.test(String(mainSha || ''))) return result('SESSION_COMPOSE_BLOCKED', ['SESSION_MAIN_SHA_INVALID']);
  if (!ops || ops.pull_request || ops.state !== 'open') return result('SESSION_COMPOSE_BLOCKED', ['SESSION_OPS_ISSUE_INVALID_STATE']);
  if (!anchor || anchor.pull_request || anchor.state !== 'open') return result('SESSION_COMPOSE_BLOCKED', ['SESSION_ANCHOR_ISSUE_INVALID_STATE']);

  const capsule = parseCapsule(ops.body);
  if (!capsule.ok) return result('SESSION_COMPOSE_BLOCKED', [capsule.reasonCode]);
  if (capsule.mainSha !== mainSha) {
    return result('SESSION_COMPOSE_BLOCKED', ['SESSION_CAPSULE_STALE_MAIN'], {targetMainSha: mainSha});
  }
  const parsedAnchor = parseAnchorMarker(anchor.body || '');
  if (parsedAnchor.error) {
    return result('SESSION_COMPOSE_BLOCKED', ['SESSION_ANCHOR_STATE_INVALID', parsedAnchor.error, ...(parsedAnchor.validationErrors || [])]);
  }

  const delta = await mainDelta.observe({allIssues: [anchor], mainSha, client});
  if (!delta.known) {
    return result('SESSION_COMPOSE_BLOCKED', ['SESSION_DELTA_UNKNOWN', delta.data?.reasonCode || 'SESSION_DELTA_REASON_UNKNOWN'], {
      expectedAnchorSha: parsedAnchor.state.anchorSha,
      targetMainSha: mainSha,
      anchorGeneration: parsedAnchor.state.generation,
    });
  }
  const brief = buildBrief({capsule, delta, anchorState: parsedAnchor.state, mainSha});

  const mainBarrier = await client.api('/branches/main');
  const opsBarrier = await client.api(`/issues/${opsIssue}`);
  const anchorBarrier = await client.api(`/issues/${anchorIssue}`);
  if (mainBarrier?.commit?.sha !== mainSha) {
    return result('SESSION_COMPOSE_BLOCKED', ['SESSION_MAIN_CHANGED_BEFORE_STAGE'], {
      expectedAnchorSha: parsedAnchor.state.anchorSha, targetMainSha: mainSha, anchorGeneration: parsedAnchor.state.generation,
    });
  }
  if (!opsBarrier || opsBarrier.body !== ops.body) {
    return result('SESSION_COMPOSE_BLOCKED', ['SESSION_CAPSULE_CHANGED_BEFORE_STAGE'], {
      expectedAnchorSha: parsedAnchor.state.anchorSha, targetMainSha: mainSha, anchorGeneration: parsedAnchor.state.generation,
    });
  }
  if (!anchorBarrier || anchorBarrier.body !== anchor.body) {
    return result('SESSION_COMPOSE_BLOCKED', ['SESSION_ANCHOR_CHANGED_BEFORE_STAGE'], {
      expectedAnchorSha: parsedAnchor.state.anchorSha, targetMainSha: mainSha, anchorGeneration: parsedAnchor.state.generation,
    });
  }

  const comment = await client.api(`/issues/${anchorIssue}/comments`, {method: 'POST', body: {body: brief.markdown}});
  return result('SESSION_BRIEF_STAGED', ['SESSION_EXACT_BARRIER_PROVEN', 'SESSION_BRIEF_PENDING_USER_VISIBLE_DELIVERY'], {
    staged: true,
    issueCommentAuthorized: true,
    expectedAnchorSha: parsedAnchor.state.anchorSha,
    targetMainSha: mainSha,
    anchorGeneration: parsedAnchor.state.generation,
    commentId: Number(comment?.id),
    brief: brief.marker,
  });
}

function parseArgs(argv) {
  const args = Array.isArray(argv) ? argv : [];
  if (args[0] !== 'compose') return null;
  function value(flag) {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : null;
  }
  const anchorRaw = value('--anchor-issue');
  const opsRaw = value('--ops-issue');
  const anchorIssue = /^\d+$/.test(anchorRaw || '') ? Number(anchorRaw) : null;
  const opsIssue = /^\d+$/.test(opsRaw || '') ? Number(opsRaw) : null;
  if (!Number.isSafeInteger(anchorIssue) || !Number.isSafeInteger(opsIssue)) return null;
  return {anchorIssue, opsIssue};
}

async function run({argv = process.argv.slice(2), env = process.env} = {}) {
  const parsed = parseArgs(argv);
  if (!parsed) {
    process.stdout.write(`${JSON.stringify(result('SESSION_COMPOSE_BLOCKED', ['SESSION_ARGUMENTS_INVALID']), null, 2)}\n`);
    return 2;
  }
  const client = createGitHubClient({
    token: env.GH_TOKEN || env.GITHUB_TOKEN,
    repo: env.GITHUB_REPOSITORY,
    userAgent: 'canonical-main-session-start',
  });
  const output = await executeSessionCompose({client, ...parsed});
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  return output.status === 'SESSION_BRIEF_STAGED' ? 0 : 2;
}

if (require.main === module) {
  run().then((code) => { process.exitCode = code; }).catch((error) => {
    console.error(`main-delta-session-start fatal: ${error && error.message ? error.message : error}`);
    process.exitCode = 1;
  });
}

module.exports = {
  BRIEF_END,
  BRIEF_START,
  CAPSULE_HEADING,
  FIELD_ORDER,
  buildBrief,
  executeSessionCompose,
  parseArgs,
  parseCapsule,
  result,
  run,
};
