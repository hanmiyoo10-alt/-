import { equal, assert } from '../../tooling/assertions.mjs';

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

export async function runSuite({ source, fixtures }) {
  const fixture = fixtures[0];
  const version = source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  const assertions = [];
  const pass = (id) => assertions.push({ id, status: 'PASS' });

  if (version !== '0.64.9') {
    assert(!source.includes('id="toggle-release-card"'), 'operator release card appeared before v0.64.9');
    pass('pre-06409-absent-control');
    return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
  }

  equal(countOf(source, 'id="toggle-release-card"'), 1, 'release card button count');
  assert(source.includes('<button id="toggle-release-card">업데이트 내역</button>'), 'exact 업데이트 내역 button missing');
  pass('exact-button-label');

  equal(countOf(source, 'id="operator-release-card"'), 1, 'release card section count');
  assert(source.includes('id="operator-release-card" class="card" style="display:none;'), 'release card must default collapsed');
  assert(source.includes('${buildOperatorReleaseCardHtml()}'), 'release card is not mounted inside existing panel template');
  pass('panel-only-collapsed');

  equal(countOf(source, 'Risuai.registerButton('), fixture.expected.topLevelRegisterButtonCount, 'top-level registerButton count changed');
  equal(countOf(source, 'Risuai.registerSetting('), fixture.expected.topLevelRegisterSettingCount, 'top-level registerSetting count changed');
  pass('no-new-top-level-ui-registration');

  const cardStart = source.indexOf('  const OPERATOR_RELEASE_CARD = Object.freeze({');
  const panelStart = source.indexOf('  async function openPanel() {', cardStart);
  assert(cardStart >= 0 && panelStart > cardStart, 'operator card formatter placement missing');
  const cardSource = source.slice(cardStart, panelStart);
  assert(cardSource.includes("version: '0.64.9'"), 'release card version missing');
  assert(cardSource.includes("name: 'Session Transport Root Resolution'"), 'release card name missing');
  equal(countOf(cardSource, "scenario: '06409_SESSION_ROOT_RELOAD_CONTINUITY_REAL_LONG_CHAT'"), 1, 'live scenario count');
  pass('version-name-one-scenario');

  const summaryMatch = cardSource.match(/summary: Object\.freeze\(\[([\s\S]*?)\]\),\n    recent:/);
  assert(summaryMatch, 'summary block missing');
  const summaryBullets = (summaryMatch[1].match(/^\s*'[^']+',?$/gm) || []).length;
  assert(summaryBullets >= fixture.expected.minSummaryBullets && summaryBullets <= fixture.expected.maxSummaryBullets, `summary bullet count ${summaryBullets}`);
  pass('plain-summary-bounds');

  for (const marker of ['<ol ', '중지 조건', '<b>REQUIRED</b>', '<b>IMMEDIATE</b>', '<b>CONTROL</b>']) assert(cardSource.includes(marker), `operator guidance marker ${marker} missing`);
  pass('numbered-steps-stop-and-capture-guidance');

  for (const release of fixture.expected.recentVersions) assert(cardSource.includes(`version: '${release}'`), `recent ledger ${release} missing`);
  assert((cardSource.match(/Object\.freeze\(\{ version: '0\.64\.[789]'/g) || []).length >= fixture.expected.minRecentVersions, 'recent version ledger too short');
  pass('recent-version-ledger');

  assert(cardSource.includes('release PASS/FAIL authority가 아닙니다.'), 'non-authority statement missing');
  pass('explicit-non-authority');

  for (const forbidden of fixture.expected.forbiddenTokens) assert(!cardSource.includes(forbidden), `release card introduced forbidden token ${forbidden}`);
  pass('static-pure-no-side-effects');

  const handlerStart = source.indexOf("      const releaseCardButton = document.getElementById('toggle-release-card');", panelStart);
  const copyStart = source.indexOf("      const copyTurnDiagButton = document.getElementById('copy-turn-diag');", handlerStart);
  assert(handlerStart > panelStart && copyStart > handlerStart, 'release card toggle is not scoped to existing panel wiring');
  assert(source.slice(handlerStart, copyStart).includes("releaseCardSection.style.display === 'none' ? 'block' : 'none'"), 'bounded local toggle missing');
  pass('local-toggle-only');

  equal(assertions.filter((row) => fixture.input.cases.includes(row.id)).length, fixture.input.cases.length, 'operator release card fixture coverage');
  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
