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
  receiptRevalidation: {
    schemaVersion: 1,
    mode: 'RECEIPT_REVALIDATION_SHADOW',
    counts: { total: 2, absent: 1, valid: 0, stale: 1, invalid: 0 },
    results: [
      { workId: 'A', issueNumber: 10, status: 'STALE', reasonCodes: ['RECEIPT_EXACT_BASE_STALE:main'], mutationAuthorized: false, executionAuthorized: false },
      { workId: 'B', issueNumber: 11, status: 'ABSENT', reasonCodes: ['COORDINATION_RECEIPT_ABSENT'], mutationAuthorized: false, executionAuthorized: false },
    ],
    mutationAuthorized: false,
    executionAuthorized: false,
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
  'Receipt revalidation: `VALID=0 / STALE=1 / INVALID=0 / ABSENT=1`',
  '## Coordination Receipt Revalidation',
  '`A` — #10 — `STALE`',
  '`RECEIPT_EXACT_BASE_STALE:main`',
  '`B` — #11 — `ABSENT`',
  'does not change the work concurrency disposition',
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
