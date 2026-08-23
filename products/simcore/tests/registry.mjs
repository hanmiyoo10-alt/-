export const registry = Object.freeze([
  { id: 'representation-fast', module: './suites/representation-fast.test.mjs', fixtureDir: 'representation-fast', coverage: 'HYBRID_TRANSITIONAL', required: true, goldenGate: true },
  { id: 'genuine-edit', module: './suites/genuine-edit.test.mjs', fixtureDir: 'genuine-edit', coverage: 'HYBRID_TRANSITIONAL', required: true, goldenGate: true },
  { id: 'community-reaction', module: './suites/community-reaction.test.mjs', fixtureDir: 'community-reaction', coverage: 'EXECUTABLE', required: true, goldenGate: true },
  { id: 'broadcast-closure', module: './suites/broadcast-closure.test.mjs', fixtureDir: 'broadcast-closure', coverage: 'HYBRID_TRANSITIONAL', required: true, goldenGate: true },
  { id: 'diagnostic-copy', module: './suites/diagnostic-copy.test.mjs', fixtureDir: 'diagnostic-copy', coverage: 'EXECUTABLE', required: true, goldenGate: true }
]);

export const packAliases = Object.freeze({
  'batch-a': registry.map((row) => row.id),
  all: registry.map((row) => row.id),
});
