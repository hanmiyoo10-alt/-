
  function refreshPhaseTimingText(phases = performanceRuntime.lastRefreshPhases) {
    const rows = Object.entries(phases && typeof phases === 'object' ? phases : {})
      .filter(([,value]) => num(value))
      .sort((a,b) => Number(b[1]) - Number(a[1]));
    return rows.length ? rows.map(([name,value]) => `${name} ${roundPerfMs(value)}ms`).join(' · ') : '—';
  }

  function stableReadinessSnapshot(bridgeDiag, runtimeBridge) {
    const blockers = [];
    const lifecycle = bridgeLifecycleMode();
    if (lifecycle !== 'live') blockers.push(`lifecycle ${lifecycle}`);
    if (bridgeDiag?.compatible !== true) blockers.push(`bridge compatibility ${bridgeDiag?.compatible === false ? 'no' : 'unknown'}`);
    if (String(bridgeDiag?.version || '') !== REQUIRED_BRIDGE_VERSION) blockers.push(`engine ${bridgeDiag?.version || '—'}`);
    if (!runtimeBridge?.managerInstalled) blockers.push('manager absent');
    if (String(runtimeBridge?.managerVersion || '') !== '1.2.6') blockers.push(`manager ${runtimeBridge?.managerVersion || '—'}`);
    const managerProduct = String(state.bridgeManagerRuntime?.productVersion || '');
    const managerSync = String(state.bridgeManagerSyncedProductVersion || '');
    if (managerProduct && managerProduct !== VERSION) blockers.push(`manager product ${managerProduct}`);
    if (managerSync && managerSync !== VERSION) blockers.push(`manager sync ${managerSync}`);
    if (Number(localRuntimeErrors.count || 0) > 0) blockers.push(`local errors ${Number(localRuntimeErrors.count || 0)}`);
    if (Number(state.consecutiveFailures || 0) > 0) blockers.push(`refresh failures ${Number(state.consecutiveFailures || 0)}`);
    const updaterCompatible = /^3\.0\.0-alpha\.5\.(?:4[6-9]|[5-9]\d|\d{3,})$/.test(VERSION) || /^3\.[1-9]\d*\.\d+$/.test(VERSION);
    if (!updaterCompatible) blockers.push('updater version ordering');
    return {ready:blockers.length === 0, blockers, updaterCompatible};
  }

  function cacheObserverDiagnosticText(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const tokenRows = list.filter(row => [row?.cachedInputTokens,row?.cacheReadInputTokens,row?.cacheCreationInputTokens].some(num));
    const sources = [...new Set(tokenRows.map(row => String(row?.cacheMetricSource || '')).filter(Boolean))].sort();
    const readKnown = list.filter(row => num(row?.cacheReadInputTokens)).length;
    const writeKnown = list.filter(row => num(row?.cacheCreationInputTokens)).length;
    return `independent · protocol cache-observability-v1 · parser provider-usage-v1 · source sanitized LLMGateway /logs · token rows ${tokenRows.length}/${list.length} · read known ${readKnown}/${list.length} · write known ${writeKnown}/${list.length} · parser sources ${sources.join(',') || 'none'}`;
  }

  function diagText() {
    const diagnosticCapturedAt = Date.now();
    const d = state.data || {}, h = d.health || {};
    const bridgeDiag = bridgeStabilitySnapshot();
    const runtimeBridge = bridgeRuntimeSnapshot();
    const diagUsageKey = ['all','devpass','credits'].includes(String(state.usageScopeView)) ? String(state.usageScopeView) : 'all';
    const diagUsage = d.usageScopes?.scopes?.[diagUsageKey] || null;
    const diagLedgerRows = requestLedgerRowsForScope(diagUsageKey);
    const diagLedgerHours = new Set(diagLedgerRows.map(row => requestHourKey(row.timestamp)).filter(Boolean)).size;
    const diagLedgerFidelity = requestLedgerCapabilities(diagLedgerRows);
    const diagCacheObservability = requestCacheObservabilityStats(diagLedgerRows);
    const diagDevpassRows = requestLedgerRowsForScope('devpass');
    const diagTierFidelity = requestServiceTierStats(diagDevpassRows);
    const diagOutcome = requestOutcomeStats(diagDevpassRows);
    const stableReadiness = stableReadinessSnapshot(bridgeDiag, runtimeBridge);
    const diagAccount = d.devpassAccount && typeof d.devpassAccount === 'object' ? d.devpassAccount : null;
    return [
      `Local Usage Dashboard v${VERSION}`,
      `Diagnostic captured: ${diagnosticTimestamp(diagnosticCapturedAt)}`,
      `Runtime loaded at: ${diagnosticTimestamp(RUNTIME_LOADED_AT)}`,
      `Runtime uptime: ${diagnosticUptime(diagnosticCapturedAt - RUNTIME_LOADED_AT)}`,
      `Unified runtime: schema v${PRODUCT_RUNTIME_SCHEMA_VERSION} · product ${VERSION} · plugin bundled · bridge ${runtimeBridge.mode} · manager ${runtimeBridge.managerInstalled ? 'installed' : 'absent'}`,
      `Bridge manager: protocol ${runtimeBridge.managerProtocol} · installed ${runtimeBridge.managerInstalled ? 'yes' : 'no'} · self-update ${runtimeBridge.selfUpdate ? 'yes' : 'no'} · engine-managed ${runtimeBridge.engineManaged ? 'yes' : 'no'} · ${runtimeBridge.managerVersion ? `v${runtimeBridge.managerVersion}` : 'v—'} · target ${BRIDGE_MANAGER_PROTOCOL}`,
      `Bridge manager probe: ${state.bridgeManagerRuntime?.connected ? 'connected' : 'unavailable'} · checked ${state.bridgeManagerRuntime?.checkedAt ? age(state.bridgeManagerRuntime.checkedAt) : '—'} · product ${state.bridgeManagerRuntime?.productVersion || '—'} · sync ${state.bridgeManagerSyncedProductVersion || 'none'}`,
      `Bridge manager sync: action ${state.bridgeManagerRuntime?.lastSyncAction || 'none'} · target ${state.bridgeManagerRuntime?.syncTarget || '—'} · error ${state.bridgeManagerRuntime?.syncError || 'none'}`,
      `Bridge engine sync: bundle ${state.bridgeManagerRuntime?.engineBundleSyncState || 'none'} · error ${state.bridgeManagerRuntime?.engineBundleSyncError || 'none'}`,
      `Bridge engine: mode ${runtimeBridge.engineMode} · managed ${runtimeBridge.engineManaged ? 'yes' : 'no'} · adoption ${runtimeBridge.engineAdoption ? 'ready' : 'no'} · service ${runtimeBridge.engineService || '—'} · candidate ${runtimeBridge.candidateSafe === null ? 'unknown' : runtimeBridge.candidateSafe ? 'safe' : 'unsafe'} · state ${state.bridgeManagerRuntime?.adoptionState || '—'}`,
      `Runtime manifest: ${RUNTIME_MANIFEST_URL}`,
      `Bridge: ${state.bridgeStatus} · ${state.bridgeBase}`,
      `Bridge lifecycle: ${bridgeLifecycleMode()} · generation ${Number(bridgeLifecycleRuntime.generation || 0)} · token ${token ? 'yes' : 'no'} · paused ${state.bridgePausedAt ? age(state.bridgePausedAt) : 'none'} · last reconnect ${state.bridgeLastReconnectAt ? age(state.bridgeLastReconnectAt) : '—'} · token cleared ${state.bridgeTokenClearedAt ? age(state.bridgeTokenClearedAt) : 'never'}`,
      `Lifecycle refresh: drops ${Number(bridgeLifecycleRuntime.refreshDrops || 0)} · blocked ${Number(bridgeLifecycleRuntime.blockedRefreshes || 0)} · last transition ${bridgeLifecycleRuntime.lastTransitionFrom || '—'} → ${bridgeLifecycleRuntime.lastTransitionTo || '—'} · reason ${bridgeLifecycleRuntime.lastTransitionReason || '—'} · ${bridgeLifecycleRuntime.lastTransitionAt ? age(bridgeLifecycleRuntime.lastTransitionAt) : '—'}`,
      `Protocol: ${num(d.protocolVersion) ? d.protocolVersion : '—'}` ,
      `Source: ${d.source || '—'}`,
      `Adapter: devpass-bridge-v1.6.x + local-json-v1`,
      `Schema: snapshot v${SNAPSHOT_SCHEMA_VERSION} · recent-request v${RECENT_REQUEST_SCHEMA_VERSION}`,
      `Stable readiness: ${stableReadiness.ready ? 'READY' : 'BLOCKED'} · updater ${stableReadiness.updaterCompatible ? 'compatible' : 'incompatible'} · blockers ${stableReadiness.blockers.join(', ') || 'none'}`,
      `Stable contract: engine ${REQUIRED_BRIDGE_VERSION} · manager 1.2.6 · snapshot v${SNAPSHOT_SCHEMA_VERSION} · recent-request v${RECENT_REQUEST_SCHEMA_VERSION} · state v3`,
      `Health: ${h.status || '—'}`,
      `Bridge detail: ${bridgeDiag.version ? `v${bridgeDiag.version}` : '—'} · required >=${REQUIRED_BRIDGE_VERSION} · compatible ${bridgeDiag.compatible === null ? 'unknown' : bridgeDiag.compatible ? 'yes' : 'no'} · snapshot ${bridgeDiag.fetchedAt ? age(bridgeDiag.fetchedAt) : '—'}`,
      `Bridge modules: ${bridgeDiag.moduleCount ?? '—'} · stale ${bridgeDiag.staleModules ?? '—'} · errors ${bridgeDiag.errorModules ?? '—'}`,
      `Bridge module freshness: ${bridgeModuleFreshnessText(bridgeDiag.moduleDetails)}`,
      `Bridge module duration: ${bridgeModuleDurationText(bridgeDiag.moduleDetails)}`,
      `Bridge partial: modules ${bridgeDiag.partialModules ?? '—'} · usage ${countErrorMap(d.usageScopes?.errors)} · analytics ${countErrorMap(d.analyticsScopes?.errors)}`,
      `Bridge cache: hit ${bridgeDiag.cacheHitRate === null ? '—' : `${bridgeDiag.cacheHitRate.toFixed(0)}%`} · entries ${bridgeDiag.cacheEntries ?? '—'} · in-flight ${bridgeDiag.inFlight ?? '—'} · stale fallback ${bridgeDiag.staleFallbacks ?? '—'}`,
      `Bridge CLI/circuit: active ${bridgeDiag.cliActive ?? '—'} · queued ${bridgeDiag.cliQueued ?? '—'} · open ${bridgeDiag.openCircuits ?? '—'} · recoveries ${bridgeDiag.circuitRecoveries ?? '—'}`,
      `Usage detail: ${diagUsageKey} · providers ${Array.isArray(diagUsage?.providers) ? diagUsage.providers.length : 0} · models ${Array.isArray(diagUsage?.models) ? diagUsage.models.length : 0} · recent requests ${Array.isArray(diagUsage?.recent) ? diagUsage.recent.length : 0} · source rows ${Number(diagUsage?.recentRawCount || 0)} · cache ${usageCacheText(diagUsage)}`,
      `UI layout: usage-first · aggregate enriched · recent metadata · advanced collapsed`,
      `Navigation: tabbed · overview/devpass/credits/analytics/settings · view ${state.dashboardView || 'overview'} · persisted`,
      `Recent UI: filter ${['all','success','error'].includes(String(state.recentRequestFilter)) ? state.recentRequestFilter : 'all'} · aggregate chips · mobile compact`,
      `Request ledger: rows ${diagLedgerRows.length} · hours ${diagLedgerHours} · source ${diagUsage?.recentSourceKey || 'none'} · 24h local observed · selected ${state.selectedHourKey || 'none'} · since ${state.requestLedgerStartedAt ? age(state.requestLedgerStartedAt) : '—'}`,
      `Request fidelity: exact ${diagLedgerFidelity.exact}/${diagLedgerFidelity.rows} · bucket ${diagLedgerFidelity.bucket}/${diagLedgerFidelity.rows} · cache known ${diagLedgerFidelity.cacheKnown}/${diagLedgerFidelity.rows} · cache tokens ${diagLedgerFidelity.cacheTokenKnown}/${diagLedgerFidelity.rows} · ids ${diagLedgerFidelity.ids}/${diagLedgerFidelity.rows}`,
      `Cache observability: ${cacheObservabilitySummaryText(diagCacheObservability)} · token rows ${diagCacheObservability.tokenKnown}/${diagCacheObservability.rows} · 5m write ${Number(diagCacheObservability.cacheCreation5mTokens || 0).toLocaleString()} · 1h write ${Number(diagCacheObservability.cacheCreation1hTokens || 0).toLocaleString()}`,
      `Cache observer: ${cacheObserverDiagnosticText(diagLedgerRows)}`,
      `Cache semantics: request HIT rate != token Read ratio · cached total != explicit Read · unknown stays unknown · source request metadata / Bridge aggregates / independent provider usage parser`,
      `Service tier fidelity: requested known ${diagTierFidelity.requestedKnown}/${diagTierFidelity.rows} · served known ${diagTierFidelity.servedKnown}/${diagTierFidelity.rows} · served flex ${diagTierFidelity.flex} · standard ${diagTierFidelity.standard} · priority ${diagTierFidelity.priority} · unknown ${diagTierFidelity.unknown}`,
      `Service tier source fields: requested ${diagTierFidelity.requestedSources.join(',') || 'none'} · served ${diagTierFidelity.servedSources.join(',') || 'none'}`,
      `Request outcome taxonomy: success ${diagOutcome.success} · error ${diagOutcome.error} · cancelled ${diagOutcome.cancelled} · unknown ${diagOutcome.unknown} · rows ${diagOutcome.rows}`,
      `DevPass account tier: service ${diagAccount?.serviceTier || '—'} · routing ${diagAccount?.routingStrategy || '—'} · pending ${diagAccount?.pendingTier || '—'} · personal org ${diagAccount?.hasPersonalOrg === null || diagAccount?.hasPersonalOrg === undefined ? '—' : diagAccount.hasPersonalOrg ? 'yes' : 'no'}`,
      `DevPass account detail: plan ${diagAccount?.plan || '—'} · cycle ${diagAccount?.cycle || '—'} · status ${!diagAccount ? '—' : diagAccount.cancelled ? 'cancelled' : String(diagAccount.plan || 'none') !== 'none' ? 'active' : '—'} · reset total ${num(d.weekly?.resetPasses) ? Number(d.weekly.resetPasses) : '—'} · purchased ${num(diagAccount?.resetPasses) ? Number(diagAccount.resetPasses) : '—'} · included remaining ${num(diagAccount?.includedResetPassesRemaining) ? Number(diagAccount.includedResetPassesRemaining) : '—'} · price ${money(diagAccount?.resetPassPrice)} · PAYG ${diagAccount?.paygEnabled ? 'on' : 'off'} · regular credits ${money(diagAccount?.regularCredits)}`,
      `Hourly drilldown: local observed · selected-hour lazy render · request cache HIT/MISS · service tier`,
      `Hourly detail: provider/model summary · cache coverage · click-only partial render · writes ${Number(performanceRuntime.hourlyDetailWrites || 0)} · skips ${Number(performanceRuntime.hourlyDetailSkips || 0)} · fallback ${Number(performanceRuntime.hourlyDetailFallbacks || 0)}`,
      `Runtime state: ${performanceRuntime.runtimeState} · transitions ${Number(performanceRuntime.runtimeTransitions || 0)} · reason ${state.runtimeStatus?.reason || '—'} · healthy ${performanceRuntime.lastHealthySyncAt ? age(performanceRuntime.lastHealthySyncAt) : '—'} · degraded ${performanceRuntime.degradedSince ? age(performanceRuntime.degradedSince) : 'none'}`,
      `Last sync: ${state.lastSyncAt ? new Date(Number(state.lastSyncAt)).toISOString() : '—'}`,
      `Duration: ${num(state.lastSyncDurationMs) ? `${state.lastSyncDurationMs}ms` : '—'}`,
      `Refresh phase duration: ${refreshPhaseTimingText()}`,
      `Refresh slowest phase: ${performanceRuntime.lastRefreshSlowestPhase || '—'} · ${num(performanceRuntime.lastRefreshSlowestPhaseMs) ? `${roundPerfMs(performanceRuntime.lastRefreshSlowestPhaseMs)}ms` : '—'}`,
      `Reason: ${state.lastRefreshReason || '—'}`,
      `Success count: ${Number(state.refreshCount || 0)}`,
      `Refresh requests: manual ${Number(refreshAttributionRuntime.requested.manual || 0)} · timer ${Number(refreshAttributionRuntime.requested.timer || 0)} · visibility ${Number(refreshAttributionRuntime.requested.visibility || 0)} · init ${Number(refreshAttributionRuntime.requested.init || 0)} · other ${Object.entries(refreshAttributionRuntime.requested).filter(([key]) => !['manual','timer','visibility','init'].includes(key)).reduce((sum,[,value]) => sum + Number(value || 0), 0)}`,
      `Refresh executions: manual ${Number(refreshAttributionRuntime.executed.manual?.count || 0)} · timer ${Number(refreshAttributionRuntime.executed.timer?.count || 0)} · visibility ${Number(refreshAttributionRuntime.executed.visibility?.count || 0)} · init ${Number(refreshAttributionRuntime.executed.init?.count || 0)} · active ${refreshAttributionRuntime.active?.key || 'none'}`,
      `Last manual refresh: ${refreshAttributionDetail('manual')}`,
      `Last timer refresh: ${refreshAttributionDetail('timer')}`,
      `Last visibility refresh: ${refreshAttributionDetail('visibility')}`,
      `Performance guard: ${state.performanceGuard === false ? 'off' : performanceRuntime.mode} · x${Number(performanceRuntime.adaptiveMultiplier || 1)} · timer-only`,
      `Performance settings: focus ${state.syncOnFocus === false ? 'off' : 'on'} · guard ${state.performanceGuard === false ? 'off' : 'on'} · adaptive ${state.adaptiveRefresh === false ? 'off' : 'on'} · background pause ${state.backgroundPause === false ? 'off' : 'on'}`,
      `Power guard: adaptive-probe · idle ${UI_STALL_PROBE_IDLE_INTERVAL_MS}ms · burst ${UI_STALL_PROBE_INTERVAL_MS}ms · timer-burst ${UI_STALL_PROBE_TIMER_BURST_MS}ms · active-burst ${UI_STALL_PROBE_ACTIVE_BURST_MS}ms`,
      `Power activity: probe ${Date.now() < Number(powerRuntime.probeBurstUntil || 0) ? 'burst' : 'idle'} · wakeups ${powerRuntime.probeWakeups} · idle ${powerRuntime.probeIdleWakeups} · burst ${powerRuntime.probeBurstWakeups} · persist writes ${powerRuntime.persistWrites} · widget renders ${powerRuntime.widgetRenderCalls}`,
      `Mobile style cache: writes ${powerRuntime.responsiveStyleWrites} · skips ${powerRuntime.responsiveStyleSkips} · layout ${widgetRenderCache.layout || 'none'}`,
      `Guard samples: timer ${Number(performanceRuntime.timerSamples || 0)} · ignored ${Number(performanceRuntime.ignoredSamples || 0)} · slow streak ${Number(performanceRuntime.slowRefreshes || 0)}`,
      `UI stall probe: ${performanceRuntime.uiStallProbeActive ? 'active' : 'paused'} · ≥50ms ${Number(performanceRuntime.uiStallCount50 || 0)} · ≥100ms ${Number(performanceRuntime.uiStallCount100 || 0)} · ≥200ms ${Number(performanceRuntime.uiStallCount200 || 0)} · max ${roundPerfMs(performanceRuntime.uiStallMaxMs) || 0}ms`,
      `Last UI stall: ${num(performanceRuntime.lastUiStallMs) ? `${roundPerfMs(performanceRuntime.lastUiStallMs)}ms · refresh overlap ${performanceRuntime.lastUiStallRefreshOverlap ? 'yes' : 'no'} · render overlap ${performanceRuntime.lastUiStallRenderOverlap ? 'yes' : 'no'}${performanceRuntime.lastUiStallRenderOverlap ? ` (${performanceRuntime.lastUiStallRenderReason || 'unknown'} · ${num(performanceRuntime.lastUiStallRenderMs) ? `${roundPerfMs(performanceRuntime.lastUiStallRenderMs)}ms` : '—'})` : ''} · ${age(performanceRuntime.lastUiStallAt)}` : 'none'}`,
      `Resume probe: events ${Number(performanceRuntime.resumeEvents || 0)} · reason ${performanceRuntime.lastResumeReason || '—'} · main-thread lag ${num(performanceRuntime.lastResumeMainThreadLagMs) ? `${roundPerfMs(performanceRuntime.lastResumeMainThreadLagMs)}ms` : '—'} · after ${num(performanceRuntime.lastResumeProbeAfterMs) ? `${roundPerfMs(performanceRuntime.lastResumeProbeAfterMs)}ms` : '—'} · refresh overlap ${performanceRuntime.lastResumeProbeDuringRefresh ? 'yes' : 'no'}`,
      `Resume input: first ${num(performanceRuntime.lastResumeFirstInputAfterMs) ? `${roundPerfMs(performanceRuntime.lastResumeFirstInputAfterMs)}ms` : '—'} · event delay ${num(performanceRuntime.lastResumeInputDelayMs) ? `${roundPerfMs(performanceRuntime.lastResumeInputDelayMs)}ms` : '—'} · frame ${num(performanceRuntime.lastResumeFrameDelayMs) ? `${roundPerfMs(performanceRuntime.lastResumeFrameDelayMs)}ms` : '—'} · refresh overlap ${performanceRuntime.lastResumeInputDuringRefresh ? 'yes' : 'no'}`,
      `Resume refresh: started ${num(performanceRuntime.lastResumeRefreshStartedAfterMs) ? `${roundPerfMs(performanceRuntime.lastResumeRefreshStartedAfterMs)}ms after` : '—'} · duration ${num(performanceRuntime.lastResumeRefreshMs) ? `${roundPerfMs(performanceRuntime.lastResumeRefreshMs)}ms` : '—'} · render ${num(performanceRuntime.lastResumeRenderMs) ? `${roundPerfMs(performanceRuntime.lastResumeRenderMs)}ms` : '—'} · active at entry ${performanceRuntime.lastResumeHadRefreshAtEntry ? 'yes' : 'no'}`,
      `Resume route: requested ${performanceRuntime.lastResumeRequestedReason || '—'} · actual ${performanceRuntime.lastResumeActualReason || '—'} · merged ${performanceRuntime.lastResumeRefreshWasCoalesced ? 'yes' : 'no'}${performanceRuntime.lastResumeRefreshWasCoalesced ? ` · into ${performanceRuntime.lastResumeCoalescedIntoReason || 'unknown'}` : ''}`,
      `Resume long task: ${performanceRuntime.longTaskSupported ? 'supported' : 'unsupported'} · count ${Number(performanceRuntime.resumeLongTaskCount || 0)} · ${num(performanceRuntime.lastResumeLongTaskMs) ? `last ${roundPerfMs(performanceRuntime.lastResumeLongTaskMs)}ms @ +${roundPerfMs(performanceRuntime.lastResumeLongTaskStartedAfterMs)}ms · refresh overlap ${performanceRuntime.lastResumeLongTaskDuringRefresh ? 'yes' : 'no'}` : 'last none'}`,
      `Resume grace: ${performanceRuntime.resumePending ? 'pending' : 'idle'} · delay ${num(performanceRuntime.lastResumeDelayMs) ? `${Number(performanceRuntime.lastResumeDelayMs)}ms` : '—'} · deferred ${Number(performanceRuntime.resumeDeferred || 0)} · coalesced ${Number(performanceRuntime.resumeCoalesced || 0)} · quiet ${RESUME_INTERACTION_QUIET_MS}ms · max ${RESUME_MAX_DEFER_MS}ms`,
      `Scheduler: pending ${refreshSchedulerState.pending ? 'yes' : 'no'} · running ${refreshSchedulerState.running ? 'yes' : 'no'} · queued ${Number(performanceRuntime.schedulerQueued || 0)} · merged ${Number(performanceRuntime.schedulerMerged || 0)} · executed ${Number(performanceRuntime.schedulerExecuted || 0)} · interaction defer ${Number(performanceRuntime.schedulerDeferredForInteraction || 0)} · last ${refreshSchedulerState.lastReason || '—'}`,
      `Render: widget ${num(performanceRuntime.lastRenderMs) ? `${roundPerfMs(performanceRuntime.lastRenderMs)}ms` : '—'} · panel ${num(performanceRuntime.lastPanelRenderMs) ? `${roundPerfMs(performanceRuntime.lastPanelRenderMs)}ms` : '—'} · reason ${performanceRuntime.lastRenderReason || '—'} · phases ${renderBreakdownText(performanceRuntime.lastRenderBreakdown)}`,
      `Render spike: ≥${RENDER_SPIKE_THRESHOLD_MS}ms · count ${Number(performanceRuntime.renderSpikeCount || 0)} · ${num(performanceRuntime.lastRenderSpikeMs) ? `last ${roundPerfMs(performanceRuntime.lastRenderSpikeMs)}ms · reason ${performanceRuntime.lastRenderSpikeReason || '—'} · refresh overlap ${performanceRuntime.lastRenderSpikeRefreshOverlap ? 'yes' : 'no'} · phases ${renderBreakdownText(performanceRuntime.lastRenderSpikeBreakdown)}` : 'last none'}`,
      `Stall/render coincidence: ${performanceRuntime.lastUiStallRenderOverlap ? 'yes' : 'no'}${performanceRuntime.lastUiStallRenderOverlap ? ` · ${performanceRuntime.lastUiStallRenderReason || 'unknown'} · ${num(performanceRuntime.lastUiStallRenderMs) ? `${roundPerfMs(performanceRuntime.lastUiStallRenderMs)}ms` : '—'}` : ''}`,
      `Panel render scheduler: ${panelRenderTimer || panelIdleHandle !== null ? 'pending' : 'idle'} · coalesced ${Number(performanceRuntime.panelRenderCoalesced || 0)} · interaction quiet 700ms · defer 750ms`,
      `Panel partial: mode ${performanceRuntime.lastPanelRenderMode || 'full'} · partial ${Number(performanceRuntime.panelPartialRenders || 0)} · full ${Number(performanceRuntime.panelFullRenders || 0)} · section writes ${Number(performanceRuntime.panelSectionWrites || 0)} · skips ${Number(performanceRuntime.panelSectionSkips || 0)}`,
      `P4 partial: auto section patch · diagnostics live · settings preserved`,
      `Render cache: widget html writes ${Number(performanceRuntime.widgetHtmlWrites || 0)} · skips ${Number(performanceRuntime.widgetHtmlSkips || 0)} · style writes ${Number(performanceRuntime.widgetStyleWrites || 0)} · skips ${Number(performanceRuntime.widgetStyleSkips || 0)} · closed panel skips ${Number(performanceRuntime.panelRenderSkippedClosed || 0)}`,
      `P4 render: closed-panel skip · widget DOM dedup`,
      `Floating widget UX: ${state.widgetVisible===false?'hidden':'visible'} · mobile ${widgetMobileViewport?'yes':'no'} · expanded ${widgetMobileExpanded?'yes':'no'} · dock ${state.widgetDockSide || 'none'} · position ${num(state.widgetX)&&num(state.widgetY)?`${Math.round(Number(state.widgetX))},${Math.round(Number(state.widgetY))}`:'default'} · gesture handle-drag/arrow-toggle`,
      `Credits organization: selected ${state.data?.creditsOrganizationId || state.selectedCreditsOrgId || 'default'} · available ${Array.isArray(state.data?.organizations) ? state.data.organizations.filter(org=>String(org?.kind||'default')==='default'&&String(org?.status||'active')!=='deleted').length : 0} · fallbacks ${Number(state.creditsOrgFallbackCount || 0)}${state.creditsOrgLastFallbackFrom ? ` · last ${state.creditsOrgLastFallbackFrom} → ${state.creditsOrgLastFallbackTo || 'default'}` : ''}`,
      `Local runtime errors: ${Number(localRuntimeErrors.count || 0)} · persist ${Number(localRuntimeErrors.persistFailures || 0)} · render ${Number(localRuntimeErrors.renderFailures || 0)} · last ${localRuntimeErrors.lastAt ? `${localRuntimeErrors.lastStage || 'runtime'} · ${age(localRuntimeErrors.lastAt)} · ${localRuntimeErrors.lastMessage || 'error'}` : 'none'}`,
      `Effective refresh: ${effectiveRefreshMs()}ms`,
      `Data age: ${state.data?.fetchedAt ? age(state.data.fetchedAt) : '—'}`,
      `Stale after: ${Number(state.staleAfterMs) > 0 ? `${Math.round(Number(state.staleAfterMs)/1000)}s` : 'off'}`,
      `Failures: ${Number(state.consecutiveFailures || 0)}`,
      `Retry delay: ${Number(state.retryDelayMs || 0)}ms`,
      `Next retry: ${state.nextRetryAt ? new Date(Number(state.nextRetryAt)).toISOString() : '—'}`,
      `Error: ${state.bridgeError || 'none'}`,
      `Updater: ${UPDATE_URL}`
    ].join('\n');
  }

  async function copyDiag() {
    try { if (navigator?.clipboard?.writeText) { await navigator.clipboard.writeText(diagText()); return true; } } catch (_) {}
    return false;
  }

  function card(title, b, cls='') {
    if (!b) return `<section class="panel metric ${cls}"><small>${esc(title)}</small><strong>—</strong><p>데이터 없음</p></section>`;
    return `<section class="panel metric ${cls}"><small>${esc(b.label || title)}</small><strong>${money(b.used)} <em>/ ${money(b.limit)}</em></strong><div class="bar"><i style="width:${pct(b.percent)}%"></i></div><p>남음 ${money(b.remaining)}${num(b.todayUsed)?` · 오늘 ${money(b.todayUsed,4)}`:''}</p></section>`;
  }

  function dashboardDateText(value, short = false) {
  const ts = resetTimestamp(value);
  if (!Number.isFinite(ts)) return '—';
  return new Date(ts).toLocaleString('ko-KR', short
    ? {timeZone:KST_TIME_ZONE, month:'numeric', day:'numeric', hour:'numeric', minute:'2-digit'}
    : {timeZone:KST_TIME_ZONE});
}

function previousMonthlyStart(resetValue) {
  const end = resetTimestamp(resetValue);
  if (!Number.isFinite(end)) return null;
  const kst = new Date(end + 9 * 3600000);
  const originalDay = kst.getUTCDate();
  let year = kst.getUTCFullYear();
  let month = kst.getUTCMonth() - 1;
  if (month < 0) { month = 11; year -= 1; }
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(year, month, Math.min(originalDay, lastDay), kst.getUTCHours(), kst.getUTCMinutes(), kst.getUTCSeconds(), kst.getUTCMilliseconds()) - 9 * 3600000;
}

function remainingTimeForDashboard(value) {
  const timestamp=resetTimestamp(value);
  if (!Number.isFinite(timestamp)) return '—';
  const diff=timestamp-Date.now();
  if (diff<=0) return '곧 초기화';
  const totalMinutes=Math.ceil(diff/60000);
  const days=Math.floor(totalMinutes/1440);
  const hours=Math.floor((totalMinutes%1440)/60);
  const minutes=totalMinutes%60;
  if (days>0) return days+'일 '+hours+'시간 '+minutes+'분';
  if (hours>0) return hours+'시간 '+minutes+'분';
  return minutes+'분';
}

function todayOverviewMetrics(d) {
  const m=d?.monthly, w=d?.weekly, c=d?.credits, a=d?.activity;
  const devToday=num(m?.todayUsed)?Number(m.todayUsed):null;
  const premiumToday=num(w?.todayUsed)?Number(w.todayUsed):null;
  const creditsToday=num(c?.todayUsed)?Number(c.todayUsed):null;
  const observedDailyTotal=(num(devToday)||num(creditsToday)) ? Number(devToday||0)+Number(creditsToday||0) : null;
  const now=Date.now();
  const monthEnd=resetTimestamp(m?.resetAt);
  const weekEnd=resetTimestamp(w?.resetAt);
  const monthlyDays=Number.isFinite(monthEnd)&&monthEnd>now ? Math.max(1,Math.ceil((monthEnd-now)/86400000)) : null;
  const weeklyDays=Number.isFinite(weekEnd)&&weekEnd>now ? Math.max(1,Math.ceil((weekEnd-now)/86400000)) : 7;
  const monthlyTarget=monthlyDays&&num(m?.remaining)&&num(devToday) ? (Math.max(0,Number(m.remaining))+Number(devToday))/monthlyDays : null;
  const weeklyTarget=weeklyDays&&num(w?.remaining)&&num(premiumToday) ? (Math.max(0,Number(w.remaining))+Number(premiumToday))/weeklyDays : null;
  const monthlyLeft=num(monthlyTarget)&&num(devToday) ? Math.max(0,Number(monthlyTarget)-Number(devToday)) : null;
  const weeklyLeft=num(weeklyTarget)&&num(premiumToday) ? Math.max(0,Number(weeklyTarget)-Number(premiumToday)) : null;
  let projected=null, projectedPercent=null;
  const monthStart=previousMonthlyStart(monthEnd);
  if (Number.isFinite(monthStart)&&Number.isFinite(monthEnd)&&monthStart<now&&now<monthEnd&&num(m?.used)&&num(m?.limit)&&Number(m.limit)>0) {
    const elapsed=now-monthStart, total=monthEnd-monthStart;
    projected=Math.max(Number(m.used),Number(m.used)*total/elapsed);
    projectedPercent=projected/Number(m.limit)*100;
  }
  return {devToday,premiumToday,creditsToday,observedDailyTotal,monthEnd,monthlyLeft,weeklyLeft,projected,projectedPercent,cost24h:num(a?.cost24h)?Number(a.cost24h):null,resetPasses:num(w?.resetPasses)?Number(w.resetPasses):null,resetPassesExact:w?.resetPassesExact===true};
}
