'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const childProcess = require('node:child_process');
const {planProjectFields} = require('./project-projection.cjs');

const ROOT = path.resolve(__dirname, '../..');
const REPO = 'hanmiyoo10-alt/-';
const PROJECT_OWNER = 'hanmiyoo10-alt';
const PROJECT_NUMBER = 2;
const PROJECT_ID = 'PVT_kwHOD4qAmM4Bmlhz';
const PROJECT_TITLE = 'Canonical Main Operations';
const PROJECT_URL = 'https://github.com/users/hanmiyoo10-alt/projects/2';
const OPS_ISSUE = 485;
const MODE = 'GITHUB_PROJECT_PLANNING_PROJECTION_WRITER';
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const MAX_PROJECT_ITEMS = 10000;
const MAX_PROJECT_FIELDS = 1000;
const MAX_PROJECT_ITEM_OUTPUT_BYTES = 32 * 1024 * 1024;
const PROJECT_ITEM_JQ = '{totalCount,items:[.items[]|{id:.id,content:{type:.content.type,number:.content.number,repository:.content.repository,url:.content.url},status:.status,priority:.priority,area:.area,"work Type":.["work Type"]}]}';

const FIELD_ORDER = Object.freeze([
  Object.freeze({key: 'status', display: 'Status'}),
  Object.freeze({key: 'area', display: 'Area'}),
  Object.freeze({key: 'workType', display: 'Work Type'}),
]);

const FIELD_SCHEMA = Object.freeze({
  Status: Object.freeze(['Todo', 'In Progress', 'Done']),
  Priority: Object.freeze(['P0', 'P1', 'P2', 'P3']),
  Area: Object.freeze(['Unspecified', 'Termux', 'Mobile Coder Lab', 'PocketRisu', 'Repository Ops']),
  'Work Type': Object.freeze(['Unspecified', 'Work Packet', 'Anomaly']),
});

const ITEM_KEYS = Object.freeze({
  status: 'status',
  priority: 'priority',
  area: 'area',
  workType: 'work Type',
});

const AUTHORITY_FALSE = Object.freeze({
  projectMutationAuthorized: false,
  membershipMutationAuthorized: false,
  priorityMutationAuthorized: false,
  reverseSyncAuthorized: false,
  repositoryMutationAuthorized: false,
  issueMutationAuthorized: false,
  workflowDispatchAuthorized: false,
  schedulerAuthorized: false,
});

function output(status, reasonCodes = [], extras = {}) {
  return {
    schemaVersion: 1,
    mode: MODE,
    status,
    reasonCodes: [...new Set(reasonCodes)].sort(),
    ...extras,
    ...AUTHORITY_FALSE,
  };
}

function safeJson(text) {
  try {
    return {ok: true, value: JSON.parse(String(text || ''))};
  } catch {
    return {ok: false, value: null};
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function deterministic(value) {
  if (Array.isArray(value)) return value.map(deterministic);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, deterministic(value[key])]));
}

function digest(value) {
  return sha256(JSON.stringify(deterministic(value)));
}

function defaultRunner(command, args, {cwd = ROOT, maxBuffer = MAX_OUTPUT_BYTES} = {}) {
  const result = childProcess.spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    env: process.env,
    maxBuffer,
  });
  return {
    code: Number.isInteger(result.status) ? result.status : 1,
    stdout: result.stdout || '',
  };
}

function parseCliArgs(argv = process.argv.slice(2)) {
  if (!Array.isArray(argv) || argv.length !== 3) return null;
  const [operation, flag, rawIssue] = argv;
  if (!['inspect', 'apply'].includes(operation) || flag !== '--issue') return null;
  if (!/^[1-9][0-9]*$/.test(rawIssue || '')) return null;
  const issueNumber = Number(rawIssue);
  if (!Number.isSafeInteger(issueNumber)) return null;
  return {operation, issueNumber};
}

function singleMatch(text, pattern) {
  const matches = [...String(text).matchAll(pattern)];
  return matches.length === 1 ? matches[0] : null;
}

function parseOpsCapsule(body) {
  const text = String(body || '');
  const headingMatches = [...text.matchAll(/^## Canonical Operator Capsule$/gm)];
  if (headingMatches.length !== 1) {
    return {ok: false, reasonCodes: ['OPS_CAPSULE_INVALID']};
  }
  const start = headingMatches[0].index + headingMatches[0][0].length;
  const after = text.slice(start);
  const boundaries = [
    after.indexOf('\n<!-- canonical-main-summary-compat:v1'),
    after.indexOf('\n<details>'),
    after.search(/\n## /),
  ].filter((value) => value >= 0);
  const capsule = after.slice(0, boundaries.length ? Math.min(...boundaries) : after.length);

  const state = singleMatch(capsule, /^- STATE: `([^\`]+)`$/gm);
  const main = singleMatch(capsule, /^- MAIN: `([0-9a-f]{40})` \/ Required PASS[^\n]*run ([1-9][0-9]*)$/gm);
  const unknown = singleMatch(capsule, /^- UNKNOWN: ([^\n]+)$/gm);
  const authority = singleMatch(capsule, /^- AUTHORITY: ([^\n]+)$/gm);
  const summaryMarkerMatches = [...text.matchAll(/^<!-- canonical-main-summary-compat:v1$/gm)];
  const convergence = singleMatch(text, /^Convergence: `([^\`]+)`$/gm);
  if (!state || !main || !unknown || !authority
      || summaryMarkerMatches.length !== 1 || !convergence) {
    return {ok: false, reasonCodes: ['OPS_CAPSULE_INVALID']};
  }

  const result = {
    state: state[1],
    mainSha: main[1],
    requiredRun: main[2],
    convergence: convergence[1],
    productionMatch: authority[1].includes('Production MATCH'),
    protectionActive: authority[1].includes('native protection `ACTIVE` / protected `true`'),
    unknown: unknown[1].trim(),
  };
  const ready = result.state === 'CLEAR'
    && result.convergence === 'STABLE'
    && result.productionMatch
    && result.protectionActive
    && result.unknown === 'NONE';
  return ready
    ? {ok: true, value: result, reasonCodes: []}
    : {ok: false, value: result, reasonCodes: ['OPS_NOT_READY']};
}

function sameStringSet(actual, expected) {
  if (!Array.isArray(actual)) return false;
  const a = [...actual].sort();
  const e = [...expected].sort();
  return a.length === e.length && a.every((value, index) => value === e[index]);
}

function normalizeProjectIdentity(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {ok: false, reasonCodes: ['PROJECT_IDENTITY_INVALID']};
  }
  const valid = raw.id === PROJECT_ID
    && raw.title === PROJECT_TITLE
    && Number(raw.number) === PROJECT_NUMBER
    && raw.url === PROJECT_URL;
  return valid
    ? {ok: true, value: {id: raw.id, title: raw.title, number: Number(raw.number), url: raw.url}, reasonCodes: []}
    : {ok: false, reasonCodes: ['PROJECT_IDENTITY_MISMATCH']};
}

function normalizeProjectSchema(raw) {
  if (!raw || !Array.isArray(raw.fields)) {
    return {ok: false, reasonCodes: ['PROJECT_SCHEMA_INVALID']};
  }
  if (raw.fields.length >= MAX_PROJECT_FIELDS) {
    return {ok: false, reasonCodes: ['PROJECT_SCHEMA_LIMIT_REACHED']};
  }
  const normalized = {};
  for (const [name, expectedOptions] of Object.entries(FIELD_SCHEMA)) {
    const matches = raw.fields.filter((field) => field && field.name === name);
    if (matches.length !== 1) {
      return {ok: false, reasonCodes: ['PROJECT_SCHEMA_FIELD_COUNT_INVALID']};
    }
    const field = matches[0];
    if (typeof field.id !== 'string' || !field.id) {
      return {ok: false, reasonCodes: ['PROJECT_SCHEMA_FIELD_ID_INVALID']};
    }
    if (!Array.isArray(field.options)) {
      return {ok: false, reasonCodes: ['PROJECT_SCHEMA_OPTIONS_INVALID']};
    }
    const options = [];
    for (const option of field.options) {
      if (!option || typeof option.id !== 'string' || !option.id
          || typeof option.name !== 'string' || !option.name) {
        return {ok: false, reasonCodes: ['PROJECT_SCHEMA_OPTION_INVALID']};
      }
      options.push({id: option.id, name: option.name});
    }
    if (!sameStringSet(options.map((option) => option.name), expectedOptions)) {
      return {ok: false, reasonCodes: ['PROJECT_SCHEMA_OPTION_SET_MISMATCH']};
    }
    normalized[name] = {
      id: field.id,
      options: options.sort((a, b) => a.name.localeCompare(b.name)),
    };
  }
  return {ok: true, value: normalized, reasonCodes: []};
}

function normalizeIssue(raw, issueNumber) {
  const expectedUrl = `https://github.com/${REPO}/issues/${issueNumber}`;
  if (!raw || Number(raw.number) !== issueNumber || raw.url !== expectedUrl
      || typeof raw.body !== 'string' || typeof raw.title !== 'string'
      || !['OPEN', 'CLOSED'].includes(raw.state) || !Array.isArray(raw.labels)) {
    return {ok: false, reasonCodes: ['TARGET_ISSUE_INVALID']};
  }
  const labels = [];
  for (const label of raw.labels) {
    if (!label || typeof label.name !== 'string' || !label.name.trim()) {
      return {ok: false, reasonCodes: ['TARGET_ISSUE_LABEL_INVALID']};
    }
    labels.push(label.name);
  }
  if (new Set(labels).size !== labels.length) {
    return {ok: false, reasonCodes: ['TARGET_ISSUE_LABEL_DUPLICATE']};
  }
  return {
    ok: true,
    value: {
      number: issueNumber,
      url: expectedUrl,
      title: raw.title,
      body: raw.body,
      state: raw.state.toLowerCase(),
      labels: labels.sort(),
    },
    reasonCodes: [],
  };
}

function itemField(item, key, allowedValues) {
  const present = Object.hasOwn(item, key) && item[key] !== null;
  if (!present) return {ok: true, present: false, value: null};
  if (typeof item[key] !== 'string' || !allowedValues.includes(item[key])) {
    return {ok: false, present: true, value: null};
  }
  return {ok: true, present: true, value: item[key]};
}

function normalizeProjectItemList(raw, issueNumber) {
  if (!raw || !Array.isArray(raw.items) || !Number.isSafeInteger(raw.totalCount) || raw.totalCount < 0) {
    return {ok: false, reasonCodes: ['PROJECT_ITEMS_INVALID']};
  }
  if (raw.totalCount > MAX_PROJECT_ITEMS) {
    return {ok: false, reasonCodes: ['PROJECT_ITEMS_LIMIT_EXCEEDED']};
  }
  if (raw.items.length !== raw.totalCount) {
    return {ok: false, reasonCodes: ['PROJECT_ITEMS_TRUNCATED']};
  }
  const expectedUrl = `https://github.com/${REPO}/issues/${issueNumber}`;
  const matches = raw.items.filter((item) => item?.content?.type === 'Issue'
    && item.content.number === issueNumber
    && item.content.repository === REPO
    && item.content.url === expectedUrl);
  if (matches.length !== 1) {
    return {ok: false, reasonCodes: ['TARGET_MEMBERSHIP_COUNT_INVALID']};
  }
  const item = matches[0];
  if (typeof item.id !== 'string' || !item.id) {
    return {ok: false, reasonCodes: ['PROJECT_ITEM_ID_INVALID']};
  }
  const status = itemField(item, ITEM_KEYS.status, FIELD_SCHEMA.Status);
  const priority = itemField(item, ITEM_KEYS.priority, FIELD_SCHEMA.Priority);
  const area = itemField(item, ITEM_KEYS.area, FIELD_SCHEMA.Area);
  const workType = itemField(item, ITEM_KEYS.workType, FIELD_SCHEMA['Work Type']);
  if (![status, priority, area, workType].every((field) => field.ok)) {
    return {ok: false, reasonCodes: ['PROJECT_ITEM_FIELD_INVALID']};
  }
  return {
    ok: true,
    value: {
      id: item.id,
      issueNumber,
      issueUrl: expectedUrl,
      current: {
        status: status.value,
        priority: priority.value,
        area: area.value,
        workType: workType.value,
      },
      presence: {
        status: status.present,
        priority: priority.present,
        area: area.present,
        workType: workType.present,
      },
    },
    reasonCodes: [],
  };
}

function runResult(runner, command, args, options = {}) {
  const result = runner(command, args, {cwd: ROOT, ...options});
  if (!result || !Number.isInteger(result.code) || typeof result.stdout !== 'string') {
    return {ok: false, reasonCodes: ['RUNNER_RESULT_INVALID']};
  }
  return result.code === 0
    ? {ok: true, stdout: result.stdout, reasonCodes: []}
    : {ok: false, reasonCodes: ['READ_COMMAND_FAILED']};
}

function runJson(runner, command, args, options = {}) {
  const result = runResult(runner, command, args, options);
  if (!result.ok) return result;
  const parsed = safeJson(result.stdout);
  return parsed.ok
    ? {ok: true, value: parsed.value, reasonCodes: []}
    : {ok: false, reasonCodes: ['READ_JSON_INVALID']};
}

function readEvidenceDefault(issueNumber, runner = defaultRunner) {
  const localHeadRead = runResult(runner, 'git', ['-C', ROOT, 'rev-parse', 'HEAD']);
  if (!localHeadRead.ok) return {ok: false, status: 'UNKNOWN', reasonCodes: localHeadRead.reasonCodes};
  const localHead = localHeadRead.stdout.trim();
  if (!/^[0-9a-f]{40}$/.test(localHead)) {
    return {ok: false, status: 'UNKNOWN', reasonCodes: ['LOCAL_HEAD_INVALID']};
  }

  const dirtyRead = runResult(runner, 'git', [
    '-C', ROOT, 'status', '--porcelain=v1', '--untracked-files=all', '--',
    '.github/plugin-control-plane/project-projection-writer.cjs',
    '.github/plugin-control-plane/project-projection.cjs',
    '.github/plugin-control-plane/canonical-main/work-system/',
  ]);
  if (!dirtyRead.ok) return {ok: false, status: 'UNKNOWN', reasonCodes: dirtyRead.reasonCodes};
  if (dirtyRead.stdout.trim()) {
    return {ok: false, status: 'BLOCKED', reasonCodes: ['LOCAL_SOURCE_DIRTY']};
  }

  const mainRead = runResult(runner, 'gh', ['api', `repos/${REPO}/branches/main`, '--jq', '.commit.sha']);
  if (!mainRead.ok) return {ok: false, status: 'UNKNOWN', reasonCodes: mainRead.reasonCodes};
  const mainSha = mainRead.stdout.trim();
  if (!/^[0-9a-f]{40}$/.test(mainSha)) {
    return {ok: false, status: 'UNKNOWN', reasonCodes: ['MAIN_SHA_INVALID']};
  }
  if (localHead !== mainSha) {
    return {ok: false, status: 'BLOCKED', reasonCodes: ['LOCAL_SOURCE_NOT_CURRENT']};
  }

  const opsRead = runJson(runner, 'gh', [
    'issue', 'view', String(OPS_ISSUE), '--repo', REPO,
    '--json', 'body,state,number,url',
  ]);
  if (!opsRead.ok) return {ok: false, status: 'UNKNOWN', reasonCodes: opsRead.reasonCodes};
  const expectedOpsUrl = `https://github.com/${REPO}/issues/${OPS_ISSUE}`;
  if (opsRead.value?.number !== OPS_ISSUE
      || opsRead.value?.url !== expectedOpsUrl
      || opsRead.value?.state !== 'OPEN'
      || typeof opsRead.value?.body !== 'string') {
    return {ok: false, status: 'BLOCKED', reasonCodes: ['OPS_ISSUE_INVALID']};
  }
  const ops = parseOpsCapsule(opsRead.value.body);
  if (!ops.ok) return {ok: false, status: 'BLOCKED', reasonCodes: ops.reasonCodes};
  if (ops.value.mainSha !== mainSha) {
    return {ok: false, status: 'BLOCKED', reasonCodes: ['MAIN_485_MISMATCH']};
  }

  const projectRead = runJson(runner, 'gh', ['project', 'view', String(PROJECT_NUMBER), '--owner', PROJECT_OWNER, '--format', 'json']);
  if (!projectRead.ok) return {ok: false, status: 'UNKNOWN', reasonCodes: projectRead.reasonCodes};
  const project = normalizeProjectIdentity(projectRead.value);
  if (!project.ok) return {ok: false, status: 'BLOCKED', reasonCodes: project.reasonCodes};

  const schemaRead = runJson(runner, 'gh', [
    'project', 'field-list', String(PROJECT_NUMBER), '--owner', PROJECT_OWNER,
    '--format', 'json', '--limit', String(MAX_PROJECT_FIELDS),
  ]);
  if (!schemaRead.ok) return {ok: false, status: 'UNKNOWN', reasonCodes: schemaRead.reasonCodes};
  const schema = normalizeProjectSchema(schemaRead.value);
  if (!schema.ok) return {ok: false, status: 'BLOCKED', reasonCodes: schema.reasonCodes};

  const issueRead = runJson(runner, 'gh', [
    'issue', 'view', String(issueNumber), '--repo', REPO,
    '--json', 'body,state,labels,title,number,url',
  ]);
  if (!issueRead.ok) return {ok: false, status: 'UNKNOWN', reasonCodes: issueRead.reasonCodes};
  const issue = normalizeIssue(issueRead.value, issueNumber);
  if (!issue.ok) return {ok: false, status: 'BLOCKED', reasonCodes: issue.reasonCodes};

  const finalOpsRead = runJson(runner, 'gh', [
    'issue', 'view', String(OPS_ISSUE), '--repo', REPO,
    '--json', 'body,state,number,url',
  ]);
  if (!finalOpsRead.ok) return {ok: false, status: 'UNKNOWN', reasonCodes: finalOpsRead.reasonCodes};
  if (finalOpsRead.value?.number !== OPS_ISSUE
      || finalOpsRead.value?.url !== expectedOpsUrl
      || finalOpsRead.value?.state !== 'OPEN'
      || typeof finalOpsRead.value?.body !== 'string') {
    return {ok: false, status: 'BLOCKED', reasonCodes: ['OPS_CHANGED_DURING_BARRIER']};
  }
  const finalOps = parseOpsCapsule(finalOpsRead.value.body);
  if (!finalOps.ok || digest(finalOps.value) !== digest(ops.value)) {
    return {ok: false, status: 'BLOCKED', reasonCodes: ['OPS_CHANGED_DURING_BARRIER']};
  }

  const finalIssueRead = runJson(runner, 'gh', [
    'issue', 'view', String(issueNumber), '--repo', REPO,
    '--json', 'body,state,labels,title,number,url',
  ]);
  if (!finalIssueRead.ok) return {ok: false, status: 'UNKNOWN', reasonCodes: finalIssueRead.reasonCodes};
  const finalIssue = normalizeIssue(finalIssueRead.value, issueNumber);
  if (!finalIssue.ok || digest(finalIssue.value) !== digest(issue.value)) {
    return {ok: false, status: 'BLOCKED', reasonCodes: ['TARGET_ISSUE_CHANGED_DURING_BARRIER']};
  }

  const finalMainRead = runResult(runner, 'gh', ['api', `repos/${REPO}/branches/main`, '--jq', '.commit.sha']);
  if (!finalMainRead.ok) return {ok: false, status: 'UNKNOWN', reasonCodes: finalMainRead.reasonCodes};
  const finalMainSha = finalMainRead.stdout.trim();
  if (!/^[0-9a-f]{40}$/.test(finalMainSha)) {
    return {ok: false, status: 'UNKNOWN', reasonCodes: ['MAIN_SHA_INVALID']};
  }
  if (finalMainSha !== mainSha) {
    return {ok: false, status: 'BLOCKED', reasonCodes: ['MAIN_CHANGED_DURING_BARRIER']};
  }

  const itemsRead = runJson(runner, 'gh', [
    'project', 'item-list', String(PROJECT_NUMBER), '--owner', PROJECT_OWNER,
    '--format', 'json', '--limit', String(MAX_PROJECT_ITEMS),
    '--jq', PROJECT_ITEM_JQ,
  ], {maxBuffer: MAX_PROJECT_ITEM_OUTPUT_BYTES});
  if (!itemsRead.ok) return {ok: false, status: 'UNKNOWN', reasonCodes: itemsRead.reasonCodes};
  const item = normalizeProjectItemList(itemsRead.value, issueNumber);
  if (!item.ok) return {ok: false, status: 'BLOCKED', reasonCodes: item.reasonCodes};

  return {
    ok: true,
    status: 'READY',
    reasonCodes: [],
    snapshot: {
      localHead,
      mainSha,
      ops: ops.value,
      project: project.value,
      schema: schema.value,
      issue: issue.value,
      item: item.value,
    },
  };
}

function planSnapshot(snapshot) {
  const projection = planProjectFields({
    body: snapshot.issue.body,
    nativeState: snapshot.issue.state,
    labels: snapshot.issue.labels,
    current: snapshot.item.current,
  });
  if (projection.disposition === 'CONFLICT') {
    return output('CONFLICT', ['PLANNER_CONFLICT'], {
      plannerDisposition: projection.disposition,
      selectedField: null,
      staleFields: [],
    });
  }

  const staleFields = [];
  for (const field of FIELD_ORDER) {
    const planned = projection.fields[field.key];
    if (planned?.action === 'SET' && planned.desiredValue !== snapshot.item.current[field.key]) {
      staleFields.push({
        key: field.key,
        field: field.display,
        current: snapshot.item.current[field.key],
        desired: planned.desiredValue,
      });
    }
  }

  if (staleFields.length === 0) {
    return output(
      projection.disposition === 'ATTENTION' ? 'ATTENTION_NOOP' : 'NOOP',
      [projection.disposition === 'ATTENTION' ? 'PLANNER_ATTENTION_NO_STALE_SET' : 'PROJECT_ALREADY_CONVERGED'],
      {
        plannerDisposition: projection.disposition,
        selectedField: null,
        staleFields: [],
      },
    );
  }

  return output('READY_ONE_FIELD', ['ONE_FIELD_READY'], {
    plannerDisposition: projection.disposition,
    selectedField: staleFields[0],
    staleFields,
    remainingStaleFields: staleFields.slice(1),
  });
}

function snapshotIdentity(snapshot) {
  return digest(snapshot);
}

function contextIdentity(snapshot) {
  return digest({
    localHead: snapshot.localHead,
    mainSha: snapshot.mainSha,
    ops: snapshot.ops,
    project: snapshot.project,
    schema: snapshot.schema,
    issue: snapshot.issue,
    itemIdentity: {
      id: snapshot.item.id,
      issueNumber: snapshot.item.issueNumber,
      issueUrl: snapshot.item.issueUrl,
    },
  });
}

function sameItemFields(a, b, exceptKey = null) {
  for (const key of ['status', 'priority', 'area', 'workType']) {
    if (key === exceptKey) continue;
    if (a.current[key] !== b.current[key] || a.presence[key] !== b.presence[key]) return false;
  }
  return true;
}

function inspectProjectIssue({issueNumber, readEvidence = () => readEvidenceDefault(issueNumber)} = {}) {
  if (!Number.isSafeInteger(issueNumber) || issueNumber <= 0) {
    return output('BLOCKED', ['ISSUE_NUMBER_INVALID']);
  }
  const evidence = readEvidence();
  if (!evidence?.ok) {
    return output(evidence?.status || 'UNKNOWN', evidence?.reasonCodes || ['EVIDENCE_READ_UNKNOWN']);
  }
  return planSnapshot(evidence.snapshot);
}

function buildItemEditArgs(issueNumber, selectedField) {
  if (!Number.isSafeInteger(issueNumber) || issueNumber <= 0 || !selectedField) return null;
  const allowed = FIELD_ORDER.find((field) => field.key === selectedField.key && field.display === selectedField.field);
  if (!allowed || typeof selectedField.desired !== 'string'
      || !FIELD_SCHEMA[allowed.display].includes(selectedField.desired)) return null;
  return [
    'project', 'item-edit', String(PROJECT_NUMBER),
    '--owner', PROJECT_OWNER,
    '--url', `https://github.com/${REPO}/issues/${issueNumber}`,
    '--field', allowed.display,
    '--value', selectedField.desired,
    '--format', 'json',
  ];
}

function mutateFieldDefault(issueNumber, selectedField, runner = defaultRunner) {
  const args = buildItemEditArgs(issueNumber, selectedField);
  if (!args) return {code: 1};
  const result = runner('gh', args, {cwd: ROOT});
  return {code: Number.isInteger(result?.code) ? result.code : 1};
}

function applyProjectIssue({
  issueNumber,
  readEvidence = () => readEvidenceDefault(issueNumber),
  mutateField = (selected) => mutateFieldDefault(issueNumber, selected),
} = {}) {
  if (!Number.isSafeInteger(issueNumber) || issueNumber <= 0) {
    return output('BLOCKED', ['ISSUE_NUMBER_INVALID']);
  }

  const plannedEvidence = readEvidence();
  if (!plannedEvidence?.ok) {
    return output(plannedEvidence?.status || 'UNKNOWN', plannedEvidence?.reasonCodes || ['EVIDENCE_READ_UNKNOWN']);
  }
  const planned = planSnapshot(plannedEvidence.snapshot);
  if (planned.status !== 'READY_ONE_FIELD') return planned;

  const barrierEvidence = readEvidence();
  if (!barrierEvidence?.ok) {
    return output(barrierEvidence?.status || 'UNKNOWN', barrierEvidence?.reasonCodes || ['PRE_EFFECT_EVIDENCE_UNKNOWN']);
  }
  if (snapshotIdentity(plannedEvidence.snapshot) !== snapshotIdentity(barrierEvidence.snapshot)) {
    return output('BLOCKED', ['REPLAN_REQUIRED']);
  }
  const barrierPlan = planSnapshot(barrierEvidence.snapshot);
  if (barrierPlan.status !== 'READY_ONE_FIELD'
      || digest(barrierPlan.selectedField) !== digest(planned.selectedField)) {
    return output('BLOCKED', ['REPLAN_REQUIRED']);
  }

  const selected = barrierPlan.selectedField;
  const mutation = mutateField(selected);
  const mutationCode = Number.isInteger(mutation?.code) ? mutation.code : 1;

  const afterEvidence = readEvidence();
  if (!afterEvidence?.ok) {
    return output('UNKNOWN', ['POST_EFFECT_READ_FAILED'], {
      selectedField: selected,
      mutationMayHaveOccurred: true,
    });
  }
  if (contextIdentity(barrierEvidence.snapshot) !== contextIdentity(afterEvidence.snapshot)) {
    return output('UNKNOWN', ['POST_EFFECT_CONTEXT_DRIFT'], {
      selectedField: selected,
      mutationMayHaveOccurred: true,
    });
  }

  const beforeItem = barrierEvidence.snapshot.item;
  const afterItem = afterEvidence.snapshot.item;
  if (!sameItemFields(beforeItem, afterItem, selected.key)) {
    return output('UNKNOWN', ['UNTOUCHED_FIELD_DRIFT'], {
      selectedField: selected,
      mutationMayHaveOccurred: true,
    });
  }

  const afterValue = afterItem.current[selected.key];
  const desiredObserved = afterValue === selected.desired;
  const originalObserved = afterValue === selected.current
    && afterItem.presence[selected.key] === beforeItem.presence[selected.key];

  if (desiredObserved) {
    return output(mutationCode === 0 ? 'UPDATED' : 'UPDATED_ACK_RECOVERED',
      [mutationCode === 0 ? 'POSTWRITE_READBACK_VERIFIED' : 'MUTATION_ACK_LOST_READBACK_VERIFIED'],
      {selectedField: selected, mutationMayHaveOccurred: false});
  }
  if (mutationCode !== 0 && originalObserved) {
    return output('NO_EFFECT', ['MUTATION_FAILED_ORIGINAL_STATE_PRESERVED'], {
      selectedField: selected,
      nextLegalAction: 'RETRY_REQUIRES_FRESH_PLAN',
      mutationMayHaveOccurred: false,
    });
  }
  return output('UNKNOWN', ['POSTWRITE_SELECTED_FIELD_MISMATCH'], {
    selectedField: selected,
    mutationMayHaveOccurred: true,
  });
}

function exitCodeFor(result) {
  if (['NOOP', 'ATTENTION_NOOP', 'READY_ONE_FIELD', 'UPDATED', 'UPDATED_ACK_RECOVERED'].includes(result?.status)) return 0;
  if (['BLOCKED', 'NO_EFFECT'].includes(result?.status)) return 2;
  return 3;
}

function main(argv = process.argv.slice(2)) {
  const parsed = parseCliArgs(argv);
  const result = !parsed
    ? output('BLOCKED', ['CLI_ARGUMENTS_INVALID'])
    : parsed.operation === 'inspect'
      ? inspectProjectIssue({issueNumber: parsed.issueNumber})
      : applyProjectIssue({issueNumber: parsed.issueNumber});
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = exitCodeFor(result);
}

if (require.main === module) main();

module.exports = {
  AUTHORITY_FALSE,
  FIELD_ORDER,
  FIELD_SCHEMA,
  ITEM_KEYS,
  MAX_PROJECT_FIELDS,
  MAX_PROJECT_ITEM_OUTPUT_BYTES,
  MAX_PROJECT_ITEMS,
  MODE,
  PROJECT_ITEM_JQ,
  OPS_ISSUE,
  PROJECT_ID,
  PROJECT_NUMBER,
  PROJECT_OWNER,
  PROJECT_TITLE,
  PROJECT_URL,
  REPO,
  ROOT,
  applyProjectIssue,
  buildItemEditArgs,
  contextIdentity,
  digest,
  exitCodeFor,
  inspectProjectIssue,
  normalizeIssue,
  normalizeProjectIdentity,
  normalizeProjectItemList,
  normalizeProjectSchema,
  output,
  parseCliArgs,
  parseOpsCapsule,
  planSnapshot,
  readEvidenceDefault,
  sameItemFields,
  snapshotIdentity,
};
