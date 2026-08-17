from pathlib import Path
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


# 00 runtime/core: product version bump only. 5.39 lifecycle race protection stays intact.
core_path = SRC / '00-runtime-core.part.js'
core = read(core_path)
core = replace_once(core, '//@version 3.0.0-alpha.5.39', '//@version 3.0.0-alpha.5.40', 'metadata version')
core = replace_once(core, "const VERSION = '3.0.0-alpha.5.39';", "const VERSION = '3.0.0-alpha.5.40';", 'runtime version')
write(core_path, core)


# 50 settings UI: split immutable config inputs from lifecycle-driven controls.
# Keep this part's required boundary marker (`function settingsHtml`) untouched.
ui_path = SRC / '50-settings-ui.part.js'
ui = read(ui_path)
ui = replace_once(
    ui,
    '      <details class="panel wide advanced-panel"><summary><b>Local Bridge</b><span>연결 · 설정</span></summary><div class="advanced-body">\n        <label><span>Bridge URL</span>',
    '      <details class="panel wide advanced-panel"><summary><b>Local Bridge</b><span>연결 · 설정</span></summary><div class="advanced-body">\n        <div class="bridge-config-static"><label><span>Bridge URL</span>',
    'static bridge config wrapper start',
)
old_controls = '''        <div class="actions"><button class="primary" id="connect">${state.bridgeEnabled?'저장하고 다시 연결':token?'동기화 다시 켜기':'저장하고 연결'}</button><button id="pause-sync" ${state.bridgeEnabled?'':'disabled'}>${state.bridgeEnabled?'동기화 끄기':'동기화 꺼짐'}</button><button id="forget-token" ${token?'':'disabled'}>${token?'저장된 토큰 지우기':'저장된 토큰 없음'}</button><button id="refresh">지금 새로고침</button><button id="retry-now">백오프 초기화 + 재시도</button><button id="toggle">${state.widgetVisible===false?'위젯 보이기':'위젯 숨기기'}</button><button id="reset-position">위치 초기화</button><button id="recreate-widget">위젯 다시 만들기</button></div>
        <p>상태 ${esc(state.bridgeStatus)} · 토큰 ${token?'저장됨':'없음'} · ${age(state.lastSyncAt)}${num(state.lastSyncDurationMs)?` · ${state.lastSyncDurationMs}ms`:''}</p>${state.bridgeError?`<p class="warn">${esc(state.bridgeError)}</p>`:''}
'''
ui = replace_once(ui, old_controls, '        </div>\n        ${bridgeControlsHtml()}\n', 'dynamic bridge controls')
write(ui_path, ui)


# 60 settings runtime: own the dynamic bridge-control renderer. Function declarations
# remain top-level and are hoisted, so settingsHtml() can call bridgeControlsHtml().
runtime_path = SRC / '60-settings-runtime.part.js'
runtime = read(runtime_path)
bridge_helpers = r'''  function bridgeControlsHtml() {
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

'''
# Preserve the required 60-settings-runtime boundary by inserting after renderSettings().
render_settings_block = '''  function renderSettings() {
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

'''
runtime = replace_once(runtime, render_settings_block, render_settings_block + bridge_helpers, 'bridge control helpers after renderSettings')
old_partial = '''    // Runtime Diagnostics is safe to refresh live. Local Bridge settings are
    // deliberately left untouched so typed-but-unsaved values are preserved.
    const currentAdvanced = Array.from(document.querySelectorAll('details.advanced-panel'));
    const nextAdvanced = Array.from(nextDoc.querySelectorAll('details.advanced-panel'));
    const diagnosticsCurrent = currentAdvanced[1]?.querySelector('.advanced-body');
    const diagnosticsNext = nextAdvanced[1]?.querySelector('.advanced-body');
    if (currentAdvanced[1]?.open && diagnosticsCurrent && diagnosticsNext) {
      staged.push([diagnosticsCurrent, diagnosticsNext]);
    }
'''
new_partial = '''    // Keep Local Bridge config inputs untouched so typed-but-unsaved values survive,
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
'''
runtime = replace_once(runtime, old_partial, new_partial, 'partial bridge control patch')
old_connect = '''        noteBridgeLifecycleTransition('connecting','connect');
        state.bridgeEnabled = true; state.bridgeStatus = 'connecting'; state.bridgePausedAt = null; state.bridgeLastReconnectAt = Date.now(); await persist(); scheduleRefresh(); await enqueueRefresh('connect');
      } catch (e) { state.bridgeStatus='error'; state.bridgeError=e?.message||String(e); await persist(); await renderWidget(); renderSettings(); }
'''
new_connect = '''        noteBridgeLifecycleTransition('connecting','connect');
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
'''
runtime = replace_once(runtime, old_connect, new_connect, 'connect control sync')
old_pause_tail = '''      updateRuntimeState('bridge-paused');
      await persist();
      await renderWidget('bridge-paused');
      renderSettings();
'''
new_pause_tail = '''      updateRuntimeState('bridge-paused');
      await persist();
      renderBridgeControls();
      await renderWidget('bridge-paused');
'''
runtime = replace_once(runtime, old_pause_tail, new_pause_tail, 'pause control sync')
old_arm = '''      if (now > Number(tokenForgetArmedUntil || 0)) {
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
'''
new_arm = '''      if (now > Number(tokenForgetArmedUntil || 0)) {
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
'''
runtime = replace_once(runtime, old_arm, new_arm, 'token confirmation state render')
old_forget_tail = '''      updateRuntimeState('bridge-token-forgotten');
      await persist();
      await renderWidget('bridge-token-forgotten');
      renderSettings();
'''
new_forget_tail = '''      updateRuntimeState('bridge-token-forgotten');
      await persist();
      renderBridgeControls();
      await renderWidget('bridge-token-forgotten');
'''
runtime = replace_once(runtime, old_forget_tail, new_forget_tail, 'forget token control sync')
write(runtime_path, runtime)


# Extend UI regression markers and add a dedicated control-surface static regression test.
p3_path = TESTS / 'p3-ui.cjs'
p3 = read(p3_path)
p3 = replace_once(
    p3,
    "  'Lifecycle refresh:',\n]) {",
    "  'Lifecycle refresh:',\n  'bridge-config-static',\n  'bridge-control-live',\n  'bridgeControlsHtml',\n  'renderBridgeControls',\n]) {",
    'P3 bridge control markers',
)
write(p3_path, p3)

control_test = r'''const fs = require('node:fs');
const assert = require('node:assert/strict');

const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const ui = fs.readFileSync(`${root}/src/50-settings-ui.part.js`, 'utf8');
const runtime = fs.readFileSync(`${root}/src/60-settings-runtime.part.js`, 'utf8');

assert.ok(source.includes('//@version 3.0.0-alpha.5.40'));
for (const marker of [
  'class="bridge-config-static"',
  '${bridgeControlsHtml()}',
]) assert.ok(ui.includes(marker), `missing bridge control UI marker: ${marker}`);

for (const marker of [
  'function bridgeControlsHtml()',
  'class="bridge-control-live"',
  "const forgetArmed = Boolean(token && Number(tokenForgetArmedUntil || 0) > Date.now());",
  "connecting?'disabled':''",
  "id=\"refresh\" ${refreshAllowed?'':'disabled'}",
  "querySelector('.bridge-control-live')",
  'function renderBridgeControls()',
  'holder.innerHTML = bridgeControlsHtml();',
  "renderWidget('bridge-connecting')",
  "renderBridgeControls();\n      await renderWidget('bridge-paused');",
  "renderBridgeControls();\n      await renderWidget('bridge-token-forgotten');",
]) assert.ok(runtime.includes(marker), `missing bridge control runtime marker: ${marker}`);

assert.ok(!runtime.includes("button.textContent = '정말 지우기?'"), 'token confirmation must render from state, not mutate stale button text');
assert.ok(runtime.includes("currentAdvanced[0]?.querySelector('.bridge-control-live')"), 'Local Bridge live control partial patch missing');
assert.ok(!runtime.includes("currentAdvanced[0]?.querySelector('.advanced-body')"), 'typed Local Bridge config body must not be live-patched');
assert.ok(ui.startsWith('  function settingsHtml() {'), 'settings UI modular boundary drifted');
assert.ok(runtime.startsWith('  function renderSettings() {'), 'settings runtime modular boundary drifted');
console.log('usage-dashboard P5 bridge control surface sync: OK · 3.0.0-alpha.5.40');
'''
write(TESTS / 'p5-bridge-control-sync.cjs', control_test)


# Product metadata: plugin hotfix only; engine/manager semantic versions remain frozen.
manager_path = RUNTIME / 'bridge-manager.cjs'
manager = read(manager_path)
manager = replace_once(manager, "const PRODUCT_VERSION = '3.0.0-alpha.5.39';", "const PRODUCT_VERSION = '3.0.0-alpha.5.40';", 'manager product version')
write(manager_path, manager)

manifest_path = RUNTIME / 'product-manifest.json'
manifest = json.loads(read(manifest_path))
if manifest.get('productVersion') != '3.0.0-alpha.5.39':
    raise SystemExit(f"unexpected manifest product version: {manifest.get('productVersion')}")
manifest['productVersion'] = '3.0.0-alpha.5.40'
manifest['components']['plugin']['version'] = '3.0.0-alpha.5.40'
manifest['components']['bridgeManager']['productVersion'] = '3.0.0-alpha.5.40'
write(manifest_path, json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

print('prepared Local Usage Dashboard 3.0.0-alpha.5.40 bridge control surface sync hotfix')
