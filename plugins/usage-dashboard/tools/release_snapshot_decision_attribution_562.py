from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')
OLD_VERSION = '3.0.0-alpha.5.61'
NEW_VERSION = '3.0.0-alpha.5.62'
OLD_ENGINE_VERSION = '1.6.14'
NEW_ENGINE_VERSION = '1.6.15'
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


# Product/plugin metadata and required bundled engine.
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

# Snapshot-local decision attribution. Keep only sanitized family/scope/range
# metadata; raw cache keys can contain organization identifiers and must never be
# returned in diagnostics. The event list is bounded and adds no source/CLI work.
replace_once(
    engine,
    """    organizationDiscovery: null,
    captureReuse: { bootstrapRange:'24h', activityReuseChecks:0, activityShared:0, dedicated24hFallbacks:0 },
    cache: { hits:0, misses:0, joins:0, loads:0, errors:0, staleFallbacks:0 },""",
    """    organizationDiscovery: null,
    captureReuse: { bootstrapRange:'24h', activityReuseChecks:0, activityShared:0, dedicated24hFallbacks:0 },
    creditsEarlyStart: { decision:'not-evaluated', reason:'', candidateMode:'', result:'none' },
    cacheDecisions: [],
    cache: { hits:0, misses:0, joins:0, loads:0, errors:0, staleFallbacks:0 },""",
    'snapshot decision state',
)

marker = "async function timedSnapshotTask(name, task) {\n"
engine_text = read(engine)
if engine_text.count(marker) != 1:
    raise SystemExit('snapshot attribution helper insertion marker missing')
helpers = r"""function snapshotCacheDescriptor(name) {
  const key = String(name || '');
  if (key === 'orgs') return { family:'organizations', scope:'', range:'' };
  if (key === 'accountCapture') return { family:'accountCapture', scope:'', range:'24h' };
  if (key === 'creditsBootstrap') return { family:'creditsBootstrap', scope:'credits', range:'' };
  if (key === 'devpassStatus') return { family:'devpassStatus', scope:'devpass', range:'' };
  if (key === 'usageScopes') return { family:'usageScopes', scope:'all', range:'24h' };
  if (key === 'analyticsScopes') return { family:'analyticsScopes', scope:'all', range:'' };
  if (key.startsWith('usageScopes:')) return { family:'usageScopes', scope:'all', range:'24h' };
  if (key.startsWith('analyticsScopes:')) return { family:'analyticsScopes', scope:'all', range:'' };
  if (key.startsWith('usage:')) {
    const parts = key.split(':');
    const range = ['24h','7d','30d'].includes(parts.at(-1)) ? parts.at(-1) : '';
    return { family:'usage', scope:'credits', range };
  }
  if (key.startsWith('devpassActivity:')) {
    const parts = key.split(':');
    const range = ['24h','7d','30d'].includes(parts.at(-1)) ? parts.at(-1) : '';
    return { family:'devpassActivity', scope:'devpass', range };
  }
  if (key.startsWith('activity:')) {
    const parts = key.split(':');
    const scope = ['all','devpass','credits'].includes(parts[1]) ? parts[1] : '';
    const range = ['24h','7d','30d'].includes(parts.at(-1)) ? parts.at(-1) : '';
    return { family:'activity', scope, range };
  }
  if (key.startsWith('analytics:')) {
    const parts = key.split(':');
    const scope = ['all','devpass','credits'].includes(parts[1]) ? parts[1] : '';
    return { family:'analytics', scope, range:'' };
  }
  if (key.startsWith('runway:')) return { family:'runway', scope:'credits', range:'7d' };
  return { family:'other', scope:'', range:'' };
}

function noteSnapshotCacheDecision(name, action, current = null, ttl = null, now = Date.now(), reason = '') {
  const attribution = currentSnapshotAttribution();
  if (!attribution || !Array.isArray(attribution.cacheDecisions) || attribution.cacheDecisions.length >= 64) return;
  const descriptor = snapshotCacheDescriptor(name);
  const at = Number(current?.at);
  const ageMs = Number.isFinite(at) && at > 0 ? Math.max(0, Number(now) - at) : null;
  const ttlMs = Number.isFinite(Number(ttl)) ? Math.max(0, Number(ttl)) : null;
  const safeAction = ['hit','miss','join','load','stale','blocked','error'].includes(String(action)) ? String(action) : 'other';
  const safeReason = ['empty','expired','loaded','circuit-open','refresh-error'].includes(String(reason)) ? String(reason) : '';
  attribution.cacheDecisions.push({ ...descriptor, action:safeAction, reason:safeReason, ageMs, ttlMs });
}

function noteCreditsEarlyStart(patch) {
  const attribution = currentSnapshotAttribution();
  if (!attribution?.creditsEarlyStart || !patch || typeof patch !== 'object') return;
  Object.assign(attribution.creditsEarlyStart, patch);
}

"""
write(engine, engine_text.replace(marker, helpers + marker, 1))

replace_once(
    engine,
    """    captureReuse: attribution?.captureReuse && typeof attribution.captureReuse === 'object'
      ? {...attribution.captureReuse}
      : null,
    cache: {...(attribution?.cache || {})},""",
    """    captureReuse: attribution?.captureReuse && typeof attribution.captureReuse === 'object'
      ? {...attribution.captureReuse}
      : null,
    creditsEarlyStart: attribution?.creditsEarlyStart && typeof attribution.creditsEarlyStart === 'object'
      ? {...attribution.creditsEarlyStart}
      : null,
    cacheDecisions: Array.isArray(attribution?.cacheDecisions)
      ? attribution.cacheDecisions.slice(0, 64).map((item) => ({...item}))
      : [],
    cache: {...(attribution?.cache || {})},""",
    'snapshot decision summary',
)

# Attribute cache decisions without changing TTLs, stale/circuit behavior, or
# any source load. Hits/joins/misses/loads and stale/error outcomes are observed
# at the existing branches only.
replace_once(
    engine,
    """  const current = cache.get(name);
  if (current && now - current.at < ttl) {
    cacheStats.hits += 1;""",
    """  const current = cache.get(name);
  if (current && now - current.at < ttl) {
    noteSnapshotCacheDecision(name, 'hit', current, ttl, now);
    cacheStats.hits += 1;""",
    'cache hit attribution',
)
replace_once(
    engine,
    """  if (inFlight.has(name)) {
    cacheStats.joins += 1;""",
    """  if (inFlight.has(name)) {
    noteSnapshotCacheDecision(name, 'join', current, ttl, now);
    cacheStats.joins += 1;""",
    'cache join attribution',
)
replace_once(
    engine,
    """    if (current && name !== 'accountCapture' && name !== 'creditsBootstrap' && ageMs <= CACHE_STALE_MAX_MS) {
      cacheStats.staleFallbacks += 1;
      noteSnapshotCounter('cache', 'staleFallbacks');
      return staleClone(current.value, ageMs, gate.error);
    }
    throw gate.error;
  }

  cacheStats.misses += 1;
  noteSnapshotCounter('cache', 'misses');""",
    """    if (current && name !== 'accountCapture' && name !== 'creditsBootstrap' && ageMs <= CACHE_STALE_MAX_MS) {
      noteSnapshotCacheDecision(name, 'stale', current, ttl, now, 'circuit-open');
      cacheStats.staleFallbacks += 1;
      noteSnapshotCounter('cache', 'staleFallbacks');
      return staleClone(current.value, ageMs, gate.error);
    }
    noteSnapshotCacheDecision(name, 'blocked', current, ttl, now, 'circuit-open');
    throw gate.error;
  }

  noteSnapshotCacheDecision(name, 'miss', current, ttl, now, current ? 'expired' : 'empty');
  cacheStats.misses += 1;
  noteSnapshotCounter('cache', 'misses');""",
    'cache miss and circuit attribution',
)
replace_once(
    engine,
    """      cache.set(name, { at: Date.now(), value });
      circuitSuccess(name);""",
    """      cache.set(name, { at: Date.now(), value });
      noteSnapshotCacheDecision(name, 'load', null, ttl, Date.now(), 'loaded');
      circuitSuccess(name);""",
    'cache load attribution',
)
replace_once(
    engine,
    """      if (allowStale && current && ageMs <= CACHE_STALE_MAX_MS) {
        cacheStats.staleFallbacks += 1;
      noteSnapshotCounter('cache', 'staleFallbacks');
        logRateLimited('warn', `stale:${name}`, `${name} refresh failed; serving last good cache (${Math.round(ageMs / 1000)}s old): ${safeMessage(error)}`);
        return staleClone(current.value, ageMs, error);
      }
      if (circuit.state === 'open') {""",
    """      if (allowStale && current && ageMs <= CACHE_STALE_MAX_MS) {
        noteSnapshotCacheDecision(name, 'stale', current, ttl, Date.now(), 'refresh-error');
        cacheStats.staleFallbacks += 1;
      noteSnapshotCounter('cache', 'staleFallbacks');
        logRateLimited('warn', `stale:${name}`, `${name} refresh failed; serving last good cache (${Math.round(ageMs / 1000)}s old): ${safeMessage(error)}`);
        return staleClone(current.value, ageMs, error);
      }
      noteSnapshotCacheDecision(name, 'error', current, ttl, Date.now(), 'refresh-error');
      if (circuit.state === 'open') {""",
    'cache refresh error attribution',
)

# Make the existing conservative 5.61 early-start decision observable. Do not
# await it, change selection, or alter the prefetch call itself.
replace_once(
    engine,
    """function startCreditsUsageEarly(rawCreditsPromise, requestedOrgId = '') {
  if (CLI_CONCURRENCY < 2) return Promise.resolve(null);
  return Promise.resolve(rawCreditsPromise)
    .then((rawCredits) => {
      const candidate = creditsBootstrapCandidate(rawCredits, requestedOrgId);
      if (!candidate) return null;
      return usageForOrg({ id: candidate.id, kind: 'default', status: 'active' }, '24h')
        .then(() => candidate.id)
        .catch(() => null);
    })
    .catch(() => null);
}""",
    """function startCreditsUsageEarly(rawCreditsPromise, requestedOrgId = '') {
  if (CLI_CONCURRENCY < 2) {
    noteCreditsEarlyStart({ decision:'skipped', reason:'serial-mode', candidateMode:'', result:'none' });
    return Promise.resolve(null);
  }
  return Promise.resolve(rawCreditsPromise)
    .then((rawCredits) => {
      const candidate = creditsBootstrapCandidate(rawCredits, requestedOrgId);
      if (!candidate) {
        noteCreditsEarlyStart({ decision:'skipped', reason:'no-safe-candidate', candidateMode:'', result:'none' });
        return null;
      }
      noteCreditsEarlyStart({ decision:'started', reason:'', candidateMode:candidate.mode, result:'in-flight' });
      return usageForOrg({ id: candidate.id, kind: 'default', status: 'active' }, '24h')
        .then(() => {
          noteCreditsEarlyStart({ result:'completed' });
          return candidate.id;
        })
        .catch(() => {
          noteCreditsEarlyStart({ reason:'prefetch-error', result:'failed' });
          return null;
        });
    })
    .catch(() => {
      noteCreditsEarlyStart({ decision:'skipped', reason:'bootstrap-error', candidateMode:'', result:'failed' });
      return null;
    });
}""",
    'credits early-start decision attribution',
)

# Diagnostics presentation consumes only the sanitized summary fields above.
diagnostics = SRC / '40-diagnostics.part.js'
diagnostics_text = read(diagnostics)
diag_marker = "  function stableReadinessSnapshot(bridgeDiag, runtimeBridge) {\n"
if diagnostics_text.count(diag_marker) != 1:
    raise SystemExit('diagnostics helper insertion marker missing')
diag_helpers = r"""  function bridgeCreditsEarlyStartText(performance) {
    const early = performance?.creditsEarlyStart && typeof performance.creditsEarlyStart === 'object'
      ? performance.creditsEarlyStart
      : null;
    if (!early) return '—';
    const decision = ['started','skipped','not-evaluated'].includes(String(early.decision)) ? String(early.decision) : 'unknown';
    const mode = ['requested-exact','single-credit-id'].includes(String(early.candidateMode)) ? String(early.candidateMode) : '—';
    const reason = ['serial-mode','no-safe-candidate','prefetch-error','bootstrap-error'].includes(String(early.reason)) ? String(early.reason) : 'none';
    const result = ['none','in-flight','completed','failed'].includes(String(early.result)) ? String(early.result) : 'unknown';
    return `decision ${decision} · candidate ${mode} · result ${result} · reason ${reason}`;
  }

  function bridgeSnapshotCacheDecisionsText(performance) {
    const events = Array.isArray(performance?.cacheDecisions) ? performance.cacheDecisions.slice(0, 64) : [];
    if (!events.length) return '—';
    const groups = new Map();
    for (const item of events) {
      const family = ['organizations','accountCapture','creditsBootstrap','devpassStatus','usageScopes','analyticsScopes','usage','devpassActivity','activity','analytics','runway','other'].includes(String(item?.family))
        ? String(item.family)
        : 'other';
      const scope = ['all','devpass','credits'].includes(String(item?.scope)) ? String(item.scope) : '';
      const range = ['24h','7d','30d'].includes(String(item?.range)) ? String(item.range) : '';
      const key = [family, scope, range].filter(Boolean).join('/');
      if (!groups.has(key)) groups.set(key, { family, scope, range, actions:[], ageMs:null, ttlMs:null });
      const group = groups.get(key);
      const action = ['hit','miss','join','load','stale','blocked','error'].includes(String(item?.action)) ? String(item.action) : 'other';
      const reason = ['empty','expired','circuit-open','refresh-error'].includes(String(item?.reason)) ? String(item.reason) : '';
      const actionText = reason ? `${action}(${reason})` : action;
      if (group.actions.at(-1) !== actionText) group.actions.push(actionText);
      if (Number.isFinite(Number(item?.ageMs))) group.ageMs = Math.max(0, Number(item.ageMs));
      if (Number.isFinite(Number(item?.ttlMs))) group.ttlMs = Math.max(0, Number(item.ttlMs));
    }
    const rows = [...groups.values()]
      .sort((a,b) => {
        const aLong = ['7d','30d'].includes(a.range) ? 0 : 1;
        const bLong = ['7d','30d'].includes(b.range) ? 0 : 1;
        if (aLong !== bLong) return aLong - bLong;
        const aLoad = a.actions.some(value => /load|stale|blocked|error/.test(value)) ? 0 : 1;
        const bLoad = b.actions.some(value => /load|stale|blocked|error/.test(value)) ? 0 : 1;
        return aLoad - bLoad;
      })
      .slice(0, 24)
      .map((group) => {
        const label = [group.family, group.scope, group.range].filter(Boolean).join('/');
        const ageText = group.ageMs === null ? '' : ` · age ${Math.round(group.ageMs)}ms`;
        const ttlText = group.ttlMs === null ? '' : ` · ttl ${Math.round(group.ttlMs)}ms`;
        return `${label} ${group.actions.join('→') || '—'}${ageText}${ttlText}`;
      });
    return rows.join(' · ') || '—';
  }

"""
write(diagnostics, diagnostics_text.replace(diag_marker, diag_helpers + diag_marker, 1))
replace_once(
    diagnostics,
    """      `Bridge CLI operations: ${bridgeCliOperationsText(bridgeDiag.snapshotPerformance)}`,
      `Bridge CLI timing: ${bridgeSnapshotCliTimingText(bridgeDiag.snapshotPerformance)}`,
      `Bridge snapshot cache: ${bridgeSnapshotCounterText(bridgeDiag.snapshotPerformance?.cache, [['hits','hit'],['misses','miss'],['joins','join'],['loads','load'],['errors','errors'],['staleFallbacks','stale fallback']])}`,
      `Bridge snapshot circuit: ${bridgeSnapshotCounterText(bridgeDiag.snapshotPerformance?.circuits, [['opens','opened'],['blocked','blocked'],['recoveries','recoveries']])}`,""",
    """      `Bridge CLI operations: ${bridgeCliOperationsText(bridgeDiag.snapshotPerformance)}`,
      `Bridge Credits early-start: ${bridgeCreditsEarlyStartText(bridgeDiag.snapshotPerformance)}`,
      `Bridge CLI timing: ${bridgeSnapshotCliTimingText(bridgeDiag.snapshotPerformance)}`,
      `Bridge snapshot cache: ${bridgeSnapshotCounterText(bridgeDiag.snapshotPerformance?.cache, [['hits','hit'],['misses','miss'],['joins','join'],['loads','load'],['errors','errors'],['staleFallbacks','stale fallback']])}`,
      `Bridge snapshot cache decisions: ${bridgeSnapshotCacheDecisionsText(bridgeDiag.snapshotPerformance)}`,
      `Bridge snapshot circuit: ${bridgeSnapshotCounterText(bridgeDiag.snapshotPerformance?.circuits, [['opens','opened'],['blocked','blocked'],['recoveries','recoveries']])}`,""",
    'diagnostics decision lines',
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

# Durable current memory: carry the verified 5.61 device evidence and make 5.62
# explicitly measurement-only. Preserve all long-term roadmap/Product Vision text.
guidelines = read(GUIDELINES)
start_marker = '## Current development memory\n'
end_marker = '## Long-term update roadmap\n'
if guidelines.count(start_marker) != 1 or guidelines.count(end_marker) != 1:
    raise SystemExit('guidelines development-memory/roadmap section markers are invalid')
a = guidelines.index(start_marker)
b = guidelines.index(end_marker, a)
new_memory = """## Current development memory

Last verified real-device baseline: `3.0.0-alpha.5.61 — Credits Usage Early Start`.

Verified from the 5.61 device diagnostics on 2026-08-20/21 KST:

- Stable Readiness stayed `READY`; Bridge Engine `1.6.14` and Bridge Manager `1.2.6` remained healthy with no local runtime errors or failures.
- Organization discovery stayed `capture-primary · fallback 0 · shared account capture yes`; shared 24h reuse stayed active with dedicated 24h fallback 0.
- Eligible 3-operation cold samples verified Credits early-start twice. One sample started `usage-24h-model` at 5790ms before organizations ended at 6866ms (about 1.08s overlap); a later sample started usage at 4895ms before organizations ended at 6802ms (about 1.91s overlap).
- The later eligible sample completed the Bridge snapshot in about 9.21s with `credits 0→4895ms`, `devpass-capture-24h 21→6795ms`, `usage-24h-model 4895→9204ms`, limit 2, peak active 2, runs 3, queued 0. Bridge ran 3 CLI operations in that verified cold sample.
- Another visibility sample took about 17.17s because long-window analytics work became cold: `usage-30d-model` and `devpass-capture-7d` joined the snapshot; the 7d capture queued about 5.52s behind the two-lane limit. This verified a separate long-window contention shape, not a persistent 5.61 regression.
- In that 17.17s sample early-start was absent, while later eligible samples re-enabled it. The exact skip reason is UNKNOWN in 5.61 diagnostics and is an explicit 5.62 measurement target.
- A one-off Manager probe latency of about 4.15s later returned to about 313ms with manager connected/sync none/errors none; no persistent Manager regression is verified.
- Latest Request Ledger sample was exact 158/163 with 5 bucket rows. Bucket rows remain explicitly lower-fidelity and are not promoted to exact identity.
- Cache/source fidelity remained intact: missing Write/TTL remained UNKNOWN and was never inferred. Missing provider Cache Write/TTL stayed UNKNOWN; no inferred zero or provider-based estimate was introduced.
- Runtime Recovery Fidelity remained verified: cumulative local persist history remained visible while `active 0` allowed `READY`.
- Next candidate after the 5.55 real-device diagnostic: `3.0.0-alpha.5.56 — Snapshot Performance Repair`.
- Historical 5.59 contract remains recorded: Measurement only: do not change snapshot ordering, CLI concurrency, CLI timeout, cache TTLs, stale/circuit behavior, capture reuse, fallback behavior, payload semantics, or updater flow.
- Keep 5.58 shared 24h capture coalescing unchanged, including the dedicated 24h fallback only when shared activity is absent.
- `DEVPASS_BRIDGE_CLI_CONCURRENCY=1` restores the previous serial execution mode.
- Preserve the 5.57 organization recovery contract: if account capture fails or has no usable organization rows, fall back to the prior plain `orgs list --json` path; if capture and that fallback are both empty, `No organizations found in CLI output` remains an error.

Verified release-infrastructure state from 5.60+:

- The shared `repo-main-write` lock and monotonic candidate/main/release guard remain mandatory for every later publisher.
- P22 continues to verify stale-candidate blocking, same-version artifact divergence failure, and archived older automatic publishers.

Current release implementation: `3.0.0-alpha.5.62 — Snapshot Decision Attribution`.

5.62 release contract:

- Bridge Engine becomes `1.6.15`; Bridge Manager remains `1.2.6`.
- Measurement only: preserve 5.61 scheduling, Credits early-start selection/prefetch behavior, CLI concurrency limit 2, CLI timeout 25s, cache TTLs, cache/stale/circuit semantics, shared capture, payload semantics, Request Ledger, updater flow, and monotonic release integrity.
- Add snapshot-local Credits early-start decision attribution: `started` or `skipped`, safe candidate mode, result, and a bounded reason vocabulary (`serial-mode`, `no-safe-candidate`, `prefetch-error`, `bootstrap-error`). Never expose the candidate organization ID.
- Add bounded snapshot-local cache decision attribution with only sanitized family/scope/range plus `hit`, `miss`, `join`, `load`, `stale`, `blocked`, or `error`, and actual cache age/TTL when available.
- Raw cache keys, organization IDs, CLI args, payloads, headers, tokens, capture paths, and arbitrary error text must never enter the new decision attribution.
- Diagnostics must group cache decisions by sanitized family/scope/range so 7d/30d TTL expiry/load and queue contention can be correlated without changing source behavior.
- The new attribution must add zero CLI/network requests. Normal-path `runCli()` call sites remain unchanged from 5.61.

5.62 device success evidence to collect:

- Functional health remains READY/ok with no new active runtime errors.
- An eligible early-start sample reports `decision started`; a skipped sample reports a bounded reason instead of leaving the cause UNKNOWN.
- A normal 3-operation sample identifies long-window 7d/30d entries as cache hits when they are warm.
- When a long-window refresh spike recurs, diagnostics identify which 7d/30d families expired/loaded/joined while the existing CLI timeline independently shows the resulting lane/queue shape.
- No raw organization identifier or cache key appears in the new attribution lines.

"""
write(GUIDELINES, guidelines[:a] + new_memory + guidelines[b:])
sync_guidelines_release_state()

print(f'prepared Local Usage Dashboard {NEW_VERSION} (engine {NEW_ENGINE_VERSION}, manager {MANAGER_VERSION}) Snapshot Decision Attribution')
