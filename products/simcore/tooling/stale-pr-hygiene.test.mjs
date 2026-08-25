#!/usr/bin/env node
import assert from 'node:assert/strict';
import { classifySnapshot } from './stale-pr-hygiene.mjs';

const capturedAt = '2026-08-26T00:00:00Z';
const base = {
  state: 'open',
  title: 'example',
  base: 'main',
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-25T00:00:00Z',
};

function run(pullRequests, context = {}, staleDays = 14) {
  return classifySnapshot({ schemaVersion: 1, capturedAt, pullRequests, context }, staleDays);
}

let report = run([
  { ...base, number: 2, head: 'release-simcore' },
], { productionBranch: 'release-simcore' });
assert.equal(report.result, 'REVIEW_REQUIRED');
assert.equal(report.rows[0].classification, 'REVIEW_LEGACY_CONTROL');
assert.deepEqual(report.rows[0].reasonCodes, ['PRODUCTION_BRANCH_HEAD']);

report = run([
  {
    ...base,
    number: 109,
    head: 'command/old-build',
    body: 'Command-only trigger. This PR is not intended to merge.',
  },
], { knownCompletedWork: [109] });
assert.equal(report.rows[0].classification, 'COMMAND_ONLY_DONE');
assert.deepEqual(report.rows[0].reasonCodes, ['BODY_NOT_INTENDED_TO_MERGE', 'KNOWN_WORK_COMPLETED']);

report = run([
  {
    ...base,
    number: 110,
    head: 'command/still-open',
    body: 'Command-only trigger. This PR is not intended to merge.',
  },
]);
assert.equal(report.rows[0].classification, 'KEEP_ACTIVE');

report = run([
  { ...base, number: 120, head: 'old/superseded' },
], { knownSupersededHeads: ['old/superseded'] });
assert.equal(report.rows[0].classification, 'SUPERSEDED');

report = run([
  {
    ...base,
    number: 130,
    head: 'old/ordinary',
    updatedAt: '2026-08-01T00:00:00Z',
  },
]);
assert.equal(report.rows[0].classification, 'REVIEW_STALE');

report = run([
  {
    ...base,
    number: 131,
    head: 'old-but-active',
    updatedAt: '2026-08-01T00:00:00Z',
  },
], { activePullRequests: [131] });
assert.equal(report.result, 'CLEAN');
assert.equal(report.rows[0].classification, 'KEEP_ACTIVE');
assert.deepEqual(report.rows[0].reasonCodes, ['EXPLICIT_ACTIVE_CONTEXT']);

report = run([
  { ...base, number: 140, head: 'contradiction' },
], { activeHeads: ['contradiction'], knownSupersededHeads: ['contradiction'] });
assert.equal(report.result, 'BLOCKED');
assert.equal(report.rows[0].classification, 'UNKNOWN');
assert.deepEqual(report.rows[0].reasonCodes, ['CONTEXT_CONTRADICTORY']);

report = run([
  { number: 150, state: 'open', title: 'missing fields' },
]);
assert.equal(report.result, 'BLOCKED');
assert.equal(report.rows[0].classification, 'UNKNOWN');

report = run([
  { ...base, number: 160, head: 'already-closed', state: 'closed' },
  { ...base, number: 161, head: 'already-merged', state: 'merged' },
]);
assert.equal(report.result, 'CLEAN');
assert.equal(report.rows.length, 0);

const deterministicInput = {
  schemaVersion: 1,
  capturedAt,
  pullRequests: [
    { ...base, number: 200, head: 'b' },
    { ...base, number: 100, head: 'a' },
  ],
  context: {},
};
const first = JSON.stringify(classifySnapshot(deterministicInput));
const second = JSON.stringify(classifySnapshot(deterministicInput));
assert.equal(first, second);
assert.deepEqual(classifySnapshot(deterministicInput).rows.map((row) => row.number), [100, 200]);

const noBodyLeak = run([
  {
    ...base,
    number: 210,
    head: 'body-sensitive',
    body: 'Command-only trigger. This PR is not intended to merge. SECRET BODY PAYLOAD',
  },
], { knownCompletedWork: ['body-sensitive'] });
assert(!JSON.stringify(noBodyLeak).includes('SECRET BODY PAYLOAD'));

console.log('stale-pr-hygiene tests: PASS');
