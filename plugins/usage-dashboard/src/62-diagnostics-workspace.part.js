
  const DIAGNOSTICS_WORKSPACE_SECTIONS = Object.freeze([
    {key:'runtime',title:'Runtime & Update'},
    {key:'bridge',title:'Bridge & Managed CLI'},
    {key:'snapshot',title:'Snapshot & Performance'},
    {key:'cache',title:'Cache & Secondary Refresh'},
    {key:'data',title:'Data Fidelity & Request Ledger'},
    {key:'scheduler',title:'Scheduler, UI & Recovery'},
  ]);

  function diagnosticsWorkspaceMode() {
    return state?.diagnosticsMode === 'detailed' ? 'detailed' : 'basic';
  }

  let diagnosticsModePersistTail = Promise.resolve();

  function persistDiagnosticsModeSerialized(mode) {
    const capturedMode = mode === 'detailed' ? 'detailed' : 'basic';
    diagnosticsModePersistTail = diagnosticsModePersistTail
      .then(async () => {
        if (runtimeDisposed) return dropStaleAsync();
        await store.setItem(STATE_KEY, {...state, diagnosticsMode:capturedMode});
        powerRuntime.persistWrites += 1;
      })
      .catch(error => {
        console.log(`[Local Usage Dashboard] diagnostics mode persist failed: ${error?.message || error}`);
      });
    return diagnosticsModePersistTail;
  }

  function setDiagnosticsModeInstant(mode) {
    const next = mode === 'detailed' ? 'detailed' : 'basic';
    if (diagnosticsWorkspaceMode() === next) return;
    state.diagnosticsMode = next;
    renderSettingsPartial();
    void persistDiagnosticsModeSerialized(next);
  }

  function diagnosticsWorkspaceCliRuntime() {
    const truth = managedRuntimeIdentityTruth(state.data?.bridge?.diagnostics);
    return {
      state:truth.cliState,
      version:truth.cli.version,
      provisioning:truth.provisioning,
      identityState:truth.cli.state,
      modelState:truth.modelState,
      modelVersion:truth.models.version,
      modelIdentityState:truth.models.state,
    };
  }

  function diagnosticsCaptureIdentity(capturedAt = Date.now()) {
    const refreshCountRaw = Number(state?.refreshCount);
    const refreshCount = Number.isFinite(refreshCountRaw) ? Math.max(0, Math.trunc(refreshCountRaw)) : 0;
    const reason = String(state?.lastRefreshReason || '').trim() || 'UNKNOWN';
    const syncRaw = Number(state?.lastSyncAt);
    const lastSyncAt = state?.lastSyncAt !== null && state?.lastSyncAt !== undefined && state?.lastSyncAt !== '' && Number.isFinite(syncRaw) && syncRaw > 0
      ? syncRaw
      : null;
    return {capturedAt:Number(capturedAt),refreshCount,reason,lastSyncAt};
  }

  function diagnosticsCaptureIdentityText(capture = diagnosticsCaptureIdentity()) {
    const sync = capture.lastSyncAt === null ? 'UNKNOWN' : new Date(Number(capture.lastSyncAt)).toISOString();
    return `#${capture.refreshCount} · ${capture.reason} · sync ${sync}`;
  }

  function diagnosticsWorkspaceBasicModel() {
    const capture = diagnosticsCaptureIdentity();
    const d = state.data || {};
    const h = d.health || {};
    const bridgeDiag = bridgeStabilitySnapshot();
    const runtimeBridge = bridgeRuntimeSnapshot();
    const stable = stableReadinessSnapshot(bridgeDiag, runtimeBridge);
    const cli = diagnosticsWorkspaceCliRuntime();
    const scopeKey = ['all','devpass','credits'].includes(String(state.usageScopeView)) ? String(state.usageScopeView) : 'all';
    const ledgerRows = requestLedgerRowsForScope(scopeKey);
    let exactRows = 0;
    for (const row of ledgerRows) {
      const precision = row?.timestampPrecision && row.timestampPrecision !== 'unknown'
        ? String(row.timestampPrecision)
        : requestTimestampPrecision(row?.timestamp, row?.timestampSource, row?.requestNumber);
      if (precision === 'exact') exactRows += 1;
    }
    const activeErrors = localRuntimeActiveCount();
    const staleModules = Number.isFinite(Number(bridgeDiag.staleModules)) ? Number(bridgeDiag.staleModules) : null;
    const failures = Number(state.consecutiveFailures || 0);
    const snapshotPerformance = bridgeDiag.snapshotPerformance || null;
    const snapshotMs = num(snapshotPerformance?.totalMs)
      ? Number(snapshotPerformance.totalMs)
      : (num(performanceRuntime.lastRefreshPhases?.snapshot) ? Number(performanceRuntime.lastRefreshPhases.snapshot) : null);
    const criticalPath = String(snapshotPerformance?.criticalPath || '');
    const criticalPathMs = num(snapshotPerformance?.criticalPathMs) ? Number(snapshotPerformance.criticalPathMs) : null;
    const managerSyncVersion = String(state.bridgeManagerSyncedProductVersion || state.bridgeManagerRuntime?.productVersion || '');
    const issues = [];
    if (staleModules !== null && staleModules > 0) issues.push(`Bridge modules stale ${staleModules}`);
    if (activeErrors > 0) issues.push(`Local active errors ${activeErrors}`);
    if (failures > 0) issues.push(`Refresh failures ${failures}`);
    if (cli.state !== 'ready') issues.push(`CLI runtime ${cli.state}`);
    if (cli.identityState === 'mismatch') issues.push('CLI identity mismatch');
    if (cli.modelIdentityState === 'mismatch') issues.push('Models identity mismatch');
    return {
      capture,
      readiness:stable.ready ? 'READY' : 'BLOCKED',
      health:String(h.status || '—'),
      activeErrors,
      failures,
      engineVersion:String(bridgeDiag.version || REQUIRED_BRIDGE_VERSION || ''),
      managerVersion:String(runtimeBridge.managerVersion || state.bridgeManagerRuntime?.managerVersion || ''),
      cli,
      lastRefreshMs:num(state.lastSyncDurationMs) ? Number(state.lastSyncDurationMs) : null,
      snapshotMs,
      criticalPath,
      criticalPathMs,
      dataAge:state.lastSyncAt ? age(state.lastSyncAt) : '—',
      staleModules,
      exactRows,
      ledgerRows:ledgerRows.length,
      updaterCompatible:stable.updaterCompatible,
      managerSync:managerSyncVersion ? (managerSyncVersion === VERSION ? 'current' : managerSyncVersion) : '—',
      issues,
    };
  }

  function diagnosticsWorkspaceBasicText(model = diagnosticsWorkspaceBasicModel()) {
    const lastRefresh = model.lastRefreshMs === null ? '—' : `${roundPerfMs(model.lastRefreshMs)}ms`;
    const snapshot = model.snapshotMs === null ? '—' : `${roundPerfMs(model.snapshotMs)}ms`;
    const critical = model.criticalPath
      ? `${model.criticalPath}${model.criticalPathMs === null ? '' : ` ${roundPerfMs(model.criticalPathMs)}ms`}`
      : '—';
    return [
      `Local Usage Dashboard v${VERSION}`,
      `Diagnostic captured: ${diagnosticTimestamp(model.capture.capturedAt)}`,
      `Refresh identity: ${diagnosticsCaptureIdentityText(model.capture)}`,
      `Status: ${model.readiness} · Health ${model.health} · active errors ${model.activeErrors} · failures ${model.failures}`,
      `Runtime: Engine ${model.engineVersion || '—'} · Manager ${model.managerVersion || '—'} · CLI ${model.cli.version || '—'} · Models ${model.cli.modelVersion || '—'} · ${model.cli.state}`,
      `Last refresh: ${lastRefresh} · snapshot ${snapshot} · critical ${critical}`,
      `Data: age ${model.dataAge} · stale modules ${model.staleModules === null ? '—' : model.staleModules} · Request fidelity exact ${model.exactRows}/${model.ledgerRows}`,
      `Updater: ${model.updaterCompatible ? 'compatible' : 'incompatible'} · sync ${model.managerSync}`,
      ...(model.issues.length ? [`Current issues: ${model.issues.join(' · ')}`] : []),
    ].join('\n');
  }

  function diagnosticsWorkspaceSectionKey(line) {
    const value = String(line || '');
    if (/^(Cache |Cache observer:|Cache write telemetry:|Cache semantics:|Bridge snapshot cache:|Bridge snapshot cache decisions:|Bridge secondary refresh:|Bridge cache)/.test(value)) return 'cache';
    if (/^(Bridge snapshot attribution:|Bridge snapshot jobs:|Bridge snapshot timeline:|Bridge Credits early-start:|Refresh phase duration:|Refresh slowest phase:|Refresh attribution)/.test(value)) return 'snapshot';
    if (/^(Request |Service tier |DevPass account |Hourly |Usage |Recent request|Data fidelity|Data age)/.test(value)) return 'data';
    if (/^(Bridge |Unified runtime:)/.test(value)) return 'bridge';
    if (/^(Performance Guard:|UI Stall Probe:|Stall \/ Render:|Resume |Scheduler:|Render:|Panel Render:|Local runtime|Recovery )/.test(value)) return 'scheduler';
    return 'runtime';
  }

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

  function diagnosticsWorkspaceDetailedSections() {
    const groups = new Map(DIAGNOSTICS_WORKSPACE_SECTIONS.map(section => [section.key, []]));
    for (const line of diagText().split('\n')) groups.get(diagnosticsWorkspaceSectionKey(line)).push(line);
    const sections = DIAGNOSTICS_WORKSPACE_SECTIONS.map(section => ({...section,lines:groups.get(section.key)}));
    return [...sections, {key:'runtime-weight', title:'Runtime Weight Audit', lines:runtimeWeightAuditLines()}];
  }

  function diagnosticsWorkspaceDetailedHtml() {
    return diagnosticsWorkspaceDetailedSections().map((section, index) => `<details class="diag-workspace-section" ${index === 0 ? 'open' : ''}><summary><b>${esc(section.title)}</b><span>${section.lines.length} lines</span></summary><div class="diag-workspace-lines">${section.lines.map(line => `<p>${esc(line)}</p>`).join('')}</div></details>`).join('');
  }

  function diagnosticsWorkspaceBasicHtml() {
    const model = diagnosticsWorkspaceBasicModel();
    const lastRefresh = model.lastRefreshMs === null ? '—' : `${roundPerfMs(model.lastRefreshMs)}ms`;
    const snapshot = model.snapshotMs === null ? '—' : `${roundPerfMs(model.snapshotMs)}ms`;
    const critical = model.criticalPath
      ? `${model.criticalPath}${model.criticalPathMs === null ? '' : ` · ${roundPerfMs(model.criticalPathMs)}ms`}`
      : '—';
    const issueHtml = model.issues.length
      ? `<div class="diag-workspace-issues"><b>Current evidence</b>${model.issues.map(item => `<p>${esc(item)}</p>`).join('')}</div>`
      : '';
    return `<div class="diag-workspace-capture"><b>Captured #${model.capture.refreshCount}</b><span>${esc(diagnosticTimestamp(model.capture.capturedAt))} · ${esc(model.capture.reason)} · sync ${esc(model.capture.lastSyncAt === null ? 'UNKNOWN' : new Date(Number(model.capture.lastSyncAt)).toISOString())}</span></div><div class="minis diag-summary diag-workspace-basic"><div class="mini"><span>Status</span><b>${esc(model.readiness)}</b><small>Health ${esc(model.health)} · errors ${model.activeErrors} · failures ${model.failures}</small></div><div class="mini"><span>Runtime</span><b>Engine ${esc(model.engineVersion || '—')}</b><small>Manager ${esc(model.managerVersion || '—')} · CLI ${esc(model.cli.version || '—')} · Models ${esc(model.cli.modelVersion || '—')} · ${esc(model.cli.state)}</small></div><div class="mini"><span>Last refresh</span><b>${esc(lastRefresh)}</b><small>snapshot ${esc(snapshot)} · critical ${esc(critical)}</small></div><div class="mini"><span>Data</span><b>${esc(model.dataAge)}</b><small>stale ${model.staleModules === null ? '—' : model.staleModules} · exact ${model.exactRows}/${model.ledgerRows}</small></div><div class="mini"><span>Updater</span><b>${model.updaterCompatible ? 'compatible' : 'incompatible'}</b><small>sync ${esc(model.managerSync)}</small></div></div>${issueHtml}`;
  }

  function diagnosticsWorkspacePanelHtml() {
    const mode = diagnosticsWorkspaceMode();
    const body = mode === 'detailed' ? diagnosticsWorkspaceDetailedHtml() : diagnosticsWorkspaceBasicHtml();
    return `<details class="panel wide advanced-panel"><summary><b>Runtime Diagnostics</b><span>Basic · Detailed · Full Copy</span></summary><div class="advanced-body"><style>.diag-workspace-capture{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:0 0 8px;color:var(--m);font-size:9px}.diag-workspace-capture b{color:var(--t);font-size:10px}.diag-workspace-tabs{display:flex;gap:6px;margin:2px 0 10px}.diag-workspace-tabs button{flex:1}.diag-workspace-tabs button.active{background:var(--g);border-color:var(--g);color:#15170f}.diag-workspace-basic{grid-template-columns:repeat(5,minmax(0,1fr))}.diag-workspace-basic .mini small{display:block;color:var(--m);font-size:9px;margin-top:4px;white-space:normal}.diag-workspace-issues{border:1px solid var(--e);border-radius:9px;padding:9px;margin:8px 0}.diag-workspace-issues>b{color:var(--e);font-size:10px}.diag-workspace-issues p{margin:4px 0 0}.diag-workspace-section{border:1px solid var(--l);border-radius:9px;margin-top:7px;overflow:hidden}.diag-workspace-section>summary{display:flex;justify-content:space-between;gap:8px;padding:9px;cursor:pointer;list-style:none}.diag-workspace-section>summary::-webkit-details-marker{display:none}.diag-workspace-section>summary span{color:var(--m);font-size:9px}.diag-workspace-section[open]>summary{border-bottom:1px solid var(--l)}.diag-workspace-lines{padding:5px 9px}.diag-workspace-lines p{margin:5px 0;font-size:10px;overflow-wrap:anywhere}@media(max-width:680px){.diag-workspace-basic{grid-template-columns:1fr 1fr}.diag-workspace-basic .mini:last-child{grid-column:1/-1}}</style><div class="diag-workspace-tabs" role="group" aria-label="Diagnostics view"><button id="diagnostics-mode-basic" class="${mode === 'basic' ? 'active' : ''}" aria-pressed="${mode === 'basic' ? 'true' : 'false'}">Basic</button><button id="diagnostics-mode-detailed" class="${mode === 'detailed' ? 'active' : ''}" aria-pressed="${mode === 'detailed' ? 'true' : 'false'}">Detailed</button></div>${body}<div class="actions"><button id="copy-diag-summary">요약 복사</button><button id="copy-diag">전체 Diagnostics 복사</button><button id="export-json">JSON 내보내기</button></div></div></details>`;
  }


  function bindDiagnosticsWorkspaceControls() {
    const q = selector => document.querySelector(selector);
    if (q('#copy-diag-summary')) q('#copy-diag-summary').onclick = async e => {
      let copied = false;
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(diagnosticsWorkspaceBasicText());
          copied = true;
        }
      } catch (_) {}
      if (e?.currentTarget) e.currentTarget.textContent = copied ? '요약 복사됨 ✓' : '요약 복사 실패';
    };
    const basic = q('#diagnostics-mode-basic');
    const detailed = q('#diagnostics-mode-detailed');
    if (basic) basic.onclick = () => setDiagnosticsModeInstant('basic');
    if (detailed) detailed.onclick = () => setDiagnosticsModeInstant('detailed');
  }
