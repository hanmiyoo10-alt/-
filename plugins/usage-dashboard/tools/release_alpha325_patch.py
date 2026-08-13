from pathlib import Path

path = Path('plugins/usage-dashboard/latest.js')
src = path.read_text()

if '//@version 3.0.0-alpha.3.24' not in src or "const VERSION = '3.0.0-alpha.3.24';" not in src:
    raise SystemExit('latest.js가 정확한 alpha.3.24가 아니야.')

widget_start = src.index('  function widgetHtml() {')
widget_end = src.index('  const widgetWidth = () =>', widget_start)
widget_before = src[widget_start:widget_end]

def replace_once(label, old, new):
    global src
    if src.count(old) != 1:
        raise SystemExit(f'{label} 패치 지점이 정확히 1개가 아니야: {src.count(old)}')
    src = src.replace(old, new, 1)

replace_once('메타 버전', '//@version 3.0.0-alpha.3.24', '//@version 3.0.0-alpha.3.25')
replace_once('런타임 버전', "const VERSION = '3.0.0-alpha.3.24';", "const VERSION = '3.0.0-alpha.3.25';")

replace_once(
    'resume 상수',
    "  const UI_STALL_PROBE_INTERVAL_MS = 100;\n  const UI_STALL_THRESHOLD_MS = 50;\n",
    "  const UI_STALL_PROBE_INTERVAL_MS = 100;\n  const UI_STALL_THRESHOLD_MS = 50;\n  const RESUME_DIAGNOSTIC_WINDOW_MS = 10000;\n  const RESUME_MAIN_THREAD_PROBE_MS = 80;\n"
)

replace_once(
    'resume 타이머/observer',
    "  let uiStallProbeTimer = null;\n  let widget = null, rootBody = null, drag = null;\n",
    "  let uiStallProbeTimer = null, resumeProbeTimer = null, resumeMeasureTimer = null, resumeLongTaskObserver = null;\n  let widget = null, rootBody = null, drag = null;\n"
)

replace_once(
    '성능 런타임 resume 상태',
    "  const performanceRuntime = {adaptiveMultiplier:1,slowRefreshes:0,fastRefreshes:0,mode:'normal',timerSamples:0,ignoredSamples:0,lastSampleReason:'',lastSampleDurationMs:null,activeRefreshStartedPerf:0,lastRefreshStartedPerf:0,lastRefreshEndedPerf:0,uiStallCount50:0,uiStallCount100:0,uiStallCount200:0,uiStallMaxMs:0,uiStallSamples:[],lastUiStallMs:null,lastUiStallAt:null,lastUiStallRefreshOverlap:false,uiStallProbeActive:false};\n",
    "  const performanceRuntime = {adaptiveMultiplier:1,slowRefreshes:0,fastRefreshes:0,mode:'normal',timerSamples:0,ignoredSamples:0,lastSampleReason:'',lastSampleDurationMs:null,activeRefreshStartedPerf:0,lastRefreshStartedPerf:0,lastRefreshEndedPerf:0,uiStallCount50:0,uiStallCount100:0,uiStallCount200:0,uiStallMaxMs:0,uiStallSamples:[],lastUiStallMs:null,lastUiStallAt:null,lastUiStallRefreshOverlap:false,uiStallProbeActive:false,resumeEvents:0,resumeMeasurePending:false,resumeVisiblePerf:0,lastResumeVisibleAt:null,lastResumeReason:'',lastResumeMainThreadLagMs:null,lastResumeProbeAfterMs:null,lastResumeProbeDuringRefresh:false,longTaskSupported:false,lastResumeLongTaskMs:null,lastResumeLongTaskStartedAfterMs:null,lastResumeLongTaskDuringRefresh:false,resumeLongTaskCount:0,resumeMainThreadLagSamples:[],resumeLongTaskSamples:[]};\n"
)

resume_helpers = '''  function stopResumeMeasurement() {\n    if (resumeProbeTimer) clearTimeout(resumeProbeTimer);\n    if (resumeMeasureTimer) clearTimeout(resumeMeasureTimer);\n    resumeProbeTimer = null;\n    resumeMeasureTimer = null;\n    performanceRuntime.resumeMeasurePending = false;\n  }\n\n  function beginResumeMeasurement(reason = 'visibility') {\n    stopResumeMeasurement();\n    performanceRuntime.resumeEvents += 1;\n    performanceRuntime.lastResumeReason = String(reason || 'visibility');\n    performanceRuntime.resumeMeasurePending = true;\n    performanceRuntime.resumeVisiblePerf = typeof performance?.now === 'function' ? performance.now() : 0;\n    performanceRuntime.lastResumeVisibleAt = Date.now();\n    performanceRuntime.lastResumeMainThreadLagMs = null;\n    performanceRuntime.lastResumeProbeAfterMs = null;\n    performanceRuntime.lastResumeProbeDuringRefresh = false;\n    performanceRuntime.lastResumeLongTaskMs = null;\n    performanceRuntime.lastResumeLongTaskStartedAfterMs = null;\n    performanceRuntime.lastResumeLongTaskDuringRefresh = false;\n    performanceRuntime.resumeLongTaskCount = 0;\n\n    if (typeof performance?.now === 'function') {\n      const expected = performance.now() + RESUME_MAIN_THREAD_PROBE_MS;\n      resumeProbeTimer = setTimeout(() => {\n        resumeProbeTimer = null;\n        const nowPerf = performance.now();\n        const lag = Math.max(0, nowPerf - expected);\n        const visiblePerf = Number(performanceRuntime.resumeVisiblePerf || 0);\n        performanceRuntime.lastResumeMainThreadLagMs = roundPerfMs(lag);\n        performanceRuntime.lastResumeProbeAfterMs = visiblePerf > 0 ? roundPerfMs(nowPerf - visiblePerf) : null;\n        performanceRuntime.lastResumeProbeDuringRefresh = refreshOverlapsPerfWindow(expected, nowPerf);\n        pushPerformanceSample('resumeMainThreadLagSamples', lag);\n      }, RESUME_MAIN_THREAD_PROBE_MS);\n    }\n\n    resumeMeasureTimer = setTimeout(() => {\n      resumeMeasureTimer = null;\n      performanceRuntime.resumeMeasurePending = false;\n    }, RESUME_DIAGNOSTIC_WINDOW_MS);\n  }\n\n  function installResumeLongTaskObserver() {\n    try {\n      if (typeof PerformanceObserver !== 'function') {\n        performanceRuntime.longTaskSupported = false;\n        return;\n      }\n      const supported = Array.isArray(PerformanceObserver.supportedEntryTypes)\n        && PerformanceObserver.supportedEntryTypes.includes('longtask');\n      performanceRuntime.longTaskSupported = Boolean(supported);\n      if (!supported) return;\n      resumeLongTaskObserver = new PerformanceObserver(list => {\n        const visiblePerf = Number(performanceRuntime.resumeVisiblePerf || 0);\n        if (!performanceRuntime.resumeMeasurePending || visiblePerf <= 0) return;\n        for (const entry of list.getEntries()) {\n          const start = Number(entry.startTime || 0);\n          const duration = Math.max(0, Number(entry.duration || 0));\n          const afterResume = start - visiblePerf;\n          if (!Number.isFinite(afterResume) || afterResume < 0 || afterResume > RESUME_DIAGNOSTIC_WINDOW_MS) continue;\n          performanceRuntime.lastResumeLongTaskMs = roundPerfMs(duration);\n          performanceRuntime.lastResumeLongTaskStartedAfterMs = roundPerfMs(afterResume);\n          performanceRuntime.lastResumeLongTaskDuringRefresh = refreshOverlapsPerfWindow(start, start + duration);\n          performanceRuntime.resumeLongTaskCount += 1;\n          pushPerformanceSample('resumeLongTaskSamples', duration);\n        }\n      });\n      resumeLongTaskObserver.observe({entryTypes:['longtask']});\n    } catch (_) {\n      performanceRuntime.longTaskSupported = false;\n      resumeLongTaskObserver = null;\n    }\n  }\n\n  function stopResumeLongTaskObserver() {\n    if (resumeLongTaskObserver) {\n      try { resumeLongTaskObserver.disconnect(); } catch (_) {}\n    }\n    resumeLongTaskObserver = null;\n  }\n\n'''
replace_once('resume helper 삽입', '  function sourceAgeMs() {', resume_helpers + '  function sourceAgeMs() {')

replace_once(
    '진단 resume 정보',
    "      `Last UI stall: ${num(performanceRuntime.lastUiStallMs) ? `${roundPerfMs(performanceRuntime.lastUiStallMs)}ms · refresh overlap ${performanceRuntime.lastUiStallRefreshOverlap ? 'yes' : 'no'} · ${age(performanceRuntime.lastUiStallAt)}` : 'none'}`,\n      `Effective refresh: ${effectiveRefreshMs()}ms`,\n",
    "      `Last UI stall: ${num(performanceRuntime.lastUiStallMs) ? `${roundPerfMs(performanceRuntime.lastUiStallMs)}ms · refresh overlap ${performanceRuntime.lastUiStallRefreshOverlap ? 'yes' : 'no'} · ${age(performanceRuntime.lastUiStallAt)}` : 'none'}`,\n      `Resume probe: events ${Number(performanceRuntime.resumeEvents || 0)} · reason ${performanceRuntime.lastResumeReason || '—'} · main-thread lag ${num(performanceRuntime.lastResumeMainThreadLagMs) ? `${roundPerfMs(performanceRuntime.lastResumeMainThreadLagMs)}ms` : '—'} · after ${num(performanceRuntime.lastResumeProbeAfterMs) ? `${roundPerfMs(performanceRuntime.lastResumeProbeAfterMs)}ms` : '—'} · refresh overlap ${performanceRuntime.lastResumeProbeDuringRefresh ? 'yes' : 'no'}`,\n      `Resume long task: ${performanceRuntime.longTaskSupported ? 'supported' : 'unsupported'} · count ${Number(performanceRuntime.resumeLongTaskCount || 0)} · ${num(performanceRuntime.lastResumeLongTaskMs) ? `last ${roundPerfMs(performanceRuntime.lastResumeLongTaskMs)}ms @ +${roundPerfMs(performanceRuntime.lastResumeLongTaskStartedAfterMs)}ms · refresh overlap ${performanceRuntime.lastResumeLongTaskDuringRefresh ? 'yes' : 'no'}` : 'last none'}`,\n      `Effective refresh: ${effectiveRefreshMs()}ms`,\n"
)

old_runtime_ui = "<p>UI Stall Probe · ${performanceRuntime.uiStallProbeActive?'active':'paused'} · ≥50ms ${Number(performanceRuntime.uiStallCount50||0)}회 · ≥100ms ${Number(performanceRuntime.uiStallCount100||0)}회 · ≥200ms ${Number(performanceRuntime.uiStallCount200||0)}회 · max ${roundPerfMs(performanceRuntime.uiStallMaxMs)||0}ms</p><div class=\"actions\"><button id=\"copy-diag\">진단 복사</button><button id=\"export-json\">JSON 내보내기</button></div>"
new_runtime_ui = "<p>UI Stall Probe · ${performanceRuntime.uiStallProbeActive?'active':'paused'} · ≥50ms ${Number(performanceRuntime.uiStallCount50||0)}회 · ≥100ms ${Number(performanceRuntime.uiStallCount100||0)}회 · ≥200ms ${Number(performanceRuntime.uiStallCount200||0)}회 · max ${roundPerfMs(performanceRuntime.uiStallMaxMs)||0}ms</p><p>Resume Diagnostics · ${Number(performanceRuntime.resumeEvents||0)}회 · ${performanceRuntime.lastResumeReason||'대기'} · main-thread ${num(performanceRuntime.lastResumeMainThreadLagMs)?roundPerfMs(performanceRuntime.lastResumeMainThreadLagMs)+'ms':'—'} · Long Task ${performanceRuntime.longTaskSupported?(Number(performanceRuntime.resumeLongTaskCount||0)+'회'):'미지원'}</p><div class=\"actions\"><button id=\"copy-diag\">진단 복사</button><button id=\"export-json\">JSON 내보내기</button></div>"
replace_once('Runtime Diagnostics resume 표시', old_runtime_ui, new_runtime_ui)

old_lifecycle = '''  function installLifecycle() {\n    const vis=()=>{\n      if(document.visibilityState==='visible'){\n        startUiStallProbe();\n        scheduleRefresh();\n        if(state.syncOnFocus&&state.bridgeEnabled)refresh('visibility',true);\n      }else if(state.backgroundPause!==false){\n        stopUiStallProbe();\n        if(refreshTimer){clearTimeout(refreshTimer);refreshTimer=null;}\n      }\n    };\n    document.addEventListener('visibilitychange',vis); domListeners.push([document,'visibilitychange',vis]);\n    startUiStallProbe();\n  }\n'''
new_lifecycle = '''  function installLifecycle() {\n    installResumeLongTaskObserver();\n    const vis=()=>{\n      if(document.visibilityState==='visible'){\n        beginResumeMeasurement('visibility');\n        startUiStallProbe();\n        scheduleRefresh();\n        if(state.syncOnFocus&&state.bridgeEnabled)refresh('visibility',true);\n      }else if(state.backgroundPause!==false){\n        stopResumeMeasurement();\n        stopUiStallProbe();\n        if(refreshTimer){clearTimeout(refreshTimer);refreshTimer=null;}\n      }\n    };\n    document.addEventListener('visibilitychange',vis); domListeners.push([document,'visibilitychange',vis]);\n    startUiStallProbe();\n  }\n'''
replace_once('lifecycle resume 진단', old_lifecycle, new_lifecycle)

replace_once(
    'unload resume 정리',
    "      if(resetSyncTimer)clearTimeout(resetSyncTimer);\n      stopUiStallProbe();\n",
    "      if(resetSyncTimer)clearTimeout(resetSyncTimer);\n      stopResumeMeasurement();\n      stopResumeLongTaskObserver();\n      stopUiStallProbe();\n"
)

widget_start_after = src.index('  function widgetHtml() {')
widget_end_after = src.index('  const widgetWidth = () =>', widget_start_after)
if src[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('3.25는 플로팅 위젯 HTML을 건드리면 안 돼.')

for marker in [
    'RESUME_DIAGNOSTIC_WINDOW_MS = 10000',
    'RESUME_MAIN_THREAD_PROBE_MS = 80',
    'function beginResumeMeasurement',
    'function installResumeLongTaskObserver',
    'Resume probe:',
    'Resume long task:',
    'Resume Diagnostics ·',
    'UI stall probe:',
    'Performance guard:',
    'Analytics · 24h / 7d / 30d',
    '24h Usage Scope',
]:
    if marker not in src:
        raise SystemExit(f'3.25 marker 누락: {marker}')

path.write_text(src)
