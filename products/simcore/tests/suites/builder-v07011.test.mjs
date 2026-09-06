import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { equal, assert } from '../../tooling/assertions.mjs';

function count(source, marker) {
  return String(source).split(marker).length - 1;
}

function moduleNames(source) {
  return [...String(source).matchAll(/SimCore\.define\("([^"]+)"\s*,\s*function/g)].map((m) => m[1]);
}

function moduleText(source, name) {
  const token = `SimCore.define("${name}", function (require, module, exports) {`;
  const start = source.indexOf(token);
  assert(start >= 0, `${name} module missing`);
  const next = source.indexOf('\nSimCore.define("', start + token.length);
  return source.slice(start, next >= 0 ? next : source.length);
}

function requireLines(source, name) {
  return [...moduleText(source, name).matchAll(/^const [^\n=]+ = require\('[^']+'\);$/gm)].map((m) => m[0]);
}

function cardText(source) {
  const startToken = '  const OPERATOR_RELEASE_CARD = Object.freeze({';
  const endToken = '  async function openPanel() {';
  const start = source.indexOf(startToken);
  const end = start >= 0 ? source.indexOf(endToken, start + startToken.length) : -1;
  assert(start >= 0 && end > start, 'operator release-card bounds missing');
  equal(source.indexOf(startToken, start + 1), -1, 'operator release-card owner must be singular');
  return source.slice(start, end);
}

function assertIdentity(candidate) {
  equal(candidate.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '', '0.70.11', 'metadata identity');
  equal(candidate.match(/const SIMCORE_RUNTIME_VERSION = '([^']+)';/)?.[1] || '', '0.70.11', 'runtime identity');
  equal(candidate.match(/const HOST_COMPAT_VERSION = '([^']+)';/)?.[1] || '', '0.70.11', 'Host identity');
  equal(count(candidate, '// v0.70.11 Operator Release Card Metadata Repair:'), 1, 'release-note source header identity');
}

function assertCurrentCard(candidate, fixture) {
  const card = cardText(candidate);
  for (const marker of [
    "version: '0.70.11'",
    "name: 'Operator Release Card Metadata Repair'",
    "scenario: '07011_OPERATOR_RELEASE_CARD_METADATA_REPAIR_REAL_LONG_CHAT'",
    "validation: 'PENDING_REAL_LONG_CHAT'",
    'summary: Object.freeze([',
    'checks: Object.freeze([',
    'release-local metadata',
    '영구 회귀 검증 추가',
    '자연 ordinary turn 1회',
    'WATCH / DEFER / FIX / BLOCKER',
    'const bullets = card.summary.map(',
    'const checks = card.checks.map(',
    '${escapeHtml(card.scenario)}',
    '${escapeHtml(card.validation)}',
  ]) assert(card.includes(marker), `release-local card marker missing: ${marker}`);

  equal(fixture.input.releaseSpecLiveGateScenario, '07011_OPERATOR_RELEASE_CARD_METADATA_REPAIR_REAL_LONG_CHAT', 'fixture release-spec scenario contract');
  assert(card.includes(`scenario: '${fixture.input.releaseSpecLiveGateScenario}'`), 'card scenario must match release-spec scenario contract');
  assert(card.includes(`validation: '${fixture.expected.validation}'`), 'card validation must match live-gate validation contract');

  for (const historical of [
    fixture.expected.historicalScenario,
    'Version 0.69.0',
    'State Reconcile',
    'Kernel Inversion',
  ]) assert(!card.includes(historical), `historical operator guidance survived: ${historical}`);

  assert(!card.includes('#1660'), 'separate #1660 repair must not be claimed');
  for (const forbidden of ['fetch(', 'XMLHttpRequest', 'localStorage', 'IndexedDB', 'setInterval(', 'setTimeout(']) {
    assert(!card.includes(forbidden), `operator card gained side effect surface: ${forbidden}`);
  }

  equal(count(candidate, 'id="toggle-release-card"'), 1, 'release-card toggle count');
  equal(count(candidate, 'id="operator-release-card"'), 1, 'release-card section count');
  assert(candidate.includes('id="operator-release-card" class="card" style="display:none;'), 'release card must remain default collapsed');
  assert(candidate.includes('${buildOperatorReleaseCardHtml()}'), 'release card must remain mounted in existing operator panel');
}

function assertValidationProfile() {
  const profilePath = 'products/simcore/releases/validation-profiles/0.70.11.json';
  assert(fs.existsSync(profilePath), 'v0.70.11 validation profile missing');
  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  equal(profile.releaseVersion, '0.70.11', 'profile release version');
  equal(profile.releaseName, 'Operator Release Card Metadata Repair', 'profile release name');
  equal(profile.contracts?.['operator-release-card']?.mode, 'CHANGED_CONTRACT', 'operator card must use changed-contract projection');
  equal(profile.contracts?.['operator-release-card']?.authorityVersion, '0.70.11', 'changed operator contract must bind exact current authority');
  equal(profile.contracts?.['host-local-telemetry']?.mode, 'EXACT_CURRENT_IDENTITY', 'Host-local exact-current contract preserved');
  equal(profile.contracts?.['host-local-telemetry']?.authorityVersion, '0.70.11', 'Host-local authority advances with compatibility identity');
}

export async function runSuite(ctx) {
  const fixture = ctx.fixtures[0];
  assert(fixture, 'v0.70.11 builder fixture missing');
  equal(fixture.suite, 'builder-v07011', 'fixture suite identity');
  equal(fixture.expected.runtimeMutation, 'OPERATOR_RELEASE_CARD_METADATA_ONLY', 'fixture runtime mutation contract');
  equal(fixture.expected.releaseSystemMutation, 'NONE', 'fixture release-system non-mutation contract');
  assertValidationProfile();

  const sourceVersion = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (!['0.70.10', '0.70.11'].includes(sourceVersion)) {
    return {
      coverage: 'EXECUTABLE',
      status: 'PASS',
      assertions: [{ id: 'v07011-builder-source-not-active', status: 'PASS' }],
    };
  }

  let candidate = ctx.source;
  let predecessor = null;
  if (sourceVersion === '0.70.10') {
    predecessor = ctx.source;
    const staleCard = cardText(predecessor);
    for (const historical of [
      fixture.expected.historicalScenario,
      'Version 0.69.0',
      'State Reconcile',
      'Kernel Inversion',
    ]) assert(staleCard.includes(historical), `predecessor must exercise stale-card repair: ${historical}`);

    const builder = path.resolve(process.cwd(), 'products/simcore/tooling/build-07011-operator-release-card-metadata-repair.py');
    assert(fs.existsSync(builder), 'v0.70.11 builder missing');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-07011-builder-'));
    try {
      const pluginDir = path.join(tmp, 'plugins', 'simcore');
      fs.mkdirSync(pluginDir, { recursive: true });
      const latestPath = path.join(pluginDir, 'latest.js');
      const installPath = path.join(pluginDir, 'install.js');
      fs.writeFileSync(latestPath, ctx.source, 'utf8');
      fs.writeFileSync(installPath, ctx.source, 'utf8');

      const run = spawnSync('python3', [builder], {
        cwd: tmp,
        encoding: 'utf8',
        timeout: 60000,
        maxBuffer: 1024 * 1024,
      });
      equal(run.status, 0, `v0.70.11 builder exit: ${run.stderr || run.stdout}`);
      assert(run.stdout.includes('07011_BUILD_PASS'), `v0.70.11 builder PASS marker missing: ${run.stdout}`);
      const latest = fs.readFileSync(latestPath, 'utf8');
      const install = fs.readFileSync(installPath, 'utf8');
      equal(latest, install, 'v0.70.11 latest/install byte identity');
      candidate = latest;
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  assertIdentity(candidate);
  assertCurrentCard(candidate, fixture);

  if (predecessor) {
    equal(JSON.stringify(moduleNames(candidate)), JSON.stringify(moduleNames(predecessor)), 'module inventory/order frozen');
    for (const name of moduleNames(predecessor)) {
      equal(JSON.stringify(requireLines(candidate, name)), JSON.stringify(requireLines(predecessor, name)), `${name} require graph frozen`);
    }
    for (const marker of [
      'getLocalPluginStorage',
      'setItem(',
      'getItem(',
      'removeItem(',
      'pluginStorage.setItem(',
      'pluginStorage.getItem(',
      'pluginStorage.removeItem(',
      'pluginStorage.keys(',
      'setChatToIndex',
      'getChatFromIndex',
      'setTimeout(',
      'setInterval(',
      'fetch(',
      'XMLHttpRequest',
      'history.splice(',
      'messages.splice(',
      'Date.now()',
      'const PROMPT_COMPILER_VERSION = 4;',
      'const COMMUNITY_CLASSIFIER_VERSION = 3;',
      'const STATE_VERSION = 5;',
      'const CORE_STATE_VERSION = 10;',
      '__SIMCORE_TELEMETRY_HANDOFF_HOST_LOCAL_V1__',
      '10 * 60 * 1000',
      '16 * 1024',
      "await acquired.store.setItem(HOST_LOCAL_KEY, prepared.encoded);",
      "await checkpointRuntimeTelemetry('OUTPUT_COMMIT');",
    ]) equal(count(candidate, marker), count(predecessor, marker), `${marker} frozen`);
  }

  return {
    coverage: 'EXECUTABLE',
    status: 'PASS',
    assertions: [
      { id: 'v07011-identity-convergence', status: 'PASS' },
      { id: 'v07011-whole-card-release-local', status: 'PASS' },
      { id: 'v07011-historical-card-guidance-absent', status: 'PASS' },
      { id: 'v07011-live-gate-scenario-contract', status: 'PASS' },
      { id: 'v07011-changed-contract-profile', status: 'PASS' },
      { id: 'v07011-operator-ui-purity', status: 'PASS' },
      { id: 'v07011-topology-and-side-effects-frozen', status: 'PASS' },
      { id: 'v07011-latest-install-identity', status: 'PASS' },
    ],
  };
}
