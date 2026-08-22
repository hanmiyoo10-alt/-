
  async function renderWidget(reason = 'ui') {
    const requestId = ++widgetRenderRequestId;
    const task = widgetRenderTail.catch(() => undefined).then(() => renderWidgetNow(reason, requestId));
    widgetRenderTail = task;
    return task;
  }

  async function renderWidgetNow(reason = 'ui', requestId = widgetRenderRequestId) {
    if (runtimeDisposed) return;
    powerRuntime.widgetRenderCalls += 1;
    const nowPerf = () => typeof performance?.now === 'function' ? performance.now() : Date.now();
    const startedPerf = nowPerf();
    const breakdown = {};
    performanceRuntime.activeRenderStartedPerf = startedPerf;
    performanceRuntime.activeRenderReason = String(reason || 'ui');
    performanceRuntime.lastRenderStartedPerf = startedPerf;
    performanceRuntime.lastRenderReason = String(reason || 'ui');
    try {
      let phaseStarted = nowPerf();
      await ensureWidget();
      breakdown.ensure = roundPerfMs(nowPerf() - phaseStarted);
      if (!widget || requestId !== widgetRenderRequestId) return;
      phaseStarted = nowPerf();
      const nextMobileViewport = await widgetMobileMode();
      if (widgetMobileViewport !== nextMobileViewport) {
        widgetMobileViewport = nextMobileViewport;
        widgetMobileExpanded = false;
        widgetRenderCache.layout = null;
        widgetRenderCache.width = null;
        widgetRenderCache.html = null;
      }
      await applyWidgetResponsiveLayout(widgetMobileViewport, widgetMobileExpanded);
      const nextWidth = widgetWidth(widgetMobileViewport, widgetMobileExpanded);
      const nextDisplay = state.widgetVisible===false?'none':'block';
      if (widgetRenderCache.width !== nextWidth) {
        await widget.setStyle('width',nextWidth);
        widgetRenderCache.width = nextWidth;
        performanceRuntime.widgetStyleWrites += 1;
      } else {
        performanceRuntime.widgetStyleSkips += 1;
      }
      if (widgetRenderCache.display !== nextDisplay) {
        await widget.setStyle('display',nextDisplay);
        widgetRenderCache.display = nextDisplay;
        performanceRuntime.widgetStyleWrites += 1;
      } else {
        performanceRuntime.widgetStyleSkips += 1;
      }
      breakdown.style = roundPerfMs(nowPerf() - phaseStarted);
      if (state.widgetVisible!==false) {
        phaseStarted = nowPerf();
        if (requestId !== widgetRenderRequestId) return;
        const nextHtml = widgetHtml();
        if (widgetRenderCache.html !== nextHtml) {
          await widget.setInnerHTML(nextHtml);
          await clampWidgetToViewport();
          widgetRenderCache.html = nextHtml;
          performanceRuntime.widgetHtmlWrites += 1;
        } else {
          performanceRuntime.widgetHtmlSkips += 1;
        }
        breakdown.html = roundPerfMs(nowPerf() - phaseStarted);
      }
    } finally {
      const endedPerf = nowPerf();
      const duration = Math.max(0, endedPerf - startedPerf);
      breakdown.total = roundPerfMs(duration);
      performanceRuntime.lastRenderMs = roundPerfMs(duration);
      performanceRuntime.lastRenderEndedPerf = endedPerf;
      performanceRuntime.lastRenderBreakdown = {...breakdown};
      noteRenderSpike(duration, performanceRuntime.lastRenderReason, startedPerf, endedPerf, breakdown);
      performanceRuntime.activeRenderStartedPerf = 0;
      performanceRuntime.activeRenderReason = '';
    }
  }

  function resetTimestamp(value) {
  if (value === null || value === undefined || value === '') return null;
  if (num(value)) {
    const n = Number(value);
    return n > 0 && n < 1000000000000 ? n * 1000 : n;
  }
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function scheduleResetSync() {
  if (resetSyncTimer) clearTimeout(resetSyncTimer);
  resetSyncTimer = null;
  if (!state?.bridgeEnabled || !token || !state?.data) return;
  const now = Date.now();
  const resetCandidates = [
    resetTimestamp(state.data.monthly?.resetAt),
    resetTimestamp(state.data.weekly?.resetAt)
  ].filter(value => Number.isFinite(value) && value > now);
  if (!resetCandidates.length) return;
  const nextReset = Math.min(...resetCandidates);
  const delay = Math.min(2147480000, Math.max(1000, nextReset - now + 3000));
  resetSyncTimer = setTimeout(async () => {
    resetSyncTimer = null;
    if (nextReset - Date.now() > 5000) {
      scheduleResetSync();
      return;
    }
    await enqueueRefresh('reset', true);
  }, delay);
}
