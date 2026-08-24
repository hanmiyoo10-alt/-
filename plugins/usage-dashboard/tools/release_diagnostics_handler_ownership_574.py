from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
TOOLS = ROOT / 'tools'
CORE = SRC / '00-runtime-core.part.js'
WORKSPACE = SRC / '62-diagnostics-workspace.part.js'
INSTANT = SRC / '63-diagnostics-instant-mode.part.js'
AUDIT = SRC / '64-runtime-weight-audit.part.js'
PARTS = SRC / 'parts.cjs'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')

BASE_VERSION = '3.0.0-alpha.5.73'
TARGET_VERSION = '3.0.0-alpha.5.74'
TARGET_ENGINE = '1.6.22'
TARGET_MANAGER = '1.3.0'
BASE_RELEASE_TITLE = 'Runtime Weight & Lifecycle Audit'
TARGET_RELEASE_TITLE = 'Diagnostics Mode Handler Ownership Consolidation'
BASE_RELEASE_MEMORY = f'Current release implementation: `{BASE_VERSION} — {BASE_RELEASE_TITLE}`.'
TARGET_RELEASE_MEMORY = f'Current release implementation: `{TARGET_VERSION} — {TARGET_RELEASE_TITLE}`.'
BASE_VERIFIED_BASELINE = 'Last verified real-device baseline: `3.0.0-alpha.5.67 — Diagnostics Workspace Overhaul`.'
TARGET_VERIFIED_BASELINE = 'Last verified real-device baseline: `3.0.0-alpha.5.73 — Runtime Weight & Lifecycle Audit`.'
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
        raise SystemExit(f'5.74 release memory sync: expected exactly one 5.73 memory line, found {count}')
    GUIDELINES.write_text(text.replace(BASE_RELEASE_MEMORY, TARGET_RELEASE_MEMORY, 1), encoding='utf-8')


def sync_verified_baseline() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    if TARGET_VERIFIED_BASELINE in text:
        return
    count = text.count(BASE_VERIFIED_BASELINE)
    if count != 1:
        raise SystemExit(f'5.74 verified baseline sync: expected exactly one 5.67 baseline line, found {count}')
    GUIDELINES.write_text(text.replace(BASE_VERIFIED_BASELINE, TARGET_VERIFIED_BASELINE, 1), encoding='utf-8')


def sync_manifest_hashes() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['components']['bridge']['sha256'] = sha256(ENGINE)
    manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
    manifest['components']['bridgeManager']['bootstrapSha256'] = sha256(BOOTSTRAP)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def validate_handler_ownership_source() -> None:
    workspace = WORKSPACE.read_text(encoding='utf-8')
    instant = INSTANT.read_text(encoding='utf-8')
    audit = AUDIT.read_text(encoding='utf-8')
    parts = PARTS.read_text(encoding='utf-8')

    for forbidden in [
        'const setMode = async mode =>',
        "q('#diagnostics-mode-basic').onclick",
        "q('#diagnostics-mode-detailed').onclick",
        'state.diagnosticsMode = next;\n      await persist();\n      renderSettings();',
    ]:
        if forbidden in workspace:
            raise SystemExit(f'5.74 superseded module-62 handler path remains: {forbidden}')

    for required in [
        "const basic = document.querySelector('#diagnostics-mode-basic');",
        "const detailed = document.querySelector('#diagnostics-mode-detailed');",
        "basic.onclick = () => setDiagnosticsModeInstant('basic');",
        "detailed.onclick = () => setDiagnosticsModeInstant('detailed');",
        'state.diagnosticsMode = next;',
        'renderSettingsPartial();',
        'void persistDiagnosticsModeSerialized(next);',
        'diagnosticsMode:capturedMode',
    ]:
        if required not in instant:
            raise SystemExit(f'5.74 authoritative module-63 marker missing: {required}')

    if instant.count("basic.onclick = () => setDiagnosticsModeInstant('basic');") != 1:
        raise SystemExit('5.74 Basic mode click authority must appear exactly once in module 63')
    if instant.count("detailed.onclick = () => setDiagnosticsModeInstant('detailed');") != 1:
        raise SystemExit('5.74 Detailed mode click authority must appear exactly once in module 63')

    i62 = parts.find("file:'62-diagnostics-workspace.part.js'")
    i63 = parts.find("file:'63-diagnostics-instant-mode.part.js'")
    i64 = parts.find("file:'64-runtime-weight-audit.part.js'")
    if not (0 <= i62 < i63 < i64):
        raise SystemExit('5.74 module order must remain 62 -> 63 -> 64')
    if 'Runtime Weight Audit' not in audit:
        raise SystemExit('5.74 must preserve 5.73 Runtime Weight Audit')

    for forbidden in [
        'nativeFetch(', 'fetchSnapshot(', 'enqueueRefresh(', 'runCli(', 'setInterval(', 'setTimeout(',
        'scheduleRefresh(', 'schedulePanelRender(', 'renderSettings()',
    ]:
        if forbidden in instant:
            raise SystemExit(f'5.74 instant mode path introduced forbidden I/O/scheduler/full-render marker: {forbidden}')


def validate_target() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.74 Product version mismatch')
    if manifest.get('components', {}).get('plugin', {}).get('version') != TARGET_VERSION:
        raise SystemExit('5.74 plugin version mismatch')
    if bridge.get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.74 Engine version mismatch')
    if manager.get('version') != TARGET_MANAGER or manager.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.74 Manager identity mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.74 contracts changed from 1/1')
    if sha256(ENGINE) != BASE_ENGINE_SHA or bridge.get('sha256') != BASE_ENGINE_SHA:
        raise SystemExit('5.74 Engine artifact must remain byte-identical to 5.73')
    if manager.get('sha256') != sha256(MANAGER):
        raise SystemExit('5.74 Manager hash mismatch')
    if manager.get('bootstrapSha256') != sha256(BOOTSTRAP):
        raise SystemExit('5.74 bootstrap hash mismatch')
    guidelines = GUIDELINES.read_text(encoding='utf-8')
    if TARGET_RELEASE_MEMORY not in guidelines:
        raise SystemExit('5.74 current release memory mismatch')
    if TARGET_VERIFIED_BASELINE not in guidelines:
        raise SystemExit('5.74 verified real-device baseline mismatch')
    core = CORE.read_text(encoding='utf-8')
    latest = (ROOT / 'latest.js').read_text(encoding='utf-8')
    if f'//@version {TARGET_VERSION}' not in core or f"const VERSION = '{TARGET_VERSION}';" not in core:
        raise SystemExit('5.74 plugin source version mismatch')
    if f"const PRODUCT_VERSION = '{TARGET_VERSION}';" not in MANAGER.read_text(encoding='utf-8'):
        raise SystemExit('5.74 Manager product version not synchronized')
    for marker in [
        "basic.onclick = () => setDiagnosticsModeInstant('basic');",
        "detailed.onclick = () => setDiagnosticsModeInstant('detailed');",
        'Runtime Weight Audit',
        'id="copy-diag-summary"',
        'id="copy-diag"',
    ]:
        if marker not in latest:
            raise SystemExit(f'5.74 built ownership/audit marker missing: {marker}')
    validate_handler_ownership_source()


manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
current = str(manifest.get('productVersion') or '')
if current not in {BASE_VERSION, TARGET_VERSION}:
    raise SystemExit(f'expected {BASE_VERSION} or {TARGET_VERSION}, got {current or "missing"}')
if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != TARGET_ENGINE:
    raise SystemExit('5.74 baseline Engine version is not 1.6.22')
if sha256(ENGINE) != BASE_ENGINE_SHA:
    raise SystemExit('5.74 baseline Engine artifact diverged from 5.73')
if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
    raise SystemExit('5.74 baseline Manager version is not 1.3.0')
if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('5.74 baseline contracts are not 1/1')

validate_handler_ownership_source()

if current == BASE_VERSION:
    replace_once(CORE, '//@version 3.0.0-alpha.5.73', '//@version 3.0.0-alpha.5.74', 'plugin header version')
    replace_once(CORE, "const VERSION = '3.0.0-alpha.5.73';", "const VERSION = '3.0.0-alpha.5.74';", 'plugin runtime version')
    replace_once(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.73';", "const PRODUCT_VERSION = '3.0.0-alpha.5.74';", 'manager Product version')
    manifest['productVersion'] = TARGET_VERSION
    manifest['components']['plugin']['version'] = TARGET_VERSION
    manifest['components']['bridgeManager']['productVersion'] = TARGET_VERSION
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

sync_release_memory()
sync_verified_baseline()
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
sync_manifest_hashes()
run('node', '--check', str(ROOT / 'latest.js'))
run('node', '--check', str(MANAGER))
run('node', '--check', str(ENGINE))
validate_target()
print(f'{TARGET_VERSION} materialized · Engine {TARGET_ENGINE} byte-identical · Diagnostics mode handler ownership consolidated')
