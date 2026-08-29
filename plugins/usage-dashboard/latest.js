//@name local_usage_dashboard_modular
//@display-name Local Usage Dashboard
//@version 3.0.0-alpha.5.86
//@api 3.0
//@update-url https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-usage-dashboard/plugins/usage-dashboard/latest.js

(async () => {
  'use strict';

  const VERSION = '3.0.0-alpha.5.86';
  const RELEASE_NOTES = Object.freeze({
    title: "Managed CLI Engine/Manager Pin Parity Repair",
    highlights: Object.freeze([
    "Bridge Manager의 관리형 LLM Gateway CLI target을 Engine과 동일한 1.10.0으로 정렬",
    "Engine 1.6.26과 기존 managed-direct → direct → npx fallback 순서는 그대로 유지",
    "기존 1.9.0 managed descriptor/runtime은 1.10.0 target에서 stale로 처리되어 정상 provisioning 경로로 복구"
    ]),
    diagnosticHints: Object.freeze([
    "업데이트 후 Bridge CLI runtime이 managed · ready · v1.10.0 · provisioning ok인지 확인",
    "정상 acceptance capture에서 managed-direct가 사용되고 direct ENOENT/npx-fallback이 0인지 확인",
    "Organizations/DevPass/Credits/Request Ledger와 source-truth 규칙이 기존과 동일한지 확인",
    "provisioning 실패 시 수동 CLI 설치를 요구하지 말고 diagnostics 증거만 수집"
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
  const REQUIRED_BRIDGE_VERSION = '1.6.26';
  const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.1';
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
    const capabilitiesRaw = raw.bridgeCapabilities ?? raw.capabilities?.bridge ?? raw.capabilities;
    const capabilities = capabilitiesRaw && typeof capabilitiesRaw === 'object' ? capabilitiesRaw : null;
    const managerRaw = raw.bridgeManager ?? raw.manager ?? raw.updateManager;
    const manager = managerRaw && typeof managerRaw === 'object' ? managerRaw : null;
    const protocolVersion = num(raw.protocolVersion) ? Number(raw.protocolVersion) : null;
    const fetchedAt = bridgeTimestamp(raw.fetchedAt) || Date.now();
    if (!version && !compatibility && !modules && !diagnostics && !capabilities && !manager && raw.__bridgeSnapshot !== true) return null;
    return {
      version,
      protocolVersion,
      compatibility,
      compatible: bridgeCompatibleVersion(version, compatibility),
      modules,
      diagnostics,
      capabilities,
      manager,
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
    const snapshotPerformance = diagnostics?.snapshotPerformance && typeof diagnostics.snapshotPerformance === 'object' ? diagnostics.snapshotPerformance : null;
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
      circuitRecoveries: numeric(circuitStats?.recoveries),
      snapshotPerformance
    };
  }


  function bridgeRuntimeSnapshot() {
    const bridge = state?.data?.bridge || null;
    const capabilities = bridge?.capabilities && typeof bridge.capabilities === 'object' ? bridge.capabilities : null;
    const embeddedManager = bridge?.manager && typeof bridge.manager === 'object' ? bridge.manager : null;
    const probedManager = state?.bridgeManagerRuntime?.connected === true ? state.bridgeManagerRuntime : null;
    const manager = probedManager || embeddedManager;
    const truthy = value => value === true || value === 1 || String(value || '').toLowerCase() === 'true';
    const managerInstalled = Boolean(probedManager) || truthy(embeddedManager?.managed ?? capabilities?.managed);
    const selfUpdate = truthy(manager?.selfUpdate ?? manager?.self_update ?? capabilities?.selfUpdate ?? capabilities?.self_update);
    const engineManaged = truthy(manager?.engineManaged ?? manager?.engine_managed ?? capabilities?.engineManaged ?? capabilities?.engine_managed);
    const managerProtocol = String(manager?.protocol || manager?.managementProtocol || manager?.management_protocol || capabilities?.managementProtocol || capabilities?.management_protocol || capabilities?.managerProtocol || 'none');
    return {
      mode: engineManaged ? 'managed-sidecar' : 'legacy-external',
      managerInstalled,
      engineManaged,
      selfUpdate,
      managerProtocol,
      managerVersion:String(manager?.version || ''),
      managerProductVersion:String(manager?.productVersion || manager?.product_version || ''),
      engineMode:String(manager?.engineMode || manager?.engine_mode || (engineManaged ? 'managed-adopted' : 'legacy-external')),
      engineService:String(manager?.engineService || manager?.engine_service || ''),
      engineAdoption:truthy(manager?.engineAdoption ?? manager?.engine_adoption),
      candidateSafe:typeof manager?.candidateSafe === 'boolean' ? manager.candidateSafe : null,
      bridgeVersion:String(bridge?.version || '')
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
    noteAttributedRenderSpike(duration);
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

  function uiStallProbeInterval() {
    return Date.now() < Number(powerRuntime.probeBurstUntil || 0)
      ? UI_STALL_PROBE_INTERVAL_MS
      : UI_STALL_PROBE_IDLE_INTERVAL_MS;
  }

  function requestUiStallProbeBurst(durationMs = UI_STALL_PROBE_TIMER_BURST_MS) {
    if (runtimeDisposed) return;
    const duration = Math.max(0, Number(durationMs) || 0);
    powerRuntime.probeBurstUntil = Math.max(Number(powerRuntime.probeBurstUntil || 0), Date.now() + duration);
    if (performanceRuntime.uiStallProbeActive && !(state?.backgroundPause !== false && document.visibilityState === 'hidden')) {
      startUiStallProbe();
    }
  }

  function startUiStallProbe() {
    stopUiStallProbe();
    if (typeof performance?.now !== 'function') return;
    if (state?.backgroundPause !== false && document.visibilityState === 'hidden') return;
    performanceRuntime.uiStallProbeActive = true;
    let scheduledInterval = uiStallProbeInterval();
    let expected = performance.now() + scheduledInterval;
    const tick = () => {
      uiStallProbeTimer = null;
      if (state?.backgroundPause !== false && document.visibilityState === 'hidden') {
        performanceRuntime.uiStallProbeActive = false;
        return;
      }
      const nowPerf = performance.now();
      const lag = Math.max(0, nowPerf - expected);
      powerRuntime.probeWakeups += 1;
      if (scheduledInterval <= UI_STALL_PROBE_INTERVAL_MS) powerRuntime.probeBurstWakeups += 1;
      else powerRuntime.probeIdleWakeups += 1;
      if (lag >= UI_STALL_THRESHOLD_MS) {
        const rounded = roundPerfMs(lag);
        noteAttributedUiStall(rounded);
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
      scheduledInterval = uiStallProbeInterval();
      expected = nowPerf + scheduledInterval;
      uiStallProbeTimer = setTimeout(tick, scheduledInterval);
    };
    uiStallProbeTimer = setTimeout(tick, scheduledInterval);
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
    requestUiStallProbeBurst(UI_STALL_PROBE_ACTIVE_BURST_MS);
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
    if (!state?.syncOnFocus || !canBridgeRefresh()) return;
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
    if (runtimeDisposed) return;
    if (!canBridgeRefresh()) { bridgeLifecycleRuntime.blockedRefreshes += 1; return; }
    noteRefreshRequested(reason);
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
    const lifecycle = bridgeLifecycleMode();
    if (lifecycle === 'paused') return {label:'PAUSED', color:'#b9a6f8'};
    if (lifecycle === 'off') return {label:'OFF', color:'#aeb5c0'};
    if (lifecycle === 'error') return {label:'OFFLINE', color:'#ff9b95'};
    if (lifecycle === 'live' && dataIsStale()) return {label:'STALE', color:'#ffd27d'};
    if (lifecycle === 'live') return {label:'LIVE', color:'#c5f277'};
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

  function recentRequestValue(row, keys, fallback = null) {
    for (const key of keys) {
      const parts = String(key).split('.');
      let value = row;
      for (const part of parts) value = value?.[part];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return fallback;
  }

  function recentRequestField(row, keys) {
    for (const key of keys) {
      const value = recentRequestValue(row, [key], null);
      if (value !== null && value !== undefined && value !== '') return {key, value};
    }
    return {key:'', value:null};
  }

  function requestDurationKnown(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  }

  function requestDurationMetadata(row) {
    const value = recentRequestValue(row, ['durationMs'], null);
    const source = String(recentRequestValue(row, ['durationSource'], '') || '');
    const fidelity = String(recentRequestValue(row, ['durationFidelity'], 'unknown') || 'unknown');
    const explicit = requestDurationKnown(value) && source === 'llmgateway-log-duration' && fidelity === 'explicit';
    return {
      durationMs: explicit ? Number(value) : null,
      durationSource: explicit ? source : '',
      durationFidelity: explicit ? 'explicit' : 'unknown'
    };
  }

  function formatRequestDurationMs(value) {
    if (!requestDurationKnown(value)) return '—';
    const ms = Number(value);
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 10000) return `${(ms / 1000).toFixed(2).replace(/\.?0+$/, '')}s`;
    return `${(ms / 1000).toFixed(1).replace(/\.0$/, '')}s`;
  }

  function requestDurationText(row) {
    return row?.durationFidelity === 'explicit' && requestDurationKnown(row?.durationMs)
      ? formatRequestDurationMs(row.durationMs)
      : '—';
  }

  function requestHttpStatusMetadata(row) {
    const raw = recentRequestValue(row, ['httpStatusCode','http_status_code'], null);
    const source = String(recentRequestValue(row, ['httpStatusSource','http_status_source'], '') || '');
    const fidelity = String(recentRequestValue(row, ['httpStatusFidelity','http_status_fidelity'], 'unknown') || 'unknown');
    const explicit = typeof raw === 'number'
      && Number.isInteger(raw)
      && raw >= 100
      && raw <= 599
      && source === 'errorDetails.statusCode'
      && fidelity === 'explicit';
    return {
      httpStatusCode: explicit ? raw : null,
      httpStatusSource: explicit ? 'errorDetails.statusCode' : '',
      httpStatusFidelity: explicit ? 'explicit' : 'unknown'
    };
  }

  function requestHttpStatusText(row) {
    const http = requestHttpStatusMetadata(row);
    return requestOutcomeCategory(row) === 'error' && http.httpStatusFidelity === 'explicit'
      ? `HTTP ${http.httpStatusCode}`
      : '';
  }

  function requestHttpStatusStats(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const errorRows = list.filter(row => requestOutcomeCategory(row) === 'error');
    const exact = errorRows.filter(row => requestHttpStatusMetadata(row).httpStatusFidelity === 'explicit').length;
    return {errorRows:errorRows.length, exact, unknown:errorRows.length - exact, source:'errorDetails.statusCode'};
  }

  function requestCacheSignal(row) {
    const explicit = recentRequestValue(row, ['cacheHit','cache_hit','cached','isCached','is_cached','cache.hit'], null);
    const text = typeof explicit === 'string' ? explicit.trim().toLowerCase() : '';
    if (typeof explicit === 'boolean') return explicit;
    if (num(explicit)) return Number(explicit) > 0;
    if (['true','yes','hit','cached'].includes(text)) return true;
    if (['false','no','miss','uncached'].includes(text)) return false;
    const cachedTokens = recentRequestValue(row, [
      'cachedTokens','cached_tokens','usage.cachedTokens','usage.cached_tokens',
      'cacheReadInputTokens','cache_read_input_tokens','usage.cacheReadInputTokens','usage.cache_read_input_tokens',
      'cachedContentTokenCount','cached_content_token_count','usage.cachedContentTokenCount','usage.cached_content_token_count',
      'usage.input_tokens_details.cached_tokens','usage.prompt_tokens_details.cached_tokens',
      'input_tokens_details.cached_tokens','prompt_tokens_details.cached_tokens'
    ], null);
    return num(cachedTokens) ? Number(cachedTokens) > 0 : null;
  }


  function requestCacheMetrics(row) {
    const metric = keys => {
      const value = recentRequestValue(row, keys, null);
      return num(value) ? Math.max(0, Number(value)) : null;
    };
    const inputTokens = metric([
      'inputTokens','input_tokens','promptTokens','prompt_tokens','usage.inputTokens','usage.input_tokens','usage.prompt_tokens'
    ]);
    const outputTokens = metric([
      'outputTokens','output_tokens','completionTokens','completion_tokens','usage.outputTokens','usage.output_tokens','usage.completion_tokens'
    ]);
    const explicitCachedInputTokens = metric([
      'cachedInputTokens','cached_input_tokens','cachedTokens','cached_tokens',
      'usage.cachedInputTokens','usage.cached_input_tokens','usage.cachedTokens','usage.cached_tokens',
      'cachedContentTokenCount','cached_content_token_count','usage.cachedContentTokenCount','usage.cached_content_token_count',
      'usage.input_tokens_details.cached_tokens','usage.prompt_tokens_details.cached_tokens',
      'input_tokens_details.cached_tokens','prompt_tokens_details.cached_tokens'
    ]);
    const cacheReadInputTokens = metric([
      'cacheReadInputTokens','cache_read_input_tokens','usage.cacheReadInputTokens','usage.cache_read_input_tokens'
    ]);
    const cacheCreationInputTokens = metric([
      'cacheCreationInputTokens','cache_creation_input_tokens','cacheCreationTokens','cache_creation_tokens','cacheWriteTokens','cache_write_tokens',
      'usage.cacheCreationInputTokens','usage.cache_creation_input_tokens','usage.cacheCreationTokens','usage.cache_creation_tokens','usage.cacheWriteTokens','usage.cache_write_tokens',
      'usage.input_tokens_details.cache_write_tokens','usage.prompt_tokens_details.cache_write_tokens',
      'usage.input_tokens_details.cache_creation_tokens','usage.prompt_tokens_details.cache_creation_tokens',
      'input_tokens_details.cache_write_tokens','prompt_tokens_details.cache_write_tokens',
      'input_tokens_details.cache_creation_tokens','prompt_tokens_details.cache_creation_tokens'
    ]);
    const cacheCreation5mTokens = metric([
      'cacheCreation5mTokens','cache_creation_5m_tokens','cacheWrite5mTokens','cache_write_5m_tokens','usage.cacheCreation5mTokens','usage.cache_creation_5m_tokens','usage.cacheWrite5mTokens','usage.cache_write_5m_tokens',
      'cache_creation.ephemeral_5m_input_tokens','usage.cache_creation.ephemeral_5m_input_tokens',
      'prompt_tokens_details.cache_creation.ephemeral_5m_input_tokens','input_tokens_details.cache_creation.ephemeral_5m_input_tokens',
      'usage.prompt_tokens_details.cache_creation.ephemeral_5m_input_tokens','usage.input_tokens_details.cache_creation.ephemeral_5m_input_tokens'
    ]);
    const cacheCreation1hTokens = metric([
      'cacheCreation1hTokens','cache_creation_1h_tokens','cacheWrite1hTokens','cache_write_1h_tokens','usage.cacheCreation1hTokens','usage.cache_creation_1h_tokens','usage.cacheWrite1hTokens','usage.cache_write_1h_tokens',
      'cache_creation.ephemeral_1h_input_tokens','usage.cache_creation.ephemeral_1h_input_tokens',
      'prompt_tokens_details.cache_creation.ephemeral_1h_input_tokens','input_tokens_details.cache_creation.ephemeral_1h_input_tokens',
      'usage.prompt_tokens_details.cache_creation.ephemeral_1h_input_tokens','usage.input_tokens_details.cache_creation.ephemeral_1h_input_tokens'
    ]);
    const cachedInputTokens = explicitCachedInputTokens !== null
      ? explicitCachedInputTokens
      : (cacheReadInputTokens !== null || cacheCreationInputTokens !== null
        ? Number(cacheReadInputTokens || 0) + Number(cacheCreationInputTokens || 0)
        : null);
    const denominatorKnown = inputTokens !== null || cacheReadInputTokens !== null || cacheCreationInputTokens !== null;
    const readDenominator = denominatorKnown
      ? Number(inputTokens || 0) + Number(cacheReadInputTokens || 0) + Number(cacheCreationInputTokens || 0)
      : null;
    const cacheReadRatio = cacheReadInputTokens !== null && readDenominator > 0
      ? Math.max(0, Math.min(100, cacheReadInputTokens / readDenominator * 100))
      : null;
    return {
      inputTokens,
      outputTokens,
      cachedInputTokens,
      cacheReadInputTokens,
      cacheCreationInputTokens,
      cacheCreation5mTokens,
      cacheCreation1hTokens,
      cacheReadRatio
    };
  }

  function requestCacheDetailText(row) {
    const parts = [];
    if (typeof row?.cacheHit === 'boolean') parts.push(`캐시 ${row.cacheHit ? 'HIT' : 'MISS'}`);
    if (num(row?.cachedInputTokens)) parts.push(`Cached ${Number(row.cachedInputTokens).toLocaleString()}`);
    if (num(row?.cacheReadInputTokens)) parts.push(`Read ${Number(row.cacheReadInputTokens).toLocaleString()}`);
    if (num(row?.cacheCreationInputTokens)) {
      const ttl = [
        num(row?.cacheCreation5mTokens) ? `5m=${Number(row.cacheCreation5mTokens).toLocaleString()}` : '',
        num(row?.cacheCreation1hTokens) ? `1h=${Number(row.cacheCreation1hTokens).toLocaleString()}` : ''
      ].filter(Boolean).join(', ');
      parts.push(`Write ${Number(row.cacheCreationInputTokens).toLocaleString()}${ttl ? ` (${ttl})` : ''}`);
    }
    if (num(row?.cacheReadRatio)) parts.push(`Read ratio ${Number(row.cacheReadRatio).toFixed(1)}%`);
    return parts.join(' · ');
  }

  function normalizeServiceTierValue(value) {
    const text = String(value ?? '').trim().toLowerCase().replace(/_/g, '-');
    if (!text) return '';
    if (['flex','flexible'].includes(text)) return 'flex';
    if (['priority','fast'].includes(text)) return 'priority';
    if (['standard','default','auto','on-demand','ondemand','on demand'].includes(text)) return 'standard';
    return 'unknown';
  }

  function serviceTierKnown(value) {
    return ['flex','standard','priority'].includes(normalizeServiceTierValue(value));
  }

  function normalizeServiceTierSelectionSource(value) {
    const text = String(value ?? '').trim().toLowerCase().replace(/_/g, '-');
    if (text === 'request') return 'request';
    if (text === 'coding-plan-default') return 'coding-plan-default';
    return 'unknown';
  }

  function serviceTierSelectionSourceKnown(value) {
    return ['request','coding-plan-default'].includes(normalizeServiceTierSelectionSource(value));
  }

  function preferKnownServiceTierSelectionSource(next, current) {
    const nextSource = normalizeServiceTierSelectionSource(next);
    const currentSource = normalizeServiceTierSelectionSource(current);
    if (serviceTierSelectionSourceKnown(nextSource)) return nextSource;
    if (serviceTierSelectionSourceKnown(currentSource)) return currentSource;
    return 'unknown';
  }

  function preferKnownServiceTier(next, current) {
    const nextTier = normalizeServiceTierValue(next);
    const currentTier = normalizeServiceTierValue(current);
    if (serviceTierKnown(nextTier)) return nextTier;
    if (serviceTierKnown(currentTier)) return currentTier;
    return nextTier || currentTier || '';
  }

  function requestAccountScopeLabel(value) {
    const scope = requestAccountScopeValue(value);
    if (scope === 'devpass') return 'DevPass';
    if (scope === 'credits') return 'Credits';
    return '—';
  }

  function requestServiceTierText(row) {
    const scopeText = requestAccountScopeLabel(row?.requestAccountScope);
    const requested = normalizeServiceTierValue(row?.requestedServiceTier);
    const served = normalizeServiceTierValue(row?.servedServiceTier);
    const label = value => value === 'flex' ? 'FLEX' : value === 'priority' ? 'PRIORITY' : value === 'standard' ? 'STANDARD' : '?';
    let tierText = 'TIER ?';
    if (serviceTierKnown(requested) && serviceTierKnown(served)) {
      tierText = requested === served ? label(served) : `요청 ${label(requested)} → 실제 ${label(served)}`;
    } else if (serviceTierKnown(served)) {
      tierText = `실제 ${label(served)}`;
    } else if (serviceTierKnown(requested)) {
      tierText = `요청 ${label(requested)} · 실제 ?`;
    }
    return `${scopeText} · ${tierText}`;
  }

  function requestServiceTierSelectionSourceText(row) {
    const source = normalizeServiceTierSelectionSource(row?.serviceTierSelectionSource);
    if (source === 'request') return '요청 지정';
    if (source === 'coding-plan-default') return '플랜 기본';
    return '';
  }

  function requestServiceTierStats(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const stats = {
      rows:list.length, requestedKnown:0, servedKnown:0,
      flex:0, standard:0, priority:0, unknown:0,
      requested:{flex:0,standard:0,priority:0,unknown:0},
      served:{flex:0,standard:0,priority:0,unknown:0},
      selectionSource:{request:0,planDefault:0,unknown:0},
      requestedSources:[], servedSources:[]
    };
    const requestedSources = new Set();
    const servedSources = new Set();
    for (const row of list) {
      const requested = normalizeServiceTierValue(row?.requestedServiceTier);
      const served = normalizeServiceTierValue(row?.servedServiceTier);
      const selection = normalizeServiceTierSelectionSource(row?.serviceTierSelectionSource);
      if (serviceTierKnown(requested)) {
        stats.requestedKnown += 1;
        stats.requested[requested] += 1;
      } else stats.requested.unknown += 1;
      if (serviceTierKnown(served)) {
        stats.servedKnown += 1;
        stats[served] += 1;
        stats.served[served] += 1;
      } else {
        stats.unknown += 1;
        stats.served.unknown += 1;
      }
      if (selection === 'request') stats.selectionSource.request += 1;
      else if (selection === 'coding-plan-default') stats.selectionSource.planDefault += 1;
      else stats.selectionSource.unknown += 1;
      if (row?.requestedServiceTierSource) requestedSources.add(String(row.requestedServiceTierSource));
      if (row?.servedServiceTierSource) servedSources.add(String(row.servedServiceTierSource));
    }
    stats.requestedSources = Array.from(requestedSources).sort();
    stats.servedSources = Array.from(servedSources).sort();
    return stats;
  }

  function requestServiceTierSummary(rows) {
    const stats = requestServiceTierStats(rows);
    return `TIER F/S/P/? ${stats.flex}/${stats.standard}/${stats.priority}/${stats.unknown}`;
  }

  function requestTimestampPrecision(timestamp, sourceKey, requestNumber) {
    const bucketKeys = new Set(['hour','hourStart','hour_start','bucketStart','bucket_start','windowStart','window_start']);
    if (bucketKeys.has(String(sourceKey || ''))) return 'hour';
    if (!num(timestamp)) return 'unknown';
    const d = new Date(Number(timestamp));
    const onHourBoundary = d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
    return onHourBoundary && !requestNumber ? 'hour-estimated' : 'exact';
  }

  function requestAccountScopeValue(value) {
    const text = String(value || '').trim().toLowerCase();
    return ['devpass','credits','unknown'].includes(text) ? text : 'unknown';
  }

  function requestScopeFidelityValue(value, scope = 'unknown') {
    const text = String(value || '').trim().toLowerCase();
    const normalizedScope = requestAccountScopeValue(scope);
    if (normalizedScope === 'devpass' && text === 'explicit-project') return text;
    if (normalizedScope === 'credits' && text === 'explicit-org-billing') return text;
    return 'unknown';
  }

  function normalizeRecentRequestRows(rows, limit = 12) {
    if (!Array.isArray(rows)) return [];
    return rows.map(row => {
      if (!row || typeof row !== 'object') return null;
      const timestampField = recentRequestField(row, [
        'timestamp','createdAt','created_at','time','date','created','startedAt','started_at','completedAt','completed_at','requestTime','request_time',
        'hour','hourStart','hour_start','bucketStart','bucket_start','windowStart','window_start'
      ]);
      const timestamp = bridgeTimestamp(timestampField.value);
      const provider = String(recentRequestValue(row, ['provider','providerName','provider_name','usedProvider','used_provider','metadata.used_provider','metadata.usedProvider','source.provider'], 'Unknown') || 'Unknown');
      const model = String(recentRequestValue(row, ['model','modelId','model_id','usedModel','used_model','metadata.used_model','metadata.usedModel','source.model'], 'Unknown') || 'Unknown');
      const costRaw = recentRequestValue(row, ['cost','usage.cost','inferenceCost','inference_cost','totalCost','total_cost','usage.cost_details.total_cost','cost_details.total_cost'], null);
      const tokensRaw = recentRequestValue(row, ['totalTokens','total_tokens','usage.total_tokens'], null);
      const cacheMetrics = requestCacheMetrics(row);
      const duration = requestDurationMetadata(row);
      const httpStatus = requestHttpStatusMetadata(row);
      const requestedTierField = recentRequestField(row, [
        'requestedServiceTier','requested_service_tier','requestServiceTier','request_service_tier',
        'requestedTier','requested_tier','metadata.requestedServiceTier','metadata.requested_service_tier',
        'request.serviceTier','request.service_tier'
      ]);
      const servedTierField = recentRequestField(row, [
        'servedServiceTier','served_service_tier','usedServiceTier','used_service_tier',
        'actualServiceTier','actual_service_tier','billingServiceTier','billing_service_tier',
        'metadata.servedServiceTier','metadata.served_service_tier','metadata.usedServiceTier','metadata.used_service_tier',
        'response.serviceTier','response.service_tier','serviceTier','service_tier'
      ]);
      const requestedServiceTier = normalizeServiceTierValue(requestedTierField.value);
      const servedServiceTier = normalizeServiceTierValue(servedTierField.value);
      const requestedServiceTierSource = String(recentRequestValue(row, ['requestedServiceTierSource','requested_service_tier_source'], requestedTierField.key) || requestedTierField.key || '');
      const servedServiceTierSource = String(recentRequestValue(row, ['servedServiceTierSource','served_service_tier_source'], servedTierField.key) || servedTierField.key || '');
      const serviceTierSelectionSource = normalizeServiceTierSelectionSource(recentRequestValue(row, ['serviceTierSelectionSource','service_tier_selection_source'], 'unknown'));
      const requestNumberRaw = recentRequestValue(row, ['id','requestId','request_id','sequence','seq','requestNumber','request_number','number'], null);
      const requestNumber = requestNumberRaw !== null && requestNumberRaw !== undefined && requestNumberRaw !== '' ? String(requestNumberRaw) : '';
      const requestAccountScope = requestNumber ? requestAccountScopeValue(recentRequestValue(row, ['requestAccountScope','request_account_scope'], 'unknown')) : 'unknown';
      const requestScopeFidelity = requestNumber ? requestScopeFidelityValue(recentRequestValue(row, ['requestScopeFidelity','request_scope_fidelity'], 'unknown'), requestAccountScope) : 'unknown';
      const requestScopeConflict = requestNumber ? row?.requestScopeConflict === true : false;
      const status = String(recentRequestValue(row, ['status','state'], '') || '').toLowerCase();
      const errorCodeRaw = recentRequestValue(row, ['errorCode','error_code','statusCode','status_code','httpStatus','http_status','error.code'], null);
      const errorTypeRaw = recentRequestValue(row, ['errorType','error_type','error.type'], null);
      const statusCode = num(errorCodeRaw) ? Number(errorCodeRaw) : null;
      const explicitSuccess = typeof row.success === 'boolean' ? row.success : null;
      const failedByStatus = ['error','failed','failure','upstream_error','gateway_error','timeout'].includes(status);
      const hasErrorObject = Boolean(row.error && (typeof row.error === 'string' || typeof row.error === 'object'));
      const success = explicitSuccess !== null ? explicitSuccess : !(failedByStatus || hasErrorObject || (statusCode !== null && statusCode >= 400));
      if (!timestamp && provider === 'Unknown' && model === 'Unknown') return null;
      return {
        timestamp,
        timestampPrecision:requestTimestampPrecision(timestamp, timestampField.key, requestNumber),
        timestampSource:String(timestampField.key || ''),
        provider,
        model,
        cost:num(costRaw) ? Number(costRaw) : null,
        totalTokens:num(tokensRaw) ? Number(tokensRaw) : null,
        inputTokens:cacheMetrics.inputTokens,
        outputTokens:cacheMetrics.outputTokens,
        cacheHit:requestCacheSignal(row),
        durationMs:duration.durationMs,
        durationSource:duration.durationSource,
        durationFidelity:duration.durationFidelity,
        httpStatusCode:httpStatus.httpStatusCode,
        httpStatusSource:httpStatus.httpStatusSource,
        httpStatusFidelity:httpStatus.httpStatusFidelity,
        cachedInputTokens:cacheMetrics.cachedInputTokens,
        cacheReadInputTokens:cacheMetrics.cacheReadInputTokens,
        cacheCreationInputTokens:cacheMetrics.cacheCreationInputTokens,
        cacheCreation5mTokens:cacheMetrics.cacheCreation5mTokens,
        cacheCreation1hTokens:cacheMetrics.cacheCreation1hTokens,
        cacheReadRatio:cacheMetrics.cacheReadRatio,
        cacheMetricFidelity:String(recentRequestValue(row, ['cacheMetricFidelity','cache_metric_fidelity'], 'unknown') || 'unknown'),
        cacheWriteTelemetry:String(recentRequestValue(row, ['cacheWriteTelemetry','cache_write_telemetry'], 'unknown') || 'unknown'),
        cacheTtlTelemetry:String(recentRequestValue(row, ['cacheTtlTelemetry','cache_ttl_telemetry'], 'unknown') || 'unknown'),
        cacheMetricSource:String(recentRequestValue(row, ['cacheMetricSource','cache_metric_source'], '') || ''),
        requestedServiceTier,
        servedServiceTier,
        requestedServiceTierSource,
        servedServiceTierSource,
        serviceTierSelectionSource,
        requestNumber,
        requestAccountScope,
        requestScopeFidelity,
        requestScopeConflict,
        requestStatus:status,
        success,
        errorCode:success ? '' : String(errorCodeRaw ?? ''),
        errorType:success ? '' : String(errorTypeRaw ?? '')
      };
    }).filter(Boolean).sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0)).slice(0, Math.max(1, Number(limit) || 12));
  }

  function requestOutcomeCategory(row) {
    const status = String(row?.requestStatus || '').trim().toLowerCase();
    if (['cancelled','canceled','aborted','abort','cancel'].includes(status)) return 'cancelled';
    if (['error','failed','failure','upstream_error','gateway_error','timeout'].includes(status) || row?.success === false) return 'error';
    if (['success','ok','completed','complete','succeeded'].includes(status) || row?.success === true) return 'success';
    return 'unknown';
  }

  function requestOutcomeStats(rows) {
    const stats = {rows:0,success:0,error:0,cancelled:0,unknown:0};
    for (const row of (Array.isArray(rows) ? rows : [])) {
      const outcome = requestOutcomeCategory(row);
      stats.rows += 1;
      stats[outcome] += 1;
    }
    return stats;
  }

  function requestDurationStats(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const stats = {rows:list.length, explicit:0, unknown:0, totalMs:0, averageMs:null, slowestMs:null, sources:[]};
    const sources = new Set();
    for (const row of list) {
      const explicit = row?.durationFidelity === 'explicit'
        && row?.durationSource === 'llmgateway-log-duration'
        && requestDurationKnown(row?.durationMs);
      if (!explicit) { stats.unknown += 1; continue; }
      const value = Number(row.durationMs);
      stats.explicit += 1;
      stats.totalMs += value;
      stats.slowestMs = stats.slowestMs === null ? value : Math.max(stats.slowestMs, value);
      sources.add('llmgateway-log-duration');
    }
    stats.averageMs = stats.explicit ? stats.totalMs / stats.explicit : null;
    stats.sources = [...sources].sort();
    return stats;
  }

  function requestCacheObservabilityStats(rows) {
    const stats = {
      rows:0, hitKnown:0, hits:0, tokenKnown:0, readKnown:0, writeKnown:0,
      writeReported:0, writeNotReported:0, writeUnknownOnCache:0, readWithoutWriteValue:0,
      ttlReported:0, ttlNotReported:0, ttlUnknownAfterWrite:0,
      inputTokens:0, cachedInputTokens:0, cacheReadInputTokens:0, cacheCreationInputTokens:0,
      cacheCreation5mTokens:0, cacheCreation1hTokens:0, readDenominator:0, readRatio:null
    };
    for (const row of (Array.isArray(rows) ? rows : [])) {
      stats.rows += 1;
      if (typeof row?.cacheHit === 'boolean') { stats.hitKnown += 1; if (row.cacheHit) stats.hits += 1; }
      const hasTokenMetric = [row?.cachedInputTokens,row?.cacheReadInputTokens,row?.cacheCreationInputTokens].some(num);
      if (hasTokenMetric) stats.tokenKnown += 1;
      const readValueKnown = num(row?.cacheReadInputTokens);
      const writeValueKnown = num(row?.cacheCreationInputTokens);
      if (readValueKnown) stats.readKnown += 1;
      if (writeValueKnown) stats.writeKnown += 1;
      if (row?.cacheWriteTelemetry === 'reported') stats.writeReported += 1;
      if (row?.cacheWriteTelemetry === 'not-reported') stats.writeNotReported += 1;
      if ((readValueKnown || writeValueKnown) && !['reported','not-reported'].includes(String(row?.cacheWriteTelemetry || ''))) stats.writeUnknownOnCache += 1;
      if (readValueKnown && !writeValueKnown) stats.readWithoutWriteValue += 1;
      if (row?.cacheTtlTelemetry === 'reported') stats.ttlReported += 1;
      if (row?.cacheTtlTelemetry === 'not-reported') stats.ttlNotReported += 1;
      if (writeValueKnown && !['reported','not-reported'].includes(String(row?.cacheTtlTelemetry || ''))) stats.ttlUnknownAfterWrite += 1;
      stats.inputTokens += num(row?.inputTokens) ? Number(row.inputTokens) : 0;
      stats.cachedInputTokens += num(row?.cachedInputTokens) ? Number(row.cachedInputTokens) : 0;
      stats.cacheReadInputTokens += num(row?.cacheReadInputTokens) ? Number(row.cacheReadInputTokens) : 0;
      stats.cacheCreationInputTokens += num(row?.cacheCreationInputTokens) ? Number(row.cacheCreationInputTokens) : 0;
      stats.cacheCreation5mTokens += num(row?.cacheCreation5mTokens) ? Number(row.cacheCreation5mTokens) : 0;
      stats.cacheCreation1hTokens += num(row?.cacheCreation1hTokens) ? Number(row.cacheCreation1hTokens) : 0;
      if ([row?.inputTokens,row?.cacheReadInputTokens,row?.cacheCreationInputTokens].some(num)) {
        stats.readDenominator += Number(row?.inputTokens || 0) + Number(row?.cacheReadInputTokens || 0) + Number(row?.cacheCreationInputTokens || 0);
      }
    }
    stats.readRatio = stats.readDenominator > 0 && stats.cacheReadInputTokens > 0
      ? Math.max(0, Math.min(100, stats.cacheReadInputTokens / stats.readDenominator * 100))
      : null;
    return stats;
  }

  function cacheObservabilitySummaryText(stats) {
    const s = stats || requestCacheObservabilityStats([]);
    const hitRate = s.hitKnown > 0 ? `${(s.hits / s.hitKnown * 100).toFixed(1)}% (${s.hits}/${s.hitKnown})` : '—';
    const cached = s.tokenKnown > 0 || s.cachedInputTokens > 0 ? Number(s.cachedInputTokens).toLocaleString() : '—';
    const read = s.readKnown > 0 || s.cacheReadInputTokens > 0 ? Number(s.cacheReadInputTokens).toLocaleString() : '—';
    const write = s.writeKnown > 0 || s.cacheCreationInputTokens > 0 ? Number(s.cacheCreationInputTokens).toLocaleString() : '—';
    const ratio = num(s.readRatio) ? `${Number(s.readRatio).toFixed(1)}%` : '—';
    return `HIT ${hitRate} · Cached ${cached} · Read ${read} · Write ${write} · Read ratio ${ratio}`;
  }

  function requestLedgerCapabilities(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const precisionOf = row => row?.timestampPrecision && row.timestampPrecision !== 'unknown' ? row.timestampPrecision : requestTimestampPrecision(row?.timestamp, row?.timestampSource, row?.requestNumber);
    const exact = list.filter(row => precisionOf(row) === 'exact').length;
    const bucket = list.filter(row => ['hour','hour-estimated'].includes(precisionOf(row))).length;
    const cacheKnown = list.filter(row => typeof row?.cacheHit === 'boolean').length;
    const cacheTokenKnown = list.filter(row => [row?.cachedInputTokens,row?.cacheReadInputTokens,row?.cacheCreationInputTokens].some(num)).length;
    const ids = list.filter(row => String(row?.requestNumber || '')).length;
    const tier = requestServiceTierStats(list);
    return {rows:list.length, exact, bucket, cacheKnown, cacheTokenKnown, ids, tier};
  }

  function requestLedgerKey(row) {
    const requestNumber = String(row?.requestNumber || '').trim();
    if (requestNumber) return `request:${requestNumber}`;
    return [
      Number(row?.timestamp || 0),
      String(row?.requestNumber || ''),
      String(row?.provider || 'Unknown'),
      String(row?.model || 'Unknown'),
      num(row?.cost) ? Number(row.cost) : '',
      num(row?.totalTokens) ? Number(row.totalTokens) : '',
      row?.success === false ? 'error' : 'success',
      String(row?.errorCode || ''),
      String(row?.errorType || '')
    ].join('|');
  }

  function collectRecentRequestLedger(data) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const byKey = new Map();
    for (const row of (Array.isArray(state.requestLedger) ? state.requestLedger : [])) {
      if (!row || !num(row.timestamp) || Number(row.timestamp) < cutoff) continue;
      byKey.set(requestLedgerKey(row), {...row, timestampPrecision:String(row.timestampPrecision && row.timestampPrecision !== 'unknown' ? row.timestampPrecision : requestTimestampPrecision(row.timestamp, row.timestampSource, row.requestNumber)), scopes:Array.isArray(row.scopes) ? row.scopes : ['all']});
    }
    let observed = 0;
    for (const scopeKey of ['all','devpass','credits']) {
      const scope = data?.usageScopes?.scopes?.[scopeKey];
      const rows = Array.isArray(scope?.recentLedger) ? scope.recentLedger : (Array.isArray(scope?.recent) ? scope.recent : []);
      for (const row of rows) {
        if (!row || !num(row.timestamp) || Number(row.timestamp) < cutoff) continue;
        const key = requestLedgerKey(row);
        const current = byKey.get(key) || null;
        const incomingDuration = requestDurationMetadata(row);
        const currentDuration = requestDurationMetadata(current || {});
        const duration = incomingDuration.durationFidelity === 'explicit' ? incomingDuration : currentDuration;
        const incomingHttpStatus = requestHttpStatusMetadata(row);
        const currentHttpStatus = requestHttpStatusMetadata(current || {});
        const httpStatus = incomingHttpStatus.httpStatusFidelity === 'explicit' ? incomingHttpStatus : currentHttpStatus;
        const scopes = new Set([...(Array.isArray(current?.scopes) ? current.scopes : []), scopeKey]);
        byKey.set(key, {
          ...(current || {}),
          ...row,
          cost:num(row.cost) ? Number(row.cost) : (num(current?.cost) ? Number(current.cost) : null),
          totalTokens:num(row.totalTokens) ? Number(row.totalTokens) : (num(current?.totalTokens) ? Number(current.totalTokens) : null),
          inputTokens:num(row.inputTokens) ? Number(row.inputTokens) : (num(current?.inputTokens) ? Number(current.inputTokens) : null),
          outputTokens:num(row.outputTokens) ? Number(row.outputTokens) : (num(current?.outputTokens) ? Number(current.outputTokens) : null),
          durationMs:duration.durationMs,
          durationSource:duration.durationSource,
          durationFidelity:duration.durationFidelity,
          httpStatusCode:httpStatus.httpStatusCode,
          httpStatusSource:httpStatus.httpStatusSource,
          httpStatusFidelity:httpStatus.httpStatusFidelity,
          cacheHit:typeof row.cacheHit === 'boolean' ? row.cacheHit : (typeof current?.cacheHit === 'boolean' ? current.cacheHit : null),
          cachedInputTokens:num(row.cachedInputTokens) ? Number(row.cachedInputTokens) : (num(current?.cachedInputTokens) ? Number(current.cachedInputTokens) : null),
          cacheReadInputTokens:num(row.cacheReadInputTokens) ? Number(row.cacheReadInputTokens) : (num(current?.cacheReadInputTokens) ? Number(current.cacheReadInputTokens) : null),
          cacheCreationInputTokens:num(row.cacheCreationInputTokens) ? Number(row.cacheCreationInputTokens) : (num(current?.cacheCreationInputTokens) ? Number(current.cacheCreationInputTokens) : null),
          cacheCreation5mTokens:num(row.cacheCreation5mTokens) ? Number(row.cacheCreation5mTokens) : (num(current?.cacheCreation5mTokens) ? Number(current.cacheCreation5mTokens) : null),
          cacheCreation1hTokens:num(row.cacheCreation1hTokens) ? Number(row.cacheCreation1hTokens) : (num(current?.cacheCreation1hTokens) ? Number(current.cacheCreation1hTokens) : null),
          cacheReadRatio:num(row.cacheReadRatio) ? Number(row.cacheReadRatio) : (num(current?.cacheReadRatio) ? Number(current.cacheReadRatio) : null),
          cacheMetricFidelity:String(row.cacheMetricFidelity || current?.cacheMetricFidelity || 'unknown'),
          cacheWriteTelemetry:String(row.cacheWriteTelemetry || current?.cacheWriteTelemetry || 'unknown'),
          cacheTtlTelemetry:String(row.cacheTtlTelemetry || current?.cacheTtlTelemetry || 'unknown'),
          cacheMetricSource:String(row.cacheMetricSource || current?.cacheMetricSource || ''),
          requestedServiceTier:preferKnownServiceTier(row.requestedServiceTier, current?.requestedServiceTier),
          servedServiceTier:preferKnownServiceTier(row.servedServiceTier, current?.servedServiceTier),
          requestedServiceTierSource:String(row.requestedServiceTierSource || current?.requestedServiceTierSource || ''),
          servedServiceTierSource:String(row.servedServiceTierSource || current?.servedServiceTierSource || ''),
          serviceTierSelectionSource:preferKnownServiceTierSelectionSource(row.serviceTierSelectionSource, current?.serviceTierSelectionSource),
          timestampPrecision:String(row.timestampPrecision || current?.timestampPrecision || 'unknown'),
          timestampSource:String(row.timestampSource || current?.timestampSource || ''),
          requestNumber:String(row.requestNumber || current?.requestNumber || ''),
          requestStatus:String(row.requestStatus || current?.requestStatus || ''),
          errorCode:String(row.errorCode || current?.errorCode || ''),
          errorType:String(row.errorType || current?.errorType || ''),
          scopes:Array.from(scopes)
        });
        observed += 1;
      }
    }
    state.requestLedger = Array.from(byKey.values())
      .sort((a,b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
      .slice(0, 2000);
    if (observed > 0 && !num(state.requestLedgerStartedAt)) state.requestLedgerStartedAt = Date.now();
  }

  function requestLedgerRowsForScope(scopeKey) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const key = ['all','devpass','credits'].includes(String(scopeKey)) ? String(scopeKey) : 'all';
    const rows = (Array.isArray(state.requestLedger) ? state.requestLedger : [])
      .filter(row => row && num(row.timestamp) && Number(row.timestamp) >= cutoff)
      .sort((a,b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
    if (key === 'all') return rows;
    return rows.filter((row) => requestAccountScopeValue(row?.requestAccountScope) === key);
  }

  function requestHourKey(timestamp) {
    if (!num(timestamp)) return '';
    const d = new Date(Number(timestamp) + 9 * 60 * 60 * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const h = String(d.getUTCHours()).padStart(2, '0');
    return `${y}-${m}-${day}T${h}`;
  }

  function requestHourLabel(key) {
    const match = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})$/);
    if (!match) return key || '시간 미제공';
    const [,y,m,d,h] = match;
    const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-${String(now.getUTCDate()).padStart(2,'0')}`;
    const date = `${y}-${m}-${d}`;
    return `${date === today ? '오늘' : `${Number(m)}/${Number(d)}`} ${Number(h)}시`;
  }

  function requestExactTime(row) {
    const timestamp = row?.timestamp;
    if (!num(timestamp)) return '시간 미제공';
    const precision = row?.timestampPrecision && row.timestampPrecision !== 'unknown' ? row.timestampPrecision : requestTimestampPrecision(timestamp, row?.timestampSource, row?.requestNumber);
    if (precision === 'hour' || precision === 'hour-estimated') return `${requestHourLabel(requestHourKey(timestamp))} 버킷 · 정확 시각 미제공`;
    return new Date(Number(timestamp)).toLocaleTimeString('ko-KR', {timeZone:KST_TIME_ZONE,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
  }

  function requestLedgerCoverageText() {
    if (!num(state.requestLedgerStartedAt)) return '관측 시작 —';
    const started = Number(state.requestLedgerStartedAt);
    const elapsed = Math.max(0, Math.min(24 * 60 * 60 * 1000, Date.now() - started));
    const minutes = Math.floor(elapsed / 60000);
    const coverage = elapsed >= 24 * 60 * 60 * 1000
      ? '24h 확보'
      : minutes < 1
        ? '1분 미만 확보'
        : minutes < 60
          ? `${minutes}분 확보`
          : `${Math.floor(minutes / 60)}시간 ${minutes % 60}분 확보`;
    const startedText = new Date(started).toLocaleString('ko-KR', {
      timeZone:KST_TIME_ZONE,
      month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:false
    });
    return `로컬 관측 시작 ${startedText} · ${coverage} / 24h`;
  }

  function aggregateSelectedHour(rows, key) {
    const groups = new Map();
    for (const row of (Array.isArray(rows) ? rows : [])) {
      const name = String(row?.[key] || 'Unknown');
      if (!groups.has(name)) groups.set(name, {name, requests:0, cost:0, costKnown:0, tokens:0, tokenKnown:0, cacheKnown:0, cacheHits:0, inputTokens:0, cacheReadTokens:0, cacheWriteTokens:0, cacheTokenKnown:0, errors:0});
      const item = groups.get(name);
      item.requests += 1;
      if (num(row?.cost)) { item.cost += Number(row.cost); item.costKnown += 1; }
      if (num(row?.totalTokens)) { item.tokens += Number(row.totalTokens); item.tokenKnown += 1; }
      if (typeof row?.cacheHit === 'boolean') { item.cacheKnown += 1; if (row.cacheHit) item.cacheHits += 1; }
      if ([row?.cachedInputTokens,row?.cacheReadInputTokens,row?.cacheCreationInputTokens].some(num)) item.cacheTokenKnown += 1;
      item.inputTokens += num(row?.inputTokens) ? Number(row.inputTokens) : 0;
      item.cacheReadTokens += num(row?.cacheReadInputTokens) ? Number(row.cacheReadInputTokens) : 0;
      item.cacheWriteTokens += num(row?.cacheCreationInputTokens) ? Number(row.cacheCreationInputTokens) : 0;
      if (row?.success === false) item.errors += 1;
    }
    return Array.from(groups.values()).sort((a,b) => b.cost - a.cost || b.requests - a.requests || a.name.localeCompare(b.name));
  }

  function selectedHourAggregateHtml(title, rows) {
    const html = (Array.isArray(rows) ? rows : []).map(row => {
      const cacheText = row.cacheKnown
        ? `캐시 ${(row.cacheHits / row.cacheKnown * 100).toFixed(1)}% · 정보 ${row.cacheKnown}/${row.requests}`
        : `캐시 정보 0/${row.requests}`;
      const readDenominator = row.inputTokens + row.cacheReadTokens + row.cacheWriteTokens;
      const cacheTokenText = row.cacheTokenKnown
        ? `Read ${row.cacheReadTokens.toLocaleString()} · Write ${row.cacheWriteTokens.toLocaleString()}${readDenominator > 0 && row.cacheReadTokens > 0 ? ` · Read ratio ${(row.cacheReadTokens / readDenominator * 100).toFixed(1)}%` : ''}`
        : '';
      const meta = [
        row.tokenKnown ? `${row.tokens.toLocaleString()} tok` : '',
        cacheText,
        cacheTokenText,
        row.errors ? `오류 ${row.errors}` : ''
      ].filter(Boolean).join(' · ');
      return `<div class="hour-aggregate-row"><div><b>${esc(row.name)}</b><small>${esc(meta)}</small></div><span>${row.requests}회 · ${row.costKnown ? money(row.cost,4) : '비용 —'}</span></div>`;
    }).join('');
    return `<div class="hour-aggregate-box"><h4>${esc(title)}</h4>${html || '<p>데이터 없음</p>'}</div>`;
  }

  function hourlyRequestDrilldownHtml(scopeKey) {
    const rows = requestLedgerRowsForScope(scopeKey);
    const coverageText = requestLedgerCoverageText();
    const fidelity = requestLedgerCapabilities(rows);
    const durationFidelity = requestDurationStats(rows);
    if (!rows.length) {
      return `<div class="usage-detail-box hourly-ledger"><div class="recent-head"><h3>시간별 요청 · 24h 로컬 관측</h3><span>0건</span></div><p>${esc(coverageText)} · 아직 누적된 요청 메타데이터가 없어.</p></div>`;
    }
    const groups = new Map();
    for (const row of rows) {
      const key = requestHourKey(row.timestamp);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    const selectedKey = groups.has(String(state.selectedHourKey || '')) ? String(state.selectedHourKey) : '';
    const hourRows = Array.from(groups.entries()).sort((a,b) => b[0].localeCompare(a[0])).map(([key, hour]) => {
      const costRows = hour.filter(row => num(row.cost));
      const totalCost = costRows.reduce((sum,row) => sum + Number(row.cost), 0);
      const cacheRows = hour.filter(row => typeof row.cacheHit === 'boolean');
      const cacheHits = cacheRows.filter(row => row.cacheHit).length;
      const cacheRate = cacheRows.length ? cacheHits / cacheRows.length * 100 : null;
      const errors = hour.filter(row => row.success === false).length;
      const cacheText = cacheRate === null
        ? `캐시 정보 0/${hour.length}`
        : `캐시 ${cacheRate.toFixed(1)}% · 정보 ${cacheRows.length}/${hour.length}`;
      const errorText = errors ? ` · 오류 ${errors}` : '';
      const tierText = requestServiceTierSummary(hour);
      const duration = requestDurationStats(hour);
      const durationText = duration.explicit
        ? `Duration ${duration.explicit}/${duration.rows} · avg ${formatRequestDurationMs(duration.averageMs)}`
        : `Duration 0/${duration.rows}`;
      return `<button class="hour-row ${selectedKey===key?'active':''}" data-usage-hour="${esc(key)}"><span><b>${esc(requestHourLabel(key))}</b><small>${hour.length}회 · ${costRows.length ? money(totalCost,4) : '비용 —'}</small></span><em>${cacheText} · ${tierText} · ${durationText}${errorText}</em></button>`;
    }).join('');

    let selectedHtml = '';
    if (selectedKey) {
      const selected = groups.get(selectedKey) || [];
      const costRows = selected.filter(row => num(row.cost));
      const totalCost = costRows.reduce((sum,row) => sum + Number(row.cost), 0);
      const tokenRows = selected.filter(row => num(row.totalTokens));
      const totalTokens = tokenRows.reduce((sum,row) => sum + Number(row.totalTokens), 0);
      const cacheRows = selected.filter(row => typeof row.cacheHit === 'boolean');
      const cacheHits = cacheRows.filter(row => row.cacheHit).length;
      const cacheRate = cacheRows.length ? cacheHits / cacheRows.length * 100 : null;
      const errors = selected.filter(row => row.success === false).length;
      const tierSummary = requestServiceTierSummary(selected);
      const durationSummary = requestDurationStats(selected);
      const durationText = durationSummary.explicit
        ? `Duration known ${durationSummary.explicit}/${durationSummary.rows} · average ${formatRequestDurationMs(durationSummary.averageMs)} · slowest ${formatRequestDurationMs(durationSummary.slowestMs)}`
        : `Duration known 0/${durationSummary.rows} · average — · slowest —`;
      const cacheSummary = cacheRate === null
        ? `캐시 정보 0/${selected.length} · 비율 —`
        : `캐시 ${cacheRate.toFixed(1)}% · HIT ${cacheHits}/${cacheRows.length} · 정보 ${cacheRows.length}/${selected.length}`;
      const summary = [
        `${selected.length}회`,
        costRows.length ? money(totalCost,4) : '비용 —',
        tokenRows.length ? `${totalTokens.toLocaleString()} tok` : '토큰 —',
        cacheSummary,
        tierSummary,
        durationText,
        errors ? `오류 ${errors}` : '오류 0'
      ].join(' · ');
      const providerSummary = aggregateSelectedHour(selected, 'provider');
      const modelSummary = aggregateSelectedHour(selected, 'model');
      const aggregates = `<div class="hour-aggregate-grid">${selectedHourAggregateHtml('Provider 합계', providerSummary)}${selectedHourAggregateHtml('Model 합계', modelSummary)}</div>`;
      const visible = selected.slice(0, 300);
      const detailRows = visible.map(row => {
        const numberText = row.requestNumber ? `#${esc(row.requestNumber)} · ` : '';
        const resultText = row.success === false
          ? ['오류', row.errorCode ? esc(row.errorCode) : '', row.errorType ? esc(row.errorType) : ''].filter(Boolean).join(' · ')
          : '성공';
        const cacheText = requestCacheDetailText(row) || '캐시 정보 없음';
        const tierText = requestServiceTierText(row);
        const tierSelectionText = requestServiceTierSelectionSourceText(row);
        const durationText = `Duration ${requestDurationText(row)}`;
        const httpStatusText = requestHttpStatusText(row);
        const usageText = [resultText, httpStatusText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', tierText, tierSelectionText, durationText, cacheText].filter(Boolean).join(' · ');
        return `<div class="request-detail-row hour-request-row"><div class="request-main"><b>${numberText}${esc(row.provider)}</b><span class="request-model">${esc(row.model)}</span><span>${esc(requestExactTime(row))}</span></div><em class="${row.success === false ? 'error-text' : 'ok-text'}">${usageText}</em></div>`;
      }).join('');
      const truncated = selected.length > visible.length ? `<p>성능 보호로 최신 ${visible.length}/${selected.length}건 표시</p>` : '';
      selectedHtml = `<div class="hour-detail"><div class="recent-head"><h3>${esc(requestHourLabel(selectedKey))} 요청별 상세</h3><span>${esc(summary)}</span></div>${aggregates}<div class="hour-request-list">${detailRows}</div>${truncated}</div>`;
    }

    return `<div class="usage-detail-box hourly-ledger"><div class="recent-head"><h3>시간별 요청 · 24h 로컬 관측</h3><span>${rows.length}건 · ${groups.size}시간</span></div><p>${esc(coverageText)} · 시각 exact ${fidelity.exact}/${fidelity.rows} · 버킷 ${fidelity.bucket}/${fidelity.rows} · 캐시 정보 ${fidelity.cacheKnown}/${fidelity.rows} · tier 실제 ${fidelity.tier.servedKnown}/${fidelity.rows} · Duration explicit ${durationFidelity.explicit}/${durationFidelity.rows} · 프롬프트/응답 미저장</p><div class="hour-list">${hourRows}</div>${selectedHtml}</div>`;
  }

  function scopeUsageDetailsHtml(scopeActivity) {
    if (!scopeActivity) return '';
    const aggregateMetaItems = row => [
      num(row?.totalTokens) ? `토큰 ${Number(row.totalTokens).toLocaleString()}` : '',
      num(row?.errorRate)
        ? `오류 ${Number(row.errorRate).toFixed(1)}%${num(row?.errorCount) ? ` · ${Number(row.errorCount).toLocaleString()}회` : ''}`
        : num(row?.errorCount) ? `오류 ${Number(row.errorCount).toLocaleString()}회` : '',
      num(row?.cacheRate)
        ? `캐시 ${Number(row.cacheRate).toFixed(1)}%${num(row?.cacheCount) ? ` · ${Number(row.cacheCount).toLocaleString()}회` : ''}`
        : num(row?.cacheCount) ? `캐시 ${Number(row.cacheCount).toLocaleString()}회` : ''
    ].filter(Boolean);
    const aggregateRows = rows => (Array.isArray(rows) ? rows : []).slice(0, 8).map(row => {
      const chips = aggregateMetaItems(row).map(item => `<span class="stat-chip">${item}</span>`).join('');
      return `<div class="usage-detail-row"><div><b>${esc(row?.name || 'Unknown')}</b>${chips ? `<small class="aggregate-meta">${chips}</small>` : ''}</div><span>${Number(row?.requests || 0).toLocaleString()}회 · ${money(row?.cost,4)}</span></div>`;
    }).join('');
    const providers = aggregateRows(scopeActivity.providers);
    const models = aggregateRows(scopeActivity.models);
    const recentFilter = ['all','success','error'].includes(String(state.recentRequestFilter)) ? String(state.recentRequestFilter) : 'all';
    const recentAll = Array.isArray(scopeActivity.recent) ? scopeActivity.recent : [];
    const recentCounts = {
      all:recentAll.length,
      success:recentAll.filter(row => row.success).length,
      error:recentAll.filter(row => !row.success).length
    };
    const recentRows = recentAll.filter(row => recentFilter === 'all' || (recentFilter === 'success' ? row.success : !row.success));
    const recentHtml = recentRows.map(row => {
      const numberText = row.requestNumber ? `#${esc(row.requestNumber)} · ` : '';
      const resultText = row.success
        ? '성공'
        : ['오류', row.errorCode ? esc(row.errorCode) : '', row.errorType ? esc(row.errorType) : ''].filter(Boolean).join(' · ');
      const cacheText = requestCacheDetailText(row);
      const tierText = requestServiceTierText(row);
      const tierSelectionText = requestServiceTierSelectionSourceText(row);
      const durationText = `Duration ${requestDurationText(row)}`;
      const httpStatusText = requestHttpStatusText(row);
      const usageText = [resultText, httpStatusText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', tierText, tierSelectionText, durationText, cacheText].filter(Boolean).join(' · ');
      return `<div class="request-detail-row"><div class="request-main"><b>${numberText}${esc(row.provider)}</b><span class="request-model">${esc(row.model)}</span><span>${row.timestamp ? esc(requestExactTime(row)) : '시간 미제공'}</span></div><em class="${row.success ? 'ok-text' : 'error-text'}">${usageText}</em></div>`;
    }).join('');
    const sourceRows = Number(scopeActivity.recentRawCount || 0);
    const filterEmpty = recentAll.length > 0 ? '이 필터에 해당하는 최근 요청 없음'
      : sourceRows > 0 ? `요청 단위 메타데이터 없음 · source rows ${sourceRows}`
      : 'Bridge가 최근 요청 메타데이터를 아직 제공하지 않음';
    const filterButton = (key, label, count) => `<button class="recent-filter-btn ${recentFilter===key?'active':''}" data-recent-filter="${key}">${label} ${count}</button>`;
    const baseHtml = `<div class="usage-detail-grid"><div class="usage-detail-box"><h3>Provider · 요청 / 비용 / 효율</h3>${providers || '<p>데이터 없음</p>'}</div><div class="usage-detail-box"><h3>Model · 요청 / 비용 / 효율</h3>${models || '<p>데이터 없음</p>'}</div></div><div class="usage-detail-box recent-requests"><div class="recent-head"><h3>최근 요청 · 메타데이터</h3><span>${recentRows.length}/${recentCounts.all}</span></div><div class="recent-filter" role="tablist" aria-label="최근 요청 필터">${filterButton('all','전체',recentCounts.all)}${filterButton('success','성공',recentCounts.success)}${filterButton('error','오류',recentCounts.error)}</div>${recentHtml || `<p>${filterEmpty}</p>`}</div>`;
    const scopeKey = ['all','devpass','credits'].includes(String(state.usageScopeView)) ? String(state.usageScopeView) : 'all';
    return baseHtml + hourlyRequestDrilldownHtml(scopeKey);
  }

  function requestAccountScopeStats(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const stats = {rows:list.length,devpass:0,credits:0,unknown:0,conflict:0};
    for (const row of list) {
      const scope = requestAccountScopeValue(row?.requestAccountScope);
      stats[scope] += 1;
      if (row?.requestScopeConflict === true) stats.conflict += 1;
    }
    return stats;
  }

  function normalizeRequestProvenanceMetadata(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const captureMode = ['account-wide','project-fallback','unknown'].includes(String(raw.captureMode))
      ? String(raw.captureMode)
      : 'unknown';
    const bounded = value => num(value) ? Math.max(0, Number(value)) : 0;
    return {
      captureMode,
      rows:bounded(raw.rows),
      fallbackCount:bounded(raw.fallbackCount),
      devpass:bounded(raw.devpass),
      credits:bounded(raw.credits),
      unknown:bounded(raw.unknown),
      conflict:bounded(raw.conflict),
      modelInference:0,
      authority:String(raw.authority || '') === 'project-exact+credits-org-used-mode'
        ? 'project-exact+credits-org-used-mode'
        : 'unknown',
    };
  }

  function normalizeScopeActivity(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const rows = value => Array.isArray(value) ? value.map(row => ({
      name:String(row?.name || 'Unknown'),
      requests:num(row?.requests) ? Number(row.requests) : 0,
      cost:num(row?.cost) ? Number(row.cost) : 0,
      totalTokens:num(row?.totalTokens ?? row?.total_tokens) ? Number(row.totalTokens ?? row.total_tokens) : null,
      inputTokens:num(row?.inputTokens ?? row?.input_tokens) ? Number(row.inputTokens ?? row.input_tokens) : null,
      outputTokens:num(row?.outputTokens ?? row?.output_tokens) ? Number(row.outputTokens ?? row.output_tokens) : null,
      errorCount:num(row?.errorCount ?? row?.error_count) ? Number(row.errorCount ?? row.error_count) : null,
      errorRate:num(row?.errorRate ?? row?.error_rate) ? Number(row.errorRate ?? row.error_rate) : null,
      cacheCount:num(row?.cacheCount ?? row?.cache_count) ? Number(row.cacheCount ?? row.cache_count) : null,
      cacheRate:num(row?.cacheRate ?? row?.cache_rate) ? Number(row.cacheRate ?? row.cache_rate) : null,
      cachedInputTokens:num(row?.cachedInputTokens ?? row?.cached_input_tokens ?? row?.cachedTokens ?? row?.cached_tokens) ? Number(row.cachedInputTokens ?? row.cached_input_tokens ?? row.cachedTokens ?? row.cached_tokens) : null,
      cacheReadInputTokens:num(row?.cacheReadInputTokens ?? row?.cache_read_input_tokens) ? Number(row.cacheReadInputTokens ?? row.cache_read_input_tokens) : null,
      cacheCreationInputTokens:num(row?.cacheCreationInputTokens ?? row?.cache_creation_input_tokens ?? row?.cacheWriteTokens ?? row?.cache_write_tokens) ? Number(row.cacheCreationInputTokens ?? row.cache_creation_input_tokens ?? row.cacheWriteTokens ?? row.cache_write_tokens) : null
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
    const cachedInputTokens = num(raw.cachedInputTokens ?? raw.cached_input_tokens ?? raw.cachedTokens ?? raw.cached_tokens) ? Number(raw.cachedInputTokens ?? raw.cached_input_tokens ?? raw.cachedTokens ?? raw.cached_tokens) : null;
    const cacheReadInputTokens = num(raw.cacheReadInputTokens ?? raw.cache_read_input_tokens) ? Number(raw.cacheReadInputTokens ?? raw.cache_read_input_tokens) : null;
    const cacheCreationInputTokens = num(raw.cacheCreationInputTokens ?? raw.cache_creation_input_tokens ?? raw.cacheWriteTokens ?? raw.cache_write_tokens) ? Number(raw.cacheCreationInputTokens ?? raw.cache_creation_input_tokens ?? raw.cacheWriteTokens ?? raw.cache_write_tokens) : null;
    const providers = rows(raw.providers);
    const models = rows(raw.models);
    const recentCandidates = [
      ['requestLedger', raw.requestLedger], ['request_ledger', raw.request_ledger],
      ['recentRequests', raw.recentRequests], ['recent_requests', raw.recent_requests],
      ['requests', raw.requests], ['recent', raw.recent]
    ];
    const recentSource = recentCandidates.find(([,value]) => Array.isArray(value) && value.length) || recentCandidates.find(([,value]) => Array.isArray(value)) || ['none', []];
    const recentSourceKey = recentSource[0];
    const rawRecent = Array.isArray(recentSource[1]) ? recentSource[1] : [];
    const recent = normalizeRecentRequestRows(rawRecent);
    const recentLedger = normalizeRecentRequestRows(rawRecent, 200);
    if (![totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate,cachedInputTokens,cacheReadInputTokens,cacheCreationInputTokens].some(num) && !providers.length && !models.length && !rawRecent.length) return null;
    return {totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate,cachedInputTokens,cacheReadInputTokens,cacheCreationInputTokens,providers,models,recent,recentLedger,recentSourceKey,recentRawCount:rawRecent.length,requestProvenance:normalizeRequestProvenanceMetadata(raw?.requestProvenance),fetchedAt:raw.fetchedAt || Date.now(),source:String(raw.source || 'LLMGateway scoped usage')};
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
    return {scopes,errors:normalizeErrorMap(raw?.errors),fetchedAt:raw?.fetchedAt || scopes.all?.fetchedAt || Date.now(),source:String(raw?.source || 'LLMGateway hybrid scoped usage')};
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
      errors:normalizeErrorMap(raw?.errors),
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
      errors:normalizeErrorMap(raw?.errors),
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
      const selectedCreditsOrgId = String(r.creditsOrganizationId || '').trim();
      const creditOrg = orgRows.find(org =>
        selectedCreditsOrgId && String(org?.id || '') === selectedCreditsOrgId &&
        String(org?.kind || 'default') === 'default' &&
        String(org?.status || 'active') !== 'deleted'
      ) || orgRows.find(org =>
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
      const devpassAccount = ds ? {
        plan:String(ds.plan || 'none'),
        cycle:typeof ds.cycle === 'string' ? ds.cycle.trim() : '',
        billingCycleStart:ds.billingCycleStart || null,
        expiresAt:ds.expiresAt || null,
        cancelled:typeof ds.cancelled === 'boolean' ? ds.cancelled : null,
        pendingTier:ds.pendingTier === null || ds.pendingTier === undefined ? '' : String(ds.pendingTier),
        serviceTier:String(ds.serviceTier || 'default'),
        routingStrategy:String(ds.routingStrategy || 'auto'),
        paygEnabled:ds.paygEnabled === true,
        hasPersonalOrg:typeof ds.hasPersonalOrg === 'boolean' ? ds.hasPersonalOrg : null,
        hasBillingHistory:typeof ds.hasBillingHistory === 'boolean' ? ds.hasBillingHistory : null,
        resetPasses:num(ds.resetPasses) ? Number(ds.resetPasses) : null,
        includedResetPasses:num(ds.includedResetPasses) ? Number(ds.includedResetPasses) : null,
        includedResetPassesRemaining:num(ds.includedResetPassesRemaining) ? Number(ds.includedResetPassesRemaining) : null,
        resetPassPrice:num(ds.resetPassPrice) ? Number(ds.resetPassPrice) : null,
        regularCredits:num(ds.regularCredits) ? Number(ds.regularCredits) : null,
        source:String(ds.source || '')
      } : null;
      const out = {
        protocolVersion:Number(r.protocolVersion || 1),
        fetchedAt:r.fetchedAt || ds?.fetchedAt || ba?.fetchedAt || Date.now(),
        source:String(ba?.source || ds?.source || ('LLMGateway DevPass Bridge' + (r.bridgeVersion ? ' v' + r.bridgeVersion : ''))),
        health:{status:r.ok === false ? 'error' : 'ok', bridgeVersion:r.bridgeVersion || null},
        bridge:normalizeBridgeMetadata(r),
        monthly, weekly, credits, activity, runway, usageScopes, analytics, analyticsScopes, devpassAccount,
        organizations:orgRows.filter(org => String(org?.id || '') && String(org?.status || 'active') !== 'deleted').map(org => ({id:String(org.id),name:String(org?.name || org.id),kind:String(org?.kind || 'default'),status:String(org?.status || 'active'),credits:num(org?.credits)?Number(org.credits):null})),
        creditsOrganizationId:String(r.creditsOrganizationId || creditOrg?.id || ''),
        requestedCreditsOrganizationId:String(r.requestedCreditsOrganizationId || ''),
        creditsOrganizationFallback:r.creditsOrganizationFallback === true,
        creditsOrganizationFallbackReason:String(r.creditsOrganizationFallbackReason || '')
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
      bridge: normalizeBridgeMetadata(r),
      monthly: bucket(u.monthly, '월간'), weekly: bucket(u.weekly, '주간'), credits, activity, usageScopes, analytics, analyticsScopes
    };
    if (!out.monthly && !out.weekly && !out.credits && !out.activity) throw new Error('표시할 usage 데이터가 없어.');
    return out;
  }

  async function persist() {
    if (runtimeDisposed) return dropStaleAsync();
    await store.setItem(STATE_KEY, {...state});
    powerRuntime.persistWrites += 1;
  }

  function localRuntimeErrorKind(stage) {
    const key = String(stage || 'runtime');
    if (key.includes('persist')) return 'persist';
    if (key.includes('render')) return 'render';
    return 'runtime';
  }

  function localRuntimeActiveEntries() {
    return Object.values(localRuntimeErrors.active || {}).filter(Boolean);
  }

  function localRuntimeActiveCount() {
    return localRuntimeActiveEntries().length;
  }

  function noteLocalRuntimeError(stage, error) {
    const key = String(stage || 'runtime');
    const kind = localRuntimeErrorKind(key);
    const message = String(error?.message || error || 'unknown error')
      .replace(/llmgtwy_[A-Za-z0-9_-]+/g, 'llmgtwy_[REDACTED]')
      .replace(/Bearer\s+[^\s'\"]+/gi, 'Bearer [REDACTED]')
      .replace(/\s+/g, ' ')
      .slice(0, 180);
    const now = Date.now();
    localRuntimeErrors.count += 1;
    if (kind === 'persist') localRuntimeErrors.persistFailures += 1;
    if (kind === 'render') localRuntimeErrors.renderFailures += 1;
    const current = localRuntimeErrors.active?.[kind] || null;
    localRuntimeErrors.active[kind] = {
      stage:key,
      message,
      since:current?.since || now,
      lastAt:now,
      failures:Number(current?.failures || 0) + 1,
    };
    localRuntimeErrors.lastStage = key;
    localRuntimeErrors.lastMessage = message;
    localRuntimeErrors.lastAt = now;
    console.log(`[Local Usage Dashboard] local ${key} failed: ${message}`);
  }

  function noteLocalRuntimeRecovery(stage) {
    const key = String(stage || 'runtime');
    const kind = localRuntimeErrorKind(key);
    const active = localRuntimeErrors.active?.[kind] || null;
    if (!active) return false;
    localRuntimeErrors.active[kind] = null;
    localRuntimeErrors.recoveredCount = Number(localRuntimeErrors.recoveredCount || 0) + 1;
    localRuntimeErrors.lastRecoveryStage = key;
    localRuntimeErrors.lastRecoveryAt = Date.now();
    return true;
  }

  async function persistRefreshState(stage) {
    try { await persist(); noteLocalRuntimeRecovery(stage); return true; }
    catch (error) { noteLocalRuntimeError(stage, error); return false; }
  }

  async function renderRefreshWidget(reason, stage) {
    try { await renderWidget(reason); noteLocalRuntimeRecovery(stage); return true; }
    catch (error) { noteLocalRuntimeError(stage, error); return false; }
  }

  async function fetchSnapshot() {
    if (!token) throw new Error('Bridge Token을 먼저 저장해 줘.');
    const base = normalizeBridgeBase(state.bridgeBase);
    const selectedCreditsOrgId = String(state.selectedCreditsOrgId || '').trim();
    const snapshotUrl = `${base}/snapshot${selectedCreditsOrgId ? `?creditsOrgId=${encodeURIComponent(selectedCreditsOrgId)}` : ''}`;
    const res = await Risuai.nativeFetch(snapshotUrl, {
      method:'GET',
      headers:{Accept:'application/json','X-Local-Bridge-Key':token,'X-DevPass-Bridge-Key':token,'Cache-Control':'no-cache'}
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Bridge HTTP ${res.status}: ${text.slice(0,120)}`);
    try { return normalize(JSON.parse(text)); }
    catch (e) { if (e instanceof SyntaxError) throw new Error('Bridge 응답이 JSON이 아니야.'); throw e; }
  }


  function bridgeManagerAuthHeaders() {
    return {Accept:'application/json','X-Local-Bridge-Key':token,'X-DevPass-Bridge-Key':token,'Cache-Control':'no-cache'};
  }

  function normalizeBridgeManagerStatus(raw) {
    if (!raw || typeof raw !== 'object') return null;
    return {
      connected:true,
      ok:raw.ok !== false,
      protocol:String(raw.protocol || raw.managementProtocol || 'none'),
      version:String(raw.version || ''),
      productVersion:String(raw.productVersion || raw.product_version || ''),
      selfUpdate:raw.selfUpdate === true || raw.self_update === true,
      engineManaged:raw.engineManaged === true || raw.engine_managed === true,
      engineAdoption:raw.engineAdoption === true || raw.engine_adoption === true,
      engineMode:String(raw.engineMode || raw.engine_mode || 'legacy-external'),
      engineService:String(raw.engineService || raw.engine_service || ''),
      engineVersion:String(raw.engineVersion || raw.engine_version || ''),
      engineBundled:raw.engineBundled === true || raw.engine_bundled === true,
      engineBundleAvailable:raw.engineBundleAvailable === true || raw.engine_bundle_available === true,
      engineBundleReady:raw.engineBundleReady === true || raw.engine_bundle_ready === true,
      engineSourceMode:String(raw.engineSourceMode || raw.engine_source_mode || ''),
      engineBundleVersion:String(raw.engineBundleVersion || raw.engine_bundle_version || ''),
      cliRuntimeState:['ready','provisioning','unavailable','invalid'].includes(String(raw.cliRuntimeState || raw.cli_runtime_state)) ? String(raw.cliRuntimeState || raw.cli_runtime_state) : 'unavailable',
      cliRuntimeVersion:String(raw.cliRuntimeVersion || raw.cli_runtime_version || ''),
      cliRuntimeProvisioning:['ok','pending','backoff','disabled','unavailable'].includes(String(raw.cliRuntimeProvisioning || raw.cli_runtime_provisioning)) ? String(raw.cliRuntimeProvisioning || raw.cli_runtime_provisioning) : 'unavailable',
      candidateSafe:typeof raw.candidateSafe === 'boolean' ? raw.candidateSafe : null,
      adoptionState:String(raw.adoptionState || raw.adoption_state || ''),
      restartMode:String(raw.restartMode || raw.restart_mode || ''),
      updateChannel:String(raw.updateChannel || raw.update_channel || ''),
      checkedAt:Date.now(),
      error:''
    };
  }

  async function fetchBridgeManagerStatus(force = false) {
    const now = Date.now();
    const lastProbe = Number(state.bridgeManagerLastProbeAt || 0);
    if (!force && state.bridgeManagerRuntime && lastProbe > 0 && now - lastProbe < BRIDGE_MANAGER_PROBE_INTERVAL_MS) {
      return state.bridgeManagerRuntime;
    }
    state.bridgeManagerLastProbeAt = now;
    if (!token) return {connected:false,ok:false,protocol:'none',version:'',productVersion:'',selfUpdate:false,engineManaged:false,engineAdoption:false,engineMode:'legacy-external',engineService:'',engineVersion:'',candidateSafe:null,adoptionState:'',restartMode:'',updateChannel:'',checkedAt:now,error:'missing token'};
    try {
      const res = await Risuai.nativeFetch(`${BRIDGE_MANAGER_BASE}/status`, {method:'GET',headers:bridgeManagerAuthHeaders()});
      const text = await res.text();
      if (!res.ok) return {connected:false,ok:false,protocol:'none',version:'',productVersion:'',selfUpdate:false,engineManaged:false,engineAdoption:false,engineMode:'legacy-external',engineService:'',engineVersion:'',candidateSafe:null,adoptionState:'',restartMode:'',updateChannel:'',checkedAt:Date.now(),error:`HTTP ${res.status}`};
      const normalized = normalizeBridgeManagerStatus(JSON.parse(text));
      return normalized || {connected:false,ok:false,protocol:'none',version:'',productVersion:'',selfUpdate:false,engineManaged:false,engineAdoption:false,engineMode:'legacy-external',engineService:'',engineVersion:'',candidateSafe:null,adoptionState:'',restartMode:'',updateChannel:'',checkedAt:Date.now(),error:'invalid manager status'};
    } catch (e) {
      return {connected:false,ok:false,protocol:'none',version:'',productVersion:'',selfUpdate:false,engineManaged:false,engineAdoption:false,engineMode:'legacy-external',engineService:'',engineVersion:'',candidateSafe:null,adoptionState:'',restartMode:'',updateChannel:'',checkedAt:Date.now(),error:e?.message || String(e)};
    }
  }

  async function syncBridgeManagerIfNeeded(status) {
  if (!status?.connected || status.selfUpdate !== true) return status;
  if (String(status.productVersion || '') === VERSION) {
    state.bridgeManagerSyncedProductVersion = VERSION;
    return status;
  }
  // Live /status is authoritative. A persisted success marker must never suppress reconciliation.
  state.bridgeManagerSyncedProductVersion = '';
  try {
    const res = await Risuai.nativeFetch(`${BRIDGE_MANAGER_BASE}/sync`, {method:'POST',headers:{...bridgeManagerAuthHeaders(),'Content-Type':'application/json'},body:'{}'});
    const text = await res.text();
    if (!res.ok) {
      state.bridgeManagerLastProbeAt = 0;
      return {...status,syncError:`HTTP ${res.status}`};
    }
    const payload = JSON.parse(text);
    state.bridgeManagerLastProbeAt = 0;
    let fresh = null;
    for (const waitMs of [200, 350, 600, 900]) {
      await new Promise(resolve => setTimeout(resolve, waitMs));
      fresh = await fetchBridgeManagerStatus(true);
      if (fresh?.connected && String(fresh.productVersion || '') === VERSION) break;
    }
    const reconciled = Boolean(fresh?.connected && String(fresh.productVersion || '') === VERSION);
    if (reconciled) state.bridgeManagerSyncedProductVersion = VERSION;
    else state.bridgeManagerLastProbeAt = 0;
    return {
      ...(fresh?.connected ? fresh : status),
      lastSyncAction:payload?.updated ? 'updated' : 'current',
      syncTarget:String(payload?.productVersion || VERSION),
      syncError:reconciled ? '' : 'manager restart pending'
    };
  } catch (e) {
    state.bridgeManagerLastProbeAt = 0;
    return {...status,syncError:e?.message || String(e)};
  }
}

  async function adoptBridgeEngineIfNeeded(status) {
  if (!status?.connected || status.engineAdoption !== true) return status;
  if (String(status.productVersion || '') !== VERSION) return status;
  if (status.engineManaged === true) {
    state.bridgeEngineAdoptionAttemptedVersion = VERSION;
    return status;
  }
  // Live engine ownership wins over a persisted attempt marker; retry safely when still unmanaged.
  state.bridgeEngineAdoptionAttemptedVersion = '';
  try {
    const res = await Risuai.nativeFetch(`${BRIDGE_MANAGER_BASE}/engine/adopt`, {method:'POST',headers:{...bridgeManagerAuthHeaders(),'Content-Type':'application/json'},body:'{}'});
    const text = await res.text();
    const payload = JSON.parse(text);
    if (!res.ok) {
      state.bridgeManagerLastProbeAt = 0;
      return {...status,adoptionState:String(payload?.state || 'failed'),adoptionError:String(payload?.error || `HTTP ${res.status}`),candidateSafe:typeof payload?.candidateSafe === 'boolean' ? payload.candidateSafe : status.candidateSafe};
    }
    state.bridgeManagerLastProbeAt = 0;
    const fresh = await fetchBridgeManagerStatus(true);
    if (fresh?.connected && fresh.engineManaged === true) state.bridgeEngineAdoptionAttemptedVersion = VERSION;
    else state.bridgeManagerLastProbeAt = 0;
    return {...fresh,adoptionState:String(payload?.state || (payload?.adopted ? 'adopted' : 'current')),adoptionError:''};
  } catch (e) {
    state.bridgeManagerLastProbeAt = 0;
    return {...status,adoptionState:'probe-error',adoptionError:e?.message || String(e)};
  }
}

  async function syncBridgeEngineBundleIfNeeded(status) {
  if (!status?.connected || status.engineManaged !== true || status.engineBundleAvailable !== true) return status;
  if (String(status.productVersion || '') !== VERSION) return status;
  const runningEngineVersion = String(status.engineVersion || '');
  const bundledEngineVersion = String(status.engineBundleVersion || '');
  if (status.engineBundled === true && bundledEngineVersion && runningEngineVersion === bundledEngineVersion) {
    state.bridgeEngineBundleSyncAttemptedVersion = VERSION;
    return status;
  }
  // Live bundle state wins over a persisted attempt marker; retry while the manager still reports adopted.
  state.bridgeEngineBundleSyncAttemptedVersion = '';
  try {
    const res = await Risuai.nativeFetch(`${BRIDGE_MANAGER_BASE}/engine/sync`, {method:'POST',headers:{...bridgeManagerAuthHeaders(),'Content-Type':'application/json'},body:'{}'});
    const text = await res.text();
    const payload = JSON.parse(text);
    if (!res.ok) {
      state.bridgeManagerLastProbeAt = 0;
      return {...status,engineBundleSyncState:String(payload?.state || 'failed'),engineBundleSyncError:String(payload?.error || `HTTP ${res.status}`)};
    }
    state.bridgeManagerLastProbeAt = 0;
    let fresh = await fetchBridgeManagerStatus(true);
    if (!fresh?.connected || fresh.engineBundled !== true) {
      await new Promise(resolve => setTimeout(resolve, 300));
      fresh = await fetchBridgeManagerStatus(true);
    }
    const reconciled = Boolean(fresh?.connected && fresh.engineBundled === true);
    if (reconciled) state.bridgeEngineBundleSyncAttemptedVersion = VERSION;
    else state.bridgeManagerLastProbeAt = 0;
    return {
      ...(fresh?.connected ? fresh : status),
      engineBundleSyncState:String(payload?.state || (payload?.synced ? 'bundled' : 'current')),
      engineBundleSyncError:reconciled ? '' : 'engine restart pending'
    };
  } catch (e) {
    state.bridgeManagerLastProbeAt = 0;
    return {...status,engineBundleSyncState:'probe-error',engineBundleSyncError:e?.message || String(e)};
  }
}
  async function refresh(reason = 'manual', silent = false) {
    if (runtimeDisposed) return;
    const refreshEpoch = runtimeEpoch;
    if (!canBridgeRefresh()) { bridgeLifecycleRuntime.blockedRefreshes += 1; return; }
    const refreshLifecycleGeneration = bridgeLifecycleRuntime.generation;
    if (refreshInFlight) return refreshInFlight;
    if (state.backgroundPause !== false && document.visibilityState === 'hidden') return;
    requestUiStallProbeBurst(reason === 'timer' ? UI_STALL_PROBE_TIMER_BURST_MS : UI_STALL_PROBE_ACTIVE_BURST_MS);
    const started = Date.now();
    const refreshAttribution = beginRefreshAttribution(reason, started);
    const startedPerf = typeof performance?.now === 'function' ? performance.now() : 0;
    const refreshPhaseDurations = Object.create(null);
    const refreshPhaseNow = () => typeof performance?.now === 'function' ? performance.now() : Date.now();
    const finishRefreshPhase = (name, phaseStarted) => {
      const ended = refreshPhaseNow();
      refreshPhaseDurations[String(name)] = Math.max(0, roundPerfMs(ended - Number(phaseStarted || ended)) || 0);
      return ended;
    };
    performanceRuntime.activeRefreshStartedPerf = startedPerf;
    performanceRuntime.activeRefreshReason = String(reason || 'manual');
    const resumeVisibilityRefresh = reason === 'visibility' && performanceRuntime.resumeMeasurePending;
    if (resumeVisibilityRefresh) {
      performanceRuntime.lastResumeRequestedReason = 'visibility';
      performanceRuntime.lastResumeActualReason = 'visibility';
      performanceRuntime.lastResumeRefreshWasCoalesced = false;
      performanceRuntime.lastResumeCoalescedIntoReason = '';
      const visiblePerf = Number(performanceRuntime.resumeVisiblePerf || 0);
      performanceRuntime.lastResumeRefreshStartedAfterMs = visiblePerf > 0 && startedPerf > 0
        ? roundPerfMs(startedPerf - visiblePerf)
        : null;
    }
    refreshInFlight = (async () => {
      try {
        let refreshPhaseStarted = refreshPhaseNow();
        const managerStatus = await fetchBridgeManagerStatus(reason !== 'timer');
        finishRefreshPhase('manager-probe', refreshPhaseStarted);
        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        refreshPhaseStarted = refreshPhaseNow();
        const managerSynced = await syncBridgeManagerIfNeeded(managerStatus);
        finishRefreshPhase('manager-sync', refreshPhaseStarted);
        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        refreshPhaseStarted = refreshPhaseNow();
        const managerAdopted = await adoptBridgeEngineIfNeeded(managerSynced);
        finishRefreshPhase('engine-adopt', refreshPhaseStarted);
        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        refreshPhaseStarted = refreshPhaseNow();
        const managerRuntime = await syncBridgeEngineBundleIfNeeded(managerAdopted);
        finishRefreshPhase('engine-sync', refreshPhaseStarted);
        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        state.bridgeManagerRuntime = managerRuntime;
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        refreshPhaseStarted = refreshPhaseNow();
        const snapshot = await fetchSnapshot();
        finishRefreshPhase('snapshot', refreshPhaseStarted);
        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        refreshPhaseStarted = refreshPhaseNow();
        state.data = applyObservedToday(snapshot);
        finishRefreshPhase('normalize-ledger', refreshPhaseStarted);
        if (state.data?.creditsOrganizationFallback && state.data?.creditsOrganizationId) {
          const from = String(state.data.requestedCreditsOrganizationId || state.selectedCreditsOrgId || '');
          const to = String(state.data.creditsOrganizationId || '');
          if (from && to && from !== to) {
            state.creditsOrgFallbackCount = Number(state.creditsOrgFallbackCount || 0) + 1;
            state.creditsOrgLastFallbackFrom = from;
            state.creditsOrgLastFallbackTo = to;
          }
          state.selectedCreditsOrgId = to;
        }
        collectRecentRequestLedger(state.data);
        state.bridgeStatus = 'connected';
        state.bridgeError = '';
        state.lastSyncAt = Date.now();
        performanceRuntime.lastHealthySyncAt = state.lastSyncAt;
        state.lastSyncDurationMs = state.lastSyncAt - started;
        noteRefreshPerformance(state.lastSyncDurationMs, reason);
        state.lastRefreshReason = reason;
        state.refreshCount = Number(state.refreshCount || 0) + 1;
        state.consecutiveFailures = 0;
        state.retryDelayMs = 0;
        state.nextRetryAt = null;
        updateRuntimeState('refresh-success');
        refreshPhaseStarted = refreshPhaseNow();
        await persistRefreshState('refresh-success-persist');
        finishRefreshPhase('persist', refreshPhaseStarted);
        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        refreshPhaseStarted = refreshPhaseNow();
        await renderRefreshWidget(reason, 'refresh-success-render');
        finishRefreshPhase('widget-render', refreshPhaseStarted);
        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        if (resumeVisibilityRefresh) {
          performanceRuntime.lastResumeRefreshMs = state.lastSyncDurationMs;
          performanceRuntime.lastResumeRenderMs = performanceRuntime.lastRenderMs;
          pushPerformanceSample('resumeRefreshSamples', state.lastSyncDurationMs);
        }
        scheduleRefresh();
        schedulePanelRender(false);
      } catch (e) {
        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        // Keep the last successful snapshot in state.data; only status changes.
        state.bridgeStatus = 'error';
        state.bridgeError = e?.message || String(e);
        state.lastRefreshReason = reason;
        state.consecutiveFailures = Number(state.consecutiveFailures || 0) + 1;
        state.retryDelayMs = retryDelayFor(state.consecutiveFailures);
        state.nextRetryAt = Number(state.refreshMs) > 0 ? Date.now() + state.retryDelayMs : null;
        updateRuntimeState('refresh-error');
        await persistRefreshState('refresh-error-persist');
        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
        // Keep the last good values, but immediately repaint the widget so
        // LIVE changes to OFFLINE as soon as a refresh fails. Local persist/render
        // failures must not abort retry scheduling or masquerade as bridge errors.
        await renderRefreshWidget(reason, 'refresh-error-render');
        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();
        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();
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
      performanceRuntime.lastRefreshPhases = {...refreshPhaseDurations};
      const slowestRefreshPhase = Object.entries(refreshPhaseDurations).sort((a,b) => Number(b[1] || 0) - Number(a[1] || 0))[0] || null;
      performanceRuntime.lastRefreshSlowestPhase = slowestRefreshPhase ? String(slowestRefreshPhase[0]) : '';
      performanceRuntime.lastRefreshSlowestPhaseMs = slowestRefreshPhase ? Number(slowestRefreshPhase[1]) : null;
      const attributionStatus = state.lastRefreshReason === reason
        ? (state.bridgeStatus === 'connected' ? 'ok' : state.bridgeStatus === 'error' ? 'error' : String(state.bridgeStatus || 'unknown'))
        : 'unknown';
      const attributionDataDuration = attributionStatus === 'ok' && num(state.lastSyncDurationMs) ? Number(state.lastSyncDurationMs) : null;
      finishRefreshAttribution(refreshAttribution, attributionStatus, Date.now() - started, attributionDataDuration);
      performanceRuntime.activeRefreshStartedPerf = 0;
      performanceRuntime.activeRefreshReason = '';
      refreshInFlight = null;
      if (runtimeIsCurrent(refreshEpoch)) updateRuntimeState('refresh-complete');
    }
  }

  function refreshPhaseTimingText(phases = performanceRuntime.lastRefreshPhases) {
    const rows = Object.entries(phases && typeof phases === 'object' ? phases : {})
      .filter(([,value]) => num(value))
      .sort((a,b) => Number(b[1]) - Number(a[1]));
    return rows.length ? rows.map(([name,value]) => `${name} ${roundPerfMs(value)}ms`).join(' · ') : '—';
  }

  function snapshotPerformanceMs(value) {
    return num(value) ? `${Math.round(Number(value))}ms` : '—';
  }

  function bridgeSnapshotJobsText(performance) {
    const tasks = performance?.tasks && typeof performance.tasks === 'object' ? performance.tasks : null;
    if (!tasks) return '—';
    const names = ['organizations','devpassStatus','usageScopes','analyticsScopes','runway'];
    const rows = names.filter(name => num(tasks[name])).map(name => `${name} ${snapshotPerformanceMs(tasks[name])}`);
    return rows.join(' · ') || '—';
  }

  function bridgeSnapshotCliTimingText(performance) {
    const cli = performance?.cli && typeof performance.cli === 'object' ? performance.cli : null;
    if (!cli) return '—';
    const runs = Number(cli.runs || 0);
    const queued = Number(cli.queuedRuns || 0);
    return `limit ${num(cli.limit) ? Number(cli.limit) : '—'} · peak active ${num(cli.peakActive) ? Number(cli.peakActive) : '—'} · runs ${runs} · queued ${queued} · queue avg ${snapshotPerformanceMs(cli.queueWaitAvgMs)} · max ${snapshotPerformanceMs(cli.queueWaitMaxMs)} · exec avg ${snapshotPerformanceMs(cli.executionAvgMs)} · max ${snapshotPerformanceMs(cli.executionMaxMs)} · slowest ${cli.slowestLabel || '—'} ${snapshotPerformanceMs(cli.slowestTotalMs)}`;
  }

  function bridgeSnapshotCounterText(value, keys) {
    if (!value || typeof value !== 'object') return '—';
    return keys.map(([key,label]) => `${label} ${Number(value[key] || 0)}`).join(' · ');
  }

  function bridgeOrganizationDiscoveryText(performance) {
    const discovery = performance?.organizationDiscovery && typeof performance.organizationDiscovery === 'object'
      ? performance.organizationDiscovery
      : null;
    if (!discovery) return '—';
    return `${discovery.mode || 'unknown'} · fallback ${Number(discovery.fallbackCount || 0)} · shared account capture ${discovery.sharedAccountCapture ? 'yes' : 'no'}`;
  }

  function bridgeCaptureReuseText(performance) {
    const reuse = performance?.captureReuse && typeof performance.captureReuse === 'object'
      ? performance.captureReuse
      : null;
    if (!reuse) return '—';
    const checks = Number(reuse.activityReuseChecks || 0);
    const shared = Number(reuse.activityShared || 0);
    const activityState = checks > 0 ? (shared > 0 ? 'yes' : 'no') : 'not-exercised';
    return `bootstrap ${reuse.bootstrapRange || '—'} · activity shared ${activityState} · dedicated 24h fallback ${Number(reuse.dedicated24hFallbacks || 0)}`;
  }

  function bridgeSnapshotTimelineText(performance) {
    const timeline = performance?.taskTimeline && typeof performance.taskTimeline === 'object'
      ? performance.taskTimeline
      : null;
    if (!timeline) return '—';
    const names = ['organizations','devpassStatus','usageScopes','analyticsScopes','runway'];
    const rows = names
      .map((name) => [name, timeline[name]])
      .filter(([,value]) => value && Number.isFinite(Number(value.startOffsetMs)) && Number.isFinite(Number(value.endOffsetMs)))
      .map(([name,value]) => `${name} ${Math.round(Number(value.startOffsetMs))}→${Math.round(Number(value.endOffsetMs))}ms`);
    return rows.join(' · ') || '—';
  }

  function bridgeCliOperationsText(performance) {
    const operations = Array.isArray(performance?.cliOperations) ? performance.cliOperations.slice(0, 8) : [];
    if (!operations.length) return '—';
    return operations.map((item) => {
      const label = String(item?.label || 'cli');
      const launcher = ['managed-direct','direct','npx-fallback'].includes(String(item?.launcher)) ? String(item.launcher) : 'unknown';
      const start = Number.isFinite(Number(item?.startOffsetMs)) ? Math.round(Number(item.startOffsetMs)) : 0;
      const end = Number.isFinite(Number(item?.endOffsetMs)) ? Math.round(Number(item.endOffsetMs)) : start;
      const queue = Number.isFinite(Number(item?.queueWaitMs)) ? Math.round(Number(item.queueWaitMs)) : 0;
      const exec = Number.isFinite(Number(item?.executionMs)) ? Math.round(Number(item.executionMs)) : 0;
      return `${label} [${launcher}] ${start}→${end}ms · q${queue} · exec${exec}`;
    }).join(' · ');
  }

  function bridgeCliLauncherText(performance) {
    const operations = Array.isArray(performance?.cliOperations) ? performance.cliOperations.slice(0, 8) : [];
    if (!operations.length) return '—';
    const counts = { managedDirect:0, direct:0, npxFallback:0, unknown:0, directEnoent:0 };
    const npxPolicies = new Set();
    for (const item of operations) {
      const launcher = ['managed-direct','direct','npx-fallback'].includes(String(item?.launcher)) ? String(item.launcher) : 'unknown';
      if (launcher === 'managed-direct') counts.managedDirect += 1;
      else if (launcher === 'direct') counts.direct += 1;
      else if (launcher === 'npx-fallback') counts.npxFallback += 1;
      else counts.unknown += 1;
      if (launcher === 'npx-fallback' && String(item?.fallbackReason) === 'direct-enoent') counts.directEnoent += 1;
      if (launcher === 'npx-fallback') {
        const policy = ['prefer-offline','default'].includes(String(item?.npxPolicy)) ? String(item.npxPolicy) : 'not-applicable';
        npxPolicies.add(policy);
      }
    }
    const npxPolicy = npxPolicies.size === 1 ? [...npxPolicies][0] : 'not-applicable';
    return `managed-direct ${counts.managedDirect} · direct ${counts.direct} · npx-fallback ${counts.npxFallback} · unknown ${counts.unknown} · policy ${npxPolicy} · direct ENOENT ${counts.directEnoent}`;
  }

  function bridgeCliRuntimeText(diagnostics) {
    const runtime = diagnostics?.cliRuntime && typeof diagnostics.cliRuntime === 'object' ? diagnostics.cliRuntime : null;
    const manager = state.bridgeManagerRuntime || null;
    const stateValue = ['ready','provisioning','unavailable','invalid'].includes(String(runtime?.state || manager?.cliRuntimeState)) ? String(runtime?.state || manager?.cliRuntimeState) : 'unavailable';
    const version = String(runtime?.version || manager?.cliRuntimeVersion || '');
    const provisioning = ['ok','pending','backoff','disabled','unavailable'].includes(String(runtime?.provisioning || manager?.cliRuntimeProvisioning)) ? String(runtime?.provisioning || manager?.cliRuntimeProvisioning) : 'unavailable';
    return `managed · ${stateValue} · ${version ? `v${version}` : 'v—'} · provisioning ${provisioning}`;
  }

  function bridgeCreditsEarlyStartText(performance) {
    const early = performance?.creditsEarlyStart && typeof performance.creditsEarlyStart === 'object'
      ? performance.creditsEarlyStart
      : null;
    if (!early) return '—';
    const decision = ['started','skipped','not-evaluated'].includes(String(early.decision)) ? String(early.decision) : 'unknown';
    const mode = ['requested-exact','single-credit-id'].includes(String(early.candidateMode)) ? String(early.candidateMode) : '—';
    const reason = ['serial-mode','no-safe-candidate','prefetch-error','bootstrap-error'].includes(String(early.reason)) ? String(early.reason) : 'none';
    const result = ['none','in-flight','completed','failed'].includes(String(early.result)) ? String(early.result) : 'unknown';
    return `decision ${decision} · candidate ${mode} · result ${result} · reason ${reason}`;
  }

  function bridgeSnapshotCacheDecisionsText(performance) {
    const events = Array.isArray(performance?.cacheDecisions) ? performance.cacheDecisions.slice(0, 64) : [];
    if (!events.length) return '—';
    const groups = new Map();
    for (const item of events) {
      const family = ['organizations','accountCapture','creditsBootstrap','devpassStatus','usageScopes','analyticsScopes','usage','devpassActivity','activity','analytics','runway','other'].includes(String(item?.family))
        ? String(item.family)
        : 'other';
      const scope = ['all','devpass','credits'].includes(String(item?.scope)) ? String(item.scope) : '';
      const range = ['24h','7d','30d'].includes(String(item?.range)) ? String(item.range) : '';
      const key = [family, scope, range].filter(Boolean).join('/');
      if (!groups.has(key)) groups.set(key, { family, scope, range, actions:[], ageMs:null, ttlMs:null });
      const group = groups.get(key);
      const action = ['hit','miss','join','load','stale','deferred','blocked','error'].includes(String(item?.action)) ? String(item.action) : 'other';
      const reason = ['empty','expired','deferred-refresh','circuit-open','refresh-error'].includes(String(item?.reason)) ? String(item.reason) : '';
      const actionText = reason ? `${action}(${reason})` : action;
      if (group.actions.at(-1) !== actionText) group.actions.push(actionText);
      if (Number.isFinite(Number(item?.ageMs))) group.ageMs = Math.max(0, Number(item.ageMs));
      if (Number.isFinite(Number(item?.ttlMs))) group.ttlMs = Math.max(0, Number(item.ttlMs));
    }
    const rows = [...groups.values()]
      .sort((a,b) => {
        const aLong = ['7d','30d'].includes(a.range) ? 0 : 1;
        const bLong = ['7d','30d'].includes(b.range) ? 0 : 1;
        if (aLong !== bLong) return aLong - bLong;
        const aLoad = a.actions.some(value => /load|stale|blocked|error/.test(value)) ? 0 : 1;
        const bLoad = b.actions.some(value => /load|stale|blocked|error/.test(value)) ? 0 : 1;
        return aLoad - bLoad;
      })
      .slice(0, 24)
      .map((group) => {
        const label = [group.family, group.scope, group.range].filter(Boolean).join('/');
        const ageText = group.ageMs === null ? '' : ` · age ${Math.round(group.ageMs)}ms`;
        const ttlText = group.ttlMs === null ? '' : ` · ttl ${Math.round(group.ttlMs)}ms`;
        return `${label} ${group.actions.join('→') || '—'}${ageText}${ttlText}`;
      });
    return rows.join(' · ') || '—';
  }

  function bridgeSecondaryRefreshText(performance) {
    const secondary = performance?.secondaryRefresh && typeof performance.secondaryRefresh === 'object'
      ? performance.secondaryRefresh
      : null;
    if (!secondary) return '—';
    const after = Number.isFinite(Number(secondary.lastStartAfterForegroundMs))
      ? `+${Math.round(Number(secondary.lastStartAfterForegroundMs))}ms`
      : '—';
    return `limit ${Number(secondary.limit || 1)} · queued ${Number(secondary.queued || 0)} · running ${Number(secondary.running || 0)} · served stale ${Number(secondary.servedStale || 0)} · completed ${Number(secondary.completed || 0)} · errors ${Number(secondary.errors || 0)} · blocked ${Number(secondary.blocked || 0)} · superseded ${Number(secondary.superseded || 0)} · foreground held ${Number(secondary.foregroundHeld || 0)} · dropped ${Number(secondary.dropped || 0)} · last start after foreground ${after}`;
  }

  function stableReadinessSnapshot(bridgeDiag, runtimeBridge) {
    const blockers = [];
    const lifecycle = bridgeLifecycleMode();
    if (lifecycle !== 'live') blockers.push(`lifecycle ${lifecycle}`);
    if (bridgeDiag?.compatible !== true) blockers.push(`bridge compatibility ${bridgeDiag?.compatible === false ? 'no' : 'unknown'}`);
    if (String(bridgeDiag?.version || '') !== REQUIRED_BRIDGE_VERSION) blockers.push(`engine ${bridgeDiag?.version || '—'}`);
    if (!runtimeBridge?.managerInstalled) blockers.push('manager absent');
    if (String(runtimeBridge?.managerVersion || '') !== REQUIRED_BRIDGE_MANAGER_VERSION) blockers.push(`manager ${runtimeBridge?.managerVersion || '—'}`);
    const managerProduct = String(state.bridgeManagerRuntime?.productVersion || '');
    const managerSync = String(state.bridgeManagerSyncedProductVersion || '');
    if (managerProduct && managerProduct !== VERSION) blockers.push(`manager product ${managerProduct}`);
    if (managerSync && managerSync !== VERSION) blockers.push(`manager sync ${managerSync}`);
    const activeLocalErrors = localRuntimeActiveCount();
    if (activeLocalErrors > 0) blockers.push(`active local errors ${activeLocalErrors}`);
    if (Number(state.consecutiveFailures || 0) > 0) blockers.push(`refresh failures ${Number(state.consecutiveFailures || 0)}`);
    const updaterCompatible = /^3\.0\.0-alpha\.5\.(?:4[6-9]|[5-9]\d|\d{3,})$/.test(VERSION) || /^3\.[1-9]\d*\.\d+$/.test(VERSION);
    if (!updaterCompatible) blockers.push('updater version ordering');
    return {ready:blockers.length === 0, blockers, updaterCompatible};
  }

  function cacheObserverDiagnosticText(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const tokenRows = list.filter(row => [row?.cachedInputTokens,row?.cacheReadInputTokens,row?.cacheCreationInputTokens].some(num));
    const sources = [...new Set(tokenRows.map(row => String(row?.cacheMetricSource || '')).filter(Boolean))].sort();
    const readKnown = list.filter(row => num(row?.cacheReadInputTokens)).length;
    const writeKnown = list.filter(row => num(row?.cacheCreationInputTokens)).length;
    const writeReported = list.filter(row => row?.cacheWriteTelemetry === 'reported').length;
    const writeNotReported = list.filter(row => row?.cacheWriteTelemetry === 'not-reported').length;
    const writeUnknownOnCache = list.filter(row => [row?.cacheReadInputTokens,row?.cacheCreationInputTokens].some(num) && !['reported','not-reported'].includes(String(row?.cacheWriteTelemetry || ''))).length;
    const readWithoutWriteValue = list.filter(row => num(row?.cacheReadInputTokens) && !num(row?.cacheCreationInputTokens)).length;
    const ttlReported = list.filter(row => row?.cacheTtlTelemetry === 'reported').length;
    return `independent · protocol cache-observability-v1 · parser provider-usage-v3 · source sanitized LLMGateway /logs · token rows ${tokenRows.length}/${list.length} · read known ${readKnown}/${list.length} · write known ${writeKnown}/${list.length} · write reported ${writeReported}/${list.length} · write not-reported ${writeNotReported}/${list.length} · write unknown-on-cache ${writeUnknownOnCache}/${list.length} · read/no-write-value ${readWithoutWriteValue}/${list.length} · ttl reported ${ttlReported}/${list.length} · parser sources ${sources.join(',') || 'none'}`;
  }

  function requestProvenanceDiagnosticMetadata() {
    const source = state.data?.usageScopes?.scopes?.all?.requestProvenance || null;
    if (source && typeof source === 'object') return source;
    const stats = requestAccountScopeStats(requestLedgerRowsForScope('all'));
    return {
      captureMode:'unknown',
      rows:stats.rows,
      fallbackCount:0,
      devpass:stats.devpass,
      credits:stats.credits,
      unknown:stats.unknown,
      conflict:stats.conflict,
      modelInference:0,
      authority:'unknown',
    };
  }

  function diagText() {
    const diagnosticCapturedAt = Date.now();
    const d = state.data || {}, h = d.health || {};
    const bridgeDiag = bridgeStabilitySnapshot();
    const runtimeBridge = bridgeRuntimeSnapshot();
    const diagUsageKey = ['all','devpass','credits'].includes(String(state.usageScopeView)) ? String(state.usageScopeView) : 'all';
    const diagUsage = d.usageScopes?.scopes?.[diagUsageKey] || null;
    const diagLedgerRows = requestLedgerRowsForScope(diagUsageKey);
    const diagLedgerHours = new Set(diagLedgerRows.map(row => requestHourKey(row.timestamp)).filter(Boolean)).size;
    const diagLedgerFidelity = requestLedgerCapabilities(diagLedgerRows);
    const diagCacheObservability = requestCacheObservabilityStats(diagLedgerRows);
    const diagDurationFidelity = requestDurationStats(diagLedgerRows);
    const diagTierFidelity = requestServiceTierStats(diagLedgerRows);
    const diagOutcome = requestOutcomeStats(diagLedgerRows);
    const diagHttpStatus = requestHttpStatusStats(diagLedgerRows);
    const diagRequestProvenance = requestProvenanceDiagnosticMetadata();
    const diagRequestProvenanceRows = Math.max(0, Number(diagRequestProvenance?.rows || 0));
    const diagRequestProvenanceMode = ['account-wide','project-fallback'].includes(String(diagRequestProvenance?.captureMode))
      ? String(diagRequestProvenance.captureMode)
      : 'unknown';
    const stableReadiness = stableReadinessSnapshot(bridgeDiag, runtimeBridge);
    const diagAccount = d.devpassAccount && typeof d.devpassAccount === 'object' ? d.devpassAccount : null;
    return [
      `Local Usage Dashboard v${VERSION}`,
      `Diagnostic captured: ${diagnosticTimestamp(diagnosticCapturedAt)}`,
      `Diagnostic refresh identity: ${diagnosticsCaptureIdentityText(diagnosticsCaptureIdentity(diagnosticCapturedAt))}`,
      `Runtime loaded at: ${diagnosticTimestamp(RUNTIME_LOADED_AT)}`,
      `Runtime uptime: ${diagnosticUptime(diagnosticCapturedAt - RUNTIME_LOADED_AT)}`,
      `Unified runtime: schema v${PRODUCT_RUNTIME_SCHEMA_VERSION} · product ${VERSION} · plugin bundled · bridge ${runtimeBridge.mode} · manager ${runtimeBridge.managerInstalled ? 'installed' : 'absent'}`,
      `Bridge manager: protocol ${runtimeBridge.managerProtocol} · installed ${runtimeBridge.managerInstalled ? 'yes' : 'no'} · self-update ${runtimeBridge.selfUpdate ? 'yes' : 'no'} · engine-managed ${runtimeBridge.engineManaged ? 'yes' : 'no'} · ${runtimeBridge.managerVersion ? `v${runtimeBridge.managerVersion}` : 'v—'} · target ${BRIDGE_MANAGER_PROTOCOL}`,
      `Bridge manager probe: ${state.bridgeManagerRuntime?.connected ? 'connected' : 'unavailable'} · checked ${state.bridgeManagerRuntime?.checkedAt ? age(state.bridgeManagerRuntime.checkedAt) : '—'} · product ${state.bridgeManagerRuntime?.productVersion || '—'} · sync ${state.bridgeManagerSyncedProductVersion || 'none'}`,
      `Bridge manager sync: action ${state.bridgeManagerRuntime?.lastSyncAction || 'none'} · target ${state.bridgeManagerRuntime?.syncTarget || '—'} · error ${state.bridgeManagerRuntime?.syncError || 'none'}`,
      `Bridge engine sync: bundle ${state.bridgeManagerRuntime?.engineBundleSyncState || 'none'} · error ${state.bridgeManagerRuntime?.engineBundleSyncError || 'none'}`,
      `Bridge engine: mode ${runtimeBridge.engineMode} · managed ${runtimeBridge.engineManaged ? 'yes' : 'no'} · adoption ${runtimeBridge.engineAdoption ? 'ready' : 'no'} · service ${runtimeBridge.engineService || '—'} · candidate ${runtimeBridge.candidateSafe === null ? 'unknown' : runtimeBridge.candidateSafe ? 'safe' : 'unsafe'} · state ${state.bridgeManagerRuntime?.adoptionState || '—'}`,
      `Runtime manifest: ${RUNTIME_MANIFEST_URL}`,
      `Bridge: ${state.bridgeStatus} · ${state.bridgeBase}`,
      `Bridge lifecycle: ${bridgeLifecycleMode()} · generation ${Number(bridgeLifecycleRuntime.generation || 0)} · token ${token ? 'yes' : 'no'} · paused ${state.bridgePausedAt ? age(state.bridgePausedAt) : 'none'} · last reconnect ${state.bridgeLastReconnectAt ? age(state.bridgeLastReconnectAt) : '—'} · token cleared ${state.bridgeTokenClearedAt ? age(state.bridgeTokenClearedAt) : 'never'}`,
      `Lifecycle refresh: drops ${Number(bridgeLifecycleRuntime.refreshDrops || 0)} · blocked ${Number(bridgeLifecycleRuntime.blockedRefreshes || 0)} · last transition ${bridgeLifecycleRuntime.lastTransitionFrom || '—'} → ${bridgeLifecycleRuntime.lastTransitionTo || '—'} · reason ${bridgeLifecycleRuntime.lastTransitionReason || '—'} · ${bridgeLifecycleRuntime.lastTransitionAt ? age(bridgeLifecycleRuntime.lastTransitionAt) : '—'}`,
      `Protocol: ${num(d.protocolVersion) ? d.protocolVersion : '—'}` ,
      `Source: ${d.source || '—'}`,
      `Adapter: devpass-bridge-v1.6.x + local-json-v1`,
      `Schema: snapshot v${SNAPSHOT_SCHEMA_VERSION} · recent-request v${RECENT_REQUEST_SCHEMA_VERSION}`,
      `Stable readiness: ${stableReadiness.ready ? 'READY' : 'BLOCKED'} · updater ${stableReadiness.updaterCompatible ? 'compatible' : 'incompatible'} · blockers ${stableReadiness.blockers.join(', ') || 'none'} · local recoveries ${Number(localRuntimeErrors.recoveredCount || 0)}`,
      `Stable contract: engine ${REQUIRED_BRIDGE_VERSION} · manager 1.3.0 · snapshot v${SNAPSHOT_SCHEMA_VERSION} · recent-request v${RECENT_REQUEST_SCHEMA_VERSION} · state v3`,
      `Health: ${h.status || '—'}`,
      `Bridge detail: ${bridgeDiag.version ? `v${bridgeDiag.version}` : '—'} · required >=${REQUIRED_BRIDGE_VERSION} · compatible ${bridgeDiag.compatible === null ? 'unknown' : bridgeDiag.compatible ? 'yes' : 'no'} · snapshot ${bridgeDiag.fetchedAt ? age(bridgeDiag.fetchedAt) : '—'}`,
      `Bridge modules: ${bridgeDiag.moduleCount ?? '—'} · stale ${bridgeDiag.staleModules ?? '—'} · errors ${bridgeDiag.errorModules ?? '—'}`,
      `Bridge module freshness: ${bridgeModuleFreshnessText(bridgeDiag.moduleDetails)}`,
      `Bridge module duration: ${bridgeModuleDurationText(bridgeDiag.moduleDetails)}`,
      `Bridge organization discovery: ${bridgeOrganizationDiscoveryText(bridgeDiag.snapshotPerformance)}`,
      `Bridge 24h capture reuse: ${bridgeCaptureReuseText(bridgeDiag.snapshotPerformance)}`,
      `Bridge snapshot attribution: ${bridgeDiag.snapshotPerformance ? `total ${snapshotPerformanceMs(bridgeDiag.snapshotPerformance.totalMs)} · critical ${bridgeDiag.snapshotPerformance.criticalPath || '—'} ${snapshotPerformanceMs(bridgeDiag.snapshotPerformance.criticalPathMs)} · slowest ${bridgeDiag.snapshotPerformance.slowestTask || '—'} ${snapshotPerformanceMs(bridgeDiag.snapshotPerformance.slowestTaskMs)}` : '—'}`,
      `Bridge snapshot jobs: ${bridgeSnapshotJobsText(bridgeDiag.snapshotPerformance)}`,
      `Bridge snapshot timeline: ${bridgeSnapshotTimelineText(bridgeDiag.snapshotPerformance)}`,
      `Bridge CLI operations: ${bridgeCliOperationsText(bridgeDiag.snapshotPerformance)}`,
      `Bridge CLI runtime: ${bridgeCliRuntimeText(state.data?.bridge?.diagnostics)}`,
      `Bridge CLI launcher: ${bridgeCliLauncherText(bridgeDiag.snapshotPerformance)}`,
      `Bridge Credits early-start: ${bridgeCreditsEarlyStartText(bridgeDiag.snapshotPerformance)}`,
      `Bridge CLI timing: ${bridgeSnapshotCliTimingText(bridgeDiag.snapshotPerformance)}`,
      `Bridge snapshot cache: ${bridgeSnapshotCounterText(bridgeDiag.snapshotPerformance?.cache, [['hits','hit'],['misses','miss'],['joins','join'],['loads','load'],['errors','errors'],['staleFallbacks','stale fallback']])}`,
      `Bridge snapshot cache decisions: ${bridgeSnapshotCacheDecisionsText(bridgeDiag.snapshotPerformance)}`,
      `Bridge secondary refresh: ${bridgeSecondaryRefreshText(bridgeDiag.snapshotPerformance)}`,
      `Bridge snapshot circuit: ${bridgeSnapshotCounterText(bridgeDiag.snapshotPerformance?.circuits, [['opens','opened'],['blocked','blocked'],['recoveries','recoveries']])}`,
      `Bridge partial: modules ${bridgeDiag.partialModules ?? '—'} · usage ${countErrorMap(d.usageScopes?.errors)} · analytics ${countErrorMap(d.analyticsScopes?.errors)}`,
      `Bridge cache: hit ${bridgeDiag.cacheHitRate === null ? '—' : `${bridgeDiag.cacheHitRate.toFixed(0)}%`} · entries ${bridgeDiag.cacheEntries ?? '—'} · in-flight ${bridgeDiag.inFlight ?? '—'} · stale fallback ${bridgeDiag.staleFallbacks ?? '—'}`,
      `Bridge CLI/circuit: active ${bridgeDiag.cliActive ?? '—'} · queued ${bridgeDiag.cliQueued ?? '—'} · open ${bridgeDiag.openCircuits ?? '—'} · recoveries ${bridgeDiag.circuitRecoveries ?? '—'}`,
      `Usage detail: ${diagUsageKey} · providers ${Array.isArray(diagUsage?.providers) ? diagUsage.providers.length : 0} · models ${Array.isArray(diagUsage?.models) ? diagUsage.models.length : 0} · recent requests ${Array.isArray(diagUsage?.recent) ? diagUsage.recent.length : 0} · source rows ${Number(diagUsage?.recentRawCount || 0)} · cache ${usageCacheText(diagUsage)}`,
      `UI layout: usage-first · aggregate enriched · recent metadata · advanced collapsed`,
      `Navigation: tabbed · overview/devpass/credits/analytics/settings · view ${state.dashboardView || 'overview'} · persisted`,
      `Recent UI: filter ${['all','success','error'].includes(String(state.recentRequestFilter)) ? state.recentRequestFilter : 'all'} · aggregate chips · mobile compact`,
      `Request ledger: rows ${diagLedgerRows.length} · hours ${diagLedgerHours} · source ${diagUsage?.recentSourceKey || 'none'} · 24h local observed · selected ${state.selectedHourKey || 'none'} · since ${state.requestLedgerStartedAt ? age(state.requestLedgerStartedAt) : '—'}`,
      `Request fidelity: exact ${diagLedgerFidelity.exact}/${diagLedgerFidelity.rows} · bucket ${diagLedgerFidelity.bucket}/${diagLedgerFidelity.rows} · cache known ${diagLedgerFidelity.cacheKnown}/${diagLedgerFidelity.rows} · cache tokens ${diagLedgerFidelity.cacheTokenKnown}/${diagLedgerFidelity.rows} · ids ${diagLedgerFidelity.ids}/${diagLedgerFidelity.rows}`,
      `Request duration fidelity: explicit ${diagDurationFidelity.explicit}/${diagDurationFidelity.rows} · unknown ${diagDurationFidelity.unknown}/${diagDurationFidelity.rows} · source ${diagDurationFidelity.sources.join(',') || 'none'} · average ${formatRequestDurationMs(diagDurationFidelity.averageMs)} · slowest ${formatRequestDurationMs(diagDurationFidelity.slowestMs)}`,
      `Cache observability: ${cacheObservabilitySummaryText(diagCacheObservability)} · token rows ${diagCacheObservability.tokenKnown}/${diagCacheObservability.rows} · 5m write ${Number(diagCacheObservability.cacheCreation5mTokens || 0).toLocaleString()} · 1h write ${Number(diagCacheObservability.cacheCreation1hTokens || 0).toLocaleString()}`,
      `Cache observer: ${cacheObserverDiagnosticText(diagLedgerRows)}`,
      `Cache write telemetry: reported ${diagCacheObservability.writeReported}/${diagCacheObservability.rows} · not-reported ${diagCacheObservability.writeNotReported}/${diagCacheObservability.rows} · unknown-on-cache ${diagCacheObservability.writeUnknownOnCache}/${diagCacheObservability.rows} · read/no-write-value ${diagCacheObservability.readWithoutWriteValue}/${diagCacheObservability.rows} · TTL reported ${diagCacheObservability.ttlReported}/${diagCacheObservability.rows} · TTL unreported-after-write ${diagCacheObservability.ttlNotReported}/${diagCacheObservability.rows} · TTL unknown-after-write ${diagCacheObservability.ttlUnknownAfterWrite}/${diagCacheObservability.rows}`,
      `Cache semantics: request HIT rate = gateway replay only · LLMGateway cachedTokens = provider cache Read · cached total = Read + Write when both are known · unknown stays unknown · missing Write/TTL is never inferred from price/provider`,
      `Service tier fidelity: requested known ${diagTierFidelity.requestedKnown}/${diagTierFidelity.rows} · served known ${diagTierFidelity.servedKnown}/${diagTierFidelity.rows} · served flex ${diagTierFidelity.flex} · standard ${diagTierFidelity.standard} · priority ${diagTierFidelity.priority} · unknown ${diagTierFidelity.unknown}`,
      `Service tier requested: FLEX ${diagTierFidelity.requested.flex} · STANDARD ${diagTierFidelity.requested.standard} · PRIORITY ${diagTierFidelity.requested.priority} · unknown ${diagTierFidelity.requested.unknown}`,
      `Service tier served: FLEX ${diagTierFidelity.served.flex} · STANDARD ${diagTierFidelity.served.standard} · PRIORITY ${diagTierFidelity.served.priority} · unknown ${diagTierFidelity.served.unknown}`,
      `Service tier selection source: request ${diagTierFidelity.selectionSource.request} · plan-default ${diagTierFidelity.selectionSource.planDefault} · unknown ${diagTierFidelity.selectionSource.unknown}`,
      `Service tier source fields: requested ${diagTierFidelity.requestedSources.join(',') || 'none'} · served ${diagTierFidelity.servedSources.join(',') || 'none'}`,
      `Request outcome taxonomy: success ${diagOutcome.success} · error ${diagOutcome.error} · cancelled ${diagOutcome.cancelled} · unknown ${diagOutcome.unknown} · rows ${diagOutcome.rows}`,
      `HTTP final status fidelity: error rows ${diagHttpStatus.errorRows} · exact ${diagHttpStatus.exact}/${diagHttpStatus.errorRows} · unknown ${diagHttpStatus.unknown}/${diagHttpStatus.errorRows} · source ${diagHttpStatus.source}`,
      `Account request capture: ${diagRequestProvenanceMode} · rows ${diagRequestProvenanceRows} · fallback ${Math.max(0, Number(diagRequestProvenance?.fallbackCount || 0))}`,
      `Request account scope fidelity: DevPass ${Math.max(0, Number(diagRequestProvenance?.devpass || 0))}/${diagRequestProvenanceRows} · Credits ${Math.max(0, Number(diagRequestProvenance?.credits || 0))}/${diagRequestProvenanceRows} · Unknown ${Math.max(0, Number(diagRequestProvenance?.unknown || 0))}/${diagRequestProvenanceRows} · conflict ${Math.max(0, Number(diagRequestProvenance?.conflict || 0))}`,
      `Scope authority: DevPass project exact · Credits organization + usedMode credits · model inference 0`,
      `DevPass account tier: service ${diagAccount?.serviceTier || '—'} · routing ${diagAccount?.routingStrategy || '—'} · pending ${diagAccount?.pendingTier || '—'} · personal org ${diagAccount?.hasPersonalOrg === null || diagAccount?.hasPersonalOrg === undefined ? '—' : diagAccount.hasPersonalOrg ? 'yes' : 'no'}`,
      `DevPass billing period: plan ${diagAccount && String(diagAccount.plan || '').trim() && String(diagAccount.plan).toLowerCase() !== 'none' ? String(diagAccount.plan) : '—'} · cycle ${typeof diagAccount?.cycle === 'string' && diagAccount.cycle.trim() ? diagAccount.cycle.trim() : '—'} · start ${dashboardDateText(diagAccount?.billingCycleStart, true)} · end ${dashboardDateText(diagAccount?.expiresAt, true)} · cancelled ${typeof diagAccount?.cancelled === 'boolean' ? (diagAccount.cancelled ? 'yes' : 'no') : 'unknown'}`,
      `DevPass account detail: plan ${diagAccount?.plan || '—'} · cycle ${diagAccount?.cycle || '—'} · status ${!diagAccount ? '—' : diagAccount.cancelled ? 'cancelled' : String(diagAccount.plan || 'none') !== 'none' ? 'active' : '—'} · reset total ${num(d.weekly?.resetPasses) ? Number(d.weekly.resetPasses) : '—'} · purchased ${num(diagAccount?.resetPasses) ? Number(diagAccount.resetPasses) : '—'} · included remaining ${num(diagAccount?.includedResetPassesRemaining) ? Number(diagAccount.includedResetPassesRemaining) : '—'} · price ${money(diagAccount?.resetPassPrice)} · PAYG ${diagAccount?.paygEnabled ? 'on' : 'off'} · regular credits ${money(diagAccount?.regularCredits)}`,
      `Hourly drilldown: local observed · selected-hour lazy render · request cache HIT/MISS · service tier`,
      `Hourly detail: provider/model summary · cache coverage · click-only partial render · writes ${Number(performanceRuntime.hourlyDetailWrites || 0)} · skips ${Number(performanceRuntime.hourlyDetailSkips || 0)} · fallback ${Number(performanceRuntime.hourlyDetailFallbacks || 0)}`,
      `Runtime state: ${performanceRuntime.runtimeState} · transitions ${Number(performanceRuntime.runtimeTransitions || 0)} · reason ${state.runtimeStatus?.reason || '—'} · healthy ${performanceRuntime.lastHealthySyncAt ? age(performanceRuntime.lastHealthySyncAt) : '—'} · degraded ${performanceRuntime.degradedSince ? age(performanceRuntime.degradedSince) : 'none'}`,
      `Last sync: ${state.lastSyncAt ? new Date(Number(state.lastSyncAt)).toISOString() : '—'}`,
      `Duration: ${num(state.lastSyncDurationMs) ? `${state.lastSyncDurationMs}ms` : '—'}`,
      `Refresh phase duration: ${refreshPhaseTimingText()}`,
      `Refresh slowest phase: ${performanceRuntime.lastRefreshSlowestPhase || '—'} · ${num(performanceRuntime.lastRefreshSlowestPhaseMs) ? `${roundPerfMs(performanceRuntime.lastRefreshSlowestPhaseMs)}ms` : '—'}`,
      `Reason: ${state.lastRefreshReason || '—'}`,
      `Success count: ${Number(state.refreshCount || 0)}`,
      `Refresh requests: manual ${Number(refreshAttributionRuntime.requested.manual || 0)} · timer ${Number(refreshAttributionRuntime.requested.timer || 0)} · visibility ${Number(refreshAttributionRuntime.requested.visibility || 0)} · init ${Number(refreshAttributionRuntime.requested.init || 0)} · other ${Object.entries(refreshAttributionRuntime.requested).filter(([key]) => !['manual','timer','visibility','init'].includes(key)).reduce((sum,[,value]) => sum + Number(value || 0), 0)}`,
      `Refresh executions: manual ${Number(refreshAttributionRuntime.executed.manual?.count || 0)} · timer ${Number(refreshAttributionRuntime.executed.timer?.count || 0)} · visibility ${Number(refreshAttributionRuntime.executed.visibility?.count || 0)} · init ${Number(refreshAttributionRuntime.executed.init?.count || 0)} · active ${refreshAttributionRuntime.active?.key || 'none'}`,
      `Last manual refresh: ${refreshAttributionDetail('manual')}`,
      `Last timer refresh: ${refreshAttributionDetail('timer')}`,
      `Last visibility refresh: ${refreshAttributionDetail('visibility')}`,
      `Performance guard: ${state.performanceGuard === false ? 'off' : performanceRuntime.mode} · x${Number(performanceRuntime.adaptiveMultiplier || 1)} · timer-only`,
      `Performance settings: focus ${state.syncOnFocus === false ? 'off' : 'on'} · guard ${state.performanceGuard === false ? 'off' : 'on'} · adaptive ${state.adaptiveRefresh === false ? 'off' : 'on'} · background pause ${state.backgroundPause === false ? 'off' : 'on'}`,
      `Power guard: adaptive-probe · idle ${UI_STALL_PROBE_IDLE_INTERVAL_MS}ms · burst ${UI_STALL_PROBE_INTERVAL_MS}ms · timer-burst ${UI_STALL_PROBE_TIMER_BURST_MS}ms · active-burst ${UI_STALL_PROBE_ACTIVE_BURST_MS}ms`,
      `Power activity: probe ${Date.now() < Number(powerRuntime.probeBurstUntil || 0) ? 'burst' : 'idle'} · wakeups ${powerRuntime.probeWakeups} · idle ${powerRuntime.probeIdleWakeups} · burst ${powerRuntime.probeBurstWakeups} · persist writes ${powerRuntime.persistWrites} · widget renders ${powerRuntime.widgetRenderCalls}`,
      `Mobile style cache: writes ${powerRuntime.responsiveStyleWrites} · skips ${powerRuntime.responsiveStyleSkips} · layout ${widgetRenderCache.layout || 'none'}`,
      `Guard samples: timer ${Number(performanceRuntime.timerSamples || 0)} · ignored ${Number(performanceRuntime.ignoredSamples || 0)} · slow streak ${Number(performanceRuntime.slowRefreshes || 0)}`,
      `UI stall probe: ${performanceRuntime.uiStallProbeActive ? 'active' : 'paused'} · ≥50ms ${Number(performanceRuntime.uiStallCount50 || 0)} · ≥100ms ${Number(performanceRuntime.uiStallCount100 || 0)} · ≥200ms ${Number(performanceRuntime.uiStallCount200 || 0)} · max ${roundPerfMs(performanceRuntime.uiStallMaxMs) || 0}ms`,
      `Last UI stall: ${num(performanceRuntime.lastUiStallMs) ? `${roundPerfMs(performanceRuntime.lastUiStallMs)}ms · refresh overlap ${performanceRuntime.lastUiStallRefreshOverlap ? 'yes' : 'no'} · render overlap ${performanceRuntime.lastUiStallRenderOverlap ? 'yes' : 'no'}${performanceRuntime.lastUiStallRenderOverlap ? ` (${performanceRuntime.lastUiStallRenderReason || 'unknown'} · ${num(performanceRuntime.lastUiStallRenderMs) ? `${roundPerfMs(performanceRuntime.lastUiStallRenderMs)}ms` : '—'})` : ''} · ${age(performanceRuntime.lastUiStallAt)}` : 'none'}`,
      `Resume probe: events ${Number(performanceRuntime.resumeEvents || 0)} · reason ${performanceRuntime.lastResumeReason || '—'} · main-thread lag ${num(performanceRuntime.lastResumeMainThreadLagMs) ? `${roundPerfMs(performanceRuntime.lastResumeMainThreadLagMs)}ms` : '—'} · after ${num(performanceRuntime.lastResumeProbeAfterMs) ? `${roundPerfMs(performanceRuntime.lastResumeProbeAfterMs)}ms` : '—'} · refresh overlap ${performanceRuntime.lastResumeProbeDuringRefresh ? 'yes' : 'no'}`,
      `Resume input: first ${num(performanceRuntime.lastResumeFirstInputAfterMs) ? `${roundPerfMs(performanceRuntime.lastResumeFirstInputAfterMs)}ms` : '—'} · event delay ${num(performanceRuntime.lastResumeInputDelayMs) ? `${roundPerfMs(performanceRuntime.lastResumeInputDelayMs)}ms` : '—'} · frame ${num(performanceRuntime.lastResumeFrameDelayMs) ? `${roundPerfMs(performanceRuntime.lastResumeFrameDelayMs)}ms` : '—'} · refresh overlap ${performanceRuntime.lastResumeInputDuringRefresh ? 'yes' : 'no'}`,
      `Resume refresh: started ${num(performanceRuntime.lastResumeRefreshStartedAfterMs) ? `${roundPerfMs(performanceRuntime.lastResumeRefreshStartedAfterMs)}ms after` : '—'} · duration ${num(performanceRuntime.lastResumeRefreshMs) ? `${roundPerfMs(performanceRuntime.lastResumeRefreshMs)}ms` : '—'} · render ${num(performanceRuntime.lastResumeRenderMs) ? `${roundPerfMs(performanceRuntime.lastResumeRenderMs)}ms` : '—'} · active at entry ${performanceRuntime.lastResumeHadRefreshAtEntry ? 'yes' : 'no'}`,
      `Resume route: requested ${performanceRuntime.lastResumeRequestedReason || '—'} · actual ${performanceRuntime.lastResumeActualReason || '—'} · merged ${performanceRuntime.lastResumeRefreshWasCoalesced ? 'yes' : 'no'}${performanceRuntime.lastResumeRefreshWasCoalesced ? ` · into ${performanceRuntime.lastResumeCoalescedIntoReason || 'unknown'}` : ''}`,
      `Resume long task: ${performanceRuntime.longTaskSupported ? 'supported' : 'unsupported'} · count ${Number(performanceRuntime.resumeLongTaskCount || 0)} · ${num(performanceRuntime.lastResumeLongTaskMs) ? `last ${roundPerfMs(performanceRuntime.lastResumeLongTaskMs)}ms @ +${roundPerfMs(performanceRuntime.lastResumeLongTaskStartedAfterMs)}ms · refresh overlap ${performanceRuntime.lastResumeLongTaskDuringRefresh ? 'yes' : 'no'}` : 'last none'}`,
      `Resume grace: ${performanceRuntime.resumePending ? 'pending' : 'idle'} · delay ${num(performanceRuntime.lastResumeDelayMs) ? `${Number(performanceRuntime.lastResumeDelayMs)}ms` : '—'} · deferred ${Number(performanceRuntime.resumeDeferred || 0)} · coalesced ${Number(performanceRuntime.resumeCoalesced || 0)} · quiet ${RESUME_INTERACTION_QUIET_MS}ms · max ${RESUME_MAX_DEFER_MS}ms`,
      `Scheduler: pending ${refreshSchedulerState.pending ? 'yes' : 'no'} · running ${refreshSchedulerState.running ? 'yes' : 'no'} · queued ${Number(performanceRuntime.schedulerQueued || 0)} · merged ${Number(performanceRuntime.schedulerMerged || 0)} · executed ${Number(performanceRuntime.schedulerExecuted || 0)} · interaction defer ${Number(performanceRuntime.schedulerDeferredForInteraction || 0)} · last ${refreshSchedulerState.lastReason || '—'}`,
      `Render: widget ${num(performanceRuntime.lastRenderMs) ? `${roundPerfMs(performanceRuntime.lastRenderMs)}ms` : '—'} · panel ${num(performanceRuntime.lastPanelRenderMs) ? `${roundPerfMs(performanceRuntime.lastPanelRenderMs)}ms` : '—'} · reason ${performanceRuntime.lastRenderReason || '—'} · phases ${renderBreakdownText(performanceRuntime.lastRenderBreakdown)}`,
      `Render spike: ≥${RENDER_SPIKE_THRESHOLD_MS}ms · count ${Number(performanceRuntime.renderSpikeCount || 0)} · ${num(performanceRuntime.lastRenderSpikeMs) ? `last ${roundPerfMs(performanceRuntime.lastRenderSpikeMs)}ms · reason ${performanceRuntime.lastRenderSpikeReason || '—'} · refresh overlap ${performanceRuntime.lastRenderSpikeRefreshOverlap ? 'yes' : 'no'} · phases ${renderBreakdownText(performanceRuntime.lastRenderSpikeBreakdown)}` : 'last none'}`,
      `Stall/render coincidence: ${performanceRuntime.lastUiStallRenderOverlap ? 'yes' : 'no'}${performanceRuntime.lastUiStallRenderOverlap ? ` · ${performanceRuntime.lastUiStallRenderReason || 'unknown'} · ${num(performanceRuntime.lastUiStallRenderMs) ? `${roundPerfMs(performanceRuntime.lastUiStallRenderMs)}ms` : '—'}` : ''}`,
      `Panel render scheduler: ${panelRenderTimer || panelIdleHandle !== null ? 'pending' : 'idle'} · coalesced ${Number(performanceRuntime.panelRenderCoalesced || 0)} · interaction quiet 700ms · defer 750ms`,
      `Panel partial: mode ${performanceRuntime.lastPanelRenderMode || 'full'} · partial ${Number(performanceRuntime.panelPartialRenders || 0)} · full ${Number(performanceRuntime.panelFullRenders || 0)} · section writes ${Number(performanceRuntime.panelSectionWrites || 0)} · skips ${Number(performanceRuntime.panelSectionSkips || 0)}`,
      `P4 partial: auto section patch · diagnostics live · settings preserved`,
      `Render cache: widget html writes ${Number(performanceRuntime.widgetHtmlWrites || 0)} · skips ${Number(performanceRuntime.widgetHtmlSkips || 0)} · style writes ${Number(performanceRuntime.widgetStyleWrites || 0)} · skips ${Number(performanceRuntime.widgetStyleSkips || 0)} · closed panel skips ${Number(performanceRuntime.panelRenderSkippedClosed || 0)}`,
      `P4 render: closed-panel skip · widget DOM dedup`,
      `Floating widget UX: ${state.widgetVisible===false?'hidden':'visible'} · mobile ${widgetMobileViewport?'yes':'no'} · expanded ${widgetMobileExpanded?'yes':'no'} · dock ${state.widgetDockSide || 'none'} · position ${num(state.widgetX)&&num(state.widgetY)?`${Math.round(Number(state.widgetX))},${Math.round(Number(state.widgetY))}`:'default'} · gesture handle-drag/arrow-toggle`,
      `Credits organization: selected ${state.data?.creditsOrganizationId || state.selectedCreditsOrgId || 'default'} · available ${Array.isArray(state.data?.organizations) ? state.data.organizations.filter(org=>String(org?.kind||'default')==='default'&&String(org?.status||'active')!=='deleted').length : 0} · fallbacks ${Number(state.creditsOrgFallbackCount || 0)}${state.creditsOrgLastFallbackFrom ? ` · last ${state.creditsOrgLastFallbackFrom} → ${state.creditsOrgLastFallbackTo || 'default'}` : ''}`,
      `Local runtime errors: total ${Number(localRuntimeErrors.count || 0)} · active ${localRuntimeActiveCount()} · recoveries ${Number(localRuntimeErrors.recoveredCount || 0)} · persist ${Number(localRuntimeErrors.persistFailures || 0)} · render ${Number(localRuntimeErrors.renderFailures || 0)} · last ${localRuntimeErrors.lastAt ? `${localRuntimeErrors.lastStage || 'runtime'} · ${age(localRuntimeErrors.lastAt)} · ${localRuntimeErrors.lastMessage || 'error'}` : 'none'} · recovery ${localRuntimeErrors.lastRecoveryAt ? `${localRuntimeErrors.lastRecoveryStage || 'runtime'} · ${age(localRuntimeErrors.lastRecoveryAt)}` : 'none'}`,
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
    function releaseNotesPanelHtml() {
      const highlights = RELEASE_NOTES.highlights.map(item => `<li>${esc(item)}</li>`).join('');
      const hints = RELEASE_NOTES.diagnosticHints.map(item => `<li>${esc(item)}</li>`).join('');
      return `<div id="release-notes-panel" class="usage-detail-box release-notes-panel" hidden>
        <div class="recent-head"><h3>${esc(RELEASE_NOTES.title)}</h3><span>v${esc(VERSION)}</span></div>
        <p><b>이번 업데이트</b></p><ul>${highlights}</ul>
        <p><b>다음 진단 때 확인하면 좋은 것</b></p><ul>${hints}</ul>
        <div class="actions"><button id="copy-release-guide" data-release-guide="${esc(releaseDiagnosticGuideText())}">진단 제출 가이드 복사</button></div>
      </div>`;
    }

    function releaseDiagnosticGuideText() {
      const hints = RELEASE_NOTES.diagnosticHints.map(item => `- ${item}`).join('\n');
      return [
        `Local Usage Dashboard v${VERSION}`,
        `Release: ${RELEASE_NOTES.title}`,
        '',
        '다음 진단 때 확인:',
        hints,
        '',
        '문제/관찰 한 줄: [직접 작성]',
        '재현 행동: [직접 작성]',
        '필요하면 Runtime Diagnostics > 전체 Diagnostics 복사를 함께 첨부'
      ].join('\n');
    }


    const d = state.data || {}, c = d.credits, a = d.activity, runway = d.runway, h = d.health || {};
    const bridgeDiag = bridgeStabilitySnapshot();
    const productRuntime = bridgeRuntimeSnapshot();
    const lifecycleMode = bridgeLifecycleMode();
    const stableHealth = lifecycleMode === 'live' && String(h.status || '').toLowerCase() === 'ok' && bridgeDiag.compatible !== false && Number(localRuntimeErrors.count || 0) === 0;
    const systemHealthStatus = stableHealth ? 'STABLE' : lifecycleMode === 'paused' ? 'PAUSED' : lifecycleMode === 'off' ? 'OFF' : 'CHECK';
    const systemHealthText = `${String(lifecycleMode || 'off').toUpperCase()} · Engine ${bridgeDiag.version ? `v${bridgeDiag.version}` : '—'} · Manager ${productRuntime.managerVersion ? `v${productRuntime.managerVersion}` : '—'} · ${state.lastSyncAt ? age(state.lastSyncAt) : '대기'}`;
    const devpassAccount = d.devpassAccount && typeof d.devpassAccount === 'object' ? d.devpassAccount : null;
    const dashboardView = ['overview','devpass','credits','analytics','settings'].includes(String(state.dashboardView)) ? String(state.dashboardView) : 'overview';
    const creditsOrganizations = (Array.isArray(d.organizations) ? d.organizations : []).filter(org => String(org?.kind || 'default') === 'default' && String(org?.status || 'active') !== 'deleted');
    const selectedCreditsOrgId = String(d.creditsOrganizationId || state.selectedCreditsOrgId || '');
    const selectedCreditsOrg = creditsOrganizations.find(org => String(org?.id || '') === selectedCreditsOrgId) || creditsOrganizations[0] || null;
    const creditsOrgLabel = String(selectedCreditsOrg?.name || selectedCreditsOrgId || 'Default organization');
    const creditsOrgSelector = creditsOrganizations.length ? `<label class="credits-org-picker"><span>Credits Organization</span><select id="credits-org-id">${creditsOrganizations.map(org => `<option value="${esc(org.id)}" ${String(org.id)===selectedCreditsOrgId?'selected':''}>${esc(org.name || org.id)}${num(org.credits)?` · ${money(org.credits)}`:''}</option>`).join('')}</select></label>${d.creditsOrganizationFallback ? `<p class="warn credits-org-fallback">선택한 organization을 찾지 못해 ${esc(creditsOrgLabel)}로 자동 복구했어.</p>` : ''}` : '';
    const creditsMeta = [
      num(c?.todayUsed) ? `오늘 ${money(c.todayUsed,4)}` : '',
      num(runway?.avgDailySpend7d) ? `7일평균 ${money(runway.avgDailySpend7d,4)}/일` : '',
      num(runway?.runwayDays) ? `약 ${Math.round(Number(runway.runwayDays))}일` : '',
      d.source ? esc(d.source) : ''
    ].filter(Boolean).join(' · ');
    const today = todayOverviewMetrics(d);
    const observedStamp = state.dailyUsage?.updatedAt || state.creditDailyUsage?.updatedAt || state.lastSyncAt;
    const scopeKey = ['all','devpass','credits'].includes(String(state.usageScopeView)) ? String(state.usageScopeView) : 'all';
    const scopeNames = {all:['전체 24h Usage',`DevPass + ${creditsOrgLabel} Credits 합산 서버 집계`],devpass:['DevPass 24h Usage','DevPass project /activity 서버 집계'],credits:['Credits 24h Usage',`${creditsOrgLabel} 서버 집계`]};
    const scopeActivity = d.usageScopes?.scopes?.[scopeKey] || (scopeKey === 'all' ? normalizeScopeActivity({totalRequests:a?.requests24h,totalCost:a?.cost24h,totalTokens:a?.totalTokens24h,errorRate:a?.errorRate24h,fetchedAt:d.fetchedAt,source:d.source}) : null);
    const scopeTopProvider = Array.isArray(scopeActivity?.providers) && scopeActivity.providers[0]?.name ? String(scopeActivity.providers[0].name) : '—';
    const scopeTopModel = Array.isArray(scopeActivity?.models) && scopeActivity.models[0]?.name ? String(scopeActivity.models[0].name) : '—';
    const scopeFetchedAt = scopeActivity?.fetchedAt || d.usageScopes?.fetchedAt || d.fetchedAt;
    const devpassAccountStatus = !devpassAccount
      ? '—'
      : devpassAccount.cancelled
        ? '취소 예정'
        : String(devpassAccount.plan || 'none') !== 'none'
          ? 'ACTIVE'
          : '—';
    const billingPlanText = devpassAccount && String(devpassAccount.plan || '').trim() && String(devpassAccount.plan).toLowerCase() !== 'none'
      ? String(devpassAccount.plan).toUpperCase()
      : '—';
    const billingCycleText = typeof devpassAccount?.cycle === 'string' && devpassAccount.cycle.trim()
      ? devpassAccount.cycle.trim()
      : '—';
    const billingStartText = dashboardDateText(devpassAccount?.billingCycleStart, true);
    const billingEndText = dashboardDateText(devpassAccount?.expiresAt, true);
    const billingEndTimestamp = resetTimestamp(devpassAccount?.expiresAt);
    const billingRemainingText = Number.isFinite(billingEndTimestamp) && billingEndTimestamp > Date.now()
      ? remainingTimeForDashboard(devpassAccount.expiresAt)
      : '—';
    const billingCancelledText = devpassAccount?.cancelled === true ? '취소 예정' : '—';
    const devpassIncludedPassText = num(devpassAccount?.includedResetPassesRemaining)
      ? (num(devpassAccount?.includedResetPasses)
        ? `${Number(devpassAccount.includedResetPassesRemaining)} / ${Number(devpassAccount.includedResetPasses)}장`
        : `${Number(devpassAccount.includedResetPassesRemaining)}장`)
      : '—';
    const devpassAccountDetailHtml = devpassAccount
      ? `<div class="usage-detail-grid devpass-account-parity">
          <div class="usage-detail-box"><div class="recent-head"><h3>DevPass account</h3><span>${esc(devpassAccountStatus)}</span></div><div class="minis">
            <div class="mini"><span>Plan</span><b>${esc(String(devpassAccount.plan || '—').toUpperCase())}</b></div>
            <div class="mini"><span>Cycle</span><b>${esc(String(devpassAccount.cycle || '—'))}</b></div>
            <div class="mini"><span>Status</span><b>${esc(devpassAccountStatus)}</b></div>
            <div class="mini"><span>Service tier</span><b>${esc(String(devpassAccount.serviceTier || '—').toUpperCase())}</b></div>
            <div class="mini"><span>Routing</span><b>${esc(String(devpassAccount.routingStrategy || '—'))}</b></div>
            <div class="mini"><span>Pending tier</span><b>${esc(String(devpassAccount.pendingTier || '—'))}</b></div>
            <div class="mini"><span>Personal org</span><b>${devpassAccount.hasPersonalOrg === null ? '—' : devpassAccount.hasPersonalOrg ? '있음' : '없음'}</b></div>
            <div class="mini"><span>Billing history</span><b>${devpassAccount.hasBillingHistory === null ? '—' : devpassAccount.hasBillingHistory ? '있음' : '없음'}</b></div>
          </div></div>
          <div class="usage-detail-box"><div class="recent-head"><h3>Reset Pass · PAYG</h3><span>${devpassAccount.paygEnabled ? 'PAYG ON' : 'PAYG OFF'}</span></div><div class="minis">
            <div class="mini purple"><span>총 사용 가능</span><b>${num(d.weekly?.resetPasses) ? `${Number(d.weekly.resetPasses)}장` : 'API 미제공'}</b></div>
            <div class="mini purple"><span>구매/보유 패스</span><b>${num(devpassAccount.resetPasses) ? `${Number(devpassAccount.resetPasses)}장` : '—'}</b></div>
            <div class="mini purple"><span>기본 패스 남음</span><b>${esc(devpassIncludedPassText)}</b></div>
            <div class="mini"><span>Reset Pass 가격</span><b>${money(devpassAccount.resetPassPrice)}</b></div>
            <div class="mini"><span>PAYG overflow</span><b>${devpassAccount.paygEnabled ? '켜짐' : '꺼짐'}</b></div>
            <div class="mini cyan"><span>Regular Credits</span><b>${money(devpassAccount.regularCredits)}</b></div>
          </div></div>
          <div class="usage-detail-box billing-cycle-truth-strip"><div class="recent-head"><h3>Billing Cycle</h3><span>source truth</span></div><div class="minis">
            <div class="mini"><span>Plan</span><b>${esc(billingPlanText)}</b></div>
            <div class="mini"><span>Cycle</span><b>${esc(billingCycleText)}</b></div>
            <div class="mini"><span>기간 시작</span><b>${esc(billingStartText)}</b></div>
            <div class="mini"><span>기간 종료</span><b>${esc(billingEndText)}</b></div>
            <div class="mini"><span>남은 기간</span><b>${esc(billingRemainingText)}</b></div>
            <div class="mini"><span>취소 상태</span><b>${esc(billingCancelledText)}</b></div>
          </div></div>
        </div>`
      : '';
    const scopeExtra = scopeKey === 'devpass'
      ? `<div class="mini accent"><span>월간 남음</span><b>${money(d.monthly?.remaining)}</b></div><div class="mini"><span>기간 종료</span><b>${d.monthly?.resetAt ? remainingTimeForDashboard(d.monthly.resetAt) : '—'}</b></div><div class="mini purple"><span>프리미엄 남음</span><b>${money(d.weekly?.remaining)}</b></div><div class="mini purple"><span>Reset Pass</span><b>${num(d.weekly?.resetPasses) ? `${Number(d.weekly.resetPasses)}장` : 'API 미제공'}</b></div>`
      : scopeKey === 'credits'
        ? `<div class="mini cyan"><span>Credits 잔액</span><b>${money(c?.balance)}</b></div><div class="mini cyan"><span>Runway</span><b>${num(runway?.runwayDays) ? `약 ${Math.round(Number(runway.runwayDays))}일` : '—'}</b></div>`
        : `<div class="mini accent"><span>DevPass 월간 남음</span><b>${money(d.monthly?.remaining)}</b></div><div class="mini cyan"><span>Credits 잔액</span><b>${money(c?.balance)}</b></div>`;
    const analyticsScopeKey = ['all','devpass','credits'].includes(String(state.analyticsScopeView)) ? String(state.analyticsScopeView) : 'all';
    const analyticsNames = {
      all:['전체 Analytics','DevPass + Credits 합산 서버 분석'],
      devpass:['DevPass Analytics','DevPass project 서버 분석'],
      credits:['Credits Analytics',`${creditsOrgLabel} 서버 분석`]
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
      ? `<div class="mini accent"><span>월간 남음</span><b>${money(d.monthly?.remaining)}</b></div><div class="mini"><span>기간 종료</span><b>${d.monthly?.resetAt ? remainingTimeForDashboard(d.monthly.resetAt) : '—'}</b></div>`
      : analyticsScopeKey === 'credits'
        ? `<div class="mini cyan"><span>Credits 잔액</span><b>${money(c?.balance)}</b></div><div class="mini cyan"><span>Runway</span><b>${num(runway?.runwayDays) ? `약 ${Math.round(Number(runway.runwayDays))}일` : '—'}</b></div>`
        : `<div class="mini accent"><span>DevPass 월간 남음</span><b>${money(d.monthly?.remaining)}</b></div><div class="mini cyan"><span>Credits 잔액</span><b>${money(c?.balance)}</b></div>`;
    return `<style>
      :root{color-scheme:dark;--b:#101114;--p:#191b20;--p2:#21242a;--l:#2c3037;--t:#f5f6f8;--m:#969da8;--g:#c5f277;--v:#b9a6f8;--c:#9fd7ee;--e:#ff9b95}
      *{box-sizing:border-box}body{margin:0;background:var(--b);color:var(--t);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}.shell{width:min(900px,100%);margin:auto;padding:14px}
      header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}h1{margin:0;font-size:23px}.dashboard-nav{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;margin:-2px 0 12px;position:sticky;top:0;z-index:20;background:var(--b);padding:6px 0}.dashboard-nav button{min-width:0;padding:8px 3px;font-size:10px;white-space:nowrap}.dashboard-nav button.active{background:var(--g);border-color:var(--g);color:#15170f}.system-health{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--p);border:1px solid var(--l);border-radius:11px;padding:9px 11px;margin:-3px 0 10px}.system-health>div{min-width:0}.system-health-kicker{display:block;color:var(--m);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}.system-health b{display:block;font-size:11px;margin-top:2px;white-space:normal}.system-health-status{border:1px solid var(--l);border-radius:999px;padding:3px 7px;font-size:9px;font-weight:800;white-space:nowrap}.system-health.ok .system-health-status{border-color:var(--g);color:var(--g)}.system-health.check .system-health-status{border-color:var(--e);color:var(--e)}.shell[data-dashboard-view="overview"] .grid>:nth-child(n+6){display:none}.shell[data-dashboard-view="devpass"] .grid>:not(:nth-child(6)){display:none}.shell[data-dashboard-view="credits"] .grid>:not(:nth-child(6)){display:none}.shell[data-dashboard-view="devpass"] .usage-primary .scope-tabs,.shell[data-dashboard-view="credits"] .usage-primary .scope-tabs{display:none}.shell[data-dashboard-view="analytics"] .grid>:not(:nth-child(7)){display:none}.shell[data-dashboard-view="settings"] .grid>:not(:nth-child(8)):not(:nth-child(9)){display:none}.muted,p{color:var(--m);font-size:12px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
      .panel{background:var(--p);border:1px solid var(--l);border-radius:13px;padding:13px}.metric{min-height:135px;display:flex;flex-direction:column}.metric small{color:var(--m);font-weight:700}.metric strong{font-size:24px;margin-top:9px}.metric em{font-style:normal;color:var(--m);font-size:12px}.metric p{margin-top:auto;margin-bottom:0}.bar{height:5px;background:#2d3138;border-radius:99px;overflow:hidden;margin:11px 0}.bar i{display:block;height:100%;background:var(--g)}.weekly .bar i{background:var(--v)}.wide{grid-column:1/-1}
      .minis{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:10px}.mini{background:var(--p2);border-radius:9px;padding:9px}.mini span{display:block;color:var(--m);font-size:10px}.mini b{display:block;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .today-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.today-head b{font-size:14px}.stamp{color:var(--m);font-size:10px;white-space:nowrap}.today-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:10px}.today-grid .mini b{white-space:normal;overflow:visible;text-overflow:clip}.today-grid .accent b{color:var(--g)}.today-grid .purple b{color:var(--v)}.today-grid .cyan b{color:var(--c)}
      .scope-tabs{display:flex;gap:6px;margin-top:10px}.scope-tab{flex:1;min-width:0;padding:7px 9px}.scope-tab.active{background:var(--g);border-color:var(--g);color:#15170f}.credits-org-picker{max-width:420px;margin-top:10px}.credits-org-picker select{margin-top:2px}.credits-org-fallback{margin:6px 0 0}
      .grid>.usage-primary{order:20}.grid>.activity-secondary{order:21}.grid>.analytics-panel{order:30}.grid>.advanced-panel{order:40}
      .usage-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.usage-detail-box{background:var(--p2);border-radius:10px;padding:10px;margin-top:8px}.usage-detail-box h3{font-size:11px;margin:0;color:var(--m)}.usage-detail-box p{margin:8px 0 0}.usage-detail-row{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:7px 0;border-top:1px solid var(--l)}.usage-detail-row:first-of-type{border-top:0}.usage-detail-row>div{min-width:0;flex:1}.usage-detail-row b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.usage-detail-row>span{color:var(--m);font-size:11px;white-space:nowrap}.aggregate-meta{display:flex!important;flex-wrap:wrap;gap:4px;margin-top:4px}.stat-chip{display:inline-flex!important;width:auto;background:#181a1f;border:1px solid var(--l);border-radius:999px;padding:2px 6px;color:var(--m)!important;font-size:9px!important;line-height:1.35;white-space:nowrap}.recent-requests{margin-top:8px}.recent-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.recent-head>span{color:var(--m);font-size:10px}.recent-filter{display:flex;gap:5px;margin:8px 0 2px}.recent-filter-btn{padding:5px 8px;border-radius:999px;font-size:10px;line-height:1.2}.recent-filter-btn.active{background:var(--g);border-color:var(--g);color:#15170f}.request-detail-row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:8px 0;border-top:1px solid var(--l)}.request-detail-row:first-of-type{border-top:0}.request-main{min-width:0;flex:1}.request-detail-row b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.request-detail-row span{display:block;color:var(--m);font-size:10px;margin-top:2px}.request-detail-row .request-model{color:var(--t);font-size:11px;white-space:normal;overflow-wrap:anywhere}.request-detail-row em{font-style:normal;color:var(--m);font-size:11px;text-align:right;white-space:nowrap}.request-detail-row em.error-text{color:var(--e)}.request-detail-row em.ok-text{color:var(--m)}
      .advanced-panel{padding:0;overflow:hidden}.advanced-panel>summary{display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;padding:13px;list-style:none}.advanced-panel>summary::-webkit-details-marker{display:none}.advanced-panel>summary span{color:var(--m);font-size:11px}.advanced-panel>summary:after{content:'펼치기';color:var(--m);font-size:10px;margin-left:auto}.advanced-panel[open]>summary:after{content:'접기'}.advanced-panel[open]>summary{border-bottom:1px solid var(--l)}.advanced-body{padding:0 13px 13px}.settings-section-title{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin:13px 0 4px;padding-top:10px;border-top:1px solid var(--l)}.settings-section-title:first-child{margin-top:2px;padding-top:0;border-top:0}.settings-section-title b{font-size:11px}.settings-section-title span{color:var(--m);font-size:9px;text-align:right}.diag-summary{margin:0 0 10px}
      label{display:grid;gap:5px;margin-top:9px}label span{color:var(--m);font-size:11px}input,textarea,select,button{font:inherit}input,textarea,select{width:100%;background:#111318;color:var(--t);border:1px solid var(--l);border-radius:9px;padding:9px}textarea{min-height:62px}
      button{background:#25282f;color:var(--t);border:1px solid var(--l);border-radius:9px;padding:8px 11px;font-weight:650}button.primary{background:var(--g);border-color:var(--g);color:#15170f}.actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.warn{color:var(--e)}
      @media(max-width:680px){.shell{padding:10px}.grid{grid-template-columns:1fr;gap:8px}.wide{grid-column:auto}.panel{padding:11px}.minis,.today-grid{grid-template-columns:1fr 1fr;gap:6px}.usage-detail-grid{grid-template-columns:1fr;gap:6px}.usage-detail-box{padding:9px;margin-top:6px}.usage-detail-row{padding:6px 0}.request-detail-row{flex-direction:row;gap:8px;padding:7px 0}.request-main{max-width:58%}.request-detail-row b{font-size:12px}.request-detail-row .request-model{font-size:10px}.request-detail-row em{max-width:42%;font-size:10px;text-align:right;white-space:normal}.recent-filter{gap:4px}.recent-filter-btn{padding:5px 7px;font-size:10px}.aggregate-meta{gap:3px}.stat-chip{padding:2px 5px;font-size:8.5px!important}.hour-aggregate-grid{grid-template-columns:1fr}.hour-row em{white-space:normal;text-align:right;max-width:48%}.hour-detail>.recent-head{align-items:flex-start}.hour-detail>.recent-head span{max-width:58%}}
      .hourly-ledger{margin-top:8px}.hour-list{display:grid;gap:5px;margin-top:8px}.hour-row{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;background:#181a1f;padding:8px 9px}.hour-row.active{border-color:var(--g);background:#20251a}.hour-row span{min-width:0}.hour-row b{display:block}.hour-row small{display:block;color:var(--m);font-size:9px;margin-top:2px}.hour-row em{font-style:normal;color:var(--m);font-size:10px;white-space:nowrap}.hour-detail{margin-top:9px;padding-top:9px;border-top:1px solid var(--l)}.hour-detail>.recent-head span{white-space:normal;text-align:right}.hour-request-row:last-child{padding-bottom:0}.hour-aggregate-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0}.hour-aggregate-box{background:#181a1f;border:1px solid var(--l);border-radius:8px;padding:8px}.hour-aggregate-box h4{margin:0 0 4px;color:var(--m);font-size:10px}.hour-aggregate-row{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:5px 0;border-top:1px solid var(--l)}.hour-aggregate-row:first-of-type{border-top:0}.hour-aggregate-row>div{min-width:0;flex:1}.hour-aggregate-row b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px}.hour-aggregate-row small{display:block;color:var(--m);font-size:8.5px;white-space:normal}.hour-aggregate-row>span{color:var(--m);font-size:9px;white-space:nowrap}.hour-request-list{margin-top:4px}
    </style><div class="shell" data-dashboard-view="${dashboardView}"><header><div><div class="muted">MODULAR CORE · v${VERSION}</div><h1>Local Usage Dashboard</h1></div><button id="close">닫기</button></header><nav class="dashboard-nav" role="tablist" aria-label="Dashboard page">${[['overview','Overview'],['devpass','DevPass'],['credits','Credits'],['analytics','Analytics'],['settings','Settings']].map(([key,label]) => `<button role="tab" aria-selected="${dashboardView===key?'true':'false'}" class="${dashboardView===key?'active':''}" data-dashboard-nav="${key}">${label}</button>`).join('')}</nav>${dashboardView === 'overview' ? `<section class="system-health ${stableHealth ? 'ok' : 'check'}"><div><span class="system-health-kicker">System Health</span><b>${esc(systemHealthText)}</b></div><span class="system-health-status">${esc(systemHealthStatus)}</span></section>` : ''}<main class="grid">
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
      <section class="panel wide activity-secondary"><b>24h Activity</b><div class="minis"><div class="mini"><span>요청</span><b>${num(a?.requests24h)?`${a.requests24h}회`:'—'}</b></div><div class="mini"><span>비용</span><b>${money(a?.cost24h,4)}</b></div><div class="mini"><span>토큰</span><b>${num(a?.totalTokens24h)?Number(a.totalTokens24h).toLocaleString():'—'}</b></div><div class="mini"><span>오류율</span><b>${num(a?.errorRate24h)?`${Number(a.errorRate24h).toFixed(1)}%`:'—'}</b></div></div></section>
      <section class="panel wide usage-primary">
        <div class="today-head"><div><b>${dashboardView === 'devpass' ? 'DevPass Usage' : dashboardView === 'credits' ? 'Credits Usage' : '24h Usage Scope'}</b><p style="margin:2px 0 0">${esc(scopeNames[scopeKey][1])}</p></div><span class="stamp">${scopeFetchedAt ? dashboardDateText(scopeFetchedAt) : ''}</span></div>
        ${dashboardView === 'credits' ? creditsOrgSelector : ''}
        <div class="scope-tabs" role="tablist" aria-label="24h Usage scope">
          ${[['all','전체'],['devpass','DevPass'],['credits','Credits']].map(([key,label]) => `<button class="scope-tab ${scopeKey===key?'active':''}" data-usage-scope="${key}">${label}</button>`).join('')}
        </div>
        ${scopeActivity ? `<div class="today-grid">
          <div class="mini accent"><span>24h 요청</span><b>${num(scopeActivity.totalRequests) ? `${Number(scopeActivity.totalRequests).toLocaleString()}회` : '—'}</b></div>
          <div class="mini"><span>24h 비용</span><b>${money(scopeActivity.totalCost,4)}</b></div>
          <div class="mini"><span>총 토큰</span><b>${num(scopeActivity.totalTokens) ? Number(scopeActivity.totalTokens).toLocaleString() : '—'}</b></div>
          <div class="mini"><span>입력 / 출력</span><b>${num(scopeActivity.inputTokens) || num(scopeActivity.outputTokens) ? `${num(scopeActivity.inputTokens)?Number(scopeActivity.inputTokens).toLocaleString():'—'} / ${num(scopeActivity.outputTokens)?Number(scopeActivity.outputTokens).toLocaleString():'—'}` : '—'}</b></div>
          <div class="mini"><span>오류</span><b>${num(scopeActivity.errorCount) ? `${Number(scopeActivity.errorCount).toLocaleString()}회 · ${num(scopeActivity.errorRate)?Number(scopeActivity.errorRate).toFixed(1):'0.0'}%` : (num(scopeActivity.errorRate) ? `${Number(scopeActivity.errorRate).toFixed(1)}%` : '—')}</b></div>
          <div class="mini"><span>캐시</span><b>${usageCacheText(scopeActivity)}</b></div>
          <div class="mini"><span>Top Provider</span><b>${esc(scopeTopProvider)}</b></div>
          <div class="mini"><span>Top Model</span><b>${esc(scopeTopModel)}</b></div>
          ${scopeExtra}
        </div>${dashboardView === 'devpass' ? devpassAccountDetailHtml : ''}${scopeUsageDetailsHtml(scopeActivity)}` : `<p>Bridge snapshot에 ${esc(scopeNames[scopeKey][0])} 범위 데이터가 아직 없어.</p>`}
        ${d.usageScopes?.errors?.[scopeKey] ? `<p class="warn">Usage Scope · ${esc(errorSummaryText(d.usageScopes.errors[scopeKey]))}</p>` : ''}
      </section>
      <section class="panel wide analytics-panel">
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
          <div class="mini"><span>요청 캐시 HIT</span><b>${usageCacheText(analyticsW24)}</b></div>
          <div class="mini"><span>Cache Read</span><b>${num(analyticsW24.cacheReadInputTokens) ? `${Number(analyticsW24.cacheReadInputTokens).toLocaleString()} tok` : '—'}</b></div>
          <div class="mini"><span>Cache Write</span><b>${num(analyticsW24.cacheCreationInputTokens) ? `${Number(analyticsW24.cacheCreationInputTokens).toLocaleString()} tok` : '—'}</b></div>
          <div class="mini"><span>Token Read Ratio</span><b>${num(analyticsW24.cacheReadInputTokens) && (Number(analyticsW24.inputTokens || 0) + Number(analyticsW24.cacheReadInputTokens || 0) + Number(analyticsW24.cacheCreationInputTokens || 0)) > 0 ? `${(Number(analyticsW24.cacheReadInputTokens) / (Number(analyticsW24.inputTokens || 0) + Number(analyticsW24.cacheReadInputTokens || 0) + Number(analyticsW24.cacheCreationInputTokens || 0)) * 100).toFixed(1)}%` : '—'}</b></div>
          <div class="mini"><span>7일 총 비용</span><b>${money(analyticsW7?.totalCost,4)}</b></div>
          <div class="mini"><span>7일 일평균</span><b>${num(analyticsAverages.dailyCost7d) ? `${money(analyticsAverages.dailyCost7d,4)}/일` : '—'}</b></div>
          <div class="mini"><span>30일 총 비용</span><b>${money(analyticsW30?.totalCost,4)}</b></div>
          <div class="mini"><span>Top Model</span><b>${esc(analyticsTopModel)}</b></div>
          <div class="mini"><span>Top Provider</span><b>${esc(analyticsTopProvider)}</b></div>
          ${analyticsExtra}
        </div>` : `<p>Bridge snapshot에 ${esc(analyticsNames[analyticsScopeKey][0])} 범위 데이터가 아직 없어.</p>`}
        ${d.analyticsScopes?.errors?.[analyticsScopeKey] ? `<p class="warn">Analytics · ${esc(errorSummaryText(d.analyticsScopes.errors[analyticsScopeKey]))}</p>` : ''}
        ${analyticsBundle?.errors && Object.keys(analyticsBundle.errors).length ? `<p class="warn">기간 일부 실패 · ${esc(Object.entries(analyticsBundle.errors).map(([range,error])=>`${range}: ${errorSummaryText(error)}`).join(' · '))}</p>` : ''}
      </section>
      <details class="panel wide advanced-panel"><summary><b>Local Bridge</b><span>연결 · 설정</span></summary><div class="advanced-body">
        <div class="bridge-config-static"><div class="settings-section-title"><b>Runtime & Update</b><span>현재 설치 버전 · 다음 진단 가이드</span></div>
        <div class="actions"><button id="release-notes-toggle" aria-expanded="false" aria-controls="release-notes-panel">업데이트 내역</button></div>
        ${releaseNotesPanelHtml()}
        <div class="settings-section-title"><b>Connection</b><span>Bridge endpoint · token</span></div><label><span>Bridge URL</span><input id="bridge-base" value="${esc(state.bridgeBase)}"></label>
        <label><span>Bridge Token</span><textarea id="bridge-token" placeholder="저장된 값은 다시 표시하지 않음"></textarea></label>
        <div class="settings-section-title"><b>Refresh</b><span>주기 · stale policy</span></div><label><span>갱신 주기</span><select id="refresh-ms">${[[15000,'15초'],[30000,'30초'],[60000,'1분'],[300000,'5분'],[600000,'10분'],[0,'수동']].map(([v,l])=>`<option value="${v}" ${Number(state.refreshMs)===v?'selected':''}>${l}</option>`).join('')}</select></label>
        <label><span>STALE 기준</span><select id="stale-ms">${[[0,'사용 안 함 · Local JSON 기본'],[60000,'1분'],[300000,'5분'],[900000,'15분'],[1800000,'30분']].map(([v,l])=>`<option value="${v}" ${Number(state.staleAfterMs)===v?'selected':''}>${l}</option>`).join('')}</select></label>
        <div class="settings-section-title"><b>Floating Widget</b><span>표시 정보</span></div><label><span>미니 위젯</span><select id="widget-mode"><option value="compact" ${state.widgetMode!=='detailed'?'selected':''}>간편 · 오늘 사용량</option><option value="detailed" ${state.widgetMode==='detailed'?'selected':''}>상세 · 남은 양 + 오늘 사용량</option></select></label>
        <div class="settings-section-title"><b>Performance</b><span>복귀 · adaptive refresh</span></div><label style="margin-top:10px"><span><input id="sync-on-focus" type="checkbox" ${state.syncOnFocus !== false ? 'checked' : ''} style="width:auto;margin-right:7px">앱/탭 복귀 시 부드럽게 동기화 · 첫 조작 우선</span></label>
        <label style="margin-top:8px"><span><input id="performance-guard" type="checkbox" ${state.performanceGuard !== false ? 'checked' : ''} style="width:auto;margin-right:7px">Performance Guard · 느려지면 자동으로 갱신 간격 완화</span></label>
        <label style="margin-top:8px"><span><input id="adaptive-refresh" type="checkbox" ${state.adaptiveRefresh !== false ? 'checked' : ''} style="width:auto;margin-right:7px">Adaptive refresh · 빠르게 회복되면 원래 주기로 복귀</span></label>
        <label style="margin-top:8px"><span><input id="background-pause" type="checkbox" ${state.backgroundPause !== false ? 'checked' : ''} style="width:auto;margin-right:7px">백그라운드에서는 자동 갱신 일시정지</span></label>
        <div class="actions"><button id="save-performance">성능 설정 저장</button></div>
        </div>
        <div class="settings-section-title"><b>Lifecycle & Recovery</b><span>연결 · 일시정지 · 복구 · 위젯 위치</span></div>
        ${bridgeControlsHtml()}
      </div></details>
      ${diagnosticsWorkspacePanelHtml()}
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
    if (runtimeDisposed) return;
    if (document.body?.dataset?.panelOpen !== '1') {
      performanceRuntime.panelRenderSkippedClosed += 1;
      return;
    }
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
        if (document.body?.dataset?.panelOpen === '1' && document.visibilityState !== 'hidden') {
          try { renderSettingsPartial(); }
          catch (error) { noteLocalRuntimeError('panel-render', error); }
        }
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
    performanceRuntime.panelFullRenders += 1;
    performanceRuntime.lastPanelRenderMode = 'full';
    const endedPerf = typeof performance?.now === 'function' ? performance.now() : Date.now();
    const duration = Math.max(0, endedPerf - startedPerf);
    performanceRuntime.lastPanelRenderMs = roundPerfMs(duration);
    noteRenderSpike(duration, 'panel', startedPerf, endedPerf, {panel:roundPerfMs(duration)});
  }

  function bridgeControlsHtml() {
    const lifecycle = bridgeLifecycleMode();
    const connecting = lifecycle === 'connecting';
    const refreshAllowed = canBridgeRefresh();
    const forgetArmed = Boolean(token && Number(tokenForgetArmedUntil || 0) > Date.now());
    const connectLabel = connecting
      ? '연결 중…'
      : state.bridgeEnabled
        ? '저장하고 다시 연결'
        : token
          ? '동기화 다시 켜기'
          : '저장하고 연결';
    const forgetLabel = !token
      ? '저장된 토큰 없음'
      : forgetArmed
        ? '정말 지우기?'
        : '저장된 토큰 지우기';
    const statusLabel = lifecycle === 'live' ? 'connected' : lifecycle;
    return `<div class="bridge-control-live" data-bridge-lifecycle="${esc(lifecycle)}">
      <div class="actions"><button class="primary" id="connect" ${connecting?'disabled':''}>${connectLabel}</button><button id="pause-sync" ${state.bridgeEnabled?'':'disabled'}>${state.bridgeEnabled?'동기화 끄기':'동기화 꺼짐'}</button><button id="forget-token" ${token?'':'disabled'}>${forgetLabel}</button><button id="refresh" ${refreshAllowed?'':'disabled'}>지금 새로고침</button><button id="retry-now" ${refreshAllowed?'':'disabled'}>백오프 초기화 + 재시도</button><button id="toggle">${state.widgetVisible===false?'위젯 보이기':'위젯 숨기기'}</button><button id="reset-position">위치 초기화</button><button id="recreate-widget">위젯 다시 만들기</button></div>
      <p>상태 ${esc(statusLabel)} · 토큰 ${token?'저장됨':'없음'} · ${age(state.lastSyncAt)}${num(state.lastSyncDurationMs)?` · ${state.lastSyncDurationMs}ms`:''}</p>${state.bridgeError?`<p class="warn">${esc(state.bridgeError)}</p>`:''}
    </div>`;
  }

  function renderBridgeControls() {
    const current = document.querySelector('.bridge-control-live');
    if (!current || typeof document?.createElement !== 'function') return false;
    const holder = document.createElement('div');
    holder.innerHTML = bridgeControlsHtml();
    const next = holder.firstElementChild;
    if (!next) return false;
    if (current.outerHTML !== next.outerHTML) current.replaceWith(next);
    bindSettings();
    return true;
  }

  const PANEL_PARTIAL_SELECTORS = [
    '.grid > section.panel.metric',
    '.grid > section.panel.wide:not(.usage-primary):not(.activity-secondary):not(.analytics-panel)',
    '.grid > section.usage-primary',
    '.grid > section.activity-secondary',
    '.grid > section.analytics-panel',
  ];

  function patchPanelSections(nextHtml) {
    if (typeof DOMParser !== 'function') return false;
    const nextDoc = new DOMParser().parseFromString(nextHtml, 'text/html');
    const currentShell = document.querySelector('.shell');
    const nextShell = nextDoc.querySelector('.shell');
    if (!currentShell || !nextShell) return false;

    const staged = [];
    for (const selector of PANEL_PARTIAL_SELECTORS) {
      const currentNodes = Array.from(document.querySelectorAll(selector));
      const nextNodes = Array.from(nextDoc.querySelectorAll(selector));
      if (!currentNodes.length || currentNodes.length !== nextNodes.length) return false;
      for (let i = 0; i < currentNodes.length; i += 1) staged.push([currentNodes[i], nextNodes[i]]);
    }

    // Keep Local Bridge config inputs untouched so typed-but-unsaved values survive,
    // but live-patch the lifecycle control surface and Runtime Diagnostics.
    const currentAdvanced = Array.from(document.querySelectorAll('details.advanced-panel'));
    const nextAdvanced = Array.from(nextDoc.querySelectorAll('details.advanced-panel'));
    const bridgeControlsCurrent = currentAdvanced[0]?.querySelector('.bridge-control-live');
    const bridgeControlsNext = nextAdvanced[0]?.querySelector('.bridge-control-live');
    if (currentAdvanced[0]?.open && bridgeControlsCurrent && bridgeControlsNext) {
      staged.push([bridgeControlsCurrent, bridgeControlsNext]);
    }
    const diagnosticsCurrent = currentAdvanced[1]?.querySelector('.advanced-body');
    const diagnosticsNext = nextAdvanced[1]?.querySelector('.advanced-body');
    if (currentAdvanced[1]?.open && diagnosticsCurrent && diagnosticsNext) {
      staged.push([diagnosticsCurrent, diagnosticsNext]);
    }

    let writes = 0;
    let skips = 0;
    for (const [currentNode, nextNode] of staged) {
      if (currentNode.innerHTML === nextNode.innerHTML) {
        skips += 1;
        continue;
      }
      currentNode.innerHTML = nextNode.innerHTML;
      writes += 1;
    }
    performanceRuntime.panelSectionWrites += writes;
    performanceRuntime.panelSectionSkips += skips;
    if (writes > 0) bindSettings();
    return true;
  }

  function renderSettingsPartial() {
    const startedPerf = typeof performance?.now === 'function' ? performance.now() : Date.now();
    const nextHtml = settingsHtml();
    if (document.body?.dataset?.panelOpen === '1' && patchPanelSections(nextHtml)) {
      performanceRuntime.panelPartialRenders += 1;
      performanceRuntime.lastPanelRenderMode = 'partial';
    } else {
      document.body.innerHTML = nextHtml;
      bindSettings();
      performanceRuntime.panelFullRenders += 1;
      performanceRuntime.lastPanelRenderMode = 'full-fallback';
    }
    const endedPerf = typeof performance?.now === 'function' ? performance.now() : Date.now();
    const duration = Math.max(0, endedPerf - startedPerf);
    performanceRuntime.lastPanelRenderMs = roundPerfMs(duration);
    noteRenderSpike(duration, 'panel', startedPerf, endedPerf, {panel:roundPerfMs(duration)});
  }

  function renderHourlyDrilldownOnly() {
    const current = document.querySelector('.hourly-ledger');
    const scopeKey = ['all','devpass','credits'].includes(String(state.usageScopeView)) ? String(state.usageScopeView) : 'all';
    if (!current || typeof document?.createElement !== 'function') {
      performanceRuntime.hourlyDetailFallbacks += 1;
      renderSettings();
      return;
    }
    const holder = document.createElement('div');
    holder.innerHTML = hourlyRequestDrilldownHtml(scopeKey);
    const next = holder.firstElementChild;
    if (!next) {
      performanceRuntime.hourlyDetailFallbacks += 1;
      renderSettings();
      return;
    }
    if (current.innerHTML === next.innerHTML && current.className === next.className) {
      performanceRuntime.hourlyDetailSkips += 1;
      bindHourlyDrilldown();
      return;
    }
    current.replaceWith(next);
    performanceRuntime.hourlyDetailWrites += 1;
    bindHourlyDrilldown();
  }

  function bindHourlyDrilldown() {
    document.querySelectorAll('[data-usage-hour]').forEach(button => {
      button.onclick = async () => {
        const key = String(button.getAttribute('data-usage-hour') || '');
        state.selectedHourKey = state.selectedHourKey === key ? '' : key;
        await persist();
        renderHourlyDrilldownOnly();
      };
    });
  }

  function bindSettings() {
    const q = s => document.querySelector(s);
    if (q('#close')) q('#close').onclick = () => { document.body.dataset.panelOpen='0'; Risuai.hideContainer(); };
    document.querySelectorAll('[data-dashboard-nav]').forEach(button => {
      button.onclick = async () => {
        const next = String(button.getAttribute('data-dashboard-nav') || 'overview');
        if (!['overview','devpass','credits','analytics','settings'].includes(next)) return;
        state.dashboardView = next;
        const previousUsageScope = state.usageScopeView;
        if (next === 'devpass' || next === 'credits') state.usageScopeView = next;
        const shell = q('.shell');
        if (shell) shell.dataset.dashboardView = next;
        document.querySelectorAll('[data-dashboard-nav]').forEach(item => {
          const active = String(item.getAttribute('data-dashboard-nav') || '') === next;
          item.classList.toggle('active', active);
          item.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        await persist();
        if ((next === 'devpass' || next === 'credits') && previousUsageScope !== state.usageScopeView) renderSettings();
      };
    });
    if (q('#release-notes-toggle')) q('#release-notes-toggle').onclick = e => {
      const button = e.currentTarget;
      const panel = q('#release-notes-panel');
      if (!panel) return;
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      panel.hidden = expanded;
    };
    if (q('#copy-release-guide')) q('#copy-release-guide').onclick = async e => {
      const button = e.currentTarget;
      const guide = String(button.getAttribute('data-release-guide') || '');
      let ok = false;
      try {
        if (guide && navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(guide);
          ok = true;
        }
      } catch (_) {}
      button.textContent = ok ? '복사됨 ✓' : '복사 실패';
    };
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
        noteBridgeLifecycleTransition('connecting','connect');
        state.bridgeEnabled = true; state.bridgeStatus = 'connecting'; state.bridgePausedAt = null; state.bridgeLastReconnectAt = Date.now();
        await persist();
        renderBridgeControls();
        await renderWidget('bridge-connecting');
        scheduleRefresh();
        await enqueueRefresh('connect');
      } catch (e) {
        state.bridgeStatus='error'; state.bridgeError=e?.message||String(e);
        await persist();
        await renderWidget('bridge-connect-error');
        renderBridgeControls();
      }
    };
    if (q('#pause-sync')) q('#pause-sync').onclick = async () => {
      if (!state.bridgeEnabled) return;
      noteBridgeLifecycleTransition('paused','pause-sync');
      state.bridgeEnabled = false;
      state.bridgeStatus = 'paused';
      state.bridgeError = '';
      state.bridgePausedAt = Date.now();
      state.nextRetryAt = null;
      if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
      cancelResumeRefresh();
      cancelRefreshScheduler();
      updateRuntimeState('bridge-paused');
      await persist();
      renderBridgeControls();
      await renderWidget('bridge-paused');
    };
    if (q('#forget-token')) q('#forget-token').onclick = async e => {
      if (!token) return;
      const button = e.currentTarget;
      const now = Date.now();
      if (now > Number(tokenForgetArmedUntil || 0)) {
        tokenForgetArmedUntil = now + 5000;
        renderBridgeControls();
        setTimeout(() => {
          if (tokenForgetArmedUntil > 0 && Date.now() >= tokenForgetArmedUntil) {
            tokenForgetArmedUntil = 0;
            renderBridgeControls();
          }
        }, 5100);
        return;
      }
      tokenForgetArmedUntil = 0;
      noteBridgeLifecycleTransition('off','forget-token');
      token = '';
      if (typeof store.removeItem === 'function') await store.removeItem(TOKEN_KEY);
      else await store.setItem(TOKEN_KEY, '');
      state.bridgeEnabled = false;
      state.bridgeStatus = 'off';
      state.bridgeError = '';
      state.bridgePausedAt = null;
      state.bridgeTokenClearedAt = Date.now();
      state.nextRetryAt = null;
      if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
      cancelResumeRefresh();
      cancelRefreshScheduler();
      updateRuntimeState('bridge-token-forgotten');
      await persist();
      renderBridgeControls();
      await renderWidget('bridge-token-forgotten');
    };
    document.querySelectorAll('[data-usage-scope]').forEach(button => {
      button.onclick = async () => {
        const next = String(button.getAttribute('data-usage-scope') || 'all');
        state.usageScopeView = ['all','devpass','credits'].includes(next) ? next : 'all';
        await persist();
        renderSettings();
      };
    });
    if (q('#credits-org-id')) q('#credits-org-id').onchange = async e => {
      const next = String(e.target.value || '').trim();
      if (!next || next === String(state.selectedCreditsOrgId || '')) return;
      state.selectedCreditsOrgId = next;
      state.selectedHourKey = '';
      await persist();
      await enqueueRefresh('manual');
      renderSettings();
    };
    document.querySelectorAll('[data-recent-filter]').forEach(button => {
      button.onclick = async () => {
        const next = String(button.getAttribute('data-recent-filter') || 'all');
        state.recentRequestFilter = ['all','success','error'].includes(next) ? next : 'all';
        await persist();
        renderSettings();
      };
    });
    bindHourlyDrilldown();
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
      state.widgetDockSide = '';
      drag = null;
      widgetRenderCache.layout = null;
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
    if (q('#recreate-widget')) q('#recreate-widget').onclick = async e => {
      const button=e.currentTarget, old=button.textContent;
      button.disabled=true;
      button.textContent='다시 만드는 중…';
      try {
        const ok=await recreateWidget();
        button.textContent=ok?'재생성 완료 ✓':'재생성 실패';
      } catch (error) {
        console.log(`[Local Usage Dashboard] widget recreate failed: ${error?.message||error}`);
        button.textContent='재생성 실패';
      } finally {
        setTimeout(()=>{ if (button?.isConnected) { button.disabled=false; button.textContent=old; } },1200);
      }
    };
    if (q('#save-performance')) q('#save-performance').onclick = async () => {
      state.syncOnFocus = q('#sync-on-focus')?.checked !== false;
      state.performanceGuard = q('#performance-guard')?.checked !== false;
      state.adaptiveRefresh = q('#adaptive-refresh')?.checked !== false;
      state.backgroundPause = q('#background-pause')?.checked !== false;
      if (state.performanceGuard === false || state.adaptiveRefresh === false) {
        performanceRuntime.adaptiveMultiplier = 1;
        performanceRuntime.mode = 'normal';
        performanceRuntime.slowRefreshes = 0;
        performanceRuntime.fastRefreshes = 0;
      }
      if (!state.syncOnFocus) cancelResumeRefresh();
      if (state.backgroundPause !== false && document.visibilityState === 'hidden') {
        stopUiStallProbe();
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = null;
      } else {
        startUiStallProbe();
        scheduleRefresh();
      }
      updateRuntimeState('settings');
      await persist();
      renderSettings();
    };
    if (q('#stale-ms')) q('#stale-ms').onchange = async e => { state.staleAfterMs = Math.max(0, Number(e.target.value)||0); state.stalePolicyV37Migrated = true; await persist(); await renderWidget(); renderSettings(); };
    if (q('#widget-mode')) q('#widget-mode').onchange = async e => { state.widgetMode = e.target.value === 'detailed' ? 'detailed' : 'compact'; await persist(); await renderWidget(); };
    if (q('#copy-diag')) q('#copy-diag').onclick = async e => { const b=e.currentTarget, old=b.textContent; b.textContent=(await copyDiag())?'복사됨 ✓':'복사 실패'; setTimeout(()=>b.textContent=old,1200); };
    if (q('#export-json')) q('#export-json').onclick = () => {
      const payload = {
        exportedAt: new Date().toISOString(),
        plugin: {name:'Local Usage Dashboard', version:VERSION},
        schema: {snapshot:SNAPSHOT_SCHEMA_VERSION, recentRequest:RECENT_REQUEST_SCHEMA_VERSION},
        usage: state.data || null,
        requestLedger: Array.isArray(state.requestLedger) ? state.requestLedger : [],
        dailyUsage: state.dailyUsage || null,
        creditDailyUsage: state.creditDailyUsage || null,
        bridge: state.data?.bridge || null,
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
    bindDiagnosticsWorkspaceControls();
  }

  async function openSettings() {
    widgetMobileExpanded=false;
    widgetMobileToggleBlockedUntil=Date.now()+800;
    document.body.dataset.panelOpen='1';
    renderSettings();
    await renderWidget('panel-open');
    await Risuai.showContainer('fullscreen');
    widgetMobileExpanded=false;
    widgetMobileToggleBlockedUntil=Math.max(widgetMobileToggleBlockedUntil,Date.now()+250);
    await renderWidget('panel-open-settled');
  }

  const DIAGNOSTICS_WORKSPACE_SECTIONS = Object.freeze([
    {key:'runtime',title:'Runtime & Update'},
    {key:'bridge',title:'Bridge & Managed CLI'},
    {key:'snapshot',title:'Snapshot & Performance'},
    {key:'cache',title:'Cache & Secondary Refresh'},
    {key:'data',title:'Data Fidelity & Request Ledger'},
    {key:'scheduler',title:'Scheduler, UI & Recovery'},
  ]);

  function diagnosticsWorkspaceMode() {
    return state?.diagnosticsMode === 'detailed' ? 'detailed' : 'basic';
  }

  let diagnosticsModePersistTail = Promise.resolve();

  function persistDiagnosticsModeSerialized(mode) {
    const capturedMode = mode === 'detailed' ? 'detailed' : 'basic';
    diagnosticsModePersistTail = diagnosticsModePersistTail
      .then(async () => {
        if (runtimeDisposed) return dropStaleAsync();
        await store.setItem(STATE_KEY, {...state, diagnosticsMode:capturedMode});
        powerRuntime.persistWrites += 1;
      })
      .catch(error => {
        console.log(`[Local Usage Dashboard] diagnostics mode persist failed: ${error?.message || error}`);
      });
    return diagnosticsModePersistTail;
  }

  function setDiagnosticsModeInstant(mode) {
    const next = mode === 'detailed' ? 'detailed' : 'basic';
    if (diagnosticsWorkspaceMode() === next) return;
    state.diagnosticsMode = next;
    renderSettingsPartial();
    void persistDiagnosticsModeSerialized(next);
  }

  function diagnosticsWorkspaceCliRuntime() {
    const runtime = state.data?.bridge?.diagnostics?.cliRuntime;
    const manager = state.bridgeManagerRuntime || null;
    const rawState = String(runtime?.state || manager?.cliRuntimeState || '');
    const rawProvisioning = String(runtime?.provisioning || manager?.cliRuntimeProvisioning || '');
    const stateValue = ['ready','provisioning','unavailable','invalid'].includes(rawState) ? rawState : 'unavailable';
    const provisioning = ['ok','pending','backoff','disabled','unavailable'].includes(rawProvisioning) ? rawProvisioning : 'unavailable';
    return {
      state:stateValue,
      version:String(runtime?.version || manager?.cliRuntimeVersion || ''),
      provisioning,
    };
  }

  function diagnosticsCaptureIdentity(capturedAt = Date.now()) {
    const refreshCountRaw = Number(state?.refreshCount);
    const refreshCount = Number.isFinite(refreshCountRaw) ? Math.max(0, Math.trunc(refreshCountRaw)) : 0;
    const reason = String(state?.lastRefreshReason || '').trim() || 'UNKNOWN';
    const syncRaw = Number(state?.lastSyncAt);
    const lastSyncAt = state?.lastSyncAt !== null && state?.lastSyncAt !== undefined && state?.lastSyncAt !== '' && Number.isFinite(syncRaw) && syncRaw > 0
      ? syncRaw
      : null;
    return {capturedAt:Number(capturedAt),refreshCount,reason,lastSyncAt};
  }

  function diagnosticsCaptureIdentityText(capture = diagnosticsCaptureIdentity()) {
    const sync = capture.lastSyncAt === null ? 'UNKNOWN' : new Date(Number(capture.lastSyncAt)).toISOString();
    return `#${capture.refreshCount} · ${capture.reason} · sync ${sync}`;
  }

  function diagnosticsWorkspaceBasicModel() {
    const capture = diagnosticsCaptureIdentity();
    const d = state.data || {};
    const h = d.health || {};
    const bridgeDiag = bridgeStabilitySnapshot();
    const runtimeBridge = bridgeRuntimeSnapshot();
    const stable = stableReadinessSnapshot(bridgeDiag, runtimeBridge);
    const cli = diagnosticsWorkspaceCliRuntime();
    const scopeKey = ['all','devpass','credits'].includes(String(state.usageScopeView)) ? String(state.usageScopeView) : 'all';
    const ledgerRows = requestLedgerRowsForScope(scopeKey);
    let exactRows = 0;
    for (const row of ledgerRows) {
      const precision = row?.timestampPrecision && row.timestampPrecision !== 'unknown'
        ? String(row.timestampPrecision)
        : requestTimestampPrecision(row?.timestamp, row?.timestampSource, row?.requestNumber);
      if (precision === 'exact') exactRows += 1;
    }
    const activeErrors = localRuntimeActiveCount();
    const staleModules = Number.isFinite(Number(bridgeDiag.staleModules)) ? Number(bridgeDiag.staleModules) : null;
    const failures = Number(state.consecutiveFailures || 0);
    const snapshotPerformance = bridgeDiag.snapshotPerformance || null;
    const snapshotMs = num(snapshotPerformance?.totalMs)
      ? Number(snapshotPerformance.totalMs)
      : (num(performanceRuntime.lastRefreshPhases?.snapshot) ? Number(performanceRuntime.lastRefreshPhases.snapshot) : null);
    const criticalPath = String(snapshotPerformance?.criticalPath || '');
    const criticalPathMs = num(snapshotPerformance?.criticalPathMs) ? Number(snapshotPerformance.criticalPathMs) : null;
    const managerSyncVersion = String(state.bridgeManagerSyncedProductVersion || state.bridgeManagerRuntime?.productVersion || '');
    const issues = [];
    if (staleModules !== null && staleModules > 0) issues.push(`Bridge modules stale ${staleModules}`);
    if (activeErrors > 0) issues.push(`Local active errors ${activeErrors}`);
    if (failures > 0) issues.push(`Refresh failures ${failures}`);
    if (cli.state !== 'ready') issues.push(`CLI runtime ${cli.state}`);
    return {
      capture,
      readiness:stable.ready ? 'READY' : 'BLOCKED',
      health:String(h.status || '—'),
      activeErrors,
      failures,
      engineVersion:String(bridgeDiag.version || REQUIRED_BRIDGE_VERSION || ''),
      managerVersion:String(runtimeBridge.managerVersion || state.bridgeManagerRuntime?.managerVersion || ''),
      cli,
      lastRefreshMs:num(state.lastSyncDurationMs) ? Number(state.lastSyncDurationMs) : null,
      snapshotMs,
      criticalPath,
      criticalPathMs,
      dataAge:state.lastSyncAt ? age(state.lastSyncAt) : '—',
      staleModules,
      exactRows,
      ledgerRows:ledgerRows.length,
      updaterCompatible:stable.updaterCompatible,
      managerSync:managerSyncVersion ? (managerSyncVersion === VERSION ? 'current' : managerSyncVersion) : '—',
      issues,
    };
  }

  function diagnosticsWorkspaceBasicText(model = diagnosticsWorkspaceBasicModel()) {
    const lastRefresh = model.lastRefreshMs === null ? '—' : `${roundPerfMs(model.lastRefreshMs)}ms`;
    const snapshot = model.snapshotMs === null ? '—' : `${roundPerfMs(model.snapshotMs)}ms`;
    const critical = model.criticalPath
      ? `${model.criticalPath}${model.criticalPathMs === null ? '' : ` ${roundPerfMs(model.criticalPathMs)}ms`}`
      : '—';
    return [
      `Local Usage Dashboard v${VERSION}`,
      `Diagnostic captured: ${diagnosticTimestamp(model.capture.capturedAt)}`,
      `Refresh identity: ${diagnosticsCaptureIdentityText(model.capture)}`,
      `Status: ${model.readiness} · Health ${model.health} · active errors ${model.activeErrors} · failures ${model.failures}`,
      `Runtime: Engine ${model.engineVersion || '—'} · Manager ${model.managerVersion || '—'} · Managed CLI ${model.cli.version ? `v${model.cli.version}` : 'v—'} · ${model.cli.state}`,
      `Last refresh: ${lastRefresh} · snapshot ${snapshot} · critical ${critical}`,
      `Data: age ${model.dataAge} · stale modules ${model.staleModules === null ? '—' : model.staleModules} · Request fidelity exact ${model.exactRows}/${model.ledgerRows}`,
      `Updater: ${model.updaterCompatible ? 'compatible' : 'incompatible'} · sync ${model.managerSync}`,
      ...(model.issues.length ? [`Current issues: ${model.issues.join(' · ')}`] : []),
    ].join('\n');
  }

  function diagnosticsWorkspaceSectionKey(line) {
    const value = String(line || '');
    if (/^(Cache |Cache observer:|Cache write telemetry:|Cache semantics:|Bridge snapshot cache:|Bridge snapshot cache decisions:|Bridge secondary refresh:|Bridge cache)/.test(value)) return 'cache';
    if (/^(Bridge snapshot attribution:|Bridge snapshot jobs:|Bridge snapshot timeline:|Bridge Credits early-start:|Refresh phase duration:|Refresh slowest phase:|Refresh attribution)/.test(value)) return 'snapshot';
    if (/^(Request |Service tier |DevPass account |Hourly |Usage |Recent request|Data fidelity|Data age)/.test(value)) return 'data';
    if (/^(Bridge |Unified runtime:)/.test(value)) return 'bridge';
    if (/^(Performance Guard:|UI Stall Probe:|Stall \/ Render:|Resume |Scheduler:|Render:|Panel Render:|Local runtime|Recovery )/.test(value)) return 'scheduler';
    return 'runtime';
  }

  const RUNTIME_WEIGHT_REQUEST_LEDGER_LIMIT = 2000;

  function runtimeWeightAuditKnown(value) {
    return value !== null && value !== undefined && Number.isFinite(Number(value)) ? Number(value) : null;
  }

  function runtimeWeightAuditMs(value) {
    const known = runtimeWeightAuditKnown(value);
    return known === null ? 'UNKNOWN' : `${roundPerfMs(known)}ms`;
  }

  function runtimeWeightAuditTimers() {
    return [
      ['refresh', refreshTimer],
      ['reset-sync', resetSyncTimer],
      ['refresh-scheduler', refreshSchedulerTimer],
      ['panel-render', panelRenderTimer],
      ['ui-stall-probe', uiStallProbeTimer],
      ['resume-probe', resumeProbeTimer],
      ['resume-measure', resumeMeasureTimer],
      ['resume-refresh', resumeRefreshTimer],
    ];
  }

  function runtimeWeightAuditModel() {
    const bridgeDiag = bridgeStabilitySnapshot();
    const snapshotPerformance = bridgeDiag.snapshotPerformance && typeof bridgeDiag.snapshotPerformance === 'object'
      ? bridgeDiag.snapshotPerformance
      : null;
    const secondary = snapshotPerformance?.secondaryRefresh && typeof snapshotPerformance.secondaryRefresh === 'object'
      ? snapshotPerformance.secondaryRefresh
      : null;
    const phases = performanceRuntime.lastRefreshPhases && typeof performanceRuntime.lastRefreshPhases === 'object'
      ? performanceRuntime.lastRefreshPhases
      : null;
    const timers = runtimeWeightAuditTimers();
    const activeTimers = timers.filter(([, handle]) => handle !== null).map(([name]) => name);
    const idleHandles = [refreshSchedulerIdleHandle, panelIdleHandle].filter(handle => handle !== null).length;
    const ledgerRows = Array.isArray(state.requestLedger) ? state.requestLedger.length : 0;
    const responsiveStyleKeys = widgetRenderCache?.responsiveStyles && typeof widgetRenderCache.responsiveStyles === 'object'
      ? Object.keys(widgetRenderCache.responsiveStyles).length
      : 0;
    const widgetCacheFields = ['html','width','display','layout'].filter(key => widgetRenderCache?.[key] !== null && widgetRenderCache?.[key] !== undefined).length;
    return {
      ledgerRows,
      ledgerLimit:RUNTIME_WEIGHT_REQUEST_LEDGER_LIMIT,
      stateKeys:state && typeof state === 'object' ? Object.keys(state).length : null,
      activeTimers,
      timerSlots:timers.length,
      idleHandles,
      observerActive:resumeLongTaskObserver !== null,
      remoteListeners:Array.isArray(remoteListeners) ? remoteListeners.length : null,
      widgetRemoteListeners:Array.isArray(widgetRemoteListeners) ? widgetRemoteListeners.length : null,
      domListeners:Array.isArray(domListeners) ? domListeners.length : null,
      refreshInFlight:Boolean(refreshInFlight),
      resumePending:Boolean(performanceRuntime.resumePending),
      resumeMeasurePending:Boolean(performanceRuntime.resumeMeasurePending),
      schedulerQueued:Number(performanceRuntime.schedulerQueued || 0),
      schedulerMerged:Number(performanceRuntime.schedulerMerged || 0),
      schedulerExecuted:Number(performanceRuntime.schedulerExecuted || 0),
      schedulerDeferred:Number(performanceRuntime.schedulerDeferredForInteraction || 0),
      bridgeCacheEntries:runtimeWeightAuditKnown(bridgeDiag.cacheEntries),
      bridgeCacheInFlight:runtimeWeightAuditKnown(bridgeDiag.inFlight),
      cliActive:runtimeWeightAuditKnown(bridgeDiag.cliActive),
      cliQueued:runtimeWeightAuditKnown(bridgeDiag.cliQueued),
      secondaryQueued:runtimeWeightAuditKnown(secondary?.queued),
      secondaryRunning:runtimeWeightAuditKnown(secondary?.running),
      widgetCacheFields,
      responsiveStyleKeys,
      normalizeMs:runtimeWeightAuditKnown(phases?.['normalize-ledger']),
      persistMs:runtimeWeightAuditKnown(phases?.persist),
      widgetRenderPhaseMs:runtimeWeightAuditKnown(phases?.['widget-render']),
      renderMs:runtimeWeightAuditKnown(performanceRuntime.lastRenderMs),
      panelRenderMs:runtimeWeightAuditKnown(performanceRuntime.lastPanelRenderMs),
      persistWrites:Number(powerRuntime.persistWrites || 0),
      staleAsyncDrops:Number(staleAsyncDrops || 0),
    };
  }

  function runtimeWeightAuditValue(value) {
    return value === null || value === undefined ? 'UNKNOWN' : String(value);
  }

  function runtimeWeightAuditLines(model = runtimeWeightAuditModel()) {
    const timerNames = model.activeTimers.length ? model.activeTimers.join(',') : 'none';
    return [
      'Runtime Weight Audit: measurement-only · network 0 · CLI 0 · polling 0 · heap bytes UNKNOWN · pruning 0',
      `Retained state: Request Ledger ${model.ledgerRows}/${model.ledgerLimit} · state keys ${runtimeWeightAuditValue(model.stateKeys)} · widget cache fields ${model.widgetCacheFields}/4 · responsive style keys ${model.responsiveStyleKeys}`,
      `Lifecycle ownership: timers ${model.activeTimers.length}/${model.timerSlots} [${timerNames}] · idle handles ${model.idleHandles}/2 · long-task observer ${model.observerActive ? 'active' : 'idle'}`,
      `Listener ownership: remote ${runtimeWeightAuditValue(model.remoteListeners)} · widget remote ${runtimeWeightAuditValue(model.widgetRemoteListeners)} · DOM ${runtimeWeightAuditValue(model.domListeners)}`,
      `In-flight ownership: refresh ${model.refreshInFlight ? 'active' : 'idle'} · resume ${model.resumePending ? 'pending' : 'idle'} · resume measure ${model.resumeMeasurePending ? 'pending' : 'idle'} · stale async drops ${model.staleAsyncDrops}`,
      `Scheduler counters: queued ${model.schedulerQueued} · merged ${model.schedulerMerged} · executed ${model.schedulerExecuted} · interaction deferred ${model.schedulerDeferred}`,
      `Bridge retained work: cache entries ${runtimeWeightAuditValue(model.bridgeCacheEntries)} · cache in-flight ${runtimeWeightAuditValue(model.bridgeCacheInFlight)} · CLI active ${runtimeWeightAuditValue(model.cliActive)} · CLI queued ${runtimeWeightAuditValue(model.cliQueued)} · secondary queued ${runtimeWeightAuditValue(model.secondaryQueued)} · running ${runtimeWeightAuditValue(model.secondaryRunning)}`,
      `Local cost: normalize-ledger ${runtimeWeightAuditMs(model.normalizeMs)} · persist ${runtimeWeightAuditMs(model.persistMs)} · widget-render phase ${runtimeWeightAuditMs(model.widgetRenderPhaseMs)} · last render ${runtimeWeightAuditMs(model.renderMs)} · panel ${runtimeWeightAuditMs(model.panelRenderMs)} · persist writes ${model.persistWrites}`,
      'Slimming decision: S0 evidence only · removal classification pending repository/real-device evidence',
    ];
  }

  function diagnosticsWorkspaceDetailedSections() {
    const groups = new Map(DIAGNOSTICS_WORKSPACE_SECTIONS.map(section => [section.key, []]));
    for (const line of diagText().split('\n')) groups.get(diagnosticsWorkspaceSectionKey(line)).push(line);
    const sections = DIAGNOSTICS_WORKSPACE_SECTIONS.map(section => ({...section,lines:groups.get(section.key)}));
    return [...sections, {key:'runtime-weight', title:'Runtime Weight Audit', lines:runtimeWeightAuditLines()}];
  }

  function diagnosticsWorkspaceDetailedHtml() {
    return diagnosticsWorkspaceDetailedSections().map((section, index) => `<details class="diag-workspace-section" ${index === 0 ? 'open' : ''}><summary><b>${esc(section.title)}</b><span>${section.lines.length} lines</span></summary><div class="diag-workspace-lines">${section.lines.map(line => `<p>${esc(line)}</p>`).join('')}</div></details>`).join('');
  }

  function diagnosticsWorkspaceBasicHtml() {
    const model = diagnosticsWorkspaceBasicModel();
    const lastRefresh = model.lastRefreshMs === null ? '—' : `${roundPerfMs(model.lastRefreshMs)}ms`;
    const snapshot = model.snapshotMs === null ? '—' : `${roundPerfMs(model.snapshotMs)}ms`;
    const critical = model.criticalPath
      ? `${model.criticalPath}${model.criticalPathMs === null ? '' : ` · ${roundPerfMs(model.criticalPathMs)}ms`}`
      : '—';
    const issueHtml = model.issues.length
      ? `<div class="diag-workspace-issues"><b>Current evidence</b>${model.issues.map(item => `<p>${esc(item)}</p>`).join('')}</div>`
      : '';
    return `<div class="diag-workspace-capture"><b>Captured #${model.capture.refreshCount}</b><span>${esc(diagnosticTimestamp(model.capture.capturedAt))} · ${esc(model.capture.reason)} · sync ${esc(model.capture.lastSyncAt === null ? 'UNKNOWN' : new Date(Number(model.capture.lastSyncAt)).toISOString())}</span></div><div class="minis diag-summary diag-workspace-basic"><div class="mini"><span>Status</span><b>${esc(model.readiness)}</b><small>Health ${esc(model.health)} · errors ${model.activeErrors} · failures ${model.failures}</small></div><div class="mini"><span>Runtime</span><b>Engine ${esc(model.engineVersion || '—')}</b><small>Manager ${esc(model.managerVersion || '—')} · CLI ${model.cli.version ? `v${esc(model.cli.version)}` : 'v—'} ${esc(model.cli.state)}</small></div><div class="mini"><span>Last refresh</span><b>${esc(lastRefresh)}</b><small>snapshot ${esc(snapshot)} · critical ${esc(critical)}</small></div><div class="mini"><span>Data</span><b>${esc(model.dataAge)}</b><small>stale ${model.staleModules === null ? '—' : model.staleModules} · exact ${model.exactRows}/${model.ledgerRows}</small></div><div class="mini"><span>Updater</span><b>${model.updaterCompatible ? 'compatible' : 'incompatible'}</b><small>sync ${esc(model.managerSync)}</small></div></div>${issueHtml}`;
  }

  function diagnosticsWorkspacePanelHtml() {
    const mode = diagnosticsWorkspaceMode();
    const body = mode === 'detailed' ? diagnosticsWorkspaceDetailedHtml() : diagnosticsWorkspaceBasicHtml();
    return `<details class="panel wide advanced-panel"><summary><b>Runtime Diagnostics</b><span>Basic · Detailed · Full Copy</span></summary><div class="advanced-body"><style>.diag-workspace-capture{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:0 0 8px;color:var(--m);font-size:9px}.diag-workspace-capture b{color:var(--t);font-size:10px}.diag-workspace-tabs{display:flex;gap:6px;margin:2px 0 10px}.diag-workspace-tabs button{flex:1}.diag-workspace-tabs button.active{background:var(--g);border-color:var(--g);color:#15170f}.diag-workspace-basic{grid-template-columns:repeat(5,minmax(0,1fr))}.diag-workspace-basic .mini small{display:block;color:var(--m);font-size:9px;margin-top:4px;white-space:normal}.diag-workspace-issues{border:1px solid var(--e);border-radius:9px;padding:9px;margin:8px 0}.diag-workspace-issues>b{color:var(--e);font-size:10px}.diag-workspace-issues p{margin:4px 0 0}.diag-workspace-section{border:1px solid var(--l);border-radius:9px;margin-top:7px;overflow:hidden}.diag-workspace-section>summary{display:flex;justify-content:space-between;gap:8px;padding:9px;cursor:pointer;list-style:none}.diag-workspace-section>summary::-webkit-details-marker{display:none}.diag-workspace-section>summary span{color:var(--m);font-size:9px}.diag-workspace-section[open]>summary{border-bottom:1px solid var(--l)}.diag-workspace-lines{padding:5px 9px}.diag-workspace-lines p{margin:5px 0;font-size:10px;overflow-wrap:anywhere}@media(max-width:680px){.diag-workspace-basic{grid-template-columns:1fr 1fr}.diag-workspace-basic .mini:last-child{grid-column:1/-1}}</style><div class="diag-workspace-tabs" role="group" aria-label="Diagnostics view"><button id="diagnostics-mode-basic" class="${mode === 'basic' ? 'active' : ''}" aria-pressed="${mode === 'basic' ? 'true' : 'false'}">Basic</button><button id="diagnostics-mode-detailed" class="${mode === 'detailed' ? 'active' : ''}" aria-pressed="${mode === 'detailed' ? 'true' : 'false'}">Detailed</button></div>${body}<div class="actions"><button id="copy-diag-summary">요약 복사</button><button id="copy-diag">전체 Diagnostics 복사</button><button id="export-json">JSON 내보내기</button></div></div></details>`;
  }


  function bindDiagnosticsWorkspaceControls() {
    const q = selector => document.querySelector(selector);
    if (q('#copy-diag-summary')) q('#copy-diag-summary').onclick = async e => {
      let copied = false;
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(diagnosticsWorkspaceBasicText());
          copied = true;
        }
      } catch (_) {}
      if (e?.currentTarget) e.currentTarget.textContent = copied ? '요약 복사됨 ✓' : '요약 복사 실패';
    };
    const basic = q('#diagnostics-mode-basic');
    const detailed = q('#diagnostics-mode-detailed');
    if (basic) basic.onclick = () => setDiagnosticsModeInstant('basic');
    if (detailed) detailed.onclick = () => setDiagnosticsModeInstant('detailed');
  }

  function widgetHtml() {
    const d=state.data||{}, m=d.monthly, w=d.weekly, c=d.credits, a=d.activity, detailed=state.widgetMode==='detailed';
    const badge=connectionBadge();
    const mobileCollapsed = widgetMobileViewport && !widgetMobileExpanded;
    if (mobileCollapsed) {
      const monthlyValue = num(m?.remaining) ? money(m.remaining) : (num(m?.todayUsed) ? money(m.todayUsed,4) : '—');
      return `<div data-mobile-widget-summary="1" title="≡로 이동 · ▾로 펼치기" style="display:grid;grid-template-columns:20px auto 1fr 24px;align-items:center;gap:5px;min-height:24px;font:11px/1 system-ui,-apple-system,'Segoe UI',sans-serif;font-variant-numeric:tabular-nums;color:#f5f7fa;white-space:nowrap;cursor:default">
        <span data-drag-handle="1" aria-label="위젯 이동" style="display:grid;place-items:center;height:22px;color:#8e96a2;font-size:14px;font-weight:900;cursor:grab;touch-action:none">≡</span>
        <span style="font-size:9px;font-weight:800;letter-spacing:.05em;color:${badge.color};border:1px solid ${badge.color};border-radius:99px;padding:2px 5px">${badge.label}</span>
        <b style="overflow:hidden;text-overflow:ellipsis">${monthlyValue}</b>
        <span data-widget-toggle="1" aria-label="위젯 펼치기" style="display:grid;place-items:center;height:22px;border-left:1px solid rgba(255,255,255,.08);color:#aeb5c0;font-size:12px;font-weight:900;cursor:pointer">▾</span>
      </div>`;
    }
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
    const topControls = widgetMobileViewport
      ? `<div data-widget-controlbar="1" style="display:grid;grid-template-columns:28px 1fr 30px;align-items:center;gap:6px;min-height:27px;margin:-1px 0 4px">
          <span data-drag-handle="1" aria-label="위젯 이동" style="display:grid;place-items:center;height:25px;color:#8e96a2;font-size:16px;font-weight:900;cursor:grab;touch-action:none">≡</span>
          <span style="justify-self:end;font-size:9px;font-weight:800;letter-spacing:.05em;color:${badge.color};border:1px solid ${badge.color};border-radius:99px;padding:1px 5px">${badge.label}</span>
          <span data-widget-toggle="1" aria-label="위젯 접기" style="display:grid;place-items:center;height:25px;border-left:1px solid rgba(255,255,255,.08);color:#aeb5c0;font-size:12px;font-weight:900;cursor:pointer">▴</span>
        </div>`
      : `<div data-drag-handle="1" style="height:12px;background:linear-gradient(rgba(255,255,255,.25),rgba(255,255,255,.25)) center/28px 3px no-repeat;cursor:grab;touch-action:none"></div>
        <div style="display:flex;justify-content:flex-end;margin:-2px 0 4px"><span style="font-size:9px;font-weight:800;letter-spacing:.05em;color:${badge.color};border:1px solid ${badge.color};border-radius:99px;padding:1px 5px">${badge.label}</span></div>`;
    return `<div style="font:12px/1.35 system-ui,-apple-system,'Segoe UI',sans-serif;color:#f5f7fa">
      ${topControls}
      ${row(detailed?'월간 남음':(m?.label||'월간'),main(m),'#aeb5c0')}${detailed?`<div style="color:#7f8792;font-size:11px;font-weight:600;line-height:1.3;font-variant-numeric:tabular-nums;white-space:nowrap">${monthlySub}</div>`:''}
      <div style="height:4px;background:#2d3138;border-radius:99px;overflow:hidden;margin:5px 0 7px"><i style="display:block;height:100%;width:${m?pct(100-Number(m.percent||0)):0}%;background:#c5f277"></i></div>
      ${row(detailed?'프리미엄 남음':(w?.label||'주간'),main(w),'#b7add0')}${detailed?`<div style="color:#7f8792;font-size:11px;font-weight:600;line-height:1.3;font-variant-numeric:tabular-nums;white-space:nowrap">${premiumSub}</div>`:''}
      <div style="height:4px;background:#2d3138;border-radius:99px;overflow:hidden;margin:5px 0 7px"><i style="display:block;height:100%;width:${w?pct(100-Number(w.percent||0)):0}%;background:#b9a6f8"></i></div>
      ${row(detailed?'크레딧':(c?.label||'Credits'),detailed?money(c?.balance):(num(c?.todayUsed)?money(c.todayUsed,4):money(c?.balance)),'#9fc9df')}${detailed?`<div style="color:#7f8792;font-size:11px;font-weight:600;line-height:1.3;font-variant-numeric:tabular-nums;white-space:nowrap">${creditsSub}</div>`:''}
      ${detailed && a ? `<div style="color:#8e96a2;font-size:10px;font-weight:650;line-height:1.35;border-top:1px solid rgba(255,255,255,.09);margin-top:7px;padding-top:6px;font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right">24h ${num(a.requests24h)?`${a.requests24h}회`:'—'} · ${money(a.cost24h,4)} · ${tokenText(a.totalTokens24h)} tok${state.lastSyncAt?(state.bridgeStatus==='paused'?` · PAUSED · 마지막 ${age(state.lastSyncAt)} 동기화`:` · LIVE ${age(state.lastSyncAt)} 동기화`):''}</div>`:''}
      <div style="display:flex;justify-content:space-between;gap:8px;color:#7f8792;font-size:10px;margin-top:5px">
        <span>${state.bridgeStatus==='paused'?'동기화 일시정지':state.bridgeStatus==='off'?'동기화 꺼짐':state.bridgeStatus==='error'?'마지막 정상값 유지':dataIsStale()?`스냅샷 ${age(d.fetchedAt)}`:'자동 갱신'}</span>
        <span>${age(state.lastSyncAt)} · ${VERSION}</span>
      </div>
    </div>`;
  }

  const widgetWidth = (mobile = false, expanded = false) => mobile
    ? (expanded ? 'min(220px,calc(100vw - 16px))' : 'min(152px,calc(100vw - 16px))')
    : (state.widgetMode === 'detailed' ? 'clamp(196px,52vw,220px)' : 'clamp(166px,44vw,184px)');

  async function widgetMobileMode() {
    if (!rootBody) return false;
    try { return Number(await rootBody.clientWidth()) <= 600; } catch { return false; }
  }

  async function setResponsiveWidgetStyle(name, value) {
    if (!widget) return false;
    if (!widgetRenderCache.responsiveStyles || typeof widgetRenderCache.responsiveStyles !== 'object') {
      widgetRenderCache.responsiveStyles = Object.create(null);
    }
    if (widgetRenderCache.responsiveStyles[name] === value) {
      powerRuntime.responsiveStyleSkips += 1;
      performanceRuntime.widgetStyleSkips += 1;
      return false;
    }
    await widget.setStyle(name, value);
    widgetRenderCache.responsiveStyles[name] = value;
    powerRuntime.responsiveStyleWrites += 1;
    performanceRuntime.widgetStyleWrites += 1;
    return true;
  }

  async function applyWidgetResponsiveLayout(mobile, expanded) {
    if (!widget) return;
    const dockSide = ['left','right'].includes(String(state.widgetDockSide || '')) ? String(state.widgetDockSide) : '';
    const hasSavedY = num(state.widgetY);
    const hasSavedX = num(state.widgetX);
    const layout = mobile
      ? `${expanded ? 'mobile-expanded' : 'mobile-collapsed'}:${dockSide || (hasSavedX && hasSavedY ? 'free' : 'default')}`
      : 'desktop';
    if (widgetRenderCache.layout === layout) return;
    let desired;
    if (mobile && hasSavedY && dockSide === 'left') {
      desired = {
        left:'8px', top:`${state.widgetY}px`, right:'auto', bottom:'auto',
        'border-radius':expanded?'11px':'999px',
        padding:expanded?'5px 10px 8px':'6px 8px'
      };
    } else if (mobile && hasSavedY && dockSide === 'right') {
      desired = {
        left:'auto', top:`${state.widgetY}px`, right:'8px', bottom:'auto',
        'border-radius':expanded?'11px':'999px',
        padding:expanded?'5px 10px 8px':'6px 8px'
      };
    } else if (mobile && hasSavedX && hasSavedY) {
      desired = {
        left:`${state.widgetX}px`, top:`${state.widgetY}px`, right:'auto', bottom:'auto',
        'border-radius':expanded?'11px':'999px',
        padding:expanded?'5px 10px 8px':'6px 8px'
      };
    } else if (mobile) {
      desired = {
        left:'auto', top:'auto', right:'8px', bottom:'88px',
        'border-radius':expanded?'11px':'999px',
        padding:expanded?'5px 10px 8px':'6px 8px'
      };
    } else if (num(state.widgetX)&&num(state.widgetY)) {
      desired = {
        left:`${state.widgetX}px`, top:`${state.widgetY}px`, right:'auto', bottom:'auto',
        'border-radius':'11px', padding:'5px 10px 8px'
      };
    } else {
      desired = {
        left:'auto', top:'auto', right:'12px', bottom:'74px',
        'border-radius':'11px', padding:'5px 10px 8px'
      };
    }
    for (const [name, value] of Object.entries(desired)) {
      await setResponsiveWidgetStyle(name, value);
    }
    widgetRenderCache.layout = layout;
  }

  async function clampWidgetToViewport() {
    if (!widget || !rootBody || (!num(state.widgetX) && !num(state.widgetY))) return false;
    const rect = await widget.getBoundingClientRect();
    const bodyWidth = Number(await rootBody.clientWidth());
    const bodyHeight = Number(await rootBody.clientHeight());
    const maxX = Math.max(8, bodyWidth - Number(rect.width || 0) - 8);
    const maxY = Math.max(8, bodyHeight - Number(rect.height || 0) - 8);
    const nextY = Math.max(8, Math.min(maxY, num(state.widgetY) ? Number(state.widgetY) : Number(rect.top || 8)));
    const dockSide = ['left','right'].includes(String(state.widgetDockSide || '')) ? String(state.widgetDockSide) : '';
    state.widgetY = nextY;
    await widget.setStyle('top',`${nextY}px`);
    await widget.setStyle('bottom','auto');
    if (widgetMobileViewport && dockSide === 'right') {
      state.widgetX = maxX;
      await widget.setStyle('left','auto');
      await widget.setStyle('right','8px');
    } else {
      const nextX = widgetMobileViewport && dockSide === 'left'
        ? 8
        : Math.max(8, Math.min(maxX, num(state.widgetX) ? Number(state.widgetX) : Number(rect.left || 8)));
      state.widgetX = nextX;
      await widget.setStyle('left',`${nextX}px`);
      await widget.setStyle('right','auto');
    }
    if (widgetRenderCache.responsiveStyles && typeof widgetRenderCache.responsiveStyles === 'object') {
      widgetRenderCache.responsiveStyles.top = `${state.widgetY}px`;
      widgetRenderCache.responsiveStyles.bottom = 'auto';
      widgetRenderCache.responsiveStyles.left = widgetMobileViewport && dockSide === 'right' ? 'auto' : `${state.widgetX}px`;
      widgetRenderCache.responsiveStyles.right = widgetMobileViewport && dockSide === 'right' ? '8px' : 'auto';
    }
    return true;
  }

  async function detachWidgetRemoteListeners() {
    const entries = widgetRemoteListeners.splice(0);
    if (!entries.length) return;
    const owned = new Set(entries);
    for (const [target,type,id] of entries) {
      try { await target.removeEventListener(type,id); } catch (_) {}
    }
    for (let index=remoteListeners.length-1; index>=0; index-=1) {
      if (owned.has(remoteListeners[index])) remoteListeners.splice(index,1);
    }
  }

  async function addWidgetRemoteListener(target,type,handler) {
    const entry=[target,type,await target.addEventListener(type,handler)];
    widgetRemoteListeners.push(entry);
    remoteListeners.push(entry);
    return entry;
  }

  async function recreateWidget() {
    if (runtimeDisposed) return false;
    await detachWidgetRemoteListeners();
    if (widget) {
      try { await widget.remove(); } catch (_) {}
    }
    widget=null;
    rootBody=null;
    drag=null;
    widgetMobileExpanded=false;
    widgetMobileViewport=false;
    widgetMobileToggleBlockedUntil=Date.now()+400;
    widgetRenderCache={html:null,width:null,display:null,layout:null,responsiveStyles:Object.create(null)};
    await renderWidget('widget-recreate');
    return !!widget;
  }

  async function ensureWidget() {
    if (widget) return;
    if (!(await Risuai.requestPluginPermission('mainDom'))) return;
    const root = await Risuai.getRootDocument();
    rootBody = await root.querySelector('body');
    widget = await root.createElement('div');
    const pos = num(state.widgetX)&&num(state.widgetY)?`left:${state.widgetX}px;top:${state.widgetY}px;`:'right:12px;bottom:74px;';
    await widget.setStyleAttribute(`position:fixed;${pos}width:${widgetWidth()};max-width:calc(100vw - 16px);z-index:2147483000;background:#191b20;color:#f5f7fa;border:1px solid rgba(255,255,255,.12);border-radius:11px;box-shadow:0 6px 18px rgba(0,0,0,.24);padding:5px 10px 8px;box-sizing:border-box;user-select:none;touch-action:manipulation;`);
    await rootBody.appendChild(widget);
    const down = async e => {
      if (!num(e.clientX)||!num(e.clientY)) return;
      const r=await widget.getBoundingClientRect();
      const localX = Number(e.clientX) - r.left;
      const localY = Number(e.clientY) - r.top;
      const inHandle = widgetMobileViewport
        ? localX >= 0 && localX <= 38 && localY >= 0 && localY <= 42
        : localY >= 0 && localY <= 18;
      if (!inHandle) {
        drag = null;
        return;
      }
      drag={
        pointerId: e.pointerId ?? null,
        startX:Number(e.clientX),
        startY:Number(e.clientY),
        ox:Number(e.clientX)-r.left,
        oy:Number(e.clientY)-r.top,
        moved:false,
        maxX:Math.max(8,(await rootBody.clientWidth())-r.width-8),
        maxY:Math.max(8,(await rootBody.clientHeight())-r.height-8)
      };
    };
    const move = async e => {
      if (!drag||!num(e.clientX)||!num(e.clientY)) return;
      if (drag.pointerId !== null && e.pointerId !== undefined && e.pointerId !== drag.pointerId) return;
      const distance = Math.hypot(Number(e.clientX)-drag.startX, Number(e.clientY)-drag.startY);
      if (!drag.moved && distance < 6) return;
      drag.moved = true;
      state.widgetX=Math.max(8,Math.min(drag.maxX,Number(e.clientX)-drag.ox));
      state.widgetY=Math.max(8,Math.min(drag.maxY,Number(e.clientY)-drag.oy));
      await widget.setStyle('left',`${state.widgetX}px`);
      await widget.setStyle('top',`${state.widgetY}px`);
      await widget.setStyle('right','auto');
      await widget.setStyle('bottom','auto');
      if (widgetRenderCache.responsiveStyles && typeof widgetRenderCache.responsiveStyles === 'object') {
        widgetRenderCache.responsiveStyles.left = `${state.widgetX}px`;
        widgetRenderCache.responsiveStyles.top = `${state.widgetY}px`;
        widgetRenderCache.responsiveStyles.right = 'auto';
        widgetRenderCache.responsiveStyles.bottom = 'auto';
      }
    };
    const up = async e => {
      if (!drag) return;
      if (drag.pointerId !== null && e?.pointerId !== undefined && e.pointerId !== drag.pointerId) return;
      const finished = drag;
      drag=null;
      if (!finished.moved) return;
      if (widgetMobileViewport) {
        const dockSide = Number(state.widgetX || 0) <= finished.maxX / 2 ? 'left' : 'right';
        state.widgetDockSide = dockSide;
        state.widgetX = dockSide === 'left' ? 8 : finished.maxX;
        if (dockSide === 'left') {
          await widget.setStyle('left','8px');
          await widget.setStyle('right','auto');
        } else {
          await widget.setStyle('left','auto');
          await widget.setStyle('right','8px');
        }
        widgetRenderCache.layout = null;
      } else {
        state.widgetDockSide = '';
      }
      widgetMobileToggleBlockedUntil=Date.now()+500;
      await persist();
    };
    const toggleMobileWidget = async e => {
      if (!widgetMobileViewport) return;
      if (Date.now() < widgetMobileToggleBlockedUntil) return;
      if (!num(e.clientX)||!num(e.clientY)) return;
      const r = await widget.getBoundingClientRect();
      const localX = Number(e.clientX) - r.left;
      const localY = Number(e.clientY) - r.top;
      const toggleWidth = widgetMobileExpanded ? 40 : 34;
      const toggleHeight = widgetMobileExpanded ? 42 : Math.max(32, Number(r.height || 0));
      const inToggle = localX >= Number(r.width || 0) - toggleWidth && localY >= 0 && localY <= toggleHeight;
      if (!inToggle) return;
      widgetMobileExpanded = !widgetMobileExpanded;
      widgetRenderCache.layout = null;
      await renderWidget('mobile-widget-toggle');
    };
    await addWidgetRemoteListener(widget,'pointerdown',down);
    await addWidgetRemoteListener(widget,'click',toggleMobileWidget);
    await addWidgetRemoteListener(root,'pointermove',move);
    await addWidgetRemoteListener(root,'pointerup',up);
    await addWidgetRemoteListener(root,'pointercancel',up);
  }

  async function renderWidget(reason = 'ui') {
    const requestId = ++widgetRenderRequestId;
    const task = widgetRenderTail.catch(() => undefined).then(() => renderWidgetNow(reason, requestId));
    widgetRenderTail = task;
    return task;
  }

  async function renderWidgetNow(reason = 'ui', requestId = widgetRenderRequestId) {
    if (runtimeDisposed) return;
    powerRuntime.widgetRenderCalls += 1;
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
      if (!widget || requestId !== widgetRenderRequestId) return;
      phaseStarted = nowPerf();
      const nextMobileViewport = await widgetMobileMode();
      if (widgetMobileViewport !== nextMobileViewport) {
        widgetMobileViewport = nextMobileViewport;
        widgetMobileExpanded = false;
        widgetRenderCache.layout = null;
        widgetRenderCache.width = null;
        widgetRenderCache.html = null;
      }
      await applyWidgetResponsiveLayout(widgetMobileViewport, widgetMobileExpanded);
      const nextWidth = widgetWidth(widgetMobileViewport, widgetMobileExpanded);
      const nextDisplay = state.widgetVisible===false?'none':'block';
      if (widgetRenderCache.width !== nextWidth) {
        await widget.setStyle('width',nextWidth);
        widgetRenderCache.width = nextWidth;
        performanceRuntime.widgetStyleWrites += 1;
      } else {
        performanceRuntime.widgetStyleSkips += 1;
      }
      if (widgetRenderCache.display !== nextDisplay) {
        await widget.setStyle('display',nextDisplay);
        widgetRenderCache.display = nextDisplay;
        performanceRuntime.widgetStyleWrites += 1;
      } else {
        performanceRuntime.widgetStyleSkips += 1;
      }
      breakdown.style = roundPerfMs(nowPerf() - phaseStarted);
      if (state.widgetVisible!==false) {
        phaseStarted = nowPerf();
        if (requestId !== widgetRenderRequestId) return;
        const nextHtml = widgetHtml();
        if (widgetRenderCache.html !== nextHtml) {
          await widget.setInnerHTML(nextHtml);
          await clampWidgetToViewport();
          widgetRenderCache.html = nextHtml;
          performanceRuntime.widgetHtmlWrites += 1;
        } else {
          performanceRuntime.widgetHtmlSkips += 1;
        }
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
    if (runtimeDisposed) return;
    if (refreshTimer) clearTimeout(refreshTimer); refreshTimer=null;
    scheduleResetSync();
    const baseMs=Math.max(0,Number(state.refreshMs)||0);
    if (!baseMs||!canBridgeRefresh()||(state.backgroundPause!==false&&document.visibilityState==='hidden')) return;
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
        if(state.syncOnFocus&&canBridgeRefresh())requestResumeRefresh('visibility');
      }else if(state.backgroundPause!==false){
        cancelResumeRefresh();
        setRuntimeState('background','hidden');
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
    state=hydrateState(await store.getItem(STATE_KEY));
    await importLegacyTodayBaselines();
    if (state.stalePolicyV37Migrated !== true) {
      if (Number(state.staleAfterMs) === 300000) state.staleAfterMs = 0;
      state.stalePolicyV37Migrated = true;
      await store.setItem(STATE_KEY,state);
    }
    try{state.bridgeBase=normalizeBridgeBase(state.bridgeBase);}catch(_){state.bridgeBase=DEFAULT_BRIDGE;state.bridgeEnabled=false;}
    token=String((await store.getItem(TOKEN_KEY))||'').trim();
    if (state.bridgeStatus === 'connected' && state.lastSyncAt) performanceRuntime.lastHealthySyncAt = Number(state.lastSyncAt);
    updateRuntimeState('init');
    uiParts.push(await Risuai.registerSetting('Local Usage Dashboard',openSettings,'◴','html','local-usage-dashboard-settings-v3'));
    uiParts.push(await Risuai.registerButton({name:'Usage',icon:'📊',iconType:'html',location:'chat',id:'local-usage-dashboard-button-v3'},openSettings));
    await renderWidget(); installLifecycle(); scheduleRefresh(); if(state.bridgeEnabled&&token)enqueueRefresh('init',true);
    await Risuai.onUnload(async()=>{
      runtimeDisposed = true;
      runtimeEpoch += 1;
      if(refreshTimer)clearTimeout(refreshTimer);
      if(resetSyncTimer)clearTimeout(resetSyncTimer);
      cancelPanelRender();
      cancelRefreshScheduler();
      cancelResumeRefresh();
      stopResumeLongTaskObserver();
      stopUiStallProbe();
      for(const [t,ty,id] of remoteListeners.splice(0)){try{await t.removeEventListener(ty,id);}catch(_){}}
      widgetRemoteListeners.length=0;
      for(const [t,ty,fn] of domListeners.splice(0)){try{t.removeEventListener(ty,fn);}catch(_){}}
      if(widget){try{await widget.remove();}catch(_){}}
      widget=null; rootBody=null; drag=null;
      for(const p of uiParts)if(p?.id){try{await Risuai.unregisterUIPart(p.id);}catch(_){}}
    });
  } catch(e) { console.log(`[Local Usage Dashboard] init failed: ${e?.message||e}`); }
})();
