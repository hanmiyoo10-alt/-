const fs = require('node:fs');
const assert = require('node:assert/strict');

const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const widget = ['70-widget-render.part.js','72-widget-layout.part.js','74-widget-gestures.part.js','76-widget-runtime.part.js'].map(file => fs.readFileSync(`${root}/src/${file}`, 'utf8')).join('');
const runtime = fs.readFileSync(`${root}/src/60-settings-runtime.part.js`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));
const requiredEngineVersion = String(manifest.components.bridge.requiredVersion || '');

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
assert.ok(/^1\.6\.\d+$/.test(requiredEngineVersion), `unexpected bridge contract version: ${requiredEngineVersion}`);
assert.equal(manifest.contracts.snapshot, 1);
assert.equal(manifest.contracts.recentRequest, 1);
console.log(`usage-dashboard P5 floating widget UX redesign: OK · engine ${requiredEngineVersion}`);
