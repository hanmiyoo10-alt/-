from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
TOOLS = ROOT / 'tools'
SPEC = Path('.github/usage-dashboard/releases/5.91.json')

CORE = SRC / '00-runtime-core.part.js'
PREMIUM = SRC / '18-premium-allowance.part.js'
PARTS = SRC / 'parts.cjs'
DIAGNOSTICS = SRC / '40-diagnostics.part.js'
DASHBOARD = SRC / '50-dashboard-context.part.js'
ENGINE = RUNTIME / 'bridge-engine.mjs'
ENGINE_SOURCE = ROOT / 'runtime-src' / 'bridge-engine' / '00-core.part.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
LATEST = ROOT / 'latest.js'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')

BASE_VERSION = '3.0.0-alpha.5.90'
TARGET_VERSION = '3.0.0-alpha.5.91'
TARGET_ENGINE = '1.6.28'
TARGET_MANAGER = '1.3.4'
TARGET_CLI = '1.10.0'
TARGET_RELEASE_TITLE = 'DevPass Weekly Premium Allowance Truth Card'
TARGET_RELEASE_MEMORY = f'Current release implementation: `{TARGET_VERSION} — {TARGET_RELEASE_TITLE}`.'
TARGET_VERIFIED_BASELINE = 'Last verified real-device baseline: `3.0.0-alpha.5.89 — READY on managed @llmgateway/cli 1.10.0`'
BASE_ENGINE_SHA = '803a8c2ee45ced2681ff7f3bf5e9db65059f8012999fff5c9a81e806b49f4b4b'
BASE_MANAGER_SHA = '2a6403e7298580ebdfec798c4c9f56d9cbf71abf4e40fca85e5eeb9e7c4bd747'
BASE_BOOTSTRAP_SHA = '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c'
AUTHORITY_TAG_COMMIT = '6b1cda1988f32010a9b090c00eb9b2fe672145fe'


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(*args: str) -> None:
    subprocess.run(list(args), check=True)


def replace_once_or_target(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one source match, found {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def load_spec():
    return json.loads(SPEC.read_text(encoding='utf-8'))


def validate_authority(spec) -> None:
    value = spec.get('managedCliAuthority')
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
    if not isinstance(value, dict):
        raise SystemExit('5.91 managed CLI authority missing')
    for key, expected_value in expected.items():
        if value.get(key) != expected_value:
            raise SystemExit(f'5.91 managed CLI authority {key} mismatch: {value.get(key)!r}')


def load_release_notes():
    spec = load_spec()
    validate_authority(spec)
    expected = {
        'productVersion': TARGET_VERSION,
        'engineVersion': TARGET_ENGINE,
        'managerVersion': TARGET_MANAGER,
        'managedCliVersion': TARGET_CLI,
        'verifiedBaseline': TARGET_VERIFIED_BASELINE,
        'materializer': 'plugins/usage-dashboard/tools/release_premium_allowance_truth_card_591.py',
    }
    for key, value in expected.items():
        if spec.get(key) != value:
            raise SystemExit(f'5.91 release spec {key} mismatch')
    if spec.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.91 release spec contracts changed from 1/1')
    title = spec.get('releaseTitle')
    highlights = spec.get('highlights')
    hints = spec.get('diagnosticHints')
    if title != TARGET_RELEASE_TITLE:
        raise SystemExit('5.91 release title mismatch')
    for key, value in [('highlights', highlights), ('diagnosticHints', hints)]:
        if not isinstance(value, list) or not 1 <= len(value) <= 5:
            raise SystemExit(f'5.91 {key} must contain 1..5 items')
        if any(not isinstance(item, str) or not item.strip() or len(item) > 180 for item in value):
            raise SystemExit(f'5.91 {key} items must be non-empty bounded strings')
    return title, [x.strip() for x in highlights], [x.strip() for x in hints]


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
        validate_target()
        return
    if product != BASE_VERSION:
        raise SystemExit(f'5.91 baseline Product mismatch: {product}')
    if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.91 baseline Engine version mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
        raise SystemExit('5.91 baseline Manager semantic version mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.91 baseline contracts mismatch')
    if sha256(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.91 baseline Engine artifact diverged from deployed 5.90')
    if sha256(MANAGER) != BASE_MANAGER_SHA:
        raise SystemExit('5.91 baseline Manager artifact diverged from deployed 5.90')
    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.91 baseline bootstrap diverged from deployed 5.90')

    core = CORE.read_text(encoding='utf-8')
    manager = MANAGER.read_text(encoding='utf-8')
    engine_source = ENGINE_SOURCE.read_text(encoding='utf-8')
    parts = PARTS.read_text(encoding='utf-8')
    premium = PREMIUM.read_text(encoding='utf-8')
    for marker in [
        "//@version 3.0.0-alpha.5.90",
        "const VERSION = '3.0.0-alpha.5.90';",
        "const REQUIRED_BRIDGE_VERSION = '1.6.28';",
        "const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.4';",
    ]:
        if marker not in core:
            raise SystemExit(f'5.91 baseline Plugin marker missing: {marker}')
    for marker in [
        "const MANAGER_VERSION = '1.3.4';",
        "const PRODUCT_VERSION = '3.0.0-alpha.5.90';",
        "const BUNDLED_ENGINE_VERSION = '1.6.28';",
        f"const BUNDLED_ENGINE_SHA256 = '{BASE_ENGINE_SHA}';",
        "const MANAGED_CLI_VERSION = '1.10.0';",
    ]:
        if marker not in manager:
            raise SystemExit(f'5.91 baseline Manager marker missing: {marker}')
    if "const VERSION = '1.6.28';" not in engine_source:
        raise SystemExit('5.91 baseline Engine source version mismatch')
    if "const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';" not in engine_source:
        raise SystemExit('5.91 baseline Engine CLI pin mismatch')
    if "18-premium-allowance.part.js" not in parts or 'function premiumAllowanceTruth(weekly)' not in premium:
        raise SystemExit('5.91 Premium allowance source registration missing')


def apply_identity_and_release_notes(title, highlights, hints) -> None:
    replace_once_or_target(CORE, '//@version 3.0.0-alpha.5.90', '//@version 3.0.0-alpha.5.91', '5.91 plugin header version')
    replace_once_or_target(CORE, "  const VERSION = '3.0.0-alpha.5.90';", "  const VERSION = '3.0.0-alpha.5.91';", '5.91 plugin runtime version')
    text = CORE.read_text(encoding='utf-8')
    notes = release_notes_constant(title, highlights, hints)
    start = text.find('  const RELEASE_NOTES = Object.freeze({')
    end = text.find('  const UPDATE_URL =', start)
    if start < 0 or end <= start:
        raise SystemExit('5.91 static release notes boundary missing')
    if text[start:end] != notes:
        CORE.write_text(text[:start] + notes + text[end:], encoding='utf-8')


def apply_premium_card() -> None:
    dashboard = DASHBOARD.read_text(encoding='utf-8')
    allowance_line = "    const premiumAllowance = premiumAllowanceTruth(d.weekly);\n"
    if allowance_line not in dashboard:
        anchor = "    const devpassAccount = d.devpassAccount && typeof d.devpassAccount === 'object' ? d.devpassAccount : null;\n"
        if dashboard.count(anchor) != 1:
            raise SystemExit('5.91 dashboard allowance binding anchor mismatch')
        dashboard = dashboard.replace(anchor, anchor + allowance_line, 1)

    card = '''          <div class="usage-detail-box premium-allowance-card"><div class="recent-head"><h3>Premium 주간 한도</h3><span>${esc(premiumAllowance.stateLabel)}</span></div><div class="minis">
            <div class="mini purple"><span>사용</span><b>${premiumAllowance.used === null ? '—' : money(premiumAllowance.used)}</b></div>
            <div class="mini purple"><span>한도</span><b>${premiumAllowance.limit === null ? '—' : money(premiumAllowance.limit)}</b></div>
            <div class="mini purple"><span>남음</span><b>${premiumAllowance.remaining === null ? '—' : money(premiumAllowance.remaining)}</b></div>
            <div class="mini purple"><span>사용률</span><b>${premiumAllowance.percentUsed === null ? '—' : `${premiumAllowance.percentUsed.toFixed(1)}%`}</b></div>
            <div class="mini"><span>리셋</span><b>${premiumAllowance.resetAt ? remainingTimeForDashboard(premiumAllowance.resetAt) : '—'}</b></div>
          </div></div>
'''
    billing = '          <div class="usage-detail-box billing-cycle-truth-strip">'
    if 'class="usage-detail-box premium-allowance-card"' not in dashboard:
        if dashboard.count(billing) != 1:
            raise SystemExit('5.91 Premium card placement anchor mismatch')
        dashboard = dashboard.replace(billing, card + billing, 1)
    DASHBOARD.write_text(dashboard, encoding='utf-8')


def apply_premium_diagnostics() -> None:
    diagnostics = DIAGNOSTICS.read_text(encoding='utf-8')
    line = '      premiumAllowanceDiagnosticText(d.weekly),\n'
    if line in diagnostics:
        return
    anchor = "      `DevPass billing period: plan ${diagAccount && String(diagAccount.plan || '').trim() && String(diagAccount.plan).toLowerCase() !== 'none' ? String(diagAccount.plan) : '—'} · cycle ${typeof diagAccount?.cycle === 'string' && diagAccount.cycle.trim() ? diagAccount.cycle.trim() : '—'} · start ${dashboardDateText(diagAccount?.billingCycleStart, true)} · end ${dashboardDateText(diagAccount?.expiresAt, true)} · cancelled ${typeof diagAccount?.cancelled === 'boolean' ? (diagAccount.cancelled ? 'yes' : 'no') : 'unknown'}`,\n"
    if diagnostics.count(anchor) != 1:
        raise SystemExit('5.91 Premium diagnostics anchor mismatch')
    diagnostics = diagnostics.replace(anchor, anchor + line, 1)
    DIAGNOSTICS.write_text(diagnostics, encoding='utf-8')


def patch_manager_product_identity() -> None:
    text = MANAGER.read_text(encoding='utf-8')
    old = "const PRODUCT_VERSION = '3.0.0-alpha.5.90';"
    new = "const PRODUCT_VERSION = '3.0.0-alpha.5.91';"
    if new not in text:
        if text.count(old) != 1:
            raise SystemExit(f'5.91 Manager Product identity marker mismatch: {text.count(old)}')
        text = text.replace(old, new, 1)
    for marker in [
        "const MANAGER_VERSION = '1.3.4';",
        "const BUNDLED_ENGINE_VERSION = '1.6.28';",
        f"const BUNDLED_ENGINE_SHA256 = '{BASE_ENGINE_SHA}';",
        "const MANAGED_CLI_VERSION = '1.10.0';",
    ]:
        if marker not in text:
            raise SystemExit(f'5.91 Manager invariant changed: {marker}')
    MANAGER.write_text(text, encoding='utf-8')


def sync_release_memory() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    if TARGET_VERIFIED_BASELINE not in text:
        raise SystemExit('5.91 verified physical baseline unexpectedly changed')
    current_re = re.compile(r'Current release implementation: `[^`]+`\.', re.M)
    if TARGET_RELEASE_MEMORY not in text:
        text, count = current_re.subn(TARGET_RELEASE_MEMORY, text, count=1)
        if count != 1:
            raise SystemExit('5.91 current release memory marker missing')
    GUIDELINES.write_text(text, encoding='utf-8')


def sync_manifest_hashes() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['productVersion'] = TARGET_VERSION
    manifest['components']['plugin']['version'] = TARGET_VERSION
    manifest['components']['bridge']['requiredVersion'] = TARGET_ENGINE
    manifest['components']['bridge']['sha256'] = sha256(ENGINE)
    manifest['components']['bridgeManager']['version'] = TARGET_MANAGER
    manifest['components']['bridgeManager']['productVersion'] = TARGET_VERSION
    manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
    manifest['components']['bridgeManager']['bootstrapSha256'] = sha256(BOOTSTRAP)
    manifest['contracts'] = {'snapshot': 1, 'recentRequest': 1}
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def validate_target() -> None:
    spec = load_spec()
    validate_authority(spec)
    core = CORE.read_text(encoding='utf-8')
    premium = PREMIUM.read_text(encoding='utf-8')
    dashboard = DASHBOARD.read_text(encoding='utf-8')
    diagnostics = DIAGNOSTICS.read_text(encoding='utf-8')
    manager = MANAGER.read_text(encoding='utf-8')
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    guidelines = GUIDELINES.read_text(encoding='utf-8')

    if sha256(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.91 Engine exact-byte preservation failed')
    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.91 bootstrap exact-byte preservation failed')
    for marker in [
        "//@version 3.0.0-alpha.5.91",
        "const VERSION = '3.0.0-alpha.5.91';",
        "const REQUIRED_BRIDGE_VERSION = '1.6.28';",
        "const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.4';",
    ]:
        if marker not in core:
            raise SystemExit(f'5.91 Plugin target marker missing: {marker}')
    for marker in [
        'function premiumAllowanceTruth(weekly)',
        'value >= 0',
        'value > 0',
        'Math.max(0, limit - used)',
        '(used / limit) * 100',
        'Math.min(100, Math.max(0, percentUsed))',
        "percentUsed >= 100",
        "percentUsed >= 80",
    ]:
        if marker not in premium:
            raise SystemExit(f'5.91 Premium helper marker missing: {marker}')
    if dashboard.count('class="usage-detail-box premium-allowance-card"') != 1:
        raise SystemExit('5.91 Premium card count mismatch')
    if dashboard.find('Reset Pass · PAYG') >= dashboard.find('Premium 주간 한도') or dashboard.find('Premium 주간 한도') >= dashboard.find('Billing Cycle'):
        raise SystemExit('5.91 Premium card placement mismatch')
    for label in ['사용</span>', '한도</span>', '남음</span>', '사용률</span>', '리셋</span>']:
        if label not in dashboard:
            raise SystemExit(f'5.91 Premium card field missing: {label}')
    if 'premiumAllowanceDiagnosticText(d.weekly)' not in diagnostics:
        raise SystemExit('5.91 Premium diagnostics line missing')
    for marker in [
        "const MANAGER_VERSION = '1.3.4';",
        "const PRODUCT_VERSION = '3.0.0-alpha.5.91';",
        "const BUNDLED_ENGINE_VERSION = '1.6.28';",
        f"const BUNDLED_ENGINE_SHA256 = '{BASE_ENGINE_SHA}';",
        "const MANAGED_CLI_VERSION = '1.10.0';",
    ]:
        if marker not in manager:
            raise SystemExit(f'5.91 Manager target marker missing: {marker}')
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.91 manifest Product mismatch')
    if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.91 manifest Engine version mismatch')
    if manifest.get('components', {}).get('bridge', {}).get('sha256') != BASE_ENGINE_SHA:
        raise SystemExit('5.91 manifest Engine hash mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
        raise SystemExit('5.91 manifest Manager semantic version mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.91 manifest Manager Product mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('sha256') != sha256(MANAGER):
        raise SystemExit('5.91 manifest Manager hash mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('bootstrapSha256') != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.91 manifest bootstrap hash mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.91 contracts changed')
    if TARGET_RELEASE_MEMORY not in guidelines or TARGET_VERIFIED_BASELINE not in guidelines:
        raise SystemExit('5.91 durable release memory mismatch')


spec = load_spec()
validate_authority(spec)
title, highlights, hints = load_release_notes()
validate_baseline()
old_plugin_bytes = LATEST.stat().st_size
old_engine_bytes = ENGINE.stat().st_size
old_manager_bytes = MANAGER.stat().st_size

apply_identity_and_release_notes(title, highlights, hints)
apply_premium_card()
apply_premium_diagnostics()
patch_manager_product_identity()
sync_release_memory()
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--check')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
sync_manifest_hashes()
run('node', '--check', str(LATEST))
run('node', '--check', str(MANAGER))
run('node', '--check', str(ENGINE))
validate_target()

print(
    f'5.91 materialized: plugin {old_plugin_bytes}->{LATEST.stat().st_size} bytes; '
    f'Engine exact-byte {old_engine_bytes}->{ENGINE.stat().st_size} bytes {TARGET_ENGINE} SHA {sha256(ENGINE)}; '
    f'Manager {old_manager_bytes}->{MANAGER.stat().st_size} bytes semantic {TARGET_MANAGER} Product {BASE_VERSION}->{TARGET_VERSION}; '
    f'managed CLI {TARGET_CLI}; contracts 1/1'
)
