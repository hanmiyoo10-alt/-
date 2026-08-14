from pathlib import Path

p = Path('plugins/usage-dashboard/latest.js')
s = p.read_text()

if '//@version 3.0.0-alpha.3.32' not in s or "const VERSION = '3.0.0-alpha.3.32';" not in s:
    raise SystemExit('latest.js is not exact alpha.3.32')

widget_start = s.index('  function widgetHtml() {')
widget_end = s.index('  const widgetWidth = () =>', widget_start)
widget_before = s[widget_start:widget_end]

def one(label, old, new):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: patch anchor count={count}')
    s = s.replace(old, new, 1)

one('meta version', '//@version 3.0.0-alpha.3.32', '//@version 3.0.0-alpha.3.33')
one('runtime version', "const VERSION = '3.0.0-alpha.3.32';", "const VERSION = '3.0.0-alpha.3.33';")

one(
    'runtimeStatus default',
    '    dailyUsage: null, creditDailyUsage: null,\n    data: null\n',
    '    dailyUsage: null, creditDailyUsage: null,\n    runtimeStatus: null,\n    data: null\n'
)

one(
    'runtime performance fields',
    'schedulerQueued:0,schedulerMerged:0,schedulerExecuted:0,schedulerDeferredForInteraction:0,panelRenderCoalesced:0,lastRenderMs:null',
    "schedulerQueued:0,schedulerMerged:0,schedulerExecuted:0,schedulerDeferredForInteraction:0,panelRenderCoalesced:0,runtimeState:'active',runtimeStateChangedAt:Date.now(),runtimeTransitions:0,lastHealthySyncAt:null,degradedSince:null,lastRenderMs:null"
)

runtime_helpers = '''  // DevPass 2.7.3 Runtime State, adapted to the single Local Usage Bridge.
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

'''
one(
    'runtime helper insertion',
    '  // DevPass 2.7.3 stability scheduler, adapted to the single local snapshot profile.\n',
    runtime_helpers + '  // DevPass 2.7.3 stability scheduler, adapted to the single local snapshot profile.\n'
)

one(
    'interaction runtime state',
    '  function markPerformanceInteraction(event) {\n    performanceRuntime.lastInteractionAt = Date.now();\n    if (!performanceRuntime.resumeMeasurePending || performanceRuntime.resumeInputCaptured) return;',
    "  function markPerformanceInteraction(event) {\n    performanceRuntime.lastInteractionAt = Date.now();\n    if (document.visibilityState !== 'hidden') setRuntimeState('active', 'interaction');\n    if (!performanceRuntime.resumeMeasurePending || performanceRuntime.resumeInputCaptured) return;"
)

one(
    'resume grace state',
    "    performanceRuntime.resumePending = false;\n    performanceRuntime.lastResumeDelayMs = elapsed;\n    enqueueRefresh('visibility', true);",
    "    performanceRuntime.resumePending = false;\n    updateRuntimeState('resume-grace-complete');\n    performanceRuntime.lastResumeDelayMs = elapsed;\n    enqueueRefresh('visibility', true);"
)

one(
    'resume entering state',
    '    performanceRuntime.resumePending = true;\n    performanceRuntime.resumeStartedAt = Date.now();',
    "    performanceRuntime.resumePending = true;\n    setRuntimeState('resuming', reason);\n    performanceRuntime.resumeStartedAt = Date.now();"
)

one(
    'healthy sync timestamp',
    '        state.lastSyncAt = Date.now();\n        state.lastSyncDurationMs = state.lastSyncAt - started;',
    '        state.lastSyncAt = Date.now();\n        performanceRuntime.lastHealthySyncAt = state.lastSyncAt;\n        state.lastSyncDurationMs = state.lastSyncAt - started;'
)

one(
    'refresh success runtime state',
    '        state.consecutiveFailures = 0;\n        state.retryDelayMs = 0;\n        state.nextRetryAt = null;\n        await persist();',
    "        state.consecutiveFailures = 0;\n        state.retryDelayMs = 0;\n        state.nextRetryAt = null;\n        updateRuntimeState('refresh-success');\n        await persist();"
)

one(
    'refresh error runtime state',
    '        state.retryDelayMs = retryDelayFor(state.consecutiveFailures);\n        state.nextRetryAt = Number(state.refreshMs) > 0 ? Date.now() + state.retryDelayMs : null;\n        await persist();',
    "        state.retryDelayMs = retryDelayFor(state.consecutiveFailures);\n        state.nextRetryAt = Number(state.refreshMs) > 0 ? Date.now() + state.retryDelayMs : null;\n        updateRuntimeState('refresh-error');\n        await persist();"
)

one(
    'refresh completion runtime state',
    '      performanceRuntime.activeRefreshStartedPerf = 0;\n      refreshInFlight = null;\n    }',
    "      performanceRuntime.activeRefreshStartedPerf = 0;\n      refreshInFlight = null;\n      updateRuntimeState('refresh-complete');\n    }"
)

one(
    'runtime diagnostics line',
    '''      `Health: ${h.status || '—'}`,
      `Last sync: ${state.lastSyncAt ? new Date(Number(state.lastSyncAt)).toISOString() : '—'}`,''',
    '''      `Health: ${h.status || '—'}`,
      `Runtime state: ${performanceRuntime.runtimeState} · transitions ${Number(performanceRuntime.runtimeTransitions || 0)} · reason ${state.runtimeStatus?.reason || '—'} · healthy ${performanceRuntime.lastHealthySyncAt ? age(performanceRuntime.lastHealthySyncAt) : '—'} · degraded ${performanceRuntime.degradedSince ? age(performanceRuntime.degradedSince) : 'none'}`,
      `Last sync: ${state.lastSyncAt ? new Date(Number(state.lastSyncAt)).toISOString() : '—'}`,'''
)

one(
    'runtime panel line',
    '''<p>Updater · GitHub HTTPS · ${VERSION}</p><p>Performance Guard ·''',
    '''<p>Updater · GitHub HTTPS · ${VERSION}</p><p>Runtime State · ${esc(performanceRuntime.runtimeState)} · transitions ${Number(performanceRuntime.runtimeTransitions||0)} · reason ${esc(state.runtimeStatus?.reason||'—')} · healthy ${performanceRuntime.lastHealthySyncAt?age(performanceRuntime.lastHealthySyncAt):'—'} · degraded ${performanceRuntime.degradedSince?age(performanceRuntime.degradedSince):'none'}</p><p>Performance Guard ·'''
)

one(
    'lifecycle background state',
    "      }else if(state.backgroundPause!==false){\n        cancelResumeRefresh();\n        stopUiStallProbe();\n        if(refreshTimer){clearTimeout(refreshTimer);refreshTimer=null;}\n      }",
    "      }else if(state.backgroundPause!==false){\n        cancelResumeRefresh();\n        setRuntimeState('background','hidden');\n        stopUiStallProbe();\n        if(refreshTimer){clearTimeout(refreshTimer);refreshTimer=null;}\n      }"
)

one(
    'bootstrap runtime state',
    "    token=String((await store.getItem(TOKEN_KEY))||'').trim();\n    uiParts.push(await Risuai.registerSetting('Local Usage Dashboard',openSettings,'◴','html','local-usage-dashboard-settings-v3'));",
    "    token=String((await store.getItem(TOKEN_KEY))||'').trim();\n    if (state.bridgeStatus === 'connected' && state.lastSyncAt) performanceRuntime.lastHealthySyncAt = Number(state.lastSyncAt);\n    updateRuntimeState('init');\n    uiParts.push(await Risuai.registerSetting('Local Usage Dashboard',openSettings,'◴','html','local-usage-dashboard-settings-v3'));"
)

widget_start_after = s.index('  function widgetHtml() {')
widget_end_after = s.index('  const widgetWidth = () =>', widget_start_after)
if s[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('3.33 must not change floating widget HTML')

for marker in [
    '//@version 3.0.0-alpha.3.33',
    "const VERSION = '3.0.0-alpha.3.33';",
    'runtimeStatus: null',
    "runtimeState:'active'",
    'runtimeTransitions:0',
    'lastHealthySyncAt:null',
    'degradedSince:null',
    'function runtimeHasDegradation',
    'function setRuntimeState',
    'function updateRuntimeState',
    'Runtime state:',
    'Runtime State ·',
    "setRuntimeState('resuming', reason)",
    "setRuntimeState('background','hidden')",
    "updateRuntimeState('refresh-error')",
    "updateRuntimeState('refresh-complete')",
    "Risuai.registerButton({name:'Usage',icon:'📊',iconType:'html',location:'chat'",
    'Resume input:',
    'Panel render scheduler:',
    'Render spike:',
    'Scheduler: pending',
    'Resume grace:',
    'UI stall probe:',
    'Analytics · 24h / 7d / 30d',
    '24h Usage Scope',
]:
    if marker not in s:
        raise SystemExit('missing marker: ' + marker)

p.write_text(s)
