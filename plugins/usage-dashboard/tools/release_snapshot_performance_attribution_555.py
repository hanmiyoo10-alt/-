from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
TESTS = ROOT / 'tests'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')
OLD_VERSION = '3.0.0-alpha.5.54'
NEW_VERSION = '3.0.0-alpha.5.55'
OLD_ENGINE_VERSION = '1.6.8'
NEW_ENGINE_VERSION = '1.6.9'
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


def insert_before_once(path: Path, marker: str, addition: str, label: str) -> None:
    text = read(path)
    count = text.count(marker)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 marker in {path}, got {count}')
    write(path, text.replace(marker, addition + marker, 1))


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


# 5.55 is evidence-only performance attribution. Do not change CLI concurrency,
# cache TTLs, command timeouts, snapshot contents, parser semantics, or updater UX.
core = SRC / '00-runtime-core.part.js'
replace_all_required(core, OLD_VERSION, NEW_VERSION, 'core product version', minimum=2)
replace_once(
    core,
    f"  const REQUIRED_BRIDGE_VERSION = '{OLD_ENGINE_VERSION}';",
    f"  const REQUIRED_BRIDGE_VERSION = '{NEW_ENGINE_VERSION}';",
    'required bridge version',
)

engine = RUNTIME / 'bridge-engine.mjs'
replace_once(engine, "import { promisify } from 'node:util';", "import { promisify } from 'node:util';\nimport { AsyncLocalStorage } from 'node:async_hooks';", 'AsyncLocalStorage import')
replace_once(engine, f"const VERSION = '{OLD_ENGINE_VERSION}';", f"const VERSION = '{NEW_ENGINE_VERSION}';", 'bridge engine version')

replace_once(
    engine,
    """const circuitStats = { opens: 0, blocked: 0, recoveries: 0 };

async function withCliSlot(task) {
  if (cliStats.active >= CLI_CONCURRENCY) {
    cliStats.queued += 1;
    await new Promise((resolve) => cliWaiters.push(resolve));
    cliStats.queued = Math.max(0, cliStats.queued - 1);
  }
  cliStats.active += 1;
  cliStats.runs += 1;
  cliStats.maxActive = Math.max(cliStats.maxActive, cliStats.active);
  try {
    return await task();
  } finally {
    cliStats.active = Math.max(0, cliStats.active - 1);
    const next = cliWaiters.shift();
    if (next) next();
  }
}
""",
    """const circuitStats = { opens: 0, blocked: 0, recoveries: 0 };
const snapshotAttributionStorage = new AsyncLocalStorage();

function createSnapshotAttribution(profile) {
  return {
    startedAt: Date.now(),
    profile: String(profile || 'full'),
    tasks: Object.create(null),
    cache: { hits:0, misses:0, joins:0, loads:0, errors:0, staleFallbacks:0 },
    circuits: { opens:0, blocked:0, recoveries:0 },
    cli: {
      runs:0, queuedRuns:0, queueWaitTotalMs:0, queueWaitMaxMs:0,
      executionTotalMs:0, executionMaxMs:0,
      slowestLabel:'', slowestTotalMs:0,
    },
  };
}

function currentSnapshotAttribution() {
  return snapshotAttributionStorage.getStore() || null;
}

function noteSnapshotCounter(group, key, amount = 1) {
  const attribution = currentSnapshotAttribution();
  if (!attribution?.[group] || !Object.prototype.hasOwnProperty.call(attribution[group], key)) return;
  attribution[group][key] = Number(attribution[group][key] || 0) + Number(amount || 0);
}

async function timedSnapshotTask(name, task) {
  const attribution = currentSnapshotAttribution();
  const started = Date.now();
  try {
    return await task();
  } finally {
    if (attribution) attribution.tasks[String(name)] = Math.max(0, Date.now() - started);
  }
}

function cliOperationLabel(args, extraEnv = {}) {
  const list = Array.isArray(args) ? args.map(value => String(value)) : [];
  const activityRange = ['24h','7d','30d'].includes(String(extraEnv?.DEVPASS_BRIDGE_ACTIVITY_RANGE || ''))
    ? String(extraEnv.DEVPASS_BRIDGE_ACTIVITY_RANGE)
    : '';
  if (extraEnv?.DEVPASS_BRIDGE_CAPTURE_FILE) return activityRange ? `devpass-capture-${activityRange}` : 'account-capture';
  const command = String(list[0] || 'cli').toLowerCase();
  if (command === 'orgs') return 'organizations';
  if (command === 'credits') return 'credits';
  if (command === 'usage') {
    const rangeIndex = list.indexOf('--range');
    const range = rangeIndex >= 0 && ['24h','7d','30d'].includes(String(list[rangeIndex + 1] || '')) ? String(list[rangeIndex + 1]) : 'unknown';
    return list.includes('--by') ? `usage-${range}-model` : `usage-${range}`;
  }
  return command.replace(/[^a-z0-9-]/g, '').slice(0, 32) || 'cli';
}

function noteSnapshotCliTiming(label, queued, queueWaitMs, executionMs) {
  const attribution = currentSnapshotAttribution();
  if (!attribution) return;
  const cli = attribution.cli;
  const wait = Math.max(0, Number(queueWaitMs) || 0);
  const execution = Math.max(0, Number(executionMs) || 0);
  const total = wait + execution;
  cli.runs += 1;
  if (queued) {
    cli.queuedRuns += 1;
    cli.queueWaitTotalMs += wait;
    cli.queueWaitMaxMs = Math.max(cli.queueWaitMaxMs, wait);
  }
  cli.executionTotalMs += execution;
  cli.executionMaxMs = Math.max(cli.executionMaxMs, execution);
  if (total >= Number(cli.slowestTotalMs || 0)) {
    cli.slowestTotalMs = total;
    cli.slowestLabel = String(label || 'cli');
  }
}

function snapshotAttributionSummary(attribution) {
  const tasks = attribution?.tasks && typeof attribution.tasks === 'object' ? attribution.tasks : {};
  const organizationsMs = Number(tasks.organizations);
  const postRoot = ['devpassStatus','usageScopes','analyticsScopes','runway']
    .map(name => [name, Number(tasks[name])])
    .filter(([,ms]) => Number.isFinite(ms) && ms >= 0)
    .sort((a,b) => b[1] - a[1])[0] || null;
  const rootMs = Number.isFinite(organizationsMs) && organizationsMs >= 0 ? organizationsMs : 0;
  const detailedSlowest = Object.entries(tasks)
    .filter(([,ms]) => Number.isFinite(Number(ms)) && Number(ms) >= 0)
    .sort((a,b) => Number(b[1]) - Number(a[1]))[0] || null;
  const cli = attribution?.cli || {};
  const runs = Number(cli.runs || 0);
  const queuedRuns = Number(cli.queuedRuns || 0);
  return {
    totalMs: Math.max(0, Date.now() - Number(attribution?.startedAt || Date.now())),
    criticalPath: postRoot ? `organizations→${postRoot[0]}` : (Number.isFinite(organizationsMs) ? 'organizations' : null),
    criticalPathMs: postRoot ? rootMs + Number(postRoot[1]) : (Number.isFinite(organizationsMs) ? rootMs : null),
    slowestTask: detailedSlowest ? String(detailedSlowest[0]) : null,
    slowestTaskMs: detailedSlowest ? Number(detailedSlowest[1]) : null,
    tasks: {...tasks},
    cache: {...(attribution?.cache || {})},
    circuits: {...(attribution?.circuits || {})},
    cli: {
      runs,
      queuedRuns,
      queueWaitAvgMs: queuedRuns > 0 ? Number(cli.queueWaitTotalMs || 0) / queuedRuns : null,
      queueWaitMaxMs: queuedRuns > 0 ? Number(cli.queueWaitMaxMs || 0) : null,
      executionAvgMs: runs > 0 ? Number(cli.executionTotalMs || 0) / runs : null,
      executionMaxMs: runs > 0 ? Number(cli.executionMaxMs || 0) : null,
      slowestLabel: runs > 0 && cli.slowestLabel ? String(cli.slowestLabel) : null,
      slowestTotalMs: runs > 0 ? Number(cli.slowestTotalMs || 0) : null,
    },
  };
}

async function withCliSlot(label, task) {
  const queuedAt = Date.now();
  let queued = false;
  if (cliStats.active >= CLI_CONCURRENCY) {
    queued = true;
    cliStats.queued += 1;
    await new Promise((resolve) => cliWaiters.push(resolve));
    cliStats.queued = Math.max(0, cliStats.queued - 1);
  }
  const executionStartedAt = Date.now();
  const queueWaitMs = Math.max(0, executionStartedAt - queuedAt);
  cliStats.active += 1;
  cliStats.runs += 1;
  cliStats.maxActive = Math.max(cliStats.maxActive, cliStats.active);
  try {
    return await task();
  } finally {
    const executionMs = Math.max(0, Date.now() - executionStartedAt);
    noteSnapshotCliTiming(label, queued, queueWaitMs, executionMs);
    cliStats.active = Math.max(0, cliStats.active - 1);
    const next = cliWaiters.shift();
    if (next) next();
  }
}
""",
    'snapshot attribution and CLI timing helpers',
)

replace_once(
    engine,
    """async function runCliProcess(args, extraEnv = {}) {
  return withCliSlot(async () => {
    try {
      return await runProgram('llmgateway', args, extraEnv);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    return runProgram('npx', ['--yes', `@llmgateway/cli@${CLI_VERSION}`, ...args], extraEnv);
  });
}
""",
    """async function runCliProcess(args, extraEnv = {}) {
  return withCliSlot(cliOperationLabel(args, extraEnv), async () => {
    try {
      return await runProgram('llmgateway', args, extraEnv);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    return runProgram('npx', ['--yes', `@llmgateway/cli@${CLI_VERSION}`, ...args], extraEnv);
  });
}
""",
    'sanitized CLI timing label',
)

# Snapshot-scoped cache and circuit counters. Global counters remain unchanged.
for old, new, label in [
    ('    cacheStats.hits += 1;\n    return current.value;', '    cacheStats.hits += 1;\n    noteSnapshotCounter(\'cache\', \'hits\');\n    return current.value;', 'cache hits'),
    ('    cacheStats.joins += 1;\n    return inFlight.get(name);', '    cacheStats.joins += 1;\n    noteSnapshotCounter(\'cache\', \'joins\');\n    return inFlight.get(name);', 'cache joins'),
    ('  cacheStats.misses += 1;\n  const promise = (async () => {', '  cacheStats.misses += 1;\n  noteSnapshotCounter(\'cache\', \'misses\');\n  const promise = (async () => {', 'cache misses'),
    ('      cacheStats.loads += 1;\n      cacheStats.totalLoadMs += elapsed;', '      cacheStats.loads += 1;\n      noteSnapshotCounter(\'cache\', \'loads\');\n      cacheStats.totalLoadMs += elapsed;', 'cache loads'),
    ('      cacheStats.errors += 1;\n      const circuit = circuitFailure(name, error);', '      cacheStats.errors += 1;\n      noteSnapshotCounter(\'cache\', \'errors\');\n      const circuit = circuitFailure(name, error);', 'cache errors'),
]:
    replace_once(engine, old, new, label)
replace_all_required(
    engine,
    '      cacheStats.staleFallbacks += 1;',
    '      cacheStats.staleFallbacks += 1;\n      noteSnapshotCounter(\'cache\', \'staleFallbacks\');',
    'cache stale fallback delta',
    minimum=2,
)
replace_once(
    engine,
    '    circuitStats.blocked += 1;',
    "    circuitStats.blocked += 1;\n    noteSnapshotCounter('circuits', 'blocked');",
    'circuit blocked delta',
)
replace_once(
    engine,
    "  if (circuit.state !== 'closed' || circuit.failures > 0) circuitStats.recoveries += 1;",
    "  if (circuit.state !== 'closed' || circuit.failures > 0) {\n    circuitStats.recoveries += 1;\n    noteSnapshotCounter('circuits', 'recoveries');\n  }",
    'circuit recovery delta',
)
replace_once(
    engine,
    '    if (!wasOpen) circuitStats.opens += 1;',
    "    if (!wasOpen) {\n      circuitStats.opens += 1;\n      noteSnapshotCounter('circuits', 'opens');\n    }",
    'circuit open delta',
)

# Attribute scope/range waits without adding any new work.
replace_once(
    engine,
    "    const settled = await Promise.allSettled(scopes.map((scope) => activityForScope('24h', scope, creditsOrgId)));",
    "    const settled = await Promise.allSettled(scopes.map((scope) => timedSnapshotTask(`usage.${scope}`, () => activityForScope('24h', scope, creditsOrgId))));",
    'usage scope timing',
)
replace_once(
    engine,
    "    const settled = await Promise.allSettled(ranges.map((range) => activityForScope(range, normalizedScope, creditsOrgId)));",
    "    const settled = await Promise.allSettled(ranges.map((range) => timedSnapshotTask(`analytics.${normalizedScope}.${range}`, () => activityForScope(range, normalizedScope, creditsOrgId))));",
    'analytics range timing',
)
replace_once(
    engine,
    "    const settled = await Promise.allSettled(scopes.map((scope) => analyticsForScope(scope, creditsOrgId)));",
    "    const settled = await Promise.allSettled(scopes.map((scope) => timedSnapshotTask(`analytics.${scope}`, () => analyticsForScope(scope, creditsOrgId))));",
    'analytics scope timing',
)

# Existing module metadata gains durationMs from the current snapshot attribution.
replace_once(
    engine,
    """function moduleMeta(status, family, updatedAt = null, error = null) {
  const circuit = getCircuit(family);
  const circuitState = circuit.state === 'open' && Date.now() >= circuit.openUntil ? 'half-open' : circuit.state;
  const finalStatus = circuitState === 'open' && status === 'error' ? 'open' : status;
  return {
    status: finalStatus,
    stale: status === 'stale',
    updatedAt: updatedAt || circuit.lastSuccessAt || null,
    circuit: circuitState,
    failures: circuit.failures,
    retryInMs: circuitState === 'open' ? Math.max(0, circuit.openUntil - Date.now()) : 0,
    errorCode: error ? classifyError(error) : (circuit.lastErrorCode || null),
  };
}
""",
    """function snapshotModuleDuration(family) {
  const tasks = currentSnapshotAttribution()?.tasks || {};
  const taskName = family === 'organizations' ? 'organizations'
    : family === 'account' ? 'devpassStatus'
      : family === 'devpassActivity' ? 'usage.devpass'
        : family === 'creditsUsage' ? 'usage.credits'
          : family === 'usageScopes' ? 'usageScopes'
            : family === 'analytics' ? 'analyticsScopes'
              : family === 'runway' ? 'runway'
                : '';
  const value = taskName ? Number(tasks[taskName]) : NaN;
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function moduleMeta(status, family, updatedAt = null, error = null) {
  const circuit = getCircuit(family);
  const circuitState = circuit.state === 'open' && Date.now() >= circuit.openUntil ? 'half-open' : circuit.state;
  const finalStatus = circuitState === 'open' && status === 'error' ? 'open' : status;
  return {
    status: finalStatus,
    stale: status === 'stale',
    updatedAt: updatedAt || circuit.lastSuccessAt || null,
    durationMs: snapshotModuleDuration(family),
    circuit: circuitState,
    failures: circuit.failures,
    retryInMs: circuitState === 'open' ? Math.max(0, circuit.openUntil - Date.now()) : 0,
    errorCode: error ? classifyError(error) : (circuit.lastErrorCode || null),
  };
}
""",
    'module duration attribution',
)

replace_once(
    engine,
    "async function snapshot(profile = 'full', creditsOrgId = '') {",
    """async function snapshot(profile = 'full', creditsOrgId = '') {
  const normalizedProfile = profile === 'light' ? 'light' : 'full';
  const attribution = createSnapshotAttribution(normalizedProfile);
  return snapshotAttributionStorage.run(attribution, () => snapshotAttributed(normalizedProfile, creditsOrgId, attribution));
}

async function snapshotAttributed(profile = 'full', creditsOrgId = '', attribution = currentSnapshotAttribution()) {""",
    'snapshot attribution wrapper',
)
replace_once(
    engine,
    '  const orgsResult = await Promise.allSettled([loadOrgs()]);',
    "  const orgsResult = await Promise.allSettled([timedSnapshotTask('organizations', () => loadOrgs())]);",
    'organizations snapshot timing',
)
replace_once(
    engine,
    '  const jobs = [loadDevPassStatus(), usageScopes(resolvedCreditsOrgId)];',
    "  const jobs = [\n    timedSnapshotTask('devpassStatus', () => loadDevPassStatus()),\n    timedSnapshotTask('usageScopes', () => usageScopes(resolvedCreditsOrgId)),\n  ];",
    'snapshot primary job timing',
)
replace_once(
    engine,
    "    jobs.push(creditsOrg ? runwayFor(creditsOrg.id) : Promise.resolve(null), analyticsScopes(resolvedCreditsOrgId));",
    "    jobs.push(\n      timedSnapshotTask('runway', () => creditsOrg ? runwayFor(creditsOrg.id) : Promise.resolve(null)),\n      timedSnapshotTask('analyticsScopes', () => analyticsScopes(resolvedCreditsOrgId)),\n    );",
    'snapshot full job timing',
)
replace_once(
    engine,
    """  if (normalizedProfile === 'full') {
    result.modules.analytics = moduleMeta(""",
    """  if (normalizedProfile === 'full') {
    result.modules.analytics = moduleMeta(""",
    'snapshot module anchor verification',
)
replace_once(
    engine,
    """  }
  return result;
}

function isAuthorized(req) {""",
    """  }
  result.diagnostics.snapshotPerformance = snapshotAttributionSummary(attribution);
  return result;
}

function isAuthorized(req) {""",
    'snapshot attribution summary export',
)

# Plugin-side bridge snapshot normalization already preserves diagnostics and
# durationMs; expose the new snapshotPerformance object to diagnostic rendering.
stability = SRC / '06-runtime-stability.part.js'
replace_once(
    stability,
    "    const circuitStats = diagnostics?.circuitStats && typeof diagnostics.circuitStats === 'object' ? diagnostics.circuitStats : null;",
    "    const circuitStats = diagnostics?.circuitStats && typeof diagnostics.circuitStats === 'object' ? diagnostics.circuitStats : null;\n    const snapshotPerformance = diagnostics?.snapshotPerformance && typeof diagnostics.snapshotPerformance === 'object' ? diagnostics.snapshotPerformance : null;",
    'snapshot performance normalization',
)
replace_once(
    stability,
    "      circuitRecoveries: numeric(circuitStats?.recoveries)\n    };",
    "      circuitRecoveries: numeric(circuitStats?.recoveries),\n      snapshotPerformance\n    };",
    'snapshot performance bridge snapshot field',
)

diag = SRC / '40-diagnostics.part.js'
insert_before_once(
    diag,
    '  function stableReadinessSnapshot(bridgeDiag, runtimeBridge) {',
    """  function snapshotPerformanceMs(value) {
    return num(value) ? `${Math.round(Number(value))}ms` : '—';
  }

  function bridgeSnapshotJobsText(performance) {
    const tasks = performance?.tasks && typeof performance.tasks === 'object' ? performance.tasks : null;
    if (!tasks) return '—';
    const names = ['organizations','devpassStatus','usageScopes','analyticsScopes','runway'];
    const rows = names.filter(name => num(tasks[name])).map(name => `${name} ${snapshotPerformanceMs(tasks[name])}`);
    return rows.join(' · ') || '—';
  }

  function bridgeSnapshotCliTimingText(performance) {
    const cli = performance?.cli && typeof performance.cli === 'object' ? performance.cli : null;
    if (!cli) return '—';
    const runs = Number(cli.runs || 0);
    const queued = Number(cli.queuedRuns || 0);
    return `runs ${runs} · queued ${queued} · queue avg ${snapshotPerformanceMs(cli.queueWaitAvgMs)} · max ${snapshotPerformanceMs(cli.queueWaitMaxMs)} · exec avg ${snapshotPerformanceMs(cli.executionAvgMs)} · max ${snapshotPerformanceMs(cli.executionMaxMs)} · slowest ${cli.slowestLabel || '—'} ${snapshotPerformanceMs(cli.slowestTotalMs)}`;
  }

  function bridgeSnapshotCounterText(value, keys) {
    if (!value || typeof value !== 'object') return '—';
    return keys.map(([key,label]) => `${label} ${Number(value[key] || 0)}`).join(' · ');
  }

""",
    'snapshot performance diagnostic formatters',
)
replace_once(
    diag,
    "      `Bridge module duration: ${bridgeModuleDurationText(bridgeDiag.moduleDetails)}`,",
    """      `Bridge module duration: ${bridgeModuleDurationText(bridgeDiag.moduleDetails)}`,
      `Bridge snapshot attribution: ${bridgeDiag.snapshotPerformance ? `total ${snapshotPerformanceMs(bridgeDiag.snapshotPerformance.totalMs)} · critical ${bridgeDiag.snapshotPerformance.criticalPath || '—'} ${snapshotPerformanceMs(bridgeDiag.snapshotPerformance.criticalPathMs)} · slowest ${bridgeDiag.snapshotPerformance.slowestTask || '—'} ${snapshotPerformanceMs(bridgeDiag.snapshotPerformance.slowestTaskMs)}` : '—'}`,
      `Bridge snapshot jobs: ${bridgeSnapshotJobsText(bridgeDiag.snapshotPerformance)}`,
      `Bridge CLI timing: ${bridgeSnapshotCliTimingText(bridgeDiag.snapshotPerformance)}`,
      `Bridge snapshot cache: ${bridgeSnapshotCounterText(bridgeDiag.snapshotPerformance?.cache, [['hits','hit'],['misses','miss'],['joins','join'],['loads','load'],['errors','errors'],['staleFallbacks','stale fallback']])}`,
      `Bridge snapshot circuit: ${bridgeSnapshotCounterText(bridgeDiag.snapshotPerformance?.circuits, [['opens','opened'],['blocked','blocked'],['recoveries','recoveries']])}`,""",
    'snapshot attribution diagnostic lines',
)

manager = RUNTIME / 'bridge-manager.cjs'
replace_once(manager, f"const PRODUCT_VERSION = '{OLD_VERSION}';", f"const PRODUCT_VERSION = '{NEW_VERSION}';", 'manager product version')
replace_once(manager, f"const BUNDLED_ENGINE_VERSION = '{OLD_ENGINE_VERSION}';", f"const BUNDLED_ENGINE_VERSION = '{NEW_ENGINE_VERSION}';", 'manager bundled engine version')
new_engine_sha = sha256_file(engine)
manager_text = read(manager)
old_sha_prefix = "const BUNDLED_ENGINE_SHA256 = '"
start = manager_text.find(old_sha_prefix)
if start < 0:
    raise SystemExit('manager bundled engine sha marker missing')
end = manager_text.find("';", start + len(old_sha_prefix))
if end < 0:
    raise SystemExit('manager bundled engine sha terminator missing')
manager_text = manager_text[:start] + old_sha_prefix + new_engine_sha + manager_text[end:]
write(manager, manager_text)

# Keep existing semantic regressions version-current. P15 remains the recovery
# contract even though the engine now gains measurement-only telemetry.
for test_name in ['p11-cache-fidelity.cjs', 'p13-cache-provenance-diagnostics.cjs', 'p15-runtime-recovery-fidelity.cjs']:
    test_path = TESTS / test_name
    replace_all_required(test_path, OLD_VERSION, NEW_VERSION, f'{test_name} product version', minimum=1)
    replace_all_required(test_path, OLD_ENGINE_VERSION, NEW_ENGINE_VERSION, f'{test_name} engine version', minimum=1)

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

# Replace the mutable development-memory section while preserving the permanent
# operating contract below it.
guidelines = read(GUIDELINES)
start_marker = '## Current development memory\n'
end_marker = '## 0. Source of truth\n'
if guidelines.count(start_marker) != 1 or guidelines.count(end_marker) != 1:
    raise SystemExit('guidelines development-memory section markers are invalid')
a = guidelines.index(start_marker)
b = guidelines.index(end_marker, a)
new_memory = """## Current development memory

Last verified real-device baseline: `3.0.0-alpha.5.54 — Runtime Recovery Fidelity`.

Verified from the 5.54 device diagnostic:

- Stable Readiness recovered correctly: cumulative local persist history remained visible while `active 0` allowed `READY`.
- Bridge Engine `1.6.8` and Bridge Manager `1.2.6` remained healthy before this attribution release.
- Cache provenance remained unchanged: observed cache rows had provider Read values while Write stayed unknown rather than fabricated.
- The sampled visibility refresh took about 47.3s, including about 40.5s in plugin `snapshot`; a timer refresh sample reached about 87s.
- Bridge cumulative telemetry showed stale fallbacks and circuit recoveries during the session, but the 5.54 diagnostics could not attribute those events to a specific snapshot or CLI wait.
- UI render remained comparatively small, so the next evidence target is the Bridge snapshot/data path rather than render behavior.

Current release implementation: `3.0.0-alpha.5.55 — Snapshot Performance Attribution`.

5.55 release contract:

- Bridge Engine becomes `1.6.9`; Bridge Manager remains `1.2.6`.
- Measure existing work only: no new network request, CLI command, cache scan, or polling loop is added.
- Attribute top-level snapshot waits for organizations, DevPass status, usage scopes, analytics scopes, and runway.
- Populate existing module `durationMs` telemetry so `Bridge module duration` is no longer structurally empty when a measured task exists.
- Separate per-snapshot CLI queue wait from CLI execution time using sanitized operation-family labels only; never persist raw arguments, org IDs, tokens, headers, or command output.
- Report per-snapshot cache/circuit deltas while preserving existing cumulative diagnostics.
- Keep CLI concurrency, cache TTLs, command timeout, snapshot payload semantics, cache parser `provider-usage-v3`, recovery fidelity, and updater behavior unchanged.

Next candidate after the 5.55 real-device diagnostic: `3.0.0-alpha.5.56 — Snapshot Performance Repair`, with the repair target chosen only from 5.55 evidence.

"""
write(GUIDELINES, guidelines[:a] + new_memory + guidelines[b:])
sync_guidelines_release_state()

print(
    f'prepared Local Usage Dashboard {NEW_VERSION} '
    f'(engine {NEW_ENGINE_VERSION}, manager {MANAGER_VERSION}) with snapshot performance attribution v1'
)
