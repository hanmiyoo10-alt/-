const fs = require('node:fs');
const assert = require('node:assert/strict');

const source = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const version = (source.match(/^\/\/@version (.+)$/m) || [])[1] || '';
const alpha = version.match(/^3\.0\.0-alpha\.(\d+)\.(\d+)$/);
const enabled = alpha ? (Number(alpha[1]) > 4 || (Number(alpha[1]) === 4 && Number(alpha[2]) >= 7)) : /^(3\.0\.0-beta\.|3\.0\.0-rc\.|3\.0\.0$)/.test(version);

if (!enabled) {
  console.log(`usage-dashboard P4 hourly drilldown regression: skipped · ${version}`);
  process.exit(0);
}

for (const marker of [
  "requestLedger: []",
  "selectedHourKey: ''",
  'function collectRecentRequestLedger(data)',
  'function requestLedgerRowsForScope(scopeKey)',
  'function requestHourKey(timestamp)',
  'function hourlyRequestDrilldownHtml(scopeKey)',
  'data-usage-hour=',
  '시간별 요청 · 24h 로컬 관측',
  "row.cacheHit ? 'HIT' : 'MISS'",
  'Request ledger: rows ${',
  'Hourly drilldown: local observed · selected-hour lazy render · request cache HIT/MISS',
]) {
  assert.ok(source.includes(marker), `missing hourly drilldown marker: ${marker}`);
}

assert.ok(source.includes('normalizeRecentRequestRows(rawRecent, 200)'), 'ledger seed must keep bridge recent metadata beyond the 12-row UI list');
assert.ok(source.includes('state.requestLedger = Array.from(byKey.values())'), 'ledger must deduplicate persisted requests');
assert.ok(source.includes('Date.now() - 24 * 60 * 60 * 1000'), 'ledger must prune to rolling 24h');
assert.ok(source.includes("state.selectedHourKey = state.selectedHourKey === key ? '' : key;"), 'hour click must toggle selected hour');
assert.ok(source.includes("timeZone:KST_TIME_ZONE"), 'hour/request time formatting must use dashboard KST');
assert.ok(source.includes('프롬프트/응답 미저장'), 'hourly ledger must remain metadata-only');
assert.ok(source.includes('P4 partial: auto section patch · diagnostics live · settings preserved'), 'P4.6 partial render regression');
assert.ok(source.includes('P4 render: closed-panel skip · widget DOM dedup'), 'P4.5 render regression');

console.log(`usage-dashboard P4 hourly drilldown regression: OK · ${version}`);
