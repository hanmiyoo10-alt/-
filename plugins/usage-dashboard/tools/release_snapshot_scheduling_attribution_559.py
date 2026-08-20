from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')
OLD_VERSION = '3.0.0-alpha.5.58'
NEW_VERSION = '3.0.0-alpha.5.59'
OLD_ENGINE_VERSION = '1.6.12'
NEW_ENGINE_VERSION = '1.6.13'
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


# 5.59 is measurement-only. Keep 5.58 scheduling/capture behavior frozen and
# add a bounded relative timeline inside the existing per-snapshot attribution.
core = SRC / '00-runtime-core.part.js'
replace_all_required(core, OLD_VERSION, NEW_VERSION, 'core product version', minimum=2)
replace_once(
    core,
    f"  const REQUIRED_BRIDGE_VERSION = '{OLD_ENGINE_VERSION}';",
    f"  const REQUIRED_BRIDGE_VERSION = '{NEW_ENGINE_VERSION}';",
    'required bridge version',
)

engine = RUNTIME / 'bridge-engine.mjs'
replace_once(engine, f"const VERSION = '{OLD_ENGINE_VERSION}';", f"const VERSION = '{NEW_ENGINE_VERSION}';", 'engine version')
replace_once(
    engine,
    """    tasks: Object.create(null),
    organizationDiscovery: null,""",
    """    tasks: Object.create(null),
    taskTimeline: Object.create(null),
    cliOperations: [],
    organizationDiscovery: null,""",
    'timeline attribution storage',
)
replace_once(
    engine,
    """async function timedSnapshotTask(name, task) {
  const attribution = currentSnapshotAttribution();
  const started = Date.now();
  try {
    return await task();
  } finally {
    if (attribution) attribution.tasks[String(name)] = Math.max(0, Date.now() - started);
  }
}""",
    """async function timedSnapshotTask(name, task) {
  const attribution = currentSnapshotAttribution();
  const started = Date.now();
  const key = String(name);
  const startOffsetMs = attribution ? Math.max(0, started - Number(attribution.startedAt || started)) : null;
  try {
    return await task();
  } finally {
    const ended = Date.now();
    const durationMs = Math.max(0, ended - started);
    if (attribution) {
      attribution.tasks[key] = durationMs;
      if (attribution.taskTimeline) {
        attribution.taskTimeline[key] = {
          startOffsetMs,
          endOffsetMs: Math.max(0, ended - Number(attribution.startedAt || ended)),
          durationMs,
        };
      }
    }
  }
}""",
    'task timeline recorder',
)

engine_text = read(engine)
marker = '\n\nfunction snapshotAttributionSummary(attribution) {'
pos = engine_text.find(marker)
if pos < 0:
    raise SystemExit('snapshot attribution summary marker missing')
helper = """

function noteSnapshotCliOperation(label, queuedAt, executionStartedAt, endedAt) {
  const attribution = currentSnapshotAttribution();
  if (!attribution || !Array.isArray(attribution.cliOperations)) return;
  if (attribution.cliOperations.length >= 8) return;
  const base = Number(attribution.startedAt || queuedAt || endedAt || Date.now());
  const queuedStart = Number(queuedAt || executionStartedAt || endedAt || base);
  const execStart = Number(executionStartedAt || queuedStart);
  const ended = Number(endedAt || execStart);
  attribution.cliOperations.push({
    label: String(label || 'cli'),
    startOffsetMs: Math.max(0, queuedStart - base),
    executionStartOffsetMs: Math.max(0, execStart - base),
    endOffsetMs: Math.max(0, ended - base),
    queueWaitMs: Math.max(0, execStart - queuedStart),
    executionMs: Math.max(0, ended - execStart),
  });
}
"""
write(engine, engine_text[:pos] + helper + engine_text[pos:])

replace_once(
    engine,
    """    tasks: {...tasks},
    organizationDiscovery: attribution?.organizationDiscovery && typeof attribution.organizationDiscovery === 'object'""",
    """    tasks: {...tasks},
    taskTimeline: attribution?.taskTimeline && typeof attribution.taskTimeline === 'object'
      ? Object.fromEntries(Object.entries(attribution.taskTimeline).map(([name, value]) => [name, {...value}]))
      : {},
    cliOperations: Array.isArray(attribution?.cliOperations)
      ? attribution.cliOperations.slice(0, 8).map((item) => ({...item}))
      : [],
    organizationDiscovery: attribution?.organizationDiscovery && typeof attribution.organizationDiscovery === 'object'""",
    'timeline summary fields',
)
replace_once(
    engine,
    """  } finally {
    const executionMs = Math.max(0, Date.now() - executionStartedAt);
    noteSnapshotCliTiming(label, queued, queueWaitMs, executionMs);
    cliStats.active = Math.max(0, cliStats.active - 1);""",
    """  } finally {
    const endedAt = Date.now();
    const executionMs = Math.max(0, endedAt - executionStartedAt);
    noteSnapshotCliTiming(label, queued, queueWaitMs, executionMs);
    if (typeof noteSnapshotCliOperation === 'function') {
      noteSnapshotCliOperation(label, queuedAt, executionStartedAt, endedAt);
    }
    cliStats.active = Math.max(0, cliStats.active - 1);""",
    'CLI timeline hook',
)

# Safe diagnostics: top-level task offsets plus already-sanitized CLI families.
diag = SRC / '40-diagnostics.part.js'
replace_once(
    diag,
    """  function bridgeCaptureReuseText(performance) {
    const reuse = performance?.captureReuse && typeof performance.captureReuse === 'object'
      ? performance.captureReuse
      : null;
    if (!reuse) return '—';
    const checks = Number(reuse.activityReuseChecks || 0);
    const shared = Number(reuse.activityShared || 0);
    const activityState = checks > 0 ? (shared > 0 ? 'yes' : 'no') : 'not-exercised';
    return `bootstrap ${reuse.bootstrapRange || '—'} · activity shared ${activityState} · dedicated 24h fallback ${Number(reuse.dedicated24hFallbacks || 0)}`;
  }

  function stableReadinessSnapshot(bridgeDiag, runtimeBridge) {""",
    """  function bridgeCaptureReuseText(performance) {
    const reuse = performance?.captureReuse && typeof performance.captureReuse === 'object'
      ? performance.captureReuse
      : null;
    if (!reuse) return '—';
    const checks = Number(reuse.activityReuseChecks || 0);
    const shared = Number(reuse.activityShared || 0);
    const activityState = checks > 0 ? (shared > 0 ? 'yes' : 'no') : 'not-exercised';
    return `bootstrap ${reuse.bootstrapRange || '—'} · activity shared ${activityState} · dedicated 24h fallback ${Number(reuse.dedicated24hFallbacks || 0)}`;
  }

  function bridgeSnapshotTimelineText(performance) {
    const timeline = performance?.taskTimeline && typeof performance.taskTimeline === 'object'
      ? performance.taskTimeline
      : null;
    if (!timeline) return '—';
    const names = ['organizations','devpassStatus','usageScopes','analyticsScopes','runway'];
    const rows = names
      .map((name) => [name, timeline[name]])
      .filter(([,value]) => value && Number.isFinite(Number(value.startOffsetMs)) && Number.isFinite(Number(value.endOffsetMs)))
      .map(([name,value]) => `${name} ${Math.round(Number(value.startOffsetMs))}→${Math.round(Number(value.endOffsetMs))}ms`);
    return rows.join(' · ') || '—';
  }

  function bridgeCliOperationsText(performance) {
    const operations = Array.isArray(performance?.cliOperations) ? performance.cliOperations.slice(0, 8) : [];
    if (!operations.length) return '—';
    return operations.map((item) => {
      const label = String(item?.label || 'cli');
      const start = Number.isFinite(Number(item?.startOffsetMs)) ? Math.round(Number(item.startOffsetMs)) : 0;
      const end = Number.isFinite(Number(item?.endOffsetMs)) ? Math.round(Number(item.endOffsetMs)) : start;
      const queue = Number.isFinite(Number(item?.queueWaitMs)) ? Math.round(Number(item.queueWaitMs)) : 0;
      const exec = Number.isFinite(Number(item?.executionMs)) ? Math.round(Number(item.executionMs)) : 0;
      return `${label} ${start}→${end}ms · q${queue} · exec${exec}`;
    }).join(' · ');
  }

  function stableReadinessSnapshot(bridgeDiag, runtimeBridge) {""",
    'timeline diagnostic helpers',
)
replace_once(
    diag,
    """      `Bridge snapshot jobs: ${bridgeSnapshotJobsText(bridgeDiag.snapshotPerformance)}`,
      `Bridge CLI timing: ${bridgeSnapshotCliTimingText(bridgeDiag.snapshotPerformance)}`,""",
    """      `Bridge snapshot jobs: ${bridgeSnapshotJobsText(bridgeDiag.snapshotPerformance)}`,
      `Bridge snapshot timeline: ${bridgeSnapshotTimelineText(bridgeDiag.snapshotPerformance)}`,
      `Bridge CLI operations: ${bridgeCliOperationsText(bridgeDiag.snapshotPerformance)}`,
      `Bridge CLI timing: ${bridgeSnapshotCliTimingText(bridgeDiag.snapshotPerformance)}`,""",
    'timeline diagnostic lines',
)

manager = RUNTIME / 'bridge-manager.cjs'
replace_once(manager, f"const PRODUCT_VERSION = '{OLD_VERSION}';", f"const PRODUCT_VERSION = '{NEW_VERSION}';", 'manager product version')
replace_once(manager, f"const BUNDLED_ENGINE_VERSION = '{OLD_ENGINE_VERSION}';", f"const BUNDLED_ENGINE_VERSION = '{NEW_ENGINE_VERSION}';", 'manager engine version')
engine_sha = sha256_file(engine)
manager_text = read(manager)
prefix = "const BUNDLED_ENGINE_SHA256 = '"
start = manager_text.find(prefix)
end = manager_text.find("';", start + len(prefix))
if start < 0 or end < 0:
    raise SystemExit('manager bundled engine sha marker missing')
write(manager, manager_text[:start] + prefix + engine_sha + manager_text[end:])

manifest_path = RUNTIME / 'product-manifest.json'
manifest = json.loads(read(manifest_path))
manifest['productVersion'] = NEW_VERSION
manifest['components']['plugin']['version'] = NEW_VERSION
manifest['components']['bridge']['requiredVersion'] = NEW_ENGINE_VERSION
manifest['components']['bridge']['sha256'] = engine_sha
manifest['components']['bridgeManager']['version'] = MANAGER_VERSION
manifest['components']['bridgeManager']['productVersion'] = NEW_VERSION
manifest['components']['bridgeManager']['sha256'] = sha256_file(manager)
write(manifest_path, json.dumps(manifest, indent=2) + '\n')

# Durable memory: 5.58 device evidence is the baseline; 5.59 does not repair yet.
guidelines = read(GUIDELINES)
start_marker = '## Current development memory\n'
end_marker = '## 0. Source of truth\n'
if guidelines.count(start_marker) != 1 or guidelines.count(end_marker) != 1:
    raise SystemExit('guidelines development-memory section markers are invalid')
a = guidelines.index(start_marker)
b = guidelines.index(end_marker, a)
new_memory = """## Current development memory

Last verified real-device baseline: `3.0.0-alpha.5.58 — Shared 24h Capture Coalescing`.

Verified from the 5.58 device diagnostic:

- Stable Readiness was `READY`; Bridge Engine `1.6.12` and Bridge Manager `1.2.6` were healthy with no local runtime errors or failures.
- Organization discovery remained on `capture-primary · fallback 0 · shared account capture yes`.
- Shared 24h reuse was active: `bootstrap 24h · activity shared yes · dedicated 24h fallback 0`.
- The sampled Bridge snapshot was about 13.28s, down from about 17.87s in 5.57; timer refresh was about 14.40s total.
- `analyticsScopes` was about 5.92s, down from about 11.84s in 5.57, and the previously observed CLI queue wait disappeared.
- The Bridge ran 3 CLI operations with `limit 2 · peak active 2 · queued 0`; average execution was about 6.33s and the slowest sanitized operation was `devpass-capture-24h` at about 7.31s.
- The sampled critical path still looked serialized: organization/bootstrap work about 7.35s followed by post-root usage/analytics work about 5.92s, totaling about 13.27s.
- The sampled visibility refresh was about 25.07s versus timer refresh about 14.40s; 5.58 telemetry could not attribute the exact cause.
- Snapshot cache errors/stale fallbacks and circuit opens/blocks/recoveries were all 0.
- Runtime Recovery Fidelity remained verified: cumulative local persist history remained visible while `active 0` allowed `READY`.
- Cache fidelity remained verified: provider Cache Read stayed observable while missing Write/TTL remained UNKNOWN and was never inferred.
- Next candidate after the 5.55 real-device diagnostic: `3.0.0-alpha.5.56 — Snapshot Performance Repair`.

Current release implementation: `3.0.0-alpha.5.59 — Snapshot Scheduling Attribution`.

5.59 release contract:

- Bridge Engine becomes `1.6.13`; Bridge Manager remains `1.2.6`.
- Measurement only: do not change snapshot ordering, CLI concurrency, CLI timeout, cache TTLs, stale/circuit behavior, capture reuse, fallback behavior, payload semantics, or updater flow.
- Keep bounded CLI concurrency default/hard maximum at `2`; `DEVPASS_BRIDGE_CLI_CONCURRENCY=1` remains the serial rollback.
- Keep 5.58 shared 24h capture coalescing unchanged, including the dedicated 24h fallback only when shared activity is absent.
- Record relative start/end/duration for snapshot tasks inside the existing per-snapshot AsyncLocalStorage attribution context.
- Record at most 8 CLI operation timeline entries using only sanitized family labels plus relative offsets, queue wait, and execution time.
- Never retain raw CLI arguments, organization/project IDs, tokens, headers, capture file paths, or command output in scheduling telemetry.
- Add `Bridge snapshot timeline` and `Bridge CLI operations` diagnostics without adding CLI/network work.
- Preserve 5.57 organization fallback/empty-result fidelity, Runtime Recovery Fidelity, parser `provider-usage-v3`, and UNKNOWN semantics for missing Cache Write/TTL.

Next step after the 5.59 real-device diagnostic: use the measured task/CLI timeline to choose between snapshot-root overlap and one specific range/Credits scheduling repair. Do not choose 5.60 before that evidence.

"""
write(GUIDELINES, guidelines[:a] + new_memory + guidelines[b:])
sync_guidelines_release_state()

print(f'prepared Local Usage Dashboard {NEW_VERSION} (engine {NEW_ENGINE_VERSION}, manager {MANAGER_VERSION}) with snapshot scheduling attribution')
