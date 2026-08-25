'use strict';

function expectedScopes(registry) {
  return [...Object.keys(registry.plugins || {}).map((id) => ({kind: 'plugin', id})), ...Object.keys(registry.products || {}).map((id) => ({kind: 'product', id}))].sort((a, b) => a.id.localeCompare(b.id));
}
function deriveCoverage(registry, bootstrapObservation) {
  const expected = expectedScopes(registry);
  const statuses = bootstrapObservation?.statuses || [];
  const byId = new Map(statuses.map((row) => [row.id, row]));
  const rows = expected.map(({kind, id}) => {
    const found = byId.get(id);
    return found ? {...found, kind} : {kind, id, ready: false, profile: 'UNREGISTERED', errors: ['descriptor missing']};
  });
  const expectedIds = new Set(expected.map((row) => row.id));
  const extras = statuses.filter((row) => !expectedIds.has(row.id)).map((row) => ({...row, ready: false, errors: [...(row.errors || []), 'descriptor has no operational registry scope']}));
  const allRows = [...rows, ...extras];
  const readyCount = rows.filter((row) => row.ready).length;
  return {rows: allRows, expectedCount: expected.length, registeredCount: rows.filter((row) => row.profile !== 'UNREGISTERED').length, readyCount, complete: extras.length === 0 && readyCount === expected.length};
}
module.exports = {expectedScopes, deriveCoverage};
