const fs = require('node:fs');
const assert = require('node:assert/strict');

const source = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const version = (source.match(/^\/\/@version (.+)$/m) || [])[1] || '';
const alpha = version.match(/^3\.0\.0-alpha\.(\d+)\.(\d+)$/);
const enabled = alpha ? (Number(alpha[1]) > 4 || (Number(alpha[1]) === 4 && Number(alpha[2]) >= 5)) : /^(3\.0\.0-beta\.|3\.0\.0$)/.test(version);

if (!enabled) {
  console.log(`usage-dashboard P4 render regression: skipped · ${version}`);
  process.exit(0);
}

for (const marker of [
  'panelRenderSkippedClosed:0',
  'widgetHtmlWrites:0',
  'widgetHtmlSkips:0',
  'widgetStyleWrites:0',
  'widgetStyleSkips:0',
  "document.body.dataset.panelOpen='0'",
  'widgetRenderCache.width !== nextWidth',
  'widgetRenderCache.display !== nextDisplay',
  'widgetRenderCache.html !== nextHtml',
  'performanceRuntime.widgetHtmlWrites += 1',
  'performanceRuntime.widgetHtmlSkips += 1',
  'performanceRuntime.widgetStyleWrites += 1',
  'performanceRuntime.widgetStyleSkips += 1',
  'performanceRuntime.panelRenderSkippedClosed += 1',
  'Render cache: widget html writes',
  'P4 render: closed-panel skip · widget DOM dedup',
]) {
  assert.ok(source.includes(marker), `missing P4 render marker: ${marker}`);
}

assert.ok(source.includes("if (document.body?.dataset?.panelOpen !== '1') {"), 'closed panel guard must be explicit');
assert.ok(source.includes("const nextDisplay = state.widgetVisible===false?'none':'block';"), 'widget display dedup marker missing');
assert.ok(source.includes('const nextHtml = widgetHtml();'), 'widget html must be computed once per visible render');
assert.ok(source.includes("Risuai.registerButton({name:'Usage',icon:'📊',iconType:'html',location:'chat'"), 'Usage quick menu regression');
assert.ok(source.includes('Recent UI: filter ${'), 'P3 recent UI regression');
assert.ok(source.includes('Resume route: requested'), 'resume diagnostics regression');

console.log(`usage-dashboard P4 render regression: OK · ${version}`);
