#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderIndex, run, validateSource } from './evidence-index.mjs';

const source = JSON.parse(fs.readFileSync('products/simcore/evidence/evidence-index-source-v1.json', 'utf8'));
const rowsA = validateSource(source);
const rowsB = validateSource(JSON.parse(JSON.stringify(source)));
assert.deepEqual(rowsA, rowsB);
assert.equal(rowsA.length, 6);
assert.deepEqual(rowsA.map((row) => row.contract), [
  'broadcast-closure',
  'community-reaction',
  'diagnostic-copy',
  'genuine-edit',
  'reload-cache-continuity',
  'representation-fast',
]);

const renderedA = renderIndex(rowsA);
const renderedB = renderIndex(rowsB);
assert.equal(renderedA, renderedB);
assert(renderedA.includes('representation-fast [HYBRID_TRANSITIONAL]'));
assert(renderedA.includes('community-reaction [EXECUTABLE]'));
assert(renderedA.includes('| reload-cache-continuity | runtime-telemetry |'));
assert(renderedA.includes('| NONE | reload-cache-continuity [EXECUTABLE] | NONE | GAP |'));
assert.equal(run(['--check']).outcome, 'INDEX_CLEAN');

const duplicate = JSON.parse(JSON.stringify(source));
duplicate.entries.push(JSON.parse(JSON.stringify(source.entries[0])));
assert.throws(() => validateSource(duplicate), /duplicate contract/);

const badRelease = JSON.parse(JSON.stringify(source));
badRelease.entries[0].evidenceRelease = 'v9.9.9';
badRelease.entries[0].liveEvidence = null;
assert.throws(() => validateSource(badRelease), /liveEvidence and evidenceRelease/);

const missingFixture = JSON.parse(JSON.stringify(source));
missingFixture.entries[0].fixtureId = 'not-registered';
assert.throws(() => validateSource(missingFixture), /not-registered/);

const missingReference = JSON.parse(JSON.stringify(source));
missingReference.entries[0].authority = 'docs/DOES_NOT_EXIST.md';
assert.throws(() => validateSource(missingReference), /DOES_NOT_EXIST/);

console.log('M13_EVIDENCE_INDEX_TEST_PASS');
