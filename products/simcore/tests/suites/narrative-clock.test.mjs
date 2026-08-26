import { equal, assert, includes } from '../../tooling/assertions.mjs';

function expectedFor(fixture, id) {
  const row = fixture.expected[id];
  assert(row && typeof row === 'object', `${id} expected row missing`);
  return row;
}

function fresh(value) {
  return JSON.parse(JSON.stringify(value));
}

export async function runSuite({ loader, fixtures }) {
  const time = loader.load('time');
  const lifecycle = loader.load('lifecycle');
  for (const name of [
    'narrativeTimestampSequence',
    'resolvePostBEndCurrentTimeFloor',
    'enforceNarrativeCurrentTimeFloor',
    'commitNarrativeTimestamp',
    'compareTimestamps',
  ]) assert(typeof time[name] === 'function', `Time.${name} missing`);
  assert(typeof lifecycle.derivePostBEndClockEligibility === 'function', 'Lifecycle.derivePostBEndClockEligibility missing');

  const fixture = fixtures[0];
  const assertions = [];

  for (const row of fixture.input.currentFloorCases) {
    const expected = expectedFor(fixture, row.id);
    const original = row.content;
    const actual = time.enforceNarrativeCurrentTimeFloor(row.content, row.floor);
    equal(actual.changed, expected.changed, `${row.id} changed`);
    equal(actual.reason, expected.reason, `${row.id} reason`);
    if (Object.prototype.hasOwnProperty.call(expected, 'observed')) equal(actual.observed, expected.observed, `${row.id} observed`);
    if (Object.prototype.hasOwnProperty.call(expected, 'floor')) equal(actual.floor, expected.floor, `${row.id} floor`);
    if (expected.changed) assert(actual.content.startsWith(row.floor), `${row.id} current token not clamped to floor`);
    else equal(actual.content, original, `${row.id} content changed unexpectedly`);
    if (row.historical) includes(actual.content, row.historical, `${row.id} historical token rewritten`);
    assertions.push({ id: row.id, status: 'PASS' });
  }

  for (const row of fixture.input.tailCases) {
    const expected = expectedFor(fixture, row.id);
    if (/^B_/.test(row.mode)) {
      const state = { narrativeTimestamp: row.previous };
      const before = state.narrativeTimestamp;
      const actual = time.commitNarrativeTimestamp(state, { mode: row.mode, narrativeTimestampPrevious: row.previous }, row.content);
      equal(actual.changed, expected.changed, `${row.id} changed`);
      equal(actual.reason, expected.reason, `${row.id} reason`);
      equal(actual.timestamp, expected.timestamp, `${row.id} timestamp`);
      equal(actual.tailStatus, expected.tailStatus, `${row.id} tailStatus`);
      equal(state.narrativeTimestamp, before, `${row.id} Narrative state mutated`);
      assertions.push({ id: row.id, status: 'PASS' });
      continue;
    }

    const sequence = time.narrativeTimestampSequence(row.content);
    equal(sequence.frameTimestamp, expected.frameTimestamp, `${row.id} frameTimestamp`);
    equal(sequence.candidate, expected.candidate, `${row.id} candidate`);
    equal(sequence.tailStatus, expected.tailStatus, `${row.id} tailStatus`);
    equal(sequence.tailPromoted, expected.tailPromoted, `${row.id} tailPromoted`);
    if (row.id === 'tail-monotonic-promotes-terminal') {
      assert(sequence.sceneCount > 0, `${row.id} sceneCount`);
      const state = { narrativeTimestamp: row.previous };
      const actual = time.commitNarrativeTimestamp(state, { mode: row.mode, narrativeTimestampPrevious: row.previous }, row.content);
      equal(actual.timestamp, expected.commitTimestamp, `${row.id} commit timestamp`);
      equal(state.narrativeTimestamp, expected.commitTimestamp, `${row.id} Narrative state commit`);
    }
    assertions.push({ id: row.id, status: 'PASS' });
  }

  for (const row of fixture.input.postBEndCases) {
    const expected = expectedFor(fixture, row.id);
    const state = fresh(row.state);
    const lineage = fresh(row.lineage);
    const facts = fresh(row.facts);
    const eligibility = lifecycle.derivePostBEndClockEligibility(
      row.mode,
      row.previousMode,
      state,
      lineage,
      facts,
      row.sendIndex,
    );
    equal(eligibility.eligible, expected.eligible, `${row.id} eligible`);
    equal(eligibility.reason, expected.eligibilityReason, `${row.id} eligibility reason`);
    if (expected.disposition) {
      const resolution = time.resolvePostBEndCurrentTimeFloor(row.narrative, eligibility);
      equal(resolution.disposition, expected.disposition, `${row.id} disposition`);
      equal(resolution.effectiveFloor, expected.effectiveFloor, `${row.id} effectiveFloor`);
      if (expected.resolutionReason) equal(resolution.reason, expected.resolutionReason, `${row.id} resolution reason`);
    }
    assertions.push({ id: row.id, status: 'PASS' });
  }

  equal(assertions.length, 13, 'narrative-clock frozen case count');
  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
