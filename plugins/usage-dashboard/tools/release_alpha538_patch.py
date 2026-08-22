from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'


def read(path):
    return path.read_text()


def write(path, text):
    path.write_text(text)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)


# 00 runtime/core: version, lifecycle state, and badge semantics.
core_path = SRC / '00-runtime-core.part.js'
core = read(core_path)
core = replace_once(core, '//@version 3.0.0-alpha.5.37', '//@version 3.0.0-alpha.5.38', 'metadata version')
core = replace_once(core, "const VERSION = '3.0.0-alpha.5.37';", "const VERSION = '3.0.0-alpha.5.38';", 'runtime version')
core = replace_once(
    core,
    "    creditsOrgLastFallbackTo: '',\n    lastSyncAt: null, lastSyncDurationMs: null, lastRefreshReason: '', refreshCount: 0,",
    "    creditsOrgLastFallbackTo: '',\n    bridgePausedAt: null, bridgeLastReconnectAt: null, bridgeTokenClearedAt: null,\n    lastSyncAt: null, lastSyncDurationMs: null, lastRefreshReason: '', refreshCount: 0,",
    'bridge lifecycle defaults',
)
core = replace_once(
    core,
    "  let store, state, token = '', refreshTimer = null, resetSyncTimer = null, refreshInFlight = null;",
    "  let store, state, token = '', refreshTimer = null, resetSyncTimer = null, refreshInFlight = null;\n  let tokenForgetArmedUntil = 0;",
    'token forget guard',
)
core = replace_once(
    core,
    "  function connectionBadge() {\n    if (state.bridgeStatus === 'error') return {label:'OFFLINE', color:'#ff9b95'};\n    if (state.bridgeStatus === 'connected' && dataIsStale()) return {label:'STALE', color:'#ffd27d'};\n    if (state.bridgeStatus === 'connected') return {label:'LIVE', color:'#c5f277'};\n    return {label:'WAIT', color:'#ffd27d'};\n  }",
    "  function connectionBadge() {\n    if (state.bridgeStatus === 'paused') return {label:'PAUSED', color:'#b9a6f8'};\n    if (state.bridgeStatus === 'off') return {label:'OFF', color:'#aeb5c0'};\n    if (state.bridgeStatus === 'error') return {label:'OFFLINE', color:'#ff9b95'};\n    if (state.bridgeStatus === 'connected' && dataIsStale()) return {label:'STALE', color:'#ffd27d'};\n    if (state.bridgeStatus === 'connected') return {label:'LIVE', color:'#c5f277'};\n    return {label:'WAIT', color:'#ffd27d'};\n  }",
    'connection badge lifecycle',
)
write(core_path, core)


# 30 refresh runtime: pausing while a snapshot is in flight must not resurrect LIVE state.
refresh_path = SRC / '30-refresh-runtime.part.js'
refresh = read(refresh_path)
refresh = replace_once(
    refresh,
    "        state.bridgeManagerRuntime = managerRuntime;\n        const snapshot = await fetchSnapshot();\n        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();\n        state.data = applyObservedToday(snapshot);",
    "        state.bridgeManagerRuntime = managerRuntime;\n        if (!state.bridgeEnabled) return;\n        const snapshot = await fetchSnapshot();\n        if (!runtimeIsCurrent(refreshEpoch)) return dropStaleAsync();\n        if (!state.bridgeEnabled) return;\n        state.data = applyObservedToday(snapshot);",
    'pause in-flight refresh guard',
)
write(refresh_path, refresh)


# 40 diagnostics: expose lifecycle state without exposing the token value.
diag_path = SRC / '40-diagnostics.part.js'
diag = read(diag_path)
diag = replace_once(
    diag,
    "      `Bridge: ${state.bridgeStatus} · ${state.bridgeBase}`,\n      `Protocol: ${num(d.protocolVersion) ? d.protocolVersion : '—'}`,",
    "      `Bridge: ${state.bridgeStatus} · ${state.bridgeBase}`,\n      `Bridge lifecycle: ${state.bridgeEnabled ? 'enabled' : state.bridgeStatus === 'paused' ? 'paused' : 'off'} · token ${token ? 'yes' : 'no'} · paused ${state.bridgePausedAt ? age(state.bridgePausedAt) : 'none'} · last reconnect ${state.bridgeLastReconnectAt ? age(state.bridgeLastReconnectAt) : '—'} · token cleared ${state.bridgeTokenClearedAt ? age(state.bridgeTokenClearedAt) : 'never'}`,\n      `Protocol: ${num(d.protocolVersion) ? d.protocolVersion : '—'}` ,",
    'bridge lifecycle diagnostics',
)
write(diag_path, diag)


# 50 settings UI: separate pause from credential forgetting, with safe labels.
ui_path = SRC / '50-settings-ui.part.js'
ui = read(ui_path)
old_actions = "        <div class=\"actions\"><button class=\"primary\" id=\"connect\">저장하고 연결</button><button id=\"refresh\">지금 새로고침</button><button id=\"retry-now\">백오프 초기화 + 재시도</button><button id=\"toggle\">${state.widgetVisible===false?'위젯 보이기':'위젯 숨기기'}</button><button id=\"reset-position\">위치 초기화</button><button id=\"recreate-widget\">위젯 다시 만들기</button></div>\n        <p>상태 ${esc(state.bridgeStatus)} · ${age(state.lastSyncAt)}${num(state.lastSyncDurationMs)?` · ${state.lastSyncDurationMs}ms`:''}</p>${state.bridgeError?`<p class=\"warn\">${esc(state.bridgeError)}</p>`:''}"
new_actions = "        <div class=\"actions\"><button class=\"primary\" id=\"connect\">${state.bridgeEnabled?'저장하고 다시 연결':token?'동기화 다시 켜기':'저장하고 연결'}</button><button id=\"pause-sync\" ${state.bridgeEnabled?'':'disabled'}>${state.bridgeEnabled?'동기화 끄기':'동기화 꺼짐'}</button><button id=\"forget-token\" ${token?'':'disabled'}>${token?'저장된 토큰 지우기':'저장된 토큰 없음'}</button><button id=\"refresh\">지금 새로고침</button><button id=\"retry-now\">백오프 초기화 + 재시도</button><button id=\"toggle\">${state.widgetVisible===false?'위젯 보이기':'위젯 숨기기'}</button><button id=\"reset-position\">위치 초기화</button><button id=\"recreate-widget\">위젯 다시 만들기</button></div>\n        <p>상태 ${esc(state.bridgeStatus)} · 토큰 ${token?'저장됨':'없음'} · ${age(state.lastSyncAt)}${num(state.lastSyncDurationMs)?` · ${state.lastSyncDurationMs}ms`:''}</p>${state.bridgeError?`<p class=\"warn\">${esc(state.bridgeError)}</p>`:''}"
ui = replace_once(ui, old_actions, new_actions, 'bridge lifecycle controls')
write(ui_path, ui)


# 60 settings runtime: pause/resume and two-tap token forgetting.
settings_path = SRC / '60-settings-runtime.part.js'
settings = read(settings_path)
settings = replace_once(
    settings,
    "        state.bridgeEnabled = true; state.bridgeStatus = 'connecting'; await persist(); scheduleRefresh(); await enqueueRefresh('connect');",
    "        state.bridgeEnabled = true; state.bridgeStatus = 'connecting'; state.bridgePausedAt = null; state.bridgeLastReconnectAt = Date.now(); await persist(); scheduleRefresh(); await enqueueRefresh('connect');",
    'connect lifecycle state',
)
insert_before = "    document.querySelectorAll('[data-usage-scope]').forEach(button => {"
lifecycle_handlers = r'''    if (q('#pause-sync')) q('#pause-sync').onclick = async () => {
      if (!state.bridgeEnabled) return;
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
      await renderWidget('bridge-paused');
      renderSettings();
    };
    if (q('#forget-token')) q('#forget-token').onclick = async e => {
      if (!token) return;
      const button = e.currentTarget;
      const now = Date.now();
      if (now > Number(tokenForgetArmedUntil || 0)) {
        tokenForgetArmedUntil = now + 5000;
        const old = button.textContent;
        button.textContent = '정말 지우기?';
        setTimeout(() => {
          if (button?.isConnected && tokenForgetArmedUntil > 0 && Date.now() >= tokenForgetArmedUntil) {
            tokenForgetArmedUntil = 0;
            button.textContent = old;
          }
        }, 5100);
        return;
      }
      tokenForgetArmedUntil = 0;
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
      await renderWidget('bridge-token-forgotten');
      renderSettings();
    };
'''
settings = replace_once(settings, insert_before, lifecycle_handlers + insert_before, 'lifecycle handlers')
write(settings_path, settings)


# 70 widget: paused data stays visible but must never claim LIVE.
widget_path = SRC / '70-floating-widget.part.js'
widget = read(widget_path)
widget = replace_once(
    widget,
    "${state.lastSyncAt?` · LIVE ${age(state.lastSyncAt)} 동기화`:''}",
    "${state.lastSyncAt?(state.bridgeStatus==='paused'?` · PAUSED · 마지막 ${age(state.lastSyncAt)} 동기화`:` · LIVE ${age(state.lastSyncAt)} 동기화`):''}",
    'detailed widget paused label',
)
widget = replace_once(
    widget,
    "        <span>${state.bridgeStatus==='error'?'마지막 정상값 유지':dataIsStale()?`스냅샷 ${age(d.fetchedAt)}`:'자동 갱신'}</span>",
    "        <span>${state.bridgeStatus==='paused'?'동기화 일시정지':state.bridgeStatus==='off'?'동기화 꺼짐':state.bridgeStatus==='error'?'마지막 정상값 유지':dataIsStale()?`스냅샷 ${age(d.fetchedAt)}`:'자동 갱신'}</span>",
    'widget lifecycle footer',
)
write(widget_path, widget)


# P3 UI regression locks for lifecycle controls.
test_path = ROOT / 'tests' / 'p3-ui.cjs'
test = read(test_path)
test = replace_once(
    test,
    "  'creditsOrganizationFallback',\n]) {",
    "  'creditsOrganizationFallback',\n  'id=\\\"pause-sync\\\"',\n  'id=\\\"forget-token\\\"',\n  \"state.bridgeStatus = 'paused';\",\n  \"state.bridgeTokenClearedAt = Date.now();\",\n  \"return {label:'PAUSED', color:'#b9a6f8'};\",\n  'Bridge lifecycle:',\n]) {",
    'P3 lifecycle regression markers',
)
write(test_path, test)


# Runtime product metadata: engine stays 1.6.4, manager code stays 1.2.6 but tracks product 5.38.
manager_path = RUNTIME / 'bridge-manager.cjs'
manager = read(manager_path)
manager = replace_once(manager, "const PRODUCT_VERSION = '3.0.0-alpha.5.37';", "const PRODUCT_VERSION = '3.0.0-alpha.5.38';", 'manager product version')
write(manager_path, manager)

manifest_path = RUNTIME / 'product-manifest.json'
manifest = json.loads(read(manifest_path))
manifest['productVersion'] = '3.0.0-alpha.5.38'
manifest['components']['plugin']['version'] = '3.0.0-alpha.5.38'
manifest['components']['bridge']['requiredVersion'] = '1.6.4'
manifest['components']['bridge']['sha256'] = hashlib.sha256((RUNTIME / 'bridge-engine.mjs').read_bytes()).hexdigest()
manifest['components']['bridgeManager']['version'] = '1.2.6'
manifest['components']['bridgeManager']['productVersion'] = '3.0.0-alpha.5.38'
manifest['components']['bridgeManager']['sha256'] = hashlib.sha256(manager_path.read_bytes()).hexdigest()
manifest['components']['bridgeManager']['bootstrapSha256'] = hashlib.sha256((RUNTIME / 'bootstrap-bridge-manager.sh').read_bytes()).hexdigest()
write(manifest_path, json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

print('Usage Dashboard 5.38 connection lifecycle patch applied')
