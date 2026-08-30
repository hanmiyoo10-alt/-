from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
ENGINE_SRC = ROOT / 'runtime-src' / 'bridge-engine'
TOOLS = ROOT / 'tools'
SPEC = Path('.github/usage-dashboard/releases/5.92.json')

CORE = SRC / '00-runtime-core.part.js'
NORMALIZE = SRC / '16-usage-analytics.part.js'
PAYG = SRC / '19-payg-account.part.js'
PARTS = SRC / 'parts.cjs'
DIAGNOSTICS = SRC / '40-diagnostics.part.js'
DASHBOARD = SRC / '50-dashboard-context.part.js'
ENGINE_CORE = ENGINE_SRC / '00-core.part.mjs'
ENGINE_SOURCES = ENGINE_SRC / '40-sources.part.mjs'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
LATEST = ROOT / 'latest.js'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')

BASE_VERSION = '3.0.0-alpha.5.91'
TARGET_VERSION = '3.0.0-alpha.5.92'
BASE_ENGINE = '1.6.28'
TARGET_ENGINE = '1.6.29'
TARGET_MANAGER = '1.3.4'
TARGET_CLI = '1.10.0'
TARGET_RELEASE_TITLE = 'PAYG + Auto-Reload Read-Only Fidelity'
TARGET_RELEASE_MEMORY = f'Current release implementation: `{TARGET_VERSION} — {TARGET_RELEASE_TITLE}`.'
BASE_ENGINE_SHA = '803a8c2ee45ced2681ff7f3bf5e9db65059f8012999fff5c9a81e806b49f4b4b'
BASE_MANAGER_SHA = '8e17589618fc7f915bbdf818d62eef58d7ed9831867d9f8ee82bedd943165d9b'
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
        raise SystemExit('5.92 managed CLI authority missing')
    for key, expected_value in expected.items():
        if value.get(key) != expected_value:
            raise SystemExit(f'5.92 managed CLI authority {key} mismatch: {value.get(key)!r}')


def load_release_notes():
    spec = load_spec()
    validate_authority(spec)
    expected = {
        'productVersion': TARGET_VERSION,
        'engineVersion': TARGET_ENGINE,
        'managerVersion': TARGET_MANAGER,
        'managedCliVersion': TARGET_CLI,
        'materializer': 'plugins/usage-dashboard/tools/release_payg_autoreload_fidelity_592.py',
    }
    for key, value in expected.items():
        if spec.get(key) != value:
            raise SystemExit(f'5.92 release spec {key} mismatch')
    if spec.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.92 release spec contracts changed from 1/1')
    if spec.get('releaseTitle') != TARGET_RELEASE_TITLE:
        raise SystemExit('5.92 release title mismatch')
    highlights = spec.get('highlights')
    hints = spec.get('diagnosticHints')
    for key, value in [('highlights', highlights), ('diagnosticHints', hints)]:
        if not isinstance(value, list) or not 1 <= len(value) <= 5:
            raise SystemExit(f'5.92 {key} must contain 1..5 items')
        if any(not isinstance(item, str) or not item.strip() or len(item) > 180 for item in value):
            raise SystemExit(f'5.92 {key} items must be non-empty bounded strings')
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
        raise SystemExit(f'5.92 baseline Product mismatch: {product}')
    if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != BASE_ENGINE:
        raise SystemExit('5.92 baseline Engine version mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
        raise SystemExit('5.92 baseline Manager semantic version mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.92 baseline contracts mismatch')
    if sha256(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.92 baseline Engine artifact diverged from deployed 5.91')
    if sha256(MANAGER) != BASE_MANAGER_SHA:
        raise SystemExit('5.92 baseline Manager artifact diverged from deployed 5.91')
    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.92 baseline bootstrap diverged from deployed 5.91')
    for marker in [
        "//@version 3.0.0-alpha.5.91",
        "const VERSION = '3.0.0-alpha.5.91';",
        "const REQUIRED_BRIDGE_VERSION = '1.6.28';",
        "const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.4';",
    ]:
        if marker not in CORE.read_text(encoding='utf-8'):
            raise SystemExit(f'5.92 baseline Plugin marker missing: {marker}')
    if "const VERSION = '1.6.28';" not in ENGINE_CORE.read_text(encoding='utf-8'):
        raise SystemExit('5.92 baseline Engine source version mismatch')
    if "const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';" not in ENGINE_CORE.read_text(encoding='utf-8'):
        raise SystemExit('5.92 baseline Engine CLI pin mismatch')
    manager = MANAGER.read_text(encoding='utf-8')
    for marker in [
        "const MANAGER_VERSION = '1.3.4';",
        "const PRODUCT_VERSION = '3.0.0-alpha.5.91';",
        "const BUNDLED_ENGINE_VERSION = '1.6.28';",
        f"const BUNDLED_ENGINE_SHA256 = '{BASE_ENGINE_SHA}';",
        "const MANAGED_CLI_VERSION = '1.10.0';",
    ]:
        if marker not in manager:
            raise SystemExit(f'5.92 baseline Manager marker missing: {marker}')
    if 'function paygAccountTruth(account)' not in PAYG.read_text(encoding='utf-8'):
        raise SystemExit('5.92 PAYG helper source missing')
    if "19-payg-account.part.js" not in PARTS.read_text(encoding='utf-8'):
        raise SystemExit('5.92 PAYG helper registry missing')


def apply_identity_and_release_notes(title, highlights, hints) -> None:
    replace_once_or_target(CORE, '//@version 3.0.0-alpha.5.91', '//@version 3.0.0-alpha.5.92', '5.92 plugin header version')
    replace_once_or_target(CORE, "  const VERSION = '3.0.0-alpha.5.91';", "  const VERSION = '3.0.0-alpha.5.92';", '5.92 plugin runtime version')
    replace_once_or_target(CORE, "  const REQUIRED_BRIDGE_VERSION = '1.6.28';", "  const REQUIRED_BRIDGE_VERSION = '1.6.29';", '5.92 Plugin Engine requirement')
    text = CORE.read_text(encoding='utf-8')
    notes = release_notes_constant(title, highlights, hints)
    start = text.find('  const RELEASE_NOTES = Object.freeze({')
    end = text.find('  const UPDATE_URL =', start)
    if start < 0 or end <= start:
        raise SystemExit('5.92 static release notes boundary missing')
    if text[start:end] != notes:
        CORE.write_text(text[:start] + notes + text[end:], encoding='utf-8')


def apply_engine_truth() -> None:
    replace_once_or_target(ENGINE_CORE, "const VERSION = '1.6.28';", "const VERSION = '1.6.29';", '5.92 Engine version')

    text = ENGINE_SOURCES.read_text(encoding='utf-8')
    replacements = [
        (
            "      devPlanPaygEnabled: Boolean(pick(row, ['devPlanPaygEnabled', 'dev_plan_payg_enabled'], false)),",
            "      devPlanPaygEnabled: explicitBillingBoolean(pick(row, ['devPlanPaygEnabled', 'dev_plan_payg_enabled'], null)),\n      devPlanAutoTopUpEnabled: explicitBillingBoolean(pick(row, ['devPlanAutoTopUpEnabled', 'dev_plan_auto_top_up_enabled', 'autoTopUpEnabled', 'auto_top_up_enabled'], null)),\n      devPlanAutoTopUpThreshold: finite(pick(row, ['devPlanAutoTopUpThreshold', 'dev_plan_auto_top_up_threshold', 'autoTopUpThreshold', 'auto_top_up_threshold'], null)),\n      devPlanAutoTopUpAmount: finite(pick(row, ['devPlanAutoTopUpAmount', 'dev_plan_auto_top_up_amount', 'autoTopUpAmount', 'auto_top_up_amount'], null)),",
            '5.92 organization PAYG/Auto-Reload truth',
        ),
        (
            "    paygEnabled: Boolean(pick(raw, ['devPlanPaygEnabled', 'dev_plan_payg_enabled', 'paygEnabled'], false)),",
            "    paygEnabled: explicitBillingBoolean(pick(raw, ['devPlanPaygEnabled', 'dev_plan_payg_enabled', 'paygEnabled'], null)),\n    autoTopUpEnabled: explicitBillingBoolean(pick(raw, ['autoTopUpEnabled', 'auto_top_up_enabled', 'devPlanAutoTopUpEnabled', 'dev_plan_auto_top_up_enabled'], null)),",
            '5.92 independent PAYG/Auto-Reload boolean truth',
        ),
        (
            "    regularCredits: ['regularCredits', 'regular_credits'],\n  };",
            "    regularCredits: ['regularCredits', 'regular_credits'],\n    autoTopUpThreshold: ['autoTopUpThreshold', 'auto_top_up_threshold', 'devPlanAutoTopUpThreshold', 'dev_plan_auto_top_up_threshold'],\n    autoTopUpAmount: ['autoTopUpAmount', 'auto_top_up_amount', 'devPlanAutoTopUpAmount', 'dev_plan_auto_top_up_amount'],\n  };",
            '5.92 independent Auto-Reload scalar truth',
        ),
        (
            "        paygEnabled: Boolean(devOrg.devPlanPaygEnabled),\n        fetchedAt: Date.now(),",
            "        paygEnabled: explicitBillingBoolean(devOrg.devPlanPaygEnabled),\n        autoTopUpEnabled: explicitBillingBoolean(devOrg.devPlanAutoTopUpEnabled),\n        autoTopUpThreshold: finite(devOrg.devPlanAutoTopUpThreshold),\n        autoTopUpAmount: finite(devOrg.devPlanAutoTopUpAmount),\n        fetchedAt: Date.now(),",
            '5.92 compatibility fallback PAYG/Auto-Reload truth',
        ),
    ]
    for old, new, label in replacements:
        if new not in text:
            count = text.count(old)
            if count != 1:
                raise SystemExit(f'{label}: expected exactly one source match, found {count}')
            text = text.replace(old, new, 1)
    ENGINE_SOURCES.write_text(text, encoding='utf-8')


def apply_plugin_truth() -> None:
    text = NORMALIZE.read_text(encoding='utf-8')
    old = "        paygEnabled:ds.paygEnabled === true,\n        hasPersonalOrg:"
    new = "        paygEnabled:typeof ds.paygEnabled === 'boolean' ? ds.paygEnabled : null,\n        autoTopUpEnabled:typeof ds.autoTopUpEnabled === 'boolean' ? ds.autoTopUpEnabled : null,\n        autoTopUpThreshold:num(ds.autoTopUpThreshold) ? Number(ds.autoTopUpThreshold) : null,\n        autoTopUpAmount:num(ds.autoTopUpAmount) ? Number(ds.autoTopUpAmount) : null,\n        hasPersonalOrg:"
    if new not in text:
        if text.count(old) != 1:
            raise SystemExit(f'5.92 Plugin account normalization anchor mismatch: {text.count(old)}')
        text = text.replace(old, new, 1)
    NORMALIZE.write_text(text, encoding='utf-8')


def apply_dashboard() -> None:
    text = DASHBOARD.read_text(encoding='utf-8')
    binding = "    const paygTruth = paygAccountTruth(devpassAccount);\n"
    if binding not in text:
        anchor = "    const premiumAllowance = premiumAllowanceTruth(d.weekly);\n"
        if text.count(anchor) != 1:
            raise SystemExit('5.92 PAYG dashboard binding anchor mismatch')
        text = text.replace(anchor, anchor + binding, 1)

    old = '''          <div class="usage-detail-box"><div class="recent-head"><h3>Reset Pass · PAYG</h3><span>${devpassAccount.paygEnabled ? 'PAYG ON' : 'PAYG OFF'}</span></div><div class="minis">
            <div class="mini purple"><span>총 사용 가능</span><b>${num(d.weekly?.resetPasses) ? `${Number(d.weekly.resetPasses)}장` : 'API 미제공'}</b></div>
            <div class="mini purple"><span>구매/보유 패스</span><b>${num(devpassAccount.resetPasses) ? `${Number(devpassAccount.resetPasses)}장` : '—'}</b></div>
            <div class="mini purple"><span>기본 패스 남음</span><b>${esc(devpassIncludedPassText)}</b></div>
            <div class="mini"><span>Reset Pass 가격</span><b>${money(devpassAccount.resetPassPrice)}</b></div>
            <div class="mini"><span>PAYG overflow</span><b>${devpassAccount.paygEnabled ? '켜짐' : '꺼짐'}</b></div>
            <div class="mini cyan"><span>Regular Credits</span><b>${money(devpassAccount.regularCredits)}</b></div>
          </div></div>
'''
    new = '''          <div class="usage-detail-box"><div class="recent-head"><h3>Reset Pass · PAYG</h3><span>${paygTruth.paygState === 'on' ? 'PAYG ON' : paygTruth.paygState === 'off' ? 'PAYG OFF' : 'PAYG —'}</span></div><div class="minis">
            <div class="mini purple"><span>총 사용 가능</span><b>${num(d.weekly?.resetPasses) ? `${Number(d.weekly.resetPasses)}장` : 'API 미제공'}</b></div>
            <div class="mini purple"><span>구매/보유 패스</span><b>${num(devpassAccount.resetPasses) ? `${Number(devpassAccount.resetPasses)}장` : '—'}</b></div>
            <div class="mini purple"><span>기본 패스 남음</span><b>${esc(devpassIncludedPassText)}</b></div>
            <div class="mini"><span>Reset Pass 가격</span><b>${money(devpassAccount.resetPassPrice)}</b></div>
            <div class="mini"><span>PAYG overflow</span><b>${paygTruth.paygLabel}</b></div>
            <div class="mini cyan"><span>Regular Credits</span><b>${paygTruth.regularCredits === null ? '—' : money(paygTruth.regularCredits)}</b></div>
            <div class="mini"><span>Overflow balance</span><b>${esc(paygTruth.balanceStateLabel)}</b></div>
            <div class="mini"><span>Auto-Reload</span><b>${paygTruth.autoTopUpLabel}</b></div>
            <div class="mini"><span>Reload threshold</span><b>${paygTruth.autoTopUpThreshold === null ? '—' : money(paygTruth.autoTopUpThreshold)}</b></div>
            <div class="mini"><span>Reload amount</span><b>${paygTruth.autoTopUpAmount === null ? '—' : money(paygTruth.autoTopUpAmount)}</b></div>
          </div></div>
'''
    if new not in text:
        if text.count(old) != 1:
            raise SystemExit(f'5.92 Reset Pass/PAYG card anchor mismatch: {text.count(old)}')
        text = text.replace(old, new, 1)
    DASHBOARD.write_text(text, encoding='utf-8')


def apply_diagnostics() -> None:
    text = DIAGNOSTICS.read_text(encoding='utf-8')
    payg_line = '      paygAccountDiagnosticText(diagAccount),\n'
    if payg_line not in text:
        anchor = '      premiumAllowanceDiagnosticText(d.weekly),\n'
        if text.count(anchor) != 1:
            raise SystemExit('5.92 PAYG diagnostics anchor mismatch')
        text = text.replace(anchor, anchor + payg_line, 1)
    old = "      `DevPass account detail: plan ${diagAccount?.plan || '—'} · cycle ${diagAccount?.cycle || '—'} · status ${!diagAccount ? '—' : diagAccount.cancelled ? 'cancelled' : String(diagAccount.plan || 'none') !== 'none' ? 'active' : '—'} · reset total ${num(d.weekly?.resetPasses) ? Number(d.weekly.resetPasses) : '—'} · purchased ${num(diagAccount?.resetPasses) ? Number(diagAccount.resetPasses) : '—'} · included remaining ${num(diagAccount?.includedResetPassesRemaining) ? Number(diagAccount.includedResetPassesRemaining) : '—'} · price ${money(diagAccount?.resetPassPrice)} · PAYG ${diagAccount?.paygEnabled ? 'on' : 'off'} · regular credits ${money(diagAccount?.regularCredits)}`,"
    new = "      `DevPass account detail: plan ${diagAccount?.plan || '—'} · cycle ${diagAccount?.cycle || '—'} · status ${!diagAccount ? '—' : diagAccount.cancelled ? 'cancelled' : String(diagAccount.plan || 'none') !== 'none' ? 'active' : '—'} · reset total ${num(d.weekly?.resetPasses) ? Number(d.weekly.resetPasses) : '—'} · purchased ${num(diagAccount?.resetPasses) ? Number(diagAccount.resetPasses) : '—'} · included remaining ${num(diagAccount?.includedResetPassesRemaining) ? Number(diagAccount.includedResetPassesRemaining) : '—'} · price ${money(diagAccount?.resetPassPrice)}`,"
    if new not in text:
        if text.count(old) != 1:
            raise SystemExit(f'5.92 coarse PAYG diagnostics anchor mismatch: {text.count(old)}')
        text = text.replace(old, new, 1)
    DIAGNOSTICS.write_text(text, encoding='utf-8')


def patch_manager(engine_sha: str) -> None:
    text = MANAGER.read_text(encoding='utf-8')
    replacements = [
        ("const PRODUCT_VERSION = '3.0.0-alpha.5.91';", "const PRODUCT_VERSION = '3.0.0-alpha.5.92';", 'Product'),
        ("const BUNDLED_ENGINE_VERSION = '1.6.28';", "const BUNDLED_ENGINE_VERSION = '1.6.29';", 'Engine version'),
        (f"const BUNDLED_ENGINE_SHA256 = '{BASE_ENGINE_SHA}';", f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';", 'Engine SHA'),
    ]
    for old, new, label in replacements:
        if new not in text:
            if text.count(old) != 1:
                raise SystemExit(f'5.92 Manager {label} marker mismatch: {text.count(old)}')
            text = text.replace(old, new, 1)
    for marker in ["const MANAGER_VERSION = '1.3.4';", "const MANAGED_CLI_VERSION = '1.10.0';"]:
        if marker not in text:
            raise SystemExit(f'5.92 Manager invariant changed: {marker}')
    MANAGER.write_text(text, encoding='utf-8')


def sync_release_memory() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    current_re = re.compile(r'Current release implementation: `[^`]+`\.', re.M)
    if TARGET_RELEASE_MEMORY not in text:
        text, count = current_re.subn(TARGET_RELEASE_MEMORY, text, count=1)
        if count != 1:
            raise SystemExit('5.92 current release memory marker missing')
    GUIDELINES.write_text(text, encoding='utf-8')


def sync_manifest_hashes(engine_sha: str) -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['productVersion'] = TARGET_VERSION
    manifest['components']['plugin']['version'] = TARGET_VERSION
    manifest['components']['bridge']['requiredVersion'] = TARGET_ENGINE
    manifest['components']['bridge']['sha256'] = engine_sha
    manifest['components']['bridgeManager']['version'] = TARGET_MANAGER
    manifest['components']['bridgeManager']['productVersion'] = TARGET_VERSION
    manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
    manifest['components']['bridgeManager']['bootstrapSha256'] = sha256(BOOTSTRAP)
    manifest['contracts'] = {'snapshot': 1, 'recentRequest': 1}
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def validate_target() -> None:
    core = CORE.read_text(encoding='utf-8')
    engine_core = ENGINE_CORE.read_text(encoding='utf-8')
    engine_sources = ENGINE_SOURCES.read_text(encoding='utf-8')
    normalize = NORMALIZE.read_text(encoding='utf-8')
    dashboard = DASHBOARD.read_text(encoding='utf-8')
    diagnostics = DIAGNOSTICS.read_text(encoding='utf-8')
    manager = MANAGER.read_text(encoding='utf-8')
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    engine_sha = sha256(ENGINE)

    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.92 bootstrap exact-byte preservation failed')
    for marker in [
        "//@version 3.0.0-alpha.5.92",
        "const VERSION = '3.0.0-alpha.5.92';",
        "const REQUIRED_BRIDGE_VERSION = '1.6.29';",
        "const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.4';",
    ]:
        if marker not in core:
            raise SystemExit(f'5.92 Plugin target marker missing: {marker}')
    if "const VERSION = '1.6.29';" not in engine_core:
        raise SystemExit('5.92 Engine source version mismatch')
    if "const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';" not in engine_core:
        raise SystemExit('5.92 Engine CLI pin mismatch')
    for marker in [
        "devPlanPaygEnabled: explicitBillingBoolean",
        "paygEnabled: explicitBillingBoolean",
        "autoTopUpEnabled: explicitBillingBoolean",
        "autoTopUpThreshold:",
        "autoTopUpAmount:",
    ]:
        if marker not in engine_sources:
            raise SystemExit(f'5.92 Engine truth marker missing: {marker}')
    if "devPlanPaygEnabled: Boolean(" in engine_sources or "paygEnabled: Boolean(pick(raw" in engine_sources:
        raise SystemExit('5.92 Engine PAYG truth still collapses UNKNOWN to false')
    for marker in [
        "paygEnabled:typeof ds.paygEnabled === 'boolean' ? ds.paygEnabled : null",
        "autoTopUpEnabled:typeof ds.autoTopUpEnabled === 'boolean' ? ds.autoTopUpEnabled : null",
        "autoTopUpThreshold:num(ds.autoTopUpThreshold) ? Number(ds.autoTopUpThreshold) : null",
        "autoTopUpAmount:num(ds.autoTopUpAmount) ? Number(ds.autoTopUpAmount) : null",
    ]:
        if marker not in normalize:
            raise SystemExit(f'5.92 Plugin truth marker missing: {marker}')
    for marker in [
        'const paygTruth = paygAccountTruth(devpassAccount);',
        "paygTruth.paygState === 'on' ? 'PAYG ON' : paygTruth.paygState === 'off' ? 'PAYG OFF' : 'PAYG —'",
        '<span>Overflow balance</span>',
        '<span>Auto-Reload</span>',
        '<span>Reload threshold</span>',
        '<span>Reload amount</span>',
        'premium-allowance-card',
    ]:
        if marker not in dashboard:
            raise SystemExit(f'5.92 dashboard target marker missing: {marker}')
    if 'paygAccountDiagnosticText(diagAccount)' not in diagnostics:
        raise SystemExit('5.92 PAYG diagnostics line missing')
    if "diagAccount?.paygEnabled ? 'on' : 'off'" in diagnostics:
        raise SystemExit('5.92 diagnostics still collapses PAYG UNKNOWN to off')
    for marker in [
        "const MANAGER_VERSION = '1.3.4';",
        "const PRODUCT_VERSION = '3.0.0-alpha.5.92';",
        "const BUNDLED_ENGINE_VERSION = '1.6.29';",
        f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';",
        "const MANAGED_CLI_VERSION = '1.10.0';",
    ]:
        if marker not in manager:
            raise SystemExit(f'5.92 Manager target marker missing: {marker}')
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.92 manifest Product mismatch')
    if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.92 manifest Engine version mismatch')
    if manifest.get('components', {}).get('bridge', {}).get('sha256') != engine_sha:
        raise SystemExit('5.92 manifest Engine hash mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
        raise SystemExit('5.92 manifest Manager semantic version mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.92 manifest Manager Product mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('sha256') != sha256(MANAGER):
        raise SystemExit('5.92 manifest Manager hash mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('bootstrapSha256') != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.92 manifest bootstrap hash mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.92 contracts changed')


spec = load_spec()
validate_authority(spec)
title, highlights, hints = load_release_notes()
validate_baseline()
old_plugin_bytes = LATEST.stat().st_size
old_engine_bytes = ENGINE.stat().st_size
old_manager_bytes = MANAGER.stat().st_size

apply_identity_and_release_notes(title, highlights, hints)
apply_engine_truth()
apply_plugin_truth()
apply_dashboard()
apply_diagnostics()
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--write')
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--check')
engine_sha = sha256(ENGINE)
if engine_sha == BASE_ENGINE_SHA:
    raise SystemExit('5.92 Engine semantic release unexpectedly retained the 5.91 artifact SHA')
patch_manager(engine_sha)
sync_release_memory()
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
sync_manifest_hashes(engine_sha)
run('node', '--check', str(LATEST))
run('node', '--check', str(MANAGER))
run('node', '--check', str(ENGINE))
validate_target()

print(
    f'5.92 materialized: plugin {old_plugin_bytes}->{LATEST.stat().st_size} bytes; '
    f'Engine {old_engine_bytes}->{ENGINE.stat().st_size} bytes {BASE_ENGINE}->{TARGET_ENGINE} SHA {engine_sha}; '
    f'Manager {old_manager_bytes}->{MANAGER.stat().st_size} bytes semantic {TARGET_MANAGER} Product {BASE_VERSION}->{TARGET_VERSION}; '
    f'managed CLI {TARGET_CLI}; contracts 1/1; bootstrap exact-byte {BASE_BOOTSTRAP_SHA}'
)
