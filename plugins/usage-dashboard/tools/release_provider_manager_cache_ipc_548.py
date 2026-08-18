from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
TESTS = ROOT / 'tests'
RUNTIME = ROOT / 'runtime'
OLD_VERSION = '3.0.0-alpha.5.47'
NEW_VERSION = '3.0.0-alpha.5.48'


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


# 1) Version + mutual IPC declaration. Engine/Manager implementation versions and
# snapshot/recent-request contracts remain frozen.
core = SRC / '00-runtime-core.part.js'
replace_all_required(core, OLD_VERSION, NEW_VERSION, 'core product version', minimum=2)
replace_once(
    core,
    '//@update-url https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-usage-dashboard/plugins/usage-dashboard/latest.js\n\n(async () => {',
    '//@update-url https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-usage-dashboard/plugins/usage-dashboard/latest.js\n//@allowed-ipc provider-manager\n\n(async () => {',
    'dashboard Provider Manager IPC whitelist',
)
replace_once(
    core,
    "  const BRIDGE_MANAGER_PROBE_INTERVAL_MS = 60000;\n  const DEFAULTS = {",
    """  const BRIDGE_MANAGER_PROBE_INTERVAL_MS = 60000;
  const PROVIDER_MANAGER_PLUGIN = 'provider-manager';
  const PROVIDER_MANAGER_REQUEST_CHANNEL = 'provider-manager/request';
  const PROVIDER_MANAGER_RESPONSE_CHANNEL = 'provider-manager/response';
  const PROVIDER_MANAGER_CACHE_IPC_VERSION = 1;
  const PROVIDER_MANAGER_CACHE_TIMEOUT_MS = 800;
  const PROVIDER_MANAGER_CACHE_RETRY_MS = 60000;
  const PROVIDER_MANAGER_CACHE_MAX_ROWS = 250;
  const DEFAULTS = {""",
    'Provider Manager cache constants',
)
replace_once(
    core,
    "\n\n  function bridgeLifecycleMode() {",
    """
  const providerManagerCacheRuntime = {
    status:'idle', supported:false, source:'', lastError:'', lastRequestedAt:null, lastResponseAt:null,
    responseRows:0, responseTokenRows:0, matched:0, exact:0, strong:0, ambiguous:0, unmatched:0
  };
  const providerManagerCachePending = new Map();
  const PROVIDER_MANAGER_CACHE_INSTANCE_ID = `lud-cache-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  let providerManagerCacheListenerInstalled = false;

  function bridgeLifecycleMode() {""",
    'Provider Manager cache ephemeral runtime',
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

# 2) Optional Provider Manager cache-observability client. This never reads another
# plugin's storage; all data must arrive through PocketRisu's mutual-whitelist IPC.
bridge_io = SRC / '20-bridge-io.part.js'
bridge_text = read(bridge_io)
if 'function fetchProviderManagerCacheObservability(' in bridge_text:
    raise SystemExit('Provider Manager cache client already present')
client = r'''

  function providerManagerCacheMetricKnown(usage) {
    return ['cachedInputTokens','cacheReadInputTokens','cacheCreationInputTokens','cacheCreation5mTokens','cacheCreation1hTokens']
      .some(key => usage?.[key] !== null && usage?.[key] !== undefined && num(usage?.[key]));
  }

  function providerManagerCacheListener() {
    if (providerManagerCacheListenerInstalled) return true;
    if (typeof Risuai?.addPluginChannelListener !== 'function' || typeof Risuai?.postPluginChannelMessage !== 'function') {
      providerManagerCacheRuntime.status = 'unavailable';
      providerManagerCacheRuntime.lastError = 'plugin channel IPC unavailable';
      return false;
    }
    Risuai.addPluginChannelListener(PROVIDER_MANAGER_RESPONSE_CHANNEL, message => {
      if (!message || typeof message !== 'object') return;
      if (message?.recipient?.instanceId && String(message.recipient.instanceId) !== PROVIDER_MANAGER_CACHE_INSTANCE_ID) return;
      const id = String(message.id || '');
      const pending = providerManagerCachePending.get(id);
      if (!pending) return;
      providerManagerCachePending.delete(id);
      clearTimeout(pending.timer);
      if (message.type === 'cacheObservability' && Number(message?.data?.version) === PROVIDER_MANAGER_CACHE_IPC_VERSION) {
        pending.resolve({ok:true, version:PROVIDER_MANAGER_CACHE_IPC_VERSION, source:String(message.data.source || 'provider-manager'), rows:Array.isArray(message.data.rows) ? message.data.rows : []});
        return;
      }
      const error = message?.data?.message || message?.data?.code || `unexpected response ${String(message.type || 'unknown')}`;
      pending.resolve({ok:false, status:'error', error:String(error), rows:[]});
    });
    providerManagerCacheListenerInstalled = true;
    return true;
  }

  function providerManagerCacheRequestId() {
    return `lud-cache-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  }

  async function fetchProviderManagerCacheObservability() {
    const now = Date.now();
    if (!providerManagerCacheListener()) return {ok:false,status:'unavailable',rows:[]};
    if (providerManagerCacheRuntime.supported !== true && providerManagerCacheRuntime.lastRequestedAt && now - Number(providerManagerCacheRuntime.lastRequestedAt) < PROVIDER_MANAGER_CACHE_RETRY_MS) {
      return {ok:false,status:providerManagerCacheRuntime.status || 'backoff',rows:[]};
    }
    providerManagerCacheRuntime.lastRequestedAt = now;
    providerManagerCacheRuntime.status = 'probing';
    providerManagerCacheRuntime.lastError = '';
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
    if (!result?.ok) {
      providerManagerCacheRuntime.status = String(result?.status || 'error');
      providerManagerCacheRuntime.lastError = String(result?.error || '');
      providerManagerCacheRuntime.responseRows = 0;
      providerManagerCacheRuntime.responseTokenRows = 0;
      return result;
    }
    providerManagerCacheRuntime.status = 'ready';
    providerManagerCacheRuntime.supported = true;
    providerManagerCacheRuntime.source = String(result.source || 'provider-manager');
    providerManagerCacheRuntime.lastResponseAt = Date.now();
    providerManagerCacheRuntime.responseRows = result.rows.length;
    providerManagerCacheRuntime.responseTokenRows = result.rows.filter(row => providerManagerCacheMetricKnown(row?.usage)).length;
    providerManagerCacheRuntime.lastError = '';
    return result;
  }

  function providerManagerCacheName(value) {
    return String(value || '').trim().toLowerCase().replace(/[_\s]+/g,'-');
  }

  function providerManagerCacheModel(value) {
    const normalized = providerManagerCacheName(value);
    const parts = normalized.split('/').filter(Boolean);
    return parts.at(-1) || normalized;
  }

  function providerManagerCacheProviderMatch(a, b) {
    const left = providerManagerCacheName(a).replace(/[^a-z0-9]/g,'');
    const right = providerManagerCacheName(b).replace(/[^a-z0-9]/g,'');
    return Boolean(left && right && (left === right || (left.length >= 5 && right.length >= 5 && (left.includes(right) || right.includes(left)))));
  }

  function providerManagerCacheModelMatch(a, b) {
    const left = providerManagerCacheModel(a);
    const right = providerManagerCacheModel(b);
    return Boolean(left && right && (left === right || (left.length >= 8 && right.length >= 8 && (left.endsWith(right) || right.endsWith(left)))));
  }

  function providerManagerCacheCandidateScore(request, cacheRow) {
    const requestId = String(request?.requestNumber || '');
    const hints = [cacheRow?.logId,...(Array.isArray(cacheRow?.requestIdHints) ? cacheRow.requestIdHints : [])].map(value => String(value || '')).filter(Boolean);
    if (requestId && hints.includes(requestId)) return {score:1000,kind:'exact'};
    if (!num(request?.timestamp) || !num(cacheRow?.timestamp)) return null;
    if (!providerManagerCacheModelMatch(request?.model, cacheRow?.model)) return null;
    const delta = Math.abs(Number(request.timestamp) - Number(cacheRow.timestamp));
    if (delta > 45000) return null;
    let score = 50;
    if (delta <= 3000) score += 30;
    else if (delta <= 10000) score += 20;
    else if (delta <= 30000) score += 10;
    else score += 5;
    if (providerManagerCacheProviderMatch(request?.provider, cacheRow?.provider)) score += 10;
    if (num(request?.outputTokens) && num(cacheRow?.usage?.outputTokens)) {
      const diff = Math.abs(Number(request.outputTokens) - Number(cacheRow.usage.outputTokens));
      if (diff === 0) score += 15;
      else if (diff <= 2) score += 10;
    }
    if (num(request?.inputTokens) && num(cacheRow?.usage?.inputTokens) && Number(request.inputTokens) === Number(cacheRow.usage.inputTokens)) score += 10;
    return {score,kind:'strong',delta};
  }

  function providerManagerCacheApply(request, cacheRow, match) {
    const usage = cacheRow?.usage && typeof cacheRow.usage === 'object' ? cacheRow.usage : {};
    const cacheMetrics = requestCacheMetrics({...request,...usage});
    request.inputTokens = num(usage.inputTokens) ? Number(usage.inputTokens) : request.inputTokens;
    request.outputTokens = num(usage.outputTokens) ? Number(usage.outputTokens) : request.outputTokens;
    request.cachedInputTokens = cacheMetrics.cachedInputTokens;
    request.cacheReadInputTokens = cacheMetrics.cacheReadInputTokens;
    request.cacheCreationInputTokens = cacheMetrics.cacheCreationInputTokens;
    request.cacheCreation5mTokens = cacheMetrics.cacheCreation5mTokens;
    request.cacheCreation1hTokens = cacheMetrics.cacheCreation1hTokens;
    request.cacheReadRatio = cacheMetrics.cacheReadRatio;
    request.cacheMetricSource = 'provider-manager-ipc-v1';
    request.cacheMatch = String(match?.kind || 'strong');
    request.cacheMatchScore = Number(match?.score || 0);
    request.providerManagerLogId = String(cacheRow?.logId || '');
  }

  function enrichDataWithProviderManagerCache(data, payload) {
    providerManagerCacheRuntime.matched = 0;
    providerManagerCacheRuntime.exact = 0;
    providerManagerCacheRuntime.strong = 0;
    providerManagerCacheRuntime.ambiguous = 0;
    providerManagerCacheRuntime.unmatched = 0;
    if (!payload?.ok || !Array.isArray(payload.rows) || !data?.usageScopes?.scopes) return data;
    const scopes = data.usageScopes.scopes;
    const requestRefs = [];
    const unique = new Map();
    for (const scopeKey of ['all','devpass','credits']) {
      const scope = scopes?.[scopeKey];
      for (const field of ['recentLedger','recent']) {
        const rows = Array.isArray(scope?.[field]) ? scope[field] : [];
        for (const row of rows) {
          if (!row || typeof row !== 'object') continue;
          requestRefs.push(row);
          const key = requestLedgerKey(row);
          if (!unique.has(key)) unique.set(key,row);
        }
      }
    }
    const cacheRows = payload.rows.filter(row => row && typeof row === 'object' && providerManagerCacheMetricKnown(row.usage));
    const used = new Set();
    const matches = new Map();
    for (const [key,request] of unique.entries()) {
      const candidates = [];
      for (let index = 0; index < cacheRows.length; index += 1) {
        if (used.has(index)) continue;
        const match = providerManagerCacheCandidateScore(request, cacheRows[index]);
        if (match) candidates.push({index,row:cacheRows[index],...match});
      }
      candidates.sort((a,b) => Number(b.score) - Number(a.score) || Number(a.delta || 0) - Number(b.delta || 0));
      const best = candidates[0];
      const second = candidates[1];
      if (!best || Number(best.score) < 70) {
        providerManagerCacheRuntime.unmatched += 1;
        continue;
      }
      if (best.kind !== 'exact' && second && Number(best.score) - Number(second.score) < 10) {
        providerManagerCacheRuntime.ambiguous += 1;
        continue;
      }
      used.add(best.index);
      matches.set(key,best);
      providerManagerCacheRuntime.matched += 1;
      if (best.kind === 'exact') providerManagerCacheRuntime.exact += 1;
      else providerManagerCacheRuntime.strong += 1;
    }
    for (const request of requestRefs) {
      const match = matches.get(requestLedgerKey(request));
      if (match) providerManagerCacheApply(request, match.row, match);
    }
    return data;
  }
'''
write(bridge_io, bridge_text.rstrip() + client + '\n')

# 3) Fetch PM cache metadata in parallel with the bridge snapshot, then enrich only
# before the existing request-ledger merge. PM absence/timeout never throws refresh.
refresh = SRC / '30-refresh-runtime.part.js'
replace_once(
    refresh,
    "        const snapshot = await fetchSnapshot();",
    "        const providerManagerCachePromise = fetchProviderManagerCacheObservability();\n        const snapshot = await fetchSnapshot();",
    'parallel Provider Manager cache fetch',
)
replace_once(
    refresh,
    """        refreshPhaseStarted = refreshPhaseNow();
        state.data = applyObservedToday(snapshot);
        finishRefreshPhase('normalize-ledger', refreshPhaseStarted);""",
    """        refreshPhaseStarted = refreshPhaseNow();
        state.data = applyObservedToday(snapshot);
        finishRefreshPhase('normalize-ledger', refreshPhaseStarted);
        refreshPhaseStarted = refreshPhaseNow();
        const providerManagerCache = await providerManagerCachePromise;
        enrichDataWithProviderManagerCache(state.data, providerManagerCache);
        finishRefreshPhase('provider-cache', refreshPhaseStarted);""",
    'Provider Manager cache enrichment phase',
)

# 4) Diagnostics make the optional source and conservative matching explicit.
diag = SRC / '40-diagnostics.part.js'
replace_once(
    diag,
    "\n  function diagText() {",
    """
  function providerManagerCacheDiagnosticText() {
    const r = providerManagerCacheRuntime;
    return `${r.status || 'idle'} · v${PROVIDER_MANAGER_CACHE_IPC_VERSION} · source ${r.source || '—'} · rows ${Number(r.responseRows || 0)} · token rows ${Number(r.responseTokenRows || 0)} · matched ${Number(r.matched || 0)} (exact ${Number(r.exact || 0)} / strong ${Number(r.strong || 0)}) · ambiguous ${Number(r.ambiguous || 0)} · unmatched ${Number(r.unmatched || 0)} · error ${r.lastError || 'none'}`;
  }

  function diagText() {""",
    'Provider Manager cache diagnostics helper',
)
replace_once(
    diag,
    "      `Cache semantics: request HIT rate != token Read ratio · unknown stays unknown · source request metadata / Bridge aggregates`,",
    """      `Provider Manager cache IPC: ${providerManagerCacheDiagnosticText()}`,
      `Cache semantics: request HIT rate != token Read ratio · unknown stays unknown · source request metadata / Bridge aggregates / Provider Manager IPC v1 when available`,""",
    'Provider Manager cache diagnostics line',
)

# 5) P7 remains the 5.47+ semantic lock instead of pinning one exact prerelease.
p7 = TESTS / 'p7-cache-observability.cjs'
replace_once(
    p7,
    "assert.ok(latest.includes('//@version 3.0.0-alpha.5.47'));",
    "assert.match(latest, /\\/\\/@version 3\\.0\\.0-alpha\\.5\\.(?:4[7-9]|[5-9]\\d|\\d{3,})/);",
    'P7 forward-compatible version gate',
)

print(f'Prepared {NEW_VERSION} Provider Manager cache IPC candidate')
