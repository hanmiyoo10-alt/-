from pathlib import Path
import hashlib
import json


ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')
OLD_VERSION = '3.0.0-alpha.5.63'
NEW_VERSION = '3.0.0-alpha.5.64'
OLD_ENGINE_VERSION = '1.6.16'
NEW_ENGINE_VERSION = '1.6.17'
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


def replace_quoted_constant(path: Path, prefix: str, value: str, label: str) -> None:
    text = read(path)
    if text.count(prefix) != 1:
        raise SystemExit(f'{label}: expected one prefix in {path}')
    start = text.index(prefix) + len(prefix)
    end = text.find("';", start)
    if end < 0:
        raise SystemExit(f'{label}: closing quote missing in {path}')
    write(path, text[:start] + value + text[end:])


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
    """function noteSnapshotCliOperation(label, queuedAt, executionStartedAt, endedAt) {
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
}""",
    """function noteSnapshotCliOperation(label, queuedAt, executionStartedAt, endedAt, launcherMeta = null) {
  const attribution = currentSnapshotAttribution();
  if (!attribution || !Array.isArray(attribution.cliOperations)) return;
  if (attribution.cliOperations.length >= 8) return;
  const base = Number(attribution.startedAt || queuedAt || endedAt || Date.now());
  const queuedStart = Number(queuedAt || executionStartedAt || endedAt || base);
  const execStart = Number(executionStartedAt || queuedStart);
  const ended = Number(endedAt || execStart);
  const launcher = ['direct','npx-fallback'].includes(String(launcherMeta?.launcher))
    ? String(launcherMeta.launcher)
    : 'unknown';
  const fallbackReason = launcher === 'npx-fallback' && String(launcherMeta?.fallbackReason) === 'direct-enoent'
    ? 'direct-enoent'
    : 'none';
  attribution.cliOperations.push({
    label: String(label || 'cli'),
    launcher,
    fallbackReason,
    startOffsetMs: Math.max(0, queuedStart - base),
    executionStartOffsetMs: Math.max(0, execStart - base),
    endOffsetMs: Math.max(0, ended - base),
    queueWaitMs: Math.max(0, execStart - queuedStart),
    executionMs: Math.max(0, ended - execStart),
  });
}""",
    'bounded launcher metadata',
)
replace_once(engine, 'async function withCliSlot(label, task) {', 'async function withCliSlot(label, task, launcherMeta = null) {', 'CLI slot metadata parameter')
replace_once(
    engine,
    '      noteSnapshotCliOperation(label, queuedAt, executionStartedAt, endedAt);',
    '      noteSnapshotCliOperation(label, queuedAt, executionStartedAt, endedAt, launcherMeta);',
    'CLI operation metadata propagation',
)
replace_once(
    engine,
    """async function runCliProcess(args, extraEnv = {}) {
  return withCliSlot(cliOperationLabel(args, extraEnv), async () => {
    try {
      return await runProgram('llmgateway', args, extraEnv);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    return runProgram('npx', ['--yes', `@llmgateway/cli@${CLI_VERSION}`, ...args], extraEnv);
  });
}""",
    """async function runCliProcess(args, extraEnv = {}) {
  const launcherMeta = { launcher:'direct', fallbackReason:'none' };
  return withCliSlot(cliOperationLabel(args, extraEnv), async () => {
    try {
      return await runProgram('llmgateway', args, extraEnv);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      launcherMeta.launcher = 'npx-fallback';
      launcherMeta.fallbackReason = 'direct-enoent';
    }
    return runProgram('npx', ['--yes', `@llmgateway/cli@${CLI_VERSION}`, ...args], extraEnv);
  }, launcherMeta);
}""",
    'launcher measurement around existing fallback',
)

diagnostics = SRC / '40-diagnostics.part.js'
replace_once(
    diagnostics,
    """  function bridgeCliOperationsText(performance) {
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
  }""",
    """  function bridgeCliOperationsText(performance) {
    const operations = Array.isArray(performance?.cliOperations) ? performance.cliOperations.slice(0, 8) : [];
    if (!operations.length) return '—';
    return operations.map((item) => {
      const label = String(item?.label || 'cli');
      const launcher = ['direct','npx-fallback'].includes(String(item?.launcher)) ? String(item.launcher) : 'unknown';
      const start = Number.isFinite(Number(item?.startOffsetMs)) ? Math.round(Number(item.startOffsetMs)) : 0;
      const end = Number.isFinite(Number(item?.endOffsetMs)) ? Math.round(Number(item.endOffsetMs)) : start;
      const queue = Number.isFinite(Number(item?.queueWaitMs)) ? Math.round(Number(item.queueWaitMs)) : 0;
      const exec = Number.isFinite(Number(item?.executionMs)) ? Math.round(Number(item.executionMs)) : 0;
      return `${label} [${launcher}] ${start}→${end}ms · q${queue} · exec${exec}`;
    }).join(' · ');
  }

  function bridgeCliLauncherText(performance) {
    const operations = Array.isArray(performance?.cliOperations) ? performance.cliOperations.slice(0, 8) : [];
    if (!operations.length) return '—';
    const counts = { direct:0, npxFallback:0, unknown:0, directEnoent:0 };
    for (const item of operations) {
      const launcher = ['direct','npx-fallback'].includes(String(item?.launcher)) ? String(item.launcher) : 'unknown';
      if (launcher === 'direct') counts.direct += 1;
      else if (launcher === 'npx-fallback') counts.npxFallback += 1;
      else counts.unknown += 1;
      if (launcher === 'npx-fallback' && String(item?.fallbackReason) === 'direct-enoent') counts.directEnoent += 1;
    }
    return `direct ${counts.direct} · npx-fallback ${counts.npxFallback} · unknown ${counts.unknown} · direct ENOENT ${counts.directEnoent}`;
  }""",
    'launcher diagnostics',
)
replace_once(
    diagnostics,
    """      `Bridge snapshot timeline: ${bridgeSnapshotTimelineText(bridgeDiag.snapshotPerformance)}`,
      `Bridge CLI operations: ${bridgeCliOperationsText(bridgeDiag.snapshotPerformance)}`,
      `Bridge Credits early-start: ${bridgeCreditsEarlyStartText(bridgeDiag.snapshotPerformance)}`,""",
    """      `Bridge snapshot timeline: ${bridgeSnapshotTimelineText(bridgeDiag.snapshotPerformance)}`,
      `Bridge CLI operations: ${bridgeCliOperationsText(bridgeDiag.snapshotPerformance)}`,
      `Bridge CLI launcher: ${bridgeCliLauncherText(bridgeDiag.snapshotPerformance)}`,
      `Bridge Credits early-start: ${bridgeCreditsEarlyStartText(bridgeDiag.snapshotPerformance)}`,""",
    'launcher diagnostic line',
)

manager = RUNTIME / 'bridge-manager.cjs'
replace_once(manager, f"const PRODUCT_VERSION = '{OLD_VERSION}';", f"const PRODUCT_VERSION = '{NEW_VERSION}';", 'manager product version')
replace_once(manager, f"const BUNDLED_ENGINE_VERSION = '{OLD_ENGINE_VERSION}';", f"const BUNDLED_ENGINE_VERSION = '{NEW_ENGINE_VERSION}';", 'manager engine version')
new_engine_sha = sha256_file(engine)
replace_quoted_constant(manager, "const BUNDLED_ENGINE_SHA256 = '", new_engine_sha, 'manager engine sha')

manifest_path = RUNTIME / 'product-manifest.json'
manifest = json.loads(read(manifest_path))
manifest['productVersion'] = NEW_VERSION
manifest['components']['plugin']['version'] = NEW_VERSION
manifest['components']['bridge']['requiredVersion'] = NEW_ENGINE_VERSION
manifest['components']['bridge']['sha256'] = new_engine_sha
manifest['components']['bridgeManager']['version'] = MANAGER_VERSION
manifest['components']['bridgeManager']['productVersion'] = NEW_VERSION
manifest['components']['bridgeManager']['sha256'] = sha256_file(manager)
manifest['components']['bridgeManager']['bootstrapSha256'] = sha256_file(RUNTIME / 'bootstrap-bridge-manager.sh')
write(manifest_path, json.dumps(manifest, indent=2) + '\n')

guidelines = read(GUIDELINES)
start_marker = '## Current development memory\n'
end_marker = '## Long-term update roadmap\n'
if guidelines.count(start_marker) != 1 or guidelines.count(end_marker) != 1:
    raise SystemExit('guidelines memory/roadmap markers are invalid')
a = guidelines.index(start_marker)
b = guidelines.index(end_marker, a)
new_memory = """## Current development memory

Last verified real-device baseline: `3.0.0-alpha.5.63 — Long-window Critical Path Decoupling`.

Verified 5.63 foreground evidence:

- A full foreground sample ended at about 16.738s. Credits ran from 0→8.124s, 24h account capture from about 0.071→9.602s, and 24h usage from about 8.125→16.724s.
- Credits-to-usage handoff was about 1ms and post-CLI snapshot work was about 14ms, so the remaining 8–9.5s intervals are already inside existing CLI execution timing rather than obvious local scheduling or parsing delay.
- The launcher used by each `execFileAsync()` operation remained UNKNOWN because 5.63 did not distinguish direct `llmgateway` from the existing `npx` fallback.
- This evidence does not attribute any fixed portion of source latency to `npx`; it only justifies measuring the launcher branch.

Current release implementation: `3.0.0-alpha.5.64 — Foreground CLI Launcher Attribution`.

5.64 release contract:

- Product becomes `3.0.0-alpha.5.64`; Bridge Engine becomes `1.6.17`; Bridge Manager remains `1.2.6`; snapshot/recent-request contracts remain `1/1`.
- Preserve the existing direct `llmgateway` attempt and fall back to `npx --yes @llmgateway/cli@1.9.0` only when the direct attempt fails with `ENOENT`.
- Launcher attribution is measurement-only. It must not select, retry, reorder, cancel, or otherwise influence an execution path.
- Launcher vocabulary is bounded to `direct`, `npx-fallback`, and `unknown`; fallback reason is bounded to `direct-enoent` and `none`.
- CLI operation attribution remains capped at eight records and exposes no executable path, PATH, HOME, environment, CLI arguments, token, organization ID, payload, header, or arbitrary error.
- Keep all five existing `runCli()` call sites and the single existing `execFileAsync()` source operation. Add no subprocess, network request, endpoint, or source operation.
- No new `runCli()` call site, network endpoint, or CLI source operation is allowed.
- Keep 24h usage and DevPass Activity on the foreground truth path.
- Preserve the hard CLI concurrency cap and keep already-working behavior unchanged unless the release goal requires touching it.
- Diagnostics expose only sanitized family/scope/range for cache decisions and bounded launcher vocabulary for CLI operations.
- Keep UNKNOWN distinct from known zero.
- Preserve CLI concurrency 2, the `DEVPASS_BRIDGE_CLI_CONCURRENCY=1` rollback, 25-second timeout, 4MB buffer, Credits early-start, shared capture, all TTLs, 24h foreground truth, circuit/recovery, organization fallback, Request Ledger, Cache fidelity, updater, and the rule that UNKNOWN stays distinct from known zero.
- Preserve every 5.63 long-window rule: secondary concurrency 1, 32-key bound, same-key/inFlight deduplication, foreground hold, 30-minute stale ceiling, leaf-only 7d/30d deferral, cold-cache blocking, standalone endpoint blocking, and stale provenance.
- Keep the shared `repo-main-write` lock and monotonic candidate/main/release publisher guard.

5.64 device success evidence to collect:

- Stable Readiness remains READY with Engine `1.6.17`, Manager `1.2.6`, and no active local runtime error.
- Each bounded CLI timeline item displays exactly one launcher label: `direct`, `npx-fallback`, or `unknown`.
- `Bridge CLI launcher` totals match the displayed bounded operation set and expose only the bounded vocabulary.
- Snapshot duration remains in the normal 5.63 distribution; 5.64 makes no performance-improvement claim.
- If `npx-fallback` is observed, launcher use is VERIFIED but its share of the 8–9s latency remains UNKNOWN. If `direct` is observed, the npx-launcher hypothesis is rejected for that sample.

"""
write(GUIDELINES, guidelines[:a] + new_memory + guidelines[b:])
sync_guidelines_release_state()

print(f'prepared Local Usage Dashboard {NEW_VERSION} (engine {NEW_ENGINE_VERSION}, manager {MANAGER_VERSION}) Foreground CLI Launcher Attribution')
