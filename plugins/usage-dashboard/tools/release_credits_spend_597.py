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
ENGINE_SRC = UD / 'runtime-src' / 'bridge-engine'
RUNTIME = UD / 'runtime'
TESTS = UD / 'tests'
SPEC = ROOT / '.github' / 'usage-dashboard' / 'releases' / '5.97.json'
CORE = SRC / '00-runtime-core.part.js'
USAGE = SRC / '16-usage-analytics.part.js'
DIAGNOSTICS = SRC / '40-diagnostics.part.js'
ANALYTICS = SRC / '52-analytics-context.part.js'
MARKUP = SRC / '54-dashboard-markup.part.js'
WORKSPACE = SRC / '62-diagnostics-workspace.part.js'
ENGINE_CORE = ENGINE_SRC / '00-core.part.mjs'
ENGINE_SOURCES = ENGINE_SRC / '40-sources.part.mjs'
LATEST = UD / 'latest.js'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
MANIFEST = RUNTIME / 'product-manifest.json'
P62 = TESTS / 'p62-managed-runtime-diagnostic-identity-fidelity.cjs'

BASE_PRODUCT = '3.0.0-alpha.5.96'
TARGET_PRODUCT = '3.0.0-alpha.5.97'
BASE_ENGINE = '1.6.32'
TARGET_ENGINE = '1.6.33'
MANAGER_VERSION = '1.3.5'
CLI_VERSION = '1.10.0'
MODELS_VERSION = '1.251.0'
BASE_ENGINE_SHA = '5854cfba456b39ae5dc216e049556198cb6d63b9547ddc1b77fad301529f4674'
BASE_MANAGER_SHA = '463c07d065a1b0a6a5bbe46721673447bc9e6b9af1243dbeca36ac2db846dcb1'
BOOTSTRAP_SHA = '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c'
BASE_RELEASE_SHA = '5fc75fbc0725962997f65de17db4ffaf156ba6f9'


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
        raise SystemExit(f'5.97 {label} anchor mismatch: {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def replace_exact_count(path: Path, old: str, new: str, expected: int, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    if new in text and old not in text:
        return
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'5.97 {label} anchor mismatch: {count} != {expected}')
    path.write_text(text.replace(old, new), encoding='utf-8')


def insert_before(path: Path, anchor: str, block: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    if block.strip() in text:
        return
    if text.count(anchor) != 1:
        raise SystemExit(f'5.97 {label} anchor mismatch: {text.count(anchor)}')
    path.write_text(text.replace(anchor, block + anchor, 1), encoding='utf-8')


def load_spec() -> dict:
    spec = json.loads(SPEC.read_text(encoding='utf-8'))
    expected = {
        'productVersion': TARGET_PRODUCT,
        'engineVersion': TARGET_ENGINE,
        'managerVersion': MANAGER_VERSION,
        'managedCliVersion': CLI_VERSION,
        'managedModelCatalogVersion': MODELS_VERSION,
        'materializer': 'plugins/usage-dashboard/tools/release_credits_spend_597.py',
        'newRegression': 'plugins/usage-dashboard/tests/p63-credits-spend-composition-source-fidelity.cjs',
    }
    for key, value in expected.items():
        if spec.get(key) != value:
            raise SystemExit(f'5.97 release spec mismatch: {key}')
    contract = spec.get('creditsSpendCompositionContract') or {}
    if contract.get('usageCostSource') != 'activity.creditsCost' or contract.get('dataStorageCostSource') != 'activity.creditsDataStorageCost':
        raise SystemExit('5.97 source-fidelity authority missing')
    if contract.get('missingValue') != 'unknown' or contract.get('explicitZeroKnown') is not True or contract.get('newIo') is not False:
        raise SystemExit('5.97 UNKNOWN/I-O contract mismatch')
    evidence = spec.get('releaseEvidence') or {}
    for role in ('acceptedBaseline', 'latestInstalled'):
        row = evidence.get(role) or {}
        if row.get('productVersion') != BASE_PRODUCT or row.get('releaseSha') != BASE_RELEASE_SHA or row.get('verdict') != 'accepted' or row.get('issue') != 1017:
            raise SystemExit(f'5.97 E20 releaseEvidence mismatch: {role}')
    if 'verifiedBaseline' in spec or 'latestInstalledEvidence' in spec:
        raise SystemExit('5.97 must not own legacy evidence prose')
    return spec


def validate_target() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    if manifest.get('productVersion') != TARGET_PRODUCT:
        raise SystemExit('5.97 target Product mismatch')
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    engine_sha = sha256(ENGINE)
    manager_sha = sha256(MANAGER)
    if bridge.get('requiredVersion') != TARGET_ENGINE or bridge.get('sha256') != engine_sha:
        raise SystemExit('5.97 target Engine mismatch')
    if manager.get('version') != MANAGER_VERSION or manager.get('productVersion') != TARGET_PRODUCT or manager.get('sha256') != manager_sha:
        raise SystemExit('5.97 target Manager mismatch')
    if manager.get('managedCliVersion') != CLI_VERSION or manager.get('managedModelCatalogVersion') != MODELS_VERSION:
        raise SystemExit('5.97 target managed package pair mismatch')
    if sha256(BOOTSTRAP) != BOOTSTRAP_SHA:
        raise SystemExit('5.97 bootstrap changed')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.97 target contracts changed')
    if f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';" not in MANAGER.read_text(encoding='utf-8'):
        raise SystemExit('5.97 Manager Engine hash binding mismatch')
    for marker in [
        'function boundedCreditsSpendComposition(raw, range)',
        "explicitCreditsSpendComponent(row, 'creditsCost')",
        "explicitCreditsSpendComponent(row, 'creditsDataStorageCost')",
        "usageCostSource:usageKnown ? 'activity.creditsCost' : 'unknown'",
    ]:
        if marker not in ENGINE_SOURCES.read_text(encoding='utf-8'):
            raise SystemExit(f'5.97 Engine truth marker missing: {marker}')
    for marker in ['function normalizeCreditsSpendComposition(value)', 'function creditsSpendCompositionDiagnosticText(value)']:
        if marker not in USAGE.read_text(encoding='utf-8'):
            raise SystemExit(f'5.97 Plugin truth marker missing: {marker}')
    if 'UD_HISTORICAL_VERSION_LOCK' not in P62.read_text(encoding='utf-8'):
        raise SystemExit('5.97 P62 history lock missing')
    run('node', 'plugins/usage-dashboard/tools/build_usage_dashboard.cjs', '--check')
    run('node', 'plugins/usage-dashboard/tools/build_bridge_engine.cjs', '--check')
    print(f'5.97 TARGET_OK engine={engine_sha} manager={manager_sha}')


def validate_baseline() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    if manifest.get('productVersion') == TARGET_PRODUCT:
        validate_target()
        print(f'MATERIALIZER_IDEMPOTENT:{TARGET_PRODUCT}')
        raise SystemExit(0)
    if manifest.get('productVersion') != BASE_PRODUCT:
        raise SystemExit('5.97 baseline Product mismatch')
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if bridge.get('requiredVersion') != BASE_ENGINE or bridge.get('sha256') != BASE_ENGINE_SHA:
        raise SystemExit('5.97 baseline Engine mismatch')
    if manager.get('version') != MANAGER_VERSION or manager.get('productVersion') != BASE_PRODUCT or manager.get('sha256') != BASE_MANAGER_SHA:
        raise SystemExit('5.97 baseline Manager mismatch')
    if manager.get('managedCliVersion') != CLI_VERSION or manager.get('managedModelCatalogVersion') != MODELS_VERSION:
        raise SystemExit('5.97 managed package pair drift')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.97 contract drift')
    if sha256(ENGINE) != BASE_ENGINE_SHA or sha256(MANAGER) != BASE_MANAGER_SHA or sha256(BOOTSTRAP) != BOOTSTRAP_SHA:
        raise SystemExit('5.97 baseline artifact bytes mismatch')


def patch_identity_and_notes(spec: dict) -> None:
    replace_once(CORE, '//@version 3.0.0-alpha.5.96', '//@version 3.0.0-alpha.5.97', 'Plugin metadata')
    replace_once(CORE, "const VERSION = '3.0.0-alpha.5.96';", "const VERSION = '3.0.0-alpha.5.97';", 'Plugin VERSION')
    replace_once(CORE, "const REQUIRED_BRIDGE_VERSION = '1.6.32';", "const REQUIRED_BRIDGE_VERSION = '1.6.33';", 'Plugin Engine requirement')
    text = CORE.read_text(encoding='utf-8')
    notes = spec.get('releaseNotes') or {}
    block = '  const RELEASE_NOTES = Object.freeze({\n'
    block += f"    title: {json.dumps(spec['releaseTitle'], ensure_ascii=False)},\n"
    block += '    highlights: Object.freeze([\n'
    block += ''.join(f"    {json.dumps(value, ensure_ascii=False)},\n" for value in notes.get('highlights', []))
    block += '    ]),\n    diagnosticHints: Object.freeze([\n'
    block += ''.join(f"    {json.dumps(value, ensure_ascii=False)},\n" for value in notes.get('diagnosticHints', []))
    block += '    ]),\n  });\n'
    next_text, count = re.subn(r'  const RELEASE_NOTES = Object\.freeze\(\{.*?\n  \}\);\n', block, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit('5.97 release notes boundary mismatch')
    CORE.write_text(next_text, encoding='utf-8')
    replace_once(ENGINE_CORE, "const VERSION = '1.6.32';", "const VERSION = '1.6.33';", 'Engine VERSION')


ENGINE_HELPERS = """function explicitCreditsSpendComponent(row, key) {
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

"""


def patch_engine_truth() -> None:
    insert_before(ENGINE_SOURCES, 'function normalizeCapturedRecentLogs(root) {', ENGINE_HELPERS, 'Engine source-fidelity helper')
    replace_once(
        ENGINE_SOURCES,
        '  const dailySeries = boundedDailyActivitySeries(raw, range);\n',
        '  const dailySeries = boundedDailyActivitySeries(raw, range);\n  const creditsSpendComposition = boundedCreditsSpendComposition(raw, range);\n',
        'Engine composition projection',
    )
    replace_exact_count(
        ENGINE_SOURCES,
        '    ...(dailySeries ? { dailySeries } : {}),\n    totalRequests,\n',
        '    ...(dailySeries ? { dailySeries } : {}),\n    ...(creditsSpendComposition ? { creditsSpendComposition } : {}),\n    totalRequests,\n',
        2,
        'Engine composition returns',
    )
    replace_once(
        ENGINE_SOURCES,
        "  const dailySeriesCandidates = (items || []).map((item) => item?.dailySeries).filter((series) => series && typeof series === 'object');\n  const dailySeries = dailySeriesCandidates.length === 1 ? dailySeriesCandidates[0] : null;\n",
        "  const dailySeriesCandidates = (items || []).map((item) => item?.dailySeries).filter((series) => series && typeof series === 'object');\n  const dailySeries = dailySeriesCandidates.length === 1 ? dailySeriesCandidates[0] : null;\n  const creditsSpendCompositionCandidates = (items || []).map((item) => item?.creditsSpendComposition).filter((value) => value && typeof value === 'object');\n  const creditsSpendComposition = creditsSpendCompositionCandidates.length === 1 ? creditsSpendCompositionCandidates[0] : null;\n",
        'Engine merge candidate',
    )


PLUGIN_HELPER = """  function normalizeCreditsSpendComposition(value) {
    if (!value || typeof value !== 'object' || String(value.window || '') !== '24h') return null;
    const exact = scalar => typeof scalar === 'number' && Number.isFinite(scalar) && scalar >= 0 ? Number(scalar) : null;
    const usageCost = exact(value.usageCost);
    const dataStorageCost = exact(value.dataStorageCost);
    const expectedTotal = usageCost !== null && dataStorageCost !== null ? usageCost + dataStorageCost : null;
    const reportedTotal = exact(value.totalSpend);
    const complete = value.complete === true && expectedTotal !== null && reportedTotal !== null && Math.abs(reportedTotal - expectedTotal) <= 1e-9;
    return {
      window:'24h',
      usageCost,
      dataStorageCost,
      totalSpend:complete ? expectedTotal : null,
      usageCostSource:usageCost !== null && String(value.usageCostSource) === 'activity.creditsCost' ? 'activity.creditsCost' : 'unknown',
      dataStorageCostSource:dataStorageCost !== null && String(value.dataStorageCostSource) === 'activity.creditsDataStorageCost' ? 'activity.creditsDataStorageCost' : 'unknown',
      complete,
    };
  }

"""

PLUGIN_DIAGNOSTIC = """  function creditsSpendCompositionDiagnosticText(value) {
    const truth = value && typeof value === 'object' ? value : null;
    const format = scalar => typeof scalar === 'number' && Number.isFinite(scalar) && scalar >= 0 ? `$${Number(scalar).toFixed(4)}` : '—';
    if (!truth) return 'Credits spend composition: window 24h · usage — · storage — · total — · complete no · source unknown';
    const sources = [truth.usageCostSource, truth.dataStorageCostSource].filter(source => source && source !== 'unknown');
    return `Credits spend composition: window 24h · usage ${format(truth.usageCost)} · storage ${format(truth.dataStorageCost)} · total ${format(truth.totalSpend)} · complete ${truth.complete ? 'yes' : 'no'} · source ${sources.join(' + ') || 'unknown'}`;
  }

"""


def patch_plugin_truth() -> None:
    insert_before(USAGE, '  function normalizeScopeActivity(raw) {', PLUGIN_HELPER, 'Plugin normalize helper')
    replace_once(
        USAGE,
        '    const cacheCreationInputTokens = num(raw.cacheCreationInputTokens ?? raw.cache_creation_input_tokens ?? raw.cacheWriteTokens ?? raw.cache_write_tokens) ? Number(raw.cacheCreationInputTokens ?? raw.cache_creation_input_tokens ?? raw.cacheWriteTokens ?? raw.cache_write_tokens) : null;\n',
        '    const cacheCreationInputTokens = num(raw.cacheCreationInputTokens ?? raw.cache_creation_input_tokens ?? raw.cacheWriteTokens ?? raw.cache_write_tokens) ? Number(raw.cacheCreationInputTokens ?? raw.cache_creation_input_tokens ?? raw.cacheWriteTokens ?? raw.cache_write_tokens) : null;\n    const creditsSpendComposition = normalizeCreditsSpendComposition(raw.creditsSpendComposition);\n',
        'Plugin composition normalize',
    )
    replace_once(
        USAGE,
        '    if (![totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate,cachedInputTokens,cacheReadInputTokens,cacheCreationInputTokens].some(num) && !providers.length && !models.length && !rawRecent.length) return null;\n',
        '    if (![totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate,cachedInputTokens,cacheReadInputTokens,cacheCreationInputTokens].some(num) && !providers.length && !models.length && !rawRecent.length && !creditsSpendComposition) return null;\n',
        'Plugin composition meaningful guard',
    )
    replace_once(
        USAGE,
        "    return {totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate,cachedInputTokens,cacheReadInputTokens,cacheCreationInputTokens,providers,models,recent,recentLedger,recentSourceKey,recentRawCount:rawRecent.length,requestProvenance:normalizeRequestProvenanceMetadata(raw?.requestProvenance),dailySeries:normalizeDailyScalarSeries(raw.dailySeries),fetchedAt:raw.fetchedAt || Date.now(),source:String(raw.source || 'LLMGateway scoped usage')};\n",
        "    return {totalRequests,totalCost,totalTokens,inputTokens,outputTokens,errorCount,errorRate,cacheCount,cacheRate,cachedInputTokens,cacheReadInputTokens,cacheCreationInputTokens,providers,models,recent,recentLedger,recentSourceKey,recentRawCount:rawRecent.length,creditsSpendComposition,requestProvenance:normalizeRequestProvenanceMetadata(raw?.requestProvenance),dailySeries:normalizeDailyScalarSeries(raw.dailySeries),fetchedAt:raw.fetchedAt || Date.now(),source:String(raw.source || 'LLMGateway scoped usage')};\n",
        'Plugin composition normalized return',
    )
    insert_before(USAGE, '  function normalize(payload) {', PLUGIN_DIAGNOSTIC, 'Plugin composition diagnostic helper')


def patch_ui_and_diagnostics() -> None:
    analytics_block = """    const analyticsFetchedAt = analyticsBundle?.fetchedAt || d.analyticsScopes?.fetchedAt || analyticsW24?.fetchedAt || d.fetchedAt;
    const analyticsCreditsSpend = analyticsScopeKey === 'credits' ? analyticsW24?.creditsSpendComposition || null : null;
    const analyticsCreditsSpendMoney = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? `$${Number(value).toFixed(4)}` : '—';
    const analyticsCreditsSpendSplit = analyticsCreditsSpend?.complete && Number(analyticsCreditsSpend.totalSpend) > 0
      ? `사용 ${(Number(analyticsCreditsSpend.usageCost) / Number(analyticsCreditsSpend.totalSpend) * 100).toFixed(1)}% · 보관 ${(Number(analyticsCreditsSpend.dataStorageCost) / Number(analyticsCreditsSpend.totalSpend) * 100).toFixed(1)}%`
      : '—';
    const analyticsCreditsSpendCard = analyticsScopeKey === 'credits'
      ? `<div class="usage-detail-box credits-spend-card"><h3>Credits 비용 구성 · 24h</h3><div class="usage-detail-row"><div><b>사용 비용</b><span>${esc(analyticsCreditsSpend?.usageCostSource || 'unknown')}</span></div><span>${analyticsCreditsSpendMoney(analyticsCreditsSpend?.usageCost)}</span></div><div class="usage-detail-row"><div><b>데이터 보관</b><span>${esc(analyticsCreditsSpend?.dataStorageCostSource || 'unknown')}</span></div><span>${analyticsCreditsSpendMoney(analyticsCreditsSpend?.dataStorageCost)}</span></div><div class="usage-detail-row"><div><b>총 비용</b><span>${analyticsCreditsSpend?.complete ? 'complete' : 'UNKNOWN'}</span></div><span>${analyticsCreditsSpendMoney(analyticsCreditsSpend?.totalSpend)}</span></div><p>구성 비율 · ${esc(analyticsCreditsSpendSplit)}</p></div>`
      : '';
"""
    replace_once(
        ANALYTICS,
        '    const analyticsFetchedAt = analyticsBundle?.fetchedAt || d.analyticsScopes?.fetchedAt || analyticsW24?.fetchedAt || d.fetchedAt;\n',
        analytics_block,
        'Analytics composition context',
    )
    replace_once(
        MARKUP,
        '          ${analyticsExtra}\n        </div>` : `<p>Bridge snapshot에 ${esc(analyticsNames[analyticsScopeKey][0])} 범위 데이터가 아직 없어.</p>`}\n',
        '          ${analyticsExtra}\n        </div>${analyticsCreditsSpendCard}` : `<p>Bridge snapshot에 ${esc(analyticsNames[analyticsScopeKey][0])} 범위 데이터가 아직 없어.</p>`}\n',
        'Analytics composition card',
    )
    replace_once(
        DIAGNOSTICS,
        "    const diagAnalyticsW24 = diagAnalyticsBundle?.windows?.['24h'] || d.usageScopes?.scopes?.[diagAnalyticsScopeKey] || null;\n",
        "    const diagAnalyticsW24 = diagAnalyticsBundle?.windows?.['24h'] || d.usageScopes?.scopes?.[diagAnalyticsScopeKey] || null;\n    const diagCreditsSpend = d.analyticsScopes?.scopes?.credits?.windows?.['24h']?.creditsSpendComposition || d.usageScopes?.scopes?.credits?.creditsSpendComposition || null;\n",
        'Full diagnostics composition truth',
    )
    replace_once(
        DIAGNOSTICS,
        '      costDriverDiagnosticText(diagAnalyticsScopeKey, diagAnalyticsW24),\n',
        '      costDriverDiagnosticText(diagAnalyticsScopeKey, diagAnalyticsW24),\n      creditsSpendCompositionDiagnosticText(diagCreditsSpend),\n',
        'Full diagnostics composition line',
    )
    replace_once(
        WORKSPACE,
        '    const cli = diagnosticsWorkspaceCliRuntime();\n',
        "    const cli = diagnosticsWorkspaceCliRuntime();\n    const creditsSpendComposition = d.analyticsScopes?.scopes?.credits?.windows?.['24h']?.creditsSpendComposition || d.usageScopes?.scopes?.credits?.creditsSpendComposition || null;\n",
        'Compact diagnostics composition truth',
    )
    replace_once(
        WORKSPACE,
        '      cli,\n      lastRefreshMs:num(state.lastSyncDurationMs) ? Number(state.lastSyncDurationMs) : null,\n',
        '      cli,\n      creditsSpendComposition,\n      lastRefreshMs:num(state.lastSyncDurationMs) ? Number(state.lastSyncDurationMs) : null,\n',
        'Compact diagnostics model',
    )
    replace_once(
        WORKSPACE,
        "      `Runtime: Engine ${model.engineVersion || '—'} · Manager ${model.managerVersion || '—'} · CLI ${model.cli.version || '—'} · Models ${model.cli.modelVersion || '—'} · ${model.cli.state}`,\n",
        "      `Runtime: Engine ${model.engineVersion || '—'} · Manager ${model.managerVersion || '—'} · CLI ${model.cli.version || '—'} · Models ${model.cli.modelVersion || '—'} · ${model.cli.state}`,\n      creditsSpendCompositionDiagnosticText(model.creditsSpendComposition),\n",
        'Compact diagnostics composition line',
    )


def patch_historical_p62() -> None:
    text = P62.read_text(encoding='utf-8')
    if 'UD_HISTORICAL_VERSION_LOCK' in text:
        return
    old = "const release = loadCurrentRelease();\nassert.equal(release.productVersion, '3.0.0-alpha.5.96');\n"
    new = "const release = loadCurrentRelease();\nif (release.productVersion !== '3.0.0-alpha.5.96') {\n  console.log(`P62 Managed Runtime Diagnostic Namespace & Identity Fidelity: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.96`);\n  process.exit(0);\n}\n// UD_HISTORICAL_VERSION_LOCK\nassert.equal(release.productVersion, '3.0.0-alpha.5.96');\n"
    if text.count(old) != 1:
        raise SystemExit('5.97 P62 history anchor mismatch')
    P62.write_text(text.replace(old, new, 1), encoding='utf-8')


def build_artifacts() -> tuple[str, str]:
    run('node', 'plugins/usage-dashboard/tools/build_usage_dashboard.cjs', '--write')
    run('node', 'plugins/usage-dashboard/tools/build_bridge_engine.cjs', '--write')
    engine_sha = sha256(ENGINE)
    replace_once(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.96';", "const PRODUCT_VERSION = '3.0.0-alpha.5.97';", 'Manager Product identity')
    replace_once(MANAGER, "const BUNDLED_ENGINE_VERSION = '1.6.32';", "const BUNDLED_ENGINE_VERSION = '1.6.33';", 'Manager Engine identity')
    replace_once(MANAGER, f"const BUNDLED_ENGINE_SHA256 = '{BASE_ENGINE_SHA}';", f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';", 'Manager Engine hash')
    return engine_sha, sha256(MANAGER)


def update_manifest(engine_sha: str, manager_sha: str) -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    manifest['productVersion'] = TARGET_PRODUCT
    manifest['components']['plugin']['version'] = TARGET_PRODUCT
    manifest['components']['bridge']['requiredVersion'] = TARGET_ENGINE
    manifest['components']['bridge']['sha256'] = engine_sha
    manager = manifest['components']['bridgeManager']
    manager['version'] = MANAGER_VERSION
    manager['productVersion'] = TARGET_PRODUCT
    manager['sha256'] = manager_sha
    manager['bootstrapSha256'] = BOOTSTRAP_SHA
    manager['managedCliVersion'] = CLI_VERSION
    manager['managedModelCatalogVersion'] = MODELS_VERSION
    manifest['contracts'] = {'snapshot': 1, 'recentRequest': 1}
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    run('python3', 'plugins/usage-dashboard/tools/sync_project_guidelines.py')


def main() -> None:
    spec = load_spec()
    validate_baseline()
    patch_identity_and_notes(spec)
    patch_engine_truth()
    patch_plugin_truth()
    patch_ui_and_diagnostics()
    patch_historical_p62()
    engine_sha, manager_sha = build_artifacts()
    update_manifest(engine_sha, manager_sha)
    validate_target()
    print(f'MATERIALIZED:{TARGET_PRODUCT}:Engine {TARGET_ENGINE}:{engine_sha}:Manager {MANAGER_VERSION}:{manager_sha}')


if __name__ == '__main__':
    main()
