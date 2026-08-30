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
SPEC = ROOT / '.github' / 'usage-dashboard' / 'releases' / '5.96.json'
CORE = SRC / '00-runtime-core.part.js'
DIAGNOSTICS = SRC / '40-diagnostics.part.js'
DIAG_WORKSPACE = SRC / '62-diagnostics-workspace.part.js'
ENGINE_CORE = ENGINE_SRC / '00-core.part.mjs'
ENGINE_CLI = ENGINE_SRC / '30-cli-runtime.part.mjs'
MODEL_CATEGORY = ENGINE_SRC / '45-model-category.part.mjs'
LATEST = UD / 'latest.js'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
MANIFEST = RUNTIME / 'product-manifest.json'
GUIDELINES = ROOT / 'docs' / 'USAGE_DASHBOARD_GUIDELINES.md'

BASE_VERSION = '3.0.0-alpha.5.95'
TARGET_VERSION = '3.0.0-alpha.5.96'
BASE_ENGINE = '1.6.31'
TARGET_ENGINE = '1.6.32'
MANAGER_VERSION = '1.3.5'
TARGET_CLI = '1.10.0'
CATALOG_VERSION = '1.251.0'
BASE_ENGINE_SHA = 'b46f307494514eefdb2a237e54b18ba04c1582f2eb7766a0a6828d28604470d4'
BASE_MANAGER_SHA = '396b906a37257ff8e41f176d394d13c38715c2887fc8d95ed7c0ac3203d9ec63'
BASE_BOOTSTRAP_SHA = '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c'


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
        raise SystemExit(f'5.96 {label} anchor mismatch: {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def load_spec() -> dict:
    spec = json.loads(SPEC.read_text(encoding='utf-8'))
    expected = {
        'productVersion': TARGET_VERSION,
        'engineVersion': TARGET_ENGINE,
        'managerVersion': MANAGER_VERSION,
        'managedCliVersion': TARGET_CLI,
        'managedModelCatalogVersion': CATALOG_VERSION,
        'materializer': 'plugins/usage-dashboard/tools/release_diagnostic_identity_596.py',
        'newRegression': 'plugins/usage-dashboard/tests/p62-managed-runtime-diagnostic-identity-fidelity.cjs',
    }
    for key, target in expected.items():
        if spec.get(key) != target:
            raise SystemExit(f'5.96 release spec mismatch: {key}={spec.get(key)!r}')
    cli = spec.get('managedCliAuthority') or {}
    catalog = spec.get('managedModelCatalogAuthority') or {}
    identity = spec.get('diagnosticIdentityContract') or {}
    if cli.get('package') != '@llmgateway/cli' or cli.get('version') != TARGET_CLI or cli.get('exact') is not True:
        raise SystemExit('5.96 exact CLI authority missing')
    if catalog.get('package') != '@llmgateway/models' or catalog.get('version') != CATALOG_VERSION or catalog.get('exact') is not True:
        raise SystemExit('5.96 exact Models authority missing')
    if identity.get('disjointVersionFields') is not True or identity.get('engineManagerMismatch') != 'fail-closed' or identity.get('fullAndCompactShareTruth') is not True:
        raise SystemExit('5.96 diagnostic identity contract missing')
    if spec.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.96 contracts changed')
    return spec


def validate_baseline() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    product = manifest.get('productVersion')
    if product == TARGET_VERSION:
        validate_target(sha256(ENGINE), sha256(MANAGER))
        print(f'MATERIALIZER_IDEMPOTENT:{TARGET_VERSION}')
        raise SystemExit(0)
    if product != BASE_VERSION:
        raise SystemExit(f'5.96 baseline Product mismatch: {product}')
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if bridge.get('requiredVersion') != BASE_ENGINE:
        raise SystemExit('5.96 baseline Engine semantic mismatch')
    if manager.get('version') != MANAGER_VERSION or manager.get('productVersion') != BASE_VERSION:
        raise SystemExit('5.96 baseline Manager identity mismatch')
    if manager.get('managedCliVersion') != TARGET_CLI or manager.get('managedModelCatalogVersion') != CATALOG_VERSION:
        raise SystemExit('5.96 baseline managed package pair mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.96 baseline contracts mismatch')
    if sha256(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.96 baseline Engine bytes mismatch')
    if sha256(MANAGER) != BASE_MANAGER_SHA:
        raise SystemExit('5.96 baseline Manager bytes mismatch')
    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.96 baseline bootstrap bytes mismatch')
    category = MODEL_CATEGORY.read_text(encoding='utf-8')
    if category.count('return {...runtime, ...modelCategoryCatalogStatus};') != 1:
        raise SystemExit('5.96 baseline diagnostic overwrite anchor missing')
    diagnostics = DIAGNOSTICS.read_text(encoding='utf-8')
    if "version === '1.251.0'" not in diagnostics or '@llmgateway/models 1.251.0' not in diagnostics:
        raise SystemExit('5.96 baseline Plugin catalog hardcode anchor missing')


def patch_plugin_identity(spec: dict) -> None:
    replace_once(CORE, '//@version 3.0.0-alpha.5.95', '//@version 3.0.0-alpha.5.96', 'Plugin metadata')
    replace_once(CORE, "const VERSION = '3.0.0-alpha.5.95';", "const VERSION = '3.0.0-alpha.5.96';", 'Plugin VERSION')
    replace_once(CORE, "const REQUIRED_BRIDGE_VERSION = '1.6.31';", "const REQUIRED_BRIDGE_VERSION = '1.6.32';", 'Plugin Engine requirement')
    if "const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.5';" not in CORE.read_text(encoding='utf-8'):
        raise SystemExit('5.96 Plugin Manager requirement drift')
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
        raise SystemExit('5.96 release notes boundary mismatch')
    CORE.write_text(next_text, encoding='utf-8')


def patch_engine_core() -> None:
    replace_once(ENGINE_CORE, "const VERSION = '1.6.31';", "const VERSION = '1.6.32';", 'Engine VERSION')
    text = ENGINE_CORE.read_text(encoding='utf-8')
    for marker in [
        "const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';",
        "const MODEL_CATALOG_PACKAGE = '@llmgateway/models';",
        "const MODEL_CATALOG_VERSION = '1.251.0';",
    ]:
        if marker not in text:
            raise SystemExit(f'5.96 Engine package authority drift: {marker}')


def patch_engine_cli_runtime() -> None:
    text = ENGINE_CLI.read_text(encoding='utf-8')
    if 'cliVersion:runtime.version,' in text:
        return
    old = "    version:runtime.version,\n    provisioning:runtime.provisioning,"
    new = "    version:runtime.version,\n    cliVersion:runtime.version,\n    provisioning:runtime.provisioning,"
    if text.count(old) != 1:
        raise SystemExit(f'5.96 Engine cliVersion anchor mismatch: {text.count(old)}')
    ENGINE_CLI.write_text(text.replace(old, new, 1), encoding='utf-8')


def patch_model_category_status() -> None:
    text = MODEL_CATEGORY.read_text(encoding='utf-8')
    replacements = [
        (
            "let modelCategoryCatalogStatus = Object.freeze({state:'unavailable',version:'',expectedVersion:MODEL_CATALOG_VERSION});",
            "let modelCategoryCatalogStatus = Object.freeze({modelCatalogState:'unavailable',modelCatalogVersion:'',modelCatalogExpectedVersion:MODEL_CATALOG_VERSION});",
            'initial catalog status',
        ),
        (
            "modelCategoryCatalogStatus = Object.freeze({state:'ready',version:MODEL_CATALOG_VERSION,expectedVersion:MODEL_CATALOG_VERSION});",
            "modelCategoryCatalogStatus = Object.freeze({modelCatalogState:'ready',modelCatalogVersion:MODEL_CATALOG_VERSION,modelCatalogExpectedVersion:MODEL_CATALOG_VERSION});",
            'ready catalog status',
        ),
        (
            "modelCategoryCatalogStatus = Object.freeze({state:'unavailable',version:'',expectedVersion:MODEL_CATALOG_VERSION});",
            "modelCategoryCatalogStatus = Object.freeze({modelCatalogState:'unavailable',modelCatalogVersion:'',modelCatalogExpectedVersion:MODEL_CATALOG_VERSION});",
            'unavailable catalog status',
        ),
        (
            "  return {...runtime, ...modelCategoryCatalogStatus};",
            "  return {\n    ...runtime,\n    modelCatalogState:modelCategoryCatalogStatus.modelCatalogState,\n    modelCatalogVersion:modelCategoryCatalogStatus.modelCatalogVersion,\n    modelCatalogExpectedVersion:modelCategoryCatalogStatus.modelCatalogExpectedVersion,\n  };",
            'diagnostic namespace projection',
        ),
    ]
    for old, new, label in replacements:
        if new in text and old not in text:
            continue
        count = text.count(old)
        if count != 1:
            raise SystemExit(f'5.96 {label} anchor mismatch: {count}')
        text = text.replace(old, new, 1)
    MODEL_CATEGORY.write_text(text, encoding='utf-8')


DIAGNOSTIC_IDENTITY_HELPERS = r'''  function runtimeIdentityVersionTruth(engineValue, managerValue) {
    const engine = String(engineValue || '').trim();
    const manager = String(managerValue || '').trim();
    if (engine && manager && engine !== manager) return {state:'mismatch',version:'',engine,manager};
    const version = engine || manager;
    return {state:version ? 'known' : 'unknown',version,engine,manager};
  }

  function managedRuntimeIdentityTruth(diagnostics) {
    const runtime = diagnostics?.cliRuntime && typeof diagnostics.cliRuntime === 'object' ? diagnostics.cliRuntime : null;
    const manager = state.bridgeManagerRuntime || null;
    const cli = runtimeIdentityVersionTruth(runtime?.cliVersion || runtime?.version, manager?.cliRuntimeVersion);
    const models = runtimeIdentityVersionTruth(runtime?.modelCatalogVersion, manager?.cliCatalogVersion);
    const rawCliState = String(runtime?.state || manager?.cliRuntimeState || '');
    const rawModelState = String(runtime?.modelCatalogState || manager?.cliCatalogState || '');
    const rawProvisioning = String(runtime?.provisioning || manager?.cliRuntimeProvisioning || '');
    const cliState = ['ready','provisioning','unavailable','invalid'].includes(rawCliState) ? rawCliState : 'unavailable';
    const modelState = ['ready','unavailable','invalid'].includes(rawModelState) ? rawModelState : 'unavailable';
    const provisioning = ['ok','pending','backoff','disabled','unavailable'].includes(rawProvisioning) ? rawProvisioning : 'unavailable';
    const modelExpectedVersion = String(runtime?.modelCatalogExpectedVersion || '').trim();
    return {cli,models,cliState,modelState,provisioning,modelExpectedVersion};
  }

  function bridgeCliRuntimeText(diagnostics) {
    const truth = managedRuntimeIdentityTruth(diagnostics);
    if (truth.cli.state === 'mismatch') {
      return `managed · mismatch · @llmgateway/cli engine ${truth.cli.engine || '—'} · manager ${truth.cli.manager || '—'} · provisioning ${truth.provisioning}`;
    }
    return `managed · ${truth.cliState} · @llmgateway/cli ${truth.cli.version || '—'} · provisioning ${truth.provisioning}`;
  }


  function modelCategoryCatalogDiagnosticText(diagnostics) {
    const truth = managedRuntimeIdentityTruth(diagnostics);
    if (truth.models.state === 'mismatch') {
      return `managed · mismatch · @llmgateway/models engine ${truth.models.engine || '—'} · manager ${truth.models.manager || '—'}`;
    }
    if (truth.modelState === 'ready' && truth.models.version) return `managed · ready · @llmgateway/models ${truth.models.version}`;
    return `managed · ${truth.modelState === 'invalid' ? 'invalid' : 'unavailable'} · expected @llmgateway/models ${truth.modelExpectedVersion || '—'}`;
  }

'''


def patch_diagnostics() -> None:
    text = DIAGNOSTICS.read_text(encoding='utf-8')
    pattern = r"  function bridgeCliRuntimeText\(diagnostics\) \{.*?\n  \}\n\n\n  function modelCategoryCatalogDiagnosticText\(diagnostics\) \{.*?\n  \}\n\n"
    next_text, count = re.subn(pattern, DIAGNOSTIC_IDENTITY_HELPERS, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'5.96 Plugin diagnostic helper boundary mismatch: {count}')
    if '1.251.0' in next_text:
        raise SystemExit('5.96 Plugin diagnostics must not hardcode Models version')
    DIAGNOSTICS.write_text(next_text, encoding='utf-8')


def patch_diagnostics_workspace() -> None:
    text = DIAG_WORKSPACE.read_text(encoding='utf-8')
    cli_pattern = r"  function diagnosticsWorkspaceCliRuntime\(\) \{.*?\n  \}\n"
    cli_replacement = r'''  function diagnosticsWorkspaceCliRuntime() {
    const truth = managedRuntimeIdentityTruth(state.data?.bridge?.diagnostics);
    return {
      state:truth.cliState,
      version:truth.cli.version,
      provisioning:truth.provisioning,
      identityState:truth.cli.state,
      modelState:truth.modelState,
      modelVersion:truth.models.version,
      modelIdentityState:truth.models.state,
    };
  }
'''
    text, count = re.subn(cli_pattern, cli_replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'5.96 compact CLI truth boundary mismatch: {count}')
    old_issue = "    if (cli.state !== 'ready') issues.push(`CLI runtime ${cli.state}`);"
    new_issue = "    if (cli.state !== 'ready') issues.push(`CLI runtime ${cli.state}`);\n    if (cli.identityState === 'mismatch') issues.push('CLI identity mismatch');\n    if (cli.modelIdentityState === 'mismatch') issues.push('Models identity mismatch');"
    if text.count(old_issue) != 1:
        raise SystemExit('5.96 compact issue anchor mismatch')
    text = text.replace(old_issue, new_issue, 1)
    old_text = "`Runtime: Engine ${model.engineVersion || '—'} · Manager ${model.managerVersion || '—'} · Managed CLI ${model.cli.version ? `v${model.cli.version}` : 'v—'} · ${model.cli.state}`"
    new_text = "`Runtime: Engine ${model.engineVersion || '—'} · Manager ${model.managerVersion || '—'} · CLI ${model.cli.version || '—'} · Models ${model.cli.modelVersion || '—'} · ${model.cli.state}`"
    if text.count(old_text) != 1:
        raise SystemExit('5.96 compact text anchor mismatch')
    text = text.replace(old_text, new_text, 1)
    old_html = "<small>Manager ${esc(model.managerVersion || '—')} · CLI ${model.cli.version ? `v${esc(model.cli.version)}` : 'v—'} ${esc(model.cli.state)}</small>"
    new_html = "<small>Manager ${esc(model.managerVersion || '—')} · CLI ${esc(model.cli.version || '—')} · Models ${esc(model.cli.modelVersion || '—')} · ${esc(model.cli.state)}</small>"
    if text.count(old_html) != 1:
        raise SystemExit('5.96 compact HTML anchor mismatch')
    text = text.replace(old_html, new_html, 1)
    DIAG_WORKSPACE.write_text(text, encoding='utf-8')


def patch_manager(engine_sha: str) -> None:
    text = MANAGER.read_text(encoding='utf-8')
    if "const MANAGER_VERSION = '1.3.5';" not in text:
        raise SystemExit('5.96 Manager semantic version drift')
    replacements = [
        ("const PRODUCT_VERSION = '3.0.0-alpha.5.95';", "const PRODUCT_VERSION = '3.0.0-alpha.5.96';", 'Manager Product'),
        ("const BUNDLED_ENGINE_VERSION = '1.6.31';", "const BUNDLED_ENGINE_VERSION = '1.6.32';", 'Manager Engine'),
    ]
    for old, new, label in replacements:
        if new in text and old not in text:
            continue
        if text.count(old) != 1:
            raise SystemExit(f'5.96 {label} anchor mismatch: {text.count(old)}')
        text = text.replace(old, new, 1)
    next_text, count = re.subn(r"const BUNDLED_ENGINE_SHA256 = '[0-9a-f]{64}';", f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';", text, count=1)
    if count != 1:
        raise SystemExit('5.96 Manager Engine hash anchor mismatch')
    for marker in [
        "const MANAGED_CLI_VERSION = '1.10.0';",
        "const MANAGED_MODEL_CATALOG_VERSION = '1.251.0';",
    ]:
        if marker not in next_text:
            raise SystemExit(f'5.96 Manager managed package drift: {marker}')
    MANAGER.write_text(next_text, encoding='utf-8')


def sync_guidelines() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    target = "Current release implementation: `3.0.0-alpha.5.96 / Engine 1.6.32 / Manager 1.3.5 / CLI 1.10.0 / Models 1.251.0`."
    text, count = re.subn(r"Current release implementation: `[^`]+`\.", target, text, count=1)
    if count != 1:
        raise SystemExit('5.96 current release memory marker missing')
    GUIDELINES.write_text(text, encoding='utf-8')


def sync_manifest(engine_sha: str, manager_sha: str) -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['productVersion'] = TARGET_VERSION
    manifest['components']['plugin']['version'] = TARGET_VERSION
    manifest['components']['bridge']['requiredVersion'] = TARGET_ENGINE
    manifest['components']['bridge']['sha256'] = engine_sha
    manifest['components']['bridgeManager']['version'] = MANAGER_VERSION
    manifest['components']['bridgeManager']['productVersion'] = TARGET_VERSION
    manifest['components']['bridgeManager']['sha256'] = manager_sha
    manifest['components']['bridgeManager']['bootstrapSha256'] = BASE_BOOTSTRAP_SHA
    manifest['components']['bridgeManager']['managedCliVersion'] = TARGET_CLI
    manifest['components']['bridgeManager']['managedModelCatalogVersion'] = CATALOG_VERSION
    manifest['contracts'] = {'snapshot': 1, 'recentRequest': 1}
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def validate_target(engine_sha: str, manager_sha: str) -> None:
    core = CORE.read_text(encoding='utf-8')
    engine_core = ENGINE_CORE.read_text(encoding='utf-8')
    engine_cli = ENGINE_CLI.read_text(encoding='utf-8')
    category = MODEL_CATEGORY.read_text(encoding='utf-8')
    diagnostics = DIAGNOSTICS.read_text(encoding='utf-8')
    workspace = DIAG_WORKSPACE.read_text(encoding='utf-8')
    manager_text = MANAGER.read_text(encoding='utf-8')
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))

    for marker in [
        '//@version 3.0.0-alpha.5.96',
        "const VERSION = '3.0.0-alpha.5.96';",
        "const REQUIRED_BRIDGE_VERSION = '1.6.32';",
        "const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.5';",
    ]:
        if marker not in core:
            raise SystemExit(f'5.96 Plugin target missing: {marker}')
    for marker in [
        "const VERSION = '1.6.32';",
        "const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.10.0';",
        "const MODEL_CATALOG_VERSION = '1.251.0';",
    ]:
        if marker not in engine_core:
            raise SystemExit(f'5.96 Engine target missing: {marker}')
    if 'cliVersion:runtime.version,' not in engine_cli:
        raise SystemExit('5.96 Engine explicit cliVersion missing')
    if 'return {...runtime, ...modelCategoryCatalogStatus};' in category:
        raise SystemExit('5.96 generic diagnostic spread overwrite survived')
    for marker in [
        "modelCatalogState:'ready'",
        "modelCatalogVersion:MODEL_CATALOG_VERSION",
        'modelCatalogExpectedVersion:MODEL_CATALOG_VERSION',
        'modelCatalogState:modelCategoryCatalogStatus.modelCatalogState',
        'modelCatalogVersion:modelCategoryCatalogStatus.modelCatalogVersion',
    ]:
        if marker not in category:
            raise SystemExit(f'5.96 namespaced catalog status missing: {marker}')
    if "Object.freeze({state:" in category:
        raise SystemExit('5.96 generic catalog status namespace survived')
    for marker in [
        'function runtimeIdentityVersionTruth(engineValue, managerValue)',
        'function managedRuntimeIdentityTruth(diagnostics)',
        '@llmgateway/cli ${truth.cli.version',
        '@llmgateway/models ${truth.models.version',
        "truth.cli.state === 'mismatch'",
        "truth.models.state === 'mismatch'",
    ]:
        if marker not in diagnostics:
            raise SystemExit(f'5.96 Plugin identity resolver missing: {marker}')
    if '1.251.0' in diagnostics:
        raise SystemExit('5.96 Plugin diagnostics hardcode Models version')
    for marker in [
        'const truth = managedRuntimeIdentityTruth(state.data?.bridge?.diagnostics);',
        'modelVersion:truth.models.version',
        "CLI ${model.cli.version || '—'} · Models ${model.cli.modelVersion || '—'}",
        "CLI ${esc(model.cli.version || '—')} · Models ${esc(model.cli.modelVersion || '—')}",
    ]:
        if marker not in workspace:
            raise SystemExit(f'5.96 compact identity parity missing: {marker}')
    for marker in [
        "const MANAGER_VERSION = '1.3.5';",
        "const PRODUCT_VERSION = '3.0.0-alpha.5.96';",
        "const BUNDLED_ENGINE_VERSION = '1.6.32';",
        "const MANAGED_CLI_VERSION = '1.10.0';",
        "const MANAGED_MODEL_CATALOG_VERSION = '1.251.0';",
        f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';",
    ]:
        if marker not in manager_text:
            raise SystemExit(f'5.96 Manager target missing: {marker}')
    if sha256(ENGINE) != engine_sha or sha256(MANAGER) != manager_sha:
        raise SystemExit('5.96 generated artifact hash drift')
    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.96 bootstrap exact-byte preservation failed')
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if manifest.get('productVersion') != TARGET_VERSION or bridge.get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.96 manifest Product/Engine mismatch')
    if manager.get('version') != MANAGER_VERSION or manager.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.96 manifest Manager identity mismatch')
    if manager.get('managedCliVersion') != TARGET_CLI or manager.get('managedModelCatalogVersion') != CATALOG_VERSION:
        raise SystemExit('5.96 manifest managed package identity mismatch')
    if bridge.get('sha256') != engine_sha or manager.get('sha256') != manager_sha or manager.get('bootstrapSha256') != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.96 manifest hash mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.96 contracts changed')


spec = load_spec()
validate_baseline()
old_plugin_bytes = LATEST.stat().st_size
old_engine_bytes = ENGINE.stat().st_size
old_manager_bytes = MANAGER.stat().st_size
patch_plugin_identity(spec)
patch_engine_core()
patch_engine_cli_runtime()
patch_model_category_status()
patch_diagnostics()
patch_diagnostics_workspace()
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
    f'5.96 materialized: Plugin {old_plugin_bytes}->{LATEST.stat().st_size}; '
    f'Engine {old_engine_bytes}->{ENGINE.stat().st_size} v{TARGET_ENGINE} SHA {engine_sha}; '
    f'Manager {old_manager_bytes}->{MANAGER.stat().st_size} v{MANAGER_VERSION} Product {BASE_VERSION}->{TARGET_VERSION} SHA {manager_sha}; '
    f'CLI {TARGET_CLI} + Models {CATALOG_VERSION} disjoint diagnostic identity; contracts 1/1; bootstrap exact {BASE_BOOTSTRAP_SHA}'
)
