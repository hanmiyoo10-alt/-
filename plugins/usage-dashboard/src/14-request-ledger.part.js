
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
      const requestedTierField = recentRequestField(row, [
        'requestedServiceTier','requested_service_tier','requestServiceTier','request_service_tier',
        'requestedTier','requested_tier','metadata.requestedServiceTier','metadata.requested_service_tier',
        'request.serviceTier','request.service_tier'
      ]);
      const servedTierField = recentRequestField(row, [
        'servedServiceTier','served_service_tier','usedServiceTier','used_service_tier',
        'actualServiceTier','actual_service_tier','billingServiceTier','billing_service_tier',
        'metadata.servedServiceTier','metadata.served_service_tier','metadata.usedServiceTier','metadata.used_service_tier',
        'response.serviceTier','response.service_tier','serviceTier','service_tier'
      ]);
      const requestedServiceTier = normalizeServiceTierValue(requestedTierField.value);
      const servedServiceTier = normalizeServiceTierValue(servedTierField.value);
      const requestedServiceTierSource = String(recentRequestValue(row, ['requestedServiceTierSource','requested_service_tier_source'], requestedTierField.key) || requestedTierField.key || '');
      const servedServiceTierSource = String(recentRequestValue(row, ['servedServiceTierSource','served_service_tier_source'], servedTierField.key) || servedTierField.key || '');
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
        requestedServiceTier,
        servedServiceTier,
        requestedServiceTierSource,
        servedServiceTierSource,
        requestNumber,
        success,
        errorCode:success ? '' : String(errorCodeRaw ?? ''),
        errorType:success ? '' : String(errorTypeRaw ?? '')
      };
    }).filter(Boolean).sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0)).slice(0, Math.max(1, Number(limit) || 12));
  }

  function requestLedgerCapabilities(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const precisionOf = row => row?.timestampPrecision && row.timestampPrecision !== 'unknown' ? row.timestampPrecision : requestTimestampPrecision(row?.timestamp, row?.timestampSource, row?.requestNumber);
    const exact = list.filter(row => precisionOf(row) === 'exact').length;
    const bucket = list.filter(row => ['hour','hour-estimated'].includes(precisionOf(row))).length;
    const cacheKnown = list.filter(row => typeof row?.cacheHit === 'boolean').length;
    const ids = list.filter(row => String(row?.requestNumber || '')).length;
    const tier = requestServiceTierStats(list);
    return {rows:list.length, exact, bucket, cacheKnown, ids, tier};
  }

  function requestLedgerKey(row) {
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
      byKey.set(requestLedgerKey(row), {...row, timestampPrecision:String(row.timestampPrecision && row.timestampPrecision !== 'unknown' ? row.timestampPrecision : requestTimestampPrecision(row.timestamp, row.timestampSource, row.requestNumber)), scopes:Array.isArray(row.scopes) ? row.scopes : ['all']});
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
          requestedServiceTier:preferKnownServiceTier(row.requestedServiceTier, current?.requestedServiceTier),
          servedServiceTier:preferKnownServiceTier(row.servedServiceTier, current?.servedServiceTier),
          requestedServiceTierSource:String(row.requestedServiceTierSource || current?.requestedServiceTierSource || ''),
          servedServiceTierSource:String(row.servedServiceTierSource || current?.servedServiceTierSource || ''),
          timestampPrecision:String(row.timestampPrecision || current?.timestampPrecision || 'unknown'),
          timestampSource:String(row.timestampSource || current?.timestampSource || ''),
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

  function requestExactTime(row) {
    const timestamp = row?.timestamp;
    if (!num(timestamp)) return '시간 미제공';
    const precision = row?.timestampPrecision && row.timestampPrecision !== 'unknown' ? row.timestampPrecision : requestTimestampPrecision(timestamp, row?.timestampSource, row?.requestNumber);
    if (precision === 'hour' || precision === 'hour-estimated') return `${requestHourLabel(requestHourKey(timestamp))} 버킷 · 정확 시각 미제공`;
    return new Date(Number(timestamp)).toLocaleTimeString('ko-KR', {timeZone:KST_TIME_ZONE,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
  }

  function requestLedgerCoverageText() {
    if (!num(state.requestLedgerStartedAt)) return '관측 시작 —';
    const started = Number(state.requestLedgerStartedAt);
    const elapsed = Math.max(0, Math.min(24 * 60 * 60 * 1000, Date.now() - started));
    const minutes = Math.floor(elapsed / 60000);
    const coverage = elapsed >= 24 * 60 * 60 * 1000
      ? '24h 확보'
      : minutes < 1
        ? '1분 미만 확보'
        : minutes < 60
          ? `${minutes}분 확보`
          : `${Math.floor(minutes / 60)}시간 ${minutes % 60}분 확보`;
    const startedText = new Date(started).toLocaleString('ko-KR', {
      timeZone:KST_TIME_ZONE,
      month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:false
    });
    return `로컬 관측 시작 ${startedText} · ${coverage} / 24h`;
  }

  function aggregateSelectedHour(rows, key) {
    const groups = new Map();
    for (const row of (Array.isArray(rows) ? rows : [])) {
      const name = String(row?.[key] || 'Unknown');
      if (!groups.has(name)) groups.set(name, {name, requests:0, cost:0, costKnown:0, tokens:0, tokenKnown:0, cacheKnown:0, cacheHits:0, errors:0});
      const item = groups.get(name);
      item.requests += 1;
      if (num(row?.cost)) { item.cost += Number(row.cost); item.costKnown += 1; }
      if (num(row?.totalTokens)) { item.tokens += Number(row.totalTokens); item.tokenKnown += 1; }
      if (typeof row?.cacheHit === 'boolean') { item.cacheKnown += 1; if (row.cacheHit) item.cacheHits += 1; }
      if (row?.success === false) item.errors += 1;
    }
    return Array.from(groups.values()).sort((a,b) => b.cost - a.cost || b.requests - a.requests || a.name.localeCompare(b.name));
  }

  function selectedHourAggregateHtml(title, rows) {
    const html = (Array.isArray(rows) ? rows : []).map(row => {
      const cacheText = row.cacheKnown
        ? `캐시 ${(row.cacheHits / row.cacheKnown * 100).toFixed(1)}% · 정보 ${row.cacheKnown}/${row.requests}`
        : `캐시 정보 0/${row.requests}`;
      const meta = [
        row.tokenKnown ? `${row.tokens.toLocaleString()} tok` : '',
        cacheText,
        row.errors ? `오류 ${row.errors}` : ''
      ].filter(Boolean).join(' · ');
      return `<div class="hour-aggregate-row"><div><b>${esc(row.name)}</b><small>${esc(meta)}</small></div><span>${row.requests}회 · ${row.costKnown ? money(row.cost,4) : '비용 —'}</span></div>`;
    }).join('');
    return `<div class="hour-aggregate-box"><h4>${esc(title)}</h4>${html || '<p>데이터 없음</p>'}</div>`;
  }

  function hourlyRequestDrilldownHtml(scopeKey) {
    const rows = requestLedgerRowsForScope(scopeKey);
    const coverageText = requestLedgerCoverageText();
    const fidelity = requestLedgerCapabilities(rows);
    if (!rows.length) {
      return `<div class="usage-detail-box hourly-ledger"><div class="recent-head"><h3>시간별 요청 · 24h 로컬 관측</h3><span>0건</span></div><p>${esc(coverageText)} · 아직 누적된 요청 메타데이터가 없어.</p></div>`;
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
      const cacheText = cacheRate === null
        ? `캐시 정보 0/${hour.length}`
        : `캐시 ${cacheRate.toFixed(1)}% · 정보 ${cacheRows.length}/${hour.length}`;
      const errorText = errors ? ` · 오류 ${errors}` : '';
      const tierText = requestServiceTierSummary(hour);
      return `<button class="hour-row ${selectedKey===key?'active':''}" data-usage-hour="${esc(key)}"><span><b>${esc(requestHourLabel(key))}</b><small>${hour.length}회 · ${costRows.length ? money(totalCost,4) : '비용 —'}</small></span><em>${cacheText} · ${tierText}${errorText}</em></button>`;
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
      const tierSummary = requestServiceTierSummary(selected);
      const cacheSummary = cacheRate === null
        ? `캐시 정보 0/${selected.length} · 비율 —`
        : `캐시 ${cacheRate.toFixed(1)}% · HIT ${cacheHits}/${cacheRows.length} · 정보 ${cacheRows.length}/${selected.length}`;
      const summary = [
        `${selected.length}회`,
        costRows.length ? money(totalCost,4) : '비용 —',
        tokenRows.length ? `${totalTokens.toLocaleString()} tok` : '토큰 —',
        cacheSummary,
        tierSummary,
        errors ? `오류 ${errors}` : '오류 0'
      ].join(' · ');
      const providerSummary = aggregateSelectedHour(selected, 'provider');
      const modelSummary = aggregateSelectedHour(selected, 'model');
      const aggregates = `<div class="hour-aggregate-grid">${selectedHourAggregateHtml('Provider 합계', providerSummary)}${selectedHourAggregateHtml('Model 합계', modelSummary)}</div>`;
      const visible = selected.slice(0, 300);
      const detailRows = visible.map(row => {
        const numberText = row.requestNumber ? `#${esc(row.requestNumber)} · ` : '';
        const resultText = row.success === false
          ? ['오류', row.errorCode ? esc(row.errorCode) : '', row.errorType ? esc(row.errorType) : ''].filter(Boolean).join(' · ')
          : '성공';
        const cacheText = typeof row.cacheHit === 'boolean' ? `캐시 ${row.cacheHit ? 'HIT' : 'MISS'}` : '캐시 정보 없음';
        const tierText = requestServiceTierText(row);
        const usageText = [resultText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', tierText, cacheText].filter(Boolean).join(' · ');
        return `<div class="request-detail-row hour-request-row"><div class="request-main"><b>${numberText}${esc(row.provider)}</b><span class="request-model">${esc(row.model)}</span><span>${esc(requestExactTime(row))}</span></div><em class="${row.success === false ? 'error-text' : 'ok-text'}">${usageText}</em></div>`;
      }).join('');
      const truncated = selected.length > visible.length ? `<p>성능 보호로 최신 ${visible.length}/${selected.length}건 표시</p>` : '';
      selectedHtml = `<div class="hour-detail"><div class="recent-head"><h3>${esc(requestHourLabel(selectedKey))} 요청별 상세</h3><span>${esc(summary)}</span></div>${aggregates}<div class="hour-request-list">${detailRows}</div>${truncated}</div>`;
    }

    return `<div class="usage-detail-box hourly-ledger"><div class="recent-head"><h3>시간별 요청 · 24h 로컬 관측</h3><span>${rows.length}건 · ${groups.size}시간</span></div><p>${esc(coverageText)} · 시각 exact ${fidelity.exact}/${fidelity.rows} · 버킷 ${fidelity.bucket}/${fidelity.rows} · 캐시 정보 ${fidelity.cacheKnown}/${fidelity.rows} · tier 실제 ${fidelity.tier.servedKnown}/${fidelity.rows} · 프롬프트/응답 미저장</p><div class="hour-list">${hourRows}</div>${selectedHtml}</div>`;
  }

  function scopeUsageDetailsHtml(scopeActivity) {
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
      const tierText = requestServiceTierText(row);
      const usageText = [resultText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', tierText, cacheText].filter(Boolean).join(' · ');
      return `<div class="request-detail-row"><div class="request-main"><b>${numberText}${esc(row.provider)}</b><span class="request-model">${esc(row.model)}</span><span>${row.timestamp ? esc(requestExactTime(row)) : '시간 미제공'}</span></div><em class="${row.success ? 'ok-text' : 'error-text'}">${usageText}</em></div>`;
    }).join('');
    const sourceRows = Number(scopeActivity.recentRawCount || 0);
    const filterEmpty = recentAll.length > 0 ? '이 필터에 해당하는 최근 요청 없음'
      : sourceRows > 0 ? `요청 단위 메타데이터 없음 · source rows ${sourceRows}`
      : 'Bridge가 최근 요청 메타데이터를 아직 제공하지 않음';
    const filterButton = (key, label, count) => `<button class="recent-filter-btn ${recentFilter===key?'active':''}" data-recent-filter="${key}">${label} ${count}</button>`;
    const baseHtml = `<div class="usage-detail-grid"><div class="usage-detail-box"><h3>Provider · 요청 / 비용 / 효율</h3>${providers || '<p>데이터 없음</p>'}</div><div class="usage-detail-box"><h3>Model · 요청 / 비용 / 효율</h3>${models || '<p>데이터 없음</p>'}</div></div><div class="usage-detail-box recent-requests"><div class="recent-head"><h3>최근 요청 · 메타데이터</h3><span>${recentRows.length}/${recentCounts.all}</span></div><div class="recent-filter" role="tablist" aria-label="최근 요청 필터">${filterButton('all','전체',recentCounts.all)}${filterButton('success','성공',recentCounts.success)}${filterButton('error','오류',recentCounts.error)}</div>${recentHtml || `<p>${filterEmpty}</p>`}</div>`;
    const scopeKey = ['all','devpass','credits'].includes(String(state.usageScopeView)) ? String(state.usageScopeView) : 'all';
    return baseHtml + hourlyRequestDrilldownHtml(scopeKey);
  }
