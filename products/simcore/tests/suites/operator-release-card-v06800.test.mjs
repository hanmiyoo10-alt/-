import { equal, assert } from '../../tooling/assertions.mjs';
import { runSuite as runV06700Suite } from './operator-release-card-v06700.test.mjs';

function countOf(source, needle) { return source.split(needle).length - 1; }

export async function runSuite(ctx) {
  const { source, fixtures } = ctx;
  const version = source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.68.0') return runV06700Suite(ctx);

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

  assert(card.includes("version: '0.68.0'"), 'v0.68.0 card version missing');
  assert(card.includes("name: 'Community Parent-Local Alias Classification Repair'"), 'v0.68.0 card name missing');
  equal(countOf(card, "scenario: '06800_COMMUNITY_PARENT_LOCAL_ALIAS_CLASSIFICATION_REPAIR_REAL_LONG_CHAT'"), 1, 'v0.68.0 scenario count');

  for (const marker of [
    'Community',
    'separator',
    'exact PLATFORM_FAMILIES',
    'classifier v2→v3',
    'canonical 맘카페',
    'Version 0.68.0',
    '맘스홀릭 / 예비맘·육아 수다방',
    'WATCH / DEFER / FIX / BLOCKER',
    'release PASS/FAIL authority가 아닙니다.',
  ]) assert(card.includes(marker), `v0.68.0 guidance marker ${marker} missing`);

  for (const release of ['0.68.0', '0.67.0', '0.66.0']) {
    assert(card.includes(`version: '${release}'`), `recent release ${release} missing`);
  }
  equal((card.match(/Object\.freeze\(\{ version: '(?:0\.68\.0|0\.67\.0|0\.66\.0)'/g) || []).length, 3, 'recent ledger must be current plus previous two');

  for (const forbidden of ['fetch(', 'XMLHttpRequest', 'localStorage', 'IndexedDB', 'setInterval(', 'setTimeout(']) {
    assert(!card.includes(forbidden), `release card side effect ${forbidden}`);
  }
  pass('v06800-community-card-content-and-non-authority');

  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
