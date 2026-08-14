from pathlib import Path

p = Path('plugins/usage-dashboard/latest.js')
s = p.read_text()

SOURCE = '3.0.0-alpha.4.2'
TARGET = '3.0.0-alpha.4.3'

if f'//@version {TARGET}' in s and f"const VERSION = '{TARGET}';" in s:
    print('latest.js already matches alpha.4.3')
    raise SystemExit(0)
if f'//@version {SOURCE}' not in s or f"const VERSION = '{SOURCE}';" not in s:
    raise SystemExit('latest.js is not exact alpha.4.2 or alpha.4.3')

widget_start = s.index('  function widgetHtml() {')
widget_end = s.index('  const widgetWidth = () =>', widget_start)
widget_before = s[widget_start:widget_end]


def one(label, old, new):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: patch anchor count={count}')
    s = s.replace(old, new, 1)


one('meta version', f'//@version {SOURCE}', f'//@version {TARGET}')
one('runtime version', f"const VERSION = '{SOURCE}';", f"const VERSION = '{TARGET}';")

old_scope_details = r'''  function scopeUsageDetailsHtml(scopeActivity) {
    if (!scopeActivity) return '';
    const aggregateRows = rows => (Array.isArray(rows) ? rows : []).slice(0, 8).map(row =>
      `<div class="usage-detail-row"><b>${esc(row?.name || 'Unknown')}</b><span>${Number(row?.requests || 0).toLocaleString()}회 · ${money(row?.cost,4)}</span></div>`
    ).join('');
    const providers = aggregateRows(scopeActivity.providers);
    const models = aggregateRows(scopeActivity.models);
    const recentRows = (Array.isArray(scopeActivity.recent) ? scopeActivity.recent : []).map(row => {
      const numberText = row.requestNumber ? `#${esc(row.requestNumber)} · ` : '';
      const resultText = row.success
        ? '성공'
        : ['오류', row.errorCode ? esc(row.errorCode) : '', row.errorType ? esc(row.errorType) : ''].filter(Boolean).join(' · ');
      const usageText = [resultText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : ''].filter(Boolean).join(' · ');
      return `<div class="request-detail-row"><div><b>${numberText}${esc(row.provider)} · ${esc(row.model)}</b><span>${row.timestamp ? dashboardDateText(row.timestamp) : '시간 미제공'}</span></div><em>${usageText}</em></div>`;
    }).join('');
    const sourceRows = Number(scopeActivity.recentRawCount || 0);
    const emptyRecent = sourceRows > 0
      ? `요청 단위 메타데이터 없음 · source rows ${sourceRows}`
      : 'Bridge가 최근 요청 메타데이터를 아직 제공하지 않음';
    return `<div class="usage-detail-grid"><div class="usage-detail-box"><h3>Provider</h3>${providers || '<p>데이터 없음</p>'}</div><div class="usage-detail-box"><h3>Model</h3>${models || '<p>데이터 없음</p>'}</div></div><div class="usage-detail-box recent-requests"><h3>최근 요청 · 요청 단위</h3>${recentRows || `<p>${emptyRecent}</p>`}</div>`;
  }
'''
new_scope_details = r'''  function scopeUsageDetailsHtml(scopeActivity) {
    if (!scopeActivity) return '';
    const aggregateMetaText = row => [
      num(row?.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '',
      num(row?.errorCount) || num(row?.errorRate)
        ? `오류 ${num(row?.errorCount) ? `${Number(row.errorCount).toLocaleString()}회` : ''}${num(row?.errorRate) ? `${num(row?.errorCount) ? ' · ' : ''}${Number(row.errorRate).toFixed(1)}%` : ''}`
        : '',
      num(row?.cacheCount) || num(row?.cacheRate)
        ? `캐시 ${num(row?.cacheCount) ? `${Number(row.cacheCount).toLocaleString()}회` : ''}${num(row?.cacheRate) ? `${num(row?.cacheCount) ? ' · ' : ''}${Number(row.cacheRate).toFixed(1)}%` : ''}`
        : ''
    ].filter(Boolean).join(' · ');
    const aggregateRows = rows => (Array.isArray(rows) ? rows : []).slice(0, 8).map(row => {
      const meta = aggregateMetaText(row);
      return `<div class="usage-detail-row"><div><b>${esc(row?.name || 'Unknown')}</b>${meta ? `<small>${meta}</small>` : ''}</div><span>${Number(row?.requests || 0).toLocaleString()}회 · ${money(row?.cost,4)}</span></div>`;
    }).join('');
    const providers = aggregateRows(scopeActivity.providers);
    const models = aggregateRows(scopeActivity.models);
    const recentRows = (Array.isArray(scopeActivity.recent) ? scopeActivity.recent : []).map(row => {
      const numberText = row.requestNumber ? `#${esc(row.requestNumber)} · ` : '';
      const resultText = row.success
        ? '성공'
        : ['오류', row.errorCode ? esc(row.errorCode) : '', row.errorType ? esc(row.errorType) : ''].filter(Boolean).join(' · ');
      const cacheText = typeof row.cacheHit === 'boolean' ? `캐시 ${row.cacheHit ? 'HIT' : 'MISS'}` : '';
      const usageText = [resultText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', cacheText].filter(Boolean).join(' · ');
      return `<div class="request-detail-row"><div class="request-main"><b>${numberText}${esc(row.provider)}</b><span class="request-model">${esc(row.model)}</span><span>${row.timestamp ? dashboardDateText(row.timestamp) : '시간 미제공'}</span></div><em class="${row.success ? 'ok-text' : 'error-text'}">${usageText}</em></div>`;
    }).join('');
    const sourceRows = Number(scopeActivity.recentRawCount || 0);
    const emptyRecent = sourceRows > 0
      ? `요청 단위 메타데이터 없음 · source rows ${sourceRows}`
      : 'Bridge가 최근 요청 메타데이터를 아직 제공하지 않음';
    return `<div class="usage-detail-grid"><div class="usage-detail-box"><h3>Provider · 요청 / 비용 / 효율</h3>${providers || '<p>데이터 없음</p>'}</div><div class="usage-detail-box"><h3>Model · 요청 / 비용 / 효율</h3>${models || '<p>데이터 없음</p>'}</div></div><div class="usage-detail-box recent-requests"><h3>최근 요청 · 메타데이터</h3>${recentRows || `<p>${emptyRecent}</p>`}</div>`;
  }
'''
one('enriched usage detail renderer', old_scope_details, new_scope_details)

old_css = r'''      .usage-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.usage-detail-box{background:var(--p2);border-radius:10px;padding:10px;margin-top:8px}.usage-detail-box h3{font-size:11px;margin:0 0 7px;color:var(--m)}.usage-detail-box p{margin:0}.usage-detail-row{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--l)}.usage-detail-row:first-of-type{border-top:0}.usage-detail-row b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.usage-detail-row span{color:var(--m);font-size:11px;white-space:nowrap}.recent-requests{margin-top:8px}.request-detail-row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--l)}.request-detail-row:first-of-type{border-top:0}.request-detail-row>div{min-width:0}.request-detail-row b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.request-detail-row span{display:block;color:var(--m);font-size:10px;margin-top:2px}.request-detail-row em{font-style:normal;color:var(--m);font-size:11px;text-align:right;white-space:nowrap}
'''
new_css = r'''      .grid>.usage-primary{order:20}.grid>.activity-secondary{order:21}.grid>.analytics-panel{order:30}.grid>.advanced-panel{order:40}
      .usage-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.usage-detail-box{background:var(--p2);border-radius:10px;padding:10px;margin-top:8px}.usage-detail-box h3{font-size:11px;margin:0 0 7px;color:var(--m)}.usage-detail-box p{margin:0}.usage-detail-row{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:8px 0;border-top:1px solid var(--l)}.usage-detail-row:first-of-type{border-top:0}.usage-detail-row>div{min-width:0;flex:1}.usage-detail-row b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.usage-detail-row small{display:block;color:var(--m);font-size:10px;margin-top:2px;white-space:normal}.usage-detail-row>span{color:var(--m);font-size:11px;white-space:nowrap}.recent-requests{margin-top:8px}.request-detail-row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid var(--l)}.request-detail-row:first-of-type{border-top:0}.request-main{min-width:0;flex:1}.request-detail-row b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.request-detail-row span{display:block;color:var(--m);font-size:10px;margin-top:2px}.request-detail-row .request-model{color:var(--t);font-size:11px;white-space:normal;overflow-wrap:anywhere}.request-detail-row em{font-style:normal;color:var(--m);font-size:11px;text-align:right;white-space:nowrap}.request-detail-row em.error-text{color:var(--e)}.request-detail-row em.ok-text{color:var(--m)}
      .advanced-panel{padding:0;overflow:hidden}.advanced-panel>summary{display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;padding:13px;list-style:none}.advanced-panel>summary::-webkit-details-marker{display:none}.advanced-panel>summary span{color:var(--m);font-size:11px}.advanced-panel>summary:after{content:'펼치기';color:var(--m);font-size:10px;margin-left:auto}.advanced-panel[open]>summary:after{content:'접기'}.advanced-panel[open]>summary{border-bottom:1px solid var(--l)}.advanced-body{padding:0 13px 13px}
'''
one('P3 usage and advanced CSS', old_css, new_css)

one('activity secondary order', '<section class="panel wide"><b>24h Activity</b>', '<section class="panel wide activity-secondary"><b>24h Activity</b>')
one('usage primary order', '<section class="panel wide">\n        <div class="today-head"><div><b>24h Usage Scope</b>', '<section class="panel wide usage-primary">\n        <div class="today-head"><div><b>24h Usage Scope</b>')
one('analytics order', '<section class="panel wide">\n        <div class="today-head"><div><b>Analytics · 24h / 7d / 30d</b>', '<section class="panel wide analytics-panel">\n        <div class="today-head"><div><b>Analytics · 24h / 7d / 30d</b>')

one('Local Bridge collapsible start', '<section class="panel wide"><b>Local Bridge</b>', '<details class="panel wide advanced-panel"><summary><b>Local Bridge</b><span>연결 · 설정</span></summary><div class="advanced-body">')
one('Local Bridge close and diagnostics collapsible start', '</section>\n      <section class="panel wide"><b>Runtime Diagnostics</b>', '</div></details>\n      <details class="panel wide advanced-panel"><summary><b>Runtime Diagnostics</b><span>성능 · 진단</span></summary><div class="advanced-body">')
one('Runtime Diagnostics collapsible close', '<div class="actions"><button id="copy-diag">진단 복사</button><button id="export-json">JSON 내보내기</button></div></section>\n    </main></div>`;', '<div class="actions"><button id="copy-diag">진단 복사</button><button id="export-json">JSON 내보내기</button></div></div></details>\n    </main></div>`;')

usage_diag = "      `Usage detail: ${diagUsageKey} · providers ${Array.isArray(diagUsage?.providers) ? diagUsage.providers.length : 0} · models ${Array.isArray(diagUsage?.models) ? diagUsage.models.length : 0} · recent requests ${Array.isArray(diagUsage?.recent) ? diagUsage.recent.length : 0} · source rows ${Number(diagUsage?.recentRawCount || 0)} · cache ${usageCacheText(diagUsage)}`,” if False else None
# Use a stable neighboring line instead of evaluating JS syntax in Python.
old_diag = "      `Usage detail: ${diagUsageKey} · providers ${Array.isArray(diagUsage?.providers) ? diagUsage.providers.length : 0} · models ${Array.isArray(diagUsage?.models) ? diagUsage.models.length : 0} · recent requests ${Array.isArray(diagUsage?.recent) ? diagUsage.recent.length : 0} · source rows ${Number(diagUsage?.recentRawCount || 0)} · cache ${usageCacheText(diagUsage)}`,\n      `Runtime state:"
new_diag = "      `Usage detail: ${diagUsageKey} · providers ${Array.isArray(diagUsage?.providers) ? diagUsage.providers.length : 0} · models ${Array.isArray(diagUsage?.models) ? diagUsage.models.length : 0} · recent requests ${Array.isArray(diagUsage?.recent) ? diagUsage.recent.length : 0} · source rows ${Number(diagUsage?.recentRawCount || 0)} · cache ${usageCacheText(diagUsage)}`,\n      `UI layout: usage-first · aggregate enriched · recent metadata · advanced collapsed`,\n      `Runtime state:"
one('P3 diagnostics marker', old_diag, new_diag)

widget_start_after = s.index('  function widgetHtml() {')
widget_end_after = s.index('  const widgetWidth = () =>', widget_start_after)
if s[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('alpha.4.3 must not change floating widget HTML')

for marker in [
    f'//@version {TARGET}',
    f"const VERSION = '{TARGET}';",
    'function aggregateMetaText',
    'Provider · 요청 / 비용 / 효율',
    '최근 요청 · 메타데이터',
    '캐시 ${row.cacheHit ? \'HIT\' : \'MISS\'}',
    'class="panel wide usage-primary"',
    'class="panel wide activity-secondary"',
    'class="panel wide analytics-panel"',
    'class="panel wide advanced-panel"',
    'UI layout: usage-first · aggregate enriched · recent metadata · advanced collapsed',
    "Risuai.registerButton({name:'Usage',icon:'📊',iconType:'html',location:'chat'",
    'Resume route: requested',
    'Bridge module freshness:',
    'Bridge partial:',
    'release-usage-dashboard/plugins/usage-dashboard/latest.js',
]:
    if marker not in s:
        raise SystemExit('missing marker: ' + marker)

p.write_text(s)
print('alpha.4.3 P3 UI patch applied')
