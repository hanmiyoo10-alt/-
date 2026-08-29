from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
TOOLS = ROOT / 'tools'
SPEC = Path('.github/usage-dashboard/releases/5.87.json')

CORE = SRC / '00-runtime-core.part.js'
DIAGNOSTICS = SRC / '40-diagnostics.part.js'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
LATEST = ROOT / 'latest.js'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')

BASE_VERSION = '3.0.0-alpha.5.86'
TARGET_VERSION = '3.0.0-alpha.5.87'
TARGET_ENGINE = '1.6.26'
TARGET_MANAGER = '1.3.1'
TARGET_CLI = '1.10.0'
BASE_RELEASE_TITLE = 'Managed CLI Engine/Manager Pin Parity Repair'
TARGET_RELEASE_TITLE = 'Stable Contract Manager Authority Single Source Repair'
BASE_RELEASE_MEMORY = f'Current release implementation: `{BASE_VERSION} — {BASE_RELEASE_TITLE}`.'
TARGET_RELEASE_MEMORY = f'Current release implementation: `{TARGET_VERSION} — {TARGET_RELEASE_TITLE}`.'
TARGET_VERIFIED_BASELINE = f'Last verified real-device baseline: `{BASE_VERSION} — {BASE_RELEASE_TITLE}`.'
BASE_ENGINE_SHA = 'c907c0661943ecf436116780dcd77eeaf07956f8c53ad8a951ad406001de4b67'
BASE_MANAGER_SHA = 'a8182b1de27cab92abd0a2720a27491370b92032ef55967fb4b9489fb2c76e55'
BASE_BOOTSTRAP_SHA = '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c'
STALE_STABLE_CONTRACT = '      `Stable contract: engine ${REQUIRED_BRIDGE_VERSION} · manager 1.3.0 · snapshot v${SNAPSHOT_SCHEMA_VERSION} · recent-request v${RECENT_REQUEST_SCHEMA_VERSION} · state v3`,'
TARGET_STABLE_CONTRACT = '      `Stable contract: engine ${REQUIRED_BRIDGE_VERSION} · manager ${REQUIRED_BRIDGE_MANAGER_VERSION} · snapshot v${SNAPSHOT_SCHEMA_VERSION} · recent-request v${RECENT_REQUEST_SCHEMA_VERSION} · state v3`,'


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


def load_release_notes():
    spec = json.loads(SPEC.read_text(encoding='utf-8'))
    expected = {
        'productVersion': TARGET_VERSION,
        'engineVersion': TARGET_ENGINE,
        'managerVersion': TARGET_MANAGER,
        'materializer': 'plugins/usage-dashboard/tools/release_stable_contract_manager_authority_587.py',
    }
    for key, value in expected.items():
        if spec.get(key) != value:
            raise SystemExit(f'5.87 release spec {key} mismatch')
    if spec.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.87 release spec contracts changed from 1/1')
    title = spec.get('releaseTitle')
    highlights = spec.get('highlights')
    hints = spec.get('diagnosticHints')
    if title != TARGET_RELEASE_TITLE:
        raise SystemExit('5.87 release title mismatch')
    for key, value in [('highlights', highlights), ('diagnosticHints', hints)]:
        if not isinstance(value, list) or not 1 <= len(value) <= 5:
            raise SystemExit(f'5.87 {key} must contain 1..5 items')
        if any(not isinstance(item, str) or not item.strip() or len(item) > 180 for item in value):
            raise SystemExit(f'5.87 {key} items must be non-empty bounded strings')
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
    if product not in {BASE_VERSION, TARGET_VERSION}:
        raise SystemExit(f'5.87 baseline product mismatch: {product}')
    if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.87 Engine version mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
        raise SystemExit('5.87 Manager semantic version mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.87 contracts mismatch')
    if sha256(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.87 Engine artifact diverged from exact 5.86 baseline')
    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.87 bootstrap diverged from exact 5.86 baseline')

    manager_text = MANAGER.read_text(encoding='utf-8')
    if "const MANAGER_VERSION = '1.3.1';" not in manager_text:
        raise SystemExit('5.87 Manager semantic version must remain 1.3.1')
    if "const MANAGED_CLI_VERSION = '1.10.0';" not in manager_text:
        raise SystemExit('5.87 Manager managed CLI pin must remain 1.10.0')
    if "const BUNDLED_ENGINE_VERSION = '1.6.26';" not in manager_text:
        raise SystemExit('5.87 Manager bundled Engine version must remain 1.6.26')
    if f"const BUNDLED_ENGINE_SHA256 = '{BASE_ENGINE_SHA}';" not in manager_text:
        raise SystemExit('5.87 Manager bundled Engine hash must remain exact')

    if product == BASE_VERSION:
        if sha256(MANAGER) != BASE_MANAGER_SHA:
            raise SystemExit('5.87 Manager artifact diverged from exact 5.86 baseline')
        if "const PRODUCT_VERSION = '3.0.0-alpha.5.86';" not in manager_text:
            raise SystemExit('5.87 baseline Manager product identity mismatch')
        diagnostics = DIAGNOSTICS.read_text(encoding='utf-8')
        if diagnostics.count(STALE_STABLE_CONTRACT) != 1:
            raise SystemExit('5.87 exact stale Stable-contract Manager literal missing or duplicated')
        if TARGET_STABLE_CONTRACT in diagnostics:
            raise SystemExit('5.87 baseline unexpectedly already contains target Stable-contract interpolation')
    else:
        if "const PRODUCT_VERSION = '3.0.0-alpha.5.87';" not in manager_text:
            raise SystemExit('5.87 target Manager product identity mismatch')
        diagnostics = DIAGNOSTICS.read_text(encoding='utf-8')
        if TARGET_STABLE_CONTRACT not in diagnostics or STALE_STABLE_CONTRACT in diagnostics:
            raise SystemExit('5.87 target Stable-contract authority mismatch')


def apply_plugin_identity_and_release_notes(title, highlights, hints) -> None:
    replace_once_or_target(CORE, '//@version 3.0.0-alpha.5.86', '//@version 3.0.0-alpha.5.87', '5.87 plugin header version')
    replace_once_or_target(CORE, "  const VERSION = '3.0.0-alpha.5.86';", "  const VERSION = '3.0.0-alpha.5.87';", '5.87 plugin runtime version')

    core_text = CORE.read_text(encoding='utf-8')
    if "  const REQUIRED_BRIDGE_VERSION = '1.6.26';" not in core_text:
        raise SystemExit('5.87 Plugin Engine requirement must remain 1.6.26')
    if "  const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.1';" not in core_text:
        raise SystemExit('5.87 canonical Manager requirement must remain 1.3.1')

    text = CORE.read_text(encoding='utf-8')
    notes = release_notes_constant(title, highlights, hints)
    start = text.find('  const RELEASE_NOTES = Object.freeze({')
    end = text.find('  const UPDATE_URL =', start)
    if start < 0 or end <= start:
        raise SystemExit('5.87 static release notes boundary missing')
    if text[start:end] != notes:
        CORE.write_text(text[:start] + notes + text[end:], encoding='utf-8')


def apply_stable_contract_authority() -> None:
    replace_once_or_target(
        DIAGNOSTICS,
        STALE_STABLE_CONTRACT,
        TARGET_STABLE_CONTRACT,
        '5.87 Stable-contract Manager authority',
    )
    text = DIAGNOSTICS.read_text(encoding='utf-8')
    if "String(runtimeBridge?.managerVersion || '') !== REQUIRED_BRIDGE_MANAGER_VERSION" not in text:
        raise SystemExit('5.87 readiness must continue using REQUIRED_BRIDGE_MANAGER_VERSION')
    if TARGET_STABLE_CONTRACT not in text:
        raise SystemExit('5.87 Stable-contract interpolation missing')
    if re.search(r'Stable contract:[^`\n]*manager\s+\d+\.\d+\.\d+', text):
        raise SystemExit('5.87 Stable-contract Manager numeric literal remains in source')


def sync_manager_product_identity() -> None:
    if sha256(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.87 Engine must remain byte-identical before Manager identity sync')
    text = MANAGER.read_text(encoding='utf-8')
    if "const PRODUCT_VERSION = '3.0.0-alpha.5.87';" not in text:
        if text.count("const PRODUCT_VERSION = '3.0.0-alpha.5.86';") != 1:
            raise SystemExit('5.87 Manager baseline product identity marker mismatch')
        text = text.replace(
            "const PRODUCT_VERSION = '3.0.0-alpha.5.86';",
            "const PRODUCT_VERSION = '3.0.0-alpha.5.87';",
            1,
        )
    for marker in [
        "const MANAGER_VERSION = '1.3.1';",
        "const MANAGED_CLI_VERSION = '1.10.0';",
        "const BUNDLED_ENGINE_VERSION = '1.6.26';",
        f"const BUNDLED_ENGINE_SHA256 = '{BASE_ENGINE_SHA}';",
    ]:
        if marker not in text:
            raise SystemExit(f'5.87 Manager invariant missing: {marker}')
    MANAGER.write_text(text, encoding='utf-8')


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


def sync_release_memory() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    if TARGET_RELEASE_MEMORY not in text:
        if text.count(BASE_RELEASE_MEMORY) != 1:
            raise SystemExit(f'5.87 release memory sync mismatch: {text.count(BASE_RELEASE_MEMORY)}')
        text = text.replace(BASE_RELEASE_MEMORY, TARGET_RELEASE_MEMORY, 1)
    baseline_re = re.compile(r'Last verified real-device baseline: `[^`]+`\.*', re.M)
    if TARGET_VERIFIED_BASELINE not in text:
        text, count = baseline_re.subn(TARGET_VERIFIED_BASELINE, text, count=1)
        if count != 1:
            raise SystemExit('5.87 verified baseline marker missing')
    GUIDELINES.write_text(text, encoding='utf-8')


def validate_target() -> None:
    if sha256(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.87 Engine exact-byte preservation failed')
    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.87 bootstrap exact-byte preservation failed')
    core = CORE.read_text(encoding='utf-8')
    diagnostics = DIAGNOSTICS.read_text(encoding='utf-8')
    latest = LATEST.read_text(encoding='utf-8')
    manager = MANAGER.read_text(encoding='utf-8')
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    if "const VERSION = '3.0.0-alpha.5.87';" not in core:
        raise SystemExit('5.87 Plugin VERSION target missing')
    if TARGET_STABLE_CONTRACT not in diagnostics:
        raise SystemExit('5.87 source Stable-contract target missing')
    if re.search(r'Stable contract:[^`\n]*manager\s+\d+\.\d+\.\d+', diagnostics):
        raise SystemExit('5.87 source retains Stable-contract Manager numeric literal')
    if re.search(r'Stable contract:[^`\n]*manager\s+\d+\.\d+\.\d+', latest):
        raise SystemExit('5.87 built Plugin retains Stable-contract Manager numeric literal')
    if 'manager ${REQUIRED_BRIDGE_MANAGER_VERSION}' not in latest:
        raise SystemExit('5.87 built Plugin does not reuse canonical Manager requirement')
    if "const MANAGER_VERSION = '1.3.1';" not in manager:
        raise SystemExit('5.87 Manager semantic version changed')
    if "const PRODUCT_VERSION = '3.0.0-alpha.5.87';" not in manager:
        raise SystemExit('5.87 Manager Product identity not advanced')
    if "const MANAGED_CLI_VERSION = '1.10.0';" not in manager:
        raise SystemExit('5.87 Manager CLI pin changed')
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.87 manifest Product mismatch')
    if manifest.get('components', {}).get('plugin', {}).get('version') != TARGET_VERSION:
        raise SystemExit('5.87 manifest Plugin mismatch')
    if manifest.get('components', {}).get('bridge', {}).get('sha256') != BASE_ENGINE_SHA:
        raise SystemExit('5.87 manifest Engine hash mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
        raise SystemExit('5.87 manifest Manager semantic version mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.87 manifest Manager Product identity mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('sha256') != sha256(MANAGER):
        raise SystemExit('5.87 manifest Manager hash mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('bootstrapSha256') != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.87 manifest bootstrap hash mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.87 manifest contracts mismatch')


title, highlights, hints = load_release_notes()
validate_baseline()
old_plugin_bytes = LATEST.stat().st_size
old_engine_bytes = ENGINE.stat().st_size
old_manager_bytes = MANAGER.stat().st_size

apply_plugin_identity_and_release_notes(title, highlights, hints)
apply_stable_contract_authority()
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--check')
if sha256(ENGINE) != BASE_ENGINE_SHA or ENGINE.stat().st_size != old_engine_bytes:
    raise SystemExit('5.87 Engine must remain byte-identical to 5.86')
sync_manager_product_identity()
sync_manifest_hashes()
sync_release_memory()
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
run('node', '--check', str(LATEST))
run('node', '--check', str(MANAGER))
run('node', '--check', str(ENGINE))
validate_target()

print(
    f'5.87 materialized: plugin {old_plugin_bytes}->{LATEST.stat().st_size} bytes; '
    f'Engine {old_engine_bytes}->{ENGINE.stat().st_size} bytes exact; '
    f'Manager {old_manager_bytes}->{MANAGER.stat().st_size} bytes; '
    f'Manager semantic {TARGET_MANAGER}; CLI {TARGET_CLI}; '
    f'Engine SHA {sha256(ENGINE)}; Manager SHA {sha256(MANAGER)}'
)
