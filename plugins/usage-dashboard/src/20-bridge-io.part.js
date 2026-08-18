
  async function fetchSnapshot() {
    if (!token) throw new Error('Bridge Token을 먼저 저장해 줘.');
    const base = normalizeBridgeBase(state.bridgeBase);
    const selectedCreditsOrgId = String(state.selectedCreditsOrgId || '').trim();
    const snapshotUrl = `${base}/snapshot${selectedCreditsOrgId ? `?creditsOrgId=${encodeURIComponent(selectedCreditsOrgId)}` : ''}`;
    const res = await Risuai.nativeFetch(snapshotUrl, {
      method:'GET',
      headers:{Accept:'application/json','X-Local-Bridge-Key':token,'X-DevPass-Bridge-Key':token,'Cache-Control':'no-cache'}
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Bridge HTTP ${res.status}: ${text.slice(0,120)}`);
    try { return normalize(JSON.parse(text)); }
    catch (e) { if (e instanceof SyntaxError) throw new Error('Bridge 응답이 JSON이 아니야.'); throw e; }
  }


  function bridgeManagerAuthHeaders() {
    return {Accept:'application/json','X-Local-Bridge-Key':token,'X-DevPass-Bridge-Key':token,'Cache-Control':'no-cache'};
  }

  function normalizeBridgeManagerStatus(raw) {
    if (!raw || typeof raw !== 'object') return null;
    return {
      connected:true,
      ok:raw.ok !== false,
      protocol:String(raw.protocol || raw.managementProtocol || 'none'),
      version:String(raw.version || ''),
      productVersion:String(raw.productVersion || raw.product_version || ''),
      selfUpdate:raw.selfUpdate === true || raw.self_update === true,
      engineManaged:raw.engineManaged === true || raw.engine_managed === true,
      engineAdoption:raw.engineAdoption === true || raw.engine_adoption === true,
      engineMode:String(raw.engineMode || raw.engine_mode || 'legacy-external'),
      engineService:String(raw.engineService || raw.engine_service || ''),
      engineVersion:String(raw.engineVersion || raw.engine_version || ''),
      engineBundled:raw.engineBundled === true || raw.engine_bundled === true,
      engineBundleAvailable:raw.engineBundleAvailable === true || raw.engine_bundle_available === true,
      engineBundleReady:raw.engineBundleReady === true || raw.engine_bundle_ready === true,
      engineSourceMode:String(raw.engineSourceMode || raw.engine_source_mode || ''),
      engineBundleVersion:String(raw.engineBundleVersion || raw.engine_bundle_version || ''),
      candidateSafe:typeof raw.candidateSafe === 'boolean' ? raw.candidateSafe : null,
      adoptionState:String(raw.adoptionState || raw.adoption_state || ''),
      restartMode:String(raw.restartMode || raw.restart_mode || ''),
      updateChannel:String(raw.updateChannel || raw.update_channel || ''),
      checkedAt:Date.now(),
      error:''
    };
  }

  async function fetchBridgeManagerStatus(force = false) {
    const now = Date.now();
    const lastProbe = Number(state.bridgeManagerLastProbeAt || 0);
    if (!force && state.bridgeManagerRuntime && lastProbe > 0 && now - lastProbe < BRIDGE_MANAGER_PROBE_INTERVAL_MS) {
      return state.bridgeManagerRuntime;
    }
    state.bridgeManagerLastProbeAt = now;
    if (!token) return {connected:false,ok:false,protocol:'none',version:'',productVersion:'',selfUpdate:false,engineManaged:false,engineAdoption:false,engineMode:'legacy-external',engineService:'',engineVersion:'',candidateSafe:null,adoptionState:'',restartMode:'',updateChannel:'',checkedAt:now,error:'missing token'};
    try {
      const res = await Risuai.nativeFetch(`${BRIDGE_MANAGER_BASE}/status`, {method:'GET',headers:bridgeManagerAuthHeaders()});
      const text = await res.text();
      if (!res.ok) return {connected:false,ok:false,protocol:'none',version:'',productVersion:'',selfUpdate:false,engineManaged:false,engineAdoption:false,engineMode:'legacy-external',engineService:'',engineVersion:'',candidateSafe:null,adoptionState:'',restartMode:'',updateChannel:'',checkedAt:Date.now(),error:`HTTP ${res.status}`};
      const normalized = normalizeBridgeManagerStatus(JSON.parse(text));
      return normalized || {connected:false,ok:false,protocol:'none',version:'',productVersion:'',selfUpdate:false,engineManaged:false,engineAdoption:false,engineMode:'legacy-external',engineService:'',engineVersion:'',candidateSafe:null,adoptionState:'',restartMode:'',updateChannel:'',checkedAt:Date.now(),error:'invalid manager status'};
    } catch (e) {
      return {connected:false,ok:false,protocol:'none',version:'',productVersion:'',selfUpdate:false,engineManaged:false,engineAdoption:false,engineMode:'legacy-external',engineService:'',engineVersion:'',candidateSafe:null,adoptionState:'',restartMode:'',updateChannel:'',checkedAt:Date.now(),error:e?.message || String(e)};
    }
  }

  async function syncBridgeManagerIfNeeded(status) {
  if (!status?.connected || status.selfUpdate !== true) return status;
  if (String(status.productVersion || '') === VERSION) {
    state.bridgeManagerSyncedProductVersion = VERSION;
    return status;
  }
  // Live /status is authoritative. A persisted success marker must never suppress reconciliation.
  state.bridgeManagerSyncedProductVersion = '';
  try {
    const res = await Risuai.nativeFetch(`${BRIDGE_MANAGER_BASE}/sync`, {method:'POST',headers:{...bridgeManagerAuthHeaders(),'Content-Type':'application/json'},body:'{}'});
    const text = await res.text();
    if (!res.ok) {
      state.bridgeManagerLastProbeAt = 0;
      return {...status,syncError:`HTTP ${res.status}`};
    }
    const payload = JSON.parse(text);
    state.bridgeManagerLastProbeAt = 0;
    let fresh = null;
    for (const waitMs of [200, 350, 600, 900]) {
      await new Promise(resolve => setTimeout(resolve, waitMs));
      fresh = await fetchBridgeManagerStatus(true);
      if (fresh?.connected && String(fresh.productVersion || '') === VERSION) break;
    }
    const reconciled = Boolean(fresh?.connected && String(fresh.productVersion || '') === VERSION);
    if (reconciled) state.bridgeManagerSyncedProductVersion = VERSION;
    else state.bridgeManagerLastProbeAt = 0;
    return {
      ...(fresh?.connected ? fresh : status),
      lastSyncAction:payload?.updated ? 'updated' : 'current',
      syncTarget:String(payload?.productVersion || VERSION),
      syncError:reconciled ? '' : 'manager restart pending'
    };
  } catch (e) {
    state.bridgeManagerLastProbeAt = 0;
    return {...status,syncError:e?.message || String(e)};
  }
}

  async function adoptBridgeEngineIfNeeded(status) {
  if (!status?.connected || status.engineAdoption !== true) return status;
  if (String(status.productVersion || '') !== VERSION) return status;
  if (status.engineManaged === true) {
    state.bridgeEngineAdoptionAttemptedVersion = VERSION;
    return status;
  }
  // Live engine ownership wins over a persisted attempt marker; retry safely when still unmanaged.
  state.bridgeEngineAdoptionAttemptedVersion = '';
  try {
    const res = await Risuai.nativeFetch(`${BRIDGE_MANAGER_BASE}/engine/adopt`, {method:'POST',headers:{...bridgeManagerAuthHeaders(),'Content-Type':'application/json'},body:'{}'});
    const text = await res.text();
    const payload = JSON.parse(text);
    if (!res.ok) {
      state.bridgeManagerLastProbeAt = 0;
      return {...status,adoptionState:String(payload?.state || 'failed'),adoptionError:String(payload?.error || `HTTP ${res.status}`),candidateSafe:typeof payload?.candidateSafe === 'boolean' ? payload.candidateSafe : status.candidateSafe};
    }
    state.bridgeManagerLastProbeAt = 0;
    const fresh = await fetchBridgeManagerStatus(true);
    if (fresh?.connected && fresh.engineManaged === true) state.bridgeEngineAdoptionAttemptedVersion = VERSION;
    else state.bridgeManagerLastProbeAt = 0;
    return {...fresh,adoptionState:String(payload?.state || (payload?.adopted ? 'adopted' : 'current')),adoptionError:''};
  } catch (e) {
    state.bridgeManagerLastProbeAt = 0;
    return {...status,adoptionState:'probe-error',adoptionError:e?.message || String(e)};
  }
}

  async function syncBridgeEngineBundleIfNeeded(status) {
  if (!status?.connected || status.engineManaged !== true || status.engineBundleAvailable !== true) return status;
  if (String(status.productVersion || '') !== VERSION) return status;
  const runningEngineVersion = String(status.engineVersion || '');
  const bundledEngineVersion = String(status.engineBundleVersion || '');
  if (status.engineBundled === true && bundledEngineVersion && runningEngineVersion === bundledEngineVersion) {
    state.bridgeEngineBundleSyncAttemptedVersion = VERSION;
    return status;
  }
  // Live bundle state wins over a persisted attempt marker; retry while the manager still reports adopted.
  state.bridgeEngineBundleSyncAttemptedVersion = '';
  try {
    const res = await Risuai.nativeFetch(`${BRIDGE_MANAGER_BASE}/engine/sync`, {method:'POST',headers:{...bridgeManagerAuthHeaders(),'Content-Type':'application/json'},body:'{}'});
    const text = await res.text();
    const payload = JSON.parse(text);
    if (!res.ok) {
      state.bridgeManagerLastProbeAt = 0;
      return {...status,engineBundleSyncState:String(payload?.state || 'failed'),engineBundleSyncError:String(payload?.error || `HTTP ${res.status}`)};
    }
    state.bridgeManagerLastProbeAt = 0;
    let fresh = await fetchBridgeManagerStatus(true);
    if (!fresh?.connected || fresh.engineBundled !== true) {
      await new Promise(resolve => setTimeout(resolve, 300));
      fresh = await fetchBridgeManagerStatus(true);
    }
    const reconciled = Boolean(fresh?.connected && fresh.engineBundled === true);
    if (reconciled) state.bridgeEngineBundleSyncAttemptedVersion = VERSION;
    else state.bridgeManagerLastProbeAt = 0;
    return {
      ...(fresh?.connected ? fresh : status),
      engineBundleSyncState:String(payload?.state || (payload?.synced ? 'bundled' : 'current')),
      engineBundleSyncError:reconciled ? '' : 'engine restart pending'
    };
  } catch (e) {
    state.bridgeManagerLastProbeAt = 0;
    return {...status,engineBundleSyncState:'probe-error',engineBundleSyncError:e?.message || String(e)};
  }
}

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
