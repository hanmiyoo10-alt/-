'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const writer = require('../project-projection-writer.cjs');

const HEAD = '3c23e418d9fc2363d1aa6a83e28c97867711fb61';

function packetBody(state = 'IN_PROGRESS') {
  return [
    '<!-- canonical-main-work-packet:v1 -->',
    '',
    '## State',
    `\`${state}\``,
    '',
    '## Interaction stage',
    '- Current stage: `IMPLEMENTATION_PR`',
    '',
  ].join('\n');
}

function opsBody() {
  return [
    '## Canonical Operator Capsule',
    '- STATE: `CLEAR`',
    `- MAIN: \`${HEAD}\` / Required PASS — run 999`,
    '- CHANGE: LOW',
    '- WHY: `NONE`',
    '- NEXT: `NONE`',
    '- AUTHORITY: Production MATCH — release-simcore deadbeef; native protection `ACTIVE` / protected `true`',
    '- UNKNOWN: NONE',
    '',
    '<!-- canonical-main-summary-compat:v1',
    'Convergence: `STABLE`',
    '-->',
  ].join('\n');
}

function schemaRaw() {
  const field = (name, options) => ({
    id: `FIELD_${name.replace(/\s/g, '_')}`,
    name,
    options: options.map((option) => ({id: `OPT_${option.replace(/\s/g, '_')}`, name: option})),
  });
  return {fields: [
    field('Status', ['Todo', 'In Progress', 'Done']),
    field('Priority', ['P0', 'P1', 'P2', 'P3']),
    field('Area', ['Unspecified', 'Termux', 'Mobile Coder Lab', 'PocketRisu', 'Repository Ops']),
    field('Work Type', ['Unspecified', 'Work Packet', 'Anomaly']),
  ]};
}

function normalizedSchema() {
  const result = writer.normalizeProjectSchema(schemaRaw());
  assert.equal(result.ok, true);
  return result.value;
}

function issueRaw(number = 42, overrides = {}) {
  return {
    body: packetBody(),
    state: 'OPEN',
    labels: [{name: 'scope:repo'}],
    title: '[work] fixture',
    number,
    url: `https://github.com/${writer.REPO}/issues/${number}`,
    ...overrides,
  };
}

function itemRaw(number = 42, fields = {}) {
  return {
    id: `PVTI_${number}`,
    content: {
      type: 'Issue',
      number,
      repository: writer.REPO,
      url: `https://github.com/${writer.REPO}/issues/${number}`,
    },
    status: 'In Progress',
    area: 'Repository Ops',
    'work Type': 'Work Packet',
    ...fields,
  };
}

function itemListRaw(items) {
  return {totalCount: items.length, items};
}

function snapshot(overrides = {}) {
  const number = overrides.issueNumber || 42;
  const issue = {
    number,
    url: `https://github.com/${writer.REPO}/issues/${number}`,
    title: '[work] fixture',
    body: packetBody(),
    state: 'open',
    labels: ['scope:repo'],
    ...(overrides.issue || {}),
  };
  const item = {
    id: `PVTI_${number}`,
    issueNumber: number,
    issueUrl: issue.url,
    current: {
      status: 'In Progress',
      priority: null,
      area: 'Repository Ops',
      workType: 'Work Packet',
      ...(overrides.current || {}),
    },
    presence: {
      status: true,
      priority: false,
      area: true,
      workType: true,
      ...(overrides.presence || {}),
    },
  };
  return {
    localHead: HEAD,
    mainSha: HEAD,
    ops: {
      state: 'CLEAR',
      mainSha: HEAD,
      requiredRun: '999',
      convergence: 'STABLE',
      productionMatch: true,
      protectionActive: true,
      unknown: 'NONE',
    },
    project: {
      id: writer.PROJECT_ID,
      title: writer.PROJECT_TITLE,
      number: writer.PROJECT_NUMBER,
      url: writer.PROJECT_URL,
    },
    schema: normalizedSchema(),
    issue,
    item,
  };
}

function evidence(value) {
  return {ok: true, status: 'READY', reasonCodes: [], snapshot: value};
}

function sequence(values) {
  let index = 0;
  return () => {
    assert.ok(index < values.length, 'unexpected evidence read');
    return values[index++];
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertAuthorityFalse(result) {
  for (const key of [
    'projectMutationAuthorized',
    'membershipMutationAuthorized',
    'priorityMutationAuthorized',
    'reverseSyncAuthorized',
    'repositoryMutationAuthorized',
    'issueMutationAuthorized',
    'workflowDispatchAuthorized',
    'schedulerAuthorized',
  ]) assert.equal(result[key], false, key);
}

assert.deepEqual(writer.parseCliArgs(['inspect', '--issue', '42']), {operation: 'inspect', issueNumber: 42});
assert.deepEqual(writer.parseCliArgs(['apply', '--issue', '9']), {operation: 'apply', issueNumber: 9});
for (const args of [
  [],
  ['inspect'],
  ['inspect', '--issue', '0'],
  ['inspect', '--issue', '-1'],
  ['inspect', '--issue', '01'],
  ['inspect', '--issue', 'x'],
  ['apply', '--field', 'Status'],
  ['apply', '--issue', '42', '--field'],
  ['delete', '--issue', '42'],
]) assert.equal(writer.parseCliArgs(args), null);

const ops = writer.parseOpsCapsule(opsBody());
assert.equal(ops.ok, true);
assert.equal(ops.value.mainSha, HEAD);
assert.equal(ops.value.requiredRun, '999');
assert.equal(ops.value.protectionActive, true);
assert.equal(writer.parseOpsCapsule('broken').ok, false);
assert.equal(writer.parseOpsCapsule(opsBody() + '\n## Canonical Operator Capsule\n- STATE: `CLEAR`').ok, false);
assert.equal(writer.parseOpsCapsule('quoted - STATE: `CLEAR`\n' + opsBody()).ok, true);

const identity = writer.normalizeProjectIdentity({
  id: writer.PROJECT_ID,
  title: writer.PROJECT_TITLE,
  number: writer.PROJECT_NUMBER,
  url: writer.PROJECT_URL,
});
assert.equal(identity.ok, true);
assert.equal(writer.normalizeProjectIdentity({...identity.value, id: 'wrong'}).ok, false);

const schema = writer.normalizeProjectSchema(schemaRaw());
assert.equal(schema.ok, true);
const badSchema = schemaRaw();
badSchema.fields.find((field) => field.name === 'Status').options.pop();
assert.equal(writer.normalizeProjectSchema(badSchema).ok, false);
const maxedSchema = schemaRaw();
while (maxedSchema.fields.length < writer.MAX_PROJECT_FIELDS) {
  maxedSchema.fields.push({id: `EXTRA_${maxedSchema.fields.length}`, name: `Extra ${maxedSchema.fields.length}`, options: []});
}
const maxedSchemaResult = writer.normalizeProjectSchema(maxedSchema);
assert.equal(maxedSchemaResult.ok, false);
assert.ok(maxedSchemaResult.reasonCodes.includes('PROJECT_SCHEMA_LIMIT_REACHED'));

const item = writer.normalizeProjectItemList(itemListRaw([itemRaw()]), 42);
assert.equal(item.ok, true);
assert.equal(item.value.current.priority, null);
assert.equal(item.value.presence.priority, false);
assert.equal(item.value.current.workType, 'Work Packet');
assert.equal(writer.normalizeProjectItemList(itemListRaw([itemRaw(), itemRaw()]), 42).ok, false);
assert.equal(writer.normalizeProjectItemList(itemListRaw([]), 42).ok, false);
const truncatedItems = writer.normalizeProjectItemList({totalCount: 2, items: [itemRaw()]}, 42);
assert.equal(truncatedItems.ok, false);
assert.ok(truncatedItems.reasonCodes.includes('PROJECT_ITEMS_TRUNCATED'));
const tooManyItems = writer.normalizeProjectItemList({totalCount: writer.MAX_PROJECT_ITEMS + 1, items: []}, 42);
assert.equal(tooManyItems.ok, false);
assert.ok(tooManyItems.reasonCodes.includes('PROJECT_ITEMS_LIMIT_EXCEEDED'));
const badFieldItem = itemRaw();
badFieldItem.area = 'Unknown Area';
assert.equal(writer.normalizeProjectItemList(itemListRaw([badFieldItem]), 42).ok, false);

const issue = writer.normalizeIssue(issueRaw(), 42);
assert.equal(issue.ok, true);
assert.deepEqual(issue.value.labels, ['scope:repo']);
assert.equal(writer.normalizeIssue(issueRaw(42, {url: 'https://example.invalid'}), 42).ok, false);

const noop = writer.planSnapshot(snapshot());
assert.equal(noop.status, 'NOOP');
assert.equal(noop.selectedField, null);
assertAuthorityFalse(noop);

const attentionNoop = writer.planSnapshot(snapshot({
  issue: {
    body: '[anomaly] fixture without packet marker',
    labels: ['scope:research-product'],
  },
  current: {
    status: 'Todo',
    priority: null,
    area: 'Mobile Coder Lab',
    workType: 'Anomaly',
  },
}));
assert.equal(attentionNoop.status, 'ATTENTION_NOOP');
assert.equal(attentionNoop.plannerDisposition, 'ATTENTION');

const statusReady = writer.planSnapshot(snapshot({current: {status: 'Todo', area: 'Unspecified'}}));
assert.equal(statusReady.status, 'READY_ONE_FIELD');
assert.equal(statusReady.selectedField.field, 'Status');
assert.equal(statusReady.selectedField.desired, 'In Progress');
assert.deepEqual(statusReady.remainingStaleFields.map((row) => row.field), ['Area']);

const attentionReady = writer.planSnapshot(snapshot({
  issue: {
    body: '[anomaly] fixture without packet marker',
    labels: ['scope:research-product'],
  },
  current: {
    status: 'Todo',
    priority: null,
    area: null,
    workType: 'Anomaly',
  },
  presence: {area: false},
}));
assert.equal(attentionReady.status, 'READY_ONE_FIELD');
assert.equal(attentionReady.plannerDisposition, 'ATTENTION');
assert.equal(attentionReady.selectedField.field, 'Area');
assert.equal(attentionReady.selectedField.desired, 'Mobile Coder Lab');

const conflict = writer.planSnapshot(snapshot({
  issue: {labels: ['product:termux', 'scope:repo']},
}));
assert.equal(conflict.status, 'CONFLICT');
assert.equal(conflict.selectedField, null);

const editArgs = writer.buildItemEditArgs(42, {
  key: 'status', field: 'Status', desired: 'In Progress', current: 'Todo',
});
assert.deepEqual(editArgs, [
  'project', 'item-edit', '2',
  '--owner', 'hanmiyoo10-alt',
  '--url', 'https://github.com/hanmiyoo10-alt/-/issues/42',
  '--field', 'Status',
  '--value', 'In Progress',
  '--format', 'json',
]);
assert.equal(writer.buildItemEditArgs(42, {key: 'priority', field: 'Priority', desired: 'P0'}), null);
assert.equal(writer.buildItemEditArgs(42, {key: 'status', field: 'Status', desired: 'Not A Status'}), null);

{
  const first = snapshot({current: {status: 'Todo'}});
  const second = clone(first);
  const third = clone(first);
  third.item.current.status = 'In Progress';
  const events = [];
  const result = writer.applyProjectIssue({
    issueNumber: 42,
    readEvidence: sequence([evidence(first), evidence(second), evidence(third)]),
    mutateField: (selected) => {
      events.push(selected.field);
      return {code: 0};
    },
  });
  assert.equal(result.status, 'UPDATED');
  assert.deepEqual(events, ['Status']);
  assertAuthorityFalse(result);
}

{
  const first = snapshot({current: {status: 'Todo'}});
  const changed = clone(first);
  changed.issue.body += '\nchanged';
  let mutations = 0;
  const result = writer.applyProjectIssue({
    issueNumber: 42,
    readEvidence: sequence([evidence(first), evidence(changed)]),
    mutateField: () => {
      mutations += 1;
      return {code: 0};
    },
  });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.reasonCodes.includes('REPLAN_REQUIRED'));
  assert.equal(mutations, 0);
}

{
  const first = snapshot({current: {status: 'Todo'}});
  const after = clone(first);
  after.item.current.status = 'In Progress';
  const result = writer.applyProjectIssue({
    issueNumber: 42,
    readEvidence: sequence([evidence(first), evidence(clone(first)), evidence(after)]),
    mutateField: () => ({code: 1}),
  });
  assert.equal(result.status, 'UPDATED_ACK_RECOVERED');
}

{
  const first = snapshot({current: {status: 'Todo'}});
  const result = writer.applyProjectIssue({
    issueNumber: 42,
    readEvidence: sequence([evidence(first), evidence(clone(first)), evidence(clone(first))]),
    mutateField: () => ({code: 1}),
  });
  assert.equal(result.status, 'NO_EFFECT');
  assert.equal(result.nextLegalAction, 'RETRY_REQUIRES_FRESH_PLAN');
}

{
  const first = snapshot({current: {status: 'Todo'}});
  const result = writer.applyProjectIssue({
    issueNumber: 42,
    readEvidence: sequence([evidence(first), evidence(clone(first)), evidence(clone(first))]),
    mutateField: () => ({code: 0}),
  });
  assert.equal(result.status, 'UNKNOWN');
  assert.ok(result.reasonCodes.includes('POSTWRITE_SELECTED_FIELD_MISMATCH'));
  assert.equal(result.mutationMayHaveOccurred, true);
}

{
  const first = snapshot({current: {status: 'Todo'}});
  const divergent = clone(first);
  divergent.item.current.status = 'Done';
  const result = writer.applyProjectIssue({
    issueNumber: 42,
    readEvidence: sequence([evidence(first), evidence(clone(first)), evidence(divergent)]),
    mutateField: () => ({code: 1}),
  });
  assert.equal(result.status, 'UNKNOWN');
  assert.ok(result.reasonCodes.includes('POSTWRITE_SELECTED_FIELD_MISMATCH'));
  assert.equal(result.mutationMayHaveOccurred, true);
}

{
  const first = snapshot({current: {status: 'Todo'}});
  const after = clone(first);
  after.item.current.status = 'In Progress';
  after.item.current.priority = 'P0';
  after.item.presence.priority = true;
  const result = writer.applyProjectIssue({
    issueNumber: 42,
    readEvidence: sequence([evidence(first), evidence(clone(first)), evidence(after)]),
    mutateField: () => ({code: 0}),
  });
  assert.equal(result.status, 'UNKNOWN');
  assert.ok(result.reasonCodes.includes('UNTOUCHED_FIELD_DRIFT'));
}

{
  const result = writer.inspectProjectIssue({
    issueNumber: 42,
    readEvidence: () => ({ok: false, status: 'BLOCKED', reasonCodes: ['TARGET_MEMBERSHIP_COUNT_INVALID']}),
  });
  assert.equal(result.status, 'BLOCKED');
  assertAuthorityFalse(result);
}

{
  const projectView = {
    id: writer.PROJECT_ID,
    title: writer.PROJECT_TITLE,
    number: writer.PROJECT_NUMBER,
    url: writer.PROJECT_URL,
  };
  const issueView = issueRaw();
  const itemList = itemListRaw([itemRaw()]);
  const calls = [];
  let itemListOptions = null;
  const fakeRunner = (command, args, options = {}) => {
    calls.push([command, ...args]);
    if (command === 'git' && args.includes('rev-parse')) return {code: 0, stdout: HEAD + '\n'};
    if (command === 'git' && args.includes('status')) return {code: 0, stdout: ''};
    if (command === 'gh' && args[0] === 'api') return {code: 0, stdout: HEAD + '\n'};
    if (command === 'gh' && args[0] === 'issue' && args[2] === '485') {
      return {code: 0, stdout: JSON.stringify({
        body: opsBody(),
        state: 'OPEN',
        number: writer.OPS_ISSUE,
        url: `https://github.com/${writer.REPO}/issues/${writer.OPS_ISSUE}`,
      })};
    }
    if (command === 'gh' && args[0] === 'project' && args[1] === 'view') {
      return {code: 0, stdout: JSON.stringify(projectView)};
    }
    if (command === 'gh' && args[0] === 'project' && args[1] === 'field-list') {
      return {code: 0, stdout: JSON.stringify(schemaRaw())};
    }
    if (command === 'gh' && args[0] === 'issue' && args[2] === '42') {
      return {code: 0, stdout: JSON.stringify(issueView)};
    }
    if (command === 'gh' && args[0] === 'project' && args[1] === 'item-list') {
      itemListOptions = options;
      return {code: 0, stdout: JSON.stringify(itemList)};
    }
    return {code: 1, stdout: ''};
  };
  const read = writer.readEvidenceDefault(42, fakeRunner);
  assert.equal(read.ok, true);
  assert.equal(read.snapshot.mainSha, HEAD);
  assert.equal(read.snapshot.item.current.priority, null);
  assert.equal(read.snapshot.item.presence.priority, false);
  assert.equal(calls.some((args) => args.includes('item-edit')), false);
  assert.equal(calls.some((args) => args.includes('item-add')), false);
  const itemListCall = calls.find((args) => args[0] === 'gh' && args[1] === 'project' && args[2] === 'item-list');
  assert.ok(itemListCall);
  assert.ok(itemListCall.includes(String(writer.MAX_PROJECT_ITEMS)));
  assert.ok(itemListCall.includes('--jq'));
  assert.ok(itemListCall.includes(writer.PROJECT_ITEM_JQ));
  assert.equal(itemListCall.includes('--field'), false);
  assert.equal(itemListOptions.maxBuffer, writer.MAX_PROJECT_ITEM_OUTPUT_BYTES);
  const fieldListCall = calls.find((args) => args[0] === 'gh' && args[1] === 'project' && args[2] === 'field-list');
  assert.ok(fieldListCall);
  assert.ok(fieldListCall.includes(String(writer.MAX_PROJECT_FIELDS)));
  const mainReads = calls.filter((args) => args[0] === 'gh' && args[1] === 'api');
  assert.equal(mainReads.length, 2);
}

{
  const fakeRunner = (command, args) => {
    if (command === 'git' && args.includes('rev-parse')) return {code: 0, stdout: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n'};
    if (command === 'git' && args.includes('status')) return {code: 0, stdout: ''};
    if (command === 'gh' && args[0] === 'api') return {code: 0, stdout: HEAD + '\n'};
    return {code: 1, stdout: ''};
  };
  const read = writer.readEvidenceDefault(42, fakeRunner);
  assert.equal(read.ok, false);
  assert.equal(read.status, 'BLOCKED');
  assert.ok(read.reasonCodes.includes('LOCAL_SOURCE_NOT_CURRENT'));
}

{
  const calls = [];
  const fakeRunner = (command, args) => {
    calls.push([command, ...args]);
    if (command === 'git' && args.includes('rev-parse')) return {code: 0, stdout: HEAD + '\n'};
    if (command === 'git' && args.includes('status')) {
      return {code: 0, stdout: ' M .github/plugin-control-plane/canonical-main/work-system/policy.json\n'};
    }
    return {code: 1, stdout: ''};
  };
  const read = writer.readEvidenceDefault(42, fakeRunner);
  assert.equal(read.ok, false);
  assert.equal(read.status, 'BLOCKED');
  assert.ok(read.reasonCodes.includes('LOCAL_SOURCE_DIRTY'));
  const statusCall = calls.find((args) => args[0] === 'git' && args.includes('status'));
  assert.ok(statusCall.includes('.github/plugin-control-plane/canonical-main/work-system/'));
}

function completeReadRunner({
  opsState = 'OPEN',
  finalMain = HEAD,
  finalOpsBody = null,
  finalIssueBody = null,
} = {}) {
  let apiReads = 0;
  let opsReads = 0;
  let issueReads = 0;
  const projectView = {
    id: writer.PROJECT_ID,
    title: writer.PROJECT_TITLE,
    number: writer.PROJECT_NUMBER,
    url: writer.PROJECT_URL,
  };
  return (command, args) => {
    if (command === 'git' && args.includes('rev-parse')) return {code: 0, stdout: HEAD + '\n'};
    if (command === 'git' && args.includes('status')) return {code: 0, stdout: ''};
    if (command === 'gh' && args[0] === 'api') {
      apiReads += 1;
      return {code: 0, stdout: (apiReads === 1 ? HEAD : finalMain) + '\n'};
    }
    if (command === 'gh' && args[0] === 'issue' && args[2] === '485') {
      opsReads += 1;
      return {code: 0, stdout: JSON.stringify({
        body: opsReads === 1 || finalOpsBody === null ? opsBody() : finalOpsBody,
        state: opsState,
        number: writer.OPS_ISSUE,
        url: `https://github.com/${writer.REPO}/issues/${writer.OPS_ISSUE}`,
      })};
    }
    if (command === 'gh' && args[0] === 'project' && args[1] === 'view') {
      return {code: 0, stdout: JSON.stringify(projectView)};
    }
    if (command === 'gh' && args[0] === 'project' && args[1] === 'field-list') {
      return {code: 0, stdout: JSON.stringify(schemaRaw())};
    }
    if (command === 'gh' && args[0] === 'issue' && args[2] === '42') {
      issueReads += 1;
      return {code: 0, stdout: JSON.stringify(issueRaw(42, {
        body: issueReads === 1 || finalIssueBody === null ? packetBody() : finalIssueBody,
      }))};
    }
    if (command === 'gh' && args[0] === 'project' && args[1] === 'item-list') {
      return {code: 0, stdout: JSON.stringify(itemListRaw([itemRaw()]))};
    }
    return {code: 1, stdout: ''};
  };
}

{
  const read = writer.readEvidenceDefault(42, completeReadRunner({opsState: 'CLOSED'}));
  assert.equal(read.ok, false);
  assert.equal(read.status, 'BLOCKED');
  assert.ok(read.reasonCodes.includes('OPS_ISSUE_INVALID'));
}

{
  const read = writer.readEvidenceDefault(42, completeReadRunner({
    finalOpsBody: opsBody().replace('- STATE: `CLEAR`', '- STATE: `ATTENTION`'),
  }));
  assert.equal(read.ok, false);
  assert.equal(read.status, 'BLOCKED');
  assert.ok(read.reasonCodes.includes('OPS_CHANGED_DURING_BARRIER'));
}

{
  const read = writer.readEvidenceDefault(42, completeReadRunner({
    finalIssueBody: packetBody() + '\nchanged',
  }));
  assert.equal(read.ok, false);
  assert.equal(read.status, 'BLOCKED');
  assert.ok(read.reasonCodes.includes('TARGET_ISSUE_CHANGED_DURING_BARRIER'));
}

{
  const read = writer.readEvidenceDefault(42, completeReadRunner({
    finalMain: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  }));
  assert.equal(read.ok, false);
  assert.equal(read.status, 'BLOCKED');
  assert.ok(read.reasonCodes.includes('MAIN_CHANGED_DURING_BARRIER'));
}

const source = fs.readFileSync(path.resolve(__dirname, '../project-projection-writer.cjs'), 'utf8');
assert.match(source, /require\('\.\/project-projection\.cjs'\)/);
assert.match(source, /spawnSync/);
assert.match(source, /shell: false/);
assert.equal(source.includes('project item-add'), false);
assert.equal(source.includes("'item-add'"), false);
assert.equal(source.includes("'item-delete'"), false);
assert.equal(source.includes("'item-archive'"), false);
assert.equal(source.includes('graphql'), false);
assert.equal(source.includes('auth token'), false);
assert.equal(source.includes('GH_TOKEN'), false);
assert.equal(source.includes('GITHUB_TOKEN'), false);
assert.equal((source.match(/'item-edit'/g) || []).length, 1);

for (const status of ['UPDATED', 'UPDATED_ACK_RECOVERED', 'NOOP', 'ATTENTION_NOOP', 'READY_ONE_FIELD']) {
  assert.equal(writer.exitCodeFor({status}), 0);
}
for (const status of ['BLOCKED', 'NO_EFFECT']) assert.equal(writer.exitCodeFor({status}), 2);
for (const status of ['UNKNOWN', 'CONFLICT']) assert.equal(writer.exitCodeFor({status}), 3);

console.log('project projection writer contract: PASS');
