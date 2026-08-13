from pathlib import Path

p = Path('plugins/usage-dashboard/latest.js')
s = p.read_text()

if '//@version 3.0.0-alpha.3.25' not in s:
    raise SystemExit('latest.js is not alpha.3.25')

start = s.index('  function widgetHtml() {')
end = s.index('  const widgetWidth = () =>', start)
widget_before = s[start:end]

def one(old, new):
    global s
    if s.count(old) != 1:
        raise SystemExit(f'patch anchor mismatch: {old[:60]!r} count={s.count(old)}')
    s = s.replace(old, new, 1)

one('//@version 3.0.0-alpha.3.25', '//@version 3.0.0-alpha.3.26')
one("const VERSION = '3.0.0-alpha.3.25';", "const VERSION = '3.0.0-alpha.3.26';")
one(
    '  const RESUME_DIAGNOSTIC_WINDOW_MS = 10000;\n  const RESUME_MAIN_THREAD_PROBE_MS = 80;',
    '  const RESUME_GRACE_MS = 1200;\n  const RESUME_INTERACTION_QUIET_MS = 900;\n  const RESUME_MAX_DEFER_MS = 4500;\n  const RESUME_DIAGNOSTIC_WINDOW_MS = 10000;\n  const RESUME_MAIN_THREAD_PROBE_MS = 80;'
)
one('resumeMeasureTimer = null, resumeLongTaskObserver', 'resumeMeasureTimer = null, resumeRefreshTimer = null, resumeLongTaskObserver')
one(
    'uiStallProbeActive:false,resumeEvents:0,resumeMeasurePending:false',
    'uiStallProbeActive:false,lastInteractionAt:0,resumeEvents:0,resumeCoalesced:0,resumeDeferred:0,resumePending:false,resumeStartedAt:0,lastResumeDelayMs:null,resumeMeasurePending:false'
)

helpers = '''  function cancelResumeRefresh() {
    if (resumeRefreshTimer) clearTimeout(resumeRefreshTimer);
    resumeRefreshTimer = null;
    performanceRuntime.resumePending = false;
    performanceRuntime.resumeStartedAt = 0;
    stopResumeMeasurement();
  }

  function runResumeRefreshWhenQuiet() {
    resumeRefreshTimer = null;
    if (!state?.syncOnFocus || !state?.bridgeEnabled || !token) { performanceRuntime.resumePending = false; return; }
    if (state.backgroundPause !== false && document.visibilityState === 'hidden') { performanceRuntime.resumePending = false; return; }
    const now = Date.now();
    const startedAt = Number(performanceRuntime.resumeStartedAt || now);
    const elapsed = Math.max(0, now - startedAt);
    const quietFor = Math.max(0, now - Number(performanceRuntime.lastInteractionAt || 0));
    if (state.performanceGuard !== false && quietFor < RESUME_INTERACTION_QUIET_MS && elapsed < RESUME_MAX_DEFER_MS) {
      const wait = Math.max(120, RESUME_INTERACTION_QUIET_MS - quietFor);
      performanceRuntime.resumeDeferred += 1;
      resumeRefreshTimer = setTimeout(runResumeRefreshWhenQuiet, wait);
      return;
    }
    performanceRuntime.resumePending = false;
    performanceRuntime.lastResumeDelayMs = elapsed;
    refresh('visibility', true);
  }

  function requestResumeRefresh(reason = 'visibility') {
    if (!state?.syncOnFocus || !state?.bridgeEnabled || !token) return;
    if (state.backgroundPause !== false && document.visibilityState === 'hidden') return;
    performanceRuntime.lastResumeReason = String(reason || 'visibility');
    if (resumeRefreshTimer || performanceRuntime.resumePending) { performanceRuntime.resumeCoalesced += 1; return; }
    performanceRuntime.resumePending = true;
    performanceRuntime.resumeStartedAt = Date.now();
    resumeRefreshTimer = setTimeout(runResumeRefreshWhenQuiet, RESUME_GRACE_MS);
  }

'''
one('  function sourceAgeMs() {', helpers + '  function sourceAgeMs() {')

one(
    '      `Effective refresh: ${effectiveRefreshMs()}ms`,',
    "      `Resume grace: ${performanceRuntime.resumePending ? 'pending' : 'idle'} · delay ${num(performanceRuntime.lastResumeDelayMs) ? `${Number(performanceRuntime.lastResumeDelayMs)}ms` : '—'} · deferred ${Number(performanceRuntime.resumeDeferred || 0)} · coalesced ${Number(performanceRuntime.resumeCoalesced || 0)} · quiet ${RESUME_INTERACTION_QUIET_MS}ms · max ${RESUME_MAX_DEFER_MS}ms`,\n      `Effective refresh: ${effectiveRefreshMs()}ms`,"
)
one(
    '<div class="actions"><button id="copy-diag">진단 복사</button><button id="export-json">JSON 내보내기</button></div></section>',
    '<p>Resume Grace · ${performanceRuntime.resumePending?\'pending\':\'idle\'} · delay ${num(performanceRuntime.lastResumeDelayMs)?Number(performanceRuntime.lastResumeDelayMs)+\'ms\':\'—\'} · deferred ${Number(performanceRuntime.resumeDeferred||0)}회 · coalesced ${Number(performanceRuntime.resumeCoalesced||0)}회</p><div class="actions"><button id="copy-diag">진단 복사</button><button id="export-json">JSON 내보내기</button></div></section>'
)

old_lifecycle = '''  function installLifecycle() {
    installResumeLongTaskObserver();
    const vis=()=>{
      if(document.visibilityState==='visible'){
        beginResumeMeasurement('visibility');
        startUiStallProbe();
        scheduleRefresh();
        if(state.syncOnFocus&&state.bridgeEnabled)refresh('visibility',true);
      }else if(state.backgroundPause!==false){
        stopResumeMeasurement();
        stopUiStallProbe();
        if(refreshTimer){clearTimeout(refreshTimer);refreshTimer=null;}
      }
    };
    document.addEventListener('visibilitychange',vis); domListeners.push([document,'visibilitychange',vis]);
    startUiStallProbe();
  }
'''
new_lifecycle = '''  function installLifecycle() {
    installResumeLongTaskObserver();
    const vis=()=>{
      if(document.visibilityState==='visible'){
        beginResumeMeasurement('visibility');
        startUiStallProbe();
        scheduleRefresh();
        if(state.syncOnFocus&&state.bridgeEnabled)requestResumeRefresh('visibility');
      }else if(state.backgroundPause!==false){
        cancelResumeRefresh();
        stopUiStallProbe();
        if(refreshTimer){clearTimeout(refreshTimer);refreshTimer=null;}
      }
    };
    document.addEventListener('visibilitychange',vis); domListeners.push([document,'visibilitychange',vis]);
    for (const type of ['pointerdown','touchstart','wheel','keydown']) {
      const interaction = () => { performanceRuntime.lastInteractionAt = Date.now(); };
      document.addEventListener(type, interaction, {passive:true});
      domListeners.push([document,type,interaction]);
    }
    startUiStallProbe();
  }
'''
one(old_lifecycle, new_lifecycle)
one('      stopResumeMeasurement();\n      stopResumeLongTaskObserver();', '      cancelResumeRefresh();\n      stopResumeLongTaskObserver();')

start2 = s.index('  function widgetHtml() {')
end2 = s.index('  const widgetWidth = () =>', start2)
if s[start2:end2] != widget_before:
    raise SystemExit('floating widget changed')

for marker in [
    'RESUME_GRACE_MS = 1200', 'RESUME_INTERACTION_QUIET_MS = 900', 'RESUME_MAX_DEFER_MS = 4500',
    'function requestResumeRefresh', 'function runResumeRefreshWhenQuiet', 'Resume grace:', 'Resume Grace ·',
    "['pointerdown','touchstart','wheel','keydown']", 'Resume probe:', 'Resume long task:', 'UI stall probe:',
    'Performance guard:', 'Analytics · 24h / 7d / 30d', '24h Usage Scope'
]:
    if marker not in s:
        raise SystemExit('missing marker: ' + marker)

p.write_text(s)
