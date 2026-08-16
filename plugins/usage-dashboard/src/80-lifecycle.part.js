  function scheduleRefresh() {
    if (runtimeDisposed) return;
    if (refreshTimer) clearTimeout(refreshTimer); refreshTimer=null;
    scheduleResetSync();
    const baseMs=Math.max(0,Number(state.refreshMs)||0);
    if (!baseMs||!state.bridgeEnabled||(state.backgroundPause!==false&&document.visibilityState==='hidden')) return;
    const adaptiveMs=effectiveRefreshMs();
    const ms = state.bridgeStatus === 'error' && Number(state.consecutiveFailures||0) > 0
      ? Math.max(adaptiveMs, Number(state.retryDelayMs)||adaptiveMs)
      : adaptiveMs;
    if (state.bridgeStatus === 'error') state.nextRetryAt = Date.now() + ms;
    refreshTimer=setTimeout(async()=>{try{await enqueueRefresh('timer',true);}finally{scheduleRefresh();}},ms);
  }

  function installLifecycle() {
    installResumeLongTaskObserver();
    const vis=()=>{
      if(document.visibilityState==='visible'){
        beginResumeMeasurement('visibility');
        startUiStallProbe();
        scheduleRefresh();
        if(state.syncOnFocus&&state.bridgeEnabled)requestResumeRefresh('visibility');
      }else if(state.backgroundPause!==false){
        cancelResumeRefresh();
        setRuntimeState('background','hidden');
        stopUiStallProbe();
        if(refreshTimer){clearTimeout(refreshTimer);refreshTimer=null;}
      }
    };
    document.addEventListener('visibilitychange',vis); domListeners.push([document,'visibilitychange',vis]);
    for (const type of ['pointerdown','touchstart','wheel','keydown']) {
      const interaction = event => markPerformanceInteraction(event);
      document.addEventListener(type, interaction, {passive:true});
      domListeners.push([document,type,interaction]);
    }
    startUiStallProbe();
  }

