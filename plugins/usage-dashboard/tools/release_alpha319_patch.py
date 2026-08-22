from pathlib import Path

path = Path('plugins/usage-dashboard/latest.js')
src = path.read_text()
if '//@version 3.0.0-alpha.3.18' not in src or "const VERSION = '3.0.0-alpha.3.18';" not in src:
    raise SystemExit('latest.js가 정확한 alpha.3.18이 아니야.')

widget_start = src.index('  function widgetHtml() {')
widget_end = src.index('  async function ensureWidget() {', widget_start)
widget_before = src[widget_start:widget_end]

def replace_once(label, old, new):
    global src
    if old not in src:
        raise SystemExit(f'{label} 패치 지점을 찾지 못했어.')
    src = src.replace(old, new, 1)

replace_once('메타 버전', '//@version 3.0.0-alpha.3.18', '//@version 3.0.0-alpha.3.19')
replace_once('런타임 버전', "const VERSION = '3.0.0-alpha.3.18';", "const VERSION = '3.0.0-alpha.3.19';")
replace_once('Usage Scope 상태', "    widgetVisible: true, widgetMode: 'compact', widgetX: null, widgetY: null,\n", "    widgetVisible: true, widgetMode: 'compact', widgetX: null, widgetY: null,\n    usageScopeView: 'all',\n")

helpers = """  function normalizeScopeActivity(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const rows = value => Array.isArray(value) ? value.map(row => ({
      name:String(row?.name || 'Unknown'),
      requests:num(row?.requests) ? Number(row.requests) : 0,
      cost:num(row?.cost) ? Number(row.cost) : 0
    })) : [];
    const totalRequests = num(raw.totalRequests ?? raw.requests24h) ? Number(raw.totalRequests ?? raw.requests24h) : null;
    const totalCost = num(raw.totalCost ?? raw.cost24h) ? Number(raw.totalCost ?? raw.cost24h) : null;
    const totalTokens = num(raw.totalTokens ?? raw.totalTokens24h) ? Number(raw.totalTokens ?? raw.totalTokens24h) : null;
    const inputTokens = num(raw.inputTokens) ? Number(raw.inputTokens) : null;
    const outputTokens = num(raw.outputTokens) ? Number(raw.outputTokens) : null;
    const errorCount = num(raw.errorCount) ? Number(raw.errorCount) : null;
    const errorRate = num(raw.errorRate ?? raw.errorRate24h) ? Number(raw.errorRate ?? raw.errorRate24h) : null;
    const cacheCount = num(raw.cacheCount) ? Number(raw.cacheCount) : null;
    const cacheRate = num(raw.cacheRate) ? Number(raw.cacheRate) : null;
    const providers = rows(raw.providers);
    const models = rows(raw.models);
    const recent = Array.isArray(raw.recent) ? raw.recent : [];
    if (![totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate].some(num) && !providers.length && !models.length && !recent.length) return null;
    return {totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate,providers,models,recent,fetchedAt:raw.fetchedAt || Date.now(),source:String(raw.source || 'LLMGateway scoped usage')};
  }

  function normalizeUsageScopesPayload(raw, fallbackRaw = null) {
    const source = raw && typeof raw === 'object' ? (raw.scopes && typeof raw.scopes === 'object' ? raw.scopes : raw) : null;
    const scopes = {};
    for (const key of ['all','devpass','credits']) {
      const normalized = normalizeScopeActivity(source?.[key]);
      if (normalized) scopes[key] = normalized;
    }
    if (!scopes.all && fallbackRaw) {
      const fallback = normalizeScopeActivity(fallbackRaw);
      if (fallback) scopes.all = fallback;
    }
    if (!Object.keys(scopes).length) return null;
    return {scopes,errors:raw?.errors && typeof raw.errors === 'object' ? raw.errors : {},fetchedAt:raw?.fetchedAt || scopes.all?.fetchedAt || Date.now(),source:String(raw?.source || 'LLMGateway hybrid scoped usage')};
  }

"""
replace_once('Usage Scope 정규화 helper', '  function normalize(payload) {', helpers + '  function normalize(payload) {')
replace_once('Bridge Usage Scope 읽기', "      const runwayRaw = r.runway && typeof r.runway === 'object' ? r.runway : null;\n", "      const usageScopes = normalizeUsageScopesPayload(r.usageScopes, ba || activity);\n      const runwayRaw = r.runway && typeof r.runway === 'object' ? r.runway : null;\n")
replace_once('Bridge snapshot Usage Scope 포함', '        monthly, weekly, credits, activity, runway\n', '        monthly, weekly, credits, activity, runway, usageScopes\n')
replace_once('Local JSON Usage Scope 정규화', "    const out = {\n      protocolVersion: Number(r.protocolVersion || 1), fetchedAt: r.fetchedAt || Date.now(),\n", "    const usageScopes = normalizeUsageScopesPayload(r.usageScopes ?? u.usageScopes, u.activity || activity);\n    const out = {\n      protocolVersion: Number(r.protocolVersion || 1), fetchedAt: r.fetchedAt || Date.now(),\n")
replace_once('Local JSON Usage Scope 포함', "      monthly: bucket(u.monthly, '월간'), weekly: bucket(u.weekly, '주간'), credits, activity\n", "      monthly: bucket(u.monthly, '월간'), weekly: bucket(u.weekly, '주간'), credits, activity, usageScopes\n")

scope_vars = """    const scopeKey = ['all','devpass','credits'].includes(String(state.usageScopeView)) ? String(state.usageScopeView) : 'all';
    const scopeNames = {all:['전체 24h Usage','DevPass + Credits 합산 서버 집계'],devpass:['DevPass 24h Usage','DevPass project /activity 서버 집계'],credits:['Credits 24h Usage','Default organization 서버 집계']};
    const scopeActivity = d.usageScopes?.scopes?.[scopeKey] || (scopeKey === 'all' ? normalizeScopeActivity({totalRequests:a?.requests24h,totalCost:a?.cost24h,totalTokens:a?.totalTokens24h,errorRate:a?.errorRate24h,fetchedAt:d.fetchedAt,source:d.source}) : null);
    const scopeTopProvider = Array.isArray(scopeActivity?.providers) && scopeActivity.providers[0]?.name ? String(scopeActivity.providers[0].name) : '—';
    const scopeTopModel = Array.isArray(scopeActivity?.models) && scopeActivity.models[0]?.name ? String(scopeActivity.models[0].name) : '—';
    const scopeFetchedAt = scopeActivity?.fetchedAt || d.usageScopes?.fetchedAt || d.fetchedAt;
    const scopeExtra = scopeKey === 'devpass'
      ? `<div class=\"mini accent\"><span>월간 남음</span><b>${money(d.monthly?.remaining)}</b></div><div class=\"mini\"><span>월간 갱신</span><b>${d.monthly?.resetAt ? remainingTimeForDashboard(d.monthly.resetAt) : '—'}</b></div>`
      : scopeKey === 'credits'
        ? `<div class=\"mini cyan\"><span>Credits 잔액</span><b>${money(c?.balance)}</b></div><div class=\"mini cyan\"><span>Runway</span><b>${num(runway?.runwayDays) ? `약 ${Math.round(Number(runway.runwayDays))}일` : '—'}</b></div>`
        : `<div class=\"mini accent\"><span>DevPass 월간 남음</span><b>${money(d.monthly?.remaining)}</b></div><div class=\"mini cyan\"><span>Credits 잔액</span><b>${money(c?.balance)}</b></div>`;
"""
replace_once('Usage Scope 화면 변수', "    const observedStamp = state.dailyUsage?.updatedAt || state.creditDailyUsage?.updatedAt || state.lastSyncAt;\n", "    const observedStamp = state.dailyUsage?.updatedAt || state.creditDailyUsage?.updatedAt || state.lastSyncAt;\n" + scope_vars)
replace_once('Usage Scope CSS', "      .today-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.today-head b{font-size:14px}.stamp{color:var(--m);font-size:10px;white-space:nowrap}.today-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:10px}.today-grid .mini b{white-space:normal;overflow:visible;text-overflow:clip}.today-grid .accent b{color:var(--g)}.today-grid .purple b{color:var(--v)}.today-grid .cyan b{color:var(--c)}\n", "      .today-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.today-head b{font-size:14px}.stamp{color:var(--m);font-size:10px;white-space:nowrap}.today-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:10px}.today-grid .mini b{white-space:normal;overflow:visible;text-overflow:clip}.today-grid .accent b{color:var(--g)}.today-grid .purple b{color:var(--v)}.today-grid .cyan b{color:var(--c)}\n      .scope-tabs{display:flex;gap:6px;margin-top:10px}.scope-tab{flex:1;min-width:0;padding:7px 9px}.scope-tab.active{background:var(--g);border-color:var(--g);color:#15170f}\n")

scope_section = """      <section class=\"panel wide\">
        <div class=\"today-head\"><div><b>24h Usage Scope</b><p style=\"margin:2px 0 0\">${esc(scopeNames[scopeKey][1])}</p></div><span class=\"stamp\">${scopeFetchedAt ? dashboardDateText(scopeFetchedAt) : ''}</span></div>
        <div class=\"scope-tabs\" role=\"tablist\" aria-label=\"24h Usage scope\">
          ${[['all','전체'],['devpass','DevPass'],['credits','Credits']].map(([key,label]) => `<button class=\"scope-tab ${scopeKey===key?'active':''}\" data-usage-scope=\"${key}\">${label}</button>`).join('')}
        </div>
        ${scopeActivity ? `<div class=\"today-grid\">
          <div class=\"mini accent\"><span>24h 요청</span><b>${num(scopeActivity.totalRequests) ? `${Number(scopeActivity.totalRequests).toLocaleString()}회` : '—'}</b></div>
          <div class=\"mini\"><span>24h 비용</span><b>${money(scopeActivity.totalCost,4)}</b></div>
          <div class=\"mini\"><span>총 토큰</span><b>${num(scopeActivity.totalTokens) ? Number(scopeActivity.totalTokens).toLocaleString() : '—'}</b></div>
          <div class=\"mini\"><span>입력 / 출력</span><b>${num(scopeActivity.inputTokens) || num(scopeActivity.outputTokens) ? `${num(scopeActivity.inputTokens)?Number(scopeActivity.inputTokens).toLocaleString():'—'} / ${num(scopeActivity.outputTokens)?Number(scopeActivity.outputTokens).toLocaleString():'—'}` : '—'}</b></div>
          <div class=\"mini\"><span>오류</span><b>${num(scopeActivity.errorCount) ? `${Number(scopeActivity.errorCount).toLocaleString()}회 · ${num(scopeActivity.errorRate)?Number(scopeActivity.errorRate).toFixed(1):'0.0'}%` : (num(scopeActivity.errorRate) ? `${Number(scopeActivity.errorRate).toFixed(1)}%` : '—')}</b></div>
          <div class=\"mini\"><span>Top Provider</span><b>${esc(scopeTopProvider)}</b></div>
          <div class=\"mini\"><span>Top Model</span><b>${esc(scopeTopModel)}</b></div>
          ${scopeExtra}
        </div>` : `<p>Bridge snapshot에 ${esc(scopeNames[scopeKey][0])} 범위 데이터가 아직 없어.</p>`}
        ${d.usageScopes?.errors?.[scopeKey] ? `<p class=\"warn\">Usage Scope · ${esc(d.usageScopes.errors[scopeKey])}</p>` : ''}
      </section>
"""
replace_once('Usage Scope section', '      <section class="panel wide"><b>Local Bridge</b>\n', scope_section + '      <section class="panel wide"><b>Local Bridge</b>\n')

bind_scope = """    document.querySelectorAll('[data-usage-scope]').forEach(button => {
      button.onclick = async () => {
        const next = String(button.getAttribute('data-usage-scope') || 'all');
        state.usageScopeView = ['all','devpass','credits'].includes(next) ? next : 'all';
        await persist();
        renderSettings();
      };
    });
"""
replace_once('Usage Scope 탭 핸들러', "    if (q('#refresh')) q('#refresh').onclick = () => refresh('manual');\n", bind_scope + "    if (q('#refresh')) q('#refresh').onclick = () => refresh('manual');\n")

widget_start_after = src.index('  function widgetHtml() {')
widget_end_after = src.index('  async function ensureWidget() {', widget_start_after)
if src[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('3.19는 플로팅 위젯을 건드리면 안 돼.')

path.write_text(src)
