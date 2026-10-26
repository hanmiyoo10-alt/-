'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const adapter = require('../mcl-task-lease-comment-request.cjs');
const realLease = require('../../../../../products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs');

const COMMENT_ID = 912345;
const PACKET_REF = '#3762';
const PACKET_HASH = 'a'.repeat(64);
const BASE = 'b'.repeat(40);
const LEASE_ID = 'c'.repeat(64);
const SCOPE = 'path:products/chatgpt-mobile-coder-lab/device-ops/wireless-adb-peer-control/**';
const WORKTREE = '/home/alsl0/nyang-worktrees/mcl-wireless-adb-peer-control-3762';
const BRANCH = 'laptop/mcl-wireless-adb-peer-control-3762';

function acquirePayload(overrides = {}) {
  return {
    schemaVersion: 1,
    operation: 'acquire',
    expectedGeneration: 1230,
    packetRef: PACKET_REF,
    packetBodySha256: PACKET_HASH,
    route: 'L',
    executor: 'L',
    scopes: [SCOPE, 'surface:mcl:wireless-adb-peer-control-m-to-s'],
    scopeDisposition: 'DISJOINT',
    workspaceKind: 'repository',
    branch: BRANCH,
    worktree: WORKTREE,
    observedBaseSha: BASE,
    ...overrides,
  };
}

function releasePayload(overrides = {}) {
  return {
    schemaVersion: 1,
    operation: 'release',
    expectedGeneration: 1231,
    packetRef: PACKET_REF,
    leaseId: LEASE_ID,
    ...overrides,
  };
}

function requestBody(payload = acquirePayload()) {
  return [
    adapter.REQUEST_START,
    JSON.stringify(payload),
    adapter.REQUEST_END,
  ].join('\n');
}

function eventFixture({
  body = requestBody(),
  action = 'created',
  repo = adapter.FIXED_REPO,
  repoOwner = adapter.OWNER_LOGIN,
  issueNumber = adapter.CONTROL_ISSUE,
  issueState = 'open',
  pullRequest = null,
  login = adapter.OWNER_LOGIN,
  association = 'OWNER',
  userType = 'User',
  commentId = COMMENT_ID,
} = {}) {
  return {
    action,
    repository: {full_name: repo, owner: {login: repoOwner}},
    issue: {number: issueNumber, state: issueState, pull_request: pullRequest},
    comment: {
      id: commentId,
      body,
      author_association: association,
      user: {login, type: userType},
    },
  };
}

function reason(fn, code) {
  assert.throws(fn, (error) => error?.reasonCode === code);
}

function fakeDeps({ownerOutput = null, queueFails = false} = {}) {
  const calls = {execute: [], public: [], queue: []};
  const taskLease = {
    ...realLease,
    async executeOperation(input) {
      calls.execute.push({client: input.client, operation: input.operation, request: structuredClone(input.request), actor: input.actor, repositoryOwner: input.repositoryOwner});
      return ownerOutput || realLease.result('ACQUIRE_UPDATED', [], {
        generation: 1231,
        leaseId: LEASE_ID,
      });
    },
    publicResult(output) {
      calls.public.push(structuredClone(output));
      return realLease.publicResult(output);
    },
  };
  function createGitHubClient(options) {
    return {
      async api(endpoint, requestOptions = {}) {
        if (endpoint === `/issues/${adapter.CONTROL_ISSUE}/comments`) {
          calls.queue.push({endpoint, requestOptions, clientOptions: options});
          if (queueFails) throw new Error('queue failed');
          return {id: 99001};
        }
        return {fixture: true};
      },
    };
  }
  return {deps: {taskLease, createGitHubClient}, calls};
}

function fixedIdentityContract() {
  assert.equal(adapter.FIXED_REPO, 'hanmiyoo10-alt/-');
  assert.equal(adapter.CONTROL_ISSUE, 3782);
  assert.equal(adapter.OWNER_LOGIN, 'hanmiyoo10-alt');
  assert.equal(adapter.REQUEST_START, '<!-- mcl-task-lease-comment-request:v1 -->');
  assert.equal(adapter.REQUEST_END, '<!-- /mcl-task-lease-comment-request:v1 -->');
  assert.equal(adapter.RESULT_MARKER, 'mcl-task-lease-comment-result:v1');
}

function parserContract() {
  const acquire = adapter.parseRequestBody(requestBody());
  assert.equal(acquire.operation, 'acquire');
  assert.deepEqual(acquire.request, {
    expectedGeneration: 1230,
    packetRef: PACKET_REF,
    packetBodySha256: PACKET_HASH,
    route: 'L',
    executor: 'L',
    scopes: [SCOPE, 'surface:mcl:wireless-adb-peer-control-m-to-s'],
    scopeDisposition: 'DISJOINT',
    workspaceKind: 'repository',
    branch: BRANCH,
    worktree: WORKTREE,
    observedBaseSha: BASE,
  });
  assert.match(acquire.requestDigest, /^[0-9a-f]{64}$/);

  const release = adapter.parseRequestBody(requestBody(releasePayload()));
  assert.equal(release.operation, 'release');
  assert.deepEqual(release.request, {
    expectedGeneration: 1231,
    packetRef: PACKET_REF,
    leaseId: LEASE_ID,
  });

  reason(() => adapter.parseRequestBody(requestBody({...acquirePayload(), extra: true})), 'REQUEST_KEYS_INVALID');
  reason(() => adapter.parseRequestBody(requestBody({...releasePayload(), extra: true})), 'REQUEST_KEYS_INVALID');
  reason(() => adapter.parseRequestBody(requestBody({...acquirePayload(), operation: 'activate'})), 'REQUEST_OPERATION_UNSUPPORTED');
  reason(() => adapter.parseRequestBody('prefix\n' + requestBody()), 'REQUEST_EXTRANEOUS_TEXT');
  reason(() => adapter.parseRequestBody(requestBody() + '\n' + adapter.REQUEST_START), 'REQUEST_MARKER_COUNT_INVALID');
  reason(() => adapter.parseRequestBody(requestBody({...acquirePayload(), expectedGeneration: '1230'})), 'REQUEST_GENERATION_INVALID');
  reason(() => adapter.parseRequestBody(requestBody({...acquirePayload(), packetBodySha256: 'ABC'})), 'REQUEST_PACKET_HASH_INVALID');
  reason(() => adapter.parseRequestBody(requestBody({...acquirePayload(), scopeDisposition: 'UNKNOWN'})), 'REQUEST_SCOPE_DISPOSITION_INVALID');
  reason(() => adapter.parseRequestBody(requestBody({...acquirePayload(), scopes: [SCOPE, SCOPE]})), 'REQUEST_SCOPES_INVALID');
  reason(() => adapter.parseRequestBody(requestBody({...releasePayload(), leaseId: 'ABC'})), 'REQUEST_LEASE_ID_INVALID');
}

function eventGuardContract() {
  assert.equal(adapter.validateEvent(eventFixture()).id, COMMENT_ID);
  reason(() => adapter.validateEvent(eventFixture({action: 'edited'})), 'EVENT_ACTION_DENIED');
  reason(() => adapter.validateEvent(eventFixture({repo: 'other/repo'})), 'EVENT_REPOSITORY_DENIED');
  reason(() => adapter.validateEvent(eventFixture({repoOwner: 'other'})), 'EVENT_REPOSITORY_OWNER_DENIED');
  reason(() => adapter.validateEvent(eventFixture({issueNumber: 999})), 'EVENT_CONTROL_ISSUE_DENIED');
  reason(() => adapter.validateEvent(eventFixture({pullRequest: {url: 'x'}})), 'EVENT_PULL_REQUEST_DENIED');
  reason(() => adapter.validateEvent(eventFixture({issueState: 'closed'})), 'EVENT_CONTROL_ISSUE_NOT_OPEN');
  reason(() => adapter.validateEvent(eventFixture({login: 'other'})), 'EVENT_ACTOR_DENIED');
  reason(() => adapter.validateEvent(eventFixture({association: 'MEMBER'})), 'EVENT_ACTOR_ASSOCIATION_DENIED');
  reason(() => adapter.validateEvent(eventFixture({userType: 'Bot'})), 'EVENT_BOT_DENIED');
  assert.deepEqual(adapter.eventReplyIdentity(eventFixture()), {
    issueNumber: adapter.CONTROL_ISSUE,
    commentId: COMMENT_ID,
  });
  assert.equal(adapter.eventReplyIdentity(eventFixture({issueNumber: 999})), null);
}

async function delegationContract() {
  const fixture = fakeDeps();
  const result = await adapter.executeEvent({
    event: eventFixture(),
    token: 'fixture-token',
    deps: fixture.deps,
  });
  assert.equal(result.disposition, 'REQUEST_ACCEPTED');
  assert.equal(result.owner.status, 'ACQUIRE_UPDATED');
  assert.equal(result.owner.generation, 1231);
  assert.equal(result.owner.leaseId, LEASE_ID);
  assert.equal(result.queueReceipt.state, 'WRITTEN');
  assert.equal(adapter.exitCodeFor(result), 0);
  assert.equal(fixture.calls.execute.length, 1);
  const input = fixture.calls.execute[0];
  assert.equal(input.operation, 'acquire');
  assert.deepEqual(input.request, adapter.parseRequestBody(requestBody()).request);
  assert.equal(input.actor, adapter.OWNER_LOGIN);
  assert.equal(input.repositoryOwner, adapter.OWNER_LOGIN);
  assert.equal(fixture.calls.public.length, 1);
  assert.equal(fixture.calls.queue.length, 1);
  assert.equal(fixture.calls.queue[0].endpoint, '/issues/3782/comments');
  assert.equal(fixture.calls.queue[0].requestOptions.method, 'POST');

  const comment = fixture.calls.queue[0].requestOptions.body.body;
  assert.ok(comment.includes(adapter.RESULT_MARKER));
  assert.equal(comment.includes(adapter.REQUEST_START), false);
  assert.equal(comment.includes(adapter.REQUEST_END), false);
  assert.equal(comment.includes(SCOPE), false);
  assert.equal(comment.includes(WORKTREE), false);
  assert.equal(comment.includes(PACKET_HASH), false);
}

async function statusPreservationContract() {
  for (const [status, expectedExit] of [
    ['BLOCKED', 2],
    ['CONFLICT', 3],
    ['UNKNOWN', 4],
    ['RELEASE_NOOP', 0],
  ]) {
    const fixture = fakeDeps({
      ownerOutput: realLease.result(status, [status + '_FIXTURE'], {
        generation: 1231,
        leaseId: LEASE_ID,
      }),
    });
    const body = status === 'RELEASE_NOOP' ? requestBody(releasePayload()) : requestBody();
    const result = await adapter.executeEvent({
      event: eventFixture({body}),
      token: 'fixture-token',
      deps: fixture.deps,
    });
    assert.equal(result.owner.status, status);
    assert.equal(adapter.exitCodeFor(result), expectedExit);
  }

  const queueFail = fakeDeps({queueFails: true});
  const result = await adapter.executeEvent({
    event: eventFixture(),
    token: 'fixture-token',
    deps: queueFail.deps,
  });
  assert.equal(result.queueReceipt.state, 'FAILED');
  assert.ok(result.reasonCodes.includes('QUEUE_RESULT_WRITE_FAILED'));
  assert.equal(adapter.exitCodeFor(result), 3);
}

async function rejectionContract() {
  const malformed = fakeDeps();
  const bad = await adapter.executeEvent({
    event: eventFixture({body: requestBody({...acquirePayload(), extra: true})}),
    token: 'fixture-token',
    deps: malformed.deps,
  });
  assert.equal(bad.disposition, 'REQUEST_REJECTED');
  assert.ok(bad.reasonCodes.includes('REQUEST_KEYS_INVALID'));
  assert.equal(malformed.calls.execute.length, 0);
  assert.equal(malformed.calls.queue.length, 1);
  assert.equal(malformed.calls.queue[0].endpoint, '/issues/3782/comments');

  const wrongActor = fakeDeps();
  const rejected = await adapter.executeEvent({
    event: eventFixture({login: 'other'}),
    token: 'fixture-token',
    deps: wrongActor.deps,
  });
  assert.equal(rejected.disposition, 'REQUEST_REJECTED');
  assert.ok(rejected.reasonCodes.includes('EVENT_ACTOR_DENIED'));
  assert.equal(wrongActor.calls.execute.length, 0);

  const noToken = fakeDeps();
  const missing = await adapter.executeEvent({
    event: eventFixture(),
    token: null,
    deps: noToken.deps,
  });
  assert.equal(missing.disposition, 'REQUEST_REJECTED');
  assert.ok(missing.reasonCodes.includes('ACTIONS_TOKEN_REQUIRED'));
  assert.equal(noToken.calls.execute.length, 0);
  assert.equal(noToken.calls.queue.length, 0);
}

function sourceAuthorityCeilingContract() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'mcl-task-lease-comment-request.cjs'), 'utf8');
  for (const forbidden of [
    "require('node:child_process')",
    'workflow_dispatch',
    'planAcquire(',
    'planRelease(',
    'planActivate(',
    '/issues/2352',
    'update_ref',
    'merge_pull_request',
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
  assert.ok(source.includes('taskLease.executeOperation'));
  assert.ok(source.includes('taskLease.publicResult'));
  assert.ok(source.includes('createGitHubClient'));
  const queueTemplate = '/issues/' + '$' + '{CONTROL_ISSUE}/comments';
  assert.ok(source.includes(queueTemplate));
}

function workflowContract() {
  const workflowPath = path.resolve(__dirname, '../../../../workflows/mcl-task-lease.yml');
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  assert.ok(workflow.includes('workflow_dispatch:'));
  assert.ok(workflow.includes('issue_comment:'));
  assert.ok(workflow.includes('types: [created]'));
  assert.ok(workflow.includes('group: mcl-task-lease-v1'));
  assert.ok(workflow.includes('cancel-in-progress: false'));
  assert.ok(workflow.includes("github.actor == github.repository_owner && github.event_name == 'workflow_dispatch'"));
  assert.ok(workflow.includes("github.event_name == 'issue_comment'"));
  assert.ok(workflow.includes("github.repository == 'hanmiyoo10-alt/-'"));
  assert.ok(workflow.includes('github.event.issue.number == 3782'));
  assert.ok(workflow.includes("github.actor == 'hanmiyoo10-alt'"));
  assert.ok(workflow.includes("github.event.comment.user.login == 'hanmiyoo10-alt'"));
  assert.ok(workflow.includes("github.event.comment.author_association == 'OWNER'"));
  assert.ok(workflow.includes("github.event.comment.user.type != 'Bot'"));
  assert.ok(workflow.includes('ref: main'));
  assert.ok(workflow.includes('persist-credentials: false'));
  assert.ok(workflow.includes('GITHUB_TOKEN: ' + '$' + '{{ github.token }}'));
  assert.ok(workflow.includes('mcl-task-lease-comment-request.cjs'));
  assert.equal(workflow.includes('github.event.comment.body'), false);
  assert.ok(workflow.includes('contents: read'));
  assert.ok(workflow.includes('issues: write'));
  assert.equal(workflow.includes('contents: write'), false);
  assert.equal(workflow.includes('pull_request_target'), false);
  assert.equal(workflow.includes('actions: write'), false);
  assert.equal(workflow.includes('id-token: write'), false);
  assert.equal((workflow.match(/- name: Apply bounded MCL lease operation/g) || []).length, 1);
}

function manifestContract() {
  const manifestPath = path.resolve(
    __dirname, '../../../../tooling/ci-summary/manifests/plugin-control-plane.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const rows = manifest.checks.filter(
    (row) => row.name === 'work-harness-mcl-task-lease-comment-request-contract');
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].command, [
    'node',
    '.github/plugin-control-plane/canonical-main/work-harness/tests/mcl-task-lease-comment-request-contract.cjs',
  ]);
}

function readmeContract() {
  const readmePath = path.resolve(__dirname, '../README.md');
  const readme = fs.readFileSync(readmePath, 'utf8');
  assert.ok(readme.includes('## MCL D-013 owner-comment task-lease queue'));
  assert.ok(readme.includes('**#3782**'));
  assert.ok(readme.includes('task-lease.cjs::executeOperation()'));
  assert.ok(readme.includes('Implementation owner: #3783'));
}

async function main() {
  fixedIdentityContract();
  parserContract();
  eventGuardContract();
  await delegationContract();
  await statusPreservationContract();
  await rejectionContract();
  sourceAuthorityCeilingContract();
  workflowContract();
  manifestContract();
  readmeContract();
  console.log('mcl-task-lease-comment-request-contract: ok');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
