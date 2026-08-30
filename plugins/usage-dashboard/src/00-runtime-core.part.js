//@name local_usage_dashboard_modular
//@display-name Local Usage Dashboard
//@version 3.0.0-alpha.5.93
//@api 3.0
//@update-url https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-usage-dashboard/plugins/usage-dashboard/latest.js

(async () => {
  'use strict';

  const VERSION = '3.0.0-alpha.5.93';
  const RELEASE_NOTES = Object.freeze({
    title: "Truthful DevPass Cycle / Source-Window Summary",
    highlights: Object.freeze([
    "DevPass 7d/30d 기존 activity source에서 요청·토큰·Cached input share·Peak day를 source-backed 값으로 요약",
    "billing cycle이 KST 일 경계와 source coverage로 정확히 증명될 때만 ‘이번 사이클’을 쓰고 아니면 최근 30일/7일로 fail-closed",
    "missing daily scalar는 0으로 메우지 않고 UNKNOWN으로 보존하며 Credits 데이터와 기존 월간 예상 사용량 의미를 섞지 않음",
    "E16 live-proof 문서 상태 자동화는 선행 maintenance #962로 main baseline에 고정되어 release authority와 분리"
    ]),
    diagnosticHints: Object.freeze([
    "업데이트 후 Product 5.93 · Engine 1.6.30 · Manager 1.3.4 · CLI 1.10.0이 일치하는지 확인",
    "DevPass 요약 제목이 Diagnostics의 cycle summary mode와 정확히 일치하는지 확인",
    "요청·토큰·Cached input share·Peak day가 Diagnostics와 일치하고 source가 부족한 값은 —로 남는지 확인",
    "기존 Billing Cycle·Premium·PAYG와 월간 예상 사용량이 그대로이며 Credits 혼합이나 추가 CLI/network/refresh가 없는지 확인"
    ]),
  });
  const UPDATE_URL = 'https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-usage-dashboard/plugins/usage-dashboard/latest.js';
  const STATE_KEY = 'local-usage-dashboard-v3';
  const TOKEN_KEY = 'local-usage-dashboard-bridge-token-v1';
  const LEGACY_DEVPASS_STATE_KEY = 'llmgateway-devpass-direct-v1';
  const KST_TIME_ZONE = 'Asia/Seoul';
  const RUNTIME_LOADED_AT = Date.now();
  const UI_STALL_PROBE_INTERVAL_MS = 100;
  const UI_STALL_PROBE_IDLE_INTERVAL_MS = 1000;
  const UI_STALL_PROBE_TIMER_BURST_MS = 1500;
  const UI_STALL_PROBE_ACTIVE_BURST_MS = 5000;
  const UI_STALL_THRESHOLD_MS = 50;
  const RENDER_SPIKE_THRESHOLD_MS = 50;
  const RESUME_GRACE_MS = 1200;
  const RESUME_INTERACTION_QUIET_MS = 900;
  const RESUME_MAX_DEFER_MS = 4500;
  const RESUME_DIAGNOSTIC_WINDOW_MS = 10000;
  const RESUME_MAIN_THREAD_PROBE_MS = 80;
  const DEFAULT_BRIDGE = 'http://127.0.0.1:39117';
  const REQUIRED_BRIDGE_VERSION = '1.6.30';
  const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.4';
  const SNAPSHOT_SCHEMA_VERSION = 1;
  const RECENT_REQUEST_SCHEMA_VERSION = 1;
  const PRODUCT_RUNTIME_SCHEMA_VERSION = 1;
  const BRIDGE_MANAGER_PROTOCOL = 'bridge-manager-v1';
  const RUNTIME_MANIFEST_URL = 'https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-usage-dashboard/plugins/usage-dashboard/runtime/product-manifest.json';
  const BRIDGE_MANAGER_BASE = 'http://127.0.0.1:39119';
  const BRIDGE_MANAGER_PROBE_INTERVAL_MS = 60000;
  const DEFAULTS = {
    bridgeBase: DEFAULT_BRIDGE, bridgeEnabled: false, bridgeStatus: 'off', bridgeError: '',
    refreshMs: 15000, backgroundPause: true, syncOnFocus: true, performanceGuard: true, adaptiveRefresh: true, schedulerEnabled: true,
    staleAfterMs: 0, stalePolicyV37Migrated: false,
    widgetVisible: true, widgetMode: 'compact', widgetX: null, widgetY: null, widgetDockSide: '',
    usageScopeView: 'all',
    recentRequestFilter: 'all',
    selectedHourKey: '',
    requestLedger: [],
    requestLedgerStartedAt: null,
    analyticsScopeView: 'all',
    dashboardView: 'overview',
    diagnosticsMode: 'basic',
    selectedCreditsOrgId: '',
    creditsOrgFallbackCount: 0,
    creditsOrgLastFallbackFrom: '',
    creditsOrgLastFallbackTo: '',
    bridgePausedAt: null, bridgeLastReconnectAt: null, bridgeTokenClearedAt: null,
    lastSyncAt: null, lastSyncDurationMs: null, lastRefreshReason: '', refreshCount: 0,
    consecutiveFailures: 0, retryDelayMs: 0, nextRetryAt: null,
    dailyUsage: null, creditDailyUsage: null,
    runtimeStatus: null,
    bridgeManagerRuntime: null,
    bridgeManagerLastProbeAt: null,
    bridgeManagerSyncedProductVersion: '',
    bridgeEngineAdoptionAttemptedVersion: '',
    bridgeEngineBundleSyncAttemptedVersion: '',
    data: null
  };

  let store, state, token = '', refreshTimer = null, resetSyncTimer = null, refreshInFlight = null;
  let tokenForgetArmedUntil = 0;
  let widgetRenderTail = Promise.resolve(), widgetRenderRequestId = 0;
  let runtimeDisposed = false, runtimeEpoch = 1, staleAsyncDrops = 0;
  let refreshSchedulerTimer = null, refreshSchedulerIdleHandle = null;
  let panelRenderTimer = null, panelIdleHandle = null;
  let uiStallProbeTimer = null, resumeProbeTimer = null, resumeMeasureTimer = null, resumeRefreshTimer = null, resumeLongTaskObserver = null;
  let widget = null, rootBody = null, drag = null;
  let widgetMobileExpanded = false, widgetMobileViewport = false, widgetMobileToggleBlockedUntil = 0;
  let widgetRenderCache = {html:null,width:null,display:null,layout:null,responsiveStyles:Object.create(null)};
  const performanceRuntime = {adaptiveMultiplier:1,slowRefreshes:0,fastRefreshes:0,mode:'normal',timerSamples:0,ignoredSamples:0,lastSampleReason:'',lastSampleDurationMs:null,activeRefreshStartedPerf:0,activeRefreshReason:'',lastRefreshStartedPerf:0,lastRefreshEndedPerf:0,uiStallCount50:0,uiStallCount100:0,uiStallCount200:0,uiStallMaxMs:0,uiStallSamples:[],lastUiStallMs:null,lastUiStallAt:null,lastUiStallRefreshOverlap:false,lastUiStallRenderOverlap:false,lastUiStallRenderReason:'',lastUiStallRenderMs:null,uiStallProbeActive:false,lastInteractionAt:0,resumeEvents:0,resumeCoalesced:0,resumeDeferred:0,resumePending:false,resumeStartedAt:0,lastResumeDelayMs:null,resumeMeasurePending:false,resumeInputCaptured:false,resumeVisiblePerf:0,lastResumeVisibleAt:null,lastResumeReason:'',lastResumeFirstInputAfterMs:null,lastResumeInputDelayMs:null,lastResumeFrameDelayMs:null,lastResumeRefreshStartedAfterMs:null,lastResumeRefreshMs:null,lastResumeRenderMs:null,lastResumeHadRefreshAtEntry:false,lastResumeRequestedReason:'',lastResumeActualReason:'',lastResumeRefreshWasCoalesced:false,lastResumeCoalescedIntoReason:'',resumeRefreshSamples:[],lastResumeInputDuringRefresh:false,lastResumeMainThreadLagMs:null,lastResumeProbeAfterMs:null,lastResumeProbeDuringRefresh:false,longTaskSupported:false,lastResumeLongTaskMs:null,lastResumeLongTaskStartedAfterMs:null,lastResumeLongTaskDuringRefresh:false,resumeLongTaskCount:0,resumeInputDelaySamples:[],resumeFrameDelaySamples:[],resumeMainThreadLagSamples:[],resumeLongTaskSamples:[],schedulerQueued:0,schedulerMerged:0,schedulerExecuted:0,schedulerDeferredForInteraction:0,panelRenderCoalesced:0,panelRenderSkippedClosed:0,widgetHtmlWrites:0,widgetHtmlSkips:0,widgetStyleWrites:0,widgetStyleSkips:0,panelPartialRenders:0,panelFullRenders:0,panelSectionWrites:0,panelSectionSkips:0,hourlyDetailWrites:0,hourlyDetailSkips:0,hourlyDetailFallbacks:0,lastPanelRenderMode:'full',runtimeState:'active',runtimeStateChangedAt:Date.now(),runtimeTransitions:0,lastHealthySyncAt:null,degradedSince:null,lastRenderMs:null,lastPanelRenderMs:null,lastRenderReason:'',lastRenderStartedPerf:0,lastRenderEndedPerf:0,activeRenderStartedPerf:0,activeRenderReason:'',lastRenderBreakdown:null,renderSpikeCount:0,renderSpikeSamples:[],lastRenderSpikeMs:null,lastRenderSpikeAt:null,lastRenderSpikeReason:'',lastRenderSpikeRefreshOverlap:false,lastRenderSpikeBreakdown:null,lastRefreshPhases:null,lastRefreshSlowestPhase:'',lastRefreshSlowestPhaseMs:null};
  const powerRuntime = {probeWakeups:0,probeIdleWakeups:0,probeBurstWakeups:0,probeBurstUntil:0,persistWrites:0,widgetRenderCalls:0,responsiveStyleWrites:0,responsiveStyleSkips:0};
  const REFRESH_ATTRIBUTION_KEYS = Object.freeze(['manual','timer','visibility','init','connect','manual-retry','reset','scheduled']);
  const refreshAttributionRuntime = {requested:Object.create(null),executed:Object.create(null),active:null};
  const localRuntimeErrors = {count:0,persistFailures:0,renderFailures:0,recoveredCount:0,lastStage:'',lastMessage:'',lastAt:null,lastRecoveryStage:'',lastRecoveryAt:null,active:{persist:null,render:null,runtime:null}};
  const bridgeLifecycleRuntime = {generation:1,refreshDrops:0,blockedRefreshes:0,lastTransitionFrom:'',lastTransitionTo:'',lastTransitionAt:null,lastTransitionReason:''};
  function bridgeLifecycleMode() {
    if (!state) return 'off';
    if (!state.bridgeEnabled) return state.bridgeStatus === 'paused' ? 'paused' : 'off';
    if (state.bridgeStatus === 'error') return 'error';
    if (state.bridgeStatus === 'connected') return 'live';
    return 'connecting';
  }

  function noteBridgeLifecycleTransition(next, reason = '') {
    const previous = bridgeLifecycleMode();
    bridgeLifecycleRuntime.generation += 1;
    bridgeLifecycleRuntime.lastTransitionFrom = previous;
    bridgeLifecycleRuntime.lastTransitionTo = String(next || '');
    bridgeLifecycleRuntime.lastTransitionAt = Date.now();
    bridgeLifecycleRuntime.lastTransitionReason = String(reason || '');
    return bridgeLifecycleRuntime.generation;
  }

  function canBridgeRefresh() {
    if (runtimeDisposed || !state?.bridgeEnabled || !token) return false;
    const mode = bridgeLifecycleMode();
    return mode !== 'paused' && mode !== 'off';
  }

  function lifecycleRefreshIsCurrent(generation) {
    return canBridgeRefresh() && Number(generation) === Number(bridgeLifecycleRuntime.generation);
  }

  function dropLifecycleRefresh() {
    bridgeLifecycleRuntime.refreshDrops += 1;
    return undefined;
  }

  function refreshAttributionKey(reason) {
    const key = String(reason || 'scheduled');
    return REFRESH_ATTRIBUTION_KEYS.includes(key) ? key : 'other';
  }

  function noteRefreshRequested(reason) {
    const key = refreshAttributionKey(reason);
    refreshAttributionRuntime.requested[key] = Number(refreshAttributionRuntime.requested[key] || 0) + 1;
  }

  function beginRefreshAttribution(reason, startedAt) {
    const key = refreshAttributionKey(reason);
    const bucket = refreshAttributionRuntime.executed[key] || {
      count:0,lastStatus:'none',lastStartedAt:null,lastCompletedAt:null,lastTotalDurationMs:null,lastDataDurationMs:null,
      lastUiStallCount:0,lastUiStallMaxMs:null,lastRenderSpikeCount:0,lastRenderSpikeMaxMs:null
    };
    bucket.count += 1;
    bucket.lastStartedAt = Number(startedAt || Date.now());
    refreshAttributionRuntime.executed[key] = bucket;
    const active = {key,startedAt:bucket.lastStartedAt,uiStallCount:0,uiStallMaxMs:0,renderSpikeCount:0,renderSpikeMaxMs:0};
    refreshAttributionRuntime.active = active;
    return active;
  }

  function noteAttributedUiStall(durationMs) {
    const active = refreshAttributionRuntime.active;
    const duration = roundPerfMs(durationMs);
    if (!active || !Number.isFinite(duration)) return;
    active.uiStallCount += 1;
    active.uiStallMaxMs = Math.max(Number(active.uiStallMaxMs || 0), duration);
  }

  function noteAttributedRenderSpike(durationMs) {
    const active = refreshAttributionRuntime.active;
    const duration = roundPerfMs(durationMs);
    if (!active || !Number.isFinite(duration)) return;
    active.renderSpikeCount += 1;
    active.renderSpikeMaxMs = Math.max(Number(active.renderSpikeMaxMs || 0), duration);
  }

  function finishRefreshAttribution(active, status, totalDurationMs, dataDurationMs = null) {
    if (!active) return;
    const bucket = refreshAttributionRuntime.executed[active.key];
    if (bucket) {
      bucket.lastStatus = String(status || 'unknown');
      bucket.lastCompletedAt = Date.now();
      bucket.lastTotalDurationMs = Math.max(0, Number(totalDurationMs) || 0);
      bucket.lastDataDurationMs = num(dataDurationMs) ? Number(dataDurationMs) : null;
      bucket.lastUiStallCount = Number(active.uiStallCount || 0);
      bucket.lastUiStallMaxMs = active.uiStallCount > 0 ? roundPerfMs(active.uiStallMaxMs) : null;
      bucket.lastRenderSpikeCount = Number(active.renderSpikeCount || 0);
      bucket.lastRenderSpikeMaxMs = active.renderSpikeCount > 0 ? roundPerfMs(active.renderSpikeMaxMs) : null;
    }
    if (refreshAttributionRuntime.active === active) refreshAttributionRuntime.active = null;
  }

  function refreshAttributionDetail(reason) {
    const key = refreshAttributionKey(reason);
    const requested = Number(refreshAttributionRuntime.requested[key] || 0);
    const bucket = refreshAttributionRuntime.executed[key];
    if (!bucket) return `requested ${requested} · executed 0 · last none`;
    return `requested ${requested} · executed ${Number(bucket.count || 0)} · status ${bucket.lastStatus || 'unknown'} · total ${num(bucket.lastTotalDurationMs) ? `${roundPerfMs(bucket.lastTotalDurationMs)}ms` : '—'} · data ${num(bucket.lastDataDurationMs) ? `${roundPerfMs(bucket.lastDataDurationMs)}ms` : '—'} · UI stalls ${Number(bucket.lastUiStallCount || 0)}${num(bucket.lastUiStallMaxMs) ? ` · max ${roundPerfMs(bucket.lastUiStallMaxMs)}ms` : ''} · render spikes ${Number(bucket.lastRenderSpikeCount || 0)}${num(bucket.lastRenderSpikeMaxMs) ? ` · max ${roundPerfMs(bucket.lastRenderSpikeMaxMs)}ms` : ''} · completed ${bucket.lastCompletedAt ? age(bucket.lastCompletedAt) : '—'}`;
  }
  const uiParts = [], remoteListeners = [], widgetRemoteListeners = [], domListeners = [];

  function runtimeIsCurrent(epoch = runtimeEpoch) { return !runtimeDisposed && epoch === runtimeEpoch; }
  function dropStaleAsync() { staleAsyncDrops += 1; return undefined; }

  const num = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
  const money = (v, d = 2) => num(v) ? `$${Number(v).toFixed(d)}` : '—';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const pct = v => Number.isFinite(Number(v)) ? Math.max(0, Math.min(100, Number(v))) : 0;


  function diagnosticTimestamp(timestamp) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: KST_TIME_ZONE,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).formatToParts(new Date(Number(timestamp)));
    const value = type => parts.find(part => part.type === type)?.value || '00';
    return `${value('year')}-${value('month')}-${value('day')} ${value('hour')}:${value('minute')}:${value('second')} KST`;
  }

  function diagnosticUptime(durationMs) {
    let seconds = Math.max(0, Math.floor((Number(durationMs) || 0) / 1000));
    const days = Math.floor(seconds / 86400); seconds %= 86400;
    const hours = Math.floor(seconds / 3600); seconds %= 3600;
    const minutes = Math.floor(seconds / 60); seconds %= 60;
    const parts = [];
    if (days) parts.push(`${days}일`);
    if (hours || days) parts.push(`${hours}시간`);
    if (minutes || hours || days) parts.push(`${minutes}분`);
    parts.push(`${seconds}초`);
    return parts.join(' ');
  }
