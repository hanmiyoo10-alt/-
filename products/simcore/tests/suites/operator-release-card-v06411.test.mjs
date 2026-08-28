import { equal, assert } from '../../tooling/assertions.mjs';
import { runSuite as runV06410Suite } from './operator-release-card-v06410.test.mjs';

function countOf(source, needle) { return source.split(needle).length - 1; }

export async function runSuite(ctx) {
  const { source, fixtures } = ctx;
  const version = source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.64.11') return runV06410Suite(ctx);

  const fixture = fixtures.find((row) => row.id === 'operator-release-card-v06411');
  assert(fixture, 'v0.64.11 operator release card fixture missing');
  const assertions = [];
  const pass = (id) => assertions.push({ id, status: 'PASS' });

  equal(countOf(source, 'id="toggle-release-card"'), 1, 'release card button count');
  assert(source.includes('<button id="toggle-release-card">업데이트 내역</button>'), 'exact 업데이트 내역 button missing');
  equal(countOf(source, 'id="operator-release-card"'), 1, 'release card section count');
  equal(countOf(source, 'Risuai.registerButton('), fixture.expected.topLevelRegisterButtonCount, 'top-level registerButton count changed');
  equal(countOf(source, 'Risuai.registerSetting('), fixture.expected.topLevelRegisterSettingCount, 'top-level registerSetting count changed');
  pass('panel-registration-stable');

  const cardStart = source.indexOf('  const OPERATOR_RELEASE_CARD = Object.freeze({');
  const panelStart = source.indexOf('  async function openPanel() {', cardStart);
  assert(cardStart >= 0 && panelStart > cardStart, 'operator card formatter placement missing');
  const card = source.slice(cardStart, panelStart);
  assert(card.includes("version: '0.64.11'"), 'v0.64.11 release card version missing');
  assert(card.includes("name: 'Bounded Telemetry Capsule Compaction'"), 'v0.64.11 release card name missing');
  equal(countOf(card, "scenario: '06411_BOUNDED_CAPSULE_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT'"), 1, 'v0.64.11 live scenario count');
  pass('v06411-version-name-scenario');

  for (const marker of fixture.expected.requiredMarkers) assert(card.includes(marker), `operator card marker missing: ${marker}`);
  for (const release of fixture.expected.recentVersions) assert(card.includes(`version: '${release}'`), `recent ledger ${release} missing`);
  equal((card.match(/Object\.freeze\(\{ version: '0\.64\.(?:11|10|9)'/g) || []).length, 3, 'recent ledger must be current plus previous two');
  pass('v06411-guidance-and-ledger');

  for (const forbidden of fixture.expected.forbiddenTokens) assert(!card.includes(forbidden), `release card introduced forbidden token ${forbidden}`);
  assert(card.includes('release PASS/FAIL authority가 아닙니다.'), 'release card non-authority statement missing');
  pass('v06411-card-pure-non-authority');

  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
