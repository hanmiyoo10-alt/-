async function runProgram(program, args, extraEnv = {}) {
  return execFileAsync(program, args, {
    timeout: 25_000,
    maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, ...extraEnv, NO_COLOR: '1', FORCE_COLOR: '0' },
  });
}

function pathInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function readManagedCliState() {
  try {
    const value = JSON.parse(await fs.readFile(MANAGED_CLI_STATE, 'utf8'));
    const state = ['ready','provisioning','unavailable','invalid'].includes(String(value?.state))
      ? String(value.state)
      : 'unavailable';
    return {
      state,
      version:String(value?.version || '') === CLI_VERSION ? CLI_VERSION : '',
      provisioning:['ok','pending','backoff','disabled','unavailable'].includes(String(value?.provisioning))
        ? String(value.provisioning)
        : 'unavailable',
    };
  } catch {
    return {state:'unavailable',version:'',provisioning:'unavailable'};
  }
}

async function managedCliRuntime() {
  const unavailable = (state = 'unavailable', provisioning = 'unavailable') => ({
    state, version:'', provisioning, entry:null,
    modelCatalogState:'unavailable', modelCatalogVersion:'', modelCatalogExpectedVersion:MODEL_CATALOG_VERSION, modelCatalogEntry:null,
  });
  if (!MANAGED_CLI_ENABLED) return unavailable('unavailable', 'disabled');
  let descriptor;
  try { descriptor = JSON.parse(await fs.readFile(MANAGED_CLI_DESCRIPTOR, 'utf8')); }
  catch {
    const state = await readManagedCliState();
    return state.state === 'ready' ? unavailable('invalid') : {...unavailable(state.state, state.provisioning), version:state.version};
  }
  if (descriptor?.format !== 1 || descriptor?.state !== 'ready' || descriptor?.package !== '@llmgateway/cli' || descriptor?.version !== CLI_VERSION
      || descriptor?.catalogPackage !== MODEL_CATALOG_PACKAGE || descriptor?.catalogVersion !== MODEL_CATALOG_VERSION) {
    return unavailable('invalid');
  }
  try {
    const versionRoot = await fs.realpath(MANAGED_CLI_VERSION_ROOT);
    const entry = await fs.realpath(String(descriptor.entry || ''));
    if (!pathInside(versionRoot, entry)) return unavailable('invalid');
    if (!(await fs.stat(entry)).isFile()) return unavailable('invalid');

    const catalogRoot = await fs.realpath(path.join(versionRoot, 'node_modules', '@llmgateway', 'models'));
    if (!pathInside(versionRoot, catalogRoot)) return unavailable('invalid');
    const packageJson = JSON.parse(await fs.readFile(path.join(catalogRoot, 'package.json'), 'utf8'));
    if (packageJson?.name !== MODEL_CATALOG_PACKAGE || packageJson?.version !== MODEL_CATALOG_VERSION) return unavailable('invalid');
    const rootExport = packageJson?.exports?.['.'] ?? packageJson?.exports;
    const exportPath = typeof rootExport === 'string' ? rootExport : (rootExport?.import || packageJson?.module || '');
    if (typeof exportPath !== 'string' || !exportPath) return unavailable('invalid');
    const modelCatalogEntry = await fs.realpath(path.resolve(catalogRoot, exportPath));
    if (!pathInside(catalogRoot, modelCatalogEntry) || !pathInside(versionRoot, modelCatalogEntry)) return unavailable('invalid');
    if (!(await fs.stat(modelCatalogEntry)).isFile()) return unavailable('invalid');
    if (await fs.realpath(String(descriptor.catalogEntry || '')) !== modelCatalogEntry) return unavailable('invalid');
    return {
      state:'ready', version:CLI_VERSION, provisioning:'ok', entry,
      modelCatalogState:'ready', modelCatalogVersion:MODEL_CATALOG_VERSION,
      modelCatalogExpectedVersion:MODEL_CATALOG_VERSION, modelCatalogEntry,
    };
  } catch {
    return unavailable('invalid');
  }
}

async function managedCliDiagnostics() {
  const runtime = await managedCliRuntime();
  return {
    state:runtime.state,
    version:runtime.version,
    provisioning:runtime.provisioning,
    modelCatalogState:runtime.modelCatalogState,
    modelCatalogVersion:runtime.modelCatalogVersion,
    modelCatalogExpectedVersion:runtime.modelCatalogExpectedVersion,
  };
}

async function runCliProcess(args, extraEnv = {}) {
  const launcherMeta = { launcher:'unknown', fallbackReason:'none', npxPolicy:'not-applicable' };
  return withCliSlot(cliOperationLabel(args, extraEnv), async () => {
    const managed = await managedCliRuntime();
    if (managed.state === 'ready' && managed.entry) {
      launcherMeta.launcher = 'managed-direct';
      return runProgram(process.execPath, [managed.entry, ...args], extraEnv);
    }
    launcherMeta.launcher = 'direct';
    try {
      return await runProgram('llmgateway', args, extraEnv);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      launcherMeta.launcher = 'npx-fallback';
      launcherMeta.fallbackReason = 'direct-enoent';
      launcherMeta.npxPolicy = NPX_PREFER_OFFLINE ? 'prefer-offline' : 'default';
    }
    const npxArgs = NPX_PREFER_OFFLINE
      ? ['--yes', '--prefer-offline', `@llmgateway/cli@${CLI_VERSION}`, ...args]
      : ['--yes', `@llmgateway/cli@${CLI_VERSION}`, ...args];
    return runProgram('npx', npxArgs, extraEnv);
  }, launcherMeta);
}

async function runCli(args) {
  try {
    const { stdout } = await runCliProcess(args);
    return parseJsonOutput(stdout);
  } catch (error) {
    if (error?.stdout) {
      try { return parseJsonOutput(error.stdout); } catch {}
    }
    throw error;
  }
}

async function ensureCaptureTap() {
  await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  const source = String.raw`'use strict';
const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const output = process.env.DEVPASS_BRIDGE_CAPTURE_FILE;
const requestedActivityRange = ['24h','7d','30d'].includes(String(process.env.DEVPASS_BRIDGE_ACTIVITY_RANGE || ''))
  ? String(process.env.DEVPASS_BRIDGE_ACTIVITY_RANGE)
  : '';
const marker = Symbol.for('llmgateway.devpass.bridge.capture.v10');
if (output && !globalThis[marker]) {
  globalThis[marker] = true;
  const state = { orgs: null, devPlanStatus: null, devpassActivity: null, devpassLogs: null, captureMode: null };
  let extrasInFlight = false;
  let extrasDone = false;
  const rawHttpRequest = http.request;
  const rawHttpsRequest = https.request;

  const writeState = () => {
    try {
      fs.writeFileSync(output, JSON.stringify(state), { mode: 0o600 });
    } catch {}
  };

  const parseJsonText = (text) => {
    try {
      const trimmed = String(text || '').trim();
      if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) return null;
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  };

  const sanitizeStatus = (value) => {
    if (!value || typeof value !== 'object') return null;
    const raw = value.data && typeof value.data === 'object' ? value.data : value;
    const allowed = [
      'hasPersonalOrg','hasBillingHistory','devPlan','devPlanPendingTier','devPlanCycle',
      'devPlanCreditsUsed','devPlanCreditsLimit','devPlanCreditsRemaining',
      'devPlanPremiumWeeklyLimit','devPlanPremiumCreditsUsed','devPlanPremiumWeekResetsAt',
      'devPlanResetPasses','devPlanIncludedResetPasses','devPlanIncludedResetPassesRemaining',
      'devPlanResetPassPrice','devPlanBillingCycleStart','devPlanCancelled','devPlanExpiresAt',
      'regularCredits','devPlanPaygEnabled','autoTopUpEnabled','autoTopUpThreshold','autoTopUpAmount',
      'organizationId','projectId','devPlanServiceTier','defaultRoutingStrategy'
    ];
    const safe = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(raw, key)) safe[key] = raw[key];
    }
    return safe;
  };

  const sanitizeModel = (row) => {
    if (!row || typeof row !== 'object') return null;
    const allowed = ['id','provider','requestCount','inputTokens','outputTokens','totalTokens','cachedTokens','cacheWriteTokens','cost'];
    const safe = {};
    for (const key of allowed) if (Object.prototype.hasOwnProperty.call(row, key)) safe[key] = row[key];
    return Object.keys(safe).length ? safe : null;
  };

  const sanitizeActivity = (value) => {
    if (!value || typeof value !== 'object') return null;
    const raw = value.data && typeof value.data === 'object' ? value.data : value;
    const rows = Array.isArray(raw.activity) ? raw.activity : [];
    const allowed = [
      'date','requestCount','inputTokens','outputTokens','cachedTokens','cacheWriteTokens','totalTokens',
      'cost','inputCost','outputCost','requestCost','dataStorageCost','imageInputCost','audioInputCost',
      'audioOutputCost','imageOutputCost','videoOutputCost','cachedInputCost','cacheWriteInputCost',
      'errorCount','errorRate','cacheCount','cacheRate','discountSavings','creditsRequestCount',
      'apiKeysRequestCount','creditsCost','apiKeysCost','creditsDataStorageCost','apiKeysDataStorageCost'
    ];
    const activity = rows.map((row) => {
      if (!row || typeof row !== 'object') return null;
      const safe = {};
      for (const key of allowed) if (Object.prototype.hasOwnProperty.call(row, key)) safe[key] = row[key];
      const models = Array.isArray(row.modelBreakdown) ? row.modelBreakdown.map(sanitizeModel).filter(Boolean) : [];
      safe.modelBreakdown = models;
      return safe;
    }).filter(Boolean);
    const safe = { activity };
    if (typeof raw.granularity === 'string') safe.granularity = raw.granularity;
    return safe;
  };

  // The official Activity UI uses /logs for per-request rows. Keep only the
  // non-content metadata needed by the local dashboard. Prompt/response bodies,
  // messages, custom headers, cookies, and auth material are never persisted.
  const logField = (row, candidates) => {
    for (const candidate of candidates) {
      const parts = String(candidate).split('.');
      let value = row;
      for (const part of parts) value = value?.[part];
      if (value !== undefined && value !== null && value !== '') return { value, source: String(candidate) };
    }
    return { value: null, source: '' };
  };

  // CACHE_OBSERVER_PARSER_START
  const cacheFinite = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : null;
  };

  const cachePath = (root, path) => {
    let value = root;
    for (const part of String(path).split('.')) value = value?.[part];
    return value;
  };

  const cacheNumber = (root, paths) => {
    for (const path of paths) {
      const value = cacheFinite(cachePath(root, path));
      if (value !== null) return value;
    }
    return null;
  };

  const cacheUsageCandidates = (row) => {
    const candidates = [
      row?.usage,
      row?.usageMetadata,
      row?.usage_metadata,
      row?.response?.usage,
      row?.response?.usageMetadata,
      row?.response?.usage_metadata,
      row?.metadata?.usage,
      row,
    ];
    return candidates.filter((value, index) => value && typeof value === 'object' && !Array.isArray(value) && candidates.indexOf(value) === index);
  };

  const normalizeProviderCacheUsageObject = (usage) => {
    if (!usage || typeof usage !== 'object' || Array.isArray(usage)) return null;

    const inputTokens = cacheNumber(usage, ['inputTokens','input_tokens','promptTokens','prompt_tokens','promptTokenCount','prompt_token_count']);
    const outputTokens = cacheNumber(usage, ['outputTokens','output_tokens','completionTokens','completion_tokens','candidatesTokenCount','candidates_token_count']);
    const totalTokens = cacheNumber(usage, ['totalTokens','total_tokens','totalTokenCount','total_token_count']);

    const hasRequestIdentity = ['requestId','request_id','id'].some(key => Object.prototype.hasOwnProperty.call(usage, key));
    const hasRequestTimestamp = ['createdAt','created_at','timestamp'].some(key => Object.prototype.hasOwnProperty.call(usage, key));
    const hasLlmGatewayLogCacheField = ['cachedTokens','cacheWriteTokens','cacheWrite5mTokens','cacheWrite1hTokens']
      .some(key => Object.prototype.hasOwnProperty.call(usage, key));
    const llmgatewayLogCacheShape = hasRequestIdentity && hasRequestTimestamp && hasLlmGatewayLogCacheField;

    const explicitRead = cacheNumber(usage, [
      'cacheReadInputTokens','cache_read_input_tokens',
      ...(llmgatewayLogCacheShape ? ['cachedTokens'] : [])
    ]);
    let explicitWrite = cacheNumber(usage, [
      'cacheCreationInputTokens','cache_creation_input_tokens',
      'cacheCreationTokens','cache_creation_tokens',
      'cacheWriteTokens','cache_write_tokens',
      'input_tokens_details.cache_write_tokens','prompt_tokens_details.cache_write_tokens',
      'input_tokens_details.cache_creation_tokens','prompt_tokens_details.cache_creation_tokens'
    ]);
    const write5m = cacheNumber(usage, ['cacheCreation5mTokens','cache_creation_5m_tokens','cacheWrite5mTokens','cache_write_5m_tokens','cache_creation.ephemeral_5m_input_tokens','prompt_tokens_details.cache_creation.ephemeral_5m_input_tokens','input_tokens_details.cache_creation.ephemeral_5m_input_tokens']);
    const write1h = cacheNumber(usage, ['cacheCreation1hTokens','cache_creation_1h_tokens','cacheWrite1hTokens','cache_write_1h_tokens','cache_creation.ephemeral_1h_input_tokens','prompt_tokens_details.cache_creation.ephemeral_1h_input_tokens','input_tokens_details.cache_creation.ephemeral_1h_input_tokens']);
    const explicitWriteReported = explicitWrite !== null;
    const ttlReported = write5m !== null || write1h !== null;
    if (explicitWrite === null && ttlReported) explicitWrite = Number(write5m || 0) + Number(write1h || 0);

    const explicitCached = cacheNumber(usage, ['cachedInputTokens','cached_input_tokens','cachedTokens','cached_tokens']);
    const geminiCached = cacheNumber(usage, ['cachedContentTokenCount','cached_content_token_count']);
    const openAiCached = cacheNumber(usage, ['input_tokens_details.cached_tokens','prompt_tokens_details.cached_tokens']);

    let source = '';
    if (llmgatewayLogCacheShape) source = 'llmgateway-log-cache-v1';
    else if (cachePath(usage, 'cache_read_input_tokens') !== undefined || cachePath(usage, 'cache_creation') || cachePath(usage, 'cache_creation_input_tokens') !== undefined) source = 'anthropic-usage';
    else if (geminiCached !== null || cachePath(usage, 'promptTokenCount') !== undefined || cachePath(usage, 'prompt_token_count') !== undefined) source = 'gemini-usage';
    else if (cachePath(usage, 'prompt_tokens_details') || cachePath(usage, 'prompt_tokens') !== undefined) source = 'openai-chat-usage';
    else if (cachePath(usage, 'input_tokens_details') || cachePath(usage, 'input_tokens') !== undefined) source = 'openai-responses-usage';
    else if (cachePath(usage, 'cachedTokens') !== undefined || cachePath(usage, 'cacheWriteTokens') !== undefined || cachePath(usage, 'cached_tokens') !== undefined || cachePath(usage, 'cache_write_tokens') !== undefined) source = 'llmgateway-usage';
    else if (explicitCached !== null || explicitWrite !== null) source = 'normalized-usage';

    let cachedInputTokens = llmgatewayLogCacheShape && (explicitRead !== null || explicitWrite !== null)
      ? Number(explicitRead || 0) + Number(explicitWrite || 0)
      : explicitCached;
    if (cachedInputTokens === null && geminiCached !== null) cachedInputTokens = geminiCached;
    if (cachedInputTokens === null && openAiCached !== null) cachedInputTokens = openAiCached;
    if (cachedInputTokens === null && (explicitRead !== null || explicitWrite !== null)) cachedInputTokens = Number(explicitRead || 0) + Number(explicitWrite || 0);

    const hasCacheMetric = [cachedInputTokens, explicitRead, explicitWrite, write5m, write1h].some(value => value !== null);
    if (!hasCacheMetric) return null;

    const cacheMetricFidelity = explicitRead !== null && explicitWrite !== null
      ? 'explicit-read-write'
      : explicitRead !== null
        ? 'explicit-read'
        : explicitWrite !== null
          ? 'explicit-write'
          : cachedInputTokens !== null
            ? 'cached-total'
            : 'unknown';
    const cacheWriteTelemetry = explicitWriteReported || ttlReported
      ? 'reported'
      : explicitRead !== null
        ? 'not-reported'
        : 'unknown';
    const cacheTtlTelemetry = ttlReported
      ? 'reported'
      : explicitWrite !== null
        ? 'not-reported'
        : 'unknown';

    return {
      inputTokens,
      outputTokens,
      totalTokens,
      cachedInputTokens,
      cacheReadInputTokens: explicitRead,
      cacheCreationInputTokens: explicitWrite,
      cacheCreation5mTokens: write5m,
      cacheCreation1hTokens: write1h,
      cacheMetricFidelity,
      cacheWriteTelemetry,
      cacheTtlTelemetry,
      source: source || 'normalized-usage',
    };
  };

  const normalizeProviderCacheUsage = (row) => {
    for (const candidate of cacheUsageCandidates(row)) {
      const normalized = normalizeProviderCacheUsageObject(candidate);
      if (normalized) return normalized;
    }
    return null;
  };
  // CACHE_OBSERVER_PARSER_END

  const sanitizeLogs = (value) => {
    if (!value || typeof value !== 'object') return null;
    const raw = value.data && typeof value.data === 'object' ? value.data : value;
    const rows = Array.isArray(raw.logs) ? raw.logs : [];
    return rows.map((row) => {
      if (!row || typeof row !== 'object') return null;
      const requestNumber = row.requestId ?? row.request_id ?? row.id ?? '';
      const timestamp = row.createdAt ?? row.created_at ?? null;
      if (!requestNumber || !timestamp) return null;
      const requestedTier = logField(row, [
        'requestedServiceTier','requested_service_tier','requestServiceTier','request_service_tier',
        'requestedTier','requested_tier','metadata.requestedServiceTier','metadata.requested_service_tier',
        'request.serviceTier','request.service_tier'
      ]);
      const servedTier = logField(row, [
        'servedServiceTier','served_service_tier','usedServiceTier','used_service_tier',
        'actualServiceTier','actual_service_tier','billingServiceTier','billing_service_tier',
        'metadata.servedServiceTier','metadata.served_service_tier','metadata.usedServiceTier','metadata.used_service_tier',
        'response.serviceTier','response.service_tier','serviceTier','service_tier'
      ]);
      const cacheUsage = normalizeProviderCacheUsage(row);
      const durationMs = typeof row.duration === 'number' && Number.isFinite(row.duration) && row.duration >= 0
        ? Number(row.duration)
        : null;
      return {
        timestamp,
        requestNumber: String(requestNumber),
        provider: String(row.usedProvider ?? row.used_provider ?? row.requestedProvider ?? row.requested_provider ?? 'Unknown'),
        model: String(row.usedModel ?? row.used_model ?? row.requestedModel ?? row.requested_model ?? 'Unknown'),
        cost: row.cost ?? null,
        totalTokens: cacheUsage?.totalTokens ?? row.totalTokens ?? row.total_tokens ?? null,
        inputTokens: cacheUsage?.inputTokens ?? null,
        outputTokens: cacheUsage?.outputTokens ?? null,
        cachedInputTokens: cacheUsage?.cachedInputTokens ?? null,
        cacheReadInputTokens: cacheUsage?.cacheReadInputTokens ?? null,
        cacheCreationInputTokens: cacheUsage?.cacheCreationInputTokens ?? null,
        cacheCreation5mTokens: cacheUsage?.cacheCreation5mTokens ?? null,
        cacheCreation1hTokens: cacheUsage?.cacheCreation1hTokens ?? null,
        cacheMetricFidelity: cacheUsage?.cacheMetricFidelity ?? 'unknown',
        cacheWriteTelemetry: cacheUsage?.cacheWriteTelemetry ?? 'unknown',
        cacheTtlTelemetry: cacheUsage?.cacheTtlTelemetry ?? 'unknown',
        cacheMetricSource: cacheUsage?.source ?? '',
        cacheHit: typeof row.cached === 'boolean' ? row.cached : null,
        durationMs,
        durationSource: durationMs !== null ? 'llmgateway-log-duration' : '',
        durationFidelity: durationMs !== null ? 'explicit' : 'unknown',
        requestedServiceTier: requestedTier.value,
        servedServiceTier: servedTier.value,
        requestedServiceTierSource: requestedTier.source,
        servedServiceTierSource: servedTier.source,
        success: row.hasError === true ? false : true,
      };
    }).filter(Boolean);
  };

  const storeStatus = (value, mode) => {
    const safe = sanitizeStatus(value);
    if (!safe || !Object.keys(safe).length) return null;
    state.devPlanStatus = safe;
    state.captureMode = mode;
    writeState();
    return safe;
  };

  const storeActivity = (value, range, mode) => {
    const safe = sanitizeActivity(value);
    if (!safe) return false;
    state.devpassActivity = { range: String(range), payload: safe, mode: String(mode || '') };
    writeState();
    return true;
  };

  const storeLogs = (value, range, mode) => {
    const safe = sanitizeLogs(value);
    if (!safe) return false;
    state.devpassLogs = { range: String(range), rows: safe.slice(0, 100), mode: String(mode || '') };
    writeState();
    return true;
  };

  const safeHeaders = (headersLike) => {
    const headers = {};
    try {
      if (headersLike && typeof headersLike.forEach === 'function') {
        headersLike.forEach((value, key) => { headers[String(key)] = String(value); });
      } else if (headersLike && typeof headersLike === 'object') {
        for (const [key, value] of Object.entries(headersLike)) {
          if (value !== undefined && value !== null) headers[String(key)] = Array.isArray(value) ? value.join(', ') : String(value);
        }
      }
    } catch {}
    for (const key of Object.keys(headers)) {
      const lower = key.toLowerCase();
      if (['content-length', 'content-type', 'host', 'connection', 'transfer-encoding'].includes(lower)) delete headers[key];
    }
    headers.Accept = 'application/json';
    return headers;
  };

  const pathPrefix = (pathname, suffix) => {
    const text = String(pathname || '');
    return text.endsWith(suffix) ? text.slice(0, -suffix.length) : '';
  };

  const officialOrigins = (orgUrl, preferredUrl) => {
    const out = [];
    const push = (u, allowObservedOrigin = false) => {
      try {
        const parsed = u instanceof URL ? u : new URL(String(u));
        if (allowObservedOrigin || /([.]|^)llmgateway[.]io$/i.test(parsed.hostname)) out.push(parsed.origin);
      } catch {}
    };
    // Reusing the exact origin already contacted by the authenticated CLI is
    // safe; auth is never forwarded to an unrelated third-party origin.
    if (preferredUrl) push(preferredUrl, true);
    push(orgUrl, true);
    if (/([.]|^)llmgateway[.]io$/i.test(orgUrl.hostname)) push('https://internal.llmgateway.io');
    return [...new Set(out)];
  };

  const statusCandidates = (orgUrl) => {
    const prefixes = [...new Set([pathPrefix(orgUrl.pathname, '/orgs'), ''])];
    const out = [];
    for (const origin of officialOrigins(orgUrl, null)) {
      for (const prefix of prefixes) {
        const u = new URL(origin);
        u.pathname = (prefix + '/dev-plans/status').replace(/\/{2,}/g, '/');
        out.push(u);
      }
    }
    return [...new Map(out.map((u) => [u.toString(), u])).values()];
  };

  const activityCandidates = (orgUrl, statusUrl, projectId, range) => {
    const prefixes = [...new Set([
      pathPrefix(statusUrl && statusUrl.pathname, '/dev-plans/status'),
      pathPrefix(orgUrl.pathname, '/orgs'),
      ''
    ])];
    const out = [];
    for (const origin of officialOrigins(orgUrl, statusUrl)) {
      for (const prefix of prefixes) {
        const u = new URL(origin);
        u.pathname = (prefix + '/activity').replace(/\/{2,}/g, '/');
        u.searchParams.set('projectId', String(projectId));
        u.searchParams.set('timeRange', String(range));
        u.searchParams.set('groupBy', 'model');
        u.searchParams.set('timezone', 'Asia/Seoul');
        out.push(u);
      }
    }
    return [...new Map(out.map((u) => [u.toString(), u])).values()];
  };

  const logsCandidates = (orgUrl, statusUrl, projectId, range) => {
    const prefixes = [...new Set([
      pathPrefix(statusUrl && statusUrl.pathname, '/dev-plans/status'),
      pathPrefix(orgUrl.pathname, '/orgs'),
      ''
    ])];
    const rangeMs = range === '30d'
      ? 30 * 24 * 60 * 60 * 1000
      : range === '7d'
        ? 7 * 24 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;
    const out = [];
    for (const origin of officialOrigins(orgUrl, statusUrl)) {
      for (const prefix of prefixes) {
        const u = new URL(origin);
        u.pathname = (prefix + '/logs').replace(/\/{2,}/g, '/');
        u.searchParams.set('projectId', String(projectId));
        u.searchParams.set('orderBy', 'createdAt_desc');
        u.searchParams.set('limit', '100');
        u.searchParams.set('startDate', new Date(Date.now() - rangeMs).toISOString());
        out.push(u);
      }
    }
    return [...new Map(out.map((u) => [u.toString(), u])).values()];
  };

  const originalFetch = globalThis.fetch;
  const requestJsonFetch = async (target, headers, baseInit) => {
    try {
      const nextInit = baseInit && typeof baseInit === 'object' ? { ...baseInit } : {};
      nextInit.method = 'GET';
      nextInit.headers = headers;
      delete nextInit.body;
      delete nextInit.signal;
      const response = await originalFetch(target.toString(), nextInit);
      if (!response || !response.ok) return null;
      return parseJsonText(await response.clone().text());
    } catch {
      return null;
    }
  };

  const requestExtrasWithFetch = async (input, init, orgUrl) => {
    if (extrasDone || extrasInFlight || typeof originalFetch !== 'function') return;
    extrasInFlight = true;
    try {
      const inputHeaders = typeof Request === 'function' && input instanceof Request ? input.headers : (init && init.headers);
      const headers = safeHeaders(inputHeaders);
      for (const target of statusCandidates(orgUrl)) {
        const parsed = await requestJsonFetch(target, headers, init);
        const safeStatus = parsed ? storeStatus(parsed, 'fetch') : null;
        if (!safeStatus) continue;
        if (requestedActivityRange && safeStatus.projectId) {
          for (const activityTarget of activityCandidates(orgUrl, target, safeStatus.projectId, requestedActivityRange)) {
            const activity = await requestJsonFetch(activityTarget, headers, init);
            if (activity && storeActivity(activity, requestedActivityRange, 'fetch')) break;
          }
        }
        if (requestedActivityRange === '24h' && safeStatus.projectId) {
          for (const logsTarget of logsCandidates(orgUrl, target, safeStatus.projectId, requestedActivityRange)) {
            const logs = await requestJsonFetch(logsTarget, headers, init);
            if (logs && storeLogs(logs, requestedActivityRange, 'fetch')) break;
          }
        }
        extrasDone = true;
        return;
      }
    } finally {
      extrasInFlight = false;
    }
  };

  if (typeof originalFetch === 'function') {
    globalThis.fetch = async function devpassBridgeCapturedFetch(...args) {
      const response = await originalFetch.apply(this, args);
      try {
        const input = args[0];
        const rawUrl = typeof input === 'string' || input instanceof URL
          ? String(input)
          : String(input && input.url || '');
        const url = new URL(rawUrl);
        if (url.pathname.endsWith('/orgs') && response && response.ok) {
          try {
            const parsed = parseJsonText(await response.clone().text());
            if (parsed) {
              state.orgs = parsed;
              writeState();
            }
          } catch {}
          await requestExtrasWithFetch(input, args[1], url);
        }
      } catch {}
      return response;
    };
  }

  const requestInfo = (args, protocolDefault) => {
    try {
      const first = args[0];
      const second = args[1] && typeof args[1] === 'object' ? args[1] : {};
      if (typeof first === 'string' || first instanceof URL) {
        const url = new URL(String(first));
        return { url, options: second };
      }
      if (first && typeof first === 'object') {
        const protocol = String(first.protocol || protocolDefault);
        const hostname = String(first.hostname || first.host || 'localhost').replace(/^\[|\]$/g, '');
        const port = first.port ? ':' + first.port : '';
        const reqPath = String(first.path || first.pathname || '/');
        const url = new URL(protocol + '//' + hostname + port + reqPath);
        return { url, options: first };
      }
    } catch {}
    return null;
  };

  const requestJsonNode = (target, headers) => new Promise((resolve) => {
    const rawRequest = target.protocol === 'http:' ? rawHttpRequest : rawHttpsRequest;
    const requestModule = target.protocol === 'http:' ? http : https;
    const opts = {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || undefined,
      method: 'GET',
      path: target.pathname + target.search,
      headers,
    };
    let req;
    try {
      req = rawRequest.call(requestModule, opts, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { if (body.length < 4 * 1024 * 1024) body += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(parseJsonText(body));
          else resolve(null);
        });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(10000, () => { try { req.destroy(); } catch {} resolve(null); });
      req.end();
    } catch {
      resolve(null);
    }
  });

  const requestExtrasWithNode = async (orgUrl, headers) => {
    if (extrasDone || extrasInFlight) return;
    extrasInFlight = true;
    try {
      for (const target of statusCandidates(orgUrl)) {
        const parsed = await requestJsonNode(target, headers);
        const safeStatus = parsed ? storeStatus(parsed, 'node-request') : null;
        if (!safeStatus) continue;
        if (requestedActivityRange && safeStatus.projectId) {
          for (const activityTarget of activityCandidates(orgUrl, target, safeStatus.projectId, requestedActivityRange)) {
            const activity = await requestJsonNode(activityTarget, headers);
            if (activity && storeActivity(activity, requestedActivityRange, 'node-request')) break;
          }
        }
        if (requestedActivityRange === '24h' && safeStatus.projectId) {
          for (const logsTarget of logsCandidates(orgUrl, target, safeStatus.projectId, requestedActivityRange)) {
            const logs = await requestJsonNode(logsTarget, headers);
            if (logs && storeLogs(logs, requestedActivityRange, 'node-request')) break;
          }
        }
        extrasDone = true;
        return;
      }
    } finally {
      extrasInFlight = false;
    }
  };

  const patchNodeRequest = (mod, protocolDefault) => {
    const originalRequest = mod.request;
    if (typeof originalRequest !== 'function') return;
    mod.request = function devpassBridgeCapturedRequest(...args) {
      const req = originalRequest.apply(this, args);
      try {
        const info = requestInfo(args, protocolDefault);
        if (!info || !info.url.pathname.endsWith('/orgs')) return req;
        const originalEnd = req.end;
        req.end = function devpassBridgeCapturedEnd(...endArgs) {
          try {
            const headers = safeHeaders(typeof req.getHeaders === 'function' ? req.getHeaders() : info.options.headers);
            requestExtrasWithNode(info.url, headers).catch(() => {});
          } catch {}
          return originalEnd.apply(this, endArgs);
        };
      } catch {}
      return req;
    };
  };

  // Authentication headers stay in memory only long enough to perform official,
  // read-only /dev-plans/status plus optional project-scoped /activity and /logs requests.
  // They are never written to the capture file or returned by the bridge.
  patchNodeRequest(http, 'http:');
  patchNodeRequest(https, 'https:');
}
`;
  await fs.writeFile(CAPTURE_TAP_FILE, source, { mode: 0o600 });
  try { await fs.chmod(CAPTURE_TAP_FILE, 0o600); } catch {}
}

