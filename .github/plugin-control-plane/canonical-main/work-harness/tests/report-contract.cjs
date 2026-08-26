'use strict';

const assert = require('node:assert/strict');
const { renderShadowSummary } = require('../report.cjs');

const base = {
  schemaVersion: 1,
  mode: 'SHADOW',
  profileHash: 'abc123',
  startability: 'STARTABLE',
  disposition: 'PARALLEL_GUARDED',
  reasonCodes: ['SHARED_CLOSE_SYNC:issue:#465'],
  guards: ['FRESH_REREAD_BEFORE_CLOSE'],
  discovery: {
    scannedIssueCount: 27,
    markedIssueCount: 2,
    activeRecordCount: 2,
    provenance: [
      { workId: 'A', issueNumber: 10, issueUrl: 'https://example/10', title: 'Alpha' },
      { workId: 'B', issueNumber: 11, issueUrl: 'https://example/11', title: 'Beta' },
    ],
    errors: [],
  },
};

const rendered = renderShadowSummary(base, { trigger: 'issues', repository: 'o/r', runUrl: 'https://example/run' });
for (const expected of [
  '# Repository Work Harness — Shadow Scan',
  'Active records: `2`',
  'Startability: `STARTABLE`',
  'Disposition: `PARALLEL_GUARDED`',
  '`SHARED_CLOSE_SYNC:issue:#465`',
  '`FRESH_REREAD_BEFORE_CLOSE`',
  '`A` — #10 — Alpha',
  '`B` — #11 — Beta',
  'Advisory shadow evidence only',
]) assert.ok(rendered.includes(expected), `summary missing: ${expected}`);

const blocked = renderShadowSummary({
  mode: 'SHADOW',
  startability: 'BLOCKED_UNKNOWN',
  disposition: 'PARALLEL_BLOCKED',
  reasonCodes: ['DISCOVERY_JSON_INVALID'],
  guards: [],
  discovery: {
    scannedIssueCount: 1,
    markedIssueCount: 1,
    activeRecordCount: 0,
    provenance: [],
    errors: [{ code: 'DISCOVERY_JSON_INVALID' }],
  },
});
assert.match(blocked, /## Discovery Errors/);
assert.match(blocked, /`DISCOVERY_JSON_INVALID`/);

console.log('work-harness report-contract: ok');
