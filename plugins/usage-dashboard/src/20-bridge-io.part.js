
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



  function normalizeGatewayLimitsLocal(raw) {
    if (!raw || typeof raw !== 'object') return { state:'source-unavailable', source:'org-limits', fetchedAt:Date.now() };
    const stateName = ['ok','permission-unavailable','source-unavailable'].includes(String(raw.state)) ? String(raw.state) : 'source-unavailable';
    if (stateName !== 'ok') return { state:stateName, source:'org-limits', fetchedAt:num(raw.fetchedAt) ? Number(raw.fetchedAt) : Date.now() };
    const metric = (value) => {
      const metricState = ['value','not-applicable','unknown'].includes(String(value?.state)) ? String(value.state) : 'unknown';
      return {
        state:metricState,
        used:num(value?.used) ? Number(value.used) : null,
        cap:num(value?.cap) ? Number(value.cap) : null,
        remaining:num(value?.remaining) ? Number(value.remaining) : null,
      };
    };
    const topUpState = ['value','not-applicable','unknown'].includes(String(raw?.topUp?.state)) ? String(raw.topUp.state) : 'unknown';
    const progressionState = ['value','max-tier','tier-overridden','not-applicable','unknown'].includes(String(raw?.nextTier?.state))
      ? String(raw.nextTier.state)
      : 'unknown';
    const progressionNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Number(value) : null;
    const progressionDay = (value) => Number.isInteger(value) && value >= 0 ? Number(value) : null;
    const unlockState = ['value','max-tier','tier-overridden','not-applicable','source-unavailable','permission-unavailable','invalid-next-tier-limits'].includes(String(raw?.nextTier?.limits?.state))
      ? String(raw.nextTier.limits.state)
      : 'source-unavailable';
    const unlockNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Number(value) : null;
    const unlockLimits = {
      state:unlockState,
      rpmMultiplier:unlockNumber(raw?.nextTier?.limits?.rpmMultiplier),
      dailyCapUsd:unlockNumber(raw?.nextTier?.limits?.dailyCapUsd),
      monthlyCapUsd:unlockNumber(raw?.nextTier?.limits?.monthlyCapUsd),
      topUpDailyCapUsd:unlockNumber(raw?.nextTier?.limits?.topUpDailyCapUsd),
    };
    if (unlockState === 'value' && (
        unlockLimits.rpmMultiplier === null || unlockLimits.dailyCapUsd === null
        || unlockLimits.monthlyCapUsd === null || unlockLimits.topUpDailyCapUsd === null)) {
      unlockLimits.state = 'invalid-next-tier-limits';
      unlockLimits.rpmMultiplier = null;
      unlockLimits.dailyCapUsd = null;
      unlockLimits.monthlyCapUsd = null;
      unlockLimits.topUpDailyCapUsd = null;
    }
    const nextTier = {
      state:progressionState,
      currentTier:Number.isInteger(raw?.nextTier?.currentTier) && raw.nextTier.currentTier >= 0 ? raw.nextTier.currentTier : null,
      tier:Number.isInteger(raw?.nextTier?.tier) && raw.nextTier.tier >= 0 ? raw.nextTier.tier : null,
      daysUntilQualify:progressionDay(raw?.nextTier?.daysUntilQualify),
      spendUsdUntilQualify:progressionNumber(raw?.nextTier?.spendUsdUntilQualify),
      daysUntilSpendPathUnlocks:progressionDay(raw?.nextTier?.daysUntilSpendPathUnlocks),
      limits:unlockLimits,
    };
    if (progressionState === 'value' && (
        nextTier.currentTier === null || nextTier.tier === null || nextTier.daysUntilQualify === null
        || nextTier.spendUsdUntilQualify === null || nextTier.daysUntilSpendPathUnlocks === null)) {
      nextTier.state = 'unknown';
      nextTier.currentTier = null;
      nextTier.tier = null;
      nextTier.daysUntilQualify = null;
      nextTier.spendUsdUntilQualify = null;
      nextTier.daysUntilSpendPathUnlocks = null;
      nextTier.limits = {state:'source-unavailable',rpmMultiplier:null,dailyCapUsd:null,monthlyCapUsd:null,topUpDailyCapUsd:null};
    }
    const endpointState = ['value','not-applicable','source-unavailable','permission-unavailable','invalid-endpoints'].includes(String(raw?.endpointRates?.state))
      ? String(raw.endpointRates.state)
      : 'source-unavailable';
    let endpointRates = {state:endpointState,rows:[]};
    if (endpointState === 'value') {
      const sourceRows = Array.isArray(raw?.endpointRates?.rows) ? raw.endpointRates.rows : null;
      const rows = [];
      const seen = new Set();
      let valid = Boolean(sourceRows) && sourceRows.length <= 64;
      if (valid) {
        for (const row of sourceRows) {
          const key = row && typeof row === 'object' && !Array.isArray(row) && typeof row.key === 'string' ? row.key : '';
          const rpm = row && typeof row === 'object' && !Array.isArray(row) && typeof row.rpm === 'number' && Number.isFinite(row.rpm) && row.rpm >= 0 ? Number(row.rpm) : null;
          if (!key.trim() || key.length > 96 || rpm === null || seen.has(key)) {
            valid = false;
            break;
          }
          seen.add(key);
          rows.push({key,rpm});
        }
      }
      endpointRates = valid ? {state:'value',rows} : {state:'invalid-endpoints',rows:[]};
    }
    return {
      state:'ok',
      source:'org-limits',
      enterprise:raw.enterprise === true ? true : raw.enterprise === false ? false : null,
      planClass:typeof raw.planClass === 'string' && raw.planClass.trim() ? raw.planClass.trim() : null,
      rateLimitsApply:raw.rateLimitsApply === true ? true : raw.rateLimitsApply === false ? false : null,
      tierOverridden:raw.tierOverridden === true ? true : raw.tierOverridden === false ? false : null,
      capsApply:raw.capsApply === true ? true : raw.capsApply === false ? false : null,
      trustTierState:['value','not-applicable','unknown'].includes(String(raw.trustTierState)) ? String(raw.trustTierState) : 'unknown',
      trustTier:Number.isInteger(raw.trustTier) && raw.trustTier >= 0 ? raw.trustTier : null,
      rateState:['value','not-applicable','unknown'].includes(String(raw.rateState)) ? String(raw.rateState) : 'unknown',
      rateMultiplier:num(raw.rateMultiplier) ? Number(raw.rateMultiplier) : null,
      daily:metric(raw.daily),
      monthly:metric(raw.monthly),
      topUp:{
        state:topUpState,
        cap:num(raw?.topUp?.cap) ? Number(raw.topUp.cap) : null,
        windowHours:num(raw?.topUp?.windowHours) ? Number(raw.topUp.windowHours) : null,
        used:num(raw?.topUp?.used) ? Number(raw.topUp.used) : null,
        remaining:num(raw?.topUp?.remaining) ? Number(raw.topUp.remaining) : null,
      },
      nextTier,
      endpointRates,
      fetchedAt:num(raw.fetchedAt) ? Number(raw.fetchedAt) : Date.now(),
    };
  }

  async function fetchGatewayLimitsForOrg(creditsOrgId) {
    const exactOrgId = String(creditsOrgId || '').trim();
    if (!token || !exactOrgId) return { state:'source-unavailable', source:'org-limits', fetchedAt:Date.now() };
    const base = normalizeBridgeBase(state.bridgeBase);
    const res = await Risuai.nativeFetch(`${base}/gateway-limits?creditsOrgId=${encodeURIComponent(exactOrgId)}`, {
      method:'GET',
      headers:{Accept:'application/json','X-Local-Bridge-Key':token,'X-DevPass-Bridge-Key':token,'Cache-Control':'no-cache'}
    });
    const text = await res.text();
    if (!res.ok) return { state:'source-unavailable', source:'org-limits', fetchedAt:Date.now() };
    try { return normalizeGatewayLimitsLocal(JSON.parse(text)); }
    catch { return { state:'source-unavailable', source:'org-limits', fetchedAt:Date.now() }; }
  }

  async function refreshGatewayLimitsForOrg(creditsOrgId, force = false) {
    const exactOrgId = String(creditsOrgId || '').trim();
    if (!exactOrgId) {
      gatewayLimitsRequestSeq += 1;
      gatewayLimitsRuntime = {orgId:'',value:null,fetchedAt:0};
      return null;
    }
    const now = Date.now();
    if (!force && gatewayLimitsRuntime.orgId === exactOrgId && gatewayLimitsRuntime.value
        && now - Number(gatewayLimitsRuntime.fetchedAt || 0) < GATEWAY_LIMITS_UI_TTL_MS) {
      return gatewayLimitsRuntime.value;
    }
    if (gatewayLimitsInFlight?.orgId === exactOrgId) return gatewayLimitsInFlight.promise;

    const requestSeq = ++gatewayLimitsRequestSeq;
    if (gatewayLimitsRuntime.orgId !== exactOrgId) gatewayLimitsRuntime = {orgId:exactOrgId,value:null,fetchedAt:0};
    const promise = (async () => {
      const value = await fetchGatewayLimitsForOrg(exactOrgId);
      if (requestSeq !== gatewayLimitsRequestSeq) return null;
      const selectedStateOrg = String(state.selectedCreditsOrgId || '').trim();
      const selectedDataOrg = String(state.data?.creditsOrganizationId || '').trim();
      if ((selectedStateOrg && selectedStateOrg !== exactOrgId) && selectedDataOrg !== exactOrgId) return null;
      gatewayLimitsRuntime = {
        orgId:exactOrgId,
        value,
        fetchedAt:num(value?.fetchedAt) ? Number(value.fetchedAt) : Date.now(),
      };
      schedulePanelRender(false);
      return value;
    })().catch(() => {
      if (requestSeq !== gatewayLimitsRequestSeq) return null;
      const value = {state:'source-unavailable',source:'org-limits',fetchedAt:Date.now()};
      gatewayLimitsRuntime = {orgId:exactOrgId,value,fetchedAt:value.fetchedAt};
      schedulePanelRender(false);
      return value;
    }).finally(() => {
      if (gatewayLimitsInFlight?.promise === promise) gatewayLimitsInFlight = null;
    });
    gatewayLimitsInFlight = {orgId:exactOrgId,promise};
    return promise;
  }




  function normalizeDevPassBillingHistoryLocal(raw) {
    const allowedTypes = new Set([
      'dev_plan_start','dev_plan_renewal','dev_plan_upgrade','dev_plan_downgrade','dev_plan_cancel','dev_plan_resume','dev_plan_end',
      'dev_plan_reset_pass','dev_plan_reset_pass_reward','dev_plan_reset_pass_gift',
      'credit_topup','credit_refund','credit_gift','credit_manual_payment'
    ]);
    const allowedStatuses = new Set(['pending','completed','failed']);
    const stateName = ['ok','empty','source-unavailable','permission-unavailable','invalid-history','partial'].includes(String(raw?.state))
      ? String(raw.state)
      : 'source-unavailable';
    const fetchedAt = typeof raw?.fetchedAt === 'number' && Number.isFinite(raw.fetchedAt) && raw.fetchedAt >= 0 ? Number(raw.fetchedAt) : Date.now();
    if (stateName === 'source-unavailable' || stateName === 'permission-unavailable') {
      return {state:stateName,source:'devpass-invoices',rows:[],validCount:null,receivedCount:null,newest:null,fetchedAt};
    }
    const receivedCount = Number.isInteger(raw?.receivedCount) && raw.receivedCount >= 0 ? Number(raw.receivedCount) : null;
    const validCount = Number.isInteger(raw?.validCount) && raw.validCount >= 0 ? Number(raw.validCount) : null;
    const inputRows = Array.isArray(raw?.rows) && raw.rows.length <= 5 ? raw.rows : null;
    if (stateName === 'empty' && receivedCount === 0 && validCount === 0 && inputRows && inputRows.length === 0) {
      return {state:'empty',source:'devpass-invoices',rows:[],validCount:0,receivedCount:0,newest:null,fetchedAt};
    }
    if (stateName === 'invalid-history') {
      return {state:'invalid-history',source:'devpass-invoices',rows:[],validCount:validCount === 0 ? 0 : null,receivedCount,newest:null,fetchedAt};
    }
    if (!inputRows || receivedCount === null || validCount === null || validCount <= 0 || receivedCount < validCount || inputRows.length !== Math.min(validCount,5)) {
      return {state:'invalid-history',source:'devpass-invoices',rows:[],validCount:null,receivedCount:null,newest:null,fetchedAt};
    }
    if ((stateName === 'ok' && validCount !== receivedCount) || (stateName === 'partial' && validCount >= receivedCount)) {
      return {state:'invalid-history',source:'devpass-invoices',rows:[],validCount:null,receivedCount:null,newest:null,fetchedAt};
    }
    const rows = [];
    for (const row of inputRows) {
      const type = typeof row?.type === 'string' ? row.type : '';
      const date = typeof row?.date === 'string' ? row.date : '';
      const currency = typeof row?.currency === 'string' ? row.currency.trim() : '';
      const status = typeof row?.status === 'string' ? row.status : '';
      if (!allowedTypes.has(type) || !date || !Number.isFinite(Date.parse(date)) || !currency || currency.length > 12 || !allowedStatuses.has(status)) {
        return {state:'invalid-history',source:'devpass-invoices',rows:[],validCount:null,receivedCount:null,newest:null,fetchedAt};
      }
      let amount = null;
      if (row.amount !== null) {
        if (typeof row.amount !== 'number' || !Number.isFinite(row.amount)) return {state:'invalid-history',source:'devpass-invoices',rows:[],validCount:null,receivedCount:null,newest:null,fetchedAt};
        amount = Number(row.amount);
      }
      rows.push({type,date,amount,currency,status});
    }
    return {state:stateName,source:'devpass-invoices',rows,validCount,receivedCount,newest:rows[0]?.date || null,fetchedAt};
  }

  async function fetchDevPassBillingHistory() {
    if (!token) return {state:'source-unavailable',source:'devpass-invoices',rows:[],validCount:null,receivedCount:null,newest:null,fetchedAt:Date.now()};
    const base = normalizeBridgeBase(state.bridgeBase);
    const res = await Risuai.nativeFetch(`${base}/devpass-billing-history`, {
      method:'GET',
      headers:{Accept:'application/json','X-Local-Bridge-Key':token,'X-DevPass-Bridge-Key':token,'Cache-Control':'no-cache'}
    });
    const text = await res.text();
    if (!res.ok) return {state:'source-unavailable',source:'devpass-invoices',rows:[],validCount:null,receivedCount:null,newest:null,fetchedAt:Date.now()};
    try { return normalizeDevPassBillingHistoryLocal(JSON.parse(text)); }
    catch { return {state:'source-unavailable',source:'devpass-invoices',rows:[],validCount:null,receivedCount:null,newest:null,fetchedAt:Date.now()}; }
  }

  async function refreshDevPassBillingHistory(force = false) {
    const now = Date.now();
    if (!force && devpassBillingHistoryRuntime.value && now - Number(devpassBillingHistoryRuntime.fetchedAt || 0) < DEVPASS_BILLING_HISTORY_UI_TTL_MS) {
      return devpassBillingHistoryRuntime.value;
    }
    if (devpassBillingHistoryInFlight) return devpassBillingHistoryInFlight;
    const requestSeq = ++devpassBillingHistoryRequestSeq;
    const promise = (async () => {
      const value = await fetchDevPassBillingHistory();
      if (requestSeq !== devpassBillingHistoryRequestSeq) return null;
      devpassBillingHistoryRuntime = {
        value,
        fetchedAt:typeof value?.fetchedAt === 'number' && Number.isFinite(value.fetchedAt) ? Number(value.fetchedAt) : Date.now(),
      };
      schedulePanelRender(false);
      return value;
    })().catch(() => {
      if (requestSeq !== devpassBillingHistoryRequestSeq) return null;
      const value = {state:'source-unavailable',source:'devpass-invoices',rows:[],validCount:null,receivedCount:null,newest:null,fetchedAt:Date.now()};
      devpassBillingHistoryRuntime = {value,fetchedAt:value.fetchedAt};
      schedulePanelRender(false);
      return value;
    }).finally(() => {
      if (devpassBillingHistoryInFlight === promise) devpassBillingHistoryInFlight = null;
    });
    devpassBillingHistoryInFlight = promise;
    return promise;
  }

  function normalizeApiKeyPlanLimitsLocal(raw) {
    const stateName = ['ok','project-unavailable','permission-unavailable','source-unavailable','plan-limits-unavailable','invalid-plan-limits'].includes(String(raw?.state))
      ? String(raw.state)
      : 'source-unavailable';
    const fetchedAt = typeof raw?.fetchedAt === 'number' && Number.isFinite(raw.fetchedAt) && raw.fetchedAt >= 0 ? Number(raw.fetchedAt) : Date.now();
    if (stateName !== 'ok') return {state:stateName,source:'keys-api-plan-limits',currentCount:null,maxKeys:null,headroom:null,fetchedAt};
    const currentCount = Number.isInteger(raw?.currentCount) && raw.currentCount >= 0 ? Number(raw.currentCount) : null;
    const maxKeys = Number.isInteger(raw?.maxKeys) && raw.maxKeys >= 0 ? Number(raw.maxKeys) : null;
    if (currentCount === null || maxKeys === null) {
      return {state:'invalid-plan-limits',source:'keys-api-plan-limits',currentCount:null,maxKeys:null,headroom:null,fetchedAt};
    }
    return {state:'ok',source:'keys-api-plan-limits',currentCount,maxKeys,headroom:Math.max(0,maxKeys-currentCount),fetchedAt};
  }

  async function fetchApiKeyPlanLimits() {
    if (!token) return {state:'source-unavailable',source:'keys-api-plan-limits',currentCount:null,maxKeys:null,headroom:null,fetchedAt:Date.now()};
    const base = normalizeBridgeBase(state.bridgeBase);
    const res = await Risuai.nativeFetch(`${base}/api-key-plan-limits`, {
      method:'GET',
      headers:{Accept:'application/json','X-Local-Bridge-Key':token,'X-DevPass-Bridge-Key':token,'Cache-Control':'no-cache'}
    });
    const text = await res.text();
    if (!res.ok) return {state:'source-unavailable',source:'keys-api-plan-limits',currentCount:null,maxKeys:null,headroom:null,fetchedAt:Date.now()};
    try { return normalizeApiKeyPlanLimitsLocal(JSON.parse(text)); }
    catch { return {state:'source-unavailable',source:'keys-api-plan-limits',currentCount:null,maxKeys:null,headroom:null,fetchedAt:Date.now()}; }
  }

  async function refreshApiKeyPlanLimits(force = false) {
    const now = Date.now();
    if (!force && apiKeyPlanLimitsRuntime.value && now - Number(apiKeyPlanLimitsRuntime.fetchedAt || 0) < API_KEY_PLAN_LIMITS_UI_TTL_MS) {
      return apiKeyPlanLimitsRuntime.value;
    }
    if (apiKeyPlanLimitsInFlight) return apiKeyPlanLimitsInFlight;
    const requestSeq = ++apiKeyPlanLimitsRequestSeq;
    const promise = (async () => {
      const value = await fetchApiKeyPlanLimits();
      if (requestSeq !== apiKeyPlanLimitsRequestSeq) return null;
      apiKeyPlanLimitsRuntime = {
        value,
        fetchedAt:typeof value?.fetchedAt === 'number' && Number.isFinite(value.fetchedAt) ? Number(value.fetchedAt) : Date.now(),
      };
      schedulePanelRender(false);
      return value;
    })().catch(() => {
      if (requestSeq !== apiKeyPlanLimitsRequestSeq) return null;
      const value = {state:'source-unavailable',source:'keys-api-plan-limits',currentCount:null,maxKeys:null,headroom:null,fetchedAt:Date.now()};
      apiKeyPlanLimitsRuntime = {value,fetchedAt:value.fetchedAt};
      schedulePanelRender(false);
      return value;
    }).finally(() => {
      if (apiKeyPlanLimitsInFlight === promise) apiKeyPlanLimitsInFlight = null;
    });
    apiKeyPlanLimitsInFlight = promise;
    return promise;
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
      cliCatalogState:['ready','unavailable','invalid'].includes(String(raw.cliCatalogState || raw.cli_catalog_state)) ? String(raw.cliCatalogState || raw.cli_catalog_state) : 'unavailable',
      cliCatalogVersion:String(raw.cliCatalogVersion || raw.cli_catalog_version || ''),
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
