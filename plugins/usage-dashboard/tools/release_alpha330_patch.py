from pathlib import Path

p = Path('plugins/usage-dashboard/latest.js')
s = p.read_text()

if '//@version 3.0.0-alpha.3.29' not in s or "const VERSION = '3.0.0-alpha.3.29';" not in s:
    raise SystemExit('latest.js is not exact alpha.3.29')

widget_start = s.index('  function widgetHtml() {')
widget_end = s.index('  const widgetWidth = () =>', widget_start)
widget_before = s[widget_start:widget_end]

def one(label, old, new):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: patch anchor count={count}')
    s = s.replace(old, new, 1)

one('meta version', '//@version 3.0.0-alpha.3.29', '//@version 3.0.0-alpha.3.30')
one('runtime version', "const VERSION = '3.0.0-alpha.3.29';", "const VERSION = '3.0.0-alpha.3.30';")

one(
    'resume input runtime fields',
    "resumePending:false,resumeStartedAt:0,lastResumeDelayMs:null,resumeMeasurePending:false,resumeVisiblePerf:0,lastResumeVisibleAt:null,lastResumeReason:'',lastResumeMainThreadLagMs:null",
    "resumePending:false,resumeStartedAt:0,lastResumeDelayMs:null,resumeMeasurePending:false,resumeInputCaptured:false,resumeVisiblePerf:0,lastResumeVisibleAt:null,lastResumeReason:'',lastResumeFirstInputAfterMs:null,lastResumeInputDelayMs:null,lastResumeFrameDelayMs:null,lastResumeInputDuringRefresh:false,lastResumeMainThreadLagMs:null"
)
one(
    'resume input sample arrays',
    'resumeLongTaskCount:0,resumeMainThreadLagSamples:[],resumeLongTaskSamples:[]',
    'resumeLongTaskCount:0,resumeInputDelaySamples:[],resumeFrameDelaySamples:[],resumeMainThreadLagSamples:[],resumeLongTaskSamples:[]'
)

one(
    'resume input reset',
    "    performanceRuntime.resumeMeasurePending = true;\n    performanceRuntime.resumeVisiblePerf = typeof performance?.now === 'function' ? performance.now() : 0;\n    performanceRuntime.lastResumeVisibleAt = Date.now();\n    performanceRuntime.lastResumeMainThreadLagMs = null;",
    "    performanceRuntime.resumeMeasurePending = true;\n    performanceRuntime.resumeInputCaptured = false;\n    performanceRuntime.resumeVisiblePerf = typeof performance?.now === 'function' ? performance.now() : 0;\n    performanceRuntime.lastResumeVisibleAt = Date.now();\n    performanceRuntime.lastResumeFirstInputAfterMs = null;\n    performanceRuntime.lastResumeInputDelayMs = null;\n    performanceRuntime.lastResumeFrameDelayMs = null;\n    performanceRuntime.lastResumeInputDuringRefresh = false;\n    performanceRuntime.lastResumeMainThreadLagMs = null;"
)

interaction_helper = '''  // DevPass 2.7.3 resume interaction probe: capture only the first user input
  // inside the 10-second resume diagnostic window. This is measurement-only.
  function markPerformanceInteraction(event) {
    performanceRuntime.lastInteractionAt = Date.now();
    if (!performanceRuntime.resumeMeasurePending || performanceRuntime.resumeInputCaptured) return;
    const nowPerf = typeof performance?.now === 'function' ? performance.now() : 0;
    const visiblePerf = Number(performanceRuntime.resumeVisiblePerf || 0);
    const afterResume = visiblePerf > 0 ? Math.max(0, nowPerf - visiblePerf) : null;
    if (!Number.isFinite(afterResume) || afterResume > RESUME_DIAGNOSTIC_WINDOW_MS) {
      performanceRuntime.resumeMeasurePending = false;
      return;
    }

    performanceRuntime.resumeInputCaptured = true;
    performanceRuntime.lastResumeFirstInputAfterMs = roundPerfMs(afterResume);
    performanceRuntime.lastResumeInputDuringRefresh = Boolean(refreshInFlight);

    const eventTs = Number(event?.timeStamp);
    if (Number.isFinite(eventTs) && eventTs >= 0 && nowPerf > 0) {
      const inputDelay = nowPerf - eventTs;
      if (inputDelay >= 0 && inputDelay <= 5000) {
        performanceRuntime.lastResumeInputDelayMs = roundPerfMs(inputDelay);
        pushPerformanceSample('resumeInputDelaySamples', inputDelay);
      }
    }

    if (typeof window?.requestAnimationFrame === 'function' && nowPerf > 0) {
      const handledAt = nowPerf;
      window.requestAnimationFrame(() => {
        const frameNow = typeof performance?.now === 'function' ? performance.now() : handledAt;
        const frameDelay = Math.max(0, frameNow - handledAt);
        performanceRuntime.lastResumeFrameDelayMs = roundPerfMs(frameDelay);
        pushPerformanceSample('resumeFrameDelaySamples', frameDelay);
      });
    }
  }

'''
one('resume input helper insertion', '  function cancelResumeRefresh() {', interaction_helper + '  function cancelResumeRefresh() {')

one(
    'resume input listener route',
    "    for (const type of ['pointerdown','touchstart','wheel','keydown']) {\n      const interaction = () => { performanceRuntime.lastInteractionAt = Date.now(); };\n      document.addEventListener(type, interaction, {passive:true});\n      domListeners.push([document,type,interaction]);\n    }",
    "    for (const type of ['pointerdown','touchstart','wheel','keydown']) {\n      const interaction = event => markPerformanceInteraction(event);\n      document.addEventListener(type, interaction, {passive:true});\n      domListeners.push([document,type,interaction]);\n    }"
)

one(
    'resume input diagnostics text',
    "      `Resume probe: events ${Number(performanceRuntime.resumeEvents || 0)} · reason ${performanceRuntime.lastResumeReason || '—'} · main-thread lag ${num(performanceRuntime.lastResumeMainThreadLagMs) ? `${roundPerfMs(performanceRuntime.lastResumeMainThreadLagMs)}ms` : '—'} · after ${num(performanceRuntime.lastResumeProbeAfterMs) ? `${roundPerfMs(performanceRuntime.lastResumeProbeAfterMs)}ms` : '—'} · refresh overlap ${performanceRuntime.lastResumeProbeDuringRefresh ? 'yes' : 'no'}`,\n      `Resume long task:",
    "      `Resume probe: events ${Number(performanceRuntime.resumeEvents || 0)} · reason ${performanceRuntime.lastResumeReason || '—'} · main-thread lag ${num(performanceRuntime.lastResumeMainThreadLagMs) ? `${roundPerfMs(performanceRuntime.lastResumeMainThreadLagMs)}ms` : '—'} · after ${num(performanceRuntime.lastResumeProbeAfterMs) ? `${roundPerfMs(performanceRuntime.lastResumeProbeAfterMs)}ms` : '—'} · refresh overlap ${performanceRuntime.lastResumeProbeDuringRefresh ? 'yes' : 'no'}`,\n      `Resume input: first ${num(performanceRuntime.lastResumeFirstInputAfterMs) ? `${roundPerfMs(performanceRuntime.lastResumeFirstInputAfterMs)}ms` : '—'} · event delay ${num(performanceRuntime.lastResumeInputDelayMs) ? `${roundPerfMs(performanceRuntime.lastResumeInputDelayMs)}ms` : '—'} · frame ${num(performanceRuntime.lastResumeFrameDelayMs) ? `${roundPerfMs(performanceRuntime.lastResumeFrameDelayMs)}ms` : '—'} · refresh overlap ${performanceRuntime.lastResumeInputDuringRefresh ? 'yes' : 'no'}`,\n      `Resume long task:"
)

one(
    'runtime resume input ui',
    "<p>Resume Diagnostics · ${Number(performanceRuntime.resumeEvents||0)}회 · ${performanceRuntime.lastResumeReason||'대기'} · main-thread ${num(performanceRuntime.lastResumeMainThreadLagMs)?roundPerfMs(performanceRuntime.lastResumeMainThreadLagMs)+'ms':'—'} · Long Task ${performanceRuntime.longTaskSupported?(Number(performanceRuntime.resumeLongTaskCount||0)+'회'):'미지원'}</p><p>Resume Grace ·",
    "<p>Resume Diagnostics · ${Number(performanceRuntime.resumeEvents||0)}회 · ${performanceRuntime.lastResumeReason||'대기'} · main-thread ${num(performanceRuntime.lastResumeMainThreadLagMs)?roundPerfMs(performanceRuntime.lastResumeMainThreadLagMs)+'ms':'—'} · Long Task ${performanceRuntime.longTaskSupported?(Number(performanceRuntime.resumeLongTaskCount||0)+'회'):'미지원'}</p><p>Resume Input · first ${num(performanceRuntime.lastResumeFirstInputAfterMs)?roundPerfMs(performanceRuntime.lastResumeFirstInputAfterMs)+'ms':'—'} · event delay ${num(performanceRuntime.lastResumeInputDelayMs)?roundPerfMs(performanceRuntime.lastResumeInputDelayMs)+'ms':'—'} · frame ${num(performanceRuntime.lastResumeFrameDelayMs)?roundPerfMs(performanceRuntime.lastResumeFrameDelayMs)+'ms':'—'} · refresh overlap ${performanceRuntime.lastResumeInputDuringRefresh?'yes':'no'}</p><p>Resume Grace ·"
)

widget_start_after = s.index('  function widgetHtml() {')
widget_end_after = s.index('  const widgetWidth = () =>', widget_start_after)
if s[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('3.30 must not change floating widget HTML')

for marker in [
    '//@version 3.0.0-alpha.3.30',
    "const VERSION = '3.0.0-alpha.3.30';",
    'resumeInputCaptured:false',
    'lastResumeFirstInputAfterMs:null',
    'lastResumeInputDelayMs:null',
    'lastResumeFrameDelayMs:null',
    'lastResumeInputDuringRefresh:false',
    'resumeInputDelaySamples:[]',
    'resumeFrameDelaySamples:[]',
    'function markPerformanceInteraction',
    'Resume input:',
    'Resume Input ·',
    "event => markPerformanceInteraction(event)",
    'Panel render scheduler:',
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

p.write_text(s)
