from pathlib import Path

p = Path('plugins/usage-dashboard/latest.js')
s = p.read_text()

TARGET = '3.0.0-alpha.3.39'
SOURCE = '3.0.0-alpha.3.38'

if f'//@version {TARGET}' in s and f"const VERSION = '{TARGET}';" in s:
    print('latest.js already matches alpha.3.39')
    raise SystemExit(0)
if f'//@version {SOURCE}' not in s or f"const VERSION = '{SOURCE}';" not in s:
    raise SystemExit('latest.js is not exact alpha.3.38 or alpha.3.39')

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

runtime_old = "lastSampleDurationMs:null,activeRefreshStartedPerf:0,lastRefreshStartedPerf:0,lastRefreshEndedPerf:0"
runtime_new = "lastSampleDurationMs:null,activeRefreshStartedPerf:0,activeRefreshReason:'',lastRefreshStartedPerf:0,lastRefreshEndedPerf:0"
one('active refresh reason field', runtime_old, runtime_new)

resume_fields_old = "lastResumeRefreshMs:null,lastResumeRenderMs:null,lastResumeHadRefreshAtEntry:false,resumeRefreshSamples:[],lastResumeInputDuringRefresh:false"
resume_fields_new = "lastResumeRefreshMs:null,lastResumeRenderMs:null,lastResumeHadRefreshAtEntry:false,lastResumeRequestedReason:'',lastResumeActualReason:'',lastResumeRefreshWasCoalesced:false,lastResumeCoalescedIntoReason:'',resumeRefreshSamples:[],lastResumeInputDuringRefresh:false"
one('resume merge fields', resume_fields_old, resume_fields_new)

reset_old = '''    performanceRuntime.lastResumeRefreshMs = null;
    performanceRuntime.lastResumeRenderMs = null;
    performanceRuntime.lastResumeHadRefreshAtEntry = Boolean(refreshInFlight);
    performanceRuntime.lastResumeInputDuringRefresh = false;'''
reset_new = '''    performanceRuntime.lastResumeRefreshMs = null;
    performanceRuntime.lastResumeRenderMs = null;
    performanceRuntime.lastResumeHadRefreshAtEntry = Boolean(refreshInFlight);
    performanceRuntime.lastResumeRequestedReason = '';
    performanceRuntime.lastResumeActualReason = '';
    performanceRuntime.lastResumeRefreshWasCoalesced = false;
    performanceRuntime.lastResumeCoalescedIntoReason = '';
    performanceRuntime.lastResumeInputDuringRefresh = false;'''
one('reset resume merge fields', reset_old, reset_new)

refresh_start_old = '''    const startedPerf = typeof performance?.now === 'function' ? performance.now() : 0;
    performanceRuntime.activeRefreshStartedPerf = startedPerf;
    const resumeVisibilityRefresh = reason === 'visibility' && performanceRuntime.resumeMeasurePending;
    if (resumeVisibilityRefresh) {
      const visiblePerf = Number(performanceRuntime.resumeVisiblePerf || 0);
      performanceRuntime.lastResumeRefreshStartedAfterMs = visiblePerf > 0 && startedPerf > 0
        ? roundPerfMs(startedPerf - visiblePerf)
        : null;
    }
    refreshInFlight = (async () => {'''
refresh_start_new = '''    const startedPerf = typeof performance?.now === 'function' ? performance.now() : 0;
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
    refreshInFlight = (async () => {'''
one('direct resume refresh route', refresh_start_old, refresh_start_new)

enqueue_old = '''    if (refreshInFlight) {
      performanceRuntime.schedulerMerged += 1;
      return refreshInFlight;
    }'''
enqueue_new = '''    if (refreshInFlight) {
      if (normalizedReason === 'visibility' && performanceRuntime.resumeMeasurePending) {
        const activeReason = String(performanceRuntime.activeRefreshReason || refreshSchedulerState.lastReason || state.lastRefreshReason || 'unknown');
        const visiblePerf = Number(performanceRuntime.resumeVisiblePerf || 0);
        const activeStartedPerf = Number(performanceRuntime.activeRefreshStartedPerf || 0);
        const resumeVisibleAt = performanceRuntime.lastResumeVisibleAt;
        const refreshCountBefore = Number(state.refreshCount || 0);
        const coalescedPromise = refreshInFlight;
        performanceRuntime.lastResumeRequestedReason = 'visibility';
        performanceRuntime.lastResumeActualReason = activeReason;
        performanceRuntime.lastResumeRefreshWasCoalesced = true;
        performanceRuntime.lastResumeCoalescedIntoReason = activeReason;
        performanceRuntime.lastResumeRefreshStartedAfterMs = visiblePerf > 0 && activeStartedPerf > 0
          ? roundPerfMs(activeStartedPerf - visiblePerf)
          : null;
        void coalescedPromise.then(() => {
          if (performanceRuntime.lastResumeVisibleAt !== resumeVisibleAt) return;
          if (Number(state.refreshCount || 0) <= refreshCountBefore) return;
          if (performanceRuntime.lastResumeRefreshMs !== null) return;
          performanceRuntime.lastResumeRefreshMs = state.lastSyncDurationMs;
          performanceRuntime.lastResumeRenderMs = performanceRuntime.lastRenderMs;
          pushPerformanceSample('resumeRefreshSamples', state.lastSyncDurationMs);
        }).catch(() => {});
      }
      performanceRuntime.schedulerMerged += 1;
      return refreshInFlight;
    }'''
one('capture coalesced visibility refresh', enqueue_old, enqueue_new)

finally_old = '''      performanceRuntime.activeRefreshStartedPerf = 0;
      refreshInFlight = null;
      updateRuntimeState('refresh-complete');'''
finally_new = '''      performanceRuntime.activeRefreshStartedPerf = 0;
      performanceRuntime.activeRefreshReason = '';
      refreshInFlight = null;
      updateRuntimeState('refresh-complete');'''
one('clear active refresh reason', finally_old, finally_new)

diag_old = '''      `Resume refresh: started ${num(performanceRuntime.lastResumeRefreshStartedAfterMs) ? `${roundPerfMs(performanceRuntime.lastResumeRefreshStartedAfterMs)}ms after` : '—'} · duration ${num(performanceRuntime.lastResumeRefreshMs) ? `${roundPerfMs(performanceRuntime.lastResumeRefreshMs)}ms` : '—'} · render ${num(performanceRuntime.lastResumeRenderMs) ? `${roundPerfMs(performanceRuntime.lastResumeRenderMs)}ms` : '—'} · active at entry ${performanceRuntime.lastResumeHadRefreshAtEntry ? 'yes' : 'no'}`,
      `Resume long task:'''
diag_new = '''      `Resume refresh: started ${num(performanceRuntime.lastResumeRefreshStartedAfterMs) ? `${roundPerfMs(performanceRuntime.lastResumeRefreshStartedAfterMs)}ms after` : '—'} · duration ${num(performanceRuntime.lastResumeRefreshMs) ? `${roundPerfMs(performanceRuntime.lastResumeRefreshMs)}ms` : '—'} · render ${num(performanceRuntime.lastResumeRenderMs) ? `${roundPerfMs(performanceRuntime.lastResumeRenderMs)}ms` : '—'} · active at entry ${performanceRuntime.lastResumeHadRefreshAtEntry ? 'yes' : 'no'}`,
      `Resume route: requested ${performanceRuntime.lastResumeRequestedReason || '—'} · actual ${performanceRuntime.lastResumeActualReason || '—'} · merged ${performanceRuntime.lastResumeRefreshWasCoalesced ? 'yes' : 'no'}${performanceRuntime.lastResumeRefreshWasCoalesced ? ` · into ${performanceRuntime.lastResumeCoalescedIntoReason || 'unknown'}` : ''}`,
      `Resume long task:'''
one('resume route diagnostics', diag_old, diag_new)

panel_old = '''</p><p>Resume Refresh · started ${num(performanceRuntime.lastResumeRefreshStartedAfterMs)?roundPerfMs(performanceRuntime.lastResumeRefreshStartedAfterMs)+'ms after':'—'} · duration ${num(performanceRuntime.lastResumeRefreshMs)?roundPerfMs(performanceRuntime.lastResumeRefreshMs)+'ms':'—'} · render ${num(performanceRuntime.lastResumeRenderMs)?roundPerfMs(performanceRuntime.lastResumeRenderMs)+'ms':'—'} · active at entry ${performanceRuntime.lastResumeHadRefreshAtEntry?'yes':'no'}</p><p>Resume Grace ·'''
panel_new = '''</p><p>Resume Refresh · started ${num(performanceRuntime.lastResumeRefreshStartedAfterMs)?roundPerfMs(performanceRuntime.lastResumeRefreshStartedAfterMs)+'ms after':'—'} · duration ${num(performanceRuntime.lastResumeRefreshMs)?roundPerfMs(performanceRuntime.lastResumeRefreshMs)+'ms':'—'} · render ${num(performanceRuntime.lastResumeRenderMs)?roundPerfMs(performanceRuntime.lastResumeRenderMs)+'ms':'—'} · active at entry ${performanceRuntime.lastResumeHadRefreshAtEntry?'yes':'no'}</p><p>Resume Route · requested ${esc(performanceRuntime.lastResumeRequestedReason||'—')} · actual ${esc(performanceRuntime.lastResumeActualReason||'—')} · merged ${performanceRuntime.lastResumeRefreshWasCoalesced?'yes':'no'}${performanceRuntime.lastResumeRefreshWasCoalesced?` · into ${esc(performanceRuntime.lastResumeCoalescedIntoReason||'unknown')}`:''}</p><p>Resume Grace ·'''
one('resume route panel', panel_old, panel_new)

widget_start_after = s.index('  function widgetHtml() {')
widget_end_after = s.index('  const widgetWidth = () =>', widget_start_after)
if s[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('3.39 must not change floating widget HTML')

for marker in [
    f'//@version {TARGET}',
    f"const VERSION = '{TARGET}';",
    "activeRefreshReason:''",
    "lastResumeRequestedReason:''",
    "lastResumeActualReason:''",
    'lastResumeRefreshWasCoalesced:false',
    "lastResumeCoalescedIntoReason:''",
    "normalizedReason === 'visibility' && performanceRuntime.resumeMeasurePending",
    "performanceRuntime.lastResumeRequestedReason = 'visibility';",
    "performanceRuntime.lastResumeRefreshWasCoalesced = true;",
    "pushPerformanceSample('resumeRefreshSamples', state.lastSyncDurationMs);",
    'Resume refresh: started',
    'Resume route: requested',
    'Resume Route · requested',
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
