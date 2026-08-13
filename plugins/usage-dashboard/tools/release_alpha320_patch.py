from pathlib import Path

path = Path('plugins/usage-dashboard/latest.js')
src = path.read_text()

if '//@version 3.0.0-alpha.3.19' not in src or "const VERSION = '3.0.0-alpha.3.19';" not in src:
    raise SystemExit('latest.js가 정확한 alpha.3.19가 아니야.')

widget_start = src.index('  function widgetHtml() {')
widget_end = src.index('  async function ensureWidget() {', widget_start)
widget_before = src[widget_start:widget_end]


def replace_once(label, old, new):
    global src
    if old not in src:
        raise SystemExit(f'{label} 패치 지점을 찾지 못했어.')
    src = src.replace(old, new, 1)


replace_once('메타 버전', '//@version 3.0.0-alpha.3.19', '//@version 3.0.0-alpha.3.20')
replace_once('런타임 버전', "const VERSION = '3.0.0-alpha.3.19';", "const VERSION = '3.0.0-alpha.3.20';")
replace_once(
    'Analytics Scope 상태',
    "    usageScopeView: 'all',\n",
    "    usageScopeView: 'all',\n    analyticsScopeView: 'all',\n"
)

analytics_helpers = r'''  function normalizeAnalyticsPayload(raw, fallback24h = null) {
    if ((!raw || typeof raw !== 'object') && !fallback24h) return null;
    const sourceWindows = raw && typeof raw === 'object'
      ? (raw.windows && typeof raw.windows === 'object' ? raw.windows : raw)
      : {};
    const windows = {};
    for (const range of ['24h','7d','30d']) {
      const normalized = normalizeScopeActivity(sourceWindows?.[range]);
      if (normalized) windows[range] = normalized;
    }
    if (!windows['24h'] && fallback24h) {
      const fallback = normalizeScopeActivity(fallback24h);
      if (fallback) windows['24h'] = fallback;
    }
    if (!Object.keys(windows).length) return null;
    return {
      windows,
      averages:{
        dailyCost7d:num(raw?.averages?.dailyCost7d)?Number(raw.averages.dailyCost7d):null,
        dailyRequests7d:num(raw?.averages?.dailyRequests7d)?Number(raw.averages.dailyRequests7d):null,
        dailyCost30d:num(raw?.averages?.dailyCost30d)?Number(raw.averages.dailyCost30d):null
      },
      errors:raw?.errors && typeof raw.errors === 'object' ? raw.errors : {},
      fetchedAt:raw?.fetchedAt || windows['24h']?.fetchedAt || Date.now(),
      source:String(raw?.source || 'LLMGateway CLI analytics')
    };
  }

  function normalizeAnalyticsScopesPayload(raw, usageScopes = null, allAnalytics = null) {
    const source = raw && typeof raw === 'object'
      ? (raw.scopes && typeof raw.scopes === 'object' ? raw.scopes : raw)
      : null;
    const scopes = {};
    for (const key of ['all','devpass','credits']) {
      const fallback24h = usageScopes?.scopes?.[key] || null;
      const normalized = normalizeAnalyticsPayload(source?.[key], fallback24h);
      if (normalized) scopes[key] = normalized;
    }
    if (!scopes.all && allAnalytics) scopes.all = allAnalytics;
    if (!Object.keys(scopes).length) return null;
    return {
      scopes,
      errors:raw?.errors && typeof raw.errors === 'object' ? raw.errors : {},
      fetchedAt:raw?.fetchedAt || scopes.all?.fetchedAt || Date.now(),
      source:String(raw?.source || 'LLMGateway hybrid scoped analytics')
    };
  }

'''
replace_once('Analytics 정규화 helper', '  function normalize(payload) {', analytics_helpers + '  function normalize(payload) {')

replace_once(
    'Bridge Analytics 읽기',
    "      const usageScopes = normalizeUsageScopesPayload(r.usageScopes, ba || activity);\n      const runwayRaw = r.runway && typeof r.runway === 'object' ? r.runway : null;\n",
    "      const usageScopes = normalizeUsageScopesPayload(r.usageScopes, ba || activity);\n      const analytics = normalizeAnalyticsPayload(r.analytics, usageScopes?.scopes?.all || ba || activity);\n      const analyticsScopes = normalizeAnalyticsScopesPayload(r.analyticsScopes, usageScopes, analytics);\n      const runwayRaw = r.runway && typeof r.runway === 'object' ? r.runway : null;\n"
)
replace_once(
    'Bridge snapshot Analytics 포함',
    '        monthly, weekly, credits, activity, runway, usageScopes\n',
    '        monthly, weekly, credits, activity, runway, usageScopes, analytics, analyticsScopes\n'
)
replace_once(
    'Local JSON Analytics 읽기',
    "    const usageScopes = normalizeUsageScopesPayload(r.usageScopes ?? u.usageScopes, u.activity || activity);\n    const out = {\n",
    "    const usageScopes = normalizeUsageScopesPayload(r.usageScopes ?? u.usageScopes, u.activity || activity);\n    const analytics = normalizeAnalyticsPayload(r.analytics ?? u.analytics, usageScopes?.scopes?.all || u.activity || activity);\n    const analyticsScopes = normalizeAnalyticsScopesPayload(r.analyticsScopes ?? u.analyticsScopes, usageScopes, analytics);\n    const out = {\n"
)
replace_once(
    'Local JSON Analytics 포함',
    "      monthly: bucket(u.monthly, '월간'), weekly: bucket(u.weekly, '주간'), credits, activity, usageScopes\n",
    "      monthly: bucket(u.monthly, '월간'), weekly: bucket(u.weekly, '주간'), credits, activity, usageScopes, analytics, analyticsScopes\n"
)

analytics_vars = r'''    const analyticsScopeKey = ['all','devpass','credits'].includes(String(state.analyticsScopeView)) ? String(state.analyticsScopeView) : 'all';
    const analyticsNames = {
      all:['전체 Analytics','DevPass + Credits 합산 서버 분석'],
      devpass:['DevPass Analytics','DevPass project 서버 분석'],
      credits:['Credits Analytics','Default organization 서버 분석']
    };
    const analyticsBundle = d.analyticsScopes?.scopes?.[analyticsScopeKey] || (analyticsScopeKey === 'all' ? d.analytics : null) || null;
    const analyticsW24 = analyticsBundle?.windows?.['24h'] || d.usageScopes?.scopes?.[analyticsScopeKey] || (analyticsScopeKey === 'all' ? scopeActivity : null) || null;
    const analyticsW7 = analyticsBundle?.windows?.['7d'] || null;
    const analyticsW30 = analyticsBundle?.windows?.['30d'] || null;
    const analyticsAverages = analyticsBundle?.averages || {};
    const analyticsTopProvider = Array.isArray(analyticsW24?.providers) && analyticsW24.providers[0]?.name ? String(analyticsW24.providers[0].name) : '—';
    const analyticsTopModel = Array.isArray(analyticsW24?.models) && analyticsW24.models[0]?.name ? String(analyticsW24.models[0].name) : '—';
    const analyticsFetchedAt = analyticsBundle?.fetchedAt || d.analyticsScopes?.fetchedAt || analyticsW24?.fetchedAt || d.fetchedAt;
    const analyticsExtra = analyticsScopeKey === 'devpass'
      ? `<div class="mini accent"><span>월간 남음</span><b>${money(d.monthly?.remaining)}</b></div><div class="mini"><span>월간 갱신</span><b>${d.monthly?.resetAt ? remainingTimeForDashboard(d.monthly.resetAt) : '—'}</b></div>`
      : analyticsScopeKey === 'credits'
        ? `<div class="mini cyan"><span>Credits 잔액</span><b>${money(c?.balance)}</b></div><div class="mini cyan"><span>Runway</span><b>${num(runway?.runwayDays) ? `약 ${Math.round(Number(runway.runwayDays))}일` : '—'}</b></div>`
        : `<div class="mini accent"><span>DevPass 월간 남음</span><b>${money(d.monthly?.remaining)}</b></div><div class="mini cyan"><span>Credits 잔액</span><b>${money(c?.balance)}</b></div>`;
'''
replace_once('Analytics 화면 변수', '    return `<style>\n', analytics_vars + '    return `<style>\n')

analytics_section = r'''      <section class="panel wide">
        <div class="today-head"><div><b>Analytics · 24h / 7d / 30d</b><p style="margin:2px 0 0">${esc(analyticsNames[analyticsScopeKey][1])}</p></div><span class="stamp">${analyticsFetchedAt ? dashboardDateText(analyticsFetchedAt) : ''}</span></div>
        <div class="scope-tabs" role="tablist" aria-label="Analytics scope">
          ${[['all','전체'],['devpass','DevPass'],['credits','Credits']].map(([key,label]) => `<button class="scope-tab ${analyticsScopeKey===key?'active':''}" data-analytics-scope="${key}">${label}</button>`).join('')}
        </div>
        ${analyticsW24 ? `<div class="today-grid">
          <div class="mini accent"><span>24h 요청</span><b>${num(analyticsW24.totalRequests) ? `${Number(analyticsW24.totalRequests).toLocaleString()}회` : '—'}</b></div>
          <div class="mini"><span>24h 비용</span><b>${money(analyticsW24.totalCost,4)}</b></div>
          <div class="mini"><span>총 토큰</span><b>${num(analyticsW24.totalTokens) ? Number(analyticsW24.totalTokens).toLocaleString() : '—'}</b></div>
          <div class="mini"><span>입력 / 출력</span><b>${num(analyticsW24.inputTokens) || num(analyticsW24.outputTokens) ? `${num(analyticsW24.inputTokens)?Number(analyticsW24.inputTokens).toLocaleString():'—'} / ${num(analyticsW24.outputTokens)?Number(analyticsW24.outputTokens).toLocaleString():'—'}` : '—'}</b></div>
          <div class="mini"><span>오류</span><b>${num(analyticsW24.errorCount) ? `${Number(analyticsW24.errorCount).toLocaleString()}회 · ${num(analyticsW24.errorRate)?Number(analyticsW24.errorRate).toFixed(1):'0.0'}%` : (num(analyticsW24.errorRate) ? `${Number(analyticsW24.errorRate).toFixed(1)}%` : '0회 · 0.0%')}</b></div>
          <div class="mini"><span>캐시</span><b>${num(analyticsW24.cacheCount) ? `${Number(analyticsW24.cacheCount).toLocaleString()}회 · ${num(analyticsW24.cacheRate)?Number(analyticsW24.cacheRate).toFixed(1):'0.0'}%` : (num(analyticsW24.cacheRate) ? `${Number(analyticsW24.cacheRate).toFixed(1)}%` : '0회 · 0.0%')}</b></div>
          <div class="mini"><span>7일 총 비용</span><b>${money(analyticsW7?.totalCost,4)}</b></div>
          <div class="mini"><span>7일 일평균</span><b>${num(analyticsAverages.dailyCost7d) ? `${money(analyticsAverages.dailyCost7d,4)}/일` : '—'}</b></div>
          <div class="mini"><span>30일 총 비용</span><b>${money(analyticsW30?.totalCost,4)}</b></div>
          <div class="mini"><span>Top Model</span><b>${esc(analyticsTopModel)}</b></div>
          <div class="mini"><span>Top Provider</span><b>${esc(analyticsTopProvider)}</b></div>
          ${analyticsExtra}
        </div>` : `<p>Bridge snapshot에 ${esc(analyticsNames[analyticsScopeKey][0])} 범위 데이터가 아직 없어.</p>`}
        ${d.analyticsScopes?.errors?.[analyticsScopeKey] ? `<p class="warn">Analytics · ${esc(d.analyticsScopes.errors[analyticsScopeKey])}</p>` : ''}
        ${analyticsBundle?.errors && Object.keys(analyticsBundle.errors).length ? `<p class="warn">기간 일부 실패 · ${esc(Object.entries(analyticsBundle.errors).map(([range,message])=>`${range}: ${message}`).join(' · '))}</p>` : ''}
      </section>
'''
replace_once('Analytics section', '      <section class="panel wide"><b>Local Bridge</b>\n', analytics_section + '      <section class="panel wide"><b>Local Bridge</b>\n')

analytics_bind = r'''    document.querySelectorAll('[data-analytics-scope]').forEach(button => {
      button.onclick = async () => {
        const next = String(button.getAttribute('data-analytics-scope') || 'all');
        state.analyticsScopeView = ['all','devpass','credits'].includes(next) ? next : 'all';
        await persist();
        renderSettings();
      };
    });
'''
replace_once('Analytics 탭 핸들러', "    if (q('#refresh')) q('#refresh').onclick = () => refresh('manual');\n", analytics_bind + "    if (q('#refresh')) q('#refresh').onclick = () => refresh('manual');\n")

widget_start_after = src.index('  function widgetHtml() {')
widget_end_after = src.index('  async function ensureWidget() {', widget_start_after)
if src[widget_start_after:widget_end_after] != widget_before:
    raise SystemExit('3.20은 플로팅 위젯을 건드리면 안 돼.')

path.write_text(src)
