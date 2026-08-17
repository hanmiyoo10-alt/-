const fs = require('node:fs');
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
