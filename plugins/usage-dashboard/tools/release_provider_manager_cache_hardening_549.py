from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
TESTS = ROOT / 'tests'
RUNTIME = ROOT / 'runtime'
OLD_VERSION = '3.0.0-alpha.5.48'
NEW_VERSION = '3.0.0-alpha.5.49'


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


def replace_block(path: Path, start: str, end: str, replacement: str, label: str) -> None:
    text = read(path)
    start_at = text.find(start)
    if start_at < 0:
        raise SystemExit(f'{label}: start marker missing in {path}')
    end_at = text.find(end, start_at + len(start))
    if end_at < 0:
        raise SystemExit(f'{label}: end marker missing in {path}')
    write(path, text[:start_at] + replacement + text[end_at:])


# 1) Product version only. Engine/Manager implementation versions and contracts stay frozen.
core = SRC / '00-runtime-core.part.js'
replace_all_required(core, OLD_VERSION, NEW_VERSION, 'core product version', minimum=2)
replace_once(
    core,
    "  const PROVIDER_MANAGER_CACHE_TIMEOUT_MS = 800;\n  const PROVIDER_MANAGER_CACHE_RETRY_MS = 60000;\n  const PROVIDER_MANAGER_CACHE_MAX_ROWS = 250;",
    """  const PROVIDER_MANAGER_CACHE_TIMEOUT_MS = 1200;
  const PROVIDER_MANAGER_CACHE_RETRY_MS = 60000;
  const PROVIDER_MANAGER_CACHE_MAX_BACKOFF_MS = 300000;
  const PROVIDER_MANAGER_CACHE_SIDE_PROBE_DELAY_MS = 250;
  const PROVIDER_MANAGER_CACHE_MAX_ROWS = 250;""",
    'Provider Manager cache hardening constants',
)
replace_once(
    core,
    """  const providerManagerCacheRuntime = {
    status:'idle', supported:false, source:'', lastError:'', lastRequestedAt:null, lastResponseAt:null,
    responseRows:0, responseTokenRows:0, matched:0, exact:0, strong:0, ambiguous:0, unmatched:0
  };""",
    """  const providerManagerCacheRuntime = {
    status:'idle', supported:false, source:'', lastError:'', lastRequestedAt:null, lastResponseAt:null,
    lastCompletedAt:null, lastDurationMs:null, inFlight:false, stale:false, failures:0,
    circuitState:'closed', openUntil:0, patches:0, staleDrops:0, coalesced:0,
    responseRows:0, responseTokenRows:0, matched:0, exact:0, strong:0, ambiguous:0, unmatched:0
  };""",
    'Provider Manager cache runtime hardening state',
)
replace_once(
    core,
    "  let providerManagerCacheListenerInstalled = false;",
    """  let providerManagerCacheListenerInstalled = false;
  let providerManagerCacheProbeTimer = null;
  let providerManagerCacheProbePromise = null;""",
    'Provider Manager cache side probe handles',
)

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
    raise SystemExit('bridge engine must stay frozen at 1.6.5')
if manifest['components']['bridgeManager']['version'] != '1.2.6':
    raise SystemExit('bridge manager must stay frozen at 1.2.6')
if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('snapshot/recent-request contracts must stay frozen at v1')
write(manifest_path, json.dumps(manifest, indent=2) + '\n')

# 2) Harden the optional Provider Manager probe. Failures keep the last good cache
# data, open a bounded circuit, and never throw into the primary refresh path.
bridge = SRC / '20-bridge-io.part.js'
new_fetch = r'''  async function fetchProviderManagerCacheObservability() {
    const runtime = providerManagerCacheRuntime;
    const now = Date.now();
    if (!providerManagerCacheListener()) return {ok:false,status:'unavailable',rows:[]};
    if (runtime.circuitState === 'open' && now < Number(runtime.openUntil || 0)) {
      return {ok:false,status:'circuit-open',error:runtime.lastError || 'Provider Manager cache IPC circuit open',rows:[]};
    }
    if (runtime.circuitState === 'open') runtime.circuitState = 'half-open';
    runtime.lastRequestedAt = now;
    runtime.status = 'probing';
    runtime.inFlight = true;
    const startedAt = typeof performance?.now === 'function' ? performance.now() : Date.now();
    const id = providerManagerCacheRequestId();
    const result = await new Promise(resolve => {
      const timer = setTimeout(() => {
        providerManagerCachePending.delete(id);
        resolve({ok:false,status:'timeout',error:'Provider Manager cache IPC timeout',rows:[]});
      }, PROVIDER_MANAGER_CACHE_TIMEOUT_MS);
      providerManagerCachePending.set(id, {resolve,timer});
      try {
        Risuai.postPluginChannelMessage(PROVIDER_MANAGER_PLUGIN, PROVIDER_MANAGER_REQUEST_CHANNEL, {
          id,
          op:'cacheObservability',
          sender:{pluginName:'local_usage_dashboard_modular',instanceId:PROVIDER_MANAGER_CACHE_INSTANCE_ID},
          payload:{since:Date.now() - 24 * 60 * 60 * 1000,limit:PROVIDER_MANAGER_CACHE_MAX_ROWS},
          meta:{protocol:'cache-observability-v1',version:PROVIDER_MANAGER_CACHE_IPC_VERSION,clientVersion:VERSION}
        });
      } catch (error) {
        clearTimeout(timer);
        providerManagerCachePending.delete(id);
        resolve({ok:false,status:'blocked',error:error?.message || String(error),rows:[]});
      }
    });
    const endedAt = typeof performance?.now === 'function' ? performance.now() : Date.now();
    runtime.lastDurationMs = Math.max(0, Math.round(endedAt - startedAt));
    runtime.lastCompletedAt = Date.now();
    runtime.inFlight = false;
    if (!result?.ok) {
      runtime.status = String(result?.status || 'error');
      runtime.lastError = String(result?.error || '');
      runtime.failures = Number(runtime.failures || 0) + 1;
      runtime.stale = runtime.supported === true;
      const exponent = Math.max(0, runtime.failures - 1);
      const backoffMs = Math.min(PROVIDER_MANAGER_CACHE_MAX_BACKOFF_MS, PROVIDER_MANAGER_CACHE_RETRY_MS * (2 ** exponent));
      runtime.circuitState = 'open';
      runtime.openUntil = Date.now() + backoffMs;
      return result;
    }
    runtime.status = 'ready';
    runtime.supported = true;
    runtime.stale = false;
    runtime.failures = 0;
    runtime.circuitState = 'closed';
    runtime.openUntil = 0;
    runtime.source = String(result.source || 'provider-manager');
    runtime.lastResponseAt = Date.now();
    runtime.responseRows = result.rows.length;
    runtime.responseTokenRows = result.rows.filter(row => providerManagerCacheMetricKnown(row?.usage)).length;
    runtime.lastError = '';
    return result;
  }

'''
replace_block(
    bridge,
    '  async function fetchProviderManagerCacheObservability() {',
    '  function providerManagerCacheName(value) {',
    new_fetch,
    'Provider Manager cache probe function',
)
bridge_text = read(bridge)
if 'function scheduleProviderManagerCacheEnrichment(' in bridge_text:
    raise SystemExit('Provider Manager side enrichment scheduler already present')
side_probe = r'''

  function providerManagerCacheCircuitBlocked() {
    const runtime = providerManagerCacheRuntime;
    return runtime.circuitState === 'open' && Date.now() < Number(runtime.openUntil || 0);
  }

  function scheduleProviderManagerCacheEnrichment(targetData = state?.data, epoch = runtimeEpoch, lifecycleGeneration = bridgeLifecycleRuntime.generation) {
    if (!targetData || runtimeDisposed || !canBridgeRefresh()) return false;
    if (providerManagerCacheCircuitBlocked()) return false;
    if (providerManagerCacheProbeTimer || providerManagerCacheProbePromise) {
      providerManagerCacheRuntime.coalesced = Number(providerManagerCacheRuntime.coalesced || 0) + 1;
      return false;
    }
    providerManagerCacheProbeTimer = setTimeout(() => {
      providerManagerCacheProbeTimer = null;
      if (!runtimeIsCurrent(epoch) || !lifecycleRefreshIsCurrent(lifecycleGeneration) || state.data !== targetData) {
        providerManagerCacheRuntime.staleDrops = Number(providerManagerCacheRuntime.staleDrops || 0) + 1;
        return;
      }
      providerManagerCacheProbePromise = (async () => {
        const payload = await fetchProviderManagerCacheObservability();
        if (!runtimeIsCurrent(epoch) || !lifecycleRefreshIsCurrent(lifecycleGeneration) || state.data !== targetData) {
          providerManagerCacheRuntime.staleDrops = Number(providerManagerCacheRuntime.staleDrops || 0) + 1;
          return;
        }
        if (payload?.ok) {
          enrichDataWithProviderManagerCache(targetData, payload);
          collectRecentRequestLedger(targetData);
          providerManagerCacheRuntime.patches = Number(providerManagerCacheRuntime.patches || 0) + 1;
        }
        schedulePanelRender(false);
      })().catch(error => {
        providerManagerCacheRuntime.status = 'error';
        providerManagerCacheRuntime.lastError = error?.message || String(error);
        providerManagerCacheRuntime.failures = Number(providerManagerCacheRuntime.failures || 0) + 1;
        providerManagerCacheRuntime.circuitState = 'open';
        providerManagerCacheRuntime.openUntil = Date.now() + PROVIDER_MANAGER_CACHE_RETRY_MS;
      }).finally(() => {
        providerManagerCacheRuntime.inFlight = false;
        providerManagerCacheProbePromise = null;
      });
    }, PROVIDER_MANAGER_CACHE_SIDE_PROBE_DELAY_MS);
    return true;
  }
'''
write(bridge, bridge_text.rstrip() + side_probe + '\n')

# 3) Primary refresh no longer awaits or times Provider Manager. It renders and
# schedules the next primary refresh first, then launches optional enrichment.
refresh = SRC / '30-refresh-runtime.part.js'
replace_once(
    refresh,
    "        const providerManagerCachePromise = fetchProviderManagerCacheObservability();\n        const snapshot = await fetchSnapshot();",
    "        const snapshot = await fetchSnapshot();",
    'remove Provider Manager promise from primary refresh',
)
replace_once(
    refresh,
    """        refreshPhaseStarted = refreshPhaseNow();
        state.data = applyObservedToday(snapshot);
        finishRefreshPhase('normalize-ledger', refreshPhaseStarted);
        refreshPhaseStarted = refreshPhaseNow();
        const providerManagerCache = await providerManagerCachePromise;
        enrichDataWithProviderManagerCache(state.data, providerManagerCache);
        finishRefreshPhase('provider-cache', refreshPhaseStarted);""",
    """        refreshPhaseStarted = refreshPhaseNow();
        state.data = applyObservedToday(snapshot);
        finishRefreshPhase('normalize-ledger', refreshPhaseStarted);""",
    'remove Provider Manager await/enrichment phase from primary refresh',
)
replace_once(
    refresh,
    """        scheduleRefresh();
        schedulePanelRender(false);
      } catch (e) {""",
    """        scheduleRefresh();
        schedulePanelRender(false);
        scheduleProviderManagerCacheEnrichment(state.data, refreshEpoch, refreshLifecycleGeneration);
      } catch (e) {""",
    'schedule optional Provider Manager enrichment after primary render',
)

# 4) Diagnostics expose the optional integration separately from Stable readiness.
diag = SRC / '40-diagnostics.part.js'
replace_once(
    diag,
    """  function providerManagerCacheDiagnosticText() {
    const r = providerManagerCacheRuntime;
    return `${r.status || 'idle'} · v${PROVIDER_MANAGER_CACHE_IPC_VERSION} · source ${r.source || '—'} · rows ${Number(r.responseRows || 0)} · token rows ${Number(r.responseTokenRows || 0)} · matched ${Number(r.matched || 0)} (exact ${Number(r.exact || 0)} / strong ${Number(r.strong || 0)}) · ambiguous ${Number(r.ambiguous || 0)} · unmatched ${Number(r.unmatched || 0)} · error ${r.lastError || 'none'}`;
  }""",
    """  function providerManagerCacheDiagnosticText() {
    const r = providerManagerCacheRuntime;
    const circuit = r.circuitState || 'closed';
    const retrySeconds = circuit === 'open' && num(r.openUntil) ? Math.max(0, Math.ceil((Number(r.openUntil) - Date.now()) / 1000)) : null;
    const integration = r.status === 'ready' ? 'ready' : r.inFlight ? 'probing' : 'degraded';
    return `${r.status || 'idle'} · v${PROVIDER_MANAGER_CACHE_IPC_VERSION} · optional ${integration} · probe ${r.inFlight ? 'running' : 'idle'} · duration ${num(r.lastDurationMs) ? `${Number(r.lastDurationMs)}ms` : '—'} · circuit ${circuit}${retrySeconds !== null ? ` · next ${retrySeconds}s` : ''} · source ${r.source || '—'}${r.stale ? ' stale' : ''} · rows ${Number(r.responseRows || 0)} · token rows ${Number(r.responseTokenRows || 0)} · matched ${Number(r.matched || 0)} (exact ${Number(r.exact || 0)} / strong ${Number(r.strong || 0)}) · ambiguous ${Number(r.ambiguous || 0)} · unmatched ${Number(r.unmatched || 0)} · patches ${Number(r.patches || 0)} · stale drops ${Number(r.staleDrops || 0)} · coalesced ${Number(r.coalesced || 0)} · error ${r.lastError || 'none'}`;
  }""",
    'Provider Manager cache hardening diagnostics',
)
replace_once(
    diag,
    "      `Provider Manager cache IPC: ${providerManagerCacheDiagnosticText()}`,\n      `Cache semantics:",
    "      `Provider Manager cache IPC: ${providerManagerCacheDiagnosticText()}`,\n      `Optional integrations: Provider cache ${providerManagerCacheRuntime.status === 'ready' ? 'ready' : providerManagerCacheRuntime.inFlight ? 'probing' : 'degraded'} · primary refresh independent`,\n      `Cache semantics:",
    'optional Provider Manager integration diagnostic line',
)

# 5) Dispose timers/pending requests so hot reloads cannot retain cache probes.
bootstrap = SRC / '90-bootstrap.part.js'
replace_once(
    bootstrap,
    """      if(resetSyncTimer)clearTimeout(resetSyncTimer);
      cancelPanelRender();""",
    """      if(resetSyncTimer)clearTimeout(resetSyncTimer);
      if(providerManagerCacheProbeTimer){clearTimeout(providerManagerCacheProbeTimer);providerManagerCacheProbeTimer=null;}
      for(const pending of providerManagerCachePending.values()){try{clearTimeout(pending.timer);pending.resolve({ok:false,status:'disposed',error:'runtime disposed',rows:[]});}catch(_){}}
      providerManagerCachePending.clear();
      providerManagerCacheProbePromise=null;
      providerManagerCacheRuntime.inFlight=false;
      cancelPanelRender();""",
    'Provider Manager cache probe disposal',
)

# 6) P8 remains the base IPC contract, while P9 owns hardening semantics.
p8 = TESTS / 'p8-provider-manager-cache-ipc.cjs'
replace_all_required(p8, OLD_VERSION, NEW_VERSION, 'P8 current product version', minimum=4)
replace_once(
    p8,
    """assert.ok(refresh.includes('const providerManagerCachePromise = fetchProviderManagerCacheObservability();'));
assert.ok(refresh.includes(\"finishRefreshPhase('provider-cache'\"));
assert.ok(refresh.indexOf('enrichDataWithProviderManagerCache(state.data, providerManagerCache);') < refresh.indexOf('collectRecentRequestLedger(state.data);'), 'PM enrichment must happen before ledger merge');""",
    """assert.ok(bridge.includes('function fetchProviderManagerCacheObservability()'));
assert.ok(bridge.includes('function scheduleProviderManagerCacheEnrichment('));
assert.ok(refresh.includes('scheduleProviderManagerCacheEnrichment(state.data, refreshEpoch, refreshLifecycleGeneration);'));
assert.ok(!refresh.includes('const providerManagerCachePromise = fetchProviderManagerCacheObservability();'));
assert.ok(!refresh.includes(\"finishRefreshPhase('provider-cache'\"));""",
    'P8 async enrichment contract',
)

print('Prepared Local Usage Dashboard 3.0.0-alpha.5.49 Cache IPC Hardening candidate.')
