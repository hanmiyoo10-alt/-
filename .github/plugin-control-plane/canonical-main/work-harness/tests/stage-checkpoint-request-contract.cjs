
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const request = require('../stage-checkpoint-request.cjs');

const PACKET = 4001;
const COMMENT_ID = 812345;
const BODY = '## evidence\n\n- bounded: true';
const PACKET_BODY_SHA = 'b'.repeat(64);

function requestBody({body = BODY, metadata = {}, crlf = false} = {}) {
  const payload = {
    schemaVersion: 1,
    packetNumber: PACKET,
    stage: 'IMPLEMENTATION_PR',
    bodySha256: request.sha256Text(body),
    packetBodySha256: PACKET_BODY_SHA,
    ...metadata,
  };
  let text = [
    request.REQUEST_START,
    JSON.stringify(payload),
    request.BODY_SEPARATOR,
    body,
    request.REQUEST_END,
  ].join('\n');
  if (crlf) text = text.replace(/\n/g, '\r\n');
  return text;
}

function eventFixture({
  body = requestBody(),
  action = 'created',
  repo = request.FIXED_REPO,
  repoOwner = request.OWNER_LOGIN,
  issueNumber = request.CONTROL_ISSUE,
  issueState = 'open',
  pullRequest = null,
  login = request.OWNER_LOGIN,
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

function fakeDeps({ownerStatus = 'COMPLETE', queueWriteFails = false} = {}) {
  const calls = {checkpointClient: [], record: [], queue: []};
  const stageCheckpoint = {
    FIXED_REPO: request.FIXED_REPO,
    AUDIT_ISSUE: 293,
    MAX_BODY_BYTES: 8192,
    STAGES: [
      'AUTHORITY_SCOPE',
      'IMPLEMENTATION_PR',
      'VALIDATION_MERGE',
      'POSTMERGE_CONVERGENCE',
      'EXPERIMENT_CLOSE',
    ],
    createStageCheckpointClient(options) {
      calls.checkpointClient.push(options);
      return {kind: 'checkpoint-client'};
    },
    async recordCheckpoint(input) {
      calls.record.push(input);
      return {
        status: ownerStatus,
        checkpointId: ownerStatus === 'FAILED' ? null : 'c'.repeat(64),
        packet: {
          issueNumber: PACKET,
          state: ownerStatus === 'PARTIAL'
            ? 'WRITTEN'
            : ownerStatus === 'FAILED' ? 'MISSING' : 'WRITTEN',
          commentId: ownerStatus === 'FAILED' ? null : 9001,
        },
        audit: {
          issueNumber: 293,
          state: ownerStatus === 'PARTIAL'
            ? 'FAILED'
            : ownerStatus === 'FAILED' ? 'MISSING' : 'WRITTEN',
          commentId: ownerStatus === 'COMPLETE' ? 9002 : null,
        },
        reasonCodes: ownerStatus === 'COMPLETE' ? [] : [ownerStatus + '_FIXTURE'],
      };
    },
  };

  function createGitHubClient() {
    return {
      async api(endpoint, options) {
        calls.queue.push({endpoint, options});
        if (queueWriteFails) throw new Error('queue write failed');
        assert.equal(endpoint, '/issues/3469/comments');
        assert.equal(options.method, 'POST');
        return {id: 9100};
      },
    };
  }

  return {deps: {stageCheckpoint, createGitHubClient}, calls};
}

function parserContract() {
  assert.equal(request.FIXED_REPO, 'hanmiyoo10-alt/-');
  assert.equal(request.CONTROL_ISSUE, 3469);
  assert.equal(request.OWNER_LOGIN, 'hanmiyoo10-alt');

  const parsed = request.parseRequestBody(requestBody({crlf: true}), fakeDeps().deps);
  assert.equal(parsed.packetNumber, PACKET);
  assert.equal(parsed.stage, 'IMPLEMENTATION_PR');
  assert.equal(parsed.body, BODY);
  assert.equal(parsed.bodySha256, request.sha256Text(BODY));
  assert.equal(parsed.packetBodySha256, PACKET_BODY_SHA);

  reason(
    () => request.parseRequestBody(requestBody({metadata: {extra: true}}), fakeDeps().deps),
    'REQUEST_METADATA_KEYS_INVALID',
  );
  reason(
    () => request.parseRequestBody(
      requestBody({metadata: {bodySha256: '0'.repeat(64)}}),
      fakeDeps().deps,
    ),
    'REQUEST_BODY_HASH_MISMATCH',
  );
  reason(
    () => request.parseRequestBody(requestBody({metadata: {stage: 'NOPE'}}), fakeDeps().deps),
    'REQUEST_STAGE_INVALID',
  );
  reason(
    () => request.parseRequestBody(requestBody({metadata: {packetNumber: 293}}), fakeDeps().deps),
    'REQUEST_PACKET_INVALID',
  );
  reason(
    () => request.parseRequestBody(
      requestBody({metadata: {packetBodySha256: 'ABC'}}),
      fakeDeps().deps,
    ),
    'REQUEST_PACKET_BODY_HASH_INVALID',
  );
  reason(
    () => request.parseRequestBody('prefix\n' + requestBody(), fakeDeps().deps),
    'REQUEST_EXTRANEOUS_TEXT',
  );
  reason(
    () => request.parseRequestBody(requestBody() + '\n' + request.REQUEST_START, fakeDeps().deps),
    'REQUEST_MARKER_COUNT_INVALID',
  );
  reason(
    () => request.parseRequestBody(
      requestBody().replace(
        request.BODY_SEPARATOR,
        request.BODY_SEPARATOR + '\n' + request.BODY_SEPARATOR,
      ),
      fakeDeps().deps,
    ),
    'REQUEST_BODY_SEPARATOR_INVALID',
  );
}

function eventGuardContract() {
  assert.equal(request.validateEvent(eventFixture()).id, COMMENT_ID);
  reason(() => request.validateEvent(eventFixture({action: 'edited'})), 'EVENT_ACTION_DENIED');
  reason(() => request.validateEvent(eventFixture({repo: 'other/repo'})), 'EVENT_REPOSITORY_DENIED');
  reason(() => request.validateEvent(eventFixture({repoOwner: 'other'})), 'EVENT_REPOSITORY_OWNER_DENIED');
  reason(() => request.validateEvent(eventFixture({issueNumber: 999})), 'EVENT_CONTROL_ISSUE_DENIED');
  reason(() => request.validateEvent(eventFixture({pullRequest: {url: 'x'}})), 'EVENT_PULL_REQUEST_DENIED');
  reason(() => request.validateEvent(eventFixture({issueState: 'closed'})), 'EVENT_CONTROL_ISSUE_NOT_OPEN');
  reason(() => request.validateEvent(eventFixture({login: 'other'})), 'EVENT_ACTOR_DENIED');
  reason(() => request.validateEvent(eventFixture({association: 'MEMBER'})), 'EVENT_ACTOR_ASSOCIATION_DENIED');
  reason(() => request.validateEvent(eventFixture({userType: 'Bot'})), 'EVENT_BOT_DENIED');
  assert.deepEqual(
    request.eventReplyIdentity(eventFixture()),
    {issueNumber: request.CONTROL_ISSUE, commentId: COMMENT_ID},
  );
  assert.equal(request.eventReplyIdentity(eventFixture({issueNumber: 999})), null);
}

async function delegationContract() {
  const fixture = fakeDeps();
  const result = await request.executeEvent({
    event: eventFixture(),
    token: 'token',
    deps: fixture.deps,
  });

  assert.equal(result.disposition, 'REQUEST_ACCEPTED');
  assert.equal(result.owner.status, 'COMPLETE');
  assert.equal(result.queueReceipt.state, 'WRITTEN');
  assert.equal(result.queueReceipt.commentId, 9100);
  assert.equal(request.exitCodeFor(result), 0);

  assert.equal(fixture.calls.checkpointClient.length, 1);
  assert.equal(fixture.calls.checkpointClient[0].token, 'token');
  assert.equal(fixture.calls.checkpointClient[0].repo, request.FIXED_REPO);
  assert.equal(fixture.calls.checkpointClient[0].packetNumber, PACKET);

  assert.equal(fixture.calls.record.length, 1);
  assert.equal(fixture.calls.record[0].packetNumber, PACKET);
  assert.equal(fixture.calls.record[0].stage, 'IMPLEMENTATION_PR');
  assert.equal(fixture.calls.record[0].body, BODY);
  assert.equal(fixture.calls.record[0].expectedPacketBodySha256, PACKET_BODY_SHA);

  assert.equal(fixture.calls.queue.length, 1);
  const resultComment = fixture.calls.queue[0].options.body.body;
  assert.ok(resultComment.includes(request.RESULT_MARKER));
  assert.equal(resultComment.includes(request.REQUEST_START), false);
  assert.equal(resultComment.includes(BODY), false);
}

async function nonGreenPreservationContract() {
  for (const [ownerStatus, expectedExit] of [
    ['PARTIAL', 3],
    ['UNKNOWN', 3],
    ['FAILED', 2],
  ]) {
    const fixture = fakeDeps({ownerStatus});
    const result = await request.executeEvent({
      event: eventFixture(),
      token: 'token',
      deps: fixture.deps,
    });
    assert.equal(result.owner.status, ownerStatus);
    assert.equal(request.exitCodeFor(result), expectedExit);
  }

  const queueFailure = fakeDeps({queueWriteFails: true});
  const result = await request.executeEvent({
    event: eventFixture(),
    token: 'token',
    deps: queueFailure.deps,
  });
  assert.equal(result.owner.status, 'COMPLETE');
  assert.equal(result.queueReceipt.state, 'FAILED');
  assert.ok(result.reasonCodes.includes('QUEUE_RESULT_WRITE_FAILED'));
  assert.equal(request.exitCodeFor(result), 3);
}

async function rejectionContract() {
  const fixture = fakeDeps();
  const badActor = await request.executeEvent({
    event: eventFixture({login: 'other'}),
    token: 'token',
    deps: fixture.deps,
  });
  assert.equal(badActor.disposition, 'REQUEST_REJECTED');
  assert.ok(badActor.reasonCodes.includes('EVENT_ACTOR_DENIED'));
  assert.equal(fixture.calls.record.length, 0);
  assert.equal(fixture.calls.queue.length, 1);
  assert.equal(request.exitCodeFor(badActor), 2);

  const noTokenFixture = fakeDeps();
  const noToken = await request.executeEvent({
    event: eventFixture(),
    token: null,
    deps: noTokenFixture.deps,
  });
  assert.equal(noToken.disposition, 'REQUEST_REJECTED');
  assert.ok(noToken.reasonCodes.includes('ACTIONS_TOKEN_REQUIRED'));
  assert.equal(noTokenFixture.calls.record.length, 0);
  assert.equal(noTokenFixture.calls.queue.length, 0);
  assert.equal(request.exitCodeFor(noToken), 2);
}

function sourceAuthorityCeilingContract() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'stage-checkpoint-request.cjs'), 'utf8');
  for (const forbidden of [
    "require('node:child_process')",
    'workflow_dispatch',
    'merge_pull_request',
    'update_ref',
    'create_commit',
    '/issues/293/comments',
    'checkpointDigest(',
    'checkpointMarker(',
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
  assert.ok(source.includes('stageCheckpoint.recordCheckpoint'));
  assert.ok(source.includes('stageCheckpoint.createStageCheckpointClient'));
  const queueTemplate = '/issues/' + '$' + '{CONTROL_ISSUE}/comments';
  assert.ok(source.includes(queueTemplate));
}

function workflowContract() {
  const workflowPath = path.resolve(
    __dirname, '../../../../workflows/canonical-main-stage-checkpoint-publish.yml');
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  assert.ok(workflow.includes('issue_comment:'));
  assert.ok(workflow.includes('types: [created]'));
  assert.equal(workflow.includes('workflow_dispatch'), false);
  assert.ok(workflow.includes('contents: read'));
  assert.ok(workflow.includes('issues: write'));
  assert.equal(workflow.includes('contents: write'), false);
  assert.equal(workflow.includes('pull-requests: write'), false);
  assert.equal(workflow.includes('actions: write'), false);
  assert.equal(workflow.includes('id-token: write'), false);
  assert.ok(workflow.includes("github.repository == 'hanmiyoo10-alt/-'"));
  assert.ok(workflow.includes('github.event.issue.number == 3469'));
  assert.ok(workflow.includes("github.event.comment.user.login == 'hanmiyoo10-alt'"));
  assert.ok(workflow.includes("github.event.comment.author_association == 'OWNER'"));
  assert.ok(workflow.includes("github.event.comment.user.type != 'Bot'"));
  assert.ok(workflow.includes('ref: main'));
  assert.ok(workflow.includes('persist-credentials: false'));
  assert.ok(workflow.includes('GITHUB_TOKEN: ' + '$' + '{{ github.token }}'));
  assert.ok(workflow.includes('stage-checkpoint-request.cjs'));
  assert.equal(workflow.includes('github.event.comment.body'), false);
}

function manifestContract() {
  const manifestPath = path.resolve(
    __dirname, '../../../../tooling/ci-summary/manifests/plugin-control-plane.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const rows = manifest.checks.filter(
    (row) => row.name === 'work-harness-stage-checkpoint-request-contract');
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].command, [
    'node',
    '.github/plugin-control-plane/canonical-main/work-harness/tests/stage-checkpoint-request-contract.cjs',
  ]);
}

async function main() {
  parserContract();
  eventGuardContract();
  await delegationContract();
  await nonGreenPreservationContract();
  await rejectionContract();
  sourceAuthorityCeilingContract();
  workflowContract();
  manifestContract();
  console.log('stage-checkpoint-request-contract: ok');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});