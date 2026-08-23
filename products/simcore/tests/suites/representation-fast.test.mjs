import { equal, includes } from '../../tooling/assertions.mjs';

export async function runSuite({ source, loader, fixtures }) {
  const representation = loader.load('representation');
  const fixture = fixtures[0];
  const results = [];
  for (const row of fixture.input.cases) {
    const actual = representation.inspectCarryover(row.current, row.row);
    const expected = fixture.expected[row.id];
    equal(actual.priorRepresentation, expected.priorRepresentation, `${row.id} priorRepresentation`);
    equal(actual.currentMatch, expected.currentMatch, `${row.id} currentMatch`);
    if (expected.deltaShape) equal(actual.deltaShape, expected.deltaShape, `${row.id} deltaShape`);
    results.push({ id: row.id, status: 'PASS' });
  }
  includes(source, 'SAME_FAST', 'representation fast marker');
  includes(source, 'REPRESENTATION_FAST_RECONCILED', 'representation reconcile marker');
  return { coverage: 'HYBRID_TRANSITIONAL', status: 'PASS', assertions: results, missingExecutableSurface: 'OUTER_RECONCILE_SEQUENCE' };
}
