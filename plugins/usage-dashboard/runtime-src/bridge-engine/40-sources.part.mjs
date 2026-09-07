async function captureAccountDetailsViaCliSession(activityRange = '') {
  await ensureCaptureTap();
  const captureFile = path.join(
    CONFIG_DIR,
    `account-${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`,
  );
  const existingNodeOptions = String(process.env.NODE_OPTIONS || '').trim();
  const captureRequire = `--require=${CAPTURE_TAP_FILE}`;
  const nodeOptions = existingNodeOptions ? `${existingNodeOptions} ${captureRequire}` : captureRequire;
  try {
    await runCliProcess(['orgs', 'list', '--json'], {
      NODE_OPTIONS: nodeOptions,
      DEVPASS_BRIDGE_CAPTURE_FILE: captureFile,
      DEVPASS_BRIDGE_ACTIVITY_RANGE: ['24h','7d','30d'].includes(String(activityRange)) ? String(activityRange) : '',
    });
    const text = await fs.readFile(captureFile, 'utf8');
    return JSON.parse(text);
  } finally {
    try { await fs.unlink(captureFile); } catch {}
  }
}

async function loadAccountCapture() {
  // The official orgs session can safely collect status plus 24h activity/logs
  // through the existing capture tap. Keeping the same accountCapture cache key
  // preserves its 30s TTL, no-stale fallback policy, and circuit semantics.
  return cached('accountCapture', async () => captureAccountDetailsViaCliSession('24h'));
}

async function loadCreditsBootstrap() {
  return cached('creditsBootstrap', async () => runCli(['credits', '--json']));
}

function secondaryRefreshSnapshot() {
  return {
    limit: SECONDARY_REFRESH_CONCURRENCY,
    maxKeys: SECONDARY_REFRESH_MAX_KEYS,
    queued: secondaryRefreshQueue.length,
    running: secondaryRefreshRunning ? 1 : 0,
    servedStale: secondaryRefreshStats.servedStale,
    completed: secondaryRefreshStats.completed,
    errors: secondaryRefreshStats.errors,
    blocked: secondaryRefreshStats.blocked,
    superseded: secondaryRefreshStats.superseded,
    foregroundHeld: secondaryRefreshStats.foregroundHeld,
    dropped: secondaryRefreshStats.dropped,
    lastStartAt: secondaryRefreshStats.lastStartAt,
    lastStartAfterForegroundMs: secondaryRefreshStats.lastStartAfterForegroundMs,
  };
}

function scheduleSecondaryDrain() {
  if (secondaryDrainScheduled || secondaryRefreshRunning || foregroundSnapshotsActive > 0 || !secondaryRefreshQueue.length) return;
  secondaryDrainScheduled = true;
  setImmediate(() => {
    secondaryDrainScheduled = false;
    snapshotAttributionStorage.run(undefined, () => {
      void drainSecondaryRefresh();
    });
  });
}

function enqueueSecondaryRefresh(name, loader) {
  if (inFlight.has(name) || secondaryRefreshKeys.has(name)) return true;
  if (secondaryRefreshKeys.size >= SECONDARY_REFRESH_MAX_KEYS) {
    secondaryRefreshStats.dropped += 1;
    return false;
  }
  secondaryRefreshKeys.add(name);
  secondaryRefreshQueue.push({ name, loader });
  if (foregroundSnapshotsActive > 0) secondaryRefreshStats.foregroundHeld += 1;
  scheduleSecondaryDrain();
  return true;
}

async function drainSecondaryRefresh() {
  if (secondaryRefreshRunning || foregroundSnapshotsActive > 0 || !secondaryRefreshQueue.length) return;
  const job = secondaryRefreshQueue.shift();
  secondaryRefreshRunning = true;
  secondaryRefreshStats.lastStartAt = Date.now();
  secondaryRefreshStats.lastStartAfterForegroundMs = Number.isFinite(Number(lastForegroundEndedAt))
    ? Math.max(0, secondaryRefreshStats.lastStartAt - Number(lastForegroundEndedAt))
    : null;
  const previousAt = Number(cache.get(job.name)?.at || 0);
  try {
    await cached(job.name, job.loader, { backgroundRefresh:true });
    const currentAt = Number(cache.get(job.name)?.at || 0);
    if (currentAt > previousAt) {
      secondaryRefreshStats.completed += 1;
    } else {
      const circuit = getCircuit(job.name);
      if (circuit.state === 'open') secondaryRefreshStats.blocked += 1;
      else secondaryRefreshStats.superseded += 1;
    }
  } catch {
    const circuit = getCircuit(job.name);
    if (circuit.state === 'open') secondaryRefreshStats.blocked += 1;
    else secondaryRefreshStats.errors += 1;
  } finally {
    secondaryRefreshKeys.delete(job.name);
    secondaryRefreshRunning = false;
    scheduleSecondaryDrain();
  }
}

async function cached(name, loader, options = {}) {
  const ttl = CACHE_TTL[name]
    ?? (name.startsWith('usage:') && name.endsWith(':24h') ? 60_000 : null)
    ?? (name.startsWith('usage:') && name.endsWith(':7d') ? 300_000 : null)
    ?? (name.startsWith('usage:') && name.endsWith(':30d') ? 600_000 : null)
    ?? (name.startsWith('activity:') && name.endsWith(':24h') ? 60_000 : null)
    ?? (name.startsWith('activity:') && name.endsWith(':7d') ? 300_000 : null)
    ?? (name.startsWith('activity:') && name.endsWith(':30d') ? 600_000 : null)
    ?? (name.startsWith('devpassActivity:') && name.endsWith(':24h') ? 60_000 : null)
    ?? (name.startsWith('devpassActivity:') && name.endsWith(':7d') ? 300_000 : null)
    ?? (name.startsWith('devpassActivity:') && name.endsWith(':30d') ? 600_000 : null)
    ?? (name.startsWith('analytics:') ? 60_000 : null)
    ?? ((name === 'usageScopes' || name.startsWith('usageScopes:')) ? 60_000 : null)
    ?? ((name === 'analyticsScopes' || name.startsWith('analyticsScopes:')) ? 60_000 : null)
    ?? (name.startsWith('runway:') ? 300_000 : 30_000);
  const now = Date.now();
  const current = cache.get(name);
  if (current && now - current.at < ttl) {
    noteSnapshotCacheDecision(name, 'hit', current, ttl, now);
    cacheStats.hits += 1;
    noteSnapshotCounter('cache', 'hits');
    return current.value;
  }

  const ageMs = current ? now - current.at : Infinity;
  const deferExpired = options?.deferExpired === true && options?.backgroundRefresh !== true;
  let gate = null;
  if (deferExpired && current && ageMs <= CACHE_STALE_MAX_MS) {
    if (inFlight.has(name)) {
      noteSnapshotCacheDecision(name, 'deferred', current, ttl, now, 'deferred-refresh');
      cacheStats.staleFallbacks += 1;
      noteSnapshotCounter('cache', 'staleFallbacks');
      secondaryRefreshStats.servedStale += 1;
      return staleClone(current.value, ageMs, 'deferred-refresh');
    }
    gate = circuitBeforeLoad(name);
    if (!gate.allowed) {
      noteSnapshotCacheDecision(name, 'stale', current, ttl, now, 'circuit-open');
      cacheStats.staleFallbacks += 1;
      noteSnapshotCounter('cache', 'staleFallbacks');
      return staleClone(current.value, ageMs, gate.error);
    }
    if (enqueueSecondaryRefresh(name, loader)) {
      noteSnapshotCacheDecision(name, 'deferred', current, ttl, now, 'deferred-refresh');
      cacheStats.staleFallbacks += 1;
      noteSnapshotCounter('cache', 'staleFallbacks');
      secondaryRefreshStats.servedStale += 1;
      return staleClone(current.value, ageMs, 'deferred-refresh');
    }
  }

  if (inFlight.has(name)) {
    noteSnapshotCacheDecision(name, 'join', current, ttl, now);
    cacheStats.joins += 1;
    noteSnapshotCounter('cache', 'joins');
    return inFlight.get(name);
  }

  gate ||= circuitBeforeLoad(name);
  if (!gate.allowed) {
    const ageMs = current ? now - current.at : Infinity;
    if (current && name !== 'accountCapture' && name !== 'creditsBootstrap' && ageMs <= CACHE_STALE_MAX_MS) {
      noteSnapshotCacheDecision(name, 'stale', current, ttl, now, 'circuit-open');
      cacheStats.staleFallbacks += 1;
      noteSnapshotCounter('cache', 'staleFallbacks');
      return staleClone(current.value, ageMs, gate.error);
    }
    noteSnapshotCacheDecision(name, 'blocked', current, ttl, now, 'circuit-open');
    throw gate.error;
  }

  noteSnapshotCacheDecision(name, 'miss', current, ttl, now, current ? 'expired' : 'empty');
  cacheStats.misses += 1;
  noteSnapshotCounter('cache', 'misses');
  const promise = (async () => {
    const started = Date.now();
    try {
      const value = await loader();
      const elapsed = Date.now() - started;
      cacheStats.loads += 1;
      noteSnapshotCounter('cache', 'loads');
      cacheStats.totalLoadMs += elapsed;
      cacheStats.lastLoadMs = elapsed;
      if (valueIsStale(value)) {
        noteSnapshotCacheDecision(name, 'stale', current, ttl, Date.now(), staleValueReason(value));
      } else {
        cache.set(name, { at: Date.now(), value });
        noteSnapshotCacheDecision(name, 'load', null, ttl, Date.now(), 'loaded');
      }
      circuitSuccess(name);
      pruneCache();
      return value;
    } catch (error) {
      cacheStats.errors += 1;
      noteSnapshotCounter('cache', 'errors');
      const circuit = circuitFailure(name, error);
      const ageMs = current ? Date.now() - current.at : Infinity;
      const allowStale = name !== 'accountCapture' && name !== 'creditsBootstrap';
      if (allowStale && current && ageMs <= CACHE_STALE_MAX_MS) {
        noteSnapshotCacheDecision(name, 'stale', current, ttl, Date.now(), 'refresh-error');
        cacheStats.staleFallbacks += 1;
      noteSnapshotCounter('cache', 'staleFallbacks');
        logRateLimited('warn', `stale:${name}`, `${name} refresh failed; serving last good cache (${Math.round(ageMs / 1000)}s old): ${safeMessage(error)}`);
        return staleClone(current.value, ageMs, error);
      }
      noteSnapshotCacheDecision(name, 'error', current, ttl, Date.now(), 'refresh-error');
      if (circuit.state === 'open') {
        logRateLimited('warn', `circuit:${circuit.family}`, `Circuit ${circuit.family} opened after ${circuit.failures} failures (${circuit.lastErrorCode})`, 30_000);
      }
      throw error;
    }
  })();
  inFlight.set(name, promise);
  try { return await promise; }
  finally { inFlight.delete(name); }
}

function firstArray(root, preferred = []) {
  if (Array.isArray(root)) return root;
  if (!root || typeof root !== 'object') return [];
  for (const key of preferred) {
    const value = root?.[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      for (const nested of ['items', 'organizations', 'data', 'results', 'rows']) {
        if (Array.isArray(value[nested])) return value[nested];
      }
    }
  }
  for (const value of Object.values(root)) {
    if (Array.isArray(value) && value.some((x) => x && typeof x === 'object')) return value;
  }
  return [];
}

function pick(obj, keys, fallback = null) {
  for (const key of keys) {
    const parts = key.split('.');
    let value = obj;
    for (const part of parts) value = value?.[part];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function finite(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value !== 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  let text = value.trim();
  if (!text) return null;
  const negativeParens = /^\(.*\)$/.test(text);
  text = text.replace(/[,$€£₩¥]/g, '').trim();
  const match = text.match(/^([-+]?\d*\.?\d+(?:e[-+]?\d+)?)\s*([kmb])?(?:\s*(?:usd|requests?|req|calls?|tokens?|tok))?\s*%?$/i);
  if (!match) {
    const n = Number(text);
    return Number.isFinite(n) ? n : null;
  }
  let n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  const suffix = String(match[2] || '').toLowerCase();
  if (suffix === 'k') n *= 1_000;
  if (suffix === 'm') n *= 1_000_000;
  if (suffix === 'b') n *= 1_000_000_000;
  return negativeParens ? -Math.abs(n) : n;
}


function explicitBillingCycle(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim().toLowerCase();
  return text || null;
}

function explicitBillingBoolean(value) {
  return typeof value === 'boolean' ? value : null;
}

function normalizeOrganizations(rawOrgs, rawCredits) {
  const rows = firstArray(rawOrgs, ['organizations', 'data', 'items', 'results']);
  const creditRows = firstArray(rawCredits, ['organizations', 'credits', 'data', 'items', 'results']);
  const creditsById = new Map();
  for (const row of creditRows) {
    const id = String(pick(row, ['id', 'organizationId', 'organization_id', 'orgId', 'org_id'], '') || '');
    const amount = finite(pick(row, ['credits', 'balance', 'creditBalance', 'credit_balance', 'remaining', 'amount'], null));
    if (id && amount !== null) creditsById.set(id, amount);
  }

  return rows.map((row) => {
    const id = String(pick(row, ['id', 'organizationId', 'organization_id', 'orgId', 'org_id'], '') || '');
    if (!id) return null;
    const directCredits = finite(pick(row, ['credits', 'balance', 'creditBalance', 'credit_balance', 'remaining'], null));
    return {
      id,
      name: String(pick(row, ['name', 'organizationName', 'organization_name'], id) || id),
      kind: String(pick(row, ['kind', 'type'], 'default') || 'default'),
      status: String(pick(row, ['status'], 'active') || 'active'),
      plan: String(pick(row, ['plan'], 'free') || 'free'),
      credits: directCredits ?? creditsById.get(id) ?? null,
      devPlan: String(pick(row, ['devPlan', 'dev_plan'], 'none') || 'none'),
      devPlanCycle: explicitBillingCycle(pick(row, ['devPlanCycle', 'dev_plan_cycle'], null)),
      devPlanCreditsUsed: finite(pick(row, ['devPlanCreditsUsed', 'dev_plan_credits_used'], null)),
      devPlanCreditsLimit: finite(pick(row, ['devPlanCreditsLimit', 'dev_plan_credits_limit'], null)),
      devPlanPremiumCreditsUsed: finite(pick(row, ['devPlanPremiumCreditsUsed', 'dev_plan_premium_credits_used'], null)),
      devPlanPremiumWeekStart: pick(row, ['devPlanPremiumWeekStart', 'dev_plan_premium_week_start'], null),
      devPlanBillingCycleStart: pick(row, ['devPlanBillingCycleStart', 'dev_plan_billing_cycle_start'], null),
      devPlanExpiresAt: pick(row, ['devPlanExpiresAt', 'dev_plan_expires_at'], null),
      devPlanCancelled: explicitBillingBoolean(pick(row, ['devPlanCancelled', 'dev_plan_cancelled'], null)),
      devPlanResetPassesLite: finite(pick(row, ['devPlanResetPassesLite', 'dev_plan_reset_passes_lite'], null)),
      devPlanResetPassesPro: finite(pick(row, ['devPlanResetPassesPro', 'dev_plan_reset_passes_pro'], null)),
      devPlanResetPassesMax: finite(pick(row, ['devPlanResetPassesMax', 'dev_plan_reset_passes_max'], null)),
      devPlanIncludedResetPassesUsed: finite(pick(row, ['devPlanIncludedResetPassesUsed', 'dev_plan_included_reset_passes_used'], null)),
      devPlanPaygEnabled: explicitBillingBoolean(pick(row, ['devPlanPaygEnabled', 'dev_plan_payg_enabled'], null)),
      devPlanAutoTopUpEnabled: explicitBillingBoolean(pick(row, ['devPlanAutoTopUpEnabled', 'dev_plan_auto_top_up_enabled', 'autoTopUpEnabled', 'auto_top_up_enabled'], null)),
      devPlanAutoTopUpThreshold: finite(pick(row, ['devPlanAutoTopUpThreshold', 'dev_plan_auto_top_up_threshold', 'autoTopUpThreshold', 'auto_top_up_threshold'], null)),
      devPlanAutoTopUpAmount: finite(pick(row, ['devPlanAutoTopUpAmount', 'dev_plan_auto_top_up_amount', 'autoTopUpAmount', 'auto_top_up_amount'], null)),
    };
  }).filter(Boolean);
}

function mergeOrganizations(baseRows, richRows) {
  const richById = new Map((richRows || []).map((row) => [row.id, row]));
  const merged = (baseRows || []).map((base) => {
    const rich = richById.get(base.id);
    if (!rich) return base;
    richById.delete(base.id);
    const result = { ...base };
    for (const [key, value] of Object.entries(rich)) {
      if (value !== null && value !== undefined && value !== '') result[key] = value;
    }
    if (rich.credits === null || rich.credits === undefined) result.credits = base.credits;
    return result;
  });
  for (const row of richById.values()) merged.push(row);
  return merged;
}

function hasDevPassCycleDetails(rows) {
  return (rows || []).some((row) =>
    row?.kind === 'devpass' && row?.devPlan && row.devPlan !== 'none' &&
    (row.devPlanBillingCycleStart || row.devPlanExpiresAt)
  );
}


function enrichDevPassFromStatus(rows, payload) {
  const raw = payload?.data ?? payload?.status ?? payload;
  if (!raw || typeof raw !== 'object') return rows;

  const plan = String(pick(raw, ['devPlan', 'dev_plan'], '') || '').toLowerCase();
  const targetIndex = (rows || []).findIndex((row) =>
    row?.kind === 'devpass' && row?.status !== 'deleted' &&
    (!plan || plan === 'none' || row?.devPlan === plan || (row?.devPlan && row.devPlan !== 'none'))
  );
  if (targetIndex < 0) return rows;

  const current = rows[targetIndex];
  const patch = {
    devPlan: plan && plan !== 'none' ? plan : current.devPlan,
    devPlanCycle: explicitBillingCycle(pick(raw, ['devPlanCycle', 'dev_plan_cycle', 'cycle'], null)) ?? current.devPlanCycle ?? null,
    devPlanBillingCycleStart: pick(raw, [
      'devPlanBillingCycleStart', 'dev_plan_billing_cycle_start',
      'billingCycleStart', 'currentPeriodStart', 'current_period_start'
    ], current.devPlanBillingCycleStart),
    devPlanExpiresAt: pick(raw, [
      'devPlanExpiresAt', 'dev_plan_expires_at', 'currentPeriodEnd',
      'current_period_end', 'renewsAt', 'renewAt', 'expiresAt'
    ], current.devPlanExpiresAt),
    devPlanCancelled: explicitBillingBoolean(pick(raw, ['devPlanCancelled', 'dev_plan_cancelled', 'cancelled'], null)) ?? current.devPlanCancelled ?? null,
    devPlanPremiumWeekStart: pick(raw, [
      'devPlanPremiumWeekStart', 'dev_plan_premium_week_start'
    ], current.devPlanPremiumWeekStart),
  };

  const numberFields = {
    devPlanCreditsUsed: ['devPlanCreditsUsed', 'dev_plan_credits_used'],
    devPlanCreditsLimit: ['devPlanCreditsLimit', 'dev_plan_credits_limit'],
    devPlanPremiumCreditsUsed: ['devPlanPremiumCreditsUsed', 'dev_plan_premium_credits_used'],
    devPlanResetPassesLite: ['devPlanResetPassesLite', 'dev_plan_reset_passes_lite'],
    devPlanResetPassesPro: ['devPlanResetPassesPro', 'dev_plan_reset_passes_pro'],
    devPlanResetPassesMax: ['devPlanResetPassesMax', 'dev_plan_reset_passes_max'],
    devPlanIncludedResetPassesUsed: ['devPlanIncludedResetPassesUsed', 'dev_plan_included_reset_passes_used'],
  };
  for (const [key, aliases] of Object.entries(numberFields)) {
    const value = finite(pick(raw, aliases, null));
    if (value !== null) patch[key] = value;
  }

  const next = [...rows];
  next[targetIndex] = { ...current, ...patch };
  return next;
}


function devPassNoAiTrainingTruth(raw) {
  if (!raw || typeof raw !== 'object' || !Object.prototype.hasOwnProperty.call(raw, 'blockApiTraining')) {
    return { state:'unknown', source:'unavailable' };
  }
  if (raw.blockApiTraining === true) return { state:'enabled', source:'/dev-plans/status.blockApiTraining' };
  if (raw.blockApiTraining === false) return { state:'disabled', source:'/dev-plans/status.blockApiTraining' };
  return { state:'unknown', source:'unavailable' };
}


function devPassProviderCachePolicyTruth(raw) {
  if (!raw || typeof raw !== 'object' || !Object.prototype.hasOwnProperty.call(raw, 'providerCacheControlMode')) {
    return { state:'unknown', mode:'unknown', source:'unavailable' };
  }
  if (raw.providerCacheControlMode === 'auto') {
    return { state:'automatic', mode:'auto', source:'/dev-plans/status.providerCacheControlMode' };
  }
  if (raw.providerCacheControlMode === 'passthrough') {
    return { state:'client-managed', mode:'passthrough', source:'/dev-plans/status.providerCacheControlMode' };
  }
  if (raw.providerCacheControlMode === 'off') {
    return { state:'disabled', mode:'off', source:'/dev-plans/status.providerCacheControlMode' };
  }
  return { state:'unknown', mode:'unknown', source:'unavailable' };
}

function normalizeIndependentDevPassStatus(payload) {
  const raw = payload?.data ?? payload?.status ?? payload;
  if (!raw || typeof raw !== 'object') return null;

  const plan = String(pick(raw, ['devPlan', 'dev_plan', 'plan', 'tier'], '') || '').toLowerCase();
  const cycle = explicitBillingCycle(pick(raw, ['devPlanCycle', 'dev_plan_cycle', 'cycle'], null));
  const billingCycleStart = pick(raw, [
    'devPlanBillingCycleStart', 'dev_plan_billing_cycle_start',
    'billingCycleStart', 'currentPeriodStart', 'current_period_start'
  ], null);
  const expiresAt = pick(raw, [
    'devPlanExpiresAt', 'dev_plan_expires_at', 'currentPeriodEnd',
    'current_period_end', 'renewsAt', 'renewAt', 'expiresAt'
  ], null);
  const noAiTraining = devPassNoAiTrainingTruth(raw);
  const providerCachePolicy = devPassProviderCachePolicyTruth(raw);

  // Important: never copy apiKey/session/cookie/auth fields from the status
  // response. organizationId/projectId are non-secret identifiers; projectId
  // is used only to scope the official authenticated /activity read.
  const out = {
    plan: plan || 'none',
    pendingTier: pick(raw, ['devPlanPendingTier', 'dev_plan_pending_tier'], null),
    cycle,
    billingCycleStart,
    expiresAt,
    premiumWeekResetsAt: pick(raw, ['devPlanPremiumWeekResetsAt', 'dev_plan_premium_week_resets_at'], null),
    cancelled: explicitBillingBoolean(pick(raw, ['devPlanCancelled', 'dev_plan_cancelled', 'cancelled'], null)),
    paygEnabled: explicitBillingBoolean(pick(raw, ['devPlanPaygEnabled', 'dev_plan_payg_enabled', 'paygEnabled'], null)),
    autoTopUpEnabled: explicitBillingBoolean(pick(raw, ['autoTopUpEnabled', 'auto_top_up_enabled', 'devPlanAutoTopUpEnabled', 'dev_plan_auto_top_up_enabled'], null)),
    hasPersonalOrg: Boolean(pick(raw, ['hasPersonalOrg', 'has_personal_org'], plan && plan !== 'none')),
    hasBillingHistory: Boolean(pick(raw, ['hasBillingHistory', 'has_billing_history'], false)),
    organizationId: String(pick(raw, ['organizationId', 'organization_id', 'orgId', 'org_id'], '') || '') || null,
    projectId: String(pick(raw, ['projectId', 'project_id'], '') || '') || null,
    serviceTier: String(pick(raw, ['devPlanServiceTier', 'dev_plan_service_tier'], 'default') || 'default'),
    routingStrategy: String(pick(raw, ['defaultRoutingStrategy', 'default_routing_strategy'], 'auto') || 'auto'),
    noAiTrainingState: noAiTraining.state,
    noAiTrainingSource: noAiTraining.source,
    providerCachePolicyState: providerCachePolicy.state,
    providerCachePolicyMode: providerCachePolicy.mode,
    providerCachePolicySource: providerCachePolicy.source,
    fetchedAt: Date.now(),
    source: 'LLMGateway CLI session · /dev-plans/status',
  };

  const numberFields = {
    creditsUsed: ['devPlanCreditsUsed', 'dev_plan_credits_used', 'creditsUsed'],
    creditsLimit: ['devPlanCreditsLimit', 'dev_plan_credits_limit', 'creditsLimit'],
    creditsRemaining: ['devPlanCreditsRemaining', 'dev_plan_credits_remaining', 'creditsRemaining'],
    premiumCreditsUsed: ['devPlanPremiumCreditsUsed', 'dev_plan_premium_credits_used', 'premiumCreditsUsed'],
    premiumWeeklyLimit: ['devPlanPremiumWeeklyLimit', 'dev_plan_premium_weekly_limit', 'premiumWeeklyLimit'],
    resetPasses: ['devPlanResetPasses', 'dev_plan_reset_passes'],
    includedResetPasses: ['devPlanIncludedResetPasses', 'dev_plan_included_reset_passes'],
    includedResetPassesRemaining: ['devPlanIncludedResetPassesRemaining', 'dev_plan_included_reset_passes_remaining'],
    resetPassPrice: ['devPlanResetPassPrice', 'dev_plan_reset_pass_price'],
    regularCredits: ['regularCredits', 'regular_credits'],
    autoTopUpThreshold: ['autoTopUpThreshold', 'auto_top_up_threshold', 'devPlanAutoTopUpThreshold', 'dev_plan_auto_top_up_threshold'],
    autoTopUpAmount: ['autoTopUpAmount', 'auto_top_up_amount', 'devPlanAutoTopUpAmount', 'dev_plan_auto_top_up_amount'],
  };
  for (const [key, aliases] of Object.entries(numberFields)) {
    const value = finite(pick(raw, aliases, null));
    if (value !== null) out[key] = value;
  }

  const useful = (out.plan && out.plan !== 'none') || out.organizationId || out.billingCycleStart || out.expiresAt ||
    out.noAiTrainingState !== 'unknown' || out.providerCachePolicyState !== 'unknown' || Object.keys(numberFields).some((key) => out[key] !== undefined);
  return useful ? out : null;
}

async function loadDevPassStatus() {
  return cached('devpassStatus', async () => {
    const captured = await loadAccountCapture();
    const normalized = normalizeIndependentDevPassStatus(captured?.devPlanStatus ?? null);
    if (normalized) return normalized;

    // Compatibility fallback: if a future/older CLI exposes the personal
    // DevPass org in the raw /orgs response, convert that row into the same
    // independent status shape instead of coupling the plugin to org presence.
    const rawRows = normalizeOrganizations(captured?.orgs ?? captured, null);
    const devOrg = rawRows.find((row) => row.kind === 'devpass' && row.status !== 'deleted' && row.devPlan && row.devPlan !== 'none');
    if (devOrg) {
      return {
        plan: devOrg.devPlan,
        cycle: explicitBillingCycle(devOrg.devPlanCycle),
        billingCycleStart: devOrg.devPlanBillingCycleStart || null,
        expiresAt: devOrg.devPlanExpiresAt || null,
        cancelled: explicitBillingBoolean(devOrg.devPlanCancelled),
        premiumWeekStart: devOrg.devPlanPremiumWeekStart || null,
        creditsUsed: devOrg.devPlanCreditsUsed,
        creditsLimit: devOrg.devPlanCreditsLimit,
        premiumCreditsUsed: devOrg.devPlanPremiumCreditsUsed,
        resetPassesLite: devOrg.devPlanResetPassesLite,
        resetPassesPro: devOrg.devPlanResetPassesPro,
        resetPassesMax: devOrg.devPlanResetPassesMax,
        includedResetPassesUsed: devOrg.devPlanIncludedResetPassesUsed,
        paygEnabled: explicitBillingBoolean(devOrg.devPlanPaygEnabled),
        autoTopUpEnabled: explicitBillingBoolean(devOrg.devPlanAutoTopUpEnabled),
        autoTopUpThreshold: finite(devOrg.devPlanAutoTopUpThreshold),
        autoTopUpAmount: finite(devOrg.devPlanAutoTopUpAmount),
        noAiTrainingState: 'unknown',
        noAiTrainingSource: 'unavailable',
        providerCachePolicyState: 'unknown',
        providerCachePolicyMode: 'unknown',
        providerCachePolicySource: 'unavailable',
        fetchedAt: Date.now(),
        source: 'LLMGateway CLI session · full /orgs fallback',
      };
    }
    throw new Error('DevPass status was not exposed by the authenticated CLI session');
  });
}

function deepFindNumber(root, keys) {
  const wanted = new Set(keys.map((k) => k.toLowerCase()));
  const queue = [root];
  const seen = new Set();
  while (queue.length) {
    const value = queue.shift();
    if (!value || typeof value !== 'object' || seen.has(value)) continue;
    seen.add(value);
    if (!Array.isArray(value)) {
      for (const [key, child] of Object.entries(value)) {
        if (wanted.has(key.toLowerCase())) {
          const n = finite(child);
          if (n !== null) return n;
        }
      }
    }
    for (const child of Object.values(value)) {
      if (child && typeof child === 'object') queue.push(child);
    }
  }
  return null;
}

function deepFindPathNumber(root, paths) {
  const direct = finite(pick(root, paths, null));
  if (direct !== null) return direct;
  return null;
}

function namedTotals(map) {
  let requests = 0;
  let cost = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  for (const row of map.values()) {
    requests += finite(row?.requests) ?? 0;
    cost += finite(row?.cost) ?? 0;
    inputTokens += finite(row?.inputTokens) ?? 0;
    outputTokens += finite(row?.outputTokens) ?? 0;
    totalTokens += finite(row?.totalTokens) ?? 0;
  }
  return { requests, cost, inputTokens, outputTokens, totalTokens };
}

function usageMetricValues(row) {
  if (!row || typeof row !== 'object') return {
    inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedTokens: 0,
    cacheWriteTokens: 0, errorCount: 0, cacheCount: 0,
    creditsRequestCount: 0, apiKeysRequestCount: 0, creditsCost: 0, apiKeysCost: 0,
  };
  const number = (keys) => finite(pick(row, keys, null)) ?? 0;
  return {
    inputTokens: number([
      'inputTokens', 'input_tokens', 'promptTokens', 'prompt_tokens',
      'usage.inputTokens', 'usage.input_tokens', 'usage.promptTokens', 'usage.prompt_tokens',
      'tokens.input', 'tokenUsage.input', 'summary.inputTokens', 'totals.inputTokens'
    ]),
    outputTokens: number([
      'outputTokens', 'output_tokens', 'completionTokens', 'completion_tokens',
      'usage.outputTokens', 'usage.output_tokens', 'usage.completionTokens', 'usage.completion_tokens',
      'tokens.output', 'tokenUsage.output', 'summary.outputTokens', 'totals.outputTokens'
    ]),
    totalTokens: number([
      'totalTokens', 'total_tokens', 'usage.totalTokens', 'usage.total_tokens',
      'tokens.total', 'tokenUsage.total', 'summary.totalTokens', 'totals.totalTokens'
    ]),
    cachedTokens: number([
      'cachedTokens', 'cached_tokens', 'usage.cachedTokens', 'usage.cached_tokens',
      'tokens.cached', 'summary.cachedTokens', 'totals.cachedTokens'
    ]),
    cacheWriteTokens: number([
      'cacheWriteTokens', 'cache_write_tokens', 'usage.cacheWriteTokens', 'usage.cache_write_tokens',
      'tokens.cacheWrite', 'summary.cacheWriteTokens', 'totals.cacheWriteTokens'
    ]),
    errorCount: number([
      'errorCount', 'error_count', 'errors', 'failedRequests', 'failed_requests',
      'summary.errorCount', 'totals.errorCount'
    ]),
    cacheCount: number([
      'cacheCount', 'cache_count', 'cachedRequests', 'cached_requests',
      'summary.cacheCount', 'totals.cacheCount'
    ]),
    creditsRequestCount: number([
      'creditsRequestCount', 'credits_request_count', 'creditsRequests', 'credits_requests',
      'summary.creditsRequestCount', 'totals.creditsRequestCount'
    ]),
    apiKeysRequestCount: number([
      'apiKeysRequestCount', 'api_keys_request_count', 'apiKeyRequestCount', 'api_key_request_count',
      'apiKeysRequests', 'api_keys_requests', 'summary.apiKeysRequestCount', 'totals.apiKeysRequestCount'
    ]),
    creditsCost: number([
      'creditsCost', 'credits_cost', 'usage.creditsCost', 'usage.credits_cost',
      'summary.creditsCost', 'totals.creditsCost'
    ]),
    apiKeysCost: number([
      'apiKeysCost', 'api_keys_cost', 'apiKeyCost', 'api_key_cost',
      'usage.apiKeysCost', 'usage.api_keys_cost', 'summary.apiKeysCost', 'totals.apiKeysCost'
    ]),
  };
}

function blankMetrics() {
  return usageMetricValues(null);
}

function addMetrics(target, source) {
  const metrics = source && source.inputTokens !== undefined ? source : usageMetricValues(source);
  for (const key of Object.keys(target)) target[key] += finite(metrics?.[key]) ?? 0;
  return target;
}

function modelRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const rawName = pick(row, [
    'id', 'model', 'usedModel', 'used_model', 'modelId', 'model_id',
    'name', 'label', 'key', 'group', 'groupName', 'group_name',
    'model.id', 'model.name', 'dimensionValue', 'dimension_value'
  ], null);
  const name = rawName && typeof rawName === 'object'
    ? pick(rawName, ['id', 'name', 'label'], null)
    : rawName;
  if (!name) return null;
  const providerRaw = pick(row, [
    'provider', 'usedProvider', 'used_provider', 'providerName', 'provider_name',
    'model.provider', 'source.provider', 'metadata.provider'
  ], '');
  const provider = String(providerRaw && typeof providerRaw === 'object'
    ? pick(providerRaw, ['id', 'name', 'label'], '')
    : (providerRaw || ''));
  const cost = finite(pick(row, [
    'cost', 'totalCost', 'total_cost', 'spend', 'totalSpend', 'total_spend', 'amount',
    'costUsd', 'cost_usd', 'usdCost', 'usd_cost', 'spendUsd', 'spend_usd',
    'usage.cost', 'usage.totalCost', 'usage.total_cost', 'billing.cost',
    'cost.total', 'cost.usd', 'cost.value', 'summary.cost'
  ], null));
  const requests = finite(pick(row, [
    'requestCount', 'request_count', 'requests', 'totalRequests', 'total_requests', 'count',
    'calls', 'callCount', 'call_count', 'numRequests', 'num_requests',
    'usage.requestCount', 'usage.request_count', 'usage.requests',
    'requests.total', 'summary.requestCount', 'summary.requests'
  ], null));
  const metrics = usageMetricValues(row);
  return {
    name: String(name),
    provider: provider || (String(name).includes('/') ? String(name).split('/')[0] : 'LLMGateway'),
    cost: cost ?? 0,
    requests: requests ?? 0,
    inputTokens: metrics.inputTokens,
    outputTokens: metrics.outputTokens,
    totalTokens: metrics.totalTokens,
  };
}

function addNamed(map, name, requests = 0, cost = 0, metrics = null) {
  const key = String(name || 'Unknown');
  const current = map.get(key) || {
    name: key, requests: 0, cost: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0,
  };
  current.requests += finite(requests) ?? 0;
  current.cost += finite(cost) ?? 0;
  current.inputTokens += finite(metrics?.inputTokens) ?? 0;
  current.outputTokens += finite(metrics?.outputTokens) ?? 0;
  current.totalTokens += finite(metrics?.totalTokens) ?? 0;
  map.set(key, current);
}

function timestampMs(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value < 1e12 ? value * 1000 : value;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function officialActivityRows(root) {
  if (Array.isArray(root?.activity)) return root.activity;
  if (Array.isArray(root?.data?.activity)) return root.data.activity;
  return [];
}

function explicitDailyActivityMetric(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Number(value);
}

function boundedDailyActivitySeries(raw, range) {
  const rows = officialActivityRows(raw);
  const granularity = typeof raw?.granularity === 'string' ? raw.granularity.trim().toLowerCase() : '';
  const buckets = rows.map((row) => {
    const date = typeof row?.date === 'string' && row.date.trim() ? row.date.trim() : null;
    if (!date) return null;
    return {
      date,
      requestCount: explicitDailyActivityMetric(row.requestCount),
      inputTokens: explicitDailyActivityMetric(row.inputTokens),
      cachedTokens: explicitDailyActivityMetric(row.cachedTokens),
      totalTokens: explicitDailyActivityMetric(row.totalTokens),
    };
  }).filter(Boolean);
  if (!granularity && !buckets.length) return null;
  return { range:String(range || ''), granularity, buckets };
}

function explicitCreditsSpendComponent(row, key) {
  if (!row || typeof row !== 'object' || !Object.prototype.hasOwnProperty.call(row, key)) return null;
  return explicitDailyActivityMetric(row[key]);
}

function boundedCreditsSpendComposition(raw, range) {
  if (String(range || '') !== '24h') return null;
  const rows = officialActivityRows(raw);
  let usageCost = 0;
  let dataStorageCost = 0;
  let usageKnown = rows.length > 0;
  let storageKnown = rows.length > 0;
  for (const row of rows) {
    const usage = explicitCreditsSpendComponent(row, 'creditsCost');
    const storage = explicitCreditsSpendComponent(row, 'creditsDataStorageCost');
    if (usage === null) usageKnown = false;
    else usageCost += usage;
    if (storage === null) storageKnown = false;
    else dataStorageCost += storage;
  }
  const complete = usageKnown && storageKnown;
  return {
    window:'24h',
    usageCost:usageKnown ? usageCost : null,
    dataStorageCost:storageKnown ? dataStorageCost : null,
    totalSpend:complete ? usageCost + dataStorageCost : null,
    usageCostSource:usageKnown ? 'activity.creditsCost' : 'unknown',
    dataStorageCostSource:storageKnown ? 'activity.creditsDataStorageCost' : 'unknown',
    complete,
  };
}

function normalizeCapturedRecentLogs(root) {
  const rows = Array.isArray(root?.rows) ? root.rows : [];
  return rows.map((row) => {
    if (!row || typeof row !== 'object') return null;
    const timestamp = timestampMs(row.timestamp);
    const requestNumber = String(row.requestNumber || '');
    const durationExplicit = typeof row.durationMs === 'number' && Number.isFinite(row.durationMs) && row.durationMs >= 0
      && String(row.durationSource || '') === 'llmgateway-log-duration'
      && String(row.durationFidelity || '') === 'explicit';
    const httpStatusExplicit = row?.httpStatusFidelity === 'explicit'
      && row?.httpStatusSource === 'errorDetails.statusCode'
      && typeof row?.httpStatusCode === 'number'
      && Number.isInteger(row.httpStatusCode)
      && row.httpStatusCode >= 100
      && row.httpStatusCode <= 599;
    const serviceTierSelectionSource = ['request','coding-plan-default'].includes(String(row?.serviceTierSelectionSource || '').trim().toLowerCase())
      ? String(row.serviceTierSelectionSource).trim().toLowerCase()
      : 'unknown';
    if (timestamp === null || !requestNumber) return null;
    return {
      timestamp,
      provider: String(row.provider || 'Unknown'),
      model: String(row.model || 'Unknown'),
      cost: finite(row.cost),
      totalTokens: finite(row.totalTokens),
      inputTokens: finite(row.inputTokens),
      outputTokens: finite(row.outputTokens),
      cachedInputTokens: finite(row.cachedInputTokens),
      cacheReadInputTokens: finite(row.cacheReadInputTokens),
      cacheCreationInputTokens: finite(row.cacheCreationInputTokens),
      cacheCreation5mTokens: finite(row.cacheCreation5mTokens),
      cacheCreation1hTokens: finite(row.cacheCreation1hTokens),
      cacheMetricSource: String(row.cacheMetricSource || ''),
      cacheHit: typeof row.cacheHit === 'boolean' ? row.cacheHit : null,
      durationMs: durationExplicit ? Number(row.durationMs) : null,
      durationSource: durationExplicit ? 'llmgateway-log-duration' : '',
      durationFidelity: durationExplicit ? 'explicit' : 'unknown',
      httpStatusCode: httpStatusExplicit ? row.httpStatusCode : null,
      httpStatusSource: httpStatusExplicit ? 'errorDetails.statusCode' : '',
      httpStatusFidelity: httpStatusExplicit ? 'explicit' : 'unknown',
      requestedServiceTier: row.requestedServiceTier ?? null,
      servedServiceTier: row.servedServiceTier ?? null,
      requestedServiceTierSource: String(row.requestedServiceTierSource || ''),
      servedServiceTierSource: String(row.servedServiceTierSource || ''),
      serviceTierSelectionSource,
      requestNumber,
      success: row.success !== false,
    };
  }).filter(Boolean).sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
}

function genericBreakdownRows(root) {
  const queue = [root];
  const seen = new Set();
  let best = [];
  while (queue.length) {
    const value = queue.shift();
    if (!value || typeof value !== 'object' || seen.has(value)) continue;
    seen.add(value);
    if (Array.isArray(value)) {
      const candidates = value.map(modelRow).filter(Boolean);
      if (candidates.length > best.length) best = candidates;
    }
    for (const child of Object.values(value)) {
      if (child && typeof child === 'object') queue.push(child);
    }
  }
  return best;
}

function normalizeUsageActivity(raw, org = null, range = '24h') {
  const providerMap = new Map();
  const modelMap = new Map();
  const recent = [];
  const rows = officialActivityRows(raw);
  const dailySeries = boundedDailyActivitySeries(raw, range);
  const creditsSpendComposition = boundedCreditsSpendComposition(raw, range);
  let totalRequests = 0;
  let totalCost = 0;
  const metrics = blankMetrics();

  // Official /activity data is bucketed. Preserve the server aggregate fields
  // and modelBreakdown[] rather than treating buckets as raw prompts.
  if (rows.length) {
    for (const bucket of rows) {
      totalRequests += finite(pick(bucket, [
        'requestCount', 'request_count', 'requests', 'totalRequests', 'total_requests',
        'calls', 'callCount', 'numRequests'
      ], 0)) ?? 0;
      totalCost += finite(pick(bucket, [
        'cost', 'totalCost', 'total_cost', 'spend', 'totalSpend', 'costUsd', 'cost_usd',
        'usage.cost', 'cost.total', 'cost.usd'
      ], 0)) ?? 0;
      addMetrics(metrics, bucket);
      const when = timestampMs(pick(bucket, ['date', 'timestamp', 'time'], null));
      const breakdown = Array.isArray(bucket?.modelBreakdown)
        ? bucket.modelBreakdown
        : (Array.isArray(bucket?.model_breakdown) ? bucket.model_breakdown : []);
      for (const item of breakdown) {
        const parsed = modelRow(item);
        if (!parsed) continue;
        addNamed(modelMap, parsed.name, parsed.requests, parsed.cost, parsed);
        addNamed(providerMap, parsed.provider, parsed.requests, parsed.cost, parsed);
        if (when !== null && (parsed.requests > 0 || parsed.cost > 0 || parsed.totalTokens > 0)) {
          recent.push({
            timestamp: when,
            provider: parsed.provider,
            model: parsed.name,
            cost: parsed.cost,
            requests: parsed.requests,
            inputTokens: parsed.inputTokens,
            outputTokens: parsed.outputTokens,
            totalTokens: parsed.totalTokens,
            organizationId: org?.id || null,
            organizationKind: org?.kind || null,
          });
        }
      }
    }
  } else {
    totalCost = deepFindPathNumber(raw, [
      'totalCost', 'total_cost', 'summary.totalCost', 'summary.total_cost',
      'summary.cost', 'totals.totalCost', 'totals.total_cost', 'totals.cost',
      'aggregate.totalCost', 'aggregate.cost', 'metrics.totalCost', 'metrics.cost',
      'usage.totalCost', 'usage.total_cost', 'usage.cost',
      'cost.total', 'cost.usd', 'cost.value', 'costUsd', 'cost_usd', 'usdCost', 'usd_cost',
      'spend', 'totalSpend', 'total_spend', 'amount'
    ]);
    if (totalCost === null) {
      totalCost = deepFindNumber(raw, [
        'totalCost', 'total_cost', 'costUsd', 'cost_usd', 'usdCost', 'usd_cost',
        'totalSpend', 'total_spend', 'spend'
      ]);
    }
    totalRequests = deepFindPathNumber(raw, [
      'totalRequests', 'total_requests', 'requestCount', 'request_count',
      'summary.totalRequests', 'summary.total_requests', 'summary.requestCount', 'summary.requests',
      'totals.totalRequests', 'totals.total_requests', 'totals.requestCount', 'totals.requests',
      'aggregate.totalRequests', 'aggregate.requestCount', 'aggregate.requests',
      'metrics.totalRequests', 'metrics.requestCount', 'metrics.requests',
      'usage.totalRequests', 'usage.requestCount', 'usage.requests',
      'requests.total', 'calls', 'callCount', 'call_count', 'numRequests', 'num_requests'
    ]);
    if (totalRequests === null) {
      totalRequests = deepFindNumber(raw, [
        'totalRequests', 'total_requests', 'requestCount', 'request_count',
        'numRequests', 'num_requests', 'callCount', 'call_count'
      ]);
    }
    totalCost = totalCost ?? 0;
    totalRequests = totalRequests ?? 0;

    // Some CLI JSON formats place aggregate token/error/cache counters under a
    // summary/totals object instead of on the model rows.
    const aggregateMetricCandidate = raw?.summary ?? raw?.totals ?? raw?.aggregate ?? raw?.metrics ?? raw?.usage ?? raw;
    addMetrics(metrics, aggregateMetricCandidate);

    for (const parsed of genericBreakdownRows(raw)) {
      addNamed(modelMap, parsed.name, parsed.requests, parsed.cost, parsed);
      addNamed(providerMap, parsed.provider, parsed.requests, parsed.cost, parsed);
    }

    const modelTotals = namedTotals(modelMap);
    if (totalRequests <= 0 && modelTotals.requests > 0) totalRequests = modelTotals.requests;
    if (totalCost <= 0 && modelTotals.cost > 0) totalCost = modelTotals.cost;
    if (metrics.inputTokens <= 0 && modelTotals.inputTokens > 0) metrics.inputTokens = modelTotals.inputTokens;
    if (metrics.outputTokens <= 0 && modelTotals.outputTokens > 0) metrics.outputTokens = modelTotals.outputTokens;
    if (metrics.totalTokens <= 0 && modelTotals.totalTokens > 0) metrics.totalTokens = modelTotals.totalTokens;
  }

  const errorRate = totalRequests > 0 ? Math.max(0, metrics.errorCount / totalRequests * 100) : 0;
  const cacheRate = totalRequests > 0 ? Math.max(0, metrics.cacheCount / totalRequests * 100) : 0;
  return {
    __bridgeActivity: true,
    scope: range,
    ...(dailySeries ? { dailySeries } : {}),
    ...(creditsSpendComposition ? { creditsSpendComposition } : {}),
    totalRequests,
    totalCost,
    ...metrics,
    errorRate,
    cacheRate,
    providers: [...providerMap.values()].sort((a, b) => b.cost - a.cost || b.requests - a.requests),
    models: [...modelMap.values()].sort((a, b) => b.cost - a.cost || b.requests - a.requests),
    recent: recent.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 20),
    fetchedAt: Date.now(),
    source: org ? `LLMGateway CLI · usage ${range} · ${org.kind}` : `LLMGateway CLI · usage ${range}`,
  };
}

function needsAggregateUsageFallback(activity) {
  if (!activity) return true;
  const tokens = finite(activity.totalTokens) ?? 0;
  const requests = finite(activity.totalRequests) ?? 0;
  const cost = finite(activity.totalCost) ?? 0;
  // Token usage with zero requests is internally inconsistent. Cost can also be
  // omitted from breakdown JSON, so ask the aggregate CLI view when either is
  // missing while there is real usage.
  return tokens > 0 && (requests <= 0 || cost <= 0);
}

function mergeAggregateUsageTotals(breakdown, aggregate) {
  if (!breakdown) return aggregate;
  if (!aggregate) return breakdown;
  const out = { ...breakdown };
  const preferPositive = (key) => {
    const a = finite(aggregate?.[key]);
    const b = finite(breakdown?.[key]);
    out[key] = a !== null && a > 0 ? a : (b ?? 0);
  };
  for (const key of [
    'totalRequests', 'totalCost', 'inputTokens', 'outputTokens', 'totalTokens',
    'cachedTokens', 'cacheWriteTokens', 'errorCount', 'cacheCount',
    'creditsRequestCount', 'apiKeysRequestCount', 'creditsCost', 'apiKeysCost'
  ]) preferPositive(key);
  out.errorRate = out.totalRequests > 0 ? Math.max(0, (finite(out.errorCount) ?? 0) / out.totalRequests * 100) : 0;
  out.cacheRate = out.totalRequests > 0 ? Math.max(0, (finite(out.cacheCount) ?? 0) / out.totalRequests * 100) : 0;
  if (!(out.providers || []).length && (aggregate.providers || []).length) out.providers = aggregate.providers;
  if (!(out.models || []).length && (aggregate.models || []).length) out.models = aggregate.models;
  if (!(out.recent || []).length && (aggregate.recent || []).length) out.recent = aggregate.recent;
  out.source = `${breakdown.source} + aggregate totals`;
  out.totalsSource = 'aggregate-fallback';
  return out;
}

function mergeUsageActivities(items, range = '24h') {
  const staleInputs = (items || []).map((item) => item?._cache).filter((meta) => meta?.stale === true);
  const aggregateCache = staleInputs.length ? {
    stale: true,
    ageMs: Math.max(...staleInputs.map((meta) => Number(meta?.ageMs)).filter(Number.isFinite), 0),
    reason: staleInputs.some((meta) => String(meta?.reason) === 'deferred-refresh') ? 'deferred-refresh' : 'source-stale',
  } : null;
  const providerMap = new Map();
  const modelMap = new Map();
  const recent = [];
  const recentRequests = [];
  const dailySeriesCandidates = (items || []).map((item) => item?.dailySeries).filter((series) => series && typeof series === 'object');
  const dailySeries = dailySeriesCandidates.length === 1 ? dailySeriesCandidates[0] : null;
  const creditsSpendCompositionCandidates = (items || []).map((item) => item?.creditsSpendComposition).filter((value) => value && typeof value === 'object');
  const creditsSpendComposition = creditsSpendCompositionCandidates.length === 1 ? creditsSpendCompositionCandidates[0] : null;
  let totalRequests = 0;
  let totalCost = 0;
  const metrics = blankMetrics();
  for (const item of items || []) {
    if (!item) continue;
    totalRequests += finite(item.totalRequests) ?? 0;
    totalCost += finite(item.totalCost) ?? 0;
    addMetrics(metrics, item);
    for (const row of item.providers || []) addNamed(providerMap, row.name, row.requests, row.cost, row);
    for (const row of item.models || []) addNamed(modelMap, row.name, row.requests, row.cost, row);
    for (const row of item.recent || []) recent.push(row);
    for (const row of item.recentRequests || []) recentRequests.push(row);
  }
  return {
    __bridgeActivity: true,
    scope: range,
    ...(dailySeries ? { dailySeries } : {}),
    ...(creditsSpendComposition ? { creditsSpendComposition } : {}),
    totalRequests,
    totalCost,
    ...metrics,
    errorRate: totalRequests > 0 ? Math.max(0, metrics.errorCount / totalRequests * 100) : 0,
    cacheRate: totalRequests > 0 ? Math.max(0, metrics.cacheCount / totalRequests * 100) : 0,
    providers: [...providerMap.values()].sort((a, b) => b.cost - a.cost || b.requests - a.requests),
    models: [...modelMap.values()].sort((a, b) => b.cost - a.cost || b.requests - a.requests),
    recent: recent.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 20),
    recentRequests: recentRequests.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 100),
    fetchedAt: Date.now(),
    source: `LLMGateway hybrid · DevPass /activity + Credits CLI · ${range}`,
    ...(aggregateCache ? { _cache: aggregateCache } : {}),
  };
}

function creditsBootstrapCandidate(rawCredits, requestedOrgId = '') {
  const rows = firstArray(rawCredits, ['organizations', 'credits', 'data', 'items', 'results']);
  const ids = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const id = String(pick(row, ['id', 'organizationId', 'organization_id', 'orgId', 'org_id'], '') || '').trim();
    const amount = finite(pick(row, ['credits', 'balance', 'creditBalance', 'credit_balance', 'remaining', 'amount'], null));
    const explicitKind = pick(row, ['kind', 'type'], null);
    const explicitStatus = pick(row, ['status'], null);
    if (!id || amount === null) continue;
    if (explicitKind !== null && String(explicitKind) !== 'default') continue;
    if (explicitStatus !== null && String(explicitStatus) === 'deleted') continue;
    if (!ids.includes(id)) ids.push(id);
  }
  const requestedId = String(requestedOrgId || '').trim();
  if (requestedId && ids.includes(requestedId)) return { id: requestedId, mode: 'requested-exact' };
  if (ids.length === 1) return { id: ids[0], mode: 'single-credit-id' };
  return null;
}

function startCreditsUsageEarly(rawCreditsPromise, requestedOrgId = '') {
  if (CLI_CONCURRENCY < 2) {
    noteCreditsEarlyStart({ decision:'skipped', reason:'serial-mode', candidateMode:'', result:'none' });
    return Promise.resolve(null);
  }
  return Promise.resolve(rawCreditsPromise)
    .then((rawCredits) => {
      const candidate = creditsBootstrapCandidate(rawCredits, requestedOrgId);
      if (!candidate) {
        noteCreditsEarlyStart({ decision:'skipped', reason:'no-safe-candidate', candidateMode:'', result:'none' });
        return null;
      }
      noteCreditsEarlyStart({ decision:'started', reason:'', candidateMode:candidate.mode, result:'in-flight' });
      return usageForOrg({ id: candidate.id, kind: 'default', status: 'active' }, '24h')
        .then(() => {
          noteCreditsEarlyStart({ result:'completed' });
          return candidate.id;
        })
        .catch(() => {
          noteCreditsEarlyStart({ reason:'prefetch-error', result:'failed' });
          return null;
        });
    })
    .catch(() => {
      noteCreditsEarlyStart({ decision:'skipped', reason:'bootstrap-error', candidateMode:'', result:'failed' });
      return null;
    });
}

