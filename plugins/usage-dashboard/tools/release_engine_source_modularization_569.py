from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
RUNTIME_SRC = ROOT / 'runtime-src' / 'bridge-engine'
TOOLS = ROOT / 'tools'
CORE = SRC / '00-runtime-core.part.js'
MANAGER = RUNTIME / 'bridge-manager.cjs'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
ENGINE_PARTS_MANIFEST = RUNTIME_SRC / 'parts.json'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')

BASE_VERSION = '3.0.0-alpha.5.68'
TARGET_VERSION = '3.0.0-alpha.5.69'
BASE_ENGINE = '1.6.19'
TARGET_ENGINE = '1.6.20'
TARGET_MANAGER = '1.3.0'
BASE_ENGINE_SHA = 'f17d689f39bd469bcadf1a2125313146cd6e04cb38299a5b4583d903a696cf09'
BASE_MANAGER_SHA = '3bd9fa2b41db53cf68eea20bc85e198db8185c7eb52ba412ff91465c8f555115'

PART_BOUNDARIES = [
    ('00-core.part.mjs', '#!/usr/bin/env node\n'),
    ('10-attribution.part.mjs', 'function createSnapshotAttribution(profile) {'),
    ('20-cache-circuit.part.mjs', 'const logThrottle = new Map();'),
    ('30-cli-runtime.part.mjs', 'async function runProgram(program, args, extraEnv = {}) {'),
    ('40-sources.part.mjs', "async function captureAccountDetailsViaCliSession(activityRange = '') {"),
    ('50-organization-capture.part.mjs', 'async function loadOrgs() {'),
    ('60-snapshot-scheduler.part.mjs', "async function snapshot(profile = 'full', creditsOrgId = '') {"),
    ('70-http-diagnostics.part.mjs', 'function isAuthorized(req) {'),
]


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


def validate_parts_manifest() -> list[str]:
    data = json.loads(ENGINE_PARTS_MANIFEST.read_text(encoding='utf-8'))
    if data.get('schemaVersion') != 1:
        raise SystemExit('Engine parts manifest schema mismatch')
    if data.get('mode') != 'shared-lexical-concatenation':
        raise SystemExit('Engine parts manifest must use shared lexical concatenation')
    expected = [name for name, _ in PART_BOUNDARIES]
    if data.get('parts') != expected:
        raise SystemExit(f'Engine parts manifest order mismatch: {data.get("parts")} != {expected}')
    if data.get('artifact') != 'plugins/usage-dashboard/runtime/bridge-engine.mjs':
        raise SystemExit('Engine parts manifest changed the deployed artifact path')
    return expected


def split_engine_baseline(text: str, part_names: list[str]) -> None:
    positions = []
    for index, (name, marker) in enumerate(PART_BOUNDARIES):
        count = text.count(marker)
        if count != 1:
            raise SystemExit(f'Engine part boundary {name}: expected exactly one marker, found {count}: {marker}')
        position = text.index(marker)
        if index == 0 and position != 0:
            raise SystemExit('Engine shebang is no longer at byte zero')
        positions.append(position)
    if positions != sorted(positions) or len(set(positions)) != len(positions):
        raise SystemExit(f'Engine part boundary order changed: {positions}')

    RUNTIME_SRC.mkdir(parents=True, exist_ok=True)
    for old_part in RUNTIME_SRC.glob('*.part.mjs'):
        old_part.unlink()
    for index, name in enumerate(part_names):
        start = positions[index]
        end = positions[index + 1] if index + 1 < len(positions) else len(text)
        chunk = text[start:end]
        if not chunk:
            raise SystemExit(f'Engine part {name} would be empty')
        if index == 0:
            old = f"const VERSION = '{BASE_ENGINE}';"
            new = f"const VERSION = '{TARGET_ENGINE}';"
            if chunk.count(old) != 1:
                raise SystemExit(f'Engine version literal ownership changed in {name}')
            chunk = chunk.replace(old, new, 1)
        elif f"const VERSION = '{BASE_ENGINE}';" in chunk or f"const VERSION = '{TARGET_ENGINE}';" in chunk:
            raise SystemExit(f'Engine version literal leaked outside 00-core: {name}')
        (RUNTIME_SRC / name).write_text(chunk, encoding='utf-8')


def validate_target_materialization() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    components = manifest.get('components') or {}
    bridge = components.get('bridge') or {}
    manager = components.get('bridgeManager') or {}
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('materialized Product version mismatch')
    if bridge.get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('materialized Engine version mismatch')
    if manager.get('version') != TARGET_MANAGER:
        raise SystemExit('Manager semantic version changed during Engine modularization')
    if manager.get('productVersion') != TARGET_VERSION:
        raise SystemExit('Manager product version was not synchronized')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('snapshot/recent-request contracts changed')
    if bridge.get('sha256') != sha256(ENGINE):
        raise SystemExit('manifest Engine hash mismatch')
    if manager.get('sha256') != sha256(MANAGER):
        raise SystemExit('manifest Manager hash mismatch')
    if manager.get('bootstrapSha256') != sha256(BOOTSTRAP):
        raise SystemExit('manifest Manager bootstrap hash mismatch')


part_names = validate_parts_manifest()
manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
current = str(manifest.get('productVersion') or '')

if current == TARGET_VERSION:
    run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--check')
    run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
    validate_target_materialization()
    print(f'{TARGET_VERSION} already materialized and Engine source parity is intact')
    raise SystemExit(0)

if current != BASE_VERSION:
    raise SystemExit(f'expected {BASE_VERSION} baseline, got {current or "missing"}')
components = manifest.get('components') or {}
bridge = components.get('bridge') or {}
manager = components.get('bridgeManager') or {}
if bridge.get('requiredVersion') != BASE_ENGINE:
    raise SystemExit(f'expected Engine {BASE_ENGINE} baseline, got {bridge.get("requiredVersion")}')
if manager.get('version') != TARGET_MANAGER:
    raise SystemExit(f'expected Manager {TARGET_MANAGER} baseline, got {manager.get("version")}')
if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('baseline contracts are not 1/1')
if sha256(ENGINE) != BASE_ENGINE_SHA or bridge.get('sha256') != BASE_ENGINE_SHA:
    raise SystemExit('5.68 Engine artifact does not match the verified 1.6.19 baseline')
if sha256(MANAGER) != BASE_MANAGER_SHA or manager.get('sha256') != BASE_MANAGER_SHA:
    raise SystemExit('5.68 Manager artifact does not match the verified 1.3.0 baseline')

baseline_engine_bytes = ENGINE.read_bytes()
baseline_engine_text = baseline_engine_bytes.decode('utf-8')
manager_before = MANAGER.read_text(encoding='utf-8')

split_engine_baseline(baseline_engine_text, part_names)

replace_once(CORE, '//@version 3.0.0-alpha.5.68', '//@version 3.0.0-alpha.5.69', 'plugin header version')
replace_once(CORE, "const VERSION = '3.0.0-alpha.5.68';", "const VERSION = '3.0.0-alpha.5.69';", 'plugin runtime version')
replace_once(CORE, "const REQUIRED_BRIDGE_VERSION = '1.6.19';", "const REQUIRED_BRIDGE_VERSION = '1.6.20';", 'plugin required Engine version')

replace_once(
    MANAGER,
    "const PRODUCT_VERSION = '3.0.0-alpha.5.68';",
    "const PRODUCT_VERSION = '3.0.0-alpha.5.69';",
    'manager product synchronization',
)
manager_after = MANAGER.read_text(encoding='utf-8')
expected_manager = manager_before.replace(
    "const PRODUCT_VERSION = '3.0.0-alpha.5.68';",
    "const PRODUCT_VERSION = '3.0.0-alpha.5.69';",
    1,
)
if manager_after != expected_manager:
    raise SystemExit('Manager functional body changed beyond product-version synchronization')

replace_once(
    GUIDELINES,
    'Current release implementation: `3.0.0-alpha.5.68 — Diagnostics Capture Identity`.',
    'Current release implementation: `3.0.0-alpha.5.69 — Engine Development Source Modularization`.',
    'current release implementation memory',
)

run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--write')
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--check')

candidate_engine_text = ENGINE.read_text(encoding='utf-8')
normalized_engine = candidate_engine_text.replace(
    f"const VERSION = '{TARGET_ENGINE}';",
    f"const VERSION = '{BASE_ENGINE}';",
    1,
)
if normalized_engine.encode('utf-8') != baseline_engine_bytes:
    raise SystemExit('Engine byte parity failed: modularization changed runtime bytes beyond VERSION 1.6.19 -> 1.6.20')

manifest['productVersion'] = TARGET_VERSION
manifest['components']['plugin']['version'] = TARGET_VERSION
manifest['components']['bridge']['requiredVersion'] = TARGET_ENGINE
manifest['components']['bridge']['sha256'] = sha256(ENGINE)
manifest['components']['bridgeManager']['productVersion'] = TARGET_VERSION
manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
manifest['components']['bridgeManager']['bootstrapSha256'] = sha256(BOOTSTRAP)
MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
run('node', '--check', str(ROOT / 'latest.js'))
run('node', '--check', str(MANAGER))
run('node', '--check', str(ENGINE))
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--check')
validate_target_materialization()

source_manifest = json.loads((SRC / 'manifest.json').read_text(encoding='utf-8'))
if source_manifest.get('version') != TARGET_VERSION:
    raise SystemExit('materialized plugin source manifest version mismatch')
if len(list(RUNTIME_SRC.glob('*.part.mjs'))) != len(part_names):
    raise SystemExit('Engine source part count changed after materialization')

print(f'prepared Local Usage Dashboard {TARGET_VERSION} (engine {TARGET_ENGINE}, manager {TARGET_MANAGER}) Engine Development Source Modularization · {len(part_names)} Engine parts · runtime behavior byte-parity except Engine VERSION literal')
