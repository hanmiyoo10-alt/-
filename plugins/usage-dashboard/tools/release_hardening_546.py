from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
TESTS = ROOT / 'tests'
RUNTIME = ROOT / 'runtime'
OLD_VERSION = '3.0.0-alpha.5.45'
NEW_VERSION = '3.0.0-alpha.5.46'


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


# 1) Product version only. Runtime contracts and component implementation versions stay frozen.
core = SRC / '00-runtime-core.part.js'
replace_all_required(core, OLD_VERSION, NEW_VERSION, 'core product version', minimum=2)

manager = RUNTIME / 'bridge-manager.cjs'
replace_once(manager, f"const PRODUCT_VERSION = '{OLD_VERSION}';", f"const PRODUCT_VERSION = '{NEW_VERSION}';", 'manager product version')

manifest_path = RUNTIME / 'product-manifest.json'
manifest = json.loads(read(manifest_path))
if manifest.get('productVersion') != OLD_VERSION:
    raise SystemExit(f"product manifest drifted: {manifest.get('productVersion')}")
manifest['productVersion'] = NEW_VERSION
manifest['components']['plugin']['version'] = NEW_VERSION
manifest['components']['bridgeManager']['productVersion'] = NEW_VERSION
manifest['components']['bridgeManager']['sha256'] = hashlib.sha256(read(manager).encode()).hexdigest()
if manifest['components']['bridge']['requiredVersion'] != '1.6.5':
    raise SystemExit('bridge engine contract must stay frozen at 1.6.5')
if manifest['components']['bridgeManager']['version'] != '1.2.6':
    raise SystemExit('bridge manager contract must stay frozen at 1.2.6')
if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('snapshot/recent-request contracts must stay frozen at v1')
write(manifest_path, json.dumps(manifest, indent=2) + '\n')

# 2) Ephemeral refresh phase telemetry. No persisted state/schema changes.
core_text = read(core)
old_tail = "lastRenderSpikeRefreshOverlap:false,lastRenderSpikeBreakdown:null};"
new_tail = "lastRenderSpikeRefreshOverlap:false,lastRenderSpikeBreakdown:null,lastRefreshPhases:null,lastRefreshSlowestPhase:'',lastRefreshSlowestPhaseMs:null};"
if old_tail not in core_text:
    raise SystemExit('performance runtime tail drifted')
write(core, core_text.replace(old_tail, new_tail, 1))

refresh = SRC / '30-refresh-runtime.part.js'
refresh_text = read(refresh)
needle = "    const startedPerf = typeof performance?.now === 'function' ? performance.now() : 0;\n    performanceRuntime.activeRefreshStartedPerf = startedPerf;"
insert = "    const startedPerf = typeof performance?.now === 'function' ? performance.now() : 0;\n    const refreshPhaseDurations = Object.create(null);\n    const refreshPhaseNow = () => typeof performance?.now === 'function' ? performance.now() : Date.now();\n    const finishRefreshPhase = (name, phaseStarted) => {\n      const ended = refreshPhaseNow();\n      refreshPhaseDurations[String(name)] = Math.max(0, roundPerfMs(ended - Number(phaseStarted || ended)) || 0);\n      return ended;\n    };\n    performanceRuntime.activeRefreshStartedPerf = startedPerf;"
if needle not in refresh_text:
    raise SystemExit('refresh phase timer insertion point drifted')
refresh_text = refresh_text.replace(needle, insert, 1)

phase_replacements = [
    ("        const managerStatus = await fetchBridgeManagerStatus(reason !== 'timer');",
     "        let refreshPhaseStarted = refreshPhaseNow();\n        const managerStatus = await fetchBridgeManagerStatus(reason !== 'timer');\n        finishRefreshPhase('manager-probe', refreshPhaseStarted);"),
    ("        const managerSynced = await syncBridgeManagerIfNeeded(managerStatus);",
     "        refreshPhaseStarted = refreshPhaseNow();\n        const managerSynced = await syncBridgeManagerIfNeeded(managerStatus);\n        finishRefreshPhase('manager-sync', refreshPhaseStarted);"),
    ("        const managerAdopted = await adoptBridgeEngineIfNeeded(managerSynced);",
     "        refreshPhaseStarted = refreshPhaseNow();\n        const managerAdopted = await adoptBridgeEngineIfNeeded(managerSynced);\n        finishRefreshPhase('engine-adopt', refreshPhaseStarted);"),
    ("        const managerRuntime = await syncBridgeEngineBundleIfNeeded(managerAdopted);",
     "        refreshPhaseStarted = refreshPhaseNow();\n        const managerRuntime = await syncBridgeEngineBundleIfNeeded(managerAdopted);\n        finishRefreshPhase('engine-sync', refreshPhaseStarted);"),
    ("        const snapshot = await fetchSnapshot();",
     "        refreshPhaseStarted = refreshPhaseNow();\n        const snapshot = await fetchSnapshot();\n        finishRefreshPhase('snapshot', refreshPhaseStarted);"),
    ("        state.data = applyObservedToday(snapshot);",
     "        refreshPhaseStarted = refreshPhaseNow();\n        state.data = applyObservedToday(snapshot);\n        finishRefreshPhase('normalize-ledger', refreshPhaseStarted);"),
    ("        await persistRefreshState('refresh-success-persist');",
     "        refreshPhaseStarted = refreshPhaseNow();\n        await persistRefreshState('refresh-success-persist');\n        finishRefreshPhase('persist', refreshPhaseStarted);"),
    ("        await renderRefreshWidget(reason, 'refresh-success-render');",
     "        refreshPhaseStarted = refreshPhaseNow();\n        await renderRefreshWidget(reason, 'refresh-success-render');\n        finishRefreshPhase('widget-render', refreshPhaseStarted);"),
]
for old, new in phase_replacements:
    if refresh_text.count(old) != 1:
        raise SystemExit(f'refresh phase target drifted: {old}')
    refresh_text = refresh_text.replace(old, new, 1)

final_needle = "      const attributionStatus = state.lastRefreshReason === reason"
final_insert = "      performanceRuntime.lastRefreshPhases = {...refreshPhaseDurations};\n      const slowestRefreshPhase = Object.entries(refreshPhaseDurations).sort((a,b) => Number(b[1] || 0) - Number(a[1] || 0))[0] || null;\n      performanceRuntime.lastRefreshSlowestPhase = slowestRefreshPhase ? String(slowestRefreshPhase[0]) : '';\n      performanceRuntime.lastRefreshSlowestPhaseMs = slowestRefreshPhase ? Number(slowestRefreshPhase[1]) : null;\n      const attributionStatus = state.lastRefreshReason === reason"
if final_needle not in refresh_text:
    raise SystemExit('refresh final attribution point drifted')
refresh_text = refresh_text.replace(final_needle, final_insert, 1)
write(refresh, refresh_text)

# 3) Preserve raw request status and add non-destructive outcome taxonomy.
ledger = SRC / '14-request-ledger.part.js'
ledger_text = read(ledger)
return_needle = "        requestNumber,\n        success,\n        errorCode:success ? '' : String(errorCodeRaw ?? ''),"
return_repl = "        requestNumber,\n        requestStatus:status,\n        success,\n        errorCode:success ? '' : String(errorCodeRaw ?? ''),"
if return_needle not in ledger_text:
    raise SystemExit('request normalized return drifted')
ledger_text = ledger_text.replace(return_needle, return_repl, 1)

cap_needle = "\n  function requestLedgerCapabilities(rows) {"
taxonomy = """
  function requestOutcomeCategory(row) {
    const status = String(row?.requestStatus || '').trim().toLowerCase();
    if (['cancelled','canceled','aborted','abort','cancel'].includes(status)) return 'cancelled';
    if (['error','failed','failure','upstream_error','gateway_error','timeout'].includes(status) || row?.success === false) return 'error';
    if (['success','ok','completed','complete','succeeded'].includes(status) || row?.success === true) return 'success';
    return 'unknown';
  }

  function requestOutcomeStats(rows) {
    const stats = {rows:0,success:0,error:0,cancelled:0,unknown:0};
    for (const row of (Array.isArray(rows) ? rows : [])) {
      const outcome = requestOutcomeCategory(row);
      stats.rows += 1;
      stats[outcome] += 1;
    }
    return stats;
  }
"""
if cap_needle not in ledger_text:
    raise SystemExit('request taxonomy insertion point drifted')
ledger_text = ledger_text.replace(cap_needle, taxonomy + cap_needle, 1)

merge_needle = "          requestNumber:String(row.requestNumber || current?.requestNumber || ''),\n          errorCode:String(row.errorCode || current?.errorCode || ''),"
merge_repl = "          requestNumber:String(row.requestNumber || current?.requestNumber || ''),\n          requestStatus:String(row.requestStatus || current?.requestStatus || ''),\n          errorCode:String(row.errorCode || current?.errorCode || ''),"
if merge_needle not in ledger_text:
    raise SystemExit('ledger status merge point drifted')
ledger_text = ledger_text.replace(merge_needle, merge_repl, 1)
write(ledger, ledger_text)

# 4) Stable readiness + hardening diagnostics.
diag = SRC / '40-diagnostics.part.js'
diag_text = read(diag)
diag_marker = "\n  function diagText() {"
helpers = """
  function refreshPhaseTimingText(phases = performanceRuntime.lastRefreshPhases) {
    const rows = Object.entries(phases && typeof phases === 'object' ? phases : {})
      .filter(([,value]) => num(value))
      .sort((a,b) => Number(b[1]) - Number(a[1]));
    return rows.length ? rows.map(([name,value]) => `${name} ${roundPerfMs(value)}ms`).join(' · ') : '—';
  }

  function stableReadinessSnapshot(bridgeDiag, runtimeBridge) {
    const blockers = [];
    const lifecycle = bridgeLifecycleMode();
    if (lifecycle !== 'live') blockers.push(`lifecycle ${lifecycle}`);
    if (bridgeDiag?.compatible !== true) blockers.push(`bridge compatibility ${bridgeDiag?.compatible === false ? 'no' : 'unknown'}`);
    if (String(bridgeDiag?.version || '') !== REQUIRED_BRIDGE_VERSION) blockers.push(`engine ${bridgeDiag?.version || '—'}`);
    if (!runtimeBridge?.managerInstalled) blockers.push('manager absent');
    if (String(runtimeBridge?.managerVersion || '') !== '1.2.6') blockers.push(`manager ${runtimeBridge?.managerVersion || '—'}`);
    const managerProduct = String(state.bridgeManagerRuntime?.productVersion || '');
    const managerSync = String(state.bridgeManagerSyncedProductVersion || '');
    if (managerProduct && managerProduct !== VERSION) blockers.push(`manager product ${managerProduct}`);
    if (managerSync && managerSync !== VERSION) blockers.push(`manager sync ${managerSync}`);
    if (Number(localRuntimeErrors.count || 0) > 0) blockers.push(`local errors ${Number(localRuntimeErrors.count || 0)}`);
    if (Number(state.consecutiveFailures || 0) > 0) blockers.push(`refresh failures ${Number(state.consecutiveFailures || 0)}`);
    const updaterCompatible = /^3\.0\.0-alpha\.5\.(?:4[6-9]|[5-9]\d|\d{3,})$/.test(VERSION) || /^3\.[1-9]\d*\.\d+$/.test(VERSION);
    if (!updaterCompatible) blockers.push('updater version ordering');
    return {ready:blockers.length === 0, blockers, updaterCompatible};
  }
"""
if diag_marker not in diag_text:
    raise SystemExit('diagnostic helper insertion point drifted')
diag_text = diag_text.replace(diag_marker, helpers + diag_marker, 1)

diag_context_needle = "    const diagTierFidelity = requestServiceTierStats(diagDevpassRows);\n    const diagAccount = d.devpassAccount && typeof d.devpassAccount === 'object' ? d.devpassAccount : null;"
diag_context_repl = "    const diagTierFidelity = requestServiceTierStats(diagDevpassRows);\n    const diagOutcome = requestOutcomeStats(diagDevpassRows);\n    const stableReadiness = stableReadinessSnapshot(bridgeDiag, runtimeBridge);\n    const diagAccount = d.devpassAccount && typeof d.devpassAccount === 'object' ? d.devpassAccount : null;"
if diag_context_needle not in diag_text:
    raise SystemExit('diagnostic context drifted')
diag_text = diag_text.replace(diag_context_needle, diag_context_repl, 1)

schema_needle = "      `Schema: snapshot v${SNAPSHOT_SCHEMA_VERSION} · recent-request v${RECENT_REQUEST_SCHEMA_VERSION}`,\n      `Health: ${h.status || '—'}`,"
schema_repl = "      `Schema: snapshot v${SNAPSHOT_SCHEMA_VERSION} · recent-request v${RECENT_REQUEST_SCHEMA_VERSION}`,\n      `Stable readiness: ${stableReadiness.ready ? 'READY' : 'BLOCKED'} · updater ${stableReadiness.updaterCompatible ? 'compatible' : 'incompatible'} · blockers ${stableReadiness.blockers.join(', ') || 'none'}`,\n      `Stable contract: engine ${REQUIRED_BRIDGE_VERSION} · manager 1.2.6 · snapshot v${SNAPSHOT_SCHEMA_VERSION} · recent-request v${RECENT_REQUEST_SCHEMA_VERSION} · state v3`,\n      `Health: ${h.status || '—'}`,"
if schema_needle not in diag_text:
    raise SystemExit('stable readiness diagnostic insertion point drifted')
diag_text = diag_text.replace(schema_needle, schema_repl, 1)

service_needle = "      `Service tier source fields: requested ${diagTierFidelity.requestedSources.join(',') || 'none'} · served ${diagTierFidelity.servedSources.join(',') || 'none'}`,"
service_repl = service_needle + "\n      `Request outcome taxonomy: success ${diagOutcome.success} · error ${diagOutcome.error} · cancelled ${diagOutcome.cancelled} · unknown ${diagOutcome.unknown} · rows ${diagOutcome.rows}`,"
if service_needle not in diag_text:
    raise SystemExit('request outcome diagnostic insertion point drifted')
diag_text = diag_text.replace(service_needle, service_repl, 1)

duration_needle = "      `Duration: ${num(state.lastSyncDurationMs) ? `${state.lastSyncDurationMs}ms` : '—'}`,\n      `Reason: ${state.lastRefreshReason || '—'}`,"
duration_repl = "      `Duration: ${num(state.lastSyncDurationMs) ? `${state.lastSyncDurationMs}ms` : '—'}`,\n      `Refresh phase duration: ${refreshPhaseTimingText()}`,\n      `Refresh slowest phase: ${performanceRuntime.lastRefreshSlowestPhase || '—'} · ${num(performanceRuntime.lastRefreshSlowestPhaseMs) ? `${roundPerfMs(performanceRuntime.lastRefreshSlowestPhaseMs)}ms` : '—'}`,\n      `Reason: ${state.lastRefreshReason || '—'}`,"
if duration_needle not in diag_text:
    raise SystemExit('refresh phase diagnostic insertion point drifted')
diag_text = diag_text.replace(duration_needle, duration_repl, 1)
write(diag, diag_text)

# 5) Forward version-specific tests from 5.45 to 5.46.
for path in TESTS.rglob('*.cjs'):
    text = read(path)
    if OLD_VERSION in text:
        write(path, text.replace(OLD_VERSION, NEW_VERSION))

# Stable release target is 3.0.1 because PocketRisu's current updater ordering cannot
# discover 3.0.0 from the alpha.5.x train. Keep structural gate ready for both.
structural = TESTS / 'p5-structural-parity.cjs'
structural_text = read(structural)
if NEW_VERSION not in structural_text:
    raise SystemExit('structural forward-version gate did not move to 5.46')

# 6) Dedicated hardening regression: semantic taxonomy + telemetry/release contract.
hardening = TESTS / 'p6-release-hardening.cjs'
write(hardening, r'''const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));

assert.match(source, /^\/\/@version 3\.0\.0-alpha\.5\.46$/m);
assert.ok(source.includes("const VERSION = '3.0.0-alpha.5.46';"));
assert.ok(source.includes("const REQUIRED_BRIDGE_VERSION = '1.6.5';"));
assert.ok(engine.includes("const VERSION = '1.6.5';"));
assert.ok(manager.includes("const MANAGER_VERSION = '1.2.6';"));
assert.ok(manager.includes("const PRODUCT_VERSION = '3.0.0-alpha.5.46';"));
assert.equal(manifest.productVersion, '3.0.0-alpha.5.46');
assert.equal(manifest.components.bridge.requiredVersion, '1.6.5');
assert.equal(manifest.components.bridgeManager.version, '1.2.6');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});
for (const marker of [
  'lastRefreshPhases',
  "finishRefreshPhase('snapshot'",
  'Refresh phase duration:',
  'Refresh slowest phase:',
  'requestStatus:status',
  'function requestOutcomeCategory(row)',
  'Request outcome taxonomy:',
  'function stableReadinessSnapshot(bridgeDiag, runtimeBridge)',
  'Stable readiness:',
  'Stable contract:',
]) assert.ok(source.includes(marker), `missing release hardening marker: ${marker}`);

const start = source.indexOf('  function requestOutcomeCategory(row) {');
const end = source.indexOf('\n\n  function requestOutcomeStats(rows) {', start);
assert.ok(start >= 0 && end > start, 'request outcome helper not extractable');
const context = {};
vm.createContext(context);
vm.runInContext(`${source.slice(start, end)}\nthis.outcome=requestOutcomeCategory;`, context);
assert.equal(context.outcome({requestStatus:'cancelled', success:true}), 'cancelled');
assert.equal(context.outcome({requestStatus:'timeout', success:true}), 'error');
assert.equal(context.outcome({requestStatus:'completed', success:false}), 'error');
assert.equal(context.outcome({requestStatus:'', success:true}), 'success');
assert.equal(context.outcome({requestStatus:'', success:null}), 'unknown');

// Hardening taxonomy is observational: existing UI error semantics remain untouched.
assert.ok(source.includes("const success = explicitSuccess !== null ? explicitSuccess : !(failedByStatus || hasErrorObject || (statusCode !== null && statusCode >= 400));"));
console.log('usage-dashboard P6 release hardening: OK · 5.46 stable gate + telemetry + outcome taxonomy');
''')

print(f'prepared Local Usage Dashboard {NEW_VERSION} release hardening; engine/manager/schema frozen')
