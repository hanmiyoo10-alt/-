from pathlib import Path

path = Path('plugins/usage-dashboard/latest.js')
src = path.read_text()

if '//@version 3.0.0-alpha.3.22' not in src or "const VERSION = '3.0.0-alpha.3.22';" not in src:
    raise SystemExit('latest.js가 정확한 alpha.3.22가 아니야.')

widget_start = src.index('  function widgetHtml() {')
widget_end = src.index('  const widgetWidth = () =>', widget_start)
widget_before = src[widget_start:widget_end]

def replace_once(label, old, new):
    global src
    if old not in src:
        raise SystemExit(f'{label} 패치 지점을 찾지 못했어.')
    src = src.replace(old, new, 1)

replace_once('메타 버전', '//@version 3.0.0-alpha.3.22', '//@version 3.0.0-alpha.3.23')
replace_once('런타임 버전', "const VERSION = '3.0.0-alpha.3.22';", "const VERSION = '3.0.0-alpha.3.23';")

old_runtime = "  const performanceRuntime = {adaptiveMultiplier:1,slowRefreshes:0,fastRefreshes:0,mode:'normal'};\n"
new_runtime = "  const performanceRuntime = {adaptiveMultiplier:1,slowRefreshes:0,fastRefreshes:0,mode:'normal',timerSamples:0,ignoredSamples:0,lastSampleReason:'',lastSampleDurationMs:null};\n"
replace_once('성능 런타임 확장', old_runtime, new_runtime)

old_helper = '''  function noteRefreshPerformance(durationMs) {\n    const duration = Math.max(0, Number(durationMs) || 0);\n    if (state.performanceGuard === false || state.adaptiveRefresh === false) {\n      performanceRuntime.adaptiveMultiplier = 1;\n      performanceRuntime.mode = 'normal';\n      performanceRuntime.slowRefreshes = 0;\n      performanceRuntime.fastRefreshes = 0;\n      return;\n    }\n    if (duration >= 3000) {\n      performanceRuntime.slowRefreshes += 1;\n      performanceRuntime.fastRefreshes = 0;\n      performanceRuntime.adaptiveMultiplier = Math.max(performanceRuntime.adaptiveMultiplier, 4);\n    } else if (duration >= 1200) {\n      performanceRuntime.slowRefreshes += 1;\n      performanceRuntime.fastRefreshes = 0;\n      performanceRuntime.adaptiveMultiplier = Math.max(performanceRuntime.adaptiveMultiplier, 2);\n    } else {\n      performanceRuntime.fastRefreshes += 1;\n      if (performanceRuntime.fastRefreshes >= 3) {\n        performanceRuntime.adaptiveMultiplier = Math.max(1, performanceRuntime.adaptiveMultiplier / 2);\n        performanceRuntime.fastRefreshes = 0;\n        if (performanceRuntime.adaptiveMultiplier <= 1) performanceRuntime.slowRefreshes = 0;\n      }\n    }\n    performanceRuntime.mode = performanceRuntime.adaptiveMultiplier > 1 ? 'guard' : 'normal';\n  }\n'''
new_helper = '''  function noteRefreshPerformance(durationMs, reason = '') {\n    const duration = Math.max(0, Number(durationMs) || 0);\n    const sampleReason = String(reason || '');\n    performanceRuntime.lastSampleReason = sampleReason;\n    performanceRuntime.lastSampleDurationMs = duration;\n    if (state.performanceGuard === false || state.adaptiveRefresh === false) {\n      performanceRuntime.adaptiveMultiplier = 1;\n      performanceRuntime.mode = 'normal';\n      performanceRuntime.slowRefreshes = 0;\n      performanceRuntime.fastRefreshes = 0;\n      return;\n    }\n\n    // Startup/focus/manual/reset work can be naturally slower. Only periodic timer\n    // samples are allowed to change the adaptive refresh interval.\n    if (sampleReason !== 'timer') {\n      performanceRuntime.ignoredSamples += 1;\n      return;\n    }\n\n    performanceRuntime.timerSamples += 1;\n    if (duration >= 1200) {\n      performanceRuntime.slowRefreshes += 1;\n      performanceRuntime.fastRefreshes = 0;\n\n      // A single slow sample never changes cadence. Two consecutive slow timer\n      // samples first move x1 -> x2. Reaching x4 requires continued severe\n      // (>=3s) timer slowness while already guarded.\n      if (performanceRuntime.slowRefreshes >= 2) {\n        if (performanceRuntime.adaptiveMultiplier <= 1) {\n          performanceRuntime.adaptiveMultiplier = 2;\n        } else if (duration >= 3000) {\n          performanceRuntime.adaptiveMultiplier = Math.min(4, performanceRuntime.adaptiveMultiplier * 2);\n        }\n        performanceRuntime.slowRefreshes = 0;\n      }\n    } else {\n      performanceRuntime.slowRefreshes = 0;\n      performanceRuntime.fastRefreshes += 1;\n\n      // Recover promptly: each healthy periodic sample removes one guard tier.\n      if (performanceRuntime.adaptiveMultiplier > 1) {\n        performanceRuntime.adaptiveMultiplier = Math.max(1, performanceRuntime.adaptiveMultiplier / 2);\n      }\n      if (performanceRuntime.adaptiveMultiplier <= 1 && performanceRuntime.fastRefreshes >= 2) {\n        performanceRuntime.fastRefreshes = 0;\n      }\n    }\n    performanceRuntime.mode = performanceRuntime.adaptiveMultiplier > 1 ? 'guard' : 'normal';\n  }\n'''
replace_once('timer-only 성능 판정', old_helper, new_helper)

replace_once(
    'refresh reason 전달',
    '        noteRefreshPerformance(state.lastSyncDurationMs);\n',
    '        noteRefreshPerformance(state.lastSyncDurationMs, reason);\n'
)

replace_once(
    '진단 guard 상세',
    "      `Performance guard: ${state.performanceGuard === false ? 'off' : performanceRuntime.mode} · x${Number(performanceRuntime.adaptiveMultiplier || 1)}`,\n      `Effective refresh: ${effectiveRefreshMs()}ms`,\n",
    "      `Performance guard: ${state.performanceGuard === false ? 'off' : performanceRuntime.mode} · x${Number(performanceRuntime.adaptiveMultiplier || 1)} · timer-only`,\n      `Guard samples: timer ${Number(performanceRuntime.timerSamples || 0)} · ignored ${Number(performanceRuntime.ignoredSamples || 0)} · slow streak ${Number(performanceRuntime.slowRefreshes || 0)}`,\n      `Effective refresh: ${effectiveRefreshMs()}ms`,\n"
)

replace_once(
    'Runtime Diagnostics guard 상세',
    "<p>Updater · GitHub HTTPS · ${VERSION}</p><p>Performance Guard · ${state.performanceGuard===false?'off':performanceRuntime.mode} · 실효 갱신 ${effectiveRefreshMs()?Math.round(effectiveRefreshMs()/1000)+'초':'수동'} · ×${Number(performanceRuntime.adaptiveMultiplier||1)}</p><div class=\"actions\">",
    "<p>Updater · GitHub HTTPS · ${VERSION}</p><p>Performance Guard · ${state.performanceGuard===false?'off':performanceRuntime.mode} · 실효 갱신 ${effectiveRefreshMs()?Math.round(effectiveRefreshMs()/1000)+'초':'수동'} · ×${Number(performanceRuntime.adaptiveMultiplier||1)} · timer-only</p><div class=\"actions\">"
)

widget_start_after = src.index('  function widgetHtml() {')
widget_end_after = src.index('  const widgetWidth = () =>', widget_start_after)
if src[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('3.23은 플로팅 위젯 HTML을 건드리면 안 돼.')

path.write_text(src)
