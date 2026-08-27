'use strict';

const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  DEFAULT_REASON,
  invocationFromIssueCommentEvent,
  invocationFromManualEnv,
  parseCommandBody,
  validateInvocation,
  writeGitHubOutputs,
} = require('../main-delta-anchor-command.cjs');

const A = '1111111111111111111111111111111111111111';
const B = '2222222222222222222222222222222222222222';
const OWNER = 'repo-owner';

function event(overrides = {}) {
  const base = {
    action: 'created',
    issue: { number: 562 },
    comment: {
      body: `/canonical-main-delta-anchor advance ${A} ${B}`,
      author_association: 'OWNER',
      user: { login: OWNER },
    },
  };
  return {
    ...base,
    ...overrides,
    issue: { ...base.issue, ...(overrides.issue || {}) },
    comment: {
      ...base.comment,
      ...(overrides.comment || {}),
      user: { ...base.comment.user, ...((overrides.comment && overrides.comment.user) || {}) },
    },
  };
}

function assertBlocked(value, code) {
  assert.equal(value.ok, false);
  assert(value.reasonCodes.includes(code), `${code} missing from ${value.reasonCodes.join(',')}`);
}

function main() {
  const parsed = parseCommandBody(`/canonical-main-delta-anchor advance ${A} ${B}`);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.anchorIssue, 562);
  assert.equal(parsed.expectedAnchorSha, A);
  assert.equal(parsed.targetMainSha, B);
  assert.equal(parsed.reason, DEFAULT_REASON);

  const customReason = parseCommandBody(`/canonical-main-delta-anchor advance ${A} ${B} EXPLICIT_BRIEF_DELIVERED`);
  assert.equal(customReason.ok, true);
  assert.equal(customReason.reason, 'EXPLICIT_BRIEF_DELIVERED');

  for (const body of [
    '',
    `/canonical-main-delta-anchor advance ${A}`,
    `/canonical-main-delta-anchor advance ${A} ${B} bad-reason`,
    `/canonical-main-delta-anchor advance ${'A'.repeat(40)} ${B}`,
    `prefix /canonical-main-delta-anchor advance ${A} ${B}`,
    `/canonical-main-delta-anchor advance ${A} ${B}\nextra`,
  ]) {
    assertBlocked(parseCommandBody(body), 'ANCHOR_COMMAND_BODY_INVALID');
  }

  const authorized = invocationFromIssueCommentEvent(event(), { owner: OWNER });
  assert.equal(authorized.ok, true);
  assert.equal(authorized.anchorIssue, 562);
  assert.equal(authorized.expectedAnchorSha, A);
  assert.equal(authorized.targetMainSha, B);
  assert(authorized.reasonCodes.includes('ANCHOR_COMMAND_EVENT_AUTHORIZED'));

  assertBlocked(invocationFromIssueCommentEvent(event({ action: 'edited' }), { owner: OWNER }), 'ANCHOR_COMMAND_EVENT_ACTION_REJECTED');
  assertBlocked(invocationFromIssueCommentEvent(event({ issue: { number: 561 } }), { owner: OWNER }), 'ANCHOR_COMMAND_EVENT_ISSUE_REJECTED');
  assertBlocked(invocationFromIssueCommentEvent(event({ issue: { pull_request: { url: 'https://example.invalid/pr' } } }), { owner: OWNER }), 'ANCHOR_COMMAND_PR_COMMENT_REJECTED');
  assertBlocked(invocationFromIssueCommentEvent(event({ comment: { user: { login: 'someone-else' } } }), { owner: OWNER }), 'ANCHOR_COMMAND_ACTOR_REJECTED');
  assertBlocked(invocationFromIssueCommentEvent(event({ comment: { author_association: 'MEMBER' } }), { owner: OWNER }), 'ANCHOR_COMMAND_ASSOCIATION_REJECTED');
  assertBlocked(invocationFromIssueCommentEvent(event(), { owner: '' }), 'ANCHOR_COMMAND_OWNER_REQUIRED');
  assertBlocked(invocationFromIssueCommentEvent(event({ comment: { body: 'hello' } }), { owner: OWNER }), 'ANCHOR_COMMAND_BODY_INVALID');

  const manual = invocationFromManualEnv({
    ANCHOR_ISSUE: '562',
    EXPECTED_ANCHOR: A,
    TARGET_MAIN: B,
    ADVANCE_REASON: 'EXPLICIT_BRIEF_DELIVERED',
  });
  assert.equal(manual.ok, true);

  assertBlocked(invocationFromManualEnv({
    ANCHOR_ISSUE: '999',
    EXPECTED_ANCHOR: A,
    TARGET_MAIN: B,
    ADVANCE_REASON: 'EXPLICIT_BRIEF_DELIVERED',
  }), 'ANCHOR_COMMAND_ISSUE_NOT_ALLOWED');

  assertBlocked(validateInvocation({ anchorIssue: 562, expectedAnchorSha: 'bad', targetMainSha: B, reason: DEFAULT_REASON }), 'ANCHOR_COMMAND_EXPECTED_SHA_INVALID');
  assertBlocked(validateInvocation({ anchorIssue: 562, expectedAnchorSha: A, targetMainSha: 'bad', reason: DEFAULT_REASON }), 'ANCHOR_COMMAND_TARGET_SHA_INVALID');
  assertBlocked(validateInvocation({ anchorIssue: 562, expectedAnchorSha: A, targetMainSha: B, reason: 'lowercase' }), 'ANCHOR_COMMAND_REASON_INVALID');

  const tmp = mkdtempSync(path.join(os.tmpdir(), 'anchor-command-output-'));
  try {
    const output = path.join(tmp, 'github-output');
    writeGitHubOutputs(authorized, output);
    const text = readFileSync(output, 'utf8');
    assert.equal(text, [
      'anchor_issue=562',
      `expected_anchor=${A}`,
      `target_main=${B}`,
      'reason=EXPLICIT_BRIEF_DELIVERED',
      '',
    ].join('\n'));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  const workflow = readFileSync('.github/workflows/canonical-main-delta-anchor.yml', 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /issue_comment:/);
  assert.match(workflow, /types:\s*\[created\]/);
  assert.match(workflow, /github\.event\.issue\.number == 562/);
  assert.match(workflow, /github\.event\.comment\.user\.login == github\.repository_owner/);
  assert.match(workflow, /github\.event\.comment\.author_association == 'OWNER'/);
  assert.match(workflow, /startsWith\(github\.event\.comment\.body, '\/canonical-main-delta-anchor advance '\)/);
  assert.match(workflow, /ref:\s*main/);
  assert.match(workflow, /main-delta-anchor-command\.cjs manual/);
  assert.match(workflow, /main-delta-anchor-command\.cjs comment/);
  assert.match(workflow, /main-delta-anchor\.cjs advance/);
  assert.match(workflow, /group:\s*canonical-main-delta-anchor/);
  assert.match(workflow, /cancel-in-progress:\s*false/);
  assert.match(workflow, /contents:\s*read/);
  assert.match(workflow, /issues:\s*write/);
  assert.doesNotMatch(workflow, /contents:\s*write/);
  assert.doesNotMatch(workflow, /^\s*push:/m);
  assert.doesNotMatch(workflow, /--issue '\$\{\{ inputs\./, 'raw workflow_dispatch inputs must not be interpolated into shell arguments');
  assert.doesNotMatch(workflow, /run:[\s\S]*github\.event\.comment\.body/, 'raw issue comment body must not be interpolated into shell run blocks');

  console.log('MAIN_DELTA_ANCHOR_COMMAND_CONTRACT:PASS');
}

main();
