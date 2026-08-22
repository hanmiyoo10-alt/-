from pathlib import Path

p = Path('plugins/usage-dashboard/latest.js')
s = p.read_text()

TARGET = '3.0.0-alpha.3.38'
SOURCE = '3.0.0-alpha.3.37'

if f'//@version {TARGET}' in s and f"const VERSION = '{TARGET}';" in s:
    print('latest.js already matches alpha.3.38')
    raise SystemExit(0)
if f'//@version {SOURCE}' not in s or f"const VERSION = '{SOURCE}';" not in s:
    raise SystemExit('latest.js is not exact alpha.3.37 or alpha.3.38')

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

runtime_old = "lastResumeFrameDelayMs:null,lastResumeInputDuringRefresh:false,lastResumeMainThreadLagMs:null"
runtime_new = "lastResumeFrameDelayMs:null,lastResumeRefreshStartedAfterMs:null,lastResumeRefreshMs:null,lastResumeRenderMs:null,lastResumeHadRefreshAtEntry:false,resumeRefreshSamples:[],lastResumeInputDuringRefresh:false,lastResumeMainThreadLagMs:null"
one('resume runtime fields', runtime_old, runtime_new)

reset_old = '''    performanceRuntime.lastResumeFrameDelayMs = null;
    performanceRuntime.lastResumeInputDuringRefresh = false;
    performanceRuntime.lastResumeMainThreadLagMs = null;'''
reset_new = '''    performanceRuntime.lastResumeFrameDelayMs = null;
    performanceRuntime.lastResumeRefreshStartedAfterMs = null;
    performanceRuntime.lastResumeRefreshMs = null;
    performanceRuntime.lastResumeRenderMs = null;
    performanceRuntime.lastResumeHadRefreshAtEntry = Boolean(refreshInFlight);
    performanceRuntime.lastResumeInputDuringRefresh = false;
    performanceRuntime.lastResumeMainThreadLagMs = null;'''
one('resume reset fields', reset_old, reset_new)

refresh_start_old = '''    const startedPerf = typeof performance?.now === 'function' ? performance.now() : 0;
    performanceRuntime.activeRefreshStartedPerf = startedPerf;
    refreshInFlight = (async () => {'''
refresh_start_new = '''    const startedPerf = typeof performance?.now === 'function' ? performance.now() : 0;
    performanceRuntime.activeRefreshStartedPerf = startedPerf;
    const resumeVisibilityRefresh = reason === 'visibility' && performanceRuntime.resumeMeasurePending;
    if (resumeVisibilityRefresh) {
      const visiblePerf = Number(performanceRuntime.resumeVisiblePerf || 0);
      performanceRuntime.lastResumeRefreshStartedAfterMs = visiblePerf > 0 && startedPerf > 0
        ? roundPerfMs(startedPerf - visiblePerf)
        : null;
    }
    refreshInFlight = (async () => {'''
one('resume refresh start timing', refresh_start_old, refresh_start_new)

render_old = '''        await persist();
        await renderWidget(reason);
        scheduleRefresh();'''
render_new = '''        await persist();
        await renderWidget(reason);
        if (resumeVisibilityRefresh) {
          performanceRuntime.lastResumeRefreshMs = state.lastSyncDurationMs;
          performanceRuntime.lastResumeRenderMs = performanceRuntime.lastRenderMs;
          pushPerformanceSample('resumeRefreshSamples', state.lastSyncDurationMs);
        }
        scheduleRefresh();'''
one('resume refresh completion timing', render_old, render_new)

diag_old = '''      `Resume input: first ${num(performanceRuntime.lastResumeFirstInputAfterMs) ? `${roundPerfMs(performanceRuntime.lastResumeFirstInputAfterMs)}ms` : '—'} · event delay ${num(performanceRuntime.lastResumeInputDelayMs) ? `${roundPerfMs(performanceRuntime.lastResumeInputDelayMs)}ms` : '—'} · frame ${num(performanceRuntime.lastResumeFrameDelayMs) ? `${roundPerfMs(performanceRuntime.lastResumeFrameDelayMs)}ms` : '—'} · refresh overlap ${performanceRuntime.lastResumeInputDuringRefresh ? 'yes' : 'no'}`,
      `Resume long task: ${performanceRuntime.longTaskSupported ? 'supported' : 'unsupported'}'''
diag_new = '''      `Resume input: first ${num(performanceRuntime.lastResumeFirstInputAfterMs) ? `${roundPerfMs(performanceRuntime.lastResumeFirstInputAfterMs)}ms` : '—'} · event delay ${num(performanceRuntime.lastResumeInputDelayMs) ? `${roundPerfMs(performanceRuntime.lastResumeInputDelayMs)}ms` : '—'} · frame ${num(performanceRuntime.lastResumeFrameDelayMs) ? `${roundPerfMs(performanceRuntime.lastResumeFrameDelayMs)}ms` : '—'} · refresh overlap ${performanceRuntime.lastResumeInputDuringRefresh ? 'yes' : 'no'}`,
      `Resume refresh: started ${num(performanceRuntime.lastResumeRefreshStartedAfterMs) ? `${roundPerfMs(performanceRuntime.lastResumeRefreshStartedAfterMs)}ms after` : '—'} · duration ${num(performanceRuntime.lastResumeRefreshMs) ? `${roundPerfMs(performanceRuntime.lastResumeRefreshMs)}ms` : '—'} · render ${num(performanceRuntime.lastResumeRenderMs) ? `${roundPerfMs(performanceRuntime.lastResumeRenderMs)}ms` : '—'} · active at entry ${performanceRuntime.lastResumeHadRefreshAtEntry ? 'yes' : 'no'}`,
      `Resume long task: ${performanceRuntime.longTaskSupported ? 'supported' : 'unsupported'}'''
one('resume diagnostics line', diag_old, diag_new)

panel_old = '''</p><p>Resume Input · first ${num(performanceRuntime.lastResumeFirstInputAfterMs)?roundPerfMs(performanceRuntime.lastResumeFirstInputAfterMs)+'ms':'—'} · event delay ${num(performanceRuntime.lastResumeInputDelayMs)?roundPerfMs(performanceRuntime.lastResumeInputDelayMs)+'ms':'—'} · frame ${num(performanceRuntime.lastResumeFrameDelayMs)?roundPerfMs(performanceRuntime.lastResumeFrameDelayMs)+'ms':'—'} · refresh overlap ${performanceRuntime.lastResumeInputDuringRefresh?'yes':'no'}</p><p>Resume Grace ·'''
panel_new = '''</p><p>Resume Input · first ${num(performanceRuntime.lastResumeFirstInputAfterMs)?roundPerfMs(performanceRuntime.lastResumeFirstInputAfterMs)+'ms':'—'} · event delay ${num(performanceRuntime.lastResumeInputDelayMs)?roundPerfMs(performanceRuntime.lastResumeInputDelayMs)+'ms':'—'} · frame ${num(performanceRuntime.lastResumeFrameDelayMs)?roundPerfMs(performanceRuntime.lastResumeFrameDelayMs)+'ms':'—'} · refresh overlap ${performanceRuntime.lastResumeInputDuringRefresh?'yes':'no'}</p><p>Resume Refresh · started ${num(performanceRuntime.lastResumeRefreshStartedAfterMs)?roundPerfMs(performanceRuntime.lastResumeRefreshStartedAfterMs)+'ms after':'—'} · duration ${num(performanceRuntime.lastResumeRefreshMs)?roundPerfMs(performanceRuntime.lastResumeRefreshMs)+'ms':'—'} · render ${num(performanceRuntime.lastResumeRenderMs)?roundPerfMs(performanceRuntime.lastResumeRenderMs)+'ms':'—'} · active at entry ${performanceRuntime.lastResumeHadRefreshAtEntry?'yes':'no'}</p><p>Resume Grace ·'''
one('resume panel line', panel_old, panel_new)

widget_start_after = s.index('  function widgetHtml() {')
widget_end_after = s.index('  const widgetWidth = () =>', widget_start_after)
if s[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('3.38 must not change floating widget HTML')

for marker in [
    f'//@version {TARGET}',
    f"const VERSION = '{TARGET}';",
    'lastResumeRefreshStartedAfterMs:null',
    'lastResumeRefreshMs:null',
    'lastResumeRenderMs:null',
    'lastResumeHadRefreshAtEntry:false',
    'resumeRefreshSamples:[]',
    "const resumeVisibilityRefresh = reason === 'visibility' && performanceRuntime.resumeMeasurePending;",
    "pushPerformanceSample('resumeRefreshSamples', state.lastSyncDurationMs);",
    'Resume refresh: started',
    'Resume Refresh · started',
    'Stall/render coincidence:',
    'Bridge detail:',
    'Performance settings:',
    'Runtime state:',
    'Resume input:',
    'Panel render scheduler:',
    'Render spike:',
    'Scheduler: pending',
    'Resume grace:',
    'UI stall probe:',
    "Risuai.registerButton({name:'Usage',icon:'📊',iconType:'html',location:'chat'",
    'Analytics · 24h / 7d / 30d',
    '24h Usage Scope',
    'release-usage-dashboard/plugins/usage-dashboard/latest.js',
]:
    if marker not in s:
        raise SystemExit('missing marker: ' + marker)

p.write_text(s)
