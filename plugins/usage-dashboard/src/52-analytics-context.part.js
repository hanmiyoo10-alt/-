    const analyticsScopeKey = ['all','devpass','credits'].includes(String(state.analyticsScopeView)) ? String(state.analyticsScopeView) : 'all';
    const analyticsNames = {
      all:['전체 Analytics','DevPass + Credits 합산 서버 분석'],
      devpass:['DevPass Analytics','DevPass project 서버 분석'],
      credits:['Credits Analytics',`${creditsOrgLabel} 서버 분석`]
    };
    const analyticsBundle = d.analyticsScopes?.scopes?.[analyticsScopeKey] || (analyticsScopeKey === 'all' ? d.analytics : null) || null;
    const analyticsW24 = analyticsBundle?.windows?.['24h'] || d.usageScopes?.scopes?.[analyticsScopeKey] || (analyticsScopeKey === 'all' ? scopeActivity : null) || null;
    const analyticsW7 = analyticsBundle?.windows?.['7d'] || null;
    const analyticsW30 = analyticsBundle?.windows?.['30d'] || null;
    const analyticsAverages = analyticsBundle?.averages || {};
    const analyticsCostDrivers = compactCostDriverTruth(analyticsW24);
    const analyticsTopProvider = costDriverUiText(analyticsCostDrivers.provider);
    const analyticsTopModel = costDriverUiText(analyticsCostDrivers.model);
    const analyticsFetchedAt = analyticsBundle?.fetchedAt || d.analyticsScopes?.fetchedAt || analyticsW24?.fetchedAt || d.fetchedAt;
    const analyticsCreditsSpend = analyticsScopeKey === 'credits' ? analyticsW24?.creditsSpendComposition || null : null;
    const analyticsCreditsSpendMoney = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? `$${Number(value).toFixed(4)}` : '—';
    const analyticsCreditsSpendSplit = analyticsCreditsSpend?.complete && Number(analyticsCreditsSpend.totalSpend) > 0
      ? `사용 ${(Number(analyticsCreditsSpend.usageCost) / Number(analyticsCreditsSpend.totalSpend) * 100).toFixed(1)}% · 보관 ${(Number(analyticsCreditsSpend.dataStorageCost) / Number(analyticsCreditsSpend.totalSpend) * 100).toFixed(1)}%`
      : '—';
    const analyticsCreditsSpendCard = analyticsScopeKey === 'credits'
      ? `<div class="usage-detail-box credits-spend-card"><h3>Credits 비용 구성 · 24h</h3><div class="usage-detail-row"><div><b>사용 비용</b><span>${esc(analyticsCreditsSpend?.usageCostSource || 'unknown')}</span></div><span>${analyticsCreditsSpendMoney(analyticsCreditsSpend?.usageCost)}</span></div><div class="usage-detail-row"><div><b>데이터 보관</b><span>${esc(analyticsCreditsSpend?.dataStorageCostSource || 'unknown')}</span></div><span>${analyticsCreditsSpendMoney(analyticsCreditsSpend?.dataStorageCost)}</span></div><div class="usage-detail-row"><div><b>총 비용</b><span>${analyticsCreditsSpend?.complete ? 'complete' : 'UNKNOWN'}</span></div><span>${analyticsCreditsSpendMoney(analyticsCreditsSpend?.totalSpend)}</span></div><p>구성 비율 · ${esc(analyticsCreditsSpendSplit)}</p></div>`
      : '';
    const analyticsExtra = analyticsScopeKey === 'devpass'
      ? `<div class="mini accent"><span>월간 남음</span><b>${money(d.monthly?.remaining)}</b></div><div class="mini"><span>기간 종료</span><b>${d.monthly?.resetAt ? remainingTimeForDashboard(d.monthly.resetAt) : '—'}</b></div>`
      : analyticsScopeKey === 'credits'
        ? `<div class="mini cyan"><span>Credits 잔액</span><b>${money(c?.balance)}</b></div><div class="mini cyan"><span>Runway</span><b>${num(runway?.runwayDays) ? `약 ${Math.round(Number(runway.runwayDays))}일` : '—'}</b></div>`
        : `<div class="mini accent"><span>DevPass 월간 남음</span><b>${money(d.monthly?.remaining)}</b></div><div class="mini cyan"><span>Credits 잔액</span><b>${money(c?.balance)}</b></div>`;
