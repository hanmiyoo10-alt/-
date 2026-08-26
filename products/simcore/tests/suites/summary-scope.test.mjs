import { equal, assert } from '../../tooling/assertions.mjs';

export async function runSuite({ loader, fixtures }) {
  const lifecycle = loader.load('lifecycle');
  assert(typeof lifecycle.classifySummaryScope === 'function', 'Lifecycle classifySummaryScope surface missing');

  const fixture = fixtures[0];
  const assertions = [];

  for (const row of fixture.input.cases) {
    const actual = lifecycle.classifySummaryScope(row.text, row.mode);
    const expected = fixture.expected[row.id];
    assert(expected, `${row.id} expected tuple missing`);

    equal(actual.scope, expected.scope, `${row.id} scope`);
    equal(actual.targetYear, expected.targetYear, `${row.id} targetYear`);
    equal(actual.comparisonYear, expected.comparisonYear, `${row.id} comparisonYear`);
    equal(actual.authority, expected.authority, `${row.id} authority`);
    equal(actual.reason, expected.reason, `${row.id} reason`);

    assertions.push({ id: row.id, status: 'PASS' });
  }

  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
