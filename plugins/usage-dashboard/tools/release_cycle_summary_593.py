from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
ENGINE_SRC = ROOT / 'runtime-src' / 'bridge-engine'
TOOLS = ROOT / 'tools'
SPEC = Path('.github/usage-dashboard/releases/5.93.json')

CORE = SRC / '00-runtime-core.part.js'
NORMALIZE = SRC / '16-usage-analytics.part.js'
CYCLE_HELPER = SRC / '17-cycle-summary.part.js'
PARTS = SRC / 'parts.cjs'
DIAGNOSTICS = SRC / '40-diagnostics.part.js'
DASHBOARD = SRC / '50-dashboard-context.part.js'
ENGINE_CORE = ENGINE_SRC / '00-core.part.mjs'
ENGINE_SOURCES = ENGINE_SRC / '40-sources.part.mjs'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
LATEST = ROOT / 'latest.js'
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')
E16_DOC = Path('docs/USAGE_DASHBOARD_E16_DERIVED_MERGE_AUTHORITY_CAPSULE_DESIGN.md')
E16_RENDERER = TOOLS / 'render_e16_status_doc.cjs'

BASE_VERSION = '3.0.0-alpha.5.92'
TARGET_VERSION = '3.0.0-alpha.5.93'
BASE_ENGINE = '1.6.29'
TARGET_ENGINE = '1.6.30'
TARGET_MANAGER = '1.3.4'
TARGET_CLI = '1.10.0'
TARGET_RELEASE_TITLE = 'Truthful DevPass Cycle / Source-Window Summary'
TARGET_RELEASE_MEMORY = f'Current release implementation: `{TARGET_VERSION} — {TARGET_RELEASE_TITLE}`.'
BASE_ENGINE_SHA = '19a74fa0b1ae3ef24008a66e325b170edb4e29d6a84b84e0d4d49ad72293bcd7'
BASE_MANAGER_SHA = '1b368e0c0ed36bb74116855a9a6c8ac4b28c1579f30c065ca33c7f51b9029330'
BASE_BOOTSTRAP_SHA = '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c'
AUTHORITY_TAG_COMMIT = '6b1cda1988f32010a9b090c00eb9b2fe672145fe'


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(*args: str) -> None:
    subprocess.run(list(args), check=True)


def replace_once_or_target(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one source match, found {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def load_spec():
    return json.loads(SPEC.read_text(encoding='utf-8'))


def validate_authority(spec) -> None:
    expected = {
        'schemaVersion': 1,
        'package': '@llmgateway/cli',
        'version': TARGET_CLI,
        'upstreamRepository': 'theopenco/llmgateway-templates',
        'tagNamespace': '@llmgateway/cli@',
        'tag': f'@llmgateway/cli@{TARGET_CLI}',
        'tagCommit': AUTHORITY_TAG_COMMIT,
        'parentProjectRepository': 'theopenco/llmgateway',
        'parentProjectReleaseIsPackageAuthority': False,
    }
    value = spec.get('managedCliAuthority')
    if not isinstance(value, dict):
        raise SystemExit('5.93 managed CLI authority missing')
    for key, expected_value in expected.items():
        if value.get(key) != expected_value:
            raise SystemExit(f'5.93 managed CLI authority {key} mismatch: {value.get(key)!r}')


def load_release_notes():
    spec = load_spec()
    validate_authority(spec)
    expected = {
        'productVersion': TARGET_VERSION,
        'engineVersion': TARGET_ENGINE,
        'managerVersion': TARGET_MANAGER,
        'managedCliVersion': TARGET_CLI,
        'materializer': 'plugins/usage-dashboard/tools/release_cycle_summary_593.py',
    }
    for key, value in expected.items():
        if spec.get(key) != value:
            raise SystemExit(f'5.93 release spec {key} mismatch')
    if spec.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.93 release spec contracts changed from 1/1')
    if spec.get('releaseTitle') != TARGET_RELEASE_TITLE:
        raise SystemExit('5.93 release title mismatch')
    highlights = spec.get('highlights')
    hints = spec.get('diagnosticHints')
    for key, value in [('highlights', highlights), ('diagnosticHints', hints)]:
        if not isinstance(value, list) or not 1 <= len(value) <= 5:
            raise SystemExit(f'5.93 {key} must contain 1..5 items')
        if any(not isinstance(item, str) or not item.strip() or len(item) > 180 for item in value):
            raise SystemExit(f'5.93 {key} items must be non-empty bounded strings')
    return spec['releaseTitle'], [x.strip() for x in highlights], [x.strip() for x in hints]


def js_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def release_notes_constant(title, highlights, hints) -> str:
    h = ',\n    '.join(js_string(item) for item in highlights)
    d = ',\n    '.join(js_string(item) for item in hints)
    return (
        "  const RELEASE_NOTES = Object.freeze({\n"
        f"    title: {js_string(title)},\n"
        "    highlights: Object.freeze([\n"
        f"    {h}\n"
        "    ]),\n"
        "    diagnosticHints: Object.freeze([\n"
        f"    {d}\n"
        "    ]),\n"
        "  });\n"
    )


def validate_baseline() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    product = manifest.get('productVersion')
    if product == TARGET_VERSION:
        return
    if product != BASE_VERSION:
        raise SystemExit(f'5.93 baseline Product mismatch: {product}')
    if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != BASE_ENGINE:
        raise SystemExit('5.93 baseline Engine version mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
        raise SystemExit('5.93 baseline Manager semantic version mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.93 baseline contracts mismatch')
    if sha256(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.93 baseline Engine artifact diverged from deployed 5.92')
    if sha256(MANAGER) != BASE_MANAGER_SHA:
        raise SystemExit('5.93 baseline Manager artifact diverged from deployed 5.92')
    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.93 baseline bootstrap diverged from deployed 5.92')
    for marker in [
        "//@version 3.0.0-alpha.5.92",
        "const VERSION = '3.0.0-alpha.5.92';",
        "const REQUIRED_BRIDGE_VERSION = '1.6.29';",
        "const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.4';",
    ]:
        if marker not in CORE.read_text(encoding='utf-8'):
            raise SystemExit(f'5.93 baseline Plugin marker missing: {marker}')
    if "const VERSION = '1.6.29';" not in ENGINE_CORE.read_text(encoding='utf-8'):
        raise SystemExit('5.93 baseline Engine source version mismatch')
    manager = MANAGER.read_text(encoding='utf-8')
    for marker in [
        "const MANAGER_VERSION = '1.3.4';",
        "const PRODUCT_VERSION = '3.0.0-alpha.5.92';",
        "const BUNDLED_ENGINE_VERSION = '1.6.29';",
        f"const BUNDLED_ENGINE_SHA256 = '{BASE_ENGINE_SHA}';",
        "const MANAGED_CLI_VERSION = '1.10.0';",
    ]:
        if marker not in manager:
            raise SystemExit(f'5.93 baseline Manager marker missing: {marker}')
    for marker in ['premiumAllowanceTruth(d.weekly)', 'paygAccountTruth(devpassAccount)', 'billing-cycle-truth-strip']:
        if marker not in DASHBOARD.read_text(encoding='utf-8'):
            raise SystemExit(f'5.93 baseline dashboard invariant missing: {marker}')


def apply_identity_and_release_notes(title, highlights, hints) -> None:
    replace_once_or_target(CORE, '//@version 3.0.0-alpha.5.92', '//@version 3.0.0-alpha.5.93', '5.93 plugin header version')
    replace_once_or_target(CORE, "  const VERSION = '3.0.0-alpha.5.92';", "  const VERSION = '3.0.0-alpha.5.93';", '5.93 plugin runtime version')
    replace_once_or_target(CORE, "  const REQUIRED_BRIDGE_VERSION = '1.6.29';", "  const REQUIRED_BRIDGE_VERSION = '1.6.30';", '5.93 Plugin Engine requirement')
    text = CORE.read_text(encoding='utf-8')
    notes = release_notes_constant(title, highlights, hints)
    start = text.find('  const RELEASE_NOTES = Object.freeze({')
    end = text.find('  const UPDATE_URL =', start)
    if start < 0 or end <= start:
        raise SystemExit('5.93 static release notes boundary missing')
    if text[start:end] != notes:
        CORE.write_text(text[:start] + notes + text[end:], encoding='utf-8')


def apply_engine_daily_truth() -> None:
    replace_once_or_target(ENGINE_CORE, "const VERSION = '1.6.29';", "const VERSION = '1.6.30';", '5.93 Engine version')
    text = ENGINE_SOURCES.read_text(encoding='utf-8')
    official = """function officialActivityRows(root) {
  if (Array.isArray(root?.activity)) return root.activity;
  if (Array.isArray(root?.data?.activity)) return root.data.activity;
  return [];
}
"""
    helper = official + """
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
"""
    if 'function boundedDailyActivitySeries(raw, range)' not in text:
        if text.count(official) != 1:
            raise SystemExit(f'5.93 Engine daily helper anchor mismatch: {text.count(official)}')
        text = text.replace(official, helper, 1)

    old = """function normalizeUsageActivity(raw, org = null, range = '24h') {
  const providerMap = new Map();
  const modelMap = new Map();
  const recent = [];
  const rows = officialActivityRows(raw);
  let totalRequests = 0;
"""
    new = """function normalizeUsageActivity(raw, org = null, range = '24h') {
  const providerMap = new Map();
  const modelMap = new Map();
  const recent = [];
  const rows = officialActivityRows(raw);
  const dailySeries = boundedDailyActivitySeries(raw, range);
  let totalRequests = 0;
"""
    if new not in text:
        if text.count(old) != 1:
            raise SystemExit(f'5.93 normalizeUsageActivity anchor mismatch: {text.count(old)}')
        text = text.replace(old, new, 1)

    old = """    __bridgeActivity: true,
    scope: range,
    totalRequests,
"""
    new = """    __bridgeActivity: true,
    scope: range,
    ...(dailySeries ? { dailySeries } : {}),
    totalRequests,
"""
    if new not in text:
        if text.count(old) < 1:
            raise SystemExit('5.93 normalized activity return anchor missing')
        text = text.replace(old, new, 1)

    old = """  const recent = [];
  const recentRequests = [];
  let totalRequests = 0;
"""
    new = """  const recent = [];
  const recentRequests = [];
  const dailySeriesCandidates = (items || []).map((item) => item?.dailySeries).filter((series) => series && typeof series === 'object');
  const dailySeries = dailySeriesCandidates.length === 1 ? dailySeriesCandidates[0] : null;
  let totalRequests = 0;
"""
    if new not in text:
        if text.count(old) != 1:
            raise SystemExit(f'5.93 merged activity daily anchor mismatch: {text.count(old)}')
        text = text.replace(old, new, 1)

    merge_start = text.find('function mergeUsageActivities(items, range = \'24h\')')
    if merge_start < 0:
        raise SystemExit('5.93 mergeUsageActivities missing')
    merge_return = text.find("    __bridgeActivity: true,\n    scope: range,\n", merge_start)
    target = "    __bridgeActivity: true,\n    scope: range,\n    ...(dailySeries ? { dailySeries } : {}),\n"
    if target not in text[merge_start:]:
        if merge_return < 0:
            raise SystemExit('5.93 merged activity return anchor missing')
        end = merge_return + len("    __bridgeActivity: true,\n    scope: range,\n")
        text = text[:merge_return] + target + text[end:]

    ENGINE_SOURCES.write_text(text, encoding='utf-8')


CYCLE_HELPER_SOURCE = r'''
  function cycleSummaryExactMetric(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Number(value) : null;
  }

  function cycleSummaryKstDateKey(value) {
    if (value === null || value === undefined || value === '') return '';
    const text = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const timestamp = typeof value === 'number' && Number.isFinite(value) ? value : Date.parse(text);
    if (!Number.isFinite(timestamp)) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone:KST_TIME_ZONE, year:'numeric', month:'2-digit', day:'2-digit'
    }).formatToParts(new Date(timestamp));
    const get = type => parts.find(part => part.type === type)?.value || '';
    const year = get('year'), month = get('month'), day = get('day');
    return year && month && day ? `${year}-${month}-${day}` : '';
  }

  function cycleSummaryIsKstMidnight(timestamp) {
    if (!Number.isFinite(timestamp)) return false;
    const date = new Date(timestamp);
    if (date.getUTCMilliseconds() !== 0) return false;
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone:KST_TIME_ZONE, hourCycle:'h23', hour:'2-digit', minute:'2-digit', second:'2-digit'
    }).formatToParts(date);
    const number = type => Number(parts.find(part => part.type === type)?.value);
    return number('hour') === 0 && number('minute') === 0 && number('second') === 0;
  }

  function cycleSummaryDailySeries(window, range) {
    const source = window?.dailySeries;
    if (!source || typeof source !== 'object') return null;
    const granularity = typeof source.granularity === 'string' ? source.granularity.trim().toLowerCase() : '';
    const buckets = Array.isArray(source.buckets) ? source.buckets.map(row => {
      const date = cycleSummaryKstDateKey(row?.date);
      if (!date) return null;
      return {
        date,
        requestCount:cycleSummaryExactMetric(row?.requestCount),
        inputTokens:cycleSummaryExactMetric(row?.inputTokens),
        cachedTokens:cycleSummaryExactMetric(row?.cachedTokens),
        totalTokens:cycleSummaryExactMetric(row?.totalTokens),
      };
    }).filter(Boolean).sort((a,b) => a.date.localeCompare(b.date)) : [];
    const uniqueDates = new Set(buckets.map(row => row.date));
    return {
      range:String(source.range || range || ''),
      granularity,
      buckets,
      valid:granularity === 'daily' && buckets.length > 0 && uniqueDates.size === buckets.length,
    };
  }

  function cycleSummaryMetrics(buckets) {
    const rows = Array.isArray(buckets) ? buckets : [];
    const complete = key => rows.length > 0 && rows.every(row => cycleSummaryExactMetric(row?.[key]) !== null);
    const sum = key => complete(key) ? rows.reduce((total,row) => total + Number(row[key]), 0) : null;
    const requests = sum('requestCount');
    const totalTokens = sum('totalTokens');
    const inputTokens = sum('inputTokens');
    const cachedTokens = sum('cachedTokens');
    const cachedInputShare = inputTokens !== null && cachedTokens !== null && inputTokens > 0
      ? cachedTokens / inputTokens * 100
      : null;
    let peakDay = null;
    if (requests !== null && requests > 0) {
      let best = null;
      for (const row of rows) {
        const count = cycleSummaryExactMetric(row.requestCount);
        if (count === null) { best = null; break; }
        if (!best || count > best.count || (count === best.count && row.date < best.date)) best = {date:row.date,count};
      }
      peakDay = best?.date || null;
    }
    return {requests,totalTokens,cachedInputShare,peakDay};
  }

  function devpassCycleSummaryTruth(account, analytics, now = Date.now()) {
    const windows = analytics?.windows && typeof analytics.windows === 'object' ? analytics.windows : {};
    const raw30 = windows['30d'] || null;
    const raw7 = windows['7d'] || null;
    const series30 = cycleSummaryDailySeries(raw30, '30d');
    const series7 = cycleSummaryDailySeries(raw7, '7d');
    const start = account?.billingCycleStart ? Date.parse(String(account.billingCycleStart)) : NaN;
    const end = account?.expiresAt ? Date.parse(String(account.expiresAt)) : NaN;
    const current = Number(now);
    let exactReason = 'ok';
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) exactReason = 'boundary-missing';
    else if (!Number.isFinite(current) || current < start || current >= end) exactReason = 'period-ended';
    else if (!cycleSummaryIsKstMidnight(start)) exactReason = 'boundary-not-kst-day';
    else if (series30 && series30.granularity && series30.granularity !== 'daily') exactReason = 'granularity-not-daily';
    else if (!series30?.valid) exactReason = 'coverage-insufficient';
    else {
      const startKey = cycleSummaryKstDateKey(start);
      if (!startKey || !series30.buckets.some(row => row.date === startKey)) exactReason = 'coverage-insufficient';
    }

    let mode = 'window-unavailable';
    let title = '사용량 요약';
    let reason = 'window-unavailable';
    let selected = [];
    if (exactReason === 'ok' && series30?.valid) {
      const startKey = cycleSummaryKstDateKey(start);
      const nowKey = cycleSummaryKstDateKey(current);
      selected = series30.buckets.filter(row => row.date >= startKey && (!nowKey || row.date <= nowKey));
      mode = 'billing-cycle-exact';
      title = '이번 사이클';
      reason = 'ok';
    } else if (series30?.valid) {
      selected = series30.buckets;
      mode = 'window-30d';
      title = '최근 30일';
      reason = exactReason;
    } else if (series7?.valid) {
      selected = series7.buckets;
      mode = 'window-7d';
      title = '최근 7일';
      reason = exactReason === 'granularity-not-daily' ? 'granularity-not-daily' : 'coverage-insufficient';
    }

    const metrics = cycleSummaryMetrics(selected);
    if (mode === 'billing-cycle-exact' && reason === 'ok' && [metrics.requests,metrics.totalTokens,metrics.cachedInputShare].some(value => value === null)) {
      reason = 'metric-incomplete';
    }
    return Object.freeze({mode,title,reason,...metrics});
  }

  function devpassCycleSummaryDiagnosticText(truth) {
    const value = truth && typeof truth === 'object' ? truth : devpassCycleSummaryTruth(null, null);
    const scalar = input => input === null || input === undefined ? '—' : String(input);
    const cached = value.cachedInputShare === null ? '—' : `${Number(value.cachedInputShare).toFixed(1)}%`;
    return `DevPass cycle summary: mode ${value.mode} · reason ${value.reason} · requests ${scalar(value.requests)} · tokens ${scalar(value.totalTokens)} · cached-input ${cached} · peak ${scalar(value.peakDay)}`;
  }
'''


def write_cycle_helper() -> None:
    if CYCLE_HELPER.exists() and CYCLE_HELPER.read_text(encoding='utf-8') == CYCLE_HELPER_SOURCE:
        return
    CYCLE_HELPER.write_text(CYCLE_HELPER_SOURCE, encoding='utf-8')
    text = PARTS.read_text(encoding='utf-8')
    target = "  {file:'17-cycle-summary.part.js', marker:'\\n  function cycleSummaryExactMetric(value) {', label:'DevPass cycle/source-window truth'},\n"
    if target not in text:
        anchor = "  {file:'16-usage-analytics.part.js', marker:'\\n  function normalizeRequestProvenanceMetadata(raw) {', label:'usage + analytics normalization'},\n"
        if text.count(anchor) != 1:
            raise SystemExit('5.93 parts registry anchor mismatch')
        text = text.replace(anchor, anchor + target, 1)
        PARTS.write_text(text, encoding='utf-8')


def apply_plugin_daily_normalization() -> None:
    text = NORMALIZE.read_text(encoding='utf-8')
    helper = r'''
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

'''
    anchor = '  function normalizeScopeActivity(raw) {'
    if 'function normalizeDailyScalarSeries(value)' not in text:
        if text.count(anchor) != 1:
            raise SystemExit('5.93 Plugin daily normalizer anchor mismatch')
        text = text.replace(anchor, helper + anchor, 1)
    old = "requestProvenance:normalizeRequestProvenanceMetadata(raw?.requestProvenance),fetchedAt:raw.fetchedAt || Date.now(),source:String(raw.source || 'LLMGateway scoped usage')};"
    new = "requestProvenance:normalizeRequestProvenanceMetadata(raw?.requestProvenance),dailySeries:normalizeDailyScalarSeries(raw.dailySeries),fetchedAt:raw.fetchedAt || Date.now(),source:String(raw.source || 'LLMGateway scoped usage')};"
    if new not in text:
        if text.count(old) != 1:
            raise SystemExit(f'5.93 Plugin scoped activity return anchor mismatch: {text.count(old)}')
        text = text.replace(old, new, 1)
    NORMALIZE.write_text(text, encoding='utf-8')


def apply_dashboard() -> None:
    text = DASHBOARD.read_text(encoding='utf-8')
    binding = "    const cycleSummary = devpassCycleSummaryTruth(devpassAccount, d.analyticsScopes?.scopes?.devpass);\n"
    if binding not in text:
        anchor = "    const paygTruth = paygAccountTruth(devpassAccount);\n"
        if text.count(anchor) != 1:
            raise SystemExit('5.93 cycle summary dashboard binding anchor mismatch')
        text = text.replace(anchor, anchor + binding, 1)

    old = '''          <div class="usage-detail-box billing-cycle-truth-strip"><div class="recent-head"><h3>Billing Cycle</h3><span>source truth</span></div><div class="minis">
            <div class="mini"><span>Plan</span><b>${esc(billingPlanText)}</b></div>
            <div class="mini"><span>Cycle</span><b>${esc(billingCycleText)}</b></div>
            <div class="mini"><span>기간 시작</span><b>${esc(billingStartText)}</b></div>
            <div class="mini"><span>기간 종료</span><b>${esc(billingEndText)}</b></div>
            <div class="mini"><span>남은 기간</span><b>${esc(billingRemainingText)}</b></div>
            <div class="mini"><span>취소 상태</span><b>${esc(billingCancelledText)}</b></div>
          </div></div>
'''
    new = old + '''          <div class="usage-detail-box devpass-cycle-summary"><div class="recent-head"><h3>${esc(cycleSummary.title)}</h3><span>${esc(cycleSummary.mode)}</span></div><div class="minis">
            <div class="mini accent"><span>요청</span><b>${cycleSummary.requests === null ? '—' : Number(cycleSummary.requests).toLocaleString()}</b></div>
            <div class="mini"><span>토큰</span><b>${cycleSummary.totalTokens === null ? '—' : Number(cycleSummary.totalTokens).toLocaleString()}</b></div>
            <div class="mini purple"><span>Cached input share</span><b>${cycleSummary.cachedInputShare === null ? '—' : `${Number(cycleSummary.cachedInputShare).toFixed(1)}%`}</b></div>
            <div class="mini"><span>Peak day</span><b>${esc(cycleSummary.peakDay || '—')}</b></div>
          </div></div>
'''
    if new not in text:
        if text.count(old) != 1:
            raise SystemExit(f'5.93 Billing Cycle card anchor mismatch: {text.count(old)}')
        text = text.replace(old, new, 1)
    DASHBOARD.write_text(text, encoding='utf-8')


def apply_diagnostics() -> None:
    text = DIAGNOSTICS.read_text(encoding='utf-8')
    line = '      devpassCycleSummaryDiagnosticText(devpassCycleSummaryTruth(diagAccount, d.analyticsScopes?.scopes?.devpass)),\n'
    if line not in text:
        anchor = '      paygAccountDiagnosticText(diagAccount),\n'
        if text.count(anchor) != 1:
            raise SystemExit('5.93 cycle diagnostics anchor mismatch')
        text = text.replace(anchor, anchor + line, 1)
    DIAGNOSTICS.write_text(text, encoding='utf-8')


def apply_e16_documentation_status() -> None:
    if not E16_RENDERER.exists():
        raise SystemExit('5.93 E16 renderer missing')
    result = subprocess.run(
        ['node', '-e', "process.stdout.write(require('./plugins/usage-dashboard/tools/render_e16_status_doc.cjs').renderStatusBlock())"],
        check=True, capture_output=True, text=True,
    )
    block = result.stdout
    text = E16_DOC.read_text(encoding='utf-8').replace('\r', '')
    text = text.replace(
        'Status: **IMPLEMENTED — LIVE PRODUCT PROOF PENDING**',
        'Status: **IMPLEMENTED — LIVE BASELINE PROVEN / GENERATED STATUS ENFORCED**',
    )
    begin = '<!-- E16_GENERATED_STATUS:BEGIN -->'
    end = '<!-- E16_GENERATED_STATUS:END -->'
    if begin in text or end in text:
        if text.count(begin) != 1 or text.count(end) != 1 or text.index(end) < text.index(begin):
            raise SystemExit('5.93 E16 generated status markers invalid')
        stop = text.index(end) + len(end)
        text = text[:text.index(begin)] + block + text[stop:]
    else:
        anchor = 'Scope: `plugins/usage-dashboard/` release-control only.\n'
        if text.count(anchor) != 1:
            raise SystemExit('5.93 E16 doc insertion anchor mismatch')
        text = text.replace(anchor, anchor + '\n' + block + '\n', 1)
    E16_DOC.write_text(text, encoding='utf-8')


def patch_manager(engine_sha: str) -> None:
    text = MANAGER.read_text(encoding='utf-8')
    replacements = [
        ("const PRODUCT_VERSION = '3.0.0-alpha.5.92';", "const PRODUCT_VERSION = '3.0.0-alpha.5.93';", 'Product'),
        ("const BUNDLED_ENGINE_VERSION = '1.6.29';", "const BUNDLED_ENGINE_VERSION = '1.6.30';", 'Engine version'),
        (f"const BUNDLED_ENGINE_SHA256 = '{BASE_ENGINE_SHA}';", f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';", 'Engine SHA'),
    ]
    for old, new, label in replacements:
        if new not in text:
            if text.count(old) != 1:
                raise SystemExit(f'5.93 Manager {label} marker mismatch: {text.count(old)}')
            text = text.replace(old, new, 1)
    for marker in ["const MANAGER_VERSION = '1.3.4';", "const MANAGED_CLI_VERSION = '1.10.0';"]:
        if marker not in text:
            raise SystemExit(f'5.93 Manager invariant changed: {marker}')
    MANAGER.write_text(text, encoding='utf-8')


def sync_release_memory() -> None:
    text = GUIDELINES.read_text(encoding='utf-8')
    current_re = re.compile(r'Current release implementation: `[^`]+`\.', re.M)
    if TARGET_RELEASE_MEMORY not in text:
        text, count = current_re.subn(TARGET_RELEASE_MEMORY, text, count=1)
        if count != 1:
            raise SystemExit('5.93 current release memory marker missing')
    release_spec = load_spec()
    verified_baseline = str(release_spec.get('verifiedBaseline') or '').strip()
    if not verified_baseline.startswith('Last verified real-device baseline: `') or not verified_baseline.endswith('`'):
        raise SystemExit('5.93 verified baseline missing or malformed')
    baseline_re = re.compile(r'^Last verified real-device baseline: `[^`]+`\.?$', re.M)
    target_baseline = verified_baseline + '.'
    if target_baseline not in text:
        text, count = baseline_re.subn(target_baseline, text, count=1)
        if count != 1:
            raise SystemExit(f'5.93 verified baseline marker mismatch: {count}')
    GUIDELINES.write_text(text, encoding='utf-8')


def sync_manifest_hashes(engine_sha: str) -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['productVersion'] = TARGET_VERSION
    manifest['components']['plugin']['version'] = TARGET_VERSION
    manifest['components']['bridge']['requiredVersion'] = TARGET_ENGINE
    manifest['components']['bridge']['sha256'] = engine_sha
    manifest['components']['bridgeManager']['version'] = TARGET_MANAGER
    manifest['components']['bridgeManager']['productVersion'] = TARGET_VERSION
    manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
    manifest['components']['bridgeManager']['bootstrapSha256'] = sha256(BOOTSTRAP)
    manifest['contracts'] = {'snapshot': 1, 'recentRequest': 1}
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def validate_target() -> None:
    core = CORE.read_text(encoding='utf-8')
    engine_core = ENGINE_CORE.read_text(encoding='utf-8')
    engine_sources = ENGINE_SOURCES.read_text(encoding='utf-8')
    normalize = NORMALIZE.read_text(encoding='utf-8')
    helper = CYCLE_HELPER.read_text(encoding='utf-8')
    dashboard = DASHBOARD.read_text(encoding='utf-8')
    diagnostics = DIAGNOSTICS.read_text(encoding='utf-8')
    manager = MANAGER.read_text(encoding='utf-8')
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    engine_sha = sha256(ENGINE)
    if sha256(BOOTSTRAP) != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.93 bootstrap exact-byte preservation failed')
    for marker in [
        "//@version 3.0.0-alpha.5.93",
        "const VERSION = '3.0.0-alpha.5.93';",
        "const REQUIRED_BRIDGE_VERSION = '1.6.30';",
        "const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.4';",
    ]:
        if marker not in core:
            raise SystemExit(f'5.93 Plugin target marker missing: {marker}')
    if "const VERSION = '1.6.30';" not in engine_core:
        raise SystemExit('5.93 Engine source version mismatch')
    for marker in ['function explicitDailyActivityMetric(value)', 'function boundedDailyActivitySeries(raw, range)', 'dailySeries = boundedDailyActivitySeries(raw, range)']:
        if marker not in engine_sources:
            raise SystemExit(f'5.93 Engine daily marker missing: {marker}')
    for marker in ['function normalizeDailyScalarSeries(value)', 'dailySeries:normalizeDailyScalarSeries(raw.dailySeries)']:
        if marker not in normalize:
            raise SystemExit(f'5.93 Plugin daily marker missing: {marker}')
    for marker in ['function devpassCycleSummaryTruth(account, analytics, now = Date.now())', 'function devpassCycleSummaryDiagnosticText(truth)']:
        if marker not in helper:
            raise SystemExit(f'5.93 cycle helper marker missing: {marker}')
    for marker in ['devpass-cycle-summary', 'Cached input share', 'Peak day', 'billing-cycle-truth-strip', 'premium-allowance-card', 'paygAccountTruth(devpassAccount)']:
        if marker not in dashboard:
            raise SystemExit(f'5.93 dashboard target marker missing: {marker}')
    if 'devpassCycleSummaryDiagnosticText(devpassCycleSummaryTruth(diagAccount, d.analyticsScopes?.scopes?.devpass))' not in diagnostics:
        raise SystemExit('5.93 cycle diagnostics line missing')
    for marker in [
        "const MANAGER_VERSION = '1.3.4';",
        "const PRODUCT_VERSION = '3.0.0-alpha.5.93';",
        "const BUNDLED_ENGINE_VERSION = '1.6.30';",
        f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';",
        "const MANAGED_CLI_VERSION = '1.10.0';",
    ]:
        if marker not in manager:
            raise SystemExit(f'5.93 Manager target marker missing: {marker}')
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.93 manifest Product mismatch')
    if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.93 manifest Engine version mismatch')
    if manifest.get('components', {}).get('bridge', {}).get('sha256') != engine_sha:
        raise SystemExit('5.93 manifest Engine hash mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('version') != TARGET_MANAGER:
        raise SystemExit('5.93 manifest Manager semantic mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.93 manifest Manager Product mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('sha256') != sha256(MANAGER):
        raise SystemExit('5.93 manifest Manager hash mismatch')
    if manifest.get('components', {}).get('bridgeManager', {}).get('bootstrapSha256') != BASE_BOOTSTRAP_SHA:
        raise SystemExit('5.93 manifest bootstrap hash mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.93 contracts changed')
    e16_doc = E16_DOC.read_text(encoding='utf-8')
    if 'Status: **IMPLEMENTED — LIVE BASELINE PROVEN / GENERATED STATUS ENFORCED**' not in e16_doc:
        raise SystemExit('5.93 E16 stable status not updated')
    if '<!-- E16_GENERATED_STATUS:BEGIN -->' not in e16_doc or 'implementation: `live-baseline-proven`' not in e16_doc:
        raise SystemExit('5.93 E16 generated status missing')


spec = load_spec()
validate_authority(spec)
title, highlights, hints = load_release_notes()
validate_baseline()
old_plugin_bytes = LATEST.stat().st_size
old_engine_bytes = ENGINE.stat().st_size
old_manager_bytes = MANAGER.stat().st_size

apply_identity_and_release_notes(title, highlights, hints)
apply_engine_daily_truth()
write_cycle_helper()
apply_plugin_daily_normalization()
apply_dashboard()
apply_diagnostics()
apply_e16_documentation_status()
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--write')
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--check')
engine_sha = sha256(ENGINE)
if engine_sha == BASE_ENGINE_SHA:
    raise SystemExit('5.93 Engine semantic release unexpectedly retained 5.92 artifact SHA')
patch_manager(engine_sha)
sync_release_memory()
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
sync_manifest_hashes(engine_sha)
run('node', '--check', str(LATEST))
run('node', '--check', str(MANAGER))
run('node', '--check', str(ENGINE))
run('node', '--check', str(E16_RENDERER))
validate_target()

print(
    f'5.93 materialized: plugin {old_plugin_bytes}->{LATEST.stat().st_size} bytes; '
    f'Engine {old_engine_bytes}->{ENGINE.stat().st_size} bytes {BASE_ENGINE}->{TARGET_ENGINE} SHA {engine_sha}; '
    f'Manager {old_manager_bytes}->{MANAGER.stat().st_size} bytes semantic {TARGET_MANAGER} Product {BASE_VERSION}->{TARGET_VERSION}; '
    f'managed CLI {TARGET_CLI}; contracts 1/1; bootstrap exact-byte {BASE_BOOTSTRAP_SHA}; E16 generated-doc parity enabled'
)
