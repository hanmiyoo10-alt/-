from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
TESTS = ROOT / 'tests'


def read(path):
    return path.read_text()


def write(path, text):
    path.write_text(text)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)


# 00 runtime/core: lifecycle generation, central refresh guard, and version bump.
core_path = SRC / '00-runtime-core.part.js'
core = read(core_path)
core = replace_once(core, '//@version 3.0.0-alpha.5.38', '//@version 3.0.0-alpha.5.39', 'metadata version')
core = replace_once(core, "const VERSION = '3.0.0-alpha.5.38';", "const VERSION = '3.0.0-alpha.5.39';", 'runtime version')
core = replace_once(
    core,
    "  let tokenForgetArmedUntil = 0;\n  let runtimeDisposed = false, runtimeEpoch = 1, staleAsyncDrops = 0;",
    "  let tokenForgetArmedUntil = 0;\n  let widgetRenderTail = Promise.resolve(), widgetRenderRequestId = 0;\n  let runtimeDisposed = false, runtimeEpoch = 1, staleAsyncDrops = 0;",
    'widget render queue globals',
)
core = replace_once(
    core,
    "  const localRuntimeErrors = {count:0,persistFailures:0,renderFailures:0,lastStage:'',lastMessage:'',lastAt:null};\n",
    "  const localRuntimeErrors = {count:0,persistFailures:0,renderFailures:0,lastStage:'',lastMessage:'',lastAt:null};\n  const bridgeLifecycleRuntime = {generation:1,refreshDrops:0,blockedRefreshes:0,lastTransitionFrom:'',lastTransitionTo:'',lastTransitionAt:null,lastTransitionReason:''};\n\n  function bridgeLifecycleMode() {\n    if (!state) return 'off';\n    if (!state.bridgeEnabled) return state.bridgeStatus === 'paused' ? 'paused' : 'off';\n    if (state.bridgeStatus === 'error') return 'error';\n    if (state.bridgeStatus === 'connected') return 'live';\n    return 'connecting';\n  }\n\n  function noteBridgeLifecycleTransition(next, reason = '') {\n    const previous = bridgeLifecycleMode();\n    bridgeLifecycleRuntime.generation += 1;\n    bridgeLifecycleRuntime.lastTransitionFrom = previous;\n    bridgeLifecycleRuntime.lastTransitionTo = String(next || '');\n    bridgeLifecycleRuntime.lastTransitionAt = Date.now();\n    bridgeLifecycleRuntime.lastTransitionReason = String(reason || '');\n    return bridgeLifecycleRuntime.generation;\n  }\n\n  function canBridgeRefresh() {\n    if (runtimeDisposed || !state?.bridgeEnabled || !token) return false;\n    const mode = bridgeLifecycleMode();\n    return mode !== 'paused' && mode !== 'off';\n  }\n\n  function lifecycleRefreshIsCurrent(generation) {\n    return canBridgeRefresh() && Number(generation) === Number(bridgeLifecycleRuntime.generation);\n  }\n\n  function dropLifecycleRefresh() {\n    bridgeLifecycleRuntime.refreshDrops += 1;\n    return undefined;\n  }\n",
    'lifecycle runtime helpers',
)
core = replace_once(
    core,
    "  function connectionBadge() {\n    if (state.bridgeStatus === 'paused') return {label:'PAUSED', color:'#b9a6f8'};\n    if (state.bridgeStatus === 'off') return {label:'OFF', color:'#aeb5c0'};\n    if (state.bridgeStatus === 'error') return {label:'OFFLINE', color:'#ff9b95'};\n    if (state.bridgeStatus === 'connected' && dataIsStale()) return {label:'STALE', color:'#ffd27d'};\n    if (state.bridgeStatus === 'connected') return {label:'LIVE', color:'#c5f277'};\n    return {label:'WAIT', color:'#ffd27d'};\n  }",
    "  function connectionBadge() {\n    const lifecycle = bridgeLifecycleMode();\n    if (lifecycle === 'paused') return {label:'PAUSED', color:'#b9a6f8'};\n    if (lifecycle === 'off') return {label:'OFF', color:'#aeb5c0'};\n    if (lifecycle === 'error') return {label:'OFFLINE', color:'#ff9b95'};\n    if (lifecycle === 'live' && dataIsStale()) return {label:'STALE', color:'#ffd27d'};\n    if (lifecycle === 'live') return {label:'LIVE', color:'#c5f277'};\n    return {label:'WAIT', color:'#ffd27d'};\n  }",
    'badge lifecycle authority',
)
core = replace_once(
    core,
    "  function enqueueRefresh(reason = 'scheduled', silent = false) {\n    if (runtimeDisposed) return;\n    noteRefreshRequested(reason);",
    "  function enqueueRefresh(reason = 'scheduled', silent = false) {\n    if (runtimeDisposed) return;\n    if (!canBridgeRefresh()) { bridgeLifecycleRuntime.blockedRefreshes += 1; return; }\n    noteRefreshRequested(reason);",
    'central enqueue refresh guard',
)
core = replace_once(
    core,
    "    if (!state?.syncOnFocus || !state?.bridgeEnabled || !token) return;",
    "    if (!state?.syncOnFocus || !canBridgeRefresh()) return;",
    'resume refresh central guard',
)
write(core_path, core)


# 30 refresh runtime: capture lifecycle generation and drop all stale async completions.
refresh_path = SRC / '30-refresh-runtime.part.js'
refresh = read(refresh_path)
refresh = replace_once(
    refresh,
    "    const refreshEpoch = runtimeEpoch;\n    if (!state.bridgeEnabled) return;\n    if (refreshInFlight) return refreshInFlight;",
    "    const refreshEpoch = runtimeEpoch;\n    if (!canBridgeRefresh()) { bridgeLifecycleRuntime.blockedRefreshes += 1; return; }\n    const refreshLifecycleGeneration = bridgeLifecycleRuntime.generation;\n    if (refreshInFlight) return refreshInFlight;",
    'refresh lifecycle capture',
)
old_guard = "        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();"
new_guard = old_guard + "\n        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();"
count = refresh.count(old_guard)
if count < 6:
    raise SystemExit(f'refresh lifecycle guard: expected >=6 runtime guards, got {count}')
refresh = refresh.replace(old_guard, new_guard)
refresh = refresh.replace("        if (!state.bridgeEnabled) return;", "        if (!lifecycleRefreshIsCurrent(refreshLifecycleGeneration)) return dropLifecycleRefresh();")
write(refresh_path, refresh)


# 40 diagnostics: make lifecycle generation/drop behavior visible on-device.
diag_path = SRC / '40-diagnostics.part.js'
diag = read(diag_path)
diag = replace_once(
    diag,
    "      `Bridge lifecycle: ${state.bridgeEnabled ? 'enabled' : state.bridgeStatus === 'paused' ? 'paused' : 'off'} · token ${token ? 'yes' : 'no'} · paused ${state.bridgePausedAt ? age(state.bridgePausedAt) : 'none'} · last reconnect ${state.bridgeLastReconnectAt ? age(state.bridgeLastReconnectAt) : '—'} · token cleared ${state.bridgeTokenClearedAt ? age(state.bridgeTokenClearedAt) : 'never'}`,",
    "      `Bridge lifecycle: ${bridgeLifecycleMode()} · generation ${Number(bridgeLifecycleRuntime.generation || 0)} · token ${token ? 'yes' : 'no'} · paused ${state.bridgePausedAt ? age(state.bridgePausedAt) : 'none'} · last reconnect ${state.bridgeLastReconnectAt ? age(state.bridgeLastReconnectAt) : '—'} · token cleared ${state.bridgeTokenClearedAt ? age(state.bridgeTokenClearedAt) : 'never'}`,\n      `Lifecycle refresh: drops ${Number(bridgeLifecycleRuntime.refreshDrops || 0)} · blocked ${Number(bridgeLifecycleRuntime.blockedRefreshes || 0)} · last transition ${bridgeLifecycleRuntime.lastTransitionFrom || '—'} → ${bridgeLifecycleRuntime.lastTransitionTo || '—'} · reason ${bridgeLifecycleRuntime.lastTransitionReason || '—'} · ${bridgeLifecycleRuntime.lastTransitionAt ? age(bridgeLifecycleRuntime.lastTransitionAt) : '—'}`,",
    'lifecycle race diagnostics',
)
write(diag_path, diag)


# 60 settings runtime: every explicit lifecycle action invalidates older async work.
settings_path = SRC / '60-settings-runtime.part.js'
settings = read(settings_path)
settings = replace_once(
    settings,
    "        state.bridgeEnabled = true; state.bridgeStatus = 'connecting'; state.bridgePausedAt = null; state.bridgeLastReconnectAt = Date.now(); await persist(); scheduleRefresh(); await enqueueRefresh('connect');",
    "        noteBridgeLifecycleTransition('connecting','connect');\n        state.bridgeEnabled = true; state.bridgeStatus = 'connecting'; state.bridgePausedAt = null; state.bridgeLastReconnectAt = Date.now(); await persist(); scheduleRefresh(); await enqueueRefresh('connect');",
    'connect transition generation',
)
settings = replace_once(
    settings,
    "      state.bridgeEnabled = false;\n      state.bridgeStatus = 'paused';",
    "      noteBridgeLifecycleTransition('paused','pause-sync');\n      state.bridgeEnabled = false;\n      state.bridgeStatus = 'paused';",
    'pause transition generation',
)
settings = replace_once(
    settings,
    "      tokenForgetArmedUntil = 0;\n      token = '';",
    "      tokenForgetArmedUntil = 0;\n      noteBridgeLifecycleTransition('off','forget-token');\n      token = '';",
    'forget transition generation',
)
write(settings_path, settings)


# 70 floating widget: serialize render calls so stale LIVE HTML cannot overwrite a newer PAUSED render.
widget_path = SRC / '70-floating-widget.part.js'
widget = read(widget_path)
widget = replace_once(
    widget,
    "  async function renderWidget(reason = 'ui') {\n    if (runtimeDisposed) return;",
    "  async function renderWidget(reason = 'ui') {\n    const requestId = ++widgetRenderRequestId;\n    const task = widgetRenderTail.catch(() => undefined).then(() => renderWidgetNow(reason, requestId));\n    widgetRenderTail = task;\n    return task;\n  }\n\n  async function renderWidgetNow(reason = 'ui', requestId = widgetRenderRequestId) {\n    if (runtimeDisposed) return;",
    'serialized widget render wrapper',
)
widget = replace_once(
    widget,
    "      await ensureWidget();\n      breakdown.ensure = roundPerfMs(nowPerf() - phaseStarted);\n      if (!widget) return;",
    "      await ensureWidget();\n      breakdown.ensure = roundPerfMs(nowPerf() - phaseStarted);\n      if (!widget || requestId !== widgetRenderRequestId) return;",
    'widget render request invalidation after ensure',
)
widget = replace_once(
    widget,
    "        const nextHtml = widgetHtml();\n        if (widgetRenderCache.html !== nextHtml) {",
    "        if (requestId !== widgetRenderRequestId) return;\n        const nextHtml = widgetHtml();\n        if (widgetRenderCache.html !== nextHtml) {",
    'widget render request invalidation before html write',
)
write(widget_path, widget)


# 80 lifecycle: timer and visibility routes share the same central gate.
lifecycle_path = SRC / '80-lifecycle.part.js'
lifecycle = read(lifecycle_path)
lifecycle = replace_once(
    lifecycle,
    "    if (!baseMs||!state.bridgeEnabled||(state.backgroundPause!==false&&document.visibilityState==='hidden')) return;",
    "    if (!baseMs||!canBridgeRefresh()||(state.backgroundPause!==false&&document.visibilityState==='hidden')) return;",
    'schedule central refresh guard',
)
lifecycle = replace_once(
    lifecycle,
    "        if(state.syncOnFocus&&state.bridgeEnabled)requestResumeRefresh('visibility');",
    "        if(state.syncOnFocus&&canBridgeRefresh())requestResumeRefresh('visibility');",
    'visibility central refresh guard',
)
write(lifecycle_path, lifecycle)


# P3 markers and a dedicated static race regression test.
p3_path = TESTS / 'p3-ui.cjs'
p3 = read(p3_path)
p3 = replace_once(
    p3,
    "  'Bridge lifecycle:',\n]) {",
    "  'Bridge lifecycle:',\n  'bridgeLifecycleRuntime',\n  'canBridgeRefresh()',\n  'lifecycleRefreshIsCurrent',\n  'dropLifecycleRefresh',\n  'widgetRenderTail',\n  'renderWidgetNow',\n  'Lifecycle refresh:',\n]) {",
    'P3 lifecycle race markers',
)
write(p3_path, p3)

race_test = r'''const fs = require('node:fs');
const assert = require('node:assert/strict');

const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const core = fs.readFileSync(`${root}/src/00-runtime-core.part.js`, 'utf8');
const refresh = fs.readFileSync(`${root}/src/30-refresh-runtime.part.js`, 'utf8');
const settings = fs.readFileSync(`${root}/src/60-settings-runtime.part.js`, 'utf8');
const widget = fs.readFileSync(`${root}/src/70-floating-widget.part.js`, 'utf8');
const lifecycle = fs.readFileSync(`${root}/src/80-lifecycle.part.js`, 'utf8');

assert.ok(source.includes('//@version 3.0.0-alpha.5.39'));
for (const marker of [
  'const bridgeLifecycleRuntime = {generation:1',
  'function canBridgeRefresh()',
  'function lifecycleRefreshIsCurrent(generation)',
  'function dropLifecycleRefresh()',
  "if (!canBridgeRefresh()) { bridgeLifecycleRuntime.blockedRefreshes += 1; return; }",
]) assert.ok(core.includes(marker), `missing lifecycle core marker: ${marker}`);

assert.ok(refresh.includes('const refreshLifecycleGeneration = bridgeLifecycleRuntime.generation;'));
assert.ok((refresh.match(/lifecycleRefreshIsCurrent\(refreshLifecycleGeneration\)/g) || []).length >= 8,
  'refresh path must re-check lifecycle generation after async boundaries');
assert.ok(!refresh.includes('if (!state.bridgeEnabled) return;'), 'legacy boolean-only refresh guard remains');

for (const marker of [
  "noteBridgeLifecycleTransition('connecting','connect');",
  "noteBridgeLifecycleTransition('paused','pause-sync');",
  "noteBridgeLifecycleTransition('off','forget-token');",
]) assert.ok(settings.includes(marker), `missing lifecycle transition: ${marker}`);

assert.ok(lifecycle.includes("if (!baseMs||!canBridgeRefresh()||"), 'timer route must use central refresh guard');
assert.ok(lifecycle.includes("if(state.syncOnFocus&&canBridgeRefresh())requestResumeRefresh('visibility');"),
  'visibility route must use central refresh guard');

for (const marker of [
  'let widgetRenderTail = Promise.resolve(), widgetRenderRequestId = 0;',
  'const requestId = ++widgetRenderRequestId;',
  'renderWidgetTail',
]) {
  if (marker === 'renderWidgetTail') continue;
  assert.ok(source.includes(marker), `missing widget serialization marker: ${marker}`);
}
assert.ok(widget.includes('widgetRenderTail.catch(() => undefined).then(() => renderWidgetNow(reason, requestId))'));
assert.ok(widget.includes('requestId !== widgetRenderRequestId'), 'widget stale render invalidation missing');
assert.ok(source.includes('Lifecycle refresh: drops'));
console.log('usage-dashboard P5 lifecycle race regression: OK · 3.0.0-alpha.5.39');
'''
write(TESTS / 'p5-lifecycle-race.cjs', race_test)


# Runtime product metadata: plugin hotfix only; engine and manager versions stay frozen.
manager_path = RUNTIME / 'bridge-manager.cjs'
manager = read(manager_path)
manager = replace_once(manager, "const PRODUCT_VERSION = '3.0.0-alpha.5.38';", "const PRODUCT_VERSION = '3.0.0-alpha.5.39';", 'manager product version')
write(manager_path, manager)

manifest_path = RUNTIME / 'product-manifest.json'
manifest = json.loads(read(manifest_path))
manifest['productVersion'] = '3.0.0-alpha.5.39'
manifest['components']['plugin']['version'] = '3.0.0-alpha.5.39'
manifest['components']['bridge']['requiredVersion'] = '1.6.4'
manifest['components']['bridge']['sha256'] = hashlib.sha256((RUNTIME / 'bridge-engine.mjs').read_bytes()).hexdigest()
manifest['components']['bridgeManager']['version'] = '1.2.6'
manifest['components']['bridgeManager']['productVersion'] = '3.0.0-alpha.5.39'
manifest['components']['bridgeManager']['sha256'] = hashlib.sha256(manager_path.read_bytes()).hexdigest()
manifest['components']['bridgeManager']['bootstrapSha256'] = hashlib.sha256((RUNTIME / 'bootstrap-bridge-manager.sh').read_bytes()).hexdigest()
write(manifest_path, json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

print('Usage Dashboard 5.39 pause lifecycle race hotfix applied')
