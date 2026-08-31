#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
UD = ROOT / 'plugins' / 'usage-dashboard'
SRC = UD / 'src'
ENGINE_SRC = UD / 'runtime-src' / 'bridge-engine'
RUNTIME = UD / 'runtime'
TOOLS = UD / 'tools'
SPEC = ROOT / '.github' / 'usage-dashboard' / 'releases' / '5.97.json'
CORE = SRC / '00-runtime-core.part.js'
DIAGNOSTICS = SRC / '40-diagnostics.part.js'
ENGINE_CORE = ENGINE_SRC / '00-core.part.mjs'
MODEL_CATEGORY = ENGINE_SRC / '45-model-category.part.mjs'
LATEST = UD / 'latest.js'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
MANIFEST = RUNTIME / 'product-manifest.json'
GUIDELINES = ROOT / 'docs' / 'USAGE_DASHBOARD_GUIDELINES.md'

BASE_VERSION = '3.0.0-alpha.5.96'
TARGET_VERSION = '3.0.0-alpha.5.97'
BASE_ENGINE = '1.6.32'
TARGET_ENGINE = '1.6.33'
BASE_MANAGER = '1.3.5'
TARGET_MANAGER = '1.3.6'
TARGET_CLI = '1.10.0'
BASE_CATALOG = '1.251.0'
TARGET_CATALOG = '1.280.0'
BASE_ENGINE_SHA = '5854cfba456b39ae5dc216e049556198cb6d63b9547ddc1b77fad301529f4674'
BASE_MANAGER_SHA = '463c07d065a1b0a6a5bbe46721673447bc9e6b9af1243dbeca36ac2db846dcb1'
BASE_BOOTSTRAP_SHA = '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c'
BASE_RELEASE_SHA = '5fc75fbc0725962997f65de17db4ffaf156ba6f9'
MODELS_TAG_SHA = 'fbb40efa41c379db5223dff708509b6dd82e05a9'


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(*args: str) -> None:
    subprocess.run(args, cwd=ROOT, check=True)


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    if new in text and old not in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'5.97 {label} anchor mismatch: {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def load_spec() -> dict:
    spec = json.loads(SPEC.read_text(encoding='utf-8'))
    expected = {
        'productVersion': TARGET_VERSION,
        'engineVersion': TARGET_ENGINE,
        'managerVersion': TARGET_MANAGER,
        'managedCliVersion': TARGET_CLI,
        'managedModelCatalogVersion': TARGET_CATALOG,
        'materializer': 'plugins/usage-dashboard/tools/release_models_catalog_597.py',
        'newRegression': 'plugins/usage-dashboard/tests/p63-managed-model-catalog-12800-refresh.cjs',
    }
    for key, target in expected.items():
        if spec.get(key) != target:
            raise SystemExit(f'5.97 release spec mismatch: {key}={spec.get(key)!r}')
    cli = spec.get('managedCliAuthority') or {}
    catalog = spec.get('managedModelCatalogAuthority') or {}
    if cli.get('package') != '@llmgateway/cli' or cli.get('version') != TARGET_CLI or cli.get('exact') is not True:
        raise SystemExit('5.97 exact CLI authority missing')
    if cli.get('tagCommit') != '6b1cda1988f32010a9b090c00eb9b2fe672145fe':
        raise SystemExit('5.97 exact CLI tag authority mismatch')
    if catalog.get('package') != '@llmgateway/models' or catalog.get('version') != TARGET_CATALOG or catalog.get('exact') is not True:
        raise SystemExit('5.97 exact Models authority missing')
    if catalog.get('tag') != '@llmgateway/models@1.280.0' or catalog.get('tagCommit') != MODELS_TAG_SHA:
        raise SystemExit('5.97 exact Models tag authority mismatch')
    evidence = spec.get('releaseEvidence') or {}
    accepted = evidence.get('acceptedBaseline') or {}
    latest = evidence.get('latestInstalled') or {}
    if evidence.get('schemaVersion') != 1:
        raise SystemExit('5.97 E20 release evidence schema missing')
    for role, value in [('acceptedBaseline', accepted), ('latestInstalled', latest)]:
        if value.get('productVersion') != BASE_VERSION or value.get('releaseSha') != BASE_RELEASE_SHA or value.get('verdict') != 'accepted':
            raise SystemExit(f'5.97 E20 {role} identity mismatch')
        if value.get('issue') != 1012 or value.get('commentId') != 5474037489:
            raise SystemExit(f'5.97 E20 {role} physical authority mismatch')
    if 'verifiedBaseline' in spec or 'latestInstalledEvidence' in spec:
        raise SystemExit('5.97 legacy evidence owner must be absent')
    if spec.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.97 contracts changed')
    return spec


def validate_baseline() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    product = manifest.get('productVersion')
    if product == TARGET_VERSION:
        validate_target(sha256(ENGINE), sha256(MANAGER))
        print(f'MATERIALIZER_IDEMPOTENT:{TARGET_VERSION}')
        raise SystemExit(0)
    if product != BASE_VERSION:
        raise SystemExit(f'5.97 baseline Product mismatch: {product}')
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if bridge.get('requiredVersion') != BASE_ENGINE:
        raise SystemExit('5.97 baseline Engine semantic mismatch')
    if manager.get('version') != BASE_MANAGER or manager.get('productVersion') != BASE_VERSION:
        raise SystemExit('5.97 baseline Manager identity mismatch')
    if manager.get('managedCliVersion') != TARGET_CLI or manager.get('managedModelCatalogVersion') != BASE_CATALOG:
        raise SystemExit('5.97 baseline managed package pair mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.97 baseline contracts mismatch')
    if sha256(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.97 baseline Engine bytes mismatch')
    if sha256(MANAGER) != BASE_MANAGER_SHA:
        raise SystemExit('5.97 baseline Manager bytes mismatch')
    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.97 baseline bootstrap bytes mismatch')
    core = CORE.read_text(encoding='utf-8')
    engine_core = ENGINE_CORE.read_text(encoding='utf-8')
    manager_text = MANAGER.read_text(encoding='utf-8')
    for marker in [
        '//@version 3.0.0-alpha.5.96',
        "const VERSION = '3.0.0-alpha.5.96';",
        "const REQUIRED_BRIDGE_VERSION = '1.6.32';",
        "const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.5';",
    ]:
        if marker not in core:
            raise SystemExit(f'5.97 baseline Plugin anchor missing: {marker}')
    for marker in [
        "const VERSION = '1.6.32';",
        "const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';",
        "const MODEL_CATALOG_VERSION = '1.251.0';",
    ]:
        if marker not in engine_core:
            raise SystemExit(f'5.97 baseline Engine anchor missing: {marker}')
    for marker in [
        "const MANAGER_VERSION = '1.3.5';",
        "const PRODUCT_VERSION = '3.0.0-alpha.5.96';",
        "const BUNDLED_ENGINE_VERSION = '1.6.32';",
        "const MANAGED_CLI_VERSION = '1.10.0';",
        "const MANAGED_MODEL_CATALOG_VERSION = '1.251.0';",
    ]:
        if marker not in manager_text:
            raise SystemExit(f'5.97 baseline Manager anchor missing: {marker}')


def patch_plugin_identity(spec: dict) -> None:
    replace_once(CORE, '//@version 3.0.0-alpha.5.96', '//@version 3.0.0-alpha.5.97', 'Plugin metadata')
    replace_once(CORE, "const VERSION = '3.0.0-alpha.5.96';", "const VERSION = '3.0.0-alpha.5.97';", 'Plugin VERSION')
    replace_once(CORE, "const REQUIRED_BRIDGE_VERSION = '1.6.32';", "const REQUIRED_BRIDGE_VERSION = '1.6.33';", 'Plugin Engine requirement')
    replace_once(CORE, "const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.5';", "const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.6';", 'Plugin Manager requirement')
    notes = spec.get('releaseNotes') or {}
    highlights = notes.get('highlights') or []
    hints = notes.get('diagnosticHints') or []
    block = "  const RELEASE_NOTES = Object.freeze({\n"
    block += f"    title: {json.dumps(spec['releaseTitle'], ensure_ascii=False)},\n"
    block += "    highlights: Object.freeze([\n" + ''.join(f"    {json.dumps(v, ensure_ascii=False)},\n" for v in highlights) + "    ]),\n"
    block += "    diagnosticHints: Object.freeze([\n" + ''.join(f"    {json.dumps(v, ensure_ascii=False)},\n" for v in hints) + "    ]),\n"
    block += "  });\n"
    text = CORE.read_text(encoding='utf-8')
    next_text, count = re.subn(r"  const RELEASE_NOTES = Object\.freeze\(\{.*?\n  \}\);\n", block, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit('5.97 release notes boundary mismatch')
    CORE.write_text(next_text, encoding='utf-8')


def patch_engine_core() -> None:
    replace_once(ENGINE_CORE, "const VERSION = '1.6.32';", "const VERSION = '1.6.33';", 'Engine VERSION')
    replace_once(ENGINE_CORE, "const MODEL_CATALOG_VERSION = '1.251.0';", "const MODEL_CATALOG_VERSION = '1.280.0';", 'Engine Models pin')
    text = ENGINE_CORE.read_text(encoding='utf-8')
    for marker in [
        "const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';",
        "const MODEL_CATALOG_PACKAGE = '@llmgateway/models';",
    ]:
        if marker not in text:
            raise SystemExit(f'5.97 Engine package authority drift: {marker}')


def patch_manager(engine_sha: str) -> None:
    replacements = [
        ("const MANAGER_VERSION = '1.3.5';", "const MANAGER_VERSION = '1.3.6';", 'Manager VERSION'),
        ("const PRODUCT_VERSION = '3.0.0-alpha.5.96';", "const PRODUCT_VERSION = '3.0.0-alpha.5.97';", 'Manager Product'),
        ("const BUNDLED_ENGINE_VERSION = '1.6.32';", "const BUNDLED_ENGINE_VERSION = '1.6.33';", 'Manager Engine semantic'),
        ("const MANAGED_MODEL_CATALOG_VERSION = '1.251.0';", "const MANAGED_MODEL_CATALOG_VERSION = '1.280.0';", 'Manager Models pin'),
    ]
    text = MANAGER.read_text(encoding='utf-8')
    for old, new, label in replacements:
        if new in text and old not in text:
            continue
        count = text.count(old)
        if count != 1:
            raise SystemExit(f'5.97 {label} anchor mismatch: {count}')
        text = text.replace(old, new, 1)
    next_text, count = re.subn(r"const BUNDLED_ENGINE_SHA256 = '[0-9a-f]{64}';", f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';", text, count=1)
    if count != 1:
        raise SystemExit('5.97 Manager Engine hash anchor mismatch')
    if "const MANAGED_CLI_VERSION = '1.10.0';" not in next_text:
        raise SystemExit('5.97 Manager CLI pin drift')
    MANAGER.write_text(next_text, encoding='utf-8')


def sync_guidelines() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    target = "Current release implementation: `3.0.0-alpha.5.97 / Engine 1.6.33 / Manager 1.3.6 / CLI 1.10.0 / Models 1.280.0`."
    text, count = re.subn(r"Current release implementation: `[^`]+`\.", target, text, count=1)
    if count != 1:
        raise SystemExit('5.97 current release memory marker missing')
    GUIDELINES.write_text(text, encoding='utf-8')


def sync_manifest(engine_sha: str, manager_sha: str) -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['productVersion'] = TARGET_VERSION
    manifest['components']['plugin']['version'] = TARGET_VERSION
    manifest['components']['bridge']['requiredVersion'] = TARGET_ENGINE
    manifest['components']['bridge']['sha256'] = engine_sha
    manifest['components']['bridgeManager']['version'] = TARGET_MANAGER
    manifest['components']['bridgeManager']['productVersion'] = TARGET_VERSION
    manifest['components']['bridgeManager']['sha256'] = manager_sha
    manifest['components']['bridgeManager']['bootstrapSha256'] = BASE_BOOTSTRAP_SHA
    manifest['components']['bridgeManager']['managedCliVersion'] = TARGET_CLI
    manifest['components']['bridgeManager']['managedModelCatalogVersion'] = TARGET_CATALOG
    manifest['contracts'] = {'snapshot': 1, 'recentRequest': 1}
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def validate_target(engine_sha: str, manager_sha: str) -> None:
    core = CORE.read_text(encoding='utf-8')
    engine_core = ENGINE_CORE.read_text(encoding='utf-8')
    category = MODEL_CATEGORY.read_text(encoding='utf-8')
    diagnostics = DIAGNOSTICS.read_text(encoding='utf-8')
    manager_text = MANAGER.read_text(encoding='utf-8')
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    for marker in [
        '//@version 3.0.0-alpha.5.97',
        "const VERSION = '3.0.0-alpha.5.97';",
        "const REQUIRED_BRIDGE_VERSION = '1.6.33';",
        "const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.6';",
    ]:
        if marker not in core:
            raise SystemExit(f'5.97 Plugin target missing: {marker}')
    for marker in [
        "const VERSION = '1.6.33';",
        "const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';",
        "const MODEL_CATALOG_PACKAGE = '@llmgateway/models';",
        "const MODEL_CATALOG_VERSION = '1.280.0';",
    ]:
        if marker not in engine_core:
            raise SystemExit(f'5.97 Engine target missing: {marker}')
    for marker in [
        'function normalizeModelCategoryId(usedModel)',
        'function buildModelCategoryMap(models)',
        'function classifyModelCategoryFromMap(usedModel, catalogMap)',
        'inputPrice >= 5e-6',
        'outputPrice >= 15e-6',
        "modelCategory:'unknown',modelCategorySource:'unknown'",
        "modelCategorySource:'llmgateway-model-catalog'",
    ]:
        if marker not in category:
            raise SystemExit(f'5.97 classifier invariant missing: {marker}')
    if '1.280.0' in diagnostics:
        raise SystemExit('5.97 Plugin diagnostics must not hardcode Models version')
    for marker in [
        "const MANAGER_VERSION = '1.3.6';",
        "const PRODUCT_VERSION = '3.0.0-alpha.5.97';",
        "const BUNDLED_ENGINE_VERSION = '1.6.33';",
        "const MANAGED_CLI_VERSION = '1.10.0';",
        "const MANAGED_MODEL_CATALOG_VERSION = '1.280.0';",
        f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';",
        '[MANAGED_CLI_PACKAGE]:MANAGED_CLI_VERSION,[MANAGED_MODEL_CATALOG_PACKAGE]:MANAGED_MODEL_CATALOG_VERSION',
        'catalogPackage:MANAGED_MODEL_CATALOG_PACKAGE',
        'catalogVersion:MANAGED_MODEL_CATALOG_VERSION',
    ]:
        if marker not in manager_text:
            raise SystemExit(f'5.97 Manager target missing: {marker}')
    if sha256(ENGINE) != engine_sha or sha256(MANAGER) != manager_sha:
        raise SystemExit('5.97 generated artifact hash drift')
    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.97 bootstrap exact-byte preservation failed')
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if manifest.get('productVersion') != TARGET_VERSION or bridge.get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.97 manifest Product/Engine mismatch')
    if manager.get('version') != TARGET_MANAGER or manager.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.97 manifest Manager identity mismatch')
    if manager.get('managedCliVersion') != TARGET_CLI or manager.get('managedModelCatalogVersion') != TARGET_CATALOG:
        raise SystemExit('5.97 manifest managed package identity mismatch')
    if bridge.get('sha256') != engine_sha or manager.get('sha256') != manager_sha or manager.get('bootstrapSha256') != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.97 manifest hash mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.97 contracts changed')


spec = load_spec()
validate_baseline()
old_plugin_bytes = LATEST.stat().st_size
old_engine_bytes = ENGINE.stat().st_size
old_manager_bytes = MANAGER.stat().st_size
patch_plugin_identity(spec)
patch_engine_core()
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--write')
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--check')
engine_sha = sha256(ENGINE)
patch_manager(engine_sha)
sync_guidelines()
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
manager_sha = sha256(MANAGER)
sync_manifest(engine_sha, manager_sha)
run('node', '--check', str(LATEST))
run('node', '--check', str(MANAGER))
run('node', '--check', str(ENGINE))
validate_target(engine_sha, manager_sha)
print(
    f'5.97 materialized: Plugin {old_plugin_bytes}->{LATEST.stat().st_size}; '
    f'Engine {old_engine_bytes}->{ENGINE.stat().st_size} v{TARGET_ENGINE} SHA {engine_sha}; '
    f'Manager {old_manager_bytes}->{MANAGER.stat().st_size} v{TARGET_MANAGER} Product {BASE_VERSION}->{TARGET_VERSION} SHA {manager_sha}; '
    f'CLI {TARGET_CLI} + Models {BASE_CATALOG}->{TARGET_CATALOG}; contracts 1/1; bootstrap exact {BASE_BOOTSTRAP_SHA}'
)
