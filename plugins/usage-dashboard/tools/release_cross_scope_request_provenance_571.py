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
CORE = SRC / '00-runtime-core.part.js'
ENGINE_CORE = RUNTIME_SRC / '00-core.part.mjs'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')

BASE_VERSION = '3.0.0-alpha.5.70'
TARGET_VERSION = '3.0.0-alpha.5.71'
BASE_ENGINE = '1.6.21'
TARGET_ENGINE = '1.6.22'
TARGET_MANAGER = '1.3.0'
BASE_RELEASE_TITLE = 'Request Duration Fidelity'
TARGET_RELEASE_TITLE = 'Cross-Scope Request Provenance'
BASE_RELEASE_MEMORY = f'Current release implementation: `{BASE_VERSION} — {BASE_RELEASE_TITLE}`.'
TARGET_RELEASE_MEMORY = f'Current release implementation: `{TARGET_VERSION} — {TARGET_RELEASE_TITLE}`.'


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def replace_regex_once(path: Path, pattern: str, replacement: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    next_text, count = re.subn(pattern, replacement, text, count=1)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    path.write_text(next_text, encoding='utf-8')


def run(*args: str) -> None:
    subprocess.run(list(args), check=True)


def sync_release_memory() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    if TARGET_RELEASE_MEMORY in text:
        return
    count = text.count(BASE_RELEASE_MEMORY)
    if count != 1:
        raise SystemExit(f'5.71 release memory sync: expected exactly one 5.70 memory line, found {count}')
    GUIDELINES.write_text(text.replace(BASE_RELEASE_MEMORY, TARGET_RELEASE_MEMORY, 1), encoding='utf-8')


def validate_target() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.71 Product version mismatch')
    if manifest.get('components', {}).get('plugin', {}).get('version') != TARGET_VERSION:
        raise SystemExit('5.71 plugin version mismatch')
    if bridge.get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.71 Engine version mismatch')
    if manager.get('version') != TARGET_MANAGER or manager.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.71 Manager identity mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.71 contracts changed from 1/1')
    if bridge.get('sha256') != sha256(ENGINE):
        raise SystemExit('5.71 Engine hash mismatch')
    if manager.get('sha256') != sha256(MANAGER):
        raise SystemExit('5.71 Manager hash mismatch')
    if manager.get('bootstrapSha256') != sha256(BOOTSTRAP):
        raise SystemExit('5.71 bootstrap hash mismatch')
    if TARGET_RELEASE_MEMORY not in GUIDELINES.read_text(encoding='utf-8'):
        raise SystemExit('5.71 current release memory mismatch')

    engine_text = ENGINE.read_text(encoding='utf-8')
    manager_text = MANAGER.read_text(encoding='utf-8')
    latest_text = (ROOT / 'latest.js').read_text(encoding='utf-8')
    for marker in [
        "const VERSION = '1.6.22';",
        "next.searchParams.delete('projectId')",
        "requestAccountScope:'devpass'",
        "requestScopeFidelity:'explicit-project'",
        "requestAccountScope:'credits'",
        "requestScopeFidelity:'explicit-org-billing'",
        "requestUsedMode === 'credits'",
        "modelInference:0",
        "durationSource: durationExplicit ? 'llmgateway-log-duration' : ''",
    ]:
        if marker not in engine_text:
            raise SystemExit(f'5.71 Engine provenance marker missing: {marker}')
    for marker in [
        'function requestAccountScopeValue(value)',
        'requestAccountScope:scope',
        'Account request capture:',
        'Request account scope fidelity:',
        'Scope authority: DevPass project exact',
        'Request duration fidelity:',
        'function requestLedgerKeyWithProvenance(row)',
    ]:
        if marker not in latest_text:
            raise SystemExit(f'5.71 plugin provenance marker missing: {marker}')
    if f"const PRODUCT_VERSION = '{TARGET_VERSION}';" not in manager_text:
        raise SystemExit('5.71 Manager product version not synchronized')
    if f"const BUNDLED_ENGINE_VERSION = '{TARGET_ENGINE}';" not in manager_text:
        raise SystemExit('5.71 Manager Engine version not synchronized')
    if f"const BUNDLED_ENGINE_SHA256 = '{sha256(ENGINE)}';" not in manager_text:
        raise SystemExit('5.71 Manager Engine hash not synchronized')


manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
current = str(manifest.get('productVersion') or '')
if current == TARGET_VERSION:
    sync_release_memory()
    run('python3', str(TOOLS / 'sync_project_guidelines.py'))
    run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--write')
    run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--check')
    run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
    run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
    validate_target()
    print(f'{TARGET_VERSION} already materialized · Cross-Scope Request Provenance intact')
    raise SystemExit(0)

if current != BASE_VERSION:
    raise SystemExit(f'expected {BASE_VERSION} baseline, got {current or "missing"}')
bridge = manifest.get('components', {}).get('bridge', {})
manager_meta = manifest.get('components', {}).get('bridgeManager', {})
if bridge.get('requiredVersion') != BASE_ENGINE:
    raise SystemExit(f'expected Engine {BASE_ENGINE}, got {bridge.get("requiredVersion")}')
if manager_meta.get('version') != TARGET_MANAGER:
    raise SystemExit(f'expected Manager {TARGET_MANAGER}, got {manager_meta.get("version")}')
if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('baseline contracts are not 1/1')
if bridge.get('sha256') != sha256(ENGINE) or manager_meta.get('sha256') != sha256(MANAGER):
    raise SystemExit('baseline manifest hashes do not match current runtime bytes')

replace_once(CORE, '//@version 3.0.0-alpha.5.70', '//@version 3.0.0-alpha.5.71', 'plugin header version')
replace_once(CORE, "const VERSION = '3.0.0-alpha.5.70';", "const VERSION = '3.0.0-alpha.5.71';", 'plugin runtime version')
replace_once(CORE, "const REQUIRED_BRIDGE_VERSION = '1.6.21';", "const REQUIRED_BRIDGE_VERSION = '1.6.22';", 'plugin required Engine version')
replace_once(ENGINE_CORE, "const VERSION = '1.6.21';", "const VERSION = '1.6.22';", 'Engine version')

run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--write')
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--check')
engine_sha = sha256(ENGINE)

replace_once(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.70';", "const PRODUCT_VERSION = '3.0.0-alpha.5.71';", 'manager Product version')
replace_once(MANAGER, "const BUNDLED_ENGINE_VERSION = '1.6.21';", "const BUNDLED_ENGINE_VERSION = '1.6.22';", 'manager Engine version')
replace_regex_once(
    MANAGER,
    r"const BUNDLED_ENGINE_SHA256 = '[0-9a-f]{64}';",
    f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';",
    'manager Engine hash',
)

manifest['productVersion'] = TARGET_VERSION
manifest['components']['plugin']['version'] = TARGET_VERSION
manifest['components']['bridge']['requiredVersion'] = TARGET_ENGINE
manifest['components']['bridge']['sha256'] = engine_sha
manifest['components']['bridgeManager']['productVersion'] = TARGET_VERSION
manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
manifest['components']['bridgeManager']['bootstrapSha256'] = sha256(BOOTSTRAP)
MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
sync_release_memory()
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
run('node', '--check', str(ROOT / 'latest.js'))
run('node', '--check', str(MANAGER))
run('node', '--check', str(ENGINE))
validate_target()
print(f'{TARGET_VERSION} materialized · Engine {TARGET_ENGINE} · Cross-Scope Request Provenance ready')
