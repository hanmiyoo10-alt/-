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
BASE_ENGINE_SHA = '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69'


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(*args: str) -> None:
    subprocess.run(list(args), check=True)


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def sync_release_memory() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    if TARGET_RELEASE_MEMORY in text:
        return
    count = text.count(BASE_RELEASE_MEMORY)
    if count != 1:
        raise SystemExit(f'5.72 release memory sync: expected exactly one 5.71 memory line, found {count}')
    GUIDELINES.write_text(text.replace(BASE_RELEASE_MEMORY, TARGET_RELEASE_MEMORY, 1), encoding='utf-8')


def sync_manifest_hashes() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['components']['bridge']['sha256'] = sha256(ENGINE)
    manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
    manifest['components']['bridgeManager']['bootstrapSha256'] = sha256(BOOTSTRAP)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def validate_target() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.72 Product version mismatch')
    if manifest.get('components', {}).get('plugin', {}).get('version') != TARGET_VERSION:
        raise SystemExit('5.72 plugin version mismatch')
    if bridge.get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.72 Engine version mismatch')
    if manager.get('version') != TARGET_MANAGER or manager.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.72 Manager identity mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.72 contracts changed from 1/1')
    if sha256(ENGINE) != BASE_ENGINE_SHA or bridge.get('sha256') != BASE_ENGINE_SHA:
        raise SystemExit('5.72 Engine artifact must remain byte-identical to 5.71')
    if manager.get('sha256') != sha256(MANAGER):
        raise SystemExit('5.72 Manager hash mismatch')
    if manager.get('bootstrapSha256') != sha256(BOOTSTRAP):
        raise SystemExit('5.72 bootstrap hash mismatch')
    if TARGET_RELEASE_MEMORY not in GUIDELINES.read_text(encoding='utf-8'):
        raise SystemExit('5.72 current release memory mismatch')

    core = CORE.read_text(encoding='utf-8')
    manager_text = MANAGER.read_text(encoding='utf-8')
    latest = (ROOT / 'latest.js').read_text(encoding='utf-8')
    instant = (SRC / '63-diagnostics-instant-mode.part.js').read_text(encoding='utf-8')
    if f'//@version {TARGET_VERSION}' not in core or f"const VERSION = '{TARGET_VERSION}';" not in core:
        raise SystemExit('5.72 plugin source version mismatch')
    if f"const PRODUCT_VERSION = '{TARGET_VERSION}';" not in manager_text:
        raise SystemExit('5.72 Manager product version not synchronized')
    for marker in [
        'function persistDiagnosticsModeSerialized(mode)',
        'function setDiagnosticsModeInstant(mode)',
        'renderSettingsPartial();',
        'void persistDiagnosticsModeSerialized(next);',
        'diagnosticsMode:capturedMode',
    ]:
        if marker not in instant or marker not in latest:
            raise SystemExit(f'5.72 instant mode marker missing: {marker}')
    for forbidden in ['nativeFetch(', 'enqueueRefresh(', 'schedulePanelRender(', 'runCli(']:
        if forbidden in instant:
            raise SystemExit(f'5.72 instant mode introduced forbidden I/O/scheduler call: {forbidden}')


manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
current = str(manifest.get('productVersion') or '')
if current not in {BASE_VERSION, TARGET_VERSION}:
    raise SystemExit(f'expected {BASE_VERSION} or {TARGET_VERSION}, got {current or "missing"}')
if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != TARGET_ENGINE:
    raise SystemExit('5.72 baseline Engine version is not 1.6.22')
if sha256(ENGINE) != BASE_ENGINE_SHA:
    raise SystemExit('5.72 baseline Engine artifact diverged from 5.71')
if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
    raise SystemExit('5.72 baseline Manager version is not 1.3.0')
if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('5.72 baseline contracts are not 1/1')

if current == BASE_VERSION:
    replace_once(CORE, '//@version 3.0.0-alpha.5.71', '//@version 3.0.0-alpha.5.72', 'plugin header version')
    replace_once(CORE, "const VERSION = '3.0.0-alpha.5.71';", "const VERSION = '3.0.0-alpha.5.72';", 'plugin runtime version')
    replace_once(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.71';", "const PRODUCT_VERSION = '3.0.0-alpha.5.72';", 'manager Product version')
    manifest['productVersion'] = TARGET_VERSION
    manifest['components']['plugin']['version'] = TARGET_VERSION
    manifest['components']['bridgeManager']['productVersion'] = TARGET_VERSION
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

sync_release_memory()
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
sync_manifest_hashes()
run('node', '--check', str(ROOT / 'latest.js'))
run('node', '--check', str(MANAGER))
run('node', '--check', str(ENGINE))
validate_target()
print(f'{TARGET_VERSION} materialized · Engine {TARGET_ENGINE} byte-identical · Diagnostics Instant Mode Switch ready')
