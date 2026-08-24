
  const diagnosticsRuntimeWeightLegacyDetailedSections = diagnosticsWorkspaceDetailedSections;
  const RUNTIME_WEIGHT_REQUEST_LEDGER_LIMIT = 2000;

  function runtimeWeightAuditKnown(value) {
    return value !== null && value !== undefined && Number.isFinite(Number(value)) ? Number(value) : null;
  }

  function runtimeWeightAuditMs(value) {
    const known = runtimeWeightAuditKnown(value);
    return known === null ? 'UNKNOWN' : `${roundPerfMs(known)}ms`;
  }

  function runtimeWeightAuditTimers() {
    return [
      ['refresh', refreshTimer],
      ['reset-sync', resetSyncTimer],
      ['refresh-scheduler', refreshSchedulerTimer],
      ['panel-render', panelRenderTimer],
      ['ui-stall-probe', uiStallProbeTimer],
      ['resume-probe', resumeProbeTimer],
      ['resume-measure', resumeMeasureTimer],
      ['resume-refresh', resumeRefreshTimer],
    ];
  }

  function runtimeWeightAuditModel() {
    const bridgeDiag = bridgeStabilitySnapshot();
    const snapshotPerformance = bridgeDiag.snapshotPerformance && typeof bridgeDiag.snapshotPerformance === 'object'
      ? bridgeDiag.snapshotPerformance
      : null;
    const secondary = snapshotPerformance?.secondaryRefresh && typeof snapshotPerformance.secondaryRefresh === 'object'
      ? snapshotPerformance.secondaryRefresh
      : null;
    const phases = performanceRuntime.lastRefreshPhases && typeof performanceRuntime.lastRefreshPhases === 'object'
      ? performanceRuntime.lastRefreshPhases
      : null;
    const timers = runtimeWeightAuditTimers();
    const activeTimers = timers.filter(([, handle]) => handle !== null).map(([name]) => name);
    const idleHandles = [refreshSchedulerIdleHandle, panelIdleHandle].filter(handle => handle !== null).length;
    const ledgerRows = Array.isArray(state.requestLedger) ? state.requestLedger.length : 0;
    const responsiveStyleKeys = widgetRenderCache?.responsiveStyles && typeof widgetRenderCache.responsiveStyles === 'object'
      ? Object.keys(widgetRenderCache.responsiveStyles).length
      : 0;
    const widgetCacheFields = ['html','width','display','layout'].filter(key => widgetRenderCache?.[key] !== null && widgetRenderCache?.[key] !== undefined).length;
    return {
      ledgerRows,
      ledgerLimit:RUNTIME_WEIGHT_REQUEST_LEDGER_LIMIT,
      stateKeys:state && typeof state === 'object' ? Object.keys(state).length : null,
      activeTimers,
      timerSlots:timers.length,
      idleHandles,
      observerActive:resumeLongTaskObserver !== null,
      remoteListeners:Array.isArray(remoteListeners) ? remoteListeners.length : null,
      widgetRemoteListeners:Array.isArray(widgetRemoteListeners) ? widgetRemoteListeners.length : null,
      domListeners:Array.isArray(domListeners) ? domListeners.length : null,
      refreshInFlight:Boolean(refreshInFlight),
      resumePending:Boolean(performanceRuntime.resumePending),
      resumeMeasurePending:Boolean(performanceRuntime.resumeMeasurePending),
      schedulerQueued:Number(performanceRuntime.schedulerQueued || 0),
      schedulerMerged:Number(performanceRuntime.schedulerMerged || 0),
      schedulerExecuted:Number(performanceRuntime.schedulerExecuted || 0),
      schedulerDeferred:Number(performanceRuntime.schedulerDeferredForInteraction || 0),
      bridgeCacheEntries:runtimeWeightAuditKnown(bridgeDiag.cacheEntries),
      bridgeCacheInFlight:runtimeWeightAuditKnown(bridgeDiag.inFlight),
      cliActive:runtimeWeightAuditKnown(bridgeDiag.cliActive),
      cliQueued:runtimeWeightAuditKnown(bridgeDiag.cliQueued),
      secondaryQueued:runtimeWeightAuditKnown(secondary?.queued),
      secondaryRunning:runtimeWeightAuditKnown(secondary?.running),
      widgetCacheFields,
      responsiveStyleKeys,
      normalizeMs:runtimeWeightAuditKnown(phases?.['normalize-ledger']),
      persistMs:runtimeWeightAuditKnown(phases?.persist),
      widgetRenderPhaseMs:runtimeWeightAuditKnown(phases?.['widget-render']),
      renderMs:runtimeWeightAuditKnown(performanceRuntime.lastRenderMs),
      panelRenderMs:runtimeWeightAuditKnown(performanceRuntime.lastPanelRenderMs),
      persistWrites:Number(powerRuntime.persistWrites || 0),
      staleAsyncDrops:Number(staleAsyncDrops || 0),
    };
  }

  function runtimeWeightAuditValue(value) {
    return value === null || value === undefined ? 'UNKNOWN' : String(value);
  }

  function runtimeWeightAuditLines(model = runtimeWeightAuditModel()) {
    const timerNames = model.activeTimers.length ? model.activeTimers.join(',') : 'none';
    return [
      'Runtime Weight Audit: measurement-only · network 0 · CLI 0 · polling 0 · heap bytes UNKNOWN · pruning 0',
      `Retained state: Request Ledger ${model.ledgerRows}/${model.ledgerLimit} · state keys ${runtimeWeightAuditValue(model.stateKeys)} · widget cache fields ${model.widgetCacheFields}/4 · responsive style keys ${model.responsiveStyleKeys}`,
      `Lifecycle ownership: timers ${model.activeTimers.length}/${model.timerSlots} [${timerNames}] · idle handles ${model.idleHandles}/2 · long-task observer ${model.observerActive ? 'active' : 'idle'}`,
      `Listener ownership: remote ${runtimeWeightAuditValue(model.remoteListeners)} · widget remote ${runtimeWeightAuditValue(model.widgetRemoteListeners)} · DOM ${runtimeWeightAuditValue(model.domListeners)}`,
      `In-flight ownership: refresh ${model.refreshInFlight ? 'active' : 'idle'} · resume ${model.resumePending ? 'pending' : 'idle'} · resume measure ${model.resumeMeasurePending ? 'pending' : 'idle'} · stale async drops ${model.staleAsyncDrops}`,
      `Scheduler counters: queued ${model.schedulerQueued} · merged ${model.schedulerMerged} · executed ${model.schedulerExecuted} · interaction deferred ${model.schedulerDeferred}`,
      `Bridge retained work: cache entries ${runtimeWeightAuditValue(model.bridgeCacheEntries)} · cache in-flight ${runtimeWeightAuditValue(model.bridgeCacheInFlight)} · CLI active ${runtimeWeightAuditValue(model.cliActive)} · CLI queued ${runtimeWeightAuditValue(model.cliQueued)} · secondary queued ${runtimeWeightAuditValue(model.secondaryQueued)} · running ${runtimeWeightAuditValue(model.secondaryRunning)}`,
      `Local cost: normalize-ledger ${runtimeWeightAuditMs(model.normalizeMs)} · persist ${runtimeWeightAuditMs(model.persistMs)} · widget-render phase ${runtimeWeightAuditMs(model.widgetRenderPhaseMs)} · last render ${runtimeWeightAuditMs(model.renderMs)} · panel ${runtimeWeightAuditMs(model.panelRenderMs)} · persist writes ${model.persistWrites}`,
      'Slimming decision: S0 evidence only · removal classification pending repository/real-device evidence',
    ];
  }

  diagnosticsWorkspaceDetailedSections = function runtimeWeightAuditDetailedSections() {
    const sections = diagnosticsRuntimeWeightLegacyDetailedSections();
    return [...sections, {key:'runtime-weight', title:'Runtime Weight Audit', lines:runtimeWeightAuditLines()}];
  };
