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
SPEC = Path('.github/usage-dashboard/releases/5.90.json')

CORE = SRC / '00-runtime-core.part.js'
BRIDGE_IO = SRC / '20-bridge-io.part.js'
ENGINE_CORE = RUNTIME_SRC / '00-core.part.mjs'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
LATEST = ROOT / 'latest.js'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')

BASE_VERSION = '3.0.0-alpha.5.89'
TARGET_VERSION = '3.0.0-alpha.5.90'
BASE_ENGINE = '1.6.27'
TARGET_ENGINE = '1.6.28'
BASE_MANAGER = '1.3.3'
TARGET_MANAGER = '1.3.4'
BASE_CLI = '1.14.0'
TARGET_CLI = '1.10.0'
TARGET_RELEASE_TITLE = 'Managed CLI Package Authority Repair'
TARGET_RELEASE_MEMORY = f'Current release implementation: `{TARGET_VERSION} — {TARGET_RELEASE_TITLE}`.'
BASE_ENGINE_SHA = 'd3849b2bb579fcd640938019884f7bf1155c85f9ae519fa83dab5dc704bb3e9b'
BASE_MANAGER_SHA = '35bf1562638a5cb0d25163eea1c795e8eeb1f721af2b1b6d4f15c05d15950854'
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
    if not isinstance(value, dict):
        raise SystemExit('5.90 managed CLI authority must be embedded in release spec')
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
    for key, expected_value in expected.items():
        if value.get(key) != expected_value:
            raise SystemExit(f'5.90 managed CLI authority {key} mismatch: {value.get(key)!r}')


def load_release_notes():
    spec = load_spec()
    validate_authority(spec)
    expected = {
        'productVersion': TARGET_VERSION,
        'engineVersion': TARGET_ENGINE,
        'managerVersion': TARGET_MANAGER,
        'managedCliVersion': TARGET_CLI,
        'materializer': 'plugins/usage-dashboard/tools/release_managed_cli_package_authority_590.py',
    }
    for key, value in expected.items():
        if spec.get(key) != value:
            raise SystemExit(f'5.90 release spec {key} mismatch')
    if spec.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.90 release spec contracts changed from 1/1')
    title = spec.get('releaseTitle')
    highlights = spec.get('highlights')
    hints = spec.get('diagnosticHints')
    if title != TARGET_RELEASE_TITLE:
        raise SystemExit('5.90 release title mismatch')
    for key, value in [('highlights', highlights), ('diagnosticHints', hints)]:
        if not isinstance(value, list) or not 1 <= len(value) <= 5:
            raise SystemExit(f'5.90 {key} must contain 1..5 items')
        if any(not isinstance(item, str) or not item.strip() or len(item) > 180 for item in value):
            raise SystemExit(f'5.90 {key} items must be non-empty bounded strings')
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


def assert_convergence_markers(manager: str, bridge_io: str) -> None:
    for marker in [
        "String(identity?.bridgeVersion || '') === BUNDLED_ENGINE_VERSION",
        "async function waitForManagedEngine(expected, expectedVersion = '', timeoutMs = 12000)",
        "managed engine version mismatch: expected ${expectedVersion}",
        "startManagedCandidate(next, BUNDLED_ENGINE_VERSION)",
    ]:
        if marker not in manager:
            raise SystemExit(f'5.90 must preserve 5.89 Manager convergence marker: {marker}')
    for marker in [
        "if (!status?.connected || status.engineManaged !== true) return status;",
        "const isCurrentBundledEngine = value => value?.engineBundled === true",
        "String(value.engineVersion || '') === REQUIRED_BRIDGE_VERSION",
        "const fresh = await fetchBridgeManagerStatus(true);",
        "engineBundleSyncState:'capability-missing'",
        "engineBundleSyncState:'target-missing'",
        "engineBundleSyncState:'target-mismatch'",
    ]:
        if marker not in bridge_io:
            raise SystemExit(f'5.90 must preserve 5.89 Plugin convergence marker: {marker}')


def validate_baseline() -> None:
    spec = load_spec()
    validate_authority(spec)
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    product = manifest.get('productVersion')
    if product == TARGET_VERSION:
        validate_target()
        return
    if product != BASE_VERSION:
        raise SystemExit(f'5.90 baseline Product mismatch: {product}')
    if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != BASE_ENGINE:
        raise SystemExit('5.90 baseline Engine version mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('version') != BASE_MANAGER:
        raise SystemExit('5.90 baseline Manager version mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.90 baseline contracts mismatch')
    if sha256(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.90 baseline Engine artifact diverged from deployed 5.89')
    if sha256(MANAGER) != BASE_MANAGER_SHA:
        raise SystemExit('5.90 baseline Manager artifact diverged from deployed 5.89')
    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.90 bootstrap baseline diverged')

    core = CORE.read_text(encoding='utf-8')
    engine_core = ENGINE_CORE.read_text(encoding='utf-8')
    manager = MANAGER.read_text(encoding='utf-8')
    bridge_io = BRIDGE_IO.read_text(encoding='utf-8')
    for marker in [
        f"const VERSION = '{BASE_VERSION}';",
        f"const REQUIRED_BRIDGE_VERSION = '{BASE_ENGINE}';",
        f"const REQUIRED_BRIDGE_MANAGER_VERSION = '{BASE_MANAGER}';",
    ]:
        if marker not in core:
            raise SystemExit(f'5.90 baseline Plugin marker missing: {marker}')
    if f"const VERSION = '{BASE_ENGINE}';" not in engine_core:
        raise SystemExit('5.90 baseline Engine source version mismatch')
    if f"const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '{BASE_CLI}';" not in engine_core:
        raise SystemExit('5.90 baseline Engine CLI pin mismatch')
    for marker in [
        f"const MANAGER_VERSION = '{BASE_MANAGER}';",
        f"const PRODUCT_VERSION = '{BASE_VERSION}';",
        f"const BUNDLED_ENGINE_VERSION = '{BASE_ENGINE}';",
        f"const BUNDLED_ENGINE_SHA256 = '{BASE_ENGINE_SHA}';",
        f"const MANAGED_CLI_VERSION = '{BASE_CLI}';",
    ]:
        if marker not in manager:
            raise SystemExit(f'5.90 baseline Manager marker missing: {marker}')
    assert_convergence_markers(manager, bridge_io)


def apply_identity_and_release_notes(title, highlights, hints) -> None:
    replace_once_or_target(CORE, '//@version 3.0.0-alpha.5.89', '//@version 3.0.0-alpha.5.90', '5.90 plugin header version')
    replace_once_or_target(CORE, "  const VERSION = '3.0.0-alpha.5.89';", "  const VERSION = '3.0.0-alpha.5.90';", '5.90 plugin runtime version')
    replace_once_or_target(CORE, "  const REQUIRED_BRIDGE_VERSION = '1.6.27';", "  const REQUIRED_BRIDGE_VERSION = '1.6.28';", '5.90 plugin Engine requirement')
    replace_once_or_target(CORE, "  const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.3';", "  const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.4';", '5.90 plugin Manager requirement')

    text = CORE.read_text(encoding='utf-8')
    notes = release_notes_constant(title, highlights, hints)
    start = text.find('  const RELEASE_NOTES = Object.freeze({')
    end = text.find('  const UPDATE_URL =', start)
    if start < 0 or end <= start:
        raise SystemExit('5.90 static release notes boundary missing')
    if text[start:end] != notes:
        CORE.write_text(text[:start] + notes + text[end:], encoding='utf-8')


def patch_engine_authority() -> None:
    replace_once_or_target(ENGINE_CORE, "const VERSION = '1.6.27';", "const VERSION = '1.6.28';", '5.90 Engine version')
    replace_once_or_target(
        ENGINE_CORE,
        "const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.14.0';",
        "const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';",
        '5.90 Engine managed CLI package authority',
    )


def patch_manager_authority(engine_sha: str) -> None:
    text = MANAGER.read_text(encoding='utf-8')
    replacements = [
        (r"const MANAGER_VERSION = '[^']+';", f"const MANAGER_VERSION = '{TARGET_MANAGER}';", 'Manager version'),
        (r"const PRODUCT_VERSION = '[^']+';", f"const PRODUCT_VERSION = '{TARGET_VERSION}';", 'Manager Product'),
        (r"const BUNDLED_ENGINE_VERSION = '[^']+';", f"const BUNDLED_ENGINE_VERSION = '{TARGET_ENGINE}';", 'Manager bundled Engine version'),
        (r"const BUNDLED_ENGINE_SHA256 = '[0-9a-f]+';", f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';", 'Manager bundled Engine hash'),
        (r"const MANAGED_CLI_VERSION = '[^']+';", f"const MANAGED_CLI_VERSION = '{TARGET_CLI}';", 'Manager managed CLI package authority'),
    ]
    for pattern, replacement, label in replacements:
        text, count = re.subn(pattern, replacement, text, count=1)
        if count != 1:
            raise SystemExit(f'5.90 {label} marker missing')
    MANAGER.write_text(text, encoding='utf-8')


def sync_release_memory() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    current_re = re.compile(r'Current release implementation: `[^`]+`\.', re.M)
    if TARGET_RELEASE_MEMORY not in text:
        text, count = current_re.subn(TARGET_RELEASE_MEMORY, text, count=1)
        if count != 1:
            raise SystemExit('5.90 current release memory marker missing')
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
    bridge_io = BRIDGE_IO.read_text(encoding='utf-8')
    engine_core = ENGINE_CORE.read_text(encoding='utf-8')
    engine = ENGINE.read_text(encoding='utf-8')
    manager = MANAGER.read_text(encoding='utf-8')
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))

    for marker in [
        f"const VERSION = '{TARGET_VERSION}';",
        f"const REQUIRED_BRIDGE_VERSION = '{TARGET_ENGINE}';",
        f"const REQUIRED_BRIDGE_MANAGER_VERSION = '{TARGET_MANAGER}';",
    ]:
        if marker not in core:
            raise SystemExit(f'5.90 Plugin target marker missing: {marker}')
    if f"const VERSION = '{TARGET_ENGINE}';" not in engine_core:
        raise SystemExit('5.90 Engine source version missing')
    if f"const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '{TARGET_CLI}';" not in engine_core:
        raise SystemExit('5.90 Engine package authority pin missing')
    if f"const VERSION = '{TARGET_ENGINE}';" not in engine:
        raise SystemExit('5.90 generated Engine version missing')
    if f"const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '{TARGET_CLI}';" not in engine:
        raise SystemExit('5.90 generated Engine package authority pin missing')
    if "|| '1.14.0';" in engine_core or "|| '1.14.0';" in engine:
        raise SystemExit('5.90 stale invalid Engine CLI 1.14.0 authority remains')

    engine_sha = sha256(ENGINE)
    for marker in [
        f"const MANAGER_VERSION = '{TARGET_MANAGER}';",
        f"const PRODUCT_VERSION = '{TARGET_VERSION}';",
        f"const BUNDLED_ENGINE_VERSION = '{TARGET_ENGINE}';",
        f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';",
        f"const MANAGED_CLI_VERSION = '{TARGET_CLI}';",
    ]:
        if marker not in manager:
            raise SystemExit(f'5.90 Manager target marker missing: {marker}')
    if "const MANAGED_CLI_VERSION = '1.14.0';" in manager:
        raise SystemExit('5.90 stale invalid Manager CLI 1.14.0 authority remains')
    assert_convergence_markers(manager, bridge_io)

    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.90 bootstrap exact-byte preservation failed')
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.90 manifest Product mismatch')
    if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.90 manifest Engine version mismatch')
    if manifest.get('components', {}).get('bridge', {}).get('sha256') != engine_sha:
        raise SystemExit('5.90 manifest Engine hash mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
        raise SystemExit('5.90 manifest Manager version mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.90 manifest Manager Product mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('sha256') != sha256(MANAGER):
        raise SystemExit('5.90 manifest Manager hash mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('bootstrapSha256') != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.90 manifest bootstrap hash mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.90 contracts changed')


spec = load_spec()
validate_authority(spec)
title, highlights, hints = load_release_notes()
validate_baseline()
old_plugin_bytes = LATEST.stat().st_size
old_engine_bytes = ENGINE.stat().st_size
old_manager_bytes = MANAGER.stat().st_size

apply_identity_and_release_notes(title, highlights, hints)
patch_engine_authority()
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--write')
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--check')
patch_manager_authority(sha256(ENGINE))
sync_release_memory()
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
sync_manifest_hashes()
run('node', '--check', str(LATEST))
run('node', '--check', str(MANAGER))
run('node', '--check', str(ENGINE))
validate_target()

print(
    f'5.90 materialized: plugin {old_plugin_bytes}->{LATEST.stat().st_size} bytes; '
    f'Engine {old_engine_bytes}->{ENGINE.stat().st_size} bytes {BASE_ENGINE}->{TARGET_ENGINE} SHA {sha256(ENGINE)}; '
    f'Manager {old_manager_bytes}->{MANAGER.stat().st_size} bytes {BASE_MANAGER}->{TARGET_MANAGER}; '
    f'managed CLI authority {BASE_CLI}->{TARGET_CLI}; contracts 1/1'
)
