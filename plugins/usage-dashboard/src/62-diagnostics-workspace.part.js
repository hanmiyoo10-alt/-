
  const diagnosticsWorkspaceLegacySettingsHtml = settingsHtml;
  const diagnosticsWorkspaceLegacyBindSettings = bindSettings;
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

  function diagnosticsWorkspaceCliRuntime() {
    const runtime = state.data?.bridge?.diagnostics?.cliRuntime;
    const manager = state.bridgeManagerRuntime || null;
    const rawState = String(runtime?.state || manager?.cliRuntimeState || '');
    const rawProvisioning = String(runtime?.provisioning || manager?.cliRuntimeProvisioning || '');
    const stateValue = ['ready','provisioning','unavailable','invalid'].includes(rawState) ? rawState : 'unavailable';
    const provisioning = ['ok','pending','backoff','disabled','unavailable'].includes(rawProvisioning) ? rawProvisioning : 'unavailable';
    return {
      state:stateValue,
      version:String(runtime?.version || manager?.cliRuntimeVersion || ''),
      provisioning,
    };
  }

  function diagnosticsWorkspaceBasicModel() {
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
    return {
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
      `Status: ${model.readiness} · Health ${model.health} · active errors ${model.activeErrors} · failures ${model.failures}`,
      `Runtime: Engine ${model.engineVersion || '—'} · Manager ${model.managerVersion || '—'} · Managed CLI ${model.cli.version ? `v${model.cli.version}` : 'v—'} · ${model.cli.state}`,
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

  function diagnosticsWorkspaceDetailedSections() {
    const groups = new Map(DIAGNOSTICS_WORKSPACE_SECTIONS.map(section => [section.key, []]));
    for (const line of diagText().split('\n')) groups.get(diagnosticsWorkspaceSectionKey(line)).push(line);
    return DIAGNOSTICS_WORKSPACE_SECTIONS.map(section => ({...section,lines:groups.get(section.key)}));
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
    return `<div class="minis diag-summary diag-workspace-basic"><div class="mini"><span>Status</span><b>${esc(model.readiness)}</b><small>Health ${esc(model.health)} · errors ${model.activeErrors} · failures ${model.failures}</small></div><div class="mini"><span>Runtime</span><b>Engine ${esc(model.engineVersion || '—')}</b><small>Manager ${esc(model.managerVersion || '—')} · CLI ${model.cli.version ? `v${esc(model.cli.version)}` : 'v—'} ${esc(model.cli.state)}</small></div><div class="mini"><span>Last refresh</span><b>${esc(lastRefresh)}</b><small>snapshot ${esc(snapshot)} · critical ${esc(critical)}</small></div><div class="mini"><span>Data</span><b>${esc(model.dataAge)}</b><small>stale ${model.staleModules === null ? '—' : model.staleModules} · exact ${model.exactRows}/${model.ledgerRows}</small></div><div class="mini"><span>Updater</span><b>${model.updaterCompatible ? 'compatible' : 'incompatible'}</b><small>sync ${esc(model.managerSync)}</small></div></div>${issueHtml}`;
  }

  function diagnosticsWorkspacePanelHtml() {
    const mode = diagnosticsWorkspaceMode();
    const body = mode === 'detailed' ? diagnosticsWorkspaceDetailedHtml() : diagnosticsWorkspaceBasicHtml();
    return `<details class="panel wide advanced-panel"><summary><b>Runtime Diagnostics</b><span>Basic · Detailed · Full Copy</span></summary><div class="advanced-body"><style>.diag-workspace-tabs{display:flex;gap:6px;margin:2px 0 10px}.diag-workspace-tabs button{flex:1}.diag-workspace-tabs button.active{background:var(--g);border-color:var(--g);color:#15170f}.diag-workspace-basic{grid-template-columns:repeat(5,minmax(0,1fr))}.diag-workspace-basic .mini small{display:block;color:var(--m);font-size:9px;margin-top:4px;white-space:normal}.diag-workspace-issues{border:1px solid var(--e);border-radius:9px;padding:9px;margin:8px 0}.diag-workspace-issues>b{color:var(--e);font-size:10px}.diag-workspace-issues p{margin:4px 0 0}.diag-workspace-section{border:1px solid var(--l);border-radius:9px;margin-top:7px;overflow:hidden}.diag-workspace-section>summary{display:flex;justify-content:space-between;gap:8px;padding:9px;cursor:pointer;list-style:none}.diag-workspace-section>summary::-webkit-details-marker{display:none}.diag-workspace-section>summary span{color:var(--m);font-size:9px}.diag-workspace-section[open]>summary{border-bottom:1px solid var(--l)}.diag-workspace-lines{padding:5px 9px}.diag-workspace-lines p{margin:5px 0;font-size:10px;overflow-wrap:anywhere}@media(max-width:680px){.diag-workspace-basic{grid-template-columns:1fr 1fr}.diag-workspace-basic .mini:last-child{grid-column:1/-1}}</style><div class="diag-workspace-tabs" role="group" aria-label="Diagnostics view"><button id="diagnostics-mode-basic" class="${mode === 'basic' ? 'active' : ''}" aria-pressed="${mode === 'basic' ? 'true' : 'false'}">Basic</button><button id="diagnostics-mode-detailed" class="${mode === 'detailed' ? 'active' : ''}" aria-pressed="${mode === 'detailed' ? 'true' : 'false'}">Detailed</button></div>${body}<div class="actions"><button id="copy-diag-summary">요약 복사</button><button id="copy-diag">전체 Diagnostics 복사</button><button id="export-json">JSON 내보내기</button></div></div></details>`;
  }

  settingsHtml = function diagnosticsWorkspaceSettingsHtml() {
    const legacyHtml = diagnosticsWorkspaceLegacySettingsHtml();
    const diagnosticsPanel = /<details class="panel wide advanced-panel"><summary><b>Runtime Diagnostics<\/b><span>요약 · 전체 진단<\/span><\/summary><div class="advanced-body">[\s\S]*?<\/div><\/details>/;
    if (!diagnosticsPanel.test(legacyHtml)) return legacyHtml;
    return legacyHtml.replace(diagnosticsPanel, diagnosticsWorkspacePanelHtml());
  };

  bindSettings = function diagnosticsWorkspaceBindSettings() {
    diagnosticsWorkspaceLegacyBindSettings();
    const q = selector => document.querySelector(selector);
    const setMode = async mode => {
      const next = mode === 'detailed' ? 'detailed' : 'basic';
      if (diagnosticsWorkspaceMode() === next) return;
      state.diagnosticsMode = next;
      await persist();
      renderSettings();
    };
    if (q('#diagnostics-mode-basic')) q('#diagnostics-mode-basic').onclick = () => setMode('basic');
    if (q('#diagnostics-mode-detailed')) q('#diagnostics-mode-detailed').onclick = () => setMode('detailed');
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
  };
