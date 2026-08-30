const SUITE_RE = /^builder-v(\d{5})\.test\.mjs$/;
const FIXTURE_RE = /^builder-v(\d{5})$/;

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

export function discoverBuilderClosure({ suiteFiles = [], fixtureDirs = [] } = {}) {
  const suites = new Map();
  const fixtures = new Map();

  for (const name of suiteFiles) {
    const match = String(name).match(SUITE_RE);
    if (match) suites.set(match[1], String(name));
  }
  for (const name of fixtureDirs) {
    const match = String(name).match(FIXTURE_RE);
    if (match) fixtures.set(match[1], String(name));
  }

  const suiteOnly = sorted([...suites.keys()].filter((key) => !fixtures.has(key)));
  const fixtureOnly = sorted([...fixtures.keys()].filter((key) => !suites.has(key)));
  const complete = sorted([...suites.keys()].filter((key) => fixtures.has(key)));

  const rows = complete.map((key) => ({
    id: `builder-v${key}`,
    module: `./suites/${suites.get(key)}`,
    fixtureDir: fixtures.get(key),
    coverage: 'EXECUTABLE',
    required: true,
    goldenGate: true,
  }));

  if (suiteOnly.length || fixtureOnly.length) {
    return {
      status: 'BLOCK',
      reasonCode: 'BLOCK_FIXTURE_GAP',
      suiteOnly,
      fixtureOnly,
      rows,
    };
  }

  return {
    status: 'PASS',
    reasonCode: null,
    suiteOnly: [],
    fixtureOnly: [],
    rows,
  };
}

export function mergeProjectedBuilderRows(registryRows, projectedBuilderRows) {
  const nonBuilders = (registryRows || []).filter((row) => !/^builder-v\d{5}$/.test(String(row?.id || '')));
  const seen = new Set();
  const builders = [];
  for (const row of projectedBuilderRows || []) {
    if (!row?.id || seen.has(row.id)) throw new Error(`projected builder row duplicate or invalid: ${row?.id || '<missing>'}`);
    seen.add(row.id);
    builders.push({ ...row });
  }
  return [...nonBuilders, ...builders];
}
