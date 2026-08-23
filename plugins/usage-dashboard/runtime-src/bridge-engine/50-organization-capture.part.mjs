async function loadOrgs() {
  const value = await cached('orgs', async () => {
    // Account capture already runs the official `orgs list --json` command and
    // safely records the successful /orgs response. Start that capture beside
    // Credits so the normal path does not launch the same org command twice.
    // Capture failure is converted to a result object only so the legacy plain
    // orgs command can remain the fallback. Credits retains its existing hard
    // failure semantics.
    const capturePromise = loadAccountCapture()
      .then((captured) => ({ captured, error: null }))
      .catch((error) => ({ captured: null, error }));
    const [captureResult, rawCredits] = await Promise.all([
      capturePromise,
      loadCreditsBootstrap(),
    ]);

    const captured = captureResult.captured;
    const capturedRawOrgs = captured?.orgs ?? captured;
    let organizations = normalizeOrganizations(capturedRawOrgs, rawCredits);
    let source = 'LLMGateway CLI session · captured /orgs + Credits CLI';
    let discoveryMode = 'capture-primary';
    let fallbackCount = 0;

    if (!organizations.length) {
      fallbackCount = 1;
      discoveryMode = 'plain-orgs-fallback';
      const rawOrgs = await runCli(['orgs', 'list', '--json']);
      organizations = normalizeOrganizations(rawOrgs, rawCredits);
      source = 'LLMGateway CLI';
    }

    if (!organizations.length) throw new Error('No organizations found in CLI output');

    if (captured?.devPlanStatus) {
      organizations = enrichDevPassFromStatus(organizations, captured.devPlanStatus);
      if (hasDevPassCycleDetails(organizations)) {
        source = 'LLMGateway CLI session · /dev-plans/status';
      }
    }

    return {
      organizations,
      fetchedAt: Date.now(),
      source,
      organizationDiscovery: {
        mode: discoveryMode,
        fallbackCount,
        sharedAccountCapture: Boolean(captured),
        captureErrorCode: captureResult.error ? classifyError(captureResult.error) : null,
      },
    };
  });

  const attribution = currentSnapshotAttribution();
  if (attribution && value?.organizationDiscovery) {
    attribution.organizationDiscovery = { ...value.organizationDiscovery };
  }
  return value;
}

function usageOrganizations(orgData) {
  const rows = orgData?.organizations || [];
  const activeDevPass = rows.filter((row) => row.kind === 'devpass' && row.status !== 'deleted' && row.devPlan && row.devPlan !== 'none');
  const defaults = rows.filter((row) => row.kind === 'default' && row.status !== 'deleted');
  // Keep the dashboard deliberately LLMGateway-only: DevPass plus the regular
  // PAYG/Credits organization. Chat organizations are not queried.
  return [...activeDevPass.slice(0, 1), ...defaults.slice(0, 1)];
}

async function usageForOrg(org, range = '24h', options = {}) {
  const key = `usage:${org.id}:${range}`;
  return cached(key, async () => {
    const breakdownArgs = ['usage', '--org', org.id, '--by', 'model', '--range', range, '--json'];
    const rawBreakdown = await runCli(breakdownArgs);
    let normalized = normalizeUsageActivity(rawBreakdown, org, range);

    if (needsAggregateUsageFallback(normalized)) {
      try {
        const rawAggregate = await runCli(['usage', '--org', org.id, '--range', range, '--json']);
        const aggregate = normalizeUsageActivity(rawAggregate, org, range);
        normalized = mergeAggregateUsageTotals(normalized, aggregate);
      } catch (error) {
        normalized.partialErrors = [
          ...(Array.isArray(normalized.partialErrors) ? normalized.partialErrors : []),
          `aggregate totals: ${safeMessage(error)}`,
        ];
      }
    }
    return normalized;
  }, { deferExpired: options?.deferExpired === true && ['7d','30d'].includes(String(range)) });
}

function creditsUsageSelection(orgData, requestedOrgId = '') {
  const rows = (orgData?.organizations || []).filter((row) => row.kind === 'default' && row.status !== 'deleted');
  const requestedId = String(requestedOrgId || '').trim();
  const requested = requestedId ? rows.find((row) => String(row.id || '') === requestedId) || null : null;
  const fallback = rows.find((row) => finite(row.credits) !== null) || rows[0] || null;
  const org = requested || fallback;
  return {
    org,
    requestedId,
    fallback: Boolean(requestedId && (!requested || String(requested.id || '') !== requestedId)),
    fallbackReason: requestedId && !requested ? 'requested Credits organization unavailable' : '',
  };
}

function creditsUsageOrganization(orgData, requestedOrgId = '') {
  return creditsUsageSelection(orgData, requestedOrgId).org;
}

async function devPassActivityForRange(range = '24h', options = {}) {
  const normalizedRange = ['24h','7d','30d'].includes(String(range)) ? String(range) : '24h';
  return cached(`devpassActivity:${normalizedRange}`, async () => {
    let captured = null;
    const attribution = currentSnapshotAttribution();

    if (normalizedRange === '24h') {
      if (attribution?.captureReuse) attribution.captureReuse.activityReuseChecks += 1;
      try {
        captured = await loadAccountCapture();
      } catch {}
      const sharedEntry = captured?.devpassActivity;
      const sharedRawActivity = sharedEntry?.payload ?? sharedEntry;
      const sharedUsable = Boolean(sharedRawActivity && officialActivityRows(sharedRawActivity).length);
      if (sharedUsable) {
        if (attribution?.captureReuse) attribution.captureReuse.activityShared += 1;
      } else {
        if (attribution?.captureReuse) attribution.captureReuse.dedicated24hFallbacks += 1;
        captured = await captureAccountDetailsViaCliSession('24h');
      }
    } else {
      captured = await captureAccountDetailsViaCliSession(normalizedRange);
    }

    const status = normalizeIndependentDevPassStatus(captured?.devPlanStatus ?? null);
    const entry = captured?.devpassActivity;
    const rawActivity = entry?.payload ?? entry;
    if (!rawActivity || !officialActivityRows(rawActivity).length) {
      if (!status?.projectId) throw new Error('DevPass projectId unavailable from /dev-plans/status');
      throw new Error(`DevPass /activity ${normalizedRange} unavailable for the authenticated project`);
    }
    const org = {
      id: status?.organizationId || null,
      name: `DevPass ${String(status?.plan || '').toUpperCase()}`.trim(),
      kind: 'devpass',
      projectId: status?.projectId || null,
    };
    const normalized = normalizeUsageActivity(rawActivity, org, normalizedRange);
    const exactRecent = normalizedRange === '24h' ? normalizeCapturedRecentLogs(captured?.devpassLogs) : [];
    if (exactRecent.length) normalized.recentRequests = exactRecent;
    normalized.usageScope = 'devpass';
    normalized.source = exactRecent.length
      ? `LLMGateway authenticated session · /activity + /logs · DevPass project · ${normalizedRange}`
      : `LLMGateway authenticated session · /activity · DevPass project · ${normalizedRange}`;
    return normalized;
  }, { deferExpired: options?.deferExpired === true && ['7d','30d'].includes(normalizedRange) });
}

function legacyDevPassUsageOrganization(orgData) {
  const rows = orgData?.organizations || [];
  return rows.find((row) => row.kind === 'devpass' && row.status !== 'deleted' && row.devPlan && row.devPlan !== 'none') || null;
}

async function activityForScope(range = '24h', scope = 'all', creditsOrgId = '', options = {}) {
  const normalizedScope = ['all', 'devpass', 'credits'].includes(scope) ? scope : 'all';
  const normalizedCreditsOrgId = String(creditsOrgId || '').trim();
  const creditsCacheKey = normalizedCreditsOrgId || 'default';
  const deferLongWindow = options?.deferLongWindow === true && ['7d','30d'].includes(String(range));
  return cached(`activity:${normalizedScope}:${creditsCacheKey}:${range}`, async () => {
    const results = [];
    const errors = [];
    let orgData = null;
    let orgLoadError = null;

    const getOrgData = async () => {
      if (orgData) return orgData;
      if (orgLoadError) throw orgLoadError;
      try {
        orgData = await loadOrgs();
        return orgData;
      } catch (error) {
        orgLoadError = error;
        throw error;
      }
    };

    // DevPass Activity is intentionally independent from the public org list.
    // This keeps DevPass analytics alive even if Credits organization discovery
    // is temporarily unavailable.
    if (normalizedScope === 'all' || normalizedScope === 'devpass') {
      try {
        results.push(await devPassActivityForRange(range, { deferExpired:deferLongWindow }));
      } catch (error) {
        try {
          const legacyOrg = legacyDevPassUsageOrganization(await getOrgData());
          if (legacyOrg) {
            try { results.push(await usageForOrg(legacyOrg, range, { deferExpired:deferLongWindow })); }
            catch (legacyError) { errors.push(`devpass: ${safeMessage(error)} · legacy: ${safeMessage(legacyError)}`); }
          } else {
            errors.push(`devpass: ${safeMessage(error)}`);
          }
        } catch (orgError) {
          errors.push(`devpass: ${safeMessage(error)} · org fallback: ${safeMessage(orgError)}`);
        }
      }
    }

    if (normalizedScope === 'all' || normalizedScope === 'credits') {
      try {
        const creditsOrg = creditsUsageOrganization(await getOrgData(), normalizedCreditsOrgId);
        if (creditsOrg) {
          try { results.push(await usageForOrg(creditsOrg, range, { deferExpired:deferLongWindow })); }
          catch (error) { errors.push(`credits: ${safeMessage(error)}`); }
        } else {
          errors.push('credits: default organization unavailable');
        }
      } catch (error) {
        errors.push(`credits: ${safeMessage(error)}`);
      }
    }

    // Legacy unscoped fallback remains combined-only. A partial failure never
    // relabels Credits-only data as DevPass or vice versa.
    if (!results.length && normalizedScope === 'all') {
      try {
        const raw = await runCli(['usage', '--by', 'model', '--range', range, '--json']);
        results.push(normalizeUsageActivity(raw, null, range));
      } catch (error) {
        errors.push(`fallback: ${safeMessage(error)}`);
      }
    }

    if (!results.length) throw new Error(`${normalizedScope} usage unavailable${errors.length ? ` · ${errors.join(' · ')}` : ''}`);
    const merged = mergeUsageActivities(results, range);
    merged.usageScope = normalizedScope;
    merged.source = normalizedScope === 'devpass'
      ? `LLMGateway authenticated session · DevPass /activity · ${range}`
      : normalizedScope === 'credits'
        ? `LLMGateway CLI · Credits usage · ${range}`
        : `LLMGateway hybrid · DevPass /activity + Credits CLI · ${range}`;
    if (errors.length) merged.partialErrors = errors;
    return merged;
  });
}

async function activityForRange(range = '24h', creditsOrgId = '') {
  return activityForScope(range, 'all', creditsOrgId);
}

async function activity(creditsOrgId = '') {
  return activityForScope('24h', 'all', creditsOrgId);
}

async function usageScopes(creditsOrgId = '') {
  const creditsCacheKey = String(creditsOrgId || '').trim() || 'default';
  return cached(`usageScopes:${creditsCacheKey}`, async () => {
    const scopes = ['all', 'devpass', 'credits'];
    const settled = await Promise.allSettled(scopes.map((scope) => timedSnapshotTask(`usage.${scope}`, () => activityForScope('24h', scope, creditsOrgId))));
    const values = {};
    const errors = {};
    settled.forEach((result, index) => {
      const scope = scopes[index];
      if (result.status === 'fulfilled') values[scope] = result.value;
      else errors[scope] = safeMessage(result.reason);
    });
    if (!Object.keys(values).length) throw new Error('Usage scopes unavailable');
    return { scopes: values, errors, fetchedAt: Date.now(), source: 'LLMGateway hybrid scoped usage' };
  });
}

async function analyticsForScope(scope = 'all', creditsOrgId = '', options = {}) {
  const normalizedScope = ['all', 'devpass', 'credits'].includes(scope) ? scope : 'all';
  const creditsCacheKey = String(creditsOrgId || '').trim() || 'default';
  return cached(`analytics:${normalizedScope}:${creditsCacheKey}`, async () => {
    const ranges = ['24h', '7d', '30d'];
    const settled = await Promise.allSettled(ranges.map((range) => timedSnapshotTask(`analytics.${normalizedScope}.${range}`, () => activityForScope(range, normalizedScope, creditsOrgId, { deferLongWindow:options?.deferLongWindow === true }))));
    const windows = {};
    const errors = {};
    settled.forEach((result, index) => {
      const range = ranges[index];
      if (result.status === 'fulfilled') windows[range] = result.value;
      else errors[range] = safeMessage(result.reason);
    });
    if (!Object.keys(windows).length) {
      throw new Error(`${normalizedScope} analytics unavailable${Object.keys(errors).length ? ` · ${Object.entries(errors).map(([range, message]) => `${range}: ${message}`).join(' · ')}` : ''}`);
    }
    const seven = windows['7d'] || null;
    const thirty = windows['30d'] || null;
    return {
      scope: normalizedScope,
      windows,
      averages: {
        dailyCost7d: seven ? (finite(seven.totalCost) ?? 0) / 7 : null,
        dailyRequests7d: seven ? (finite(seven.totalRequests) ?? 0) / 7 : null,
        dailyCost30d: thirty ? (finite(thirty.totalCost) ?? 0) / 30 : null,
      },
      errors,
      fetchedAt: Date.now(),
      source: `LLMGateway CLI ${normalizedScope} analytics`,
    };
  });
}

async function analytics(creditsOrgId = '') {
  return analyticsForScope('all', creditsOrgId);
}

async function analyticsScopes(creditsOrgId = '', options = {}) {
  const creditsCacheKey = String(creditsOrgId || '').trim() || 'default';
  return cached(`analyticsScopes:${creditsCacheKey}`, async () => {
    const scopes = ['all', 'devpass', 'credits'];
    const settled = await Promise.allSettled(scopes.map((scope) => timedSnapshotTask(`analytics.${scope}`, () => analyticsForScope(scope, creditsOrgId, { deferLongWindow:options?.deferLongWindow === true }))));
    const values = {};
    const errors = {};
    settled.forEach((result, index) => {
      const scope = scopes[index];
      if (result.status === 'fulfilled') values[scope] = result.value;
      else errors[scope] = safeMessage(result.reason);
    });
    if (!Object.keys(values).length) throw new Error('Analytics scopes unavailable');
    return { scopes: values, errors, fetchedAt: Date.now(), source: 'LLMGateway CLI scoped analytics' };
  });
}

async function runwayFor(orgId, options = {}) {
  return cached(`runway:${orgId}`, async () => {

      const orgData = await loadOrgs();
      const org = orgData.organizations.find((item) => item.id === orgId) || null;
      const balance = finite(org?.credits);
      let total7d = null;
      try {
        if (org) {
          const usage = await usageForOrg(org, '7d');
          if (valueIsStale(usage)) throw new Error('Runway usage source is stale');
          total7d = finite(usage?.totalCost);
        }
      } catch {}
      if (total7d === null) {
        const creditsOnly = await activityForScope('7d', 'credits', orgId);
        if (valueIsStale(creditsOnly)) throw new Error('Runway activity source is stale');
        total7d = finite(creditsOnly?.totalCost);
      }
      const avgDailySpend7d = total7d !== null ? Math.max(0, total7d / 7) : null;
      const runwayDays = balance !== null && avgDailySpend7d && avgDailySpend7d > 0
        ? balance / avgDailySpend7d
        : null;
      return { runwayDays, avgDailySpend7d, approximate: true, fetchedAt: Date.now(), source: 'LLMGateway CLI usage 7d' };
  }, { deferExpired:options?.deferExpired === true });
}

function newestCacheAt(match) {
  let newest = null;
  for (const [key, entry] of cache) {
    const ok = typeof match === 'function' ? match(key) : String(key).startsWith(String(match));
    if (!ok) continue;
    const at = Number(entry?.at || 0);
    if (at > 0 && (!newest || at > newest)) newest = at;
  }
  return newest;
}

function snapshotModuleDuration(family) {
  const tasks = currentSnapshotAttribution()?.tasks || {};
  const taskName = family === 'organizations' ? 'organizations'
    : family === 'account' ? 'devpassStatus'
      : family === 'devpassActivity' ? 'usage.devpass'
        : family === 'creditsUsage' ? 'usage.credits'
          : family === 'usageScopes' ? 'usageScopes'
            : family === 'analytics' ? 'analyticsScopes'
              : family === 'runway' ? 'runway'
                : '';
  const value = taskName ? Number(tasks[taskName]) : NaN;
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function moduleMeta(status, family, updatedAt = null, error = null) {
  const circuit = getCircuit(family);
  const circuitState = circuit.state === 'open' && Date.now() >= circuit.openUntil ? 'half-open' : circuit.state;
  const finalStatus = circuitState === 'open' && status === 'error' ? 'open' : status;
  return {
    status: finalStatus,
    stale: status === 'stale',
    updatedAt: updatedAt || circuit.lastSuccessAt || null,
    durationMs: snapshotModuleDuration(family),
    circuit: circuitState,
    failures: circuit.failures,
    retryInMs: circuitState === 'open' ? Math.max(0, circuit.openUntil - Date.now()) : 0,
    errorCode: error ? classifyError(error) : (circuit.lastErrorCode || null),
  };
}

function staleCacheMetadata(value) {
  if (!value || typeof value !== 'object') return [];
  const metadata = [];
  if (value?._cache?.stale === true) metadata.push(value._cache);
  if (value.windows && typeof value.windows === 'object') {
    for (const item of Object.values(value.windows)) {
      if (item?._cache?.stale === true) metadata.push(item._cache);
    }
  }
  if (value.scopes && typeof value.scopes === 'object') {
    for (const scopeValue of Object.values(value.scopes)) {
      if (scopeValue?._cache?.stale === true) metadata.push(scopeValue._cache);
      if (!scopeValue?.windows || typeof scopeValue.windows !== 'object') continue;
      for (const item of Object.values(scopeValue.windows)) {
        if (item?._cache?.stale === true) metadata.push(item._cache);
      }
    }
  }
  return metadata;
}

function valueIsStale(value) {
  return staleCacheMetadata(value).length > 0;
}

function staleValueReason(value) {
  return staleCacheMetadata(value).some((meta) => String(meta?.reason) === 'deferred-refresh')
    ? 'deferred-refresh'
    : 'refresh-error';
}

function moduleValueStatus(value) {
  if (!value) return 'error';
  return valueIsStale(value) ? 'stale' : 'ok';
}

