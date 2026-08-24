from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
TOOLS = ROOT / 'tools'
CORE = SRC / '00-runtime-core.part.js'
WORKSPACE = SRC / '62-diagnostics-workspace.part.js'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')

BASE_VERSION = '3.0.0-alpha.5.71'
TARGET_VERSION = '3.0.0-alpha.5.72'
TARGET_ENGINE = '1.6.22'
TARGET_MANAGER = '1.3.0'
BASE_RELEASE_TITLE = 'Cross-Scope Request Provenance'
TARGET_RELEASE_TITLE = 'Diagnostics Instant Mode Switch'
BASE_RELEASE_MEMORY = f'Current release implementation: `{BASE_VERSION} — {BASE_RELEASE_TITLE}`.'
TARGET_RELEASE_MEMORY = f'Current release implementation: `{TARGET_VERSION} — {TARGET_RELEASE_TITLE}`.'
ENGINE_571_SHA256 = '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69'


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def run(*args: str) -> None:
    subprocess.run(list(args), check=True)


def assert_engine_unchanged() -> None:
    actual = sha256(ENGINE)
    if actual != ENGINE_571_SHA256:
        raise SystemExit(f'5.72 Engine must remain byte-identical to 5.71: {actual}')


def sync_release_memory() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    if TARGET_RELEASE_MEMORY in text:
        return
    count = text.count(BASE_RELEASE_MEMORY)
    if count != 1:
        raise SystemExit(f'5.72 release memory sync: expected exactly one 5.71 memory line, found {count}')
    GUIDELINES.write_text(text.replace(BASE_RELEASE_MEMORY, TARGET_RELEASE_MEMORY, 1), encoding='utf-8')


def sync_runtime_identity() -> None:
    assert_engine_unchanged()
    manager_text = MANAGER.read_text(encoding='utf-8')
    if f"const MANAGER_VERSION = '{TARGET_MANAGER}';" not in manager_text:
        raise SystemExit('5.72 Manager version changed unexpectedly')
    if f"const BUNDLED_ENGINE_VERSION = '{TARGET_ENGINE}';" not in manager_text:
        raise SystemExit('5.72 Manager bundled Engine version changed unexpectedly')
    if f"const BUNDLED_ENGINE_SHA256 = '{ENGINE_571_SHA256}';" not in manager_text:
        raise SystemExit('5.72 Manager bundled Engine hash changed unexpectedly')

    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['productVersion'] = TARGET_VERSION
    manifest['components']['plugin']['version'] = TARGET_VERSION
    manifest['components']['bridge']['requiredVersion'] = TARGET_ENGINE
    manifest['components']['bridge']['sha256'] = ENGINE_571_SHA256
    manifest['components']['bridgeManager']['version'] = TARGET_MANAGER
    manifest['components']['bridgeManager']['productVersion'] = TARGET_VERSION
    manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
    manifest['components']['bridgeManager']['bootstrapSha256'] = sha256(BOOTSTRAP)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def validate_target() -> None:
    assert_engine_unchanged()
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.72 Product version mismatch')
    if manifest.get('components', {}).get('plugin', {}).get('version') != TARGET_VERSION:
        raise SystemExit('5.72 plugin version mismatch')
    if bridge.get('requiredVersion') != TARGET_ENGINE or bridge.get('sha256') != ENGINE_571_SHA256:
        raise SystemExit('5.72 Engine identity mismatch')
    if manager.get('version') != TARGET_MANAGER or manager.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.72 Manager identity mismatch')
    if manager.get('sha256') != sha256(MANAGER):
        raise SystemExit('5.72 Manager hash mismatch')
    if manager.get('bootstrapSha256') != sha256(BOOTSTRAP):
        raise SystemExit('5.72 bootstrap hash mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.72 contracts changed from 1/1')
    if TARGET_RELEASE_MEMORY not in GUIDELINES.read_text(encoding='utf-8'):
        raise SystemExit('5.72 current release memory mismatch')

    core = CORE.read_text(encoding='utf-8')
    manager_text = MANAGER.read_text(encoding='utf-8')
    workspace = WORKSPACE.read_text(encoding='utf-8')
    latest = (ROOT / 'latest.js').read_text(encoding='utf-8')
    for marker in [
        f'//@version {TARGET_VERSION}',
        f"const VERSION = '{TARGET_VERSION}';",
        f"const REQUIRED_BRIDGE_VERSION = '{TARGET_ENGINE}';",
    ]:
        if marker not in core:
            raise SystemExit(f'5.72 plugin identity marker missing: {marker}')
    for marker in [
        'let diagnosticsModePersistTail = Promise.resolve();',
        'function diagnosticsWorkspaceQueuePersist()',
        'renderSettingsPartial();',
        'void diagnosticsWorkspaceQueuePersist();',
    ]:
        if marker not in workspace or marker not in latest:
            raise SystemExit(f'5.72 instant-mode marker missing: {marker}')
    if 'await persist();\n      renderSettings();' in workspace:
        raise SystemExit('5.72 legacy diagnostics mode wait-before-render path remains')
    if f"const PRODUCT_VERSION = '{TARGET_VERSION}';" not in manager_text:
        raise SystemExit('5.72 Manager product version not synchronized')
    if f"const BUNDLED_ENGINE_VERSION = '{TARGET_ENGINE}';" not in manager_text:
        raise SystemExit('5.72 Manager Engine version not preserved')
    if f"const BUNDLED_ENGINE_SHA256 = '{ENGINE_571_SHA256}';" not in manager_text:
        raise SystemExit('5.72 Manager Engine hash not preserved')


manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
current = str(manifest.get('productVersion') or '')
assert_engine_unchanged()

if current == TARGET_VERSION:
    manager_text = MANAGER.read_text(encoding='utf-8')
    if f"const PRODUCT_VERSION = '{BASE_VERSION}';" in manager_text:
        replace_once(MANAGER, f"const PRODUCT_VERSION = '{BASE_VERSION}';", f"const PRODUCT_VERSION = '{TARGET_VERSION}';", 'manager Product version repair')
    sync_runtime_identity()
    run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
    run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
    sync_release_memory()
    run('python3', str(TOOLS / 'sync_project_guidelines.py'))
    validate_target()
    print(f'{TARGET_VERSION} already materialized · Diagnostics Instant Mode Switch intact')
    raise SystemExit(0)

if current != BASE_VERSION:
    raise SystemExit(f'expected {BASE_VERSION} baseline, got {current or "missing"}')
bridge = manifest.get('components', {}).get('bridge', {})
manager_meta = manifest.get('components', {}).get('bridgeManager', {})
if bridge.get('requiredVersion') != TARGET_ENGINE or bridge.get('sha256') != ENGINE_571_SHA256:
    raise SystemExit('5.72 baseline Engine is not exact 5.71 Engine')
if manager_meta.get('version') != TARGET_MANAGER or manager_meta.get('productVersion') != BASE_VERSION:
    raise SystemExit('5.72 baseline Manager identity mismatch')
if manager_meta.get('sha256') != sha256(MANAGER) or manager_meta.get('bootstrapSha256') != sha256(BOOTSTRAP):
    raise SystemExit('5.72 baseline runtime hashes do not match current bytes')
if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('5.72 baseline contracts are not 1/1')

replace_once(CORE, '//@version 3.0.0-alpha.5.71', '//@version 3.0.0-alpha.5.72', 'plugin header version')
replace_once(CORE, "const VERSION = '3.0.0-alpha.5.71';", "const VERSION = '3.0.0-alpha.5.72';", 'plugin runtime version')
replace_once(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.71';", "const PRODUCT_VERSION = '3.0.0-alpha.5.72';", 'manager Product version')

sync_runtime_identity()
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
sync_release_memory()
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
run('node', '--check', str(ROOT / 'latest.js'))
run('node', '--check', str(MANAGER))
validate_target()
print(f'{TARGET_VERSION} materialized · Engine {TARGET_ENGINE} byte-identical to 5.71 · Diagnostics Instant Mode Switch ready')
