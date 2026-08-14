from pathlib import Path

p = Path('plugins/usage-dashboard/latest.js')
s = p.read_text()

SOURCE = '3.0.0-alpha.4.3'
TARGET = '3.0.0-alpha.4.4'

if f'//@version {TARGET}' in s and f"const VERSION = '{TARGET}';" in s:
    print('latest.js already matches alpha.4.4')
    raise SystemExit(0)
if f'//@version {SOURCE}' not in s or f"const VERSION = '{SOURCE}';" not in s:
    raise SystemExit('latest.js is not exact alpha.4.3 or alpha.4.4')

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
one(
    'recent filter default',
    "    usageScopeView: 'all',\n    analyticsScopeView: 'all',",
    "    usageScopeView: 'all',\n    recentRequestFilter: 'all',\n    analyticsScopeView: 'all',"
)

start = s.index('  function scopeUsageDetailsHtml(scopeActivity) {')
end = s.index('\n  function normalizeScopeActivity(raw) {', start)
new_scope_details = r'''  function scopeUsageDetailsHtml(scopeActivity) {
    if (!scopeActivity) return '';
    const aggregateMetaItems = row => [
      num(row?.totalTokens) ? `토큰 ${Number(row.totalTokens).toLocaleString()}` : '',
      num(row?.errorRate)
        ? `오류 ${Number(row.errorRate).toFixed(1)}%${num(row?.errorCount) ? ` · ${Number(row.errorCount).toLocaleString()}회` : ''}`
        : num(row?.errorCount) ? `오류 ${Number(row.errorCount).toLocaleString()}회` : '',
      num(row?.cacheRate)
        ? `캐시 ${Number(row.cacheRate).toFixed(1)}%${num(row?.cacheCount) ? ` · ${Number(row.cacheCount).toLocaleString()}회` : ''}`
        : num(row?.cacheCount) ? `캐시 ${Number(row.cacheCount).toLocaleString()}회` : ''
    ].filter(Boolean);
    const aggregateRows = rows => (Array.isArray(rows) ? rows : []).slice(0, 8).map(row => {
      const chips = aggregateMetaItems(row).map(item => `<span class="stat-chip">${item}</span>`).join('');
      return `<div class="usage-detail-row"><div><b>${esc(row?.name || 'Unknown')}</b>${chips ? `<small class="aggregate-meta">${chips}</small>` : ''}</div><span>${Number(row?.requests || 0).toLocaleString()}회 · ${money(row?.cost,4)}</span></div>`;
    }).join('');
    const providers = aggregateRows(scopeActivity.providers);
    const models = aggregateRows(scopeActivity.models);
    const recentFilter = ['all','success','error'].includes(String(state.recentRequestFilter)) ? String(state.recentRequestFilter) : 'all';
    const recentAll = Array.isArray(scopeActivity.recent) ? scopeActivity.recent : [];
    const recentCounts = {
      all:recentAll.length,
      success:recentAll.filter(row => row.success).length,
      error:recentAll.filter(row => !row.success).length
    };
    const recentRows = recentAll.filter(row => recentFilter === 'all' || (recentFilter === 'success' ? row.success : !row.success));
    const recentHtml = recentRows.map(row => {
      const numberText = row.requestNumber ? `#${esc(row.requestNumber)} · ` : '';
      const resultText = row.success
        ? '성공'
        : ['오류', row.errorCode ? esc(row.errorCode) : '', row.errorType ? esc(row.errorType) : ''].filter(Boolean).join(' · ');
      const cacheText = typeof row.cacheHit === 'boolean' ? `캐시 ${row.cacheHit ? 'HIT' : 'MISS'}` : '';
      const usageText = [resultText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', cacheText].filter(Boolean).join(' · ');
      return `<div class="request-detail-row"><div class="request-main"><b>${numberText}${esc(row.provider)}</b><span class="request-model">${esc(row.model)}</span><span>${row.timestamp ? dashboardDateText(row.timestamp) : '시간 미제공'}</span></div><em class="${row.success ? 'ok-text' : 'error-text'}">${usageText}</em></div>`;
    }).join('');
    const sourceRows = Number(scopeActivity.recentRawCount || 0);
    const filterEmpty = recentAll.length > 0 ? '이 필터에 해당하는 최근 요청 없음'
      : sourceRows > 0 ? `요청 단위 메타데이터 없음 · source rows ${sourceRows}`
      : 'Bridge가 최근 요청 메타데이터를 아직 제공하지 않음';
    const filterButton = (key, label, count) => `<button class="recent-filter-btn ${recentFilter===key?'active':''}" data-recent-filter="${key}">${label} ${count}</button>`;
    return `<div class="usage-detail-grid"><div class="usage-detail-box"><h3>Provider · 요청 / 비용 / 효율</h3>${providers || '<p>데이터 없음</p>'}</div><div class="usage-detail-box"><h3>Model · 요청 / 비용 / 효율</h3>${models || '<p>데이터 없음</p>'}</div></div><div class="usage-detail-box recent-requests"><div class="recent-head"><h3>최근 요청 · 메타데이터</h3><span>${recentRows.length}/${recentCounts.all}</span></div><div class="recent-filter" role="tablist" aria-label="최근 요청 필터">${filterButton('all','전체',recentCounts.all)}${filterButton('success','성공',recentCounts.success)}${filterButton('error','오류',recentCounts.error)}</div>${recentHtml || `<p>${filterEmpty}</p>`}</div>`;
  }
'''
s = s[:start] + new_scope_details + s[end:]

css_start = s.index('      .usage-detail-grid{')
css_end = s.index('      .advanced-panel{', css_start)
new_css = r'''      .usage-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.usage-detail-box{background:var(--p2);border-radius:10px;padding:10px;margin-top:8px}.usage-detail-box h3{font-size:11px;margin:0;color:var(--m)}.usage-detail-box p{margin:8px 0 0}.usage-detail-row{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:7px 0;border-top:1px solid var(--l)}.usage-detail-row:first-of-type{border-top:0}.usage-detail-row>div{min-width:0;flex:1}.usage-detail-row b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.usage-detail-row>span{color:var(--m);font-size:11px;white-space:nowrap}.aggregate-meta{display:flex!important;flex-wrap:wrap;gap:4px;margin-top:4px}.stat-chip{display:inline-flex!important;width:auto;background:#181a1f;border:1px solid var(--l);border-radius:999px;padding:2px 6px;color:var(--m)!important;font-size:9px!important;line-height:1.35;white-space:nowrap}.recent-requests{margin-top:8px}.recent-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.recent-head>span{color:var(--m);font-size:10px}.recent-filter{display:flex;gap:5px;margin:8px 0 2px}.recent-filter-btn{padding:5px 8px;border-radius:999px;font-size:10px;line-height:1.2}.recent-filter-btn.active{background:var(--g);border-color:var(--g);color:#15170f}.request-detail-row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:8px 0;border-top:1px solid var(--l)}.request-detail-row:first-of-type{border-top:0}.request-main{min-width:0;flex:1}.request-detail-row b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.request-detail-row span{display:block;color:var(--m);font-size:10px;margin-top:2px}.request-detail-row .request-model{color:var(--t);font-size:11px;white-space:normal;overflow-wrap:anywhere}.request-detail-row em{font-style:normal;color:var(--m);font-size:11px;text-align:right;white-space:nowrap}.request-detail-row em.error-text{color:var(--e)}.request-detail-row em.ok-text{color:var(--m)}
'''
s = s[:css_start] + new_css + s[css_end:]

old_media = '      @media(max-width:680px){.grid{grid-template-columns:1fr}.wide{grid-column:auto}.minis,.today-grid{grid-template-columns:1fr 1fr}.usage-detail-grid{grid-template-columns:1fr}.request-detail-row{align-items:flex-start;flex-direction:column}.request-detail-row em{text-align:left;white-space:normal}}'
new_media = '      @media(max-width:680px){.shell{padding:10px}.grid{grid-template-columns:1fr;gap:8px}.wide{grid-column:auto}.panel{padding:11px}.minis,.today-grid{grid-template-columns:1fr 1fr;gap:6px}.usage-detail-grid{grid-template-columns:1fr;gap:6px}.usage-detail-box{padding:9px;margin-top:6px}.usage-detail-row{padding:6px 0}.request-detail-row{flex-direction:row;gap:8px;padding:7px 0}.request-main{max-width:58%}.request-detail-row b{font-size:12px}.request-detail-row .request-model{font-size:10px}.request-detail-row em{max-width:42%;font-size:10px;text-align:right;white-space:normal}.recent-filter{gap:4px}.recent-filter-btn{padding:5px 7px;font-size:10px}.aggregate-meta{gap:3px}.stat-chip{padding:2px 5px;font-size:8.5px!important}}'
one('mobile density', old_media, new_media)

usage_handler_anchor = r'''    document.querySelectorAll('[data-analytics-scope]').forEach(button => {
'''
recent_handler = r'''    document.querySelectorAll('[data-recent-filter]').forEach(button => {
      button.onclick = async () => {
        const next = String(button.getAttribute('data-recent-filter') || 'all');
        state.recentRequestFilter = ['all','success','error'].includes(next) ? next : 'all';
        await persist();
        renderSettings();
      };
    });
'''
if s.count(usage_handler_anchor) != 1:
    raise SystemExit('analytics handler anchor mismatch')
s = s.replace(usage_handler_anchor, recent_handler + usage_handler_anchor, 1)

ui_diag = "      `UI layout: usage-first · aggregate enriched · recent metadata · advanced collapsed`,"
if s.count(ui_diag) != 1:
    raise SystemExit('UI diagnostics anchor mismatch')
s = s.replace(ui_diag, ui_diag + "\n      `Recent UI: filter ${['all','success','error'].includes(String(state.recentRequestFilter)) ? state.recentRequestFilter : 'all'} · aggregate chips · mobile compact`,", 1)

widget_start_after = s.index('  function widgetHtml() {')
widget_end_after = s.index('  const widgetWidth = () =>', widget_start_after)
if s[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('alpha.4.4 must not change floating widget HTML')

for marker in [
    f'//@version {TARGET}',
    f"const VERSION = '{TARGET}';",
    "recentRequestFilter: 'all'",
    "const recentFilter = ['all','success','error'].includes(String(state.recentRequestFilter))",
    'data-recent-filter=',
    'class="recent-filter"',
    'class="stat-chip"',
    'Provider · 요청 / 비용 / 효율',
    'Model · 요청 / 비용 / 효율',
    '최근 요청 · 메타데이터',
    "state.recentRequestFilter = ['all','success','error'].includes(next) ? next : 'all';",
    'Recent UI: filter ${',
    '.request-detail-row{flex-direction:row',
    'UI layout: usage-first · aggregate enriched · recent metadata · advanced collapsed',
    'Resume route: requested',
    'Bridge module freshness:',
    "Risuai.registerButton({name:'Usage',icon:'📊',iconType:'html',location:'chat'",
]:
    if marker not in s:
        raise SystemExit('missing marker: ' + marker)

p.write_text(s)
print('alpha.4.4 P3 recent/mobile patch applied')
