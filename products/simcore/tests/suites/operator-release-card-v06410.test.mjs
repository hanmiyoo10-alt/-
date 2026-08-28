import { equal, assert } from '../../tooling/assertions.mjs';
import { runSuite as runLegacySuite } from './operator-release-card.test.mjs';

function countOf(source, needle) { return source.split(needle).length - 1; }

export async function runSuite(ctx) {
  const { source, fixtures } = ctx;
  const version = source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.64.10') {
    const legacyFixture = fixtures.find((row) => row.id === 'operator-release-card-v1') || fixtures[0];
    return runLegacySuite({ ...ctx, fixtures: [legacyFixture] });
  }

  const fixture = fixtures.find((row) => row.id === 'operator-release-card-v06410');
  assert(fixture, 'v0.64.10 operator release card fixture missing');
  const assertions = [];
  const pass = (id) => assertions.push({ id, status: 'PASS' });

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
  assert(cardSource.includes("version: '0.64.10'"), 'release card version missing');
  assert(cardSource.includes("name: 'Host-Local One-Shot Telemetry Handoff'"), 'release card name missing');
  equal(countOf(cardSource, "scenario: '06410_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT'"), 1, 'live scenario count');
  pass('version-name-one-scenario');

  const summaryMatch = cardSource.match(/summary: Object\.freeze\(\[([\s\S]*?)\]\),\n    recent:/);
  assert(summaryMatch, 'summary block missing');
  const summaryBullets = (summaryMatch[1].match(/^\s*'[^']+',?$/gm) || []).length;
  assert(summaryBullets >= fixture.expected.minSummaryBullets && summaryBullets <= fixture.expected.maxSummaryBullets, `summary bullet count ${summaryBullets}`);
  pass('plain-summary-bounds');

  for (const marker of ['<ol ', '중지 조건', '<b>REQUIRED</b>', '<b>IMMEDIATE</b>', '<b>CONTROL</b>', 'SESSION WRITTEN 또는 HOST_LOCAL WRITTEN']) {
    assert(cardSource.includes(marker), `operator guidance marker ${marker} missing`);
  }
  pass('numbered-steps-stop-and-capture-guidance');

  for (const release of fixture.expected.recentVersions) assert(cardSource.includes(`version: '${release}'`), `recent ledger ${release} missing`);
  equal((cardSource.match(/Object\.freeze\(\{ version: '0\.64\.(?:10|9|8)'/g) || []).length, 3, 'recent ledger must be current plus previous two');
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

  equal(assertions.filter((row) => fixture.input.cases.includes(row.id)).length, fixture.input.cases.length, 'operator release card v0.64.10 fixture coverage');
  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
