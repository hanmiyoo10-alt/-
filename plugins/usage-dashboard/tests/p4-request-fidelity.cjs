const fs = require('node:fs');
const assert = require('node:assert/strict');

const source = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const version = (source.match(/^\/\/@version (.+)$/m) || [])[1] || '';
const alpha4 = version.match(/^3\.0\.0-alpha\.4\.(\d+)$/);
const enabled = alpha4 ? Number(alpha4[1]) >= 9 : /^(3\.0\.0-beta\.|3\.0\.0$)/.test(version);
if (!enabled) {
  console.log(`usage-dashboard P4 request fidelity regression: skipped · ${version}`);
  process.exit(0);
}

for (const marker of [
  'function recentRequestField(row, keys)',
  'function requestCacheSignal(row)',
  'function requestTimestampPrecision(timestamp, sourceKey, requestNumber)',
  'function requestLedgerCapabilities(rows)',
  "['requestLedger', raw.requestLedger]",
  "['recentRequests', raw.recentRequests]",
  "['requests', raw.requests]",
  "timestampPrecision:String(row.timestampPrecision",
  '버킷 · 정확 시각 미제공',
  'Request fidelity: exact ${',
  'source ${diagUsage?.recentSourceKey',
  'usage.input_tokens_details.cached_tokens',
]) assert.ok(source.includes(marker), `missing request fidelity marker: ${marker}`);

assert.ok(source.includes("row?.timestampPrecision === 'hour' || row?.timestampPrecision === 'hour-estimated'"), 'bucket timestamps must not look exact');
assert.ok(source.includes('cache known ${diagLedgerFidelity.cacheKnown}/${diagLedgerFidelity.rows}'), 'cache coverage diagnostic missing');
assert.ok(source.includes('Hourly detail: provider/model summary · cache coverage · click-only partial render'), 'alpha.4.8 hourly detail regression');
assert.ok(source.includes('P4 partial: auto section patch · diagnostics live · settings preserved'), 'P4 partial regression');

console.log(`usage-dashboard P4 request fidelity regression: OK · ${version}`);
