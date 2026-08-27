'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadAdapterRegistry, loadProjectRegistry } = require('../dispatch.cjs');
const { issueCoordinationReceipt, renderReceiptMarker } = require('../receipt.cjs');
const { blocked, evaluateMutationGate, exitCodeFor, parseArgs, run } = require('../mutation-gate.cjs');

const root = path.resolve(__dirname, '../../../../..');
const adapters = loadAdapterRegistry(root);
const projects = loadProjectRegistry(root);
const gateSource = fs.readFileSync(path.join(__dirname, '..', 'mutation-gate.cjs'), 'utf8');
const MAIN = 'abc123';
const CANDIDATE = 'c'.repeat(40);
const CANDIDATE_REF = 'release/usage-dashboard-harness-c3-v1';

function workRecord(overrides = {}) {
  return {
    schemaVersion: 1,
    workId: 'TEST-B5',
    objectiveId: 'TEST:B5',
    scopeId: 'canonical-main',
    sourceIdeaOrDecision: 'test',
    taskState: 'IN_PROGRESS',
    gateState: 'STARTABLE',
    workType: 'REPO_CONTROL_PLANE',
    requiredCapability: 'CANONICAL_MAIN_OPERATIONS_REFRESH',
    readAuthorities: ['main:work-harness'],
    refreshableReadAuthorities: [],
    writeAuthorities: [{ surface: 'issue:#485', role: 'PRIMARY_WRITE' }],
    protectedSurfaces: ['ref:main'],
    closeSyncSurfaces: [],
    dependsOn: [],
    expectedBases: [{ ref: 'main', mode: 'EXACT', sha: MAIN, mayAdvance: true }],
    sourceAuthorityRefs: ['issue:#493', `commit:${MAIN}`],
    stopCondition: 'test only',
    ...overrides,
  };
}

function workMarker(record) {
  return `<!-- repository-work-record:v1 -->\n\`\`\`json\n${JSON.stringify(record, null, 2)}\n\`\`\`\n<!-- /repository-work-record:v1 -->`;
}

function issue(number, record, receiptMarker = '') {
  return {
    number,
    state: 'open',
    title: `issue-${number}`,
    body: `${workMarker(record)}${receiptMarker ? `\n\n${receiptMarker}` : ''}`,
  };
}

const record = workRecord();
const issued = issueCoordinationReceipt(record, [record], { main: MAIN }, adapters, projects);
assert.equal(issued.status, 'RECEIPT_ISSUED');
const receiptMarker = renderReceiptMarker(issued.receipt);
const readyIssue = issue(700, record, receiptMarker);

const ready = evaluateMutationGate({
  issues: [readyIssue], workIssueNumber: 700, mainSha: MAIN, adapterRegistry: adapters, projectRegistry: projects,
});
assert.equal(ready.status, 'MUTATION_GATE_READY');
assert.equal(ready.coordinationReady, true);
assert.equal(ready.mutationAuthorized, false);
assert.equal(ready.executionAuthorized, false);
assert.equal(ready.boundary.status, 'MUTATION_BOUNDARY_READY');
assert.equal(ready.legalNextAction, 'HANDOFF_TO_EXISTING_MUTATION_AUTHORITY_WITH_VALID_RECEIPT');
assert.ok(ready.reasonCodes.includes('MUTATION_GATE_COORDINATION_READY'));
assert.equal(exitCodeFor(ready), 0);

function assertCrossScopeGateReady({ number, workId, objectiveId, scopeId, capability, writeSurface }) {
  const scopedRecord = workRecord({
    workId,
    objectiveId,
    scopeId,
    requiredCapability: capability,
    writeAuthorities: [{ surface: writeSurface, role: 'PRIMARY_WRITE' }],
    sourceAuthorityRefs: [`issue:#${number}`, `commit:${MAIN}`],
  });
  const scopedIssued = issueCoordinationReceipt(scopedRecord, [scopedRecord], { main: MAIN }, adapters, projects);
  assert.equal(scopedIssued.status, 'RECEIPT_ISSUED');
  assert.equal(scopedIssued.receipt.adapterId, scopeId);
  assert.equal(scopedIssued.receipt.requiredCapability, capability);
  assert.equal(scopedIssued.receipt.mutationAuthorized, false);
  assert.equal(scopedIssued.receipt.executionAuthorized, false);

  const scopedIssue = issue(number, scopedRecord, renderReceiptMarker(scopedIssued.receipt));
  const scopedReady = evaluateMutationGate({
    issues: [scopedIssue], workIssueNumber: number, mainSha: MAIN, adapterRegistry: adapters, projectRegistry: projects,
  });
  assert.equal(scopedReady.status, 'MUTATION_GATE_READY');
  assert.equal(scopedReady.coordinationReady, true);
  assert.equal(scopedReady.boundary.status, 'MUTATION_BOUNDARY_READY');
  assert.equal(scopedReady.mutationAuthorized, false);
  assert.equal(scopedReady.executionAuthorized, false);
  assert.equal(scopedReady.legalNextAction, 'HANDOFF_TO_EXISTING_MUTATION_AUTHORITY_WITH_VALID_RECEIPT');
  assert.ok(scopedReady.reasonCodes.includes('MUTATION_GATE_COORDINATION_READY'));
  assert.equal(exitCodeFor(scopedReady), 0);
}

assertCrossScopeGateReady({
  number: 710,
  workId: 'TEST-C1-USAGE-DASHBOARD',
  objectiveId: 'TEST:C1:USAGE_DASHBOARD_CANDIDATE',
  scopeId: 'usage-dashboard',
  capability: 'USAGE_DASHBOARD_CANDIDATE',
  writeSurface: 'ref:release/usage-dashboard-test',
});

assertCrossScopeGateReady({
  number: 711,
  workId: 'TEST-C1-SIMCORE',
  objectiveId: 'TEST:C1:SIMCORE_CANDIDATE',
  scopeId: 'simcore',
  capability: 'SIMCORE_CANDIDATE',
  writeSurface: 'ref:candidate/simcore/test-c1',
});

const crossRefRecord = workRecord({
  workId: 'TEST-C3-R2-USAGE-DASHBOARD',
  objectiveId: 'TEST:C3:R2:USAGE_DASHBOARD',
  scopeId: 'usage-dashboard',
  requiredCapability: 'USAGE_DASHBOARD_CANDIDATE',
  writeAuthorities: [{ surface: `ref:${CANDIDATE_REF}`, role: 'PRIMARY_WRITE' }],
  protectedSurfaces: ['ref:main', 'ref:release-usage-dashboard'],
  expectedBases: [
    { ref: 'main', mode: 'EXACT', sha: MAIN, mayAdvance: false },
    { ref: CANDIDATE_REF, mode: 'EXACT', sha: CANDIDATE, mayAdvance: true },
  ],
  sourceAuthorityRefs: ['issue:#712', `commit:${MAIN}`, `commit:${CANDIDATE}`],
});
const crossRefIssued = issueCoordinationReceipt(
  crossRefRecord,
  [crossRefRecord],
  { main: MAIN, [CANDIDATE_REF]: CANDIDATE },
  adapters,
  projects,
);
assert.equal(crossRefIssued.status, 'RECEIPT_ISSUED');
const crossRefIssue = issue(712, crossRefRecord, renderReceiptMarker(crossRefIssued.receipt));

const crossRefMainOnlyBlocked = evaluateMutationGate({
  issues: [crossRefIssue],
  workIssueNumber: 712,
  mainSha: MAIN,
  adapterRegistry: adapters,
  projectRegistry: projects,
});
assert.equal(crossRefMainOnlyBlocked.status, 'MUTATION_GATE_BLOCKED');
assert.ok(crossRefMainOnlyBlocked.reasonCodes.includes(`RECEIPT_OBSERVED_REF_MISSING:${CANDIDATE_REF}`));

const crossRefReady = evaluateMutationGate({
  issues: [crossRefIssue],
  workIssueNumber: 712,
  mainSha: MAIN,
  observedRefs: { main: MAIN, [CANDIDATE_REF]: CANDIDATE },
  adapterRegistry: adapters,
  projectRegistry: projects,
});
assert.equal(crossRefReady.status, 'MUTATION_GATE_READY');
assert.equal(crossRefReady.boundary.status, 'MUTATION_BOUNDARY_READY');
assert.equal(crossRefReady.mutationAuthorized, false);
assert.equal(crossRefReady.executionAuthorized, false);

const absent = evaluateMutationGate({
  issues: [issue(700, record)], workIssueNumber: 700, mainSha: MAIN, adapterRegistry: adapters, projectRegistry: projects,
});
assert.equal(absent.status, 'MUTATION_GATE_BLOCKED');
assert.ok(absent.reasonCodes.includes('MUTATION_GATE_RECEIPT_REQUIRED'));
assert.equal(absent.legalNextAction, 'ISSUE_FRESH_COORDINATION_RECEIPT');
assert.equal(exitCodeFor(absent), 3);

const stale = evaluateMutationGate({
  issues: [readyIssue], workIssueNumber: 700, mainSha: 'def456', adapterRegistry: adapters, projectRegistry: projects,
});
assert.equal(stale.status, 'MUTATION_GATE_BLOCKED');
assert.ok(stale.reasonCodes.includes('MUTATION_GATE_BOUNDARY_BLOCKED'));
assert.ok(stale.reasonCodes.includes('RECEIPT_EXACT_BASE_STALE:main'));
assert.equal(stale.mutationAuthorized, false);
assert.equal(stale.executionAuthorized, false);

const tampered = JSON.parse(JSON.stringify(issued.receipt));
tampered.adapterId = 'simcore';
const tamperedMarker = `<!-- repository-coordination-receipt:v1 -->\n\`\`\`json\n${JSON.stringify(tampered, null, 2)}\n\`\`\`\n<!-- /repository-coordination-receipt:v1 -->`;
const invalid = evaluateMutationGate({
  issues: [issue(700, record, tamperedMarker)], workIssueNumber: 700, mainSha: MAIN, adapterRegistry: adapters, projectRegistry: projects,
});
assert.equal(invalid.status, 'MUTATION_GATE_BLOCKED');
assert.ok(invalid.reasonCodes.includes('MUTATION_GATE_RECEIPT_INVALID'));
assert.ok(invalid.reasonCodes.includes('RECEIPT_PAYLOAD_INVALID'));
assert.ok(invalid.reasonCodes.includes('RECEIPT_INTEGRITY_HASH_INVALID'));

const missingTarget = evaluateMutationGate({
  issues: [readyIssue], workIssueNumber: 701, mainSha: MAIN, adapterRegistry: adapters, projectRegistry: projects,
});
assert.equal(missingTarget.status, 'MUTATION_GATE_BLOCKED');
assert.ok(missingTarget.reasonCodes.includes('MUTATION_GATE_TARGET_WORK_NOT_ACTIVE'));

const duplicateIssue = issue(701, record);
const discoveryBlocked = evaluateMutationGate({
  issues: [readyIssue, duplicateIssue], workIssueNumber: 700, mainSha: MAIN, adapterRegistry: adapters, projectRegistry: projects,
});
assert.equal(discoveryBlocked.status, 'MUTATION_GATE_BLOCKED');
assert.ok(discoveryBlocked.reasonCodes.includes('MUTATION_GATE_DISCOVERY_BLOCKED'));
assert.ok(discoveryBlocked.reasonCodes.includes('DISCOVERY_DUPLICATE_WORK_ID:TEST-B5'));

const conflict = workRecord({
  workId: 'TEST-B5-CONFLICT',
  objectiveId: 'TEST:B5:CONFLICT',
  sourceAuthorityRefs: ['issue:#701', `commit:${MAIN}`],
  expectedBases: [{ ref: 'main', mode: 'EXACT', sha: MAIN, mayAdvance: false }],
});
const conflictBlocked = evaluateMutationGate({
  issues: [readyIssue, issue(701, conflict)], workIssueNumber: 700, mainSha: MAIN, adapterRegistry: adapters, projectRegistry: projects,
});
assert.equal(conflictBlocked.status, 'MUTATION_GATE_BLOCKED');
assert.ok(conflictBlocked.reasonCodes.includes('MUTATION_GATE_BOUNDARY_BLOCKED'));
assert.ok(conflictBlocked.reasonCodes.some((reason) => reason.includes('WRITE_WRITE_CONFLICT:issue:#485')));

const invariant = blocked(['TEST_BLOCK'], 'TEST_NEXT', {
  schemaVersion: 99, mode: 'EVIL', status: 'MUTATION_GATE_READY', coordinationReady: true, mutationAuthorized: true, executionAuthorized: true,
});
assert.equal(invariant.schemaVersion, 1);
assert.equal(invariant.mode, 'MUTATION_GATE');
assert.equal(invariant.status, 'MUTATION_GATE_BLOCKED');
assert.equal(invariant.coordinationReady, false);
assert.equal(invariant.mutationAuthorized, false);
assert.equal(invariant.executionAuthorized, false);

assert.deepEqual(parseArgs(['--work-issue', '700']), { workIssueNumber: 700 });
assert.throws(() => parseArgs([]), /usage:/);
assert.throws(() => parseArgs(['--work-issue', 'abc']), /usage:/);

function response(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return data; },
    async text() { return JSON.stringify(data); },
  };
}

for (const forbidden of [
  'child_process', 'repo-main-write.py', 'release-publish', 'workflow_dispatch', 'git push', "method: 'POST'", "method: 'PATCH'",
]) assert.equal(gateSource.includes(forbidden), false, `mutation gate unexpectedly contains mutation primitive ${forbidden}`);

assert.equal(path.resolve(path.join(__dirname, '..'), '../../../..'), root);

async function testReadOnlyRun() {
  const seen = [];
  const fetched = await run({
    token: 'test-token',
    repo: 'owner/repo',
    root,
    workIssueNumber: 700,
    fetchImpl: async (url, options = {}) => {
      seen.push({ url, method: options.method || 'GET' });
      if (url.endsWith('/issues?state=open&per_page=100&page=1')) return response([readyIssue]);
      if (url.endsWith('/branches/main')) return response({ commit: { sha: MAIN } });
      return response({ message: 'not found' }, 404);
    },
  });
  assert.equal(fetched.status, 'MUTATION_GATE_READY');
  assert.deepEqual(seen.map((entry) => entry.method), ['GET', 'GET']);
  assert.ok(seen[0].url.endsWith('/issues?state=open&per_page=100&page=1'));
  assert.ok(seen[1].url.endsWith('/branches/main'));
}

async function testCrossRefReadOnlyRun() {
  const seen = [];
  const fetched = await run({
    token: 'test-token',
    repo: 'owner/repo',
    root,
    workIssueNumber: 712,
    fetchImpl: async (url, options = {}) => {
      seen.push({ url, method: options.method || 'GET' });
      if (url.endsWith('/issues?state=open&per_page=100&page=1')) return response([crossRefIssue]);
      if (url.endsWith('/branches/main')) return response({ commit: { sha: MAIN } });
      if (url.endsWith(`/git/ref/heads/${CANDIDATE_REF}`)) return response({ object: { sha: CANDIDATE } });
      return response({ message: 'not found' }, 404);
    },
  });
  assert.equal(fetched.status, 'MUTATION_GATE_READY');
  assert.equal(fetched.boundary.status, 'MUTATION_BOUNDARY_READY');
  assert.deepEqual(seen.map((entry) => entry.method), ['GET', 'GET', 'GET']);
  assert.ok(seen[2].url.endsWith(`/git/ref/heads/${CANDIDATE_REF}`));
}

async function testCrossRefMissingRun() {
  const fetched = await run({
    token: 'test-token',
    repo: 'owner/repo',
    root,
    workIssueNumber: 712,
    fetchImpl: async (url) => {
      if (url.endsWith('/issues?state=open&per_page=100&page=1')) return response([crossRefIssue]);
      if (url.endsWith('/branches/main')) return response({ commit: { sha: MAIN } });
      if (url.endsWith(`/git/ref/heads/${CANDIDATE_REF}`)) return response({ message: 'not found' }, 404);
      return response({ message: 'not found' }, 404);
    },
  });
  assert.equal(fetched.status, 'MUTATION_GATE_BLOCKED');
  assert.ok(fetched.reasonCodes.includes(`RECEIPT_OBSERVED_REF_MISSING:${CANDIDATE_REF}`));
  assert.equal(fetched.mutationAuthorized, false);
  assert.equal(fetched.executionAuthorized, false);
}

(async () => {
  await testReadOnlyRun();
  await testCrossRefReadOnlyRun();
  await testCrossRefMissingRun();
  console.log('work-harness mutation-gate-contract: ok');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
