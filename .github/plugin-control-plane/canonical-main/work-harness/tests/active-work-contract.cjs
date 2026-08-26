'use strict';

const assert = require('node:assert/strict');
const {
  WORK_RECORD_START,
  WORK_RECORD_END,
  parseIssueWorkRecord,
  discoverActiveWorkRecords,
  evaluateDiscoveredWork,
  scanRepositoryActiveWork,
} = require('../active-work.cjs');
const { run } = require('../scan.cjs');

function record(workId, overrides = {}) {
  return {
    schemaVersion: 1,
    workId,
    objectiveId: `objective:${workId}`,
    scopeId: 'test-scope',
    sourceIdeaOrDecision: 'test-source',
    taskState: 'IN_PROGRESS',
    gateState: 'STARTABLE',
    workType: 'TEST',
    requiredCapability: 'TEST',
    readAuthorities: [],
    refreshableReadAuthorities: [],
    writeAuthorities: [],
    protectedSurfaces: [],
    closeSyncSurfaces: [],
    dependsOn: [],
    expectedBases: [],
    sourceAuthorityRefs: ['test:authority'],
    stopCondition: 'test stop',
    ...overrides,
  };
}

function bodyFor(workRecord) {
  return `${WORK_RECORD_START}\n\`\`\`json\n${JSON.stringify(workRecord, null, 2)}\n\`\`\`\n${WORK_RECORD_END}`;
}

function issue(number, workRecord, overrides = {}) {
  return {
    number,
    state: 'open',
    html_url: `https://example.test/issues/${number}`,
    title: `issue-${number}`,
    body: workRecord === undefined ? 'ordinary issue' : bodyFor(workRecord),
    ...overrides,
  };
}

{
  const parsed = parseIssueWorkRecord(issue(1, record('A')));
  assert.equal(parsed.marked, true);
  assert.equal(parsed.record.workId, 'A');
  assert.equal(parsed.provenance.issueNumber, 1);
}

{
  const closed = parseIssueWorkRecord(issue(2, record('CLOSED'), { state: 'closed' }));
  assert.equal(closed.marked, false);
  assert.equal(closed.ignored, true);
  const ordinary = parseIssueWorkRecord(issue(3, undefined));
  assert.equal(ordinary.marked, false);
}

{
  const malformed = issue(4, record('BAD'));
  malformed.body = `${WORK_RECORD_START}\n\`\`\`json\n{not json}\n\`\`\`\n${WORK_RECORD_END}`;
  const discovery = discoverActiveWorkRecords([malformed]);
  assert.equal(discovery.errors[0].code, 'DISCOVERY_JSON_INVALID');
  const result = evaluateDiscoveredWork(discovery);
  assert.equal(result.disposition, 'PARALLEL_BLOCKED');
  assert.deepEqual(result.reasonCodes, ['DISCOVERY_JSON_INVALID']);
}

{
  const discovery = discoverActiveWorkRecords([issue(5, record('DUP')), issue(6, record('DUP'))]);
  assert.equal(discovery.errors.length, 1);
  assert.equal(discovery.errors[0].code, 'DISCOVERY_DUPLICATE_WORK_ID:DUP');
  assert.equal(evaluateDiscoveredWork(discovery).disposition, 'PARALLEL_BLOCKED');
}

{
  const result = evaluateDiscoveredWork(discoverActiveWorkRecords([issue(7, undefined)]));
  assert.equal(result.disposition, 'PARALLEL_SAFE');
  assert.deepEqual(result.reasonCodes, ['NO_ACTIVE_WORK_RECORDS']);
  assert.equal(result.discovery.activeRecordCount, 0);
}

{
  const result = evaluateDiscoveredWork(discoverActiveWorkRecords([issue(8, record('ONE'))]));
  assert.equal(result.disposition, 'PARALLEL_SAFE');
  assert.deepEqual(result.reasonCodes, ['SINGLE_WORK_STARTABLE']);
  assert.equal(result.discovery.provenance[0].workId, 'ONE');
}

{
  const left = record('LEFT', {
    writeAuthorities: [{ surface: 'authority:shared', role: 'PRIMARY_WRITE' }],
  });
  const right = record('RIGHT', {
    readAuthorities: ['authority:shared'],
  });
  const result = evaluateDiscoveredWork(discoverActiveWorkRecords([issue(9, left), issue(10, right)]));
  assert.equal(result.disposition, 'PARALLEL_SERIALIZE_REQUIRED');
  assert.ok(result.reasonCodes.includes('WRITE_READ_INVALIDATION:authority:shared'));
}

{
  const left = record('CLOSE-A', {
    writeAuthorities: [{ surface: 'issue:ledger', role: 'CLOSE_SYNC_WRITE' }],
    closeSyncSurfaces: ['issue:ledger'],
  });
  const right = record('CLOSE-B', {
    writeAuthorities: [{ surface: 'issue:ledger', role: 'CLOSE_SYNC_WRITE' }],
    closeSyncSurfaces: ['issue:ledger'],
  });
  const result = evaluateDiscoveredWork(discoverActiveWorkRecords([issue(11, left), issue(12, right)]));
  assert.equal(result.disposition, 'PARALLEL_GUARDED');
  assert.ok(result.guards.includes('SERIALIZE_SHARED_CLOSE_SYNC'));
}

assert.equal(evaluateDiscoveredWork(undefined).disposition, 'PARALLEL_BLOCKED');
assert.equal(discoverActiveWorkRecords(null).errors[0].code, 'DISCOVERY_ISSUE_SET_INVALID');

(async () => {
  const calls = [];
  const fakeStore = {
    async listIssues(state) {
      calls.push(state);
      return [issue(13, record('STORE'))];
    },
  };
  const storeResult = await scanRepositoryActiveWork({ issueStore: fakeStore });
  assert.deepEqual(calls, ['open']);
  assert.equal(storeResult.disposition, 'PARALLEL_SAFE');

  const methods = [];
  const fakeFetch = async (url, options) => {
    methods.push(options.method);
    assert.match(url, /\/issues\?state=open&per_page=100&page=1$/);
    return {
      ok: true,
      status: 200,
      async json() { return [issue(14, record('LIVE'))]; },
      async text() { return ''; },
    };
  };
  const result = await run({ token: 'test-token', repo: 'owner/repo', fetchImpl: fakeFetch });
  assert.deepEqual(methods, ['GET']);
  assert.equal(result.disposition, 'PARALLEL_SAFE');
  assert.equal(result.discovery.activeRecordCount, 1);
  console.log('work-harness active-work-contract: ok');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
