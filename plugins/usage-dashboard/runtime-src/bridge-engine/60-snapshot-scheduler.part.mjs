async function snapshot(profile = 'full', creditsOrgId = '') {
  const normalizedProfile = profile === 'light' ? 'light' : 'full';
  const attribution = createSnapshotAttribution(normalizedProfile);
  foregroundSnapshotsActive += 1;
  try {
    return await snapshotAttributionStorage.run(attribution, () => snapshotAttributed(normalizedProfile, creditsOrgId, attribution));
  } finally {
    foregroundSnapshotsActive = Math.max(0, foregroundSnapshotsActive - 1);
    if (foregroundSnapshotsActive === 0) {
      lastForegroundEndedAt = Date.now();
      scheduleSecondaryDrain();
    }
  }
}

async function snapshotAttributed(profile = 'full', creditsOrgId = '', attribution = currentSnapshotAttribution()) {
  const normalizedProfile = profile === 'light' ? 'light' : 'full';
  const requestedCreditsOrgId = String(creditsOrgId || '').trim();

  // Organization discovery is no longer a hard root dependency. DevPass status
  // and project-scoped Activity can remain useful while Credits/org discovery is
  // stale or temporarily unavailable.
  const creditsBootstrapPromise = loadCreditsBootstrap();
  startCreditsUsageEarly(creditsBootstrapPromise, requestedCreditsOrgId);
  const orgsResult = await Promise.allSettled([timedSnapshotTask('organizations', () => loadOrgs())]);
  const orgs = orgsResult[0].status === 'fulfilled'
    ? orgsResult[0].value
    : { organizations: [], fetchedAt: null, source: 'unavailable' };
  const rows = orgs?.organizations || [];
  const creditsSelection = creditsUsageSelection({ organizations: rows }, requestedCreditsOrgId);
  const creditsOrg = creditsSelection.org;
  const resolvedCreditsOrgId = String(creditsOrg?.id || '');

  const jobs = [
    timedSnapshotTask('devpassStatus', () => loadDevPassStatus()),
    timedSnapshotTask('usageScopes', () => usageScopes(resolvedCreditsOrgId)),
  ];
  if (normalizedProfile === 'full') {
    jobs.push(
      timedSnapshotTask('runway', () => creditsOrg ? runwayFor(creditsOrg.id, { deferExpired:true }) : Promise.resolve(null)),
      timedSnapshotTask('analyticsScopes', () => analyticsScopes(resolvedCreditsOrgId, { deferLongWindow:true })),
    );
  }
  const settled = await Promise.allSettled(jobs);
  const devpassStatusResult = settled[0];
  const usageScopesResult = settled[1];
  const runwayResult = normalizedProfile === 'full' ? settled[2] : null;
  const analyticsScopesResult = normalizedProfile === 'full' ? settled[3] : null;

  const errors = {};
  if (orgsResult[0].status === 'rejected') errors.organizations = safeMessage(orgsResult[0].reason);

  const devpassStatusValue = devpassStatusResult.status === 'fulfilled' ? devpassStatusResult.value : null;
  const usageScopesValue = usageScopesResult.status === 'fulfilled' ? usageScopesResult.value : null;
  const activityValue = usageScopesValue?.scopes?.all || null;
  const result = {
    ok: true,
    bridgeVersion: VERSION,
    protocolVersion: PROTOCOL_VERSION,
    compatibility: {
      minPluginVersion: MIN_PLUGIN_VERSION,
      recommendedPluginVersion: RECOMMENDED_PLUGIN_VERSION,
    },
    profile: normalizedProfile,
    fetchedAt: Date.now(),
    orgs,
    devpassStatus: devpassStatusValue,
    creditsOrganizationId: creditsOrg?.id || null,
    requestedCreditsOrganizationId: requestedCreditsOrgId || null,
    creditsOrganizationFallback: creditsSelection.fallback,
    creditsOrganizationFallbackReason: creditsSelection.fallbackReason || null,
    activity: activityValue,
    usageScopes: usageScopesValue,
  };

  if (devpassStatusResult.status === 'rejected') errors.devpassStatus = safeMessage(devpassStatusResult.reason);
  if (usageScopesResult.status === 'rejected') errors.usage = safeMessage(usageScopesResult.reason);
  if (usageScopesValue?.errors && Object.keys(usageScopesValue.errors).length) errors.usageScopes = usageScopesValue.errors;

  let analyticsScopesValue = null;
  let analyticsValue = null;
  let runwayValue = null;
  if (normalizedProfile === 'full') {
    analyticsScopesValue = analyticsScopesResult.status === 'fulfilled' ? analyticsScopesResult.value : null;
    analyticsValue = analyticsScopesValue?.scopes?.all || null;
    runwayValue = runwayResult.status === 'fulfilled' ? runwayResult.value : null;
    result.analytics = analyticsValue;
    result.analyticsScopes = analyticsScopesValue;
    result.runway = runwayValue;
    if (runwayResult.status === 'rejected') errors.runway = safeMessage(runwayResult.reason);
    if (analyticsScopesResult.status === 'rejected') errors.analytics = safeMessage(analyticsScopesResult.reason);
    if (analyticsScopesValue?.errors && Object.keys(analyticsScopesValue.errors).length) errors.analyticsScopes = analyticsScopesValue.errors;
  }

  const circuitsView = circuitSnapshot();
  result.diagnostics = {
    bridgeVersion: VERSION,
    protocolVersion: PROTOCOL_VERSION,
    cliVersion: CLI_VERSION,
    cliRuntime: await managedCliDiagnostics(),
    uptimeSec: Math.floor((Date.now() - STARTED_AT) / 1000),
    snapshotProfile: normalizedProfile,
    creditsOrganization: {requestedId: requestedCreditsOrgId || null, selectedId: creditsOrg?.id || null, fallback: creditsSelection.fallback, fallbackReason: creditsSelection.fallbackReason || null},
    cacheEntries: cache.size,
    inFlight: inFlight.size,
    cache: {
      entries: cache.size,
      inFlight: inFlight.size,
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      joins: cacheStats.joins,
      loads: cacheStats.loads,
      errors: cacheStats.errors,
      staleFallbacks: cacheStats.staleFallbacks,
      hitRate: (cacheStats.hits + cacheStats.misses) > 0
        ? cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100
        : 0,
    },
    circuits: circuitsView,
    circuitStats: {...circuitStats},
    performance: {
      lastLoadMs: cacheStats.lastLoadMs,
      avgLoadMs: cacheStats.loads > 0 ? cacheStats.totalLoadMs / cacheStats.loads : 0,
    },
    cli: {
      concurrency: CLI_CONCURRENCY,
      active: cliStats.active,
      queued: cliStats.queued,
      runs: cliStats.runs,
      maxActive: cliStats.maxActive,
    },
    memory: {
      rssMB: process.memoryUsage().rss / 1024 / 1024,
      heapUsedMB: process.memoryUsage().heapUsed / 1024 / 1024,
    },
    generatedAt: Date.now(),
  };
  result.errors = errors;

  const orgStatus = orgsResult[0].status === 'fulfilled' ? moduleValueStatus(orgs) : 'error';
  const devStatus = devpassStatusResult.status === 'fulfilled' ? moduleValueStatus(devpassStatusValue) : 'error';
  const usageStale = valueIsStale(usageScopesValue);
  result.modules = {
    organizations: moduleMeta(orgStatus, 'organizations', newestCacheAt('orgs'), orgsResult[0].status === 'rejected' ? orgsResult[0].reason : null),
    credits: moduleMeta(creditsOrg ? orgStatus : 'error', 'organizations', newestCacheAt('orgs'), creditsOrg ? null : errors.organizations || 'credits organization unavailable'),
    devpassStatus: moduleMeta(devStatus, 'account', newestCacheAt('devpassStatus'), devpassStatusResult.status === 'rejected' ? devpassStatusResult.reason : null),
    devpassUsage: moduleMeta(usageStale ? 'stale' : moduleValueStatus(usageScopesValue?.scopes?.devpass), 'devpassActivity', newestCacheAt((key) => key.startsWith('devpassActivity:')), usageScopesValue?.errors?.devpass || null),
    creditsUsage: moduleMeta(usageStale ? 'stale' : moduleValueStatus(usageScopesValue?.scopes?.credits), 'creditsUsage', newestCacheAt((key) => key.startsWith('usage:')), usageScopesValue?.errors?.credits || null),
    usage: moduleMeta(usageStale ? 'stale' : (activityValue && usageScopesValue?.errors && Object.keys(usageScopesValue.errors).length ? 'partial' : moduleValueStatus(activityValue)), 'usageScopes', newestCacheAt('usageScopes'), usageScopesResult.status === 'rejected' ? usageScopesResult.reason : null),
  };
  if (normalizedProfile === 'full') {
    result.modules.analytics = moduleMeta(
      valueIsStale(analyticsScopesValue) ? 'stale' : (analyticsValue && analyticsScopesValue?.errors && Object.keys(analyticsScopesValue.errors).length ? 'partial' : moduleValueStatus(analyticsValue)),
      'analytics',
      newestCacheAt('analyticsScopes'),
      analyticsScopesResult.status === 'rejected' ? analyticsScopesResult.reason : null,
    );
    result.modules.runway = moduleMeta(
      runwayResult.status === 'fulfilled' ? moduleValueStatus(runwayValue) : 'error',
      'runway',
      newestCacheAt((key) => key.startsWith('runway:')),
      runwayResult.status === 'rejected' ? runwayResult.reason : null,
    );
  }
  result.diagnostics.snapshotPerformance = snapshotAttributionSummary(attribution);
  return result;
}

