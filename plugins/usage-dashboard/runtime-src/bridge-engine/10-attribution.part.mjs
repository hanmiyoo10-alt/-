function createSnapshotAttribution(profile) {
  return {
    startedAt: Date.now(),
    profile: String(profile || 'full'),
    tasks: Object.create(null),
    taskTimeline: Object.create(null),
    cliOperations: [],
    organizationDiscovery: null,
    captureReuse: { bootstrapRange:'24h', activityReuseChecks:0, activityShared:0, dedicated24hFallbacks:0 },
    creditsEarlyStart: { decision:'not-evaluated', reason:'', candidateMode:'', result:'none' },
    cacheDecisions: [],
    cache: { hits:0, misses:0, joins:0, loads:0, errors:0, staleFallbacks:0 },
    circuits: { opens:0, blocked:0, recoveries:0 },
    cli: {
      runs:0, queuedRuns:0, queueWaitTotalMs:0, queueWaitMaxMs:0,
      executionTotalMs:0, executionMaxMs:0, maxActive:0,
      slowestLabel:'', slowestTotalMs:0,
    },
  };
}

function currentSnapshotAttribution() {
  return snapshotAttributionStorage.getStore() || null;
}

function noteSnapshotCounter(group, key, amount = 1) {
  const attribution = currentSnapshotAttribution();
  if (!attribution?.[group] || !Object.prototype.hasOwnProperty.call(attribution[group], key)) return;
  attribution[group][key] = Number(attribution[group][key] || 0) + Number(amount || 0);
}

function snapshotCacheDescriptor(name) {
  const key = String(name || '');
  if (key === 'orgs') return { family:'organizations', scope:'', range:'' };
  if (key === 'accountCapture') return { family:'accountCapture', scope:'', range:'24h' };
  if (key === 'creditsBootstrap') return { family:'creditsBootstrap', scope:'credits', range:'' };
  if (key === 'devpassStatus') return { family:'devpassStatus', scope:'devpass', range:'' };
  if (key === 'usageScopes') return { family:'usageScopes', scope:'all', range:'24h' };
  if (key === 'analyticsScopes') return { family:'analyticsScopes', scope:'all', range:'' };
  if (key.startsWith('usageScopes:')) return { family:'usageScopes', scope:'all', range:'24h' };
  if (key.startsWith('analyticsScopes:')) return { family:'analyticsScopes', scope:'all', range:'' };
  if (key.startsWith('usage:')) {
    const parts = key.split(':');
    const range = ['24h','7d','30d'].includes(parts.at(-1)) ? parts.at(-1) : '';
    return { family:'usage', scope:'credits', range };
  }
  if (key.startsWith('devpassActivity:')) {
    const parts = key.split(':');
    const range = ['24h','7d','30d'].includes(parts.at(-1)) ? parts.at(-1) : '';
    return { family:'devpassActivity', scope:'devpass', range };
  }
  if (key.startsWith('activity:')) {
    const parts = key.split(':');
    const scope = ['all','devpass','credits'].includes(parts[1]) ? parts[1] : '';
    const range = ['24h','7d','30d'].includes(parts.at(-1)) ? parts.at(-1) : '';
    return { family:'activity', scope, range };
  }
  if (key.startsWith('analytics:')) {
    const parts = key.split(':');
    const scope = ['all','devpass','credits'].includes(parts[1]) ? parts[1] : '';
    return { family:'analytics', scope, range:'' };
  }
  if (key.startsWith('runway:')) return { family:'runway', scope:'credits', range:'7d' };
  return { family:'other', scope:'', range:'' };
}

function noteSnapshotCacheDecision(name, action, current = null, ttl = null, now = Date.now(), reason = '') {
  const attribution = currentSnapshotAttribution();
  if (!attribution || !Array.isArray(attribution.cacheDecisions) || attribution.cacheDecisions.length >= 64) return;
  const descriptor = snapshotCacheDescriptor(name);
  const at = Number(current?.at);
  const ageMs = Number.isFinite(at) && at > 0 ? Math.max(0, Number(now) - at) : null;
  const ttlMs = Number.isFinite(Number(ttl)) ? Math.max(0, Number(ttl)) : null;
  const safeAction = ['hit','miss','join','load','stale','deferred','blocked','error'].includes(String(action)) ? String(action) : 'other';
  const safeReason = ['empty','expired','loaded','deferred-refresh','circuit-open','refresh-error'].includes(String(reason)) ? String(reason) : '';
  attribution.cacheDecisions.push({ ...descriptor, action:safeAction, reason:safeReason, ageMs, ttlMs });
}

function noteCreditsEarlyStart(patch) {
  const attribution = currentSnapshotAttribution();
  if (!attribution?.creditsEarlyStart || !patch || typeof patch !== 'object') return;
  Object.assign(attribution.creditsEarlyStart, patch);
}

async function timedSnapshotTask(name, task) {
  const attribution = currentSnapshotAttribution();
  const started = Date.now();
  const key = String(name);
  const startOffsetMs = attribution ? Math.max(0, started - Number(attribution.startedAt || started)) : null;
  try {
    return await task();
  } finally {
    const ended = Date.now();
    const durationMs = Math.max(0, ended - started);
    if (attribution) {
      attribution.tasks[key] = durationMs;
      if (attribution.taskTimeline) {
        attribution.taskTimeline[key] = {
          startOffsetMs,
          endOffsetMs: Math.max(0, ended - Number(attribution.startedAt || ended)),
          durationMs,
        };
      }
    }
  }
}

function cliOperationLabel(args, extraEnv = {}) {
  const list = Array.isArray(args) ? args.map(value => String(value)) : [];
  const activityRange = ['24h','7d','30d'].includes(String(extraEnv?.DEVPASS_BRIDGE_ACTIVITY_RANGE || ''))
    ? String(extraEnv.DEVPASS_BRIDGE_ACTIVITY_RANGE)
    : '';
  if (extraEnv?.DEVPASS_BRIDGE_CAPTURE_FILE) return activityRange ? `devpass-capture-${activityRange}` : 'account-capture';
  const command = String(list[0] || 'cli').toLowerCase();
  if (command === 'orgs') return 'organizations';
  if (command === 'credits') return 'credits';
  if (command === 'usage') {
    const rangeIndex = list.indexOf('--range');
    const range = rangeIndex >= 0 && ['24h','7d','30d'].includes(String(list[rangeIndex + 1] || '')) ? String(list[rangeIndex + 1]) : 'unknown';
    return list.includes('--by') ? `usage-${range}-model` : `usage-${range}`;
  }
  return command.replace(/[^a-z0-9-]/g, '').slice(0, 32) || 'cli';
}

function noteSnapshotCliTiming(label, queued, queueWaitMs, executionMs) {
  const attribution = currentSnapshotAttribution();
  if (!attribution) return;
  const cli = attribution.cli;
  const wait = Math.max(0, Number(queueWaitMs) || 0);
  const execution = Math.max(0, Number(executionMs) || 0);
  const total = wait + execution;
  cli.runs += 1;
  if (queued) {
    cli.queuedRuns += 1;
    cli.queueWaitTotalMs += wait;
    cli.queueWaitMaxMs = Math.max(cli.queueWaitMaxMs, wait);
  }
  cli.executionTotalMs += execution;
  cli.executionMaxMs = Math.max(cli.executionMaxMs, execution);
  if (total >= Number(cli.slowestTotalMs || 0)) {
    cli.slowestTotalMs = total;
    cli.slowestLabel = String(label || 'cli');
  }
}

function noteSnapshotCliOperation(label, queuedAt, executionStartedAt, endedAt, launcherMeta = null) {
  const attribution = currentSnapshotAttribution();
  if (!attribution || !Array.isArray(attribution.cliOperations)) return;
  if (attribution.cliOperations.length >= 8) return;
  const base = Number(attribution.startedAt || queuedAt || endedAt || Date.now());
  const queuedStart = Number(queuedAt || executionStartedAt || endedAt || base);
  const execStart = Number(executionStartedAt || queuedStart);
  const ended = Number(endedAt || execStart);
  const launcher = ['managed-direct','direct','npx-fallback'].includes(String(launcherMeta?.launcher))
    ? String(launcherMeta.launcher)
    : 'unknown';
  const fallbackReason = launcher === 'npx-fallback' && String(launcherMeta?.fallbackReason) === 'direct-enoent'
    ? 'direct-enoent'
    : 'none';
  const npxPolicy = launcher === 'npx-fallback' && ['prefer-offline','default'].includes(String(launcherMeta?.npxPolicy))
    ? String(launcherMeta.npxPolicy)
    : 'not-applicable';
  attribution.cliOperations.push({
    label: String(label || 'cli'),
    launcher,
    fallbackReason,
    npxPolicy,
    startOffsetMs: Math.max(0, queuedStart - base),
    executionStartOffsetMs: Math.max(0, execStart - base),
    endOffsetMs: Math.max(0, ended - base),
    queueWaitMs: Math.max(0, execStart - queuedStart),
    executionMs: Math.max(0, ended - execStart),
  });
}


function snapshotAttributionSummary(attribution) {
  const tasks = attribution?.tasks && typeof attribution.tasks === 'object' ? attribution.tasks : {};
  const organizationsMs = Number(tasks.organizations);
  const postRoot = ['devpassStatus','usageScopes','analyticsScopes','runway']
    .map(name => [name, Number(tasks[name])])
    .filter(([,ms]) => Number.isFinite(ms) && ms >= 0)
    .sort((a,b) => b[1] - a[1])[0] || null;
  const rootMs = Number.isFinite(organizationsMs) && organizationsMs >= 0 ? organizationsMs : 0;
  const detailedSlowest = Object.entries(tasks)
    .filter(([,ms]) => Number.isFinite(Number(ms)) && Number(ms) >= 0)
    .sort((a,b) => Number(b[1]) - Number(a[1]))[0] || null;
  const cli = attribution?.cli || {};
  const runs = Number(cli.runs || 0);
  const queuedRuns = Number(cli.queuedRuns || 0);
  return {
    totalMs: Math.max(0, Date.now() - Number(attribution?.startedAt || Date.now())),
    criticalPath: postRoot ? `organizations→${postRoot[0]}` : (Number.isFinite(organizationsMs) ? 'organizations' : null),
    criticalPathMs: postRoot ? rootMs + Number(postRoot[1]) : (Number.isFinite(organizationsMs) ? rootMs : null),
    slowestTask: detailedSlowest ? String(detailedSlowest[0]) : null,
    slowestTaskMs: detailedSlowest ? Number(detailedSlowest[1]) : null,
    tasks: {...tasks},
    taskTimeline: attribution?.taskTimeline && typeof attribution.taskTimeline === 'object'
      ? Object.fromEntries(Object.entries(attribution.taskTimeline).map(([name, value]) => [name, {...value}]))
      : {},
    cliOperations: Array.isArray(attribution?.cliOperations)
      ? attribution.cliOperations.slice(0, 8).map((item) => ({...item}))
      : [],
    organizationDiscovery: attribution?.organizationDiscovery && typeof attribution.organizationDiscovery === 'object'
      ? {...attribution.organizationDiscovery}
      : null,
    captureReuse: attribution?.captureReuse && typeof attribution.captureReuse === 'object'
      ? {...attribution.captureReuse}
      : null,
    creditsEarlyStart: attribution?.creditsEarlyStart && typeof attribution.creditsEarlyStart === 'object'
      ? {...attribution.creditsEarlyStart}
      : null,
    cacheDecisions: Array.isArray(attribution?.cacheDecisions)
      ? attribution.cacheDecisions.slice(0, 64).map((item) => ({...item}))
      : [],
    secondaryRefresh: secondaryRefreshSnapshot(),
    cache: {...(attribution?.cache || {})},
    circuits: {...(attribution?.circuits || {})},
    cli: {
      runs,
      queuedRuns,
      queueWaitAvgMs: queuedRuns > 0 ? Number(cli.queueWaitTotalMs || 0) / queuedRuns : null,
      queueWaitMaxMs: queuedRuns > 0 ? Number(cli.queueWaitMaxMs || 0) : null,
      limit: CLI_CONCURRENCY,
      peakActive: runs > 0 ? Number(cli.maxActive || 0) : null,
      executionAvgMs: runs > 0 ? Number(cli.executionTotalMs || 0) / runs : null,
      executionMaxMs: runs > 0 ? Number(cli.executionMaxMs || 0) : null,
      slowestLabel: runs > 0 && cli.slowestLabel ? String(cli.slowestLabel) : null,
      slowestTotalMs: runs > 0 ? Number(cli.slowestTotalMs || 0) : null,
    },
  };
}

async function withCliSlot(label, task, launcherMeta = null) {
  const queuedAt = Date.now();
  let queued = false;
  if (cliStats.active >= CLI_CONCURRENCY) {
    queued = true;
    cliStats.queued += 1;
    await new Promise((resolve) => cliWaiters.push(resolve));
    cliStats.queued = Math.max(0, cliStats.queued - 1);
  }
  const executionStartedAt = Date.now();
  const queueWaitMs = Math.max(0, executionStartedAt - queuedAt);
  cliStats.active += 1;
  cliStats.runs += 1;
  cliStats.maxActive = Math.max(cliStats.maxActive, cliStats.active);
  const attribution = currentSnapshotAttribution();
  if (attribution?.cli) attribution.cli.maxActive = Math.max(Number(attribution.cli.maxActive || 0), cliStats.active);
  try {
    return await task();
  } finally {
    const endedAt = Date.now();
    const executionMs = Math.max(0, endedAt - executionStartedAt);
    noteSnapshotCliTiming(label, queued, queueWaitMs, executionMs);
    if (typeof noteSnapshotCliOperation === 'function') {
      noteSnapshotCliOperation(label, queuedAt, executionStartedAt, endedAt, launcherMeta);
    }
    cliStats.active = Math.max(0, cliStats.active - 1);
    const next = cliWaiters.shift();
    if (next) next();
  }
}
