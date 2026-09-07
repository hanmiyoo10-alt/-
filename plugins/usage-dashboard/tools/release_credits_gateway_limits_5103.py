#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
UD = ROOT / 'plugins' / 'usage-dashboard'
SRC = UD / 'src'
ES = UD / 'runtime-src' / 'bridge-engine'
RT = UD / 'runtime'
T = UD / 'tools'
TEST = UD / 'tests'
SPEC = ROOT / '.github' / 'usage-dashboard' / 'releases' / '5.103.json'
CORE = SRC / '00-runtime-core.part.js'
BRIDGE_IO = SRC / '20-bridge-io.part.js'
REFRESH = SRC / '30-refresh-runtime.part.js'
DIAG = SRC / '40-diagnostics.part.js'
DASH = SRC / '50-dashboard-context.part.js'
SETTINGS = SRC / '60-settings-runtime.part.js'
LEDGER = SRC / '14-request-ledger.part.js'
PROV = SRC / '15-request-provenance.part.js'
ECORE = ES / '00-core.part.mjs'
CAPTURE = ES / '30-cli-runtime.part.mjs'
SOURCES = ES / '40-sources.part.mjs'
HTTP = ES / '70-http-diagnostics.part.mjs'
ENGINE = RT / 'bridge-engine.mjs'
MANAGER = RT / 'bridge-manager.cjs'
BOOT = RT / 'bootstrap-bridge-manager.sh'
MANIFEST = RT / 'product-manifest.json'
LATEST = UD / 'latest.js'
P69 = TEST / 'p69-credits-gateway-limits-headroom.cjs'

BASE_PRODUCT = '3.0.0-alpha.5.102'
TARGET_PRODUCT = '3.0.0-alpha.5.103'
BASE_ENGINE = '1.6.37'
TARGET_ENGINE = '1.6.38'
MANAGER_VER = '1.3.6'
BASE_RELEASE_SHA = 'd0292b48c520bbd8a42c5aa1b5b1afa7ed14ca77'
BASE_ENGINE_SHA = 'ec0af46fe89005c1fcafd95bd18468bb223906745a2b836cd9514dcbfa3e093c'
BASE_MANAGER_SHA = 'a000d9915206b60b18adad6db4ce99f25c96844e81f057'
BOOT_SHA = '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c'


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(*args: str) -> None:
    subprocess.run(args, cwd=ROOT, check=True)


def rep(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text()
    if new in text and old not in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'5.103 {label} anchor mismatch:{count}')
    path.write_text(text.replace(old, new, 1))


def insert_before(path: Path, anchor: str, block: str, label: str) -> None:
    text = path.read_text()
    if block.strip() in text:
        return
    count = text.count(anchor)
    if count != 1:
        raise SystemExit(f'5.103 {label} anchor mismatch:{count}')
    path.write_text(text.replace(anchor, block + anchor, 1))


def load_spec() -> dict:
    value = json.loads(SPEC.read_text())
    expected = {
        'productVersion': TARGET_PRODUCT,
        'releaseTitle': 'Credits Gateway Limits & Headroom',
        'engineVersion': TARGET_ENGINE,
        'managerVersion': MANAGER_VER,
        'managedCliVersion': '1.10.0',
        'managedModelCatalogVersion': '1.280.0',
        'materializer': 'plugins/usage-dashboard/tools/release_credits_gateway_limits_5103.py',
        'newRegression': 'plugins/usage-dashboard/tests/p69-credits-gateway-limits-headroom.cjs',
    }
    for key, wanted in expected.items():
        if value.get(key) != wanted:
            raise SystemExit(f'5.103 spec mismatch:{key}')
    if value.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.103 contracts changed')
    for role in ('acceptedBaseline', 'latestInstalled'):
        row = (value.get('releaseEvidence') or {}).get(role) or {}
        actual = (row.get('productVersion'), row.get('releaseSha'), row.get('issue'), row.get('commentId'), row.get('verdict'))
        expected_row = (BASE_PRODUCT, BASE_RELEASE_SHA, 1803, 5565569980, 'accepted')
        if actual != expected_row:
            raise SystemExit(f'5.103 evidence mismatch:{role}:{actual}')
    authority = value.get('authority') or {}
    if authority.get('featureIssue') != 1829 or authority.get('designPullRequest') != 1831:
        raise SystemExit('5.103 feature/design authority mismatch')
    if authority.get('releaseGeneration') != 'E13':
        raise SystemExit('5.103 durable release generation mismatch')
    return value


def release_notes(value: dict) -> str:
    notes = value.get('releaseNotes') or {}
    highlights = notes.get('highlights') or []
    hints = notes.get('diagnosticHints') or []
    if not 1 <= len(highlights) <= 5 or not 1 <= len(hints) <= 5:
        raise SystemExit('5.103 bounded notes missing')
    out = '  const RELEASE_NOTES = Object.freeze({\n'
    out += f"    title: {json.dumps(value['releaseTitle'], ensure_ascii=False)},\n"
    out += '    highlights: Object.freeze([\n'
    out += ''.join(f"    {json.dumps(item, ensure_ascii=False)},\n" for item in highlights)
    out += '    ]),\n'
    out += '    diagnosticHints: Object.freeze([\n'
    out += ''.join(f"    {json.dumps(item, ensure_ascii=False)},\n" for item in hints)
    out += '    ]),\n  });\n'
    return out


def baseline() -> None:
    manifest = json.loads(MANIFEST.read_text())
    if manifest.get('productVersion') == TARGET_PRODUCT:
        target()
        print(f'MATERIALIZER_IDEMPOTENT:{TARGET_PRODUCT}')
        raise SystemExit(0)
    if manifest.get('productVersion') != BASE_PRODUCT:
        raise SystemExit('5.103 baseline Product mismatch')
    bridge = manifest['components']['bridge']
    manager = manifest['components']['bridgeManager']
    if bridge.get('requiredVersion') != BASE_ENGINE or bridge.get('sha256') != BASE_ENGINE_SHA or sha(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.103 baseline Engine mismatch')
    if manager.get('version') != MANAGER_VER or manager.get('productVersion') != BASE_PRODUCT or manager.get('sha256') != BASE_MANAGER_SHA or sha(MANAGER) != BASE_MANAGER_SHA:
        raise SystemExit('5.103 baseline Manager mismatch')
    if sha(BOOT) != BOOT_SHA:
        raise SystemExit('5.103 bootstrap mismatch')
    current = CAPTURE.read_text() + SOURCES.read_text() + DASH.read_text() + DIAG.read_text()
    for marker in (
        'function devPassProviderCachePolicyTruth(raw)',
        "raw.providerCacheControlMode === 'auto'",
        "raw.providerCacheControlMode === 'passthrough'",
        "raw.providerCacheControlMode === 'off'",
        'Provider 캐시 정책',
        'DevPass provider cache policy:',
        'function devPassNoAiTrainingTruth(raw)',
        'AI 학습 차단',
    ):
        if marker not in current:
            raise SystemExit(f'5.103 accepted 5.102 behavior missing:{marker}')
    if 'DEVPASS_BRIDGE_LIMITS_ORG_ID' in CAPTURE.read_text() or 'loadGatewayLimits(' in SOURCES.read_text():
        raise SystemExit('5.103 baseline already contains Gateway Limits implementation')


def patch_capture() -> None:
    rep(
        CAPTURE,
        """const requestedActivityRange = ['24h','7d','30d'].includes(String(process.env.DEVPASS_BRIDGE_ACTIVITY_RANGE || ''))
  ? String(process.env.DEVPASS_BRIDGE_ACTIVITY_RANGE)
  : '';
const marker = Symbol.for('llmgateway.devpass.bridge.capture.v10');""",
        """const requestedActivityRange = ['24h','7d','30d'].includes(String(process.env.DEVPASS_BRIDGE_ACTIVITY_RANGE || ''))
  ? String(process.env.DEVPASS_BRIDGE_ACTIVITY_RANGE)
  : '';
const requestedLimitsOrgId = String(process.env.DEVPASS_BRIDGE_LIMITS_ORG_ID || '').trim();
const marker = Symbol.for('llmgateway.devpass.bridge.capture.v11');""",
        'limits capture env + tap generation',
    )
    rep(
        CAPTURE,
        "  const state = { orgs: null, devPlanStatus: null, devpassActivity: null, devpassLogs: null, captureMode: null };",
        "  const state = { orgs: null, devPlanStatus: null, devpassActivity: null, devpassLogs: null, gatewayLimits: null, captureMode: null };",
        'limits capture state',
    )
    sanitizer = r'''
  const sanitizeGatewayLimits = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const raw = value.data && typeof value.data === 'object' && !Array.isArray(value.data) ? value.data : value;
    const safe = {};
    const nonNegative = (candidate) => typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0 ? candidate : null;
    if (raw.enterprise === true || raw.enterprise === false) safe.enterprise = raw.enterprise;
    if (typeof raw.planClass === 'string' && raw.planClass.trim()) safe.planClass = raw.planClass.trim().slice(0, 64);
    if (raw.rateLimitsApply === true || raw.rateLimitsApply === false) safe.rateLimitsApply = raw.rateLimitsApply;
    if (raw.tierOverridden === true || raw.tierOverridden === false) safe.tierOverridden = raw.tierOverridden;
    if (raw.capsApply === true || raw.capsApply === false) safe.capsApply = raw.capsApply;
    if (raw.tier && typeof raw.tier === 'object' && !Array.isArray(raw.tier)) {
      const tier = {};
      if (Number.isInteger(raw.tier.tier) && raw.tier.tier >= 0) tier.tier = raw.tier.tier;
      for (const key of ['rpmMultiplier','dailyCapUsd','monthlyCapUsd']) {
        const candidate = nonNegative(raw.tier[key]);
        if (candidate !== null) tier[key] = candidate;
      }
      if (Object.keys(tier).length) safe.tier = tier;
    }
    if (raw.usage && typeof raw.usage === 'object' && !Array.isArray(raw.usage)) {
      const usage = {};
      for (const key of ['dailySpentUsd','monthlySpentUsd']) {
        const candidate = nonNegative(raw.usage[key]);
        if (candidate !== null) usage[key] = candidate;
      }
      if (Object.keys(usage).length) safe.usage = usage;
    }
    if (Object.prototype.hasOwnProperty.call(raw, 'topUp')) {
      if (raw.topUp === null) {
        safe.topUp = null;
      } else if (raw.topUp && typeof raw.topUp === 'object' && !Array.isArray(raw.topUp)) {
        const topUp = {};
        for (const key of ['capUsd','windowHours','usedUsd','remainingUsd']) {
          const candidate = nonNegative(raw.topUp[key]);
          if (candidate !== null) topUp[key] = candidate;
        }
        safe.topUp = topUp;
      }
    }
    return Object.keys(safe).length ? safe : null;
  };

'''
    insert_before(CAPTURE, "  const sanitizeModel = (row) => {\n", sanitizer, 'limits sanitizer')
    store = r'''
  const storeGatewayLimits = (result, mode) => {
    const sourceState = ['ok','permission-unavailable','source-unavailable'].includes(String(result?.state))
      ? String(result.state)
      : 'source-unavailable';
    const payload = sourceState === 'ok' ? sanitizeGatewayLimits(result?.payload) : null;
    const stateName = sourceState === 'ok' && payload ? 'ok' : sourceState === 'permission-unavailable' ? 'permission-unavailable' : 'source-unavailable';
    state.gatewayLimits = { state: stateName, payload, mode: String(mode || '') };
    state.captureMode = String(mode || '');
    writeState();
    return state.gatewayLimits;
  };

'''
    insert_before(CAPTURE, "  const storeActivity = (value, range, mode) => {\n", store, 'limits store')
    target_block = r'''
  const limitsTarget = (orgUrl, orgId) => {
    const exactOrgId = String(orgId || '').trim();
    if (!exactOrgId) return null;
    try {
      const target = new URL(orgUrl.origin);
      const prefix = pathPrefix(orgUrl.pathname, '/orgs');
      target.pathname = (prefix + '/orgs/' + encodeURIComponent(exactOrgId) + '/limits').replace(/\/{2,}/g, '/');
      return target;
    } catch {
      return null;
    }
  };

'''
    insert_before(CAPTURE, "  const activityCandidates = (orgUrl, statusUrl, projectId, range) => {\n", target_block, 'limits target')
    fetcher = r'''
  const requestGatewayLimitsWithFetch = async (target, headers, baseInit) => {
    if (!target || typeof originalFetch !== 'function') return { state:'source-unavailable', payload:null };
    try {
      const nextInit = baseInit && typeof baseInit === 'object' ? { ...baseInit } : {};
      nextInit.method = 'GET';
      nextInit.headers = headers;
      delete nextInit.body;
      delete nextInit.signal;
      const response = await originalFetch(target.toString(), nextInit);
      if (!response) return { state:'source-unavailable', payload:null };
      if (response.status === 403) return { state:'permission-unavailable', payload:null };
      if (response.status === 404) return { state:'source-unavailable', payload:null };
      if (!response.ok) return { state:'source-unavailable', payload:null };
      return { state:'ok', payload:parseJsonText(await response.clone().text()) };
    } catch {
      return { state:'source-unavailable', payload:null };
    }
  };

'''
    insert_before(CAPTURE, "  const requestExtrasWithFetch = async (input, init, orgUrl) => {\n", fetcher, 'limits fetch helper')
    rep(
        CAPTURE,
        """      const inputHeaders = typeof Request === 'function' && input instanceof Request ? input.headers : (init && init.headers);
      const headers = safeHeaders(inputHeaders);
      for (const target of statusCandidates(orgUrl)) {""",
        """      const inputHeaders = typeof Request === 'function' && input instanceof Request ? input.headers : (init && init.headers);
      const headers = safeHeaders(inputHeaders);
      if (requestedLimitsOrgId) {
        const result = await requestGatewayLimitsWithFetch(limitsTarget(orgUrl, requestedLimitsOrgId), headers, init);
        storeGatewayLimits(result, 'fetch-limits');
        extrasDone = true;
        return;
      }
      for (const target of statusCandidates(orgUrl)) {""",
        'limits-only fetch branch',
    )
    node_fetcher = r'''
  const requestGatewayLimitsNode = (target, headers) => new Promise((resolve) => {
    if (!target) return resolve({ state:'source-unavailable', payload:null });
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
        res.on('data', (chunk) => { if (body.length < 1024 * 1024) body += chunk; });
        res.on('end', () => {
          if (res.statusCode === 403) return resolve({ state:'permission-unavailable', payload:null });
          if (res.statusCode === 404) return resolve({ state:'source-unavailable', payload:null });
          if (res.statusCode >= 200 && res.statusCode < 300) return resolve({ state:'ok', payload:parseJsonText(body) });
          return resolve({ state:'source-unavailable', payload:null });
        });
      });
      req.on('error', () => resolve({ state:'source-unavailable', payload:null }));
      req.setTimeout(10000, () => { try { req.destroy(); } catch {} resolve({ state:'source-unavailable', payload:null }); });
      req.end();
    } catch {
      resolve({ state:'source-unavailable', payload:null });
    }
  });

'''
    insert_before(CAPTURE, "  const requestExtrasWithNode = async (orgUrl, headers) => {\n", node_fetcher, 'limits node helper')
    rep(
        CAPTURE,
        """    extrasInFlight = true;
    try {
      for (const target of statusCandidates(orgUrl)) {""",
        """    extrasInFlight = true;
    try {
      if (requestedLimitsOrgId) {
        const result = await requestGatewayLimitsNode(limitsTarget(orgUrl, requestedLimitsOrgId), headers);
        storeGatewayLimits(result, 'node-request-limits');
        extrasDone = true;
        return;
      }
      for (const target of statusCandidates(orgUrl)) {""",
        'limits-only node branch',
    )
    rep(
        CAPTURE,
        """  // Authentication headers stay in memory only long enough to perform official,
  // read-only /dev-plans/status plus optional project-scoped /activity and /logs requests.
  // They are never written to the capture file or returned by the bridge.""",
        """  // Authentication headers stay in memory only long enough to perform official,
  // read-only /dev-plans/status plus optional project-scoped /activity and /logs requests,
  // or one exact selected-organization /orgs/{id}/limits request in limits-only mode.
  // They are never written to the capture file or returned by the bridge.""",
        'limits auth boundary comment',
    )


def patch_sources() -> None:
    block = r'''
function gatewayLimitsNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function gatewayLimitsUnknown(state = 'source-unavailable', now = Date.now()) {
  return {
    state: ['permission-unavailable','source-unavailable'].includes(String(state)) ? String(state) : 'source-unavailable',
    source: 'org-limits',
    enterprise: null,
    planClass: null,
    rateLimitsApply: null,
    tierOverridden: null,
    capsApply: null,
    trustTierState: 'unknown',
    trustTier: null,
    rateState: 'unknown',
    rateMultiplier: null,
    daily: { state:'unknown', used:null, cap:null, remaining:null },
    monthly: { state:'unknown', used:null, cap:null, remaining:null },
    topUp: { state:'unknown', cap:null, windowHours:null, used:null, remaining:null },
    fetchedAt: Number(now),
  };
}

function normalizeGatewayLimitsCapture(capture, now = Date.now()) {
  const sourceState = ['ok','permission-unavailable','source-unavailable'].includes(String(capture?.state))
    ? String(capture.state)
    : 'source-unavailable';
  if (sourceState !== 'ok') return gatewayLimitsUnknown(sourceState, now);
  const raw = capture?.payload;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return gatewayLimitsUnknown('source-unavailable', now);

  const enterprise = raw.enterprise === true ? true : raw.enterprise === false ? false : null;
  const planClass = typeof raw.planClass === 'string' && raw.planClass.trim() ? raw.planClass.trim() : null;
  const rateLimitsApply = raw.rateLimitsApply === true ? true : raw.rateLimitsApply === false ? false : null;
  const tierOverridden = raw.tierOverridden === true ? true : raw.tierOverridden === false ? false : null;
  const capsApply = raw.capsApply === true ? true : raw.capsApply === false ? false : null;
  const trustTier = Number.isInteger(raw?.tier?.tier) && raw.tier.tier >= 0 ? raw.tier.tier : null;
  const rateMultiplier = gatewayLimitsNumber(raw?.tier?.rpmMultiplier);
  const dailyUsed = gatewayLimitsNumber(raw?.usage?.dailySpentUsd);
  const dailyCap = gatewayLimitsNumber(raw?.tier?.dailyCapUsd);
  const monthlyUsed = gatewayLimitsNumber(raw?.usage?.monthlySpentUsd);
  const monthlyCap = gatewayLimitsNumber(raw?.tier?.monthlyCapUsd);

  const trustTierState = enterprise === true || (planClass && planClass !== 'regular')
    ? 'not-applicable'
    : planClass === 'regular' && trustTier !== null
      ? 'value'
      : 'unknown';
  const rateState = enterprise === true || rateLimitsApply === false
    ? 'not-applicable'
    : rateLimitsApply === true && rateMultiplier !== null
      ? 'value'
      : 'unknown';

  const spendMetric = (used, cap) => {
    if (enterprise === true || capsApply === false) return { state:'not-applicable', used:null, cap:null, remaining:null };
    if (capsApply === true && used !== null && cap !== null) {
      return { state:'value', used, cap, remaining:Math.max(0, cap - used) };
    }
    return { state:'unknown', used:null, cap:null, remaining:null };
  };

  let topUp = { state:'unknown', cap:null, windowHours:null, used:null, remaining:null };
  if (enterprise === true) {
    topUp = { state:'not-applicable', cap:null, windowHours:null, used:null, remaining:null };
  } else if (Object.prototype.hasOwnProperty.call(raw, 'topUp') && raw.topUp === null) {
    topUp = { state:'not-applicable', cap:null, windowHours:null, used:null, remaining:null };
  } else if (raw.topUp && typeof raw.topUp === 'object' && !Array.isArray(raw.topUp)) {
    const cap = gatewayLimitsNumber(raw.topUp.capUsd);
    const windowHours = gatewayLimitsNumber(raw.topUp.windowHours);
    const used = gatewayLimitsNumber(raw.topUp.usedUsd);
    const remaining = gatewayLimitsNumber(raw.topUp.remainingUsd);
    if (cap !== null && windowHours !== null && used !== null && remaining !== null) {
      topUp = { state:'value', cap, windowHours, used, remaining };
    }
  }

  return {
    state: 'ok',
    source: 'org-limits',
    enterprise,
    planClass,
    rateLimitsApply,
    tierOverridden,
    capsApply,
    trustTierState,
    trustTier: trustTierState === 'value' ? trustTier : null,
    rateState,
    rateMultiplier: rateState === 'value' ? rateMultiplier : null,
    daily: spendMetric(dailyUsed, dailyCap),
    monthly: spendMetric(monthlyUsed, monthlyCap),
    topUp,
    fetchedAt: Number(now),
  };
}

async function captureGatewayLimitsViaCliSession(creditsOrgId) {
  const exactOrgId = String(creditsOrgId || '').trim();
  if (!exactOrgId) return gatewayLimitsUnknown('source-unavailable');
  await ensureCaptureTap();
  const captureFile = path.join(
    CONFIG_DIR,
    `limits-${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`,
  );
  const existingNodeOptions = String(process.env.NODE_OPTIONS || '').trim();
  const captureRequire = `--require=${CAPTURE_TAP_FILE}`;
  const nodeOptions = existingNodeOptions ? `${existingNodeOptions} ${captureRequire}` : captureRequire;
  try {
    await runCliProcess(['orgs', 'list', '--json'], {
      NODE_OPTIONS: nodeOptions,
      DEVPASS_BRIDGE_CAPTURE_FILE: captureFile,
      DEVPASS_BRIDGE_LIMITS_ORG_ID: exactOrgId,
    });
    const text = await fs.readFile(captureFile, 'utf8');
    const captured = JSON.parse(text);
    return normalizeGatewayLimitsCapture(captured?.gatewayLimits);
  } catch {
    return gatewayLimitsUnknown('source-unavailable');
  } finally {
    try { await fs.unlink(captureFile); } catch {}
  }
}

async function loadGatewayLimits(creditsOrgId) {
  const exactOrgId = String(creditsOrgId || '').trim();
  if (!exactOrgId) return gatewayLimitsUnknown('source-unavailable');
  return cached(`gatewayLimits:${exactOrgId}`, async () => captureGatewayLimitsViaCliSession(exactOrgId));
}

'''
    insert_before(SOURCES, "async function loadCreditsBootstrap() {\n", block, 'Gateway Limits source block')
    rep(
        SOURCES,
        """    ?? (name.startsWith('analytics:') ? 60_000 : null)
    ?? ((name === 'usageScopes' || name.startsWith('usageScopes:')) ? 60_000 : null)
    ?? ((name === 'analyticsScopes' || name.startsWith('analyticsScopes:')) ? 60_000 : null)
    ?? (name.startsWith('runway:') ? 300_000 : 30_000);""",
        """    ?? (name.startsWith('analytics:') ? 60_000 : null)
    ?? ((name === 'usageScopes' || name.startsWith('usageScopes:')) ? 60_000 : null)
    ?? ((name === 'analyticsScopes' || name.startsWith('analyticsScopes:')) ? 60_000 : null)
    ?? (name.startsWith('gatewayLimits:') ? 300_000 : null)
    ?? (name.startsWith('runway:') ? 300_000 : 30_000);""",
        'Gateway Limits cache TTL',
    )
    rep(
        SOURCES,
        "    if (current && name !== 'accountCapture' && name !== 'creditsBootstrap' && ageMs <= CACHE_STALE_MAX_MS) {",
        "    if (current && name !== 'accountCapture' && name !== 'creditsBootstrap' && !name.startsWith('gatewayLimits:') && ageMs <= CACHE_STALE_MAX_MS) {",
        'Gateway Limits circuit stale prohibition',
    )
    rep(
        SOURCES,
        "      const allowStale = name !== 'accountCapture' && name !== 'creditsBootstrap';",
        "      const allowStale = name !== 'accountCapture' && name !== 'creditsBootstrap' && !name.startsWith('gatewayLimits:');",
        'Gateway Limits refresh stale prohibition',
    )


def patch_http() -> None:
    rep(
        HTTP,
        """    if (url.pathname === '/snapshot') {
      const profile = url.searchParams.get('profile') === 'light' ? 'light' : 'full';
      return json(res, 200, await snapshot(profile, creditsOrgId));
    }
    if (url.pathname === '/orgs') return json(res, 200, await loadOrgs());""",
        """    if (url.pathname === '/snapshot') {
      const profile = url.searchParams.get('profile') === 'light' ? 'light' : 'full';
      return json(res, 200, await snapshot(profile, creditsOrgId));
    }
    if (url.pathname === '/gateway-limits') {
      if (!creditsOrgId) return json(res, 400, { state:'source-unavailable', source:'org-limits', error:'creditsOrgId required' });
      return json(res, 200, await loadGatewayLimits(creditsOrgId));
    }
    if (url.pathname === '/orgs') return json(res, 200, await loadOrgs());""",
        'Gateway Limits local route',
    )


def patch_plugin_io() -> None:
    block = r'''
  function normalizeGatewayLimitsLocal(raw) {
    if (!raw || typeof raw !== 'object') return { state:'source-unavailable', source:'org-limits', fetchedAt:Date.now() };
    const stateName = ['ok','permission-unavailable','source-unavailable'].includes(String(raw.state)) ? String(raw.state) : 'source-unavailable';
    if (stateName !== 'ok') return { state:stateName, source:'org-limits', fetchedAt:num(raw.fetchedAt) ? Number(raw.fetchedAt) : Date.now() };
    const metric = (value) => {
      const metricState = ['value','not-applicable','unknown'].includes(String(value?.state)) ? String(value.state) : 'unknown';
      return {
        state:metricState,
        used:num(value?.used) ? Number(value.used) : null,
        cap:num(value?.cap) ? Number(value.cap) : null,
        remaining:num(value?.remaining) ? Number(value.remaining) : null,
      };
    };
    const topUpState = ['value','not-applicable','unknown'].includes(String(raw?.topUp?.state)) ? String(raw.topUp.state) : 'unknown';
    return {
      state:'ok',
      source:'org-limits',
      enterprise:raw.enterprise === true ? true : raw.enterprise === false ? false : null,
      planClass:typeof raw.planClass === 'string' && raw.planClass.trim() ? raw.planClass.trim() : null,
      rateLimitsApply:raw.rateLimitsApply === true ? true : raw.rateLimitsApply === false ? false : null,
      tierOverridden:raw.tierOverridden === true ? true : raw.tierOverridden === false ? false : null,
      capsApply:raw.capsApply === true ? true : raw.capsApply === false ? false : null,
      trustTierState:['value','not-applicable','unknown'].includes(String(raw.trustTierState)) ? String(raw.trustTierState) : 'unknown',
      trustTier:Number.isInteger(raw.trustTier) && raw.trustTier >= 0 ? raw.trustTier : null,
      rateState:['value','not-applicable','unknown'].includes(String(raw.rateState)) ? String(raw.rateState) : 'unknown',
      rateMultiplier:num(raw.rateMultiplier) ? Number(raw.rateMultiplier) : null,
      daily:metric(raw.daily),
      monthly:metric(raw.monthly),
      topUp:{
        state:topUpState,
        cap:num(raw?.topUp?.cap) ? Number(raw.topUp.cap) : null,
        windowHours:num(raw?.topUp?.windowHours) ? Number(raw.topUp.windowHours) : null,
        used:num(raw?.topUp?.used) ? Number(raw.topUp.used) : null,
        remaining:num(raw?.topUp?.remaining) ? Number(raw.topUp.remaining) : null,
      },
      fetchedAt:num(raw.fetchedAt) ? Number(raw.fetchedAt) : Date.now(),
    };
  }

  async function fetchGatewayLimitsForOrg(creditsOrgId) {
    const exactOrgId = String(creditsOrgId || '').trim();
    if (!token || !exactOrgId) return { state:'source-unavailable', source:'org-limits', fetchedAt:Date.now() };
    const base = normalizeBridgeBase(state.bridgeBase);
    const res = await Risuai.nativeFetch(`${base}/gateway-limits?creditsOrgId=${encodeURIComponent(exactOrgId)}`, {
      method:'GET',
      headers:{Accept:'application/json','X-Local-Bridge-Key':token,'X-DevPass-Bridge-Key':token,'Cache-Control':'no-cache'}
    });
    const text = await res.text();
    if (!res.ok) return { state:'source-unavailable', source:'org-limits', fetchedAt:Date.now() };
    try { return normalizeGatewayLimitsLocal(JSON.parse(text)); }
    catch { return { state:'source-unavailable', source:'org-limits', fetchedAt:Date.now() }; }
  }

  async function refreshGatewayLimitsForOrg(creditsOrgId, force = false) {
    const exactOrgId = String(creditsOrgId || '').trim();
    if (!exactOrgId) {
      gatewayLimitsRequestSeq += 1;
      gatewayLimitsRuntime = {orgId:'',value:null,fetchedAt:0};
      return null;
    }
    const now = Date.now();
    if (!force && gatewayLimitsRuntime.orgId === exactOrgId && gatewayLimitsRuntime.value
        && now - Number(gatewayLimitsRuntime.fetchedAt || 0) < GATEWAY_LIMITS_UI_TTL_MS) {
      return gatewayLimitsRuntime.value;
    }
    if (gatewayLimitsInFlight?.orgId === exactOrgId) return gatewayLimitsInFlight.promise;

    const requestSeq = ++gatewayLimitsRequestSeq;
    if (gatewayLimitsRuntime.orgId !== exactOrgId) gatewayLimitsRuntime = {orgId:exactOrgId,value:null,fetchedAt:0};
    const promise = (async () => {
      const value = await fetchGatewayLimitsForOrg(exactOrgId);
      if (requestSeq !== gatewayLimitsRequestSeq) return null;
      const selectedStateOrg = String(state.selectedCreditsOrgId || '').trim();
      const selectedDataOrg = String(state.data?.creditsOrganizationId || '').trim();
      if ((selectedStateOrg && selectedStateOrg !== exactOrgId) && selectedDataOrg !== exactOrgId) return null;
      gatewayLimitsRuntime = {
        orgId:exactOrgId,
        value,
        fetchedAt:num(value?.fetchedAt) ? Number(value.fetchedAt) : Date.now(),
      };
      schedulePanelRender(false);
      return value;
    })().catch(() => {
      if (requestSeq !== gatewayLimitsRequestSeq) return null;
      const value = {state:'source-unavailable',source:'org-limits',fetchedAt:Date.now()};
      gatewayLimitsRuntime = {orgId:exactOrgId,value,fetchedAt:value.fetchedAt};
      schedulePanelRender(false);
      return value;
    }).finally(() => {
      if (gatewayLimitsInFlight?.promise === promise) gatewayLimitsInFlight = null;
    });
    gatewayLimitsInFlight = {orgId:exactOrgId,promise};
    return promise;
  }


'''
    insert_before(BRIDGE_IO, "  function bridgeManagerAuthHeaders() {\n", block, 'Gateway Limits plugin loader')


def patch_dashboard() -> None:
    block = r'''
  function gatewayLimitsMetricText(metric) {
    if (metric?.state === 'not-applicable') return '미적용';
    if (metric?.state !== 'value' || !num(metric.used) || !num(metric.cap) || !num(metric.remaining)) return '—';
    return `${money(metric.used)} / ${money(metric.cap)} · 남음 ${money(metric.remaining)}`;
  }

  function gatewayLimitsSectionHtml(truth) {
    const sourceState = ['ok','permission-unavailable','source-unavailable'].includes(String(truth?.state)) ? String(truth.state) : 'source-unavailable';
    if (truth?.enterprise === true && sourceState === 'ok') {
      return `<div class="usage-detail-box gateway-limits-card"><div class="recent-head"><h3>Gateway Limits · Credits</h3><span>source org-limits · ok</span></div><p>Enterprise · 조직 단위 Gateway rate/spend cap 없음</p></div>`;
    }
    const tierText = truth?.trustTierState === 'not-applicable'
      ? '미적용'
      : truth?.trustTierState === 'value' && Number.isInteger(truth?.trustTier)
        ? `Tier ${Number(truth.trustTier)}`
        : '—';
    const rateText = truth?.rateState === 'not-applicable'
      ? '미적용'
      : truth?.rateState === 'value' && num(truth?.rateMultiplier)
        ? `${Number(truth.rateMultiplier)}×`
        : '—';
    const topUpText = truth?.topUp?.state === 'not-applicable'
      ? '미적용'
      : truth?.topUp?.state === 'value' && num(truth?.topUp?.remaining) && num(truth?.topUp?.cap)
        ? `${money(truth.topUp.remaining)} / ${money(truth.topUp.cap)}`
        : '—';
    const topUpLabel = truth?.topUp?.state === 'value' && num(truth?.topUp?.windowHours)
      ? `${Number(truth.topUp.windowHours)}h 충전 여유`
      : 'Rolling 충전 여유';
    return `<div class="usage-detail-box gateway-limits-card"><div class="recent-head"><h3>Gateway Limits · Credits</h3><span>source org-limits · ${esc(sourceState)}</span></div><div class="minis">
      <div class="mini cyan"><span>Trust tier</span><b>${esc(tierText)}</b></div>
      <div class="mini cyan"><span>Rate multiplier</span><b>${esc(rateText)}</b></div>
      <div class="mini"><span>일간 spend · UTC</span><b>${esc(gatewayLimitsMetricText(truth?.daily))}</b></div>
      <div class="mini"><span>월간 spend</span><b>${esc(gatewayLimitsMetricText(truth?.monthly))}</b></div>
      <div class="mini"><span>${esc(topUpLabel)}</span><b>${esc(topUpText)}</b></div>
    </div></div>`;
  }


'''
    insert_before(DASH, "  function settingsHtml() {\n", block, 'Gateway Limits Credits UI helper')
    rep(
        DASH,
        """    const creditsOrgLabel = String(selectedCreditsOrg?.name || selectedCreditsOrgId || 'Default organization');
    const creditsOrgSelector = creditsOrganizations.length ?""",
        """    const creditsOrgLabel = String(selectedCreditsOrg?.name || selectedCreditsOrgId || 'Default organization');
    const gatewayLimitsTruth = gatewayLimitsRuntime.orgId === selectedCreditsOrgId ? gatewayLimitsRuntime.value : null;
    const creditsOrgSelector = creditsOrganizations.length ?""",
        'Gateway Limits selected-org UI binding',
    )
    rep(
        SETTINGS,
        """        ${dashboardView === 'credits' ? creditsOrgSelector : ''}
        <div class="scope-tabs" role="tablist" aria-label="24h Usage scope">""",
        """        ${dashboardView === 'credits' ? creditsOrgSelector : ''}
        ${dashboardView === 'credits' ? gatewayLimitsSectionHtml(gatewayLimitsTruth) : ''}
        <div class="scope-tabs" role="tablist" aria-label="24h Usage scope">""",
        'Gateway Limits Credits section placement',
    )


def patch_settings() -> None:
    rep(
        SETTINGS,
        """        await persist();
        if ((next === 'devpass' || next === 'credits') && previousUsageScope !== state.usageScopeView) renderSettings();""",
        """        await persist();
        if (next === 'credits') {
          const limitsOrgId = String(state.data?.creditsOrganizationId || state.selectedCreditsOrgId || '').trim();
          void refreshGatewayLimitsForOrg(limitsOrgId);
        }
        if ((next === 'devpass' || next === 'credits') && previousUsageScope !== state.usageScopeView) renderSettings();""",
        'Gateway Limits lazy tab load',
    )
    rep(
        SETTINGS,
        """      await persist();
      await enqueueRefresh('manual');
      renderSettings();""",
        """      await persist();
      void refreshGatewayLimitsForOrg(next);
      await enqueueRefresh('manual');
      renderSettings();""",
        'Gateway Limits exact org switch load',
    )
    rep(
        SETTINGS,
        """    document.body.dataset.panelOpen='1';
    renderSettings();
    await renderWidget('panel-open');""",
        """    document.body.dataset.panelOpen='1';
    renderSettings();
    if (String(state.dashboardView || '') === 'credits') {
      const limitsOrgId = String(state.data?.creditsOrganizationId || state.selectedCreditsOrgId || '').trim();
      void refreshGatewayLimitsForOrg(limitsOrgId);
    }
    await renderWidget('panel-open');""",
        'Gateway Limits saved Credits view lazy load',
    )


def patch_diagnostics() -> None:
    block = r'''
  function gatewayLimitsDiagnosticText(value) {
    const stateName = ['ok','permission-unavailable','source-unavailable'].includes(String(value?.state)) ? String(value.state) : 'source-unavailable';
    if (stateName !== 'ok') return `Gateway limits: scope credits · source org-limits · state ${stateName}`;
    if (value?.enterprise === true) return 'Gateway limits: scope credits · enterprise yes · rate n/a · caps n/a · source org-limits · state ok';
    const plan = typeof value?.planClass === 'string' && value.planClass ? value.planClass : 'unknown';
    const tier = value?.trustTierState === 'not-applicable' ? 'n/a' : value?.trustTierState === 'value' && Number.isInteger(value?.trustTier) ? String(value.trustTier) : 'unknown';
    const rate = value?.rateLimitsApply === true ? 'on' : value?.rateLimitsApply === false ? 'off' : 'unknown';
    const caps = value?.capsApply === true ? 'on' : value?.capsApply === false ? 'off' : 'unknown';
    const metric = (row) => row?.state === 'not-applicable'
      ? 'n/a'
      : row?.state === 'value' && num(row?.used) && num(row?.cap)
        ? `${Number(row.used)}/${Number(row.cap)}`
        : 'unknown';
    const topUp = value?.topUp?.state === 'not-applicable'
      ? 'n/a'
      : value?.topUp?.state === 'value' && num(value?.topUp?.remaining) && num(value?.topUp?.cap)
        ? `${Number(value.topUp.remaining)}/${Number(value.topUp.cap)} remaining`
        : 'unknown';
    return `Gateway limits: scope credits · plan ${plan} · tier ${tier} · rate ${rate} · caps ${caps} · daily ${metric(value?.daily)} · monthly ${metric(value?.monthly)} · topup ${topUp} · source org-limits · state ok`;
  }


'''
    insert_before(DIAG, "  function modelCategoryCatalogDiagnosticText(diagnostics) {\n", block, 'Gateway Limits diagnostics helper')
    rep(
        DIAG,
        """      devPassNoAiTrainingDiagnosticText(diagAccount),
      devPassProviderCachePolicyDiagnosticText(diagAccount),
      `DevPass billing period:""",
        """      devPassNoAiTrainingDiagnosticText(diagAccount),
      devPassProviderCachePolicyDiagnosticText(diagAccount),
      gatewayLimitsDiagnosticText(gatewayLimitsRuntime.orgId === String(d.creditsOrganizationId || state.selectedCreditsOrgId || '') ? gatewayLimitsRuntime.value : null),
      `DevPass billing period:""",
        'Gateway Limits diagnostics line',
    )


def patch(value: dict) -> None:
    rep(CORE, '//@version 3.0.0-alpha.5.102', '//@version 3.0.0-alpha.5.103', 'Plugin header')
    rep(CORE, "const VERSION = '3.0.0-alpha.5.102';", "const VERSION = '3.0.0-alpha.5.103';", 'Plugin version')
    rep(CORE, "const REQUIRED_BRIDGE_VERSION = '1.6.37';", "const REQUIRED_BRIDGE_VERSION = '1.6.38';", 'Plugin Engine')
    text = CORE.read_text()
    start = text.find('  const RELEASE_NOTES = Object.freeze({')
    end = text.find('  const UPDATE_URL =', start)
    if start < 0 or end <= start:
        raise SystemExit('5.103 release notes boundary missing')
    CORE.write_text(text[:start] + release_notes(value) + text[end:])
    rep(
        CORE,
        '  const BRIDGE_MANAGER_PROBE_INTERVAL_MS = 60000;\n',
        '  const BRIDGE_MANAGER_PROBE_INTERVAL_MS = 60000;\n  const GATEWAY_LIMITS_UI_TTL_MS = 5 * 60_000;\n',
        'Gateway Limits UI TTL',
    )
    rep(
        CORE,
        "  let store, state, token = '', refreshTimer = null, resetSyncTimer = null, refreshInFlight = null;\n",
        "  let store, state, token = '', refreshTimer = null, resetSyncTimer = null, refreshInFlight = null;\n  let gatewayLimitsRuntime = {orgId:'',value:null,fetchedAt:0}, gatewayLimitsInFlight = null, gatewayLimitsRequestSeq = 0;\n",
        'Gateway Limits runtime-only state',
    )
    rep(ECORE, "const VERSION = '1.6.37';", "const VERSION = '1.6.38';", 'Engine version')
    patch_capture()
    patch_sources()
    patch_http()
    patch_plugin_io()
    patch_dashboard()
    patch_settings()
    patch_diagnostics()


def target() -> None:
    manifest = json.loads(MANIFEST.read_text())
    engine_sha = sha(ENGINE)
    manager_sha = sha(MANAGER)
    if manifest.get('productVersion') != TARGET_PRODUCT:
        raise SystemExit('5.103 target Product mismatch')
    if manifest['components']['bridge'].get('requiredVersion') != TARGET_ENGINE or manifest['components']['bridge'].get('sha256') != engine_sha:
        raise SystemExit('5.103 target Engine manifest mismatch')
    manager = manifest['components']['bridgeManager']
    if manager.get('version') != MANAGER_VER or manager.get('productVersion') != TARGET_PRODUCT or manager.get('sha256') != manager_sha:
        raise SystemExit('5.103 target Manager manifest mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.103 target contracts changed')
    if sha(BOOT) != BOOT_SHA:
        raise SystemExit('5.103 bootstrap changed')

    capture = CAPTURE.read_text()
    sources = SOURCES.read_text()
    http = HTTP.read_text()
    bridge_io = BRIDGE_IO.read_text()
    dashboard = DASH.read_text()
    settings = SETTINGS.read_text()
    diagnostics = DIAG.read_text()
    for marker in (
        'DEVPASS_BRIDGE_LIMITS_ORG_ID',
        'capture.v11',
        'sanitizeGatewayLimits',
        "encodeURIComponent(exactOrgId) + '/limits'",
        'requestGatewayLimitsWithFetch',
        'requestGatewayLimitsNode',
        'function normalizeGatewayLimitsCapture(capture, now = Date.now())',
        'cached(`gatewayLimits:${exactOrgId}`',
        "name.startsWith('gatewayLimits:') ? 300_000",
        "!name.startsWith('gatewayLimits:')",
        "url.pathname === '/gateway-limits'",
        'loadGatewayLimits(creditsOrgId)',
    ):
        if marker not in capture + sources + http:
            raise SystemExit(f'5.103 Engine Gateway Limits marker missing:{marker}')

    sanitizer = capture[capture.find('const sanitizeGatewayLimits'):capture.find('const sanitizeModel')]
    for forbidden in ('accountAgeDays', 'lifetimeSpendUsd', 'nextTier', 'topUpDailyCapUsd', 'endpoints'):
        if forbidden in sanitizer:
            raise SystemExit(f'5.103 minimization violation:{forbidden}')

    for marker in (
        'GATEWAY_LIMITS_UI_TTL_MS = 5 * 60_000',
        'fetchGatewayLimitsForOrg',
        'refreshGatewayLimitsForOrg',
        '/gateway-limits?creditsOrgId=',
        'Gateway Limits · Credits',
        '일간 spend · UTC',
        'gatewayLimitsSectionHtml',
        'Gateway limits: scope credits',
        'gatewayLimitsDiagnosticText',
        'void refreshGatewayLimitsForOrg(next)',
    ):
        if marker not in CORE.read_text() + bridge_io + dashboard + settings + diagnostics:
            raise SystemExit(f'5.103 Plugin Gateway Limits marker missing:{marker}')

    refresh_text = REFRESH.read_text()
    if 'gateway-limits' in refresh_text or 'refreshGatewayLimitsForOrg' in refresh_text:
        raise SystemExit('5.103 Gateway Limits leaked into recurring foreground refresh path')
    loader_slice = bridge_io[bridge_io.find('function normalizeGatewayLimitsLocal'):bridge_io.find('function bridgeManagerAuthHeaders')]
    if 'setInterval' in loader_slice or 'setTimeout' in loader_slice:
        raise SystemExit('5.103 Gateway Limits created timer family')
    for forbidden_owner in (LEDGER, PROV):
        text = forbidden_owner.read_text()
        if any(marker in text for marker in ('gatewayLimits', 'Gateway limits', '/gateway-limits', 'DEVPASS_BRIDGE_LIMITS_ORG_ID')):
            raise SystemExit(f'5.103 Gateway Limits leaked into request owner:{forbidden_owner.name}')

    for marker in (
        'function devPassProviderCachePolicyTruth(raw)',
        "raw.providerCacheControlMode === 'auto'",
        'Provider 캐시 정책',
        'DevPass provider cache policy:',
        'function devPassNoAiTrainingTruth(raw)',
        'AI 학습 차단',
    ):
        if marker not in sources + dashboard + diagnostics:
            raise SystemExit(f'5.103 prior release truth missing:{marker}')

    run('node', 'plugins/usage-dashboard/tools/build_bridge_engine.cjs', '--check')
    run('node', 'plugins/usage-dashboard/tools/build_usage_dashboard.cjs', '--check')
    run('python3', 'plugins/usage-dashboard/tools/sync_project_guidelines.py', '--check')
    run('node', '--check', str(ENGINE))
    run('node', '--check', str(MANAGER))
    run('node', '--check', str(LATEST))


def main() -> None:
    value = load_spec()
    baseline()
    patch(value)

    run('node', str(T / 'build_bridge_engine.cjs'), '--write')
    run('node', str(T / 'build_bridge_engine.cjs'), '--check')
    engine_sha = sha(ENGINE)

    rep(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.102';", "const PRODUCT_VERSION = '3.0.0-alpha.5.103';", 'Manager Product')
    rep(MANAGER, "const BUNDLED_ENGINE_VERSION = '1.6.37';", "const BUNDLED_ENGINE_VERSION = '1.6.38';", 'Manager Engine')
    manager_text = MANAGER.read_text()
    manager_text, count = re.subn(
        r"const BUNDLED_ENGINE_SHA256 = '[0-9a-f]{64}';",
        f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';",
        manager_text,
        count=1,
    )
    if count != 1:
        raise SystemExit('5.103 Manager hash anchor mismatch')
    MANAGER.write_text(manager_text)

    run('node', str(T / 'build_usage_dashboard.cjs'), '--write')
    run('node', str(T / 'build_usage_dashboard.cjs'), '--check')
    manager_sha = sha(MANAGER)

    manifest = json.loads(MANIFEST.read_text())
    manifest['productVersion'] = TARGET_PRODUCT
    manifest['components']['plugin']['version'] = TARGET_PRODUCT
    manifest['components']['bridge']['requiredVersion'] = TARGET_ENGINE
    manifest['components']['bridge']['sha256'] = engine_sha
    manager = manifest['components']['bridgeManager']
    manager['version'] = MANAGER_VER
    manager['productVersion'] = TARGET_PRODUCT
    manager['sha256'] = manager_sha
    manager['bootstrapSha256'] = BOOT_SHA
    manager['managedCliVersion'] = '1.10.0'
    manager['managedModelCatalogVersion'] = '1.280.0'
    manifest['contracts'] = {'snapshot': 1, 'recentRequest': 1}
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n')

    run('python3', str(T / 'sync_project_guidelines.py'))
    target()
    print(
        f'MATERIALIZED:{TARGET_PRODUCT} · Engine {TARGET_ENGINE} {engine_sha} · '
        f'Manager {MANAGER_VER} {manager_sha} · CLI 1.10.0 · Models 1.280.0 · contracts 1/1'
    )


if __name__ == '__main__':
    main()
