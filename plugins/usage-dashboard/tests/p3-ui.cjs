const fs = require('node:fs');
const assert = require('node:assert/strict');

const source = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const version = (source.match(/^\/\/@version (.+)$/m) || [])[1] || '';
const alpha = version.match(/^3\.0\.0-alpha\.(\d+)\.(\d+)$/);
assert.ok(alpha ? (Number(alpha[1]) > 4 || (Number(alpha[1]) === 4 && Number(alpha[2]) >= 3)) : /^(3\.0\.0-beta\.|3\.0\.0$)/.test(version), `P3 UI requires alpha.4.3+; got ${version}`);
assert.ok(source.includes(`const VERSION = '${version}';`), 'runtime version must match metadata');

for (const marker of [
  'Provider · 요청 / 비용 / 효율',
  'Model · 요청 / 비용 / 효율',
  '최근 요청 · 메타데이터',
  "캐시 ${row.cacheHit ? 'HIT' : 'MISS'}",
  'class="panel wide usage-primary"',
  'class="panel wide activity-secondary"',
  'class="panel wide analytics-panel"',
  'class="panel wide advanced-panel"',
  '<summary><b>Local Bridge</b><span>연결 · 설정</span></summary>',
  '<summary><b>Runtime Diagnostics</b><span>성능 · 진단</span></summary>',
  'UI layout: usage-first · aggregate enriched · recent metadata · advanced collapsed',
  'data-mobile-widget-summary=\"1\"',
  'function widgetMobileMode()',
  "return Number(await rootBody.clientWidth()) <= 600;",
  'async function applyWidgetResponsiveLayout(mobile, expanded)',
  "bottom','88px'",
  'widgetMobileExpanded = !widgetMobileExpanded;',
  "await renderWidget('panel-open');",
]) {
  assert.ok(source.includes(marker), `missing P3 marker: ${marker}`);
}

assert.ok(source.includes('const aggregateMetaText = row =>') || source.includes('const aggregateMetaItems = row =>'), 'aggregate metadata renderer regression');
assert.ok(!source.includes('<details class="panel wide advanced-panel" open>'), 'advanced panels must default closed');
assert.ok(source.indexOf('class="panel wide usage-primary"') < source.indexOf('class="panel wide analytics-panel"'), 'usage panel must precede analytics in source');
assert.ok(source.includes("Risuai.registerButton({name:'Usage',icon:'📊',iconType:'html',location:'chat'"), 'Usage quick menu regression');
assert.ok(source.includes('Resume route: requested'), 'resume diagnostics regression');
assert.ok(source.includes('Bridge module freshness:'), 'bridge diagnostics regression');

console.log(`usage-dashboard P3 UI regression: OK · ${version}`);
