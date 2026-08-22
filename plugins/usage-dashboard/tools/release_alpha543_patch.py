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


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)


def replace_between(text, start, end, new, label):
    i = text.find(start)
    if i < 0:
        raise SystemExit(f'{label}: start marker missing')
    j = text.find(end, i + len(start))
    if j < 0:
        raise SystemExit(f'{label}: end marker missing')
    return text[:i] + new + text[j:]


# Product/plugin bump only. Engine 1.6.5 and Manager 1.2.6 semantic versions stay frozen.
core_path = SRC / '00-runtime-core.part.js'
core = read(core_path)
core = replace_once(core, '//@version 3.0.0-alpha.5.42', '//@version 3.0.0-alpha.5.43', 'metadata version')
core = replace_once(core, "const VERSION = '3.0.0-alpha.5.42';", "const VERSION = '3.0.0-alpha.5.43';", 'runtime version')
core = replace_once(core, "    widgetVisible: true, widgetMode: 'compact', widgetX: null, widgetY: null,", "    widgetVisible: true, widgetMode: 'compact', widgetX: null, widgetY: null, widgetDockSide: '',", 'widget dock state')
if "const REQUIRED_BRIDGE_VERSION = '1.6.5';" not in core:
    raise SystemExit('required bridge version drifted from 1.6.5')
write(core_path, core)


widget_path = SRC / '70-floating-widget.part.js'
widget = read(widget_path)

new_widget_html = r'''  function widgetHtml() {
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

'''
widget = replace_between(widget, '  function widgetHtml() {', '  const widgetWidth =', new_widget_html, 'widget HTML')

widget = replace_once(
    widget,
    "  const widgetWidth = (mobile = false, expanded = false) => mobile\n    ? (expanded ? 'min(220px,calc(100vw - 16px))' : 'min(176px,calc(100vw - 16px))')\n",
    "  const widgetWidth = (mobile = false, expanded = false) => mobile\n    ? (expanded ? 'min(220px,calc(100vw - 16px))' : 'min(152px,calc(100vw - 16px))')\n",
    'mobile edge-peek width',
)

new_layout = r'''  async function applyWidgetResponsiveLayout(mobile, expanded) {
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

'''
widget = replace_between(widget, '  async function applyWidgetResponsiveLayout(mobile, expanded) {', '  async function detachWidgetRemoteListeners()', new_layout, 'responsive widget layout')

new_ensure = r'''  async function ensureWidget() {
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

'''
widget = replace_between(widget, '  async function ensureWidget() {', '  async function renderWidget(reason = \'ui\') {', new_ensure, 'widget gesture runtime')

widget = replace_once(
    widget,
    '          await widget.setInnerHTML(nextHtml);\n          widgetRenderCache.html = nextHtml;',
    '          await widget.setInnerHTML(nextHtml);\n          await clampWidgetToViewport();\n          widgetRenderCache.html = nextHtml;',
    'clamp after widget HTML update',
)

write(widget_path, widget)


# Reset position must also forget edge docking, otherwise mobile would immediately
# snap back to the previous side after the user asks for a reset.
runtime_path = SRC / '60-settings-runtime.part.js'
runtime = read(runtime_path)
runtime = replace_once(
    runtime,
    "      state.widgetX = null;\n      state.widgetY = null;\n      drag = null;",
    "      state.widgetX = null;\n      state.widgetY = null;\n      state.widgetDockSide = '';\n      drag = null;",
    'reset mobile dock side',
)
write(runtime_path, runtime)


# Diagnostics make mobile validation deterministic without exposing any sensitive data.
diag_path = SRC / '40-diagnostics.part.js'
diag = read(diag_path)
anchor = "      `P4 render: closed-panel skip · widget DOM dedup`,\n"
extra = anchor + "      `Floating widget UX: ${state.widgetVisible===false?'hidden':'visible'} · mobile ${widgetMobileViewport?'yes':'no'} · expanded ${widgetMobileExpanded?'yes':'no'} · dock ${state.widgetDockSide || 'none'} · position ${num(state.widgetX)&&num(state.widgetY)?`${Math.round(Number(state.widgetX))},${Math.round(Number(state.widgetY))}`:'default'} · gesture handle-drag/arrow-toggle`,\n"
diag = replace_once(diag, anchor, extra, 'floating widget diagnostics')
write(diag_path, diag)


# Keep exact-version regressions active on 5.43.
for test_name in ['p5-service-tier-fidelity.cjs', 'p5-devpass-account-parity.cjs']:
    test_path = TESTS / test_name
    text = read(test_path)
    if '3.0.0-alpha.5.42' not in text:
        raise SystemExit(f'{test_name}: expected 5.42 markers missing')
    write(test_path, text.replace('3.0.0-alpha.5.42', '3.0.0-alpha.5.43'))


widget_test = r'''const fs = require('node:fs');
const assert = require('node:assert/strict');

const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const widget = fs.readFileSync(`${root}/src/70-floating-widget.part.js`, 'utf8');
const runtime = fs.readFileSync(`${root}/src/60-settings-runtime.part.js`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));

assert.ok(source.includes('//@version 3.0.0-alpha.5.43'));
for (const marker of [
  'data-drag-handle="1"',
  'data-widget-toggle="1"',
  '≡로 이동 · ▾로 펼치기',
  "touch-action:manipulation",
  'distance < 6',
  "state.widgetDockSide = dockSide;",
  "dockSide === 'left' ? 8 : finished.maxX",
  "widgetMobileToggleBlockedUntil=Date.now()+500",
  'const inToggle = localX >= Number(r.width || 0) - toggleWidth',
  'async function clampWidgetToViewport()',
  "await clampWidgetToViewport();",
  "'min(152px,calc(100vw - 16px))'",
]) assert.ok(widget.includes(marker), `missing floating widget UX marker: ${marker}`);

assert.ok(!widget.includes('if (widgetMobileViewport) { drag = null; return; }'), 'mobile drag must no longer be disabled');
assert.ok(!widget.includes('title="탭해서 사용량 펼치기"'), 'whole-widget tap affordance must be removed');
assert.ok(runtime.includes("state.widgetDockSide = '';"), 'position reset must clear dock side');
assert.ok(source.includes('Floating widget UX:'), 'floating widget diagnostics missing');
assert.ok(source.includes("widgetDockSide: ''"), 'widget dock state default missing');
assert.ok(manager.includes("const MANAGER_VERSION = '1.2.6';"));
assert.ok(source.includes("const REQUIRED_BRIDGE_VERSION = '1.6.5';"));
assert.equal(manifest.components.bridge.requiredVersion, '1.6.5');
assert.equal(manifest.components.bridgeManager.version, '1.2.6');
assert.equal(manifest.contracts.snapshot, 1);
assert.equal(manifest.contracts.recentRequest, 1);
console.log('usage-dashboard P5 floating widget UX redesign: OK · 3.0.0-alpha.5.43');
'''
write(TESTS / 'p5-floating-widget-ux.cjs', widget_test)


# Manager product metadata follows the plugin product while semantic versions stay fixed.
manager_path = RUNTIME / 'bridge-manager.cjs'
manager = read(manager_path)
manager = replace_once(manager, "const PRODUCT_VERSION = '3.0.0-alpha.5.42';", "const PRODUCT_VERSION = '3.0.0-alpha.5.43';", 'manager product version')
if "const MANAGER_VERSION = '1.2.6';" not in manager:
    raise SystemExit('manager semantic version drifted')
if "const BUNDLED_ENGINE_VERSION = '1.6.5';" not in manager:
    raise SystemExit('bundled Engine semantic version drifted')
write(manager_path, manager)
manager_sha = sha256(manager_path)

manifest_path = RUNTIME / 'product-manifest.json'
manifest = json.loads(read(manifest_path))
if manifest.get('productVersion') != '3.0.0-alpha.5.42':
    raise SystemExit(f"unexpected manifest product version: {manifest.get('productVersion')}")
if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != '1.6.5':
    raise SystemExit('manifest Engine requirement drifted')
manifest['productVersion'] = '3.0.0-alpha.5.43'
manifest['components']['plugin']['version'] = '3.0.0-alpha.5.43'
manifest['components']['bridgeManager']['productVersion'] = '3.0.0-alpha.5.43'
manifest['components']['bridgeManager']['sha256'] = manager_sha
write(manifest_path, json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

print('prepared Local Usage Dashboard 3.0.0-alpha.5.43 floating widget UX redesign')
