  try {
    store=await Risuai.getLocalPluginStorage();
    state=hydrateState(await store.getItem(STATE_KEY));
    await importLegacyTodayBaselines();
    if (state.stalePolicyV37Migrated !== true) {
      if (Number(state.staleAfterMs) === 300000) state.staleAfterMs = 0;
      state.stalePolicyV37Migrated = true;
      await store.setItem(STATE_KEY,state);
    }
    try{state.bridgeBase=normalizeBridgeBase(state.bridgeBase);}catch(_){state.bridgeBase=DEFAULT_BRIDGE;state.bridgeEnabled=false;}
    token=String((await store.getItem(TOKEN_KEY))||'').trim();
    if (state.bridgeStatus === 'connected' && state.lastSyncAt) performanceRuntime.lastHealthySyncAt = Number(state.lastSyncAt);
    updateRuntimeState('init');
    uiParts.push(await Risuai.registerSetting('Local Usage Dashboard',openSettings,'◴','html','local-usage-dashboard-settings-v3'));
    uiParts.push(await Risuai.registerButton({name:'Usage',icon:'📊',iconType:'html',location:'chat',id:'local-usage-dashboard-button-v3'},openSettings));
    await renderWidget(); installLifecycle(); scheduleRefresh(); if(state.bridgeEnabled&&token)enqueueRefresh('init',true);
    await Risuai.onUnload(async()=>{
      runtimeDisposed = true;
      runtimeEpoch += 1;
      if(refreshTimer)clearTimeout(refreshTimer);
      if(resetSyncTimer)clearTimeout(resetSyncTimer);
      cancelPanelRender();
      cancelRefreshScheduler();
      cancelResumeRefresh();
      stopResumeLongTaskObserver();
      stopUiStallProbe();
      for(const [t,ty,id] of remoteListeners.splice(0)){try{await t.removeEventListener(ty,id);}catch(_){}}
      widgetRemoteListeners.length=0;
      for(const [t,ty,fn] of domListeners.splice(0)){try{t.removeEventListener(ty,fn);}catch(_){}}
      if(widget){try{await widget.remove();}catch(_){}}
      widget=null; rootBody=null; drag=null;
      for(const p of uiParts)if(p?.id){try{await Risuai.unregisterUIPart(p.id);}catch(_){}}
    });
  } catch(e) { console.log(`[Local Usage Dashboard] init failed: ${e?.message||e}`); }
})();
