'use strict';

const assert = require('node:assert/strict');
const { loadAdapterRegistry, loadProjectRegistry } = require('../dispatch.cjs');
const { RECEIPT_START } = require('../receipt.cjs');
const {
  RECEIPT_REQUEST,
  markerCount,
  parseArgs,
  planReceiptSyncForIssue,
  upsertReceiptMarker,
} = require('../receipt-sync.cjs');

const MAIN = 'a'.repeat(40);

function workRecord(overrides = {}) {
  return {
    schemaVersion: 1,
    workId: 'HARNESS-B7-TEST',
    objectiveId: 'U-25:B7:TEST',
    scopeId: 'canonical-main',
    sourceIdeaOrDecision: 'U-25/#464 test fixture',
    taskState: 'IN_PROGRESS',
    gateState: 'STARTABLE',
    workType: 'REPO_CONTROL_PLANE',
    requiredCapability: 'CANONICAL_MAIN_WORK_HARNESS',
    readAuthorities: ['main:work-harness', 'github:open-issues'],
    refreshableReadAuthorities: ['github:open-issues'],
    writeAuthorities: [
      { surface: 'path:.github/plugin-control-plane/canonical-main/work-harness/**', role: 'PRIMARY_WRITE' },
      { surface: 'issue:#465', role: 'CLOSE_SYNC_WRITE' },
    ],
    protectedSurfaces: ['ref:main', 'gateway:repo-main-write', 'authority:product-release'],
    closeSyncSurfaces: ['issue:#465'],
    dependsOn: [],
    expectedBases: [{ ref: 'main', mode: 'EXACT', sha: MAIN, mayAdvance: true }],
    sourceAuthorityRefs: ['issue:#464', 'issue:#465', `commit:${MAIN}`],
    stopCondition: 'test stop condition',
    ...overrides,
  };
}

function bodyFor(record, suffix = '') {
  return `# Packet\n\n<!-- repository-work-record:v1 -->\n\`\`\`json\n${JSON.stringify(record, null, 2)}\n\`\`\`\n<!-- /repository-work-record:v1 -->\n\n${RECEIPT_REQUEST}${suffix}`;
}

function issue(number, record, suffix = '') {
  return { number, state: 'open', title: record.workId, body: bodyFor(record, suffix), html_url: `https://example.test/issues/${number}` };
}

const adapterRegistry = loadAdapterRegistry(process.cwd());
const projectRegistry = loadProjectRegistry(process.cwd());

assert.equal(markerCount(`${RECEIPT_REQUEST}\n`, RECEIPT_REQUEST), 1);
assert.equal(markerCount(`Mention in code: \`${RECEIPT_REQUEST}\`\n${RECEIPT_REQUEST}\n`, RECEIPT_REQUEST), 1);
assert.equal(markerCount(`${RECEIPT_REQUEST}\n  ${RECEIPT_REQUEST}  \n`, RECEIPT_REQUEST), 2);
assert.equal(markerCount(`x${RECEIPT_REQUEST}y`, RECEIPT_REQUEST), 0);
assert.equal(parseArgs(['--work-issue', '123']), 123);
assert.equal(parseArgs(['--work-issue', 'x']), null);

const record = workRecord();
const target = issue(700, record, `\n\nDesign note: \`${RECEIPT_REQUEST}\``);
const first = planReceiptSyncForIssue({
  issues: [target],
  targetIssueNumber: 700,
  observedRefs: { main: MAIN },
  adapterRegistry,
  projectRegistry,
});
assert.equal(first.status, 'RECEIPT_SYNC_READY');
assert.equal(first.changed, true);
assert.equal(first.coordinationReady, true);
assert.equal(first.mutationAuthorized, false);
assert.equal(first.executionAuthorized, false);
assert.match(first.updatedBody, new RegExp(RECEIPT_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.equal(typeof first.receiptId, 'string');
assert.ok(first.receiptId.length > 20);

const secondIssue = { ...target, body: first.updatedBody };
const second = planReceiptSyncForIssue({
  issues: [secondIssue],
  targetIssueNumber: 700,
  observedRefs: { main: MAIN },
  adapterRegistry,
  projectRegistry,
});
assert.equal(second.status, 'RECEIPT_SYNC_NOOP');
assert.equal(second.changed, false);
assert.equal(second.receiptId, first.receiptId);

const stale = planReceiptSyncForIssue({
  issues: [target],
  targetIssueNumber: 700,
  observedRefs: { main: 'b'.repeat(40) },
  adapterRegistry,
  projectRegistry,
});
assert.equal(stale.status, 'RECEIPT_SYNC_BLOCKED');
assert.ok(stale.reasonCodes.some((code) => code.includes('RECEIPT_EXACT_BASE_STALE:main')));
assert.equal(Object.prototype.hasOwnProperty.call(stale, 'updatedBody'), false);

const duplicateRequest = issue(701, workRecord({ workId: 'HARNESS-B7-DUP-REQUEST' }), `\n${RECEIPT_REQUEST}`);
const duplicateRequestPlan = planReceiptSyncForIssue({
  issues: [duplicateRequest],
  targetIssueNumber: 701,
  observedRefs: { main: MAIN },
  adapterRegistry,
  projectRegistry,
});
assert.equal(duplicateRequestPlan.status, 'RECEIPT_SYNC_BLOCKED');
assert.deepEqual(duplicateRequestPlan.reasonCodes, ['RECEIPT_SYNC_REQUEST_DUPLICATE']);

const malformedReceipt = issue(702, workRecord({ workId: 'HARNESS-B7-BAD-RECEIPT' }), `\n${RECEIPT_START}\nnot-json`);
const malformedPlan = planReceiptSyncForIssue({
  issues: [malformedReceipt],
  targetIssueNumber: 702,
  observedRefs: { main: MAIN },
  adapterRegistry,
  projectRegistry,
});
assert.equal(malformedPlan.status, 'RECEIPT_SYNC_BLOCKED');
assert.ok(malformedPlan.reasonCodes.includes('RECEIPT_SYNC_EXISTING_RECEIPT_INVALID'));

const other = workRecord({
  workId: 'HARNESS-B7-CONFLICT',
  objectiveId: 'U-25:B7:CONFLICT',
  sourceAuthorityRefs: ['issue:#999', `commit:${MAIN}`],
});
const conflictPlan = planReceiptSyncForIssue({
  issues: [target, issue(703, other)],
  targetIssueNumber: 700,
  observedRefs: { main: MAIN },
  adapterRegistry,
  projectRegistry,
});
assert.equal(conflictPlan.status, 'RECEIPT_SYNC_BLOCKED');
assert.ok(conflictPlan.reasonCodes.includes('RECEIPT_SYNC_ISSUANCE_BLOCKED'));
assert.equal(conflictPlan.changed, false);

const parsedCurrent = require('../receipt.cjs').parseReceiptMarker(first.updatedBody);
assert.equal(parsedCurrent.marked, true);
assert.equal(parsedCurrent.receipt.mutationAuthorized, false);
assert.equal(parsedCurrent.receipt.executionAuthorized, false);
const upsert = upsertReceiptMarker(first.updatedBody, parsedCurrent.receipt);
assert.equal(upsert.ok, true);
assert.equal(upsert.changed, false);

console.log('work-harness receipt-sync-contract: ok');
