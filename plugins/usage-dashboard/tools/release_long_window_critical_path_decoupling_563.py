from pathlib import Path
import hashlib
import json


ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')
OLD_VERSION = '3.0.0-alpha.5.62'
NEW_VERSION = '3.0.0-alpha.5.63'
OLD_ENGINE_VERSION = '1.6.15'
NEW_ENGINE_VERSION = '1.6.16'
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

# A bounded one-lane secondary scheduler owns only already-existing cache loaders.
# It never creates a new CLI/network call site and never starts new work while a
# foreground snapshot is active.
replace_once(
    engine,
    """const circuits = new Map();
const circuitStats = { opens: 0, blocked: 0, recoveries: 0 };
const snapshotAttributionStorage = new AsyncLocalStorage();""",
    """const circuits = new Map();
const circuitStats = { opens: 0, blocked: 0, recoveries: 0 };
const snapshotAttributionStorage = new AsyncLocalStorage();
const SECONDARY_REFRESH_CONCURRENCY = 1;
const SECONDARY_REFRESH_MAX_KEYS = 32;
const secondaryRefreshQueue = [];
const secondaryRefreshKeys = new Set();
const secondaryRefreshStats = {
  servedStale: 0,
  completed: 0,
  errors: 0,
  blocked: 0,
  superseded: 0,
  foregroundHeld: 0,
  dropped: 0,
  lastStartAt: null,
  lastStartAfterForegroundMs: null,
};
let secondaryRefreshRunning = false;
let secondaryDrainScheduled = false;
let foregroundSnapshotsActive = 0;
let lastForegroundEndedAt = null;""",
    'secondary refresh bounded state',
)

replace_once(
    engine,
    """  const safeAction = ['hit','miss','join','load','stale','blocked','error'].includes(String(action)) ? String(action) : 'other';
  const safeReason = ['empty','expired','loaded','circuit-open','refresh-error'].includes(String(reason)) ? String(reason) : '';""",
    """  const safeAction = ['hit','miss','join','load','stale','deferred','blocked','error'].includes(String(action)) ? String(action) : 'other';
  const safeReason = ['empty','expired','loaded','deferred-refresh','circuit-open','refresh-error'].includes(String(reason)) ? String(reason) : '';""",
    'deferred cache decision vocabulary',
)

replace_once(
    engine,
    """    cacheDecisions: Array.isArray(attribution?.cacheDecisions)
      ? attribution.cacheDecisions.slice(0, 64).map((item) => ({...item}))
      : [],
    cache: {...(attribution?.cache || {})},""",
    """    cacheDecisions: Array.isArray(attribution?.cacheDecisions)
      ? attribution.cacheDecisions.slice(0, 64).map((item) => ({...item}))
      : [],
    secondaryRefresh: secondaryRefreshSnapshot(),
    cache: {...(attribution?.cache || {})},""",
    'secondary diagnostics summary',
)

cached_marker = "async function cached(name, loader) {\n"
engine_text = read(engine)
if engine_text.count(cached_marker) != 1:
    raise SystemExit('cached insertion marker missing')
secondary_helpers = r"""function secondaryRefreshSnapshot() {
  return {
    limit: SECONDARY_REFRESH_CONCURRENCY,
    maxKeys: SECONDARY_REFRESH_MAX_KEYS,
    queued: secondaryRefreshQueue.length,
    running: secondaryRefreshRunning ? 1 : 0,
    servedStale: secondaryRefreshStats.servedStale,
    completed: secondaryRefreshStats.completed,
    errors: secondaryRefreshStats.errors,
    blocked: secondaryRefreshStats.blocked,
    superseded: secondaryRefreshStats.superseded,
    foregroundHeld: secondaryRefreshStats.foregroundHeld,
    dropped: secondaryRefreshStats.dropped,
    lastStartAt: secondaryRefreshStats.lastStartAt,
    lastStartAfterForegroundMs: secondaryRefreshStats.lastStartAfterForegroundMs,
  };
}

function scheduleSecondaryDrain() {
  if (secondaryDrainScheduled || secondaryRefreshRunning || foregroundSnapshotsActive > 0 || !secondaryRefreshQueue.length) return;
  secondaryDrainScheduled = true;
  setImmediate(() => {
    secondaryDrainScheduled = false;
    snapshotAttributionStorage.run(undefined, () => {
      void drainSecondaryRefresh();
    });
  });
}

function enqueueSecondaryRefresh(name, loader) {
  if (inFlight.has(name) || secondaryRefreshKeys.has(name)) return true;
  if (secondaryRefreshKeys.size >= SECONDARY_REFRESH_MAX_KEYS) {
    secondaryRefreshStats.dropped += 1;
    return false;
  }
  secondaryRefreshKeys.add(name);
  secondaryRefreshQueue.push({ name, loader });
  if (foregroundSnapshotsActive > 0) secondaryRefreshStats.foregroundHeld += 1;
  scheduleSecondaryDrain();
  return true;
}

async function drainSecondaryRefresh() {
  if (secondaryRefreshRunning || foregroundSnapshotsActive > 0 || !secondaryRefreshQueue.length) return;
  const job = secondaryRefreshQueue.shift();
  secondaryRefreshRunning = true;
  secondaryRefreshStats.lastStartAt = Date.now();
  secondaryRefreshStats.lastStartAfterForegroundMs = Number.isFinite(Number(lastForegroundEndedAt))
    ? Math.max(0, secondaryRefreshStats.lastStartAt - Number(lastForegroundEndedAt))
    : null;
  const previousAt = Number(cache.get(job.name)?.at || 0);
  try {
    await cached(job.name, job.loader, { backgroundRefresh:true });
    const currentAt = Number(cache.get(job.name)?.at || 0);
    if (currentAt > previousAt) {
      secondaryRefreshStats.completed += 1;
    } else {
      const circuit = getCircuit(job.name);
      if (circuit.state === 'open') secondaryRefreshStats.blocked += 1;
      else secondaryRefreshStats.superseded += 1;
    }
  } catch {
    const circuit = getCircuit(job.name);
    if (circuit.state === 'open') secondaryRefreshStats.blocked += 1;
    else secondaryRefreshStats.errors += 1;
  } finally {
    secondaryRefreshKeys.delete(job.name);
    secondaryRefreshRunning = false;
    scheduleSecondaryDrain();
  }
}

"""
write(engine, engine_text.replace(cached_marker, secondary_helpers + "async function cached(name, loader, options = {}) {\n", 1))

# Opt-in normal-expiry deferral. Fresh, cold, too-old, circuit-open, and error
# paths retain their existing semantics. Queue saturation fails safe to the old
# blocking load.
replace_once(
    engine,
    """  const now = Date.now();
  const current = cache.get(name);
  if (current && now - current.at < ttl) {
    noteSnapshotCacheDecision(name, 'hit', current, ttl, now);
    cacheStats.hits += 1;
    noteSnapshotCounter('cache', 'hits');
    return current.value;
  }
  if (inFlight.has(name)) {
    noteSnapshotCacheDecision(name, 'join', current, ttl, now);
    cacheStats.joins += 1;
    noteSnapshotCounter('cache', 'joins');
    return inFlight.get(name);
  }

  const gate = circuitBeforeLoad(name);
  if (!gate.allowed) {""",
    """  const now = Date.now();
  const current = cache.get(name);
  if (current && now - current.at < ttl) {
    noteSnapshotCacheDecision(name, 'hit', current, ttl, now);
    cacheStats.hits += 1;
    noteSnapshotCounter('cache', 'hits');
    return current.value;
  }

  const ageMs = current ? now - current.at : Infinity;
  const deferExpired = options?.deferExpired === true && options?.backgroundRefresh !== true;
  let gate = null;
  if (deferExpired && current && ageMs <= CACHE_STALE_MAX_MS) {
    if (inFlight.has(name)) {
      noteSnapshotCacheDecision(name, 'deferred', current, ttl, now, 'deferred-refresh');
      cacheStats.staleFallbacks += 1;
      noteSnapshotCounter('cache', 'staleFallbacks');
      secondaryRefreshStats.servedStale += 1;
      return staleClone(current.value, ageMs, 'deferred-refresh');
    }
    gate = circuitBeforeLoad(name);
    if (!gate.allowed) {
      noteSnapshotCacheDecision(name, 'stale', current, ttl, now, 'circuit-open');
      cacheStats.staleFallbacks += 1;
      noteSnapshotCounter('cache', 'staleFallbacks');
      return staleClone(current.value, ageMs, gate.error);
    }
    if (enqueueSecondaryRefresh(name, loader)) {
      noteSnapshotCacheDecision(name, 'deferred', current, ttl, now, 'deferred-refresh');
      cacheStats.staleFallbacks += 1;
      noteSnapshotCounter('cache', 'staleFallbacks');
      secondaryRefreshStats.servedStale += 1;
      return staleClone(current.value, ageMs, 'deferred-refresh');
    }
  }

  if (inFlight.has(name)) {
    noteSnapshotCacheDecision(name, 'join', current, ttl, now);
    cacheStats.joins += 1;
    noteSnapshotCounter('cache', 'joins');
    return inFlight.get(name);
  }

  gate ||= circuitBeforeLoad(name);
  if (!gate.allowed) {""",
    'normal-expiry deferred cache path',
)

# A composite assembled from deferred leaves is a response value, not a new
# last-good cache generation. Keeping it out of aggregate caches guarantees
# that the first snapshot after the leaf refresh observes the advanced source.
replace_once(
    engine,
    """      cache.set(name, { at: Date.now(), value });
      noteSnapshotCacheDecision(name, 'load', null, ttl, Date.now(), 'loaded');
      circuitSuccess(name);""",
    """      if (valueIsStale(value)) {
        noteSnapshotCacheDecision(name, 'stale', current, ttl, Date.now(), staleValueReason(value));
      } else {
        cache.set(name, { at: Date.now(), value });
        noteSnapshotCacheDecision(name, 'load', null, ttl, Date.now(), 'loaded');
      }
      circuitSuccess(name);""",
    'do not promote stale aggregate to last-good',
)

# Preserve bounded stale provenance when source leaves are merged.
replace_once(
    engine,
    """function mergeUsageActivities(items, range = '24h') {
  const providerMap = new Map();""",
    """function mergeUsageActivities(items, range = '24h') {
  const staleInputs = (items || []).map((item) => item?._cache).filter((meta) => meta?.stale === true);
  const aggregateCache = staleInputs.length ? {
    stale: true,
    ageMs: Math.max(...staleInputs.map((meta) => Number(meta?.ageMs)).filter(Number.isFinite), 0),
    reason: staleInputs.some((meta) => String(meta?.reason) === 'deferred-refresh') ? 'deferred-refresh' : 'source-stale',
  } : null;
  const providerMap = new Map();""",
    'aggregate stale provenance input',
)
replace_once(
    engine,
    """    fetchedAt: Date.now(),
    source: `LLMGateway hybrid · DevPass /activity + Credits CLI · ${range}`,
  };
}

function creditsBootstrapCandidate""",
    """    fetchedAt: Date.now(),
    source: `LLMGateway hybrid · DevPass /activity + Credits CLI · ${range}`,
    ...(aggregateCache ? { _cache: aggregateCache } : {}),
  };
}

function creditsBootstrapCandidate""",
    'aggregate stale provenance output',
)

# Only full-snapshot Analytics opts long-window source leaves into deferral.
replace_once(
    engine,
    "async function usageForOrg(org, range = '24h') {",
    "async function usageForOrg(org, range = '24h', options = {}) {",
    'usage source options',
)
replace_once(
    engine,
    """    }
    return normalized;
  });
}

function creditsUsageSelection""",
    """    }
    return normalized;
  }, { deferExpired: options?.deferExpired === true && ['7d','30d'].includes(String(range)) });
}

function creditsUsageSelection""",
    'usage source deferred option',
)
replace_once(
    engine,
    "async function devPassActivityForRange(range = '24h') {",
    "async function devPassActivityForRange(range = '24h', options = {}) {",
    'devpass source options',
)
replace_once(
    engine,
    """    normalized.source = exactRecent.length
      ? `LLMGateway authenticated session · /activity + /logs · DevPass project · ${normalizedRange}`
      : `LLMGateway authenticated session · /activity · DevPass project · ${normalizedRange}`;
    return normalized;
  });
}

function legacyDevPassUsageOrganization""",
    """    normalized.source = exactRecent.length
      ? `LLMGateway authenticated session · /activity + /logs · DevPass project · ${normalizedRange}`
      : `LLMGateway authenticated session · /activity · DevPass project · ${normalizedRange}`;
    return normalized;
  }, { deferExpired: options?.deferExpired === true && ['7d','30d'].includes(normalizedRange) });
}

function legacyDevPassUsageOrganization""",
    'devpass source deferred option',
)
replace_once(
    engine,
    "async function activityForScope(range = '24h', scope = 'all', creditsOrgId = '') {",
    "async function activityForScope(range = '24h', scope = 'all', creditsOrgId = '', options = {}) {",
    'activity scope options',
)
replace_once(
    engine,
    """  const normalizedCreditsOrgId = String(creditsOrgId || '').trim();
  const creditsCacheKey = normalizedCreditsOrgId || 'default';
  return cached(`activity:${normalizedScope}:${creditsCacheKey}:${range}`, async () => {""",
    """  const normalizedCreditsOrgId = String(creditsOrgId || '').trim();
  const creditsCacheKey = normalizedCreditsOrgId || 'default';
  const deferLongWindow = options?.deferLongWindow === true && ['7d','30d'].includes(String(range));
  return cached(`activity:${normalizedScope}:${creditsCacheKey}:${range}`, async () => {""",
    'activity long-window gate',
)
replace_all_required(
    engine,
    "await devPassActivityForRange(range)",
    "await devPassActivityForRange(range, { deferExpired:deferLongWindow })",
    'devpass leaf opt-in',
    minimum=1,
)
replace_once(
    engine,
    "await usageForOrg(legacyOrg, range)",
    "await usageForOrg(legacyOrg, range, { deferExpired:deferLongWindow })",
    'legacy usage leaf opt-in',
)
replace_once(
    engine,
    "await usageForOrg(creditsOrg, range)",
    "await usageForOrg(creditsOrg, range, { deferExpired:deferLongWindow })",
    'credits usage leaf opt-in',
)

replace_once(
    engine,
    "async function analyticsForScope(scope = 'all', creditsOrgId = '') {",
    "async function analyticsForScope(scope = 'all', creditsOrgId = '', options = {}) {",
    'analytics scope options',
)
replace_once(
    engine,
    """    const ranges = ['24h', '7d', '30d'];
    const settled = await Promise.allSettled(ranges.map((range) => timedSnapshotTask(`analytics.${normalizedScope}.${range}`, () => activityForScope(range, normalizedScope, creditsOrgId))));""",
    """    const ranges = ['24h', '7d', '30d'];
    const settled = await Promise.allSettled(ranges.map((range) => timedSnapshotTask(`analytics.${normalizedScope}.${range}`, () => activityForScope(range, normalizedScope, creditsOrgId, { deferLongWindow:options?.deferLongWindow === true }))));""",
    'analytics leaf deferral propagation',
)
replace_once(
    engine,
    "async function analyticsScopes(creditsOrgId = '') {",
    "async function analyticsScopes(creditsOrgId = '', options = {}) {",
    'analytics scopes options',
)
replace_once(
    engine,
    """    const scopes = ['all', 'devpass', 'credits'];
    const settled = await Promise.allSettled(scopes.map((scope) => timedSnapshotTask(`analytics.${scope}`, () => analyticsForScope(scope, creditsOrgId))));""",
    """    const scopes = ['all', 'devpass', 'credits'];
    const settled = await Promise.allSettled(scopes.map((scope) => timedSnapshotTask(`analytics.${scope}`, () => analyticsForScope(scope, creditsOrgId, { deferLongWindow:options?.deferLongWindow === true }))));""",
    'analytics scopes deferral propagation',
)

# Runway defers only an existing last-good runway object. Its cold loader keeps
# the original blocking calculation and never manufactures new runway from a
# stale 7d source.
replace_once(
    engine,
    "async function runwayFor(orgId) {",
    "async function runwayFor(orgId, options = {}) {",
    'runway options',
)
replace_once(
    engine,
    """        if (org) {
          const usage = await usageForOrg(org, '7d');
          total7d = finite(usage?.totalCost);
        }
      } catch {}
      if (total7d === null) {
        const creditsOnly = await activityForScope('7d', 'credits', orgId);
        total7d = finite(creditsOnly?.totalCost);
      }""",
    """        if (org) {
          const usage = await usageForOrg(org, '7d');
          if (valueIsStale(usage)) throw new Error('Runway usage source is stale');
          total7d = finite(usage?.totalCost);
        }
      } catch {}
      if (total7d === null) {
        const creditsOnly = await activityForScope('7d', 'credits', orgId);
        if (valueIsStale(creditsOnly)) throw new Error('Runway activity source is stale');
        total7d = finite(creditsOnly?.totalCost);
      }""",
    'cold runway rejects stale source input',
)
replace_once(
    engine,
    """      return { runwayDays, avgDailySpend7d, approximate: true, fetchedAt: Date.now(), source: 'LLMGateway CLI usage 7d' };
  });
}""",
    """      return { runwayDays, avgDailySpend7d, approximate: true, fetchedAt: Date.now(), source: 'LLMGateway CLI usage 7d' };
  }, { deferExpired:options?.deferExpired === true });
}""",
    'runway deferred cache option',
)

# Staleness walks only the known payload topology: direct cache metadata,
# analytics windows, and scoped aggregate containers.
replace_once(
    engine,
    """function valueIsStale(value) {
  if (!value || typeof value !== 'object') return false;
  if (value?._cache?.stale) return true;
  if (value.windows && typeof value.windows === 'object') {
    return Object.values(value.windows).some((item) => item?._cache?.stale);
  }
  return false;
}""",
    """function staleCacheMetadata(value) {
  if (!value || typeof value !== 'object') return [];
  const metadata = [];
  if (value?._cache?.stale === true) metadata.push(value._cache);
  if (value.windows && typeof value.windows === 'object') {
    for (const item of Object.values(value.windows)) {
      if (item?._cache?.stale === true) metadata.push(item._cache);
    }
  }
  if (value.scopes && typeof value.scopes === 'object') {
    for (const scopeValue of Object.values(value.scopes)) {
      if (scopeValue?._cache?.stale === true) metadata.push(scopeValue._cache);
      if (!scopeValue?.windows || typeof scopeValue.windows !== 'object') continue;
      for (const item of Object.values(scopeValue.windows)) {
        if (item?._cache?.stale === true) metadata.push(item._cache);
      }
    }
  }
  return metadata;
}

function valueIsStale(value) {
  return staleCacheMetadata(value).length > 0;
}

function staleValueReason(value) {
  return staleCacheMetadata(value).some((meta) => String(meta?.reason) === 'deferred-refresh')
    ? 'deferred-refresh'
    : 'refresh-error';
}""",
    'bounded stale topology',
)

# Foreground lifecycle gates new secondary starts. A running secondary is not
# cancelled; only the next queued job waits for all snapshots to finish.
replace_once(
    engine,
    """async function snapshot(profile = 'full', creditsOrgId = '') {
  const normalizedProfile = profile === 'light' ? 'light' : 'full';
  const attribution = createSnapshotAttribution(normalizedProfile);
  return snapshotAttributionStorage.run(attribution, () => snapshotAttributed(normalizedProfile, creditsOrgId, attribution));
}""",
    """async function snapshot(profile = 'full', creditsOrgId = '') {
  const normalizedProfile = profile === 'light' ? 'light' : 'full';
  const attribution = createSnapshotAttribution(normalizedProfile);
  foregroundSnapshotsActive += 1;
  try {
    return await snapshotAttributionStorage.run(attribution, () => snapshotAttributed(normalizedProfile, creditsOrgId, attribution));
  } finally {
    foregroundSnapshotsActive = Math.max(0, foregroundSnapshotsActive - 1);
    if (foregroundSnapshotsActive === 0) {
      lastForegroundEndedAt = Date.now();
      scheduleSecondaryDrain();
    }
  }
}""",
    'foreground snapshot lifecycle',
)
replace_once(
    engine,
    """      timedSnapshotTask('runway', () => creditsOrg ? runwayFor(creditsOrg.id) : Promise.resolve(null)),
      timedSnapshotTask('analyticsScopes', () => analyticsScopes(resolvedCreditsOrgId)),""",
    """      timedSnapshotTask('runway', () => creditsOrg ? runwayFor(creditsOrg.id, { deferExpired:true }) : Promise.resolve(null)),
      timedSnapshotTask('analyticsScopes', () => analyticsScopes(resolvedCreditsOrgId, { deferLongWindow:true })),""",
    'full snapshot deferred opt-in',
)

diagnostics = SRC / '40-diagnostics.part.js'
replace_once(
    diagnostics,
    """      const action = ['hit','miss','join','load','stale','blocked','error'].includes(String(item?.action)) ? String(item.action) : 'other';
      const reason = ['empty','expired','circuit-open','refresh-error'].includes(String(item?.reason)) ? String(item.reason) : '';""",
    """      const action = ['hit','miss','join','load','stale','deferred','blocked','error'].includes(String(item?.action)) ? String(item.action) : 'other';
      const reason = ['empty','expired','deferred-refresh','circuit-open','refresh-error'].includes(String(item?.reason)) ? String(item.reason) : '';""",
    'diagnostic deferred vocabulary',
)
diag_marker = "  function stableReadinessSnapshot(bridgeDiag, runtimeBridge) {\n"
diagnostics_text = read(diagnostics)
if diagnostics_text.count(diag_marker) != 1:
    raise SystemExit('secondary diagnostics insertion marker missing')
secondary_diag = r"""  function bridgeSecondaryRefreshText(performance) {
    const secondary = performance?.secondaryRefresh && typeof performance.secondaryRefresh === 'object'
      ? performance.secondaryRefresh
      : null;
    if (!secondary) return '—';
    const after = Number.isFinite(Number(secondary.lastStartAfterForegroundMs))
      ? `+${Math.round(Number(secondary.lastStartAfterForegroundMs))}ms`
      : '—';
    return `limit ${Number(secondary.limit || 1)} · queued ${Number(secondary.queued || 0)} · running ${Number(secondary.running || 0)} · served stale ${Number(secondary.servedStale || 0)} · completed ${Number(secondary.completed || 0)} · errors ${Number(secondary.errors || 0)} · blocked ${Number(secondary.blocked || 0)} · superseded ${Number(secondary.superseded || 0)} · foreground held ${Number(secondary.foregroundHeld || 0)} · dropped ${Number(secondary.dropped || 0)} · last start after foreground ${after}`;
  }

"""
write(diagnostics, diagnostics_text.replace(diag_marker, secondary_diag + diag_marker, 1))
replace_once(
    diagnostics,
    """      `Bridge snapshot cache decisions: ${bridgeSnapshotCacheDecisionsText(bridgeDiag.snapshotPerformance)}`,
      `Bridge snapshot circuit: ${bridgeSnapshotCounterText(bridgeDiag.snapshotPerformance?.circuits, [['opens','opened'],['blocked','blocked'],['recoveries','recoveries']])}`,""",
    """      `Bridge snapshot cache decisions: ${bridgeSnapshotCacheDecisionsText(bridgeDiag.snapshotPerformance)}`,
      `Bridge secondary refresh: ${bridgeSecondaryRefreshText(bridgeDiag.snapshotPerformance)}`,
      `Bridge snapshot circuit: ${bridgeSnapshotCounterText(bridgeDiag.snapshotPerformance?.circuits, [['opens','opened'],['blocked','blocked'],['recoveries','recoveries']])}`,""",
    'secondary diagnostic line',
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
manifest['components']['bridgeManager']['bootstrapSha256'] = sha256_file(RUNTIME / 'bootstrap-bridge-manager.sh')
write(manifest_path, json.dumps(manifest, indent=2) + '\n')

guidelines = read(GUIDELINES)
start_marker = '## Current development memory\n'
end_marker = '## Long-term update roadmap\n'
if guidelines.count(start_marker) != 1 or guidelines.count(end_marker) != 1:
    raise SystemExit('guidelines development-memory/roadmap section markers are invalid')
a = guidelines.index(start_marker)
b = guidelines.index(end_marker, a)
new_memory = """## Current development memory

Last verified real-device baseline: `3.0.0-alpha.5.62 — Snapshot Decision Attribution`.

Verified 5.62 scheduling evidence:

- A full snapshot sample took about 30.259s while the foreground 24h usage path completed at about 22.241s and cold 7d/30d source work occupied the remaining critical path.
- The evidence supports long-window contention attribution; it does not prove a fixed future latency or justify changing the 24h truth path.
- Existing source fidelity remains mandatory: UNKNOWN stays distinct from known zero, and deferred values must be explicitly marked stale.
- The shared `repo-main-write` lock and monotonic candidate/main/release guard remain mandatory.

Current release implementation: `3.0.0-alpha.5.63 — Long-window Critical Path Decoupling`.

5.63 release contract:

- Product becomes `3.0.0-alpha.5.63`; Bridge Engine becomes `1.6.16`; Bridge Manager remains `1.2.6`; snapshot/recent-request contracts remain `1/1`.
- Keep 24h usage and DevPass Activity on the foreground truth path. No 24h leaf may opt into normal-expiry deferral.
- Only full-snapshot Analytics 7d/30d source leaves may return an expired last-good value immediately, and only inside the existing 30-minute stale ceiling.
- Cold cache, missing last-good, too-old last-good, queue saturation, and standalone analytics endpoints retain the existing blocking behavior.
- Runway may defer only an existing expired last-good runway object. Cold runway calculation remains blocking and never derives a new runway value from deferred 7d input.
- Secondary refresh is bounded to one active job and 32 unique raw cache keys, preserves same-key/inFlight deduplication, and starts no new job while any foreground snapshot is active.
- A running secondary job is not cancelled when a foreground snapshot begins; later secondary jobs remain held.
- Deferred stale provenance must survive leaf merge, analytics windows/scopes, and module status.
- Diagnostics expose only sanitized family/scope/range and bounded queue counters. Raw keys, organization IDs, tokens, payloads, headers, CLI args, paths, and arbitrary errors remain excluded.
- No new `runCli()` call site, network endpoint, CLI concurrency, timeout, TTL, stale ceiling, circuit semantics, capture reuse, Request Ledger, updater, or release-guard change is allowed.

5.63 device success evidence to collect:

- Stable Readiness remains READY with Engine `1.6.16`, Manager `1.2.6`, and no active local runtime error.
- Expired last-good 7d/30d decisions appear as `deferred(deferred-refresh)` and the related long-window CLI starts after foreground snapshot completion.
- 24h CLI remains before response completion and never appears as deferred.
- Stale 7d/30d values are visibly marked stale until a secondary refresh advances the cache timestamp; a later snapshot then observes the refreshed value.
- Queue diagnostics keep limit 1, remain bounded, and expose no raw identifier.

"""
write(GUIDELINES, guidelines[:a] + new_memory + guidelines[b:])
sync_guidelines_release_state()

print(f'prepared Local Usage Dashboard {NEW_VERSION} (engine {NEW_ENGINE_VERSION}, manager {MANAGER_VERSION}) Long-window Critical Path Decoupling')
