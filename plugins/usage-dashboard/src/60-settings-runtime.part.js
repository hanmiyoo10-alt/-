  function renderSettings() {
    const startedPerf = typeof performance?.now === 'function' ? performance.now() : Date.now();
    document.body.innerHTML = settingsHtml();
    bindSettings();
    performanceRuntime.panelFullRenders += 1;
    performanceRuntime.lastPanelRenderMode = 'full';
    const endedPerf = typeof performance?.now === 'function' ? performance.now() : Date.now();
    const duration = Math.max(0, endedPerf - startedPerf);
    performanceRuntime.lastPanelRenderMs = roundPerfMs(duration);
    noteRenderSpike(duration, 'panel', startedPerf, endedPerf, {panel:roundPerfMs(duration)});
  }

  const PANEL_PARTIAL_SELECTORS = [
    '.grid > section.panel.metric',
    '.grid > section.panel.wide:not(.usage-primary):not(.activity-secondary):not(.analytics-panel)',
    '.grid > section.usage-primary',
    '.grid > section.activity-secondary',
    '.grid > section.analytics-panel',
  ];

  function patchPanelSections(nextHtml) {
    if (typeof DOMParser !== 'function') return false;
    const nextDoc = new DOMParser().parseFromString(nextHtml, 'text/html');
    const currentShell = document.querySelector('.shell');
    const nextShell = nextDoc.querySelector('.shell');
    if (!currentShell || !nextShell) return false;

    const staged = [];
    for (const selector of PANEL_PARTIAL_SELECTORS) {
      const currentNodes = Array.from(document.querySelectorAll(selector));
      const nextNodes = Array.from(nextDoc.querySelectorAll(selector));
      if (!currentNodes.length || currentNodes.length !== nextNodes.length) return false;
      for (let i = 0; i < currentNodes.length; i += 1) staged.push([currentNodes[i], nextNodes[i]]);
    }

    // Runtime Diagnostics is safe to refresh live. Local Bridge settings are
    // deliberately left untouched so typed-but-unsaved values are preserved.
    const currentAdvanced = Array.from(document.querySelectorAll('details.advanced-panel'));
    const nextAdvanced = Array.from(nextDoc.querySelectorAll('details.advanced-panel'));
    const diagnosticsCurrent = currentAdvanced[1]?.querySelector('.advanced-body');
    const diagnosticsNext = nextAdvanced[1]?.querySelector('.advanced-body');
    if (currentAdvanced[1]?.open && diagnosticsCurrent && diagnosticsNext) {
      staged.push([diagnosticsCurrent, diagnosticsNext]);
    }

    let writes = 0;
    let skips = 0;
    for (const [currentNode, nextNode] of staged) {
      if (currentNode.innerHTML === nextNode.innerHTML) {
        skips += 1;
        continue;
      }
      currentNode.innerHTML = nextNode.innerHTML;
      writes += 1;
    }
    performanceRuntime.panelSectionWrites += writes;
    performanceRuntime.panelSectionSkips += skips;
    if (writes > 0) bindSettings();
    return true;
  }

  function renderSettingsPartial() {
    const startedPerf = typeof performance?.now === 'function' ? performance.now() : Date.now();
    const nextHtml = settingsHtml();
    if (document.body?.dataset?.panelOpen === '1' && patchPanelSections(nextHtml)) {
      performanceRuntime.panelPartialRenders += 1;
      performanceRuntime.lastPanelRenderMode = 'partial';
    } else {
      document.body.innerHTML = nextHtml;
      bindSettings();
      performanceRuntime.panelFullRenders += 1;
      performanceRuntime.lastPanelRenderMode = 'full-fallback';
    }
    const endedPerf = typeof performance?.now === 'function' ? performance.now() : Date.now();
    const duration = Math.max(0, endedPerf - startedPerf);
    performanceRuntime.lastPanelRenderMs = roundPerfMs(duration);
    noteRenderSpike(duration, 'panel', startedPerf, endedPerf, {panel:roundPerfMs(duration)});
  }

  function renderHourlyDrilldownOnly() {
    const current = document.querySelector('.hourly-ledger');
    const scopeKey = ['all','devpass','credits'].includes(String(state.usageScopeView)) ? String(state.usageScopeView) : 'all';
    if (!current || typeof document?.createElement !== 'function') {
      performanceRuntime.hourlyDetailFallbacks += 1;
      renderSettings();
      return;
    }
    const holder = document.createElement('div');
    holder.innerHTML = hourlyRequestDrilldownHtml(scopeKey);
    const next = holder.firstElementChild;
    if (!next) {
      performanceRuntime.hourlyDetailFallbacks += 1;
      renderSettings();
      return;
    }
    if (current.innerHTML === next.innerHTML && current.className === next.className) {
      performanceRuntime.hourlyDetailSkips += 1;
      bindHourlyDrilldown();
      return;
    }
    current.replaceWith(next);
    performanceRuntime.hourlyDetailWrites += 1;
    bindHourlyDrilldown();
  }

  function bindHourlyDrilldown() {
    document.querySelectorAll('[data-usage-hour]').forEach(button => {
      button.onclick = async () => {
        const key = String(button.getAttribute('data-usage-hour') || '');
        state.selectedHourKey = state.selectedHourKey === key ? '' : key;
        await persist();
        renderHourlyDrilldownOnly();
      };
    });
  }

  function bindSettings() {
    const q = s => document.querySelector(s);
    if (q('#close')) q('#close').onclick = () => { document.body.dataset.panelOpen='0'; Risuai.hideContainer(); };
    if (q('#connect')) q('#connect').onclick = async () => {
      try {
        state.bridgeBase = normalizeBridgeBase(q('#bridge-base')?.value || DEFAULT_BRIDGE);
        state.refreshMs = Number(q('#refresh-ms')?.value ?? state.refreshMs);
        state.staleAfterMs = Math.max(0, Number(q('#stale-ms')?.value ?? state.staleAfterMs));
        state.stalePolicyV37Migrated = true;
        state.widgetMode = q('#widget-mode')?.value === 'detailed' ? 'detailed' : 'compact';
        const entered = String(q('#bridge-token')?.value || '').trim();
        if (entered) { token = entered; await store.setItem(TOKEN_KEY, token); }
        if (!token) throw new Error('Bridge Token이 필요해.');
        state.bridgeEnabled = true; state.bridgeStatus = 'connecting'; await persist(); scheduleRefresh(); await enqueueRefresh('connect');
      } catch (e) { state.bridgeStatus='error'; state.bridgeError=e?.message||String(e); await persist(); await renderWidget(); renderSettings(); }
    };
    document.querySelectorAll('[data-usage-scope]').forEach(button => {
      button.onclick = async () => {
        const next = String(button.getAttribute('data-usage-scope') || 'all');
        state.usageScopeView = ['all','devpass','credits'].includes(next) ? next : 'all';
        await persist();
        renderSettings();
      };
    });
    document.querySelectorAll('[data-recent-filter]').forEach(button => {
      button.onclick = async () => {
        const next = String(button.getAttribute('data-recent-filter') || 'all');
        state.recentRequestFilter = ['all','success','error'].includes(next) ? next : 'all';
        await persist();
        renderSettings();
      };
    });
    bindHourlyDrilldown();
    document.querySelectorAll('[data-analytics-scope]').forEach(button => {
      button.onclick = async () => {
        const next = String(button.getAttribute('data-analytics-scope') || 'all');
        state.analyticsScopeView = ['all','devpass','credits'].includes(next) ? next : 'all';
        await persist();
        renderSettings();
      };
    });
    if (q('#refresh')) q('#refresh').onclick = () => enqueueRefresh('manual');
    if (q('#retry-now')) q('#retry-now').onclick = async () => {
      state.consecutiveFailures = 0;
      state.retryDelayMs = 0;
      state.nextRetryAt = null;
      await persist();
      scheduleRefresh();
      await enqueueRefresh('manual-retry');
    };
    if (q('#toggle')) q('#toggle').onclick = async () => { state.widgetVisible = state.widgetVisible === false; await persist(); await renderWidget(); renderSettings(); };
    if (q('#reset-position')) q('#reset-position').onclick = async () => {
      state.widgetX = null;
      state.widgetY = null;
      drag = null;
      widgetRenderCache.layout = null;
      await persist();
      if (widget) {
        await widget.setStyle('left','auto');
        await widget.setStyle('top','auto');
        await widget.setStyle('right','12px');
        await widget.setStyle('bottom','74px');
      }
      await renderWidget();
      renderSettings();
    };
    if (q('#save-performance')) q('#save-performance').onclick = async () => {
      state.syncOnFocus = q('#sync-on-focus')?.checked !== false;
      state.performanceGuard = q('#performance-guard')?.checked !== false;
      state.adaptiveRefresh = q('#adaptive-refresh')?.checked !== false;
      state.backgroundPause = q('#background-pause')?.checked !== false;
      if (state.performanceGuard === false || state.adaptiveRefresh === false) {
        performanceRuntime.adaptiveMultiplier = 1;
        performanceRuntime.mode = 'normal';
        performanceRuntime.slowRefreshes = 0;
        performanceRuntime.fastRefreshes = 0;
      }
      if (!state.syncOnFocus) cancelResumeRefresh();
      if (state.backgroundPause !== false && document.visibilityState === 'hidden') {
        stopUiStallProbe();
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = null;
      } else {
        startUiStallProbe();
        scheduleRefresh();
      }
      updateRuntimeState('settings');
      await persist();
      renderSettings();
    };
    if (q('#stale-ms')) q('#stale-ms').onchange = async e => { state.staleAfterMs = Math.max(0, Number(e.target.value)||0); state.stalePolicyV37Migrated = true; await persist(); await renderWidget(); renderSettings(); };
    if (q('#widget-mode')) q('#widget-mode').onchange = async e => { state.widgetMode = e.target.value === 'detailed' ? 'detailed' : 'compact'; await persist(); await renderWidget(); };
    if (q('#copy-diag')) q('#copy-diag').onclick = async e => { const b=e.currentTarget, old=b.textContent; b.textContent=(await copyDiag())?'복사됨 ✓':'복사 실패'; setTimeout(()=>b.textContent=old,1200); };
    if (q('#export-json')) q('#export-json').onclick = () => {
      const payload = {
        exportedAt: new Date().toISOString(),
        plugin: {name:'Local Usage Dashboard', version:VERSION},
        schema: {snapshot:SNAPSHOT_SCHEMA_VERSION, recentRequest:RECENT_REQUEST_SCHEMA_VERSION},
        usage: state.data || null,
        requestLedger: Array.isArray(state.requestLedger) ? state.requestLedger : [],
        dailyUsage: state.dailyUsage || null,
        creditDailyUsage: state.creditDailyUsage || null,
        bridge: state.data?.bridge || null,
        sync: {
          bridgeBase: state.bridgeBase || DEFAULT_BRIDGE,
          bridgeEnabled: state.bridgeEnabled === true,
          bridgeStatus: state.bridgeStatus || 'off',
          refreshMs: Number(state.refreshMs || 0),
          lastSyncAt: state.lastSyncAt || null,
          lastSyncDurationMs: state.lastSyncDurationMs ?? null,
          lastRefreshReason: state.lastRefreshReason || '',
          refreshCount: Number(state.refreshCount || 0),
          failures: Number(state.consecutiveFailures || 0),
          error: state.bridgeError || ''
        }
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
      const a = document.createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `local-usage-dashboard-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    };
  }

  async function openSettings() { widgetMobileExpanded=false; document.body.dataset.panelOpen='1'; renderSettings(); await renderWidget('panel-open'); await Risuai.showContainer('fullscreen'); }

