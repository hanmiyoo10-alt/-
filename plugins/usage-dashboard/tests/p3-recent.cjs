const fs = require('node:fs');
const assert = require('node:assert/strict');

const source = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const version = (source.match(/^\/\/@version (.+)$/m) || [])[1] || '';
const alpha4 = version.match(/^3\.0\.0-alpha\.4\.(\d+)$/);
const enabled = alpha4 ? Number(alpha4[1]) >= 4 : /^(3\.0\.0-beta\.|3\.0\.0$)/.test(version);

if (!enabled) {
  console.log(`usage-dashboard P3 recent regression: skipped · ${version}`);
  process.exit(0);
}

for (const marker of [
  "recentRequestFilter: 'all'",
  "const recentFilter = ['all','success','error'].includes(String(state.recentRequestFilter))",
  'data-recent-filter=',
  'recent-filter',
  'aggregate-meta',
  'stat-chip',
  "filterButton('all','전체',recentCounts.all)",
  "filterButton('success','성공',recentCounts.success)",
  "filterButton('error','오류',recentCounts.error)",
  'Recent UI: filter ${',
  "state.recentRequestFilter = ['all','success','error'].includes(next) ? next : 'all';",
  '@media(max-width:680px)',
  '.request-detail-row{flex-direction:row',
]) {
  assert.ok(source.includes(marker), `missing P3 recent marker: ${marker}`);
}

assert.ok(source.includes("const recentRows = recentAll.filter(row => recentFilter === 'all' || (recentFilter === 'success' ? row.success : !row.success));"), 'recent filter semantics regression');
assert.ok(source.includes("const filterEmpty = recentAll.length > 0 ? '이 필터에 해당하는 최근 요청 없음'"), 'filter empty-state regression');
assert.ok(source.includes("Risuai.registerButton({name:'Usage',icon:'📊',iconType:'html',location:'chat'"), 'Usage quick menu regression');
assert.ok(source.includes('Resume route: requested'), 'resume diagnostics regression');

console.log(`usage-dashboard P3 recent regression: OK · ${version}`);
