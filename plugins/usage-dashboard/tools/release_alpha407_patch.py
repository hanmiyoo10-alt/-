from pathlib import Path

ROOT = Path('plugins/usage-dashboard/src')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, got {count}')
    return text.replace(old, new, 1)


# 00 runtime/core: version + persisted rolling request-ledger state.
p = ROOT / '00-runtime-core.part.js'
s = p.read_text()
s = replace_once(s, '//@version 3.0.0-alpha.4.6', '//@version 3.0.0-alpha.4.7', 'metadata version')
s = replace_once(s, "const VERSION = '3.0.0-alpha.4.6';", "const VERSION = '3.0.0-alpha.4.7';", 'runtime version')
s = replace_once(
    s,
    "    recentRequestFilter: 'all',\n    analyticsScopeView: 'all',",
    "    recentRequestFilter: 'all',\n    selectedHourKey: '',\n    requestLedger: [],\n    requestLedgerStartedAt: null,\n    analyticsScopeView: 'all',",
    'request ledger defaults',
)
p.write_text(s)


# 10 usage/data: keep the normal 12-row recent UI while exposing a larger
# metadata-only seed for the local rolling 24h ledger; add hourly grouping UI.
p = ROOT / '10-usage-data.part.js'
s = p.read_text()
s = replace_once(s, '  function normalizeRecentRequestRows(rows) {', '  function normalizeRecentRequestRows(rows, limit = 12) {', 'recent normalizer limit')
s = replace_once(
    s,
    ").filter(Boolean).sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0)).slice(0, 12);",
    ").filter(Boolean).sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0)).slice(0, Math.max(1, Number(limit) || 12));",
    'recent normalizer slice',
)
helper_marker = '  function scopeUsageDetailsHtml(scopeActivity) {'
helpers = r'''  function requestLedgerKey(row) {
    return [
      Number(row?.timestamp || 0),
      String(row?.requestNumber || ''),
      String(row?.provider || 'Unknown'),
      String(row?.model || 'Unknown'),
      num(row?.cost) ? Number(row.cost) : '',
      num(row?.totalTokens) ? Number(row.totalTokens) : '',
      row?.success === false ? 'error' : 'success',
      String(row?.errorCode || ''),
      String(row?.errorType || '')
    ].join('|');
  }

  function collectRecentRequestLedger(data) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const byKey = new Map();
    for (const row of (Array.isArray(state.requestLedger) ? state.requestLedger : [])) {
      if (!row || !num(row.timestamp) || Number(row.timestamp) < cutoff) continue;
      byKey.set(requestLedgerKey(row), {...row, scopes:Array.isArray(row.scopes) ? row.scopes : ['all']});
    }
    let observed = 0;
    for (const scopeKey of ['all','devpass','credits']) {
      const scope = data?.usageScopes?.scopes?.[scopeKey];
      const rows = Array.isArray(scope?.recentLedger) ? scope.recentLedger : (Array.isArray(scope?.recent) ? scope.recent : []);
      for (const row of rows) {
        if (!row || !num(row.timestamp) || Number(row.timestamp) < cutoff) continue;
        const key = requestLedgerKey(row);
        const current = byKey.get(key) || null;
        const scopes = new Set([...(Array.isArray(current?.scopes) ? current.scopes : []), scopeKey]);
        byKey.set(key, {
          ...(current || {}),
          ...row,
          cost:num(row.cost) ? Number(row.cost) : (num(current?.cost) ? Number(current.cost) : null),
          totalTokens:num(row.totalTokens) ? Number(row.totalTokens) : (num(current?.totalTokens) ? Number(current.totalTokens) : null),
          cacheHit:typeof row.cacheHit === 'boolean' ? row.cacheHit : (typeof current?.cacheHit === 'boolean' ? current.cacheHit : null),
          requestNumber:String(row.requestNumber || current?.requestNumber || ''),
          errorCode:String(row.errorCode || current?.errorCode || ''),
          errorType:String(row.errorType || current?.errorType || ''),
          scopes:Array.from(scopes)
        });
        observed += 1;
      }
    }
    state.requestLedger = Array.from(byKey.values())
      .sort((a,b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
      .slice(0, 2000);
    if (observed > 0 && !num(state.requestLedgerStartedAt)) state.requestLedgerStartedAt = Date.now();
  }

  function requestLedgerRowsForScope(scopeKey) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const key = ['all','devpass','credits'].includes(String(scopeKey)) ? String(scopeKey) : 'all';
    return (Array.isArray(state.requestLedger) ? state.requestLedger : [])
      .filter(row => row && num(row.timestamp) && Number(row.timestamp) >= cutoff)
      .filter(row => key === 'all' || (Array.isArray(row.scopes) && row.scopes.includes(key)))
      .sort((a,b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
  }

  function requestHourKey(timestamp) {
    if (!num(timestamp)) return '';
    const d = new Date(Number(timestamp) + 9 * 60 * 60 * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const h = String(d.getUTCHours()).padStart(2, '0');
    return `${y}-${m}-${day}T${h}`;
  }

  function requestHourLabel(key) {
    const match = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})$/);
    if (!match) return key || '시간 미제공';
    const [,y,m,d,h] = match;
    const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-${String(now.getUTCDate()).padStart(2,'0')}`;
    const date = `${y}-${m}-${d}`;
    return `${date === today ? '오늘' : `${Number(m)}/${Number(d)}`} ${Number(h)}시`;
  }

  function requestExactTime(timestamp) {
    if (!num(timestamp)) return '시간 미제공';
    return new Date(Number(timestamp)).toLocaleTimeString('ko-KR', {timeZone:KST_TIME_ZONE,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
  }

  function hourlyRequestDrilldownHtml(scopeKey) {
    const rows = requestLedgerRowsForScope(scopeKey);
    if (!rows.length) {
      return `<div class="usage-detail-box hourly-ledger"><div class="recent-head"><h3>시간별 요청 · 24h 로컬 관측</h3><span>0건</span></div><p>아직 누적된 요청 메타데이터가 없어. 앱이 받은 recent 요청부터 자동으로 쌓여.</p></div>`;
    }
    const groups = new Map();
    for (const row of rows) {
      const key = requestHourKey(row.timestamp);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    const selectedKey = groups.has(String(state.selectedHourKey || '')) ? String(state.selectedHourKey) : '';
    const hourRows = Array.from(groups.entries()).sort((a,b) => b[0].localeCompare(a[0])).map(([key, hour]) => {
      const costRows = hour.filter(row => num(row.cost));
      const totalCost = costRows.reduce((sum,row) => sum + Number(row.cost), 0);
      const cacheRows = hour.filter(row => typeof row.cacheHit === 'boolean');
      const cacheHits = cacheRows.filter(row => row.cacheHit).length;
      const cacheRate = cacheRows.length ? cacheHits / cacheRows.length * 100 : null;
      const errors = hour.filter(row => row.success === false).length;
      const cacheText = cacheRate === null ? '캐시 —' : `캐시 ${cacheRate.toFixed(1)}%`;
      const errorText = errors ? ` · 오류 ${errors}` : '';
      return `<button class="hour-row ${selectedKey===key?'active':''}" data-usage-hour="${esc(key)}"><span><b>${esc(requestHourLabel(key))}</b><small>${hour.length}회 · ${costRows.length ? money(totalCost,4) : '비용 —'}</small></span><em>${cacheText}${errorText}</em></button>`;
    }).join('');

    let selectedHtml = '';
    if (selectedKey) {
      const selected = groups.get(selectedKey) || [];
      const costRows = selected.filter(row => num(row.cost));
      const totalCost = costRows.reduce((sum,row) => sum + Number(row.cost), 0);
      const tokenRows = selected.filter(row => num(row.totalTokens));
      const totalTokens = tokenRows.reduce((sum,row) => sum + Number(row.totalTokens), 0);
      const cacheRows = selected.filter(row => typeof row.cacheHit === 'boolean');
      const cacheHits = cacheRows.filter(row => row.cacheHit).length;
      const cacheRate = cacheRows.length ? cacheHits / cacheRows.length * 100 : null;
      const errors = selected.filter(row => row.success === false).length;
      const summary = [
        `${selected.length}회`,
        costRows.length ? money(totalCost,4) : '비용 —',
        tokenRows.length ? `${totalTokens.toLocaleString()} tok` : '토큰 —',
        cacheRate === null ? '캐시 —' : `캐시 ${cacheRate.toFixed(1)}% · HIT ${cacheHits}/${cacheRows.length}`,
        errors ? `오류 ${errors}` : '오류 0'
      ].join(' · ');
      const visible = selected.slice(0, 300);
      const detailRows = visible.map(row => {
        const numberText = row.requestNumber ? `#${esc(row.requestNumber)} · ` : '';
        const resultText = row.success === false
          ? ['오류', row.errorCode ? esc(row.errorCode) : '', row.errorType ? esc(row.errorType) : ''].filter(Boolean).join(' · ')
          : '성공';
        const cacheText = typeof row.cacheHit === 'boolean' ? `캐시 ${row.cacheHit ? 'HIT' : 'MISS'}` : '';
        const usageText = [resultText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', cacheText].filter(Boolean).join(' · ');
        return `<div class="request-detail-row hour-request-row"><div class="request-main"><b>${numberText}${esc(row.provider)}</b><span class="request-model">${esc(row.model)}</span><span>${esc(requestExactTime(row.timestamp))}</span></div><em class="${row.success === false ? 'error-text' : 'ok-text'}">${usageText}</em></div>`;
      }).join('');
      const truncated = selected.length > visible.length ? `<p>성능 보호로 최신 ${visible.length}/${selected.length}건 표시</p>` : '';
      selectedHtml = `<div class="hour-detail"><div class="recent-head"><h3>${esc(requestHourLabel(selectedKey))} 요청별 상세</h3><span>${esc(summary)}</span></div>${detailRows}${truncated}</div>`;
    }

    return `<div class="usage-detail-box hourly-ledger"><div class="recent-head"><h3>시간별 요청 · 24h 로컬 관측</h3><span>${rows.length}건 · ${groups.size}시간</span></div><p>앱이 받은 recent 메타데이터를 24시간 동안 중복 제거해 누적 · 프롬프트/응답 미저장</p><div class="hour-list">${hourRows}</div>${selectedHtml}</div>`;
  }

'''
s = replace_once(s, helper_marker, helpers + helper_marker, 'hourly helper insertion')
s = replace_once(
    s,
    '    const recent = normalizeRecentRequestRows(rawRecent);',
    '    const recent = normalizeRecentRequestRows(rawRecent);\n    const recentLedger = normalizeRecentRequestRows(rawRecent, 200);',
    'ledger seed normalization',
)
s = replace_once(
    s,
    'return {totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate,providers,models,recent,recentRawCount:rawRecent.length,',
    'return {totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate,providers,models,recent,recentLedger,recentRawCount:rawRecent.length,',
    'scope return ledger seed',
)
# Append hourly drilldown to the existing recent/aggregate HTML without rewriting its logic.
start = s.index('  function scopeUsageDetailsHtml(scopeActivity) {')
end = s.index('  function normalizeScopeActivity(raw) {', start)
block = s[start:end]
needle = '    return `<div class="usage-detail-grid"'
pos = block.rfind(needle)
if pos < 0:
    raise SystemExit('scope detail return not found')
block = block[:pos] + block[pos:].replace('    return `', '    const baseHtml = `', 1)
closing = '\n  }\n\n'
if not block.endswith(closing):
    raise SystemExit('scope detail function boundary unexpected')
block = block[:-len(closing)] + "\n    const scopeKey = ['all','devpass','credits'].includes(String(state.usageScopeView)) ? String(state.usageScopeView) : 'all';\n    return baseHtml + hourlyRequestDrilldownHtml(scopeKey);\n  }\n\n"
s = s[:start] + block + s[end:]
p.write_text(s)


# 30 refresh: persist newly observed recent metadata into the rolling ledger.
p = ROOT / '30-refresh-runtime.part.js'
s = p.read_text()
s = replace_once(
    s,
    '        state.data = applyObservedToday(await fetchSnapshot());',
    '        state.data = applyObservedToday(await fetchSnapshot());\n        collectRecentRequestLedger(state.data);',
    'collect request ledger after snapshot',
)
p.write_text(s)


# 50 settings UI: styles for clickable hour rows and selected-hour detail.
p = ROOT / '50-settings-ui.part.js'
s = p.read_text()
css_marker = '      .request-detail-row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:8px 0;border-top:1px solid var(--l)}'
css_insert = '''      .hourly-ledger{margin-top:8px}.hour-list{display:grid;gap:5px;margin-top:8px}.hour-row{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;background:#181a1f;padding:8px 9px}.hour-row.active{border-color:var(--g);background:#20251a}.hour-row span{min-width:0}.hour-row b{display:block}.hour-row small{display:block;color:var(--m);font-size:9px;margin-top:2px}.hour-row em{font-style:normal;color:var(--m);font-size:10px;white-space:nowrap}.hour-detail{margin-top:9px;padding-top:9px;border-top:1px solid var(--l)}.hour-detail>.recent-head span{white-space:normal;text-align:right}.hour-request-row:last-child{padding-bottom:0}\n'''
s = replace_once(s, css_marker, css_insert + css_marker, 'hourly CSS')
p.write_text(s)


# 60 settings runtime: click-to-expand selected hour and include ledger in JSON export.
p = ROOT / '60-settings-runtime.part.js'
s = p.read_text()
handler_marker = "    document.querySelectorAll('[data-analytics-scope]').forEach(button => {"
handler = r'''    document.querySelectorAll('[data-usage-hour]').forEach(button => {
      button.onclick = async () => {
        const key = String(button.getAttribute('data-usage-hour') || '');
        state.selectedHourKey = state.selectedHourKey === key ? '' : key;
        await persist();
        renderSettings();
      };
    });
'''
s = replace_once(s, handler_marker, handler + handler_marker, 'hour click handler')
s = replace_once(
    s,
    "        usage: state.data || null,\n        dailyUsage: state.dailyUsage || null,",
    "        usage: state.data || null,\n        requestLedger: Array.isArray(state.requestLedger) ? state.requestLedger : [],\n        dailyUsage: state.dailyUsage || null,",
    'export request ledger',
)
p.write_text(s)


# 40 diagnostics: runtime coverage for the local 24h ledger/drilldown.
p = ROOT / '40-diagnostics.part.js'
s = p.read_text()
s = replace_once(
    s,
    "    const diagUsage = d.usageScopes?.scopes?.[diagUsageKey] || null;",
    "    const diagUsage = d.usageScopes?.scopes?.[diagUsageKey] || null;\n    const diagLedgerRows = requestLedgerRowsForScope(diagUsageKey);\n    const diagLedgerHours = new Set(diagLedgerRows.map(row => requestHourKey(row.timestamp)).filter(Boolean)).size;",
    'hourly diagnostic vars',
)
needle = "      `Recent UI: filter ${['all','success','error'].includes(String(state.recentRequestFilter)) ? state.recentRequestFilter : 'all'} · aggregate chips · mobile compact`,"
addition = needle + "\n      `Request ledger: rows ${diagLedgerRows.length} · hours ${diagLedgerHours} · 24h local observed · selected ${state.selectedHourKey || 'none'} · since ${state.requestLedgerStartedAt ? age(state.requestLedgerStartedAt) : '—'}`,\n      `Hourly drilldown: local observed · selected-hour lazy render · request cache HIT/MISS`,"
s = replace_once(s, needle, addition, 'hourly diagnostics')
p.write_text(s)

print('alpha.4.7 hourly request drilldown patch applied')
