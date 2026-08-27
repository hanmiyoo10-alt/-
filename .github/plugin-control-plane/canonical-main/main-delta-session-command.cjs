'use strict';

const fs = require('fs');

const COMMAND = '/canonical-main-session-start compose';
const DEFAULT_ANCHOR_ISSUE = 562;

function invocation(ok, reasonCodes = []) {
  return {
    schemaVersion: 1,
    mode: 'CANONICAL_MAIN_SESSION_START_COMMAND',
    ok: Boolean(ok),
    anchorIssue: DEFAULT_ANCHOR_ISSUE,
    reasonCodes: [...new Set(reasonCodes)].sort(),
  };
}

function invocationFromIssueCommentEvent(event, {owner, requiredIssue = DEFAULT_ANCHOR_ISSUE} = {}) {
  if (!event || typeof event !== 'object') return invocation(false, ['SESSION_COMMAND_EVENT_INVALID']);
  if (event.action !== 'created') return invocation(false, ['SESSION_COMMAND_EVENT_ACTION_REJECTED']);
  if (!event.issue || event.issue.pull_request) return invocation(false, ['SESSION_COMMAND_PR_COMMENT_REJECTED']);
  if (event.issue.number !== requiredIssue) return invocation(false, ['SESSION_COMMAND_EVENT_ISSUE_REJECTED']);
  if (!owner) return invocation(false, ['SESSION_COMMAND_OWNER_REQUIRED']);
  if (!event.comment || !event.comment.user || event.comment.user.login !== owner) {
    return invocation(false, ['SESSION_COMMAND_ACTOR_REJECTED']);
  }
  if (event.comment.author_association !== 'OWNER') {
    return invocation(false, ['SESSION_COMMAND_ASSOCIATION_REJECTED']);
  }
  if (String(event.comment.body || '').trim() !== COMMAND) {
    return invocation(false, ['SESSION_COMMAND_BODY_INVALID']);
  }
  return invocation(true, ['SESSION_COMMAND_AUTHORIZED']);
}

function loadEvent(file) {
  if (!file) throw new Error('GITHUB_EVENT_PATH is required');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function run({env = process.env} = {}) {
  const value = invocationFromIssueCommentEvent(loadEvent(env.GITHUB_EVENT_PATH), {
    owner: String(env.GITHUB_REPOSITORY_OWNER || '').trim(),
    requiredIssue: DEFAULT_ANCHOR_ISSUE,
  });
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  return value.ok ? 0 : 2;
}

if (require.main === module) {
  try {
    process.exitCode = run();
  } catch (error) {
    console.error(`main-delta-session-command fatal: ${error && error.message ? error.message : error}`);
    process.exitCode = 1;
  }
}

module.exports = {
  COMMAND,
  DEFAULT_ANCHOR_ISSUE,
  invocation,
  invocationFromIssueCommentEvent,
  loadEvent,
  run,
};
