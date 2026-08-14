from pathlib import Path

p = Path('plugins/usage-dashboard/latest.js')
s = p.read_text()

if '//@version 3.0.0-alpha.3.28' not in s or "const VERSION = '3.0.0-alpha.3.28';" not in s:
    raise SystemExit('latest.js is not exact alpha.3.28')

widget_start = s.index('  function widgetHtml() {')
widget_end = s.index('  const widgetWidth = () =>', widget_start)
widget_before = s[widget_start:widget_end]

def one(label, old, new):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: patch anchor count={count}')
    s = s.replace(old, new, 1)

one('meta version', '//@version 3.0.0-alpha.3.28', '//@version 3.0.0-alpha.3.29')
one('runtime version', "const VERSION = '3.0.0-alpha.3.28';", "const VERSION = '3.0.0-alpha.3.29';")

one(
    'panel render handles',
    '  let refreshSchedulerTimer = null, refreshSchedulerIdleHandle = null;\n',
    '  let refreshSchedulerTimer = null, refreshSchedulerIdleHandle = null;\n  let panelRenderTimer = null, panelIdleHandle = null;\n'
)

one(
    'panel render counter',
    'schedulerQueued:0,schedulerMerged:0,schedulerExecuted:0,schedulerDeferredForInteraction:0,lastRenderMs:null',
    'schedulerQueued:0,schedulerMerged:0,schedulerExecuted:0,schedulerDeferredForInteraction:0,panelRenderCoalesced:0,lastRenderMs:null'
)

panel_helpers = '''  function cancelPanelRender() {
    if (panelRenderTimer) clearTimeout(panelRenderTimer);
    panelRenderTimer = null;
    if (panelIdleHandle !== null && typeof window?.cancelIdleCallback === 'function') {
      try { window.cancelIdleCallback(panelIdleHandle); } catch (_) {}
    }
    panelIdleHandle = null;
  }

  // DevPass 2.7.3 panel rendering policy: collapse automatic panel refreshes,
  // wait briefly while the user is interacting, then prefer an idle callback.
  function schedulePanelRender(force = false) {
    if (document.body?.dataset?.panelOpen !== '1') return;
    if (state.backgroundPause !== false && document.visibilityState === 'hidden') return;
    if (force) { renderSettings(); return; }
    if (panelRenderTimer || panelIdleHandle !== null) {
      performanceRuntime.panelRenderCoalesced += 1;
      return;
    }
    const interacting = Date.now() - Number(performanceRuntime.lastInteractionAt || 0) < 700;
    const delay = state.performanceGuard !== false && interacting ? 750 : 0;
    panelRenderTimer = setTimeout(() => {
      panelRenderTimer = null;
      const run = () => {
        panelIdleHandle = null;
        if (document.body?.dataset?.panelOpen === '1' && document.visibilityState !== 'hidden') renderSettings();
      };
      if (state.performanceGuard !== false && typeof window?.requestIdleCallback === 'function') {
        panelIdleHandle = window.requestIdleCallback(run, {timeout:500});
      } else {
        run();
      }
    }, delay);
  }

'''
one('panel helper insertion', '  function renderSettings() {', panel_helpers + '  function renderSettings() {')

one(
    'success automatic panel render',
    "        await renderWidget(reason);\n        scheduleRefresh();\n        if (document.body?.dataset?.panelOpen === '1') renderSettings();",
    "        await renderWidget(reason);\n        scheduleRefresh();\n        schedulePanelRender(false);"
)
one(
    'error automatic panel render',
    "        scheduleRefresh();\n        if (!silent) console.log(`[Local Usage Dashboard] ${state.bridgeError}`);\n        if (document.body?.dataset?.panelOpen === '1') renderSettings();",
    "        scheduleRefresh();\n        if (!silent) console.log(`[Local Usage Dashboard] ${state.bridgeError}`);\n        schedulePanelRender(false);"
)

one(
    'panel scheduler diagnostics',
    "      `Render spike: ≥${RENDER_SPIKE_THRESHOLD_MS}ms · count ${Number(performanceRuntime.renderSpikeCount || 0)} · ${num(performanceRuntime.lastRenderSpikeMs) ? `last ${roundPerfMs(performanceRuntime.lastRenderSpikeMs)}ms · reason ${performanceRuntime.lastRenderSpikeReason || '—'} · refresh overlap ${performanceRuntime.lastRenderSpikeRefreshOverlap ? 'yes' : 'no'} · phases ${renderBreakdownText(performanceRuntime.lastRenderSpikeBreakdown)}` : 'last none'}`,\n      `Effective refresh: ${effectiveRefreshMs()}ms`,",
    "      `Render spike: ≥${RENDER_SPIKE_THRESHOLD_MS}ms · count ${Number(performanceRuntime.renderSpikeCount || 0)} · ${num(performanceRuntime.lastRenderSpikeMs) ? `last ${roundPerfMs(performanceRuntime.lastRenderSpikeMs)}ms · reason ${performanceRuntime.lastRenderSpikeReason || '—'} · refresh overlap ${performanceRuntime.lastRenderSpikeRefreshOverlap ? 'yes' : 'no'} · phases ${renderBreakdownText(performanceRuntime.lastRenderSpikeBreakdown)}` : 'last none'}`,\n      `Panel render scheduler: ${panelRenderTimer || panelIdleHandle !== null ? 'pending' : 'idle'} · coalesced ${Number(performanceRuntime.panelRenderCoalesced || 0)} · interaction quiet 700ms · defer 750ms`,\n      `Effective refresh: ${effectiveRefreshMs()}ms`,"
)

one(
    'runtime panel scheduler ui',
    "<p>Render · widget ${num(performanceRuntime.lastRenderMs)?roundPerfMs(performanceRuntime.lastRenderMs)+'ms':'—'} · panel ${num(performanceRuntime.lastPanelRenderMs)?roundPerfMs(performanceRuntime.lastPanelRenderMs)+'ms':'—'} · spike ≥${RENDER_SPIKE_THRESHOLD_MS}ms ${Number(performanceRuntime.renderSpikeCount||0)}회</p><div class=\"actions\">",
    "<p>Render · widget ${num(performanceRuntime.lastRenderMs)?roundPerfMs(performanceRuntime.lastRenderMs)+'ms':'—'} · panel ${num(performanceRuntime.lastPanelRenderMs)?roundPerfMs(performanceRuntime.lastPanelRenderMs)+'ms':'—'} · spike ≥${RENDER_SPIKE_THRESHOLD_MS}ms ${Number(performanceRuntime.renderSpikeCount||0)}회</p><p>Panel Render · ${panelRenderTimer || panelIdleHandle !== null?'pending':'idle'} · coalesced ${Number(performanceRuntime.panelRenderCoalesced||0)}회 · interaction defer 750ms</p><div class=\"actions\">"
)

one(
    'unload panel cleanup',
    "      if(resetSyncTimer)clearTimeout(resetSyncTimer);\n      cancelRefreshScheduler();",
    "      if(resetSyncTimer)clearTimeout(resetSyncTimer);\n      cancelPanelRender();\n      cancelRefreshScheduler();"
)

widget_start_after = s.index('  function widgetHtml() {')
widget_end_after = s.index('  const widgetWidth = () =>', widget_start_after)
if s[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('3.29 must not change floating widget HTML')

for marker in [
    '//@version 3.0.0-alpha.3.29',
    "const VERSION = '3.0.0-alpha.3.29';",
    'panelRenderCoalesced:0',
    'function schedulePanelRender',
    'function cancelPanelRender',
    'interaction quiet 700ms · defer 750ms',
    'Panel render scheduler:',
    'Panel Render ·',
    'schedulePanelRender(false);',
    'RENDER_SPIKE_THRESHOLD_MS = 50',
    'Render spike:',
    'Scheduler: pending',
    'Resume grace:',
    'Resume probe:',
    'Resume long task:',
    'UI stall probe:',
    'Performance guard:',
    'Analytics · 24h / 7d / 30d',
    '24h Usage Scope',
]:
    if marker not in s:
        raise SystemExit('missing marker: ' + marker)

if s.count('schedulePanelRender(false);') != 2:
    raise SystemExit('automatic panel render routes must be exactly 2')

p.write_text(s)
