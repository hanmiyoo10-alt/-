'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const harnessDir = path.resolve(__dirname, '..');
const schema = JSON.parse(fs.readFileSync(path.join(harnessDir, 'work-record.schema.json'), 'utf8'));
const readme = fs.readFileSync(path.join(harnessDir, 'README.md'), 'utf8');
const preflightSource = fs.readFileSync(path.join(harnessDir, 'preflight.cjs'), 'utf8');
const { validateWorkRecord } = require('../contract.cjs');
const { DISPOSITIONS, evaluateWorkSet, hashRecords } = require('../preflight.cjs');

function work(id, overrides = {}) {
  return {
    schemaVersion: 1,
    workId: id,
    objectiveId: `objective-${id}`,
    scopeId: `scope:${id}`,
    sourceIdeaOrDecision: `test:${id}`,
    taskState: 'IN_PROGRESS',
    gateState: 'STARTABLE',
    workType: 'TEST',
    requiredCapability: 'repo-edit',
    readAuthorities: [],
    refreshableReadAuthorities: [],
    writeAuthorities: [],
    protectedSurfaces: [],
    closeSyncSurfaces: [],
    dependsOn: [],
    expectedBases: [],
    sourceAuthorityRefs: [`test-authority:${id}`],
    stopCondition: 'test complete',
    ...overrides,
  };
}

function disposition(records) {
  return evaluateWorkSet(records).disposition;
}

assert.equal(schema.title, 'Repository Work Record v1');
assert.equal(schema.properties.schemaVersion.const, 1);
assert.deepEqual(DISPOSITIONS, [
  'PARALLEL_SAFE',
  'PARALLEL_GUARDED',
  'PARALLEL_SERIALIZE_REQUIRED',
  'PARALLEL_NOT_STARTABLE',
  'PARALLEL_BLOCKED',
]);
for (const token of DISPOSITIONS) assert.ok(readme.includes(token));
for (const role of ['PRIMARY_WRITE', 'SUPPORTING_WRITE', 'CLOSE_SYNC_WRITE', 'EVIDENCE_WRITE']) assert.ok(readme.includes(role));
assert.ok(readme.includes('read-only shadow governance'));

// Clean independent semantic authorities are safe even if work lives in the same repository.
assert.equal(disposition([
  work('A', { writeAuthorities: [{ surface: 'authority:a', role: 'PRIMARY_WRITE' }] }),
  work('B', { writeAuthorities: [{ surface: 'authority:b', role: 'PRIMARY_WRITE' }] }),
]), 'PARALLEL_SAFE');

// Direct primary write/write semantic collision serializes.
let report = evaluateWorkSet([
  work('A', { writeAuthorities: [{ surface: 'authority:shared', role: 'PRIMARY_WRITE' }] }),
  work('B', { writeAuthorities: [{ surface: 'authority:shared', role: 'PRIMARY_WRITE' }] }),
]);
assert.equal(report.disposition, 'PARALLEL_SERIALIZE_REQUIRED');
assert.ok(report.reasonCodes.includes('WRITE_WRITE_CONFLICT:authority:shared'));

// Write -> read invalidation serializes even when scope IDs and imagined branch/file locations differ.
report = evaluateWorkSet([
  work('A', { scopeId: 'plugin:simcore', writeAuthorities: [{ surface: 'registry:simcore-authority', role: 'SUPPORTING_WRITE' }] }),
  work('B', { scopeId: 'plugin:usage-dashboard', readAuthorities: ['registry:simcore-authority'] }),
]);
assert.equal(report.disposition, 'PARALLEL_SERIALIZE_REQUIRED');
assert.ok(report.reasonCodes.includes('WRITE_READ_INVALIDATION:registry:simcore-authority'));

// Shared close-sync-only overlap remains parallel under explicit close guards.
report = evaluateWorkSet([
  work('A', {
    writeAuthorities: [{ surface: 'living:progress-ledger', role: 'CLOSE_SYNC_WRITE' }],
    closeSyncSurfaces: ['living:progress-ledger'],
  }),
  work('B', {
    writeAuthorities: [{ surface: 'living:progress-ledger', role: 'CLOSE_SYNC_WRITE' }],
    closeSyncSurfaces: ['living:progress-ledger'],
  }),
]);
assert.equal(report.disposition, 'PARALLEL_GUARDED');
assert.ok(report.guards.includes('SERIALIZE_SHARED_CLOSE_SYNC'));
assert.ok(report.guards.includes('FRESH_REREAD_BEFORE_CLOSE'));

// Close-sync write may coexist with a reader only when the reader explicitly accepts refresh-at-close.
report = evaluateWorkSet([
  work('A', {
    writeAuthorities: [{ surface: 'living:idea-inventory', role: 'CLOSE_SYNC_WRITE' }],
    closeSyncSurfaces: ['living:idea-inventory'],
  }),
  work('B', {
    readAuthorities: ['living:idea-inventory'],
    refreshableReadAuthorities: ['living:idea-inventory'],
  }),
]);
assert.equal(report.disposition, 'PARALLEL_GUARDED');
assert.ok(report.reasonCodes.includes('REFRESHABLE_WRITE_READ:living:idea-inventory'));

// Explicit direct dependency serializes regardless of disjoint write surfaces.
report = evaluateWorkSet([
  work('A', { writeAuthorities: [{ surface: 'authority:a', role: 'PRIMARY_WRITE' }] }),
  work('B', { dependsOn: ['A'], writeAuthorities: [{ surface: 'authority:b', role: 'PRIMARY_WRITE' }] }),
]);
assert.equal(report.disposition, 'PARALLEL_SERIALIZE_REQUIRED');
assert.ok(report.reasonCodes.includes('DIRECT_WORK_DEPENDENCY'));

// Shared protected authority touched by a write serializes.
report = evaluateWorkSet([
  work('A', {
    protectedSurfaces: ['authority:release-governance'],
    writeAuthorities: [{ surface: 'authority:release-governance', role: 'EVIDENCE_WRITE' }],
  }),
  work('B', { protectedSurfaces: ['authority:release-governance'] }),
]);
assert.equal(report.disposition, 'PARALLEL_SERIALIZE_REQUIRED');
assert.ok(report.reasonCodes.includes('PROTECTED_SURFACE_WRITE:authority:release-governance'));

// Exact-base siblings that can both advance the ref serialize.
report = evaluateWorkSet([
  work('A', { expectedBases: [{ ref: 'refs/heads/main', sha: 'abcdef0', mode: 'EXACT', mayAdvance: true }] }),
  work('B', { expectedBases: [{ ref: 'refs/heads/main', sha: 'abcdef0', mode: 'EXACT', mayAdvance: true }] }),
]);
assert.equal(report.disposition, 'PARALLEL_SERIALIZE_REQUIRED');
assert.ok(report.reasonCodes.includes('EXACT_BASE_COLLISION:refs/heads/main'));

// Explicitly refreshable siblings may prepare in parallel but must revalidate/replay before close.
report = evaluateWorkSet([
  work('A', { expectedBases: [{ ref: 'refs/heads/main', mode: 'REFRESHABLE', mayAdvance: true }] }),
  work('B', { expectedBases: [{ ref: 'refs/heads/main', mode: 'REFRESHABLE', mayAdvance: true }] }),
]);
assert.equal(report.disposition, 'PARALLEL_GUARDED');
assert.ok(report.guards.includes('REVALIDATE_BASE_BEFORE_CLOSE'));

// Non-startable work never gets upgraded by an otherwise clean compatibility profile.
report = evaluateWorkSet([work('A'), work('B', { gateState: 'NOT_STARTABLE' })]);
assert.equal(report.startability, 'NOT_STARTABLE');
assert.equal(report.disposition, 'PARALLEL_NOT_STARTABLE');

// UNKNOWN startability fails closed.
report = evaluateWorkSet([work('A'), work('B', { gateState: 'UNKNOWN' })]);
assert.equal(report.startability, 'BLOCKED_UNKNOWN');
assert.equal(report.disposition, 'PARALLEL_BLOCKED');

// Missing/ambiguous authority fields fail closed rather than inventing intent.
const invalid = work('A');
delete invalid.scopeId;
report = evaluateWorkSet([invalid, work('B')]);
assert.equal(report.disposition, 'PARALLEL_BLOCKED');
assert.ok(report.reasonCodes.some((code) => code.includes('WORK_RECORD_FIELD_MISSING:scopeId')));

// Contract rejects undeclared refreshable reads and malformed close-sync roles.
let validation = validateWorkRecord(work('A', { refreshableReadAuthorities: ['authority:x'] }));
assert.equal(validation.ok, false);
assert.ok(validation.errors.includes('WORK_RECORD_REFRESHABLE_READ_NOT_DECLARED:authority:x'));
validation = validateWorkRecord(work('A', {
  writeAuthorities: [{ surface: 'living:x', role: 'CLOSE_SYNC_WRITE' }],
  closeSyncSurfaces: [],
}));
assert.equal(validation.ok, false);
assert.ok(validation.errors.includes('WORK_RECORD_CLOSE_SYNC_SURFACE_MISSING:living:x'));

// Group precedence surfaces the worst pair result.
report = evaluateWorkSet([
  work('A', { writeAuthorities: [{ surface: 'authority:a', role: 'PRIMARY_WRITE' }] }),
  work('B', { writeAuthorities: [{ surface: 'authority:b', role: 'PRIMARY_WRITE' }] }),
  work('C', { gateState: 'UNKNOWN' }),
]);
assert.equal(report.disposition, 'PARALLEL_BLOCKED');

// Profile hashes are deterministic across object key insertion order.
const recordA = work('A');
const reordered = Object.fromEntries(Object.entries(recordA).reverse());
assert.equal(hashRecords([recordA]), hashRecords([reordered]));

// Static safety check: the A1 evaluator itself must not contain mutation primitives.
for (const forbidden of ['git push', 'repo-main-write.py', 'workflow_dispatch', 'release-publish', 'force-push']) {
  assert.equal(preflightSource.includes(forbidden), false, `preflight source unexpectedly contains mutation primitive ${forbidden}`);
}

console.log('work-harness preflight-contract: ok');
