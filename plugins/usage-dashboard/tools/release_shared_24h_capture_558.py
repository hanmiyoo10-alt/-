from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')
OLD_VERSION = '3.0.0-alpha.5.57'
NEW_VERSION = '3.0.0-alpha.5.58'
OLD_ENGINE_VERSION = '1.6.11'
NEW_ENGINE_VERSION = '1.6.12'
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


# 5.58 keeps the verified two-lane limiter and 5.57 organization discovery
# behavior intact. It coalesces the account bootstrap and DevPass 24h activity
# capture into the same authenticated CLI session, with the previous dedicated
# 24h capture retained only as an evidence-preserving fallback.
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
    """    organizationDiscovery: null,
    cache: { hits:0, misses:0, joins:0, loads:0, errors:0, staleFallbacks:0 },""",
    """    organizationDiscovery: null,
    captureReuse: { bootstrapRange:'24h', activityReuseChecks:0, activityShared:0, dedicated24hFallbacks:0 },
    cache: { hits:0, misses:0, joins:0, loads:0, errors:0, staleFallbacks:0 },""",
    'capture reuse attribution storage',
)
replace_once(
    engine,
    """    organizationDiscovery: attribution?.organizationDiscovery && typeof attribution.organizationDiscovery === 'object'
      ? {...attribution.organizationDiscovery}
      : null,
    cache: {...(attribution?.cache || {})},""",
    """    organizationDiscovery: attribution?.organizationDiscovery && typeof attribution.organizationDiscovery === 'object'
      ? {...attribution.organizationDiscovery}
      : null,
    captureReuse: attribution?.captureReuse && typeof attribution.captureReuse === 'object'
      ? {...attribution.captureReuse}
      : null,
    cache: {...(attribution?.cache || {})},""",
    'capture reuse attribution summary',
)

replace_once(
    engine,
    """async function loadAccountCapture() {
  return cached('accountCapture', async () => captureAccountDetailsViaCliSession());
}""",
    """async function loadAccountCapture() {
  // The official orgs session can safely collect status plus 24h activity/logs
  // through the existing capture tap. Keeping the same accountCapture cache key
  // preserves its 30s TTL, no-stale fallback policy, and circuit semantics.
  return cached('accountCapture', async () => captureAccountDetailsViaCliSession('24h'));
}""",
    'shared 24h account capture',
)

engine_text = read(engine)
activity_start = engine_text.find("async function devPassActivityForRange(range = '24h') {")
activity_end = engine_text.find('\nfunction legacyDevPassUsageOrganization', activity_start)
if activity_start < 0 or activity_end <= activity_start:
    raise SystemExit('devPassActivityForRange block markers missing')
old_activity_block = engine_text[activity_start:activity_end]
for marker in [
    "cached(`devpassActivity:${range}`",
    'captureAccountDetailsViaCliSession(range)',
    'officialActivityRows(rawActivity)',
    'normalizeCapturedRecentLogs',
]:
    if marker not in old_activity_block:
        raise SystemExit(f'devPassActivityForRange prerequisite missing: {marker}')

new_activity_block = """async function devPassActivityForRange(range = '24h') {
  const normalizedRange = ['24h','7d','30d'].includes(String(range)) ? String(range) : '24h';
  return cached(`devpassActivity:${normalizedRange}`, async () => {
    let captured = null;
    const attribution = currentSnapshotAttribution();

    if (normalizedRange === '24h') {
      if (attribution?.captureReuse) attribution.captureReuse.activityReuseChecks += 1;
      try {
        captured = await loadAccountCapture();
      } catch {}
      const sharedEntry = captured?.devpassActivity;
      const sharedRawActivity = sharedEntry?.payload ?? sharedEntry;
      const sharedUsable = Boolean(sharedRawActivity && officialActivityRows(sharedRawActivity).length);
      if (sharedUsable) {
        if (attribution?.captureReuse) attribution.captureReuse.activityShared += 1;
      } else {
        if (attribution?.captureReuse) attribution.captureReuse.dedicated24hFallbacks += 1;
        captured = await captureAccountDetailsViaCliSession('24h');
      }
    } else {
      captured = await captureAccountDetailsViaCliSession(normalizedRange);
    }

    const status = normalizeIndependentDevPassStatus(captured?.devPlanStatus ?? null);
    const entry = captured?.devpassActivity;
    const rawActivity = entry?.payload ?? entry;
    if (!rawActivity || !officialActivityRows(rawActivity).length) {
      if (!status?.projectId) throw new Error('DevPass projectId unavailable from /dev-plans/status');
      throw new Error(`DevPass /activity ${normalizedRange} unavailable for the authenticated project`);
    }
    const org = {
      id: status?.organizationId || null,
      name: `DevPass ${String(status?.plan || '').toUpperCase()}`.trim(),
      kind: 'devpass',
      projectId: status?.projectId || null,
    };
    const normalized = normalizeUsageActivity(rawActivity, org, normalizedRange);
    const exactRecent = normalizedRange === '24h' ? normalizeCapturedRecentLogs(captured?.devpassLogs) : [];
    if (exactRecent.length) normalized.recentRequests = exactRecent;
    normalized.usageScope = 'devpass';
    normalized.source = exactRecent.length
      ? `LLMGateway authenticated session · /activity + /logs · DevPass project · ${normalizedRange}`
      : `LLMGateway authenticated session · /activity · DevPass project · ${normalizedRange}`;
    return normalized;
  });
}
"""
write(engine, engine_text[:activity_start] + new_activity_block + engine_text[activity_end:])

# Diagnostics expose only safe booleans/counters from the isolated snapshot
# context; no raw capture path, org identifier, token, header, or payload is added.
diag = SRC / '40-diagnostics.part.js'
replace_once(
    diag,
    """  function bridgeOrganizationDiscoveryText(performance) {
    const discovery = performance?.organizationDiscovery && typeof performance.organizationDiscovery === 'object'
      ? performance.organizationDiscovery
      : null;
    if (!discovery) return '—';
    return `${discovery.mode || 'unknown'} · fallback ${Number(discovery.fallbackCount || 0)} · shared account capture ${discovery.sharedAccountCapture ? 'yes' : 'no'}`;
  }

  function stableReadinessSnapshot(bridgeDiag, runtimeBridge) {""",
    """  function bridgeOrganizationDiscoveryText(performance) {
    const discovery = performance?.organizationDiscovery && typeof performance.organizationDiscovery === 'object'
      ? performance.organizationDiscovery
      : null;
    if (!discovery) return '—';
    return `${discovery.mode || 'unknown'} · fallback ${Number(discovery.fallbackCount || 0)} · shared account capture ${discovery.sharedAccountCapture ? 'yes' : 'no'}`;
  }

  function bridgeCaptureReuseText(performance) {
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
    'capture reuse diagnostic helper',
)
replace_once(
    diag,
    """      `Bridge organization discovery: ${bridgeOrganizationDiscoveryText(bridgeDiag.snapshotPerformance)}`,
      `Bridge snapshot attribution: ${bridgeDiag.snapshotPerformance ? `total ${snapshotPerformanceMs(bridgeDiag.snapshotPerformance.totalMs)} · critical ${bridgeDiag.snapshotPerformance.criticalPath || '—'} ${snapshotPerformanceMs(bridgeDiag.snapshotPerformance.criticalPathMs)} · slowest ${bridgeDiag.snapshotPerformance.slowestTask || '—'} ${snapshotPerformanceMs(bridgeDiag.snapshotPerformance.slowestTaskMs)}` : '—'}`,""",
    """      `Bridge organization discovery: ${bridgeOrganizationDiscoveryText(bridgeDiag.snapshotPerformance)}`,
      `Bridge 24h capture reuse: ${bridgeCaptureReuseText(bridgeDiag.snapshotPerformance)}`,
      `Bridge snapshot attribution: ${bridgeDiag.snapshotPerformance ? `total ${snapshotPerformanceMs(bridgeDiag.snapshotPerformance.totalMs)} · critical ${bridgeDiag.snapshotPerformance.criticalPath || '—'} ${snapshotPerformanceMs(bridgeDiag.snapshotPerformance.criticalPathMs)} · slowest ${bridgeDiag.snapshotPerformance.slowestTask || '—'} ${snapshotPerformanceMs(bridgeDiag.snapshotPerformance.slowestTaskMs)}` : '—'}`,""",
    'capture reuse diagnostic line',
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

# Durable memory records the 5.57 device evidence that justified this one-call
# repair and preserves the older recovery/cache/rollback truths verbatim.
guidelines = read(GUIDELINES)
start_marker = '## Current development memory\n'
end_marker = '## 0. Source of truth\n'
if guidelines.count(start_marker) != 1 or guidelines.count(end_marker) != 1:
    raise SystemExit('guidelines development-memory section markers are invalid')
a = guidelines.index(start_marker)
b = guidelines.index(end_marker, a)
new_memory = """## Current development memory

Last verified real-device baseline: `3.0.0-alpha.5.57 — Organization Discovery Deduplication`.

Verified from the 5.57 device diagnostic:

- Stable Readiness was `READY`; Bridge Engine `1.6.11` and Bridge Manager `1.2.6` were healthy with no local runtime errors or failures.
- Organization deduplication was active on-device: `capture-primary · fallback 0 · shared account capture yes`.
- Organization discovery fell from about 8.83s in the verified 5.56 sample to about 6.03s in 5.57, so the deduplication itself was effective.
- The sampled Bridge snapshot nevertheless rose from about 13.49s in 5.56 to about 17.87s in 5.57 because the critical path moved to analytics.
- `analyticsScopes` was about 11.84s and the slowest detailed task was `analytics.devpass.7d` at about 11.84s.
- The Bridge ran 5 CLI operations; one queued for about 5.87s while average execution was about 6.02s. The slowest operation was `devpass-capture-7d` at about 11.76s total.
- CLI concurrency stayed verified at `limit 2 · peak active 2`; snapshot cache errors/stale fallbacks and circuit opens/blocks/recoveries were all 0 in the sampled snapshot.
- Runtime Recovery Fidelity remained verified: cumulative local persist history remained visible while `active 0` allowed `READY`.
- Cache fidelity remained verified: provider Cache Read stayed observable while missing Write/TTL remained UNKNOWN and was never inferred.
- Next candidate after the 5.55 real-device diagnostic: `3.0.0-alpha.5.56 — Snapshot Performance Repair`.

Current release implementation: `3.0.0-alpha.5.58 — Shared 24h Capture Coalescing`.

5.58 release contract:

- Bridge Engine becomes `1.6.12`; Bridge Manager remains `1.2.6`.
- Keep the verified bounded CLI concurrency default and hard maximum at `2`; `DEVPASS_BRIDGE_CLI_CONCURRENCY=1` restores the previous serial execution mode.
- Keep the existing `accountCapture` cache key, 30s TTL, no-stale behavior, and circuit semantics, but let its authenticated orgs session also collect the official 24h DevPass activity/logs already supported by the capture tap.
- Reuse that same 24h account capture for organization discovery, DevPass status, and `devPassActivityForRange('24h')` when usable, eliminating the normal duplicate dedicated 24h capture.
- If the shared capture has no usable 24h activity, run the previous dedicated 24h capture once as fallback; if the source still lacks activity, preserve the prior error instead of fabricating an empty or zero result.
- Keep 7d and 30d capture behavior independent and unchanged.
- Preserve the 5.57 organization fallback: if account capture fails or lacks usable rows, fall back to the prior plain `orgs list --json` path.
- Preserve the 5.57 empty result contract: `No organizations found in CLI output` remains an error after capture and plain fallback are both exhausted.
- Keep CLI timeout, cache TTLs, stale-cache/circuit behavior, snapshot root ordering, payload semantics, parser `provider-usage-v3`, Runtime Recovery Fidelity, updater flow, and unknown-value semantics unchanged.
- Add only isolated safe capture-reuse diagnostics: bootstrap range, whether 24h activity reuse was exercised successfully, and dedicated 24h fallback count.

Next step after the 5.58 real-device diagnostic: compare CLI run count, queue wait, 24h reuse/fallback, analytics duration, and snapshot wall time against the verified 5.57 baseline before considering any snapshot-root overlap change.

"""
write(GUIDELINES, guidelines[:a] + new_memory + guidelines[b:])
sync_guidelines_release_state()

print(
    f'prepared Local Usage Dashboard {NEW_VERSION} '
    f'(engine {NEW_ENGINE_VERSION}, manager {MANAGER_VERSION}) with shared 24h capture coalescing'
)
