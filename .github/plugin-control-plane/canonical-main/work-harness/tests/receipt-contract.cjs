'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { loadAdapterRegistry, loadProjectRegistry } = require('../dispatch.cjs');
const {
  issueCoordinationReceipt,
  parseReceiptMarker,
  renderReceiptMarker,
  validateCoordinationReceipt,
  validateCoordinationReceiptShape,
} = require('../receipt.cjs');

const root = path.resolve(__dirname, '../../../../..');
const adapters = loadAdapterRegistry(root);
const projects = loadProjectRegistry(root);

function workRecord(overrides = {}) {
  return {
    schemaVersion: 1,
    workId: 'TEST-RECEIPT',
    objectiveId: 'TEST:B3',
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
    sourceAuthorityRefs: ['issue:#487', 'commit:abc123'],
    stopCondition: 'test only',
    ...overrides,
  };
}

const record = workRecord();
const issued = issueCoordinationReceipt(record, [record], { main: 'abc123' }, adapters, projects);
assert.equal(issued.status, 'RECEIPT_ISSUED');
assert.equal(issued.coordinationReady, true);
assert.equal(issued.receipt.mutationAuthorized, false);
assert.equal(issued.receipt.executionAuthorized, false);
assert.equal(issued.receipt.preflightStartability, 'STARTABLE');
assert.equal(issued.receipt.preflightDisposition, 'PARALLEL_SAFE');
assert.match(issued.receipt.receiptId, /^[0-9a-f]{64}$/);
assert.equal(
  issueCoordinationReceipt(record, [record], { main: 'abc123' }, adapters, projects).receipt.receiptId,
  issued.receipt.receiptId,
);

const marker = renderReceiptMarker(issued.receipt);
const parsed = parseReceiptMarker(`before\n${marker}\nafter`);
assert.equal(parsed.marked, true);
assert.deepEqual(parsed.receipt, issued.receipt);
assert.equal(parseReceiptMarker(`${marker}\n${marker}`).error, 'RECEIPT_MARKER_MULTIPLE_START');
assert.equal(parseReceiptMarker('<!-- repository-coordination-receipt:v1 -->\nno fence\n<!-- /repository-coordination-receipt:v1 -->').error, 'RECEIPT_JSON_FENCE_INVALID');

const current = validateCoordinationReceipt(issued.receipt, record, [record], { main: 'abc123' }, adapters, projects);
assert.equal(current.status, 'RECEIPT_VALID');
assert.equal(current.valid, true);

const changed = workRecord({ sourceAuthorityRefs: ['issue:#487', 'issue:#999', 'commit:abc123'] });
const workDrift = validateCoordinationReceipt(issued.receipt, changed, [changed], { main: 'abc123' }, adapters, projects);
assert.equal(workDrift.valid, false);
assert.ok(workDrift.reasonCodes.includes('RECEIPT_WORK_PROFILE_DRIFT'));
assert.ok(workDrift.reasonCodes.includes('RECEIPT_ACTIVE_WORK_SET_DRIFT'));
assert.ok(workDrift.reasonCodes.includes('RECEIPT_AUTHORITY_REF_DRIFT'));

const other = workRecord({
  workId: 'TEST-OTHER', objectiveId: 'TEST:OTHER', scopeId: 'simcore', workType: 'PLUGIN_VALIDATION',
  requiredCapability: 'SIMCORE_HARNESS_SELF_TEST', writeAuthorities: [], protectedSurfaces: [],
  expectedBases: [{ ref: 'main', mode: 'EXACT', sha: 'abc123', mayAdvance: false }], sourceAuthorityRefs: ['issue:#999'],
});
const setDrift = validateCoordinationReceipt(issued.receipt, record, [record, other], { main: 'abc123' }, adapters, projects);
assert.equal(setDrift.valid, false);
assert.ok(setDrift.reasonCodes.includes('RECEIPT_ACTIVE_WORK_SET_DRIFT'));

const staleMain = validateCoordinationReceipt(issued.receipt, record, [record], { main: 'def456' }, adapters, projects);
assert.equal(staleMain.valid, false);
assert.ok(staleMain.reasonCodes.includes('RECEIPT_EXACT_BASE_STALE:main'));

const baseChanged = workRecord({ expectedBases: [{ ref: 'main', mode: 'EXACT', sha: 'def456', mayAdvance: true }] });
const baseDrift = validateCoordinationReceipt(issued.receipt, baseChanged, [baseChanged], { main: 'def456' }, adapters, projects);
assert.equal(baseDrift.valid, false);
assert.ok(baseDrift.reasonCodes.includes('RECEIPT_EXPECTED_BASE_DRIFT'));

const adapterDrift = JSON.parse(JSON.stringify(adapters));
adapterDrift.adapters.find((adapter) => adapter.adapterId === 'canonical-main').verificationHooks.push('docs/extra-check.md');
const adapterValidation = validateCoordinationReceipt(issued.receipt, record, [record], { main: 'abc123' }, adapterDrift, projects);
assert.equal(adapterValidation.valid, false);
assert.ok(adapterValidation.reasonCodes.includes('RECEIPT_ADAPTER_CONTRACT_DRIFT'));

const projectDrift = JSON.parse(JSON.stringify(projects));
projectDrift.b3ReceiptTestMarker = true;
const projectValidation = validateCoordinationReceipt(issued.receipt, record, [record], { main: 'abc123' }, adapters, projectDrift);
assert.equal(projectValidation.valid, false);
assert.ok(projectValidation.reasonCodes.includes('RECEIPT_PROJECT_REGISTRY_DRIFT'));

const identityChanged = workRecord({ requiredCapability: 'CANONICAL_MAIN_CONTROL_PLANE' });
const identityDrift = validateCoordinationReceipt(issued.receipt, identityChanged, [identityChanged], { main: 'abc123' }, adapters, projects);
assert.equal(identityDrift.valid, false);
assert.ok(identityDrift.reasonCodes.includes('RECEIPT_IDENTITY_DRIFT:requiredCapability'));

const tampered = { ...issued.receipt, adapterId: 'simcore' };
const tamperShape = validateCoordinationReceiptShape(tampered);
assert.equal(tamperShape.ok, false);
assert.ok(tamperShape.reasonCodes.includes('RECEIPT_INTEGRITY_HASH_INVALID'));

const refreshable = workRecord({ expectedBases: [{ ref: 'main', mode: 'REFRESHABLE', mayAdvance: true }] });
const unsupported = issueCoordinationReceipt(refreshable, [refreshable], { main: 'abc123' }, adapters, projects);
assert.equal(unsupported.status, 'RECEIPT_BLOCKED');
assert.ok(unsupported.reasonCodes.includes('RECEIPT_REFRESHABLE_BASE_UNSUPPORTED_B3:main'));

console.log('work-harness receipt-contract: ok');
