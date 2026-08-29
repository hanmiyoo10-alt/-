from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
RUNTIME_SRC = ROOT / 'runtime-src' / 'bridge-engine'
TOOLS = ROOT / 'tools'
SPEC = Path('.github/usage-dashboard/releases/5.88.json')

CORE = SRC / '00-runtime-core.part.js'
ENGINE_CORE = RUNTIME_SRC / '00-core.part.mjs'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
LATEST = ROOT / 'latest.js'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')

BASE_VERSION = '3.0.0-alpha.5.87'
TARGET_VERSION = '3.0.0-alpha.5.88'
BASE_ENGINE = '1.6.26'
TARGET_ENGINE = '1.6.27'
BASE_MANAGER = '1.3.1'
TARGET_MANAGER = '1.3.2'
BASE_CLI = '1.10.0'
TARGET_CLI = '1.14.0'
BASE_RELEASE_TITLE = 'Stable Contract Manager Authority Single Source Repair'
TARGET_RELEASE_TITLE = 'LLM Gateway CLI 1.14.0 Managed Runtime Upgrade'
TARGET_RELEASE_MEMORY = f'Current release implementation: `{TARGET_VERSION} — {TARGET_RELEASE_TITLE}`.'
TARGET_VERIFIED_BASELINE = 'Last verified real-device baseline: `3.0.0-alpha.5.87 — Stable Contract Manager Authority Single Source Repair`.'
BASE_ENGINE_SHA = 'c907c0661943ecf436116780dcd77eeaf07956f8c53ad8a951ad406001de4b67'
BASE_MANAGER_SHA = 'f3a850cfe05a916f98963cc5cb6e252a4a673c41bfb5c2b81fcacd170366bfe1'
BASE_BOOTSTRAP_SHA = '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c'


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
        'materializer': 'plugins/usage-dashboard/tools/release_llmgateway_cli_1140_588.py',
    }
    for key, value in expected.items():
        if spec.get(key) != value:
            raise SystemExit(f'5.88 release spec {key} mismatch')
    if spec.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.88 release spec contracts changed from 1/1')
    title = spec.get('releaseTitle')
    highlights = spec.get('highlights')
    hints = spec.get('diagnosticHints')
    if title != TARGET_RELEASE_TITLE:
        raise SystemExit('5.88 release title mismatch')
    for key, value in [('highlights', highlights), ('diagnosticHints', hints)]:
        if not isinstance(value, list) or not 1 <= len(value) <= 5:
            raise SystemExit(f'5.88 {key} must contain 1..5 items')
        if any(not isinstance(item, str) or not item.strip() or len(item) > 180 for item in value):
            raise SystemExit(f'5.88 {key} items must be non-empty bounded strings')
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
        core = CORE.read_text(encoding='utf-8')
        engine_core = ENGINE_CORE.read_text(encoding='utf-8')
        manager = MANAGER.read_text(encoding='utf-8')
        if f"const VERSION = '{TARGET_VERSION}';" not in core:
            raise SystemExit('5.88 target Plugin identity incomplete')
        if f"const VERSION = '{TARGET_ENGINE}';" not in engine_core or f"|| '{TARGET_CLI}';" not in engine_core:
            raise SystemExit('5.88 target Engine identity incomplete')
        if f"const MANAGER_VERSION = '{TARGET_MANAGER}';" not in manager or f"const MANAGED_CLI_VERSION = '{TARGET_CLI}';" not in manager:
            raise SystemExit('5.88 target Manager identity incomplete')
        return
    if product != BASE_VERSION:
        raise SystemExit(f'5.88 baseline product mismatch: {product}')
    if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != BASE_ENGINE:
        raise SystemExit('5.88 baseline Engine version mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('version') != BASE_MANAGER:
        raise SystemExit('5.88 baseline Manager version mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.88 baseline contracts mismatch')
    if sha256(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.88 baseline Engine artifact diverged from physical 5.87')
    if sha256(MANAGER) != BASE_MANAGER_SHA:
        raise SystemExit('5.88 baseline Manager artifact diverged from physical 5.87')
    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.88 bootstrap baseline diverged from physical 5.87')
    engine_core = ENGINE_CORE.read_text(encoding='utf-8')
    manager = MANAGER.read_text(encoding='utf-8')
    if f"const VERSION = '{BASE_ENGINE}';" not in engine_core:
        raise SystemExit('5.88 baseline Engine source version mismatch')
    if f"const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '{BASE_CLI}';" not in engine_core:
        raise SystemExit('5.88 baseline Engine CLI pin mismatch')
    if f"const MANAGED_CLI_VERSION = '{BASE_CLI}';" not in manager:
        raise SystemExit('5.88 baseline Manager CLI pin mismatch')


def apply_identity_and_release_notes(title, highlights, hints) -> None:
    replace_once_or_target(CORE, '//@version 3.0.0-alpha.5.87', '//@version 3.0.0-alpha.5.88', '5.88 plugin header version')
    replace_once_or_target(CORE, "  const VERSION = '3.0.0-alpha.5.87';", "  const VERSION = '3.0.0-alpha.5.88';", '5.88 plugin runtime version')
    replace_once_or_target(CORE, "  const REQUIRED_BRIDGE_VERSION = '1.6.26';", "  const REQUIRED_BRIDGE_VERSION = '1.6.27';", '5.88 plugin Engine requirement')
    replace_once_or_target(CORE, "  const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.1';", "  const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.2';", '5.88 plugin Manager requirement')
    replace_once_or_target(ENGINE_CORE, "const VERSION = '1.6.26';", "const VERSION = '1.6.27';", '5.88 Engine source version')
    replace_once_or_target(
        ENGINE_CORE,
        "const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';",
        "const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.14.0';",
        '5.88 Engine managed CLI pin',
    )

    text = CORE.read_text(encoding='utf-8')
    notes = release_notes_constant(title, highlights, hints)
    start = text.find('  const RELEASE_NOTES = Object.freeze({')
    end = text.find('  const UPDATE_URL =', start)
    if start < 0 or end <= start:
        raise SystemExit('5.88 static release notes boundary missing')
    if text[start:end] != notes:
        CORE.write_text(text[:start] + notes + text[end:], encoding='utf-8')


def sync_release_memory() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    current_re = re.compile(r'Current release implementation: `[^`]+`\.', re.M)
    if TARGET_RELEASE_MEMORY not in text:
        text, count = current_re.subn(TARGET_RELEASE_MEMORY, text, count=1)
        if count != 1:
            raise SystemExit('5.88 current release memory marker missing')
    baseline_re = re.compile(r'Last verified real-device baseline: `[^`]+`\.*', re.M)
    if TARGET_VERIFIED_BASELINE not in text:
        text, count = baseline_re.subn(TARGET_VERIFIED_BASELINE, text, count=1)
        if count != 1:
            raise SystemExit('5.88 verified baseline marker missing')
    GUIDELINES.write_text(text, encoding='utf-8')


def sync_manager_identity_and_cli_pin() -> None:
    engine_sha = sha256(ENGINE)
    text = MANAGER.read_text(encoding='utf-8')
    replacements = [
        (r"const MANAGER_VERSION = '[^']+';", f"const MANAGER_VERSION = '{TARGET_MANAGER}';", 'Manager version'),
        (r"const PRODUCT_VERSION = '[^']+';", f"const PRODUCT_VERSION = '{TARGET_VERSION}';", 'Manager product version'),
        (r"const BUNDLED_ENGINE_VERSION = '[^']+';", f"const BUNDLED_ENGINE_VERSION = '{TARGET_ENGINE}';", 'Manager bundled Engine version'),
        (r"const BUNDLED_ENGINE_SHA256 = '[0-9a-f]+';", f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';", 'Manager bundled Engine hash'),
        (r"const MANAGED_CLI_VERSION = '[^']+';", f"const MANAGED_CLI_VERSION = '{TARGET_CLI}';", 'Manager managed CLI pin'),
    ]
    for pattern, replacement, label in replacements:
        text, count = re.subn(pattern, replacement, text, count=1)
        if count != 1:
            raise SystemExit(f'5.88 {label} marker missing')
    if f"const MANAGED_CLI_VERSION = '{BASE_CLI}';" in text:
        raise SystemExit('5.88 Manager retains stale 1.10.0 managed CLI pin')
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


def validate_target() -> None:
    core = CORE.read_text(encoding='utf-8')
    engine_core = ENGINE_CORE.read_text(encoding='utf-8')
    engine = ENGINE.read_text(encoding='utf-8')
    manager = MANAGER.read_text(encoding='utf-8')
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    if f"const VERSION = '{TARGET_VERSION}';" not in core:
        raise SystemExit('5.88 Plugin VERSION target missing')
    if f"const REQUIRED_BRIDGE_VERSION = '{TARGET_ENGINE}';" not in core:
        raise SystemExit('5.88 Plugin Engine requirement missing')
    if f"const REQUIRED_BRIDGE_MANAGER_VERSION = '{TARGET_MANAGER}';" not in core:
        raise SystemExit('5.88 Plugin Manager requirement missing')
    if f"const VERSION = '{TARGET_ENGINE}';" not in engine_core:
        raise SystemExit('5.88 Engine source version missing')
    if f"const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '{TARGET_CLI}';" not in engine_core:
        raise SystemExit('5.88 Engine source CLI pin missing')
    if f"const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '{TARGET_CLI}';" not in engine:
        raise SystemExit('5.88 generated Engine CLI pin missing')
    for marker in [
        f"const MANAGER_VERSION = '{TARGET_MANAGER}';",
        f"const PRODUCT_VERSION = '{TARGET_VERSION}';",
        f"const BUNDLED_ENGINE_VERSION = '{TARGET_ENGINE}';",
        f"const MANAGED_CLI_VERSION = '{TARGET_CLI}';",
    ]:
        if marker not in manager:
            raise SystemExit(f'5.88 Manager target marker missing: {marker}')
    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.88 bootstrap exact-byte preservation failed')
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.88 manifest Product mismatch')
    if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.88 manifest Engine version mismatch')
    if manifest.get('components', {}).get('bridge', {}).get('sha256') != sha256(ENGINE):
        raise SystemExit('5.88 manifest Engine hash mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
        raise SystemExit('5.88 manifest Manager version mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.88 manifest Manager Product mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('sha256') != sha256(MANAGER):
        raise SystemExit('5.88 manifest Manager hash mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('bootstrapSha256') != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.88 manifest bootstrap hash mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.88 contracts changed')


title, highlights, hints = load_release_notes()
validate_baseline()
old_plugin_bytes = LATEST.stat().st_size
old_engine_bytes = ENGINE.stat().st_size
old_manager_bytes = MANAGER.stat().st_size

apply_identity_and_release_notes(title, highlights, hints)
sync_release_memory()
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--write')
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--check')
sync_manager_identity_and_cli_pin()
sync_manifest_hashes()
run('node', '--check', str(LATEST))
run('node', '--check', str(MANAGER))
run('node', '--check', str(ENGINE))
validate_target()

print(
    f'5.88 materialized: plugin {old_plugin_bytes}->{LATEST.stat().st_size} bytes; '
    f'Engine {old_engine_bytes}->{ENGINE.stat().st_size} bytes {BASE_ENGINE}->{TARGET_ENGINE}; '
    f'Manager {old_manager_bytes}->{MANAGER.stat().st_size} bytes {BASE_MANAGER}->{TARGET_MANAGER}; '
    f'managed CLI {BASE_CLI}->{TARGET_CLI}; Engine SHA {sha256(ENGINE)}; Manager SHA {sha256(MANAGER)}'
)
