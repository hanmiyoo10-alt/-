from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
TOOLS = ROOT / 'tools'
CORE = SRC / '00-runtime-core.part.js'
PARTS = SRC / 'parts.cjs'
WORKSPACE = SRC / '62-diagnostics-workspace.part.js'
WORKSPACE_TEMPLATE = TOOLS / 'diagnostics_workspace_567.part.js'
MANAGER = RUNTIME / 'bridge-manager.cjs'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')

BASE_VERSION = '3.0.0-alpha.5.66'
TARGET_VERSION = '3.0.0-alpha.5.67'
TARGET_ENGINE = '1.6.19'
TARGET_MANAGER = '1.3.0'


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
current = str(manifest.get('productVersion') or '')
if current == TARGET_VERSION:
    print(f'{TARGET_VERSION} already materialized')
    raise SystemExit(0)
if current != BASE_VERSION:
    raise SystemExit(f'expected {BASE_VERSION} baseline, got {current or "missing"}')
if not WORKSPACE_TEMPLATE.is_file():
    raise SystemExit('5.67 diagnostics workspace template is missing')
if WORKSPACE.exists():
    raise SystemExit('5.67 workspace target already exists on a non-5.67 baseline')

engine_hash_before = sha256(ENGINE)
manager_before = MANAGER.read_text(encoding='utf-8')

replace_once(CORE, '//@version 3.0.0-alpha.5.66', '//@version 3.0.0-alpha.5.67', 'plugin header version')
replace_once(CORE, "const VERSION = '3.0.0-alpha.5.66';", "const VERSION = '3.0.0-alpha.5.67';", 'plugin runtime version')
replace_once(CORE, "    dashboardView: 'overview',\n", "    dashboardView: 'overview',\n    diagnosticsMode: 'basic',\n", 'diagnostics mode default')
replace_once(
    PARTS,
    "  {file:'60-settings-runtime.part.js', marker:'\\n  function renderSettings() {', label:'settings runtime'},\n  {file:'70-widget-render.part.js', marker:'\\n  function widgetHtml() {', label:'floating widget/render'},",
    "  {file:'60-settings-runtime.part.js', marker:'\\n  function renderSettings() {', label:'settings runtime'},\n  {file:'62-diagnostics-workspace.part.js', marker:'\\n  const diagnosticsWorkspaceLegacySettingsHtml = settingsHtml;', label:'diagnostics workspace'},\n  {file:'70-widget-render.part.js', marker:'\\n  function widgetHtml() {', label:'floating widget/render'},",
    'source module layout',
)
WORKSPACE.write_text(WORKSPACE_TEMPLATE.read_text(encoding='utf-8'), encoding='utf-8')

replace_once(
    MANAGER,
    "const PRODUCT_VERSION = '3.0.0-alpha.5.66';",
    "const PRODUCT_VERSION = '3.0.0-alpha.5.67';",
    'manager product synchronization',
)
manager_after = MANAGER.read_text(encoding='utf-8')
expected_manager = manager_before.replace(
    "const PRODUCT_VERSION = '3.0.0-alpha.5.66';",
    "const PRODUCT_VERSION = '3.0.0-alpha.5.67';",
    1,
)
if manager_after != expected_manager:
    raise SystemExit('Manager functional body changed beyond product-version synchronization')

replace_once(
    GUIDELINES,
    'Last verified real-device baseline: `3.0.0-alpha.5.64 — Foreground CLI Launcher Attribution`.',
    'Last verified real-device baseline: `3.0.0-alpha.5.66 — Managed Direct CLI Runtime`.',
    'verified real-device baseline memory',
)
replace_once(
    GUIDELINES,
    'Current release implementation: `3.0.0-alpha.5.66 — Managed Direct CLI Runtime`.',
    'Current release implementation: `3.0.0-alpha.5.67 — Diagnostics Workspace Overhaul`.',
    'current release implementation memory',
)

manifest['productVersion'] = TARGET_VERSION
manifest['components']['plugin']['version'] = TARGET_VERSION
manifest['components']['bridgeManager']['productVersion'] = TARGET_VERSION
manifest['components']['bridge']['sha256'] = sha256(ENGINE)
manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
manifest['components']['bridgeManager']['bootstrapSha256'] = sha256(BOOTSTRAP)
MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

subprocess.run(['node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write'], check=True)
subprocess.run(['node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check'], check=True)
subprocess.run(['python3', str(TOOLS / 'sync_project_guidelines.py')], check=True)
subprocess.run(['node', '--check', str(ROOT / 'latest.js')], check=True)
subprocess.run(['node', '--check', str(MANAGER)], check=True)
subprocess.run(['node', '--check', str(ENGINE)], check=True)

manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
source_manifest = json.loads((SRC / 'manifest.json').read_text(encoding='utf-8'))
components = manifest.get('components') or {}
bridge = components.get('bridge') or {}
manager = components.get('bridgeManager') or {}

if manifest.get('productVersion') != TARGET_VERSION:
    raise SystemExit('materialized product version mismatch')
if source_manifest.get('version') != TARGET_VERSION:
    raise SystemExit('materialized source manifest version mismatch')
if bridge.get('requiredVersion') != TARGET_ENGINE:
    raise SystemExit('Engine version changed during Diagnostics-only release')
if manager.get('version') != TARGET_MANAGER:
    raise SystemExit('Manager semantic version changed during product synchronization')
if manager.get('productVersion') != TARGET_VERSION:
    raise SystemExit('Manager product version was not synchronized')
if sha256(ENGINE) != engine_hash_before:
    raise SystemExit('Engine artifact changed during Diagnostics-only release')
if bridge.get('sha256') != engine_hash_before:
    raise SystemExit('manifest Engine hash diverged from unchanged Engine artifact')
if manager.get('sha256') != sha256(MANAGER):
    raise SystemExit('manifest Manager hash mismatch after product synchronization')
if manager.get('bootstrapSha256') != sha256(BOOTSTRAP):
    raise SystemExit('manifest Manager bootstrap hash mismatch')
if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('snapshot/recent-request contracts changed')
if not WORKSPACE.is_file():
    raise SystemExit('Diagnostics workspace module was not materialized')
if "62-diagnostics-workspace.part.js" not in PARTS.read_text(encoding='utf-8'):
    raise SystemExit('Diagnostics workspace module is missing from source layout')

print(f'prepared Local Usage Dashboard {TARGET_VERSION} (engine {TARGET_ENGINE}, manager {TARGET_MANAGER}) Diagnostics Workspace Overhaul')
