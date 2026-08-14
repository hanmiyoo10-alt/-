const fs = require('node:fs');
const assert = require('node:assert/strict');

const source = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const version = (source.match(/^\/\/@version (.+)$/m) || [])[1] || '';
const alpha = version.match(/^3\.0\.0-alpha\.(\d+)\.(\d+)$/);
const enabled = alpha ? (Number(alpha[1]) > 4 || (Number(alpha[1]) === 4 && Number(alpha[2]) >= 8)) : /^(3\.0\.0-beta\.|3\.0\.0$)/.test(version);

if (!enabled) {
  console.log(`usage-dashboard P4 hourly detail regression: skipped · ${version}`);
  process.exit(0);
}

for (const marker of [
  'function aggregateSelectedHour(rows, key)',
  'function selectedHourAggregateHtml(title, rows)',
  'Provider 합계',
  'Model 합계',
  '캐시 정보 0/${selected.length}',
  'function requestLedgerCoverageText()',
  '로컬 관측 시작',
  'function renderHourlyDrilldownOnly()',
  'function bindHourlyDrilldown()',
  'performanceRuntime.hourlyDetailWrites += 1',
  'Hourly detail: provider/model summary · cache coverage · click-only partial render',
  '캐시 정보 없음',
]) {
  assert.ok(source.includes(marker), `missing alpha.4.8 hourly detail marker: ${marker}`);
}

assert.ok(source.includes('current.replaceWith(next);'), 'hour click should patch only the hourly ledger block');
assert.ok(!/data-usage-hour[\s\S]{0,500}renderSettings\(\);/.test(source), 'hour click handler must not full-render the settings panel');
assert.ok(source.includes('Hourly drilldown: local observed · selected-hour lazy render · request cache HIT/MISS'), 'alpha.4.7 hourly drilldown regression');
assert.ok(source.includes('P4 partial: auto section patch · diagnostics live · settings preserved'), 'alpha.4.6 partial render regression');

console.log(`usage-dashboard P4 hourly detail regression: OK · ${version}`);
