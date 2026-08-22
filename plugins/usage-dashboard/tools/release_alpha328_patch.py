from pathlib import Path

p = Path('plugins/usage-dashboard/latest.js')
s = p.read_text()

if '//@version 3.0.0-alpha.3.27' not in s or "const VERSION = '3.0.0-alpha.3.27';" not in s:
    raise SystemExit('latest.js is not exact alpha.3.27')

widget_start = s.index('  function widgetHtml() {')
widget_end = s.index('  const widgetWidth = () =>', widget_start)
widget_before = s[widget_start:widget_end]

def one(label, old, new):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: patch anchor count={count}')
    s = s.replace(old, new, 1)

one('meta version', '//@version 3.0.0-alpha.3.27', '//@version 3.0.0-alpha.3.28')
one('runtime version', "const VERSION = '3.0.0-alpha.3.27';", "const VERSION = '3.0.0-alpha.3.28';")

one(
    'render spike threshold',
    '  const UI_STALL_THRESHOLD_MS = 50;\n',
    '  const UI_STALL_THRESHOLD_MS = 50;\n  const RENDER_SPIKE_THRESHOLD_MS = 50;\n'
)

one(
    'render runtime state',
    'schedulerQueued:0,schedulerMerged:0,schedulerExecuted:0,schedulerDeferredForInteraction:0};',
    "schedulerQueued:0,schedulerMerged:0,schedulerExecuted:0,schedulerDeferredForInteraction:0,lastRenderMs:null,lastPanelRenderMs:null,lastRenderReason:'',lastRenderStartedPerf:0,lastRenderEndedPerf:0,activeRenderStartedPerf:0,activeRenderReason:'',lastRenderBreakdown:null,renderSpikeCount:0,renderSpikeSamples:[],lastRenderSpikeMs:null,lastRenderSpikeAt:null,lastRenderSpikeReason:'',lastRenderSpikeRefreshOverlap:false,lastRenderSpikeBreakdown:null};"
)

render_helpers = '''  function renderBreakdownText(value) {
    if (!value || typeof value !== 'object') return '—';
    return Object.entries(value)
      .filter(([, ms]) => num(ms))
      .map(([key, ms]) => `${key} ${roundPerfMs(ms)}ms`)
      .join(' · ') || '—';
  }

  function noteRenderSpike(durationMs, reason, startPerf, endPerf, breakdown = null) {
    const duration = roundPerfMs(durationMs);
    if (!Number.isFinite(duration) || duration < RENDER_SPIKE_THRESHOLD_MS) return;
    performanceRuntime.renderSpikeCount += 1;
    performanceRuntime.lastRenderSpikeMs = duration;
    performanceRuntime.lastRenderSpikeAt = Date.now();
    performanceRuntime.lastRenderSpikeReason = String(reason || 'ui');
    performanceRuntime.lastRenderSpikeRefreshOverlap = refreshOverlapsPerfWindow(startPerf, endPerf);
    performanceRuntime.lastRenderSpikeBreakdown = breakdown && typeof breakdown === 'object' ? {...breakdown} : null;
    pushPerformanceSample('renderSpikeSamples', duration);
  }

'''
one('render helper insertion', '  function stopUiStallProbe() {', render_helpers + '  function stopUiStallProbe() {')

one(
    'panel render measurement',
    "  function renderSettings() { document.body.innerHTML = settingsHtml(); bindSettings(); }",
    '''  function renderSettings() {
    const startedPerf = typeof performance?.now === 'function' ? performance.now() : Date.now();
    document.body.innerHTML = settingsHtml();
    bindSettings();
    const endedPerf = typeof performance?.now === 'function' ? performance.now() : Date.now();
    const duration = Math.max(0, endedPerf - startedPerf);
    performanceRuntime.lastPanelRenderMs = roundPerfMs(duration);
    noteRenderSpike(duration, 'panel', startedPerf, endedPerf, {panel:roundPerfMs(duration)});
  }'''
)

one(
    'widget render measurement',
    '''  async function renderWidget() {
    await ensureWidget(); if (!widget) return;
    await widget.setStyle('width',widgetWidth());
    await widget.setStyle('display',state.widgetVisible===false?'none':'block');
    if (state.widgetVisible!==false) await widget.setInnerHTML(widgetHtml());
  }''',
    '''  async function renderWidget(reason = 'ui') {
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
      if (!widget) return;
      phaseStarted = nowPerf();
      await widget.setStyle('width',widgetWidth());
      await widget.setStyle('display',state.widgetVisible===false?'none':'block');
      breakdown.style = roundPerfMs(nowPerf() - phaseStarted);
      if (state.widgetVisible!==false) {
        phaseStarted = nowPerf();
        await widget.setInnerHTML(widgetHtml());
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
  }'''
)

one(
    'refresh success render reason',
    "        await persist();\n        await renderWidget();\n        scheduleRefresh();",
    "        await persist();\n        await renderWidget(reason);\n        scheduleRefresh();"
)
one(
    'refresh error render reason',
    "        // LIVE changes to OFFLINE as soon as a refresh fails.\n        await renderWidget();\n        scheduleRefresh();",
    "        // LIVE changes to OFFLINE as soon as a refresh fails.\n        await renderWidget(reason);\n        scheduleRefresh();"
)

one(
    'render diagnostics text',
    "      `Scheduler: pending ${refreshSchedulerState.pending ? 'yes' : 'no'} · running ${refreshSchedulerState.running ? 'yes' : 'no'} · queued ${Number(performanceRuntime.schedulerQueued || 0)} · merged ${Number(performanceRuntime.schedulerMerged || 0)} · executed ${Number(performanceRuntime.schedulerExecuted || 0)} · interaction defer ${Number(performanceRuntime.schedulerDeferredForInteraction || 0)} · last ${refreshSchedulerState.lastReason || '—'}`,\n      `Effective refresh: ${effectiveRefreshMs()}ms`,",
    "      `Scheduler: pending ${refreshSchedulerState.pending ? 'yes' : 'no'} · running ${refreshSchedulerState.running ? 'yes' : 'no'} · queued ${Number(performanceRuntime.schedulerQueued || 0)} · merged ${Number(performanceRuntime.schedulerMerged || 0)} · executed ${Number(performanceRuntime.schedulerExecuted || 0)} · interaction defer ${Number(performanceRuntime.schedulerDeferredForInteraction || 0)} · last ${refreshSchedulerState.lastReason || '—'}`,\n      `Render: widget ${num(performanceRuntime.lastRenderMs) ? `${roundPerfMs(performanceRuntime.lastRenderMs)}ms` : '—'} · panel ${num(performanceRuntime.lastPanelRenderMs) ? `${roundPerfMs(performanceRuntime.lastPanelRenderMs)}ms` : '—'} · reason ${performanceRuntime.lastRenderReason || '—'} · phases ${renderBreakdownText(performanceRuntime.lastRenderBreakdown)}`,\n      `Render spike: ≥${RENDER_SPIKE_THRESHOLD_MS}ms · count ${Number(performanceRuntime.renderSpikeCount || 0)} · ${num(performanceRuntime.lastRenderSpikeMs) ? `last ${roundPerfMs(performanceRuntime.lastRenderSpikeMs)}ms · reason ${performanceRuntime.lastRenderSpikeReason || '—'} · refresh overlap ${performanceRuntime.lastRenderSpikeRefreshOverlap ? 'yes' : 'no'} · phases ${renderBreakdownText(performanceRuntime.lastRenderSpikeBreakdown)}` : 'last none'}`,\n      `Effective refresh: ${effectiveRefreshMs()}ms`,"
)

one(
    'runtime render ui',
    "<p>Scheduler · ${refreshSchedulerState.pending?'pending':(refreshSchedulerState.running?'running':'idle')} · queued ${Number(performanceRuntime.schedulerQueued||0)} · merged ${Number(performanceRuntime.schedulerMerged||0)} · executed ${Number(performanceRuntime.schedulerExecuted||0)} · interaction defer ${Number(performanceRuntime.schedulerDeferredForInteraction||0)}</p><div class=\"actions\"><button id=\"copy-diag\">진단 복사</button><button id=\"export-json\">JSON 내보내기</button></div></section>",
    "<p>Scheduler · ${refreshSchedulerState.pending?'pending':(refreshSchedulerState.running?'running':'idle')} · queued ${Number(performanceRuntime.schedulerQueued||0)} · merged ${Number(performanceRuntime.schedulerMerged||0)} · executed ${Number(performanceRuntime.schedulerExecuted||0)} · interaction defer ${Number(performanceRuntime.schedulerDeferredForInteraction||0)}</p><p>Render · widget ${num(performanceRuntime.lastRenderMs)?roundPerfMs(performanceRuntime.lastRenderMs)+'ms':'—'} · panel ${num(performanceRuntime.lastPanelRenderMs)?roundPerfMs(performanceRuntime.lastPanelRenderMs)+'ms':'—'} · spike ≥${RENDER_SPIKE_THRESHOLD_MS}ms ${Number(performanceRuntime.renderSpikeCount||0)}회</p><div class=\"actions\"><button id=\"copy-diag\">진단 복사</button><button id=\"export-json\">JSON 내보내기</button></div></section>"
)

widget_start_after = s.index('  function widgetHtml() {')
widget_end_after = s.index('  const widgetWidth = () =>', widget_start_after)
if s[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('3.28 must not change floating widget HTML')

for marker in [
    '//@version 3.0.0-alpha.3.28',
    "const VERSION = '3.0.0-alpha.3.28';",
    'RENDER_SPIKE_THRESHOLD_MS = 50',
    'function noteRenderSpike',
    'function renderBreakdownText',
    'lastRenderMs:null',
    'renderSpikeCount:0',
    'Render: widget',
    'Render spike:',
    'Render · widget',
    'Scheduler: pending',
    'Resume grace:',
    'Resume probe:',
    'UI stall probe:',
    'Performance guard:',
    'Analytics · 24h / 7d / 30d',
    '24h Usage Scope',
]:
    if marker not in s:
        raise SystemExit('missing marker: ' + marker)

p.write_text(s)
