import { equal, assert } from '../../tooling/assertions.mjs';
import { runSuite as runV06901Suite } from './operator-release-card-v06901.test.mjs';

function countOf(source, needle) { return source.split(needle).length - 1; }

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.69.2') return runV06901Suite(ctx);

  const source = ctx.source;
  const start = source.indexOf('  const OPERATOR_RELEASE_CARD = Object.freeze({');
  const end = source.indexOf('  async function openPanel() {', start);
  assert(start >= 0 && end > start, 'v0.69.2 operator card bounds missing');
  const card = source.slice(start, end);
  assert(card.includes("version: '0.69.2'"), 'v0.69.2 card version missing');
  assert(card.includes("name: 'MamsHolic Exact Brand Alias Repair'"), 'v0.69.2 card name missing');
  equal(countOf(source, 'id="toggle-release-card"'), 1, 'v0.69.2 release card button count');
  equal(countOf(source, 'id="operator-release-card"'), 1, 'v0.69.2 release card section count');
  assert(source.includes('id="operator-release-card" class="card" style="display:none;'), 'v0.69.2 card must default collapsed');
  for (const forbidden of ['fetch(', 'XMLHttpRequest', 'localStorage', 'IndexedDB', 'setInterval(', 'setTimeout(']) {
    assert(!card.includes(forbidden), `v0.69.2 release card side effect ${forbidden}`);
  }

  let compatSource = source.replace('//@version 0.69.2', '//@version 0.69.1');
  compatSource = compatSource.replace(
    "    version: '0.69.2',\n    name: 'MamsHolic Exact Brand Alias Repair',",
    "    version: '0.69.1',\n    name: 'Refreshless Targeted Update Liveness Repair',",
  );
  const historical = await runV06901Suite({ ...ctx, source: compatSource });
  return {
    ...historical,
    assertions: [
      ...(historical.assertions || []),
      { id: 'v06902-operator-card-release-identity', status: 'PASS' },
      { id: 'v06902-operator-card-collapsed-no-side-effect', status: 'PASS' },
      { id: 'v06902-operator-card-contract-inherits-v06901', status: 'PASS' },
    ],
  };
}
