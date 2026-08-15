from pathlib import Path
import hashlib
import json

VERSION_OLD = '3.0.0-alpha.5.8'
VERSION_NEW = '3.0.0-alpha.5.9'
MANAGER_OLD = '1.2.3'
MANAGER_NEW = '1.2.4'
ENGINE_OLD = '1.6.1'
ENGINE_NEW = '1.6.2'


def replace_text_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}: {old[:100]!r}')
    return text.replace(old, new, 1)


def replace_file_once(path, old, new):
    p = Path(path)
    p.write_text(replace_text_once(p.read_text(), old, new, path))


manifest_path = Path('plugins/usage-dashboard/runtime/product-manifest.json')
manifest = json.loads(manifest_path.read_text())
if manifest.get('productVersion') != VERSION_OLD:
    raise SystemExit(f'product manifest version mismatch: {manifest.get("productVersion")}')
old_engine_sha = str(manifest['components']['bridge']['sha256'])

# Product/plugin version bump.
replace_file_once(
    'plugins/usage-dashboard/src/00-runtime-core.part.js',
    '//@version 3.0.0-alpha.5.8',
    '//@version 3.0.0-alpha.5.9',
)
replace_file_once(
    'plugins/usage-dashboard/src/00-runtime-core.part.js',
    "const VERSION = '3.0.0-alpha.5.8';",
    "const VERSION = '3.0.0-alpha.5.9';",
)

# Bridge Engine 1.6.2: keep aggregate /activity for totals, and optionally add
# exact request metadata from the official project-scoped /logs endpoint.
engine_path = Path('plugins/usage-dashboard/runtime/bridge-engine.mjs')
engine = engine_path.read_text()
engine = replace_text_once(engine, "const VERSION = '1.6.1';", "const VERSION = '1.6.2';", 'engine version')
engine = replace_text_once(
    engine,
    "const marker = Symbol.for('llmgateway.devpass.bridge.capture.v6');",
    "const marker = Symbol.for('llmgateway.devpass.bridge.capture.v7');",
    'capture marker',
)
engine = replace_text_once(
    engine,
    "  const state = { orgs: null, devPlanStatus: null, devpassActivity: null, captureMode: null };",
    "  const state = { orgs: null, devPlanStatus: null, devpassActivity: null, devpassLogs: null, captureMode: null };",
    'capture state',
)

sanitize_anchor = """    const safe = { activity };
    if (typeof raw.granularity === 'string') safe.granularity = raw.granularity;
    return safe;
  };

  const storeStatus = (value, mode) => {
"""
sanitize_replacement = """    const safe = { activity };
    if (typeof raw.granularity === 'string') safe.granularity = raw.granularity;
    return safe;
  };

  // The official Activity UI uses /logs for per-request rows. Keep only the
  // non-content metadata needed by the local dashboard. Prompt/response bodies,
  // messages, custom headers, cookies, and auth material are never persisted.
  const sanitizeLogs = (value) => {
    if (!value || typeof value !== 'object') return null;
    const raw = value.data && typeof value.data === 'object' ? value.data : value;
    const rows = Array.isArray(raw.logs) ? raw.logs : [];
    return rows.map((row) => {
      if (!row || typeof row !== 'object') return null;
      const requestNumber = row.requestId ?? row.request_id ?? row.id ?? '';
      const timestamp = row.createdAt ?? row.created_at ?? null;
      if (!requestNumber || !timestamp) return null;
      return {
        timestamp,
        requestNumber: String(requestNumber),
        provider: String(row.usedProvider ?? row.used_provider ?? row.requestedProvider ?? row.requested_provider ?? 'Unknown'),
        model: String(row.usedModel ?? row.used_model ?? row.requestedModel ?? row.requested_model ?? 'Unknown'),
        cost: row.cost ?? null,
        totalTokens: row.totalTokens ?? row.total_tokens ?? null,
        cacheHit: typeof row.cached === 'boolean' ? row.cached : null,
        success: row.hasError === true ? false : true,
      };
    }).filter(Boolean);
  };

  const storeStatus = (value, mode) => {
"""
engine = replace_text_once(engine, sanitize_anchor, sanitize_replacement, 'sanitize logs insertion')

store_anchor = """  const storeActivity = (value, range, mode) => {
    const safe = sanitizeActivity(value);
    if (!safe) return false;
    state.devpassActivity = { range: String(range), payload: safe, mode: String(mode || '') };
    writeState();
    return true;
  };

  const safeHeaders = (headersLike) => {
"""
store_replacement = """  const storeActivity = (value, range, mode) => {
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
"""
engine = replace_text_once(engine, store_anchor, store_replacement, 'store logs insertion')

logs_candidates = """  const logsCandidates = (orgUrl, statusUrl, projectId, range) => {
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
        u.pathname = (prefix + '/logs').replace(/\\/{2,}/g, '/');
        u.searchParams.set('projectId', String(projectId));
        u.searchParams.set('orderBy', 'createdAt_desc');
        u.searchParams.set('limit', '100');
        u.searchParams.set('startDate', new Date(Date.now() - rangeMs).toISOString());
        out.push(u);
      }
    }
    return [...new Map(out.map((u) => [u.toString(), u])).values()];
  };

"""
engine = replace_text_once(
    engine,
    "  const originalFetch = globalThis.fetch;\n",
    logs_candidates + "  const originalFetch = globalThis.fetch;\n",
    'logs candidates insertion',
)

fetch_old = """        if (requestedActivityRange && safeStatus.projectId) {
          for (const activityTarget of activityCandidates(orgUrl, target, safeStatus.projectId, requestedActivityRange)) {
            const activity = await requestJsonFetch(activityTarget, headers, init);
            if (activity && storeActivity(activity, requestedActivityRange, 'fetch')) break;
          }
        }
        extrasDone = true;
"""
fetch_new = """        if (requestedActivityRange && safeStatus.projectId) {
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
"""
engine = replace_text_once(engine, fetch_old, fetch_new, 'fetch logs capture')

node_old = """        if (requestedActivityRange && safeStatus.projectId) {
          for (const activityTarget of activityCandidates(orgUrl, target, safeStatus.projectId, requestedActivityRange)) {
            const activity = await requestJsonNode(activityTarget, headers);
            if (activity && storeActivity(activity, requestedActivityRange, 'node-request')) break;
          }
        }
        extrasDone = true;
"""
node_new = """        if (requestedActivityRange && safeStatus.projectId) {
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
"""
engine = replace_text_once(engine, node_old, node_new, 'node logs capture')
engine = replace_text_once(
    engine,
    "  // read-only /dev-plans/status and optional project-scoped /activity requests.\n",
    "  // read-only /dev-plans/status plus optional project-scoped /activity and /logs requests.\n",
    'capture safety comment',
)

normalize_anchor = """function officialActivityRows(root) {
  if (Array.isArray(root?.activity)) return root.activity;
  if (Array.isArray(root?.data?.activity)) return root.data.activity;
  return [];
}

function genericBreakdownRows(root) {
"""
normalize_replacement = """function officialActivityRows(root) {
  if (Array.isArray(root?.activity)) return root.activity;
  if (Array.isArray(root?.data?.activity)) return root.data.activity;
  return [];
}

function normalizeCapturedRecentLogs(root) {
  const rows = Array.isArray(root?.rows) ? root.rows : [];
  return rows.map((row) => {
    if (!row || typeof row !== 'object') return null;
    const timestamp = timestampMs(row.timestamp);
    const requestNumber = String(row.requestNumber || '');
    if (timestamp === null || !requestNumber) return null;
    return {
      timestamp,
      provider: String(row.provider || 'Unknown'),
      model: String(row.model || 'Unknown'),
      cost: finite(row.cost),
      totalTokens: finite(row.totalTokens),
      cacheHit: typeof row.cacheHit === 'boolean' ? row.cacheHit : null,
      requestNumber,
      success: row.success !== false,
    };
  }).filter(Boolean).sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
}

function genericBreakdownRows(root) {
"""
engine = replace_text_once(engine, normalize_anchor, normalize_replacement, 'exact log normalization')

merge_decl_old = """  const modelMap = new Map();
  const recent = [];
  let totalRequests = 0;
"""
merge_decl_new = """  const modelMap = new Map();
  const recent = [];
  const recentRequests = [];
  let totalRequests = 0;
"""
# There are two functions with modelMap/recent declarations; target mergeUsageActivities only.
merge_function_anchor = "function mergeUsageActivities(items, range = '24h') {\n"
merge_start = engine.find(merge_function_anchor)
if merge_start < 0:
    raise SystemExit('mergeUsageActivities anchor missing')
merge_tail = engine[merge_start:]
merge_tail = replace_text_once(merge_tail, merge_decl_old, merge_decl_new, 'merge exact declaration')
merge_tail = replace_text_once(
    merge_tail,
    "    for (const row of item.recent || []) recent.push(row);\n",
    "    for (const row of item.recent || []) recent.push(row);\n    for (const row of item.recentRequests || []) recentRequests.push(row);\n",
    'merge exact rows',
)
merge_tail = replace_text_once(
    merge_tail,
    "    recent: recent.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 20),\n    fetchedAt: Date.now(),\n",
    "    recent: recent.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 20),\n    recentRequests: recentRequests.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 100),\n    fetchedAt: Date.now(),\n",
    'merge exact return',
)
engine = engine[:merge_start] + merge_tail

devpass_old = """    const normalized = normalizeUsageActivity(rawActivity, org, range);
    normalized.usageScope = 'devpass';
    normalized.source = `LLMGateway authenticated session · /activity · DevPass project · ${range}`;
    return normalized;
"""
devpass_new = """    const normalized = normalizeUsageActivity(rawActivity, org, range);
    const exactRecent = range === '24h' ? normalizeCapturedRecentLogs(captured?.devpassLogs) : [];
    if (exactRecent.length) normalized.recentRequests = exactRecent;
    normalized.usageScope = 'devpass';
    normalized.source = exactRecent.length
      ? `LLMGateway authenticated session · /activity + /logs · DevPass project · ${range}`
      : `LLMGateway authenticated session · /activity · DevPass project · ${range}`;
    return normalized;
"""
engine = replace_text_once(engine, devpass_old, devpass_new, 'devpass exact recent integration')
engine_path.write_text(engine)

new_engine_sha = hashlib.sha256(engine_path.read_bytes()).hexdigest()

# Manager 1.2.4 points at the new bundled Engine artifact.
manager_path = Path('plugins/usage-dashboard/runtime/bridge-manager.cjs')
manager = manager_path.read_text()
manager = replace_text_once(manager, "const MANAGER_VERSION = '1.2.3';", "const MANAGER_VERSION = '1.2.4';", 'manager version')
manager = replace_text_once(manager, "const PRODUCT_VERSION = '3.0.0-alpha.5.8';", "const PRODUCT_VERSION = '3.0.0-alpha.5.9';", 'manager product')
manager = replace_text_once(manager, "const BUNDLED_ENGINE_VERSION = '1.6.1';", "const BUNDLED_ENGINE_VERSION = '1.6.2';", 'manager engine version')
manager = replace_text_once(manager, f"const BUNDLED_ENGINE_SHA256 = '{old_engine_sha}';", f"const BUNDLED_ENGINE_SHA256 = '{new_engine_sha}';", 'manager engine hash')
manager_path.write_text(manager)
new_manager_sha = hashlib.sha256(manager_path.read_bytes()).hexdigest()

# Regression locks.
p = Path('plugins/usage-dashboard/tests/p5-bundled-engine.cjs')
t = p.read_text()
t = replace_text_once(t, f"assert.equal(hash(enginePath),'{old_engine_sha}');", f"assert.equal(hash(enginePath),'{new_engine_sha}');", 'p5 engine hash')
t = replace_text_once(t, "assert.ok(engine.includes(\"const VERSION = '1.6.1';\"));", "assert.ok(engine.includes(\"const VERSION = '1.6.2';\"));", 'p5 engine version')
t = replace_text_once(t, "assert.ok(manager.includes(\"const MANAGER_VERSION = '1.2.3';\"));", "assert.ok(manager.includes(\"const MANAGER_VERSION = '1.2.4';\"));", 'p5 manager version')
t = replace_text_once(t, "assert.equal(manifest.components.bridgeManager.version,'1.2.3');", "assert.equal(manifest.components.bridgeManager.version,'1.2.4');", 'p5 manifest manager version')
marker = "assert.ok(engine.includes(\"if (!isAuthorized(req))\"));\n"
extra = marker + "assert.ok(engine.includes(\"const sanitizeLogs = (value) =>\"));\nassert.ok(engine.includes(\"u.pathname = (prefix + '/logs')\"));\nassert.ok(engine.includes('function normalizeCapturedRecentLogs(root)'));\nassert.ok(engine.includes('normalized.recentRequests = exactRecent;'));\nassert.ok(engine.includes('recentRequests: recentRequests.sort'));\nassert.ok(engine.includes('Prompt/response bodies'));\n"
t = replace_text_once(t, marker, extra, 'p5 exact logs markers')
p.write_text(t)

p = Path('plugins/usage-dashboard/tests/p5-bridge-manager.cjs')
t = p.read_text()
t = t.replace('Bridge Manager 1.2.3', 'Bridge Manager 1.2.4')
t = replace_text_once(t, "const MANAGER_VERSION = '1.2.3';", "const MANAGER_VERSION = '1.2.4';", 'p5 bridge manager version lock')
p.write_text(t)

# Product manifest.
manifest['productVersion'] = VERSION_NEW
manifest['components']['plugin']['version'] = VERSION_NEW
manifest['components']['bridge']['requiredVersion'] = ENGINE_NEW
manifest['components']['bridge']['sha256'] = new_engine_sha
manifest['components']['bridgeManager']['version'] = MANAGER_NEW
manifest['components']['bridgeManager']['productVersion'] = VERSION_NEW
manifest['components']['bridgeManager']['sha256'] = new_manager_sha
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')

print(f'Local Usage patch staged: {VERSION_NEW} / manager {MANAGER_NEW} / engine {ENGINE_NEW}')
print(f'engine sha256: {new_engine_sha}')
print(f'manager sha256: {new_manager_sha}')
