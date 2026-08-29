import { equal, assert } from '../../tooling/assertions.mjs';
import { runSuite as runV06600Suite } from './operator-release-card-v06600.test.mjs';

function countOf(source, needle) { return source.split(needle).length - 1; }

export async function runSuite(ctx) {
  const { source, fixtures } = ctx;
  const version = source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.67.0') return runV06600Suite(ctx);

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

  assert(card.includes("version: '0.67.0'"), 'v0.67.0 card version missing');
  assert(card.includes("name: 'M2-5 Recovery Transition Debt Retirement'"), 'v0.67.0 card name missing');
  equal(countOf(card, "scenario: '06700_M2_5_RECOVERY_TRANSITION_DEBT_RETIREMENT_REAL_LONG_CHAT'"), 1, 'v0.67.0 scenario count');

  for (const marker of [
    'M2-5',
    'Recovery compatibility facade',
    'Output Compat',
    'Bootstrap Migration',
    'Output Finalize',
    'Edit Reconcile',
    'Version 0.67.0',
    'SAME_FAST',
    'same-tab refresh',
    'WATCH / DEFER / FIX / BLOCKER',
  ]) assert(card.includes(marker), `v0.67.0 guidance marker ${marker} missing`);

  for (const release of ['0.67.0', '0.66.0', '0.65.0']) {
    assert(card.includes(`version: '${release}'`), `recent release ${release} missing`);
  }
  equal((card.match(/Object\.freeze\(\{ version: '(?:0\.67\.0|0\.66\.0|0\.65\.0)'/g) || []).length, 3, 'recent ledger must be current plus previous two');
  assert(card.includes('release PASS/FAIL authority가 아닙니다.'), 'release card authority disclaimer missing');

  for (const forbidden of ['fetch(', 'XMLHttpRequest', 'localStorage', 'IndexedDB', 'setInterval(', 'setTimeout(']) {
    assert(!card.includes(forbidden), `release card side effect ${forbidden}`);
  }
  pass('v06700-m2-5-card-content-and-non-authority');

  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
