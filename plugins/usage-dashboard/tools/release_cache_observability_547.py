from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
TESTS = ROOT / 'tests'
RUNTIME = ROOT / 'runtime'
OLD_VERSION = '3.0.0-alpha.5.46'
NEW_VERSION = '3.0.0-alpha.5.47'


def read(path: Path) -> str:
    return path.read_text()


def write(path: Path, text: str) -> None:
    path.write_text(text)


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match in {path}, got {count}')
    write(path, text.replace(old, new, 1))


def replace_all_required(path: Path, old: str, new: str, label: str, minimum: int = 1) -> None:
    text = read(path)
    count = text.count(old)
    if count < minimum:
        raise SystemExit(f'{label}: expected >= {minimum} matches in {path}, got {count}')
    write(path, text.replace(old, new))


# 1) Product version only. Engine/Manager implementation versions and contracts remain frozen.
core = SRC / '00-runtime-core.part.js'
replace_all_required(core, OLD_VERSION, NEW_VERSION, 'core product version', minimum=2)

manager = RUNTIME / 'bridge-manager.cjs'
replace_once(manager, f"const PRODUCT_VERSION = '{OLD_VERSION}';", f"const PRODUCT_VERSION = '{NEW_VERSION}';", 'manager product version')

manifest_path = RUNTIME / 'product-manifest.json'
manifest = json.loads(read(manifest_path))
if manifest.get('productVersion') != OLD_VERSION:
    raise SystemExit(f"product manifest drifted: {manifest.get('productVersion')}")
manifest['productVersion'] = NEW_VERSION
manifest['components']['plugin']['version'] = NEW_VERSION
manifest['components']['bridgeManager']['productVersion'] = NEW_VERSION
manifest['components']['bridgeManager']['sha256'] = hashlib.sha256(read(manager).encode()).hexdigest()
if manifest['components']['bridge']['requiredVersion'] != '1.6.5':
    raise SystemExit('bridge engine must stay frozen at 1.6.5')
if manifest['components']['bridgeManager']['version'] != '1.2.6':
    raise SystemExit('bridge manager must stay frozen at 1.2.6')
if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('snapshot/recent-request contracts must stay frozen at v1')
write(manifest_path, json.dumps(manifest, indent=2) + '\n')

# 2) Cache-token normalization. Semantics intentionally match Provider Manager's
# observable usage vocabulary without reading its private request-log storage.
normalize = SRC / '10-request-normalize.part.js'
normalize_text = read(normalize)
insert_after = """  function requestCacheSignal(row) {
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
"""
if normalize_text.count(insert_after) != 1:
    raise SystemExit('request cache signal block drifted')
cache_helpers = """

  function requestCacheMetrics(row) {
    const metric = keys => {
      const value = recentRequestValue(row, keys, null);
      return num(value) ? Math.max(0, Number(value)) : null;
    };
    const inputTokens = metric([
      'inputTokens','input_tokens','promptTokens','prompt_tokens','usage.inputTokens','usage.input_tokens','usage.prompt_tokens'
    ]);
    const outputTokens = metric([
      'outputTokens','output_tokens','completionTokens','completion_tokens','usage.outputTokens','usage.output_tokens','usage.completion_tokens'
    ]);
    const explicitCachedInputTokens = metric([
      'cachedInputTokens','cached_input_tokens','cachedTokens','cached_tokens',
      'usage.cachedInputTokens','usage.cached_input_tokens','usage.cachedTokens','usage.cached_tokens'
    ]);
    const cacheReadInputTokens = metric([
      'cacheReadInputTokens','cache_read_input_tokens','usage.cacheReadInputTokens','usage.cache_read_input_tokens',
      'cachedContentTokenCount','cached_content_token_count','usage.cachedContentTokenCount','usage.cached_content_token_count',
      'usage.input_tokens_details.cached_tokens','usage.prompt_tokens_details.cached_tokens',
      'input_tokens_details.cached_tokens','prompt_tokens_details.cached_tokens'
    ]);
    const cacheCreationInputTokens = metric([
      'cacheCreationInputTokens','cache_creation_input_tokens','cacheWriteTokens','cache_write_tokens',
      'usage.cacheCreationInputTokens','usage.cache_creation_input_tokens','usage.cacheWriteTokens','usage.cache_write_tokens',
      'usage.input_tokens_details.cache_write_tokens','usage.prompt_tokens_details.cache_write_tokens',
      'input_tokens_details.cache_write_tokens','prompt_tokens_details.cache_write_tokens'
    ]);
    const cacheCreation5mTokens = metric([
      'cacheCreation5mTokens','cache_creation_5m_tokens','usage.cacheCreation5mTokens','usage.cache_creation_5m_tokens',
      'cache_creation.ephemeral_5m_input_tokens','usage.cache_creation.ephemeral_5m_input_tokens'
    ]);
    const cacheCreation1hTokens = metric([
      'cacheCreation1hTokens','cache_creation_1h_tokens','usage.cacheCreation1hTokens','usage.cache_creation_1h_tokens',
      'cache_creation.ephemeral_1h_input_tokens','usage.cache_creation.ephemeral_1h_input_tokens'
    ]);
    const cachedInputTokens = explicitCachedInputTokens !== null
      ? explicitCachedInputTokens
      : (cacheReadInputTokens !== null || cacheCreationInputTokens !== null
        ? Number(cacheReadInputTokens || 0) + Number(cacheCreationInputTokens || 0)
        : null);
    const denominatorKnown = inputTokens !== null || cacheReadInputTokens !== null || cacheCreationInputTokens !== null;
    const readDenominator = denominatorKnown
      ? Number(inputTokens || 0) + Number(cacheReadInputTokens || 0) + Number(cacheCreationInputTokens || 0)
      : null;
    const cacheReadRatio = cacheReadInputTokens !== null && readDenominator > 0
      ? Math.max(0, Math.min(100, cacheReadInputTokens / readDenominator * 100))
      : null;
    return {
      inputTokens,
      outputTokens,
      cachedInputTokens,
      cacheReadInputTokens,
      cacheCreationInputTokens,
      cacheCreation5mTokens,
      cacheCreation1hTokens,
      cacheReadRatio
    };
  }

  function requestCacheDetailText(row) {
    const parts = [];
    if (typeof row?.cacheHit === 'boolean') parts.push(`캐시 ${row.cacheHit ? 'HIT' : 'MISS'}`);
    if (num(row?.cachedInputTokens)) parts.push(`Cached ${Number(row.cachedInputTokens).toLocaleString()}`);
    if (num(row?.cacheReadInputTokens)) parts.push(`Read ${Number(row.cacheReadInputTokens).toLocaleString()}`);
    if (num(row?.cacheCreationInputTokens)) {
      const ttl = [
        num(row?.cacheCreation5mTokens) ? `5m=${Number(row.cacheCreation5mTokens).toLocaleString()}` : '',
        num(row?.cacheCreation1hTokens) ? `1h=${Number(row.cacheCreation1hTokens).toLocaleString()}` : ''
      ].filter(Boolean).join(', ');
      parts.push(`Write ${Number(row.cacheCreationInputTokens).toLocaleString()}${ttl ? ` (${ttl})` : ''}`);
    }
    if (num(row?.cacheReadRatio)) parts.push(`Read ratio ${Number(row.cacheReadRatio).toFixed(1)}%`);
    return parts.join(' · ');
  }
"""
write(normalize, normalize_text.replace(insert_after, insert_after + cache_helpers, 1))

# 3) Request ledger enrichment + per-hour cache observability. New cache fields are
# deliberately excluded from requestLedgerKey so metadata enrichment never fragments dedupe.
ledger = SRC / '14-request-ledger.part.js'
ledger_text = read(ledger)
old = "      const tokensRaw = recentRequestValue(row, ['totalTokens','total_tokens','usage.total_tokens'], null);"
new = old + "\n      const cacheMetrics = requestCacheMetrics(row);"
if ledger_text.count(old) != 1:
    raise SystemExit('cache metrics insertion point drifted')
ledger_text = ledger_text.replace(old, new, 1)

old = """        cost:num(costRaw) ? Number(costRaw) : null,
        totalTokens:num(tokensRaw) ? Number(tokensRaw) : null,
        cacheHit:requestCacheSignal(row),
"""
new = """        cost:num(costRaw) ? Number(costRaw) : null,
        totalTokens:num(tokensRaw) ? Number(tokensRaw) : null,
        inputTokens:cacheMetrics.inputTokens,
        outputTokens:cacheMetrics.outputTokens,
        cacheHit:requestCacheSignal(row),
        cachedInputTokens:cacheMetrics.cachedInputTokens,
        cacheReadInputTokens:cacheMetrics.cacheReadInputTokens,
        cacheCreationInputTokens:cacheMetrics.cacheCreationInputTokens,
        cacheCreation5mTokens:cacheMetrics.cacheCreation5mTokens,
        cacheCreation1hTokens:cacheMetrics.cacheCreation1hTokens,
        cacheReadRatio:cacheMetrics.cacheReadRatio,
"""
if ledger_text.count(old) != 1:
    raise SystemExit('normalized cache return drifted')
ledger_text = ledger_text.replace(old, new, 1)

cap_anchor = "\n  function requestLedgerCapabilities(rows) {"
cache_stats = """
  function requestCacheObservabilityStats(rows) {
    const stats = {
      rows:0, hitKnown:0, hits:0, tokenKnown:0, readKnown:0, writeKnown:0,
      inputTokens:0, cachedInputTokens:0, cacheReadInputTokens:0, cacheCreationInputTokens:0,
      cacheCreation5mTokens:0, cacheCreation1hTokens:0, readDenominator:0, readRatio:null
    };
    for (const row of (Array.isArray(rows) ? rows : [])) {
      stats.rows += 1;
      if (typeof row?.cacheHit === 'boolean') { stats.hitKnown += 1; if (row.cacheHit) stats.hits += 1; }
      const hasTokenMetric = [row?.cachedInputTokens,row?.cacheReadInputTokens,row?.cacheCreationInputTokens].some(num);
      if (hasTokenMetric) stats.tokenKnown += 1;
      if (num(row?.cacheReadInputTokens)) stats.readKnown += 1;
      if (num(row?.cacheCreationInputTokens)) stats.writeKnown += 1;
      stats.inputTokens += num(row?.inputTokens) ? Number(row.inputTokens) : 0;
      stats.cachedInputTokens += num(row?.cachedInputTokens) ? Number(row.cachedInputTokens) : 0;
      stats.cacheReadInputTokens += num(row?.cacheReadInputTokens) ? Number(row.cacheReadInputTokens) : 0;
      stats.cacheCreationInputTokens += num(row?.cacheCreationInputTokens) ? Number(row.cacheCreationInputTokens) : 0;
      stats.cacheCreation5mTokens += num(row?.cacheCreation5mTokens) ? Number(row.cacheCreation5mTokens) : 0;
      stats.cacheCreation1hTokens += num(row?.cacheCreation1hTokens) ? Number(row.cacheCreation1hTokens) : 0;
      if ([row?.inputTokens,row?.cacheReadInputTokens,row?.cacheCreationInputTokens].some(num)) {
        stats.readDenominator += Number(row?.inputTokens || 0) + Number(row?.cacheReadInputTokens || 0) + Number(row?.cacheCreationInputTokens || 0);
      }
    }
    stats.readRatio = stats.readDenominator > 0 && stats.cacheReadInputTokens > 0
      ? Math.max(0, Math.min(100, stats.cacheReadInputTokens / stats.readDenominator * 100))
      : null;
    return stats;
  }

  function cacheObservabilitySummaryText(stats) {
    const s = stats || requestCacheObservabilityStats([]);
    const hitRate = s.hitKnown > 0 ? `${(s.hits / s.hitKnown * 100).toFixed(1)}% (${s.hits}/${s.hitKnown})` : '—';
    const read = s.readKnown > 0 || s.cacheReadInputTokens > 0 ? Number(s.cacheReadInputTokens).toLocaleString() : '—';
    const write = s.writeKnown > 0 || s.cacheCreationInputTokens > 0 ? Number(s.cacheCreationInputTokens).toLocaleString() : '—';
    const ratio = num(s.readRatio) ? `${Number(s.readRatio).toFixed(1)}%` : '—';
    return `HIT ${hitRate} · Read ${read} · Write ${write} · Read ratio ${ratio}`;
  }
"""
if ledger_text.count(cap_anchor) != 1:
    raise SystemExit('cache stats insertion point drifted')
ledger_text = ledger_text.replace(cap_anchor, cache_stats + cap_anchor, 1)

old = """    const cacheKnown = list.filter(row => typeof row?.cacheHit === 'boolean').length;
    const ids = list.filter(row => String(row?.requestNumber || '')).length;
    const tier = requestServiceTierStats(list);
    return {rows:list.length, exact, bucket, cacheKnown, ids, tier};
"""
new = """    const cacheKnown = list.filter(row => typeof row?.cacheHit === 'boolean').length;
    const cacheTokenKnown = list.filter(row => [row?.cachedInputTokens,row?.cacheReadInputTokens,row?.cacheCreationInputTokens].some(num)).length;
    const ids = list.filter(row => String(row?.requestNumber || '')).length;
    const tier = requestServiceTierStats(list);
    return {rows:list.length, exact, bucket, cacheKnown, cacheTokenKnown, ids, tier};
"""
if ledger_text.count(old) != 1:
    raise SystemExit('capabilities cache token coverage drifted')
ledger_text = ledger_text.replace(old, new, 1)

old = """          totalTokens:num(row.totalTokens) ? Number(row.totalTokens) : (num(current?.totalTokens) ? Number(current.totalTokens) : null),
          cacheHit:typeof row.cacheHit === 'boolean' ? row.cacheHit : (typeof current?.cacheHit === 'boolean' ? current.cacheHit : null),
"""
new = """          totalTokens:num(row.totalTokens) ? Number(row.totalTokens) : (num(current?.totalTokens) ? Number(current.totalTokens) : null),
          inputTokens:num(row.inputTokens) ? Number(row.inputTokens) : (num(current?.inputTokens) ? Number(current.inputTokens) : null),
          outputTokens:num(row.outputTokens) ? Number(row.outputTokens) : (num(current?.outputTokens) ? Number(current.outputTokens) : null),
          cacheHit:typeof row.cacheHit === 'boolean' ? row.cacheHit : (typeof current?.cacheHit === 'boolean' ? current.cacheHit : null),
          cachedInputTokens:num(row.cachedInputTokens) ? Number(row.cachedInputTokens) : (num(current?.cachedInputTokens) ? Number(current.cachedInputTokens) : null),
          cacheReadInputTokens:num(row.cacheReadInputTokens) ? Number(row.cacheReadInputTokens) : (num(current?.cacheReadInputTokens) ? Number(current.cacheReadInputTokens) : null),
          cacheCreationInputTokens:num(row.cacheCreationInputTokens) ? Number(row.cacheCreationInputTokens) : (num(current?.cacheCreationInputTokens) ? Number(current.cacheCreationInputTokens) : null),
          cacheCreation5mTokens:num(row.cacheCreation5mTokens) ? Number(row.cacheCreation5mTokens) : (num(current?.cacheCreation5mTokens) ? Number(current.cacheCreation5mTokens) : null),
          cacheCreation1hTokens:num(row.cacheCreation1hTokens) ? Number(row.cacheCreation1hTokens) : (num(current?.cacheCreation1hTokens) ? Number(current.cacheCreation1hTokens) : null),
          cacheReadRatio:num(row.cacheReadRatio) ? Number(row.cacheReadRatio) : (num(current?.cacheReadRatio) ? Number(current.cacheReadRatio) : null),
"""
if ledger_text.count(old) != 1:
    raise SystemExit('ledger cache enrichment merge drifted')
ledger_text = ledger_text.replace(old, new, 1)

old = """      if (!groups.has(name)) groups.set(name, {name, requests:0, cost:0, costKnown:0, tokens:0, tokenKnown:0, cacheKnown:0, cacheHits:0, errors:0});
"""
new = """      if (!groups.has(name)) groups.set(name, {name, requests:0, cost:0, costKnown:0, tokens:0, tokenKnown:0, cacheKnown:0, cacheHits:0, inputTokens:0, cacheReadTokens:0, cacheWriteTokens:0, cacheTokenKnown:0, errors:0});
"""
if ledger_text.count(old) != 1:
    raise SystemExit('hour aggregate shape drifted')
ledger_text = ledger_text.replace(old, new, 1)

old = """      if (typeof row?.cacheHit === 'boolean') { item.cacheKnown += 1; if (row.cacheHit) item.cacheHits += 1; }
      if (row?.success === false) item.errors += 1;
"""
new = """      if (typeof row?.cacheHit === 'boolean') { item.cacheKnown += 1; if (row.cacheHit) item.cacheHits += 1; }
      if ([row?.cachedInputTokens,row?.cacheReadInputTokens,row?.cacheCreationInputTokens].some(num)) item.cacheTokenKnown += 1;
      item.inputTokens += num(row?.inputTokens) ? Number(row.inputTokens) : 0;
      item.cacheReadTokens += num(row?.cacheReadInputTokens) ? Number(row.cacheReadInputTokens) : 0;
      item.cacheWriteTokens += num(row?.cacheCreationInputTokens) ? Number(row.cacheCreationInputTokens) : 0;
      if (row?.success === false) item.errors += 1;
"""
if ledger_text.count(old) != 1:
    raise SystemExit('hour cache aggregate accumulation drifted')
ledger_text = ledger_text.replace(old, new, 1)

old = """      const meta = [
        row.tokenKnown ? `${row.tokens.toLocaleString()} tok` : '',
        cacheText,
        row.errors ? `오류 ${row.errors}` : ''
      ].filter(Boolean).join(' · ');
"""
new = """      const readDenominator = row.inputTokens + row.cacheReadTokens + row.cacheWriteTokens;
      const cacheTokenText = row.cacheTokenKnown
        ? `Read ${row.cacheReadTokens.toLocaleString()} · Write ${row.cacheWriteTokens.toLocaleString()}${readDenominator > 0 && row.cacheReadTokens > 0 ? ` · Read ratio ${(row.cacheReadTokens / readDenominator * 100).toFixed(1)}%` : ''}`
        : '';
      const meta = [
        row.tokenKnown ? `${row.tokens.toLocaleString()} tok` : '',
        cacheText,
        cacheTokenText,
        row.errors ? `오류 ${row.errors}` : ''
      ].filter(Boolean).join(' · ');
"""
if ledger_text.count(old) != 1:
    raise SystemExit('hour cache aggregate display drifted')
ledger_text = ledger_text.replace(old, new, 1)

old = "const cacheText = typeof row.cacheHit === 'boolean' ? `캐시 ${row.cacheHit ? 'HIT' : 'MISS'}` : '캐시 정보 없음';"
new = "const cacheText = requestCacheDetailText(row) || '캐시 정보 없음';"
if ledger_text.count(old) != 1:
    raise SystemExit('hour detail cache text drifted')
ledger_text = ledger_text.replace(old, new, 1)

old = "const cacheText = typeof row.cacheHit === 'boolean' ? `캐시 ${row.cacheHit ? 'HIT' : 'MISS'}` : '';"
new = "const cacheText = requestCacheDetailText(row);"
if ledger_text.count(old) != 1:
    raise SystemExit('recent request cache text drifted')
ledger_text = ledger_text.replace(old, new, 1)
write(ledger, ledger_text)

# 4) Aggregate usage/analytics cache token fields already exposed by Bridge 1.6.5.
usage = SRC / '16-usage-analytics.part.js'
usage_text = read(usage)
old = """      cacheCount:num(row?.cacheCount ?? row?.cache_count) ? Number(row.cacheCount ?? row.cache_count) : null,
      cacheRate:num(row?.cacheRate ?? row?.cache_rate) ? Number(row.cacheRate ?? row.cache_rate) : null
"""
new = """      cacheCount:num(row?.cacheCount ?? row?.cache_count) ? Number(row.cacheCount ?? row.cache_count) : null,
      cacheRate:num(row?.cacheRate ?? row?.cache_rate) ? Number(row.cacheRate ?? row.cache_rate) : null,
      cachedInputTokens:num(row?.cachedInputTokens ?? row?.cached_input_tokens ?? row?.cachedTokens ?? row?.cached_tokens) ? Number(row.cachedInputTokens ?? row.cached_input_tokens ?? row.cachedTokens ?? row.cached_tokens) : null,
      cacheReadInputTokens:num(row?.cacheReadInputTokens ?? row?.cache_read_input_tokens ?? row?.cachedTokens ?? row?.cached_tokens) ? Number(row.cacheReadInputTokens ?? row.cache_read_input_tokens ?? row.cachedTokens ?? row.cached_tokens) : null,
      cacheCreationInputTokens:num(row?.cacheCreationInputTokens ?? row?.cache_creation_input_tokens ?? row?.cacheWriteTokens ?? row?.cache_write_tokens) ? Number(row.cacheCreationInputTokens ?? row.cache_creation_input_tokens ?? row.cacheWriteTokens ?? row.cache_write_tokens) : null
"""
if usage_text.count(old) != 1:
    raise SystemExit('aggregate row cache fields drifted')
usage_text = usage_text.replace(old, new, 1)

old = """    const cacheCount = num(raw.cacheCount) ? Number(raw.cacheCount) : null;
    const cacheRate = num(raw.cacheRate) ? Number(raw.cacheRate) : null;
"""
new = """    const cacheCount = num(raw.cacheCount) ? Number(raw.cacheCount) : null;
    const cacheRate = num(raw.cacheRate) ? Number(raw.cacheRate) : null;
    const cachedInputTokens = num(raw.cachedInputTokens ?? raw.cached_input_tokens ?? raw.cachedTokens ?? raw.cached_tokens) ? Number(raw.cachedInputTokens ?? raw.cached_input_tokens ?? raw.cachedTokens ?? raw.cached_tokens) : null;
    const cacheReadInputTokens = num(raw.cacheReadInputTokens ?? raw.cache_read_input_tokens ?? raw.cachedTokens ?? raw.cached_tokens) ? Number(raw.cacheReadInputTokens ?? raw.cache_read_input_tokens ?? raw.cachedTokens ?? raw.cached_tokens) : null;
    const cacheCreationInputTokens = num(raw.cacheCreationInputTokens ?? raw.cache_creation_input_tokens ?? raw.cacheWriteTokens ?? raw.cache_write_tokens) ? Number(raw.cacheCreationInputTokens ?? raw.cache_creation_input_tokens ?? raw.cacheWriteTokens ?? raw.cache_write_tokens) : null;
"""
if usage_text.count(old) != 1:
    raise SystemExit('aggregate cache metrics drifted')
usage_text = usage_text.replace(old, new, 1)

old = """    if (![totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate].some(num) && !providers.length && !models.length && !rawRecent.length) return null;
    return {totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate,providers,models,recent,recentLedger,recentSourceKey,recentRawCount:rawRecent.length,fetchedAt:raw.fetchedAt || Date.now(),source:String(raw.source || 'LLMGateway scoped usage')};
"""
new = """    if (![totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate,cachedInputTokens,cacheReadInputTokens,cacheCreationInputTokens].some(num) && !providers.length && !models.length && !rawRecent.length) return null;
    return {totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate,cachedInputTokens,cacheReadInputTokens,cacheCreationInputTokens,providers,models,recent,recentLedger,recentSourceKey,recentRawCount:rawRecent.length,fetchedAt:raw.fetchedAt || Date.now(),source:String(raw.source || 'LLMGateway scoped usage')};
"""
if usage_text.count(old) != 1:
    raise SystemExit('aggregate cache return drifted')
usage_text = usage_text.replace(old, new, 1)
write(usage, usage_text)

# 5) Analytics cards: keep request-hit rate separate from token cache efficiency.
markup = SRC / '54-dashboard-markup.part.js'
markup_text = read(markup)
old = """          <div class=\"mini\"><span>캐시</span><b>${usageCacheText(analyticsW24)}</b></div>
          <div class=\"mini\"><span>7일 총 비용</span><b>${money(analyticsW7?.totalCost,4)}</b></div>
"""
new = """          <div class=\"mini\"><span>요청 캐시 HIT</span><b>${usageCacheText(analyticsW24)}</b></div>
          <div class=\"mini\"><span>Cache Read</span><b>${num(analyticsW24.cacheReadInputTokens) ? `${Number(analyticsW24.cacheReadInputTokens).toLocaleString()} tok` : '—'}</b></div>
          <div class=\"mini\"><span>Cache Write</span><b>${num(analyticsW24.cacheCreationInputTokens) ? `${Number(analyticsW24.cacheCreationInputTokens).toLocaleString()} tok` : '—'}</b></div>
          <div class=\"mini\"><span>Token Read Ratio</span><b>${num(analyticsW24.cacheReadInputTokens) && (Number(analyticsW24.inputTokens || 0) + Number(analyticsW24.cacheReadInputTokens || 0) + Number(analyticsW24.cacheCreationInputTokens || 0)) > 0 ? `${(Number(analyticsW24.cacheReadInputTokens) / (Number(analyticsW24.inputTokens || 0) + Number(analyticsW24.cacheReadInputTokens || 0) + Number(analyticsW24.cacheCreationInputTokens || 0)) * 100).toFixed(1)}%` : '—'}</b></div>
          <div class=\"mini\"><span>7일 총 비용</span><b>${money(analyticsW7?.totalCost,4)}</b></div>
"""
if markup_text.count(old) != 1:
    raise SystemExit('analytics cache cards drifted')
markup_text = markup_text.replace(old, new, 1)
write(markup, markup_text)

# 6) Diagnostics: cache token fidelity/coverage, separate from Bridge's own internal cache.
diag = SRC / '40-diagnostics.part.js'
diag_text = read(diag)
old = """    const diagLedgerFidelity = requestLedgerCapabilities(diagLedgerRows);
    const diagDevpassRows = requestLedgerRowsForScope('devpass');
"""
new = """    const diagLedgerFidelity = requestLedgerCapabilities(diagLedgerRows);
    const diagCacheObservability = requestCacheObservabilityStats(diagLedgerRows);
    const diagDevpassRows = requestLedgerRowsForScope('devpass');
"""
if diag_text.count(old) != 1:
    raise SystemExit('diagnostic cache context drifted')
diag_text = diag_text.replace(old, new, 1)

old = """      `Request fidelity: exact ${diagLedgerFidelity.exact}/${diagLedgerFidelity.rows} · bucket ${diagLedgerFidelity.bucket}/${diagLedgerFidelity.rows} · cache known ${diagLedgerFidelity.cacheKnown}/${diagLedgerFidelity.rows} · ids ${diagLedgerFidelity.ids}/${diagLedgerFidelity.rows}`,
      `Service tier fidelity: requested known ${diagTierFidelity.requestedKnown}/${diagTierFidelity.rows} · served known ${diagTierFidelity.servedKnown}/${diagTierFidelity.rows} · served flex ${diagTierFidelity.flex} · standard ${diagTierFidelity.standard} · priority ${diagTierFidelity.priority} · unknown ${diagTierFidelity.unknown}`,
"""
new = """      `Request fidelity: exact ${diagLedgerFidelity.exact}/${diagLedgerFidelity.rows} · bucket ${diagLedgerFidelity.bucket}/${diagLedgerFidelity.rows} · cache known ${diagLedgerFidelity.cacheKnown}/${diagLedgerFidelity.rows} · cache tokens ${diagLedgerFidelity.cacheTokenKnown}/${diagLedgerFidelity.rows} · ids ${diagLedgerFidelity.ids}/${diagLedgerFidelity.rows}`,
      `Cache observability: ${cacheObservabilitySummaryText(diagCacheObservability)} · token rows ${diagCacheObservability.tokenKnown}/${diagCacheObservability.rows} · 5m write ${Number(diagCacheObservability.cacheCreation5mTokens || 0).toLocaleString()} · 1h write ${Number(diagCacheObservability.cacheCreation1hTokens || 0).toLocaleString()}`,
      `Cache semantics: request HIT rate != token Read ratio · unknown stays unknown · source request metadata / Bridge aggregates`,
      `Service tier fidelity: requested known ${diagTierFidelity.requestedKnown}/${diagTierFidelity.rows} · served known ${diagTierFidelity.servedKnown}/${diagTierFidelity.rows} · served flex ${diagTierFidelity.flex} · standard ${diagTierFidelity.standard} · priority ${diagTierFidelity.priority} · unknown ${diagTierFidelity.unknown}`,
"""
if diag_text.count(old) != 1:
    raise SystemExit('diagnostic cache line drifted')
diag_text = diag_text.replace(old, new, 1)
write(diag, diag_text)

# 7) Move exact-version tests forward while preserving all prior regressions.
for path in TESTS.rglob('*.cjs'):
    text = read(path)
    if OLD_VERSION in text:
        write(path, text.replace(OLD_VERSION, NEW_VERSION))

# Dedicated cache-observability regression using normalized usage shapes, not Provider Manager storage.
cache_test = TESTS / 'p7-cache-observability.cjs'
cache_test.write_text("""const fs = require('node:fs');
const assert = require('node:assert/strict');
const root = 'plugins/usage-dashboard';
const normalize = fs.readFileSync(`${root}/src/10-request-normalize.part.js`, 'utf8');
const ledger = fs.readFileSync(`${root}/src/14-request-ledger.part.js`, 'utf8');
const usage = fs.readFileSync(`${root}/src/16-usage-analytics.part.js`, 'utf8');
const diag = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
const markup = fs.readFileSync(`${root}/src/54-dashboard-markup.part.js`, 'utf8');
const latest = fs.readFileSync(`${root}/latest.js`, 'utf8');

for (const marker of [
  'function requestCacheMetrics(row)',
  'cacheReadInputTokens',
  'cacheCreationInputTokens',
  'cacheCreation5mTokens',
  'cacheCreation1hTokens',
  'cacheReadRatio'
]) assert.ok(normalize.includes(marker), `missing cache normalize marker: ${marker}`);
assert.ok(ledger.includes('function requestCacheObservabilityStats(rows)'));
assert.ok(ledger.includes('requestCacheDetailText(row)'));
assert.ok(!/requestLedgerKey[\\s\\S]{0,600}cacheReadInputTokens/.test(ledger), 'cache enrichment must not fragment ledger dedupe key');
assert.ok(usage.includes('cachedInputTokens'));
assert.ok(usage.includes('cacheReadInputTokens'));
assert.ok(usage.includes('cacheCreationInputTokens'));
assert.ok(diag.includes('Cache observability:'));
assert.ok(diag.includes('request HIT rate != token Read ratio'));
assert.ok(markup.includes('요청 캐시 HIT'));
assert.ok(markup.includes('Cache Read'));
assert.ok(markup.includes('Cache Write'));
assert.ok(markup.includes('Token Read Ratio'));
assert.ok(latest.includes('//@version 3.0.0-alpha.5.47'));
console.log('usage-dashboard P7 cache observability: OK · hit/read/write semantics locked');
""")

print(f'prepared Local Usage Dashboard {NEW_VERSION} cache observability; Provider Manager remains caller, private storage untouched')
