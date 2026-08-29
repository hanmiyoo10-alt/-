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
SPEC = Path('.github/usage-dashboard/releases/5.89.json')

CORE = SRC / '00-runtime-core.part.js'
BRIDGE_IO = SRC / '20-bridge-io.part.js'
ENGINE_CORE = RUNTIME_SRC / '00-core.part.mjs'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
LATEST = ROOT / 'latest.js'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')

BASE_VERSION = '3.0.0-alpha.5.88'
TARGET_VERSION = '3.0.0-alpha.5.89'
TARGET_ENGINE = '1.6.27'
BASE_MANAGER = '1.3.2'
TARGET_MANAGER = '1.3.3'
TARGET_CLI = '1.14.0'
TARGET_RELEASE_TITLE = 'Physical Engine Convergence Repair'
TARGET_RELEASE_MEMORY = f'Current release implementation: `{TARGET_VERSION} — {TARGET_RELEASE_TITLE}`.'
BASE_ENGINE_SHA = 'd3849b2bb579fcd640938019884f7bf1155c85f9ae519fa83dab5dc704bb3e9b'
BASE_MANAGER_SHA = '870618f92e737abb31ce7102966300ce429a8913eefa25e5ead259a80ff047f6'
BASE_BOOTSTRAP_SHA = '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c'


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


def load_release_notes():
    spec = json.loads(SPEC.read_text(encoding='utf-8'))
    expected = {
        'productVersion': TARGET_VERSION,
        'engineVersion': TARGET_ENGINE,
        'managerVersion': TARGET_MANAGER,
        'materializer': 'plugins/usage-dashboard/tools/release_physical_engine_convergence_589.py',
    }
    for key, value in expected.items():
        if spec.get(key) != value:
            raise SystemExit(f'5.89 release spec {key} mismatch')
    if spec.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.89 release spec contracts changed from 1/1')
    title = spec.get('releaseTitle')
    highlights = spec.get('highlights')
    hints = spec.get('diagnosticHints')
    if title != TARGET_RELEASE_TITLE:
        raise SystemExit('5.89 release title mismatch')
    for key, value in [('highlights', highlights), ('diagnosticHints', hints)]:
        if not isinstance(value, list) or not 1 <= len(value) <= 5:
            raise SystemExit(f'5.89 {key} must contain 1..5 items')
        if any(not isinstance(item, str) or not item.strip() or len(item) > 180 for item in value):
            raise SystemExit(f'5.89 {key} items must be non-empty bounded strings')
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


def validate_baseline() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    product = manifest.get('productVersion')
    if product == TARGET_VERSION:
        validate_target()
        return
    if product != BASE_VERSION:
        raise SystemExit(f'5.89 baseline Product mismatch: {product}')
    if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.89 baseline Engine version mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('version') != BASE_MANAGER:
        raise SystemExit('5.89 baseline Manager version mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.89 baseline contracts mismatch')
    if sha256(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.89 baseline Engine artifact diverged from deployed 5.88')
    if sha256(MANAGER) != BASE_MANAGER_SHA:
        raise SystemExit('5.89 baseline Manager artifact diverged from deployed 5.88')
    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.89 bootstrap baseline diverged')
    engine_core = ENGINE_CORE.read_text(encoding='utf-8')
    manager = MANAGER.read_text(encoding='utf-8')
    if f"const VERSION = '{TARGET_ENGINE}';" not in engine_core:
        raise SystemExit('5.89 baseline Engine source version mismatch')
    if f"const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '{TARGET_CLI}';" not in engine_core:
        raise SystemExit('5.89 baseline Engine CLI pin mismatch')
    if f"const MANAGED_CLI_VERSION = '{TARGET_CLI}';" not in manager:
        raise SystemExit('5.89 baseline Manager CLI pin mismatch')


def apply_identity_and_release_notes(title, highlights, hints) -> None:
    replace_once_or_target(CORE, '//@version 3.0.0-alpha.5.88', '//@version 3.0.0-alpha.5.89', '5.89 plugin header version')
    replace_once_or_target(CORE, "  const VERSION = '3.0.0-alpha.5.88';", "  const VERSION = '3.0.0-alpha.5.89';", '5.89 plugin runtime version')
    replace_once_or_target(CORE, "  const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.2';", "  const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.3';", '5.89 plugin Manager requirement')

    text = CORE.read_text(encoding='utf-8')
    notes = release_notes_constant(title, highlights, hints)
    start = text.find('  const RELEASE_NOTES = Object.freeze({')
    end = text.find('  const UPDATE_URL =', start)
    if start < 0 or end <= start:
        raise SystemExit('5.89 static release notes boundary missing')
    if text[start:end] != notes:
        CORE.write_text(text[:start] + notes + text[end:], encoding='utf-8')


def patch_plugin_convergence() -> None:
    text = BRIDGE_IO.read_text(encoding='utf-8')
    start_marker = '  async function syncBridgeEngineBundleIfNeeded(status) {'
    start = text.find(start_marker)
    end = len(text)
    if start < 0 or end <= start:
        raise SystemExit('5.89 plugin bundle convergence function boundary missing')
    block = text[start:end]
    target_marker = "engineBundleSyncState:'capability-missing'"
    if target_marker not in block:
        old_prefix = """  async function syncBridgeEngineBundleIfNeeded(status) {
  if (!status?.connected || status.engineManaged !== true || status.engineBundleAvailable !== true) return status;
  if (String(status.productVersion || '') !== VERSION) return status;
  const runningEngineVersion = String(status.engineVersion || '');
  const bundledEngineVersion = String(status.engineBundleVersion || '');
  if (status.engineBundled === true && bundledEngineVersion && runningEngineVersion === bundledEngineVersion) {
    state.bridgeEngineBundleSyncAttemptedVersion = VERSION;
    return status;
  }
  // Live bundle state wins over a persisted attempt marker; retry while the manager still reports adopted.
  state.bridgeEngineBundleSyncAttemptedVersion = '';
"""
        new_prefix = """  async function syncBridgeEngineBundleIfNeeded(status) {
  if (!status?.connected || status.engineManaged !== true) return status;
  if (String(status.productVersion || '') !== VERSION) return status;
  let liveStatus = status;
  let runningEngineVersion = String(liveStatus.engineVersion || '');
  let bundledEngineVersion = String(liveStatus.engineBundleVersion || '');
  const isCurrentBundledEngine = value => value?.engineBundled === true
    && String(value.engineBundleVersion || '') === REQUIRED_BRIDGE_VERSION
    && String(value.engineVersion || '') === REQUIRED_BRIDGE_VERSION;
  if (isCurrentBundledEngine(liveStatus)) {
    state.bridgeEngineBundleSyncAttemptedVersion = VERSION;
    return liveStatus;
  }
  // A live version mismatch is authoritative. Refresh Manager capability once before declaring convergence unavailable.
  if (liveStatus.engineBundleAvailable !== true) {
    state.bridgeManagerLastProbeAt = 0;
    const fresh = await fetchBridgeManagerStatus(true);
    if (fresh?.connected && fresh.engineManaged === true && String(fresh.productVersion || '') === VERSION) {
      liveStatus = fresh;
      runningEngineVersion = String(liveStatus.engineVersion || '');
      bundledEngineVersion = String(liveStatus.engineBundleVersion || '');
      if (isCurrentBundledEngine(liveStatus)) {
        state.bridgeEngineBundleSyncAttemptedVersion = VERSION;
        return liveStatus;
      }
    }
  }
  if (liveStatus.engineBundleAvailable !== true) {
    return {...liveStatus,engineBundleSyncState:'capability-missing',engineBundleSyncError:`bundle capability unavailable for live engine ${runningEngineVersion || 'unknown'} -> required ${REQUIRED_BRIDGE_VERSION}`};
  }
  if (!bundledEngineVersion) {
    return {...liveStatus,engineBundleSyncState:'target-missing',engineBundleSyncError:`bundle target missing for live engine ${runningEngineVersion || 'unknown'} -> required ${REQUIRED_BRIDGE_VERSION}`};
  }
  if (bundledEngineVersion !== REQUIRED_BRIDGE_VERSION) {
    return {...liveStatus,engineBundleSyncState:'target-mismatch',engineBundleSyncError:`bundle target ${bundledEngineVersion} does not match required ${REQUIRED_BRIDGE_VERSION}`};
  }
  // Live bundle state wins over a persisted attempt marker; retry until the exact required Engine is running.
  state.bridgeEngineBundleSyncAttemptedVersion = '';
"""
        if block.count(old_prefix) != 1:
            raise SystemExit(f'5.89 plugin convergence prefix mismatch: {block.count(old_prefix)}')
        block = block.replace(old_prefix, new_prefix, 1)
        replacements = [
            ("return {...status,engineBundleSyncState:String(payload?.state || 'failed'),engineBundleSyncError:String(payload?.error || `HTTP ${res.status}`)};", "return {...liveStatus,engineBundleSyncState:String(payload?.state || 'failed'),engineBundleSyncError:String(payload?.error || `HTTP ${res.status}`)};"),
            ("...(fresh?.connected ? fresh : status),", "...(fresh?.connected ? fresh : liveStatus),"),
            ("return {...status,engineBundleSyncState:'probe-error',engineBundleSyncError:e?.message || String(e)};", "return {...liveStatus,engineBundleSyncState:'probe-error',engineBundleSyncError:e?.message || String(e)};"),
        ]
        for old, new in replacements:
            if block.count(old) != 1:
                raise SystemExit(f'5.89 plugin convergence replacement missing: {old}')
            block = block.replace(old, new, 1)
        text = text[:start] + block
        BRIDGE_IO.write_text(text, encoding='utf-8')


def patch_manager_convergence() -> None:
    text = MANAGER.read_text(encoding='utf-8')
    text, count = re.subn(r"const MANAGER_VERSION = '[^']+';", f"const MANAGER_VERSION = '{TARGET_MANAGER}';", text, count=1)
    if count != 1:
        raise SystemExit('5.89 Manager version marker missing')
    text, count = re.subn(r"const PRODUCT_VERSION = '[^']+';", f"const PRODUCT_VERSION = '{TARGET_VERSION}';", text, count=1)
    if count != 1:
        raise SystemExit('5.89 Manager Product marker missing')

    old_bundled = "const engineBundled = Boolean(managed && descriptorBundled && bundleReady && serviceEnvironmentReady);"
    new_bundled = "const engineBundled = Boolean(managed && descriptorBundled && bundleReady && serviceEnvironmentReady && String(identity?.bridgeVersion || '') === BUNDLED_ENGINE_VERSION);"
    if new_bundled not in text:
        if text.count(old_bundled) != 1:
            raise SystemExit('5.89 Manager live bundled classification marker missing')
        text = text.replace(old_bundled, new_bundled, 1)

    old_wait_sig = "async function waitForManagedEngine(expected, timeoutMs = 12000) {"
    new_wait_sig = "async function waitForManagedEngine(expected, expectedVersion = '', timeoutMs = 12000) {"
    if new_wait_sig not in text:
        if text.count(old_wait_sig) != 1:
            raise SystemExit('5.89 Manager waitForManagedEngine signature missing')
        text = text.replace(old_wait_sig, new_wait_sig, 1)

    old_identity = """      try {
        const identity = await bridgeIdentity();
        return {ok:true,service,pid:service.pid,identity,bridgeVersion:identity.bridgeVersion,ownership:pid === service.pid ? 'proc-net' : 'service-process'};
      } catch (e) { lastError = e?.message || String(e); }
"""
    new_identity = """      try {
        const identity = await bridgeIdentity();
        const liveVersion = String(identity?.bridgeVersion || '');
        if (expectedVersion && liveVersion !== expectedVersion) {
          lastError = `managed engine version mismatch: expected ${expectedVersion}, got ${liveVersion || 'unknown'}`;
          await sleep(350);
          continue;
        }
        return {ok:true,service,pid:service.pid,identity,bridgeVersion:identity.bridgeVersion,ownership:pid === service.pid ? 'proc-net' : 'service-process'};
      } catch (e) { lastError = e?.message || String(e); }
"""
    if new_identity not in text:
        if text.count(old_identity) != 1:
            raise SystemExit('5.89 Manager version-exact identity verification marker missing')
        text = text.replace(old_identity, new_identity, 1)

    old_start = "async function startManagedCandidate(candidate) {"
    new_start = "async function startManagedCandidate(candidate, expectedVersion = '') {"
    if new_start not in text:
        if text.count(old_start) != 1:
            raise SystemExit('5.89 Manager startManagedCandidate signature missing')
        text = text.replace(old_start, new_start, 1)
    replace_old = "  return waitForManagedEngine(candidate);"
    replace_new = "  return waitForManagedEngine(candidate, expectedVersion);"
    start_pos = text.find(new_start)
    end_pos = text.find('const BRIDGE_PROBE_PATH', start_pos)
    start_block = text[start_pos:end_pos]
    if replace_new not in start_block:
        if start_block.count(replace_old) != 1:
            raise SystemExit('5.89 Manager startManagedCandidate forwarding marker missing')
        start_block = start_block.replace(replace_old, replace_new, 1)
        text = text[:start_pos] + start_block + text[end_pos:]

    old_sync_start = "const verified = await startManagedCandidate(next);"
    new_sync_start = "const verified = await startManagedCandidate(next, BUNDLED_ENGINE_VERSION);"
    if new_sync_start not in text:
        if text.count(old_sync_start) != 1:
            raise SystemExit('5.89 Manager bundle exact-version start marker missing')
        text = text.replace(old_sync_start, new_sync_start, 1)

    MANAGER.write_text(text, encoding='utf-8')


def sync_release_memory() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    current_re = re.compile(r'Current release implementation: `[^`]+`\.', re.M)
    if TARGET_RELEASE_MEMORY not in text:
        text, count = current_re.subn(TARGET_RELEASE_MEMORY, text, count=1)
        if count != 1:
            raise SystemExit('5.89 current release memory marker missing')
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
    core = CORE.read_text(encoding='utf-8')
    bridge_io = BRIDGE_IO.read_text(encoding='utf-8')
    engine_core = ENGINE_CORE.read_text(encoding='utf-8')
    manager = MANAGER.read_text(encoding='utf-8')
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    if f"const VERSION = '{TARGET_VERSION}';" not in core:
        raise SystemExit('5.89 Plugin VERSION target missing')
    if f"const REQUIRED_BRIDGE_VERSION = '{TARGET_ENGINE}';" not in core:
        raise SystemExit('5.89 Plugin Engine requirement changed')
    if f"const REQUIRED_BRIDGE_MANAGER_VERSION = '{TARGET_MANAGER}';" not in core:
        raise SystemExit('5.89 Plugin Manager requirement missing')
    if "engineBundleSyncState:'capability-missing'" not in bridge_io or "fetchBridgeManagerStatus(true)" not in bridge_io:
        raise SystemExit('5.89 Plugin explicit bundle convergence repair missing')
    if f"const VERSION = '{TARGET_ENGINE}';" not in engine_core:
        raise SystemExit('5.89 Engine source version changed')
    if f"const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '{TARGET_CLI}';" not in engine_core:
        raise SystemExit('5.89 Engine CLI pin changed')
    if sha256(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.89 Engine artifact must remain exact-byte identical to 5.88')
    for marker in [
        f"const MANAGER_VERSION = '{TARGET_MANAGER}';",
        f"const PRODUCT_VERSION = '{TARGET_VERSION}';",
        f"const BUNDLED_ENGINE_VERSION = '{TARGET_ENGINE}';",
        f"const MANAGED_CLI_VERSION = '{TARGET_CLI}';",
        "String(identity?.bridgeVersion || '') === BUNDLED_ENGINE_VERSION",
        "async function waitForManagedEngine(expected, expectedVersion = '', timeoutMs = 12000)",
        "managed engine version mismatch: expected ${expectedVersion}",
        "startManagedCandidate(next, BUNDLED_ENGINE_VERSION)",
    ]:
        if marker not in manager:
            raise SystemExit(f'5.89 Manager convergence marker missing: {marker}')
    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.89 bootstrap exact-byte preservation failed')
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.89 manifest Product mismatch')
    if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.89 manifest Engine version mismatch')
    if manifest.get('components', {}).get('bridge', {}).get('sha256') != BASE_ENGINE_SHA:
        raise SystemExit('5.89 manifest Engine hash changed')
    if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
        raise SystemExit('5.89 manifest Manager version mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.89 manifest Manager Product mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('sha256') != sha256(MANAGER):
        raise SystemExit('5.89 manifest Manager hash mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('bootstrapSha256') != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.89 manifest bootstrap hash mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.89 contracts changed')


title, highlights, hints = load_release_notes()
validate_baseline()
old_plugin_bytes = LATEST.stat().st_size
old_engine_bytes = ENGINE.stat().st_size
old_manager_bytes = MANAGER.stat().st_size
old_engine_sha = sha256(ENGINE)

apply_identity_and_release_notes(title, highlights, hints)
patch_plugin_convergence()
patch_manager_convergence()
sync_release_memory()
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--check')
if sha256(ENGINE) != old_engine_sha:
    raise SystemExit('5.89 Engine bytes changed during materialization')
sync_manifest_hashes()
run('node', '--check', str(LATEST))
run('node', '--check', str(MANAGER))
run('node', '--check', str(ENGINE))
validate_target()

print(
    f'5.89 materialized: plugin {old_plugin_bytes}->{LATEST.stat().st_size} bytes; '
    f'Engine unchanged {old_engine_bytes} bytes SHA {sha256(ENGINE)}; '
    f'Manager {old_manager_bytes}->{MANAGER.stat().st_size} bytes {BASE_MANAGER}->{TARGET_MANAGER}; '
    f'managed CLI stays {TARGET_CLI}; contracts 1/1'
)
