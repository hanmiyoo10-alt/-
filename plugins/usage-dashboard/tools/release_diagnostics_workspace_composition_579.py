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
MARKUP = SRC / '54-dashboard-markup.part.js'
SETTINGS = SRC / '60-settings-runtime.part.js'
WORKSPACE = SRC / '62-diagnostics-workspace.part.js'
PARTS = SRC / 'parts.cjs'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
LATEST = ROOT / 'latest.js'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')

BASE_VERSION = '3.0.0-alpha.5.78'
TARGET_VERSION = '3.0.0-alpha.5.79'
TARGET_ENGINE = '1.6.22'
TARGET_MANAGER = '1.3.0'
BASE_RELEASE_TITLE = 'Runtime Weight Audit Ownership Consolidation'
TARGET_RELEASE_TITLE = 'Diagnostics Workspace Composition Ownership Consolidation'
BASE_RELEASE_MEMORY = f'Current release implementation: `{BASE_VERSION} — {BASE_RELEASE_TITLE}`.'
TARGET_RELEASE_MEMORY = f'Current release implementation: `{TARGET_VERSION} — {TARGET_RELEASE_TITLE}`.'
BASE_VERIFIED_BASELINE = 'Last verified real-device baseline: `3.0.0-alpha.5.77 — Diagnostics Instant Mode Patch-Layer Consolidation`.'
TARGET_VERIFIED_BASELINE = 'Last verified real-device baseline: `3.0.0-alpha.5.78 — Runtime Weight Audit Ownership Consolidation`.'
BASE_ENGINE_SHA = '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69'

LEGACY_PANEL = re.compile(
    r'\n      <details class="panel wide advanced-panel"><summary><b>Runtime Diagnostics</b><span>요약 · 전체 진단</span></summary><div class="advanced-body">[\s\S]*?</div></details>(?=\n    </main></div>`;)',
)
LEGACY_WORKSPACE_TAIL = re.compile(
    r'\n  settingsHtml = function diagnosticsWorkspaceSettingsHtml\(\) \{[\s\S]*\Z',
)

DIRECT_BINDER = '''
  function bindDiagnosticsWorkspaceControls() {
    const q = selector => document.querySelector(selector);
    if (q('#copy-diag-summary')) q('#copy-diag-summary').onclick = async e => {
      let copied = false;
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(diagnosticsWorkspaceBasicText());
          copied = true;
        }
      } catch (_) {}
      if (e?.currentTarget) e.currentTarget.textContent = copied ? '요약 복사됨 ✓' : '요약 복사 실패';
    };
    const basic = q('#diagnostics-mode-basic');
    const detailed = q('#diagnostics-mode-detailed');
    if (basic) basic.onclick = () => setDiagnosticsModeInstant('basic');
    if (detailed) detailed.onclick = () => setDiagnosticsModeInstant('detailed');
  }
'''

OLD_PART_MARKER = "  {file:'62-diagnostics-workspace.part.js', marker:'\\n  const diagnosticsWorkspaceLegacySettingsHtml = settingsHtml;', label:'diagnostics workspace + runtime weight audit'},"
NEW_PART_MARKER = "  {file:'62-diagnostics-workspace.part.js', marker:'\\n  const DIAGNOSTICS_WORKSPACE_SECTIONS = Object.freeze([', label:'diagnostics workspace + runtime weight audit'},"


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


def consolidate_composition_ownership() -> None:
    markup = MARKUP.read_text(encoding='utf-8')
    if '${diagnosticsWorkspacePanelHtml()}' not in markup:
        markup, count = LEGACY_PANEL.subn('\n      ${diagnosticsWorkspacePanelHtml()}', markup, count=1)
        if count != 1:
            raise SystemExit(f'5.79 legacy Diagnostics panel replacement mismatch: {count}')
        MARKUP.write_text(markup, encoding='utf-8')

    settings = SETTINGS.read_text(encoding='utf-8')
    direct_call = '    bindDiagnosticsWorkspaceControls();\n'
    if direct_call not in settings:
        marker = '\n  }\n\n  async function openSettings() {'
        if settings.count(marker) != 1:
            raise SystemExit(f'5.79 native bindSettings insertion point mismatch: {settings.count(marker)}')
        settings = settings.replace(marker, f'\n{direct_call}  }}\n\n  async function openSettings() {{', 1)
        SETTINGS.write_text(settings, encoding='utf-8')

    workspace = WORKSPACE.read_text(encoding='utf-8')
    for legacy in [
        '  const diagnosticsWorkspaceLegacySettingsHtml = settingsHtml;\n',
        '  const diagnosticsWorkspaceLegacyBindSettings = bindSettings;\n',
    ]:
        if legacy in workspace:
            workspace = workspace.replace(legacy, '', 1)
    if 'function bindDiagnosticsWorkspaceControls()' not in workspace:
        workspace, count = LEGACY_WORKSPACE_TAIL.subn('\n' + DIRECT_BINDER.rstrip() + '\n', workspace, count=1)
        if count != 1:
            raise SystemExit(f'5.79 module-62 monkey-patch tail replacement mismatch: {count}')
    WORKSPACE.write_text(workspace, encoding='utf-8')

    parts = PARTS.read_text(encoding='utf-8')
    if OLD_PART_MARKER in parts:
        parts = parts.replace(OLD_PART_MARKER, NEW_PART_MARKER, 1)
        PARTS.write_text(parts, encoding='utf-8')
    elif NEW_PART_MARKER not in parts:
        raise SystemExit('5.79 module-62 PARTS boundary marker mismatch')


def sync_release_memory() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    if TARGET_RELEASE_MEMORY not in text:
        if text.count(BASE_RELEASE_MEMORY) != 1:
            raise SystemExit(f'5.79 release memory sync mismatch: {text.count(BASE_RELEASE_MEMORY)}')
        text = text.replace(BASE_RELEASE_MEMORY, TARGET_RELEASE_MEMORY, 1)
    if TARGET_VERIFIED_BASELINE not in text:
        if text.count(BASE_VERIFIED_BASELINE) != 1:
            raise SystemExit(f'5.79 verified baseline sync mismatch: {text.count(BASE_VERIFIED_BASELINE)}')
        text = text.replace(BASE_VERIFIED_BASELINE, TARGET_VERIFIED_BASELINE, 1)
    GUIDELINES.write_text(text, encoding='utf-8')


def sync_manifest_hashes() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['components']['bridge']['sha256'] = sha256(ENGINE)
    manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
    manifest['components']['bridgeManager']['bootstrapSha256'] = sha256(BOOTSTRAP)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def validate_source_ownership() -> None:
    markup = MARKUP.read_text(encoding='utf-8')
    settings = SETTINGS.read_text(encoding='utf-8')
    workspace = WORKSPACE.read_text(encoding='utf-8')
    parts = PARTS.read_text(encoding='utf-8')

    if 'Runtime Diagnostics</b><span>요약 · 전체 진단' in markup:
        raise SystemExit('5.79 legacy Diagnostics markup remains in module 54')
    if markup.count('${diagnosticsWorkspacePanelHtml()}') != 1:
        raise SystemExit('5.79 native settings markup must compose Diagnostics workspace exactly once')
    for marker in ['diagnosticsWorkspaceLegacySettingsHtml', 'diagnosticsWorkspaceLegacyBindSettings']:
        if marker in workspace:
            raise SystemExit(f'5.79 retired compatibility symbol remains: {marker}')
    if re.search(r'\bsettingsHtml\s*=\s*function\b', workspace):
        raise SystemExit('5.79 module 62 must not reassign settingsHtml')
    if re.search(r'\bbindSettings\s*=\s*function\b', workspace):
        raise SystemExit('5.79 module 62 must not reassign bindSettings')
    if workspace.count('function bindDiagnosticsWorkspaceControls()') != 1:
        raise SystemExit('5.79 Diagnostics controls binder must have one module-62 owner')
    if settings.count('bindDiagnosticsWorkspaceControls();') != 1:
        raise SystemExit('5.79 native bindSettings must invoke Diagnostics controls exactly once')
    for marker in ["q('#copy-diag')", "q('#export-json')"]:
        if marker not in settings:
            raise SystemExit(f'5.79 module 60 must retain Full Copy/JSON owner: {marker}')
    for marker in [
        'function diagnosticsWorkspacePanelHtml()',
        'function diagnosticsWorkspaceBasicModel()',
        'function diagnosticsWorkspaceDetailedSections()',
        'function setDiagnosticsModeInstant(mode)',
        'Runtime Weight Audit',
        "basic.onclick = () => setDiagnosticsModeInstant('basic');",
        "detailed.onclick = () => setDiagnosticsModeInstant('detailed');",
    ]:
        if marker not in workspace:
            raise SystemExit(f'5.79 Diagnostics owner marker missing: {marker}')
    basic = re.search(r'function diagnosticsWorkspaceBasicModel\(\) \{([\s\S]*?)\n  \}\n\n  function diagnosticsWorkspaceBasicText', workspace)
    if not basic or 'diagText(' in basic.group(1) or 'runtimeWeightAudit' in basic.group(1):
        raise SystemExit('5.79 Basic diagnostics must remain independent of diagText/audit')
    if "for (const line of diagText().split('\\n'))" not in workspace:
        raise SystemExit('5.79 Detailed diagnostics must remain lazy over diagText')
    if parts.count("{file:") != 24:
        raise SystemExit(f'5.79 source module count must remain 24, got {parts.count("{file:")}')
    order = [parts.find(f"file:'{name}'") for name in [
        '50-dashboard-context.part.js', '52-analytics-context.part.js', '54-dashboard-markup.part.js',
        '60-settings-runtime.part.js', '62-diagnostics-workspace.part.js', '70-widget-render.part.js',
    ]]
    if not all(index >= 0 for index in order) or order != sorted(order):
        raise SystemExit('5.79 module order must remain 50 -> 52 -> 54 -> 60 -> 62 -> 70')
    if NEW_PART_MARKER not in parts:
        raise SystemExit('5.79 module-62 direct-owner PARTS marker missing')


def validate_target() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.79 Product version mismatch')
    if manifest.get('components', {}).get('plugin', {}).get('version') != TARGET_VERSION:
        raise SystemExit('5.79 plugin version mismatch')
    if bridge.get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.79 Engine version mismatch')
    if manager.get('version') != TARGET_MANAGER or manager.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.79 Manager identity mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.79 contracts changed from 1/1')
    if sha256(ENGINE) != BASE_ENGINE_SHA or bridge.get('sha256') != BASE_ENGINE_SHA:
        raise SystemExit('5.79 Engine artifact must remain byte-identical to 5.78')
    if manager.get('sha256') != sha256(MANAGER):
        raise SystemExit('5.79 Manager hash mismatch')
    if manager.get('bootstrapSha256') != sha256(BOOTSTRAP):
        raise SystemExit('5.79 bootstrap hash mismatch')
    core = CORE.read_text(encoding='utf-8')
    latest = LATEST.read_text(encoding='utf-8')
    if f'//@version {TARGET_VERSION}' not in core or f"const VERSION = '{TARGET_VERSION}';" not in core:
        raise SystemExit('5.79 plugin source version mismatch')
    if f"const PRODUCT_VERSION = '{TARGET_VERSION}';" not in MANAGER.read_text(encoding='utf-8'):
        raise SystemExit('5.79 Manager product version not synchronized')
    if latest.count('<summary><b>Runtime Diagnostics</b>') != 1:
        raise SystemExit('5.79 built plugin must contain exactly one Runtime Diagnostics panel template')
    for retired in ['diagnosticsWorkspaceLegacySettingsHtml', 'diagnosticsWorkspaceLegacyBindSettings', 'diagnosticsWorkspaceSettingsHtml', 'diagnosticsWorkspaceBindSettings']:
        if retired in latest:
            raise SystemExit(f'5.79 built plugin still contains retired composition wrapper: {retired}')
    validate_source_ownership()


manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
current = str(manifest.get('productVersion') or '')
if current not in {BASE_VERSION, TARGET_VERSION}:
    raise SystemExit(f'expected {BASE_VERSION} or {TARGET_VERSION}, got {current or "missing"}')
if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != TARGET_ENGINE:
    raise SystemExit('5.79 baseline Engine version is not 1.6.22')
if sha256(ENGINE) != BASE_ENGINE_SHA:
    raise SystemExit('5.79 baseline Engine artifact diverged from 5.78')
if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
    raise SystemExit('5.79 baseline Manager version is not 1.3.0')
if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('5.79 baseline contracts are not 1/1')

old_plugin_bytes = LATEST.stat().st_size
consolidate_composition_ownership()

if current == BASE_VERSION:
    replace_once(CORE, '//@version 3.0.0-alpha.5.78', '//@version 3.0.0-alpha.5.79', 'plugin header version')
    replace_once(CORE, "const VERSION = '3.0.0-alpha.5.78';", "const VERSION = '3.0.0-alpha.5.79';", 'plugin runtime version')
    replace_once(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.78';", "const PRODUCT_VERSION = '3.0.0-alpha.5.79';", 'manager Product version')
    manifest['productVersion'] = TARGET_VERSION
    manifest['components']['plugin']['version'] = TARGET_VERSION
    manifest['components']['bridgeManager']['productVersion'] = TARGET_VERSION
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

sync_release_memory()
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
sync_manifest_hashes()
run('node', '--check', str(LATEST))
run('node', '--check', str(MANAGER))
run('node', '--check', str(ENGINE))
validate_target()
new_plugin_bytes = LATEST.stat().st_size
print(f'{TARGET_VERSION} materialized · Engine {TARGET_ENGINE} byte-identical · diagnostics composition ownership consolidated · plugin bytes {old_plugin_bytes}->{new_plugin_bytes} ({new_plugin_bytes-old_plugin_bytes:+d})')
