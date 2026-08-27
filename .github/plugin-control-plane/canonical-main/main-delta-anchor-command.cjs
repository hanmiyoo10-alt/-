'use strict';

const fs = require('fs');

const SHA_RE = /^[0-9a-f]{40}$/;
const REASON_RE = /^[A-Z0-9][A-Z0-9_:-]{0,79}$/;
const COMMAND_PREFIX = '/canonical-main-delta-anchor advance ';
const DEFAULT_REASON = 'EXPLICIT_BRIEF_DELIVERED';
const DEFAULT_ANCHOR_ISSUE = 562;

function invocation(ok, reasonCodes, extras = {}) {
  return {
    schemaVersion: 1,
    mode: 'MAIN_DELTA_ANCHOR_COMMAND',
    ok,
    anchorIssue: Number.isSafeInteger(extras.anchorIssue) ? extras.anchorIssue : null,
    expectedAnchorSha: extras.expectedAnchorSha || null,
    targetMainSha: extras.targetMainSha || null,
    reason: extras.reason || null,
    reasonCodes: [...new Set(reasonCodes)].sort(),
  };
}

function isSha(value) {
  return typeof value === 'string' && SHA_RE.test(value);
}

function isReason(value) {
  return typeof value === 'string' && REASON_RE.test(value);
}

function parseIssueNumber(value) {
  const text = String(value ?? '').trim();
  if (!/^\d+$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function validateInvocation({ anchorIssue, expectedAnchorSha, targetMainSha, reason = DEFAULT_REASON } = {}, options = {}) {
  const requiredIssue = Number.isSafeInteger(options.requiredIssue) ? options.requiredIssue : DEFAULT_ANCHOR_ISSUE;
  const parsedIssue = parseIssueNumber(anchorIssue);
  const errors = [];
  if (parsedIssue !== requiredIssue) errors.push('ANCHOR_COMMAND_ISSUE_NOT_ALLOWED');
  if (!isSha(expectedAnchorSha)) errors.push('ANCHOR_COMMAND_EXPECTED_SHA_INVALID');
  if (!isSha(targetMainSha)) errors.push('ANCHOR_COMMAND_TARGET_SHA_INVALID');
  if (!isReason(reason)) errors.push('ANCHOR_COMMAND_REASON_INVALID');
  if (errors.length) return invocation(false, errors, { anchorIssue: parsedIssue, expectedAnchorSha, targetMainSha, reason });
  return invocation(true, ['ANCHOR_COMMAND_VALID'], {
    anchorIssue: parsedIssue,
    expectedAnchorSha,
    targetMainSha,
    reason,
  });
}

function parseCommandBody(body, options = {}) {
  const text = typeof body === 'string' ? body.trim() : '';
  const match = /^\/canonical-main-delta-anchor advance ([0-9a-f]{40}) ([0-9a-f]{40})(?: ([A-Z0-9][A-Z0-9_:-]{0,79}))?$/.exec(text);
  if (!match) return invocation(false, ['ANCHOR_COMMAND_BODY_INVALID']);
  return validateInvocation({
    anchorIssue: options.requiredIssue || DEFAULT_ANCHOR_ISSUE,
    expectedAnchorSha: match[1],
    targetMainSha: match[2],
    reason: match[3] || DEFAULT_REASON,
  }, options);
}

function invocationFromIssueCommentEvent(event, options = {}) {
  const owner = String(options.owner || '').trim();
  const requiredIssue = Number.isSafeInteger(options.requiredIssue) ? options.requiredIssue : DEFAULT_ANCHOR_ISSUE;
  if (!event || typeof event !== 'object') return invocation(false, ['ANCHOR_COMMAND_EVENT_INVALID']);
  if (event.action !== 'created') return invocation(false, ['ANCHOR_COMMAND_EVENT_ACTION_REJECTED']);
  if (!event.issue || event.issue.pull_request) return invocation(false, ['ANCHOR_COMMAND_PR_COMMENT_REJECTED']);
  if (event.issue.number !== requiredIssue) return invocation(false, ['ANCHOR_COMMAND_EVENT_ISSUE_REJECTED']);
  if (!owner) return invocation(false, ['ANCHOR_COMMAND_OWNER_REQUIRED']);
  if (!event.comment || !event.comment.user || event.comment.user.login !== owner) {
    return invocation(false, ['ANCHOR_COMMAND_ACTOR_REJECTED']);
  }
  if (event.comment.author_association !== 'OWNER') {
    return invocation(false, ['ANCHOR_COMMAND_ASSOCIATION_REJECTED']);
  }
  const parsed = parseCommandBody(event.comment.body, { requiredIssue });
  if (!parsed.ok) return parsed;
  return invocation(true, ['ANCHOR_COMMAND_EVENT_AUTHORIZED', ...parsed.reasonCodes], parsed);
}

function invocationFromManualEnv(env = process.env, options = {}) {
  return validateInvocation({
    anchorIssue: env.ANCHOR_ISSUE,
    expectedAnchorSha: env.EXPECTED_ANCHOR,
    targetMainSha: env.TARGET_MAIN,
    reason: env.ADVANCE_REASON || DEFAULT_REASON,
  }, options);
}

function writeGitHubOutputs(value, outputPath) {
  if (!value || !value.ok) throw new Error('ANCHOR_COMMAND_OUTPUT_REQUIRES_VALID_INVOCATION');
  if (!outputPath) throw new Error('GITHUB_OUTPUT is required');
  const lines = [
    `anchor_issue=${value.anchorIssue}`,
    `expected_anchor=${value.expectedAnchorSha}`,
    `target_main=${value.targetMainSha}`,
    `reason=${value.reason}`,
  ];
  fs.appendFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
}

function loadEvent(file) {
  if (!file) throw new Error('GITHUB_EVENT_PATH is required');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function run({ argv = process.argv.slice(2), env = process.env } = {}) {
  const mode = argv[0];
  let value;
  if (mode === 'manual') {
    value = invocationFromManualEnv(env);
  } else if (mode === 'comment') {
    value = invocationFromIssueCommentEvent(loadEvent(env.GITHUB_EVENT_PATH), {
      owner: env.GITHUB_REPOSITORY_OWNER,
      requiredIssue: DEFAULT_ANCHOR_ISSUE,
    });
  } else {
    value = invocation(false, ['ANCHOR_COMMAND_MODE_INVALID']);
  }

  if (!value.ok) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    return 2;
  }
  writeGitHubOutputs(value, env.GITHUB_OUTPUT);
  process.stdout.write(`${JSON.stringify({ ...value, expectedAnchorSha: value.expectedAnchorSha.slice(0, 12), targetMainSha: value.targetMainSha.slice(0, 12) }, null, 2)}\n`);
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = run();
  } catch (error) {
    console.error(`main-delta-anchor-command fatal: ${error && error.message ? error.message : error}`);
    process.exitCode = 1;
  }
}

module.exports = {
  COMMAND_PREFIX,
  DEFAULT_ANCHOR_ISSUE,
  DEFAULT_REASON,
  invocation,
  invocationFromIssueCommentEvent,
  invocationFromManualEnv,
  isReason,
  isSha,
  loadEvent,
  parseCommandBody,
  parseIssueNumber,
  run,
  validateInvocation,
  writeGitHubOutputs,
};
