import { equal, assert } from '../../tooling/assertions.mjs';
import { runSuite as runV06902Suite } from './operator-release-card-v06902.test.mjs';

function countOf(source, needle) { return source.split(needle).length - 1; }

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.70.0') return runV06902Suite(ctx);

  const source = ctx.source;
  const start = source.indexOf('  const OPERATOR_RELEASE_CARD = Object.freeze({');
  const end = source.indexOf('  async function openPanel() {', start);
  assert(start >= 0 && end > start, 'v0.70.0 operator card bounds missing');
  const card = source.slice(start, end);
  assert(card.includes("version: '0.70.0'"), 'v0.70.0 card version missing');
  assert(card.includes("name: 'Current Task Primacy Guard'"), 'v0.70.0 card name missing');
  equal(countOf(source, 'id="toggle-release-card"'), 1, 'v0.70.0 release card button count');
  equal(countOf(source, 'id="operator-release-card"'), 1, 'v0.70.0 release card section count');
  assert(source.includes('id="operator-release-card" class="card" style="display:none;'), 'v0.70.0 card must default collapsed');
  for (const forbidden of ['fetch(', 'XMLHttpRequest', 'localStorage', 'IndexedDB', 'setInterval(', 'setTimeout(']) {
    assert(!card.includes(forbidden), `v0.70.0 release card side effect ${forbidden}`);
  }

  let compatSource = source.replace('//@version 0.70.0', '//@version 0.69.2');
  compatSource = compatSource.replace(
    "    version: '0.70.0',\n    name: 'Current Task Primacy Guard',",
    "    version: '0.69.2',\n    name: 'MamsHolic Exact Brand Alias Repair',",
  );
  const historical = await runV06902Suite({ ...ctx, source: compatSource });
  return {
    ...historical,
    assertions: [
      ...(historical.assertions || []),
      { id: 'v07000-operator-card-release-identity', status: 'PASS' },
      { id: 'v07000-operator-card-collapsed-no-side-effect', status: 'PASS' },
      { id: 'v07000-operator-card-contract-inherits-v06902', status: 'PASS' },
    ],
  };
}
