    return `<style>
      :root{color-scheme:dark;--b:#101114;--p:#191b20;--p2:#21242a;--l:#2c3037;--t:#f5f6f8;--m:#969da8;--g:#c5f277;--v:#b9a6f8;--c:#9fd7ee;--e:#ff9b95}
      *{box-sizing:border-box}body{margin:0;background:var(--b);color:var(--t);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}.shell{width:min(900px,100%);margin:auto;padding:14px}
      header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}h1{margin:0;font-size:23px}.dashboard-nav{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;margin:-2px 0 12px;position:sticky;top:0;z-index:20;background:var(--b);padding:6px 0}.dashboard-nav button{min-width:0;padding:8px 3px;font-size:10px;white-space:nowrap}.dashboard-nav button.active{background:var(--g);border-color:var(--g);color:#15170f}.system-health{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--p);border:1px solid var(--l);border-radius:11px;padding:9px 11px;margin:-3px 0 10px}.system-health>div{min-width:0}.system-health-kicker{display:block;color:var(--m);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}.system-health b{display:block;font-size:11px;margin-top:2px;white-space:normal}.system-health-status{border:1px solid var(--l);border-radius:999px;padding:3px 7px;font-size:9px;font-weight:800;white-space:nowrap}.system-health.ok .system-health-status{border-color:var(--g);color:var(--g)}.system-health.check .system-health-status{border-color:var(--e);color:var(--e)}.shell[data-dashboard-view="overview"] .grid>:nth-child(n+6){display:none}.shell[data-dashboard-view="devpass"] .grid>:not(:nth-child(6)){display:none}.shell[data-dashboard-view="credits"] .grid>:not(:nth-child(6)){display:none}.shell[data-dashboard-view="devpass"] .usage-primary .scope-tabs,.shell[data-dashboard-view="credits"] .usage-primary .scope-tabs{display:none}.shell[data-dashboard-view="analytics"] .grid>:not(:nth-child(7)){display:none}.shell[data-dashboard-view="settings"] .grid>:not(:nth-child(8)):not(:nth-child(9)){display:none}.muted,p{color:var(--m);font-size:12px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
      .panel{background:var(--p);border:1px solid var(--l);border-radius:13px;padding:13px}.metric{min-height:135px;display:flex;flex-direction:column}.metric small{color:var(--m);font-weight:700}.metric strong{font-size:24px;margin-top:9px}.metric em{font-style:normal;color:var(--m);font-size:12px}.metric p{margin-top:auto;margin-bottom:0}.bar{height:5px;background:#2d3138;border-radius:99px;overflow:hidden;margin:11px 0}.bar i{display:block;height:100%;background:var(--g)}.weekly .bar i{background:var(--v)}.wide{grid-column:1/-1}
      .minis{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:10px}.mini{background:var(--p2);border-radius:9px;padding:9px}.mini span{display:block;color:var(--m);font-size:10px}.mini b{display:block;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mini.cost-driver b{white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere}
      .today-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.today-head b{font-size:14px}.stamp{color:var(--m);font-size:10px;white-space:nowrap}.today-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:10px}.today-grid .mini b{white-space:normal;overflow:visible;text-overflow:clip}.today-grid .accent b{color:var(--g)}.today-grid .purple b{color:var(--v)}.today-grid .cyan b{color:var(--c)}
      .scope-tabs{display:flex;gap:6px;margin-top:10px}.scope-tab{flex:1;min-width:0;padding:7px 9px}.scope-tab.active{background:var(--g);border-color:var(--g);color:#15170f}.credits-org-picker{max-width:420px;margin-top:10px}.credits-org-picker select{margin-top:2px}.credits-org-fallback{margin:6px 0 0}
      .grid>.usage-primary{order:20}.grid>.activity-secondary{order:21}.grid>.analytics-panel{order:30}.grid>.advanced-panel{order:40}
      .usage-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.usage-detail-box{background:var(--p2);border-radius:10px;padding:10px;margin-top:8px}.usage-detail-box h3{font-size:11px;margin:0;color:var(--m)}.usage-detail-box p{margin:8px 0 0}.usage-detail-row{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:7px 0;border-top:1px solid var(--l)}.usage-detail-row:first-of-type{border-top:0}.usage-detail-row>div{min-width:0;flex:1}.usage-detail-row b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.usage-detail-row>span{color:var(--m);font-size:11px;white-space:nowrap}.aggregate-meta{display:flex!important;flex-wrap:wrap;gap:4px;margin-top:4px}.stat-chip{display:inline-flex!important;width:auto;background:#181a1f;border:1px solid var(--l);border-radius:999px;padding:2px 6px;color:var(--m)!important;font-size:9px!important;line-height:1.35;white-space:nowrap}.recent-requests{margin-top:8px}.recent-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.recent-head>span{color:var(--m);font-size:10px}.recent-filter{display:flex;gap:5px;margin:8px 0 2px}.recent-filter-btn{padding:5px 8px;border-radius:999px;font-size:10px;line-height:1.2}.recent-filter-btn.active{background:var(--g);border-color:var(--g);color:#15170f}.request-detail-row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:8px 0;border-top:1px solid var(--l)}.request-detail-row:first-of-type{border-top:0}.request-main{min-width:0;flex:1}.request-detail-row b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.request-detail-row span{display:block;color:var(--m);font-size:10px;margin-top:2px}.request-detail-row .request-model{color:var(--t);font-size:11px;white-space:normal;overflow-wrap:anywhere}.request-detail-row em{font-style:normal;color:var(--m);font-size:11px;text-align:right;white-space:nowrap}.request-detail-row em.error-text{color:var(--e)}.request-detail-row em.ok-text{color:var(--m)}
      .advanced-panel{padding:0;overflow:hidden}.advanced-panel>summary{display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;padding:13px;list-style:none}.advanced-panel>summary::-webkit-details-marker{display:none}.advanced-panel>summary span{color:var(--m);font-size:11px}.advanced-panel>summary:after{content:'펼치기';color:var(--m);font-size:10px;margin-left:auto}.advanced-panel[open]>summary:after{content:'접기'}.advanced-panel[open]>summary{border-bottom:1px solid var(--l)}.advanced-body{padding:0 13px 13px}.settings-section-title{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin:13px 0 4px;padding-top:10px;border-top:1px solid var(--l)}.settings-section-title:first-child{margin-top:2px;padding-top:0;border-top:0}.settings-section-title b{font-size:11px}.settings-section-title span{color:var(--m);font-size:9px;text-align:right}.diag-summary{margin:0 0 10px}
      label{display:grid;gap:5px;margin-top:9px}label span{color:var(--m);font-size:11px}input,textarea,select,button{font:inherit}input,textarea,select{width:100%;background:#111318;color:var(--t);border:1px solid var(--l);border-radius:9px;padding:9px}textarea{min-height:62px}
      button{background:#25282f;color:var(--t);border:1px solid var(--l);border-radius:9px;padding:8px 11px;font-weight:650}button.primary{background:var(--g);border-color:var(--g);color:#15170f}.actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.warn{color:var(--e)}
      @media(max-width:680px){.shell{padding:10px}.grid{grid-template-columns:1fr;gap:8px}.wide{grid-column:auto}.panel{padding:11px}.minis,.today-grid{grid-template-columns:1fr 1fr;gap:6px}.usage-detail-grid{grid-template-columns:1fr;gap:6px}.usage-detail-box{padding:9px;margin-top:6px}.usage-detail-row{padding:6px 0}.request-detail-row{flex-direction:row;gap:8px;padding:7px 0}.request-main{max-width:58%}.request-detail-row b{font-size:12px}.request-detail-row .request-model{font-size:10px}.request-detail-row em{max-width:42%;font-size:10px;text-align:right;white-space:normal}.recent-filter{gap:4px}.recent-filter-btn{padding:5px 7px;font-size:10px}.aggregate-meta{gap:3px}.stat-chip{padding:2px 5px;font-size:8.5px!important}.hour-aggregate-grid{grid-template-columns:1fr}.hour-row em{white-space:normal;text-align:right;max-width:48%}.hour-detail>.recent-head{align-items:flex-start}.hour-detail>.recent-head span{max-width:58%}}
      .hourly-ledger{margin-top:8px}.hour-list{display:grid;gap:5px;margin-top:8px}.hour-row{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;background:#181a1f;padding:8px 9px}.hour-row.active{border-color:var(--g);background:#20251a}.hour-row span{min-width:0}.hour-row b{display:block}.hour-row small{display:block;color:var(--m);font-size:9px;margin-top:2px}.hour-row em{font-style:normal;color:var(--m);font-size:10px;white-space:nowrap}.hour-detail{margin-top:9px;padding-top:9px;border-top:1px solid var(--l)}.hour-detail>.recent-head span{white-space:normal;text-align:right}.hour-request-row:last-child{padding-bottom:0}.hour-aggregate-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0}.hour-aggregate-box{background:#181a1f;border:1px solid var(--l);border-radius:8px;padding:8px}.hour-aggregate-box h4{margin:0 0 4px;color:var(--m);font-size:10px}.hour-aggregate-row{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:5px 0;border-top:1px solid var(--l)}.hour-aggregate-row:first-of-type{border-top:0}.hour-aggregate-row>div{min-width:0;flex:1}.hour-aggregate-row b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px}.hour-aggregate-row small{display:block;color:var(--m);font-size:8.5px;white-space:normal}.hour-aggregate-row>span{color:var(--m);font-size:9px;white-space:nowrap}.hour-request-list{margin-top:4px}
    </style><div class="shell" data-dashboard-view="${dashboardView}"><header><div><div class="muted">MODULAR CORE · v${VERSION}</div><h1>Local Usage Dashboard</h1></div><button id="close">닫기</button></header><nav class="dashboard-nav" role="tablist" aria-label="Dashboard page">${[['overview','Overview'],['devpass','DevPass'],['credits','Credits'],['analytics','Analytics'],['settings','Settings']].map(([key,label]) => `<button role="tab" aria-selected="${dashboardView===key?'true':'false'}" class="${dashboardView===key?'active':''}" data-dashboard-nav="${key}">${label}</button>`).join('')}</nav>${dashboardView === 'overview' ? `<section class="system-health ${stableHealth ? 'ok' : 'check'}"><div><span class="system-health-kicker">System Health</span><b>${esc(systemHealthText)}</b></div><span class="system-health-status">${esc(systemHealthStatus)}</span></section>` : ''}<main class="grid">
      ${card('월간',d.monthly)}${card('주간',d.weekly,'weekly')}
      <section class="panel metric"><small>${esc(c?.label || 'Credits')}</small><strong>${money(c?.balance)}</strong><p>${creditsMeta || '—'}</p></section>
      <section class="panel wide">
        <div class="today-head"><div><b>오늘 관측</b><p style="margin:2px 0 0">핵심 값만 한 화면에 유지</p></div><span class="stamp">KST${observedStamp ? ` · ${dashboardDateText(observedStamp)}` : ''}</span></div>
        <div class="today-grid">
          <div class="mini accent"><span>일간 총 사용량 · 관측</span><b>${money(today.observedDailyTotal,4)}</b></div>
          <div class="mini"><span>월간 총 사용량 · DevPass</span><b>${money(d.monthly?.used,4)}</b></div>
          <div class="mini"><span>오늘 DevPass</span><b>${money(today.devToday,4)}</b></div>
          <div class="mini purple"><span>오늘 프리미엄</span><b>${money(today.premiumToday,4)}</b></div>
          <div class="mini cyan"><span>오늘 Credits</span><b>${money(today.creditsToday,4)}</b></div>
          <div class="mini"><span>24h 서버 비용</span><b>${money(today.cost24h,4)}</b></div>
          <div class="mini accent"><span>월말 예상</span><b>${num(today.projected) ? `${money(today.projected)} · ${Number(today.projectedPercent).toFixed(0)}%` : '리셋 시각 필요'}</b></div>
          <div class="mini"><span>월간 남은 권장</span><b>${money(today.monthlyLeft)}</b></div>
          <div class="mini"><span>프리미엄 남은 권장</span><b>${money(today.weeklyLeft)}</b></div>
          <div class="mini purple"><span>Reset Pass</span><b>${num(today.resetPasses) ? `${today.resetPasses}장${today.resetPassesExact ? '' : ' 기본'}` : 'API 미제공'}</b></div>
          <div class="mini accent"><span>월간 초기화</span><b>${Number.isFinite(today.monthEnd) ? `${remainingTimeForDashboard(today.monthEnd)} · ${dashboardDateText(today.monthEnd,true)}` : '서버 미제공'}</b></div>
          <div class="mini"><span>Bridge 상태</span><b>${esc(h.status || '—')} · ${esc(state.bridgeStatus)}</b></div>
        </div>
        <p>DevPass/Credits의 일간 총 사용량은 이 기기에서 그날 처음 확인한 서버 누적값 이후의 증가분이야.</p>
      </section>
      <section class="panel wide activity-secondary"><b>24h Activity</b><div class="minis"><div class="mini"><span>요청</span><b>${num(a?.requests24h)?`${a.requests24h}회`:'—'}</b></div><div class="mini"><span>비용</span><b>${money(a?.cost24h,4)}</b></div><div class="mini"><span>토큰</span><b>${num(a?.totalTokens24h)?Number(a.totalTokens24h).toLocaleString():'—'}</b></div><div class="mini"><span>오류율</span><b>${num(a?.errorRate24h)?`${Number(a.errorRate24h).toFixed(1)}%`:'—'}</b></div></div></section>
      <section class="panel wide usage-primary">
        <div class="today-head"><div><b>${dashboardView === 'devpass' ? 'DevPass Usage' : dashboardView === 'credits' ? 'Credits Usage' : '24h Usage Scope'}</b><p style="margin:2px 0 0">${esc(scopeNames[scopeKey][1])}</p></div><span class="stamp">${scopeFetchedAt ? dashboardDateText(scopeFetchedAt) : ''}</span></div>
        ${dashboardView === 'credits' ? creditsOrgSelector : ''}
        <div class="scope-tabs" role="tablist" aria-label="24h Usage scope">
          ${[['all','전체'],['devpass','DevPass'],['credits','Credits']].map(([key,label]) => `<button class="scope-tab ${scopeKey===key?'active':''}" data-usage-scope="${key}">${label}</button>`).join('')}
        </div>
        ${scopeActivity ? `<div class="today-grid">
          <div class="mini accent"><span>24h 요청</span><b>${num(scopeActivity.totalRequests) ? `${Number(scopeActivity.totalRequests).toLocaleString()}회` : '—'}</b></div>
          <div class="mini"><span>24h 비용</span><b>${money(scopeActivity.totalCost,4)}</b></div>
          <div class="mini"><span>총 토큰</span><b>${num(scopeActivity.totalTokens) ? Number(scopeActivity.totalTokens).toLocaleString() : '—'}</b></div>
          <div class="mini"><span>입력 / 출력</span><b>${num(scopeActivity.inputTokens) || num(scopeActivity.outputTokens) ? `${num(scopeActivity.inputTokens)?Number(scopeActivity.inputTokens).toLocaleString():'—'} / ${num(scopeActivity.outputTokens)?Number(scopeActivity.outputTokens).toLocaleString():'—'}` : '—'}</b></div>
          <div class="mini"><span>오류</span><b>${num(scopeActivity.errorCount) ? `${Number(scopeActivity.errorCount).toLocaleString()}회 · ${num(scopeActivity.errorRate)?Number(scopeActivity.errorRate).toFixed(1):'0.0'}%` : (num(scopeActivity.errorRate) ? `${Number(scopeActivity.errorRate).toFixed(1)}%` : '—')}</b></div>
          <div class="mini"><span>캐시</span><b>${usageCacheText(scopeActivity)}</b></div>
          <div class="mini cost-driver"><span>24h 비용 주도 · Top Provider</span><b>${esc(scopeTopProvider)}</b></div>
          <div class="mini cost-driver"><span>24h 비용 주도 · Top Model</span><b>${esc(scopeTopModel)}</b></div>
          ${scopeExtra}
        </div>${dashboardView === 'devpass' ? devpassAccountDetailHtml : ''}${scopeUsageDetailsHtml(scopeActivity)}` : `<p>Bridge snapshot에 ${esc(scopeNames[scopeKey][0])} 범위 데이터가 아직 없어.</p>`}
        ${d.usageScopes?.errors?.[scopeKey] ? `<p class="warn">Usage Scope · ${esc(errorSummaryText(d.usageScopes.errors[scopeKey]))}</p>` : ''}
      </section>
      <section class="panel wide analytics-panel">
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
          <div class="mini"><span>요청 캐시 HIT</span><b>${usageCacheText(analyticsW24)}</b></div>
          <div class="mini"><span>Cache Read</span><b>${num(analyticsW24.cacheReadInputTokens) ? `${Number(analyticsW24.cacheReadInputTokens).toLocaleString()} tok` : '—'}</b></div>
          <div class="mini"><span>Cache Write</span><b>${num(analyticsW24.cacheCreationInputTokens) ? `${Number(analyticsW24.cacheCreationInputTokens).toLocaleString()} tok` : '—'}</b></div>
          <div class="mini"><span>Token Read Ratio</span><b>${num(analyticsW24.cacheReadInputTokens) && (Number(analyticsW24.inputTokens || 0) + Number(analyticsW24.cacheReadInputTokens || 0) + Number(analyticsW24.cacheCreationInputTokens || 0)) > 0 ? `${(Number(analyticsW24.cacheReadInputTokens) / (Number(analyticsW24.inputTokens || 0) + Number(analyticsW24.cacheReadInputTokens || 0) + Number(analyticsW24.cacheCreationInputTokens || 0)) * 100).toFixed(1)}%` : '—'}</b></div>
          <div class="mini"><span>7일 총 비용</span><b>${money(analyticsW7?.totalCost,4)}</b></div>
          <div class="mini"><span>7일 일평균</span><b>${num(analyticsAverages.dailyCost7d) ? `${money(analyticsAverages.dailyCost7d,4)}/일` : '—'}</b></div>
          <div class="mini"><span>30일 총 비용</span><b>${money(analyticsW30?.totalCost,4)}</b></div>
          <div class="mini cost-driver"><span>24h 비용 주도 · Top Model</span><b>${esc(analyticsTopModel)}</b></div>
          <div class="mini cost-driver"><span>24h 비용 주도 · Top Provider</span><b>${esc(analyticsTopProvider)}</b></div>
          ${analyticsExtra}
        </div>` : `<p>Bridge snapshot에 ${esc(analyticsNames[analyticsScopeKey][0])} 범위 데이터가 아직 없어.</p>`}
        ${d.analyticsScopes?.errors?.[analyticsScopeKey] ? `<p class="warn">Analytics · ${esc(errorSummaryText(d.analyticsScopes.errors[analyticsScopeKey]))}</p>` : ''}
        ${analyticsBundle?.errors && Object.keys(analyticsBundle.errors).length ? `<p class="warn">기간 일부 실패 · ${esc(Object.entries(analyticsBundle.errors).map(([range,error])=>`${range}: ${errorSummaryText(error)}`).join(' · '))}</p>` : ''}
      </section>
      <details class="panel wide advanced-panel"><summary><b>Local Bridge</b><span>연결 · 설정</span></summary><div class="advanced-body">
        <div class="bridge-config-static"><div class="settings-section-title"><b>Runtime & Update</b><span>현재 설치 버전 · 다음 진단 가이드</span></div>
        <div class="actions"><button id="release-notes-toggle" aria-expanded="false" aria-controls="release-notes-panel">업데이트 내역</button></div>
        ${releaseNotesPanelHtml()}
        <div class="settings-section-title"><b>Connection</b><span>Bridge endpoint · token</span></div><label><span>Bridge URL</span><input id="bridge-base" value="${esc(state.bridgeBase)}"></label>
        <label><span>Bridge Token</span><textarea id="bridge-token" placeholder="저장된 값은 다시 표시하지 않음"></textarea></label>
        <div class="settings-section-title"><b>Refresh</b><span>주기 · stale policy</span></div><label><span>갱신 주기</span><select id="refresh-ms">${[[15000,'15초'],[30000,'30초'],[60000,'1분'],[300000,'5분'],[600000,'10분'],[0,'수동']].map(([v,l])=>`<option value="${v}" ${Number(state.refreshMs)===v?'selected':''}>${l}</option>`).join('')}</select></label>
        <label><span>STALE 기준</span><select id="stale-ms">${[[0,'사용 안 함 · Local JSON 기본'],[60000,'1분'],[300000,'5분'],[900000,'15분'],[1800000,'30분']].map(([v,l])=>`<option value="${v}" ${Number(state.staleAfterMs)===v?'selected':''}>${l}</option>`).join('')}</select></label>
        <div class="settings-section-title"><b>Floating Widget</b><span>표시 정보</span></div><label><span>미니 위젯</span><select id="widget-mode"><option value="compact" ${state.widgetMode!=='detailed'?'selected':''}>간편 · 오늘 사용량</option><option value="detailed" ${state.widgetMode==='detailed'?'selected':''}>상세 · 남은 양 + 오늘 사용량</option></select></label>
        <div class="settings-section-title"><b>Performance</b><span>복귀 · adaptive refresh</span></div><label style="margin-top:10px"><span><input id="sync-on-focus" type="checkbox" ${state.syncOnFocus !== false ? 'checked' : ''} style="width:auto;margin-right:7px">앱/탭 복귀 시 부드럽게 동기화 · 첫 조작 우선</span></label>
        <label style="margin-top:8px"><span><input id="performance-guard" type="checkbox" ${state.performanceGuard !== false ? 'checked' : ''} style="width:auto;margin-right:7px">Performance Guard · 느려지면 자동으로 갱신 간격 완화</span></label>
        <label style="margin-top:8px"><span><input id="adaptive-refresh" type="checkbox" ${state.adaptiveRefresh !== false ? 'checked' : ''} style="width:auto;margin-right:7px">Adaptive refresh · 빠르게 회복되면 원래 주기로 복귀</span></label>
        <label style="margin-top:8px"><span><input id="background-pause" type="checkbox" ${state.backgroundPause !== false ? 'checked' : ''} style="width:auto;margin-right:7px">백그라운드에서는 자동 갱신 일시정지</span></label>
        <div class="actions"><button id="save-performance">성능 설정 저장</button></div>
        </div>
        <div class="settings-section-title"><b>Lifecycle & Recovery</b><span>연결 · 일시정지 · 복구 · 위젯 위치</span></div>
        ${bridgeControlsHtml()}
      </div></details>
      ${diagnosticsWorkspacePanelHtml()}
    </main></div>`;
  }

  function cancelPanelRender() {
    if (panelRenderTimer) clearTimeout(panelRenderTimer);
    panelRenderTimer = null;
    if (panelIdleHandle !== null && typeof window?.cancelIdleCallback === 'function') {
      try { window.cancelIdleCallback(panelIdleHandle); } catch (_) {}
    }
    panelIdleHandle = null;
  }

  // DevPass 2.7.3 panel rendering policy: collapse automatic panel refreshes,
  // wait briefly while the user is interacting, then prefer an idle callback.
  function schedulePanelRender(force = false) {
    if (runtimeDisposed) return;
    if (document.body?.dataset?.panelOpen !== '1') {
      performanceRuntime.panelRenderSkippedClosed += 1;
      return;
    }
    if (state.backgroundPause !== false && document.visibilityState === 'hidden') return;
    if (force) { renderSettings(); return; }
    if (panelRenderTimer || panelIdleHandle !== null) {
      performanceRuntime.panelRenderCoalesced += 1;
      return;
    }
    const interacting = Date.now() - Number(performanceRuntime.lastInteractionAt || 0) < 700;
    const delay = state.performanceGuard !== false && interacting ? 750 : 0;
    panelRenderTimer = setTimeout(() => {
      panelRenderTimer = null;
      const run = () => {
        panelIdleHandle = null;
        if (document.body?.dataset?.panelOpen === '1' && document.visibilityState !== 'hidden') {
          try { renderSettingsPartial(); }
          catch (error) { noteLocalRuntimeError('panel-render', error); }
        }
      };
      if (state.performanceGuard !== false && typeof window?.requestIdleCallback === 'function') {
        panelIdleHandle = window.requestIdleCallback(run, {timeout:500});
      } else {
        run();
      }
    }, delay);
  }
