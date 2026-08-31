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
TESTS = UD / 'tests'
TOOLS = UD / 'tools'
SPEC = ROOT / '.github' / 'usage-dashboard' / 'releases' / '5.98.json'
CORE = SRC / '00-runtime-core.part.js'
ENGINE_CORE = ENGINE_SRC / '00-core.part.mjs'
MODEL_CATEGORY = ENGINE_SRC / '45-model-category.part.mjs'
LATEST = UD / 'latest.js'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
MANIFEST = RUNTIME / 'product-manifest.json'
P63 = TESTS / 'p63-credits-spend-composition-source-fidelity.cjs'

BASE_PRODUCT = '3.0.0-alpha.5.97'
TARGET_PRODUCT = '3.0.0-alpha.5.98'
BASE_ENGINE = '1.6.33'
TARGET_ENGINE = '1.6.34'
BASE_MANAGER = '1.3.5'
TARGET_MANAGER = '1.3.6'
CLI_VERSION = '1.10.0'
BASE_MODELS = '1.251.0'
TARGET_MODELS = '1.280.0'
UPSTREAM_MODELS_COMMIT = 'fbb40efa41c379db5223dff708509b6dd82e05a9'
BASE_ENGINE_SHA = '4e470962c70de434c7027e2c6dcc0d151a11ed9c51ddb9366ea180013a7d3d01'
BASE_MANAGER_SHA = '4760276bae54f1e1163f4a7168b3df815c9174eb637f59028981d8e271cdc009'
BOOTSTRAP_SHA = '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c'
BASE_RELEASE_SHA = 'ef4686126addf26eac07b1d4c3e047e2dfacaaae'


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
        raise SystemExit(f'5.98 {label} anchor mismatch: {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def regex_once(path: Path, pattern: str, replacement: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    next_text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'5.98 {label} regex mismatch: {count}')
    path.write_text(next_text, encoding='utf-8')


def load_spec() -> dict:
    spec = json.loads(SPEC.read_text(encoding='utf-8'))
    expected = {
        'productVersion': TARGET_PRODUCT,
        'engineVersion': TARGET_ENGINE,
        'managerVersion': TARGET_MANAGER,
        'managedCliVersion': CLI_VERSION,
        'managedModelCatalogVersion': TARGET_MODELS,
        'materializer': 'plugins/usage-dashboard/tools/release_models_catalog_598.py',
        'newRegression': 'plugins/usage-dashboard/tests/p64-managed-models-catalog-refresh-fidelity.cjs',
    }
    for key, value in expected.items():
        if spec.get(key) != value:
            raise SystemExit(f'5.98 release spec mismatch: {key}')
    cli = spec.get('managedCliAuthority') or {}
    models = spec.get('managedModelCatalogAuthority') or {}
    if cli.get('package') != '@llmgateway/cli' or cli.get('version') != CLI_VERSION or cli.get('exact') is not True:
        raise SystemExit('5.98 exact CLI authority missing')
    if models.get('package') != '@llmgateway/models' or models.get('version') != TARGET_MODELS or models.get('exact') is not True:
        raise SystemExit('5.98 exact Models authority missing')
    if models.get('upstreamRepository') != 'theopenco/llmgateway' or models.get('upstreamCommit') != UPSTREAM_MODELS_COMMIT:
        raise SystemExit('5.98 upstream Models authority mismatch')
    if spec.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.98 contracts changed')
    if 'verifiedBaseline' in spec or 'latestInstalledEvidence' in spec:
        raise SystemExit('5.98 must use structured release evidence only')
    evidence = spec.get('releaseEvidence') or {}
    if set(evidence.keys()) != {'schemaVersion', 'acceptedBaseline', 'latestInstalled'} or evidence.get('schemaVersion') != 1:
        raise SystemExit('5.98 closed releaseEvidence shape mismatch')
    for role in ('acceptedBaseline', 'latestInstalled'):
        row = evidence.get(role) or {}
        if row.get('productVersion') != BASE_PRODUCT or row.get('releaseSha') != BASE_RELEASE_SHA or row.get('verdict') != 'accepted':
            raise SystemExit(f'5.98 release evidence identity mismatch: {role}')
        if row.get('issue') != 960 or row.get('commentId') != 5475876406:
            raise SystemExit(f'5.98 physical evidence mismatch: {role}')
    return spec


def validate_baseline() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    if manifest.get('productVersion') == TARGET_PRODUCT:
        validate_target()
        print(f'MATERIALIZER_IDEMPOTENT:{TARGET_PRODUCT}')
        raise SystemExit(0)
    if manifest.get('productVersion') != BASE_PRODUCT:
        raise SystemExit('5.98 baseline Product mismatch')
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if bridge.get('requiredVersion') != BASE_ENGINE or bridge.get('sha256') != BASE_ENGINE_SHA:
        raise SystemExit('5.98 baseline Engine mismatch')
    if manager.get('version') != BASE_MANAGER or manager.get('productVersion') != BASE_PRODUCT or manager.get('sha256') != BASE_MANAGER_SHA:
        raise SystemExit('5.98 baseline Manager mismatch')
    if manager.get('managedCliVersion') != CLI_VERSION or manager.get('managedModelCatalogVersion') != BASE_MODELS:
        raise SystemExit('5.98 baseline managed package pair mismatch')
    if sha256(ENGINE) != BASE_ENGINE_SHA or sha256(MANAGER) != BASE_MANAGER_SHA or sha256(BOOTSTRAP) != BOOTSTRAP_SHA:
        raise SystemExit('5.98 baseline artifact bytes mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.98 baseline contracts changed')


def patch_plugin_identity(spec: dict) -> None:
    replace_once(CORE, '//@version 3.0.0-alpha.5.97', '//@version 3.0.0-alpha.5.98', 'Plugin metadata')
    replace_once(CORE, "const VERSION = '3.0.0-alpha.5.97';", "const VERSION = '3.0.0-alpha.5.98';", 'Plugin VERSION')
    replace_once(CORE, "const REQUIRED_BRIDGE_VERSION = '1.6.33';", "const REQUIRED_BRIDGE_VERSION = '1.6.34';", 'Plugin Engine requirement')
    replace_once(CORE, "const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.5';", "const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.6';", 'Plugin Manager requirement')
    notes = spec.get('releaseNotes') or {}
    block = '  const RELEASE_NOTES = Object.freeze({\n'
    block += f"    title: {json.dumps(spec['releaseTitle'], ensure_ascii=False)},\n"
    block += '    highlights: Object.freeze([\n'
    block += ''.join(f"    {json.dumps(value, ensure_ascii=False)},\n" for value in notes.get('highlights', []))
    block += '    ]),\n    diagnosticHints: Object.freeze([\n'
    block += ''.join(f"    {json.dumps(value, ensure_ascii=False)},\n" for value in notes.get('diagnosticHints', []))
    block += '    ]),\n  });\n'
    text = CORE.read_text(encoding='utf-8')
    next_text, count = re.subn(r'  const RELEASE_NOTES = Object\.freeze\(\{.*?\n  \}\);\n', block, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit('5.98 release notes boundary mismatch')
    CORE.write_text(next_text, encoding='utf-8')


def patch_engine_identity() -> None:
    replace_once(ENGINE_CORE, "const VERSION = '1.6.33';", "const VERSION = '1.6.34';", 'Engine VERSION')
    replace_once(ENGINE_CORE, "const MODEL_CATALOG_VERSION = '1.251.0';", "const MODEL_CATALOG_VERSION = '1.280.0';", 'Engine Models pin')


def patch_manager(engine_sha: str) -> None:
    replace_once(MANAGER, "const MANAGER_VERSION = '1.3.5';", "const MANAGER_VERSION = '1.3.6';", 'Manager VERSION')
    replace_once(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.97';", "const PRODUCT_VERSION = '3.0.0-alpha.5.98';", 'Manager Product')
    replace_once(MANAGER, "const BUNDLED_ENGINE_VERSION = '1.6.33';", "const BUNDLED_ENGINE_VERSION = '1.6.34';", 'Manager Engine version')
    regex_once(MANAGER, r"const BUNDLED_ENGINE_SHA256 = '[0-9a-f]{64}';", f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';", 'Manager Engine hash')
    replace_once(MANAGER, "const MANAGED_MODEL_CATALOG_VERSION = '1.251.0';", "const MANAGED_MODEL_CATALOG_VERSION = '1.280.0';", 'Manager Models pin')


def patch_historical_p63() -> None:
    text = P63.read_text(encoding='utf-8')
    guard = "if (release.productVersion !== '3.0.0-alpha.5.97') {\n  console.log(`P63 Credits Spend Composition Source Fidelity: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.97`);\n  process.exit(0);\n}\n// UD_HISTORICAL_VERSION_LOCK\n"
    anchor = "const release = loadCurrentRelease();\n"
    if guard not in text:
        if text.count(anchor) != 1:
            raise SystemExit('5.98 P63 release guard anchor mismatch')
        text = text.replace(anchor, anchor + guard, 1)
    manifest_assertion = "assert.equal(manifest.productVersion, '3.0.0-alpha.5.97');\n"
    manifest_lock = '// UD_HISTORICAL_VERSION_LOCK\n' + manifest_assertion
    if manifest_lock not in text:
        if text.count(manifest_assertion) != 1:
            raise SystemExit('5.98 P63 manifest history anchor mismatch')
        text = text.replace(manifest_assertion, manifest_lock, 1)
    P63.write_text(text, encoding='utf-8')


def sync_manifest(engine_sha: str, manager_sha: str) -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['productVersion'] = TARGET_PRODUCT
    manifest['components']['plugin']['version'] = TARGET_PRODUCT
    manifest['components']['bridge']['requiredVersion'] = TARGET_ENGINE
    manifest['components']['bridge']['sha256'] = engine_sha
    manifest['components']['bridgeManager']['version'] = TARGET_MANAGER
    manifest['components']['bridgeManager']['productVersion'] = TARGET_PRODUCT
    manifest['components']['bridgeManager']['sha256'] = manager_sha
    manifest['components']['bridgeManager']['bootstrapSha256'] = BOOTSTRAP_SHA
    manifest['components']['bridgeManager']['managedCliVersion'] = CLI_VERSION
    manifest['components']['bridgeManager']['managedModelCatalogVersion'] = TARGET_MODELS
    manifest['contracts'] = {'snapshot': 1, 'recentRequest': 1}
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def validate_target() -> None:
    spec = load_spec()
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    core = CORE.read_text(encoding='utf-8')
    engine_core = ENGINE_CORE.read_text(encoding='utf-8')
    manager_text = MANAGER.read_text(encoding='utf-8')
    category = MODEL_CATEGORY.read_text(encoding='utf-8')
    engine_sha = sha256(ENGINE)
    manager_sha = sha256(MANAGER)
    for marker in [
        '//@version 3.0.0-alpha.5.98',
        "const VERSION = '3.0.0-alpha.5.98';",
        "const REQUIRED_BRIDGE_VERSION = '1.6.34';",
        "const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.6';",
    ]:
        if marker not in core:
            raise SystemExit(f'5.98 Plugin identity missing: {marker}')
    for marker in [
        "const VERSION = '1.6.34';",
        "const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';",
        "const MODEL_CATALOG_PACKAGE = '@llmgateway/models';",
        "const MODEL_CATALOG_VERSION = '1.280.0';",
    ]:
        if marker not in engine_core:
            raise SystemExit(f'5.98 Engine identity missing: {marker}')
    for marker in [
        "const MANAGER_VERSION = '1.3.6';",
        "const PRODUCT_VERSION = '3.0.0-alpha.5.98';",
        "const BUNDLED_ENGINE_VERSION = '1.6.34';",
        f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';",
        "const MANAGED_CLI_VERSION = '1.10.0';",
        "const MANAGED_MODEL_CATALOG_VERSION = '1.280.0';",
        '[MANAGED_CLI_PACKAGE]:MANAGED_CLI_VERSION,[MANAGED_MODEL_CATALOG_PACKAGE]:MANAGED_MODEL_CATALOG_VERSION',
    ]:
        if marker not in manager_text:
            raise SystemExit(f'5.98 Manager identity/pair missing: {marker}')
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
            raise SystemExit(f'5.98 classifier invariant missing: {marker}')
    for forbidden in ['fetch(', 'http.request', 'https.request', 'runCli(', 'runCliProcess(', 'setTimeout(', 'setInterval(', 'localStorage', 'Risuai.', '/activity', '/logs']:
        if forbidden in category:
            raise SystemExit(f'5.98 classifier must remain local-only: {forbidden}')
    if manifest.get('productVersion') != TARGET_PRODUCT:
        raise SystemExit('5.98 manifest Product mismatch')
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if bridge.get('requiredVersion') != TARGET_ENGINE or bridge.get('sha256') != engine_sha:
        raise SystemExit('5.98 manifest Engine mismatch')
    if manager.get('version') != TARGET_MANAGER or manager.get('productVersion') != TARGET_PRODUCT or manager.get('sha256') != manager_sha:
        raise SystemExit('5.98 manifest Manager mismatch')
    if manager.get('managedCliVersion') != CLI_VERSION or manager.get('managedModelCatalogVersion') != TARGET_MODELS:
        raise SystemExit('5.98 manifest managed package pair mismatch')
    if sha256(BOOTSTRAP) != BOOTSTRAP_SHA:
        raise SystemExit('5.98 bootstrap changed')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.98 contracts changed')
    p63 = P63.read_text(encoding='utf-8')
    if "if (release.productVersion !== '3.0.0-alpha.5.97')" not in p63:
        raise SystemExit('5.98 P63 historical guard missing')
    if "// UD_HISTORICAL_VERSION_LOCK\nassert.equal(release.productVersion, '3.0.0-alpha.5.97');" not in p63:
        raise SystemExit('5.98 P63 release historical lock placement mismatch')
    if "// UD_HISTORICAL_VERSION_LOCK\nassert.equal(manifest.productVersion, '3.0.0-alpha.5.97');" not in p63:
        raise SystemExit('5.98 P63 manifest historical lock placement mismatch')
    if spec.get('managedModelCatalogAuthority', {}).get('upstreamCommit') != UPSTREAM_MODELS_COMMIT:
        raise SystemExit('5.98 upstream Models commit drift')
    run('node', 'plugins/usage-dashboard/tools/build_usage_dashboard.cjs', '--check')
    run('node', 'plugins/usage-dashboard/tools/build_bridge_engine.cjs', '--check')
    print(f'5.98 TARGET_OK engine={engine_sha} manager={manager_sha} models={TARGET_MODELS}')


spec = load_spec()
validate_baseline()
classifier_before = sha256(MODEL_CATEGORY)
patch_plugin_identity(spec)
patch_engine_identity()
patch_historical_p63()
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--write')
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--check')
engine_sha = sha256(ENGINE)
patch_manager(engine_sha)
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
manager_sha = sha256(MANAGER)
sync_manifest(engine_sha, manager_sha)
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
if sha256(MODEL_CATEGORY) != classifier_before:
    raise SystemExit('5.98 classifier source changed during catalog-only materialization')
run('node', '--check', str(LATEST))
run('node', '--check', str(MANAGER))
run('node', '--check', str(ENGINE))
validate_target()
print(
    f'5.98 materialized: Product {TARGET_PRODUCT}; Engine {TARGET_ENGINE} {engine_sha}; '
    f'Manager {TARGET_MANAGER} {manager_sha}; CLI {CLI_VERSION}; Models {TARGET_MODELS}; '
    f'bootstrap exact {BOOTSTRAP_SHA}; contracts 1/1; classifier policy unchanged'
)
