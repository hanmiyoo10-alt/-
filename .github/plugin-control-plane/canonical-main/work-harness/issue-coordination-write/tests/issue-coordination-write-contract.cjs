'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const owner = require('../issue-coordination-write-admission.cjs');

const FALSE_AUTHORITY_KEYS = [
  'mutationAuthorized',
  'repositoryMutationAuthorized',
  'mergeAuthorized',
  'workflowAuthorized',
  'releaseAuthorized',
  'productionAuthorized',
  'runtimeAuthorized',
  'adminAuthorized',
  'securityMutationAuthorized',
];

function request({
  issueNumber = 100,
  kind = 'ISSUE',
  surface = 'ORDINARY_ISSUE',
  type = 'COMMENT',
  body = 'bounded comment',
} = {}) {
  const operation = {type};
  if (type === 'COMMENT') operation.body = body;
  return {
    schemaVersion: 1,
    target: {issueNumber, kind, surface},
    operation,
  };
}

function allAuthoritiesFalse(result) {
  for (const key of FALSE_AUTHORITY_KEYS) assert.equal(result[key], false, key);
}

function hasReason(result, reason) {
  assert.ok(result.reasonCodes.includes(reason), JSON.stringify(result));
}

function test(name, fn) {
  try {
    fn();
    process.stdout.write('ok - ' + name + '\n');
  } catch (error) {
    process.stderr.write('not ok - ' + name + '\n');
    throw error;
  }
}

test('ordinary comment admission is confirmation-gated and non-authorizing', () => {
  const result = owner.classifyIssueCoordinationWrite(request());
  assert.equal(result.profile, 'issue_coordination_write');
  assert.equal(result.disposition, 'ADMIT_CONNECTOR_ISSUE_COMMENT');
  assert.equal(result.ownerRoute, 'GITHUB_CONNECTOR_ADD_COMMENT_TO_ISSUE');
  assert.equal(result.confirmationRequired, true);
  assert.equal(result.postEffectReadbackRequired, true);
  assert.equal(result.idempotencyClaimed, false);
  hasReason(result, 'COMMENT_ADMISSION_READY');
  allAuthoritiesFalse(result);
});

test('comment body accepts the exact 8192-byte bound', () => {
  const result = owner.classifyIssueCoordinationWrite(request({body: 'a'.repeat(8192)}));
  assert.equal(result.disposition, 'ADMIT_CONNECTOR_ISSUE_COMMENT');
});

test('comment body rejects empty, NUL, oversized, and unpaired surrogate text', () => {
  const cases = [
    ['', 'COMMENT_BODY_EMPTY'],
    ['   \n', 'COMMENT_BODY_EMPTY'],
    ['a\u0000b', 'COMMENT_BODY_NUL_FORBIDDEN'],
    ['a'.repeat(8193), 'COMMENT_BODY_TOO_LARGE'],
    ['\uD800', 'COMMENT_BODY_UTF8_INVALID'],
  ];
  for (const [body, reason] of cases) {
    const result = owner.classifyIssueCoordinationWrite(request({body}));
    assert.equal(result.disposition, 'UNKNOWN');
    hasReason(result, reason);
    allAuthoritiesFalse(result);
  }
});

test('request and nested unknown fields fail closed', () => {
  const top = request();
  top.extra = true;
  hasReason(owner.classifyIssueCoordinationWrite(top), 'REQUEST_FIELDS_INVALID');

  const target = request();
  target.target.extra = true;
  hasReason(owner.classifyIssueCoordinationWrite(target), 'TARGET_FIELDS_INVALID');

  const operation = request();
  operation.operation.extra = true;
  hasReason(owner.classifyIssueCoordinationWrite(operation), 'OPERATION_FIELDS_INVALID');
});

test('pull request targets are rejected to the future PR profile', () => {
  const result = owner.classifyIssueCoordinationWrite(request({kind: 'PULL_REQUEST'}));
  assert.equal(result.disposition, 'REJECT_PR_SURFACE');
  assert.equal(result.ownerRoute, 'FUTURE_PR_COLLABORATION_WRITE');
  hasReason(result, 'PR_SURFACE_FORBIDDEN');
  allAuthoritiesFalse(result);
});

test('canonical work packet body update routes to body-CAS owner', () => {
  const result = owner.classifyIssueCoordinationWrite(request({
    surface: 'CANONICAL_WORK_PACKET',
    type: 'BODY_UPDATE',
  }));
  assert.equal(result.disposition, 'ROUTE_SPECIALIZED_OWNER');
  assert.equal(result.ownerRoute, 'CANONICAL_COORDINATION_BODY_PATCH');
  assert.equal(result.confirmationRequired, true);
  assert.equal(result.postEffectReadbackRequired, true);
  allAuthoritiesFalse(result);
});

test('canonical work packet checkpoint routes to stage-checkpoint owner', () => {
  const result = owner.classifyIssueCoordinationWrite(request({
    surface: 'CANONICAL_WORK_PACKET',
    type: 'STAGE_CHECKPOINT',
  }));
  assert.equal(result.disposition, 'ROUTE_SPECIALIZED_OWNER');
  assert.equal(result.ownerRoute, 'CANONICAL_STAGE_CHECKPOINT');
  allAuthoritiesFalse(result);
});

test('terminal packet close-sync routes to closure owner', () => {
  const result = owner.classifyIssueCoordinationWrite(request({
    surface: 'CANONICAL_WORK_PACKET',
    type: 'TERMINAL_CLOSE_SYNC',
  }));
  assert.equal(result.disposition, 'ROUTE_SPECIALIZED_OWNER');
  assert.equal(result.ownerRoute, 'CANONICAL_PACKET_CLOSURE_OWNER');
  allAuthoritiesFalse(result);
});

test('work queue body update is bound to issue 465', () => {
  const pass = owner.classifyIssueCoordinationWrite(request({
    issueNumber: 465,
    surface: 'CANONICAL_WORK_QUEUE',
    type: 'BODY_UPDATE',
  }));
  assert.equal(pass.disposition, 'ROUTE_SPECIALIZED_OWNER');
  assert.equal(pass.ownerRoute, 'CANONICAL_COORDINATION_BODY_PATCH');

  const conflict = owner.classifyIssueCoordinationWrite(request({
    issueNumber: 466,
    surface: 'CANONICAL_WORK_QUEUE',
    type: 'BODY_UPDATE',
  }));
  assert.equal(conflict.disposition, 'CONFLICT');
  hasReason(conflict, 'WORK_QUEUE_IDENTITY_CONFLICT');
});

test('audit checkpoint is bound to issue 293 and its specialized owner', () => {
  const pass = owner.classifyIssueCoordinationWrite(request({
    issueNumber: 293,
    surface: 'CANONICAL_AUDIT',
    type: 'STAGE_CHECKPOINT',
  }));
  assert.equal(pass.disposition, 'ROUTE_SPECIALIZED_OWNER');
  assert.equal(pass.ownerRoute, 'CANONICAL_STAGE_CHECKPOINT_AUDIT');

  const conflict = owner.classifyIssueCoordinationWrite(request({
    issueNumber: 294,
    surface: 'CANONICAL_AUDIT',
    type: 'STAGE_CHECKPOINT',
  }));
  assert.equal(conflict.disposition, 'CONFLICT');
  hasReason(conflict, 'AUDIT_IDENTITY_CONFLICT');
});

test('ordinary classification cannot disguise queue or audit identities', () => {
  for (const issueNumber of [293, 465]) {
    const result = owner.classifyIssueCoordinationWrite(request({issueNumber}));
    assert.equal(result.disposition, 'CONFLICT');
    hasReason(result, 'RESERVED_ISSUE_SURFACE_CONFLICT');
  }
});

test('unclassified canonical surfaces fail closed to specialized-owner-required', () => {
  const packetComment = owner.classifyIssueCoordinationWrite(request({
    surface: 'CANONICAL_WORK_PACKET',
    type: 'COMMENT',
  }));
  assert.equal(packetComment.disposition, 'UNKNOWN');
  hasReason(packetComment, 'SPECIALIZED_OWNER_REQUIRED');

  const reserved = owner.classifyIssueCoordinationWrite(request({
    surface: 'CANONICAL_RESERVED',
    type: 'COMMENT',
  }));
  assert.equal(reserved.disposition, 'UNKNOWN');
  hasReason(reserved, 'SPECIALIZED_OWNER_REQUIRED');
});

test('suggestion-eligible ordinary mutations defer to suggestion-write lane', () => {
  for (const type of ['CLOSE', 'LABEL_ADD', 'ASSIGNEE_ADD']) {
    const result = owner.classifyIssueCoordinationWrite(request({type}));
    assert.equal(result.disposition, 'REJECT_UNSUPPORTED_EFFECT');
    hasReason(result, 'DEFER_TO_ISSUE_COORDINATION_SUGGESTION_WRITE');
    allAuthoritiesFalse(result);
  }
});

test('CAS-dependent ordinary mutations preserve provider limitation', () => {
  for (const type of [
    'BODY_UPDATE',
    'TITLE_UPDATE',
    'REOPEN',
    'LABEL_REMOVE',
    'LABEL_REPLACE',
    'ASSIGNEE_REMOVE',
    'ASSIGNEE_REPLACE',
    'MILESTONE_UPDATE',
  ]) {
    const result = owner.classifyIssueCoordinationWrite(request({type}));
    assert.equal(result.disposition, 'REJECT_UNSUPPORTED_EFFECT');
    hasReason(result, 'PROVIDER_ATOMIC_CONDITIONAL_WRITE_UNAVAILABLE');
    allAuthoritiesFalse(result);
  }
});

test('issue creation defers to separate idempotency design', () => {
  const result = owner.classifyIssueCoordinationWrite(request({type: 'ISSUE_CREATE'}));
  assert.equal(result.disposition, 'REJECT_UNSUPPORTED_EFFECT');
  hasReason(result, 'DEFER_TO_ISSUE_CREATION_IDEMPOTENCY_DESIGN');
  allAuthoritiesFalse(result);
});

test('specialized operations on ordinary issue surface conflict', () => {
  for (const type of ['STAGE_CHECKPOINT', 'TERMINAL_CLOSE_SYNC']) {
    const result = owner.classifyIssueCoordinationWrite(request({type}));
    assert.equal(result.disposition, 'CONFLICT');
    hasReason(result, 'SPECIALIZED_OPERATION_SURFACE_CONFLICT');
    allAuthoritiesFalse(result);
  }
});

test('all finite dispositions preserve false authority flags', () => {
  const samples = [
    request(),
    request({kind: 'PULL_REQUEST'}),
    request({surface: 'CANONICAL_WORK_PACKET', type: 'BODY_UPDATE'}),
    request({type: 'BODY_UPDATE'}),
    request({surface: 'CANONICAL_RESERVED'}),
    request({issueNumber: 465}),
  ];
  for (const sample of samples) {
    const result = owner.classifyIssueCoordinationWrite(sample);
    assert.ok(owner.DISPOSITIONS.includes(result.disposition));
    allAuthoritiesFalse(result);
  }
});

test('implementation source contains no network, process, filesystem, or mutation primitive', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'issue-coordination-write-admission.cjs'),
    'utf8',
  );
  const forbidden = [
    /require\s*\(/,
    /node:fs/,
    /child_process/,
    /\bfetch\s*\(/,
    /https?:\/\//,
    /\bgraphql\b/i,
    /\bspawn(?:Sync)?\b/,
    /\bexec(?:File|FileSync|Sync)?\b/,
    /\bwriteFile(?:Sync)?\b/,
    /\bappendFile(?:Sync)?\b/,
    /\.api\s*\(/,
  ];
  for (const pattern of forbidden) {
    assert.equal(pattern.test(source), false, String(pattern));
  }
});

process.stdout.write('issue-coordination-write contract: PASS\n');
