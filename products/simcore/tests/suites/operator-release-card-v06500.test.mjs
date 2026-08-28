import { equal, assert } from '../../tooling/assertions.mjs';
import { runSuite as runV06411Suite } from './operator-release-card-v06411.test.mjs';

function countOf(source, needle) { return source.split(needle).length - 1; }

export async function runSuite(ctx) {
  const { source, fixtures } = ctx;
  const version = source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.65.0') return runV06411Suite(ctx);

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
  assert(card.includes("version: '0.65.0'"), 'v0.65.0 card version missing');
  assert(card.includes("name: 'M2-3 Edit Reconcile Ownership Extraction + Runtime Identity Convergence'"), 'v0.65.0 card name missing');
  equal(countOf(card, "scenario: '06500_IDENTITY_RELOAD_THEN_M2_3_EDIT_RECONCILE_REAL_LONG_CHAT'"), 1, 'v0.65.0 scenario count');
  for (const marker of [
    'Stage A — Reload continuity', 'Version 0.65.0', 'COMPACT_V2', 'HOST_LOCAL WRITTEN', 'ADOPTED · via host-local',
    'Stage B — M2-3 controls', 'SAME_FAST', 'REPRESENTATION_FAST_RECONCILED', 'USER_EDIT_CANDIDATE', 'MANUAL_EDIT_REBUILT',
  ]) assert(card.includes(marker), `v0.65.0 guidance marker ${marker} missing`);
  assert(card.indexOf('Stage A — Reload continuity') < card.indexOf('Stage B — M2-3 controls'), 'Stage A must precede Stage B');
  for (const release of ['0.65.0', '0.64.11', '0.64.10']) assert(card.includes(`version: '${release}'`), `recent release ${release} missing`);
  equal((card.match(/Object\.freeze\(\{ version: '(?:0\.65\.0|0\.64\.11|0\.64\.10)'/g) || []).length, 3, 'recent ledger must be current plus previous two');
  assert(card.includes('release PASS/FAIL authority가 아닙니다.'), 'release card authority disclaimer missing');
  for (const forbidden of ['fetch(', 'XMLHttpRequest', 'localStorage', 'IndexedDB', 'setInterval(', 'setTimeout(']) assert(!card.includes(forbidden), `release card side effect ${forbidden}`);
  pass('v06500-staged-card-content-and-non-authority');

  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
