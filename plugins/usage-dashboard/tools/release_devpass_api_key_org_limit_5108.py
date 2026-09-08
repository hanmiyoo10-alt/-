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
SPEC = ROOT / '.github' / 'usage-dashboard' / 'releases' / '5.108.json'
CORE = SRC / '00-runtime-core.part.js'
BRIDGE_IO = SRC / '20-bridge-io.part.js'
DIAG = SRC / '40-diagnostics.part.js'
DASH = SRC / '50-dashboard-context.part.js'
MARKUP = SRC / '54-dashboard-markup.part.js'
SETTINGS = SRC / '60-settings-runtime.part.js'
ECORE = ES / '00-core.part.mjs'
CAPTURE = ES / '30-cli-runtime.part.mjs'
SOURCES = ES / '40-sources.part.mjs'
HTTP = ES / '70-http-diagnostics.part.mjs'
ENGINE = RT / 'bridge-engine.mjs'
MANAGER = RT / 'bridge-manager.cjs'
BOOT = RT / 'bootstrap-bridge-manager.sh'
MANIFEST = RT / 'product-manifest.json'
LATEST = UD / 'latest.js'

BASE_PRODUCT = '3.0.0-alpha.5.107'
TARGET_PRODUCT = '3.0.0-alpha.5.108'
BASE_ENGINE = '1.6.41'
TARGET_ENGINE = '1.6.42'
MANAGER_VER = '1.3.6'
BASE_RELEASE_SHA = 'b5ff566fdf164580b0edfa6e2db1d07cc88992bf'
BASE_ENGINE_SHA = '69860f90a52aca0996bf53024208de68a4fbc8cde655361cd2da6fedb76c5e3f'
BASE_MANAGER_SHA = '5d8c6d715babb8cac31055e57fc1f198b34329b7d7fe9442006b860ef9605b63'
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
        raise SystemExit(f'5.108 {label} anchor mismatch:{count}')
    path.write_text(text.replace(old, new, 1))


def insert_before(path: Path, anchor: str, block: str, label: str) -> None:
    text = path.read_text()
    if block.strip() in text:
        return
    count = text.count(anchor)
    if count != 1:
        raise SystemExit(f'5.108 {label} anchor mismatch:{count}')
    path.write_text(text.replace(anchor, block + anchor, 1))


def load_spec() -> dict:
    value = json.loads(SPEC.read_text())
    expected = {
        'productVersion': TARGET_PRODUCT,
        'releaseTitle': 'DevPass API Key Organization Limit',
        'engineVersion': TARGET_ENGINE,
        'managerVersion': MANAGER_VER,
        'managedCliVersion': '1.10.0',
        'managedModelCatalogVersion': '1.280.0',
        'materializer': 'plugins/usage-dashboard/tools/release_devpass_api_key_org_limit_5108.py',
        'newRegression': 'plugins/usage-dashboard/tests/p75-devpass-api-key-org-limit.cjs',
    }
    for key, wanted in expected.items():
        if value.get(key) != wanted:
            raise SystemExit(f'5.108 spec mismatch:{key}')
    if value.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.108 contracts changed')
    evidence = (value.get('releaseEvidence') or {}).get('acceptedBaseline') or {}
    actual = (evidence.get('productVersion'), evidence.get('releaseSha'), evidence.get('issue'), evidence.get('commentId'), evidence.get('verdict'))
    expected_evidence = (BASE_PRODUCT, BASE_RELEASE_SHA, 1892, 5581888722, 'accepted')
    if actual != expected_evidence:
        raise SystemExit(f'5.108 accepted-baseline evidence mismatch:{actual}')
    authority = value.get('authority') or {}
    if authority.get('featureIssue') != 1899 or authority.get('designPullRequest') != 1902:
        raise SystemExit('5.108 feature/design authority mismatch')
    if authority.get('releaseGeneration') != 'E13':
        raise SystemExit('5.108 durable release generation mismatch')
    return value


def release_notes(value: dict) -> str:
    notes = value.get('releaseNotes') or {}
    highlights = notes.get('highlights') or []
    hints = notes.get('diagnosticHints') or []
    if not 1 <= len(highlights) <= 5 or not 1 <= len(hints) <= 5:
        raise SystemExit('5.108 bounded notes missing')
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
        raise SystemExit('5.108 baseline Product mismatch')
    bridge = manifest['components']['bridge']
    manager = manifest['components']['bridgeManager']
    if bridge.get('requiredVersion') != BASE_ENGINE or bridge.get('sha256') != BASE_ENGINE_SHA or sha(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.108 baseline Engine mismatch')
    if manager.get('version') != MANAGER_VER or manager.get('productVersion') != BASE_PRODUCT or manager.get('sha256') != BASE_MANAGER_SHA or sha(MANAGER) != BASE_MANAGER_SHA:
        raise SystemExit('5.108 baseline Manager mismatch')
    if sha(BOOT) != BOOT_SHA:
        raise SystemExit('5.108 bootstrap mismatch')
    combined = CAPTURE.read_text() + SOURCES.read_text() + HTTP.read_text() + BRIDGE_IO.read_text() + DASH.read_text() + MARKUP.read_text() + DIAG.read_text()
    for marker in (
        'gatewayNextTierUnlockLimitsHtml',
        'Gateway next-tier limits:',
        'gatewayEndpointRpmLimitsHtml',
        'Gateway endpoint RPM:',
        'gatewayNextTierProgressionHtml',
        "cached(`gatewayLimits:${exactOrgId}`",
        "url.pathname === '/gateway-limits'",
        "const requestedLimitsOrgId = String(process.env.DEVPASS_BRIDGE_LIMITS_ORG_ID || '').trim();",
    ):
        if marker not in combined:
            raise SystemExit(f'5.108 accepted 5.107 marker missing:{marker}')
    if 'DEVPASS_BRIDGE_API_KEY_PROJECT_ID' in combined or 'apiKeyOrgLimitSectionHtml' in combined or "url.pathname === '/api-key-plan-limits'" in combined:
        raise SystemExit('5.108 baseline already contains API-key organization-limit implementation')


def patch_core(value: dict) -> None:
    rep(CORE, '//@version 3.0.0-alpha.5.107', '//@version 3.0.0-alpha.5.108', 'Plugin header')
    rep(CORE, "const VERSION = '3.0.0-alpha.5.107';", "const VERSION = '3.0.0-alpha.5.108';", 'Plugin version')
    rep(CORE, "const REQUIRED_BRIDGE_VERSION = '1.6.41';", "const REQUIRED_BRIDGE_VERSION = '1.6.42';", 'Product required Bridge version')
    text = CORE.read_text()
    start = text.find('  const RELEASE_NOTES = Object.freeze({')
    end = text.find('  const UPDATE_URL =', start)
    if start < 0 or end <= start:
        raise SystemExit('5.108 release notes boundary missing')
    CORE.write_text(text[:start] + release_notes(value) + text[end:])
    rep(
        CORE,
        '  const GATEWAY_LIMITS_UI_TTL_MS = 5 * 60_000;\n',
        '  const GATEWAY_LIMITS_UI_TTL_MS = 5 * 60_000;\n  const API_KEY_PLAN_LIMITS_UI_TTL_MS = 5 * 60_000;\n',
        'API-key UI TTL',
    )
    rep(
        CORE,
        "  let gatewayLimitsRuntime = {orgId:'',value:null,fetchedAt:0}, gatewayLimitsInFlight = null, gatewayLimitsRequestSeq = 0;\n",
        "  let gatewayLimitsRuntime = {orgId:'',value:null,fetchedAt:0}, gatewayLimitsInFlight = null, gatewayLimitsRequestSeq = 0;\n  let apiKeyPlanLimitsRuntime = {value:null,fetchedAt:0}, apiKeyPlanLimitsInFlight = null, apiKeyPlanLimitsRequestSeq = 0;\n",
        'API-key Product runtime state',
    )


def patch_engine_core() -> None:
    rep(ECORE, "const VERSION = '1.6.41';", "const VERSION = '1.6.42';", 'Engine version')


def patch_capture() -> None:
    rep(
        CAPTURE,
        "const requestedLimitsOrgId = String(process.env.DEVPASS_BRIDGE_LIMITS_ORG_ID || '').trim();\n",
        "const requestedLimitsOrgId = String(process.env.DEVPASS_BRIDGE_LIMITS_ORG_ID || '').trim();\nconst requestedApiKeyProjectId = String(process.env.DEVPASS_BRIDGE_API_KEY_PROJECT_ID || '').trim();\n",
        'API-key capture env',
    )
    rep(
        CAPTURE,
        '  const state = { orgs: null, devPlanStatus: null, devpassActivity: null, devpassLogs: null, gatewayLimits: null, captureMode: null };',
        '  const state = { orgs: null, devPlanStatus: null, devpassActivity: null, devpassLogs: null, apiKeyPlanLimits: null, gatewayLimits: null, captureMode: null };',
        'API-key capture bounded state',
    )
    sanitizer = r'''
  const sanitizeApiKeyPlanLimits = (value) => {
    const raw = value?.data && typeof value.data === 'object' && !Array.isArray(value.data) ? value.data : value;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {state:'plan-limits-unavailable',currentCount:null,maxKeys:null};
    }
    if (!Object.prototype.hasOwnProperty.call(raw, 'planLimits')) {
      return {state:'plan-limits-unavailable',currentCount:null,maxKeys:null};
    }
    const limits = raw.planLimits;
    if (!limits || typeof limits !== 'object' || Array.isArray(limits)) {
      return {state:'invalid-plan-limits',currentCount:null,maxKeys:null};
    }
    const currentCount = Number.isInteger(limits.currentCount) && limits.currentCount >= 0 ? Number(limits.currentCount) : null;
    const maxKeys = Number.isInteger(limits.maxKeys) && limits.maxKeys >= 0 ? Number(limits.maxKeys) : null;
    if (currentCount === null || maxKeys === null) {
      return {state:'invalid-plan-limits',currentCount:null,maxKeys:null};
    }
    return {state:'ok',currentCount,maxKeys};
  };

'''
    insert_before(CAPTURE, '  const sanitizeGatewayLimits = (value) => {\n', sanitizer, 'API-key capture sanitizer')
    store = r'''
  const storeApiKeyPlanLimits = (result, mode) => {
    const sourceState = ['ok','permission-unavailable','source-unavailable'].includes(String(result?.state))
      ? String(result.state)
      : 'source-unavailable';
    let bounded;
    if (sourceState === 'ok') bounded = sanitizeApiKeyPlanLimits(result?.payload);
    else bounded = {state:sourceState,currentCount:null,maxKeys:null};
    state.apiKeyPlanLimits = bounded;
    state.captureMode = String(mode || '');
    writeState();
    return bounded;
  };

'''
    insert_before(CAPTURE, '  const storeGatewayLimits = (result, mode) => {\n', store, 'API-key capture store')
    target = r'''
  const apiKeyPlanLimitsTarget = (orgUrl, projectId) => {
    const exactProjectId = String(projectId || '').trim();
    if (!exactProjectId) return null;
    try {
      const target = new URL(orgUrl.origin);
      const prefix = pathPrefix(orgUrl.pathname, '/orgs');
      target.pathname = (prefix + '/keys/api').replace(/\/{2,}/g, '/');
      target.searchParams.set('projectId', exactProjectId);
      target.searchParams.set('filter', 'mine');
      return target;
    } catch {
      return null;
    }
  };

'''
    insert_before(CAPTURE, '  const limitsTarget = (orgUrl, orgId) => {\n', target, 'API-key target')
    rep(
        CAPTURE,
        """      const headers = safeHeaders(inputHeaders);
      if (requestedLimitsOrgId) {""",
        """      const headers = safeHeaders(inputHeaders);
      if (requestedApiKeyProjectId) {
        const result = await requestGatewayLimitsWithFetch(apiKeyPlanLimitsTarget(orgUrl, requestedApiKeyProjectId), headers, init);
        storeApiKeyPlanLimits(result, 'fetch-api-key-plan-limits');
        extrasDone = true;
        return;
      }
      if (requestedLimitsOrgId) {""",
        'API-key fetch capture branch',
    )
    rep(
        CAPTURE,
        """  const requestExtrasWithNode = async (orgUrl, headers) => {
    if (extrasDone || extrasInFlight) return;
    extrasInFlight = true;
    try {
      if (requestedLimitsOrgId) {""",
        """  const requestExtrasWithNode = async (orgUrl, headers) => {
    if (extrasDone || extrasInFlight) return;
    extrasInFlight = true;
    try {
      if (requestedApiKeyProjectId) {
        const result = await requestGatewayLimitsNode(apiKeyPlanLimitsTarget(orgUrl, requestedApiKeyProjectId), headers);
        storeApiKeyPlanLimits(result, 'node-request-api-key-plan-limits');
        extrasDone = true;
        return;
      }
      if (requestedLimitsOrgId) {""",
        'API-key node capture branch',
    )


def patch_sources() -> None:
    block = r'''
function apiKeyPlanLimitsUnknown(state = 'source-unavailable', now = Date.now()) {
  const stateName = ['project-unavailable','permission-unavailable','source-unavailable','plan-limits-unavailable','invalid-plan-limits'].includes(String(state))
    ? String(state)
    : 'source-unavailable';
  return {state:stateName,source:'keys-api-plan-limits',currentCount:null,maxKeys:null,headroom:null,fetchedAt:Number(now)};
}

function normalizeApiKeyPlanLimitsCapture(capture, now = Date.now()) {
  const stateName = ['ok','project-unavailable','permission-unavailable','source-unavailable','plan-limits-unavailable','invalid-plan-limits'].includes(String(capture?.state))
    ? String(capture.state)
    : 'source-unavailable';
  if (stateName !== 'ok') return apiKeyPlanLimitsUnknown(stateName, now);
  const currentCount = Number.isInteger(capture?.currentCount) && capture.currentCount >= 0 ? Number(capture.currentCount) : null;
  const maxKeys = Number.isInteger(capture?.maxKeys) && capture.maxKeys >= 0 ? Number(capture.maxKeys) : null;
  if (currentCount === null || maxKeys === null) return apiKeyPlanLimitsUnknown('invalid-plan-limits', now);
  return {
    state:'ok',source:'keys-api-plan-limits',currentCount,maxKeys,
    headroom:Math.max(0, maxKeys - currentCount),fetchedAt:Number(now),
  };
}

async function captureApiKeyPlanLimitsViaCliSession(projectId) {
  const exactProjectId = String(projectId || '').trim();
  if (!exactProjectId) return apiKeyPlanLimitsUnknown('project-unavailable');
  await ensureCaptureTap();
  const captureFile = path.join(
    CONFIG_DIR,
    `api-key-limits-${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`,
  );
  const existingNodeOptions = String(process.env.NODE_OPTIONS || '').trim();
  const captureRequire = `--require=${CAPTURE_TAP_FILE}`;
  const nodeOptions = existingNodeOptions ? `${existingNodeOptions} ${captureRequire}` : captureRequire;
  try {
    await runCliProcess(['orgs', 'list', '--json'], {
      NODE_OPTIONS: nodeOptions,
      DEVPASS_BRIDGE_CAPTURE_FILE: captureFile,
      DEVPASS_BRIDGE_API_KEY_PROJECT_ID: exactProjectId,
    });
    const text = await fs.readFile(captureFile, 'utf8');
    const captured = JSON.parse(text);
    return normalizeApiKeyPlanLimitsCapture(captured?.apiKeyPlanLimits);
  } catch {
    return apiKeyPlanLimitsUnknown('source-unavailable');
  } finally {
    try { await fs.unlink(captureFile); } catch {}
  }
}

async function loadApiKeyPlanLimits() {
  let status;
  try { status = await loadDevPassStatus(); }
  catch { return apiKeyPlanLimitsUnknown('source-unavailable'); }
  const exactProjectId = String(status?.projectId || '').trim();
  if (!exactProjectId) return apiKeyPlanLimitsUnknown('project-unavailable');
  return cached(`apiKeyPlanLimits:${exactProjectId}`, async () => captureApiKeyPlanLimitsViaCliSession(exactProjectId));
}

'''
    insert_before(SOURCES, 'function gatewayLimitsNumber(value) {\n', block, 'API-key Engine source')
    rep(
        SOURCES,
        "    ?? (name.startsWith('gatewayLimits:') ? 300_000 : null)\n    ?? (name.startsWith('runway:') ? 300_000 : 30_000);",
        "    ?? (name.startsWith('gatewayLimits:') ? 300_000 : null)\n    ?? (name.startsWith('apiKeyPlanLimits:') ? 300_000 : null)\n    ?? (name.startsWith('runway:') ? 300_000 : 30_000);",
        'API-key Engine cache TTL',
    )


def patch_http() -> None:
    block = """    if (url.pathname === '/api-key-plan-limits') {
      return json(res, 200, await loadApiKeyPlanLimits());
    }
"""
    insert_before(HTTP, "    if (url.pathname === '/gateway-limits') {\n", block, 'API-key local route')


def patch_product_bridge() -> None:
    block = r'''
  function normalizeApiKeyPlanLimitsLocal(raw) {
    const stateName = ['ok','project-unavailable','permission-unavailable','source-unavailable','plan-limits-unavailable','invalid-plan-limits'].includes(String(raw?.state))
      ? String(raw.state)
      : 'source-unavailable';
    const fetchedAt = typeof raw?.fetchedAt === 'number' && Number.isFinite(raw.fetchedAt) && raw.fetchedAt >= 0 ? Number(raw.fetchedAt) : Date.now();
    if (stateName !== 'ok') return {state:stateName,source:'keys-api-plan-limits',currentCount:null,maxKeys:null,headroom:null,fetchedAt};
    const currentCount = Number.isInteger(raw?.currentCount) && raw.currentCount >= 0 ? Number(raw.currentCount) : null;
    const maxKeys = Number.isInteger(raw?.maxKeys) && raw.maxKeys >= 0 ? Number(raw.maxKeys) : null;
    if (currentCount === null || maxKeys === null) {
      return {state:'invalid-plan-limits',source:'keys-api-plan-limits',currentCount:null,maxKeys:null,headroom:null,fetchedAt};
    }
    return {state:'ok',source:'keys-api-plan-limits',currentCount,maxKeys,headroom:Math.max(0,maxKeys-currentCount),fetchedAt};
  }

  async function fetchApiKeyPlanLimits() {
    if (!token) return {state:'source-unavailable',source:'keys-api-plan-limits',currentCount:null,maxKeys:null,headroom:null,fetchedAt:Date.now()};
    const base = normalizeBridgeBase(state.bridgeBase);
    const res = await Risuai.nativeFetch(`${base}/api-key-plan-limits`, {
      method:'GET',
      headers:{Accept:'application/json','X-Local-Bridge-Key':token,'X-DevPass-Bridge-Key':token,'Cache-Control':'no-cache'}
    });
    const text = await res.text();
    if (!res.ok) return {state:'source-unavailable',source:'keys-api-plan-limits',currentCount:null,maxKeys:null,headroom:null,fetchedAt:Date.now()};
    try { return normalizeApiKeyPlanLimitsLocal(JSON.parse(text)); }
    catch { return {state:'source-unavailable',source:'keys-api-plan-limits',currentCount:null,maxKeys:null,headroom:null,fetchedAt:Date.now()}; }
  }

  async function refreshApiKeyPlanLimits(force = false) {
    const now = Date.now();
    if (!force && apiKeyPlanLimitsRuntime.value && now - Number(apiKeyPlanLimitsRuntime.fetchedAt || 0) < API_KEY_PLAN_LIMITS_UI_TTL_MS) {
      return apiKeyPlanLimitsRuntime.value;
    }
    if (apiKeyPlanLimitsInFlight) return apiKeyPlanLimitsInFlight;
    const requestSeq = ++apiKeyPlanLimitsRequestSeq;
    const promise = (async () => {
      const value = await fetchApiKeyPlanLimits();
      if (requestSeq !== apiKeyPlanLimitsRequestSeq) return null;
      apiKeyPlanLimitsRuntime = {
        value,
        fetchedAt:typeof value?.fetchedAt === 'number' && Number.isFinite(value.fetchedAt) ? Number(value.fetchedAt) : Date.now(),
      };
      schedulePanelRender(false);
      return value;
    })().catch(() => {
      if (requestSeq !== apiKeyPlanLimitsRequestSeq) return null;
      const value = {state:'source-unavailable',source:'keys-api-plan-limits',currentCount:null,maxKeys:null,headroom:null,fetchedAt:Date.now()};
      apiKeyPlanLimitsRuntime = {value,fetchedAt:value.fetchedAt};
      schedulePanelRender(false);
      return value;
    }).finally(() => {
      if (apiKeyPlanLimitsInFlight === promise) apiKeyPlanLimitsInFlight = null;
    });
    apiKeyPlanLimitsInFlight = promise;
    return promise;
  }

'''
    insert_before(BRIDGE_IO, '  function bridgeManagerAuthHeaders() {\n', block, 'API-key Product bridge')


def patch_dashboard() -> None:
    helper = r'''
  function apiKeyOrgLimitSectionHtml(truth) {
    const stateName = ['ok','project-unavailable','permission-unavailable','source-unavailable','plan-limits-unavailable','invalid-plan-limits'].includes(String(truth?.state))
      ? String(truth.state)
      : 'source-unavailable';
    const currentCount = stateName === 'ok' && Number.isInteger(truth?.currentCount) && truth.currentCount >= 0 ? Number(truth.currentCount) : null;
    const maxKeys = stateName === 'ok' && Number.isInteger(truth?.maxKeys) && truth.maxKeys >= 0 ? Number(truth.maxKeys) : null;
    if (currentCount === null || maxKeys === null) {
      return `<div class="usage-detail-box api-key-org-limit-card"><div class="recent-head"><h3>API Keys · 조직 한도</h3><span>source keys-api-plan-limits · ${esc(stateName)}</span></div><div class="minis"><div class="mini"><span>활성 API 키 · 조직 전체</span><b>—</b></div><div class="mini"><span>생성 여유</span><b>—</b></div></div></div>`;
    }
    const headroom = Math.max(0, maxKeys - currentCount);
    return `<div class="usage-detail-box api-key-org-limit-card"><div class="recent-head"><h3>API Keys · 조직 한도</h3><span>source keys-api-plan-limits · ok</span></div><div class="minis"><div class="mini"><span>활성 API 키 · 조직 전체</span><b>${esc(currentCount)} / ${esc(maxKeys)}</b></div><div class="mini cyan"><span>생성 여유</span><b>${esc(headroom)}개</b></div></div></div>`;
  }

'''
    insert_before(DASH, '  function gatewayLimitsMetricText(metric) {\n', helper, 'API-key UI helper')
    rep(
        DASH,
        "    const gatewayLimitsTruth = gatewayLimitsRuntime.orgId === selectedCreditsOrgId ? gatewayLimitsRuntime.value : null;\n",
        "    const gatewayLimitsTruth = gatewayLimitsRuntime.orgId === selectedCreditsOrgId ? gatewayLimitsRuntime.value : null;\n    const apiKeyOrgLimitTruth = apiKeyPlanLimitsRuntime.value;\n",
        'API-key UI truth binding',
    )
    rep(
        MARKUP,
        "${dashboardView === 'devpass' ? devpassAccountDetailHtml : ''}${scopeUsageDetailsHtml(scopeActivity)}",
        "${dashboardView === 'devpass' ? devpassAccountDetailHtml : ''}${dashboardView === 'devpass' ? apiKeyOrgLimitSectionHtml(apiKeyOrgLimitTruth) : ''}${scopeUsageDetailsHtml(scopeActivity)}",
        'API-key DevPass placement',
    )


def patch_settings() -> None:
    rep(
        SETTINGS,
        """        if (next === 'credits') {
          const limitsOrgId = String(state.data?.creditsOrganizationId || state.selectedCreditsOrgId || '').trim();
          void refreshGatewayLimitsForOrg(limitsOrgId);
        }
""",
        """        if (next === 'devpass') void refreshApiKeyPlanLimits();
        if (next === 'credits') {
          const limitsOrgId = String(state.data?.creditsOrganizationId || state.selectedCreditsOrgId || '').trim();
          void refreshGatewayLimitsForOrg(limitsOrgId);
        }
""",
        'API-key lazy DevPass trigger',
    )


def patch_diagnostics() -> None:
    helper = r'''
  function apiKeyOrgLimitDiagnosticText(value) {
    const stateName = ['ok','project-unavailable','permission-unavailable','source-unavailable','plan-limits-unavailable','invalid-plan-limits'].includes(String(value?.state))
      ? String(value.state)
      : 'source-unavailable';
    const currentCount = stateName === 'ok' && Number.isInteger(value?.currentCount) && value.currentCount >= 0 ? Number(value.currentCount) : null;
    const maxKeys = stateName === 'ok' && Number.isInteger(value?.maxKeys) && value.maxKeys >= 0 ? Number(value.maxKeys) : null;
    if (currentCount === null || maxKeys === null) {
      return `API key org limit: active — / — · headroom — · source keys-api-plan-limits · state ${stateName}`;
    }
    return `API key org limit: active ${currentCount} / ${maxKeys} · headroom ${Math.max(0,maxKeys-currentCount)} · source keys-api-plan-limits · state ok`;
  }

'''
    insert_before(DIAG, '  function gatewayLimitsDiagnosticText(value) {\n', helper, 'API-key diagnostics helper')
    rep(
        DIAG,
        "      gatewayLimitsDiagnosticText(gatewayLimitsRuntime.orgId === String(d.creditsOrganizationId || state.selectedCreditsOrgId || '') ? gatewayLimitsRuntime.value : null),\n",
        "      apiKeyOrgLimitDiagnosticText(apiKeyPlanLimitsRuntime.value),\n      gatewayLimitsDiagnosticText(gatewayLimitsRuntime.orgId === String(d.creditsOrganizationId || state.selectedCreditsOrgId || '') ? gatewayLimitsRuntime.value : null),\n",
        'API-key diagnostics line',
    )


def patch(value: dict) -> None:
    patch_core(value)
    patch_engine_core()
    patch_capture()
    patch_sources()
    patch_http()
    patch_product_bridge()
    patch_dashboard()
    patch_settings()
    patch_diagnostics()


def target() -> None:
    manifest = json.loads(MANIFEST.read_text())
    engine_sha = sha(ENGINE)
    manager_sha = sha(MANAGER)
    if manifest.get('productVersion') != TARGET_PRODUCT:
        raise SystemExit('5.108 target Product mismatch')
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if bridge.get('requiredVersion') != TARGET_ENGINE or bridge.get('sha256') != engine_sha:
        raise SystemExit('5.108 target Engine manifest mismatch')
    if manager.get('version') != MANAGER_VER or manager.get('productVersion') != TARGET_PRODUCT or manager.get('sha256') != manager_sha:
        raise SystemExit('5.108 target Manager manifest mismatch')
    if manager.get('managedCliVersion') != '1.10.0' or manager.get('managedModelCatalogVersion') != '1.280.0':
        raise SystemExit('5.108 managed dependency drift')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.108 contracts drift')
    if sha(BOOT) != BOOT_SHA:
        raise SystemExit('5.108 bootstrap drift')
    capture = CAPTURE.read_text()
    sources = SOURCES.read_text()
    http = HTTP.read_text()
    product = CORE.read_text() + BRIDGE_IO.read_text() + DASH.read_text() + MARKUP.read_text() + SETTINGS.read_text() + DIAG.read_text()
    for marker in (
        'DEVPASS_BRIDGE_API_KEY_PROJECT_ID',
        "target.pathname = (prefix + '/keys/api').replace",
        "target.searchParams.set('filter', 'mine')",
        'sanitizeApiKeyPlanLimits',
        'normalizeApiKeyPlanLimitsCapture',
        "cached(`apiKeyPlanLimits:${exactProjectId}`",
        "url.pathname === '/api-key-plan-limits'",
        'API Keys · 조직 한도',
        '활성 API 키 · 조직 전체',
        'API key org limit:',
        "if (next === 'devpass') void refreshApiKeyPlanLimits();",
    ):
        if marker not in capture + sources + http + product:
            raise SystemExit(f'5.108 target marker missing:{marker}')
    for forbidden in (
        '/api-key-plan-limits?projectId=',
        '/api-key-plan-limits?organizationId=',
    ):
        if forbidden in product:
            raise SystemExit(f'5.108 Product identity leak:{forbidden}')

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

    rep(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.107';", "const PRODUCT_VERSION = '3.0.0-alpha.5.108';", 'Manager Product')
    rep(MANAGER, "const BUNDLED_ENGINE_VERSION = '1.6.41';", "const BUNDLED_ENGINE_VERSION = '1.6.42';", 'Manager Engine')
    manager_text = MANAGER.read_text()
    manager_text, count = re.subn(
        r"const BUNDLED_ENGINE_SHA256 = '[0-9a-f]{64}';",
        f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';",
        manager_text,
        count=1,
    )
    if count != 1:
        raise SystemExit('5.108 Manager hash anchor mismatch')
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
