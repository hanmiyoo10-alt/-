from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')
OLD_VERSION = '3.0.0-alpha.5.55'
NEW_VERSION = '3.0.0-alpha.5.56'
OLD_ENGINE_VERSION = '1.6.9'
NEW_ENGINE_VERSION = '1.6.10'
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


# 5.56 changes one runtime control only: the default bounded CLI concurrency
# becomes 2. The hard cap remains 2 and env=1 retains the 5.55 serial fallback.
core = SRC / '00-runtime-core.part.js'
replace_all_required(core, OLD_VERSION, NEW_VERSION, 'core product version', minimum=2)
replace_once(
    core,
    f"  const REQUIRED_BRIDGE_VERSION = '{OLD_ENGINE_VERSION}';",
    f"  const REQUIRED_BRIDGE_VERSION = '{NEW_ENGINE_VERSION}';",
    'required bridge version',
)

engine = RUNTIME / 'bridge-engine.mjs'
replace_once(engine, f"const VERSION = '{OLD_ENGINE_VERSION}';", f"const VERSION = '{NEW_ENGINE_VERSION}';", 'bridge engine version')
replace_once(
    engine,
    "const CLI_CONCURRENCY = Math.max(1, Math.min(2, Number(process.env.DEVPASS_BRIDGE_CLI_CONCURRENCY || 1)));",
    "const CLI_CONCURRENCY = Math.max(1, Math.min(2, Number(process.env.DEVPASS_BRIDGE_CLI_CONCURRENCY || 2)));",
    'default CLI concurrency 1 -> 2',
)
replace_once(
    engine,
    """    cli: {
      runs:0, queuedRuns:0, queueWaitTotalMs:0, queueWaitMaxMs:0,
      executionTotalMs:0, executionMaxMs:0,
      slowestLabel:'', slowestTotalMs:0,
    },""",
    """    cli: {
      runs:0, queuedRuns:0, queueWaitTotalMs:0, queueWaitMaxMs:0,
      executionTotalMs:0, executionMaxMs:0, maxActive:0,
      slowestLabel:'', slowestTotalMs:0,
    },""",
    'snapshot CLI peak-active storage',
)
replace_once(
    engine,
    """      executionAvgMs: runs > 0 ? Number(cli.executionTotalMs || 0) / runs : null,
      executionMaxMs: runs > 0 ? Number(cli.executionMaxMs || 0) : null,
      slowestLabel: runs > 0 && cli.slowestLabel ? String(cli.slowestLabel) : null,""",
    """      limit: CLI_CONCURRENCY,
      peakActive: runs > 0 ? Number(cli.maxActive || 0) : null,
      executionAvgMs: runs > 0 ? Number(cli.executionTotalMs || 0) / runs : null,
      executionMaxMs: runs > 0 ? Number(cli.executionMaxMs || 0) : null,
      slowestLabel: runs > 0 && cli.slowestLabel ? String(cli.slowestLabel) : null,""",
    'snapshot CLI limit and peak summary',
)
replace_once(
    engine,
    """  cliStats.active += 1;
  cliStats.runs += 1;
  cliStats.maxActive = Math.max(cliStats.maxActive, cliStats.active);
  try {""",
    """  cliStats.active += 1;
  cliStats.runs += 1;
  cliStats.maxActive = Math.max(cliStats.maxActive, cliStats.active);
  const attribution = currentSnapshotAttribution();
  if (attribution?.cli) attribution.cli.maxActive = Math.max(Number(attribution.cli.maxActive || 0), cliStats.active);
  try {""",
    'per-snapshot CLI peak active measurement',
)

diag = SRC / '40-diagnostics.part.js'
replace_once(
    diag,
    """    return `runs ${runs} · queued ${queued} · queue avg ${snapshotPerformanceMs(cli.queueWaitAvgMs)} · max ${snapshotPerformanceMs(cli.queueWaitMaxMs)} · exec avg ${snapshotPerformanceMs(cli.executionAvgMs)} · max ${snapshotPerformanceMs(cli.executionMaxMs)} · slowest ${cli.slowestLabel || '—'} ${snapshotPerformanceMs(cli.slowestTotalMs)}`;""",
    """    return `limit ${num(cli.limit) ? Number(cli.limit) : '—'} · peak active ${num(cli.peakActive) ? Number(cli.peakActive) : '—'} · runs ${runs} · queued ${queued} · queue avg ${snapshotPerformanceMs(cli.queueWaitAvgMs)} · max ${snapshotPerformanceMs(cli.queueWaitMaxMs)} · exec avg ${snapshotPerformanceMs(cli.executionAvgMs)} · max ${snapshotPerformanceMs(cli.executionMaxMs)} · slowest ${cli.slowestLabel || '—'} ${snapshotPerformanceMs(cli.slowestTotalMs)}`;""",
    'CLI bounded parallelism diagnostic line',
)

manager = RUNTIME / 'bridge-manager.cjs'
replace_once(manager, f"const PRODUCT_VERSION = '{OLD_VERSION}';", f"const PRODUCT_VERSION = '{NEW_VERSION}';", 'manager product version')
replace_once(manager, f"const BUNDLED_ENGINE_VERSION = '{OLD_ENGINE_VERSION}';", f"const BUNDLED_ENGINE_VERSION = '{NEW_ENGINE_VERSION}';", 'manager bundled engine version')
new_engine_sha = sha256_file(engine)
manager_text = read(manager)
sha_prefix = "const BUNDLED_ENGINE_SHA256 = '"
start = manager_text.find(sha_prefix)
if start < 0:
    raise SystemExit('manager bundled engine sha marker missing')
end = manager_text.find("';", start + len(sha_prefix))
if end < 0:
    raise SystemExit('manager bundled engine sha terminator missing')
manager_text = manager_text[:start] + sha_prefix + new_engine_sha + manager_text[end:]
write(manager, manager_text)

manifest_path = RUNTIME / 'product-manifest.json'
manifest = json.loads(read(manifest_path))
manifest['productVersion'] = NEW_VERSION
manifest['components']['plugin']['version'] = NEW_VERSION
manifest['components']['bridge']['requiredVersion'] = NEW_ENGINE_VERSION
manifest['components']['bridge']['sha256'] = new_engine_sha
manifest['components']['bridgeManager']['version'] = MANAGER_VERSION
manifest['components']['bridgeManager']['productVersion'] = NEW_VERSION
manifest['components']['bridgeManager']['sha256'] = sha256_file(manager)
write(manifest_path, json.dumps(manifest, indent=2) + '\n')

# Durable memory: keep the 5.55 device evidence that justified this repair.
guidelines = read(GUIDELINES)
start_marker = '## Current development memory\n'
end_marker = '## 0. Source of truth\n'
if guidelines.count(start_marker) != 1 or guidelines.count(end_marker) != 1:
    raise SystemExit('guidelines development-memory section markers are invalid')
a = guidelines.index(start_marker)
b = guidelines.index(end_marker, a)
new_memory = """## Current development memory

Last verified real-device baseline: `3.0.0-alpha.5.55 — Snapshot Performance Attribution`.

Verified from the 5.55 device diagnostic:

- Stable Readiness was `READY`; Bridge Engine `1.6.9` and Bridge Manager `1.2.6` were healthy, with no local runtime errors or failures.
- Snapshot attribution worked on-device: one visibility refresh spent about 35.9s in plugin snapshot and about 5.2s in manager probe.
- The Bridge-attributed snapshot was about 35.6s with critical path `organizations→analyticsScopes`.
- Six CLI runs averaged about 5.9s execution each; three queued runs averaged about 8.0s queue wait with a maximum about 12.7s.
- Six average CLI execution slices totaled about 35.55s, essentially matching the observed snapshot wall time, strongly attributing the bottleneck to bounded single-lane CLI serialization rather than render work.
- The slowest observed operation was `devpass-capture-30d` at about 19.1s total, with much of that time attributable to queue wait rather than its own execution.
- The same snapshot had cache errors 0, stale fallback 0, circuit opened/blocked/recoveries 0; cache/circuit failure was not the cause of that sample.
- UI rendering remained tiny relative to refresh duration, and Cache Write provenance continued to stay UNKNOWN when the source did not report it.

Current release implementation: `3.0.0-alpha.5.56 — Snapshot Performance Repair: Bounded CLI Parallelism`.

5.56 release contract:

- Bridge Engine becomes `1.6.10`; Bridge Manager remains `1.2.6`.
- Change only the default Bridge CLI concurrency from `1` to bounded `2`; keep the hard maximum at `2`.
- Preserve rollback behavior: `DEVPASS_BRIDGE_CLI_CONCURRENCY=1` restores the previous serial execution mode.
- Keep the complete 5.55 snapshot attribution telemetry and additionally report per-snapshot CLI `limit` and `peak active`.
- Keep cache TTLs, 25s CLI timeout, snapshot data semantics, cache/circuit behavior, parser `provider-usage-v3`, Runtime Recovery Fidelity, updater flow, and unknown-value semantics unchanged.
- Do not optimize manager probe in this release; evaluate it only after the snapshot repair is measured on-device.

Next step after the 5.56 real-device diagnostic: compare snapshot/queue/exec/peak-active directly against the verified 5.55 baseline, then choose the next bottleneck from evidence.

"""
write(GUIDELINES, guidelines[:a] + new_memory + guidelines[b:])
sync_guidelines_release_state()

print(
    f'prepared Local Usage Dashboard {NEW_VERSION} '
    f'(engine {NEW_ENGINE_VERSION}, manager {MANAGER_VERSION}) with bounded CLI parallelism default 2'
)
