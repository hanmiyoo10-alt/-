from pathlib import Path
import re

ROOT = Path('plugins/usage-dashboard/src')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, got {count}')
    return text.replace(old, new, 1)


# 00 runtime/core: version + request-fidelity counters.
p = ROOT / '00-runtime-core.part.js'
s = p.read_text()
s = replace_once(s, '//@version 3.0.0-alpha.4.8', '//@version 3.0.0-alpha.4.9', 'metadata version')
s = replace_once(s, "const VERSION = '3.0.0-alpha.4.8';", "const VERSION = '3.0.0-alpha.4.9';", 'runtime version')
p.write_text(s)


# 10 usage/data: accept richer native ledger aliases, preserve timestamp precision,
# and derive cache HIT/MISS from explicit cached-token metadata when available.
p = ROOT / '10-usage-data.part.js'
s = p.read_text()
start = s.index('  function normalizeRecentRequestRows(rows, limit = 12) {')
end = s.index('  function requestLedgerKey(row) {', start)
new_normalizer = r'''  function recentRequestField(row, keys) {
    for (const key of keys) {
      const value = recentRequestValue(row, [key], null);
      if (value !== null && value !== undefined && value !== '') return {key, value};
    }
    return {key:'', value:null};
  }

  function requestCacheSignal(row) {
    const explicit = recentRequestValue(row, ['cacheHit','cache_hit','cached','isCached','is_cached','cache.hit'], null);
    const text = typeof explicit === 'string' ? explicit.trim().toLowerCase() : '';
    if (typeof explicit === 'boolean') return explicit;
    if (num(explicit)) return Number(explicit) > 0;
    if (['true','yes','hit','cached'].includes(text)) return true;
    if (['false','no','miss','uncached'].includes(text)) return false;
    const cachedTokens = recentRequestValue(row, [
      'cachedTokens','cached_tokens','usage.cachedTokens','usage.cached_tokens',
      'cacheReadInputTokens','cache_read_input_tokens','usage.cacheReadInputTokens','usage.cache_read_input_tokens',
      'cachedContentTokenCount','cached_content_token_count','usage.cachedContentTokenCount','usage.cached_content_token_count',
      'usage.input_tokens_details.cached_tokens','usage.prompt_tokens_details.cached_tokens',
      'input_tokens_details.cached_tokens','prompt_tokens_details.cached_tokens'
    ], null);
    return num(cachedTokens) ? Number(cachedTokens) > 0 : null;
  }

  function requestTimestampPrecision(timestamp, sourceKey, requestNumber) {
    const bucketKeys = new Set(['hour','hourStart','hour_start','bucketStart','bucket_start','windowStart','window_start']);
    if (bucketKeys.has(String(sourceKey || ''))) return 'hour';
    if (!num(timestamp)) return 'unknown';
    const d = new Date(Number(timestamp));
    const onHourBoundary = d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
    return onHourBoundary && !requestNumber ? 'hour-estimated' : 'exact';
  }

  function normalizeRecentRequestRows(rows, limit = 12) {
    if (!Array.isArray(rows)) return [];
    return rows.map(row => {
      if (!row || typeof row !== 'object') return null;
      const timestampField = recentRequestField(row, [
        'timestamp','createdAt','created_at','time','date','created','startedAt','started_at','completedAt','completed_at','requestTime','request_time',
        'hour','hourStart','hour_start','bucketStart','bucket_start','windowStart','window_start'
      ]);
      const timestamp = bridgeTimestamp(timestampField.value);
      const provider = String(recentRequestValue(row, ['provider','providerName','provider_name','usedProvider','used_provider','metadata.used_provider','metadata.usedProvider','source.provider'], 'Unknown') || 'Unknown');
      const model = String(recentRequestValue(row, ['model','modelId','model_id','usedModel','used_model','metadata.used_model','metadata.usedModel','source.model'], 'Unknown') || 'Unknown');
      const costRaw = recentRequestValue(row, ['cost','usage.cost','inferenceCost','inference_cost','totalCost','total_cost','usage.cost_details.total_cost','cost_details.total_cost'], null);
      const tokensRaw = recentRequestValue(row, ['totalTokens','total_tokens','usage.total_tokens'], null);
      const requestNumberRaw = recentRequestValue(row, ['id','requestId','request_id','sequence','seq','requestNumber','request_number','number'], null);
      const requestNumber = requestNumberRaw !== null && requestNumberRaw !== undefined && requestNumberRaw !== '' ? String(requestNumberRaw) : '';
      const status = String(recentRequestValue(row, ['status','state'], '') || '').toLowerCase();
      const errorCodeRaw = recentRequestValue(row, ['errorCode','error_code','statusCode','status_code','httpStatus','http_status','error.code'], null);
      const errorTypeRaw = recentRequestValue(row, ['errorType','error_type','error.type'], null);
      const statusCode = num(errorCodeRaw) ? Number(errorCodeRaw) : null;
      const explicitSuccess = typeof row.success === 'boolean' ? row.success : null;
      const failedByStatus = ['error','failed','failure','upstream_error','gateway_error','timeout'].includes(status);
      const hasErrorObject = Boolean(row.error && (typeof row.error === 'string' || typeof row.error === 'object'));
      const success = explicitSuccess !== null ? explicitSuccess : !(failedByStatus || hasErrorObject || (statusCode !== null && statusCode >= 400));
      if (!timestamp && provider === 'Unknown' && model === 'Unknown') return null;
      return {
        timestamp,
        timestampPrecision:requestTimestampPrecision(timestamp, timestampField.key, requestNumber),
        timestampSource:String(timestampField.key || ''),
        provider,
        model,
        cost:num(costRaw) ? Number(costRaw) : null,
        totalTokens:num(tokensRaw) ? Number(tokensRaw) : null,
        cacheHit:requestCacheSignal(row),
        requestNumber,
        success,
        errorCode:success ? '' : String(errorCodeRaw ?? ''),
        errorType:success ? '' : String(errorTypeRaw ?? '')
      };
    }).filter(Boolean).sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0)).slice(0, Math.max(1, Number(limit) || 12));
  }

  function requestLedgerCapabilities(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const exact = list.filter(row => row?.timestampPrecision === 'exact').length;
    const bucket = list.filter(row => row?.timestampPrecision === 'hour' || row?.timestampPrecision === 'hour-estimated').length;
    const cacheKnown = list.filter(row => typeof row?.cacheHit === 'boolean').length;
    const ids = list.filter(row => String(row?.requestNumber || '')).length;
    return {rows:list.length, exact, bucket, cacheKnown, ids};
  }

'''
s = s[:start] + new_normalizer + s[end:]

# Preserve precision/source while merging the rolling ledger.
s = replace_once(
    s,
    "          cacheHit:typeof row.cacheHit === 'boolean' ? row.cacheHit : (typeof current?.cacheHit === 'boolean' ? current.cacheHit : null),\n          requestNumber:String(row.requestNumber || current?.requestNumber || ''),",
    "          cacheHit:typeof row.cacheHit === 'boolean' ? row.cacheHit : (typeof current?.cacheHit === 'boolean' ? current.cacheHit : null),\n          timestampPrecision:String(row.timestampPrecision || current?.timestampPrecision || 'unknown'),\n          timestampSource:String(row.timestampSource || current?.timestampSource || ''),\n          requestNumber:String(row.requestNumber || current?.requestNumber || ''),",
    'ledger fidelity merge',
)

# Replace exact-looking clock text with an explicit bucket label when precision is not exact.
old = "  function requestExactTime(timestamp) {\n    if (!num(timestamp)) return '시간 미제공';\n    return new Date(Number(timestamp)).toLocaleTimeString('ko-KR', {timeZone:KST_TIME_ZONE,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});\n  }"
new = "  function requestExactTime(row) {\n    const timestamp = row?.timestamp;\n    if (!num(timestamp)) return '시간 미제공';\n    if (row?.timestampPrecision === 'hour' || row?.timestampPrecision === 'hour-estimated') return `${requestHourLabel(requestHourKey(timestamp))} 버킷 · 정확 시각 미제공`;\n    return new Date(Number(timestamp)).toLocaleTimeString('ko-KR', {timeZone:KST_TIME_ZONE,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});\n  }"
s = replace_once(s, old, new, 'request time fidelity label')
s = replace_once(s, '${esc(requestExactTime(row.timestamp))}', '${esc(requestExactTime(row))}', 'hour detail time call')

# The normal recent list should use the same fidelity-aware time text.
s = replace_once(
    s,
    "<span>${row.timestamp ? dashboardDateText(row.timestamp) : '시간 미제공'}</span>",
    "<span>${row.timestamp ? esc(requestExactTime(row)) : '시간 미제공'}</span>",
    'recent time fidelity label',
)

# Prefer native/richer request ledger aliases when a Bridge provides them.
old_recent = "    const rawRecent = Array.isArray(raw.recent) ? raw.recent : [];\n    const recent = normalizeRecentRequestRows(rawRecent);\n    const recentLedger = normalizeRecentRequestRows(rawRecent, 200);"
new_recent = "    const recentCandidates = [\n      ['requestLedger', raw.requestLedger], ['request_ledger', raw.request_ledger],\n      ['recentRequests', raw.recentRequests], ['recent_requests', raw.recent_requests],\n      ['requests', raw.requests], ['recent', raw.recent]\n    ];\n    const recentSource = recentCandidates.find(([,value]) => Array.isArray(value) && value.length) || recentCandidates.find(([,value]) => Array.isArray(value)) || ['none', []];\n    const recentSourceKey = recentSource[0];\n    const rawRecent = Array.isArray(recentSource[1]) ? recentSource[1] : [];\n    const recent = normalizeRecentRequestRows(rawRecent);\n    const recentLedger = normalizeRecentRequestRows(rawRecent, 200);"
s = replace_once(s, old_recent, new_recent, 'native ledger aliases')
s = replace_once(
    s,
    'return {totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate,providers,models,recent,recentLedger,recentRawCount:rawRecent.length,',
    'return {totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate,providers,models,recent,recentLedger,recentSourceKey,recentRawCount:rawRecent.length,',
    'scope recent source metadata',
)

# Add fidelity summary to the hourly ledger header text.
s = replace_once(
    s,
    "    const rows = requestLedgerRowsForScope(scopeKey);\n    const coverageText = requestLedgerCoverageText();",
    "    const rows = requestLedgerRowsForScope(scopeKey);\n    const coverageText = requestLedgerCoverageText();\n    const fidelity = requestLedgerCapabilities(rows);",
    'hourly fidelity summary',
)
s = replace_once(
    s,
    "<p>${esc(coverageText)} · recent 메타데이터 중복 제거 누적 · 프롬프트/응답 미저장</p>",
    "<p>${esc(coverageText)} · 시각 exact ${fidelity.exact}/${fidelity.rows} · 버킷 ${fidelity.bucket}/${fidelity.rows} · 캐시 정보 ${fidelity.cacheKnown}/${fidelity.rows} · 프롬프트/응답 미저장</p>",
    'hourly fidelity copy',
)
p.write_text(s)


# 40 diagnostics: expose source alias and data fidelity.
p = ROOT / '40-diagnostics.part.js'
s = p.read_text()
s = replace_once(
    s,
    "    const diagLedgerHours = new Set(diagLedgerRows.map(row => requestHourKey(row.timestamp)).filter(Boolean)).size;",
    "    const diagLedgerHours = new Set(diagLedgerRows.map(row => requestHourKey(row.timestamp)).filter(Boolean)).size;\n    const diagLedgerFidelity = requestLedgerCapabilities(diagLedgerRows);",
    'diagnostic fidelity snapshot',
)
s = replace_once(
    s,
    "      `Request ledger: rows ${diagLedgerRows.length} · hours ${diagLedgerHours} · 24h local observed · selected ${state.selectedHourKey || 'none'} · since ${state.requestLedgerStartedAt ? age(state.requestLedgerStartedAt) : '—'}`,\n      `Hourly drilldown: local observed · selected-hour lazy render · request cache HIT/MISS`,",
    "      `Request ledger: rows ${diagLedgerRows.length} · hours ${diagLedgerHours} · source ${diagUsage?.recentSourceKey || 'none'} · 24h local observed · selected ${state.selectedHourKey || 'none'} · since ${state.requestLedgerStartedAt ? age(state.requestLedgerStartedAt) : '—'}`,\n      `Request fidelity: exact ${diagLedgerFidelity.exact}/${diagLedgerFidelity.rows} · bucket ${diagLedgerFidelity.bucket}/${diagLedgerFidelity.rows} · cache known ${diagLedgerFidelity.cacheKnown}/${diagLedgerFidelity.rows} · ids ${diagLedgerFidelity.ids}/${diagLedgerFidelity.rows}`,\n      `Hourly drilldown: local observed · selected-hour lazy render · request cache HIT/MISS`,",
    'diagnostic fidelity lines',
)
p.write_text(s)


# New regression test, version-forward.
test = Path('plugins/usage-dashboard/tests/p4-request-fidelity.cjs')
test.write_text(r'''const fs = require('node:fs');
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
''')

print('alpha.4.9 request fidelity patch applied')
