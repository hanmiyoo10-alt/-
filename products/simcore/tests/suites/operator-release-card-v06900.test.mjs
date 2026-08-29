import { equal, assert } from '../../tooling/assertions.mjs';
import { runSuite as runV06800Suite } from './operator-release-card-v06800.test.mjs';

function countOf(source, needle) { return source.split(needle).length - 1; }

export async function runSuite(ctx) {
  const { source, fixtures } = ctx;
  const version = source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.69.0') return runV06800Suite(ctx);

  const control = fixtures.find((row) => row.id === 'operator-release-card-v06410') || fixtures[0];
  assert(control, 'operator card control fixture missing');
  const assertions = [];
  const pass = (id) => assertions.push({ id, status: 'PASS' });

  equal(countOf(source, 'id="toggle-release-card"'), 1, 'release card button count');
  equal(countOf(source, 'id="operator-release-card"'), 1, 'release card section count');
  assert(source.includes('<button id="toggle-release-card">업데이트 내역</button>'), 'exact 업데이트 내역 button missing');
  assert(source.includes('id="operator-release-card" class="card" style="display:none;'), 'release card must default collapsed');
  equal(countOf(source, 'Risuai.registerButton('), control.expected.topLevelRegisterButtonCount, 'top-level registerButton count changed');
  equal(countOf(source, 'Risuai.registerSetting('), control.expected.topLevelRegisterSettingCount, 'top-level registerSetting count changed');
  pass('bounded-existing-panel-only');

  const start = source.indexOf('  const OPERATOR_RELEASE_CARD = Object.freeze({');
  const end = source.indexOf('  async function openPanel() {', start);
  assert(start >= 0 && end > start, 'operator card bounds missing');
  const card = source.slice(start, end);

  assert(card.includes("version: '0.69.0'"), 'v0.69.0 card version missing');
  assert(card.includes("name: 'M2-6 State Reconcile Ownership Extraction + Kernel Dependency Inversion'"), 'v0.69.0 card name missing');
  equal(countOf(card, "scenario: '06900_M2_6_STATE_RECONCILE_KERNEL_INVERSION_REAL_LONG_CHAT'"), 1, 'v0.69.0 scenario count');

  for (const marker of [
    'Kernel',
    'State Reconcile',
    'Community/Recurrence/Lineage/Handoff',
    'STATE_VERSION/CORE_STATE_VERSION',
    'Version 0.69.0',
    'mirror-fast 또는 snapshot',
    'classifier v3',
    'persistent schema',
    'WATCH / DEFER / FIX / BLOCKER',
    'release PASS/FAIL authority가 아닙니다.',
  ]) assert(card.includes(marker), `v0.69.0 guidance marker ${marker} missing`);

  for (const release of ['0.69.0', '0.68.0', '0.67.0']) {
    assert(card.includes(`version: '${release}'`), `recent release ${release} missing`);
  }
  equal((card.match(/Object\.freeze\(\{ version: '(?:0\.69\.0|0\.68\.0|0\.67\.0)'/g) || []).length, 3, 'recent ledger must be current plus previous two');

  for (const forbidden of ['fetch(', 'XMLHttpRequest', 'localStorage', 'IndexedDB', 'setInterval(', 'setTimeout(']) {
    assert(!card.includes(forbidden), `release card side effect ${forbidden}`);
  }
  pass('v06900-m2-6-card-content-and-non-authority');

  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
