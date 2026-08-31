
  function normalizeRequestProvenanceMetadata(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const captureMode = ['account-wide','project-fallback','unknown'].includes(String(raw.captureMode))
      ? String(raw.captureMode)
      : 'unknown';
    const bounded = value => num(value) ? Math.max(0, Number(value)) : 0;
    return {
      captureMode,
      rows:bounded(raw.rows),
      fallbackCount:bounded(raw.fallbackCount),
      devpass:bounded(raw.devpass),
      credits:bounded(raw.credits),
      unknown:bounded(raw.unknown),
      conflict:bounded(raw.conflict),
      modelInference:0,
      authority:String(raw.authority || '') === 'project-exact+credits-org-used-mode'
        ? 'project-exact+credits-org-used-mode'
        : 'unknown',
    };
  }


  function normalizeDailyScalarSeries(value) {
    if (!value || typeof value !== 'object') return null;
    const exact = scalar => typeof scalar === 'number' && Number.isFinite(scalar) && scalar >= 0 ? Number(scalar) : null;
    const granularity = typeof value.granularity === 'string' ? value.granularity.trim().toLowerCase() : '';
    const range = typeof value.range === 'string' ? value.range.trim() : '';
    const buckets = Array.isArray(value.buckets) ? value.buckets.map(row => {
      const date = typeof row?.date === 'string' && row.date.trim() ? row.date.trim() : null;
      if (!date) return null;
      return {
        date,
        requestCount:exact(row.requestCount),
        inputTokens:exact(row.inputTokens),
        cachedTokens:exact(row.cachedTokens),
        totalTokens:exact(row.totalTokens),
      };
    }).filter(Boolean) : [];
    if (!granularity && !buckets.length) return null;
    return {range,granularity,buckets};
  }

  function normalizeCreditsSpendComposition(value) {
    if (!value || typeof value !== 'object' || String(value.window || '') !== '24h') return null;
    const exact = scalar => typeof scalar === 'number' && Number.isFinite(scalar) && scalar >= 0 ? Number(scalar) : null;
    const usageCost = exact(value.usageCost);
    const dataStorageCost = exact(value.dataStorageCost);
    const expectedTotal = usageCost !== null && dataStorageCost !== null ? usageCost + dataStorageCost : null;
    const reportedTotal = exact(value.totalSpend);
    const complete = value.complete === true && expectedTotal !== null && reportedTotal !== null && Math.abs(reportedTotal - expectedTotal) <= 1e-9;
    return {
      window:'24h',
      usageCost,
      dataStorageCost,
      totalSpend:complete ? expectedTotal : null,
      usageCostSource:usageCost !== null && String(value.usageCostSource) === 'activity.creditsCost' ? 'activity.creditsCost' : 'unknown',
      dataStorageCostSource:dataStorageCost !== null && String(value.dataStorageCostSource) === 'activity.creditsDataStorageCost' ? 'activity.creditsDataStorageCost' : 'unknown',
      complete,
    };
  }

  function normalizeScopeActivity(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const rows = value => Array.isArray(value) ? value.map(row => ({
      name:String(row?.name || 'Unknown'),
      requests:num(row?.requests) ? Number(row.requests) : 0,
      cost:num(row?.cost) ? Number(row.cost) : 0,
      totalTokens:num(row?.totalTokens ?? row?.total_tokens) ? Number(row.totalTokens ?? row.total_tokens) : null,
      inputTokens:num(row?.inputTokens ?? row?.input_tokens) ? Number(row.inputTokens ?? row.input_tokens) : null,
      outputTokens:num(row?.outputTokens ?? row?.output_tokens) ? Number(row.outputTokens ?? row.output_tokens) : null,
      errorCount:num(row?.errorCount ?? row?.error_count) ? Number(row.errorCount ?? row.error_count) : null,
      errorRate:num(row?.errorRate ?? row?.error_rate) ? Number(row.errorRate ?? row.error_rate) : null,
      cacheCount:num(row?.cacheCount ?? row?.cache_count) ? Number(row.cacheCount ?? row.cache_count) : null,
      cacheRate:num(row?.cacheRate ?? row?.cache_rate) ? Number(row.cacheRate ?? row.cache_rate) : null,
      cachedInputTokens:num(row?.cachedInputTokens ?? row?.cached_input_tokens ?? row?.cachedTokens ?? row?.cached_tokens) ? Number(row.cachedInputTokens ?? row.cached_input_tokens ?? row.cachedTokens ?? row.cached_tokens) : null,
      cacheReadInputTokens:num(row?.cacheReadInputTokens ?? row?.cache_read_input_tokens) ? Number(row.cacheReadInputTokens ?? row.cache_read_input_tokens) : null,
      cacheCreationInputTokens:num(row?.cacheCreationInputTokens ?? row?.cache_creation_input_tokens ?? row?.cacheWriteTokens ?? row?.cache_write_tokens) ? Number(row.cacheCreationInputTokens ?? row.cache_creation_input_tokens ?? row.cacheWriteTokens ?? row.cache_write_tokens) : null
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
    const cachedInputTokens = num(raw.cachedInputTokens ?? raw.cached_input_tokens ?? raw.cachedTokens ?? raw.cached_tokens) ? Number(raw.cachedInputTokens ?? raw.cached_input_tokens ?? raw.cachedTokens ?? raw.cached_tokens) : null;
    const cacheReadInputTokens = num(raw.cacheReadInputTokens ?? raw.cache_read_input_tokens) ? Number(raw.cacheReadInputTokens ?? raw.cache_read_input_tokens) : null;
    const cacheCreationInputTokens = num(raw.cacheCreationInputTokens ?? raw.cache_creation_input_tokens ?? raw.cacheWriteTokens ?? raw.cache_write_tokens) ? Number(raw.cacheCreationInputTokens ?? raw.cache_creation_input_tokens ?? raw.cacheWriteTokens ?? raw.cache_write_tokens) : null;
    const creditsSpendComposition = normalizeCreditsSpendComposition(raw.creditsSpendComposition);
    const providers = rows(raw.providers);
    const models = rows(raw.models);
    const recentCandidates = [
      ['requestLedger', raw.requestLedger], ['request_ledger', raw.request_ledger],
      ['recentRequests', raw.recentRequests], ['recent_requests', raw.recent_requests],
      ['requests', raw.requests], ['recent', raw.recent]
    ];
    const recentSource = recentCandidates.find(([,value]) => Array.isArray(value) && value.length) || recentCandidates.find(([,value]) => Array.isArray(value)) || ['none', []];
    const recentSourceKey = recentSource[0];
    const rawRecent = Array.isArray(recentSource[1]) ? recentSource[1] : [];
    const recent = normalizeRecentRequestRows(rawRecent);
    const recentLedger = normalizeRecentRequestRows(rawRecent, 200);
    if (![totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate,cachedInputTokens,cacheReadInputTokens,cacheCreationInputTokens].some(num) && !providers.length && !models.length && !rawRecent.length && !creditsSpendComposition) return null;
    return {totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate,cachedInputTokens,cacheReadInputTokens,cacheCreationInputTokens,providers,models,recent,recentLedger,recentSourceKey,recentRawCount:rawRecent.length,creditsSpendComposition,requestProvenance:normalizeRequestProvenanceMetadata(raw?.requestProvenance),dailySeries:normalizeDailyScalarSeries(raw.dailySeries),fetchedAt:raw.fetchedAt || Date.now(),source:String(raw.source || 'LLMGateway scoped usage')};
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
    return {scopes,errors:normalizeErrorMap(raw?.errors),fetchedAt:raw?.fetchedAt || scopes.all?.fetchedAt || Date.now(),source:String(raw?.source || 'LLMGateway hybrid scoped usage')};
  }

  function normalizeAnalyticsPayload(raw, fallback24h = null) {
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
      errors:normalizeErrorMap(raw?.errors),
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
      errors:normalizeErrorMap(raw?.errors),
      fetchedAt:raw?.fetchedAt || scopes.all?.fetchedAt || Date.now(),
      source:String(raw?.source || 'LLMGateway hybrid scoped analytics')
    };
  }


  function costDriverMeaningfulName(value) {
    const name = value === null || value === undefined ? '' : String(value).trim();
    return !name || name.toLowerCase() === 'unknown' ? '' : name;
  }

  function costDriverCodePointCompare(left, right) {
    const a = Array.from(String(left || ''));
    const b = Array.from(String(right || ''));
    const length = Math.max(a.length, b.length);
    for (let index = 0; index < length; index += 1) {
      if (index >= a.length) return -1;
      if (index >= b.length) return 1;
      const ac = a[index].codePointAt(0);
      const bc = b[index].codePointAt(0);
      if (ac !== bc) return ac - bc;
    }
    return 0;
  }

  function costDriverLeader(rows, totalCost) {
    const source = Array.isArray(rows) ? rows : [];
    if (!source.length) return Object.freeze({name:null,cost:null,share:null,state:'source-unavailable',shareState:'total-unknown'});
    let positiveCostRows = 0;
    const candidates = [];
    for (const row of source) {
      const cost = typeof row?.cost === 'number' && Number.isFinite(row.cost) ? Number(row.cost) : null;
      if (!(cost > 0)) continue;
      positiveCostRows += 1;
      const name = costDriverMeaningfulName(row?.name);
      if (!name) continue;
      candidates.push({name,cost});
    }
    if (!candidates.length) {
      return Object.freeze({
        name:null,
        cost:null,
        share:null,
        state:positiveCostRows > 0 ? 'name-unavailable' : 'no-positive-cost',
        shareState:'total-unknown',
      });
    }
    const ranked = candidates.slice().sort((left, right) => {
      if (right.cost !== left.cost) return right.cost - left.cost;
      return costDriverCodePointCompare(left.name, right.name);
    });
    const leader = ranked[0];
    const total = typeof totalCost === 'number' && Number.isFinite(totalCost) && totalCost > 0 ? Number(totalCost) : null;
    const share = total !== null && total >= leader.cost ? leader.cost / total * 100 : null;
    return Object.freeze({
      name:leader.name,
      cost:leader.cost,
      share,
      state:'ok',
      shareState:share === null ? 'total-unknown' : 'ok',
    });
  }

  function compactCostDriverTruth(window) {
    const value = window && typeof window === 'object' ? window : null;
    const totalCost = value?.totalCost;
    return Object.freeze({
      model:costDriverLeader(value?.models, totalCost),
      provider:costDriverLeader(value?.providers, totalCost),
    });
  }

  function costDriverDiagnosticText(scope, window) {
    const scopeKey = ['all','devpass','credits'].includes(String(scope)) ? String(scope) : 'all';
    const truth = compactCostDriverTruth(window);
    const format = row => {
      if (!row?.name) return `— (${row?.state || 'source-unavailable'})`;
      const share = row.share === null ? ` · share — (${row.shareState})` : ` · share ${Number(row.share).toFixed(1)}%`;
      return `${row.name} $${Number(row.cost).toFixed(4)}${share}`;
    };
    return `Cost drivers: scope ${scopeKey} · window 24h · model ${format(truth.model)} · provider ${format(truth.provider)} · fidelity positive-cost-only`;
  }

  function creditsSpendCompositionDiagnosticText(value) {
    const truth = value && typeof value === 'object' ? value : null;
    const format = scalar => typeof scalar === 'number' && Number.isFinite(scalar) && scalar >= 0 ? `$${Number(scalar).toFixed(4)}` : '—';
    if (!truth) return 'Credits spend composition: window 24h · usage — · storage — · total — · complete no · source unknown';
    const sources = [truth.usageCostSource, truth.dataStorageCostSource].filter(source => source && source !== 'unknown');
    return `Credits spend composition: window 24h · usage ${format(truth.usageCost)} · storage ${format(truth.dataStorageCost)} · total ${format(truth.totalSpend)} · complete ${truth.complete ? 'yes' : 'no'} · source ${sources.join(' + ') || 'unknown'}`;
  }

  function normalize(payload) {
    const r = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
    if (!r || typeof r !== 'object') throw new Error('snapshot 형식이 잘못됐어.');

    // DevPass Bridge v1.6.x compatibility adapter.
    // Keep the original generic local-JSON adapter below as a fallback.
    const ds = r.devpassStatus && typeof r.devpassStatus === 'object' ? r.devpassStatus : null;
    const ba = r.activity && typeof r.activity === 'object' ? r.activity : null;
    if (ds || r.__bridgeSnapshot || r.bridgeVersion) {
      const directResetPasses = ds && num(ds.resetPasses) ? Number(ds.resetPasses) : null;
      const includedResetPassesRemaining = ds && num(ds.includedResetPassesRemaining) ? Number(ds.includedResetPassesRemaining) : null;
      const resetPassesRemaining = directResetPasses !== null
        ? directResetPasses + Number(includedResetPassesRemaining || 0)
        : includedResetPassesRemaining;
      const monthly = ds ? bucket({
        label:'DevPass 월간',
        used:ds.creditsUsed,
        limit:ds.creditsLimit,
        remaining:ds.creditsRemaining,
        resetAt:ds.expiresAt
      }, 'DevPass 월간') : null;
      const weekly = ds ? bucket({
        label:'Premium 주간',
        used:ds.premiumCreditsUsed,
        limit:ds.premiumWeeklyLimit,
        resetAt:ds.premiumWeekResetsAt,
        resetPasses:resetPassesRemaining,
        resetPassesExact:num(resetPassesRemaining)
      }, 'Premium 주간') : null;
      const orgRows = Array.isArray(r.orgs)
        ? r.orgs
        : (Array.isArray(r.orgs?.organizations)
          ? r.orgs.organizations
          : (Array.isArray(r.orgs?.data?.organizations) ? r.orgs.data.organizations : []));
      const selectedCreditsOrgId = String(r.creditsOrganizationId || '').trim();
      const creditOrg = orgRows.find(org =>
        selectedCreditsOrgId && String(org?.id || '') === selectedCreditsOrgId &&
        String(org?.kind || 'default') === 'default' &&
        String(org?.status || 'active') !== 'deleted'
      ) || orgRows.find(org =>
        String(org?.kind || 'default') === 'default' &&
        String(org?.status || 'active') !== 'deleted' &&
        num(org?.credits)
      ) || orgRows.find(org => String(org?.status || 'active') !== 'deleted' && num(org?.credits)) || null;
      const credits = creditOrg
        ? {label:'Credits', balance:Number(creditOrg.credits), todayUsed:null}
        : (ds && num(ds.regularCredits)
          ? {label:'Credits', balance:Number(ds.regularCredits), todayUsed:null}
          : null);
      const activity = ba ? {
        requests24h:num(ba.totalRequests)?Number(ba.totalRequests):null,
        cost24h:num(ba.totalCost)?Number(ba.totalCost):null,
        totalTokens24h:num(ba.totalTokens)?Number(ba.totalTokens):null,
        errorRate24h:num(ba.errorRate)?Number(ba.errorRate):null
      } : null;
      const usageScopes = normalizeUsageScopesPayload(r.usageScopes, ba || activity);
      const analytics = normalizeAnalyticsPayload(r.analytics, usageScopes?.scopes?.all || ba || activity);
      const analyticsScopes = normalizeAnalyticsScopesPayload(r.analyticsScopes, usageScopes, analytics);
      const runwayRaw = r.runway && typeof r.runway === 'object' ? r.runway : null;
      const runway = runwayRaw ? {
        runwayDays:num(runwayRaw.runwayDays)?Number(runwayRaw.runwayDays):null,
        avgDailySpend7d:num(runwayRaw.avgDailySpend7d)?Number(runwayRaw.avgDailySpend7d):null,
        fetchedAt:runwayRaw.fetchedAt || r.fetchedAt || Date.now()
      } : null;
      const devpassAccount = ds ? {
        plan:String(ds.plan || 'none'),
        cycle:typeof ds.cycle === 'string' ? ds.cycle.trim() : '',
        billingCycleStart:ds.billingCycleStart || null,
        expiresAt:ds.expiresAt || null,
        cancelled:typeof ds.cancelled === 'boolean' ? ds.cancelled : null,
        pendingTier:ds.pendingTier === null || ds.pendingTier === undefined ? '' : String(ds.pendingTier),
        serviceTier:String(ds.serviceTier || 'default'),
        routingStrategy:String(ds.routingStrategy || 'auto'),
        paygEnabled:typeof ds.paygEnabled === 'boolean' ? ds.paygEnabled : null,
        autoTopUpEnabled:typeof ds.autoTopUpEnabled === 'boolean' ? ds.autoTopUpEnabled : null,
        autoTopUpThreshold:num(ds.autoTopUpThreshold) ? Number(ds.autoTopUpThreshold) : null,
        autoTopUpAmount:num(ds.autoTopUpAmount) ? Number(ds.autoTopUpAmount) : null,
        hasPersonalOrg:typeof ds.hasPersonalOrg === 'boolean' ? ds.hasPersonalOrg : null,
        hasBillingHistory:typeof ds.hasBillingHistory === 'boolean' ? ds.hasBillingHistory : null,
        resetPasses:num(ds.resetPasses) ? Number(ds.resetPasses) : null,
        includedResetPasses:num(ds.includedResetPasses) ? Number(ds.includedResetPasses) : null,
        includedResetPassesRemaining:num(ds.includedResetPassesRemaining) ? Number(ds.includedResetPassesRemaining) : null,
        resetPassPrice:num(ds.resetPassPrice) ? Number(ds.resetPassPrice) : null,
        regularCredits:num(ds.regularCredits) ? Number(ds.regularCredits) : null,
        source:String(ds.source || '')
      } : null;
      const out = {
        protocolVersion:Number(r.protocolVersion || 1),
        fetchedAt:r.fetchedAt || ds?.fetchedAt || ba?.fetchedAt || Date.now(),
        source:String(ba?.source || ds?.source || ('LLMGateway DevPass Bridge' + (r.bridgeVersion ? ' v' + r.bridgeVersion : ''))),
        health:{status:r.ok === false ? 'error' : 'ok', bridgeVersion:r.bridgeVersion || null},
        bridge:normalizeBridgeMetadata(r),
        monthly, weekly, credits, activity, runway, usageScopes, analytics, analyticsScopes, devpassAccount,
        organizations:orgRows.filter(org => String(org?.id || '') && String(org?.status || 'active') !== 'deleted').map(org => ({id:String(org.id),name:String(org?.name || org.id),kind:String(org?.kind || 'default'),status:String(org?.status || 'active'),credits:num(org?.credits)?Number(org.credits):null})),
        creditsOrganizationId:String(r.creditsOrganizationId || creditOrg?.id || ''),
        requestedCreditsOrganizationId:String(r.requestedCreditsOrganizationId || ''),
        creditsOrganizationFallback:r.creditsOrganizationFallback === true,
        creditsOrganizationFallbackReason:String(r.creditsOrganizationFallbackReason || '')
      };
      if (!out.monthly && !out.weekly && !out.credits && !out.activity) throw new Error('DevPass Bridge에 표시할 데이터가 없어.');
      return out;
    }

    const u = r.usage && typeof r.usage === 'object' ? r.usage : r;
    const credits = u.credits && typeof u.credits === 'object'
      ? {label:String(u.credits.label || 'Credits'), balance:num(u.credits.balance)?Number(u.credits.balance):null, todayUsed:num(u.credits.todayUsed)?Number(u.credits.todayUsed):null}
      : null;
    const activity = u.activity && typeof u.activity === 'object'
      ? {requests24h:num(u.activity.requests24h)?Number(u.activity.requests24h):null, cost24h:num(u.activity.cost24h)?Number(u.activity.cost24h):null, totalTokens24h:num(u.activity.totalTokens24h)?Number(u.activity.totalTokens24h):null, errorRate24h:num(u.activity.errorRate24h)?Number(u.activity.errorRate24h):null}
      : null;
    const usageScopes = normalizeUsageScopesPayload(r.usageScopes ?? u.usageScopes, u.activity || activity);
    const analytics = normalizeAnalyticsPayload(r.analytics ?? u.analytics, usageScopes?.scopes?.all || u.activity || activity);
    const analyticsScopes = normalizeAnalyticsScopesPayload(r.analyticsScopes ?? u.analyticsScopes, usageScopes, analytics);
    const out = {
      protocolVersion: Number(r.protocolVersion || 1), fetchedAt: r.fetchedAt || Date.now(),
      source: String(r.source || 'Local Bridge'), health: r.health && typeof r.health === 'object' ? r.health : null,
      bridge: normalizeBridgeMetadata(r),
      monthly: bucket(u.monthly, '월간'), weekly: bucket(u.weekly, '주간'), credits, activity, usageScopes, analytics, analyticsScopes
    };
    if (!out.monthly && !out.weekly && !out.credits && !out.activity) throw new Error('표시할 usage 데이터가 없어.');
    return out;
  }

  async function persist() {
    if (runtimeDisposed) return dropStaleAsync();
    await store.setItem(STATE_KEY, {...state});
    powerRuntime.persistWrites += 1;
  }

  function localRuntimeErrorKind(stage) {
    const key = String(stage || 'runtime');
    if (key.includes('persist')) return 'persist';
    if (key.includes('render')) return 'render';
    return 'runtime';
  }

  function localRuntimeActiveEntries() {
    return Object.values(localRuntimeErrors.active || {}).filter(Boolean);
  }

  function localRuntimeActiveCount() {
    return localRuntimeActiveEntries().length;
  }

  function noteLocalRuntimeError(stage, error) {
    const key = String(stage || 'runtime');
    const kind = localRuntimeErrorKind(key);
    const message = String(error?.message || error || 'unknown error')
      .replace(/llmgtwy_[A-Za-z0-9_-]+/g, 'llmgtwy_[REDACTED]')
      .replace(/Bearer\s+[^\s'\"]+/gi, 'Bearer [REDACTED]')
      .replace(/\s+/g, ' ')
      .slice(0, 180);
    const now = Date.now();
    localRuntimeErrors.count += 1;
    if (kind === 'persist') localRuntimeErrors.persistFailures += 1;
    if (kind === 'render') localRuntimeErrors.renderFailures += 1;
    const current = localRuntimeErrors.active?.[kind] || null;
    localRuntimeErrors.active[kind] = {
      stage:key,
      message,
      since:current?.since || now,
      lastAt:now,
      failures:Number(current?.failures || 0) + 1,
    };
    localRuntimeErrors.lastStage = key;
    localRuntimeErrors.lastMessage = message;
    localRuntimeErrors.lastAt = now;
    console.log(`[Local Usage Dashboard] local ${key} failed: ${message}`);
  }

  function noteLocalRuntimeRecovery(stage) {
    const key = String(stage || 'runtime');
    const kind = localRuntimeErrorKind(key);
    const active = localRuntimeErrors.active?.[kind] || null;
    if (!active) return false;
    localRuntimeErrors.active[kind] = null;
    localRuntimeErrors.recoveredCount = Number(localRuntimeErrors.recoveredCount || 0) + 1;
    localRuntimeErrors.lastRecoveryStage = key;
    localRuntimeErrors.lastRecoveryAt = Date.now();
    return true;
  }

  async function persistRefreshState(stage) {
    try { await persist(); noteLocalRuntimeRecovery(stage); return true; }
    catch (error) { noteLocalRuntimeError(stage, error); return false; }
  }

  async function renderRefreshWidget(reason, stage) {
    try { await renderWidget(reason); noteLocalRuntimeRecovery(stage); return true; }
    catch (error) { noteLocalRuntimeError(stage, error); return false; }
  }
