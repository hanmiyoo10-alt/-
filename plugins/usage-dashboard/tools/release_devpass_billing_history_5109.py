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
SPEC = ROOT / '.github' / 'usage-dashboard' / 'releases' / '5.109.json'
CORE = SRC / '00-runtime-core.part.js'
BRIDGE_IO = SRC / '20-bridge-io.part.js'
REFRESH = SRC / '30-refresh-runtime.part.js'
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

BASE_PRODUCT = '3.0.0-alpha.5.108'
TARGET_PRODUCT = '3.0.0-alpha.5.109'
BASE_ENGINE = '1.6.42'
TARGET_ENGINE = '1.6.43'
MANAGER_VER = '1.3.6'
BASE_RELEASE_SHA = '05862999df0521c73b6890fbc561c01be3f9f36e'
BASE_ENGINE_SHA = '232de12457f1550ec0d99dab480b98623d0a3f22b60cdac17cd84204e95f9f8e'
BASE_MANAGER_SHA = '322187b95f182d87745b9fa3bcd24fc37fa9069b20fb3de8e189bfea201dcbcb'
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
        raise SystemExit(f'5.109 {label} anchor mismatch:{count}')
    path.write_text(text.replace(old, new, 1))


def insert_before(path: Path, anchor: str, block: str, label: str) -> None:
    text = path.read_text()
    if block.strip() in text:
        return
    count = text.count(anchor)
    if count != 1:
        raise SystemExit(f'5.109 {label} anchor mismatch:{count}')
    path.write_text(text.replace(anchor, block + anchor, 1))


def load_spec() -> dict:
    value = json.loads(SPEC.read_text())
    expected = {
        'productVersion': TARGET_PRODUCT,
        'releaseTitle': 'DevPass Recent Billing History',
        'engineVersion': TARGET_ENGINE,
        'managerVersion': MANAGER_VER,
        'managedCliVersion': '1.10.0',
        'managedModelCatalogVersion': '1.280.0',
        'materializer': 'plugins/usage-dashboard/tools/release_devpass_billing_history_5109.py',
        'newRegression': 'plugins/usage-dashboard/tests/p76-devpass-billing-history.cjs',
    }
    for key, wanted in expected.items():
        if value.get(key) != wanted:
            raise SystemExit(f'5.109 spec mismatch:{key}')
    if value.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.109 contracts changed')
    evidence = (value.get('releaseEvidence') or {}).get('acceptedBaseline') or {}
    actual = (evidence.get('productVersion'), evidence.get('releaseSha'), evidence.get('issue'), evidence.get('commentId'), evidence.get('verdict'))
    expected_evidence = (BASE_PRODUCT, BASE_RELEASE_SHA, 1905, 5585420039, 'accepted')
    if actual != expected_evidence:
        raise SystemExit(f'5.109 accepted-baseline evidence mismatch:{actual}')
    authority = value.get('authority') or {}
    if authority.get('featureIssue') != 1916 or authority.get('designPullRequest') != 1917:
        raise SystemExit('5.109 feature/design authority mismatch')
    if authority.get('releaseGeneration') != 'E13':
        raise SystemExit('5.109 durable release generation mismatch')
    return value


def release_notes(value: dict) -> str:
    notes = value.get('releaseNotes') or {}
    highlights = notes.get('highlights') or []
    hints = notes.get('diagnosticHints') or []
    if not 1 <= len(highlights) <= 5 or not 1 <= len(hints) <= 5:
        raise SystemExit('5.109 bounded notes missing')
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
        raise SystemExit('5.109 baseline Product mismatch')
    bridge = manifest['components']['bridge']
    manager = manifest['components']['bridgeManager']
    if bridge.get('requiredVersion') != BASE_ENGINE or bridge.get('sha256') != BASE_ENGINE_SHA or sha(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.109 baseline Engine mismatch')
    if manager.get('version') != MANAGER_VER or manager.get('productVersion') != BASE_PRODUCT or manager.get('sha256') != BASE_MANAGER_SHA or sha(MANAGER) != BASE_MANAGER_SHA:
        raise SystemExit('5.109 baseline Manager mismatch')
    if sha(BOOT) != BOOT_SHA:
        raise SystemExit('5.109 bootstrap mismatch')
    combined = CAPTURE.read_text() + SOURCES.read_text() + HTTP.read_text() + BRIDGE_IO.read_text() + DASH.read_text() + MARKUP.read_text() + DIAG.read_text()
    for marker in (
        'apiKeyOrgLimitSectionHtml',
        'API Keys · 조직 한도',
        'API key org limit:',
        "cached(`apiKeyPlanLimits:${exactProjectId}`",
        "url.pathname === '/api-key-plan-limits'",
        'gatewayNextTierUnlockLimitsHtml',
        'Gateway next-tier limits:',
        'gatewayEndpointRpmLimitsHtml',
        'Gateway endpoint RPM:',
        'gatewayNextTierProgressionHtml',
    ):
        if marker not in combined:
            raise SystemExit(f'5.109 accepted 5.108 marker missing:{marker}')
    if 'DEVPASS_BRIDGE_BILLING_HISTORY' in combined or 'devPassBillingHistorySectionHtml' in combined or "url.pathname === '/devpass-billing-history'" in combined:
        raise SystemExit('5.109 baseline already contains billing-history implementation')


def patch_core(value: dict) -> None:
    rep(CORE, '//@version 3.0.0-alpha.5.108', '//@version 3.0.0-alpha.5.109', 'Plugin header')
    rep(CORE, "const VERSION = '3.0.0-alpha.5.108';", "const VERSION = '3.0.0-alpha.5.109';", 'Plugin version')
    rep(CORE, "const REQUIRED_BRIDGE_VERSION = '1.6.42';", "const REQUIRED_BRIDGE_VERSION = '1.6.43';", 'Product required Bridge version')
    text = CORE.read_text()
    start = text.find('  const RELEASE_NOTES = Object.freeze({')
    end = text.find('  const UPDATE_URL =', start)
    if start < 0 or end <= start:
        raise SystemExit('5.109 release notes boundary missing')
    CORE.write_text(text[:start] + release_notes(value) + text[end:])
    rep(
        CORE,
        '  const API_KEY_PLAN_LIMITS_UI_TTL_MS = 5 * 60_000;\n',
        '  const API_KEY_PLAN_LIMITS_UI_TTL_MS = 5 * 60_000;\n  const DEVPASS_BILLING_HISTORY_UI_TTL_MS = 5 * 60_000;\n',
        'billing-history UI TTL',
    )
    rep(
        CORE,
        "  let apiKeyPlanLimitsRuntime = {value:null,fetchedAt:0}, apiKeyPlanLimitsInFlight = null, apiKeyPlanLimitsRequestSeq = 0;\n",
        "  let apiKeyPlanLimitsRuntime = {value:null,fetchedAt:0}, apiKeyPlanLimitsInFlight = null, apiKeyPlanLimitsRequestSeq = 0;\n  let devpassBillingHistoryRuntime = {value:null,fetchedAt:0}, devpassBillingHistoryInFlight = null, devpassBillingHistoryRequestSeq = 0;\n",
        'billing-history Product runtime state',
    )


def patch_engine_core() -> None:
    rep(ECORE, "const VERSION = '1.6.42';", "const VERSION = '1.6.43';", 'Engine version')


def patch_capture() -> None:
    rep(
        CAPTURE,
        "const requestedApiKeyProjectId = String(process.env.DEVPASS_BRIDGE_API_KEY_PROJECT_ID || '').trim();\n",
        "const requestedApiKeyProjectId = String(process.env.DEVPASS_BRIDGE_API_KEY_PROJECT_ID || '').trim();\nconst requestedBillingHistory = String(process.env.DEVPASS_BRIDGE_BILLING_HISTORY || '') === '1';\n",
        'billing-history capture env',
    )
    rep(
        CAPTURE,
        '  const state = { orgs: null, devPlanStatus: null, devpassActivity: null, devpassLogs: null, apiKeyPlanLimits: null, gatewayLimits: null, captureMode: null };',
        '  const state = { orgs: null, devPlanStatus: null, devpassActivity: null, devpassLogs: null, devpassBillingHistory: null, apiKeyPlanLimits: null, gatewayLimits: null, captureMode: null };',
        'billing-history capture state',
    )
    sanitizer = r'''
  const sanitizeDevPassBillingHistory = (value) => {
    const allowedTypes = new Set([
      'dev_plan_start','dev_plan_renewal','dev_plan_upgrade','dev_plan_downgrade','dev_plan_cancel','dev_plan_resume','dev_plan_end',
      'dev_plan_reset_pass','dev_plan_reset_pass_reward','dev_plan_reset_pass_gift',
      'credit_topup','credit_refund','credit_gift','credit_manual_payment'
    ]);
    const allowedStatuses = new Set(['pending','completed','failed']);
    const raw = value?.data && typeof value.data === 'object' && !Array.isArray(value.data) ? value.data : value;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !Array.isArray(raw.invoices)) {
      return {state:'invalid-history',rows:[],validCount:0,receivedCount:null};
    }
    const receivedCount = raw.invoices.length;
    if (receivedCount === 0) return {state:'empty',rows:[],validCount:0,receivedCount:0};
    const rows = [];
    let validCount = 0;
    for (const row of raw.invoices) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
      const type = typeof row.type === 'string' ? row.type : '';
      const date = typeof row.date === 'string' ? row.date : '';
      const currency = typeof row.currency === 'string' ? row.currency.trim() : '';
      const status = typeof row.status === 'string' ? row.status : '';
      if (!allowedTypes.has(type) || !date || !Number.isFinite(Date.parse(date)) || !currency || currency.length > 12 || !allowedStatuses.has(status)) continue;
      let amount = null;
      if (row.amount !== null) {
        if (typeof row.amount !== 'number' || !Number.isFinite(row.amount)) continue;
        amount = Number(row.amount);
      }
      validCount += 1;
      if (rows.length < 5) rows.push({type,date,amount,currency,status});
    }
    if (validCount === 0) return {state:'invalid-history',rows:[],validCount:0,receivedCount};
    return {state:validCount === receivedCount ? 'ok' : 'partial',rows,validCount,receivedCount};
  };

'''
    insert_before(CAPTURE, '  const sanitizeApiKeyPlanLimits = (value) => {\n', sanitizer, 'billing-history sanitizer')
    store = r'''
  const storeDevPassBillingHistory = (result, mode) => {
    const sourceState = ['ok','permission-unavailable','source-unavailable'].includes(String(result?.state))
      ? String(result.state)
      : 'source-unavailable';
    const bounded = sourceState === 'ok'
      ? sanitizeDevPassBillingHistory(result?.payload)
      : {state:sourceState,rows:[],validCount:null,receivedCount:null};
    state.devpassBillingHistory = bounded;
    state.captureMode = String(mode || '');
    writeState();
    return bounded;
  };

'''
    insert_before(CAPTURE, '  const storeApiKeyPlanLimits = (result, mode) => {\n', store, 'billing-history capture store')
    target = r'''
  const billingHistoryTarget = (orgUrl) => {
    try {
      const target = new URL(orgUrl.origin);
      const prefix = pathPrefix(orgUrl.pathname, '/orgs');
      target.pathname = (prefix + '/dev-plans/invoices').replace(/\/{2,}/g, '/');
      return target;
    } catch {
      return null;
    }
  };

'''
    insert_before(CAPTURE, '  const apiKeyPlanLimitsTarget = (orgUrl, projectId) => {\n', target, 'billing-history target')
    rep(
        CAPTURE,
        """      const headers = safeHeaders(inputHeaders);
      if (requestedApiKeyProjectId) {""",
        """      const headers = safeHeaders(inputHeaders);
      if (requestedBillingHistory) {
        const result = await requestGatewayLimitsWithFetch(billingHistoryTarget(orgUrl), headers, init);
        storeDevPassBillingHistory(result, 'fetch-devpass-billing-history');
        extrasDone = true;
        return;
      }
      if (requestedApiKeyProjectId) {""",
        'billing-history fetch branch',
    )
    rep(
        CAPTURE,
        """    try {
      if (requestedApiKeyProjectId) {""",
        """    try {
      if (requestedBillingHistory) {
        const result = await requestGatewayLimitsNode(billingHistoryTarget(orgUrl), headers);
        storeDevPassBillingHistory(result, 'node-request-devpass-billing-history');
        extrasDone = true;
        return;
      }
      if (requestedApiKeyProjectId) {""",
        'billing-history node branch',
    )


def patch_sources() -> None:
    block = r'''
function devPassBillingHistoryUnknown(state = 'source-unavailable', now = Date.now()) {
  const stateName = ['source-unavailable','permission-unavailable','invalid-history'].includes(String(state))
    ? String(state)
    : 'source-unavailable';
  return {state:stateName,source:'devpass-invoices',rows:[],validCount:null,receivedCount:null,newest:null,fetchedAt:Number(now)};
}

function normalizeDevPassBillingHistoryCapture(capture, now = Date.now()) {
  const allowedTypes = new Set([
    'dev_plan_start','dev_plan_renewal','dev_plan_upgrade','dev_plan_downgrade','dev_plan_cancel','dev_plan_resume','dev_plan_end',
    'dev_plan_reset_pass','dev_plan_reset_pass_reward','dev_plan_reset_pass_gift',
    'credit_topup','credit_refund','credit_gift','credit_manual_payment'
  ]);
  const allowedStatuses = new Set(['pending','completed','failed']);
  const stateName = ['ok','empty','source-unavailable','permission-unavailable','invalid-history','partial'].includes(String(capture?.state))
    ? String(capture.state)
    : 'source-unavailable';
  if (stateName === 'source-unavailable' || stateName === 'permission-unavailable') return devPassBillingHistoryUnknown(stateName, now);
  const receivedCount = Number.isInteger(capture?.receivedCount) && capture.receivedCount >= 0 ? Number(capture.receivedCount) : null;
  const validCount = Number.isInteger(capture?.validCount) && capture.validCount >= 0 ? Number(capture.validCount) : null;
  if (stateName === 'empty') {
    if (receivedCount !== 0 || validCount !== 0 || !Array.isArray(capture?.rows) || capture.rows.length !== 0) return devPassBillingHistoryUnknown('invalid-history', now);
    return {state:'empty',source:'devpass-invoices',rows:[],validCount:0,receivedCount:0,newest:null,fetchedAt:Number(now)};
  }
  if (stateName === 'invalid-history') {
    if (receivedCount === null || receivedCount <= 0 || validCount !== 0) return devPassBillingHistoryUnknown('invalid-history', now);
    return {state:'invalid-history',source:'devpass-invoices',rows:[],validCount:0,receivedCount,newest:null,fetchedAt:Number(now)};
  }
  if (!Array.isArray(capture?.rows) || capture.rows.length > 5 || receivedCount === null || validCount === null || validCount <= 0 || receivedCount < validCount) {
    return devPassBillingHistoryUnknown('invalid-history', now);
  }
  if ((stateName === 'ok' && validCount !== receivedCount) || (stateName === 'partial' && validCount >= receivedCount) || capture.rows.length !== Math.min(validCount, 5)) {
    return devPassBillingHistoryUnknown('invalid-history', now);
  }
  const rows = [];
  for (const row of capture.rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return devPassBillingHistoryUnknown('invalid-history', now);
    const type = typeof row.type === 'string' ? row.type : '';
    const date = typeof row.date === 'string' ? row.date : '';
    const currency = typeof row.currency === 'string' ? row.currency.trim() : '';
    const status = typeof row.status === 'string' ? row.status : '';
    if (!allowedTypes.has(type) || !date || !Number.isFinite(Date.parse(date)) || !currency || currency.length > 12 || !allowedStatuses.has(status)) {
      return devPassBillingHistoryUnknown('invalid-history', now);
    }
    let amount = null;
    if (row.amount !== null) {
      if (typeof row.amount !== 'number' || !Number.isFinite(row.amount)) return devPassBillingHistoryUnknown('invalid-history', now);
      amount = Number(row.amount);
    }
    rows.push({type,date,amount,currency,status});
  }
  return {state:stateName,source:'devpass-invoices',rows,validCount,receivedCount,newest:rows[0]?.date || null,fetchedAt:Number(now)};
}

async function captureDevPassBillingHistoryViaCliSession() {
  await ensureCaptureTap();
  const captureFile = path.join(
    CONFIG_DIR,
    `devpass-billing-history-${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`,
  );
  const existingNodeOptions = String(process.env.NODE_OPTIONS || '').trim();
  const captureRequire = `--require=${CAPTURE_TAP_FILE}`;
  const nodeOptions = existingNodeOptions ? `${existingNodeOptions} ${captureRequire}` : captureRequire;
  try {
    await runCliProcess(['orgs', 'list', '--json'], {
      NODE_OPTIONS: nodeOptions,
      DEVPASS_BRIDGE_CAPTURE_FILE: captureFile,
      DEVPASS_BRIDGE_BILLING_HISTORY: '1',
    });
    const text = await fs.readFile(captureFile, 'utf8');
    const captured = JSON.parse(text);
    return normalizeDevPassBillingHistoryCapture(captured?.devpassBillingHistory);
  } catch {
    return devPassBillingHistoryUnknown('source-unavailable');
  } finally {
    try { await fs.unlink(captureFile); } catch {}
  }
}

async function loadDevPassBillingHistory() {
  return cached('devpassBillingHistory', async () => captureDevPassBillingHistoryViaCliSession());
}

'''
    insert_before(SOURCES, "function apiKeyPlanLimitsUnknown(state = 'source-unavailable'", block, 'billing-history Engine source')
    rep(
        SOURCES,
        "    ?? (name.startsWith('apiKeyPlanLimits:') ? 300_000 : null)\n",
        "    ?? (name === 'devpassBillingHistory' ? 300_000 : null)\n    ?? (name.startsWith('apiKeyPlanLimits:') ? 300_000 : null)\n",
        'billing-history Engine cache TTL',
    )


def patch_http() -> None:
    block = """    if (url.pathname === '/devpass-billing-history') {
      return json(res, 200, await loadDevPassBillingHistory());
    }
"""
    insert_before(HTTP, "    if (url.pathname === '/api-key-plan-limits') {\n", block, 'billing-history local route')


def patch_product_bridge() -> None:
    block = r'''
  function normalizeDevPassBillingHistoryLocal(raw) {
    const allowedTypes = new Set([
      'dev_plan_start','dev_plan_renewal','dev_plan_upgrade','dev_plan_downgrade','dev_plan_cancel','dev_plan_resume','dev_plan_end',
      'dev_plan_reset_pass','dev_plan_reset_pass_reward','dev_plan_reset_pass_gift',
      'credit_topup','credit_refund','credit_gift','credit_manual_payment'
    ]);
    const allowedStatuses = new Set(['pending','completed','failed']);
    const stateName = ['ok','empty','source-unavailable','permission-unavailable','invalid-history','partial'].includes(String(raw?.state))
      ? String(raw.state)
      : 'source-unavailable';
    const fetchedAt = typeof raw?.fetchedAt === 'number' && Number.isFinite(raw.fetchedAt) && raw.fetchedAt >= 0 ? Number(raw.fetchedAt) : Date.now();
    if (stateName === 'source-unavailable' || stateName === 'permission-unavailable') {
      return {state:stateName,source:'devpass-invoices',rows:[],validCount:null,receivedCount:null,newest:null,fetchedAt};
    }
    const receivedCount = Number.isInteger(raw?.receivedCount) && raw.receivedCount >= 0 ? Number(raw.receivedCount) : null;
    const validCount = Number.isInteger(raw?.validCount) && raw.validCount >= 0 ? Number(raw.validCount) : null;
    const inputRows = Array.isArray(raw?.rows) && raw.rows.length <= 5 ? raw.rows : null;
    if (stateName === 'empty' && receivedCount === 0 && validCount === 0 && inputRows && inputRows.length === 0) {
      return {state:'empty',source:'devpass-invoices',rows:[],validCount:0,receivedCount:0,newest:null,fetchedAt};
    }
    if (stateName === 'invalid-history') {
      return {state:'invalid-history',source:'devpass-invoices',rows:[],validCount:validCount === 0 ? 0 : null,receivedCount,newest:null,fetchedAt};
    }
    if (!inputRows || receivedCount === null || validCount === null || validCount <= 0 || receivedCount < validCount || inputRows.length !== Math.min(validCount,5)) {
      return {state:'invalid-history',source:'devpass-invoices',rows:[],validCount:null,receivedCount:null,newest:null,fetchedAt};
    }
    if ((stateName === 'ok' && validCount !== receivedCount) || (stateName === 'partial' && validCount >= receivedCount)) {
      return {state:'invalid-history',source:'devpass-invoices',rows:[],validCount:null,receivedCount:null,newest:null,fetchedAt};
    }
    const rows = [];
    for (const row of inputRows) {
      const type = typeof row?.type === 'string' ? row.type : '';
      const date = typeof row?.date === 'string' ? row.date : '';
      const currency = typeof row?.currency === 'string' ? row.currency.trim() : '';
      const status = typeof row?.status === 'string' ? row.status : '';
      if (!allowedTypes.has(type) || !date || !Number.isFinite(Date.parse(date)) || !currency || currency.length > 12 || !allowedStatuses.has(status)) {
        return {state:'invalid-history',source:'devpass-invoices',rows:[],validCount:null,receivedCount:null,newest:null,fetchedAt};
      }
      let amount = null;
      if (row.amount !== null) {
        if (typeof row.amount !== 'number' || !Number.isFinite(row.amount)) return {state:'invalid-history',source:'devpass-invoices',rows:[],validCount:null,receivedCount:null,newest:null,fetchedAt};
        amount = Number(row.amount);
      }
      rows.push({type,date,amount,currency,status});
    }
    return {state:stateName,source:'devpass-invoices',rows,validCount,receivedCount,newest:rows[0]?.date || null,fetchedAt};
  }

  async function fetchDevPassBillingHistory() {
    if (!token) return {state:'source-unavailable',source:'devpass-invoices',rows:[],validCount:null,receivedCount:null,newest:null,fetchedAt:Date.now()};
    const base = normalizeBridgeBase(state.bridgeBase);
    const res = await Risuai.nativeFetch(`${base}/devpass-billing-history`, {
      method:'GET',
      headers:{Accept:'application/json','X-Local-Bridge-Key':token,'X-DevPass-Bridge-Key':token,'Cache-Control':'no-cache'}
    });
    const text = await res.text();
    if (!res.ok) return {state:'source-unavailable',source:'devpass-invoices',rows:[],validCount:null,receivedCount:null,newest:null,fetchedAt:Date.now()};
    try { return normalizeDevPassBillingHistoryLocal(JSON.parse(text)); }
    catch { return {state:'source-unavailable',source:'devpass-invoices',rows:[],validCount:null,receivedCount:null,newest:null,fetchedAt:Date.now()}; }
  }

  async function refreshDevPassBillingHistory(force = false) {
    const now = Date.now();
    if (!force && devpassBillingHistoryRuntime.value && now - Number(devpassBillingHistoryRuntime.fetchedAt || 0) < DEVPASS_BILLING_HISTORY_UI_TTL_MS) {
      return devpassBillingHistoryRuntime.value;
    }
    if (devpassBillingHistoryInFlight) return devpassBillingHistoryInFlight;
    const requestSeq = ++devpassBillingHistoryRequestSeq;
    const promise = (async () => {
      const value = await fetchDevPassBillingHistory();
      if (requestSeq !== devpassBillingHistoryRequestSeq) return null;
      devpassBillingHistoryRuntime = {
        value,
        fetchedAt:typeof value?.fetchedAt === 'number' && Number.isFinite(value.fetchedAt) ? Number(value.fetchedAt) : Date.now(),
      };
      schedulePanelRender(false);
      return value;
    })().catch(() => {
      if (requestSeq !== devpassBillingHistoryRequestSeq) return null;
      const value = {state:'source-unavailable',source:'devpass-invoices',rows:[],validCount:null,receivedCount:null,newest:null,fetchedAt:Date.now()};
      devpassBillingHistoryRuntime = {value,fetchedAt:value.fetchedAt};
      schedulePanelRender(false);
      return value;
    }).finally(() => {
      if (devpassBillingHistoryInFlight === promise) devpassBillingHistoryInFlight = null;
    });
    devpassBillingHistoryInFlight = promise;
    return promise;
  }

'''
    insert_before(BRIDGE_IO, '  function normalizeApiKeyPlanLimitsLocal(raw) {\n', block, 'billing-history Product bridge')


def patch_dashboard() -> None:
    helper = r'''
  function devPassBillingHistoryTypeLabel(type) {
    const labels = {
      dev_plan_start:'DevPass 시작',dev_plan_renewal:'DevPass 갱신',dev_plan_upgrade:'DevPass 업그레이드',dev_plan_downgrade:'DevPass 다운그레이드',
      dev_plan_cancel:'DevPass 취소',dev_plan_resume:'DevPass 재개',dev_plan_end:'DevPass 종료',dev_plan_reset_pass:'Reset Pass',
      dev_plan_reset_pass_reward:'Reset Pass 보상',dev_plan_reset_pass_gift:'Reset Pass 지급',credit_topup:'PAYG 충전',credit_refund:'환불',
      credit_gift:'크레딧 지급',credit_manual_payment:'크레딧 추가'
    };
    return Object.prototype.hasOwnProperty.call(labels, String(type || '')) ? labels[String(type)] : '기타';
  }

  function devPassBillingHistoryStatusLabel(status) {
    return status === 'completed' ? '완료' : status === 'pending' ? '대기' : status === 'failed' ? '실패' : '—';
  }

  function devPassBillingHistoryDateText(date) {
    const ms = Date.parse(String(date || ''));
    if (!Number.isFinite(ms)) return '—';
    try {
      return new Intl.DateTimeFormat('ko-KR',{timeZone:KST_TIME_ZONE,month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(ms));
    } catch { return '—'; }
  }

  function devPassBillingHistoryAmountText(row) {
    if (row?.amount === null || typeof row?.amount !== 'number' || !Number.isFinite(row.amount)) return '—';
    const currency = typeof row?.currency === 'string' ? row.currency.trim() : '';
    if (!currency) return '—';
    const value = Number(row.amount).toFixed(2);
    return currency.toUpperCase() === 'USD' ? `$${value}` : `${value} ${currency}`;
  }

  function devPassBillingHistorySectionHtml(truth) {
    const stateName = ['ok','empty','source-unavailable','permission-unavailable','invalid-history','partial'].includes(String(truth?.state))
      ? String(truth.state)
      : 'source-unavailable';
    const rows = ['ok','partial'].includes(stateName) && Array.isArray(truth?.rows) ? truth.rows.slice(0,5) : [];
    const summary = stateName === 'empty' ? '결제 내역 · 없음' : ['ok','partial'].includes(stateName) ? `결제 내역 · 최근 5건 · ${rows.length}개` : '결제 내역 · —';
    const rowHtml = rows.map((row) => `<div class="mini"><span>${esc(devPassBillingHistoryDateText(row?.date))} · ${esc(devPassBillingHistoryTypeLabel(row?.type))}</span><b>${esc(devPassBillingHistoryAmountText(row))} · ${esc(devPassBillingHistoryStatusLabel(row?.status))}</b></div>`).join('');
    const body = rows.length ? `<div class="minis">${rowHtml}</div>` : stateName === 'empty' ? '<p>최근 결제 내역 없음</p>' : '<p>소스 확인 불가 · —</p>';
    return `<details class="usage-detail-box devpass-billing-history-card"><summary><b>결제 내역 · DevPass</b> · ${esc(summary.replace('결제 내역 · ',''))}</summary>${body}</details>`;
  }

'''
    insert_before(DASH, '  function apiKeyOrgLimitSectionHtml(truth) {\n', helper, 'billing-history UI helper')
    rep(
        DASH,
        '    const apiKeyOrgLimitTruth = apiKeyPlanLimitsRuntime.value;\n',
        '    const apiKeyOrgLimitTruth = apiKeyPlanLimitsRuntime.value;\n    const devPassBillingHistoryTruth = devpassBillingHistoryRuntime.value;\n',
        'billing-history UI truth binding',
    )
    rep(
        MARKUP,
        "${dashboardView === 'devpass' ? devpassAccountDetailHtml : ''}${dashboardView === 'devpass' ? apiKeyOrgLimitSectionHtml(apiKeyOrgLimitTruth) : ''}${scopeUsageDetailsHtml(scopeActivity)}",
        "${dashboardView === 'devpass' ? devpassAccountDetailHtml : ''}${dashboardView === 'devpass' ? apiKeyOrgLimitSectionHtml(apiKeyOrgLimitTruth) : ''}${dashboardView === 'devpass' ? devPassBillingHistorySectionHtml(devPassBillingHistoryTruth) : ''}${scopeUsageDetailsHtml(scopeActivity)}",
        'billing-history DevPass placement',
    )


def patch_settings() -> None:
    rep(
        SETTINGS,
        "        if (next === 'devpass') void refreshApiKeyPlanLimits();\n",
        "        if (next === 'devpass') void refreshDevPassBillingHistory();\n        if (next === 'devpass') void refreshApiKeyPlanLimits();\n",
        'billing-history lazy DevPass trigger',
    )


def patch_diagnostics() -> None:
    helper = r'''
  function devPassBillingHistoryDiagnosticText(value) {
    const stateName = ['ok','empty','source-unavailable','permission-unavailable','invalid-history','partial'].includes(String(value?.state))
      ? String(value.state)
      : 'source-unavailable';
    const validCount = Number.isInteger(value?.validCount) && value.validCount >= 0 ? Number(value.validCount) : null;
    const receivedCount = Number.isInteger(value?.receivedCount) && value.receivedCount >= 0 ? Number(value.receivedCount) : null;
    const newest = typeof value?.newest === 'string' && Number.isFinite(Date.parse(value.newest)) ? value.newest : '—';
    return `DevPass billing history: rows ${validCount === null ? '—' : validCount}/${receivedCount === null ? '—' : receivedCount} · newest ${newest} · source devpass-invoices · state ${stateName}`;
  }

'''
    insert_before(DIAG, '  function apiKeyOrgLimitDiagnosticText(value) {\n', helper, 'billing-history diagnostics helper')
    rep(
        DIAG,
        '      apiKeyOrgLimitDiagnosticText(apiKeyPlanLimitsRuntime.value),\n',
        '      devPassBillingHistoryDiagnosticText(devpassBillingHistoryRuntime.value),\n      apiKeyOrgLimitDiagnosticText(apiKeyPlanLimitsRuntime.value),\n',
        'billing-history diagnostics line',
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
        raise SystemExit('5.109 target Product mismatch')
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if bridge.get('requiredVersion') != TARGET_ENGINE or bridge.get('sha256') != engine_sha:
        raise SystemExit('5.109 target Engine manifest mismatch')
    if manager.get('version') != MANAGER_VER or manager.get('productVersion') != TARGET_PRODUCT or manager.get('sha256') != manager_sha:
        raise SystemExit('5.109 target Manager manifest mismatch')
    if manager.get('managedCliVersion') != '1.10.0' or manager.get('managedModelCatalogVersion') != '1.280.0':
        raise SystemExit('5.109 managed dependency drift')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.109 contracts drift')
    if sha(BOOT) != BOOT_SHA:
        raise SystemExit('5.109 bootstrap drift')
    capture = CAPTURE.read_text()
    sources = SOURCES.read_text()
    http = HTTP.read_text()
    product = CORE.read_text() + BRIDGE_IO.read_text() + DASH.read_text() + MARKUP.read_text() + SETTINGS.read_text() + DIAG.read_text()
    for marker in (
        'DEVPASS_BRIDGE_BILLING_HISTORY',
        "target.pathname = (prefix + '/dev-plans/invoices').replace",
        'sanitizeDevPassBillingHistory',
        'normalizeDevPassBillingHistoryCapture',
        "cached('devpassBillingHistory'",
        "name === 'devpassBillingHistory' ? 300_000",
        "url.pathname === '/devpass-billing-history'",
        '결제 내역 · DevPass',
        '결제 내역 · 최근 5건',
        'DevPass billing history:',
        "if (next === 'devpass') void refreshDevPassBillingHistory();",
    ):
        if marker not in capture + sources + http + product:
            raise SystemExit(f'5.109 target marker missing:{marker}')
    for forbidden in (
        '/devpass-billing-history?projectId=',
        '/devpass-billing-history?organizationId=',
        'invoicePdf',
    ):
        if forbidden in product:
            raise SystemExit(f'5.109 Product boundary leak:{forbidden}')
    if 'refreshDevPassBillingHistory' in REFRESH.read_text() or '/devpass-billing-history' in REFRESH.read_text():
        raise SystemExit('5.109 billing history leaked into recurring refresh runtime')

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

    rep(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.108';", "const PRODUCT_VERSION = '3.0.0-alpha.5.109';", 'Manager Product')
    rep(MANAGER, "const BUNDLED_ENGINE_VERSION = '1.6.42';", "const BUNDLED_ENGINE_VERSION = '1.6.43';", 'Manager Engine')
    manager_text = MANAGER.read_text()
    manager_text, count = re.subn(
        r"const BUNDLED_ENGINE_SHA256 = '[0-9a-f]{64}';",
        f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';",
        manager_text,
        count=1,
    )
    if count != 1:
        raise SystemExit('5.109 Manager hash anchor mismatch')
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
