from pathlib import Path

p = Path('plugins/usage-dashboard/latest.js')
s = p.read_text()

TARGET = '3.0.0-alpha.3.37'
SOURCE = '3.0.0-alpha.3.36'

if f'//@version {TARGET}' in s and f"const VERSION = '{TARGET}';" in s:
    print('latest.js already matches alpha.3.37')
    raise SystemExit(0)
if f'//@version {SOURCE}' not in s or f"const VERSION = '{SOURCE}';" not in s:
    raise SystemExit('latest.js is not exact alpha.3.36 or alpha.3.37')

widget_start = s.index('  function widgetHtml() {')
widget_end = s.index('  const widgetWidth = () =>', widget_start)
widget_before = s[widget_start:widget_end]

def one(label, old, new):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: patch anchor count={count}')
    s = s.replace(old, new, 1)

one('meta version', f'//@version {SOURCE}', f'//@version {TARGET}')
one('runtime version', f"const VERSION = '{SOURCE}';", f"const VERSION = '{TARGET}';")

one(
    'stall render runtime fields',
    "lastUiStallMs:null,lastUiStallAt:null,lastUiStallRefreshOverlap:false,uiStallProbeActive:false",
    "lastUiStallMs:null,lastUiStallAt:null,lastUiStallRefreshOverlap:false,lastUiStallRenderOverlap:false,lastUiStallRenderReason:'',lastUiStallRenderMs:null,uiStallProbeActive:false"
)

refresh_helper = '''  function refreshOverlapsPerfWindow(startPerf, endPerf) {
    const start = Number(startPerf);
    const end = Number(endPerf);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return false;
    const activeStart = Number(performanceRuntime.activeRefreshStartedPerf || 0);
    if (refreshInFlight && activeStart > 0 && activeStart <= end) return true;
    const lastStart = Number(performanceRuntime.lastRefreshStartedPerf || 0);
    const lastEnd = Number(performanceRuntime.lastRefreshEndedPerf || 0);
    return lastStart > 0 && lastEnd >= start && lastStart <= end;
  }
'''
render_helper = refresh_helper + '''
  // DevPass 2.7.3 correlation probe: determine whether a measured UI stall
  // crossed the active or most-recent widget render window. Measurement only.
  function renderOverlapsPerfWindow(startPerf, endPerf) {
    const start = Number(startPerf);
    const end = Number(endPerf);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return false;
    const activeStart = Number(performanceRuntime.activeRenderStartedPerf || 0);
    if (activeStart > 0 && activeStart <= end) return true;
    const lastStart = Number(performanceRuntime.lastRenderStartedPerf || 0);
    const lastEnd = Number(performanceRuntime.lastRenderEndedPerf || 0);
    return lastStart > 0 && lastEnd >= start && lastStart <= end;
  }
'''
one('render overlap helper', refresh_helper, render_helper)

one(
    'stall render capture',
    "        performanceRuntime.lastUiStallRefreshOverlap = refreshOverlapsPerfWindow(expected, nowPerf);\n        pushPerformanceSample('uiStallSamples', lag);",
    "        performanceRuntime.lastUiStallRefreshOverlap = refreshOverlapsPerfWindow(expected, nowPerf);\n        performanceRuntime.lastUiStallRenderOverlap = renderOverlapsPerfWindow(expected, nowPerf);\n        performanceRuntime.lastUiStallRenderReason = performanceRuntime.lastUiStallRenderOverlap\n          ? String(performanceRuntime.activeRenderReason || performanceRuntime.lastRenderReason || '')\n          : '';\n        performanceRuntime.lastUiStallRenderMs = performanceRuntime.lastUiStallRenderOverlap\n          ? (Number(performanceRuntime.activeRenderStartedPerf || 0) > 0\n            ? roundPerfMs(nowPerf - Number(performanceRuntime.activeRenderStartedPerf || nowPerf))\n            : roundPerfMs(performanceRuntime.lastRenderMs))\n          : null;\n        pushPerformanceSample('uiStallSamples', lag);"
)

old_last_stall = "      `Last UI stall: ${num(performanceRuntime.lastUiStallMs) ? `${roundPerfMs(performanceRuntime.lastUiStallMs)}ms · refresh overlap ${performanceRuntime.lastUiStallRefreshOverlap ? 'yes' : 'no'} · ${age(performanceRuntime.lastUiStallAt)}` : 'none'}`,"
new_last_stall = "      `Last UI stall: ${num(performanceRuntime.lastUiStallMs) ? `${roundPerfMs(performanceRuntime.lastUiStallMs)}ms · refresh overlap ${performanceRuntime.lastUiStallRefreshOverlap ? 'yes' : 'no'} · render overlap ${performanceRuntime.lastUiStallRenderOverlap ? 'yes' : 'no'}${performanceRuntime.lastUiStallRenderOverlap ? ` (${performanceRuntime.lastUiStallRenderReason || 'unknown'} · ${num(performanceRuntime.lastUiStallRenderMs) ? `${roundPerfMs(performanceRuntime.lastUiStallRenderMs)}ms` : '—'})` : ''} · ${age(performanceRuntime.lastUiStallAt)}` : 'none'}`,"
one('last stall diagnostics', old_last_stall, new_last_stall)

render_spike_line = "      `Render spike: ≥${RENDER_SPIKE_THRESHOLD_MS}ms · count ${Number(performanceRuntime.renderSpikeCount || 0)} · ${num(performanceRuntime.lastRenderSpikeMs) ? `last ${roundPerfMs(performanceRuntime.lastRenderSpikeMs)}ms · reason ${performanceRuntime.lastRenderSpikeReason || '—'} · refresh overlap ${performanceRuntime.lastRenderSpikeRefreshOverlap ? 'yes' : 'no'} · phases ${renderBreakdownText(performanceRuntime.lastRenderSpikeBreakdown)}` : 'last none'}`,"
coincidence_line = render_spike_line + "\n      `Stall/render coincidence: ${performanceRuntime.lastUiStallRenderOverlap ? 'yes' : 'no'}${performanceRuntime.lastUiStallRenderOverlap ? ` · ${performanceRuntime.lastUiStallRenderReason || 'unknown'} · ${num(performanceRuntime.lastUiStallRenderMs) ? `${roundPerfMs(performanceRuntime.lastUiStallRenderMs)}ms` : '—'}` : ''}`,"
one('coincidence diagnostics', render_spike_line, coincidence_line)

panel_probe = "<p>UI Stall Probe · ${performanceRuntime.uiStallProbeActive?'active':'paused'} · ≥50ms ${Number(performanceRuntime.uiStallCount50||0)}회 · ≥100ms ${Number(performanceRuntime.uiStallCount100||0)}회 · ≥200ms ${Number(performanceRuntime.uiStallCount200||0)}회 · max ${roundPerfMs(performanceRuntime.uiStallMaxMs)||0}ms</p><p>Resume Diagnostics ·"
panel_corr = "<p>UI Stall Probe · ${performanceRuntime.uiStallProbeActive?'active':'paused'} · ≥50ms ${Number(performanceRuntime.uiStallCount50||0)}회 · ≥100ms ${Number(performanceRuntime.uiStallCount100||0)}회 · ≥200ms ${Number(performanceRuntime.uiStallCount200||0)}회 · max ${roundPerfMs(performanceRuntime.uiStallMaxMs)||0}ms</p><p>Stall / Render · coincidence ${performanceRuntime.lastUiStallRenderOverlap?'yes':'no'}${performanceRuntime.lastUiStallRenderOverlap?` · ${esc(performanceRuntime.lastUiStallRenderReason||'unknown')} · ${num(performanceRuntime.lastUiStallRenderMs)?roundPerfMs(performanceRuntime.lastUiStallRenderMs)+'ms':'—'}`:''} · refresh overlap ${performanceRuntime.lastUiStallRefreshOverlap?'yes':'no'}</p><p>Resume Diagnostics ·"
one('runtime panel correlation', panel_probe, panel_corr)

widget_start_after = s.index('  function widgetHtml() {')
widget_end_after = s.index('  const widgetWidth = () =>', widget_start_after)
if s[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('3.37 must not change floating widget HTML')

for marker in [
    f'//@version {TARGET}',
    f"const VERSION = '{TARGET}';",
    'lastUiStallRenderOverlap:false',
    "lastUiStallRenderReason:''",
    'lastUiStallRenderMs:null',
    'function renderOverlapsPerfWindow',
    'render overlap ${performanceRuntime.lastUiStallRenderOverlap',
    'Stall/render coincidence:',
    'Stall / Render · coincidence',
    'Bridge detail:',
    'Bridge cache:',
    "Risuai.registerButton({name:'Usage',icon:'📊',iconType:'html',location:'chat'",
    'Performance settings:',
    'Runtime state:',
    'Resume input:',
    'Panel render scheduler:',
    'Render spike:',
    'Scheduler: pending',
    'Resume grace:',
    'UI stall probe:',
    'Analytics · 24h / 7d / 30d',
    '24h Usage Scope',
    'release-usage-dashboard/plugins/usage-dashboard/latest.js',
]:
    if marker not in s:
        raise SystemExit('missing marker: ' + marker)

p.write_text(s)
