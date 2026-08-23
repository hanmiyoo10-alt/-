from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
RUNTIME_SRC = ROOT / 'runtime-src' / 'bridge-engine'
TOOLS = ROOT / 'tools'
CORE = SRC / '00-runtime-core.part.js'
REQUEST_NORMALIZE = SRC / '10-request-normalize.part.js'
REQUEST_LEDGER = SRC / '14-request-ledger.part.js'
DIAGNOSTICS = SRC / '40-diagnostics.part.js'
ENGINE_CORE = RUNTIME_SRC / '00-core.part.mjs'
CLI_RUNTIME = RUNTIME_SRC / '30-cli-runtime.part.mjs'
ENGINE_SOURCES = RUNTIME_SRC / '40-sources.part.mjs'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
VALIDATOR = Path('.github/workflows/reusable-usage-dashboard-validate.yml')
GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')

BASE_VERSION = '3.0.0-alpha.5.69'
TARGET_VERSION = '3.0.0-alpha.5.70'
BASE_ENGINE = '1.6.20'
TARGET_ENGINE = '1.6.21'
TARGET_MANAGER = '1.3.0'


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def run(*args: str) -> None:
    subprocess.run(list(args), check=True)


def validate_target() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    bridge = manifest.get('components', {}).get('bridge', {})
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.70 Product version mismatch')
    if bridge.get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.70 Engine version mismatch')
    if manager.get('version') != TARGET_MANAGER or manager.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.70 Manager identity mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.70 contracts changed from 1/1')
    if bridge.get('sha256') != sha256(ENGINE):
        raise SystemExit('5.70 Engine hash mismatch')
    if manager.get('sha256') != sha256(MANAGER):
        raise SystemExit('5.70 Manager hash mismatch')
    if manager.get('bootstrapSha256') != sha256(BOOTSTRAP):
        raise SystemExit('5.70 bootstrap hash mismatch')
    engine_text = ENGINE.read_text(encoding='utf-8')
    manager_text = MANAGER.read_text(encoding='utf-8')
    latest_text = (ROOT / 'latest.js').read_text(encoding='utf-8')
    for marker in [
        "typeof row.duration === 'number' && Number.isFinite(row.duration) && row.duration >= 0",
        "durationSource: durationMs !== null ? 'llmgateway-log-duration' : ''",
        "durationFidelity: durationMs !== null ? 'explicit' : 'unknown'",
        "durationSource: durationExplicit ? 'llmgateway-log-duration' : ''",
    ]:
        if marker not in engine_text:
            raise SystemExit(f'5.70 Engine duration marker missing: {marker}')
    for marker in ['Request duration fidelity:', 'function requestDurationStats(rows)', 'function requestDurationText(row)']:
        if marker not in latest_text:
            raise SystemExit(f'5.70 plugin duration marker missing: {marker}')
    if f"const PRODUCT_VERSION = '{TARGET_VERSION}';" not in manager_text:
        raise SystemExit('5.70 Manager product version not synchronized')
    if f"const BUNDLED_ENGINE_VERSION = '{TARGET_ENGINE}';" not in manager_text:
        raise SystemExit('5.70 Manager Engine version not synchronized')
    if f"const BUNDLED_ENGINE_SHA256 = '{sha256(ENGINE)}';" not in manager_text:
        raise SystemExit('5.70 Manager Engine hash not synchronized')


manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
current = str(manifest.get('productVersion') or '')
if current == TARGET_VERSION:
    run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--check')
    run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
    validate_target()
    print(f'{TARGET_VERSION} already materialized · Request Duration Fidelity intact')
    raise SystemExit(0)

if current != BASE_VERSION:
    raise SystemExit(f'expected {BASE_VERSION} baseline, got {current or "missing"}')
bridge = manifest.get('components', {}).get('bridge', {})
manager_meta = manifest.get('components', {}).get('bridgeManager', {})
if bridge.get('requiredVersion') != BASE_ENGINE:
    raise SystemExit(f'expected Engine {BASE_ENGINE}, got {bridge.get("requiredVersion")}')
if manager_meta.get('version') != TARGET_MANAGER:
    raise SystemExit(f'expected Manager {TARGET_MANAGER}, got {manager_meta.get("version")}')
if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('baseline contracts are not 1/1')
if bridge.get('sha256') != sha256(ENGINE) or manager_meta.get('sha256') != sha256(MANAGER):
    raise SystemExit('baseline manifest hashes do not match current runtime bytes')

replace_once(CORE, '//@version 3.0.0-alpha.5.69', '//@version 3.0.0-alpha.5.70', 'plugin header version')
replace_once(CORE, "const VERSION = '3.0.0-alpha.5.69';", "const VERSION = '3.0.0-alpha.5.70';", 'plugin runtime version')
replace_once(CORE, "const REQUIRED_BRIDGE_VERSION = '1.6.20';", "const REQUIRED_BRIDGE_VERSION = '1.6.21';", 'plugin required Engine version')
replace_once(ENGINE_CORE, "const VERSION = '1.6.20';", "const VERSION = '1.6.21';", 'Engine version')

replace_once(
    CLI_RUNTIME,
    "      const cacheUsage = normalizeProviderCacheUsage(row);\n      return {\n        timestamp,",
    "      const cacheUsage = normalizeProviderCacheUsage(row);\n      const durationMs = typeof row.duration === 'number' && Number.isFinite(row.duration) && row.duration >= 0\n        ? Number(row.duration)\n        : null;\n      return {\n        timestamp,",
    'capture explicit duration source',
)
replace_once(
    CLI_RUNTIME,
    "        cacheHit: typeof row.cached === 'boolean' ? row.cached : null,\n        requestedServiceTier: requestedTier.value,",
    "        cacheHit: typeof row.cached === 'boolean' ? row.cached : null,\n        durationMs,\n        durationSource: durationMs !== null ? 'llmgateway-log-duration' : '',\n        durationFidelity: durationMs !== null ? 'explicit' : 'unknown',\n        requestedServiceTier: requestedTier.value,",
    'capture duration allow-list fields',
)

replace_once(
    ENGINE_SOURCES,
    "    const requestNumber = String(row.requestNumber || '');\n    if (timestamp === null || !requestNumber) return null;\n    return {",
    "    const requestNumber = String(row.requestNumber || '');\n    const durationExplicit = typeof row.durationMs === 'number' && Number.isFinite(row.durationMs) && row.durationMs >= 0\n      && String(row.durationSource || '') === 'llmgateway-log-duration'\n      && String(row.durationFidelity || '') === 'explicit';\n    if (timestamp === null || !requestNumber) return null;\n    return {",
    'Engine recent duration fidelity gate',
)
replace_once(
    ENGINE_SOURCES,
    "      cacheHit: typeof row.cacheHit === 'boolean' ? row.cacheHit : null,\n      requestedServiceTier: row.requestedServiceTier ?? null,",
    "      cacheHit: typeof row.cacheHit === 'boolean' ? row.cacheHit : null,\n      durationMs: durationExplicit ? Number(row.durationMs) : null,\n      durationSource: durationExplicit ? 'llmgateway-log-duration' : '',\n      durationFidelity: durationExplicit ? 'explicit' : 'unknown',\n      requestedServiceTier: row.requestedServiceTier ?? null,",
    'Engine recent duration fields',
)

replace_once(
    REQUEST_NORMALIZE,
    "  function requestCacheSignal(row) {",
    "  function requestDurationKnown(value) {\n    return typeof value === 'number' && Number.isFinite(value) && value >= 0;\n  }\n\n  function requestDurationMetadata(row) {\n    const value = recentRequestValue(row, ['durationMs'], null);\n    const source = String(recentRequestValue(row, ['durationSource'], '') || '');\n    const fidelity = String(recentRequestValue(row, ['durationFidelity'], 'unknown') || 'unknown');\n    const explicit = requestDurationKnown(value) && source === 'llmgateway-log-duration' && fidelity === 'explicit';\n    return {\n      durationMs: explicit ? Number(value) : null,\n      durationSource: explicit ? source : '',\n      durationFidelity: explicit ? 'explicit' : 'unknown'\n    };\n  }\n\n  function formatRequestDurationMs(value) {\n    if (!requestDurationKnown(value)) return '—';\n    const ms = Number(value);\n    if (ms < 1000) return `${Math.round(ms)}ms`;\n    if (ms < 10000) return `${(ms / 1000).toFixed(2).replace(/\\.?0+$/, '')}s`;\n    return `${(ms / 1000).toFixed(1).replace(/\\.0$/, '')}s`;\n  }\n\n  function requestDurationText(row) {\n    return row?.durationFidelity === 'explicit' && requestDurationKnown(row?.durationMs)\n      ? formatRequestDurationMs(row.durationMs)\n      : '—';\n  }\n\n  function requestCacheSignal(row) {",
    'plugin duration normalization helpers',
)

replace_once(
    REQUEST_LEDGER,
    "      const cacheMetrics = requestCacheMetrics(row);\n      const requestedTierField = recentRequestField(row, [",
    "      const cacheMetrics = requestCacheMetrics(row);\n      const duration = requestDurationMetadata(row);\n      const requestedTierField = recentRequestField(row, [",
    'recent request duration normalization',
)
replace_once(
    REQUEST_LEDGER,
    "        cacheHit:requestCacheSignal(row),\n        cachedInputTokens:cacheMetrics.cachedInputTokens,",
    "        cacheHit:requestCacheSignal(row),\n        durationMs:duration.durationMs,\n        durationSource:duration.durationSource,\n        durationFidelity:duration.durationFidelity,\n        cachedInputTokens:cacheMetrics.cachedInputTokens,",
    'recent request normalized duration fields',
)
replace_once(
    REQUEST_LEDGER,
    "  function requestCacheObservabilityStats(rows) {",
    "  function requestDurationStats(rows) {\n    const list = Array.isArray(rows) ? rows : [];\n    const stats = {rows:list.length, explicit:0, unknown:0, totalMs:0, averageMs:null, slowestMs:null, sources:[]};\n    const sources = new Set();\n    for (const row of list) {\n      const explicit = row?.durationFidelity === 'explicit'\n        && row?.durationSource === 'llmgateway-log-duration'\n        && requestDurationKnown(row?.durationMs);\n      if (!explicit) { stats.unknown += 1; continue; }\n      const value = Number(row.durationMs);\n      stats.explicit += 1;\n      stats.totalMs += value;\n      stats.slowestMs = stats.slowestMs === null ? value : Math.max(stats.slowestMs, value);\n      sources.add('llmgateway-log-duration');\n    }\n    stats.averageMs = stats.explicit ? stats.totalMs / stats.explicit : null;\n    stats.sources = [...sources].sort();\n    return stats;\n  }\n\n  function requestCacheObservabilityStats(rows) {",
    'duration fidelity stats',
)
replace_once(
    REQUEST_LEDGER,
    "        const current = byKey.get(key) || null;\n        const scopes = new Set([...(Array.isArray(current?.scopes) ? current.scopes : []), scopeKey]);\n        byKey.set(key, {",
    "        const current = byKey.get(key) || null;\n        const incomingDuration = requestDurationMetadata(row);\n        const currentDuration = requestDurationMetadata(current || {});\n        const duration = incomingDuration.durationFidelity === 'explicit' ? incomingDuration : currentDuration;\n        const scopes = new Set([...(Array.isArray(current?.scopes) ? current.scopes : []), scopeKey]);\n        byKey.set(key, {",
    'ledger duration enrichment choice',
)
replace_once(
    REQUEST_LEDGER,
    "          outputTokens:num(row.outputTokens) ? Number(row.outputTokens) : (num(current?.outputTokens) ? Number(current.outputTokens) : null),\n          cacheHit:typeof row.cacheHit === 'boolean' ? row.cacheHit : (typeof current?.cacheHit === 'boolean' ? current.cacheHit : null),",
    "          outputTokens:num(row.outputTokens) ? Number(row.outputTokens) : (num(current?.outputTokens) ? Number(current.outputTokens) : null),\n          durationMs:duration.durationMs,\n          durationSource:duration.durationSource,\n          durationFidelity:duration.durationFidelity,\n          cacheHit:typeof row.cacheHit === 'boolean' ? row.cacheHit : (typeof current?.cacheHit === 'boolean' ? current.cacheHit : null),",
    'ledger duration enrichment fields',
)
replace_once(
    REQUEST_LEDGER,
    "    const fidelity = requestLedgerCapabilities(rows);\n    if (!rows.length) {",
    "    const fidelity = requestLedgerCapabilities(rows);\n    const durationFidelity = requestDurationStats(rows);\n    if (!rows.length) {",
    'hourly duration coverage',
)
replace_once(
    REQUEST_LEDGER,
    "      const tierText = requestServiceTierSummary(hour);\n      return `<button class=\"hour-row ${selectedKey===key?'active':''}\" data-usage-hour=\"${esc(key)}\"><span><b>${esc(requestHourLabel(key))}</b><small>${hour.length}회 · ${costRows.length ? money(totalCost,4) : '비용 —'}</small></span><em>${cacheText} · ${tierText}${errorText}</em></button>`;",
    "      const tierText = requestServiceTierSummary(hour);\n      const duration = requestDurationStats(hour);\n      const durationText = duration.explicit\n        ? `Duration ${duration.explicit}/${duration.rows} · avg ${formatRequestDurationMs(duration.averageMs)}`\n        : `Duration 0/${duration.rows}`;\n      return `<button class=\"hour-row ${selectedKey===key?'active':''}\" data-usage-hour=\"${esc(key)}\"><span><b>${esc(requestHourLabel(key))}</b><small>${hour.length}회 · ${costRows.length ? money(totalCost,4) : '비용 —'}</small></span><em>${cacheText} · ${tierText} · ${durationText}${errorText}</em></button>`;",
    'hour row duration summary',
)
replace_once(
    REQUEST_LEDGER,
    "      const tierSummary = requestServiceTierSummary(selected);\n      const cacheSummary = cacheRate === null",
    "      const tierSummary = requestServiceTierSummary(selected);\n      const durationSummary = requestDurationStats(selected);\n      const durationText = durationSummary.explicit\n        ? `Duration known ${durationSummary.explicit}/${durationSummary.rows} · average ${formatRequestDurationMs(durationSummary.averageMs)} · slowest ${formatRequestDurationMs(durationSummary.slowestMs)}`\n        : `Duration known 0/${durationSummary.rows} · average — · slowest —`;\n      const cacheSummary = cacheRate === null",
    'selected hour duration summary',
)
replace_once(
    REQUEST_LEDGER,
    "        tierSummary,\n        errors ? `오류 ${errors}` : '오류 0'",
    "        tierSummary,\n        durationText,\n        errors ? `오류 ${errors}` : '오류 0'",
    'selected hour duration summary output',
)
replace_once(
    REQUEST_LEDGER,
    "        const tierText = requestServiceTierText(row);\n        const usageText = [resultText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', tierText, cacheText].filter(Boolean).join(' · ');",
    "        const tierText = requestServiceTierText(row);\n        const durationText = `Duration ${requestDurationText(row)}`;\n        const usageText = [resultText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', tierText, durationText, cacheText].filter(Boolean).join(' · ');",
    'hour detail request duration',
)
replace_once(
    REQUEST_LEDGER,
    "    return `<div class=\"usage-detail-box hourly-ledger\"><div class=\"recent-head\"><h3>시간별 요청 · 24h 로컬 관측</h3><span>${rows.length}건 · ${groups.size}시간</span></div><p>${esc(coverageText)} · 시각 exact ${fidelity.exact}/${fidelity.rows} · 버킷 ${fidelity.bucket}/${fidelity.rows} · 캐시 정보 ${fidelity.cacheKnown}/${fidelity.rows} · tier 실제 ${fidelity.tier.servedKnown}/${fidelity.rows} · 프롬프트/응답 미저장</p><div class=\"hour-list\">${hourRows}</div>${selectedHtml}</div>`;",
    "    return `<div class=\"usage-detail-box hourly-ledger\"><div class=\"recent-head\"><h3>시간별 요청 · 24h 로컬 관측</h3><span>${rows.length}건 · ${groups.size}시간</span></div><p>${esc(coverageText)} · 시각 exact ${fidelity.exact}/${fidelity.rows} · 버킷 ${fidelity.bucket}/${fidelity.rows} · 캐시 정보 ${fidelity.cacheKnown}/${fidelity.rows} · tier 실제 ${fidelity.tier.servedKnown}/${fidelity.rows} · Duration explicit ${durationFidelity.explicit}/${durationFidelity.rows} · 프롬프트/응답 미저장</p><div class=\"hour-list\">${hourRows}</div>${selectedHtml}</div>`;",
    'hourly duration coverage text',
)
replace_once(
    REQUEST_LEDGER,
    "      const tierText = requestServiceTierText(row);\n      const usageText = [resultText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', tierText, cacheText].filter(Boolean).join(' · ');",
    "      const tierText = requestServiceTierText(row);\n      const durationText = `Duration ${requestDurationText(row)}`;\n      const usageText = [resultText, num(row.cost) ? money(row.cost,4) : '', num(row.totalTokens) ? `${Number(row.totalTokens).toLocaleString()} tok` : '', tierText, durationText, cacheText].filter(Boolean).join(' · ');",
    'recent request duration display',
)

replace_once(
    DIAGNOSTICS,
    "    const diagCacheObservability = requestCacheObservabilityStats(diagLedgerRows);\n    const diagDevpassRows = requestLedgerRowsForScope('devpass');",
    "    const diagCacheObservability = requestCacheObservabilityStats(diagLedgerRows);\n    const diagDurationFidelity = requestDurationStats(diagLedgerRows);\n    const diagDevpassRows = requestLedgerRowsForScope('devpass');",
    'diagnostics duration stats',
)
replace_once(
    DIAGNOSTICS,
    "      `Request fidelity: exact ${diagLedgerFidelity.exact}/${diagLedgerFidelity.rows} · bucket ${diagLedgerFidelity.bucket}/${diagLedgerFidelity.rows} · cache known ${diagLedgerFidelity.cacheKnown}/${diagLedgerFidelity.rows} · cache tokens ${diagLedgerFidelity.cacheTokenKnown}/${diagLedgerFidelity.rows} · ids ${diagLedgerFidelity.ids}/${diagLedgerFidelity.rows}`,\n      `Cache observability:",
    "      `Request fidelity: exact ${diagLedgerFidelity.exact}/${diagLedgerFidelity.rows} · bucket ${diagLedgerFidelity.bucket}/${diagLedgerFidelity.rows} · cache known ${diagLedgerFidelity.cacheKnown}/${diagLedgerFidelity.rows} · cache tokens ${diagLedgerFidelity.cacheTokenKnown}/${diagLedgerFidelity.rows} · ids ${diagLedgerFidelity.ids}/${diagLedgerFidelity.rows}`,\n      `Request duration fidelity: explicit ${diagDurationFidelity.explicit}/${diagDurationFidelity.rows} · unknown ${diagDurationFidelity.unknown}/${diagDurationFidelity.rows} · source ${diagDurationFidelity.sources.join(',') || 'none'} · average ${formatRequestDurationMs(diagDurationFidelity.averageMs)} · slowest ${formatRequestDurationMs(diagDurationFidelity.slowestMs)}`,\n      `Cache observability:",
    'diagnostics duration fidelity line',
)

replace_once(
    VALIDATOR,
    "behavior-runtime-recovery.cjs behavior-service-tier-outcome.cjs",
    "behavior-runtime-recovery.cjs behavior-service-tier-outcome.cjs behavior-request-duration.cjs",
    'validator request duration behavior test',
)
replace_once(
    VALIDATOR,
    "p31-engine-source-modularization-parity.cjs p32-exact-byte-release-promotion.cjs p33-generic-release-controller.cjs",
    "p31-engine-source-modularization-parity.cjs p32-exact-byte-release-promotion.cjs p33-generic-release-controller.cjs p34-request-duration-fidelity.cjs",
    'validator P34 test',
)

replace_once(
    GUIDELINES,
    'Current release implementation: `3.0.0-alpha.5.69 — Engine Development Source Modularization`.',
    'Current release implementation: `3.0.0-alpha.5.70 — Request Duration Fidelity`.',
    'current release guideline',
)

run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--write')
run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--check')
engine_sha = sha256(ENGINE)

replace_once(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.69';", "const PRODUCT_VERSION = '3.0.0-alpha.5.70';", 'manager Product version')
replace_once(MANAGER, "const BUNDLED_ENGINE_VERSION = '1.6.20';", "const BUNDLED_ENGINE_VERSION = '1.6.21';", 'manager Engine version')
replace_once(MANAGER, f"const BUNDLED_ENGINE_SHA256 = '{bridge.get('sha256')}';", f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';", 'manager Engine hash')

manifest['productVersion'] = TARGET_VERSION
manifest['components']['plugin']['version'] = TARGET_VERSION
manifest['components']['bridge']['requiredVersion'] = TARGET_ENGINE
manifest['components']['bridge']['sha256'] = engine_sha
manifest['components']['bridgeManager']['productVersion'] = TARGET_VERSION
manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
manifest['components']['bridgeManager']['bootstrapSha256'] = sha256(BOOTSTRAP)
MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
run('python3', str(TOOLS / 'sync_project_guidelines.py'))
run('node', '--check', str(ROOT / 'latest.js'))
run('node', '--check', str(MANAGER))
run('node', '--check', str(ENGINE))
validate_target()

source_manifest = json.loads((SRC / 'manifest.json').read_text(encoding='utf-8'))
if source_manifest.get('version') != TARGET_VERSION:
    raise SystemExit('5.70 plugin source manifest version mismatch')
print(f'prepared Local Usage Dashboard {TARGET_VERSION} (Engine {TARGET_ENGINE}, Manager {TARGET_MANAGER}) · Request Duration Fidelity · contracts 1/1')
