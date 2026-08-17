const fs = require('node:fs');
const assert = require('node:assert/strict');

const source = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const version = (source.match(/^\/\/@version (.+)$/m) || [])[1] || '';
const alpha = version.match(/^3\.0\.0-alpha\.(\d+)\.(\d+)$/);
const enabled = alpha ? (Number(alpha[1]) > 4 || (Number(alpha[1]) === 4 && Number(alpha[2]) >= 6)) : /^(3\.0\.0-beta\.|3\.0\.0-rc\.|3\.0\.0$)/.test(version);

if (!enabled) {
  console.log(`usage-dashboard P4 partial regression: skipped · ${version}`);
  process.exit(0);
}

for (const marker of [
  'panelPartialRenders:0',
  'panelFullRenders:0',
  'panelSectionWrites:0',
  'panelSectionSkips:0',
  "lastPanelRenderMode:'full'",
  'const PANEL_PARTIAL_SELECTORS = [',
  'function patchPanelSections(nextHtml)',
  'function renderSettingsPartial()',
  "new DOMParser().parseFromString(nextHtml, 'text/html')",
  'renderSettingsPartial();',
  'performanceRuntime.panelPartialRenders += 1',
  'performanceRuntime.panelFullRenders += 1',
  'performanceRuntime.panelSectionWrites += writes',
  'performanceRuntime.panelSectionSkips += skips',
  'Panel partial: mode ${',
  'P4 partial: auto section patch · diagnostics live · settings preserved',
]) {
  assert.ok(source.includes(marker), `missing P4 partial marker: ${marker}`);
}

assert.ok(source.includes("'.grid > section.panel.metric'"), 'metric panels must be part of partial patch set');
assert.ok(source.includes("'.grid > section.usage-primary'"), 'Usage panel must be part of partial patch set');
assert.ok(source.includes("'.grid > section.activity-secondary'"), 'Activity panel must be part of partial patch set');
assert.ok(source.includes("'.grid > section.analytics-panel'"), 'Analytics panel must be part of partial patch set');
assert.ok(source.includes("const diagnosticsCurrent = currentAdvanced[1]?.querySelector('.advanced-body');"), 'open runtime diagnostics should be refreshed without touching Bridge settings');
assert.ok(source.includes("if (currentAdvanced[1]?.open && diagnosticsCurrent && diagnosticsNext)"), 'runtime diagnostics partial update must preserve details open state');
assert.ok(source.includes("if (force) { renderSettings(); return; }"), 'forced/user render must remain full');
assert.ok(source.includes('  function renderSettings() {'), 'P2 module boundary must stay unchanged');
assert.ok(source.includes('P4 render: closed-panel skip · widget DOM dedup'), 'P4.5 regression marker missing');
assert.ok(source.includes('Recent UI: filter ${'), 'P3 recent UI regression');
assert.ok(source.includes('Resume route: requested'), 'resume diagnostics regression');

console.log(`usage-dashboard P4 partial regression: OK · ${version}`);
