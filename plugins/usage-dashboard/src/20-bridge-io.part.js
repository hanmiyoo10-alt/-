
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
      cliRuntimeState:['ready','provisioning','unavailable','invalid'].includes(String(raw.cliRuntimeState || raw.cli_runtime_state)) ? String(raw.cliRuntimeState || raw.cli_runtime_state) : 'unavailable',
      cliRuntimeVersion:String(raw.cliRuntimeVersion || raw.cli_runtime_version || ''),
      cliRuntimeProvisioning:['ok','pending','backoff','disabled','unavailable'].includes(String(raw.cliRuntimeProvisioning || raw.cli_runtime_provisioning)) ? String(raw.cliRuntimeProvisioning || raw.cli_runtime_provisioning) : 'unavailable',
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
  if (!status?.connected || status.engineManaged !== true) return status;
  if (String(status.productVersion || '') !== VERSION) return status;
  let liveStatus = status;
  let runningEngineVersion = String(liveStatus.engineVersion || '');
  let bundledEngineVersion = String(liveStatus.engineBundleVersion || '');
  const isCurrentBundledEngine = value => value?.engineBundled === true
    && String(value.engineBundleVersion || '') === REQUIRED_BRIDGE_VERSION
    && String(value.engineVersion || '') === REQUIRED_BRIDGE_VERSION;
  if (isCurrentBundledEngine(liveStatus)) {
    state.bridgeEngineBundleSyncAttemptedVersion = VERSION;
    return liveStatus;
  }
  // A live version mismatch is authoritative. Refresh Manager capability once before declaring convergence unavailable.
  if (liveStatus.engineBundleAvailable !== true) {
    state.bridgeManagerLastProbeAt = 0;
    const fresh = await fetchBridgeManagerStatus(true);
    if (fresh?.connected && fresh.engineManaged === true && String(fresh.productVersion || '') === VERSION) {
      liveStatus = fresh;
      runningEngineVersion = String(liveStatus.engineVersion || '');
      bundledEngineVersion = String(liveStatus.engineBundleVersion || '');
      if (isCurrentBundledEngine(liveStatus)) {
        state.bridgeEngineBundleSyncAttemptedVersion = VERSION;
        return liveStatus;
      }
    }
  }
  if (liveStatus.engineBundleAvailable !== true) {
    return {...liveStatus,engineBundleSyncState:'capability-missing',engineBundleSyncError:`bundle capability unavailable for live engine ${runningEngineVersion || 'unknown'} -> required ${REQUIRED_BRIDGE_VERSION}`};
  }
  if (!bundledEngineVersion) {
    return {...liveStatus,engineBundleSyncState:'target-missing',engineBundleSyncError:`bundle target missing for live engine ${runningEngineVersion || 'unknown'} -> required ${REQUIRED_BRIDGE_VERSION}`};
  }
  if (bundledEngineVersion !== REQUIRED_BRIDGE_VERSION) {
    return {...liveStatus,engineBundleSyncState:'target-mismatch',engineBundleSyncError:`bundle target ${bundledEngineVersion} does not match required ${REQUIRED_BRIDGE_VERSION}`};
  }
  // Live bundle state wins over a persisted attempt marker; retry until the exact required Engine is running.
  state.bridgeEngineBundleSyncAttemptedVersion = '';
  try {
    const res = await Risuai.nativeFetch(`${BRIDGE_MANAGER_BASE}/engine/sync`, {method:'POST',headers:{...bridgeManagerAuthHeaders(),'Content-Type':'application/json'},body:'{}'});
    const text = await res.text();
    const payload = JSON.parse(text);
    if (!res.ok) {
      state.bridgeManagerLastProbeAt = 0;
      return {...liveStatus,engineBundleSyncState:String(payload?.state || 'failed'),engineBundleSyncError:String(payload?.error || `HTTP ${res.status}`)};
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
      ...(fresh?.connected ? fresh : liveStatus),
      engineBundleSyncState:String(payload?.state || (payload?.synced ? 'bundled' : 'current')),
      engineBundleSyncError:reconciled ? '' : 'engine restart pending'
    };
  } catch (e) {
    state.bridgeManagerLastProbeAt = 0;
    return {...liveStatus,engineBundleSyncState:'probe-error',engineBundleSyncError:e?.message || String(e)};
  }
}
