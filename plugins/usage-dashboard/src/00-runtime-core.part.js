//@name local_usage_dashboard_modular
//@display-name Local Usage Dashboard
//@version 3.0.0-alpha.4.5
//@api 3.0
//@update-url https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-usage-dashboard/plugins/usage-dashboard/latest.js

(async () => {
  'use strict';

  const VERSION = '3.0.0-alpha.4.5';
  const UPDATE_URL = 'https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-usage-dashboard/plugins/usage-dashboard/latest.js';
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
  const REQUIRED_BRIDGE_VERSION = '1.6.1';
  const SNAPSHOT_SCHEMA_VERSION = 1;
  const RECENT_REQUEST_SCHEMA_VERSION = 1;
  const DEFAULTS = {
    bridgeBase: DEFAULT_BRIDGE, bridgeEnabled: false, bridgeStatus: 'off', bridgeError: '',
    refreshMs: 15000, backgroundPause: true, syncOnFocus: true, performanceGuard: true, adaptiveRefresh: true, schedulerEnabled: true,
    staleAfterMs: 0, stalePolicyV37Migrated: false,
    widgetVisible: true, widgetMode: 'compact', widgetX: null, widgetY: null,
    usageScopeView: 'all',
    recentRequestFilter: 'all',
    analyticsScopeView: 'all',
    lastSyncAt: null, lastSyncDurationMs: null, lastRefreshReason: '', refreshCount: 0,
    consecutiveFailures: 0, retryDelayMs: 0, nextRetryAt: null,
    dailyUsage: null, creditDailyUsage: null,
    runtimeStatus: null,
    data: null
  };

  let store, state, token = '', refreshTimer = null, resetSyncTimer = null, refreshInFlight = null;
  let refreshSchedulerTimer = null, refreshSchedulerIdleHandle = null;
  let panelRenderTimer = null, panelIdleHandle = null;
  let uiStallProbeTimer = null, resumeProbeTimer = null, resumeMeasureTimer = null, resumeRefreshTimer = null, resumeLongTaskObserver = null;
  let widget = null, rootBody = null, drag = null;
  let widgetRenderCache = {html:null,width:null,display:null};
  const performanceRuntime = {adaptiveMultiplier:1,slowRefreshes:0,fastRefreshes:0,mode:'normal',timerSamples:0,ignoredSamples:0,lastSampleReason:'',lastSampleDurationMs:null,activeRefreshStartedPerf:0,activeRefreshReason:'',lastRefreshStartedPerf:0,lastRefreshEndedPerf:0,uiStallCount50:0,uiStallCount100:0,uiStallCount200:0,uiStallMaxMs:0,uiStallSamples:[],lastUiStallMs:null,lastUiStallAt:null,lastUiStallRefreshOverlap:false,lastUiStallRenderOverlap:false,lastUiStallRenderReason:'',lastUiStallRenderMs:null,uiStallProbeActive:false,lastInteractionAt:0,resumeEvents:0,resumeCoalesced:0,resumeDeferred:0,resumePending:false,resumeStartedAt:0,lastResumeDelayMs:null,resumeMeasurePending:false,resumeInputCaptured:false,resumeVisiblePerf:0,lastResumeVisibleAt:null,lastResumeReason:'',lastResumeFirstInputAfterMs:null,lastResumeInputDelayMs:null,lastResumeFrameDelayMs:null,lastResumeRefreshStartedAfterMs:null,lastResumeRefreshMs:null,lastResumeRenderMs:null,lastResumeHadRefreshAtEntry:false,lastResumeRequestedReason:'',lastResumeActualReason:'',lastResumeRefreshWasCoalesced:false,lastResumeCoalescedIntoReason:'',resumeRefreshSamples:[],lastResumeInputDuringRefresh:false,lastResumeMainThreadLagMs:null,lastResumeProbeAfterMs:null,lastResumeProbeDuringRefresh:false,longTaskSupported:false,lastResumeLongTaskMs:null,lastResumeLongTaskStartedAfterMs:null,lastResumeLongTaskDuringRefresh:false,resumeLongTaskCount:0,resumeInputDelaySamples:[],resumeFrameDelaySamples:[],resumeMainThreadLagSamples:[],resumeLongTaskSamples:[],schedulerQueued:0,schedulerMerged:0,schedulerExecuted:0,schedulerDeferredForInteraction:0,panelRenderCoalesced:0,panelRenderSkippedClosed:0,widgetHtmlWrites:0,widgetHtmlSkips:0,widgetStyleWrites:0,widgetStyleSkips:0,runtimeState:'active',runtimeStateChangedAt:Date.now(),runtimeTransitions:0,lastHealthySyncAt:null,degradedSince:null,lastRenderMs:null,lastPanelRenderMs:null,lastRenderReason:'',lastRenderStartedPerf:0,lastRenderEndedPerf:0,activeRenderStartedPerf:0,activeRenderReason:'',lastRenderBreakdown:null,renderSpikeCount:0,renderSpikeSamples:[],lastRenderSpikeMs:null,lastRenderSpikeAt:null,lastRenderSpikeReason:'',lastRenderSpikeRefreshOverlap:false,lastRenderSpikeBreakdown:null};
  const uiParts = [], remoteListeners = [], domListeners = [];

  const num = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
  const money = (v, d = 2) => num(v) ? `$${Number(v).toFixed(d)}` : '—';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const pct = v => Number.isFinite(Number(v)) ? Math.max(0, Math.min(100, Number(v))) : 0;


  function hydrateState(saved) {
    return {...DEFAULTS,...(saved && typeof saved === 'object' ? saved : {})};
  }

  function normalizeBridgeError(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'string' || typeof value === 'number') {
      return {code:'', type:'', message:String(value)};
    }
    if (typeof value !== 'object') return {code:'', type:'', message:String(value)};
    const nested = value.error && typeof value.error === 'object' ? value.error : null;
    const codeRaw = value.code ?? value.errorCode ?? value.error_code ?? value.statusCode ?? value.status_code ?? nested?.code ?? '';
    const typeRaw = value.type ?? value.errorType ?? value.error_type ?? nested?.type ?? '';
    const messageRaw = value.message ?? (typeof value.error === 'string' ? value.error : null) ?? nested?.message ?? '';
    const code = codeRaw === null || codeRaw === undefined ? '' : String(codeRaw);
    const type = typeRaw === null || typeRaw === undefined ? '' : String(typeRaw);
    const message = messageRaw === null || messageRaw === undefined ? '' : String(messageRaw);
    return (code || type || message) ? {code, type, message} : null;
  }

  function normalizeErrorMap(raw) {
    if (!raw || typeof raw !== 'object') return {};
    const out = {};
    for (const [key, value] of Object.entries(raw)) {
      const normalized = normalizeBridgeError(value);
      if (normalized) out[key] = normalized;
    }
    return out;
  }

  function errorSummaryText(value) {
    const normalized = normalizeBridgeError(value);
    if (!normalized) return '';
    return [normalized.code, normalized.type, normalized.message].filter(Boolean).join(' · ') || '오류';
  }

  function countErrorMap(raw) {
    if (!raw || typeof raw !== 'object') return 0;
    return Object.values(raw).filter(value => Boolean(normalizeBridgeError(value))).length;
  }

  function usageCacheText(scope) {
    const hasCount = num(scope?.cacheCount);
    const hasRate = num(scope?.cacheRate);
    if (!hasCount && !hasRate) return '—';
    return [
      hasCount ? `${Number(scope.cacheCount).toLocaleString()}회` : '',
      hasRate ? `${Number(scope.cacheRate).toFixed(1)}%` : ''
    ].filter(Boolean).join(' · ');
  }

  function normalizeBridgeModule(name, row) {
    if (!row || typeof row !== 'object') return null;
    const error = normalizeBridgeError(row.error || {
      code: row.errorCode ?? row.error_code ?? '',
      type: row.errorType ?? row.error_type ?? '',
      message: row.errorMessage ?? row.error_message ?? ''
    });
    const status = String(row.status || row.state || (error ? 'error' : 'ok')).toLowerCase() || 'unknown';
    const fetchedAt = bridgeTimestamp(row.fetchedAt ?? row.updatedAt ?? row.updated_at ?? row.lastUpdatedAt ?? row.completedAt);
    const durationRaw = row.durationMs ?? row.duration_ms ?? row.elapsedMs ?? row.elapsed_ms ?? row.latencyMs ?? row.tookMs;
    return {
      name:String(name || row.name || 'module'),
      status,
      stale:row.stale === true || status === 'stale',
      fetchedAt,
      durationMs:num(durationRaw) ? Math.max(0, Number(durationRaw)) : null,
      errorCode:String(row.errorCode ?? row.error_code ?? error?.code ?? ''),
      errorType:String(row.errorType ?? row.error_type ?? error?.type ?? ''),
      errorMessage:String(row.errorMessage ?? row.error_message ?? error?.message ?? '')
    };
  }

  function normalizeBridgeModules(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const out = {};
    for (const [name, row] of Object.entries(raw)) {
      const normalized = normalizeBridgeModule(name, row);
      if (normalized) out[name] = normalized;
    }
    return Object.keys(out).length ? out : null;
  }

  function bridgeSemver(value) {
    const match = String(value || '').match(/(?:^|[^0-9])(\d+)\.(\d+)\.(\d+)(?:[^0-9]|$)/);
    return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
  }

  function bridgeCompatibleVersion(value, compatibility = null) {
    if (typeof compatibility?.compatible === 'boolean') return compatibility.compatible;
    const current = bridgeSemver(value);
    const required = bridgeSemver(REQUIRED_BRIDGE_VERSION);
    if (!current || !required) return null;
    for (let i = 0; i < 3; i += 1) {
      if (current[i] > required[i]) return true;
      if (current[i] < required[i]) return false;
    }
    return true;
  }

  function bridgeTimestamp(value) {
    if (value === null || value === undefined || value === '') return null;
    if (num(value)) {
      const n = Number(value);
      return n > 0 && n < 1e12 ? n * 1000 : n;
    }
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function normalizeBridgeMetadata(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const version = String(raw.bridgeVersion || raw.version || '');
    const compatibility = raw.compatibility && typeof raw.compatibility === 'object' ? raw.compatibility : null;
    const modules = normalizeBridgeModules(raw.modules);
    const diagnostics = raw.diagnostics && typeof raw.diagnostics === 'object' ? raw.diagnostics : null;
    const protocolVersion = num(raw.protocolVersion) ? Number(raw.protocolVersion) : null;
    const fetchedAt = bridgeTimestamp(raw.fetchedAt) || Date.now();
    if (!version && !compatibility && !modules && !diagnostics && raw.__bridgeSnapshot !== true) return null;
    return {
      version,
      protocolVersion,
      compatibility,
      compatible: bridgeCompatibleVersion(version, compatibility),
      modules,
      diagnostics,
      fetchedAt
    };
  }

  function bridgeStabilitySnapshot() {
    const bridge = state?.data?.bridge || null;
    const modules = bridge?.modules && typeof bridge.modules === 'object' ? bridge.modules : null;
    const moduleRows = modules ? Object.values(modules).filter(row => row && typeof row === 'object') : [];
    const diagnostics = bridge?.diagnostics && typeof bridge.diagnostics === 'object' ? bridge.diagnostics : null;
    const cache = diagnostics?.cache && typeof diagnostics.cache === 'object' ? diagnostics.cache : null;
    const cli = diagnostics?.cli && typeof diagnostics.cli === 'object' ? diagnostics.cli : null;
    const circuits = diagnostics?.circuits && typeof diagnostics.circuits === 'object' ? diagnostics.circuits : null;
    const circuitStats = diagnostics?.circuitStats && typeof diagnostics.circuitStats === 'object' ? diagnostics.circuitStats : null;
    const moduleError = row => {
      const status = String(row?.status || '').toLowerCase();
      return ['error','open','partial'].includes(status) || Boolean(row?.errorCode) || Boolean(row?.errorType) || Boolean(row?.errorMessage);
    };
    const partialModules = modules ? moduleRows.filter(row => String(row?.status || '').toLowerCase() === 'partial').length : null;
    const slowestModule = moduleRows.filter(row => num(row?.durationMs)).sort((a,b) => Number(b.durationMs) - Number(a.durationMs))[0] || null;
    const numeric = value => num(value) ? Number(value) : null;
    return {
      version: bridge?.version || '',
      compatible: typeof bridge?.compatible === 'boolean' ? bridge.compatible : null,
      fetchedAt: bridge?.fetchedAt || null,
      moduleCount: modules ? Object.keys(modules).length : null,
      staleModules: modules ? moduleRows.filter(row => row?.stale === true).length : null,
      errorModules: modules ? moduleRows.filter(moduleError).length : null,
      partialModules,
      moduleDetails:moduleRows,
      slowestModule,
      cacheHitRate: numeric(cache?.hitRate),
      cacheEntries: numeric(cache?.entries ?? diagnostics?.cacheEntries),
      inFlight: numeric(cache?.inFlight ?? diagnostics?.inFlight),
      staleFallbacks: numeric(cache?.staleFallbacks),
      cliActive: numeric(cli?.active),
      cliQueued: numeric(cli?.queued),
      openCircuits: circuits ? Object.values(circuits).filter(row => String(row?.state || '').toLowerCase() === 'open').length : null,
      circuitRecoveries: numeric(circuitStats?.recoveries)
    };
  }


  function bridgeModuleFreshnessText(details) {
    const rows = (Array.isArray(details) ? details : []).filter(row => row?.fetchedAt);
    if (!rows.length) return '—';
    return rows.slice(0, 8).map(row => `${row.name} ${age(row.fetchedAt)}`).join(' · ');
  }

  function bridgeModuleDurationText(details) {
    const rows = (Array.isArray(details) ? details : []).filter(row => num(row?.durationMs));
    if (!rows.length) return '—';
    return rows.slice(0, 8).map(row => `${row.name} ${Math.round(Number(row.durationMs))}ms`).join(' · ');
  }

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

  // DevPass 2.7.3 correlation probe: determine whether a measured UI stall
  // crossed the active or most-recent widget render window. Measurement only.
  function renderOverlapsPerfWindow(startPerf, endPerf) {
    const start = Number(startPerf);
    const end = Number(endPerf);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return false;
    const activeStart = Number(performanceRuntime.activeRenderStartedPerf || 0);
    if (activeStart > 0 && activeStart <= end) return true;
    const lastStart = Number(performanceRuntime.lastRenderStartedPerf || 0);
    const lastEnd = Number(performanceRuntime.lastRenderEndedPerf || 0);
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
        performanceRuntime.lastUiStallRenderOverlap = renderOverlapsPerfWindow(expected, nowPerf);
        performanceRuntime.lastUiStallRenderReason = performanceRuntime.lastUiStallRenderOverlap
          ? String(performanceRuntime.activeRenderReason || performanceRuntime.lastRenderReason || '')
          : '';
        performanceRuntime.lastUiStallRenderMs = performanceRuntime.lastUiStallRenderOverlap
          ? (Number(performanceRuntime.activeRenderStartedPerf || 0) > 0
            ? roundPerfMs(nowPerf - Number(performanceRuntime.activeRenderStartedPerf || nowPerf))
            : roundPerfMs(performanceRuntime.lastRenderMs))
          : null;
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
    performanceRuntime.lastResumeRefreshStartedAfterMs = null;
    performanceRuntime.lastResumeRefreshMs = null;
    performanceRuntime.lastResumeRenderMs = null;
    performanceRuntime.lastResumeHadRefreshAtEntry = Boolean(refreshInFlight);
    performanceRuntime.lastResumeRequestedReason = '';
    performanceRuntime.lastResumeActualReason = '';
    performanceRuntime.lastResumeRefreshWasCoalesced = false;
    performanceRuntime.lastResumeCoalescedIntoReason = '';
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
    if (document.visibilityState !== 'hidden') setRuntimeState('active', 'interaction');
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
    updateRuntimeState('resume-grace-complete');
    performanceRuntime.lastResumeDelayMs = elapsed;
    enqueueRefresh('visibility', true);
  }

  function requestResumeRefresh(reason = 'visibility') {
    if (!state?.syncOnFocus || !state?.bridgeEnabled || !token) return;
    if (state.backgroundPause !== false && document.visibilityState === 'hidden') return;
    performanceRuntime.lastResumeReason = String(reason || 'visibility');
    if (resumeRefreshTimer || performanceRuntime.resumePending) { performanceRuntime.resumeCoalesced += 1; return; }
    performanceRuntime.resumePending = true;
    setRuntimeState('resuming', reason);
    performanceRuntime.resumeStartedAt = Date.now();
    resumeRefreshTimer = setTimeout(runResumeRefreshWhenQuiet, RESUME_GRACE_MS);
  }

  // DevPass 2.7.3 Runtime State, adapted to the single Local Usage Bridge.
  function runtimeHasDegradation() {
    const healthStatus = String(state?.data?.health?.status || '').toLowerCase();
    return state?.bridgeStatus === 'error' || Boolean(state?.bridgeError) || healthStatus === 'error';
  }

  function setRuntimeState(next, reason = '') {
    const normalized = ['active','idle','background','resuming','degraded'].includes(String(next)) ? String(next) : 'active';
    if (performanceRuntime.runtimeState !== normalized) {
      performanceRuntime.runtimeState = normalized;
      performanceRuntime.runtimeStateChangedAt = Date.now();
      performanceRuntime.runtimeTransitions += 1;
    }
    if (normalized === 'degraded') {
      if (!performanceRuntime.degradedSince) performanceRuntime.degradedSince = Date.now();
    } else if (!runtimeHasDegradation()) {
      performanceRuntime.degradedSince = null;
    }
    state.runtimeStatus = {
      state:normalized,
      reason:String(reason || ''),
      changedAt:performanceRuntime.runtimeStateChangedAt,
      schedulerPending:Boolean(refreshSchedulerState.pending),
      refreshActive:Boolean(refreshInFlight),
    };
  }

  function updateRuntimeState(reason = '') {
    if (state?.backgroundPause !== false && document.visibilityState === 'hidden') {
      setRuntimeState('background', reason || 'hidden');
      return 'background';
    }
    if (performanceRuntime.resumePending) {
      setRuntimeState('resuming', reason || 'resume');
      return 'resuming';
    }
    if (runtimeHasDegradation()) {
      setRuntimeState('degraded', reason || 'bridge-error');
      return 'degraded';
    }
    const interacting = Date.now() - Number(performanceRuntime.lastInteractionAt || 0) < 1200;
    setRuntimeState(interacting ? 'active' : 'idle', reason || (interacting ? 'interaction' : 'idle'));
    return performanceRuntime.runtimeState;
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

