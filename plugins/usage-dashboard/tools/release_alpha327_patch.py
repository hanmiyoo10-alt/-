from pathlib import Path

p = Path('plugins/usage-dashboard/latest.js')
s = p.read_text()

if '//@version 3.0.0-alpha.3.26' not in s or "const VERSION = '3.0.0-alpha.3.26';" not in s:
    raise SystemExit('latest.js is not exact alpha.3.26')

widget_start = s.index('  function widgetHtml() {')
widget_end = s.index('  const widgetWidth = () =>', widget_start)
widget_before = s[widget_start:widget_end]

def one(label, old, new):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: patch anchor count={count}')
    s = s.replace(old, new, 1)

one('meta version', '//@version 3.0.0-alpha.3.26', '//@version 3.0.0-alpha.3.27')
one('runtime version', "const VERSION = '3.0.0-alpha.3.26';", "const VERSION = '3.0.0-alpha.3.27';")

one(
    'scheduler default',
    '    refreshMs: 15000, backgroundPause: true, syncOnFocus: true, performanceGuard: true, adaptiveRefresh: true,\n',
    '    refreshMs: 15000, backgroundPause: true, syncOnFocus: true, performanceGuard: true, adaptiveRefresh: true, schedulerEnabled: true,\n'
)

one(
    'scheduler timers',
    "  let store, state, token = '', refreshTimer = null, resetSyncTimer = null, refreshInFlight = null;\n",
    "  let store, state, token = '', refreshTimer = null, resetSyncTimer = null, refreshInFlight = null;\n  let refreshSchedulerTimer = null, refreshSchedulerIdleHandle = null;\n"
)

one(
    'scheduler runtime counters',
    'resumeMainThreadLagSamples:[],resumeLongTaskSamples:[]};',
    'resumeMainThreadLagSamples:[],resumeLongTaskSamples:[],schedulerQueued:0,schedulerMerged:0,schedulerExecuted:0,schedulerDeferredForInteraction:0};'
)

scheduler = '''  // DevPass 2.7.3 stability scheduler, adapted to the single local snapshot profile.
  const REFRESH_PRIORITY = Object.freeze({
    manual:100,
    connect:95,
    'manual-retry':95,
    reset:85,
    visibility:80,
    init:70,
    timer:30,
    scheduled:25,
  });

  const refreshSchedulerState = {
    pending:null,
    queuedAt:0,
    running:false,
    lastReason:'',
    lastRunAt:null,
    lastCompletedAt:null,
  };

  function cancelRefreshSchedulerTimer() {
    if (refreshSchedulerTimer) clearTimeout(refreshSchedulerTimer);
    refreshSchedulerTimer = null;
    if (refreshSchedulerIdleHandle !== null && typeof window?.cancelIdleCallback === 'function') {
      try { window.cancelIdleCallback(refreshSchedulerIdleHandle); } catch (_) {}
    }
    refreshSchedulerIdleHandle = null;
  }

  function settleSchedulerJob(job, error = null) {
    const waiters = Array.isArray(job?.waiters) ? job.waiters.splice(0) : [];
    for (const waiter of waiters) {
      try { error ? waiter.reject(error) : waiter.resolve(); } catch (_) {}
    }
  }

  function cancelRefreshScheduler() {
    cancelRefreshSchedulerTimer();
    const pending = refreshSchedulerState.pending;
    refreshSchedulerState.pending = null;
    if (pending) settleSchedulerJob(pending);
  }

  function scheduleQueuedRefresh(delay = 0) {
    if (!refreshSchedulerState.pending || refreshSchedulerTimer || refreshSchedulerIdleHandle !== null) return;
    const job = refreshSchedulerState.pending;
    const highPriority = Number(job.priority || 0) >= 80;
    const run = () => {
      refreshSchedulerIdleHandle = null;
      void runQueuedRefresh();
    };
    if (!highPriority && state?.performanceGuard !== false && typeof window?.requestIdleCallback === 'function') {
      refreshSchedulerIdleHandle = window.requestIdleCallback(run, {timeout:Math.max(500, Number(delay) || 900)});
    } else {
      refreshSchedulerTimer = setTimeout(() => {
        refreshSchedulerTimer = null;
        run();
      }, Math.max(0, Number(delay) || 0));
    }
  }

  async function runQueuedRefresh() {
    if (refreshSchedulerState.running || !refreshSchedulerState.pending) return;
    if (refreshInFlight) {
      scheduleQueuedRefresh(180);
      return;
    }

    const job = refreshSchedulerState.pending;
    const now = Date.now();
    const highPriority = Number(job.priority || 0) >= 80;
    if (!highPriority && state?.backgroundPause !== false && document.visibilityState === 'hidden') {
      refreshSchedulerState.pending = null;
      settleSchedulerJob(job);
      return;
    }

    const interacting = now - Number(performanceRuntime.lastInteractionAt || 0) < 700;
    const ageMs = now - Number(refreshSchedulerState.queuedAt || now);
    if (!highPriority && state?.performanceGuard !== false && interacting && ageMs < 2200) {
      performanceRuntime.schedulerDeferredForInteraction += 1;
      scheduleQueuedRefresh(500);
      return;
    }

    refreshSchedulerState.pending = null;
    refreshSchedulerState.running = true;
    refreshSchedulerState.lastReason = job.reason;
    refreshSchedulerState.lastRunAt = Date.now();
    performanceRuntime.schedulerExecuted += 1;
    try {
      await refresh(job.reason, job.silent);
      settleSchedulerJob(job);
    } catch (error) {
      settleSchedulerJob(job, error);
    } finally {
      refreshSchedulerState.running = false;
      refreshSchedulerState.lastCompletedAt = Date.now();
      if (refreshSchedulerState.pending) scheduleQueuedRefresh(0);
    }
  }

  function enqueueRefresh(reason = 'scheduled', silent = false) {
    if (state?.schedulerEnabled === false) return refresh(reason, silent);
    const normalizedReason = String(reason || 'scheduled');
    const priority = REFRESH_PRIORITY[normalizedReason] ?? 50;

    if (refreshInFlight) {
      performanceRuntime.schedulerMerged += 1;
      return refreshInFlight;
    }

    performanceRuntime.schedulerQueued += 1;
    const current = refreshSchedulerState.pending;
    if (current) {
      performanceRuntime.schedulerMerged += 1;
      if (priority >= Number(current.priority || 0)) {
        current.reason = normalizedReason;
        current.priority = priority;
        current.silent = Boolean(silent && current.silent);
      } else {
        current.silent = Boolean(current.silent && silent);
      }
    } else {
      refreshSchedulerState.pending = {
        silent:Boolean(silent),
        reason:normalizedReason,
        priority,
        waiters:[],
      };
      refreshSchedulerState.queuedAt = Date.now();
    }

    const targetJob = refreshSchedulerState.pending;
    const promise = new Promise((resolve, reject) => targetJob.waiters.push({resolve,reject}));
    cancelRefreshSchedulerTimer();
    scheduleQueuedRefresh(priority >= 80 ? 0 : 80);
    return promise;
  }

'''
one('scheduler helper insertion', '  function sourceAgeMs() {', scheduler + '  function sourceAgeMs() {')

one('resume scheduler route', "    refresh('visibility', true);", "    enqueueRefresh('visibility', true);")
one('connect scheduler route', "await persist(); scheduleRefresh(); await refresh('connect');", "await persist(); scheduleRefresh(); await enqueueRefresh('connect');")
one('manual scheduler route', "if (q('#refresh')) q('#refresh').onclick = () => refresh('manual');", "if (q('#refresh')) q('#refresh').onclick = () => enqueueRefresh('manual');")
one('manual retry scheduler route', "      await refresh('manual-retry');", "      await enqueueRefresh('manual-retry');")
one('reset scheduler route', "    await refresh('reset', true);", "    await enqueueRefresh('reset', true);")
one(
    'timer scheduler route',
    "refreshTimer=setTimeout(async()=>{try{await refresh('timer',true);}finally{scheduleRefresh();}},ms);",
    "refreshTimer=setTimeout(async()=>{try{await enqueueRefresh('timer',true);}finally{scheduleRefresh();}},ms);"
)
one(
    'init scheduler route',
    "await renderWidget(); installLifecycle(); scheduleRefresh(); if(state.bridgeEnabled&&token)refresh('init',true);",
    "await renderWidget(); installLifecycle(); scheduleRefresh(); if(state.bridgeEnabled&&token)enqueueRefresh('init',true);"
)

one(
    'scheduler diagnostics text',
    "      `Resume grace: ${performanceRuntime.resumePending ? 'pending' : 'idle'} · delay ${num(performanceRuntime.lastResumeDelayMs) ? `${Number(performanceRuntime.lastResumeDelayMs)}ms` : '—'} · deferred ${Number(performanceRuntime.resumeDeferred || 0)} · coalesced ${Number(performanceRuntime.resumeCoalesced || 0)} · quiet ${RESUME_INTERACTION_QUIET_MS}ms · max ${RESUME_MAX_DEFER_MS}ms`,\n      `Effective refresh: ${effectiveRefreshMs()}ms`,",
    "      `Resume grace: ${performanceRuntime.resumePending ? 'pending' : 'idle'} · delay ${num(performanceRuntime.lastResumeDelayMs) ? `${Number(performanceRuntime.lastResumeDelayMs)}ms` : '—'} · deferred ${Number(performanceRuntime.resumeDeferred || 0)} · coalesced ${Number(performanceRuntime.resumeCoalesced || 0)} · quiet ${RESUME_INTERACTION_QUIET_MS}ms · max ${RESUME_MAX_DEFER_MS}ms`,\n      `Scheduler: pending ${refreshSchedulerState.pending ? 'yes' : 'no'} · running ${refreshSchedulerState.running ? 'yes' : 'no'} · queued ${Number(performanceRuntime.schedulerQueued || 0)} · merged ${Number(performanceRuntime.schedulerMerged || 0)} · executed ${Number(performanceRuntime.schedulerExecuted || 0)} · interaction defer ${Number(performanceRuntime.schedulerDeferredForInteraction || 0)} · last ${refreshSchedulerState.lastReason || '—'}`,\n      `Effective refresh: ${effectiveRefreshMs()}ms`,"
)

one(
    'runtime scheduler ui',
    "<p>Resume Grace · ${performanceRuntime.resumePending?'pending':'idle'} · delay ${num(performanceRuntime.lastResumeDelayMs)?Number(performanceRuntime.lastResumeDelayMs)+'ms':'—'} · deferred ${Number(performanceRuntime.resumeDeferred||0)}회 · coalesced ${Number(performanceRuntime.resumeCoalesced||0)}회</p><div class=\"actions\"><button id=\"copy-diag\">진단 복사</button><button id=\"export-json\">JSON 내보내기</button></div></section>",
    "<p>Resume Grace · ${performanceRuntime.resumePending?'pending':'idle'} · delay ${num(performanceRuntime.lastResumeDelayMs)?Number(performanceRuntime.lastResumeDelayMs)+'ms':'—'} · deferred ${Number(performanceRuntime.resumeDeferred||0)}회 · coalesced ${Number(performanceRuntime.resumeCoalesced||0)}회</p><p>Scheduler · ${refreshSchedulerState.pending?'pending':(refreshSchedulerState.running?'running':'idle')} · queued ${Number(performanceRuntime.schedulerQueued||0)} · merged ${Number(performanceRuntime.schedulerMerged||0)} · executed ${Number(performanceRuntime.schedulerExecuted||0)} · interaction defer ${Number(performanceRuntime.schedulerDeferredForInteraction||0)}</p><div class=\"actions\"><button id=\"copy-diag\">진단 복사</button><button id=\"export-json\">JSON 내보내기</button></div></section>"
)

one(
    'unload scheduler cleanup',
    "      if(resetSyncTimer)clearTimeout(resetSyncTimer);\n      cancelResumeRefresh();",
    "      if(resetSyncTimer)clearTimeout(resetSyncTimer);\n      cancelRefreshScheduler();\n      cancelResumeRefresh();"
)

widget_start_after = s.index('  function widgetHtml() {')
widget_end_after = s.index('  const widgetWidth = () =>', widget_start_after)
if s[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('3.27 must not change floating widget HTML')

for marker in [
    '//@version 3.0.0-alpha.3.27',
    "const VERSION = '3.0.0-alpha.3.27';",
    'schedulerEnabled: true',
    'const REFRESH_PRIORITY = Object.freeze',
    'function enqueueRefresh',
    'function runQueuedRefresh',
    'schedulerQueued:0',
    'schedulerMerged:0',
    'schedulerExecuted:0',
    'schedulerDeferredForInteraction:0',
    'Scheduler: pending',
    'Scheduler ·',
    "enqueueRefresh('timer',true)",
    "enqueueRefresh('visibility', true)",
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
