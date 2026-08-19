from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
TESTS = ROOT / 'tests'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')
OLD_VERSION = '3.0.0-alpha.5.53'
NEW_VERSION = '3.0.0-alpha.5.54'
ENGINE_VERSION = '1.6.8'
MANAGER_VERSION = '1.2.6'


def read(path: Path) -> str:
    return path.read_text()


def write(path: Path, text: str) -> None:
    path.write_text(text)


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match in {path}, got {count}')
    write(path, text.replace(old, new, 1))


def replace_all_required(path: Path, old: str, new: str, label: str, minimum: int = 1) -> None:
    text = read(path)
    count = text.count(old)
    if count < minimum:
        raise SystemExit(f'{label}: expected >= {minimum} matches in {path}, got {count}')
    write(path, text.replace(old, new))


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sync_guidelines_release_state() -> None:
    manifest = json.loads(read(RUNTIME / 'product-manifest.json'))
    current = read(GUIDELINES)
    start = '<!-- USAGE_DASHBOARD_RELEASE_STATE_START -->'
    end = '<!-- USAGE_DASHBOARD_RELEASE_STATE_END -->'
    if current.count(start) != 1 or current.count(end) != 1:
        raise SystemExit('guidelines release-state markers must each appear exactly once')
    components = manifest.get('components') or {}
    block = '\n'.join([
        start,
        f"- Product: `{manifest['productVersion']}`",
        f"- Bridge Engine: `{components['bridge']['requiredVersion']}`",
        f"- Bridge Manager: `{components['bridgeManager']['version']}`",
        f"- Release branch: `{manifest['releaseBranch']}`",
        '- Source: `plugins/usage-dashboard/runtime/product-manifest.json`',
        end,
    ])
    a = current.index(start)
    b = current.index(end, a) + len(end)
    write(GUIDELINES, current[:a] + block + current[b:])


# 5.54 changes local runtime error semantics only. Bridge Engine, cache parser,
# snapshot acquisition and rendering behavior remain on the verified 5.53 baseline.
core = SRC / '00-runtime-core.part.js'
replace_all_required(core, OLD_VERSION, NEW_VERSION, 'core product version', minimum=2)
replace_once(
    core,
    "  const localRuntimeErrors = {count:0,persistFailures:0,renderFailures:0,lastStage:'',lastMessage:'',lastAt:null};",
    "  const localRuntimeErrors = {count:0,persistFailures:0,renderFailures:0,recoveredCount:0,lastStage:'',lastMessage:'',lastAt:null,lastRecoveryStage:'',lastRecoveryAt:null,active:{persist:null,render:null,runtime:null}};",
    'local runtime recovery state',
)

analytics = SRC / '16-usage-analytics.part.js'
replace_once(
    analytics,
    """  function noteLocalRuntimeError(stage, error) {
    const key = String(stage || 'runtime');
    const message = String(error?.message || error || 'unknown error')
      .replace(/llmgtwy_[A-Za-z0-9_-]+/g, 'llmgtwy_[REDACTED]')
      .replace(/Bearer\\s+[^\\s'\\\"]+/gi, 'Bearer [REDACTED]')
      .replace(/\\s+/g, ' ')
      .slice(0, 180);
    localRuntimeErrors.count += 1;
    if (key.includes('persist')) localRuntimeErrors.persistFailures += 1;
    if (key.includes('render')) localRuntimeErrors.renderFailures += 1;
    localRuntimeErrors.lastStage = key;
    localRuntimeErrors.lastMessage = message;
    localRuntimeErrors.lastAt = Date.now();
    console.log(`[Local Usage Dashboard] local ${key} failed: ${message}`);
  }

  async function persistRefreshState(stage) {
    try { await persist(); return true; }
    catch (error) { noteLocalRuntimeError(stage, error); return false; }
  }

  async function renderRefreshWidget(reason, stage) {
    try { await renderWidget(reason); return true; }
    catch (error) { noteLocalRuntimeError(stage, error); return false; }
  }""",
    """  function localRuntimeErrorKind(stage) {
    const key = String(stage || 'runtime');
    if (key.includes('persist')) return 'persist';
    if (key.includes('render')) return 'render';
    return 'runtime';
  }

  function localRuntimeActiveEntries() {
    return Object.values(localRuntimeErrors.active || {}).filter(Boolean);
  }

  function localRuntimeActiveCount() {
    return localRuntimeActiveEntries().length;
  }

  function noteLocalRuntimeError(stage, error) {
    const key = String(stage || 'runtime');
    const kind = localRuntimeErrorKind(key);
    const message = String(error?.message || error || 'unknown error')
      .replace(/llmgtwy_[A-Za-z0-9_-]+/g, 'llmgtwy_[REDACTED]')
      .replace(/Bearer\\s+[^\\s'\\\"]+/gi, 'Bearer [REDACTED]')
      .replace(/\\s+/g, ' ')
      .slice(0, 180);
    const now = Date.now();
    localRuntimeErrors.count += 1;
    if (kind === 'persist') localRuntimeErrors.persistFailures += 1;
    if (kind === 'render') localRuntimeErrors.renderFailures += 1;
    const current = localRuntimeErrors.active?.[kind] || null;
    localRuntimeErrors.active[kind] = {
      stage:key,
      message,
      since:current?.since || now,
      lastAt:now,
      failures:Number(current?.failures || 0) + 1,
    };
    localRuntimeErrors.lastStage = key;
    localRuntimeErrors.lastMessage = message;
    localRuntimeErrors.lastAt = now;
    console.log(`[Local Usage Dashboard] local ${key} failed: ${message}`);
  }

  function noteLocalRuntimeRecovery(stage) {
    const key = String(stage || 'runtime');
    const kind = localRuntimeErrorKind(key);
    const active = localRuntimeErrors.active?.[kind] || null;
    if (!active) return false;
    localRuntimeErrors.active[kind] = null;
    localRuntimeErrors.recoveredCount = Number(localRuntimeErrors.recoveredCount || 0) + 1;
    localRuntimeErrors.lastRecoveryStage = key;
    localRuntimeErrors.lastRecoveryAt = Date.now();
    return true;
  }

  async function persistRefreshState(stage) {
    try { await persist(); noteLocalRuntimeRecovery(stage); return true; }
    catch (error) { noteLocalRuntimeError(stage, error); return false; }
  }

  async function renderRefreshWidget(reason, stage) {
    try { await renderWidget(reason); noteLocalRuntimeRecovery(stage); return true; }
    catch (error) { noteLocalRuntimeError(stage, error); return false; }
  }""",
    'active/recovered local runtime errors',
)

diag = SRC / '40-diagnostics.part.js'
replace_once(
    diag,
    "    if (Number(localRuntimeErrors.count || 0) > 0) blockers.push(`local errors ${Number(localRuntimeErrors.count || 0)}`);",
    "    const activeLocalErrors = localRuntimeActiveCount();\n    if (activeLocalErrors > 0) blockers.push(`active local errors ${activeLocalErrors}`);",
    'stable readiness active local error gate',
)
replace_once(
    diag,
    "      `Stable readiness: ${stableReadiness.ready ? 'READY' : 'BLOCKED'} · updater ${stableReadiness.updaterCompatible ? 'compatible' : 'incompatible'} · blockers ${stableReadiness.blockers.join(', ') || 'none'}` ,",
    "      `Stable readiness: ${stableReadiness.ready ? 'READY' : 'BLOCKED'} · updater ${stableReadiness.updaterCompatible ? 'compatible' : 'incompatible'} · blockers ${stableReadiness.blockers.join(', ') || 'none'} · local recoveries ${Number(localRuntimeErrors.recoveredCount || 0)}` ,",
    'stable readiness recovery history diagnostic',
)
replace_once(
    diag,
    "      `Local runtime errors: ${Number(localRuntimeErrors.count || 0)} · persist ${Number(localRuntimeErrors.persistFailures || 0)} · render ${Number(localRuntimeErrors.renderFailures || 0)} · last ${localRuntimeErrors.lastAt ? `${localRuntimeErrors.lastStage || 'runtime'} · ${age(localRuntimeErrors.lastAt)} · ${localRuntimeErrors.lastMessage || 'error'}` : 'none'}` ,",
    "      `Local runtime errors: total ${Number(localRuntimeErrors.count || 0)} · active ${localRuntimeActiveCount()} · recoveries ${Number(localRuntimeErrors.recoveredCount || 0)} · persist ${Number(localRuntimeErrors.persistFailures || 0)} · render ${Number(localRuntimeErrors.renderFailures || 0)} · last ${localRuntimeErrors.lastAt ? `${localRuntimeErrors.lastStage || 'runtime'} · ${age(localRuntimeErrors.lastAt)} · ${localRuntimeErrors.lastMessage || 'error'}` : 'none'} · recovery ${localRuntimeErrors.lastRecoveryAt ? `${localRuntimeErrors.lastRecoveryStage || 'runtime'} · ${age(localRuntimeErrors.lastRecoveryAt)}` : 'none'}` ,",
    'local runtime recovery diagnostic',
)

manager = RUNTIME / 'bridge-manager.cjs'
replace_once(manager, f"const PRODUCT_VERSION = '{OLD_VERSION}';", f"const PRODUCT_VERSION = '{NEW_VERSION}';", 'manager product version')

# Keep existing cache fidelity/provenance tests version-current while preserving behavior.
p11 = TESTS / 'p11-cache-fidelity.cjs'
replace_all_required(p11, OLD_VERSION, NEW_VERSION, 'P11 product version', minimum=5)
p13 = TESTS / 'p13-cache-provenance-diagnostics.cjs'
replace_all_required(p13, OLD_VERSION, NEW_VERSION, 'P13 product version', minimum=5)

manifest_path = RUNTIME / 'product-manifest.json'
manifest = json.loads(read(manifest_path))
manifest['productVersion'] = NEW_VERSION
manifest['components']['plugin']['version'] = NEW_VERSION
manifest['components']['bridge']['requiredVersion'] = ENGINE_VERSION
manifest['components']['bridgeManager']['version'] = MANAGER_VERSION
manifest['components']['bridgeManager']['productVersion'] = NEW_VERSION
manifest['components']['bridgeManager']['sha256'] = sha256_file(manager)
write(manifest_path, json.dumps(manifest, indent=2) + '\n')

# The repository is durable project memory. Keep both the current release state
# and the evidence-driven development memory current with this release.
guidelines = read(GUIDELINES)
old_memory = """Next designed release candidate: `3.0.0-alpha.5.54 — Runtime Recovery Fidelity`.

Primary design goal for 5.54:

- Preserve cumulative error history.
- Separate active runtime errors from recovered historical errors.
- Let Stable Readiness describe current health instead of being permanently blocked by recovered error counts.
- Do not mix snapshot performance optimization into the same release."""
new_memory = """Current release implementation: `3.0.0-alpha.5.54 — Runtime Recovery Fidelity`.

5.54 release contract:

- Preserve cumulative local runtime error history.
- Track persist/render errors as active until the same local operation succeeds.
- Record recovery without erasing the historical failure counters.
- Stable Readiness blocks only on active local runtime errors, while recovered history remains visible.
- Cache provenance, Bridge Engine `1.6.8`, Bridge Manager `1.2.6`, and snapshot acquisition remain unchanged.

Next evidence-first candidate after 5.54 device validation: `Snapshot Performance Attribution` — instrument the existing snapshot path before changing its behavior."""
if guidelines.count(old_memory) != 1:
    raise SystemExit('guidelines 5.54 development-memory marker not found')
write(GUIDELINES, guidelines.replace(old_memory, new_memory, 1))
sync_guidelines_release_state()

print(
    f'prepared Local Usage Dashboard {NEW_VERSION} '
    f'(engine {ENGINE_VERSION}, manager {MANAGER_VERSION}) with runtime recovery fidelity v1'
)
