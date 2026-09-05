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
RUNTIME = UD / 'runtime'
TOOLS = UD / 'tools'
SPEC = ROOT / '.github' / 'usage-dashboard' / 'releases' / '5.99.json'
CORE = SRC / '00-runtime-core.part.js'
ANALYTICS = SRC / '16-usage-analytics.part.js'
CYCLE = SRC / '17-cycle-summary.part.js'
DIAGNOSTICS = SRC / '40-diagnostics.part.js'
DASHBOARD = SRC / '50-dashboard-context.part.js'
MARKUP = SRC / '54-dashboard-markup.part.js'
WORKSPACE = SRC / '62-diagnostics-workspace.part.js'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
MANIFEST = RUNTIME / 'product-manifest.json'
LATEST = UD / 'latest.js'
GUIDELINES = ROOT / 'docs' / 'USAGE_DASHBOARD_GUIDELINES.md'

BASE_PRODUCT = '3.0.0-alpha.5.98'
TARGET_PRODUCT = '3.0.0-alpha.5.99'
ENGINE_VERSION = '1.6.34'
MANAGER_VERSION = '1.3.6'
CLI_VERSION = '1.10.0'
MODELS_VERSION = '1.280.0'
BASE_ENGINE_SHA = '19386785b8756ac34bc6e88ee9d9471ea219d27a16a6ed4632a11d33a8ac6b58'
BASE_MANAGER_SHA = 'b94a8d12ad645a03101e94b017e9414d68a7cf7e2e14aceec876ccd9fca9e648'
BOOTSTRAP_SHA = '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c'
BASE_RELEASE_SHA = '82c4f900cf548068d1eada957c982a5d78f1347b'
BASE_PHYSICAL_ISSUE = 1055
BASE_PHYSICAL_COMMENT = 5550769913
UPSTREAM_MODELS_COMMIT = 'fbb40efa41c379db5223dff708509b6dd82e05a9'


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(*args: str) -> None:
    subprocess.run(args, cwd=ROOT, check=True)


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    if new in text and old not in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'5.99 {label} anchor mismatch: {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def load_spec() -> dict:
    spec = json.loads(SPEC.read_text(encoding='utf-8'))
    expected = {
        'productVersion': TARGET_PRODUCT,
        'releaseTitle': 'Daily Server Usage Snapshot (Requests + Tokens)',
        'engineVersion': ENGINE_VERSION,
        'managerVersion': MANAGER_VERSION,
        'managedCliVersion': CLI_VERSION,
        'managedModelCatalogVersion': MODELS_VERSION,
        'materializer': 'plugins/usage-dashboard/tools/release_daily_request_count_599.py',
        'newRegression': 'plugins/usage-dashboard/tests/p65-daily-server-request-count-breakdown.cjs',
    }
    for key, value in expected.items():
        if spec.get(key) != value:
            raise SystemExit(f'5.99 release spec mismatch: {key}')
    if spec.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.99 contracts changed')
    cli = spec.get('managedCliAuthority') or {}
    models = spec.get('managedModelCatalogAuthority') or {}
    if cli.get('package') != '@llmgateway/cli' or cli.get('version') != CLI_VERSION or cli.get('exact') is not True:
        raise SystemExit('5.99 exact CLI authority missing')
    if models.get('package') != '@llmgateway/models' or models.get('version') != MODELS_VERSION or models.get('exact') is not True:
        raise SystemExit('5.99 exact Models authority missing')
    if models.get('upstreamRepository') != 'theopenco/llmgateway' or models.get('upstreamCommit') != UPSTREAM_MODELS_COMMIT:
        raise SystemExit('5.99 Models authority mismatch')
    evidence = spec.get('releaseEvidence') or {}
    if set(evidence.keys()) != {'schemaVersion', 'acceptedBaseline', 'latestInstalled'} or evidence.get('schemaVersion') != 1:
        raise SystemExit('5.99 releaseEvidence shape mismatch')
    for role in ('acceptedBaseline', 'latestInstalled'):
        row = evidence.get(role) or {}
        if row.get('productVersion') != BASE_PRODUCT or row.get('releaseSha') != BASE_RELEASE_SHA or row.get('verdict') != 'accepted':
            raise SystemExit(f'5.99 release evidence identity mismatch: {role}')
        if row.get('issue') != BASE_PHYSICAL_ISSUE or row.get('commentId') != BASE_PHYSICAL_COMMENT:
            raise SystemExit(f'5.99 physical evidence mismatch: {role}')
    return spec


def release_notes_block(spec: dict) -> str:
    notes = spec.get('releaseNotes') or {}
    highlights = notes.get('highlights') or []
    hints = notes.get('diagnosticHints') or []
    if not 1 <= len(highlights) <= 5 or not 1 <= len(hints) <= 5:
        raise SystemExit('5.99 release notes must be bounded to 1..5 rows')
    block = '  const RELEASE_NOTES = Object.freeze({\n'
    block += f"    title: {json.dumps(spec['releaseTitle'], ensure_ascii=False)},\n"
    block += '    highlights: Object.freeze([\n'
    block += ''.join(f"    {json.dumps(value, ensure_ascii=False)},\n" for value in highlights)
    block += '    ]),\n    diagnosticHints: Object.freeze([\n'
    block += ''.join(f"    {json.dumps(value, ensure_ascii=False)},\n" for value in hints)
    block += '    ]),\n  });\n'
    return block


def validate_baseline() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    if manifest.get('productVersion') == TARGET_PRODUCT:
        validate_target()
        print(f'MATERIALIZER_IDEMPOTENT:{TARGET_PRODUCT}')
        raise SystemExit(0)
    if manifest.get('productVersion') != BASE_PRODUCT:
        raise SystemExit('5.99 baseline Product mismatch')
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if bridge.get('requiredVersion') != ENGINE_VERSION or bridge.get('sha256') != BASE_ENGINE_SHA or sha256(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.99 baseline Engine authority mismatch')
    if manager.get('version') != MANAGER_VERSION or manager.get('productVersion') != BASE_PRODUCT or manager.get('sha256') != BASE_MANAGER_SHA or sha256(MANAGER) != BASE_MANAGER_SHA:
        raise SystemExit('5.99 baseline Manager authority mismatch')
    if manager.get('managedCliVersion') != CLI_VERSION or manager.get('managedModelCatalogVersion') != MODELS_VERSION:
        raise SystemExit('5.99 baseline managed package pair mismatch')
    if sha256(BOOTSTRAP) != BOOTSTRAP_SHA:
        raise SystemExit('5.99 baseline bootstrap mismatch')
    core = CORE.read_text(encoding='utf-8')
    for marker in ['//@version 3.0.0-alpha.5.98', "const VERSION = '3.0.0-alpha.5.98';", "const REQUIRED_BRIDGE_VERSION = '1.6.34';", "const REQUIRED_BRIDGE_MANAGER_VERSION = '1.3.6';"]:
        if marker not in core:
            raise SystemExit(f'5.99 baseline Plugin marker missing: {marker}')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.99 baseline contracts changed')


def patch_identity_and_notes(spec: dict) -> None:
    replace_once(CORE, '//@version 3.0.0-alpha.5.98', '//@version 3.0.0-alpha.5.99', 'Plugin header version')
    replace_once(CORE, "const VERSION = '3.0.0-alpha.5.98';", "const VERSION = '3.0.0-alpha.5.99';", 'Plugin VERSION')
    text = CORE.read_text(encoding='utf-8')
    start = text.find('  const RELEASE_NOTES = Object.freeze({')
    end = text.find('  const UPDATE_URL =', start)
    if start < 0 or end <= start:
        raise SystemExit('5.99 release notes boundary missing')
    next_block = release_notes_block(spec)
    if text[start:end] != next_block:
        CORE.write_text(text[:start] + next_block + text[end:], encoding='utf-8')


DAILY_SERVER_HELPERS = r'''
  function dailyServerDateKey(value) {
    if (value === null || value === undefined || value === '') return '';
    const text = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const timestamp = typeof value === 'number' && Number.isFinite(value) ? Number(value) : Date.parse(text);
    if (!Number.isFinite(timestamp)) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone:KST_TIME_ZONE, year:'numeric', month:'2-digit', day:'2-digit'
    }).formatToParts(new Date(timestamp));
    const part = type => parts.find(item => item.type === type)?.value || '';
    const year = part('year'), month = part('month'), day = part('day');
    return year && month && day ? `${year}-${month}-${day}` : '';
  }

  function dailyServerScopeApplicability(data, scopeKey) {
    const key = String(scopeKey || '');
    const hasScope = Boolean(data?.analyticsScopes?.scopes?.[key] || data?.usageScopes?.scopes?.[key]);
    if (key === 'devpass') {
      const plan = typeof data?.devpassAccount?.plan === 'string' ? data.devpassAccount.plan.trim().toLowerCase() : '';
      if (hasScope || (plan && plan !== 'none')) return 'applicable';
      if (plan === 'none') return 'not-applicable';
      return 'unknown';
    }
    if (key === 'credits') {
      const selectedId = String(data?.creditsOrganizationId || '').trim();
      const organizations = Array.isArray(data?.organizations) ? data.organizations : [];
      const activeOrganization = organizations.some(org => String(org?.kind || 'default') === 'default' && String(org?.status || 'active') !== 'deleted');
      if (hasScope || selectedId || activeOrganization) return 'applicable';
      return 'unknown';
    }
    return 'unknown';
  }

  function dailyServerMetricTruth(data, scopeKey, dateKey, applicability, metric) {
    if (applicability === 'not-applicable') return Object.freeze({applicability,value:null,window:null,state:'not-applicable'});
    if (applicability !== 'applicable') return Object.freeze({applicability:'unknown',value:null,window:null,state:'applicability-unknown'});
    const analytics = data?.analyticsScopes?.scopes?.[scopeKey] || null;
    const usage24h = data?.usageScopes?.scopes?.[scopeKey] || null;
    let sawSeries = false, sawDaily = false, sawToday = false;
    for (const range of ['24h','7d','30d']) {
      const window = analytics?.windows?.[range] || (range === '24h' ? usage24h : null);
      const series = window?.dailySeries;
      if (!series || typeof series !== 'object') continue;
      sawSeries = true;
      if (String(series.granularity || '').trim().toLowerCase() !== 'daily') continue;
      sawDaily = true;
      const bucket = (Array.isArray(series.buckets) ? series.buckets : []).find(row => dailyServerDateKey(row?.date) === dateKey);
      if (!bucket) continue;
      sawToday = true;
      const value = bucket?.[metric];
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        return Object.freeze({applicability:'applicable',value:Number(value),window:range,state:'ok'});
      }
    }
    const state = !sawSeries ? 'series-unavailable' : !sawDaily ? 'granularity-not-daily' : !sawToday ? 'today-bucket-missing' : 'metric-unknown';
    return Object.freeze({applicability:'applicable',value:null,window:null,state});
  }

  function dailyServerCompose(children) {
    let total = 0, applicableCount = 0;
    for (const child of children) {
      if (child?.applicability === 'not-applicable') continue;
      if (child?.applicability !== 'applicable' || typeof child?.value !== 'number' || !Number.isFinite(child.value) || child.value < 0) return null;
      total += Number(child.value);
      applicableCount += 1;
    }
    return applicableCount > 0 ? total : null;
  }

  function dailyServerUsageTruth(data, now = Date.now()) {
    const dateKey = dailyServerDateKey(now);
    const requestChildren = {}, tokenChildren = {};
    for (const scopeKey of ['devpass','credits']) {
      const applicability = dailyServerScopeApplicability(data, scopeKey);
      requestChildren[scopeKey] = dailyServerMetricTruth(data, scopeKey, dateKey, applicability, 'requestCount');
      tokenChildren[scopeKey] = dailyServerMetricTruth(data, scopeKey, dateKey, applicability, 'totalTokens');
    }
    return Object.freeze({
      dateKey,
      requests:Object.freeze({
        total:dailyServerCompose([requestChildren.devpass, requestChildren.credits]),
        devpass:requestChildren.devpass,
        credits:requestChildren.credits,
      }),
      tokens:Object.freeze({
        total:dailyServerCompose([tokenChildren.devpass, tokenChildren.credits]),
        devpass:tokenChildren.devpass,
        credits:tokenChildren.credits,
      }),
    });
  }

  function dailyServerDiagnosticScopeText(value) {
    if (value?.applicability === 'not-applicable') return '미적용';
    if (typeof value?.value !== 'number' || !Number.isFinite(value.value) || value.value < 0) return `— (${value?.state || 'unknown'})`;
    return `${Number(value.value)}@${value.window || '—'}`;
  }

  function dailyServerUsageDiagnosticText(truth) {
    const value = truth && typeof truth === 'object' ? truth : dailyServerUsageTruth(state?.data || {});
    const scalar = number => typeof number === 'number' && Number.isFinite(number) && number >= 0 ? String(Number(number)) : '—';
    const complete = value.requests?.total !== null && value.tokens?.total !== null;
    return `Usage daily server truth: date ${value.dateKey || '—'} KST · requests total ${scalar(value.requests?.total)} · devpass ${dailyServerDiagnosticScopeText(value.requests?.devpass)} · credits ${dailyServerDiagnosticScopeText(value.requests?.credits)} · tokens total ${scalar(value.tokens?.total)} · devpass ${dailyServerDiagnosticScopeText(value.tokens?.devpass)} · credits ${dailyServerDiagnosticScopeText(value.tokens?.credits)} · source server-daily · state ${complete ? 'ok' : 'partial'}`;
  }
'''


def patch_daily_truth() -> None:
    text = ANALYTICS.read_text(encoding='utf-8')
    marker = '\n\n  function costDriverMeaningfulName(value) {'
    if '  function dailyServerUsageTruth(data, now = Date.now()) {' not in text:
        if text.count(marker) != 1:
            raise SystemExit(f'5.99 module16 insertion boundary mismatch: {text.count(marker)}')
        text = text.replace(marker, '\n' + DAILY_SERVER_HELPERS.rstrip('\n') + marker, 1)
        ANALYTICS.write_text(text, encoding='utf-8')

    replace_once(
        DASHBOARD,
        '    const today = todayOverviewMetrics(d);\n    const observedStamp = state.dailyUsage?.updatedAt || state.creditDailyUsage?.updatedAt || state.lastSyncAt;',
        '    const today = todayOverviewMetrics(d);\n    const dailyServerUsage = dailyServerUsageTruth(d);\n    const observedStamp = state.dailyUsage?.updatedAt || state.creditDailyUsage?.updatedAt || state.lastSyncAt;',
        'dashboard daily truth context',
    )

    replace_once(
        MARKUP,
        '.today-grid .accent b{color:var(--g)}.today-grid .purple b{color:var(--v)}.today-grid .cyan b{color:var(--c)}',
        '.today-grid .accent b{color:var(--g)}.today-grid .purple b{color:var(--v)}.today-grid .cyan b{color:var(--c)}.daily-server-line{display:block;color:var(--m)!important;font-size:9px!important;line-height:1.35;margin-top:4px;white-space:normal;overflow-wrap:anywhere}',
        'daily truth compact style',
    )
    old_card = '          <div class="mini accent"><span>일간 총 사용량 · 관측</span><b>${money(today.observedDailyTotal,4)}</b></div>'
    new_card = '''          <div class="mini accent"><span>일간 총 사용량 · 관측</span><b>${money(today.observedDailyTotal,4)}</b><span class="daily-server-line">오늘 요청 · 서버 집계 ${dailyServerUsage.requests.total === null ? '—' : `${Number(dailyServerUsage.requests.total).toLocaleString()}회`}</span><span class="daily-server-line">DevPass ${dailyServerUsage.requests.devpass.applicability === 'not-applicable' ? '미적용' : dailyServerUsage.requests.devpass.value === null ? '—' : `${Number(dailyServerUsage.requests.devpass.value).toLocaleString()}회`} · Credits ${dailyServerUsage.requests.credits.applicability === 'not-applicable' ? '미적용' : dailyServerUsage.requests.credits.value === null ? '—' : `${Number(dailyServerUsage.requests.credits.value).toLocaleString()}회`}</span><span class="daily-server-line">오늘 토큰 · 서버 집계 ${dailyServerUsage.tokens.total === null ? '—' : Number(dailyServerUsage.tokens.total).toLocaleString()}</span></div>'''
    replace_once(MARKUP, old_card, new_card, 'observed-day card enrichment')

    replace_once(
        DIAGNOSTICS,
        "    const diagCreditsSpend = d.analyticsScopes?.scopes?.credits?.windows?.['24h']?.creditsSpendComposition || d.usageScopes?.scopes?.credits?.creditsSpendComposition || null;\n    return [",
        "    const diagCreditsSpend = d.analyticsScopes?.scopes?.credits?.windows?.['24h']?.creditsSpendComposition || d.usageScopes?.scopes?.credits?.creditsSpendComposition || null;\n    const diagDailyServerUsage = dailyServerUsageTruth(d);\n    return [",
        'full diagnostics daily truth context',
    )
    usage_line = "      `Usage detail: ${diagUsageKey} · providers ${Array.isArray(diagUsage?.providers) ? diagUsage.providers.length : 0} · models ${Array.isArray(diagUsage?.models) ? diagUsage.models.length : 0} · recent requests ${Array.isArray(diagUsage?.recent) ? diagUsage.recent.length : 0} · source rows ${Number(diagUsage?.recentRawCount || 0)} · cache ${usageCacheText(diagUsage)}`,"
    replace_once(DIAGNOSTICS, usage_line, usage_line + '\n      dailyServerUsageDiagnosticText(diagDailyServerUsage),', 'full diagnostics daily truth line')

    replace_once(
        WORKSPACE,
        "    const creditsSpendComposition = d.analyticsScopes?.scopes?.credits?.windows?.['24h']?.creditsSpendComposition || d.usageScopes?.scopes?.credits?.creditsSpendComposition || null;\n    const scopeKey =",
        "    const creditsSpendComposition = d.analyticsScopes?.scopes?.credits?.windows?.['24h']?.creditsSpendComposition || d.usageScopes?.scopes?.credits?.creditsSpendComposition || null;\n    const dailyServerUsage = dailyServerUsageTruth(d);\n    const scopeKey =",
        'basic diagnostics daily truth context',
    )
    replace_once(WORKSPACE, '      creditsSpendComposition,\n      lastRefreshMs:', '      creditsSpendComposition,\n      dailyServerUsage,\n      lastRefreshMs:', 'basic diagnostics daily truth model')
    replace_once(WORKSPACE, '      creditsSpendCompositionDiagnosticText(model.creditsSpendComposition),\n      `Last refresh:', '      creditsSpendCompositionDiagnosticText(model.creditsSpendComposition),\n      dailyServerUsageDiagnosticText(model.dailyServerUsage),\n      `Last refresh:', 'basic diagnostics daily truth line')


def patch_manager_identity() -> None:
    replace_once(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.98';", "const PRODUCT_VERSION = '3.0.0-alpha.5.99';", 'Manager Product identity')


def sync_manifest() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['productVersion'] = TARGET_PRODUCT
    manifest['components']['plugin']['version'] = TARGET_PRODUCT
    manifest['components']['bridge']['requiredVersion'] = ENGINE_VERSION
    manifest['components']['bridge']['sha256'] = BASE_ENGINE_SHA
    manifest['components']['bridgeManager']['version'] = MANAGER_VERSION
    manifest['components']['bridgeManager']['productVersion'] = TARGET_PRODUCT
    manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
    manifest['components']['bridgeManager']['bootstrapSha256'] = BOOTSTRAP_SHA
    manifest['components']['bridgeManager']['managedCliVersion'] = CLI_VERSION
    manifest['components']['bridgeManager']['managedModelCatalogVersion'] = MODELS_VERSION
    manifest['contracts'] = {'snapshot': 1, 'recentRequest': 1}
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def validate_target() -> None:
    spec = load_spec()
    core = CORE.read_text(encoding='utf-8')
    analytics = ANALYTICS.read_text(encoding='utf-8')
    dashboard = DASHBOARD.read_text(encoding='utf-8')
    markup = MARKUP.read_text(encoding='utf-8')
    diagnostics = DIAGNOSTICS.read_text(encoding='utf-8')
    workspace = WORKSPACE.read_text(encoding='utf-8')
    manager = MANAGER.read_text(encoding='utf-8')
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    if '//@version 3.0.0-alpha.5.99' not in core or "const VERSION = '3.0.0-alpha.5.99';" not in core:
        raise SystemExit('5.99 Plugin identity missing')
    for marker in [
        'function dailyServerDateKey(value)',
        'function dailyServerScopeApplicability(data, scopeKey)',
        'function dailyServerMetricTruth(data, scopeKey, dateKey, applicability, metric)',
        "for (const range of ['24h','7d','30d'])",
        "requestChildren[scopeKey] = dailyServerMetricTruth(data, scopeKey, dateKey, applicability, 'requestCount')",
        "tokenChildren[scopeKey] = dailyServerMetricTruth(data, scopeKey, dateKey, applicability, 'totalTokens')",
        'function dailyServerUsageDiagnosticText(truth)',
    ]:
        if marker not in analytics:
            raise SystemExit(f'5.99 daily truth helper missing: {marker}')
    helper_start = analytics.index('  function dailyServerDateKey(value)')
    helper_end = analytics.index('  function costDriverMeaningfulName(value)', helper_start)
    helper = analytics[helper_start:helper_end]
    for forbidden in ['fetch(', 'runCli(', 'setTimeout(', 'setInterval(', 'localStorage', 'Risuai.', '/activity', '/logs']:
        if forbidden in helper:
            raise SystemExit(f'5.99 daily truth helper added forbidden I/O/lifecycle primitive: {forbidden}')
    for marker in ['const dailyServerUsage = dailyServerUsageTruth(d);']:
        if marker not in dashboard:
            raise SystemExit('5.99 dashboard context missing daily truth')
    for marker in ['오늘 요청 · 서버 집계', 'DevPass ${dailyServerUsage.requests.devpass', 'Credits ${dailyServerUsage.requests.credits', '오늘 토큰 · 서버 집계', 'daily-server-line']:
        if marker not in markup:
            raise SystemExit(f'5.99 UI marker missing: {marker}')
    if 'dailyServerUsageDiagnosticText(diagDailyServerUsage)' not in diagnostics:
        raise SystemExit('5.99 Full Diagnostics daily truth missing')
    if 'dailyServerUsageDiagnosticText(model.dailyServerUsage)' not in workspace:
        raise SystemExit('5.99 Basic Diagnostics daily truth missing')
    if "const MANAGER_VERSION = '1.3.6';" not in manager or "const PRODUCT_VERSION = '3.0.0-alpha.5.99';" not in manager:
        raise SystemExit('5.99 Manager identity mismatch')
    if sha256(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.99 Engine must remain exact-byte 1.6.34')
    if sha256(BOOTSTRAP) != BOOTSTRAP_SHA:
        raise SystemExit('5.99 bootstrap changed')
    if 'function cycleSummaryDailySeries(window, range)' not in CYCLE.read_text(encoding='utf-8'):
        raise SystemExit('5.99 module17 P59 ownership drifted')
    if manifest.get('productVersion') != TARGET_PRODUCT or manifest.get('components', {}).get('plugin', {}).get('version') != TARGET_PRODUCT:
        raise SystemExit('5.99 manifest Product mismatch')
    bridge = manifest.get('components', {}).get('bridge', {})
    manager_manifest = manifest.get('components', {}).get('bridgeManager', {})
    if bridge.get('requiredVersion') != ENGINE_VERSION or bridge.get('sha256') != BASE_ENGINE_SHA:
        raise SystemExit('5.99 manifest Engine mismatch')
    if manager_manifest.get('version') != MANAGER_VERSION or manager_manifest.get('productVersion') != TARGET_PRODUCT or manager_manifest.get('sha256') != sha256(MANAGER):
        raise SystemExit('5.99 manifest Manager mismatch')
    if manager_manifest.get('managedCliVersion') != CLI_VERSION or manager_manifest.get('managedModelCatalogVersion') != MODELS_VERSION:
        raise SystemExit('5.99 managed package identity changed')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.99 manifest contracts changed')
    if sha256(LATEST) != hashlib.sha256(''.join((SRC / part).read_text(encoding='utf-8') for part in json.loads('[]')).encode()).hexdigest() and not LATEST.exists():
        raise SystemExit('5.99 latest.js missing')
    run('node', 'plugins/usage-dashboard/tools/build_usage_dashboard.cjs', '--check')
    run('python3', 'plugins/usage-dashboard/tools/sync_project_guidelines.py', '--check')
    if TARGET_PRODUCT not in GUIDELINES.read_text(encoding='utf-8'):
        raise SystemExit('5.99 guidelines Product snapshot missing')
    if spec.get('authority', {}).get('featureIssue') != 1487:
        raise SystemExit('5.99 feature authority mismatch')


def materialize() -> None:
    spec = load_spec()
    validate_baseline()
    engine_before = sha256(ENGINE)
    bootstrap_before = sha256(BOOTSTRAP)
    cycle_before = sha256(CYCLE)
    patch_identity_and_notes(spec)
    patch_daily_truth()
    patch_manager_identity()
    run('node', 'plugins/usage-dashboard/tools/build_usage_dashboard.cjs', '--write')
    sync_manifest()
    run('python3', 'plugins/usage-dashboard/tools/sync_project_guidelines.py')
    if sha256(ENGINE) != engine_before or engine_before != BASE_ENGINE_SHA:
        raise SystemExit('5.99 Engine source/artifact changed during Product-only materialization')
    if sha256(BOOTSTRAP) != bootstrap_before or bootstrap_before != BOOTSTRAP_SHA:
        raise SystemExit('5.99 bootstrap changed during materialization')
    if sha256(CYCLE) != cycle_before:
        raise SystemExit('5.99 module17 changed despite P59 ownership boundary')
    validate_target()
    print(f'MATERIALIZED:{TARGET_PRODUCT}')


if __name__ == '__main__':
    materialize()
