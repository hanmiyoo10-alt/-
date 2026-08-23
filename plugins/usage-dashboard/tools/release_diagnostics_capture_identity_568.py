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
DIAGNOSTICS = SRC / '40-diagnostics.part.js'
MANAGER = RUNTIME / 'bridge-manager.cjs'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')

BASE_VERSION = '3.0.0-alpha.5.67'
TARGET_VERSION = '3.0.0-alpha.5.68'
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
if not WORKSPACE.is_file():
    raise SystemExit('5.67 Diagnostics workspace baseline is missing')

engine_hash_before = sha256(ENGINE)
manager_before = MANAGER.read_text(encoding='utf-8')

replace_once(CORE, '//@version 3.0.0-alpha.5.67', '//@version 3.0.0-alpha.5.68', 'plugin header version')
replace_once(CORE, "const VERSION = '3.0.0-alpha.5.67';", "const VERSION = '3.0.0-alpha.5.68';", 'plugin runtime version')

replace_once(
    WORKSPACE,
    "  function diagnosticsWorkspaceBasicModel() {\n    const d = state.data || {};",
    """  function diagnosticsCaptureIdentity(capturedAt = Date.now()) {
    const refreshCountRaw = Number(state?.refreshCount);
    const refreshCount = Number.isFinite(refreshCountRaw) ? Math.max(0, Math.trunc(refreshCountRaw)) : 0;
    const reason = String(state?.lastRefreshReason || '').trim() || 'UNKNOWN';
    const syncRaw = Number(state?.lastSyncAt);
    const lastSyncAt = state?.lastSyncAt !== null && state?.lastSyncAt !== undefined && state?.lastSyncAt !== '' && Number.isFinite(syncRaw) && syncRaw > 0
      ? syncRaw
      : null;
    return {capturedAt:Number(capturedAt),refreshCount,reason,lastSyncAt};
  }

  function diagnosticsCaptureIdentityText(capture = diagnosticsCaptureIdentity()) {
    const sync = capture.lastSyncAt === null ? 'UNKNOWN' : new Date(Number(capture.lastSyncAt)).toISOString();
    return `#${capture.refreshCount} · ${capture.reason} · sync ${sync}`;
  }

  function diagnosticsWorkspaceBasicModel() {
    const capture = diagnosticsCaptureIdentity();
    const d = state.data || {};""",
    'capture identity model',
)
replace_once(
    WORKSPACE,
    "    return {\n      readiness:stable.ready ? 'READY' : 'BLOCKED',",
    "    return {\n      capture,\n      readiness:stable.ready ? 'READY' : 'BLOCKED',",
    'basic model capture field',
)
replace_once(
    WORKSPACE,
    "    return [\n      `Local Usage Dashboard v${VERSION}`,\n      `Status: ${model.readiness}",
    "    return [\n      `Local Usage Dashboard v${VERSION}`,\n      `Diagnostic captured: ${diagnosticTimestamp(model.capture.capturedAt)}`,\n      `Refresh identity: ${diagnosticsCaptureIdentityText(model.capture)}`,\n      `Status: ${model.readiness}",
    'basic copy capture identity',
)
replace_once(
    WORKSPACE,
    ".diag-workspace-tabs{display:flex;gap:6px;margin:2px 0 10px}",
    ".diag-workspace-capture{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:0 0 8px;color:var(--m);font-size:9px}.diag-workspace-capture b{color:var(--t);font-size:10px}.diag-workspace-tabs{display:flex;gap:6px;margin:2px 0 10px}",
    'basic capture identity style',
)
replace_once(
    WORKSPACE,
    "    return `<div class=\"minis diag-summary diag-workspace-basic\">",
    "    return `<div class=\"diag-workspace-capture\"><b>Captured #${model.capture.refreshCount}</b><span>${esc(diagnosticTimestamp(model.capture.capturedAt))} · ${esc(model.capture.reason)} · sync ${esc(model.capture.lastSyncAt === null ? 'UNKNOWN' : new Date(Number(model.capture.lastSyncAt)).toISOString())}</span></div><div class=\"minis diag-summary diag-workspace-basic\">",
    'basic panel capture identity',
)
replace_once(
    DIAGNOSTICS,
    "      `Diagnostic captured: ${diagnosticTimestamp(diagnosticCapturedAt)}`,\n      `Runtime loaded at:",
    "      `Diagnostic captured: ${diagnosticTimestamp(diagnosticCapturedAt)}`,\n      `Diagnostic refresh identity: ${diagnosticsCaptureIdentityText(diagnosticsCaptureIdentity(diagnosticCapturedAt))}`,\n      `Runtime loaded at:",
    'full Diagnostics capture identity',
)

replace_once(
    MANAGER,
    "const PRODUCT_VERSION = '3.0.0-alpha.5.67';",
    "const PRODUCT_VERSION = '3.0.0-alpha.5.68';",
    'manager product synchronization',
)
manager_after = MANAGER.read_text(encoding='utf-8')
expected_manager = manager_before.replace(
    "const PRODUCT_VERSION = '3.0.0-alpha.5.67';",
    "const PRODUCT_VERSION = '3.0.0-alpha.5.68';",
    1,
)
if manager_after != expected_manager:
    raise SystemExit('Manager functional body changed beyond product-version synchronization')

replace_once(
    GUIDELINES,
    'Last verified real-device baseline: `3.0.0-alpha.5.66 — Managed Direct CLI Runtime`.',
    'Last verified real-device baseline: `3.0.0-alpha.5.67 — Diagnostics Workspace Overhaul`.',
    'verified real-device baseline memory',
)
replace_once(
    GUIDELINES,
    'Current release implementation: `3.0.0-alpha.5.67 — Diagnostics Workspace Overhaul`.',
    'Current release implementation: `3.0.0-alpha.5.68 — Diagnostics Capture Identity`.',
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
workspace_text = WORKSPACE.read_text(encoding='utf-8')
diagnostics_text = DIAGNOSTICS.read_text(encoding='utf-8')

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
for marker in ['diagnosticsCaptureIdentity(', 'Refresh identity:', 'Captured #']:
    if marker not in workspace_text:
        raise SystemExit(f'Diagnostics capture marker missing: {marker}')
if 'Diagnostic refresh identity:' not in diagnostics_text:
    raise SystemExit('Full Diagnostics refresh identity is missing')

print(f'prepared Local Usage Dashboard {TARGET_VERSION} (engine {TARGET_ENGINE}, manager {TARGET_MANAGER}) Diagnostics Capture Identity')
