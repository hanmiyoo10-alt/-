import { equal, includes } from '../../tooling/assertions.mjs';

export async function runSuite({ source, loader, fixtures }) {
  const representation = loader.load('representation');
  const fixture = fixtures[0];
  const actual = representation.inspectCarryover(fixture.input.current, fixture.input.row);
  for (const [key, expected] of Object.entries(fixture.expected)) equal(actual[key], expected, `genuine-edit ${key}`);
  includes(source, 'USER_EDIT_CANDIDATE', 'genuine edit origin marker');
  includes(source, 'MANUAL_EDIT_REBUILT', 'manual edit rebuilt marker');
  return { coverage: 'HYBRID_TRANSITIONAL', status: 'PASS', assertions: [{ id: fixture.id, status: 'PASS' }], missingExecutableSurface: 'OUTER_EDIT_RECONCILE_SEQUENCE' };
}
