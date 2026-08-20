from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')
OLD_VERSION = '3.0.0-alpha.5.56'
NEW_VERSION = '3.0.0-alpha.5.57'
OLD_ENGINE_VERSION = '1.6.10'
NEW_ENGINE_VERSION = '1.6.11'
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


# 5.57 keeps the verified two-lane limiter unchanged and removes one duplicate
# organization CLI launch from the normal snapshot path. Account capture already
# executes the official orgs command and safely records its /orgs response, so
# organization normalization and DevPass status can share that same capture.
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

# Keep organization discovery provenance inside the existing per-snapshot
# attribution object so cache hits can still report the path used to build the
# cached org payload without adding another network or CLI call.
replace_once(
    engine,
    """    tasks: Object.create(null),
    cache: { hits:0, misses:0, joins:0, loads:0, errors:0, staleFallbacks:0 },""",
    """    tasks: Object.create(null),
    organizationDiscovery: null,
    cache: { hits:0, misses:0, joins:0, loads:0, errors:0, staleFallbacks:0 },""",
    'organization discovery attribution storage',
)
replace_once(
    engine,
    """    tasks: {...tasks},
    cache: {...(attribution?.cache || {})},""",
    """    tasks: {...tasks},
    organizationDiscovery: attribution?.organizationDiscovery && typeof attribution.organizationDiscovery === 'object'
      ? {...attribution.organizationDiscovery}
      : null,
    cache: {...(attribution?.cache || {})},""",
    'organization discovery attribution summary',
)

engine_text = read(engine)
org_start = engine_text.find('async function loadOrgs() {')
org_end = engine_text.find('\nfunction usageOrganizations', org_start)
if org_start < 0 or org_end <= org_start:
    raise SystemExit('loadOrgs block markers missing')
old_org_block = engine_text[org_start:org_end]
for marker in [
    "runCli(['orgs', 'list', '--json'])",
    "runCli(['credits', '--json'])",
    'loadAccountCapture()',
    'normalizeOrganizations',
]:
    if marker not in old_org_block:
        raise SystemExit(f'loadOrgs prerequisite missing: {marker}')

new_org_block = """async function loadOrgs() {
  const value = await cached('orgs', async () => {
    // Account capture already runs the official `orgs list --json` command and
    // safely records the successful /orgs response. Start that capture beside
    // Credits so the normal path does not launch the same org command twice.
    // Capture failure is converted to a result object only so the legacy plain
    // orgs command can remain the fallback. Credits retains its existing hard
    // failure semantics.
    const capturePromise = loadAccountCapture()
      .then((captured) => ({ captured, error: null }))
      .catch((error) => ({ captured: null, error }));
    const [captureResult, rawCredits] = await Promise.all([
      capturePromise,
      runCli(['credits', '--json']),
    ]);

    const captured = captureResult.captured;
    const capturedRawOrgs = captured?.orgs ?? captured;
    let organizations = normalizeOrganizations(capturedRawOrgs, rawCredits);
    let source = 'LLMGateway CLI session · captured /orgs + Credits CLI';
    let discoveryMode = 'capture-primary';
    let fallbackCount = 0;

    if (!organizations.length) {
      fallbackCount = 1;
      discoveryMode = 'plain-orgs-fallback';
      const rawOrgs = await runCli(['orgs', 'list', '--json']);
      organizations = normalizeOrganizations(rawOrgs, rawCredits);
      source = 'LLMGateway CLI';
    }

    if (captured?.devPlanStatus) {
      organizations = enrichDevPassFromStatus(organizations, captured.devPlanStatus);
      if (hasDevPassCycleDetails(organizations)) {
        source = 'LLMGateway CLI session · /dev-plans/status';
      }
    }

    return {
      organizations,
      fetchedAt: Date.now(),
      source,
      organizationDiscovery: {
        mode: discoveryMode,
        fallbackCount,
        sharedAccountCapture: Boolean(captured),
        captureErrorCode: captureResult.error ? classifyError(captureResult.error) : null,
      },
    };
  });

  const attribution = currentSnapshotAttribution();
  if (attribution && value?.organizationDiscovery) {
    attribution.organizationDiscovery = { ...value.organizationDiscovery };
  }
  return value;
}
"""
write(engine, engine_text[:org_start] + new_org_block + engine_text[org_end:])

# Diagnostics expose only the safe discovery mode/counters. No raw org IDs,
# command arguments, response bodies, headers, tokens, or capture paths are added.
diag = SRC / '40-diagnostics.part.js'
replace_once(
    diag,
    """  function bridgeSnapshotCounterText(value, keys) {
    if (!value || typeof value !== 'object') return '—';
    return keys.map(([key,label]) => `${label} ${Number(value[key] || 0)}`).join(' · ');
  }

  function stableReadinessSnapshot(bridgeDiag, runtimeBridge) {""",
    """  function bridgeSnapshotCounterText(value, keys) {
    if (!value || typeof value !== 'object') return '—';
    return keys.map(([key,label]) => `${label} ${Number(value[key] || 0)}`).join(' · ');
  }

  function bridgeOrganizationDiscoveryText(performance) {
    const discovery = performance?.organizationDiscovery && typeof performance.organizationDiscovery === 'object'
      ? performance.organizationDiscovery
      : null;
    if (!discovery) return '—';
    return `${discovery.mode || 'unknown'} · fallback ${Number(discovery.fallbackCount || 0)} · shared account capture ${discovery.sharedAccountCapture ? 'yes' : 'no'}`;
  }

  function stableReadinessSnapshot(bridgeDiag, runtimeBridge) {""",
    'organization discovery diagnostic helper',
)
replace_once(
    diag,
    """      `Bridge module duration: ${bridgeModuleDurationText(bridgeDiag.moduleDetails)}`,
      `Bridge snapshot attribution: ${bridgeDiag.snapshotPerformance ? `total ${snapshotPerformanceMs(bridgeDiag.snapshotPerformance.totalMs)} · critical ${bridgeDiag.snapshotPerformance.criticalPath || '—'} ${snapshotPerformanceMs(bridgeDiag.snapshotPerformance.criticalPathMs)} · slowest ${bridgeDiag.snapshotPerformance.slowestTask || '—'} ${snapshotPerformanceMs(bridgeDiag.snapshotPerformance.slowestTaskMs)}` : '—'}`,""",
    """      `Bridge module duration: ${bridgeModuleDurationText(bridgeDiag.moduleDetails)}`,
      `Bridge organization discovery: ${bridgeOrganizationDiscoveryText(bridgeDiag.snapshotPerformance)}`,
      `Bridge snapshot attribution: ${bridgeDiag.snapshotPerformance ? `total ${snapshotPerformanceMs(bridgeDiag.snapshotPerformance.totalMs)} · critical ${bridgeDiag.snapshotPerformance.criticalPath || '—'} ${snapshotPerformanceMs(bridgeDiag.snapshotPerformance.criticalPathMs)} · slowest ${bridgeDiag.snapshotPerformance.slowestTask || '—'} ${snapshotPerformanceMs(bridgeDiag.snapshotPerformance.slowestTaskMs)}` : '—'}`,""",
    'organization discovery diagnostic line',
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

# Durable project memory: preserve the evidence that justified the repair and
# explicitly keep older recovery/cache truths that later regressions rely on.
guidelines = read(GUIDELINES)
start_marker = '## Current development memory\n'
end_marker = '## 0. Source of truth\n'
if guidelines.count(start_marker) != 1 or guidelines.count(end_marker) != 1:
    raise SystemExit('guidelines development-memory section markers are invalid')
a = guidelines.index(start_marker)
b = guidelines.index(end_marker, a)
new_memory = """## Current development memory

Last verified real-device baseline: `3.0.0-alpha.5.56 — Snapshot Performance Repair: Bounded CLI Parallelism`.

Verified from the 5.56 device diagnostic:

- Stable Readiness was `READY`; Bridge Engine `1.6.10` and Bridge Manager `1.2.6` were healthy, with no local runtime errors or failures.
- The two-lane limiter was actually active on-device: `limit 2 · peak active 2`.
- CLI queueing fell from the verified 5.55 baseline of 3 queued runs / about 8.0s average wait / about 12.7s maximum wait to `queued 0` in the sampled 5.56 snapshot.
- Bridge snapshot wall time fell from about 35.58s in the 5.55 attribution baseline to about 13.49s in 5.56, an improvement of roughly 62% for the sampled snapshot.
- Timer refresh was about 15.45s total and the sampled visibility refresh was about 24.76s; rendering remained tiny relative to data refresh.
- The new critical root was organization discovery at about 8.83s, followed by usage/analytics scope work at about 4.65s.
- Snapshot cache errors/stale fallbacks and circuit opens/blocks/recoveries were all 0 in the sampled 5.56 snapshot.
- Runtime Recovery Fidelity remained verified: cumulative local persist history remained visible while `active 0` allowed `READY`.
- Cache fidelity remained verified: provider Cache Read stayed observable while missing Write/TTL remained UNKNOWN and was never inferred.
- Next candidate after the 5.55 real-device diagnostic: `3.0.0-alpha.5.56 — Snapshot Performance Repair`.

Current release implementation: `3.0.0-alpha.5.57 — Organization Discovery Deduplication`.

5.57 release contract:

- Bridge Engine becomes `1.6.11`; Bridge Manager remains `1.2.6`.
- Keep the verified bounded CLI concurrency default and hard maximum at `2`; `DEVPASS_BRIDGE_CLI_CONCURRENCY=1` restores the previous serial execution mode.
- In the normal organization-discovery path, run the existing account capture beside Credits and reuse the safely captured `/orgs` response instead of launching a separate plain `orgs list` first.
- If account capture fails or does not contain usable organization rows, fall back to the prior plain `orgs list --json` path.
- Preserve the existing hard failure semantics for Credits; this release does not broaden partial-success behavior.
- Reuse the same cached account capture for DevPass status so organization normalization and account/status enrichment share one authenticated CLI session result when available.
- Keep all 5.55/5.56 attribution telemetry and add only safe organization-discovery provenance: mode, fallback count, and whether account capture was shared.
- Keep CLI timeout, cache TTLs, stale-cache/circuit behavior, snapshot payload semantics, parser `provider-usage-v3`, Runtime Recovery Fidelity, updater flow, and unknown-value semantics unchanged.
- Do not overlap the snapshot root dependency or optimize manager probe in this release.

Next step after the 5.57 real-device diagnostic: compare organization duration, CLI run count, snapshot wall time, discovery mode/fallback, and queue/peak-active against the verified 5.56 baseline before choosing any root-overlap repair.

"""
write(GUIDELINES, guidelines[:a] + new_memory + guidelines[b:])
sync_guidelines_release_state()

print(
    f'prepared Local Usage Dashboard {NEW_VERSION} '
    f'(engine {NEW_ENGINE_VERSION}, manager {MANAGER_VERSION}) with organization discovery deduplication'
)
