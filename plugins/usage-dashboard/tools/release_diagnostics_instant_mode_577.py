from pathlib import Path
import hashlib
import json
import subprocess

# UD_HISTORICAL_VERSION_LOCK: 5.76/5.75 literals below are deterministic prior-release baselines.

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
P36 = ROOT / 'tests/p36-diagnostics-instant-mode-switch.cjs'
P38 = ROOT / 'tests/p38-diagnostics-mode-handler-ownership.cjs'
P41 = ROOT / 'tests/p41-diagnostics-instant-mode-patch-layer-consolidation.cjs'

BASE_VERSION = '3.0.0-alpha.5.76'
TARGET_VERSION = '3.0.0-alpha.5.77'
TARGET_ENGINE = '1.6.22'
TARGET_MANAGER = '1.3.0'
BASE_RELEASE_TITLE = 'Request Provenance Diagnostics Ownership Consolidation'
TARGET_RELEASE_TITLE = 'Diagnostics Instant Mode Patch-Layer Consolidation'
BASE_RELEASE_MEMORY = f'Current release implementation: `{BASE_VERSION} — {BASE_RELEASE_TITLE}`.'
TARGET_RELEASE_MEMORY = f'Current release implementation: `{TARGET_VERSION} — {TARGET_RELEASE_TITLE}`.'
BASE_VERIFIED_BASELINE = 'Last verified real-device baseline: `3.0.0-alpha.5.75 — Provenance Analytics Wrapper Consolidation`.'
TARGET_VERIFIED_BASELINE = 'Last verified real-device baseline: `3.0.0-alpha.5.76 — Request Provenance Diagnostics Ownership Consolidation`.'
BASE_ENGINE_SHA = '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69'

MODE_FUNCTION = '''  function diagnosticsWorkspaceMode() {
    return state?.diagnosticsMode === 'detailed' ? 'detailed' : 'basic';
  }

'''

DIRECT_OWNER = '''  let diagnosticsModePersistTail = Promise.resolve();

  function persistDiagnosticsModeSerialized(mode) {
    const capturedMode = mode === 'detailed' ? 'detailed' : 'basic';
    diagnosticsModePersistTail = diagnosticsModePersistTail
      .then(async () => {
        if (runtimeDisposed) return dropStaleAsync();
        await store.setItem(STATE_KEY, {...state, diagnosticsMode:capturedMode});
        powerRuntime.persistWrites += 1;
      })
      .catch(error => {
        console.log(`[Local Usage Dashboard] diagnostics mode persist failed: ${error?.message || error}`);
      });
    return diagnosticsModePersistTail;
  }

  function setDiagnosticsModeInstant(mode) {
    const next = mode === 'detailed' ? 'detailed' : 'basic';
    if (diagnosticsWorkspaceMode() === next) return;
    state.diagnosticsMode = next;
    renderSettingsPartial();
    void persistDiagnosticsModeSerialized(next);
  }

'''

SUMMARY_BIND = '''    if (q('#copy-diag-summary')) q('#copy-diag-summary').onclick = async e => {
      let copied = false;
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(diagnosticsWorkspaceBasicText());
          copied = true;
        }
      } catch (_) {}
      if (e?.currentTarget) e.currentTarget.textContent = copied ? '요약 복사됨 ✓' : '요약 복사 실패';
    };
'''

DIRECT_BIND = SUMMARY_BIND + '''    const basic = q('#diagnostics-mode-basic');
    const detailed = q('#diagnostics-mode-detailed');
    if (basic) basic.onclick = () => setDiagnosticsModeInstant('basic');
    if (detailed) detailed.onclick = () => setDiagnosticsModeInstant('detailed');
'''

PART_ENTRY = "  {file:'63-diagnostics-instant-mode.part.js', marker:'\\n  const diagnosticsInstantModeLegacyBindSettings = bindSettings;', label:'diagnostics instant mode persistence'},\n"


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


def consolidate_instant_mode_owner() -> None:
    text = WORKSPACE.read_text(encoding='utf-8')
    if 'function setDiagnosticsModeInstant(mode)' not in text:
        if text.count(MODE_FUNCTION) != 1:
            raise SystemExit('5.77 diagnostics workspace mode insertion point mismatch')
        text = text.replace(MODE_FUNCTION, MODE_FUNCTION + DIRECT_OWNER, 1)

    if "basic.onclick = () => setDiagnosticsModeInstant('basic');" not in text:
        if text.count(SUMMARY_BIND) != 1:
            raise SystemExit('5.77 diagnostics workspace bind insertion point mismatch')
        text = text.replace(SUMMARY_BIND, DIRECT_BIND, 1)

    if 'diagnosticsInstantModeLegacyBindSettings' in text:
        raise SystemExit('5.77 module-63 wrapper ownership leaked into workspace')
    WORKSPACE.write_text(text, encoding='utf-8')

    if INSTANT.exists():
        instant = INSTANT.read_text(encoding='utf-8')
        for marker in [
            'const diagnosticsInstantModeLegacyBindSettings = bindSettings;',
            'function persistDiagnosticsModeSerialized(mode)',
            'function setDiagnosticsModeInstant(mode)',
            "basic.onclick = () => setDiagnosticsModeInstant('basic');",
            "detailed.onclick = () => setDiagnosticsModeInstant('detailed');",
        ]:
            if marker not in instant:
                raise SystemExit(f'5.77 module 63 unexpected content: missing {marker}')
        INSTANT.unlink()

    parts = PARTS.read_text(encoding='utf-8')
    if PART_ENTRY in parts:
        parts = parts.replace(PART_ENTRY, '', 1)
        PARTS.write_text(parts, encoding='utf-8')
    if '63-diagnostics-instant-mode.part.js' in PARTS.read_text(encoding='utf-8'):
        raise SystemExit('5.77 module 63 remains registered')


def sync_release_memory() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    if TARGET_RELEASE_MEMORY not in text:
        count = text.count(BASE_RELEASE_MEMORY)
        if count != 1:
            raise SystemExit(f'5.77 release memory sync: expected exactly one 5.76 memory line, found {count}')
        text = text.replace(BASE_RELEASE_MEMORY, TARGET_RELEASE_MEMORY, 1)
    if TARGET_VERIFIED_BASELINE not in text:
        count = text.count(BASE_VERIFIED_BASELINE)
        if count != 1:
            raise SystemExit(f'5.77 verified baseline sync: expected stale 5.75 or current 5.76 baseline, found {count}')
        text = text.replace(BASE_VERIFIED_BASELINE, TARGET_VERIFIED_BASELINE, 1)
    GUIDELINES.write_text(text, encoding='utf-8')


def sync_manifest_hashes() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['components']['bridge']['sha256'] = sha256(ENGINE)
    manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
    manifest['components']['bridgeManager']['bootstrapSha256'] = sha256(BOOTSTRAP)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def validate_consolidation_source() -> None:
    workspace = WORKSPACE.read_text(encoding='utf-8')
    parts = PARTS.read_text(encoding='utf-8')
    if INSTANT.exists():
        raise SystemExit('5.77 module 63 must be deleted')
    if workspace.count('function persistDiagnosticsModeSerialized(mode)') != 1:
        raise SystemExit('5.77 module 62 must directly own exactly one serialized persistence helper')
    if workspace.count('function setDiagnosticsModeInstant(mode)') != 1:
        raise SystemExit('5.77 module 62 must directly own exactly one instant mode helper')
    for marker in [
        'let diagnosticsModePersistTail = Promise.resolve();',
        "const basic = q('#diagnostics-mode-basic');",
        "const detailed = q('#diagnostics-mode-detailed');",
        "basic.onclick = () => setDiagnosticsModeInstant('basic');",
        "detailed.onclick = () => setDiagnosticsModeInstant('detailed');",
        'state.diagnosticsMode = next;',
        'renderSettingsPartial();',
        'void persistDiagnosticsModeSerialized(next);',
        'diagnosticsMode:capturedMode',
    ]:
        if marker not in workspace:
            raise SystemExit(f'5.77 direct workspace owner marker missing: {marker}')
    for forbidden in [
        'diagnosticsInstantModeLegacyBindSettings',
        'const setMode = async',
        'state.diagnosticsMode = next;\n      await persist();\n      renderSettings();',
    ]:
        if forbidden in workspace:
            raise SystemExit(f'5.77 obsolete diagnostics mode marker remains: {forbidden}')
    if 'Runtime Weight Audit' not in AUDIT.read_text(encoding='utf-8'):
        raise SystemExit('5.77 Runtime Weight Audit must remain present')
    i62 = parts.find("file:'62-diagnostics-workspace.part.js'")
    i64 = parts.find("file:'64-runtime-weight-audit.part.js'")
    if not (0 <= i62 < i64):
        raise SystemExit('5.77 diagnostics boundary must be 62 -> 64')
    if parts.count("{file:") != 25:
        raise SystemExit(f'5.77 production module count must be 25, got {parts.count("{file:")}')
    for test_path, marker in [
        (P36, 'module 62 direct owner'),
        (P38, 'module 62 sole owner'),
        (P41, 'P41 Diagnostics Instant Mode Patch-Layer Consolidation'),
    ]:
        if not test_path.exists() or marker not in test_path.read_text(encoding='utf-8'):
            raise SystemExit(f'5.77 migrated regression missing marker: {test_path}')


def validate_target() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.77 Product version mismatch')
    if manifest.get('components', {}).get('plugin', {}).get('version') != TARGET_VERSION:
        raise SystemExit('5.77 plugin version mismatch')
    if bridge.get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.77 Engine version mismatch')
    if manager.get('version') != TARGET_MANAGER or manager.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.77 Manager identity mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.77 contracts changed from 1/1')
    if sha256(ENGINE) != BASE_ENGINE_SHA or bridge.get('sha256') != BASE_ENGINE_SHA:
        raise SystemExit('5.77 Engine artifact must remain byte-identical to 5.76')
    if manager.get('sha256') != sha256(MANAGER):
        raise SystemExit('5.77 Manager hash mismatch')
    if manager.get('bootstrapSha256') != sha256(BOOTSTRAP):
        raise SystemExit('5.77 bootstrap hash mismatch')
    guidelines = GUIDELINES.read_text(encoding='utf-8')
    if TARGET_RELEASE_MEMORY not in guidelines:
        raise SystemExit('5.77 current release memory mismatch')
    if TARGET_VERIFIED_BASELINE not in guidelines:
        raise SystemExit('5.77 verified real-device baseline mismatch')
    core = CORE.read_text(encoding='utf-8')
    latest = (ROOT / 'latest.js').read_text(encoding='utf-8')
    if f'//@version {TARGET_VERSION}' not in core or f"const VERSION = '{TARGET_VERSION}';" not in core:
        raise SystemExit('5.77 plugin source version mismatch')
    if f"const PRODUCT_VERSION = '{TARGET_VERSION}';" not in MANAGER.read_text(encoding='utf-8'):
        raise SystemExit('5.77 Manager product version not synchronized')
    for marker in ['setDiagnosticsModeInstant', 'persistDiagnosticsModeSerialized', 'Runtime Weight Audit']:
        if marker not in latest:
            raise SystemExit(f'5.77 built consolidation marker missing: {marker}')
    if 'diagnosticsInstantModeLegacyBindSettings' in latest:
        raise SystemExit('5.77 built plugin still contains retired module-63 wrapper')
    validate_consolidation_source()


manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
current = str(manifest.get('productVersion') or '')
if current not in {BASE_VERSION, TARGET_VERSION}:
    raise SystemExit(f'expected {BASE_VERSION} or {TARGET_VERSION}, got {current or "missing"}')
if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != TARGET_ENGINE:
    raise SystemExit('5.77 baseline Engine version is not 1.6.22')
if sha256(ENGINE) != BASE_ENGINE_SHA:
    raise SystemExit('5.77 baseline Engine artifact diverged from 5.76')
if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
    raise SystemExit('5.77 baseline Manager version is not 1.3.0')
if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('5.77 baseline contracts are not 1/1')

consolidate_instant_mode_owner()

if current == BASE_VERSION:
    replace_once(CORE, '//@version 3.0.0-alpha.5.76', '//@version 3.0.0-alpha.5.77', 'plugin header version')
    replace_once(CORE, "const VERSION = '3.0.0-alpha.5.76';", "const VERSION = '3.0.0-alpha.5.77';", 'plugin runtime version')
    replace_once(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.76';", "const PRODUCT_VERSION = '3.0.0-alpha.5.77';", 'manager Product version')
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
print(f'{TARGET_VERSION} materialized · Engine {TARGET_ENGINE} byte-identical · diagnostics instant patch layer consolidated 26→25')
