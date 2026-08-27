'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {renderAnchorMarker} = require('../main-delta-anchor.cjs');
const {COMMAND, invocationFromIssueCommentEvent} = require('../main-delta-session-command.cjs');
const {executeSessionCompose, parseCapsule} = require('../main-delta-session-start.cjs');

const root = path.resolve(__dirname, '../../../..');
const anchorSha = 'a'.repeat(40);
const mainSha = 'b'.repeat(40);

function anchorBody(sha = anchorSha, generation = 3) {
  return `# Anchor\n\n${renderAnchorMarker({
    schemaVersion: 1,
    scope: 'canonical-main',
    anchorSha: sha,
    generation,
    advancedFrom: null,
    advanceReason: 'EXPLICIT_BRIEF_DELIVERED',
    sourceRefs: ['issue:#562'],
  })}\n`;
}

function opsBody(sha = mainSha) {
  return [
    '# Canonical Main — Operations View',
    '',
    '## Canonical Operator Capsule',
    '- STATE: `CLEAR`',
    `- MAIN: \`${sha}\` / Required PASS — run 42`,
    '- CHANGE: HIGH — 2 commit(s) / 2 file(s) since aaaaaaaaaaaa',
    '- WHY: `NONE`',
    '- NEXT: `REVIEW_GOVERNANCE_OR_AUTOMATION_CHANGE`',
    '- AUTHORITY: Production MATCH — release-simcore abc; native protection `READY_TO_ACTIVATE` / protected `false`; soft fallback `ACTIVE`',
    '- UNKNOWN: NONE',
    '',
    '<details>',
    '</details>',
  ].join('\n');
}

function event(overrides = {}) {
  return {
    action: 'created',
    issue: {number: 562},
    comment: {user: {login: 'owner'}, author_association: 'OWNER', body: COMMAND},
    ...overrides,
  };
}

function clientScenario({capsuleSha = mainSha, compareStatus = 'ahead', barrierMain = mainSha, barrierOpsChanged = false, barrierAnchorChanged = false} = {}) {
  const calls = [];
  const initialOps = {number: 485, state: 'open', body: opsBody(capsuleSha)};
  const initialAnchor = {number: 562, state: 'open', body: anchorBody()};
  let branchReads = 0;
  let opsReads = 0;
  let anchorReads = 0;
  const client = {
    api: async (endpoint, options) => {
      calls.push({endpoint, options});
      if (endpoint === '/branches/main') {
        branchReads += 1;
        return {commit: {sha: branchReads === 1 ? mainSha : barrierMain}};
      }
      if (endpoint === '/issues/485') {
        opsReads += 1;
        return opsReads === 1 ? initialOps : {...initialOps, body: barrierOpsChanged ? `${initialOps.body}\nchanged` : initialOps.body};
      }
      if (endpoint === '/issues/562') {
        anchorReads += 1;
        return anchorReads === 1 ? initialAnchor : {...initialAnchor, body: barrierAnchorChanged ? anchorBody('c'.repeat(40), 4) : initialAnchor.body};
      }
      if (endpoint === `/compare/${anchorSha}...${mainSha}`) {
        return {
          status: compareStatus,
          ahead_by: 2,
          commits: [
            {sha: 'c'.repeat(40), commit: {message: 'docs: promote canonical-main generated documentation (#99)'}},
            {sha: 'd'.repeat(40), commit: {message: 'ci: change workflow'}},
          ],
          files: [{filename: '.github/workflows/example.yml'}, {filename: 'docs/NOTE.md'}],
        };
      }
      if (endpoint === '/issues/562/comments' && options?.method === 'POST') return {id: 12345};
      throw new Error(`unexpected api call ${endpoint}`);
    },
  };
  return {client, calls};
}

(async () => {
  const parsed = parseCapsule(opsBody());
  assert.equal(parsed.ok, true);
  assert.equal(parsed.mainSha, mainSha);
  assert.equal(parsed.operatorState, 'CLEAR');
  assert.equal(parseCapsule('no capsule').reasonCode, 'SESSION_CAPSULE_MISSING');

  const requested = invocationFromIssueCommentEvent(event(), {owner: 'owner'});
  assert.equal(requested.ok, true);
  assert.equal(requested.requested, true);
  assert.equal(invocationFromIssueCommentEvent(event({comment: {user: {login: 'other'}, author_association: 'OWNER', body: COMMAND}}), {owner: 'owner'}).ok, false);
  assert.equal(invocationFromIssueCommentEvent(event({comment: {user: {login: 'owner'}, author_association: 'MEMBER', body: COMMAND}}), {owner: 'owner'}).ok, false);
  assert.equal(invocationFromIssueCommentEvent(event({issue: {number: 999}}), {owner: 'owner'}).ok, false);
  const unrelated = invocationFromIssueCommentEvent(event({comment: {user: {login: 'owner'}, author_association: 'OWNER', body: `${COMMAND} now`}}), {owner: 'owner'});
  assert.equal(unrelated.ok, true);
  assert.equal(unrelated.requested, false);
  assert(unrelated.reasonCodes.includes('SESSION_COMMAND_NOT_REQUESTED'));

  const success = clientScenario();
  const staged = await executeSessionCompose({client: success.client});
  assert.equal(staged.status, 'SESSION_BRIEF_STAGED');
  assert.equal(staged.staged, true);
  assert.equal(staged.issueCommentAuthorized, true);
  assert.equal(staged.anchorMutationAuthorized, false);
  assert.equal(staged.expectedAnchorSha, anchorSha);
  assert.equal(staged.targetMainSha, mainSha);
  assert.equal(staged.anchorGeneration, 3);
  assert.equal(staged.commentId, 12345);
  assert.equal(staged.brief.deliveryState, 'PENDING_USER_VISIBLE_DELIVERY');
  assert.equal(staged.brief.commitCount, 2);
  assert.equal(staged.brief.meaningfulCommitCount, 1);
  assert.equal(staged.brief.routineGeneratedDocCommitCount, 1);
  assert.equal(staged.brief.riskLevel, 'HIGH');
  assert.equal(staged.brief.actionCode, 'REVIEW_GOVERNANCE_OR_AUTOMATION_CHANGE');
  const post = success.calls.find((row) => row.endpoint === '/issues/562/comments');
  assert(post, 'session composition must stage exactly one issue comment');
  assert.match(post.options.body.body, /PENDING_USER_VISIBLE_DELIVERY/);
  assert.match(post.options.body.body, /CHANGE: HIGH — 2 total commit\(s\) \(1 meaningful \+ 1 routine generated-doc\) \/ 2 file\(s\)/);
  assert.match(post.options.body.body, new RegExp(anchorSha));
  assert.match(post.options.body.body, new RegExp(mainSha));
  assert.equal(success.calls.some((row) => row.endpoint === '/issues/562' && row.options?.method === 'PATCH'), false, 'composer must never PATCH anchor state');

  const stale = clientScenario({capsuleSha: 'c'.repeat(40)});
  const staleResult = await executeSessionCompose({client: stale.client});
  assert.equal(staleResult.status, 'SESSION_COMPOSE_BLOCKED');
  assert(staleResult.reasonCodes.includes('SESSION_CAPSULE_STALE_MAIN'));
  assert.equal(stale.calls.some((row) => row.endpoint === '/issues/562/comments'), false);

  const divergent = clientScenario({compareStatus: 'diverged'});
  const divergentResult = await executeSessionCompose({client: divergent.client});
  assert.equal(divergentResult.status, 'SESSION_COMPOSE_BLOCKED');
  assert(divergentResult.reasonCodes.includes('SESSION_DELTA_UNKNOWN'));
  assert.equal(divergent.calls.some((row) => row.endpoint === '/issues/562/comments'), false);

  const moved = clientScenario({barrierMain: 'd'.repeat(40)});
  const movedResult = await executeSessionCompose({client: moved.client});
  assert.equal(movedResult.status, 'SESSION_COMPOSE_BLOCKED');
  assert(movedResult.reasonCodes.includes('SESSION_MAIN_CHANGED_BEFORE_STAGE'));
  assert.equal(moved.calls.some((row) => row.endpoint === '/issues/562/comments'), false);

  const changedAnchor = clientScenario({barrierAnchorChanged: true});
  const anchorResult = await executeSessionCompose({client: changedAnchor.client});
  assert.equal(anchorResult.status, 'SESSION_COMPOSE_BLOCKED');
  assert(anchorResult.reasonCodes.includes('SESSION_ANCHOR_CHANGED_BEFORE_STAGE'));

  const composerSource = fs.readFileSync(path.join(root, '.github/plugin-control-plane/canonical-main/main-delta-session-start.cjs'), 'utf8');
  assert.doesNotMatch(composerSource, /method:\s*['"]PATCH['"]/, 'session composer must not own anchor PATCH');
  assert.doesNotMatch(composerSource, /executeAnchorAdvance|planAnchorAdvance/, 'session composer must not import anchor mutation owner');
  assert.match(composerSource, /changeSummary\(delta\)/, 'session brief must reuse the Q1 CHANGE presentation owner');

  const workflow = fs.readFileSync(path.join(root, '.github/workflows/canonical-main-delta-anchor.yml'), 'utf8');
  assert.match(workflow, /compose-session:/);
  assert.match(workflow, /github\.event\.comment\.user\.login == github\.repository_owner/);
  assert.match(workflow, /github\.event\.comment\.author_association == 'OWNER'/);
  assert.match(workflow, /main-delta-session-command\.cjs/);
  assert.match(workflow, /steps\.session\.outputs\.compose == 'true'/);
  assert.match(workflow, /main-delta-session-start\.cjs compose/);
  assert.match(workflow, /ref: main/);
  assert.doesNotMatch(workflow, /run:[\s\S]*github\.event\.comment\.body/, 'raw issue comment body must stay before shell run blocks');

  console.log('CANONICAL_MAIN_SESSION_START_CONTRACT:OK');
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
