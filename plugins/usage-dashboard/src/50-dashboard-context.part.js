
  function settingsHtml() {
    function releaseNotesPanelHtml() {
      const highlights = RELEASE_NOTES.highlights.map(item => `<li>${esc(item)}</li>`).join('');
      const hints = RELEASE_NOTES.diagnosticHints.map(item => `<li>${esc(item)}</li>`).join('');
      return `<div id="release-notes-panel" class="usage-detail-box release-notes-panel" hidden>
        <div class="recent-head"><h3>${esc(RELEASE_NOTES.title)}</h3><span>v${esc(VERSION)}</span></div>
        <p><b>이번 업데이트</b></p><ul>${highlights}</ul>
        <p><b>다음 진단 때 확인하면 좋은 것</b></p><ul>${hints}</ul>
        <div class="actions"><button id="copy-release-guide" data-release-guide="${esc(releaseDiagnosticGuideText())}">진단 제출 가이드 복사</button></div>
      </div>`;
    }

    function releaseDiagnosticGuideText() {
      const hints = RELEASE_NOTES.diagnosticHints.map(item => `- ${item}`).join('\n');
      return [
        `Local Usage Dashboard v${VERSION}`,
        `Release: ${RELEASE_NOTES.title}`,
        '',
        '다음 진단 때 확인:',
        hints,
        '',
        '문제/관찰 한 줄: [직접 작성]',
        '재현 행동: [직접 작성]',
        '필요하면 Runtime Diagnostics > 전체 Diagnostics 복사를 함께 첨부'
      ].join('\n');
    }


    const d = state.data || {}, c = d.credits, a = d.activity, runway = d.runway, h = d.health || {};
    const bridgeDiag = bridgeStabilitySnapshot();
    const productRuntime = bridgeRuntimeSnapshot();
    const lifecycleMode = bridgeLifecycleMode();
    const stableHealth = lifecycleMode === 'live' && String(h.status || '').toLowerCase() === 'ok' && bridgeDiag.compatible !== false && Number(localRuntimeErrors.count || 0) === 0;
    const systemHealthStatus = stableHealth ? 'STABLE' : lifecycleMode === 'paused' ? 'PAUSED' : lifecycleMode === 'off' ? 'OFF' : 'CHECK';
    const systemHealthText = `${String(lifecycleMode || 'off').toUpperCase()} · Engine ${bridgeDiag.version ? `v${bridgeDiag.version}` : '—'} · Manager ${productRuntime.managerVersion ? `v${productRuntime.managerVersion}` : '—'} · ${state.lastSyncAt ? age(state.lastSyncAt) : '대기'}`;
    const devpassAccount = d.devpassAccount && typeof d.devpassAccount === 'object' ? d.devpassAccount : null;
    const premiumAllowance = premiumAllowanceTruth(d.weekly);
    const paygTruth = paygAccountTruth(devpassAccount);
    const cycleSummary = devpassCycleSummaryTruth(devpassAccount, d.analyticsScopes?.scopes?.devpass);
    const dashboardView = ['overview','devpass','credits','analytics','settings'].includes(String(state.dashboardView)) ? String(state.dashboardView) : 'overview';
    const creditsOrganizations = (Array.isArray(d.organizations) ? d.organizations : []).filter(org => String(org?.kind || 'default') === 'default' && String(org?.status || 'active') !== 'deleted');
    const selectedCreditsOrgId = String(d.creditsOrganizationId || state.selectedCreditsOrgId || '');
    const selectedCreditsOrg = creditsOrganizations.find(org => String(org?.id || '') === selectedCreditsOrgId) || creditsOrganizations[0] || null;
    const creditsOrgLabel = String(selectedCreditsOrg?.name || selectedCreditsOrgId || 'Default organization');
    const creditsOrgSelector = creditsOrganizations.length ? `<label class="credits-org-picker"><span>Credits Organization</span><select id="credits-org-id">${creditsOrganizations.map(org => `<option value="${esc(org.id)}" ${String(org.id)===selectedCreditsOrgId?'selected':''}>${esc(org.name || org.id)}${num(org.credits)?` · ${money(org.credits)}`:''}</option>`).join('')}</select></label>${d.creditsOrganizationFallback ? `<p class="warn credits-org-fallback">선택한 organization을 찾지 못해 ${esc(creditsOrgLabel)}로 자동 복구했어.</p>` : ''}` : '';
    const creditsMeta = [
      num(c?.todayUsed) ? `오늘 ${money(c.todayUsed,4)}` : '',
      num(runway?.avgDailySpend7d) ? `7일평균 ${money(runway.avgDailySpend7d,4)}/일` : '',
      num(runway?.runwayDays) ? `약 ${Math.round(Number(runway.runwayDays))}일` : '',
      d.source ? esc(d.source) : ''
    ].filter(Boolean).join(' · ');
    const today = todayOverviewMetrics(d);
    const dailyServerUsage = dailyServerUsageTruth(d);
    const observedStamp = state.dailyUsage?.updatedAt || state.creditDailyUsage?.updatedAt || state.lastSyncAt;
    const scopeKey = ['all','devpass','credits'].includes(String(state.usageScopeView)) ? String(state.usageScopeView) : 'all';
    const scopeNames = {all:['전체 24h Usage',`DevPass + ${creditsOrgLabel} Credits 합산 서버 집계`],devpass:['DevPass 24h Usage','DevPass project /activity 서버 집계'],credits:['Credits 24h Usage',`${creditsOrgLabel} 서버 집계`]};
    const scopeActivity = d.usageScopes?.scopes?.[scopeKey] || (scopeKey === 'all' ? normalizeScopeActivity({totalRequests:a?.requests24h,totalCost:a?.cost24h,totalTokens:a?.totalTokens24h,errorRate:a?.errorRate24h,fetchedAt:d.fetchedAt,source:d.source}) : null);
    const scopeCostDrivers = compactCostDriverTruth(scopeActivity);
    const costDriverUiText = row => row?.name ? `${row.name} · ${money(row.cost,4)}${row.share === null ? '' : ` · ${Number(row.share).toFixed(1)}%`}` : '—';
    const scopeTopProvider = costDriverUiText(scopeCostDrivers.provider);
    const scopeTopModel = costDriverUiText(scopeCostDrivers.model);
    const scopeFetchedAt = scopeActivity?.fetchedAt || d.usageScopes?.fetchedAt || d.fetchedAt;
    const devpassAccountStatus = !devpassAccount
      ? '—'
      : devpassAccount.cancelled
        ? '취소 예정'
        : String(devpassAccount.plan || 'none') !== 'none'
          ? 'ACTIVE'
          : '—';
    const billingPlanText = devpassAccount && String(devpassAccount.plan || '').trim() && String(devpassAccount.plan).toLowerCase() !== 'none'
      ? String(devpassAccount.plan).toUpperCase()
      : '—';
    const billingCycleText = typeof devpassAccount?.cycle === 'string' && devpassAccount.cycle.trim()
      ? devpassAccount.cycle.trim()
      : '—';
    const billingStartText = dashboardDateText(devpassAccount?.billingCycleStart, true);
    const billingEndText = dashboardDateText(devpassAccount?.expiresAt, true);
    const billingEndTimestamp = resetTimestamp(devpassAccount?.expiresAt);
    const billingRemainingText = Number.isFinite(billingEndTimestamp) && billingEndTimestamp > Date.now()
      ? remainingTimeForDashboard(devpassAccount.expiresAt)
      : '—';
    const billingCancelledText = devpassAccount?.cancelled === true ? '취소 예정' : '—';
    const devpassIncludedPassText = num(devpassAccount?.includedResetPassesRemaining)
      ? (num(devpassAccount?.includedResetPasses)
        ? `${Number(devpassAccount.includedResetPassesRemaining)} / ${Number(devpassAccount.includedResetPasses)}장`
        : `${Number(devpassAccount.includedResetPassesRemaining)}장`)
      : '—';
    const devpassNoAiTrainingText = devpassAccount?.noAiTrainingState === 'enabled' ? '사용' : devpassAccount?.noAiTrainingState === 'disabled' ? '꺼짐' : '—';
    const devpassProviderCachePolicyText = devpassAccount?.providerCachePolicyState === 'automatic' ? '자동' : devpassAccount?.providerCachePolicyState === 'client-managed' ? '클라이언트 관리' : devpassAccount?.providerCachePolicyState === 'disabled' ? '꺼짐' : '—';
    const devpassAccountDetailHtml = devpassAccount
      ? `<div class="usage-detail-grid devpass-account-parity">
          <div class="usage-detail-box"><div class="recent-head"><h3>DevPass account</h3><span>${esc(devpassAccountStatus)}</span></div><div class="minis">
            <div class="mini"><span>Plan</span><b>${esc(String(devpassAccount.plan || '—').toUpperCase())}</b></div>
            <div class="mini"><span>Cycle</span><b>${esc(String(devpassAccount.cycle || '—'))}</b></div>
            <div class="mini"><span>Status</span><b>${esc(devpassAccountStatus)}</b></div>
            <div class="mini"><span>Service tier</span><b>${esc(String(devpassAccount.serviceTier || '—').toUpperCase())}</b></div>
            <div class="mini"><span>Routing</span><b>${esc(String(devpassAccount.routingStrategy || '—'))}</b></div>
            <div class="mini"><span>AI 학습 차단</span><b>${esc(devpassNoAiTrainingText)}</b></div>
            <div class="mini"><span>Provider 캐시 정책</span><b>${esc(devpassProviderCachePolicyText)}</b></div>
            <div class="mini"><span>Pending tier</span><b>${esc(String(devpassAccount.pendingTier || '—'))}</b></div>
            <div class="mini"><span>Personal org</span><b>${devpassAccount.hasPersonalOrg === null ? '—' : devpassAccount.hasPersonalOrg ? '있음' : '없음'}</b></div>
            <div class="mini"><span>Billing history</span><b>${devpassAccount.hasBillingHistory === null ? '—' : devpassAccount.hasBillingHistory ? '있음' : '없음'}</b></div>
          </div></div>
          <div class="usage-detail-box"><div class="recent-head"><h3>Reset Pass · PAYG</h3><span>${paygTruth.paygState === 'on' ? 'PAYG ON' : paygTruth.paygState === 'off' ? 'PAYG OFF' : 'PAYG —'}</span></div><div class="minis">
            <div class="mini purple"><span>총 사용 가능</span><b>${num(d.weekly?.resetPasses) ? `${Number(d.weekly.resetPasses)}장` : 'API 미제공'}</b></div>
            <div class="mini purple"><span>구매/보유 패스</span><b>${num(devpassAccount.resetPasses) ? `${Number(devpassAccount.resetPasses)}장` : '—'}</b></div>
            <div class="mini purple"><span>기본 패스 남음</span><b>${esc(devpassIncludedPassText)}</b></div>
            <div class="mini"><span>Reset Pass 가격</span><b>${money(devpassAccount.resetPassPrice)}</b></div>
            <div class="mini"><span>PAYG overflow</span><b>${paygTruth.paygLabel}</b></div>
            <div class="mini cyan"><span>Regular Credits</span><b>${paygTruth.regularCredits === null ? '—' : money(paygTruth.regularCredits)}</b></div>
            <div class="mini"><span>Overflow balance</span><b>${esc(paygTruth.balanceStateLabel)}</b></div>
            <div class="mini"><span>Auto-Reload</span><b>${paygTruth.autoTopUpLabel}</b></div>
            <div class="mini"><span>Reload threshold</span><b>${paygTruth.autoTopUpThreshold === null ? '—' : money(paygTruth.autoTopUpThreshold)}</b></div>
            <div class="mini"><span>Reload amount</span><b>${paygTruth.autoTopUpAmount === null ? '—' : money(paygTruth.autoTopUpAmount)}</b></div>
          </div></div>
          <div class="usage-detail-box premium-allowance-card"><div class="recent-head"><h3>Premium 주간 한도</h3><span>${esc(premiumAllowance.stateLabel)}</span></div><div class="minis">
            <div class="mini purple"><span>사용</span><b>${premiumAllowance.used === null ? '—' : money(premiumAllowance.used)}</b></div>
            <div class="mini purple"><span>한도</span><b>${premiumAllowance.limit === null ? '—' : money(premiumAllowance.limit)}</b></div>
            <div class="mini purple"><span>남음</span><b>${premiumAllowance.remaining === null ? '—' : money(premiumAllowance.remaining)}</b></div>
            <div class="mini purple"><span>사용률</span><b>${premiumAllowance.percentUsed === null ? '—' : `${premiumAllowance.percentUsed.toFixed(1)}%`}</b></div>
            <div class="mini"><span>리셋</span><b>${premiumAllowance.resetAt ? remainingTimeForDashboard(premiumAllowance.resetAt) : '—'}</b></div>
          </div></div>
          <div class="usage-detail-box billing-cycle-truth-strip"><div class="recent-head"><h3>Billing Cycle</h3><span>source truth</span></div><div class="minis">
            <div class="mini"><span>Plan</span><b>${esc(billingPlanText)}</b></div>
            <div class="mini"><span>Cycle</span><b>${esc(billingCycleText)}</b></div>
            <div class="mini"><span>기간 시작</span><b>${esc(billingStartText)}</b></div>
            <div class="mini"><span>기간 종료</span><b>${esc(billingEndText)}</b></div>
            <div class="mini"><span>남은 기간</span><b>${esc(billingRemainingText)}</b></div>
            <div class="mini"><span>취소 상태</span><b>${esc(billingCancelledText)}</b></div>
          </div></div>
          <div class="usage-detail-box devpass-cycle-summary"><div class="recent-head"><h3>${esc(cycleSummary.title)}</h3><span>${esc(cycleSummary.mode)}</span></div><div class="minis">
            <div class="mini accent"><span>요청</span><b>${cycleSummary.requests === null ? '—' : Number(cycleSummary.requests).toLocaleString()}</b></div>
            <div class="mini"><span>토큰</span><b>${cycleSummary.totalTokens === null ? '—' : Number(cycleSummary.totalTokens).toLocaleString()}</b></div>
            <div class="mini purple"><span>Cached input share</span><b>${cycleSummary.cachedInputShare === null ? '—' : `${Number(cycleSummary.cachedInputShare).toFixed(1)}%`}</b></div>
            <div class="mini"><span>Peak day</span><b>${esc(cycleSummary.peakDay || '—')}</b></div>
          </div></div>
        </div>`
      : '';
    const scopeExtra = scopeKey === 'devpass'
      ? `<div class="mini accent"><span>월간 남음</span><b>${money(d.monthly?.remaining)}</b></div><div class="mini"><span>기간 종료</span><b>${d.monthly?.resetAt ? remainingTimeForDashboard(d.monthly.resetAt) : '—'}</b></div><div class="mini purple"><span>프리미엄 남음</span><b>${money(d.weekly?.remaining)}</b></div><div class="mini purple"><span>Reset Pass</span><b>${num(d.weekly?.resetPasses) ? `${Number(d.weekly.resetPasses)}장` : 'API 미제공'}</b></div>`
      : scopeKey === 'credits'
        ? `<div class="mini cyan"><span>Credits 잔액</span><b>${money(c?.balance)}</b></div><div class="mini cyan"><span>Runway</span><b>${num(runway?.runwayDays) ? `약 ${Math.round(Number(runway.runwayDays))}일` : '—'}</b></div>`
        : `<div class="mini accent"><span>DevPass 월간 남음</span><b>${money(d.monthly?.remaining)}</b></div><div class="mini cyan"><span>Credits 잔액</span><b>${money(c?.balance)}</b></div>`;
