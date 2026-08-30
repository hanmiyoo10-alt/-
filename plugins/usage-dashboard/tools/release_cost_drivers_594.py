from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
TOOLS = ROOT / 'tools'
SPEC = Path('.github/usage-dashboard/releases/5.94.json')

CORE = SRC / '00-runtime-core.part.js'
ANALYTICS = SRC / '16-usage-analytics.part.js'
DASHBOARD = SRC / '50-dashboard-context.part.js'
ANALYTICS_CONTEXT = SRC / '52-analytics-context.part.js'
MARKUP = SRC / '54-dashboard-markup.part.js'
DIAGNOSTICS = SRC / '40-diagnostics.part.js'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
LATEST = ROOT / 'latest.js'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')

BASE_VERSION = '3.0.0-alpha.5.93'
TARGET_VERSION = '3.0.0-alpha.5.94'
TARGET_ENGINE = '1.6.30'
TARGET_MANAGER = '1.3.4'
TARGET_CLI = '1.10.0'
TARGET_RELEASE_TITLE = 'Compact Authoritative 24h Cost Drivers'
TARGET_RELEASE_MEMORY = f'Current release implementation: `{TARGET_VERSION} — {TARGET_RELEASE_TITLE}`.'
BASE_ENGINE_SHA = '035aa5d6535edd357df3390b7cd22acff2dec298a79e86d2fe2b4b0d3f2b4228'
BASE_MANAGER_SHA = '5af01c7106c7da20f00faef8ac471acb0ab7bdb27e79433f4444c10a70e55e49'
BASE_BOOTSTRAP_SHA = '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c'
AUTHORITY_TAG_COMMIT = '6b1cda1988f32010a9b090c00eb9b2fe672145fe'


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(*args: str) -> None:
    subprocess.run(list(args), check=True)


def load_spec():
    return json.loads(SPEC.read_text(encoding='utf-8'))


def replace_once_or_target(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one source match, found {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def validate_authority(spec) -> None:
    expected = {
        'schemaVersion': 1,
        'package': '@llmgateway/cli',
        'version': TARGET_CLI,
        'upstreamRepository': 'theopenco/llmgateway-templates',
        'tagNamespace': '@llmgateway/cli@',
        'tag': f'@llmgateway/cli@{TARGET_CLI}',
        'tagCommit': AUTHORITY_TAG_COMMIT,
        'parentProjectRepository': 'theopenco/llmgateway',
        'parentProjectReleaseIsPackageAuthority': False,
    }
    value = spec.get('managedCliAuthority')
    if not isinstance(value, dict):
        raise SystemExit('5.94 managed CLI authority missing')
    for key, expected_value in expected.items():
        if value.get(key) != expected_value:
            raise SystemExit(f'5.94 managed CLI authority {key} mismatch: {value.get(key)!r}')


def load_release_notes():
    spec = load_spec()
    validate_authority(spec)
    expected = {
        'productVersion': TARGET_VERSION,
        'engineVersion': TARGET_ENGINE,
        'managerVersion': TARGET_MANAGER,
        'managedCliVersion': TARGET_CLI,
        'materializer': 'plugins/usage-dashboard/tools/release_cost_drivers_594.py',
    }
    for key, value in expected.items():
        if spec.get(key) != value:
            raise SystemExit(f'5.94 release spec {key} mismatch')
    if spec.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.94 release spec contracts changed from 1/1')
    if spec.get('releaseTitle') != TARGET_RELEASE_TITLE:
        raise SystemExit('5.94 release title mismatch')
    highlights = spec.get('highlights')
    hints = spec.get('diagnosticHints')
    for key, value in [('highlights', highlights), ('diagnosticHints', hints)]:
        if not isinstance(value, list) or not 1 <= len(value) <= 5:
            raise SystemExit(f'5.94 {key} must contain 1..5 items')
        if any(not isinstance(item, str) or not item.strip() or len(item) > 180 for item in value):
            raise SystemExit(f'5.94 {key} items must be non-empty bounded strings')
    return spec['releaseTitle'], [x.strip() for x in highlights], [x.strip() for x in hints]


def js_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def release_notes_constant(title, highlights, hints) -> str:
    h = ',\n    '.join(js_string(item) for item in highlights)
    d = ',\n    '.join(js_string(item) for item in hints)
    return (
        "  const RELEASE_NOTES = Object.freeze({\n"
        f"    title: {js_string(title)},\n"
        "    highlights: Object.freeze([\n"
        f"    {h}\n"
        "    ]),\n"
        "    diagnosticHints: Object.freeze([\n"
        f"    {d}\n"
        "    ]),\n"
        "  });\n"
    )


def validate_baseline() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    product = manifest.get('productVersion')
    if product == TARGET_VERSION:
        return
    if product != BASE_VERSION:
        raise SystemExit(f'5.94 baseline Product mismatch: {product}')
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if bridge.get('requiredVersion') != TARGET_ENGINE or bridge.get('sha256') != BASE_ENGINE_SHA:
        raise SystemExit('5.94 baseline Engine authority mismatch')
    if manager.get('version') != TARGET_MANAGER or manager.get('productVersion') != BASE_VERSION:
        raise SystemExit('5.94 baseline Manager identity mismatch')
    if manager.get('sha256') != BASE_MANAGER_SHA:
        raise SystemExit('5.94 baseline Manager artifact mismatch')
    if manager.get('bootstrapSha256') != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.94 baseline bootstrap manifest mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.94 baseline contracts mismatch')
    if sha256(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.94 baseline Engine bytes diverged from deployed 5.93')
    if sha256(MANAGER) != BASE_MANAGER_SHA:
        raise SystemExit('5.94 baseline Manager bytes diverged from deployed 5.93')
    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.94 baseline bootstrap bytes diverged from deployed 5.93')
    core = CORE.read_text(encoding='utf-8')
    for marker in [
        '//@version 3.0.0-alpha.5.93',
        "const VERSION = '3.0.0-alpha.5.93';",
        "const REQUIRED_BRIDGE_VERSION = '1.6.30';",
        "const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.4';",
    ]:
        if marker not in core:
            raise SystemExit(f'5.94 baseline Plugin marker missing: {marker}')
    manager_text = MANAGER.read_text(encoding='utf-8')
    for marker in [
        "const MANAGER_VERSION = '1.3.4';",
        "const PRODUCT_VERSION = '3.0.0-alpha.5.93';",
        "const BUNDLED_ENGINE_VERSION = '1.6.30';",
        f"const BUNDLED_ENGINE_SHA256 = '{BASE_ENGINE_SHA}';",
        "const MANAGED_CLI_VERSION = '1.10.0';",
    ]:
        if marker not in manager_text:
            raise SystemExit(f'5.94 baseline Manager marker missing: {marker}')
    for marker in ['devpass-cycle-summary', 'billing-cycle-truth-strip', 'premium-allowance-card', 'paygAccountTruth(devpassAccount)']:
        if marker not in DASHBOARD.read_text(encoding='utf-8'):
            raise SystemExit(f'5.94 baseline dashboard invariant missing: {marker}')


def apply_identity_and_release_notes(title, highlights, hints) -> None:
    replace_once_or_target(CORE, '//@version 3.0.0-alpha.5.93', '//@version 3.0.0-alpha.5.94', '5.94 plugin header version')
    replace_once_or_target(CORE, "  const VERSION = '3.0.0-alpha.5.93';", "  const VERSION = '3.0.0-alpha.5.94';", '5.94 plugin runtime version')
    text = CORE.read_text(encoding='utf-8')
    notes = release_notes_constant(title, highlights, hints)
    start = text.find('  const RELEASE_NOTES = Object.freeze({')
    end = text.find('  const UPDATE_URL =', start)
    if start < 0 or end <= start:
        raise SystemExit('5.94 static release notes boundary missing')
    if text[start:end] != notes:
        CORE.write_text(text[:start] + notes + text[end:], encoding='utf-8')


COST_DRIVER_HELPER = r'''
  function costDriverMeaningfulName(value) {
    const name = value === null || value === undefined ? '' : String(value).trim();
    return !name || name.toLowerCase() === 'unknown' ? '' : name;
  }

  function costDriverCodePointCompare(left, right) {
    const a = Array.from(String(left || ''));
    const b = Array.from(String(right || ''));
    const length = Math.max(a.length, b.length);
    for (let index = 0; index < length; index += 1) {
      if (index >= a.length) return -1;
      if (index >= b.length) return 1;
      const ac = a[index].codePointAt(0);
      const bc = b[index].codePointAt(0);
      if (ac !== bc) return ac - bc;
    }
    return 0;
  }

  function costDriverLeader(rows, totalCost) {
    const source = Array.isArray(rows) ? rows : [];
    if (!source.length) return Object.freeze({name:null,cost:null,share:null,state:'source-unavailable',shareState:'total-unknown'});
    let positiveCostRows = 0;
    const candidates = [];
    for (const row of source) {
      const cost = typeof row?.cost === 'number' && Number.isFinite(row.cost) ? Number(row.cost) : null;
      if (!(cost > 0)) continue;
      positiveCostRows += 1;
      const name = costDriverMeaningfulName(row?.name);
      if (!name) continue;
      candidates.push({name,cost});
    }
    if (!candidates.length) {
      return Object.freeze({
        name:null,
        cost:null,
        share:null,
        state:positiveCostRows > 0 ? 'name-unavailable' : 'no-positive-cost',
        shareState:'total-unknown',
      });
    }
    const ranked = candidates.slice().sort((left, right) => {
      if (right.cost !== left.cost) return right.cost - left.cost;
      return costDriverCodePointCompare(left.name, right.name);
    });
    const leader = ranked[0];
    const total = typeof totalCost === 'number' && Number.isFinite(totalCost) && totalCost > 0 ? Number(totalCost) : null;
    const share = total !== null && total >= leader.cost ? leader.cost / total * 100 : null;
    return Object.freeze({
      name:leader.name,
      cost:leader.cost,
      share,
      state:'ok',
      shareState:share === null ? 'total-unknown' : 'ok',
    });
  }

  function compactCostDriverTruth(window) {
    const value = window && typeof window === 'object' ? window : null;
    const totalCost = value?.totalCost;
    return Object.freeze({
      model:costDriverLeader(value?.models, totalCost),
      provider:costDriverLeader(value?.providers, totalCost),
    });
  }

  function costDriverDiagnosticText(scope, window) {
    const scopeKey = ['all','devpass','credits'].includes(String(scope)) ? String(scope) : 'all';
    const truth = compactCostDriverTruth(window);
    const format = row => {
      if (!row?.name) return `— (${row?.state || 'source-unavailable'})`;
      const share = row.share === null ? ` · share — (${row.shareState})` : ` · share ${Number(row.share).toFixed(1)}%`;
      return `${row.name} $${Number(row.cost).toFixed(4)}${share}`;
    };
    return `Cost drivers: scope ${scopeKey} · window 24h · model ${format(truth.model)} · provider ${format(truth.provider)} · fidelity positive-cost-only`;
  }

'''


def apply_cost_driver_helper() -> None:
    text = ANALYTICS.read_text(encoding='utf-8')
    if 'function compactCostDriverTruth(window)' in text:
        return
    anchor = '\n  function normalize(payload) {'
    if text.count(anchor) != 1:
        raise SystemExit(f'5.94 cost-driver helper anchor mismatch: {text.count(anchor)}')
    ANALYTICS.write_text(text.replace(anchor, '\n' + COST_DRIVER_HELPER + '  function normalize(payload) {', 1), encoding='utf-8')


def apply_dashboard_context() -> None:
    text = DASHBOARD.read_text(encoding='utf-8')
    old = """    const scopeTopProvider = Array.isArray(scopeActivity?.providers) && scopeActivity.providers[0]?.name ? String(scopeActivity.providers[0].name) : '—';
    const scopeTopModel = Array.isArray(scopeActivity?.models) && scopeActivity.models[0]?.name ? String(scopeActivity.models[0].name) : '—';
"""
    new = """    const scopeCostDrivers = compactCostDriverTruth(scopeActivity);
    const costDriverUiText = row => row?.name ? `${row.name} · ${money(row.cost,4)}${row.share === null ? '' : ` · ${Number(row.share).toFixed(1)}%`}` : '—';
    const scopeTopProvider = costDriverUiText(scopeCostDrivers.provider);
    const scopeTopModel = costDriverUiText(scopeCostDrivers.model);
"""
    if new not in text:
        if text.count(old) != 1:
            raise SystemExit(f'5.94 usage Top shortcut anchor mismatch: {text.count(old)}')
        text = text.replace(old, new, 1)
    DASHBOARD.write_text(text, encoding='utf-8')


def apply_analytics_context() -> None:
    text = ANALYTICS_CONTEXT.read_text(encoding='utf-8')
    old = """    const analyticsTopProvider = Array.isArray(analyticsW24?.providers) && analyticsW24.providers[0]?.name ? String(analyticsW24.providers[0].name) : '—';
    const analyticsTopModel = Array.isArray(analyticsW24?.models) && analyticsW24.models[0]?.name ? String(analyticsW24.models[0].name) : '—';
"""
    new = """    const analyticsCostDrivers = compactCostDriverTruth(analyticsW24);
    const analyticsTopProvider = costDriverUiText(analyticsCostDrivers.provider);
    const analyticsTopModel = costDriverUiText(analyticsCostDrivers.model);
"""
    if new not in text:
        if text.count(old) != 1:
            raise SystemExit(f'5.94 Analytics Top shortcut anchor mismatch: {text.count(old)}')
        text = text.replace(old, new, 1)
    ANALYTICS_CONTEXT.write_text(text, encoding='utf-8')


def apply_markup() -> None:
    text = MARKUP.read_text(encoding='utf-8')
    css_old = '.mini b{display:block;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    css_new = css_old + '.mini.cost-driver b{white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere}'
    if css_new not in text:
        if text.count(css_old) != 1:
            raise SystemExit(f'5.94 cost-driver CSS anchor mismatch: {text.count(css_old)}')
        text = text.replace(css_old, css_new, 1)
    replacements = [
        ('<div class="mini"><span>Top Provider</span><b>${esc(scopeTopProvider)}</b></div>', '<div class="mini cost-driver"><span>24h 비용 주도 · Top Provider</span><b>${esc(scopeTopProvider)}</b></div>'),
        ('<div class="mini"><span>Top Model</span><b>${esc(scopeTopModel)}</b></div>', '<div class="mini cost-driver"><span>24h 비용 주도 · Top Model</span><b>${esc(scopeTopModel)}</b></div>'),
        ('<div class="mini"><span>Top Model</span><b>${esc(analyticsTopModel)}</b></div>', '<div class="mini cost-driver"><span>24h 비용 주도 · Top Model</span><b>${esc(analyticsTopModel)}</b></div>'),
        ('<div class="mini"><span>Top Provider</span><b>${esc(analyticsTopProvider)}</b></div>', '<div class="mini cost-driver"><span>24h 비용 주도 · Top Provider</span><b>${esc(analyticsTopProvider)}</b></div>'),
    ]
    for old, new in replacements:
        if new not in text:
            if text.count(old) != 1:
                raise SystemExit(f'5.94 cost-driver markup anchor mismatch: {old} count={text.count(old)}')
            text = text.replace(old, new, 1)
    MARKUP.write_text(text, encoding='utf-8')


def apply_diagnostics() -> None:
    text = DIAGNOSTICS.read_text(encoding='utf-8')
    binding = """    const diagAnalyticsScopeKey = ['all','devpass','credits'].includes(String(state.analyticsScopeView)) ? String(state.analyticsScopeView) : 'all';
    const diagAnalyticsBundle = d.analyticsScopes?.scopes?.[diagAnalyticsScopeKey] || (diagAnalyticsScopeKey === 'all' ? d.analytics : null) || null;
    const diagAnalyticsW24 = diagAnalyticsBundle?.windows?.['24h'] || d.usageScopes?.scopes?.[diagAnalyticsScopeKey] || null;
"""
    if 'const diagAnalyticsScopeKey =' not in text:
        anchor = "    const diagAccount = d.devpassAccount && typeof d.devpassAccount === 'object' ? d.devpassAccount : null;\n"
        if text.count(anchor) != 1:
            raise SystemExit(f'5.94 diagnostics binding anchor mismatch: {text.count(anchor)}')
        text = text.replace(anchor, anchor + binding, 1)
    line = '      costDriverDiagnosticText(diagAnalyticsScopeKey, diagAnalyticsW24),\n'
    if line not in text:
        anchor = '      devpassCycleSummaryDiagnosticText(devpassCycleSummaryTruth(diagAccount, d.analyticsScopes?.scopes?.devpass)),\n'
        if text.count(anchor) != 1:
            raise SystemExit(f'5.94 diagnostics line anchor mismatch: {text.count(anchor)}')
        text = text.replace(anchor, anchor + line, 1)
    DIAGNOSTICS.write_text(text, encoding='utf-8')


def patch_manager() -> None:
    text = MANAGER.read_text(encoding='utf-8')
    old = "const PRODUCT_VERSION = '3.0.0-alpha.5.93';"
    new = "const PRODUCT_VERSION = '3.0.0-alpha.5.94';"
    if new not in text:
        if text.count(old) != 1:
            raise SystemExit(f'5.94 Manager Product marker mismatch: {text.count(old)}')
        text = text.replace(old, new, 1)
    for marker in [
        "const MANAGER_VERSION = '1.3.4';",
        "const BUNDLED_ENGINE_VERSION = '1.6.30';",
        f"const BUNDLED_ENGINE_SHA256 = '{BASE_ENGINE_SHA}';",
        "const MANAGED_CLI_VERSION = '1.10.0';",
    ]:
        if marker not in text:
            raise SystemExit(f'5.94 Manager invariant changed: {marker}')
    MANAGER.write_text(text, encoding='utf-8')


def sync_release_memory() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    current_re = re.compile(r'Current release implementation: `[^`]+`\.', re.M)
    if TARGET_RELEASE_MEMORY not in text:
        text, count = current_re.subn(TARGET_RELEASE_MEMORY, text, count=1)
        if count != 1:
            raise SystemExit('5.94 current release memory marker missing')
    verified_baseline = str(load_spec().get('verifiedBaseline') or '').strip()
    if not verified_baseline.startswith('Last verified real-device baseline: `') or not verified_baseline.endswith('`'):
        raise SystemExit('5.94 verified baseline missing or malformed')
    baseline_re = re.compile(r'^Last verified real-device baseline: `[^`]+`\.?$', re.M)
    target_baseline = verified_baseline + '.'
    if target_baseline not in text:
        text, count = baseline_re.subn(target_baseline, text, count=1)
        if count != 1:
            raise SystemExit(f'5.94 verified baseline marker mismatch: {count}')
    GUIDELINES.write_text(text, encoding='utf-8')


def sync_manifest() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['productVersion'] = TARGET_VERSION
    manifest['components']['plugin']['version'] = TARGET_VERSION
    manifest['components']['bridge']['requiredVersion'] = TARGET_ENGINE
    manifest['components']['bridge']['sha256'] = BASE_ENGINE_SHA
    manifest['components']['bridgeManager']['version'] = TARGET_MANAGER
    manifest['components']['bridgeManager']['productVersion'] = TARGET_VERSION
    manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
    manifest['components']['bridgeManager']['bootstrapSha256'] = BASE_BOOTSTRAP_SHA
    manifest['contracts'] = {'snapshot': 1, 'recentRequest': 1}
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def validate_target() -> None:
    core = CORE.read_text(encoding='utf-8')
    manager = MANAGER.read_text(encoding='utf-8')
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    if sha256(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.94 Engine exact-byte preservation failed')
    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.94 bootstrap exact-byte preservation failed')
    for marker in [
        '//@version 3.0.0-alpha.5.94',
        "const VERSION = '3.0.0-alpha.5.94';",
        "const REQUIRED_BRIDGE_VERSION = '1.6.30';",
        "const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.4';",
    ]:
        if marker not in core:
            raise SystemExit(f'5.94 Plugin target marker missing: {marker}')
    for marker in [
        "const MANAGER_VERSION = '1.3.4';",
        "const PRODUCT_VERSION = '3.0.0-alpha.5.94';",
        "const BUNDLED_ENGINE_VERSION = '1.6.30';",
        f"const BUNDLED_ENGINE_SHA256 = '{BASE_ENGINE_SHA}';",
        "const MANAGED_CLI_VERSION = '1.10.0';",
    ]:
        if marker not in manager:
            raise SystemExit(f'5.94 Manager target marker missing: {marker}')
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.94 manifest Product mismatch')
    if manifest.get('components', {}).get('plugin', {}).get('version') != TARGET_VERSION:
        raise SystemExit('5.94 manifest Plugin version mismatch')
    if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.94 manifest Engine version mismatch')
    if manifest.get('components', {}).get('bridge', {}).get('sha256') != BASE_ENGINE_SHA:
        raise SystemExit('5.94 manifest Engine hash mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
        raise SystemExit('5.94 manifest Manager semantic mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.94 manifest Manager Product mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('sha256') != sha256(MANAGER):
        raise SystemExit('5.94 manifest Manager hash mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('bootstrapSha256') != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.94 manifest bootstrap hash mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.94 contracts changed')


spec = load_spec()
validate_authority(spec)
title, highlights, hints = load_release_notes()
validate_baseline()
old_plugin_bytes = LATEST.stat().st_size
old_engine_bytes = ENGINE.stat().st_size
old_manager_bytes = MANAGER.stat().st_size

apply_identity_and_release_notes(title, highlights, hints)
apply_cost_driver_helper()
apply_dashboard_context()
apply_analytics_context()
apply_markup()
apply_diagnostics()
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--check')
if sha256(ENGINE) != BASE_ENGINE_SHA:
    raise SystemExit('5.94 Engine changed despite plugin-only design')
patch_manager()
sync_release_memory()
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
sync_manifest()
run('node', '--check', str(LATEST))
run('node', '--check', str(MANAGER))
run('node', '--check', str(ENGINE))
validate_target()

print(
    f'5.94 materialized: plugin {old_plugin_bytes}->{LATEST.stat().st_size} bytes; '
    f'Engine {old_engine_bytes}->{ENGINE.stat().st_size} bytes exact {TARGET_ENGINE} SHA {BASE_ENGINE_SHA}; '
    f'Manager {old_manager_bytes}->{MANAGER.stat().st_size} bytes semantic {TARGET_MANAGER} Product {BASE_VERSION}->{TARGET_VERSION}; '
    f'managed CLI {TARGET_CLI}; contracts 1/1; bootstrap exact-byte {BASE_BOOTSTRAP_SHA}; positive-cost-only cost drivers'
)
