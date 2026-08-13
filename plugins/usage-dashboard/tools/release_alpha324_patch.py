from pathlib import Path

path = Path('plugins/usage-dashboard/latest.js')
src = path.read_text()

if '//@version 3.0.0-alpha.3.23' not in src or "const VERSION = '3.0.0-alpha.3.23';" not in src:
    raise SystemExit('latest.js가 정확한 alpha.3.23이 아니야.')

widget_start = src.index('  function widgetHtml() {')
widget_end = src.index('  const widgetWidth = () =>', widget_start)
widget_before = src[widget_start:widget_end]

def replace_once(label, old, new):
    global src
    if old not in src:
        raise SystemExit(f'{label} 패치 지점을 찾지 못했어.')
    src = src.replace(old, new, 1)

replace_once('메타 버전', '//@version 3.0.0-alpha.3.23', '//@version 3.0.0-alpha.3.24')
replace_once('런타임 버전', "const VERSION = '3.0.0-alpha.3.23';", "const VERSION = '3.0.0-alpha.3.24';")

replace_once(
    'UI stall 상수',
    "  const KST_TIME_ZONE = 'Asia/Seoul';\n  const DEFAULT_BRIDGE = 'http://127.0.0.1:39117';\n",
    "  const KST_TIME_ZONE = 'Asia/Seoul';\n  const UI_STALL_PROBE_INTERVAL_MS = 100;\n  const UI_STALL_THRESHOLD_MS = 50;\n  const DEFAULT_BRIDGE = 'http://127.0.0.1:39117';\n"
)

replace_once(
    'UI stall 타이머',
    "  let store, state, token = '', refreshTimer = null, resetSyncTimer = null, refreshInFlight = null;\n  let widget = null, rootBody = null, drag = null;\n",
    "  let store, state, token = '', refreshTimer = null, resetSyncTimer = null, refreshInFlight = null;\n  let uiStallProbeTimer = null;\n  let widget = null, rootBody = null, drag = null;\n"
)

replace_once(
    '성능 런타임 UI stall 상태',
    "  const performanceRuntime = {adaptiveMultiplier:1,slowRefreshes:0,fastRefreshes:0,mode:'normal',timerSamples:0,ignoredSamples:0,lastSampleReason:'',lastSampleDurationMs:null};\n",
    "  const performanceRuntime = {adaptiveMultiplier:1,slowRefreshes:0,fastRefreshes:0,mode:'normal',timerSamples:0,ignoredSamples:0,lastSampleReason:'',lastSampleDurationMs:null,activeRefreshStartedPerf:0,lastRefreshStartedPerf:0,lastRefreshEndedPerf:0,uiStallCount50:0,uiStallCount100:0,uiStallCount200:0,uiStallMaxMs:0,uiStallSamples:[],lastUiStallMs:null,lastUiStallAt:null,lastUiStallRefreshOverlap:false,uiStallProbeActive:false};\n"
)

stall_helpers = '''  function pushPerformanceSample(key, value, limit = 12) {\n    const n = Number(value);\n    if (!Number.isFinite(n) || n < 0) return;\n    const list = Array.isArray(performanceRuntime[key]) ? performanceRuntime[key] : [];\n    list.push(Math.round(n * 10) / 10);\n    while (list.length > limit) list.shift();\n    performanceRuntime[key] = list;\n  }\n\n  function roundPerfMs(value) {\n    const n = Number(value);\n    return Number.isFinite(n) ? Math.max(0, Math.round(n * 10) / 10) : null;\n  }\n\n  function refreshOverlapsPerfWindow(startPerf, endPerf) {\n    const start = Number(startPerf);\n    const end = Number(endPerf);\n    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return false;\n    const activeStart = Number(performanceRuntime.activeRefreshStartedPerf || 0);\n    if (refreshInFlight && activeStart > 0 && activeStart <= end) return true;\n    const lastStart = Number(performanceRuntime.lastRefreshStartedPerf || 0);\n    const lastEnd = Number(performanceRuntime.lastRefreshEndedPerf || 0);\n    return lastStart > 0 && lastEnd >= start && lastStart <= end;\n  }\n\n  function stopUiStallProbe() {\n    if (uiStallProbeTimer) clearTimeout(uiStallProbeTimer);\n    uiStallProbeTimer = null;\n    performanceRuntime.uiStallProbeActive = false;\n  }\n\n  function startUiStallProbe() {\n    stopUiStallProbe();\n    if (typeof performance?.now !== 'function') return;\n    if (state?.backgroundPause !== false && document.visibilityState === 'hidden') return;\n    performanceRuntime.uiStallProbeActive = true;\n    let expected = performance.now() + UI_STALL_PROBE_INTERVAL_MS;\n    const tick = () => {\n      uiStallProbeTimer = null;\n      if (state?.backgroundPause !== false && document.visibilityState === 'hidden') {\n        performanceRuntime.uiStallProbeActive = false;\n        return;\n      }\n      const nowPerf = performance.now();\n      const lag = Math.max(0, nowPerf - expected);\n      if (lag >= UI_STALL_THRESHOLD_MS) {\n        const rounded = roundPerfMs(lag);\n        performanceRuntime.uiStallCount50 += 1;\n        if (lag >= 100) performanceRuntime.uiStallCount100 += 1;\n        if (lag >= 200) performanceRuntime.uiStallCount200 += 1;\n        performanceRuntime.uiStallMaxMs = Math.max(Number(performanceRuntime.uiStallMaxMs || 0), rounded || 0);\n        performanceRuntime.lastUiStallMs = rounded;\n        performanceRuntime.lastUiStallAt = Date.now();\n        performanceRuntime.lastUiStallRefreshOverlap = refreshOverlapsPerfWindow(expected, nowPerf);\n        pushPerformanceSample('uiStallSamples', lag);\n      }\n      expected = nowPerf + UI_STALL_PROBE_INTERVAL_MS;\n      uiStallProbeTimer = setTimeout(tick, UI_STALL_PROBE_INTERVAL_MS);\n    };\n    uiStallProbeTimer = setTimeout(tick, UI_STALL_PROBE_INTERVAL_MS);\n  }\n\n'''
replace_once('UI stall helper 삽입', '  function sourceAgeMs() {', stall_helpers + '  function sourceAgeMs() {')

replace_once(
    'refresh perf 시작 기록',
    "    const started = Date.now();\n    refreshInFlight = (async () => {\n",
    "    const started = Date.now();\n    const startedPerf = typeof performance?.now === 'function' ? performance.now() : 0;\n    performanceRuntime.activeRefreshStartedPerf = startedPerf;\n    refreshInFlight = (async () => {\n"
)

replace_once(
    'refresh perf 종료 기록',
    "    try { await refreshInFlight; } finally { refreshInFlight = null; }\n",
    "    try { await refreshInFlight; } finally {\n      const endedPerf = typeof performance?.now === 'function' ? performance.now() : 0;\n      if (startedPerf > 0 && endedPerf >= startedPerf) {\n        performanceRuntime.lastRefreshStartedPerf = startedPerf;\n        performanceRuntime.lastRefreshEndedPerf = endedPerf;\n      }\n      performanceRuntime.activeRefreshStartedPerf = 0;\n      refreshInFlight = null;\n    }\n"
)

replace_once(
    '진단 UI stall 정보',
    "      `Guard samples: timer ${Number(performanceRuntime.timerSamples || 0)} · ignored ${Number(performanceRuntime.ignoredSamples || 0)} · slow streak ${Number(performanceRuntime.slowRefreshes || 0)}`,\n      `Effective refresh: ${effectiveRefreshMs()}ms`,\n",
    "      `Guard samples: timer ${Number(performanceRuntime.timerSamples || 0)} · ignored ${Number(performanceRuntime.ignoredSamples || 0)} · slow streak ${Number(performanceRuntime.slowRefreshes || 0)}`,\n      `UI stall probe: ${performanceRuntime.uiStallProbeActive ? 'active' : 'paused'} · ≥50ms ${Number(performanceRuntime.uiStallCount50 || 0)} · ≥100ms ${Number(performanceRuntime.uiStallCount100 || 0)} · ≥200ms ${Number(performanceRuntime.uiStallCount200 || 0)} · max ${roundPerfMs(performanceRuntime.uiStallMaxMs) || 0}ms`,\n      `Last UI stall: ${num(performanceRuntime.lastUiStallMs) ? `${roundPerfMs(performanceRuntime.lastUiStallMs)}ms · refresh overlap ${performanceRuntime.lastUiStallRefreshOverlap ? 'yes' : 'no'} · ${age(performanceRuntime.lastUiStallAt)}` : 'none'}`,\n      `Effective refresh: ${effectiveRefreshMs()}ms`,\n"
)

replace_once(
    'Runtime Diagnostics UI stall 표시',
    "<p>Performance Guard · ${state.performanceGuard===false?'off':performanceRuntime.mode} · 실효 갱신 ${effectiveRefreshMs()?Math.round(effectiveRefreshMs()/1000)+'초':'수동'} · ×${Number(performanceRuntime.adaptiveMultiplier||1)}</p><div class=\"actions\">",
    "<p>Performance Guard · ${state.performanceGuard===false?'off':performanceRuntime.mode} · 실효 갱신 ${effectiveRefreshMs()?Math.round(effectiveRefreshMs()/1000)+'초':'수동'} · ×${Number(performanceRuntime.adaptiveMultiplier||1)}</p><p>UI Stall Probe · ${performanceRuntime.uiStallProbeActive?'active':'paused'} · ≥50ms ${Number(performanceRuntime.uiStallCount50||0)}회 · ≥100ms ${Number(performanceRuntime.uiStallCount100||0)}회 · ≥200ms ${Number(performanceRuntime.uiStallCount200||0)}회 · max ${roundPerfMs(performanceRuntime.uiStallMaxMs)||0}ms</p><div class=\"actions\">"
)

old_lifecycle = """  function installLifecycle() {\n    const vis=()=>{if(document.visibilityState==='visible'){scheduleRefresh();if(state.syncOnFocus&&state.bridgeEnabled)refresh('visibility',true);}else if(state.backgroundPause!==false&&refreshTimer){clearTimeout(refreshTimer);refreshTimer=null;}};\n    document.addEventListener('visibilitychange',vis); domListeners.push([document,'visibilitychange',vis]);\n  }\n"""
new_lifecycle = """  function installLifecycle() {\n    const vis=()=>{\n      if(document.visibilityState==='visible'){\n        startUiStallProbe();\n        scheduleRefresh();\n        if(state.syncOnFocus&&state.bridgeEnabled)refresh('visibility',true);\n      }else if(state.backgroundPause!==false){\n        stopUiStallProbe();\n        if(refreshTimer){clearTimeout(refreshTimer);refreshTimer=null;}\n      }\n    };\n    document.addEventListener('visibilitychange',vis); domListeners.push([document,'visibilitychange',vis]);\n    startUiStallProbe();\n  }\n"""
replace_once('lifecycle stall probe', old_lifecycle, new_lifecycle)

replace_once(
    'unload stall probe 정리',
    "      if(resetSyncTimer)clearTimeout(resetSyncTimer);\n      for(const [t,ty,id] of remoteListeners.splice(0)){try{await t.removeEventListener(ty,id);}catch(_){}}\n",
    "      if(resetSyncTimer)clearTimeout(resetSyncTimer);\n      stopUiStallProbe();\n      for(const [t,ty,id] of remoteListeners.splice(0)){try{await t.removeEventListener(ty,id);}catch(_){}}\n"
)

widget_start_after = src.index('  function widgetHtml() {')
widget_end_after = src.index('  const widgetWidth = () =>', widget_start_after)
if src[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('3.24는 플로팅 위젯 HTML을 건드리면 안 돼.')

for marker in [
    'UI_STALL_PROBE_INTERVAL_MS = 100',
    'UI_STALL_THRESHOLD_MS = 50',
    'function startUiStallProbe()',
    'function stopUiStallProbe()',
    'UI stall probe:',
    'UI Stall Probe ·',
    "pushPerformanceSample('uiStallSamples', lag)",
]:
    if marker not in src:
        raise SystemExit(f'3.24 marker 누락: {marker}')

path.write_text(src)
