from pathlib import Path

path = Path('plugins/usage-dashboard/latest.js')
src = path.read_text()

if '//@version 3.0.0-alpha.3.21' not in src or "const VERSION = '3.0.0-alpha.3.21';" not in src:
    raise SystemExit('latest.js가 정확한 alpha.3.21이 아니야.')

widget_start = src.index('  function widgetHtml() {')
widget_end = src.index('  const widgetWidth = () =>', widget_start)
widget_before = src[widget_start:widget_end]

def replace_once(label, old, new):
    global src
    if old not in src:
        raise SystemExit(f'{label} 패치 지점을 찾지 못했어.')
    src = src.replace(old, new, 1)

replace_once('메타 버전', '//@version 3.0.0-alpha.3.21', '//@version 3.0.0-alpha.3.22')
replace_once('런타임 버전', "const VERSION = '3.0.0-alpha.3.21';", "const VERSION = '3.0.0-alpha.3.22';")

replace_once(
    '성능 보호 기본값',
    '    refreshMs: 15000, backgroundPause: true, syncOnFocus: true,\n',
    '    refreshMs: 15000, backgroundPause: true, syncOnFocus: true, performanceGuard: true, adaptiveRefresh: true,\n'
)

replace_once(
    '성능 런타임 상태',
    '  let widget = null, rootBody = null, drag = null;\n  const uiParts = [], remoteListeners = [], domListeners = [];\n',
    "  let widget = null, rootBody = null, drag = null;\n  const performanceRuntime = {adaptiveMultiplier:1,slowRefreshes:0,fastRefreshes:0,mode:'normal'};\n  const uiParts = [], remoteListeners = [], domListeners = [];\n"
)

perf_helpers = '''  function noteRefreshPerformance(durationMs) {\n    const duration = Math.max(0, Number(durationMs) || 0);\n    if (state.performanceGuard === false || state.adaptiveRefresh === false) {\n      performanceRuntime.adaptiveMultiplier = 1;\n      performanceRuntime.mode = 'normal';\n      performanceRuntime.slowRefreshes = 0;\n      performanceRuntime.fastRefreshes = 0;\n      return;\n    }\n    if (duration >= 3000) {\n      performanceRuntime.slowRefreshes += 1;\n      performanceRuntime.fastRefreshes = 0;\n      performanceRuntime.adaptiveMultiplier = Math.max(performanceRuntime.adaptiveMultiplier, 4);\n    } else if (duration >= 1200) {\n      performanceRuntime.slowRefreshes += 1;\n      performanceRuntime.fastRefreshes = 0;\n      performanceRuntime.adaptiveMultiplier = Math.max(performanceRuntime.adaptiveMultiplier, 2);\n    } else {\n      performanceRuntime.fastRefreshes += 1;\n      if (performanceRuntime.fastRefreshes >= 3) {\n        performanceRuntime.adaptiveMultiplier = Math.max(1, performanceRuntime.adaptiveMultiplier / 2);\n        performanceRuntime.fastRefreshes = 0;\n        if (performanceRuntime.adaptiveMultiplier <= 1) performanceRuntime.slowRefreshes = 0;\n      }\n    }\n    performanceRuntime.mode = performanceRuntime.adaptiveMultiplier > 1 ? 'guard' : 'normal';\n  }\n\n  function effectiveRefreshMs() {\n    const base = Math.max(0, Number(state.refreshMs) || 0);\n    if (!base) return 0;\n    if (state.performanceGuard === false || state.adaptiveRefresh === false) return base;\n    const multiplier = Math.max(1, Number(performanceRuntime.adaptiveMultiplier) || 1);\n    return Math.min(5 * 60_000, Math.max(base, Math.round(base * multiplier)));\n  }\n\n'''
replace_once('성능 helper 삽입', '  function sourceAgeMs() {', perf_helpers + '  function sourceAgeMs() {')

replace_once(
    '성공 refresh 성능 기록',
    '        state.lastSyncDurationMs = state.lastSyncAt - started;\n        state.lastRefreshReason = reason;\n',
    '        state.lastSyncDurationMs = state.lastSyncAt - started;\n        noteRefreshPerformance(state.lastSyncDurationMs);\n        state.lastRefreshReason = reason;\n'
)

old_schedule = '''  function scheduleRefresh() {\n    if (refreshTimer) clearTimeout(refreshTimer); refreshTimer=null;\n    scheduleResetSync();\n    const baseMs=Math.max(0,Number(state.refreshMs)||0);\n    if (!baseMs||!state.bridgeEnabled||(state.backgroundPause!==false&&document.visibilityState==='hidden')) return;\n    const ms = state.bridgeStatus === 'error' && Number(state.consecutiveFailures||0) > 0\n      ? Math.max(baseMs, Number(state.retryDelayMs)||baseMs)\n      : baseMs;\n    if (state.bridgeStatus === 'error') state.nextRetryAt = Date.now() + ms;\n    refreshTimer=setTimeout(async()=>{try{await refresh('timer',true);}finally{scheduleRefresh();}},ms);\n  }\n'''
new_schedule = '''  function scheduleRefresh() {\n    if (refreshTimer) clearTimeout(refreshTimer); refreshTimer=null;\n    scheduleResetSync();\n    const baseMs=Math.max(0,Number(state.refreshMs)||0);\n    if (!baseMs||!state.bridgeEnabled||(state.backgroundPause!==false&&document.visibilityState==='hidden')) return;\n    const adaptiveMs=effectiveRefreshMs();\n    const ms = state.bridgeStatus === 'error' && Number(state.consecutiveFailures||0) > 0\n      ? Math.max(adaptiveMs, Number(state.retryDelayMs)||adaptiveMs)\n      : adaptiveMs;\n    if (state.bridgeStatus === 'error') state.nextRetryAt = Date.now() + ms;\n    refreshTimer=setTimeout(async()=>{try{await refresh('timer',true);}finally{scheduleRefresh();}},ms);\n  }\n'''
replace_once('적응형 scheduler', old_schedule, new_schedule)

replace_once(
    '진단 텍스트 성능 정보',
    '      `Success count: ${Number(state.refreshCount || 0)}`,\n      `Data age: ${state.data?.fetchedAt ? age(state.data.fetchedAt) : \'—\'}`,\n',
    "      `Success count: ${Number(state.refreshCount || 0)}`,\n      `Performance guard: ${state.performanceGuard === false ? 'off' : performanceRuntime.mode} · x${Number(performanceRuntime.adaptiveMultiplier || 1)}`,\n      `Effective refresh: ${effectiveRefreshMs()}ms`,\n      `Data age: ${state.data?.fetchedAt ? age(state.data.fetchedAt) : '—'}`,\n"
)

replace_once(
    'Runtime Diagnostics 성능 표시',
    '<p>Updater · GitHub HTTPS · ${VERSION}</p><div class="actions">',
    '<p>Updater · GitHub HTTPS · ${VERSION}</p><p>Performance Guard · ${state.performanceGuard===false?\'off\':performanceRuntime.mode} · 실효 갱신 ${effectiveRefreshMs()?Math.round(effectiveRefreshMs()/1000)+\'초\':\'수동\'} · ×${Number(performanceRuntime.adaptiveMultiplier||1)}</p><div class="actions">'
)

widget_start_after = src.index('  function widgetHtml() {')
widget_end_after = src.index('  const widgetWidth = () =>', widget_start_after)
if src[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('3.22는 플로팅 위젯 HTML을 건드리면 안 돼.')

path.write_text(src)
