//@name local_usage_dashboard_modular
//@display-name Local Usage Dashboard
//@version 3.0.0-alpha.3.31
//@api 3.0
//@update-url https://raw.githubusercontent.com/hanmiyoo10-alt/-/main/plugins/usage-dashboard/latest.js

(async () => {
  'use strict';

  const VERSION = '3.0.0-alpha.3.31';
  const UPDATE_URL = 'https://raw.githubusercontent.com/hanmiyoo10-alt/-/main/plugins/usage-dashboard/latest.js';
  const STATE_KEY = 'local-usage-dashboard-v3';
  const TOKEN_KEY = 'local-usage-dashboard-bridge-token-v1';
  const LEGACY_DEVPASS_STATE_KEY = 'llmgateway-devpass-direct-v1';
  const KST_TIME_ZONE = 'Asia/Seoul';
  const UI_STALL_PROBE_INTERVAL_MS = 100;
  const UI_STALL_THRESHOLD_MS = 50;
  const RENDER_SPIKE_THRESHOLD_MS = 50;
  const RESUME_GRACE_MS = 1200;
  const RESUME_INTERACTION_QUIET_MS = 900;
  const RESUME_MAX_DEFER_MS = 4500;
  const RESUME_DIAGNOSTIC_WINDOW_MS = 10000;
  const RESUME_MAIN_THREAD_PROBE_MS = 80;
  const DEFAULT_BRIDGE = 'http://127.0.0.1:39117';
  const DEFAULTS = {
    bridgeBase: DEFAULT_BRIDGE, bridgeEnabled: false, bridgeStatus: 'off', bridgeError: '',
    refreshMs: 15000, backgroundPause: true, syncOnFocus: true, performanceGuard: true, adaptiveRefresh: true, schedulerEnabled: true,
    staleAfterMs: 0, stalePolicyV37Migrated: false,
    widgetVisible: true, widgetMode: 'compact', widgetX: null, widgetY: null,
    usageScopeView: 'all',
    analyticsScopeView: 'all',
    lastSyncAt: null, lastSyncDurationMs: null, lastRefreshReason: '', refreshCount: 0,
    consecutiveFailures: 0, retryDelayMs: 0, nextRetryAt: null,
    dailyUsage: null, creditDailyUsage: null,
    data: null
  };

  let store, state, token = '', refreshTimer = null, resetSyncTimer = null, refreshInFlight = null;
  let refreshSchedulerTimer = null, refreshSchedulerIdleHandle = null;
  let panelRenderTimer = null, panelIdleHandle = null;
  let uiStallProbeTimer = null, resumeProbeTimer = null, resumeMeasureTimer = null, resumeRefreshTimer = null, resumeLongTaskObserver = null;
  let widget = null, rootBody = null, drag = null;
  const performanceRuntime = {adaptiveMultiplier:1,slowRefreshes:0,fastRefreshes:0,mode:'normal',timerSamples:0,ignoredSamples:0,lastSampleReason:'',lastSampleDurationMs:null,activeRefreshStartedPerf:0,lastRefreshStartedPerf:0,lastRefreshEndedPerf:0,uiStallCount50:0,uiStallCount100:0,uiStallCount200:0,uiStallMaxMs:0,uiStallSamples:[],lastUiStallMs:null,lastUiStallAt:null,lastUiStallRefreshOverlap:false,uiStallProbeActive:false,lastInteractionAt:0,resumeEvents:0,resumeCoalesced:0,resumeDeferred:0,resumePending:false,resumeStartedAt:0,lastResumeDelayMs:null,resumeMeasurePending:false,resumeInputCaptured:false,resumeVisiblePerf:0,lastResumeVisibleAt:null,lastResumeReason:'',lastResumeFirstInputAfterMs:null,lastResumeInputDelayMs:null,lastResumeFrameDelayMs:null,lastResumeInputDuringRefresh:false,lastResumeMainThreadLagMs:null,lastResumeProbeAfterMs:null,lastResumeProbeDuringRefresh:false,longTaskSupported:false,lastResumeLongTaskMs:null,lastResumeLongTaskStartedAfterMs:null,lastResumeLongTaskDuringRefresh:false,resumeLongTaskCount:0,resumeInputDelaySamples:[],resumeFrameDelaySamples:[],resumeMainThreadLagSamples:[],resumeLongTaskSamples:[],schedulerQueued:0,schedulerMerged:0,schedulerExecuted:0,schedulerDeferredForInteraction:0,panelRenderCoalesced:0,lastRenderMs:null,lastPanelRenderMs:null,lastRenderReason:'',lastRenderStartedPerf:0,lastRenderEndedPerf:0,activeRenderStartedPerf:0,activeRenderReason:'',lastRenderBreakdown:null,renderSpikeCount:0,renderSpikeSamples:[],lastRenderSpikeMs:null,lastRenderSpikeAt:null,lastRenderSpikeReason:'',lastRenderSpikeRefreshOverlap:false,lastRenderSpikeBreakdown:null};
  const uiParts = [], remoteListeners = [], domListeners = [];

  const num = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
  const money = (v, d = 2) => num(v) ? `$${Number(v).toFixed(d)}` : '—';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const pct = v => Number.isFinite(Number(v)) ? Math.max(0, Math.min(100, Number(v))) : 0;

  function age(ts) {
    if (!num(ts)) return '대기';
    const s = Math.max(0, Math.floor((Date.now() - Number(ts)) / 1000));
    if (s < 5) return '방금';
    if (s < 60) return `${s}초 전`;
    const m = Math.floor(s / 60);
    return m < 60 ? `${m}분 전` : `${Math.floor(m / 60)}시간 전`;
  }

  function noteRefreshPerformance(durationMs, reason = '') {
    const duration = Math.max(0, Number(durationMs) || 0);
    const sampleReason = String(reason || '');
    performanceRuntime.lastSampleReason = sampleReason;
    performanceRuntime.lastSampleDurationMs = duration;
    if (state.performanceGuard === false || state.adaptiveRefresh === false) {
      performanceRuntime.adaptiveMultiplier = 1;
      performanceRuntime.mode = 'normal';
      performanceRuntime.slowRefreshes = 0;
      performanceRuntime.fastRefreshes = 0;
      return;
    }

    // Startup/focus/manual/reset work can be naturally slower. Only periodic timer
    // samples are allowed to change the adaptive refresh interval.
    if (sampleReason !== 'timer') {
      performanceRuntime.ignoredSamples += 1;
      return;
    }

    performanceRuntime.timerSamples += 1;
    if (duration >= 1200) {
      performanceRuntime.slowRefreshes += 1;
      performanceRuntime.fastRefreshes = 0;

      // A single slow sample never changes cadence. Two consecutive slow timer
      // samples first move x1 -> x2. Reaching x4 requires continued severe
      // (>=3s) timer slowness while already guarded.
      if (performanceRuntime.slowRefreshes >= 2) {
        if (performanceRuntime.adaptiveMultiplier <= 1) {
          performanceRuntime.adaptiveMultiplier = 2;
        } else if (duration >= 3000) {
          performanceRuntime.adaptiveMultiplier = Math.min(4, performanceRuntime.adaptiveMultiplier * 2);
        }
        performanceRuntime.slowRefreshes = 0;
      }
    } else {
      performanceRuntime.slowRefreshes = 0;
      performanceRuntime.fastRefreshes += 1;

      // Recover promptly: each healthy periodic sample removes one guard tier.
      if (performanceRuntime.adaptiveMultiplier > 1) {
        performanceRuntime.adaptiveMultiplier = Math.max(1, performanceRuntime.adaptiveMultiplier / 2);
      }
      if (performanceRuntime.adaptiveMultiplier <= 1 && performanceRuntime.fastRefreshes >= 2) {
        performanceRuntime.fastRefreshes = 0;
      }
    }
    performanceRuntime.mode = performanceRuntime.adaptiveMultiplier > 1 ? 'guard' : 'normal';
  }

  function effectiveRefreshMs() {
    const base = Math.max(0, Number(state.refreshMs) || 0);
    if (!base) return 0;
    if (state.performanceGuard === false || state.adaptiveRefresh === false) return base;
    const multiplier = Math.max(1, Number(performanceRuntime.adaptiveMultiplier) || 1);
    return Math.min(5 * 60_000, Math.max(base, Math.round(base * multiplier)));
  }

  function pushPerformanceSample(key, value, limit = 12) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return;
    const list = Array.isArray(performanceRuntime[key]) ? performanceRuntime[key] : [];
    list.push(Math.round(n * 10) / 10);
    while (list.length > limit) list.shift();
    performanceRuntime[key] = list;
  }

  function roundPerfMs(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.round(n * 10) / 10) : null;
  }

  function refreshOverlapsPerfWindow(startPerf, endPerf) {
    const start = Number(startPerf);
    const end = Number(endPerf);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return false;
    const activeStart = Number(performanceRuntime.activeRefreshStartedPerf || 0);
    if (refreshInFlight && activeStart > 0 && activeStart <= end) return true;
    const lastStart = Number(performanceRuntime.lastRefreshStartedPerf || 0);
    const lastEnd = Number(performanceRuntime.lastRefreshEndedPerf || 0);
    return lastStart > 0 && lastEnd >= start && lastStart <= end;
  }

  function renderBreakdownText(value) {
    if (!value || typeof value !== 'object') return '—';
    return Object.entries(value)
      .filter(([, ms]) => num(ms))
      .map(([key, ms]) => `${key} ${roundPerfMs(ms)}ms`)
      .join(' · ') || '—';
  }

  function noteRenderSpike(durationMs, reason, startPerf, endPerf, breakdown = null) {
    const duration = roundPerfMs(durationMs);
    if (!Number.isFinite(duration) || duration < RENDER_SPIKE_THRESHOLD_MS) return;
    performanceRuntime.renderSpikeCount += 1;
    performanceRuntime.lastRenderSpikeMs = duration;
    performanceRuntime.lastRenderSpikeAt = Date.now();
    performanceRuntime.lastRenderSpikeReason = String(reason || 'ui');
    performanceRuntime.lastRenderSpikeRefreshOverlap = refreshOverlapsPerfWindow(startPerf, endPerf);
    performanceRuntime.lastRenderSpikeBreakdown = breakdown && typeof breakdown === 'object' ? {...breakdown} : null;
    pushPerformanceSample('renderSpikeSamples', duration);
  }

  function stopUiStallProbe() {
    if (uiStallProbeTimer) clearTimeout(uiStallProbeTimer);
    uiStallProbeTimer = null;
    performanceRuntime.uiStallProbeActive = false;
  }

  function startUiStallProbe() {
    stopUiStallProbe();
    if (typeof performance?.now !== 'function') return;
    if (state?.backgroundPause !== false && document.visibilityState === 'hidden') return;
    performanceRuntime.uiStallProbeActive = true;
    let expected = performance.now() + UI_STALL_PROBE_INTERVAL_MS;
    const tick = () => {
      uiStallProbeTimer = null;
      if (state?.backgroundPause !== false && document.visibilityState === 'hidden') {
        performanceRuntime.uiStallProbeActive = false;
        return;
      }
      const nowPerf = performance.now();
      const lag = Math.max(0, nowPerf - expected);
      if (lag >= UI_STALL_THRESHOLD_MS) {
        const rounded = roundPerfMs(lag);
        performanceRuntime.uiStallCount50 += 1;
        if (lag >= 100) performanceRuntime.uiStallCount100 += 1;
        if (lag >= 200) performanceRuntime.uiStallCount200 += 1;
        performanceRuntime.uiStallMaxMs = Math.max(Number(performanceRuntime.uiStallMaxMs || 0), rounded || 0);
        performanceRuntime.lastUiStallMs = rounded;
        performanceRuntime.lastUiStallAt = Date.now();
        performanceRuntime.lastUiStallRefreshOverlap = refreshOverlapsPerfWindow(expected, nowPerf);
        pushPerformanceSample('uiStallSamples', lag);
      }
      expected = nowPerf + UI_STALL_PROBE_INTERVAL_MS;
      uiStallProbeTimer = setTimeout(tick, UI_STALL_PROBE_INTERVAL_MS);
    };
    uiStallProbeTimer = setTimeout(tick, UI_STALL_PROBE_INTERVAL_MS);
  }

  function stopResumeMeasurement() {
    if (resumeProbeTimer) clearTimeout(resumeProbeTimer);
    if (resumeMeasureTimer) clearTimeout(resumeMeasureTimer);
    resumeProbeTimer = null;
    resumeMeasureTimer = null;
    performanceRuntime.resumeMeasurePending = false;
  }

  function beginResumeMeasurement(reason = 'visibility') {
    stopResumeMeasurement();
    performanceRuntime.resumeEvents += 1;
    performanceRuntime.lastResumeReason = String(reason || 'visibility');
    performanceRuntime.resumeMeasurePending = true;
    performanceRuntime.resumeInputCaptured = false;
    performanceRuntime.resumeVisiblePerf = typeof performance?.now === 'function' ? performance.now() : 0;
    performanceRuntime.lastResumeVisibleAt = Date.now();
    performanceRuntime.lastResumeFirstInputAfterMs = null;
    performanceRuntime.lastResumeInputDelayMs = null;
    performanceRuntime.lastResumeFrameDelayMs = null;
    performanceRuntime.lastResumeInputDuringRefresh = false;
    performanceRuntime.lastResumeMainThreadLagMs = null;
    performanceRuntime.lastResumeProbeAfterMs = null;
    performanceRuntime.lastResumeProbeDuringRefresh = false;
    performanceRuntime.lastResumeLongTaskMs = null;
    performanceRuntime.lastResumeLongTaskStartedAfterMs = null;
    performanceRuntime.lastResumeLongTaskDuringRefresh = false;
    performanceRuntime.resumeLongTaskCount = 0;

    if (typeof performance?.now === 'function') {
      const expected = performance.now() + RESUME_MAIN_THREAD_PROBE_MS;
      resumeProbeTimer = setTimeout(() => {
        resumeProbeTimer = null;
        const nowPerf = performance.now();
        const lag = Math.max(0, nowPerf - expected);
        const visiblePerf = Number(performanceRuntime.resumeVisiblePerf || 0);
        performanceRuntime.lastResumeMainThreadLagMs = roundPerfMs(lag);
        performanceRuntime.lastResumeProbeAfterMs = visiblePerf > 0 ? roundPerfMs(nowPerf - visiblePerf) : null;
        performanceRuntime.lastResumeProbeDuringRefresh = refreshOverlapsPerfWindow(expected, nowPerf);
        pushPerformanceSample('resumeMainThreadLagSamples', lag);
      }, RESUME_MAIN_THREAD_PROBE_MS);
    }

    resumeMeasureTimer = setTimeout(() => {
      resumeMeasureTimer = null;
      performanceRuntime.resumeMeasurePending = false;
    }, RESUME_DIAGNOSTIC_WINDOW_MS);
  }

  function installResumeLongTaskObserver() {
    try {
      if (typeof PerformanceObserver !== 'function') {
        performanceRuntime.longTaskSupported = false;
        return;
      }
      const supported = Array.isArray(PerformanceObserver.supportedEntryTypes)
        && PerformanceObserver.supportedEntryTypes.includes('longtask');
      performanceRuntime.longTaskSupported = Boolean(supported);
      if (!supported) return;
      resumeLongTaskObserver = new PerformanceObserver(list => {
        const visiblePerf = Number(performanceRuntime.resumeVisiblePerf || 0);
        if (!performanceRuntime.resumeMeasurePending || visiblePerf <= 0) return;
        for (const entry of list.getEntries()) {
          const start = Number(entry.startTime || 0);
          const duration = Math.max(0, Number(entry.duration || 0));
          const afterResume = start - visiblePerf;
          if (!Number.isFinite(afterResume) || afterResume < 0 || afterResume > RESUME_DIAGNOSTIC_WINDOW_MS) continue;
          performanceRuntime.lastResumeLongTaskMs = roundPerfMs(duration);
          performanceRuntime.lastResumeLongTaskStartedAfterMs = roundPerfMs(afterResume);
          performanceRuntime.lastResumeLongTaskDuringRefresh = refreshOverlapsPerfWindow(start, start + duration);
          performanceRuntime.resumeLongTaskCount += 1;
          pushPerformanceSample('resumeLongTaskSamples', duration);
        }
      });
      resumeLongTaskObserver.observe({entryTypes:['longtask']});
    } catch (_) {
      performanceRuntime.longTaskSupported = false;
      resumeLongTaskObserver = null;
    }
  }

  function stopResumeLongTaskObserver() {
    if (resumeLongTaskObserver) {
      try { resumeLongTaskObserver.disconnect(); } catch (_) {}
    }
    resumeLongTaskObserver = null;
  }

  // DevPass 2.7.3 resume interaction probe: capture only the first user input
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

  function cancelResumeRefresh() {
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
    enqueueRefresh('visibility', true);
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

  // DevPass 2.7.3 stability scheduler, adapted to the single local snapshot profile.
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

  function sourceAgeMs() {
    const ts = Number(state.data?.fetchedAt);
    return Number.isFinite(ts) && ts > 0 ? Math.max(0, Date.now() - ts) : null;
  }

  function dataIsStale() {
    const a = sourceAgeMs();
    const limit = Math.max(0, Number(state.staleAfterMs) || 0);
    return state.bridgeStatus === 'connected' && a !== null && limit > 0 && a >= limit;
  }

  function retryDelayFor(failures) {
    const base = Math.max(15000, Number(state.refreshMs) || 15000);
    return Math.min(120000, base * Math.pow(2, Math.max(0, Number(failures || 1) - 1)));
  }

  function connectionBadge() {
    if (state.bridgeStatus === 'error') return {label:'OFFLINE', color:'#ff9b95'};
    if (state.bridgeStatus === 'connected' && dataIsStale()) return {label:'STALE', color:'#ffd27d'};
    if (state.bridgeStatus === 'connected') return {label:'LIVE', color:'#c5f277'};
    return {label:'WAIT', color:'#ffd27d'};
  }

  function normalizeBridgeBase(value) {
    const u = new URL(String(value || DEFAULT_BRIDGE).trim());
    const h = String(u.hostname || '').toLowerCase();
    if (!['http:','https:'].includes(u.protocol)) throw new Error('Bridge는 http(s)만 사용할 수 있어.');
    if (!['127.0.0.1','localhost','::1','[::1]'].includes(h)) throw new Error('localhost/127.0.0.1 Bridge만 허용해.');
    return u.origin;
  }

  function bucket(raw, label) {
    if (!raw || typeof raw !== 'object') return null;
    const used = num(raw.used) ? Number(raw.used) : null;
    const limit = num(raw.limit) ? Number(raw.limit) : null;
    const remaining = num(raw.remaining) ? Number(raw.remaining) : (num(used) && num(limit) ? Math.max(0, limit - used) : null);
    const percent = num(raw.percent) ? pct(raw.percent) : (num(used) && num(limit) && limit > 0 ? pct(used / limit * 100) : null);
    return {
      label:String(raw.label || label), used, limit, remaining, percent,
      todayUsed:num(raw.todayUsed)?Number(raw.todayUsed):null,
      resetAt:raw.resetAt ?? null,
      resetPasses:num(raw.resetPasses)?Number(raw.resetPasses):null,
      resetPassesExact:raw.resetPassesExact === true
    };
  }

  function localDateKey(timestamp = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: KST_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(timestamp));
  const value = type => parts.find(part => part.type === type)?.value;
  return [value('year'), value('month'), value('day')].join('-');
}

function resetPeriodKey(value) {
  if (value === null || value === undefined || value === '') return null;
  if (num(value)) return String(Number(value));
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? String(parsed) : String(value);
}

function applyObservedToday(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return snapshot;
  const today = localDateKey();
  const monthlyPeriod = resetPeriodKey(snapshot.monthly?.resetAt);
  const premiumPeriod = resetPeriodKey(snapshot.weekly?.resetAt);

  const previous = state.dailyUsage?.date === today ? state.dailyUsage : null;
  const monthlyUsed = num(snapshot.monthly?.used) ? Number(snapshot.monthly.used) : null;
  const premiumUsed = num(snapshot.weekly?.used) ? Number(snapshot.weekly.used) : null;
  let monthlyBaseline = num(previous?.monthlyBaseline) ? Number(previous.monthlyBaseline) : monthlyUsed;
  let premiumBaseline = num(previous?.premiumBaseline) ? Number(previous.premiumBaseline) : premiumUsed;

  const monthlyPeriodChanged = Boolean(previous?.monthlyPeriod && monthlyPeriod && previous.monthlyPeriod !== monthlyPeriod);
  const premiumPeriodChanged = Boolean(previous?.premiumPeriod && premiumPeriod && previous.premiumPeriod !== premiumPeriod);
  if (monthlyPeriodChanged) monthlyBaseline = monthlyUsed;
  if (premiumPeriodChanged) premiumBaseline = premiumUsed;

  // Fallback for bridges that omit/reset resetAt: a counter drop still means a new period.
  if (num(monthlyUsed) && num(monthlyBaseline) && monthlyUsed < monthlyBaseline) monthlyBaseline = monthlyUsed;
  if (num(premiumUsed) && num(premiumBaseline) && premiumUsed < premiumBaseline) premiumBaseline = premiumUsed;

  const monthlyAmount = num(monthlyUsed) && num(monthlyBaseline)
    ? Math.max(0, monthlyUsed - monthlyBaseline)
    : null;
  const premiumAmount = num(premiumUsed) && num(premiumBaseline)
    ? Math.max(0, premiumUsed - premiumBaseline)
    : null;

  state.dailyUsage = {
    date: today,
    amount: monthlyAmount,
    premiumAmount,
    monthlyBudgetAmount: monthlyAmount,
    premiumBudgetAmount: premiumAmount,
    monthlyBaseline,
    premiumBaseline,
    monthlyPeriod,
    premiumPeriod,
    observedFrom: (monthlyPeriodChanged || premiumPeriodChanged) ? Date.now() : (previous?.observedFrom || Date.now()),
    updatedAt: Date.now(),
    source: 'key-status-local-delta-reset-aware'
  };

  if (snapshot.monthly) snapshot.monthly.todayUsed = monthlyAmount;
  if (snapshot.weekly) snapshot.weekly.todayUsed = premiumAmount;

  const creditPrevious = state.creditDailyUsage?.date === today ? state.creditDailyUsage : null;
  const balance = num(snapshot.credits?.balance) ? Number(snapshot.credits.balance) : null;
  let balanceBaseline = num(creditPrevious?.balanceBaseline)
    ? Number(creditPrevious.balanceBaseline)
    : balance;

  if (num(balance) && num(balanceBaseline) && balance > balanceBaseline) balanceBaseline = balance;

  const creditsAmount = num(balance) && num(balanceBaseline)
    ? Math.max(0, balanceBaseline - balance)
    : null;

  state.creditDailyUsage = {
    date: today,
    amount: creditsAmount,
    usedBaseline: null,
    balanceBaseline,
    observedFrom: creditPrevious?.observedFrom || Date.now(),
    updatedAt: Date.now(),
    source: 'credits-local-delta'
  };

  if (snapshot.credits) snapshot.credits.todayUsed = creditsAmount;
  return snapshot;
}

async function importLegacyTodayBaselines() {
  const today = localDateKey();
  let imported = false;
  try {
    const legacy = await store.getItem(LEGACY_DEVPASS_STATE_KEY);
    if (!legacy || typeof legacy !== 'object') return false;

    if (state.dailyUsage?.date !== today && legacy.dailyUsage?.date === today) {
      state.dailyUsage = {...legacy.dailyUsage, importedFrom: LEGACY_DEVPASS_STATE_KEY};
      imported = true;
    }
    if (state.creditDailyUsage?.date !== today && legacy.creditDailyUsage?.date === today) {
      state.creditDailyUsage = {...legacy.creditDailyUsage, importedFrom: LEGACY_DEVPASS_STATE_KEY};
      imported = true;
    }

    if (imported) await store.setItem(STATE_KEY, {...state});
  } catch (_) {}
  return imported;
}

  function normalizeScopeActivity(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const rows = value => Array.isArray(value) ? value.map(row => ({
      name:String(row?.name || 'Unknown'),
      requests:num(row?.requests) ? Number(row.requests) : 0,
      cost:num(row?.cost) ? Number(row.cost) : 0
    })) : [];
    const totalRequests = num(raw.totalRequests ?? raw.requests24h) ? Number(raw.totalRequests ?? raw.requests24h) : null;
    const totalCost = num(raw.totalCost ?? raw.cost24h) ? Number(raw.totalCost ?? raw.cost24h) : null;
    const totalTokens = num(raw.totalTokens ?? raw.totalTokens24h) ? Number(raw.totalTokens ?? raw.totalTokens24h) : null;
    const inputTokens = num(raw.inputTokens) ? Number(raw.inputTokens) : null;
    const outputTokens = num(raw.outputTokens) ? Number(raw.outputTokens) : null;
    const errorCount = num(raw.errorCount) ? Number(raw.errorCount) : null;
    const errorRate = num(raw.errorRate ?? raw.errorRate24h) ? Number(raw.errorRate ?? raw.errorRate24h) : null;
    const cacheCount = num(raw.cacheCount) ? Number(raw.cacheCount) : null;
    const cacheRate = num(raw.cacheRate) ? Number(raw.cacheRate) : null;
    const providers = rows(raw.providers);
    const models = rows(raw.models);
    const recent = Array.isArray(raw.recent) ? raw.recent : [];
    if (![totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate].some(num) && !providers.length && !models.length && !recent.length) return null;
    return {totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate,providers,models,recent,fetchedAt:raw.fetchedAt || Date.now(),source:String(raw.source || 'LLMGateway scoped usage')};
  }

  function normalizeUsageScopesPayload(raw, fallbackRaw = null) {
    const source = raw && typeof raw === 'object' ? (raw.scopes && typeof raw.scopes === 'object' ? raw.scopes : raw) : null;
    const scopes = {};
    for (const key of ['all','devpass','credits']) {
      const normalized = normalizeScopeActivity(source?.[key]);
      if (normalized) scopes[key] = normalized;
    }
    if (!scopes.all && fallbackRaw) {
      const fallback = normalizeScopeActivity(fallbackRaw);
      if (fallback) scopes.all = fallback;
    }
    if (!Object.keys(scopes).length) return null;
    return {scopes,errors:raw?.errors && typeof raw.errors === 'object' ? raw.errors : {},fetchedAt:raw?.fetchedAt || scopes.all?.fetchedAt || Date.now(),source:String(raw?.source || 'LLMGateway hybrid scoped usage')};
  }

  function normalizeAnalyticsPayload(raw, fallback24h = null) {
    if ((!raw || typeof raw !== 'object') && !fallback24h) return null;
    const sourceWindows = raw && typeof raw === 'object'
      ? (raw.windows && typeof raw.windows === 'object' ? raw.windows : raw)
      : {};
    const windows = {};
    for (const range of ['24h','7d','30d']) {
      const normalized = normalizeScopeActivity(sourceWindows?.[range]);
      if (normalized) windows[range] = normalized;
    }
    if (!windows['24h'] && fallback24h) {
      const fallback = normalizeScopeActivity(fallback24h);
      if (fallback) windows['24h'] = fallback;
    }
    if (!Object.keys(windows).length) return null;
    return {
      windows,
      averages:{
        dailyCost7d:num(raw?.averages?.dailyCost7d)?Number(raw.averages.dailyCost7d):null,
        dailyRequests7d:num(raw?.averages?.dailyRequests7d)?Number(raw.averages.dailyRequests7d):null,
        dailyCost30d:num(raw?.averages?.dailyCost30d)?Number(raw.averages.dailyCost30d):null
      },
      errors:raw?.errors && typeof raw.errors === 'object' ? raw.errors : {},
      fetchedAt:raw?.fetchedAt || windows['24h']?.fetchedAt || Date.now(),
      source:String(raw?.source || 'LLMGateway CLI analytics')
    };
  }

  function normalizeAnalyticsScopesPayload(raw, usageScopes = null, allAnalytics = null) {
    const source = raw && typeof raw === 'object'
      ? (raw.scopes && typeof raw.scopes === 'object' ? raw.scopes : raw)
      : null;
    const scopes = {};
    for (const key of ['all','devpass','credits']) {
      const fallback24h = usageScopes?.scopes?.[key] || null;
      const normalized = normalizeAnalyticsPayload(source?.[key], fallback24h);
      if (normalized) scopes[key] = normalized;
    }
    if (!scopes.all && allAnalytics) scopes.all = allAnalytics;
    if (!Object.keys(scopes).length) return null;
    return {
      scopes,
      errors:raw?.errors && typeof raw.errors === 'object' ? raw.errors : {},
      fetchedAt:raw?.fetchedAt || scopes.all?.fetchedAt || Date.now(),
      source:String(raw?.source || 'LLMGateway hybrid scoped analytics')
    };
  }

  function normalize(payload) {
    const r = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
    if (!r || typeof r !== 'object') throw new Error('snapshot 형식이 잘못됐어.');

    // DevPass Bridge v1.6.x compatibility adapter.
    // Keep the original generic local-JSON adapter below as a fallback.
    const ds = r.devpassStatus && typeof r.devpassStatus === 'object' ? r.devpassStatus : null;
    const ba = r.activity && typeof r.activity === 'object' ? r.activity : null;
    if (ds || r.__bridgeSnapshot || r.bridgeVersion) {
      const directResetPasses = ds && num(ds.resetPasses) ? Number(ds.resetPasses) : null;
      const includedResetPassesRemaining = ds && num(ds.includedResetPassesRemaining) ? Number(ds.includedResetPassesRemaining) : null;
      const resetPassesRemaining = directResetPasses !== null
        ? directResetPasses + Number(includedResetPassesRemaining || 0)
        : includedResetPassesRemaining;
      const monthly = ds ? bucket({
        label:'DevPass 월간',
        used:ds.creditsUsed,
        limit:ds.creditsLimit,
        remaining:ds.creditsRemaining,
        resetAt:ds.expiresAt
      }, 'DevPass 월간') : null;
      const weekly = ds ? bucket({
        label:'Premium 주간',
        used:ds.premiumCreditsUsed,
        limit:ds.premiumWeeklyLimit,
        resetAt:ds.premiumWeekResetsAt,
        resetPasses:resetPassesRemaining,
        resetPassesExact:num(resetPassesRemaining)
      }, 'Premium 주간') : null;
      const orgRows = Array.isArray(r.orgs)
        ? r.orgs
        : (Array.isArray(r.orgs?.organizations)
          ? r.orgs.organizations
          : (Array.isArray(r.orgs?.data?.organizations) ? r.orgs.data.organizations : []));
      const creditOrg = orgRows.find(org =>
        String(org?.kind || 'default') === 'default' &&
        String(org?.status || 'active') !== 'deleted' &&
        num(org?.credits)
      ) || orgRows.find(org => String(org?.status || 'active') !== 'deleted' && num(org?.credits)) || null;
      const credits = creditOrg
        ? {label:'Credits', balance:Number(creditOrg.credits), todayUsed:null}
        : (ds && num(ds.regularCredits)
          ? {label:'Credits', balance:Number(ds.regularCredits), todayUsed:null}
          : null);
      const activity = ba ? {
        requests24h:num(ba.totalRequests)?Number(ba.totalRequests):null,
        cost24h:num(ba.totalCost)?Number(ba.totalCost):null,
        totalTokens24h:num(ba.totalTokens)?Number(ba.totalTokens):null,
        errorRate24h:num(ba.errorRate)?Number(ba.errorRate):null
      } : null;
      const usageScopes = normalizeUsageScopesPayload(r.usageScopes, ba || activity);
      const analytics = normalizeAnalyticsPayload(r.analytics, usageScopes?.scopes?.all || ba || activity);
      const analyticsScopes = normalizeAnalyticsScopesPayload(r.analyticsScopes, usageScopes, analytics);
      const runwayRaw = r.runway && typeof r.runway === 'object' ? r.runway : null;
      const runway = runwayRaw ? {
        runwayDays:num(runwayRaw.runwayDays)?Number(runwayRaw.runwayDays):null,
        avgDailySpend7d:num(runwayRaw.avgDailySpend7d)?Number(runwayRaw.avgDailySpend7d):null,
        fetchedAt:runwayRaw.fetchedAt || r.fetchedAt || Date.now()
      } : null;
      const out = {
        protocolVersion:Number(r.protocolVersion || 1),
        fetchedAt:r.fetchedAt || ds?.fetchedAt || ba?.fetchedAt || Date.now(),
        source:String(ba?.source || ds?.source || ('LLMGateway DevPass Bridge' + (r.bridgeVersion ? ' v' + r.bridgeVersion : ''))),
        health:{status:r.ok === false ? 'error' : 'ok', bridgeVersion:r.bridgeVersion || null},
        monthly, weekly, credits, activity, runway, usageScopes, analytics, analyticsScopes
      };
      if (!out.monthly && !out.weekly && !out.credits && !out.activity) throw new Error('DevPass Bridge에 표시할 데이터가 없어.');
      return out;
    }

    const u = r.usage && typeof r.usage === 'object' ? r.usage : r;
    const credits = u.credits && typeof u.credits === 'object'
      ? {label:String(u.credits.label || 'Credits'), balance:num(u.credits.balance)?Number(u.credits.balance):null, todayUsed:num(u.credits.todayUsed)?Number(u.credits.todayUsed):null}
      : null;
    const activity = u.activity && typeof u.activity === 'object'
      ? {requests24h:num(u.activity.requests24h)?Number(u.activity.requests24h):null, cost24h:num(u.activity.cost24h)?Number(u.activity.cost24h):null, totalTokens24h:num(u.activity.totalTokens24h)?Number(u.activity.totalTokens24h):null, errorRate24h:num(u.activity.errorRate24h)?Number(u.activity.errorRate24h):null}
      : null;
    const usageScopes = normalizeUsageScopesPayload(r.usageScopes ?? u.usageScopes, u.activity || activity);
    const analytics = normalizeAnalyticsPayload(r.analytics ?? u.analytics, usageScopes?.scopes?.all || u.activity || activity);
    const analyticsScopes = normalizeAnalyticsScopesPayload(r.analyticsScopes ?? u.analyticsScopes, usageScopes, analytics);
    const out = {
      protocolVersion: Number(r.protocolVersion || 1), fetchedAt: r.fetchedAt || Date.now(),
      source: String(r.source || 'Local Bridge'), health: r.health && typeof r.health === 'object' ? r.health : null,
      monthly: bucket(u.monthly, '월간'), weekly: bucket(u.weekly, '주간'), credits, activity, usageScopes, analytics, analyticsScopes
    };
    if (!out.monthly && !out.weekly && !out.credits && !out.activity) throw new Error('표시할 usage 데이터가 없어.');
    return out;
  }

  async function persist() { await store.setItem(STATE_KEY, {...state}); }

  async function fetchSnapshot() {
    if (!token) throw new Error('Bridge Token을 먼저 저장해 줘.');
    const base = normalizeBridgeBase(state.bridgeBase);
    const res = await Risuai.nativeFetch(`${base}/snapshot`, {
      method:'GET',
      headers:{Accept:'application/json','X-Local-Bridge-Key':token,'X-DevPass-Bridge-Key':token,'Cache-Control':'no-cache'}
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Bridge HTTP ${res.status}: ${text.slice(0,120)}`);
    try { return normalize(JSON.parse(text)); }
    catch (e) { if (e instanceof SyntaxError) throw new Error('Bridge 응답이 JSON이 아니야.'); throw e; }
  }

  async function refresh(reason = 'manual', silent = false) {
    if (!state.bridgeEnabled) return;
    if (refreshInFlight) return refreshInFlight;
    if (state.backgroundPause !== false && document.visibilityState === 'hidden') return;
    const started = Date.now();
    const startedPerf = typeof performance?.now === 'function' ? performance.now() : 0;
    performanceRuntime.activeRefreshStartedPerf = startedPerf;
    refreshInFlight = (async () => {
      try {
        state.data = applyObservedToday(await fetchSnapshot());
        state.bridgeStatus = 'connected';
        state.bridgeError = '';
        state.lastSyncAt = Date.now();
        state.lastSyncDurationMs = state.lastSyncAt - started;
        noteRefreshPerformance(state.lastSyncDurationMs, reason);
        state.lastRefreshReason = reason;
        state.refreshCount = Number(state.refreshCount || 0) + 1;
        state.consecutiveFailures = 0;
        state.retryDelayMs = 0;
        state.nextRetryAt = null;
        await persist();
        await renderWidget(reason);
        scheduleRefresh();
        schedulePanelRender(false);
      } catch (e) {
        // Keep the last successful snapshot in state.data; only status changes.
        state.bridgeStatus = 'error';
        state.bridgeError = e?.message || String(e);
        state.lastRefreshReason = reason;
        state.consecutiveFailures = Number(state.consecutiveFailures || 0) + 1;
        state.retryDelayMs = retryDelayFor(state.consecutiveFailures);
        state.nextRetryAt = Number(state.refreshMs) > 0 ? Date.now() + state.retryDelayMs : null;
        await persist();
        // Keep the last good values, but immediately repaint the widget so
        // LIVE changes to OFFLINE as soon as a refresh fails.
        await renderWidget(reason);
        scheduleRefresh();
        if (!silent) console.log(`[Local Usage Dashboard] ${state.bridgeError}`);
        schedulePanelRender(false);
      }
    })();
    try { await refreshInFlight; } finally {
      const endedPerf = typeof performance?.now === 'function' ? performance.now() : 0;
      if (startedPerf > 0 && endedPerf >= startedPerf) {
        performanceRuntime.lastRefreshStartedPerf = startedPerf;
        performanceRuntime.lastRefreshEndedPerf = endedPerf;
      }
      performanceRuntime.activeRefreshStartedPerf = 0;
      refreshInFlight = null;
    }
  }

  function diagText() {
    const d = state.data || {}, h = d.health || {};
    return [
      `Local Usage Dashboard v${VERSION}`,
      `Bridge: ${state.bridgeStatus} · ${state.bridgeBase}`,
      `Protocol: ${num(d.protocolVersion) ? d.protocolVersion : '—'}`,
      `Source: ${d.source || '—'}`,
      `Adapter: devpass-bridge-v1.6.x + local-json-v1`,
      `Health: ${h.status || '—'}`,
      `Last sync: ${state.lastSyncAt ? new Date(Number(state.lastSyncAt)).toISOString() : '—'}`,
      `Duration: ${num(state.lastSyncDurationMs) ? `${state.lastSyncDurationMs}ms` : '—'}`,
      `Reason: ${state.lastRefreshReason || '—'}`,
      `Success count: ${Number(state.refreshCount || 0)}`,
      `Performance guard: ${state.performanceGuard === false ? 'off' : performanceRuntime.mode} · x${Number(performanceRuntime.adaptiveMultiplier || 1)} · timer-only`,
      `Guard samples: timer ${Number(performanceRuntime.timerSamples || 0)} · ignored ${Number(performanceRuntime.ignoredSamples || 0)} · slow streak ${Number(performanceRuntime.slowRefreshes || 0)}`,
      `UI stall probe: ${performanceRuntime.uiStallProbeActive ? 'active' : 'paused'} · ≥50ms ${Number(performanceRuntime.uiStallCount50 || 0)} · ≥100ms ${Number(performanceRuntime.uiStallCount100 || 0)} · ≥200ms ${Number(performanceRuntime.uiStallCount200 || 0)} · max ${roundPerfMs(performanceRuntime.uiStallMaxMs) || 0}ms`,
      `Last UI stall: ${num(performanceRuntime.lastUiStallMs) ? `${roundPerfMs(performanceRuntime.lastUiStallMs)}ms · refresh overlap ${performanceRuntime.lastUiStallRefreshOverlap ? 'yes' : 'no'} · ${age(performanceRuntime.lastUiStallAt)}` : 'none'}`,
      `Resume probe: events ${Number(performanceRuntime.resumeEvents || 0)} · reason ${performanceRuntime.lastResumeReason || '—'} · main-thread lag ${num(performanceRuntime.lastResumeMainThreadLagMs) ? `${roundPerfMs(performanceRuntime.lastResumeMainThreadLagMs)}ms` : '—'} · after ${num(performanceRuntime.lastResumeProbeAfterMs) ? `${roundPerfMs(performanceRuntime.lastResumeProbeAfterMs)}ms` : '—'} · refresh overlap ${performanceRuntime.lastResumeProbeDuringRefresh ? 'yes' : 'no'}`,
      `Resume input: first ${num(performanceRuntime.lastResumeFirstInputAfterMs) ? `${roundPerfMs(performanceRuntime.lastResumeFirstInputAfterMs)}ms` : '—'} · event delay ${num(performanceRuntime.lastResumeInputDelayMs) ? `${roundPerfMs(performanceRuntime.lastResumeInputDelayMs)}ms` : '—'} · frame ${num(performanceRuntime.lastResumeFrameDelayMs) ? `${roundPerfMs(performanceRuntime.lastResumeFrameDelayMs)}ms` : '—'} · refresh overlap ${performanceRuntime.lastResumeInputDuringRefresh ? 'yes' : 'no'}`,
      `Resume long task: ${performanceRuntime.longTaskSupported ? 'supported' : 'unsupported'} · count ${Number(performanceRuntime.resumeLongTaskCount || 0)} · ${num(performanceRuntime.lastResumeLongTaskMs) ? `last ${roundPerfMs(performanceRuntime.lastResumeLongTaskMs)}ms @ +${roundPerfMs(performanceRuntime.lastResumeLongTaskStartedAfterMs)}ms · refresh overlap ${performanceRuntime.lastResumeLongTaskDuringRefresh ? 'yes' : 'no'}` : 'last none'}`,
      `Resume grace: ${performanceRuntime.resumePending ? 'pending' : 'idle'} · delay ${num(performanceRuntime.lastResumeDelayMs) ? `${Number(performanceRuntime.lastResumeDelayMs)}ms` : '—'} · deferred ${Number(performanceRuntime.resumeDeferred || 0)} · coalesced ${Number(performanceRuntime.resumeCoalesced || 0)} · quiet ${RESUME_INTERACTION_QUIET_MS}ms · max ${RESUME_MAX_DEFER_MS}ms`,
      `Scheduler: pending ${refreshSchedulerState.pending ? 'yes' : 'no'} · running ${refreshSchedulerState.running ? 'yes' : 'no'} · queued ${Number(performanceRuntime.schedulerQueued || 0)} · merged ${Number(performanceRuntime.schedulerMerged || 0)} · executed ${Number(performanceRuntime.schedulerExecuted || 0)} · interaction defer ${Number(performanceRuntime.schedulerDeferredForInteraction || 0)} · last ${refreshSchedulerState.lastReason || '—'}`,
      `Render: widget ${num(performanceRuntime.lastRenderMs) ? `${roundPerfMs(performanceRuntime.lastRenderMs)}ms` : '—'} · panel ${num(performanceRuntime.lastPanelRenderMs) ? `${roundPerfMs(performanceRuntime.lastPanelRenderMs)}ms` : '—'} · reason ${performanceRuntime.lastRenderReason || '—'} · phases ${renderBreakdownText(performanceRuntime.lastRenderBreakdown)}`,
      `Render spike: ≥${RENDER_SPIKE_THRESHOLD_MS}ms · count ${Number(performanceRuntime.renderSpikeCount || 0)} · ${num(performanceRuntime.lastRenderSpikeMs) ? `last ${roundPerfMs(performanceRuntime.lastRenderSpikeMs)}ms · reason ${performanceRuntime.lastRenderSpikeReason || '—'} · refresh overlap ${performanceRuntime.lastRenderSpikeRefreshOverlap ? 'yes' : 'no'} · phases ${renderBreakdownText(performanceRuntime.lastRenderSpikeBreakdown)}` : 'last none'}`,
      `Panel render scheduler: ${panelRenderTimer || panelIdleHandle !== null ? 'pending' : 'idle'} · coalesced ${Number(performanceRuntime.panelRenderCoalesced || 0)} · interaction quiet 700ms · defer 750ms`,
      `Effective refresh: ${effectiveRefreshMs()}ms`,
      `Data age: ${state.data?.fetchedAt ? age(state.data.fetchedAt) : '—'}`,
      `Stale after: ${Number(state.staleAfterMs) > 0 ? `${Math.round(Number(state.staleAfterMs)/1000)}s` : 'off'}`,
      `Failures: ${Number(state.consecutiveFailures || 0)}`,
      `Retry delay: ${Number(state.retryDelayMs || 0)}ms`,
      `Next retry: ${state.nextRetryAt ? new Date(Number(state.nextRetryAt)).toISOString() : '—'}`,
      `Error: ${state.bridgeError || 'none'}`,
      `Updater: ${UPDATE_URL}`
    ].join('\n');
  }

  async function copyDiag() {
    try { if (navigator?.clipboard?.writeText) { await navigator.clipboard.writeText(diagText()); return true; } } catch (_) {}
    return false;
  }

  function card(title, b, cls='') {
    if (!b) return `<section class="panel metric ${cls}"><small>${esc(title)}</small><strong>—</strong><p>데이터 없음</p></section>`;
    return `<section class="panel metric ${cls}"><small>${esc(b.label || title)}</small><strong>${money(b.used)} <em>/ ${money(b.limit)}</em></strong><div class="bar"><i style="width:${pct(b.percent)}%"></i></div><p>남음 ${money(b.remaining)}${num(b.todayUsed)?` · 오늘 ${money(b.todayUsed,4)}`:''}</p></section>`;
  }

  function dashboardDateText(value, short = false) {
  const ts = resetTimestamp(value);
  if (!Number.isFinite(ts)) return '—';
  return new Date(ts).toLocaleString('ko-KR', short
    ? {timeZone:KST_TIME_ZONE, month:'numeric', day:'numeric', hour:'numeric', minute:'2-digit'}
    : {timeZone:KST_TIME_ZONE});
}

function previousMonthlyStart(resetValue) {
  const end = resetTimestamp(resetValue);
  if (!Number.isFinite(end)) return null;
  const kst = new Date(end + 9 * 3600000);
  const originalDay = kst.getUTCDate();
  let year = kst.getUTCFullYear();
  let month = kst.getUTCMonth() - 1;
  if (month < 0) { month = 11; year -= 1; }
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(year, month, Math.min(originalDay, lastDay), kst.getUTCHours(), kst.getUTCMinutes(), kst.getUTCSeconds(), kst.getUTCMilliseconds()) - 9 * 3600000;
}

function remainingTimeForDashboard(value) {
  const timestamp=resetTimestamp(value);
  if (!Number.isFinite(timestamp)) return '—';
  const diff=timestamp-Date.now();
  if (diff<=0) return '곧 초기화';
  const totalMinutes=Math.ceil(diff/60000);
  const days=Math.floor(totalMinutes/1440);
  const hours=Math.floor((totalMinutes%1440)/60);
  const minutes=totalMinutes%60;
  if (days>0) return days+'일 '+hours+'시간 '+minutes+'분';
  if (hours>0) return hours+'시간 '+minutes+'분';
  return minutes+'분';
}

function todayOverviewMetrics(d) {
  const m=d?.monthly, w=d?.weekly, c=d?.credits, a=d?.activity;
  const devToday=num(m?.todayUsed)?Number(m.todayUsed):null;
  const premiumToday=num(w?.todayUsed)?Number(w.todayUsed):null;
  const creditsToday=num(c?.todayUsed)?Number(c.todayUsed):null;
  const observedDailyTotal=(num(devToday)||num(creditsToday)) ? Number(devToday||0)+Number(creditsToday||0) : null;
  const now=Date.now();
  const monthEnd=resetTimestamp(m?.resetAt);
  const weekEnd=resetTimestamp(w?.resetAt);
  const monthlyDays=Number.isFinite(monthEnd)&&monthEnd>now ? Math.max(1,Math.ceil((monthEnd-now)/86400000)) : null;
  const weeklyDays=Number.isFinite(weekEnd)&&weekEnd>now ? Math.max(1,Math.ceil((weekEnd-now)/86400000)) : 7;
  const monthlyTarget=monthlyDays&&num(m?.remaining)&&num(devToday) ? (Math.max(0,Number(m.remaining))+Number(devToday))/monthlyDays : null;
  const weeklyTarget=weeklyDays&&num(w?.remaining)&&num(premiumToday) ? (Math.max(0,Number(w.remaining))+Number(premiumToday))/weeklyDays : null;
  const monthlyLeft=num(monthlyTarget)&&num(devToday) ? Math.max(0,Number(monthlyTarget)-Number(devToday)) : null;
  const weeklyLeft=num(weeklyTarget)&&num(premiumToday) ? Math.max(0,Number(weeklyTarget)-Number(premiumToday)) : null;
  let projected=null, projectedPercent=null;
  const monthStart=previousMonthlyStart(monthEnd);
  if (Number.isFinite(monthStart)&&Number.isFinite(monthEnd)&&monthStart<now&&now<monthEnd&&num(m?.used)&&num(m?.limit)&&Number(m.limit)>0) {
    const elapsed=now-monthStart, total=monthEnd-monthStart;
    projected=Math.max(Number(m.used),Number(m.used)*total/elapsed);
    projectedPercent=projected/Number(m.limit)*100;
  }
  return {devToday,premiumToday,creditsToday,observedDailyTotal,monthEnd,monthlyLeft,weeklyLeft,projected,projectedPercent,cost24h:num(a?.cost24h)?Number(a.cost24h):null,resetPasses:num(w?.resetPasses)?Number(w.resetPasses):null,resetPassesExact:w?.resetPassesExact===true};
}

  function settingsHtml() {
    const d = state.data || {}, c = d.credits, a = d.activity, runway = d.runway, h = d.health || {};
    const creditsMeta = [
      num(c?.todayUsed) ? `오늘 ${money(c.todayUsed,4)}` : '',
      num(runway?.avgDailySpend7d) ? `7일평균 ${money(runway.avgDailySpend7d,4)}/일` : '',
      num(runway?.runwayDays) ? `약 ${Math.round(Number(runway.runwayDays))}일` : '',
      d.source ? esc(d.source) : ''
    ].filter(Boolean).join(' · ');
    const today = todayOverviewMetrics(d);
    const observedStamp = state.dailyUsage?.updatedAt || state.creditDailyUsage?.updatedAt || state.lastSyncAt;
    const scopeKey = ['all','devpass','credits'].includes(String(state.usageScopeView)) ? String(state.usageScopeView) : 'all';
    const scopeNames = {all:['전체 24h Usage','DevPass + Credits 합산 서버 집계'],devpass:['DevPass 24h Usage','DevPass project /activity 서버 집계'],credits:['Credits 24h Usage','Default organization 서버 집계']};
    const scopeActivity = d.usageScopes?.scopes?.[scopeKey] || (scopeKey === 'all' ? normalizeScopeActivity({totalRequests:a?.requests24h,totalCost:a?.cost24h,totalTokens:a?.totalTokens24h,errorRate:a?.errorRate24h,fetchedAt:d.fetchedAt,source:d.source}) : null);
    const scopeTopProvider = Array.isArray(scopeActivity?.providers) && scopeActivity.providers[0]?.name ? String(scopeActivity.providers[0].name) : '—';
    const scopeTopModel = Array.isArray(scopeActivity?.models) && scopeActivity.models[0]?.name ? String(scopeActivity.models[0].name) : '—';
    const scopeFetchedAt = scopeActivity?.fetchedAt || d.usageScopes?.fetchedAt || d.fetchedAt;
    const scopeExtra = scopeKey === 'devpass'
      ? `<div class="mini accent"><span>월간 남음</span><b>${money(d.monthly?.remaining)}</b></div><div class="mini"><span>월간 갱신</span><b>${d.monthly?.resetAt ? remainingTimeForDashboard(d.monthly.resetAt) : '—'}</b></div>`
      : scopeKey === 'credits'
        ? `<div class="mini cyan"><span>Credits 잔액</span><b>${money(c?.balance)}</b></div><div class="mini cyan"><span>Runway</span><b>${num(runway?.runwayDays) ? `약 ${Math.round(Number(runway.runwayDays))}일` : '—'}</b></div>`
        : `<div class="mini accent"><span>DevPass 월간 남음</span><b>${money(d.monthly?.remaining)}</b></div><div class="mini cyan"><span>Credits 잔액</span><b>${money(c?.balance)}</b></div>`;
    const analyticsScopeKey = ['all','devpass','credits'].includes(String(state.analyticsScopeView)) ? String(state.analyticsScopeView) : 'all';
    const analyticsNames = {
      all:['전체 Analytics','DevPass + Credits 합산 서버 분석'],
      devpass:['DevPass Analytics','DevPass project 서버 분석'],
      credits:['Credits Analytics','Default organization 서버 분석']
    };
    const analyticsBundle = d.analyticsScopes?.scopes?.[analyticsScopeKey] || (analyticsScopeKey === 'all' ? d.analytics : null) || null;
    const analyticsW24 = analyticsBundle?.windows?.['24h'] || d.usageScopes?.scopes?.[analyticsScopeKey] || (analyticsScopeKey === 'all' ? scopeActivity : null) || null;
    const analyticsW7 = analyticsBundle?.windows?.['7d'] || null;
    const analyticsW30 = analyticsBundle?.windows?.['30d'] || null;
    const analyticsAverages = analyticsBundle?.averages || {};
    const analyticsTopProvider = Array.isArray(analyticsW24?.providers) && analyticsW24.providers[0]?.name ? String(analyticsW24.providers[0].name) : '—';
    const analyticsTopModel = Array.isArray(analyticsW24?.models) && analyticsW24.models[0]?.name ? String(analyticsW24.models[0].name) : '—';
    const analyticsFetchedAt = analyticsBundle?.fetchedAt || d.analyticsScopes?.fetchedAt || analyticsW24?.fetchedAt || d.fetchedAt;
    const analyticsExtra = analyticsScopeKey === 'devpass'
      ? `<div class="mini accent"><span>월간 남음</span><b>${money(d.monthly?.remaining)}</b></div><div class="mini"><span>월간 갱신</span><b>${d.monthly?.resetAt ? remainingTimeForDashboard(d.monthly.resetAt) : '—'}</b></div>`
      : analyticsScopeKey === 'credits'
        ? `<div class="mini cyan"><span>Credits 잔액</span><b>${money(c?.balance)}</b></div><div class="mini cyan"><span>Runway</span><b>${num(runway?.runwayDays) ? `약 ${Math.round(Number(runway.runwayDays))}일` : '—'}</b></div>`
        : `<div class="mini accent"><span>DevPass 월간 남음</span><b>${money(d.monthly?.remaining)}</b></div><div class="mini cyan"><span>Credits 잔액</span><b>${money(c?.balance)}</b></div>`;
    return `<style>
      :root{color-scheme:dark;--b:#101114;--p:#191b20;--p2:#21242a;--l:#2c3037;--t:#f5f6f8;--m:#969da8;--g:#c5f277;--v:#b9a6f8;--c:#9fd7ee;--e:#ff9b95}
      *{box-sizing:border-box}body{margin:0;background:var(--b);color:var(--t);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}.shell{width:min(900px,100%);margin:auto;padding:14px}
      header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}h1{margin:0;font-size:23px}.muted,p{color:var(--m);font-size:12px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
      .panel{background:var(--p);border:1px solid var(--l);border-radius:13px;padding:13px}.metric{min-height:135px;display:flex;flex-direction:column}.metric small{color:var(--m);font-weight:700}.metric strong{font-size:24px;margin-top:9px}.metric em{font-style:normal;color:var(--m);font-size:12px}.metric p{margin-top:auto;margin-bottom:0}.bar{height:5px;background:#2d3138;border-radius:99px;overflow:hidden;margin:11px 0}.bar i{display:block;height:100%;background:var(--g)}.weekly .bar i{background:var(--v)}.wide{grid-column:1/-1}
      .minis{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:10px}.mini{background:var(--p2);border-radius:9px;padding:9px}.mini span{display:block;color:var(--m);font-size:10px}.mini b{display:block;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .today-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.today-head b{font-size:14px}.stamp{color:var(--m);font-size:10px;white-space:nowrap}.today-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:10px}.today-grid .mini b{white-space:normal;overflow:visible;text-overflow:clip}.today-grid .accent b{color:var(--g)}.today-grid .purple b{color:var(--v)}.today-grid .cyan b{color:var(--c)}
      .scope-tabs{display:flex;gap:6px;margin-top:10px}.scope-tab{flex:1;min-width:0;padding:7px 9px}.scope-tab.active{background:var(--g);border-color:var(--g);color:#15170f}
      label{display:grid;gap:5px;margin-top:9px}label span{color:var(--m);font-size:11px}input,textarea,select,button{font:inherit}input,textarea,select{width:100%;background:#111318;color:var(--t);border:1px solid var(--l);border-radius:9px;padding:9px}textarea{min-height:62px}
      button{background:#25282f;color:var(--t);border:1px solid var(--l);border-radius:9px;padding:8px 11px;font-weight:650}button.primary{background:var(--g);border-color:var(--g);color:#15170f}.actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.warn{color:var(--e)}
      @media(max-width:680px){.grid{grid-template-columns:1fr}.wide{grid-column:auto}.minis,.today-grid{grid-template-columns:1fr 1fr}}
    </style><div class="shell"><header><div><div class="muted">MODULAR CORE · v${VERSION}</div><h1>Local Usage Dashboard</h1></div><button id="close">닫기</button></header><main class="grid">
      ${card('월간',d.monthly)}${card('주간',d.weekly,'weekly')}
      <section class="panel metric"><small>${esc(c?.label || 'Credits')}</small><strong>${money(c?.balance)}</strong><p>${creditsMeta || '—'}</p></section>
      <section class="panel wide">
        <div class="today-head"><div><b>오늘 관측</b><p style="margin:2px 0 0">핵심 값만 한 화면에 유지</p></div><span class="stamp">KST${observedStamp ? ` · ${dashboardDateText(observedStamp)}` : ''}</span></div>
        <div class="today-grid">
          <div class="mini accent"><span>일간 총 사용량 · 관측</span><b>${money(today.observedDailyTotal,4)}</b></div>
          <div class="mini"><span>월간 총 사용량 · DevPass</span><b>${money(d.monthly?.used,4)}</b></div>
          <div class="mini"><span>오늘 DevPass</span><b>${money(today.devToday,4)}</b></div>
          <div class="mini purple"><span>오늘 프리미엄</span><b>${money(today.premiumToday,4)}</b></div>
          <div class="mini cyan"><span>오늘 Credits</span><b>${money(today.creditsToday,4)}</b></div>
          <div class="mini"><span>24h 서버 비용</span><b>${money(today.cost24h,4)}</b></div>
          <div class="mini accent"><span>월말 예상</span><b>${num(today.projected) ? `${money(today.projected)} · ${Number(today.projectedPercent).toFixed(0)}%` : '리셋 시각 필요'}</b></div>
          <div class="mini"><span>월간 남은 권장</span><b>${money(today.monthlyLeft)}</b></div>
          <div class="mini"><span>프리미엄 남은 권장</span><b>${money(today.weeklyLeft)}</b></div>
          <div class="mini purple"><span>Reset Pass</span><b>${num(today.resetPasses) ? `${today.resetPasses}장${today.resetPassesExact ? '' : ' 기본'}` : 'API 미제공'}</b></div>
          <div class="mini accent"><span>월간 초기화</span><b>${Number.isFinite(today.monthEnd) ? `${remainingTimeForDashboard(today.monthEnd)} · ${dashboardDateText(today.monthEnd,true)}` : '서버 미제공'}</b></div>
          <div class="mini"><span>Bridge 상태</span><b>${esc(h.status || '—')} · ${esc(state.bridgeStatus)}</b></div>
        </div>
        <p>DevPass/Credits의 일간 총 사용량은 이 기기에서 그날 처음 확인한 서버 누적값 이후의 증가분이야.</p>
      </section>
      <section class="panel wide"><b>24h Activity</b><div class="minis"><div class="mini"><span>요청</span><b>${num(a?.requests24h)?`${a.requests24h}회`:'—'}</b></div><div class="mini"><span>비용</span><b>${money(a?.cost24h,4)}</b></div><div class="mini"><span>토큰</span><b>${num(a?.totalTokens24h)?Number(a.totalTokens24h).toLocaleString():'—'}</b></div><div class="mini"><span>오류율</span><b>${num(a?.errorRate24h)?`${Number(a.errorRate24h).toFixed(1)}%`:'—'}</b></div></div></section>
      <section class="panel wide">
        <div class="today-head"><div><b>24h Usage Scope</b><p style="margin:2px 0 0">${esc(scopeNames[scopeKey][1])}</p></div><span class="stamp">${scopeFetchedAt ? dashboardDateText(scopeFetchedAt) : ''}</span></div>
        <div class="scope-tabs" role="tablist" aria-label="24h Usage scope">
          ${[['all','전체'],['devpass','DevPass'],['credits','Credits']].map(([key,label]) => `<button class="scope-tab ${scopeKey===key?'active':''}" data-usage-scope="${key}">${label}</button>`).join('')}
        </div>
        ${scopeActivity ? `<div class="today-grid">
          <div class="mini accent"><span>24h 요청</span><b>${num(scopeActivity.totalRequests) ? `${Number(scopeActivity.totalRequests).toLocaleString()}회` : '—'}</b></div>
          <div class="mini"><span>24h 비용</span><b>${money(scopeActivity.totalCost,4)}</b></div>
          <div class="mini"><span>총 토큰</span><b>${num(scopeActivity.totalTokens) ? Number(scopeActivity.totalTokens).toLocaleString() : '—'}</b></div>
          <div class="mini"><span>입력 / 출력</span><b>${num(scopeActivity.inputTokens) || num(scopeActivity.outputTokens) ? `${num(scopeActivity.inputTokens)?Number(scopeActivity.inputTokens).toLocaleString():'—'} / ${num(scopeActivity.outputTokens)?Number(scopeActivity.outputTokens).toLocaleString():'—'}` : '—'}</b></div>
          <div class="mini"><span>오류</span><b>${num(scopeActivity.errorCount) ? `${Number(scopeActivity.errorCount).toLocaleString()}회 · ${num(scopeActivity.errorRate)?Number(scopeActivity.errorRate).toFixed(1):'0.0'}%` : (num(scopeActivity.errorRate) ? `${Number(scopeActivity.errorRate).toFixed(1)}%` : '—')}</b></div>
          <div class="mini"><span>Top Provider</span><b>${esc(scopeTopProvider)}</b></div>
          <div class="mini"><span>Top Model</span><b>${esc(scopeTopModel)}</b></div>
          ${scopeExtra}
        </div>` : `<p>Bridge snapshot에 ${esc(scopeNames[scopeKey][0])} 범위 데이터가 아직 없어.</p>`}
        ${d.usageScopes?.errors?.[scopeKey] ? `<p class="warn">Usage Scope · ${esc(d.usageScopes.errors[scopeKey])}</p>` : ''}
      </section>
      <section class="panel wide">
        <div class="today-head"><div><b>Analytics · 24h / 7d / 30d</b><p style="margin:2px 0 0">${esc(analyticsNames[analyticsScopeKey][1])}</p></div><span class="stamp">${analyticsFetchedAt ? dashboardDateText(analyticsFetchedAt) : ''}</span></div>
        <div class="scope-tabs" role="tablist" aria-label="Analytics scope">
          ${[['all','전체'],['devpass','DevPass'],['credits','Credits']].map(([key,label]) => `<button class="scope-tab ${analyticsScopeKey===key?'active':''}" data-analytics-scope="${key}">${label}</button>`).join('')}
        </div>
        ${analyticsW24 ? `<div class="today-grid">
          <div class="mini accent"><span>24h 요청</span><b>${num(analyticsW24.totalRequests) ? `${Number(analyticsW24.totalRequests).toLocaleString()}회` : '—'}</b></div>
          <div class="mini"><span>24h 비용</span><b>${money(analyticsW24.totalCost,4)}</b></div>
          <div class="mini"><span>총 토큰</span><b>${num(analyticsW24.totalTokens) ? Number(analyticsW24.totalTokens).toLocaleString() : '—'}</b></div>
          <div class="mini"><span>입력 / 출력</span><b>${num(analyticsW24.inputTokens) || num(analyticsW24.outputTokens) ? `${num(analyticsW24.inputTokens)?Number(analyticsW24.inputTokens).toLocaleString():'—'} / ${num(analyticsW24.outputTokens)?Number(analyticsW24.outputTokens).toLocaleString():'—'}` : '—'}</b></div>
          <div class="mini"><span>오류</span><b>${num(analyticsW24.errorCount) ? `${Number(analyticsW24.errorCount).toLocaleString()}회 · ${num(analyticsW24.errorRate)?Number(analyticsW24.errorRate).toFixed(1):'0.0'}%` : (num(analyticsW24.errorRate) ? `${Number(analyticsW24.errorRate).toFixed(1)}%` : '0회 · 0.0%')}</b></div>
          <div class="mini"><span>캐시</span><b>${num(analyticsW24.cacheCount) ? `${Number(analyticsW24.cacheCount).toLocaleString()}회 · ${num(analyticsW24.cacheRate)?Number(analyticsW24.cacheRate).toFixed(1):'0.0'}%` : (num(analyticsW24.cacheRate) ? `${Number(analyticsW24.cacheRate).toFixed(1)}%` : '0회 · 0.0%')}</b></div>
          <div class="mini"><span>7일 총 비용</span><b>${money(analyticsW7?.totalCost,4)}</b></div>
          <div class="mini"><span>7일 일평균</span><b>${num(analyticsAverages.dailyCost7d) ? `${money(analyticsAverages.dailyCost7d,4)}/일` : '—'}</b></div>
          <div class="mini"><span>30일 총 비용</span><b>${money(analyticsW30?.totalCost,4)}</b></div>
          <div class="mini"><span>Top Model</span><b>${esc(analyticsTopModel)}</b></div>
          <div class="mini"><span>Top Provider</span><b>${esc(analyticsTopProvider)}</b></div>
          ${analyticsExtra}
        </div>` : `<p>Bridge snapshot에 ${esc(analyticsNames[analyticsScopeKey][0])} 범위 데이터가 아직 없어.</p>`}
        ${d.analyticsScopes?.errors?.[analyticsScopeKey] ? `<p class="warn">Analytics · ${esc(d.analyticsScopes.errors[analyticsScopeKey])}</p>` : ''}
        ${analyticsBundle?.errors && Object.keys(analyticsBundle.errors).length ? `<p class="warn">기간 일부 실패 · ${esc(Object.entries(analyticsBundle.errors).map(([range,message])=>`${range}: ${message}`).join(' · '))}</p>` : ''}
      </section>
      <section class="panel wide"><b>Local Bridge</b>
        <label><span>Bridge URL</span><input id="bridge-base" value="${esc(state.bridgeBase)}"></label>
        <label><span>Bridge Token</span><textarea id="bridge-token" placeholder="저장된 값은 다시 표시하지 않음"></textarea></label>
        <label><span>갱신 주기</span><select id="refresh-ms">${[[15000,'15초'],[30000,'30초'],[60000,'1분'],[300000,'5분'],[0,'수동']].map(([v,l])=>`<option value="${v}" ${Number(state.refreshMs)===v?'selected':''}>${l}</option>`).join('')}</select></label>
        <label><span>STALE 기준</span><select id="stale-ms">${[[0,'사용 안 함 · Local JSON 기본'],[60000,'1분'],[300000,'5분'],[900000,'15분'],[1800000,'30분']].map(([v,l])=>`<option value="${v}" ${Number(state.staleAfterMs)===v?'selected':''}>${l}</option>`).join('')}</select></label>
        <label><span>미니 위젯</span><select id="widget-mode"><option value="compact" ${state.widgetMode!=='detailed'?'selected':''}>간편 · 오늘 사용량</option><option value="detailed" ${state.widgetMode==='detailed'?'selected':''}>상세 · 남은 양 + 오늘 사용량</option></select></label>
        <div class="actions"><button class="primary" id="connect">저장하고 연결</button><button id="refresh">지금 새로고침</button><button id="retry-now">백오프 초기화 + 재시도</button><button id="toggle">${state.widgetVisible===false?'위젯 보이기':'위젯 숨기기'}</button><button id="reset-position">위치 초기화</button></div>
        <p>상태 ${esc(state.bridgeStatus)} · ${age(state.lastSyncAt)}${num(state.lastSyncDurationMs)?` · ${state.lastSyncDurationMs}ms`:''}</p>${state.bridgeError?`<p class="warn">${esc(state.bridgeError)}</p>`:''}
      </section>
      <section class="panel wide"><b>Runtime Diagnostics</b><div class="minis"><div class="mini"><span>Protocol</span><b>${num(d.protocolVersion)?`v${d.protocolVersion}`:'—'}</b></div><div class="mini"><span>Health</span><b>${esc(h.status || '—')}</b></div><div class="mini"><span>원인</span><b>${esc(state.lastRefreshReason || '—')}</b></div><div class="mini"><span>성공</span><b>${Number(state.refreshCount||0)}회</b></div></div><p>Updater · GitHub HTTPS · ${VERSION}</p><p>Performance Guard · ${state.performanceGuard===false?'off':performanceRuntime.mode} · 실효 갱신 ${effectiveRefreshMs()?Math.round(effectiveRefreshMs()/1000)+'초':'수동'} · ×${Number(performanceRuntime.adaptiveMultiplier||1)} · timer-only</p><p>UI Stall Probe · ${performanceRuntime.uiStallProbeActive?'active':'paused'} · ≥50ms ${Number(performanceRuntime.uiStallCount50||0)}회 · ≥100ms ${Number(performanceRuntime.uiStallCount100||0)}회 · ≥200ms ${Number(performanceRuntime.uiStallCount200||0)}회 · max ${roundPerfMs(performanceRuntime.uiStallMaxMs)||0}ms</p><p>Resume Diagnostics · ${Number(performanceRuntime.resumeEvents||0)}회 · ${performanceRuntime.lastResumeReason||'대기'} · main-thread ${num(performanceRuntime.lastResumeMainThreadLagMs)?roundPerfMs(performanceRuntime.lastResumeMainThreadLagMs)+'ms':'—'} · Long Task ${performanceRuntime.longTaskSupported?(Number(performanceRuntime.resumeLongTaskCount||0)+'회'):'미지원'}</p><p>Resume Input · first ${num(performanceRuntime.lastResumeFirstInputAfterMs)?roundPerfMs(performanceRuntime.lastResumeFirstInputAfterMs)+'ms':'—'} · event delay ${num(performanceRuntime.lastResumeInputDelayMs)?roundPerfMs(performanceRuntime.lastResumeInputDelayMs)+'ms':'—'} · frame ${num(performanceRuntime.lastResumeFrameDelayMs)?roundPerfMs(performanceRuntime.lastResumeFrameDelayMs)+'ms':'—'} · refresh overlap ${performanceRuntime.lastResumeInputDuringRefresh?'yes':'no'}</p><p>Resume Grace · ${performanceRuntime.resumePending?'pending':'idle'} · delay ${num(performanceRuntime.lastResumeDelayMs)?Number(performanceRuntime.lastResumeDelayMs)+'ms':'—'} · deferred ${Number(performanceRuntime.resumeDeferred||0)}회 · coalesced ${Number(performanceRuntime.resumeCoalesced||0)}회</p><p>Scheduler · ${refreshSchedulerState.pending?'pending':(refreshSchedulerState.running?'running':'idle')} · queued ${Number(performanceRuntime.schedulerQueued||0)} · merged ${Number(performanceRuntime.schedulerMerged||0)} · executed ${Number(performanceRuntime.schedulerExecuted||0)} · interaction defer ${Number(performanceRuntime.schedulerDeferredForInteraction||0)}</p><p>Render · widget ${num(performanceRuntime.lastRenderMs)?roundPerfMs(performanceRuntime.lastRenderMs)+'ms':'—'} · panel ${num(performanceRuntime.lastPanelRenderMs)?roundPerfMs(performanceRuntime.lastPanelRenderMs)+'ms':'—'} · spike ≥${RENDER_SPIKE_THRESHOLD_MS}ms ${Number(performanceRuntime.renderSpikeCount||0)}회</p><p>Panel Render · ${panelRenderTimer || panelIdleHandle !== null?'pending':'idle'} · coalesced ${Number(performanceRuntime.panelRenderCoalesced||0)}회 · interaction defer 750ms</p><div class="actions"><button id="copy-diag">진단 복사</button><button id="export-json">JSON 내보내기</button></div></section>
    </main></div>`;
  }

  function cancelPanelRender() {
    if (panelRenderTimer) clearTimeout(panelRenderTimer);
    panelRenderTimer = null;
    if (panelIdleHandle !== null && typeof window?.cancelIdleCallback === 'function') {
      try { window.cancelIdleCallback(panelIdleHandle); } catch (_) {}
    }
    panelIdleHandle = null;
  }

  // DevPass 2.7.3 panel rendering policy: collapse automatic panel refreshes,
  // wait briefly while the user is interacting, then prefer an idle callback.
  function schedulePanelRender(force = false) {
    if (document.body?.dataset?.panelOpen !== '1') return;
    if (state.backgroundPause !== false && document.visibilityState === 'hidden') return;
    if (force) { renderSettings(); return; }
    if (panelRenderTimer || panelIdleHandle !== null) {
      performanceRuntime.panelRenderCoalesced += 1;
      return;
    }
    const interacting = Date.now() - Number(performanceRuntime.lastInteractionAt || 0) < 700;
    const delay = state.performanceGuard !== false && interacting ? 750 : 0;
    panelRenderTimer = setTimeout(() => {
      panelRenderTimer = null;
      const run = () => {
        panelIdleHandle = null;
        if (document.body?.dataset?.panelOpen === '1' && document.visibilityState !== 'hidden') renderSettings();
      };
      if (state.performanceGuard !== false && typeof window?.requestIdleCallback === 'function') {
        panelIdleHandle = window.requestIdleCallback(run, {timeout:500});
      } else {
        run();
      }
    }, delay);
  }

  function renderSettings() {
    const startedPerf = typeof performance?.now === 'function' ? performance.now() : Date.now();
    document.body.innerHTML = settingsHtml();
    bindSettings();
    const endedPerf = typeof performance?.now === 'function' ? performance.now() : Date.now();
    const duration = Math.max(0, endedPerf - startedPerf);
    performanceRuntime.lastPanelRenderMs = roundPerfMs(duration);
    noteRenderSpike(duration, 'panel', startedPerf, endedPerf, {panel:roundPerfMs(duration)});
  }

  function bindSettings() {
    const q = s => document.querySelector(s);
    if (q('#close')) q('#close').onclick = () => Risuai.hideContainer();
    if (q('#connect')) q('#connect').onclick = async () => {
      try {
        state.bridgeBase = normalizeBridgeBase(q('#bridge-base')?.value || DEFAULT_BRIDGE);
        state.refreshMs = Number(q('#refresh-ms')?.value ?? state.refreshMs);
        state.staleAfterMs = Math.max(0, Number(q('#stale-ms')?.value ?? state.staleAfterMs));
        state.stalePolicyV37Migrated = true;
        state.widgetMode = q('#widget-mode')?.value === 'detailed' ? 'detailed' : 'compact';
        const entered = String(q('#bridge-token')?.value || '').trim();
        if (entered) { token = entered; await store.setItem(TOKEN_KEY, token); }
        if (!token) throw new Error('Bridge Token이 필요해.');
        state.bridgeEnabled = true; state.bridgeStatus = 'connecting'; await persist(); scheduleRefresh(); await enqueueRefresh('connect');
      } catch (e) { state.bridgeStatus='error'; state.bridgeError=e?.message||String(e); await persist(); await renderWidget(); renderSettings(); }
    };
    document.querySelectorAll('[data-usage-scope]').forEach(button => {
      button.onclick = async () => {
        const next = String(button.getAttribute('data-usage-scope') || 'all');
        state.usageScopeView = ['all','devpass','credits'].includes(next) ? next : 'all';
        await persist();
        renderSettings();
      };
    });
    document.querySelectorAll('[data-analytics-scope]').forEach(button => {
      button.onclick = async () => {
        const next = String(button.getAttribute('data-analytics-scope') || 'all');
        state.analyticsScopeView = ['all','devpass','credits'].includes(next) ? next : 'all';
        await persist();
        renderSettings();
      };
    });
    if (q('#refresh')) q('#refresh').onclick = () => enqueueRefresh('manual');
    if (q('#retry-now')) q('#retry-now').onclick = async () => {
      state.consecutiveFailures = 0;
      state.retryDelayMs = 0;
      state.nextRetryAt = null;
      await persist();
      scheduleRefresh();
      await enqueueRefresh('manual-retry');
    };
    if (q('#toggle')) q('#toggle').onclick = async () => { state.widgetVisible = state.widgetVisible === false; await persist(); await renderWidget(); renderSettings(); };
    if (q('#reset-position')) q('#reset-position').onclick = async () => {
      state.widgetX = null;
      state.widgetY = null;
      drag = null;
      await persist();
      if (widget) {
        await widget.setStyle('left','auto');
        await widget.setStyle('top','auto');
        await widget.setStyle('right','12px');
        await widget.setStyle('bottom','74px');
      }
      await renderWidget();
      renderSettings();
    };
    if (q('#stale-ms')) q('#stale-ms').onchange = async e => { state.staleAfterMs = Math.max(0, Number(e.target.value)||0); state.stalePolicyV37Migrated = true; await persist(); await renderWidget(); renderSettings(); };
    if (q('#widget-mode')) q('#widget-mode').onchange = async e => { state.widgetMode = e.target.value === 'detailed' ? 'detailed' : 'compact'; await persist(); await renderWidget(); };
    if (q('#copy-diag')) q('#copy-diag').onclick = async e => { const b=e.currentTarget, old=b.textContent; b.textContent=(await copyDiag())?'복사됨 ✓':'복사 실패'; setTimeout(()=>b.textContent=old,1200); };
    if (q('#export-json')) q('#export-json').onclick = () => {
      const payload = {
        exportedAt: new Date().toISOString(),
        plugin: {name:'Local Usage Dashboard', version:VERSION},
        usage: state.data || null,
        dailyUsage: state.dailyUsage || null,
        creditDailyUsage: state.creditDailyUsage || null,
        sync: {
          bridgeBase: state.bridgeBase || DEFAULT_BRIDGE,
          bridgeEnabled: state.bridgeEnabled === true,
          bridgeStatus: state.bridgeStatus || 'off',
          refreshMs: Number(state.refreshMs || 0),
          lastSyncAt: state.lastSyncAt || null,
          lastSyncDurationMs: state.lastSyncDurationMs ?? null,
          lastRefreshReason: state.lastRefreshReason || '',
          refreshCount: Number(state.refreshCount || 0),
          failures: Number(state.consecutiveFailures || 0),
          error: state.bridgeError || ''
        }
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
      const a = document.createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `local-usage-dashboard-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    };
  }

  async function openSettings() { document.body.dataset.panelOpen='1'; renderSettings(); await Risuai.showContainer('fullscreen'); }

  function widgetHtml() {
    const d=state.data||{}, m=d.monthly, w=d.weekly, c=d.credits, a=d.activity, detailed=state.widgetMode==='detailed';
    const badge=connectionBadge();
    const main = b => detailed ? money(b?.remaining) : (num(b?.todayUsed) ? money(b.todayUsed,4) : money(b?.remaining));
    const row = (label,value,color) => `<div style="display:flex;justify-content:space-between;gap:8px"><span style="color:${color}">${esc(label)}</span><b>${value}</b></div>`;
    const remainingTimeText = value => {
      const timestamp = resetTimestamp(value);
      if (!Number.isFinite(timestamp)) return '—';
      const diff = timestamp - Date.now();
      if (diff <= 0) return '곧 초기화';
      const totalMinutes = Math.ceil(diff / 60000);
      const days = Math.floor(totalMinutes / 1440);
      const hours = Math.floor((totalMinutes % 1440) / 60);
      const minutes = totalMinutes % 60;
      if (days > 0) return `${days}일 ${hours}시간 ${minutes}분`;
      if (hours > 0) return `${hours}시간 ${minutes}분`;
      return `${minutes}분`;
    };
    const tokenText = value => {
      if (!num(value)) return '—';
      const n = Number(value);
      if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(n >= 1e10 ? 1 : 2)}B`;
      if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2)}M`;
      if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 1 : 2)}K`;
      return `${Math.round(n)}`;
    };
    const monthlySub = detailed
      ? `오늘 ${money(m?.todayUsed,4)}${m?.resetAt ? ` · 월간 ${remainingTimeText(m.resetAt)}` : ''}`
      : '';
    const premiumSub = detailed
      ? `오늘 ${money(w?.todayUsed,4)}${w?.resetAt ? ` · 주간 ${remainingTimeText(w.resetAt)}` : ''}${num(w?.resetPasses) ? ` · 패스 ${Number(w.resetPasses)}장` : ''}`
      : '';
    const creditsSub = detailed
      ? `오늘 ${money(c?.todayUsed,4)}${num(c?.balance) ? ` · 잔액 ${money(c.balance)}` : ''}`
      : '';
    return `<div style="font:12px/1.35 system-ui,-apple-system,'Segoe UI',sans-serif;color:#f5f7fa">
      <div data-drag-handle="1" style="height:12px;background:linear-gradient(rgba(255,255,255,.25),rgba(255,255,255,.25)) center/28px 3px no-repeat;cursor:grab"></div>
      <div style="display:flex;justify-content:flex-end;margin:-2px 0 4px">
        <span style="font-size:9px;font-weight:800;letter-spacing:.05em;color:${badge.color};border:1px solid ${badge.color};border-radius:99px;padding:1px 5px">${badge.label}</span>
      </div>
      ${row(detailed?'월간 남음':(m?.label||'월간'),main(m),'#aeb5c0')}${detailed?`<div style="color:#7f8792;font-size:11px;font-weight:600;line-height:1.3;font-variant-numeric:tabular-nums;white-space:nowrap">${monthlySub}</div>`:''}
      <div style="height:4px;background:#2d3138;border-radius:99px;overflow:hidden;margin:5px 0 7px"><i style="display:block;height:100%;width:${m?pct(100-Number(m.percent||0)):0}%;background:#c5f277"></i></div>
      ${row(detailed?'프리미엄 남음':(w?.label||'주간'),main(w),'#b7add0')}${detailed?`<div style="color:#7f8792;font-size:11px;font-weight:600;line-height:1.3;font-variant-numeric:tabular-nums;white-space:nowrap">${premiumSub}</div>`:''}
      <div style="height:4px;background:#2d3138;border-radius:99px;overflow:hidden;margin:5px 0 7px"><i style="display:block;height:100%;width:${w?pct(100-Number(w.percent||0)):0}%;background:#b9a6f8"></i></div>
      ${row(detailed?'크레딧':(c?.label||'Credits'),detailed?money(c?.balance):(num(c?.todayUsed)?money(c.todayUsed,4):money(c?.balance)),'#9fc9df')}${detailed?`<div style="color:#7f8792;font-size:11px;font-weight:600;line-height:1.3;font-variant-numeric:tabular-nums;white-space:nowrap">${creditsSub}</div>`:''}
      ${detailed && a ? `<div style="color:#8e96a2;font-size:10px;font-weight:650;line-height:1.35;border-top:1px solid rgba(255,255,255,.09);margin-top:7px;padding-top:6px;font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right">24h ${num(a.requests24h)?`${a.requests24h}회`:'—'} · ${money(a.cost24h,4)} · ${tokenText(a.totalTokens24h)} tok${state.lastSyncAt?` · LIVE ${age(state.lastSyncAt)} 동기화`:''}</div>`:''}
      <div style="display:flex;justify-content:space-between;gap:8px;color:#7f8792;font-size:10px;margin-top:5px">
        <span>${state.bridgeStatus==='error'?'마지막 정상값 유지':dataIsStale()?`스냅샷 ${age(d.fetchedAt)}`:'자동 갱신'}</span>
        <span>${age(state.lastSyncAt)} · ${VERSION}</span>
      </div>
    </div>`;
  }

  const widgetWidth = () => state.widgetMode === 'detailed' ? 'clamp(196px,52vw,220px)' : 'clamp(166px,44vw,184px)';

  async function ensureWidget() {
    if (widget) return;
    if (!(await Risuai.requestPluginPermission('mainDom'))) return;
    const root = await Risuai.getRootDocument();
    rootBody = await root.querySelector('body');
    widget = await root.createElement('div');
    const pos = num(state.widgetX)&&num(state.widgetY)?`left:${state.widgetX}px;top:${state.widgetY}px;`:'right:12px;bottom:74px;';
    await widget.setStyleAttribute(`position:fixed;${pos}width:${widgetWidth()};max-width:calc(100vw - 16px);z-index:2147483000;background:#191b20;color:#f5f7fa;border:1px solid rgba(255,255,255,.12);border-radius:11px;box-shadow:0 6px 18px rgba(0,0,0,.24);padding:5px 10px 8px;box-sizing:border-box;user-select:none;touch-action:none;`);
    await rootBody.appendChild(widget);
    const down = async e => {
      if (!num(e.clientX)||!num(e.clientY)) return;
      const r=await widget.getBoundingClientRect();

      // Drag can begin only from the thin handle at the top of the widget.
      // This prevents normal taps/clicks on the widget or surrounding UI from
      // accidentally starting a drag session.
      const localY = Number(e.clientY) - r.top;
      if (localY < 0 || localY > 18) {
        drag = null;
        return;
      }

      drag={
        pointerId: e.pointerId ?? null,
        ox:Number(e.clientX)-r.left,
        oy:Number(e.clientY)-r.top,
        maxX:Math.max(8,(await rootBody.clientWidth())-r.width-8),
        maxY:Math.max(8,(await rootBody.clientHeight())-r.height-8)
      };
    };
    const move = async e => {
      if (!drag||!num(e.clientX)||!num(e.clientY)) return;
      if (drag.pointerId !== null && e.pointerId !== undefined && e.pointerId !== drag.pointerId) return;
      state.widgetX=Math.max(8,Math.min(drag.maxX,Number(e.clientX)-drag.ox));
      state.widgetY=Math.max(8,Math.min(drag.maxY,Number(e.clientY)-drag.oy));
      await widget.setStyle('left',`${state.widgetX}px`);
      await widget.setStyle('top',`${state.widgetY}px`);
      await widget.setStyle('right','auto');
      await widget.setStyle('bottom','auto');
    };
    const up = async e => {
      if (!drag) return;
      if (drag.pointerId !== null && e?.pointerId !== undefined && e.pointerId !== drag.pointerId) return;
      drag=null;
      await persist();
    };
    remoteListeners.push([widget,'pointerdown',await widget.addEventListener('pointerdown',down)],[root,'pointermove',await root.addEventListener('pointermove',move)],[root,'pointerup',await root.addEventListener('pointerup',up)],[root,'pointercancel',await root.addEventListener('pointercancel',up)]);
  }

  async function renderWidget(reason = 'ui') {
    const nowPerf = () => typeof performance?.now === 'function' ? performance.now() : Date.now();
    const startedPerf = nowPerf();
    const breakdown = {};
    performanceRuntime.activeRenderStartedPerf = startedPerf;
    performanceRuntime.activeRenderReason = String(reason || 'ui');
    performanceRuntime.lastRenderStartedPerf = startedPerf;
    performanceRuntime.lastRenderReason = String(reason || 'ui');
    try {
      let phaseStarted = nowPerf();
      await ensureWidget();
      breakdown.ensure = roundPerfMs(nowPerf() - phaseStarted);
      if (!widget) return;
      phaseStarted = nowPerf();
      await widget.setStyle('width',widgetWidth());
      await widget.setStyle('display',state.widgetVisible===false?'none':'block');
      breakdown.style = roundPerfMs(nowPerf() - phaseStarted);
      if (state.widgetVisible!==false) {
        phaseStarted = nowPerf();
        await widget.setInnerHTML(widgetHtml());
        breakdown.html = roundPerfMs(nowPerf() - phaseStarted);
      }
    } finally {
      const endedPerf = nowPerf();
      const duration = Math.max(0, endedPerf - startedPerf);
      breakdown.total = roundPerfMs(duration);
      performanceRuntime.lastRenderMs = roundPerfMs(duration);
      performanceRuntime.lastRenderEndedPerf = endedPerf;
      performanceRuntime.lastRenderBreakdown = {...breakdown};
      noteRenderSpike(duration, performanceRuntime.lastRenderReason, startedPerf, endedPerf, breakdown);
      performanceRuntime.activeRenderStartedPerf = 0;
      performanceRuntime.activeRenderReason = '';
    }
  }

  function resetTimestamp(value) {
  if (value === null || value === undefined || value === '') return null;
  if (num(value)) {
    const n = Number(value);
    return n > 0 && n < 1000000000000 ? n * 1000 : n;
  }
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function scheduleResetSync() {
  if (resetSyncTimer) clearTimeout(resetSyncTimer);
  resetSyncTimer = null;
  if (!state?.bridgeEnabled || !token || !state?.data) return;
  const now = Date.now();
  const resetCandidates = [
    resetTimestamp(state.data.monthly?.resetAt),
    resetTimestamp(state.data.weekly?.resetAt)
  ].filter(value => Number.isFinite(value) && value > now);
  if (!resetCandidates.length) return;
  const nextReset = Math.min(...resetCandidates);
  const delay = Math.min(2147480000, Math.max(1000, nextReset - now + 3000));
  resetSyncTimer = setTimeout(async () => {
    resetSyncTimer = null;
    if (nextReset - Date.now() > 5000) {
      scheduleResetSync();
      return;
    }
    await enqueueRefresh('reset', true);
  }, delay);
}

  function scheduleRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer); refreshTimer=null;
    scheduleResetSync();
    const baseMs=Math.max(0,Number(state.refreshMs)||0);
    if (!baseMs||!state.bridgeEnabled||(state.backgroundPause!==false&&document.visibilityState==='hidden')) return;
    const adaptiveMs=effectiveRefreshMs();
    const ms = state.bridgeStatus === 'error' && Number(state.consecutiveFailures||0) > 0
      ? Math.max(adaptiveMs, Number(state.retryDelayMs)||adaptiveMs)
      : adaptiveMs;
    if (state.bridgeStatus === 'error') state.nextRetryAt = Date.now() + ms;
    refreshTimer=setTimeout(async()=>{try{await enqueueRefresh('timer',true);}finally{scheduleRefresh();}},ms);
  }

  function installLifecycle() {
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
      const interaction = event => markPerformanceInteraction(event);
      document.addEventListener(type, interaction, {passive:true});
      domListeners.push([document,type,interaction]);
    }
    startUiStallProbe();
  }

  try {
    store=await Risuai.getLocalPluginStorage();
    state={...DEFAULTS,...((await store.getItem(STATE_KEY))||{})};
    await importLegacyTodayBaselines();
    if (state.stalePolicyV37Migrated !== true) {
      if (Number(state.staleAfterMs) === 300000) state.staleAfterMs = 0;
      state.stalePolicyV37Migrated = true;
      await store.setItem(STATE_KEY,state);
    }
    try{state.bridgeBase=normalizeBridgeBase(state.bridgeBase);}catch(_){state.bridgeBase=DEFAULT_BRIDGE;state.bridgeEnabled=false;}
    token=String((await store.getItem(TOKEN_KEY))||'').trim();
    // Use the same registerSetting path as SimCore so Usage appears in the same quick-menu section.
    // With the current plugin load order this places Usage directly after SimCore.
    uiParts.push(await Risuai.registerSetting('Usage',openSettings,'📊','html'));
    await renderWidget(); installLifecycle(); scheduleRefresh(); if(state.bridgeEnabled&&token)enqueueRefresh('init',true);
    await Risuai.onUnload(async()=>{
      if(refreshTimer)clearTimeout(refreshTimer);
      if(resetSyncTimer)clearTimeout(resetSyncTimer);
      cancelPanelRender();
      cancelRefreshScheduler();
      cancelResumeRefresh();
      stopResumeLongTaskObserver();
      stopUiStallProbe();
      for(const [t,ty,id] of remoteListeners.splice(0)){try{await t.removeEventListener(ty,id);}catch(_){}}
      for(const [t,ty,fn] of domListeners.splice(0)){try{t.removeEventListener(ty,fn);}catch(_){}}
      if(widget){try{await widget.remove();}catch(_){}}
      for(const p of uiParts)if(p?.id){try{await Risuai.unregisterUIPart(p.id);}catch(_){}}
    });
  } catch(e) { console.log(`[Local Usage Dashboard] init failed: ${e?.message||e}`); }
})();