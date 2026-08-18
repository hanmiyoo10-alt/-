  async function refresh(reason = 'manual', silent = false) {
    if (runtimeDisposed) return;
    const refreshEpoch = runtimeEpoch;
    if (!canBridgeRefresh()) { bridgeLifecycleRuntime.blockedRefreshes += 1; return; }
    const refreshLifecycleGeneration = bridgeLifecycleRuntime.generation;
    if (refreshInFlight) return refreshInFlight;
    if (state.backgroundPause !== false && document.visibilityState === 'hidden') return;
    requestUiStallProbeBurst(reason === 'timer' ? UI_STALL_PROBE_TIMER_BURST_MS : UI_STALL_PROBE_ACTIVE_BURST_MS);
    const started = Date.now();
    const refreshAttribution = beginRefreshAttribution(reason, started);
    const startedPerf = typeof performance?.now === 'function' ? performance.now() : 0;
    const refreshPhaseDurations = Object.create(null);
    const refreshPhaseNow = () => typeof performance?.now === 'function' ? performance.now() : Date.now();
    const finishRefreshPhase = (name, phaseStarted) => {
      const ended = refreshPhaseNow();
      refreshPhaseDurations[String(name)] = Math.max(0, roundPerfMs(ended - Number(phaseStarted || ended)) || 0);
      return ended;
    };
    performanceRuntime.activeRefreshStartedPerf = startedPerf;
    performanceRuntime.activeRefreshReason = String(reason || 'manual');
    const resumeVisibilityRefresh = reason === 'visibility' && performanceRuntime.resumeMeasurePending;
    if (resumeVisibilityRefresh) {
      performanceRuntime.lastResumeRequestedReason = 'visibility';
      performanceRuntime.lastResumeActualReason = 'visibility';
      performanceRuntime.lastResumeRefreshWasCoalesced = false;
      performanceRuntime.lastResumeCoalescedIntoReason = '';
      const visiblePerf = Number(performanceRuntime.resumeVisiblePerf || 0);
      performanceRuntime.lastResumeRefreshStartedAfterMs = visiblePerf > 0 && startedPerf > 0
        ? roundPerfMs(startedPerf - visiblePerf)
        : null;
    }
    refreshInFlight = (async () => {
      try {
        let refreshPhaseStarted = refreshPhaseNow();
        const managerStatus = await fetchBridgeManagerStatus(reason !== 'timer');
        finishRefreshPhase('manager-probe', refreshPhaseStarted);
        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        refreshPhaseStarted = refreshPhaseNow();
        const managerSynced = await syncBridgeManagerIfNeeded(managerStatus);
        finishRefreshPhase('manager-sync', refreshPhaseStarted);
        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        refreshPhaseStarted = refreshPhaseNow();
        const managerAdopted = await adoptBridgeEngineIfNeeded(managerSynced);
        finishRefreshPhase('engine-adopt', refreshPhaseStarted);
        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        refreshPhaseStarted = refreshPhaseNow();
        const managerRuntime = await syncBridgeEngineBundleIfNeeded(managerAdopted);
        finishRefreshPhase('engine-sync', refreshPhaseStarted);
        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        state.bridgeManagerRuntime = managerRuntime;
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        refreshPhaseStarted = refreshPhaseNow();
        const providerManagerCachePromise = fetchProviderManagerCacheObservability();
        const snapshot = await fetchSnapshot();
        finishRefreshPhase('snapshot', refreshPhaseStarted);
        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        refreshPhaseStarted = refreshPhaseNow();
        state.data = applyObservedToday(snapshot);
        finishRefreshPhase('normalize-ledger', refreshPhaseStarted);
        refreshPhaseStarted = refreshPhaseNow();
        const providerManagerCache = await providerManagerCachePromise;
        enrichDataWithProviderManagerCache(state.data, providerManagerCache);
        finishRefreshPhase('provider-cache', refreshPhaseStarted);
        if (state.data?.creditsOrganizationFallback && state.data?.creditsOrganizationId) {
          const from = String(state.data.requestedCreditsOrganizationId || state.selectedCreditsOrgId || '');
          const to = String(state.data.creditsOrganizationId || '');
          if (from && to && from !== to) {
            state.creditsOrgFallbackCount = Number(state.creditsOrgFallbackCount || 0) + 1;
            state.creditsOrgLastFallbackFrom = from;
            state.creditsOrgLastFallbackTo = to;
          }
          state.selectedCreditsOrgId = to;
        }
        collectRecentRequestLedger(state.data);
        state.bridgeStatus = 'connected';
        state.bridgeError = '';
        state.lastSyncAt = Date.now();
        performanceRuntime.lastHealthySyncAt = state.lastSyncAt;
        state.lastSyncDurationMs = state.lastSyncAt - started;
        noteRefreshPerformance(state.lastSyncDurationMs, reason);
        state.lastRefreshReason = reason;
        state.refreshCount = Number(state.refreshCount || 0) + 1;
        state.consecutiveFailures = 0;
        state.retryDelayMs = 0;
        state.nextRetryAt = null;
        updateRuntimeState('refresh-success');
        refreshPhaseStarted = refreshPhaseNow();
        await persistRefreshState('refresh-success-persist');
        finishRefreshPhase('persist', refreshPhaseStarted);
        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        refreshPhaseStarted = refreshPhaseNow();
        await renderRefreshWidget(reason, 'refresh-success-render');
        finishRefreshPhase('widget-render', refreshPhaseStarted);
        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        if (resumeVisibilityRefresh) {
          performanceRuntime.lastResumeRefreshMs = state.lastSyncDurationMs;
          performanceRuntime.lastResumeRenderMs = performanceRuntime.lastRenderMs;
          pushPerformanceSample('resumeRefreshSamples', state.lastSyncDurationMs);
        }
        scheduleRefresh();
        schedulePanelRender(false);
      } catch (e) {
        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        // Keep the last successful snapshot in state.data; only status changes.
        state.bridgeStatus = 'error';
        state.bridgeError = e?.message || String(e);
        state.lastRefreshReason = reason;
        state.consecutiveFailures = Number(state.consecutiveFailures || 0) + 1;
        state.retryDelayMs = retryDelayFor(state.consecutiveFailures);
        state.nextRetryAt = Number(state.refreshMs) > 0 ? Date.now() + state.retryDelayMs : null;
        updateRuntimeState('refresh-error');
        await persistRefreshState('refresh-error-persist');
        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        // Keep the last good values, but immediately repaint the widget so
        // LIVE changes to OFFLINE as soon as a refresh fails. Local persist/render
        // failures must not abort retry scheduling or masquerade as bridge errors.
        await renderRefreshWidget(reason, 'refresh-error-render');
        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        scheduleRefresh();
        if (!silent) console.log(`[Local Usage Dashboard] ${state.bridgeError}`);
        schedulePanelRender(false);
      }
    })();
    try { await refreshInFlight; } finally {
      const endedPerf = typeof performance?.now === 'function' ? performance.now() : 0;
      if (startedPerf > 0 && endedPerf >= startedPerf) {
        performanceRuntime.lastRefreshStartedPerf = startedPerf;
        performanceRuntime.lastRefreshEndedPerf = endedPerf;
      }
      performanceRuntime.lastRefreshPhases = {...refreshPhaseDurations};
      const slowestRefreshPhase = Object.entries(refreshPhaseDurations).sort((a,b) => Number(b[1] || 0) - Number(a[1] || 0))[0] || null;
      performanceRuntime.lastRefreshSlowestPhase = slowestRefreshPhase ? String(slowestRefreshPhase[0]) : '';
      performanceRuntime.lastRefreshSlowestPhaseMs = slowestRefreshPhase ? Number(slowestRefreshPhase[1]) : null;
      const attributionStatus = state.lastRefreshReason === reason
        ? (state.bridgeStatus === 'connected' ? 'ok' : state.bridgeStatus === 'error' ? 'error' : String(state.bridgeStatus || 'unknown'))
        : 'unknown';
      const attributionDataDuration = attributionStatus === 'ok' && num(state.lastSyncDurationMs) ? Number(state.lastSyncDurationMs) : null;
      finishRefreshAttribution(refreshAttribution, attributionStatus, Date.now() - started, attributionDataDuration);
      performanceRuntime.activeRefreshStartedPerf = 0;
      performanceRuntime.activeRefreshReason = '';
      refreshInFlight = null;
      if (runtimeIsCurrent(refreshEpoch)) updateRuntimeState('refresh-complete');
    }
  }
