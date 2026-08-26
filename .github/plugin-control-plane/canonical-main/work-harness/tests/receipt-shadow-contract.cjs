'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { loadAdapterRegistry, loadProjectRegistry } = require('../dispatch.cjs');
const { issueCoordinationReceipt, renderReceiptMarker } = require('../receipt.cjs');
const { revalidateActiveWorkReceipts } = require('../receipt-shadow.cjs');

const root = path.resolve(__dirname, '../../../../..');
const adapters = loadAdapterRegistry(root);
const projects = loadProjectRegistry(root);

function workRecord(overrides = {}) {
  return {
    schemaVersion: 1,
    workId: 'TEST-B4',
    objectiveId: 'TEST:B4',
    scopeId: 'canonical-main',
    sourceIdeaOrDecision: 'test',
    taskState: 'IN_PROGRESS',
    gateState: 'STARTABLE',
    workType: 'REPO_CONTROL_PLANE',
    requiredCapability: 'CANONICAL_MAIN_OPERATIONS_REFRESH',
    readAuthorities: ['main:work-harness'],
    refreshableReadAuthorities: [],
    writeAuthorities: [{ surface: 'issue:#305', role: 'PRIMARY_WRITE' }],
    protectedSurfaces: ['ref:main'],
    closeSyncSurfaces: [],
    dependsOn: [],
    expectedBases: [{ ref: 'main', mode: 'EXACT', sha: 'abc123', mayAdvance: true }],
    sourceAuthorityRefs: ['issue:#490', 'commit:abc123'],
    stopCondition: 'test only',
    ...overrides,
  };
}

function discovery(records) {
  return {
    records,
    provenance: records.map((record, index) => ({ workId: record.workId, issueNumber: 490 + index, title: record.workId })),
    errors: [],
  };
}

function issue(number, body) {
  return { number, state: 'open', title: `issue-${number}`, body };
}

const record = workRecord();
const issued = issueCoordinationReceipt(record, [record], { main: 'abc123' }, adapters, projects);
assert.equal(issued.status, 'RECEIPT_ISSUED');
const marker = renderReceiptMarker(issued.receipt);

const absent = revalidateActiveWorkReceipts({
  issues: [issue(490, 'no receipt')], discovery: discovery([record]), observedRefs: { main: 'abc123' }, adapterRegistry: adapters, projectRegistry: projects,
});
assert.deepEqual(absent.counts, { total: 1, absent: 1, valid: 0, stale: 0, invalid: 0 });
assert.equal(absent.results[0].status, 'ABSENT');
assert.equal(absent.mutationAuthorized, false);
assert.equal(absent.executionAuthorized, false);

const valid = revalidateActiveWorkReceipts({
  issues: [issue(490, marker)], discovery: discovery([record]), observedRefs: { main: 'abc123' }, adapterRegistry: adapters, projectRegistry: projects,
});
assert.equal(valid.results[0].status, 'VALID');
assert.equal(valid.results[0].receiptId, issued.receipt.receiptId);
assert.ok(valid.results[0].reasonCodes.includes('COORDINATION_RECEIPT_VALID'));
assert.equal(valid.results[0].mutationAuthorized, false);
assert.equal(valid.results[0].executionAuthorized, false);

const staleMain = revalidateActiveWorkReceipts({
  issues: [issue(490, marker)], discovery: discovery([record]), observedRefs: { main: 'def456' }, adapterRegistry: adapters, projectRegistry: projects,
});
assert.equal(staleMain.results[0].status, 'STALE');
assert.ok(staleMain.results[0].reasonCodes.includes('RECEIPT_EXACT_BASE_STALE:main'));

const other = workRecord({
  workId: 'TEST-B4-OTHER', objectiveId: 'TEST:B4:OTHER', scopeId: 'simcore', workType: 'PLUGIN_VALIDATION',
  requiredCapability: 'SIMCORE_HARNESS_SELF_TEST', writeAuthorities: [], protectedSurfaces: [],
  expectedBases: [{ ref: 'main', mode: 'EXACT', sha: 'abc123', mayAdvance: false }],
  sourceAuthorityRefs: ['issue:#491', 'commit:abc123'],
});
const activeSetDrift = revalidateActiveWorkReceipts({
  issues: [issue(490, marker), issue(491, 'no receipt')], discovery: discovery([record, other]), observedRefs: { main: 'abc123' }, adapterRegistry: adapters, projectRegistry: projects,
});
assert.equal(activeSetDrift.results.find((entry) => entry.workId === 'TEST-B4').status, 'STALE');
assert.ok(activeSetDrift.results.find((entry) => entry.workId === 'TEST-B4').reasonCodes.includes('RECEIPT_ACTIVE_WORK_SET_DRIFT'));
assert.equal(activeSetDrift.results.find((entry) => entry.workId === 'TEST-B4-OTHER').status, 'ABSENT');

const malformed = revalidateActiveWorkReceipts({
  issues: [issue(490, '<!-- repository-coordination-receipt:v1 -->\nnot-json\n<!-- /repository-coordination-receipt:v1 -->')],
  discovery: discovery([record]), observedRefs: { main: 'abc123' }, adapterRegistry: adapters, projectRegistry: projects,
});
assert.equal(malformed.results[0].status, 'INVALID');
assert.ok(malformed.results[0].reasonCodes.includes('RECEIPT_JSON_FENCE_INVALID'));

const duplicate = revalidateActiveWorkReceipts({
  issues: [issue(490, `${marker}\n${marker}`)], discovery: discovery([record]), observedRefs: { main: 'abc123' }, adapterRegistry: adapters, projectRegistry: projects,
});
assert.equal(duplicate.results[0].status, 'INVALID');
assert.ok(duplicate.results[0].reasonCodes.includes('RECEIPT_MARKER_MULTIPLE_START'));

const tamperedReceipt = JSON.parse(JSON.stringify(issued.receipt));
tamperedReceipt.adapterId = 'simcore';
const tamperedMarker = `<!-- repository-coordination-receipt:v1 -->\n\`\`\`json\n${JSON.stringify(tamperedReceipt, null, 2)}\n\`\`\`\n<!-- /repository-coordination-receipt:v1 -->`;
const invalid = revalidateActiveWorkReceipts({
  issues: [issue(490, tamperedMarker)], discovery: discovery([record]), observedRefs: { main: 'abc123' }, adapterRegistry: adapters, projectRegistry: projects,
});
assert.equal(invalid.results[0].status, 'INVALID');
assert.ok(invalid.results[0].reasonCodes.includes('RECEIPT_PAYLOAD_INVALID'));
assert.ok(invalid.results[0].reasonCodes.includes('RECEIPT_INTEGRITY_HASH_INVALID'));

console.log('work-harness receipt-shadow-contract: ok');
