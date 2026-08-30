import { equal, assert } from '../../tooling/assertions.mjs';
import { runSuite as runV06900Suite } from './operator-release-card-v06900.test.mjs';

function countOf(source, needle) { return source.split(needle).length - 1; }

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.69.1') return runV06900Suite(ctx);

  const source = ctx.source;
  const start = source.indexOf('  const OPERATOR_RELEASE_CARD = Object.freeze({');
  const end = source.indexOf('  async function openPanel() {', start);
  assert(start >= 0 && end > start, 'v0.69.1 operator card bounds missing');
  const card = source.slice(start, end);
  assert(card.includes("version: '0.69.1'"), 'v0.69.1 card version missing');
  assert(card.includes("name: 'Refreshless Targeted Update Liveness Repair'"), 'v0.69.1 card name missing');
  equal(countOf(source, 'id="toggle-release-card"'), 1, 'v0.69.1 release card button count');
  equal(countOf(source, 'id="operator-release-card"'), 1, 'v0.69.1 release card section count');
  assert(source.includes('id="operator-release-card" class="card" style="display:none;'), 'v0.69.1 card must default collapsed');
  for (const forbidden of ['fetch(', 'XMLHttpRequest', 'localStorage', 'IndexedDB', 'setInterval(', 'setTimeout(']) {
    assert(!card.includes(forbidden), `v0.69.1 release card side effect ${forbidden}`);
  }

  let compatSource = source.replace('//@version 0.69.1', '//@version 0.69.0');
  compatSource = compatSource.replace("    version: '0.69.1',\n    name: 'Refreshless Targeted Update Liveness Repair',", "    version: '0.69.0',\n    name: 'M2-6 State Reconcile Ownership Extraction + Kernel Dependency Inversion',");
  const historical = await runV06900Suite({ ...ctx, source: compatSource });
  return {
    ...historical,
    assertions: [
      ...(historical.assertions || []),
      { id: 'v06901-operator-card-release-identity', status: 'PASS' },
      { id: 'v06901-operator-card-collapsed-no-side-effect', status: 'PASS' },
    ],
  };
}
