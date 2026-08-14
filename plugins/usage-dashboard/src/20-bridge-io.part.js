  async function fetchSnapshot() {
    if (!token) throw new Error('Bridge Token을 먼저 저장해 줘.');
    const base = normalizeBridgeBase(state.bridgeBase);
    const res = await Risuai.nativeFetch(`${base}/snapshot`, {
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
    if (String(status.productVersion || '') === VERSION) return status;
    if (String(state.bridgeManagerSyncedProductVersion || '') === VERSION) return status;
    try {
      const res = await Risuai.nativeFetch(`${BRIDGE_MANAGER_BASE}/sync`, {method:'POST',headers:bridgeManagerAuthHeaders()});
      const text = await res.text();
      if (!res.ok) return {...status,syncError:`HTTP ${res.status}`};
      const payload = JSON.parse(text);
      state.bridgeManagerSyncedProductVersion = VERSION;
      return {...status,lastSyncAction:payload?.updated ? 'updated' : 'current',syncTarget:String(payload?.productVersion || VERSION),syncError:''};
    } catch (e) {
      return {...status,syncError:e?.message || String(e)};
    }
  }

  async function adoptBridgeEngineIfNeeded(status) {
    if (!status?.connected || status.engineManaged === true || status.engineAdoption !== true) return status;
    if (String(status.productVersion || '') !== VERSION) return status;
    if (String(state.bridgeEngineAdoptionAttemptedVersion || '') === VERSION) return status;
    try {
      const res = await Risuai.nativeFetch(`${BRIDGE_MANAGER_BASE}/engine/adopt`, {method:'POST',headers:bridgeManagerAuthHeaders()});
      const text = await res.text();
      const payload = JSON.parse(text);
      if (!res.ok) {
        if (payload?.retryable === false) state.bridgeEngineAdoptionAttemptedVersion = VERSION;
        return {...status,adoptionState:String(payload?.state || 'failed'),adoptionError:String(payload?.error || `HTTP ${res.status}`),candidateSafe:typeof payload?.candidateSafe === 'boolean' ? payload.candidateSafe : status.candidateSafe};
      }
      state.bridgeEngineAdoptionAttemptedVersion = VERSION;
      state.bridgeManagerLastProbeAt = 0;
      const fresh = await fetchBridgeManagerStatus(true);
      return {...fresh,adoptionState:String(payload?.state || (payload?.adopted ? 'adopted' : 'current')),adoptionError:''};
    } catch (e) {
      return {...status,adoptionState:'probe-error',adoptionError:e?.message || String(e)};
    }
  }
