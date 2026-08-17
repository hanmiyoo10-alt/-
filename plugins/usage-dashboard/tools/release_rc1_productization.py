from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
TESTS = ROOT / 'tests'
FIXTURES = TESTS / 'fixtures'
RUNTIME = ROOT / 'runtime'
RC_VERSION = '3.0.0-rc.1'
OLD_VERSION = '3.0.0-alpha.5.44'


def read(path):
    return path.read_text()


def write(path, text):
    path.write_text(text)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)


# 1) Product version only. Runtime/contract versions stay frozen.
core_path = SRC / '00-runtime-core.part.js'
core = read(core_path)
if core.count(OLD_VERSION) < 2:
    raise SystemExit('core product version markers drifted')
core = core.replace(OLD_VERSION, RC_VERSION)
write(core_path, core)

# 2) Stable productization context. No state-schema changes.
ctx_path = SRC / '50-dashboard-context.part.js'
ctx = read(ctx_path)
ctx = replace_once(
    ctx,
    "    const bridgeDiag = bridgeStabilitySnapshot();\n    const devpassAccount = d.devpassAccount && typeof d.devpassAccount === 'object' ? d.devpassAccount : null;",
    "    const bridgeDiag = bridgeStabilitySnapshot();\n    const productRuntime = bridgeRuntimeSnapshot();\n    const lifecycleMode = bridgeLifecycleMode();\n    const stableHealth = lifecycleMode === 'live' && String(h.status || '').toLowerCase() === 'ok' && bridgeDiag.compatible !== false && Number(localRuntimeErrors.count || 0) === 0;\n    const systemHealthStatus = stableHealth ? 'STABLE' : lifecycleMode === 'paused' ? 'PAUSED' : lifecycleMode === 'off' ? 'OFF' : 'CHECK';\n    const systemHealthText = `${String(lifecycleMode || 'off').toUpperCase()} · Engine ${bridgeDiag.version ? `v${bridgeDiag.version}` : '—'} · Manager ${productRuntime.managerVersion ? `v${productRuntime.managerVersion}` : '—'} · ${state.lastSyncAt ? age(state.lastSyncAt) : '대기'}`;\n    const devpassAccount = d.devpassAccount && typeof d.devpassAccount === 'object' ? d.devpassAccount : null;",
    'dashboard stable health context',
)
write(ctx_path, ctx)

# 3) Product UI: one quiet Overview health strip, semantic Settings sections,
#    and a compact diagnostics summary before the full existing diagnostics.
markup_path = SRC / '54-dashboard-markup.part.js'
markup = read(markup_path)
markup = replace_once(
    markup,
    '.dashboard-nav button.active{background:var(--g);border-color:var(--g);color:#15170f}.shell[data-dashboard-view="overview"]',
    '.dashboard-nav button.active{background:var(--g);border-color:var(--g);color:#15170f}.system-health{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--p);border:1px solid var(--l);border-radius:11px;padding:9px 11px;margin:-3px 0 10px}.system-health>div{min-width:0}.system-health-kicker{display:block;color:var(--m);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}.system-health b{display:block;font-size:11px;margin-top:2px;white-space:normal}.system-health-status{border:1px solid var(--l);border-radius:999px;padding:3px 7px;font-size:9px;font-weight:800;white-space:nowrap}.system-health.ok .system-health-status{border-color:var(--g);color:var(--g)}.system-health.check .system-health-status{border-color:var(--e);color:var(--e)}.shell[data-dashboard-view="overview"]',
    'system health css',
)
markup = replace_once(
    markup,
    '.advanced-body{padding:0 13px 13px}\n      label{',
    '.advanced-body{padding:0 13px 13px}.settings-section-title{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin:13px 0 4px;padding-top:10px;border-top:1px solid var(--l)}.settings-section-title:first-child{margin-top:2px;padding-top:0;border-top:0}.settings-section-title b{font-size:11px}.settings-section-title span{color:var(--m);font-size:9px;text-align:right}.diag-summary{margin:0 0 10px}\n      label{',
    'settings section css',
)
markup = replace_once(
    markup,
    '</nav><main class="grid">',
    '</nav>${dashboardView === \'overview\' ? `<section class="system-health ${stableHealth ? \'ok\' : \'check\'}"><div><span class="system-health-kicker">System Health</span><b>${esc(systemHealthText)}</b></div><span class="system-health-status">${esc(systemHealthStatus)}</span></section>` : \'\'}<main class="grid">',
    'overview system health strip',
)
markup = replace_once(
    markup,
    '<div class="bridge-config-static"><label><span>Bridge URL</span>',
    '<div class="bridge-config-static"><div class="settings-section-title"><b>Connection</b><span>Bridge endpoint · token</span></div><label><span>Bridge URL</span>',
    'connection settings group',
)
markup = replace_once(
    markup,
    '<label><span>갱신 주기</span>',
    '<div class="settings-section-title"><b>Refresh</b><span>주기 · stale policy</span></div><label><span>갱신 주기</span>',
    'refresh settings group',
)
markup = replace_once(
    markup,
    '<label><span>미니 위젯</span>',
    '<div class="settings-section-title"><b>Floating Widget</b><span>표시 정보</span></div><label><span>미니 위젯</span>',
    'widget settings group',
)
markup = replace_once(
    markup,
    '<label style="margin-top:10px"><span><input id="sync-on-focus"',
    '<div class="settings-section-title"><b>Performance</b><span>복귀 · adaptive refresh</span></div><label style="margin-top:10px"><span><input id="sync-on-focus"',
    'performance settings group',
)
markup = replace_once(
    markup,
    '        </div>\n        ${bridgeControlsHtml()}\n      </div></details>',
    '        </div>\n        <div class="settings-section-title"><b>Lifecycle & Recovery</b><span>연결 · 일시정지 · 복구 · 위젯 위치</span></div>\n        ${bridgeControlsHtml()}\n      </div></details>',
    'lifecycle recovery group',
)
markup = replace_once(
    markup,
    '<details class="panel wide advanced-panel"><summary><b>Runtime Diagnostics</b><span>성능 · 진단</span></summary><div class="advanced-body"><div class="minis">',
    '<details class="panel wide advanced-panel"><summary><b>Runtime Diagnostics</b><span>요약 · 전체 진단</span></summary><div class="advanced-body"><div class="minis diag-summary"><div class="mini"><span>Runtime</span><b>${esc(performanceRuntime.runtimeState || \'—\')}</b></div><div class="mini"><span>Bridge</span><b>${bridgeDiag.version ? `v${esc(bridgeDiag.version)}` : \'—\'}</b></div><div class="mini"><span>Manager</span><b>${productRuntime.managerVersion ? `v${esc(productRuntime.managerVersion)}` : \'—\'}</b></div><div class="mini"><span>Lifecycle</span><b>${esc(String(lifecycleMode || \'off\').toUpperCase())}</b></div><div class="mini"><span>Errors</span><b>${Number(localRuntimeErrors.count || 0)}</b></div><div class="mini"><span>Last Sync</span><b>${state.lastSyncAt ? age(state.lastSyncAt) : \'—\'}</b></div></div><div class="minis">',
    'diagnostics summary layer',
)
write(markup_path, markup)

# 4) Manager is not upgraded; only its product metadata follows the RC.
manager_path = RUNTIME / 'bridge-manager.cjs'
manager = read(manager_path)
manager = replace_once(
    manager,
    "const PRODUCT_VERSION = '3.0.0-alpha.5.44';",
    "const PRODUCT_VERSION = '3.0.0-rc.1';",
    'manager product version',
)
write(manager_path, manager)

product_manifest_path = RUNTIME / 'product-manifest.json'
product_manifest = json.loads(read(product_manifest_path))
product_manifest['productVersion'] = RC_VERSION
product_manifest['components']['plugin']['version'] = RC_VERSION
product_manifest['components']['bridgeManager']['productVersion'] = RC_VERSION
product_manifest['components']['bridgeManager']['sha256'] = hashlib.sha256(manager.encode()).hexdigest()
if product_manifest['components']['bridge']['requiredVersion'] != '1.6.5':
    raise SystemExit('bridge version must stay frozen at 1.6.5')
if product_manifest['components']['bridgeManager']['version'] != '1.2.6':
    raise SystemExit('manager version must stay frozen at 1.2.6')
if product_manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('runtime contracts must stay frozen at v1')
write(product_manifest_path, json.dumps(product_manifest, indent=2) + '\n')

# 5) Historical 5.44 parity remains meaningful only for 5.44 itself. Keep the
#    baseline, but make the old regression forward-compatible with RC/stable.
structural_path = TESTS / 'p5-structural-parity.cjs'
structural = read(structural_path)
old_structural = "const normalized = source.replaceAll('3.0.0-alpha.5.44', '__PRODUCT_VERSION__');\nconst hash = crypto.createHash('sha256').update(normalized).digest('hex');\nassert.equal(hash, fixture.normalizedArtifactSha256, '5.44 changed runtime bytes beyond the product version');\nassert.ok(source.includes('//@version 3.0.0-alpha.5.44'));"
new_structural = "const version = (source.match(/^\\/\\/@version (.+)$/m) || [])[1] || '';\nif (version === '3.0.0-alpha.5.44') {\n  const normalized = source.replaceAll('3.0.0-alpha.5.44', '__PRODUCT_VERSION__');\n  const hash = crypto.createHash('sha256').update(normalized).digest('hex');\n  assert.equal(hash, fixture.normalizedArtifactSha256, '5.44 changed runtime bytes beyond the product version');\n} else {\n  assert.ok(/^3\\.0\\.0-rc\\.\\d+$/.test(version) || version === '3.0.0', `unexpected post-5.44 version: ${version}`);\n}"
structural = replace_once(structural, old_structural, new_structural, 'historical structural parity forward compatibility')
write(structural_path, structural)

# 6) Concrete 5.44 -> RC migration fixture and RC release contract.
FIXTURES.mkdir(parents=True, exist_ok=True)
fixture = {
    'bridgeBase': 'http://127.0.0.1:39117',
    'bridgeEnabled': True,
    'bridgeStatus': 'connected',
    'refreshMs': 600000,
    'backgroundPause': True,
    'syncOnFocus': True,
    'performanceGuard': True,
    'adaptiveRefresh': True,
    'staleAfterMs': 0,
    'widgetVisible': True,
    'widgetMode': 'detailed',
    'widgetX': 294,
    'widgetY': 41,
    'widgetDockSide': 'right',
    'usageScopeView': 'devpass',
    'recentRequestFilter': 'all',
    'selectedHourKey': '2026-08-17T16',
    'analyticsScopeView': 'all',
    'dashboardView': 'settings',
    'selectedCreditsOrgId': 'org-rc-migration',
    'requestLedger': [
        {
            'timestamp': 1786940000000,
            'requestNumber': '84',
            'requestedServiceTier': 'flex',
            'servedServiceTier': 'flex',
            'requestedServiceTierSource': 'requestedServiceTier',
            'servedServiceTierSource': 'usedServiceTier',
            'scopes': ['devpass'],
        }
    ],
    'bridgePausedAt': None,
    'bridgeLastReconnectAt': 1786920000000,
    'bridgeTokenClearedAt': 1786920000000,
}
write(FIXTURES / 'alpha544-rc-state.json', json.dumps(fixture, indent=2) + '\n')

rc_migration = r'''const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const saved = JSON.parse(fs.readFileSync('plugins/usage-dashboard/tests/fixtures/alpha544-rc-state.json', 'utf8'));
const defaultsStart = source.indexOf('  const DEFAULTS = {');
const defaultsEnd = source.indexOf('\n  };', defaultsStart);
const hydrateStart = source.indexOf('  function hydrateState(saved) {');
const hydrateEnd = source.indexOf('\n\n  function normalizeBridgeError', hydrateStart);
assert.ok(defaultsStart >= 0 && defaultsEnd > defaultsStart && hydrateStart >= 0 && hydrateEnd > hydrateStart);
const context = {DEFAULT_BRIDGE:'http://127.0.0.1:39117'};
vm.createContext(context);
vm.runInContext(`${source.slice(defaultsStart, defaultsEnd + 5)}\n${source.slice(hydrateStart, hydrateEnd)}\nthis.api={DEFAULTS,hydrateState};`, context);
const hydrated = context.api.hydrateState(saved);
for (const [key, value] of Object.entries(saved)) assert.deepEqual(hydrated[key], value, `5.44 state field lost in RC: ${key}`);
assert.ok(source.includes("const STATE_KEY = 'local-usage-dashboard-v3';"), 'state key changed');
assert.ok(source.includes("const TOKEN_KEY = 'local-usage-dashboard-bridge-token-v1';"), 'token storage key changed');
assert.equal(hydrated.widgetDockSide, 'right');
assert.equal(hydrated.dashboardView, 'settings');
assert.equal(hydrated.selectedCreditsOrgId, 'org-rc-migration');
assert.equal(hydrated.requestLedger[0].servedServiceTier, 'flex');
console.log('usage-dashboard P6 RC migration: OK · alpha.5.44 state survives rc.1');
'''
write(TESTS / 'p6-rc-migration.cjs', rc_migration)

rc_contract = r'''const fs = require('node:fs');
const assert = require('node:assert/strict');
const {PARTS} = require('../src/parts.cjs');
const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));
const srcManifest = JSON.parse(fs.readFileSync(`${root}/src/manifest.json`, 'utf8'));
assert.ok(source.includes('//@version 3.0.0-rc.1'));
assert.ok(source.includes("const VERSION = '3.0.0-rc.1';"));
assert.ok(source.includes("const STATE_KEY = 'local-usage-dashboard-v3';"));
assert.ok(source.includes("const TOKEN_KEY = 'local-usage-dashboard-bridge-token-v1';"));
assert.ok(source.includes("const REQUIRED_BRIDGE_VERSION = '1.6.5';"));
assert.ok(engine.includes("const VERSION = '1.6.5';"));
assert.ok(manager.includes("const MANAGER_VERSION = '1.2.6';"));
assert.ok(manager.includes("const PRODUCT_VERSION = '3.0.0-rc.1';"));
assert.equal(manifest.productVersion, '3.0.0-rc.1');
assert.equal(manifest.components.plugin.version, '3.0.0-rc.1');
assert.equal(manifest.components.bridge.requiredVersion, '1.6.5');
assert.equal(manifest.components.bridgeManager.version, '1.2.6');
assert.equal(manifest.components.bridgeManager.productVersion, '3.0.0-rc.1');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});
assert.equal(srcManifest.sourceOfTruth, 'modules');
assert.equal(PARTS.length, 22);
for (const marker of [
  'System Health',
  'systemHealthStatus',
  '<b>Connection</b><span>Bridge endpoint · token</span>',
  '<b>Refresh</b><span>주기 · stale policy</span>',
  '<b>Floating Widget</b><span>표시 정보</span>',
  '<b>Performance</b><span>복귀 · adaptive refresh</span>',
  '<b>Lifecycle & Recovery</b>',
  '요약 · 전체 진단',
  '<span>Manager</span>',
  '<span>Lifecycle</span>',
  '<span>Errors</span>',
]) assert.ok(source.includes(marker), `missing RC productization marker: ${marker}`);
console.log('usage-dashboard P6 RC contract: OK · rc.1 productization locked');
'''
write(TESTS / 'p6-rc-contract.cjs', rc_contract)

print('prepared Local Usage Dashboard 3.0.0-rc.1 stable productization')
